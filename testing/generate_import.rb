#!/usr/local/bin/ruby -w

require 'rubygems'
require 'json'
require 'net/http'
require 'openssl'

# BEGIN Modify these variables for your Import

# Create an API key, an application and a tenant for this configuration.
# - You may use the default default or create a new one. Fill out these values
#   to match your configuration.
$api_key = '<YOUR API KEY>'
$application_id = 'c9f111d6-a24e-4091-8411-12460c995953'
$tenant_id = 'a8800e97-8230-4cd8-9608-3b3db8169f36'
$fusionauth_url = 'http://localhost:9011'

# Defaults

# The total number of users to import
$total = 1_000_000

# The offset into this set. This will be 0 unless you want to run this import again against the same tenant.
# - For example, if you already imported 1M users, you would want to set the offset to 1_000_000 so that the
#   numbering begins at 1M.
$offset = 0

# The batch size to import. This should be adequate, you can increase or decrease this value if you like, it will not affect
# the total number of users being imported. This will just cause the import requests to be broken up into small chunks.
# - Running this between 100k and 250k is generally just fine, the limiting factors will be the RAM available on the target system
#   and the timeout configurations between this system and the target system.
$batch = 100_000

# END Modify these variables for your Import

# Allow the total users to be set using the first argument
if ARGV.length > 0
  $total = ARGV[0].to_i
end

# Allow the offset number to be set using the second argument
if ARGV.length > 1
  $offset = ARGV[1].to_i
end

# Allow the batch to be set using the third argument
if ARGV.length > 2
  $batch = ARGV[2].to_i
end

# The total number of users processed so far towards the total
$count = 0

# The expected number of iterations to reach the total count
$total_iterations = $total / $batch

# The current iteration count
$iteration_count = 0

# The start of this request
$start = Time.new

puts "FusionAuth Importer : Generate Test Users"
puts " > Total users: #{$total}"
puts " > Offset: #{$offset}"
puts " > Batch: #{$batch}"
puts " > Expected iterations: #{$total_iterations}"
puts ""

# Iterate in batch sizes until we reach the total
while $count < $total

  $iteration_count = $iteration_count + 1
  users = []
  limit = [$batch, ($total - $count)].min.to_i

  puts "[#{$iteration_count} of #{$total_iterations}] [#{Time.new.strftime("%a %m/%d %y %H:%M:%S")}] Import User request. Generate JSON for users [#{$count}] to #{$count + limit}]"
  limit.times do |i|
    # Offset
    index = i + $count +  $offset + 1

    # This user can be customized to better replicate your production configuration.
    user = {}
    user['active'] = true
    user['email'] = "imported-user-#{index}@fusionauth.io"
    user['verified'] =true

    # Password is 'password', using the default FusionAuth hashing scheme
    user['password'] = "jHsm+KgtcleCjG/jyC7SuY088G2n/2eiZyNYYEianwU="
    user['salt'] = "huT0jZQYfZ2frJeZx29J4YTL7SWqeqAIoFQ35TdkTkI="
    user['encryptionScheme'] = "salted-pbkdf2-hmac-sha256"
    user['factor'] = 24000

    # Add a single registration with the 'user' role.
    user['registrations'] = []
    user['registrations'][0] = {}
    user['registrations'][0]['applicationId'] = $application_id
    user['registrations'][0]['roles'] = ['user']
    users[i] = user
  end

  # Perform the import request
  uri = URI($fusionauth_url)
  http = Net::HTTP.new(uri.hostname, uri.port)
  # https://ruby-doc.org/stdlib-2.7.2/libdoc/net/http/rdoc/Net/HTTP.html
  http.open_timeout = 60       # In seconds (60 is default)
  http.read_timeout = 600      # In seconds (60 is default)
  http.write_timeout = 60      # In seconds (60 is default)
  http.keep_alive_timeout = 10 # In seconds (2 is default)
  if uri.scheme.eql? 'https'
    http.use_ssl = true
    # If you are using as self signed certificate, you may need to set this to VERIFY_NONE
    # http.verify_mode = OpenSSL::SSL::VERIFY_NONE
  end
  req = Net::HTTP::Post.new($fusionauth_url + '/api/user/import')
  req['Content-Type'] = 'application/json'
  req['Authorization'] = $api_key
  req['X-FusionAuth-TenantId'] = $tenant_id

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
    if res.code.to_i == 400
      puts JSON.pretty_generate(JSON.parse(res.body))
    end
    exit 1
  end

  # Increment our counter
  $count = $count + limit
end

puts ""
puts "Completed in [#{Time.new - $start}] seconds"
