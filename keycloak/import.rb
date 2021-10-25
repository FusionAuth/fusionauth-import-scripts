#!/usr/local/bin/ruby -w

require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
require 'csv'


# option handling
options = {}

# default options
options[:usersfile] = "out.csv"
options[:secretsfile] = "secrets.json"
options[:fusionauthurl] = "http://localhost:9011"

OptionParser.new do |opts|
  opts.banner = "Usage: import.rb [options]"

  opts.on("-r", "--register-users APPLICATION_IDS", "A comma separated list of existing applications Ids. All users will be registered for these applications.") do |appids|
    options[:appids] = appids
  end

  opts.on("-u", "--users-file USERS_FILE", "The exported CSV user data file from Keycloak. Defaults to out.csv.") do |file|
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

  opts.on("-m", "--map-keycloak-user-id", "Whether to map the keycloak user id for normal imported users to the FusionAuth user id.") do |mapids|
    options[:mapids] = mapids
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

# Map userId to the FusionAuth User Id as a UUID
$map_user_id = !options[:mapids].nil?

puts "FusionAuth Importer : Keycloak"
puts " > User file: #{users_file}"


# Map an Keycloak user to a FusionAuth user
def map_user(keycloak_user, options)
  # FIRST_NAME,LAST_NAME,EMAIL,USERNAME,EMAIL_VERIFIED,ID,PASSWORD,SALT,HASHITERATIONS,ALGORITHM,CREATED_TIMESTAMP,REALM_ID

  user = {}

  # Optionally convert user_id to a UUID for FusionAuth
  if $map_user_id
    user['id'] = keycloak_user['ID']
  end

  user['active'] = true

  if keycloak_user['EMAIL'] != "NULL"
    user['email'] = keycloak_user['EMAIL']
  end

  # this is \0 if false, everything else is true
  user['verified'] = keycloak_user['EMAIL_VERIFIED'] != "\\0"

  # apparently every keycloak user has a username
  user['username'] = keycloak_user['USERNAME']

  if keycloak_user['FIRST_NAME'] != "NULL"
    user['firstName'] = keycloak_user['FIRST_NAME']
  end

  if keycloak_user['LAST_NAME'] != "NULL"
    user['lastName'] = keycloak_user['LAST_NAME']
  end

  # Incoming format is a timestamp
  user['insertInstant'] = keycloak_user['CREATED_TIMESTAMP']

  user['encryptionScheme'] = map_hashing_algorithm(keycloak_user['ALGORITHM'])
  user['factor'] = keycloak_user['HASHITERATIONS']
  user['salt'] = keycloak_user['SALT']
  user['password'] = keycloak_user['PASSWORD']

  # Preserve the Unique Id
  user['data'] = {}
  user['data']['keycloak'] = {}
  user['data']['keycloak']['id'] = keycloak_user['ID']
  user['data']['keycloak']['tenant'] = keycloak_user['REALM_ID']

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

  puts user

  return user
end

def import(users, options)

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

def map_hashing_algorithm(keycloak_algorithm_name)
  if keycloak_algorithm_name == "pbkdf2-sha256"
    #return "example-keycloak"
    return "example-hash"
  end
  raise "unsupported algorithm: " + keycloak_algorithm_name
end

# Initialize a user array to hold chunks of 10k users before calling the Import API
keycloak_users = {}
users = []
emails = []
user_names = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

# Map the users, id -> hash

keycloak_users = CSV.parse(File.read(users_file), headers: true)

# Iterate the rows of the CSV and map the fields onto a FusionAuth User
keycloak_users.each do |keycloak_user|
  u = map_user(keycloak_user, options)
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
    import(users, options)
    users = []
  end
end

# Complete the import for anything that did not make the 10k threshold
if users.length > 0
  import(users, options)
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

