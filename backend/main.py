import hashlib
import sqlite3
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

users_col = MongoClient("mongodb://127.0.0.1:27017/")["audixa"]["users"]

RISK_API = "http://127.0.0.1:8000/analyze"
CLASSIFY_API = "http://127.0.0.1:8005"
RECOMMEND_API = "http://127.0.0.1:8007"
MONGO_URI = "mongodb://127.0.0.1:27017"
mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
risk_sessions = mongo["audixa"]["risk_sessions"]

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

def hash_password(password: str) -> str:
    return hashlib.sha256(("audixa-salt-" + password).encode()).hexdigest()


@app.post("/login")
def login(data: LoginRequest):
    user = users_col.find_one({"username": data.username.lower().strip()})
    if not user or user.get("password_hash") != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "username": user["username"],
        "role": user.get("role", "auditor"),
        "name": user.get("name", user["username"]),
        "token": f"audixa-{user['username']}",
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
        data = res.json()
        summary = data.get("summary", {})
        try:
            risk_sessions.insert_one({
                "filename": file.filename,
                "uploaded_at": datetime.now(timezone.utc),
                "total": summary.get("total"),
                "critical": summary.get("critical"),
                "high": summary.get("high"),
                "medium": summary.get("medium"),
                "low": summary.get("low"),
                "avg_score": summary.get("avgScore") or summary.get("avg_score"),
                "max_score": summary.get("maxScore") or summary.get("max_score"),
            })
        except Exception:
            pass
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk service unavailable: {e}")

@app.get("/risk/sessions")
def risk_sessions_list():
    rows = list(risk_sessions.find().sort("uploaded_at", -1))
    for row in rows:
        row["id"] = str(row.pop("_id"))
        if "uploaded_at" in row:
            row["uploaded_at"] = row["uploaded_at"].isoformat()
    return rows

@app.delete("/risk/sessions/{session_id}")
def risk_sessions_delete(session_id: str):
    result = risk_sessions.delete_one({"_id": ObjectId(session_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}

@app.delete("/classify/sessions/{session_id}")
async def classify_delete_session(session_id: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.delete(f"{CLASSIFY_API}/sessions/{session_id}")
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()

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

@app.get("/recommend/health")
async def recommend_health():
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{RECOMMEND_API}/docs")
            return {"status": "connected" if res.status_code < 500 else "down"}
        except Exception as e:
            return {"status": "down", "detail": str(e)}

@app.post("/recommend/{path:path}")
async def recommend_post(path: str, file: UploadFile = File(None)):
    async with httpx.AsyncClient(timeout=180.0) as client:
        if file:
            content = await file.read()
            res = await client.post(
                f"{RECOMMEND_API}/{path}",
                files={"file": (file.filename, content, file.content_type or "text/csv")},
            )
        else:
            res = await client.post(f"{RECOMMEND_API}/{path}")
    if res.status_code >= 400:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()