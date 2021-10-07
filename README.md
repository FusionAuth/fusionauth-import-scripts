## FusionAuth Import Scripts

We're building out import scripts for any and all third party Identity Providers. Feel free to submit a PR with your specific use of the Import API in whatever language you have.

### Importers

#### Auth0

Gather the following:

* Your Auth0 user data export file
* Your Auth0 secrets export file
* Your FusionAuth instance URL
* A FusionAuth API key. This key must have at least the `/api/user/import` permission to import normal users, and the additional permission of `/api/identity-provider/link` to import social users.

The following gems are required to run this import script.

```ruby
require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
```

If you are familiar with Ruby you can optionally build a build file, or simply install these gems prior to running the script. The `date` and `json` gems are likely already available in your Ruby environment.

You can run `bundle install` if you have bundler installed, or you can install the gems manually: `sudo gem install fusionauth_client`

Finally, execute the Import script:

```bash
ruby ./import.rb -u users.json -s secrets.json -f https://local.fusionauth.io -r 80492376-0ce2-4e9b-afa6-c093b78e57e5,3f282a4b-ef92-4c46-82d2-5eca8fa38293 

You can see all the options:

```bash
ruby ./import.rb -h
```

This script supports loading users from social providers such as LinkedIn or Google if you are running FusionAuth >= 1.28. Otherwise it does not support importing such users.

#### CSV

The example [CSV import script](./csv/import.rb) provides a starting point for importing users from a CSV into FusionAuth.  This example maps the CSV fields by header from [the example CSV](./csv/example_users.csv) onto FusionAuth users within the `map_user` function.  You will likely need to update `map_user` to map the fields from your CSV accordingly.

To begin, modify the section that begins with `BEGIN Modify these variables for your Import` with values that match your FusionAuth environment.

The following gems are required to run this import script.

```ruby
require 'date'
require 'csv'
require 'fusionauth/fusionauth_client'
```

If you are familiar with Ruby you can optionally build a build file, or simply install these gems prior to running the script. The `date` gem is likely already available in your Ruby environment.

```bash
sudo gem install csv
sudo gem install fusionauth_client
```

Finally, execute the Import script.

```bash
ruby ./import.rb
```

#### Generate Test Users

This script will use the Import API to bulk create users for load testing FusionAuth.

The following gems are required to run this import script.

```ruby
require 'rubygems'
require 'json'
require 'net/http'
require 'getoptlong'
require 'openssl'
```

Make sure you set up an application with a `user` role into which to import users. The FusionAuth URL must have no trailing slash. The API key must have at least the `POST` permissions on the `/api/user/import` endpoint. Users will be imported with a password of `password`.

Example usage:

Import 1 million users
```bash
ruby generate_import.rb --apiKey <API Key> --applicationId <Application Id> --tenantId <TenantId> --url http://localhost:9011 --total 1000000 
```

Generate 100,000 users.
```bash
ruby generate_import.rb --apiKey <API Key> --applicationId <Application Id> --tenantId <TenantId> --url http://localhost:9011 --total 100000 
```

Generate 100,000 users with an offset of 100,000. This would allow you to import an additional 100k users after the first 100k.
```bash
ruby generate_import.rb --apiKey <API Key> --applicationId <Application Id> --tenantId <TenantId> --url http://localhost:9011 --total 100000 --ofset 100000
```

#### Generate Applications

This script will use the Application API to create applications.

The following gems are required to run this import script.

```ruby
require 'rubygems'
require 'json'
require 'net/http'
require 'getoptlong'
require 'openssl'
```

Example usage:
Generate 3,000 applications
```bash
ruby generate_applications.rb --apiKey <API Key> --tenantId <TenantId> --url http://localhost:9011 --total 3000 
```


### Project Layout

```
auth0
├── import.rb
csv
├── import.rb
├── example_users.csv
testing
|── generate_applications.rb
|── generate_import.rb
```
