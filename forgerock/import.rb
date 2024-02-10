#!/usr/local/bin/ruby -w

require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
require 'base64'

# option handling
options = {}

# default options
options[:usersfile] = "samplefiles/forgerock-user-export.json"
options[:fusionauthurl] = "http://localhost:9011"

OptionParser.new do |opts|
  opts.banner = "Usage: import.rb [options]"

  opts.on("-r", "--register-users APPLICATION_IDS", "A comma separated list of existing applications Ids. All users will be registered for these applications.") do |appids|
    options[:appids] = appids
  end

  opts.on("-u", "--users-file USERS_FILE", "The exported json user data file from Forgerock. Defaults to samplefiles/forgerock-user-export.json.") do |file|
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

  opts.on("-m", "--map-forgerock-user-id", "Whether to map the forgerock user id for normal imported users to the FusionAuth user id.") do |mapids|
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

puts "FusionAuth Importer : Forgerock"
puts " > Working Directory: " + File.basename(Dir.getwd)
puts " > User file: #{users_file}"

#tag::ForgerockPasswordHash[]
#Structure for storing parts from the password hash
Password_info = Struct.new(:encryption_scheme,:password_hash,:salt_hash,:itterations)

#parses the Forgerock password hash for the needed parts
def get_password_info_from_forgerock(hashstring)
  #Assuming PBKDF2-HMAC-SHA256 hash here,  If different, this must be customized.
  #The size of the hash algorithm.  Forgerock stores the PBKDF2-HMAC-SHA256 hash as "{PBKDF2-HMAC-SHA256}” <iterations> “:” base64(<digest> <salt>)
  #So the hash is 48 bytes with the last 16 being the salt hash
  algorithm_size = 32
  encryption_scheme = /(?<={).*(?=})/.match(hashstring)
  itterations = /(?<=}).*(?=:)/.match(hashstring)
  password_salt_hash = /(?<=:).*(?=$)/.match(hashstring)

  bytes = Base64.decode64(password_salt_hash.to_s)

  hash_bytes = bytes.byteslice(0, algorithm_size)
  salt_bytes = bytes.byteslice(algorithm_size..-1)

  hash_encode = Base64.strict_encode64(hash_bytes)
  salt_encode = Base64.strict_encode64(salt_bytes)

return Password_info.new(encryption_scheme.to_s,hash_encode,salt_encode,itterations.to_s)
end
#end::ForgerockPasswordHash[]

# Map an Forgerock user to a FusionAuth user
def map_user(forgerock_user, options)

  user = {}

  # Optionally convert user_id to a UUID for FusionAuth
  if $map_user_id
    user['id'] = forgerock_user['_id']
  end

  user['active'] = true

  if forgerock_user['mail'] != "NULL"
    user['email'] = forgerock_user['mail']
  end

  user['username'] = forgerock_user['userName']

  if forgerock_user['givenName'] != "NULL"
    user['firstName'] = forgerock_user['givenName']
  end

  if forgerock_user['sn'] != "NULL"
    user['lastName'] = forgerock_user['sn']
  end

  if forgerock_user['password'] != "NULL"
    password_hash_string = forgerock_user['password']
    password_parsing_result = get_password_info_from_forgerock(password_hash_string)
    user['encryptionScheme'] = map_hashing_algorithm(password_parsing_result.encryption_scheme);
    user['factor'] = password_parsing_result.itterations
    user['salt'] = password_parsing_result.salt_hash
    user['password'] = password_parsing_result.password_hash
  end

  # Preserve the Unique Id
  user['data'] = {}
  user['data']['forgerock'] = {}
  user['data']['forgerock']['id'] = forgerock_user['_id']

  if forgerock_user['favoriteColor'] != "NULL"
    user['data']['forgerock']['favoriteColor']  = forgerock_user['favoriteColor']
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

def map_hashing_algorithm(forgerock_algorithm_name)
  if forgerock_algorithm_name == "PBKDF2-HMAC-SHA256"
    return "salted-pbkdf2-hmac-sha256"
  end
  raise "unsupported algorithm: " + forgerock_algorithm_name
end

# Initialize a user array to hold chunks of 10k users before calling the Import API
forgerock_users = {}
users = []
emails = []
user_names = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

# Map the users, id -> hash

forgerock_users = JSON.parse(File.read(users_file))

# Iterate the rows of the json collection and map the fields onto a FusionAuth User
#forgerock_users.each do |forgerock_user|
forgerock_users["result"].each do |forgerock_user|
  u = map_user(forgerock_user, options)
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

