#!/usr/local/bin/ruby -w

require "date"
require "json"
require "csv"
require "fusionauth/fusionauth_client"
require "optparse"
require "securerandom"

# option handling
options = {}

# default options
options[:usersfile] = "users.json"
options[:fusionauthurl] = "http://localhost:9011"


OptionParser.new do |opts|
  opts.banner = "Usage: import.rb [options]"

  opts.on("-l", "--link-social-accounts", "Link social accounts, if present, after import. This operation is slower than an import.") do |linksocial|
    options[:linksocial] = true
  end

  opts.on("-r", "--register-users APPLICATION_IDS", "A comma separated list of existing applications Ids. All users will be registered for these applications.") do |appids|
    options[:appids] = appids
  end

  opts.on("-o", "--only-link-social-accounts", "Link social accounts with no import.") do |siteurl|
    options[:onlylinksocial] = true
  end

  opts.on("-u", "--users-file USERS_FILE", "The exported JSON user data file from IdentityServer. Defaults to users.json.") do |file|
    options[:usersfile] = file
  end

  opts.on("-f", "--fusionauth-url FUSIONAUTH_URL", "The location of the FusionAuth instance. Defaults to http://localhost:9011.") do |fusionauthurl|
    options[:fusionauthurl] = fusionauthurl
  end

  opts.on("-k", "--fusionauth-api-key API_KEY", "The FusionAuth API key.") do |fusionauthapikey|
    options[:fusionauthapikey] = fusionauthapikey
  end

  opts.on("-t", "--fusionauth-tenant-id TENANT_ID", "The FusionAuth tenant id. Required if more than one tenant exists.") do |tenantid|
    options[:tenantid] = tenantid
  end

  opts.on("-h", "--help", "Prints this help.") do
    puts opts
    exit
  end
end.parse!

users_file = options[:usersfile]

$fusionauth_url = options[:fusionauthurl]
$fusionauth_api_key = options[:fusionauthapikey]

# Optionally specify the target tenant. If only one tenant exists this is optional and the users
# will be imported to the default tenant. When more than one tenant exists in FusionAuth this is required.
$fusionauth_tenant_id = options[:tenantid]

puts "FusionAuth Importer : IdentityServer"
puts " > User file: #{users_file}"

# ids pulled from https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java
idp_identifiers_to_identityserver_type = {
  "facebook" => "56abdcc7-8bd9-4321-9621-4e9bbebae494",
  "google" => "82339786-3dff-42a6-aac6-1f1ceecb6c46",
  "twitter" => "45bb233c-0901-4236-b5ca-ac46e2e0a5a5",
# add others as we have test data.
}

# Map a IdentityServer user to a FusionAuth user
def map_user(id, identityserver_user, options)
  user = {}
  is_identityserver_user = identityserver_user["identityProviders"].length === 0; 
  is_idp_user = identityserver_user["identityProviders"].length > 0

  user["id"] = identityserver_user["id"] #NOTE: If your users don't have a UUID as an id, you'll need to leave this blank, and store the old id in the data section
  user["active"] = identityserver_user["active"]
  user["email"] = identityserver_user["email"]
  user["verified"] = identityserver_user["verified"]
  user["insertInstant"] = identityserver_user["insertInstance"]
  if identityserver_user["expiry"] != nil 
    user["expiry"] = identityserver_user["expiry"]
  end

  if is_identityserver_user
    user["encryptionScheme"] = identityserver_user["encryptionScheme"] 
    user["factor"] = identityserver_user["factor"] #TODO: Check that iterations is === factor? not sure of terminology
    user["salt"] = identityserver_user["salt"]
    user["password"] = identityserver_user["password"]

    # Preserve the identityserver Unique Id
    user["data"] = {}
    user["data"]["identityserver"] = {}
    user["data"]["identityserver"]["id"] = identityserver_user["id"]
  end

  if is_idp_user
    # random string, we don't care as users won't use it
    user["password"] = SecureRandom.hex

    # preserve idp id provided by identityserver
    user["data"] = {}
    user["data"]["identityserver"] = {}
    user["data"]["identityserver"]["identityProviders"] = identityserver_user["identityProviders"]
  end

  if options[:appids]
    regids = options[:appids].split(",")
    user["registrations"] = []
    regids.each do |rid|
      application_registration = {
        applicationId: rid.strip(),
      }
      user["registrations"].push(application_registration)
    end
  end

  return user
end

def find_user_id(client, u)
  querystring = nil
  if u["email"]
    querystring = u["email"]
  elsif u["username"]
    querystring = u["username"]
  end
  results = client.search_users_by_query({ search: { queryString: querystring } })
  if results && results.success_response
    users = results.success_response.users
    if users.length > 1
      puts "> Found multiple users matching " + querystring + ". Not linking."
      return nil
    end
    return users[0].id
  else
    puts "> Couldn't find " + querystring + ". Have they been imported?"
  end

  return nil
end

def import(users, options)
  if options[:onlylinksocial]
    # no importing
    return
  end

  puts " > Call FusionAuth to import users"
  puts "  >> API Key " + $fusionauth_api_key
  puts "  >> Tenant Id " + $fusionauth_tenant_id
  puts "  >> FusionAuth URL " + $fusionauth_url
  puts "  >> Users:"
  import_request = {}
  import_request["users"] = users
  import_request["validateDbConstraints"] = false

  # FusionAuth Import API
  # https://fusionauth.io/docs/v1/tech/apis/users#import-users
  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  if $fusionauth_tenant_id
    client.set_tenant_id($fusionauth_tenant_id)
  end
  begin
    response = client.import_users(import_request)
  rescue Exception => e
    puts "> Error: " + e.message
  end
  if response.was_successful
    puts " > Import success"
  else
    puts " > Import failed. Status code #{response.status}. Error response:\n #{response.error_response}"
    exit 1
  end
end

# Initialize a user array to hold chunks of 10k users before calling the Import API
identityserver_users = {}
users = []
emails = []
user_names = []
idp_users_needing_link = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

f2 = File.open(users_file, "r")

identityserver_users = JSON.parse(f2.read)
f2.close
puts "  >> " + identityserver_users["users"].length.to_s + " users found in JSON file"
# process users with passwords
identityserver_users["users"].each { |identityserver_user|
  u = map_user(identityserver_user["localId"], identityserver_user, options)

  unless u["email"].nil?
    unless emails.include? u["email"]
      emails.push u["email"]
    else
      duplicate_emails.push u["username"]
      duplicate = true
    end
  end

  unless u["username"].nil?
    unless user_names.include? u["username"]
      user_names.push u["username"]
    else
      duplicate_user_names.push u["username"]
      duplicate = true
    end
  end

  unless duplicate
    count = count + 1
    users.push u
    if identityserver_user["identityProviders"].length > 0
      idp_users_needing_link.push identityserver_user
    end
  else
    duplicate_count = duplicate_count + 1
  end

  # In chunks of 10k, request a bulk insert
  if count % 10_000 == 0
    import(users, options)
    users = []
  end
}

# Complete the import for anything that did not make the 10k threshold
if users.length > 0
  import(users, options)
  users = []
end

if options[:linksocial] || options[:onlylinksocial]
  puts "Linking " + (idp_users_needing_link.length.to_s) + " social accounts"

  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  if $fusionauth_tenant_id
    client.set_tenant_id($fusionauth_tenant_id)
  end

  # https://fusionauth.io/docs/v1/tech/apis/identity-providers/links/
  idp_users_needing_link.length > 0 && idp_users_needing_link.each do |u|
    u["identityProviders"].each do |link|
      link_request = {}
      link_request["identityProviderId"] = idp_identifiers_to_identityserver_type[link[0]]
      link_request["identityProviderUserId"] = link[1]

      user_id_in_fusionauth = find_user_id(client, u)
      unless user_id_in_fusionauth
        # couldn't find user?
        next
      end
      link_request["userId"] = user_id_in_fusionauth

      response = client.create_user_link(link_request)
      if response.was_successful
        puts " > Link success"
      else
        puts " > Link failed for user id: " + link_request["userId"] + ". Status code #{response.status}. Error response:\n #{response.error_response}"
      end
    end
  end
end

puts "Duplicate users #{duplicate_count}"
unless duplicate_emails.size == 0
  duplicate_emails.each { |email| puts " > #{email}" }
end
unless duplicate_user_names.size == 0
  duplicate_user_names.each { |user_name| puts " > #{user_name}" }
end
puts "Import complete. #{count} users imported."
