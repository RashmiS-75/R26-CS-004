# src/impact.py

import numpy as np
from sklearn.inspection import permutation_importance
import shap

def calculate_permutation_importance(model, X, y, n_repeats=3):
    result = permutation_importance(
        model, X, y,
        n_repeats=n_repeats,
        random_state=42,
        scoring='roc_auc',
        n_jobs=-1
    )
    importances = result.importances_mean
    importances = np.maximum(importances, 0)
    importances = importances / (importances.sum() + 1e-6)
    return importances

def calculate_shap_importance(model, X, max_samples=300):
    """Calculate global SHAP feature importance (safe version)"""
    if len(X) > max_samples:
        X_sample = X.sample(max_samples, random_state=42)
    else:
        X_sample = X.copy()

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    # Handle different SHAP output formats
    if isinstance(shap_values, list):
        shap_values = shap_values[1]  # take class 1

    shap_values = np.array(shap_values)

    # If still 3D or wrong shape, take absolute mean correctly
    if shap_values.ndim == 3:
        shap_values = shap_values[:, :, 1]  # class 1

    importances = np.abs(shap_values).mean(axis=0)
    importances = np.array(importances).flatten()

    # Safety: match number of features
    n_features = X.shape[1]
    if len(importances) > n_features:
        importances = importances[:n_features]
    elif len(importances) < n_features:
        # fallback
        importances = np.ones(n_features) / n_features

    importances = importances / (importances.sum() + 1e-6)
    return importances

def calculate_impact_from_model(model, X_sample, feature_importances=None):
    X_sample = np.array(X_sample)

    if feature_importances is not None:
        feature_importances = np.array(feature_importances).flatten()

        # Final safety check
        if len(feature_importances) != X_sample.shape[1]:
            feature_importances = np.ones(X_sample.shape[1]) / X_sample.shape[1]

        impact = np.dot(np.abs(X_sample), feature_importances)
        impact = impact / (impact.max() + 1e-6)
    else:
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            importances = importances / (importances.sum() + 1e-6)
            impact = np.dot(np.abs(X_sample), importances)
            impact = impact / (impact.max() + 1e-6)
        else:
            impact = np.mean(np.abs(X_sample), axis=1)
            impact = impact / (impact.max() + 1e-6)

    return np.clip(impact, 0.05, 1.0)

def get_risk_level(score):
    if score >= 75:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 25:
        return "Medium"
    else:
        return "Low"