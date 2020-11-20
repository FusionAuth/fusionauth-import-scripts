## FusionAuth Import Scripts

We're building out import scripts for any and all third party Identity Providers. Feel free to submit a PR with your specific use of the Import API in whatever language you have.

### Importers

#### Auth0

To begin, modify the section that begins with ` BEGIN Modify these variables for your Import`. Once you have provided a URL and API key, and the location of the exported Auth0 files, you may execute the import script.

The following gems are required to run this import script.

```ruby
require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
```

If you are familiar with Ruby you can optionally build a build file, or simply install these gems prior to running the script. The `date` and `json` gems are likely already available in your Ruby environment.

```bash
sudo gem install fusionauth_client
```

Finally, execute the Import script.

```bash
ruby ./import.rb
```

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

To begin, modify the section that begins with `BEGIN Modify these variables for your Import`. Once you have provided an API key, Application Id, Tenant Id and FusionAuth URL you may execute the script.

The following gems are required to run this import script.

```ruby
require 'rubygems'
require 'json'
require 'net/http'
require 'openssl'
```


Example usage:

The default behavior will be to import 1 million users.
```bash
ruby ./generate_import.rb
```

Generate 100,000 users.
```bash
ruby ./generate_import.rb 100000
```

Generate 100,000 users with an offset of 100,000. This would allow you to import an additional 100k users after the first 100k.
```bash
ruby ./generate_import.rb 100000 100000
```

### Project Layout

```
auth0
├── import.rb
csv
├── import.rb
├── example_users.csv
testing
|── generate_import.rb
```
