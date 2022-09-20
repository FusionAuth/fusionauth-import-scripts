#!/usr/local/bin/ruby -w

require "date"
require "time"
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

# todo: remove
#options[:fusionauthapikey] = "Y22zbszlkemCT03WvrKcaffocos-YFoBwConKMyfOU7ybBMVaDqqXWKu"
#options[:tenantid] = "35522cf8-9061-40df-99b8-550cfa477d07"
# options[:linksocial] = true
#options[:onlylinksocial] = true

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

  opts.on("-u", "--users-file USERS_FILE", "The exported JSON user data file from Azure AD B2C. Defaults to users.json.") do |file|
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


puts "FusionAuth Importer : Azure AD B2C"
puts " > User file: #{users_file}"

# ids pulled from https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java
idp_identifiers_to_azure_type = {
  "facebook.com" => "56abdcc7-8bd9-4321-9621-4e9bbebae494",
  "google.com" => "82339786-3dff-42a6-aac6-1f1ceecb6c46",
  "twitter.com" => "45bb233c-0901-4236-b5ca-ac46e2e0a5a5",
  "linkedin.com" => "6177c09d-3f0e-4d53-9504-3600b1b23f46",
  "apple.com" => "13d2a5db-7ef9-4d62-b909-0df58612e775"
# add others as we have test data.
}

# Map an Azure user to a FusionAuth user
def map_user(id, azure_user, options)
  user = {}
  is_local_user = azure_user["creationType"] === "LocalAccount" 
  is_idp_user = azure_user["identities"].select{|i|i["signInType"]==="federated"}.length > 0 

  user["id"] = azure_user["id"]
  user["active"] = azure_user["accountEnabled"]
  user["firstName"] = azure_user["givenName"]
  user["fullName"] = azure_user["displayName"]
  user["lastName"] = azure_user["surname"]
  user["password"] = SecureRandom.hex  # random string, we don't care as it will be reset or not used if 3rd party login. 
  user["salt"] =  SecureRandom.hex
  user["encryptionScheme"] = "salted-sha256" # This can be anything really, it will be ignored when tthe password is reset.
  user["factor"] = 8 # This can be anything really, it will be ignored when the password is reset.
  user["username"] = azure_user["userPrincipalName"]

  if is_local_user 
    localIdentity = azure_user["identities"].find{|i|i["signInType"]==="emailAddress"}
    user["email"] = localIdentity["issuerAssignedId"]
    user["verified"] = true # Azure users are always verified, as the verification happens in line with user registration.
  end

  # Incoming format is in ISO string, need to convert to epoch milliseconds for FusionAuth
  user["insertInstant"] = Time.parse(azure_user["createdDateTime"]).to_i;

  # Preserve all Azure identities for future reference
  user["data"] = {}
  user["data"]["azure"] = {}
  user["data"]["azure"]["identities"] = azure_user["identities"]

  if is_idp_user
    # random string, we don't care as users won't use it
    user["password"] = SecureRandom.hex
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
  querystring = u["id"]
  results = client.search_users_by_query({ search: { ids: querystring } })
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

# import function
def import(users, options)
  if options[:onlylinksocial]
    # no importing
    return
  end

  puts " > Call FusionAuth to import users"

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


# ------------------------------
#       Main Entry
# ------------------------------

# Initialize a user array to hold chunks of 10k users before calling the Import API
azure_users = {}
users = []
emails = []
user_names = []
idp_users_needing_link = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

f2 = File.open(users_file, "r")

azure_users = JSON.parse(f2.read)
f2.close

# process users with passwords
azure_users["value"].each { |azure_user|
  u = map_user(azure_user["id"], azure_user, options)

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
    if azure_user["identities"].select{|i|i["signInType"]==="federated"}.length > 0 
      idp_users_needing_link.push azure_user
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
    u["identities"].select{|i|i["signInType"]==="federated"}.each do |link|
      link_request = {}
      link_request["identityProviderId"] = idp_identifiers_to_azure_type[link["issuer"]]
      link_request["identityProviderUserId"] = link["issuerAssignedId"]

      user_id_in_fusionauth = u["id"] # find_user_id(client, u)
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
