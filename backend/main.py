# backend/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import joblib
import numpy as np
import io
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.risk_scorer import calculate_risk_score

app = FastAPI(title="Audixa Risk Scoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "best_risk_model.pkl")
SHAP_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "shap_importance.pkl")

try:
    model = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    model = None

try:
    shap_importance = joblib.load(SHAP_PATH)
    print("✅ SHAP importance loaded")
except:
    shap_importance = None
    print("⚠️ SHAP importance not found")

EXPECTED_FEATURES = [
    'proto', 'action', 'service', 'utmaction', 'duration',
    'sentbyte', 'rcvdbyte', 'sentpkt', 'rcvdpkt', 'trandisp',
    'bytes_total', 'pkt_total', 'pkt_ratio'
]

@app.get("/")
def root():
    return {"message": "Audixa Risk Scoring API is running"}

@app.post("/analyze")
async def analyze_risk(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        original_df = df.copy()

        if 'label' in df.columns:
            df = df.drop(columns=['label'])

        available = [c for c in EXPECTED_FEATURES if c in df.columns]
        if len(available) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough required features. Found: {list(df.columns)}"
            )

        X = df[available].copy()
        X = X.fillna(X.median(numeric_only=True))

        results = calculate_risk_score(model, X, shap_importance)

        # Combine original log data + risk scores
        full_results = pd.concat(
            [original_df.reset_index(drop=True), results.reset_index(drop=True)],
            axis=1
        )

        detailed = full_results.to_dict(orient="records")

        summary = {
            "total": len(results),
            "critical": int((results["risk_level"] == "Critical").sum()),
            "high": int((results["risk_level"] == "High").sum()),
            "medium": int((results["risk_level"] == "Medium").sum()),
            "low": int((results["risk_level"] == "Low").sum()),
        }

        # Return summary + full detailed results (all rows)
        detailed = full_results.to_dict(orient="records")

        return {
            "summary": summary,
            "detailed": detailed
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))