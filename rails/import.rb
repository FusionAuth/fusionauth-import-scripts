#!/usr/bin/env ruby -w

require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
require 'securerandom'
require 'set'

# Option handling
options = {}

# Default options
options[:usersfile] = "users.json"
options[:fusionauthurl] = "http://localhost:9011"

OptionParser.new do |opts|
  opts.banner = "Usage: import.rb [options]"

  opts.on("-u", "--users-file USERS_FILE", "The exported JSON user data file from Rails auth systems. Defaults to users.json.") do |file|
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

  opts.on("-s", "--source-system SOURCE", "The source authentication system (devise, rails_auth, omniauth). Auto-detected if not specified.") do |source|
    options[:sourcesystem] = source
  end

  opts.on("-r", "--register-users APPLICATION_IDS", "A comma separated list of existing application IDs. All users will be registered for these applications.") do |appids|
    options[:appids] = appids
  end

  opts.on("-l", "--link-social-accounts", "Link social accounts for OmniAuth users after import.") do |linksocial|
    options[:linksocial] = true
  end

  opts.on("-v", "--verbose", "Enable verbose logging.") do |verbose|
    options[:verbose] = true
  end

  opts.on("-h", "--help", "Prints this help.") do
    puts opts
    exit
  end
end.parse!

# Validate required options
if options[:fusionauthapikey].nil?
  puts "Error: FusionAuth API key is required. Use -k or --fusionauth-api-key"
  exit 1
end

users_file = options[:usersfile]
$fusionauth_url = options[:fusionauthurl]
$fusionauth_api_key = options[:fusionauthapikey]
$fusionauth_tenant_id = options[:tenantid]
$verbose = options[:verbose]

puts "FusionAuth Importer : Rails Authentication Systems"
puts " > User file: #{users_file}"
puts " > FusionAuth URL: #{$fusionauth_url}"
puts " > Tenant ID: #{$fusionauth_tenant_id || 'default'}"
puts ""

# Identity Provider mappings for social accounts 
# # ids pulled from https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java
IDP_MAPPINGS = {
  "google_oauth2" => "82339786-3dff-42a6-aac6-1f1ceecb6c46", # Google
}

def detect_source_system(user_data)
  return nil if user_data.empty?
  
  first_user = user_data.first
  
  # Check data field for explicit source system
  if first_user['data'] && first_user['data']['source_system']
    return first_user['data']['source_system']
  end
  
  # Auto-detect based on structure
  if first_user['data'] && first_user['data']['oauth_provider']
    return 'omniauth'
  elsif first_user['password'] && first_user['encryptionScheme'] == 'bcrypt'
    if first_user['fullName']
      return 'rails_auth'
    else
      return 'devise'
    end
  end
  
  return 'unknown'
end

def log_verbose(message)
  puts " > #{message}" if $verbose
end

def add_additional_registrations(users, app_ids)
  return users if app_ids.nil? || app_ids.empty?
  
  additional_app_ids = app_ids.split(',').map(&:strip)
  log_verbose("Adding registrations for applications: #{additional_app_ids.join(', ')}")
  
  users.each do |user|
    # Initialize registrations array if it doesn't exist
    user['registrations'] ||= []
    
    # Add registrations for additional applications
    additional_app_ids.each do |app_id|
      # Check if user is already registered for this application
      unless user['registrations'].any? { |reg| reg['applicationId'] == app_id }
        additional_registration = {
          'id' => SecureRandom.uuid,
          'applicationId' => app_id,
          'verified' => user['verified'] || true,
          'roles' => ['user']
        }
        user['registrations'] << additional_registration
        log_verbose("Added registration for #{user['email']} to application #{app_id}")
      end
    end
  end
  
  users
end

def import_users(users)
  puts " > Importing #{users.length} users to FusionAuth..."

  import_request = {
    'users' => users,
    'validateDbConstraints' => false
  }

  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  client.set_tenant_id($fusionauth_tenant_id) if $fusionauth_tenant_id

  response = client.import_users(import_request)
  
  if response.was_successful
    puts " > Import successful!"
    return true
  else
    puts " > Import failed. Status code: #{response.status}"
    puts " > Error response: #{response.error_response}"
    return false
  end
end



def link_social_accounts(social_users, user_id_mapping)
  return if social_users.empty?
  
  puts " > Linking #{social_users.length} social accounts..."
  
  client = FusionAuth::FusionAuthClient.new($fusionauth_api_key, $fusionauth_url)
  client.set_tenant_id($fusionauth_tenant_id) if $fusionauth_tenant_id
  
  linked_count = 0
  
  social_users.each do |user|
    provider = user['data']['oauth_provider']
    oauth_uid = user['data']['oauth_uid']
    email = user['email']
    
    # Skip if provider doesn't need linking
    next if provider == 'developer'
    
    identity_provider_id = IDP_MAPPINGS[provider]
    unless identity_provider_id
      puts " > Warning: No identity provider mapping for #{provider}. Skipping #{email}."
      next
    end
    
    # Get the user ID from our mapping
    fusionauth_user_id = user_id_mapping[email]
    unless fusionauth_user_id
      puts " > Warning: User ID not found for #{email}. Skipping link."
      next
    end
    
    # Create the link
    link_request = {
      'identityProviderId' => identity_provider_id,
      'identityProviderUserId' => oauth_uid,
      'userId' => fusionauth_user_id,
      'displayName' => email
    }
    
    log_verbose("Linking #{email} (#{provider}) to FusionAuth user #{fusionauth_user_id}")
    
    response = client.create_user_link(link_request)
    
    if response.was_successful
      log_verbose("Successfully linked #{email}")
      linked_count += 1
    else
      puts " > Failed to link #{email}:"
      puts "   Status: #{response.status}"
      puts "   Error: #{response.error_response}" if response.error_response
      log_verbose("Link request: #{link_request.to_json}")
    end
  end
  
  puts " > Successfully linked #{linked_count} social accounts"
end

# Main execution
begin
  # Read and parse the users file
  unless File.exist?(users_file)
    puts "Error: Users file '#{users_file}' not found."
    exit 1
  end

  file_content = File.read(users_file)
  data = JSON.parse(file_content)
  
  # Extract users array
  users_data = data['users'] || data
  
  if users_data.empty?
    puts "Error: No users found in the file."
    exit 1
  end

  # Detect source system
  source_system = options[:sourcesystem] || detect_source_system(users_data)
  puts " > Detected source system: #{source_system}"
  puts ""

  # Validate users and collect social accounts
  valid_users = []
  social_users = []
  duplicate_emails = []
  emails_seen = Set.new

  users_data.each do |user|
    email = user['email']
    
    # Check for duplicates
    if emails_seen.include?(email)
      duplicate_emails << email
      next
    end
    emails_seen.add(email)
    
    # Generate user ID if not present
    user['id'] ||= SecureRandom.uuid
    
    # Collect social users for later linking
    if source_system == 'omniauth' && user['data'] && user['data']['oauth_provider']
      social_users << user
    end
    
    valid_users << user
  end

  # Report duplicates
  if duplicate_emails.any?
    puts " > Warning: Found #{duplicate_emails.length} duplicate emails:"
    duplicate_emails.each { |email| puts "   - #{email}" }
    puts ""
  end

  puts " > Processing #{valid_users.length} valid users"
  
  # Build user ID mapping for social account linking
  user_id_mapping = {}
  valid_users.each do |user|
    user_id_mapping[user['email']] = user['id']
  end
  
  # Add additional application registrations if specified
  if options[:appids]
    puts " > Adding additional application registrations..."
    valid_users = add_additional_registrations(valid_users, options[:appids])
  end
  
  # Import users in chunks of 10,000
  chunk_size = 10_000
  total_imported = 0
  
  valid_users.each_slice(chunk_size) do |chunk|
    if import_users(chunk)
      total_imported += chunk.length
    else
      puts "Error: Import failed for chunk. Stopping."
      exit 1
    end
  end

  puts ""
  puts " > Successfully imported #{total_imported} users"

  # Link social accounts if requested and applicable
  if options[:linksocial] && source_system == 'omniauth' && social_users.any?
    puts ""
    link_social_accounts(social_users, user_id_mapping)
  end

  puts ""
  puts "Import completed successfully!"
  puts " > Total users imported: #{total_imported}"
  puts " > Duplicates skipped: #{duplicate_emails.length}"
  
  if source_system == 'omniauth' && !options[:linksocial] && social_users.any?
    puts ""
    puts "Note: #{social_users.length} social accounts detected."
    puts "Use the --link-social-accounts flag to link them to identity providers."
  end

rescue JSON::ParserError => e
  puts "Error: Invalid JSON file. #{e.message}"
  exit 1
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace if $verbose
  exit 1
end 