# src/risk_scorer.py
import pandas as pd
import numpy as np
from src.fuzzy_impact import calculate_fuzzy_impact, get_risk_level


MODEL_FEATURES = [
    "proto", "action", "service", "duration",
    "sentbyte", "rcvdbyte", "sentpkt", "rcvdpkt", "trandisp",
    "bytes_total", "pkt_total", "pkt_ratio"
]


def calculate_risk_score(model, X, feature_importances=None, use_weighted_impact=True):
    """
    Risk Scoring Engine core

    predicted_label = ML class prediction (0/1)
    likelihood      = ML probability of malicious class
    impact          = Fuzzy non-ML severity score
    risk_score      = likelihood * impact * 100
    """
    if isinstance(X, pd.DataFrame):
        X_df = X.copy()
    else:
        X_df = pd.DataFrame(X)

    # Model sees only trained features
    model_cols = [c for c in MODEL_FEATURES if c in X_df.columns]
    if len(model_cols) < 5:
        raise ValueError(f"Not enough model features. Found: {model_cols}")

    X_model = X_df[model_cols].copy()
    X_model = X_model.fillna(X_model.median(numeric_only=True))

    # 1) Predicted class for comparison with labels
    predicted_label = model.predict(X_model)

    # 2) Likelihood from ML model
    likelihood = model.predict_proba(X_model)[:, 1]

    # 3) Impact from advanced fuzzy non-ML engine
    #    Can use extra columns like apprisk/appcat/dstreputation if present
    impact = calculate_fuzzy_impact(X_df)

    # 4) Core risk formula
    risk_score = likelihood * impact * 100

    return pd.DataFrame({
        "predicted_label": predicted_label.astype(int),
        "likelihood": np.round(likelihood, 4),
        "probability": np.round(likelihood, 4),  # backward compatible
        "impact": np.round(impact, 4),
        "risk_score": np.round(risk_score, 2),
        "risk_level": [get_risk_level(s) for s in risk_score]
    })