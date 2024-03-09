#!/bin/bash
#https://fusionauth.io/community/forum/topic/110/how-can-i-get-all-users-for-an-application-using-the-api/2

if [ "$API_KEY" = "" ]; then
    echo "Must set env variable \$API_KEY. Exiting."
    exit
fi

if [ "$APPLICATION_ID" = "" ]; then
    echo "Must set env variable \$APPLICATION_ID. Exiting."
    exit
fi

if [ "$HOSTNAME" = "" ]; then
    echo "Must set env variable \$HOSTNAME. Exiting."
    exit
fi

QUERY='{"bool":{"must_not":{"wildcard":{"email":"emily.pakulski*"}}}}'
ENC_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$QUERY'''))")
CURL_RESP=$(curl -s -H "Authorization: $API_KEY" "$HOSTNAME/api/user/search?limit=5&query=$ENC_QUERY&expand=[]")

#echo $CURL_RESP | python3 parse_user_json.py

read -p "Are you sure you want to proceed with deletion?" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
     # /api/user/bulk ?query={query}&hardDelete=true&dryRun=false&limit=10000
     DELETE_RESP=$(curl -X DELETE -v -H "Authorization: $API_KEY" "$HOSTNAME/api/user/bulk?query=$ENC_QUERY&hardDelete=true&dryRun=false")
     echo $DELETE_RESP
fi
