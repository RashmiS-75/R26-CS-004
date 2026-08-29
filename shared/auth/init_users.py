import sqlite3
from pathlib import Path
import hashlib

DB = Path(__file__).resolve().parent / "audixa_users.db"

def hash_password(password: str) -> str:
    return hashlib.sha256(("audixa-salt-" + password).encode()).hexdigest()

USERS = [
    ("admin", "admin123", "Admin", "System Admin"),
    ("auditor", "audit123", "Auditor", "Firewall Auditor"),
    ("rashmi", "rashmi123", "Risk Owner", "Rashmi"),
    ("senumi", "senumi123", "Classification Owner", "Senumi"),
    ("nethmi", "nethmi123", "Compliance Owner", "Nethmi"),
    ("imashi", "imashi123", "Recommendation Owner", "Imashi"),
]

def main():
    print("Creating DB at:", DB)
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL
        )
    """)
    cur.execute("DELETE FROM users")
    for username, password, role, name in USERS:
        cur.execute(
            "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)",
            (username, hash_password(password), role, name),
        )
    conn.commit()
    conn.close()
    print("✅ Users created")

if __name__ == "__main__":
    main()