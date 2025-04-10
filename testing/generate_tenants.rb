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
  [ '--url', GetoptLong::REQUIRED_ARGUMENT ],
  [ '--offset', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--total', GetoptLong::OPTIONAL_ARGUMENT ]
)

argv_length = ARGV.length
api_key = nil
url = nil
offset = 0
total = 10

opts.each do |opt, arg|
  case opt
    when '--help'
      puts <<-EOF

-h, --help:
   show help

--apiKey [apiKey]:
   The API key used in the Authorization header to authorize the Tenant API.

   Required.

--url [url]:
  The base URL to reach FusionAuth/

  Required.

--offset [offset]:
  The offset to use when generating unique email addresses for the import. Use
  this value when importing more than once to the same tenant with this script
  to avoid email collisions.

  Default value is 0.

--total [total]:
  The total number of tenants to generate.

  Default value is 10.

      EOF
    when '--apiKey'
      api_key = arg
    when '--url'
      url = arg
    when '--offset'
      if arg != ''
        offset = arg.to_i
      end
    # The total number of tenants to generate
    when '--total'
      if arg != ''
        total = arg.to_i
      end
  end
end

if argv_length == 0
  puts "generate_tenants: try 'generate_tenants --help' for more information."
  exit 0
end

if argv_length < 3
  puts "Usage: generate_tenants.rb --apiKey <API Key> --tenantId <Tenant Id> --url <URL>"
  exit 0
end

# The total number of tenants processed so far towards the total
count = offset
total += offset

# The start of this request
start = Time.new

puts "FusionAuth : Generate Test Tenants"
puts " > Total tenants: #{total}"
puts ""

# Iterate in batch sizes until we reach the total
while count < total

  puts "[#{count} of #{total}] [#{Time.new.strftime("%a %m/%d %y %H:%M:%S")}] Generate Tenant request."

  # This user can be customized to better replicate your production configuration.
  tenant = {}
  tenant['name'] = "Generated Tenant [#{count}]"
  tenant['passwordEncryptionConfiguration'] = {}
  tenant['passwordEncryptionConfiguration']['encryptionScheme'] = "salted-md5"
  tenant['passwordEncryptionConfiguration']['encryptionSchemeFactor'] = 1

  # Perform the create request
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

  req = Net::HTTP::Post.new(url + "/api/tenant/" + print_uuid($tenant_prefix, count))
  req['Content-Type'] = 'application/json'
  req['Authorization'] = api_key

  request = {
      'tenant' => tenant
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
  count = count + 1
end

puts ""
puts "Completed in [#{Time.new - start}] seconds"
