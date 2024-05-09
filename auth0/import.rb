#!/usr/local/bin/ruby -w

require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
require 'securerandom'


# option handling
options = {}

# default options
options[:usersfile] = "users.json"
options[:secretsfile] = "secrets.json"
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

  opts.on("-u", "--users-file USERS_FILE", "The exported JSON user data file from Auth0. Defaults to users.json.") do |file|
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

  opts.on("-s", "--secrets-file SECRETS_FILE", "The exported JSON secrets file from Auth0. Defaults to secrets.json.") do |file|
    options[:secretsfile] = file
  end

  opts.on("-m", "--map-auth0-id", "Whether to map the auth0 id for normal imported users to the FusionAuth user id.") do |mapids|
    options[:mapids] = mapids
  end

  opts.on("-h", "--help", "Prints this help.") do
    puts opts
    exit
  end
end.parse!

users_file = options[:usersfile]
secrets_file = options[:secretsfile]

$fusionauth_url = options[:fusionauthurl]
$fusionauth_api_key = options[:fusionauthapikey]

# Optionally specify the target tenant. If only one tenant exists this is optional and the users
# will be imported to the default tenant. When more than one tenant exists in FusionAuth this is required.
$fusionauth_tenant_id = options[:tenantid]

# Map Auth0 userId to the FusionAuth User Id as a UUID
$map_auth0_user_id = !options[:mapids].nil?

puts "FusionAuth Importer : Auth0"
puts " > User file: #{users_file}"
puts " > User secrets file: #{secrets_file}"

# ids pulled from https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java
idp_identifiers_to_auth0_type = {
  "linkedin" => "6177c09d-3f0e-4d53-9504-3600b1b23f46",
  "google-oauth2" => "82339786-3dff-42a6-aac6-1f1ceecb6c46",
# add others as we have test data.
}

# Map an Auth0 user to a FusionAuth user
def map_user(id, auth_secret, auth_user, options)
  user = {}
  is_auth0_user = auth_user['auth0_user_type'] == 'auth0'
  is_idp_user = auth_user['auth0_user_type'] != 'auth0'

  if is_auth0_user
    # Optionally convert Auth0 user_id to a UUID for FusionAuth
    if $map_auth0_user_id
      id_to_turn_to_uuid = id
      if id.length != 24
        # We have an alternate id, loaded from a non Auth0 datasource
        id_to_turn_to_uuid = auth_secret['_id']['$oid']
      end

      _id = id_to_turn_to_uuid.ljust(32, '0')
      user['id'] = "#{_id[0, 8]}-#{_id[8, 4]}-#{_id[12, 4]}-#{_id[16, 4]}-#{_id[20, 12]}"
    end
  end

  user['active'] = true
  user['email'] = auth_user['email']
  user['verified'] = auth_user['email_verified']
  user['username'] = auth_user['username']

  # Incoming format is '2017-08-08T08:31:19.483Z', convert to epoch milli
  user['insertInstant'] = Date.parse(auth_user['created_at']).strftime("%Q")

  # Optionally we could grab the last login instant

  if is_auth0_user
    pw_hash = auth_secret['passwordHash'].split('$')
    # [version][factor][hash [0 - 21 salt][22 - password]]
    user['encryptionScheme'] = 'bcrypt'
    user['factor'] = pw_hash[2].to_i
    user['salt'] = pw_hash[3][0, 22]
    user['password'] = pw_hash[3][22..-1]

    # Preserve the Auth0 Unique Id
    user['data'] = {}
    user['data']['auth0'] = {}
    user['data']['auth0']['id'] = id
    user['data']['auth0']['tenant'] = auth_secret['tenant']
  end

  if is_idp_user
    # random string, we don't care as users won't use it
    user['password'] = SecureRandom.hex

    # preserve idp id provided by auth0
    user['data'] = {}
    user['data']['auth0'] = {}
    user['data']['auth0']['idpid'] = auth_user['auth0_user_type'] + "|" + id
  end

  if options[:appids]
    regids = options[:appids].split(',')
    user['registrations'] = []
    regids.each do |rid|
      application_registration = {
        applicationId: rid.strip()
      }
      user['registrations'].push(application_registration)
    end
  end

  return user
end

def find_user_id(client, u)
  querystring = nil
  if u['email']
    querystring = u['email']
  elsif u['username']
    querystring = u['username']
  end
  results = client.search_users_by_query({search: {queryString: querystring } } )
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

  import_request = {}
  import_request['users'] = users
  import_request['validateDbConstraints'] = false

  # FusionAuth Import API
  # https://fusionauth.io/docs/v1/tech/apis/users#import-users
  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  if $fusionauth_tenant_id
    client.set_tenant_id($fusionauth_tenant_id)
  end
  response = client.import_users(import_request)
  if response.was_successful
    puts " > Import success"
  else
    puts " > Import failed. Status code #{response.status}. Error response:\n #{response.error_response}"
    exit 1
  end
end

# Initialize a user array to hold chunks of 10k users before calling the Import API
auth0_secrets = {}
auth0_users = {}
users = []
emails = []
user_names = []
idp_users_needing_link = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

# Map the Auth0 secrets, id -> hash
f1 = File.open(secrets_file, 'r')
f1.each_line { |line|
  line.chomp!
  next if line.empty?
  s_hash = JSON.parse(line)
  id = s_hash['_id']['$oid']
  auth0_secrets[id] = s_hash
  alt_id = s_hash['alt_id']
  if alt_id
    auth0_secrets[alt_id] = s_hash
  end
}
f1.close

# Map the Auth0 users, id -> hash
f2 = File.open(users_file, 'r')
f2.each_line { |line|
  line.chomp!
  next if line.empty?
  u_hash = JSON.parse(line)
  user_id = u_hash['user_id']
  type = user_id.split('|')[0]
  id = user_id.split('|')[1]
  u_hash['auth0_user_type'] = type
  u_hash['auth0_user_id'] = id
  auth0_users[id] = u_hash
}
f2.close

# process users with passwords
auth0_users.length > 0 && auth0_users.each_key do |id|
  u = map_user(id, auth0_secrets[id], auth0_users[id], options)

  unless u['email'].nil?
    unless emails.include? u['email']
      emails.push u['email']
    else
      duplicate_emails.push u['username']
      duplicate = true
    end
  end

  unless u['username'].nil?
    unless user_names.include? u['username']
      user_names.push u['username']
    else
      duplicate_user_names.push u['username']
      duplicate = true
    end
  end

  unless duplicate
    count = count + 1
    users.push u
    if auth0_users[id]['auth0_user_type'] != 'auth0'
      idp_users_needing_link.push auth0_users[id]
    end
  else
    duplicate_count = duplicate_count + 1
  end

  # In chunks of 10k, request a bulk insert
  if count % 10_000 == 0
    import(users, options)
    users = []
  end
end

# Complete the import for anything that did not make the 10k threshold
if users.length > 0
  import(users, options)
  users = []
end


if options[:linksocial] || options[:onlylinksocial]
  puts "Linking "+ (idp_users_needing_link.length.to_s) +" social accounts"

  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  if $fusionauth_tenant_id
    client.set_tenant_id($fusionauth_tenant_id)
  end

  # https://fusionauth.io/docs/v1/tech/apis/identity-providers/links/
  idp_users_needing_link.length > 0 && idp_users_needing_link.each do |u|
    link_request = {}
    link_request['identityProviderId'] = idp_identifiers_to_auth0_type[u['auth0_user_type']]
    link_request['identityProviderUserId'] = u['auth0_user_id']

    user_id_in_fusionauth = find_user_id(client, u)
    unless user_id_in_fusionauth
      # couldn't find user?
      next
    end
    link_request['userId'] = user_id_in_fusionauth

    response = client.create_user_link(link_request)
    if response.was_successful
      puts " > Link success"
    else
      puts " > Link failed for user id: "+link_request['userId']+". Status code #{response.status}. Error response:\n #{response.error_response}"
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

