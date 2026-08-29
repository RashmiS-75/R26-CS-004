import sqlite3
import hashlib
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB = Path(__file__).resolve().parent / "audixa_users.db"

app = FastAPI(title="Audixa Auth Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(("audixa-salt-" + password).encode()).hexdigest()

def get_user(username: str):
    if not DB.exists():
        return None
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT username, password_hash, role, name FROM users WHERE username = ?",
        (username.lower().strip(),),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None

@app.get("/")
def root():
    return {"message": "Audixa Auth Service is running"}

@app.post("/login")
def login(data: LoginRequest):
    user = get_user(data.username)
    if not user or user["password_hash"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
        "token": f"audixa-{user['username']}",
    }