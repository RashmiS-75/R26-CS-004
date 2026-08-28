import hashlib
import sqlite3
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

AUTH_DB = Path(__file__).resolve().parent.parent / "shared" / "auth" / "audixa_users.db"
RISK_API = "http://127.0.0.1:8000/analyze"
CLASSIFY_API = "http://127.0.0.1:8005"

app = FastAPI(title="Audixa Main API")
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

@app.get("/")
def root():
    return {"message": "Audixa Main API is running"}

@app.get("/overview")
def overview():
    return {
        "risk_scoring": "connected",
        "log_classification": "connected",
        "compliance": "pending",
        "recommendation": "pending",
    }

@app.post("/login")
def login(data: LoginRequest):
    if not AUTH_DB.exists():
        raise HTTPException(status_code=500, detail="User database not found")
    conn = sqlite3.connect(AUTH_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT username, password_hash, role, name FROM users WHERE username = ?",
        (data.username.lower().strip(),),
    )
    row = cur.fetchone()
    conn.close()
    if not row or row["password_hash"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "username": row["username"],
        "role": row["role"],
        "name": row["name"],
        "token": f"audixa-{row['username']}",
    }

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        content = await file.read()
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                RISK_API,
                files={"file": (file.filename, content, file.content_type or "text/csv")},
            )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        return res.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk service unavailable: {e}")

@app.get("/classify/health")
async def classify_health():
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(f"{CLASSIFY_API}/health")
        return res.json()

@app.post("/classify/predict_batch")
async def classify_predict_batch(payload: list[dict]):
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(f"{CLASSIFY_API}/predict_batch", json=payload)
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()

@app.post("/classify/sessions/save")
async def classify_save_session(payload: dict):
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(f"{CLASSIFY_API}/sessions/save", json=payload)
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()

@app.get("/classify/sessions")
async def classify_sessions():
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(f"{CLASSIFY_API}/sessions")
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()

@app.get("/compliance")
def compliance():
    return {"status": "module_not_connected"}

@app.get("/recommend")
def recommend():
    return {"status": "module_not_connected"}