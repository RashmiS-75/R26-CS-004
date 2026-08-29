from pymongo import MongoClient
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(("audixa-salt-" + password).encode()).hexdigest()

client = MongoClient("mongodb://127.0.0.1:27017/")
users = client["audixa"]["users"]

users.delete_many({})
users.insert_many([
    {
        "username": "auditor",
        "password_hash": hash_password("audit123"),
        "role": "auditor",
        "name": "Firewall Auditor",
    },
    {
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "role": "admin",
        "name": "Audixa Admin",
    },
])

print("✅ Mongo users ready")
for u in users.find({}, {"_id": 0, "password_hash": 0}):
    print(u)