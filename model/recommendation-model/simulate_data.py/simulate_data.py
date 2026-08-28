"""
simulate_data.py
================
50-code recommendation system with:
- Pattern detection (repeated IP, escalating anomaly)
- Segment-based codes (Finance/HR/IT)
- Escalation levels (L1-L5)
- Dynamic context flags

Run: python simulate_data.py
"""

import numpy as np
import pandas as pd
import os

SEED = 42
np.random.seed(SEED)

# ================================================================
# STEP 1 — LOAD DATASET
# ================================================================
print("=" * 60)
print("STEP 1 — LOADING DATASET")
print("=" * 60)

DATA_PATH = "C:/Users/del/Desktop/RP/firewall-audit-system/data/cybersecurity_attacks.csv"
df = pd.read_csv(DATA_PATH)
print(f"Loaded : {len(df):,} rows")

# ================================================================
# STEP 2 — PREPROCESS
# ================================================================
print("\n" + "=" * 60)
print("STEP 2 — PREPROCESSING")
print("=" * 60)

fill_rules = {
    "Malware Indicators" : "Not Detected",
    "Alerts/Warnings"    : "No Alert",
    "Proxy Information"  : "Direct",
    "Firewall Logs"      : "No Log",
    "IDS/IPS Alerts"     : "No Alert",
}
for col, val in fill_rules.items():
    if col in df.columns:
        df[col] = df[col].fillna(val)

df["Timestamp"]   = pd.to_datetime(df["Timestamp"])
df["hour"]        = df["Timestamp"].dt.hour
df["day_of_week"] = df["Timestamp"].dt.dayofweek
df["month"]       = df["Timestamp"].dt.month
df["is_night"]    = ((df["Timestamp"].dt.hour >= 22) |
                     (df["Timestamp"].dt.hour <= 5)).astype(int)
df["is_weekend"]  = (df["Timestamp"].dt.dayofweek >= 5).astype(int)
df["is_peak"]     = ((df["Timestamp"].dt.hour >= 9) &
                     (df["Timestamp"].dt.hour <= 12)).astype(int)

df["malware_flag"]     = (df["Malware Indicators"] != "Not Detected").astype(int)
df["has_firewall_log"] = (df["Firewall Logs"]       != "No Log").astype(int)
df["has_ids_alert"]    = (df["IDS/IPS Alerts"]      != "No Alert").astype(int)
df["was_ignored"]      = (df["Action Taken"] == "Ignored").astype(int)
df["was_blocked"]      = (df["Action Taken"] == "Blocked").astype(int)
df["via_proxy"]        = (df["Proxy Information"]   != "Direct").astype(int)

print("✅ Basic preprocessing done")

# ================================================================
# STEP 3 — MEMBER 2 OUTPUT (Risk Score)
# ================================================================
print("\n" + "=" * 60)
print("STEP 3 — SIMULATING MEMBER 2 (Risk Score)")
print("=" * 60)

df["risk_score"] = (
    df["Anomaly Scores"]     * 0.35 +
    df["malware_flag"]       * 20   +
    df["was_ignored"]        * 15   +
    df["is_night"]           * 10   +
    (1 - df["has_firewall_log"]) * 8 +
    df["has_ids_alert"]      * 5    +
    df["via_proxy"]          * 4    +
    df["is_weekend"]         * 3
).clip(0, 100).round(2)

df["control_maturity"] = (
    (df["has_firewall_log"] + df["has_ids_alert"]) / 2 * 40 +
    df["was_blocked"] * 40 +
    (1 - df["was_ignored"]) * 20
).clip(0, 100).round(2)

df["response_effectiveness"] = (
    df["was_blocked"]      * 50 +
    df["has_firewall_log"] * 20 +
    df["has_ids_alert"]    * 20 +
    (df["Alerts/Warnings"] != "No Alert").astype(int) * 10
).clip(0, 100).round(2)

print(f"✅ Risk scores — mean: {df['risk_score'].mean():.1f}")

# ================================================================
# STEP 4 — MEMBER 1 OUTPUT (Severity)
# ================================================================
print("\n" + "=" * 60)
print("STEP 4 — SIMULATING MEMBER 1 (Severity)")
print("=" * 60)

p33 = df["risk_score"].quantile(0.33)
p66 = df["risk_score"].quantile(0.66)

def assign_severity(row):
    score   = row["risk_score"]
    ignored = row["was_ignored"]
    malware = row["malware_flag"]
    anomaly = row["Anomaly Scores"]
    if score >= p66 and ignored == 1 and malware == 1 and anomaly >= 80:
        return "Critical"
    elif score >= p66:
        return "High"
    elif score >= p33:
        return "Medium"
    return "Low"

df["predicted_severity"]  = df.apply(assign_severity, axis=1)
df["severity_confidence"] = (
    df["risk_score"] / 100 * 0.4 +
    np.random.uniform(0.5, 0.95, len(df)) * 0.6
).clip(0.50, 0.99).round(4)

print(f"✅ Severity: {df['predicted_severity'].value_counts().to_dict()}")

# ================================================================
# STEP 5 — MEMBER 3 OUTPUT (Compliance)
# ================================================================
print("\n" + "=" * 60)
print("STEP 5 — SIMULATING MEMBER 3 (Compliance)")
print("=" * 60)

def assign_compliance(row):
    if row["was_ignored"] == 1:
        return "Non-Compliant", "Ignored-Event"
    elif row["has_firewall_log"] == 0:
        return "Non-Compliant", "Missing-Log"
    elif row["has_ids_alert"] == 0 and row["risk_score"] > 60:
        return "Non-Compliant", "No-IDS-Alert"
    elif row["via_proxy"] == 1 and row["predicted_severity"] in ["High","Critical"]:
        return "Non-Compliant", "Proxy-Evasion"
    return "Compliant", "None"

compliance_results      = df.apply(lambda r: assign_compliance(r), axis=1)
df["compliance_status"] = [c[0] for c in compliance_results]
df["violation_type"]    = [c[1] for c in compliance_results]

print(f"✅ Compliance: {df['compliance_status'].value_counts().to_dict()}")

# ================================================================
# STEP 6 — PATTERN FEATURES (for Group G codes)
# ================================================================
print("\n" + "=" * 60)
print("STEP 6 — PATTERN FEATURES")
print("=" * 60)

# Sort by timestamp first
df = df.sort_values("Timestamp").reset_index(drop=True)

# Repeated source IP (same IP appeared in last 10 events)
df["source_ip_str"] = df["Source IP Address"].astype(str)
df["repeated_ip"]   = 0
for i in range(10, len(df)):
    recent_ips = df["source_ip_str"].iloc[i-10:i].tolist()
    if df["source_ip_str"].iloc[i] in recent_ips:
        df.at[i, "repeated_ip"] = 1

# Escalating anomaly (anomaly score increasing in last 5 events)
df["escalating_anomaly"] = 0
for i in range(5, len(df)):
    scores = df["Anomaly Scores"].iloc[i-5:i].tolist()
    if scores[-1] > scores[-3] > scores[0]:
        df.at[i, "escalating_anomaly"] = 1

# Anomaly trend score
df["anomaly_trend"] = 0.0
for i in range(5, len(df)):
    scores = df["Anomaly Scores"].iloc[i-5:i+1].tolist()
    trend  = scores[-1] - scores[0]
    df.at[i, "anomaly_trend"] = round(trend, 2)

print(f"✅ Repeated IP events    : {df['repeated_ip'].sum():,}")
print(f"✅ Escalating anomaly   : {df['escalating_anomaly'].sum():,}")

# ================================================================
# STEP 7 — ASSIGN 50 RECOMMENDATION CODES
# ================================================================
print("\n" + "=" * 60)
print("STEP 7 — ASSIGNING 50 CODES")
print("=" * 60)

def assign_50_code(row):
    """
    Assigns one of 50 recommendation codes.

    Priority order:
    Group E (Compound) → Group F (Segment) →
    Group G (Pattern)  → Group H (Escalation) →
    Group D (Control)  → Group B (Attack) →
    Group C (Time)     → Group A (Severity)
    """
    sev       = row["predicted_severity"]
    attack    = str(row.get("Attack Type",      "Unknown"))
    segment   = str(row.get("Network Segment",  "Unknown"))
    ignored   = int(row["was_ignored"])
    malware   = int(row["malware_flag"])
    night     = int(row["is_night"])
    proxy     = int(row["via_proxy"])
    weekend   = int(row["is_weekend"])
    peak      = int(row["is_peak"])
    anomaly   = float(row["Anomaly Scores"])
    firewall  = int(row["has_firewall_log"])
    ids       = int(row["has_ids_alert"])
    maturity  = float(row["control_maturity"])
    risk      = float(row["risk_score"])
    rep_ip    = int(row["repeated_ip"])
    esc_anom  = int(row["escalating_anomaly"])

    # ── GROUP E — Compound (highest priority) ─────────────────
    if attack in ["DDoS","Malware"] and malware == 1 and ignored == 1:
        return 31   # Multi-vector attack
    if malware == 1 and ignored == 1 and night == 1:
        return 25   # Malware + ignored + night
    if attack == "DDoS" and proxy == 1 and weekend == 1:
        return 26   # DDoS + proxy + weekend
    if attack == "Intrusion" and firewall == 0:
        return 27   # Intrusion + no logs
    if anomaly >= 85 and maturity < 30:
        return 28   # High anomaly + low maturity
    if attack == "Ransomware" and not firewall:
        return 29   # Ransomware + no backup evidence
    if attack == "Phishing" and malware == 1 and rep_ip == 1:
        return 30   # Phishing + credential + lateral

    # ── GROUP F — Segment based ────────────────────────────────
    if segment == "Finance" and sev in ["High","Critical"]:
        return 32   # Finance attack
    if segment == "HR" and sev in ["High","Critical"]:
        return 33   # HR attack
    if segment == "IT" and sev in ["High","Critical"]:
        return 34   # IT infrastructure
    if sev == "Critical" and risk >= 90:
        return 35   # Executive / critical asset
    if rep_ip == 1 and sev in ["High","Critical"]:
        return 36   # Multi-segment (repeated IP across segments)
    if firewall == 0 and proxy == 1:
        return 37   # DMZ breach
    if risk >= 95:
        return 38   # Critical infrastructure

    # ── GROUP G — Pattern based ────────────────────────────────
    if rep_ip == 1 and sev in ["High","Critical"]:
        return 39   # Repeated same IP
    if esc_anom == 1 and anomaly >= 70:
        return 40   # Escalating anomaly
    if attack == "Unknown" and anomaly >= 60:
        return 41   # First seen / unknown attack
    if rep_ip == 1 and proxy == 1:
        return 42   # Distributed botnet
    if esc_anom == 1 and night == 1:
        return 43   # Long duration night campaign
    if anomaly >= 80 and not esc_anom:
        return 44   # Sudden anomaly spike

    # ── GROUP H — Escalation levels ───────────────────────────
    if sev == "Critical" and risk >= 85:
        return 48   # Level 4 — CISO + legal
    if sev == "Critical":
        return 47   # Level 3 — SOC manager
    if sev == "High" and (ignored == 1 or malware == 1):
        return 47   # Level 3
    if sev == "High":
        return 46   # Level 2 — Senior analyst
    if sev == "Medium" and risk >= 50:
        return 45   # Level 1

    # ── GROUP D — Control gaps ─────────────────────────────────
    if ignored == 1 and sev in ["High","Critical"]:
        return 18
    if firewall == 0 and sev in ["High","Critical"]:
        return 19
    if proxy == 1 and sev in ["High","Medium"]:
        return 20
    if ids == 0 and sev in ["High","Critical"] and anomaly >= 60:
        return 21
    if maturity < 30 and risk >= 50:
        return 22
    if ignored == 1 and rep_ip == 1:
        return 24   # Repeated ignored

    # ── GROUP B — Attack type ──────────────────────────────────
    if attack == "DDoS":
        if esc_anom == 1: return 6  # Sustained DDoS
        return 5
    if attack == "Malware":
        if rep_ip == 1: return 8    # Spreading malware
        return 7
    if attack == "Intrusion":  return 9
    if attack == "Phishing":   return 10
    if attack == "Ransomware": return 11
    if attack == "Unknown":    return 12

    # ── GROUP C — Time context ─────────────────────────────────
    if night == 1   and sev in ["High","Critical"]: return 13
    if weekend == 1 and sev in ["High","Critical"]: return 14
    if peak == 1    and sev in ["High","Critical"]: return 17
    if not night and not weekend and sev in ["High","Critical"]: return 15

    # ── GROUP A — Severity default ─────────────────────────────
    if sev == "Critical": return 4   # Critical upgrade
    if sev == "High":     return 1
    if sev == "Medium":   return 2
    return 3  # Low

df["rec_code"] = df.apply(assign_50_code, axis=1)

print(f"✅ Labelled {len(df):,} rows with 50 codes")
print(f"\nCode distribution by group:")

groups = {
    "A (0-4)  Severity"    : range(0, 5),
    "B (5-12) Attack"      : range(5, 13),
    "C (13-17) Time"       : range(13, 18),
    "D (18-24) Control"    : range(18, 25),
    "E (25-31) Compound"   : range(25, 32),
    "F (32-38) Segment"    : range(32, 39),
    "G (39-44) Pattern"    : range(39, 45),
    "H (45-49) Escalation" : range(45, 50),
}

for grp_name, codes in groups.items():
    cnt  = sum((df["rec_code"] == c).sum() for c in codes)
    pct  = cnt / len(df) * 100
    bar  = "█" * int(pct * 1.5)
    print(f"  Group {grp_name}: {bar:<25} {cnt:>5,} ({pct:.1f}%)")
    for code in codes:
        c_cnt = (df["rec_code"] == code).sum()
        if c_cnt > 0:
            print(f"    Code {code:02d}: {c_cnt:>5,}")

# ================================================================
# STEP 8 — SAVE
# ================================================================
print("\n" + "=" * 60)
print("STEP 8 — SAVING TRAINING CSV")
print("=" * 60)

OUTPUT_COLS = [
    "Timestamp", "hour", "day_of_week", "month",
    "is_night", "is_weekend", "is_peak",
    "Source IP Address", "Destination IP Address",
    "Source Port", "Destination Port",
    "Protocol", "Traffic Type", "Network Segment",
    "Attack Type", "Anomaly Scores", "Action Taken",
    "Malware Indicators", "Firewall Logs",
    "IDS/IPS Alerts", "Alerts/Warnings",
    "Proxy Information", "Geo-location Data",
    "malware_flag", "has_firewall_log", "has_ids_alert",
    "was_ignored", "was_blocked", "via_proxy",
    "repeated_ip", "escalating_anomaly", "anomaly_trend",
    "predicted_severity", "severity_confidence",
    "risk_score", "control_maturity", "response_effectiveness",
    "compliance_status", "violation_type",
    "rec_code",
]

OUTPUT_COLS = [c for c in OUTPUT_COLS if c in df.columns]
df_out      = df[OUTPUT_COLS]

OUT_PATH = "C:/Users/del/Desktop/RP/firewall-audit-system/data/training_data.csv"
df_out.to_csv(OUT_PATH, index=False)

print(f"✅ Saved: {OUT_PATH}")
print(f"   Rows    : {len(df_out):,}")
print(f"   Columns : {len(df_out.columns)}")
print(f"\n{'='*60}")
print(f"DONE — training_data.csv ready with 50 codes!")
print(f"Next: run train_lstm.py to retrain model")
print(f"{'='*60}")