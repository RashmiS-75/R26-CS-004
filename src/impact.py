# src/impact.py
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
import shap


# =========================
# Research explainability (keep)
# =========================

def calculate_permutation_importance(model, X, y, n_repeats=3):
    result = permutation_importance(
        model, X, y,
        n_repeats=n_repeats,
        random_state=42,
        scoring="roc_auc",
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

    if isinstance(shap_values, list):
        shap_values = shap_values[1]

    shap_values = np.array(shap_values)

    if shap_values.ndim == 3:
        shap_values = shap_values[:, :, 1]

    importances = np.abs(shap_values).mean(axis=0)
    importances = np.array(importances).flatten()

    n_features = X.shape[1]
    if len(importances) > n_features:
        importances = importances[:n_features]
    elif len(importances) < n_features:
        importances = np.ones(n_features) / n_features

    importances = importances / (importances.sum() + 1e-6)
    return importances


def calculate_impact_from_model(model, X_sample, feature_importances=None):
    """Old SHAP/model-importance impact (optional/research)"""
    X_sample = np.array(X_sample)

    if feature_importances is not None:
        feature_importances = np.array(feature_importances).flatten()
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


# =========================
# Main method for component
# Weighted standards-based Impact
# =========================

def _scale_log(values, typical_max):
    """Stable 0-1 scaling using log1p and a fixed typical upper bound."""
    s = np.log1p(np.clip(np.asarray(values, dtype=float), 0, None))
    denom = np.log1p(float(typical_max))
    if denom <= 0:
        return np.zeros_like(s)
    return np.clip(s / denom, 0.0, 1.0)


def _as_series(df, col, default=0):
    if col in df.columns:
        return pd.to_numeric(df[col], errors="coerce").fillna(default)
    return pd.Series(np.full(len(df), default), index=df.index)


def _as_text(df, col, default=""):
    if col in df.columns:
        return df[col].astype(str).str.lower()
    return pd.Series([default] * len(df), index=df.index)


def _map_apprisk(df):
    """Map application risk to 0-1 severity. Supports text or numeric values."""
    if "apprisk" not in df.columns:
        return np.full(len(df), 0.40)

    raw = df["apprisk"]
    num = pd.to_numeric(raw, errors="coerce")

    if num.notna().mean() > 0.6:
        val = num.fillna(num.median() if num.notna().any() else 0).to_numpy(dtype=float)
        if np.nanmax(val) <= 5:
            return np.clip(val / 5.0, 0, 1)
        return np.clip(val / 100.0, 0, 1)

    txt = raw.astype(str).str.lower()
    out = np.full(len(df), 0.40)
    out = np.where(txt.str.contains("critical|very high|high"), 1.0, out)
    out = np.where(txt.str.contains("medium|moderate"), 0.60, out)
    out = np.where(txt.str.contains("low|info|trusted"), 0.25, out)
    return out


def _map_dstreputation(df):
    """Map destination reputation to 0-1 severity."""
    if "dstreputation" not in df.columns:
        return np.full(len(df), 0.40)

    raw = df["dstreputation"]
    num = pd.to_numeric(raw, errors="coerce")

    if num.notna().mean() > 0.6:
        val = num.fillna(0).to_numpy(dtype=float)
        if np.nanmax(val) <= 5:
            return np.clip(val / 5.0, 0, 1)
        return np.clip(val / 100.0, 0, 1)

    txt = raw.astype(str).str.lower()
    out = np.full(len(df), 0.40)
    out = np.where(txt.str.contains("bad|poor|malicious|untrusted|blacklist|high risk"), 1.0, out)
    out = np.where(txt.str.contains("suspicious|medium|moderate"), 0.65, out)
    out = np.where(txt.str.contains("good|trusted|clean|low"), 0.20, out)
    return out


def _map_appcat(df):
    """Map application category to severity prior."""
    if "appcat" not in df.columns:
        return np.full(len(df), 0.40)

    txt = df["appcat"].astype(str).str.lower()
    out = np.full(len(df), 0.40)
    risky = "malware|proxy|anonymizer|p2p|remote|tool|tunnel|botnet|c2|command"
    elevated = "cloud|file|transfer|update|game|social|stream"
    out = np.where(txt.str.contains(risky), 0.90, out)
    out = np.where(txt.str.contains(elevated), 0.60, out)
    return out


def calculate_weighted_impact(df: pd.DataFrame) -> np.ndarray:
    """
    Multi-feature Impact in [0,1].

    Core traffic/action features always used.
    apprisk / dstreputation / appcat used when available (Impact only, not ML training).
    """
    if isinstance(df, np.ndarray):
        raise ValueError("calculate_weighted_impact needs a DataFrame with column names")

    # Action severity
    action = _as_text(df, "action")
    i_action = np.where(
        action.str.contains("deny|drop|reset|block|reject", regex=True),
        1.0,
        0.45
    )

    # UTM action severity
    utm = _as_text(df, "utmaction")
    i_utm = np.where(
        utm.str.contains("block|deny|quarantine|reset|drop", regex=True),
        1.0,
        0.40
    )

    # Traffic volume
    bytes_total = _as_series(df, "bytes_total", 0)
    if (bytes_total == 0).all():
        bytes_total = _as_series(df, "sentbyte", 0) + _as_series(df, "rcvdbyte", 0)

    # Packets
    pkt_total = _as_series(df, "pkt_total", 0)
    if (pkt_total == 0).all():
        pkt_total = _as_series(df, "sentpkt", 0) + _as_series(df, "rcvdpkt", 0)

    # Duration
    duration = _as_series(df, "duration", 0)

    # Packet ratio
    pkt_ratio = _as_series(df, "pkt_ratio", 0)
    i_ratio = np.clip(np.abs(pkt_ratio.to_numpy(dtype=float)) / 5.0, 0.0, 1.0)

    # Service heuristic
    service = _as_text(df, "service")
    i_service = np.where(
        service.str.contains("dns|ssh|telnet|ftp|rdp|smb|sql|http|https|smtp", regex=True),
        0.85,
        0.40
    )

    # Protocol
    proto = _as_text(df, "proto")
    i_proto = np.where(
        proto.str.contains("tcp|udp|icmp", regex=True),
        0.50,
        0.40
    )

    # Optional severity features
    i_apprisk = _map_apprisk(df)
    i_dstrep = _map_dstreputation(df)
    i_appcat = _map_appcat(df)

    # Continuous scales
    i_bytes = _scale_log(bytes_total, typical_max=50_000)
    i_packets = _scale_log(pkt_total, typical_max=1_000)
    i_duration = _scale_log(duration, typical_max=300)

    # Weights sum to 1.00
    impact = (
        0.14 * i_action +
        0.10 * i_utm +
        0.14 * i_bytes +
        0.10 * i_packets +
        0.10 * i_duration +
        0.08 * i_ratio +
        0.08 * i_service +
        0.05 * i_proto +
        0.09 * i_apprisk +
        0.07 * i_dstrep +
        0.05 * i_appcat
    )

    impact = 0.15 + 0.85 * impact
    return np.clip(impact, 0.15, 1.0)


def get_risk_level(score):
    if score >= 70:
        return "Critical"
    elif score >= 45:
        return "High"
    elif score >= 25:
        return "Medium"
    else:
        return "Low"