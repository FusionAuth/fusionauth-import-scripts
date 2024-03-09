export a few env variables.
```
export API_KEY=""
export APPLICATION_ID=""
export TENANT_ID=""
export HOSTNAME=""
```

once that's done, to run the script:
```
ruby ~/fusionauth-import-scripts/auth0/import.rb \
-f $HOSTNAME \
-k $API_KEY \
-t $TENANT_ID \
-u <FLAT JSON FILE FROM AUTH0 EXPORT EXTENSION> \
-s <FLAT JSON FILE FROM AUTH0 SUPPORT TICKET WITH HASHES> 
```

from there, to check your import:
```
bash curl_command.sh 
```
