# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
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
except Exception:
    shap_importance = None
    print("⚠️ SHAP importance not found")

EXPECTED_FEATURES = [
    "proto", "action", "service", "utmaction", "duration",
    "sentbyte", "rcvdbyte", "sentpkt", "rcvdpkt", "trandisp",
    "bytes_total", "pkt_total", "pkt_ratio",
    "apprisk", "dstreputation", "appcat"
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

        # Remove label if present
        if "label" in df.columns:
            df = df.drop(columns=["label"])

        # Keep only available expected features
        available = [c for c in EXPECTED_FEATURES if c in df.columns]
        if len(available) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough required features. Found: {list(df.columns)}"
            )

        X = df[available].copy()

        # Fill missing numeric values
        X = X.fillna(X.median(numeric_only=True))

        # Create helper columns for weighted impact if needed
        if "bytes_total" not in X.columns and {"sentbyte", "rcvdbyte"}.issubset(X.columns):
            X["bytes_total"] = X["sentbyte"].fillna(0) + X["rcvdbyte"].fillna(0)

        if "pkt_total" not in X.columns and {"sentpkt", "rcvdpkt"}.issubset(X.columns):
            X["pkt_total"] = X["sentpkt"].fillna(0) + X["rcvdpkt"].fillna(0)

        # Risk scoring:
        # Likelihood from ML probability
        # Impact from weighted factors (fallback to SHAP/model impact)
        results = calculate_risk_score(model, X, shap_importance)

        # Combine original logs + scores
        full_results = pd.concat(
            [original_df.reset_index(drop=True), results.reset_index(drop=True)],
            axis=1
        )

        summary = {
            "total": int(len(results)),
            "avg_score": float(results["risk_score"].mean()) if len(results) else 0.0,
            "max_score": float(results["risk_score"].max()) if len(results) else 0.0,
            "critical": int((results["risk_level"] == "Critical").sum()),
            "high": int((results["risk_level"] == "High").sum()),
            "medium": int((results["risk_level"] == "Medium").sum()),
            "low": int((results["risk_level"] == "Low").sum()),
        }

        return {
            "summary": summary,
            "detailed": full_results.to_dict(orient="records")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))