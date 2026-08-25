from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import joblib
import json
import pandas as pd
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import PyMongoError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from database import sessions_collection

ART = Path("artifacts")
model       = joblib.load(ART / "model.joblib")
severity_le = joblib.load(ART / "severity_label_encoder.joblib")
schema      = json.loads((ART / "feature_schema.json").read_text())

NUMERIC_FEATURES     = schema["numeric_features"]
CATEGORICAL_FEATURES = schema["categorical_features"]
MODEL_COLUMNS        = NUMERIC_FEATURES + CATEGORICAL_FEATURES

class FirewallLogEntry(BaseModel):
    # --- Numeric fields ---
    source_port:      int   = Field(..., alias="Source Port",      ge=0, le=65535)
    destination_port: int   = Field(..., alias="Destination Port", ge=0, le=65535)
    packet_length:    int   = Field(..., alias="Packet Length",    ge=0)
    anomaly_scores:   float = Field(..., alias="Anomaly Scores",   ge=0.0, le=100.0)

    # --- Categorical fields ---
    protocol:        Literal["TCP", "UDP", "ICMP"]               = Field(..., alias="Protocol")
    packet_type:     Literal["Data", "Control"]                   = Field(..., alias="Packet Type")
    traffic_type:    Literal["HTTP", "DNS", "FTP"]                = Field(..., alias="Traffic Type")
    action_taken:    Literal["Blocked", "Ignored", "Logged"]      = Field(..., alias="Action Taken")
    network_segment: Literal["Segment A", "Segment B", "Segment C"] = Field(..., alias="Network Segment")

    # --- Sparse raw fields ---
    malware_indicators: Optional[str] = Field(None, alias="Malware Indicators")
    alerts_warnings:    Optional[str] = Field(None, alias="Alerts/Warnings")
    proxy_information:  Optional[str] = Field(None, alias="Proxy Information")
    firewall_logs:      Optional[str] = Field(None, alias="Firewall Logs")
    ids_ips_alerts:     Optional[str] = Field(None, alias="IDS/IPS Alerts")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "Source Port": 17245,
                "Destination Port": 48166,
                "Packet Length": 1174,
                "Anomaly Scores": 51.5,
                "Protocol": "UDP",
                "Packet Type": "Data",
                "Traffic Type": "HTTP",
                "Action Taken": "Blocked",
                "Network Segment": "Segment B",
                "Malware Indicators": "IoC Detected",
                "Alerts/Warnings": None,
                "Proxy Information": None,
                "Firewall Logs": "Log Data",
                "IDS/IPS Alerts": None,
            }
        }


class PredictionResponse(BaseModel):
    severity: str


class SessionSaveRequest(BaseModel):
    filename: str
    total_logs: int
    high_count: int
    medium_count: int
    low_count: int
    predictions: list[dict[str, Any]]


class SessionSummary(BaseModel):
    id: str
    filename: str
    uploaded_at: datetime
    total_logs: int
    high_count: int
    medium_count: int
    low_count: int


class SessionDetail(SessionSummary):
    predictions: list[dict[str, Any]]

def _is_present(value) -> int:
    if value is None:
        return 0
    if isinstance(value, float) and pd.isna(value):
        return 0
    if isinstance(value, str) and value.strip() == "":
        return 0
    return 1


def _preprocess(entry: FirewallLogEntry) -> pd.DataFrame:
    row = {
        # Numeric
        "Source Port":      entry.source_port,
        "Destination Port": entry.destination_port,
        "Packet Length":    entry.packet_length,
        "Anomaly Scores":   entry.anomaly_scores,
        # Binary flags derived from sparse raw fields
        "Has_Malware_Indicator": _is_present(entry.malware_indicators),
        "Has_Alert_Warning":     _is_present(entry.alerts_warnings),
        "Has_Proxy":             _is_present(entry.proxy_information),
        "Has_Firewall_Log":      _is_present(entry.firewall_logs),
        "Has_IDS_IPS_Alert":     _is_present(entry.ids_ips_alerts),
        # Categorical
        "Protocol":        entry.protocol,
        "Packet Type":     entry.packet_type,
        "Traffic Type":    entry.traffic_type,
        "Action Taken":    entry.action_taken,
        "Network Segment": entry.network_segment,
    }
    return pd.DataFrame([row], columns=MODEL_COLUMNS)


app = FastAPI(
    title="Firewall Log Severity Classifier",
    description="Predicts Severity Level (Low/Medium/High) from raw firewall log fields.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health") #health check
def health():
    return {"status": "ok"}


@app.get("/schema")
def get_schema():
    """Returns the feature schema the model was trained on."""
    return schema


@app.post("/predict", response_model=PredictionResponse)
def predict(entry: FirewallLogEntry):
    """Predict Severity for a single raw firewall log entry."""
    X = _preprocess(entry)
    pred = model.predict(X)[0]   # single integer, not array
    return PredictionResponse(
        severity=severity_le.inverse_transform([pred])[0]
    )


@app.post("/predict_batch", response_model=list[PredictionResponse])
def predict_batch(entries: list[FirewallLogEntry]):
    """Predict for many entries at once."""
    X = pd.concat([_preprocess(e) for e in entries], ignore_index=True)
    preds = model.predict(X)
    return [
        PredictionResponse(
            severity=severity_le.inverse_transform([p])[0]
        )
        for p in preds
    ]


def _parse_session_id(session_id: str) -> ObjectId:
    try:
        return ObjectId(session_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid session id")


@app.post("/sessions/save")
def save_session(session: SessionSaveRequest):
    """Save a batch prediction session for later retrieval in Upload History."""
    doc = session.model_dump()
    doc["uploaded_at"] = datetime.now(timezone.utc)
    try:
        result = sessions_collection.insert_one(doc)
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Cannot connect to the database.")
    return {"id": str(result.inserted_id)}


@app.get("/sessions", response_model=list[SessionSummary])
def list_sessions():
    """List all saved sessions (summary fields only), newest first."""
    try:
        docs = list(sessions_collection.find({}, {"predictions": 0}).sort("uploaded_at", -1))
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Cannot connect to the database.")
    return [
        SessionSummary(
            id=str(doc["_id"]),
            filename=doc["filename"],
            uploaded_at=doc["uploaded_at"],
            total_logs=doc["total_logs"],
            high_count=doc["high_count"],
            medium_count=doc["medium_count"],
            low_count=doc["low_count"],
        )
        for doc in docs
    ]


@app.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: str):
    """Return one full session, including its predictions array."""
    try:
        doc = sessions_collection.find_one({"_id": _parse_session_id(session_id)})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Cannot connect to the database.")
    if doc is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetail(
        id=str(doc["_id"]),
        filename=doc["filename"],
        uploaded_at=doc["uploaded_at"],
        total_logs=doc["total_logs"],
        high_count=doc["high_count"],
        medium_count=doc["medium_count"],
        low_count=doc["low_count"],
        predictions=doc["predictions"],
    )


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    """Permanently delete one session by id."""
    try:
        result = sessions_collection.delete_one({"_id": _parse_session_id(session_id)})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Cannot connect to the database.")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}