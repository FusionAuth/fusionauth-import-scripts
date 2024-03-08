for staging:
```
ruby ~/fusionauth-import-scripts/auth0/import.rb \
-f https://viam.fusionauth.io \
-k <API KEY> \
-t <TENANT ID FOR STAGING ENVIRONMENT, NOT LOCAL> \
-u <FLAT JSON FILE FROM AUTH0 EXPORT EXTENSION> \
-s <FLAT JSON FILE FROM AUTH0 SUPPORT TICKET WITH HASHES> 
```
