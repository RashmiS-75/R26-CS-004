# src/risk_scorer.py

import pandas as pd
import numpy as np
from src.impact import calculate_impact_from_model, get_risk_level

def calculate_risk_score(model, X, feature_importances=None):
    """
    Main function of the Risk Scoring Engine
    Risk Score = Probability × Impact × 100
    """
    # Probability of being risky (class 1)
    probability = model.predict_proba(X)[:, 1]

    # Impact using Permutation Importance
    impact = calculate_impact_from_model(model, X.values, feature_importances)

    # Final Risk Score
    risk_score = probability * impact * 100

    results = pd.DataFrame({
        "probability": np.round(probability, 4),
        "impact": np.round(impact, 4),
        "risk_score": np.round(risk_score, 2),
        "risk_level": [get_risk_level(s) for s in risk_score]
    })

    return results