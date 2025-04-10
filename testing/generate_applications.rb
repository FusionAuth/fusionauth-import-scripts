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
  [ '--tenantId', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--perTenant', GetoptLong::OPTIONAL_ARGUMENT ],
  [ '--total', GetoptLong::OPTIONAL_ARGUMENT ]
)

argv_length = ARGV.length
api_key = nil
tenant_id = nil
per_tenant = nil
url = nil
total = 100

opts.each do |opt, arg|
  case opt
    when '--help'
      puts <<-EOF

-h, --help:
   show help

--apiKey [apiKey]:
   The API key used in the Authorization header to authorize the Import API.

   Required.

--url [url]:
  The base URL to reach FusionAuth

  Required.

--tenantId [tenantId]:
   The unique Id of the tenant used for the import request. If provided, all applications are created for the speccified tenant.

   Optional.

--perTenant [tenantId]:
   The number of applications to create per tenant. Required when --tenantId is not provided.

   Optional.

--total [total]:
  The total number of applications to generate.

  Default value is 100.

      EOF
    when '--apiKey'
      api_key = arg
    when '--url'
      url = arg
    when '--tenantId'
      tenant_id = arg
    when '--perTenant'
      per_tenant = arg.to_i
    # The total number of applications to generate
    when '--total'
      if arg != ''
        total = arg.to_i
      end
  end
end

if argv_length == 0
  puts "generate_applications: try 'generate_applications --help' for more information."
  exit 0
end

if argv_length < 2
  puts "Usage: generate_applications.rb --apiKey <API Key> --tenantId <Tenant Id> --url <URL>"
  exit 0
end

if tenant_id.nil? && per_tenant.nil?
  puts "One of --tenantId or --perTenant must be provided."
  exit 0
end

# The total number of applications processed so far towards the total
count = 0
i_tenant = 0

# The start of this request
start = Time.new

puts "FusionAuth : Generate Test Applications"
puts " > Total applications: #{total}"
puts ""

# Iterate in batch sizes until we reach the total
while count < total
  if !(per_tenant.nil?) && count > 0 && count % per_tenant == 0
    i_tenant += 1
  end
  puts "[#{count} of #{total} (#{i_tenant})] [#{Time.new.strftime("%a %m/%d %y %H:%M:%S")}] Generate Application request."

  # This user can be customized to better replicate your production configuration.
  application = {}
  application['name'] = "Generated Application [#{count}]"
  application['roles'] = [
    {
      'name': 'user'
    },
    {
      'name': 'admin'
    },
    {
      'name': 'manager'
    },
    {
      'name': 'supervisor'
    },
    {
      'name': 'nobody'
    },
    {
      'name': 'anonymous'
    }
  ]

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

  request_tenant = tenant_id.nil? ? print_uuid($tenant_prefix, i_tenant) : tenant_id
  req = Net::HTTP::Post.new(url + "/api/application/" + print_uuid($application_prefix, count))
  req['Content-Type'] = 'application/json'
  req['Authorization'] = api_key
  req['X-FusionAuth-TenantId'] = request_tenant

  request = {
      'application' => application
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
