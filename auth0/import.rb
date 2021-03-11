#!/usr/local/bin/ruby -w

require 'date'
require 'json'
require 'fusionauth/fusionauth_client'

# BEGIN Modify these variables for your Import
users_file = 'users.json'
secrets_file = 'secrets.json'

$fusionauth_url = 'http://localhost:9011'
$fusionauth_api_key = 'bf69486b-4733-4470-a592-f1bfce7af580'

# Optionally specify the target tenant. If only one tenant exists this is optional and the users
# will be imported to the default tenant. When more than one tenant exists in FusionAuth this is required.
$fusionauth_tenant_id = '16970284-4680-4b3c-8a7e-424644ed1090'

# Map Auth0 userId to the FusionAuth User Id as a UUID
$map_auth0_user_id = false

# END Modify these variables for your Import

puts "FusionAuth Importer : Auth0"
puts " > User file: #{users_file}"
puts " > User secrets file: #{secrets_file}"

# Map an Auth0 user to a FusionAuth user
def map_user(id, auth_secret, auth_user)
  user = {}

  # Optionally convert Auth0 user_id to a UUID for FusionAuth
  if $map_auth0_user_id
    _id = id.ljust(32, '0')
    user['id'] = "#{_id[0, 8]}-#{_id[8, 4]}-#{_id[12, 4]}-#{_id[16, 4]}-#{_id[20, 12]}"
  end

  user['active'] = true
  user['email'] = auth_secret['email']
  user['verified'] = auth_secret['email_verified']
  user['username'] = auth_secret['username']

  # Incoming format is '2017-08-08T08:31:19.483Z', convert to epoch milli
  user['insertInstant'] = Date.parse(auth_user['created_at']).strftime("%Q")

  # Optionally we could grab the last login instant

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

  # Uncomment and modify to add a Registration
  # user['registrations'] = []
  # application_registration = {
    # applicationId: '6b72ba2d-679a-41dd-adb3-9f3e75e7cd1f'
  # }
  # user['registrations'].push(application_registration)

  return user
end

def import(users)
  puts " > Call FusionAuth to import users"

  import_request = {}
  import_request['users'] = users
  import_request['validateDbConstraints'] = false

  # FusionAuth Import API
  # https://fusionauth.io/docs/v1/tech/apis/users#import-users
  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  client.set_tenant_id($fusionauth_tenant_id)
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
}
f1.close

# Map the Auth0 users, id -> hash
f2 = File.open(users_file, 'r')
f2.each_line { |line|
  line.chomp!
  next if line.empty?
  u_hash = JSON.parse(line)
  id = u_hash['user_id'][6..-1]
  auth0_users[id] = u_hash
}
f2.close

auth0_secrets.each_key do |id|
  u = map_user(id, auth0_secrets[id], auth0_users[id])

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
  else
    duplicate_count = duplicate_count + 1
  end

  # In chunks of 10k, request a bulk insert
  if count % 10_000 == 0
    import(users)
    users = []
  end
end

# Complete the import for anything that did not make the 10k threshold
if users.length > 0
  import(users)
  users = []
end

puts "Duplicate users #{duplicate_count}"
unless duplicate_emails.size == 0
  duplicate_emails.each { |email| puts " > #{email}" }
end
unless duplicate_user_names.size == 0
  duplicate_user_names.each { |user_name| puts " > #{user_name}" }
end
puts "Import complete. #{count} users imported."
