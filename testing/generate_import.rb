#!/usr/local/bin/ruby -w

require 'rubygems'
require 'json'
require 'net/http'
require 'getoptlong'
require 'openssl'
load './uuid_util.rb'

opts = GetoptLong.new(
  [ '--help', '-h', GetoptLong::NO_ARGUMENT ],
  [ '--apiKey', '-k', GetoptLong::REQUIRED_ARGUMENT ],
  [ '--applicationId', GetoptLong::REQUIRED_ARGUMENT ],
  [ '--tenantId', GetoptLong::REQUIRED_ARGUMENT ],
  [ '--url', GetoptLong::REQUIRED_ARGUMENT ],
  [ '--appsPerTenant', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--usersPerApp', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--appCount', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--batch', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--offset', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--total', GetoptLong::OPTIONAL_ARGUMENT ]
)

argv_length = ARGV.length
api_key = nil
application_id = nil
tenant_id = nil
url = nil
batch = 10_000
offset = 0
applications_per_tenant = 1
app_count = 1
users_per_application = nil
total = 1_000_000

opts.each do |opt, arg|
  case opt
    when '--help'
      puts <<-EOF

-h, --help:
   show help

--apiKey [apiKey]:
   The API key used in the Authorization header to authorize the Import API.

   Required.

--applicationId [applicationId]:
   The unique Id of the application used for the import request. If specified, all users will be registered for the given application.

   Optional.

--tenantId [tenantId]:
   The unique Id of the tenant used for the import request. If specified, all users will be created for the given tenant.

   Optional.

--appsPerTenant [applicationsPerTenant]:
   The number of applications created per tenant. Required when --tenantId is not provided. This value should match the --perTenant value used with the generate_applications script.

   Optional.

--usersPerApp [usersPerApplication]:
   The number of users to create per application. If provided, this will be used as the batch size. Required when --appCount is specified

--appCount [appCount]:
   The number of applications. Required when --usersPerApp is specified. This value should match the --total value used with the generate_applications script. Total will be
      appCount * usersPerApplication
    Users will be created, overriding the total.

--url [url]:
  The base URL to reach FusionAuth

  Required.

--batch [batch]:
  The number of users to import in a batch.

  Default value is 10,000.

--offset [offset]:
  The offset to use when generating unique email addresses for the import. Use
  this value when importing more than once to the same tenant with this script
  to avoid email collisions.

  Default value is 0.

--total [total]:
  The total number of users to import.

  Default value is 1,000,000.

      EOF
    when '--apiKey'
      api_key = arg
    when '--applicationId'
      application_id = arg
    when '--tenantId'
      tenant_id = arg
    when '--url'
      url = arg
    # The batch size to import. This should be adequate, you can increase or decrease this value if you like, it will not affect
    # the total number of users being imported. This will just cause the import requests to be broken up into small chunks.
    # - Running this between 100k and 250k is generally just fine, the limiting factors will be the RAM available on the target system
    #   and the timeout configurations between this system and the target system.
    when '--batch'
      if arg != ''
        batch = arg.to_i
      end
    # The offset into this set. This will be 0 unless you want to run this import again against the same tenant.
    # - For example, if you already imported 1M users, you would want to set the offset to 1_000_000 so that the
    #   numbering begins at 1M.
    when '--offset'
      if arg != ''
        offset = arg.to_i
      end
    # The number of applications per tenant
    when '--appsPerTenant'
      if arg != ''
        applications_per_tenant = arg.to_i
      end
    # The number of users to create per application
    when '--usersPerApp'
      if arg != ''
        users_per_application = arg.to_i
      end
    # The number of applications
    when '--appCount'
      if arg != ''
        app_count = arg.to_i
      end
    # The total number of users to import
    when '--total'
      if arg != ''
        total = arg.to_i
      end
  end
end

if argv_length == 0
  puts "generate_import: try 'generate_import --help' for more information."
  exit 0
end

if argv_length < 3
  puts "Usage: generate_import.rb --apiKey <API Key> --url <URL> --applicationId <Application Id> --tenantId <Tenant Id>"
  exit 0
end

# The total number of users processed so far towards the total
count = 0
i_application = 0
i_tenant = 0

# If we are creating a number of users per application, override the batch size and total
if !(users_per_application.nil?)
  batch = users_per_application
  total = app_count * users_per_application
end

# The expected number of iterations to reach the total count
total_iterations = [1, (total / batch)].max.to_i

# The current iteration count
iteration_count = 0

# The start of this request
start = Time.new

puts "FusionAuth Importer : Generate Test Users"
puts " > Total users: #{total}"
puts " > Offset: #{offset}"
puts " > Batch: #{batch}"
puts " > Expected iterations: #{total_iterations}"
puts ""

# Iterate in batch sizes until we reach the total
while count < total

  iteration_count = iteration_count + 1
  users = []
  limit = [batch, (total - count)].min.to_i

  puts "[#{iteration_count} of #{total_iterations}] [#{Time.new.strftime("%a %m/%d %y %H:%M:%S")}] Import User request. Generate JSON for users [#{count}] to #{count + limit}]"
  limit.times do |i|
    # Offset
    index = i + count +  offset + 1

    # This user can be customized to better replicate your production configuration.
    user = {}
    user['id'] = print_uuid($user_prefix, index)
    user['active'] = true
    user['email'] = "imported-user-#{index}@fusionauth.io"
    user['username'] = "imported-username#{index}"
    user['verified'] = true

    # Password is 'password', using the default FusionAuth hashing scheme
    user['password'] = "jHsm+KgtcleCjG/jyC7SuY088G2n/2eiZyNYYEianwU="
    user['salt'] = "huT0jZQYfZ2frJeZx29J4YTL7SWqeqAIoFQ35TdkTkI="
    user['encryptionScheme'] = "salted-pbkdf2-hmac-sha256"
    user['factor'] = 24000

    # Add a single registration with the 'user' role.
    user['registrations'] = []
    user['registrations'][0] = {}
    user['registrations'][0]['applicationId'] = application_id || print_uuid($application_prefix, i_application)
    user['registrations'][0]['roles'] = ['user','admin','manager','supervisor','nobody','anonymous','abc','def','ghi','jkl']
    users[i] = user
  end

  # Perform the import request
  uri = URI(url)
  http = Net::HTTP.new(uri.hostname, uri.port)
  # https://ruby-doc.org/stdlib-2.7.2/libdoc/net/http/rdoc/Net/HTTP.html
  http.open_timeout = 120       # In seconds (60 is default)
  http.read_timeout = 600       # In seconds (60 is default)
  http.write_timeout = 120      # In seconds (60 is default)
  http.keep_alive_timeout = 30  # In seconds (2 is default)
  if uri.scheme.eql? 'https'
    http.use_ssl = true
    # If you are using as self signed certificate, you may need to set this to VERIFY_NONE
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE
  end

  req = Net::HTTP::Post.new("/api/user/import")
  req['Content-Type'] = 'application/json'
  req['Authorization'] = api_key
  req['X-FusionAuth-TenantId'] = tenant_id || print_uuid($tenant_prefix, i_tenant)

  # If you want to perform Db constraint validation, un-comment the second
  # line of the request body. This will dramatically slow down the import
  # but it will allow you to receive a JSON error response indicating
  # why the import may be failing due to db constraint violations.
  request = {
      'users' => users
      #, 'validateDbConstraints' => false
  }
  req.body = request.to_json

  res = http.request(req)
  if res.code.to_i != 200
    puts " > Failed. Response code [#{res.code}]\n"
    if res.code.to_i >= 400
      puts JSON.pretty_generate(JSON.parse(res.body))
    end
    exit 1
  end

  i_application += 1
  if i_application % applications_per_tenant == 0
    i_tenant += 1
  end

  # Increment our counter
  count = count + limit
end

puts ""
puts "Completed in [#{Time.new - start}] seconds"
