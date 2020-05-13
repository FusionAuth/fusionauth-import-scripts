#!/usr/local/bin/ruby -w

require 'csv'
require 'date'
require 'fusionauth/fusionauth_client'

# BEGIN Modify these variables for your Import
users_file = 'example_users.csv'

$fusionauth_url = 'http://localhost:9011'
$fusionauth_api_key = 'c716f996-1364-4ec3-b258-77c50d6f9a68'

# You may import users with a registration to an application
$fusionauth_application_id = '2abd1945-663f-4dcf-8d11-995f44d0b5b6'

# Optionally specify the target tenant. If only one tenant exists this is optional and the users
# will be imported to the default tenant. When more than one tenant exists in FusionAuth this is required.
$fusionauth_tenant_id = '4715c371-2fcc-496c-b659-4af4f5bfde77'

# END Modify these variables for your Import

puts "FusionAuth Importer : CSV"
puts " > User file: #{users_file}"

# Map CSV header fields onto a FusionAuth user
def map_user(csv_user)
  user = {}

  user['active'] = true
  user['username'] = csv_user['LOGIN']
  user['firstName'] = csv_user['FIRST_NAME']
  user['middleName'] = csv_user['MIDDLE_NAME']
  user['lastName'] = csv_user['LAST_NAME']
  user['email'] = csv_user['EMAIL']

  # Incoming format is '11-FEB-20 07.51.57.521000000 PM', convert to epoch milli
  user['insertInstant'] = Date.parse(csv_user['REGISTRATION_DATE']).strftime("%Q")
  user['lastLoginInstant'] = Date.parse(csv_user['LASTACTIVITY_DATE']).strftime("%Q")

  # Register the user to an application
  user['registrations'] = [{
    'applicationId': $fusionauth_application_id,
    'insertInstant':  Date.parse(csv_user['REGISTRATION_DATE']).strftime("%Q"),
    'lastLoginInstant':  Date.parse(csv_user['LASTACTIVITY_DATE']).strftime("%Q"),
    # Add any roles you would like added to this user, adding 'user' as an example.
    'roles': [
      'user'
    ]
  }]

  # Import the password, with specified encryption scheme, factor and salt
  user['encryptionScheme'] = 'salted-pbkdf2-hmac-sha256'
  user['factor'] = 10_000
  user['salt'] = csv_user['PASSWORD_SALT']
  user['password'] = csv_user['PASSWORD']
  user['verified'] = true

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
users = []
emails = []
user_names = []
duplicate_emails = []
duplicate_user_names = []

count = 0
duplicate_count = 0

csv_users = CSV.parse(File.read(users_file), headers: true)
# Iterate the rows of the CSV and map the fields onto a FusionAuth User
csv_users.each { |csv_user|
  u = map_user(csv_user)

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
}

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
