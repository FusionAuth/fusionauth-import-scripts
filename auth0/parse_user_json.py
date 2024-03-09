import sys, json

data = json.load(sys.stdin)
print("Users returned for query: " + str(data["total"]))

if "users" not in data:
    print("users is missing from json payload")
    exit

print("Length of users array: " + str(len(data["users"])))

get_ids = lambda data: ",".join(str(obj["id"]) for obj in data["users"])
result = get_ids(data)
print(result)
