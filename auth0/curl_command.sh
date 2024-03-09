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

QUERY='{ "bool" : { "must" : [ [ { "nested" : { "path" : "registrations", "query" : { "bool" : { "must" : [ { "match" : { "registrations.applicationId" : "'"$APPLICATION_ID"'" } } ] } } } } ] ] } }'
ENC_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$QUERY'''))")
CURL_RESP=$(curl -s -H "Authorization: $API_KEY" "https://viam.fusionauth.io/api/user/search?query=$ENC_QUERY")

echo $CURL_RESP

echo $CURL_RESP | python3 -c 'import sys, json;obj = json.load(sys.stdin);print("Users returned for query: " + str(obj["total"]))'
