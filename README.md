## FusionAuth Import Scripts

We're building out import scripts for any and all third party Identity Providers. Feel free to submit a PR with your specific use of the Import API in whatever language you have.

## Importers

### Auth0

Gather the following:

* Your Auth0 user data export file
* Your Auth0 secrets export file
* Your FusionAuth instance URL
* A FusionAuth API key. This key must have at least the `/api/user/import` permission to import normal users, and the additional permissions of `/api/identity-provider/link` and `/api/user/search` to import social users.

The following gems are required to run this import script.

```ruby
require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
require 'securerandom'
```

If you are familiar with Ruby you can optionally build a build file, or simply install these gems prior to running the script. The `date`, `optparse`, `securerandom` and `json` gems are likely already available in your Ruby environment.

You can run `bundle install` if you have bundler installed, or you can install the gems manually: `sudo gem install fusionauth_client`, etc.

Finally, execute the Import script:

```bash
ruby ./import.rb -k fusionauth-api-key -u users.json -s secrets.json -f https://local.fusionauth.io -r 80492376-0ce2-4e9b-afa6-c093b78e57e5,3f282a4b-ef92-4c46-82d2-5eca8fa38293 

You can see all the options:

```bash
ruby ./import.rb -h
```

#### Social providers

This script supports loading users from social providers such as LinkedIn or Google if you are running FusionAuth >= 1.28. Otherwise it does not support importing such users.

If you are importing users with social providers, ensure that the Identity Provider is created in FusionAuth before importing the social users. See https://fusionauth.io/docs/v1/tech/identity-providers/ for more.

You can find additional social provider identity provider ids: https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java and you may need to update the `idp_identifiers_to_auth0_type` variable with additional mappings between what Auth0 calls a social provider and the Id FusionAuth user. 

### CSV

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

### Keycloak

Gather the following:

* Your Keycloak database credentials
* The Id of each realm you want to import.
* Your FusionAuth instance URL
* A FusionAuth API key. This key must have at least the `/api/user/import` permission to import users.

#### Install the plugin

Keycloak by default uses a password hashing algorithm that doesn't ship with FusionAuth. However, there is an example password hashing plugin available here:

Install the plugin. By default, it installs the plugin with the name `example-keycloak`. You can use a different name, but if you do, you'll need to modify the `map_hashing_algorithm` method in the import script. 

Here are the installation instructions: https://fusionauth.io/docs/v1/tech/plugins/writing-a-plugin/#install-the-plugin

If you used a different hashing algorithm, build a plugin that uses that algorithm and install it.

#### Retrieve the user data

Run the SQL query in `keycloak/keycloak-export.sql` to retrieve the needed data for each realm.

Edit that file to replace `RealmID` with the value of the realm. You can find that in the admin screen, it is the `Name` field of the realm. You'll want a separate output file for each realm. Realms in Keycloak map to Tenants in FusionAuth.

Output the results of this query to a CSV file. How you do so depends on the database. Assuming the SQL above is stored in `keycloak-export.sql`, the database username is `USER`, the database password is `password`, and the keycloak database is `keycloak`, the export command might be: 

* mysql: `cat keycloak-export.sql | mysql -u USER -ppassword keycloak| sed 's/\t/,/g' > out.csv`. You may have to remove the header line.
* postgresql: `psql -W -h localhost -p5433 -U USER -d fusionauth -c "Copy (CONTENTS OF SQL FILE) To STDOUT With CSV HEADER DELIMITER ',';" > out.csv`

In any event, you'll end up with a file that looks like this:

```
FIRST_NAME,LAST_NAME,EMAIL,USERNAME,EMAIL_VERIFIED,ID,SECRET_DATA,CREDENTIAL_DATA,CREATED_TIMESTAMP,REALM_ID
Test,Example,test@example.com,test,\0,f35a58e2-0247-4c38-aa39-93405e09c677,{"value":"T6S/56cQy0ahQKohXe61aMOhvFr/PHEPfQbILKMLZKrdfOSo8wc+S6HCYomSJwTgYmdPy2gKh+oQW9UbeCmEwQ==","salt":"eYcTxcZhBV+GU9BQRt8Ypw==","additionalParameters":{}},{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}},1634670076567,Test
Test,Example2,test2@example.com,test2,,1709a278-12a5-4126-9542-02f6809a349e,{"value":"LjFqvhPuUHJdQvWIwVQfqxjeujAWqG/DVQRFoOv62/cTznl9ob4jwWwY6i1RrwGviu5iNPU5VIp03SxDyetyfw==","salt":"jVqbuA9k2Mlo37OWXBMKLw==","additionalParameters":{}},{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}},1634670197972,Test
```

You can tweak this SQL file to, for example, only retrieve enabled users or those created after a certain date. The main tables you are interested in are `USER_ENTITY` and `CREDENTIAL`.

#### Import the data

The following gems are required to run this import script.

```ruby
require 'date'
require 'json'
require 'fusionauth/fusionauth_client'
require 'optparse'
```

If you are familiar with Ruby you can optionally build a build file, or simply install these gems prior to running the script. The `date`, `optparse` and `json` gems are likely already available in your Ruby environment.

You can run `bundle install` if you have bundler installed, or you can install the gems manually: `sudo gem install fusionauth_client`, etc.

Finally, execute the import script. This command imports into an instance running at local.fusionauth.io, into the `80492376-0ce2-4e9b-afa6-c093b78e57e5` tenant, from the `import.csv` file:

```bash
ruby ./import.rb -u import.csv -f https://local.fusionauth.io -t 80492376-0ce2-4e9b-afa6-c093b78e57e5 -k apikeyapikey

You can see all the options:

```bash
ruby ./import.rb -h
```

### Firebase

Please see https://fusionauth.io/docs/v1/tech/migration-guide/firebase for full instructions.

### Azure AD B2C

Please see https://fusionauth.io/docs/v1/tech/migration-guide/azureadb2c for full instructions.

### Duende Identity Server

Please see https://fusionauth.io/docs/v1/tech/migration-guide/duende for full instructions.

### Amazon Cognito

Please see https://fusionauth.io/docs/v1/tech/migration-guide/cognito for full instructions.

### Stytch 

Please see https://fusionauth.io/docs/lifecycle/migrate-users/bulk/stytch for full instructions.


### Generate Test Users

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

### Generate Applications

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


### Ping Identity

Please see https://fusionauth.io/docs/lifecycle/migrate-users/bulk/pingone for full instructions 

