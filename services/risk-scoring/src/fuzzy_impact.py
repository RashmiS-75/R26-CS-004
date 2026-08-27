# src/fuzzy_impact.py
"""
Fuzzy Logic Impact Engine for Audixa Risk Scoring Component
----------------------------------------------------------
Impact is computed without ML using:
1) feature severity extraction
2) fuzzy membership (Low/Medium/High)
3) fuzzy rules
4) defuzzification to continuous Impact in [0,1]
"""

import numpy as np
import pandas as pd


# =========================
# Helpers
# =========================

def _as_series(df, col, default=0.0):
    if col in df.columns:
        return pd.to_numeric(df[col], errors="coerce").fillna(default)
    return pd.Series(np.full(len(df), default), index=df.index)


def _as_text(df, col, default=""):
    if col in df.columns:
        return df[col].astype(str).str.lower().fillna(default)
    return pd.Series([default] * len(df), index=df.index)


def _scale_log(values, typical_max):
    s = np.log1p(np.clip(np.asarray(values, dtype=float), 0, None))
    denom = np.log1p(float(typical_max))
    if denom <= 0:
        return np.zeros_like(s)
    return np.clip(s / denom, 0.0, 1.0)


def _fuzzy_membership(x):
    """
    Membership for normalized value x in [0,1]:
    returns mu_low, mu_medium, mu_high
    """
    x = float(np.clip(x, 0, 1))

    # Low
    if x <= 0.2:
        mu_low = 1.0
    elif x >= 0.5:
        mu_low = 0.0
    else:
        mu_low = (0.5 - x) / 0.3

    # Medium
    if x <= 0.2 or x >= 0.8:
        mu_med = 0.0
    elif x < 0.5:
        mu_med = (x - 0.2) / 0.3
    else:
        mu_med = (0.8 - x) / 0.3

    # High
    if x <= 0.5:
        mu_high = 0.0
    elif x >= 0.8:
        mu_high = 1.0
    else:
        mu_high = (x - 0.5) / 0.3

    s = mu_low + mu_med + mu_high
    if s <= 0:
        return 0.0, 1.0, 0.0
    return mu_low / s, mu_med / s, mu_high / s


# =========================
# Feature severity mappers
# =========================

def _sev_action(series):
    out = []
    for a in series:
        a = str(a).lower()
        if any(k in a for k in ["deny", "drop", "block", "reject", "reset"]):
            out.append(1.0)
        elif any(k in a for k in ["quarantine", "challenge", "timeout"]):
            out.append(0.75)
        elif any(k in a for k in ["close", "server-rst", "client-rst"]):
            out.append(0.6)
        else:
            out.append(0.35)
    return np.asarray(out, dtype=float)


def _sev_utm(series):
    out = []
    for a in series:
        a = str(a).lower()
        if any(k in a for k in ["block", "deny", "drop", "reset", "quarantine", "prevent"]):
            out.append(1.0)
        elif any(k in a for k in ["alert", "monitor", "detect"]):
            out.append(0.70)
        else:
            out.append(0.35)
    return np.asarray(out, dtype=float)


def _sev_service(series):
    out = []
    high = ["ssh", "telnet", "ftp", "rdp", "smb", "sql", "dns", "smtp", "rpc"]
    med = ["http", "https", "ssl", "tls", "ntp", "snmp"]
    for s in series:
        s = str(s).lower()
        if any(k in s for k in high):
            out.append(0.90)
        elif any(k in s for k in med):
            out.append(0.65)
        else:
            out.append(0.40)
    return np.asarray(out, dtype=float)


def _sev_proto(series):
    out = []
    for p in series:
        p = str(p).lower()
        if "icmp" in p:
            out.append(0.70)
        elif "tcp" in p:
            out.append(0.55)
        elif "udp" in p:
            out.append(0.50)
        else:
            out.append(0.40)
    return np.asarray(out, dtype=float)


def _sev_apprisk(df):
    if "apprisk" not in df.columns:
        return np.full(len(df), 0.45)

    raw = df["apprisk"]
    num = pd.to_numeric(raw, errors="coerce")
    if num.notna().mean() > 0.6:
        val = num.fillna(num.median() if num.notna().any() else 0).to_numpy(dtype=float)
        if np.nanmax(val) <= 5:
            return np.clip(val / 5.0, 0, 1)
        return np.clip(val / 100.0, 0, 1)

    txt = raw.astype(str).str.lower()
    out = np.full(len(df), 0.45)
    out = np.where(txt.str.contains("critical|very high"), 1.00, out)
    out = np.where(txt.str.contains("high"), 0.85, out)
    out = np.where(txt.str.contains("medium|moderate"), 0.60, out)
    out = np.where(txt.str.contains("low|info|trusted"), 0.30, out)
    return out.astype(float)


def _sev_dstrep(df):
    if "dstreputation" not in df.columns:
        return np.full(len(df), 0.45)

    raw = df["dstreputation"]
    num = pd.to_numeric(raw, errors="coerce")
    if num.notna().mean() > 0.6:
        val = num.fillna(0).to_numpy(dtype=float)
        if np.nanmax(val) <= 5:
            return np.clip(val / 5.0, 0, 1)
        return np.clip(val / 100.0, 0, 1)

    txt = raw.astype(str).str.lower()
    out = np.full(len(df), 0.45)
    out = np.where(txt.str.contains("malicious|bad|poor|untrusted|blacklist"), 1.00, out)
    out = np.where(txt.str.contains("suspicious|moderate|medium"), 0.70, out)
    out = np.where(txt.str.contains("good|trusted|clean|low"), 0.25, out)
    return out.astype(float)


def _sev_appcat(df):
    if "appcat" not in df.columns:
        return np.full(len(df), 0.45)

    txt = df["appcat"].astype(str).str.lower()
    out = np.full(len(df), 0.45)
    risky = "malware|botnet|c2|proxy|anonymizer|p2p|remote|tunnel|tool|command"
    elevated = "cloud|file|transfer|update|social|stream|game"
    out = np.where(txt.str.contains(risky), 0.95, out)
    out = np.where(txt.str.contains(elevated), 0.65, out)
    return out.astype(float)


def _sev_trandisp(series):
    out = []
    for t in series:
        t = str(t).lower()
        if any(k in t for k in ["snat", "dnat", "force", "tunnel"]):
            out.append(0.70)
        elif "noop" in t or "allow" in t:
            out.append(0.40)
        else:
            out.append(0.50)
    return np.asarray(out, dtype=float)


# =========================
# Main fuzzy impact
# =========================

def calculate_fuzzy_impact(df: pd.DataFrame) -> np.ndarray:
    """
    Advanced non-ML fuzzy impact score in [0,1] using available features.
    Recalibrated for usable risk-score spread.
    """
    if not isinstance(df, pd.DataFrame):
        raise ValueError("calculate_fuzzy_impact requires a pandas DataFrame")

    n = len(df)
    if n == 0:
        return np.array([])

    # ---- Continuous traffic features ----
    bytes_total = _as_series(df, "bytes_total", 0.0)
    if (bytes_total == 0).all():
        bytes_total = _as_series(df, "sentbyte", 0.0) + _as_series(df, "rcvdbyte", 0.0)

    pkt_total = _as_series(df, "pkt_total", 0.0)
    if (pkt_total == 0).all():
        pkt_total = _as_series(df, "sentpkt", 0.0) + _as_series(df, "rcvdpkt", 0.0)

    duration = _as_series(df, "duration", 0.0)
    pkt_ratio = _as_series(df, "pkt_ratio", 0.0)
    sentbyte = _as_series(df, "sentbyte", 0.0)
    rcvdbyte = _as_series(df, "rcvdbyte", 0.0)
    sentpkt = _as_series(df, "sentpkt", 0.0)
    rcvdpkt = _as_series(df, "rcvdpkt", 0.0)

    sev_bytes = _scale_log(bytes_total, 50_000)
    sev_pkts = _scale_log(pkt_total, 1_000)
    sev_duration = _scale_log(duration, 300)
    sev_ratio = np.clip(np.abs(pkt_ratio.to_numpy(dtype=float)) / 5.0, 0, 1)
    sev_sentb = _scale_log(sentbyte, 30_000)
    sev_rcvdb = _scale_log(rcvdbyte, 30_000)
    sev_sentp = _scale_log(sentpkt, 800)
    sev_rcvdp = _scale_log(rcvdpkt, 800)

    traffic_intensity = (
        0.25 * sev_bytes +
        0.15 * sev_pkts +
        0.15 * sev_duration +
        0.10 * sev_ratio +
        0.10 * sev_sentb +
        0.10 * sev_rcvdb +
        0.075 * sev_sentp +
        0.075 * sev_rcvdp
    )
    traffic_intensity = np.clip(traffic_intensity, 0, 1)

    # ---- Categorical / security features ----
    sev_action = _sev_action(_as_text(df, "action"))
    sev_utm = _sev_utm(_as_text(df, "utmaction"))
    sev_service = _sev_service(_as_text(df, "service"))
    sev_proto = _sev_proto(_as_text(df, "proto"))
    sev_trandisp = _sev_trandisp(_as_text(df, "trandisp"))
    sev_apprisk = _sev_apprisk(df)
    sev_dstrep = _sev_dstrep(df)
    sev_appcat = _sev_appcat(df)

    security_severity = (
        0.22 * sev_action +
        0.16 * sev_utm +
        0.12 * sev_service +
        0.08 * sev_proto +
        0.08 * sev_trandisp +
        0.14 * sev_apprisk +
        0.12 * sev_dstrep +
        0.08 * sev_appcat
    )
    security_severity = np.clip(security_severity, 0, 1)

    # =========================
    # Fuzzy inference per log
    # =========================
    impacts = np.zeros(n, dtype=float)

    for i in range(n):
        t = traffic_intensity[i]
        s = security_severity[i]

        t_low, t_med, t_high = _fuzzy_membership(t)
        s_low, s_med, s_high = _fuzzy_membership(s)

        rules = [
            (min(t_high, s_high), "critical"),
            (min(t_high, s_med), "high"),
            (min(t_med, s_high), "high"),
            (min(t_high, s_low), "medium"),
            (min(t_med, s_med), "medium"),
            (min(t_low, s_high), "medium"),
            (min(t_med, s_low), "low"),
            (min(t_low, s_med), "low"),
            (min(t_low, s_low), "very_low"),
            # boosts
            (0.90 if sev_action[i] >= 0.95 and sev_apprisk[i] >= 0.7 else 0.0, "critical"),
            (0.80 if sev_dstrep[i] >= 0.9 else 0.0, "high"),
            (0.75 if sev_utm[i] >= 0.95 and t_high > 0.3 else 0.0, "high"),
            (0.70 if sev_service[i] >= 0.85 and s_high > 0.3 else 0.0, "medium"),
        ]

        level_scores = {
            "very_low": 0.0,
            "low": 0.0,
            "medium": 0.0,
            "high": 0.0,
            "critical": 0.0,
        }
        for strength, level in rules:
            level_scores[level] = max(level_scores[level], float(strength))

        # Recalibrated representative values
        reps = {
            "very_low": 0.20,
            "low": 0.40,
            "medium": 0.60,
            "high": 0.80,
            "critical": 0.95,
        }

        num = 0.0
        den = 0.0
        for level, strength in level_scores.items():
            num += strength * reps[level]
            den += strength

        fuzzy_impact = 0.50 if den == 0 else num / den

        # Blend for stability
        impact = (
            0.50 * fuzzy_impact +
            0.30 * security_severity[i] +
            0.20 * traffic_intensity[i]
        )

        # Lift baseline so distribution is usable with Likelihood × Impact
        impact = 0.50 + 0.50 * impact
        impacts[i] = impact

    return np.clip(impacts, 0.50, 1.0)


def get_risk_level(score):
    if score >= 70:
        return "Critical"
    elif score >= 45:
        return "High"
    elif score >= 25:
        return "Medium"
    else:
        return "Low"