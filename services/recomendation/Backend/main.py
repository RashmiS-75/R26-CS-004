"""
main.py — Recommendation Engine v3.0
=====================================
9,600+ unique recommendations via:
  50 LSTM codes
  × 3 segments (Finance/HR/IT)
  × 4 severity levels
  × 4 time slots
  × 4 risk tiers
= 9,600+ contextually unique recommendations

Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import pickle, json, io
from datetime import datetime
from pymongo import MongoClient
from tensorflow import keras

# ================================================================
# APP SETUP
# ================================================================
app = FastAPI(
    title="Firewall Audit — Recommendation Engine v3.0",
    description="9,600+ unique recommendations via 50 LSTM codes × 4 context dimensions",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================================================================
# PATHS
# ================================================================
MODEL_DIR     = "C:/Users/del/Desktop/RP/firewall-audit-system/recommendation-model/"
MODEL_PATH    = MODEL_DIR + "lstm_rec_model_50.keras"
SCALER_PATH   = MODEL_DIR + "scaler.pkl"
COLUMNS_PATH  = MODEL_DIR + "feature_columns.json"
METADATA_PATH = MODEL_DIR + "lstm_metadata.json"

# ================================================================
# LOAD MODEL
# ================================================================
print("\nLoading LSTM 50-code model...")
model        = keras.models.load_model(MODEL_PATH)
scaler       = pickle.load(open(SCALER_PATH, "rb"))
FEATURE_COLS = json.load(open(COLUMNS_PATH, "r"))
metadata     = json.load(open(METADATA_PATH, "r"))
WINDOW_SIZE  = metadata.get("window_size", 24)
N_CODES      = 50
print(f"Model loaded — window={WINDOW_SIZE}, codes={N_CODES}")

# ================================================================
# MONGODB
# ================================================================
try:
    mongo_client        = MongoClient("mongodb://localhost:27017/",
                                      serverSelectionTimeoutMS=3000)
    mongo_client.server_info()
    db                  = mongo_client["firewall_audit_db"]
    recommendations_col = db["recommendations"]
    print("MongoDB connected")
except Exception as e:
    print(f"MongoDB unavailable: {e}")
    db                  = None
    recommendations_col = None

# ================================================================
# CONTEXT DIMENSION MAPS
# ================================================================

# Segment specific actions
SEGMENT_ACTIONS = {
    "Finance": {
        "asset"     : "Finance segment — financial data and transactions at risk",
        "immediate" : "Isolate Finance segment hosts immediately. Notify compliance team.",
        "escalate"  : "Escalate to CFO and compliance officer. Regulatory notification may be required.",
        "long_term" : "Implement Finance-specific data classification and DLP controls.",
    },
    "HR": {
        "asset"     : "HR segment — employee personal data at risk",
        "immediate" : "Isolate HR systems. Check employee data exposure scope.",
        "escalate"  : "Notify HR director and DPO. Employee data breach notification may be required.",
        "long_term" : "Implement HR data encryption and access control review.",
    },
    "IT": {
        "asset"     : "IT infrastructure segment — core systems at risk",
        "immediate" : "Isolate affected IT hosts. Check dependencies and downstream systems.",
        "escalate"  : "Notify IT director. Assess business continuity impact.",
        "long_term" : "Implement infrastructure hardening and network segmentation.",
    },
    "Executive": {
        "asset"     : "Executive segment — high-value target attack",
        "immediate" : "Isolate executive devices immediately. Alert CISO personally.",
        "escalate"  : "Board-level notification required. Engage VIP protection protocol.",
        "long_term" : "Implement executive device management and privileged access controls.",
    },
    "DMZ": {
        "asset"     : "DMZ segment — perimeter breach detected",
        "immediate" : "Isolate DMZ. Review all perimeter controls and firewall rules.",
        "escalate"  : "Notify security operations manager. Perimeter integrity compromised.",
        "long_term" : "Redesign DMZ architecture. Implement additional perimeter monitoring.",
    },
}

SEGMENT_DEFAULT = {
    "asset"     : "Network segment under attack",
    "immediate" : "Isolate affected hosts immediately.",
    "escalate"  : "Notify security team immediately.",
    "long_term" : "Review segment security controls.",
}

# Time slot specific actions
TIME_ACTIONS = {
    "night": {
        "label"     : "Off-hours (10pm–5am) — elevated risk window",
        "immediate" : "Activate on-call security team immediately. Off-hours attacks exploit reduced monitoring.",
        "coverage"  : "Off-hours attack — on-call team activation required.",
        "long_term" : "Establish 24/7 SOC coverage or managed security service.",
    },
    "weekend": {
        "label"     : "Weekend — skeleton crew period",
        "immediate" : "Escalate to weekend on-call team. Weekend attacks exploit reduced staffing.",
        "coverage"  : "Weekend attack — escalated response protocol activated.",
        "long_term" : "Extend SOC coverage to full weekend. Automate weekend response.",
    },
    "peak": {
        "label"     : "Peak hours (9am–12pm) — maximum exposure window",
        "immediate" : "Alert full SOC team. Maximum analyst coverage available during peak hours.",
        "coverage"  : "Peak hours attack — full analyst team available for rapid response.",
        "long_term" : "Implement peak-hour automated alerting and response thresholds.",
    },
    "normal": {
        "label"     : "Business hours — standard response window",
        "immediate" : "Alert SOC analyst. Full business-hours response team available.",
        "coverage"  : "Business hours — standard SOC response protocol.",
        "long_term" : "Review business hours response time SLAs and ensure compliance.",
    },
}

# Risk tier specific actions
RISK_TIER_ACTIONS = {
    4: {  # 76-100
        "label"     : "Risk Tier 4 — CRITICAL (76-100)",
        "immediate" : "CRITICAL PRIORITY — maximum urgency response required immediately.",
        "escalation": "Escalate to CISO and senior management within 15 minutes.",
        "resources" : "Deploy all available security resources. External IR firm on standby.",
    },
    3: {  # 51-75
        "label"     : "Risk Tier 3 — HIGH (51-75)",
        "immediate" : "HIGH PRIORITY — urgent response required within 30 minutes.",
        "escalation": "Escalate to SOC manager. Senior analyst to lead investigation.",
        "resources" : "Dedicate senior analyst. Prepare IR runbook for escalation.",
    },
    2: {  # 26-50
        "label"     : "Risk Tier 2 — MEDIUM (26-50)",
        "immediate" : "MEDIUM PRIORITY — response required within 2 hours.",
        "escalation": "Assign analyst for investigation. Document findings in SIEM.",
        "resources" : "Standard analyst response. Monitor for escalation indicators.",
    },
    1: {  # 0-25
        "label"     : "Risk Tier 1 — LOW (0-25)",
        "immediate" : "LOW PRIORITY — log and monitor. Review within 24 hours.",
        "escalation": "Log for audit trail. No immediate escalation required.",
        "resources" : "Routine analyst review during next scheduled check.",
    },
}

# Severity specific actions
SEVERITY_ACTIONS = {
    "Critical": {
        "response"  : "CRITICAL EVENT — full incident response activation required.",
        "notify"    : "Notify CISO, legal team, and board within 1 hour.",
        "forensics" : "Preserve all forensic evidence. Engage forensic team immediately.",
    },
    "High": {
        "response"  : "HIGH SEVERITY — urgent response required.",
        "notify"    : "Notify SOC manager and CISO within 4 hours.",
        "forensics" : "Collect and preserve logs. Initiate incident timeline.",
    },
    "Medium": {
        "response"  : "MEDIUM SEVERITY — standard response within 24 hours.",
        "notify"    : "Notify SOC analyst. Document in ticketing system.",
        "forensics" : "Collect relevant logs for analysis.",
    },
    "Low": {
        "response"  : "LOW SEVERITY — routine monitoring response.",
        "notify"    : "Log for audit purposes. No immediate notification required.",
        "forensics" : "Standard log retention. Include in monthly review.",
    },
}

# Attack specific notes
ATTACK_NOTES = {
    "DDoS"      : "Activate DDoS mitigation. Contact ISP if volumetric. Rate limit all endpoints.",
    "Malware"   : "Run EDR scan on all affected hosts. Check for lateral movement to adjacent hosts.",
    "Intrusion" : "Review authentication logs immediately. Check for privilege escalation attempts.",
    "Phishing"  : "Block sender domain and IP. Alert all potentially affected users. Reset credentials.",
    "Ransomware": "Disconnect all affected systems. Do NOT attempt decryption. Verify backup integrity.",
    "Unknown"   : "Classify attack type via threat intelligence. Cross-reference IOCs with known threats.",
}

# 50 base recommendation templates
REC_TEMPLATES = {
    0:  {"group":"A","label":"Low — log and baseline",
         "short_base":"Include in monthly security review. Verify baseline behaviour.",
         "long_base" :"Use patterns to tune detection baselines. Review recurring events.",
         "gap"       :"Maintain routine logging and periodic review."},
    1:  {"group":"A","label":"High — block IP + SOC alert",
         "short_base":"Review firewall and IDS rules. Analyse indicators of compromise.",
         "long_base" :"Strengthen perimeter defences. Schedule penetration test.",
         "gap"       :"High severity — ensure SOC escalation procedures are followed."},
    2:  {"group":"A","label":"Medium — monitor within 24h",
         "short_base":"Update detection signatures. Review access controls on affected segment.",
         "long_base" :"Improve log coverage. Evaluate SIEM rule tuning for accuracy.",
         "gap"       :"Ensure medium events are reviewed within 24 hours without exception."},
    3:  {"group":"A","label":"Low — log and baseline",
         "short_base":"Include in monthly security review.",
         "long_base" :"Use patterns to tune detection baselines.",
         "gap"       :"Maintain routine logging and periodic review."},
    4:  {"group":"A","label":"Critical upgrade — 4 conditions met",
         "short_base":"Full forensic investigation. Patch all identified vulnerabilities immediately.",
         "long_base" :"Implement zero-trust architecture. Update incident response playbook.",
         "gap"       :"Critical control failure — mandatory SOC and management review."},
    5:  {"group":"B","label":"DDoS — volumetric mitigation",
         "short_base":"Analyse traffic patterns. Implement rate limiting and traffic scrubbing.",
         "long_base" :"Deploy dedicated DDoS protection service. Review bandwidth capacity.",
         "gap"       :"DDoS requires automated mitigation — manual response is too slow."},
    6:  {"group":"B","label":"DDoS sustained — campaign response",
         "short_base":"Review CDN config. Implement upstream traffic scrubbing.",
         "long_base" :"Establish ISP escalation procedure. Deploy anycast DDoS mitigation.",
         "gap"       :"Sustained DDoS indicates persistent attacker — threat actor profiling required."},
    7:  {"group":"B","label":"Malware — endpoint scan + containment",
         "short_base":"Check for lateral movement. Update AV and EDR signatures.",
         "long_base" :"Deploy EDR solution. Implement application whitelisting policy.",
         "gap"       :"Malware confirmed — endpoint isolation required before remediation."},
    8:  {"group":"B","label":"Malware spreading — lateral containment",
         "short_base":"Isolate all connected hosts. Review privileged account activity.",
         "long_base" :"Implement network micro-segmentation. Deploy NDR solution.",
         "gap"       :"Malware spreading — immediate network segmentation required."},
    9:  {"group":"B","label":"Intrusion — authentication review",
         "short_base":"Check privilege escalation events. Review VPN and remote access logs.",
         "long_base" :"Implement MFA across all systems. Deploy privileged access management.",
         "gap"       :"Intrusion detected — full access control review required."},
    10: {"group":"B","label":"Phishing — sender block + user alert",
         "short_base":"Scan email gateway logs. Reset credentials for affected users.",
         "long_base" :"Deploy advanced email filtering. Implement DMARC/DKIM/SPF.",
         "gap"       :"Phishing campaign — user awareness training required urgently."},
    11: {"group":"B","label":"Ransomware — disconnect + verify backup",
         "short_base":"Engage IR team. Identify patient zero. Assess encryption scope.",
         "long_base" :"Implement offline backup strategy. Deploy ransomware-specific EDR.",
         "gap"       :"Ransomware — immediate network isolation before any recovery attempt."},
    12: {"group":"B","label":"Unknown attack — threat intel lookup",
         "short_base":"Cross-reference threat intelligence feeds. Create new detection signature.",
         "long_base" :"Improve unknown threat detection. Implement ML-based anomaly detection.",
         "gap"       :"Unknown attack type — manual classification and threat intel required."},
    13: {"group":"C","label":"Night attack — on-call activation",
         "short_base":"Review after-hours monitoring coverage and alerting thresholds.",
         "long_base" :"Establish 24/7 SOC or contract managed security service provider.",
         "gap"       :"Off-hours attack with no immediate response — monitoring coverage gap."},
    14: {"group":"C","label":"Weekend attack — escalated response",
         "short_base":"Review weekend monitoring gaps. Implement automated weekend playbooks.",
         "long_base" :"Extend SOC coverage to full weekend. Automate containment responses.",
         "gap"       :"Weekend attack — staffing model and automated response require review."},
    15: {"group":"C","label":"Business hours — standard SOC",
         "short_base":"Assign dedicated analyst for investigation. Document all findings.",
         "long_base" :"Review business hours response time SLAs and ensure compliance.",
         "gap"       :"Ensure response SLAs are met and all actions documented for audit."},
    16: {"group":"C","label":"Holiday attack — skeleton crew escalation",
         "short_base":"Activate holiday on-call procedure. Implement automated response.",
         "long_base" :"Develop automated response playbooks for holiday periods.",
         "gap"       :"Holiday attack — on-call coverage model requires urgent review."},
    17: {"group":"C","label":"Peak hours — maximum monitoring",
         "short_base":"Increase monitoring threshold. Ensure maximum analyst coverage.",
         "long_base" :"Implement automated peak-hour alerting with lower thresholds.",
         "gap"       :"Peak hour attack — verify maximum analyst coverage is maintained."},
    18: {"group":"D","label":"Ignored event — procedure review",
         "short_base":"Audit all ignored events from past 30 days. Identify systemic gaps.",
         "long_base" :"Redesign alert handling workflows. Implement mandatory review process.",
         "gap"       :"CRITICAL: Event ignored — fundamental security control failure."},
    19: {"group":"D","label":"No firewall log — logging gap",
         "short_base":"Audit all firewall log gaps in past 30 days. Restore logging.",
         "long_base" :"Implement centralised log management with completeness monitoring.",
         "gap"       :"Missing log — organisation cannot prove what happened. Compliance risk."},
    20: {"group":"D","label":"Proxy evasion — origin trace",
         "short_base":"Review proxy usage policies. Implement traffic inspection.",
         "long_base" :"Deploy NGFW with application awareness. Block known proxy services.",
         "gap"       :"Proxy evasion — attacker is actively hiding true origin."},
    21: {"group":"D","label":"No IDS alert — detection tuning",
         "short_base":"Update IDS signatures for detected attack patterns immediately.",
         "long_base" :"Implement behaviour-based detection to supplement signature IDS.",
         "gap"       :"IDS failure to alert — signature coverage requires immediate review."},
    22: {"group":"D","label":"Low control maturity — assessment",
         "short_base":"Emergency control maturity assessment. Engage security consultant.",
         "long_base" :"Develop 12-month security maturity improvement roadmap.",
         "gap"       :"Control maturity insufficient — organisation unprepared for threat level."},
    23: {"group":"D","label":"No IR plan — create immediately",
         "short_base":"Engage external IR consultant. Draft emergency response procedures.",
         "long_base" :"Develop, document and test full IR playbook. Run tabletop exercise.",
         "gap"       :"No incident response plan — critical organisational gap."},
    24: {"group":"D","label":"Repeated ignored events — systemic failure",
         "short_base":"Full audit of alert handling over past 90 days.",
         "long_base" :"Overhaul SOC alert management. Implement mandatory review controls.",
         "gap"       :"Systemic control failure — events repeatedly ignored by automated systems."},
    25: {"group":"E","label":"Malware + ignored + night — triple threat",
         "short_base":"Full forensic investigation. Review why automated systems ignored event.",
         "long_base" :"Redesign automated response. Implement 24/7 monitoring immediately.",
         "gap"       :"Triple control failure — malware active, ignored, off-hours. Highest risk."},
    26: {"group":"E","label":"DDoS + proxy + weekend — evasive attack",
         "short_base":"Analyse for APT indicators. Review weekend SOC coverage gaps.",
         "long_base" :"Automated DDoS mitigation with origin tracing. Extend weekend coverage.",
         "gap"       :"Sophisticated evasive DDoS on weekend — APT threat actor indicators."},
    27: {"group":"E","label":"Intrusion + no logs — invisible attack",
         "short_base":"Audit logging infrastructure for tampering. Restore from backup.",
         "long_base" :"Implement tamper-evident logging with write-once storage.",
         "gap"       :"Missing logs during intrusion — possible forensic evidence destruction."},
    28: {"group":"E","label":"High anomaly + low maturity — critical gap",
         "short_base":"Emergency control maturity assessment. External consultant required.",
         "long_base" :"Emergency security remediation programme. Executive sponsorship required.",
         "gap"       :"Organisation control maturity critically insufficient for threat level."},
    29: {"group":"E","label":"Ransomware + no evidence — catastrophic",
         "short_base":"Engage specialist ransomware IR firm. Notify cyber insurance.",
         "long_base" :"Implement immutable offline backup. Deploy ransomware-specific controls.",
         "gap"       :"Ransomware with no forensic evidence — catastrophic recovery risk."},
    30: {"group":"E","label":"Phishing + credential + lateral movement",
         "short_base":"Reset ALL credentials. Isolate all affected hosts immediately.",
         "long_base" :"Implement zero-trust network access. Deploy continuous auth monitoring.",
         "gap"       :"Full attack chain detected — immediate IR activation required."},
    31: {"group":"E","label":"Multi-vector — DDoS + Malware simultaneous",
         "short_base":"Activate full IR team. Triage all attack vectors simultaneously.",
         "long_base" :"Implement advanced threat protection platform. Review IR capacity.",
         "gap"       :"Multi-vector attack — coordinated threat actor with significant resources."},
    32: {"group":"F","label":"Finance segment — financial data protection",
         "short_base":"Isolate Finance segment. Notify compliance and legal team.",
         "long_base" :"Implement Finance-specific security controls and data classification.",
         "gap"       :"Finance segment breach — regulatory notification obligations apply."},
    33: {"group":"F","label":"HR segment — employee data breach",
         "short_base":"Isolate HR systems. Assess employee personal data exposure.",
         "long_base" :"Implement HR data encryption and strict access controls.",
         "gap"       :"HR breach — employee data at risk. DPO notification required."},
    34: {"group":"F","label":"IT infrastructure — core systems protection",
         "short_base":"Isolate affected IT systems. Assess business continuity impact.",
         "long_base" :"Implement IT infrastructure hardening programme.",
         "gap"       :"Core IT breach — business continuity and operations at risk."},
    35: {"group":"F","label":"Executive segment — VIP protection",
         "short_base":"Alert CISO immediately. Isolate all executive systems.",
         "long_base" :"Implement executive device management and privileged access controls.",
         "gap"       :"Executive system breach — high-value targeted attack."},
    36: {"group":"F","label":"Multi-segment — organisation-wide response",
         "short_base":"Activate organisation-wide IR response. Triage all segments.",
         "long_base" :"Implement network micro-segmentation across all segments.",
         "gap"       :"Multi-segment breach — attacker has broad network access."},
    37: {"group":"F","label":"DMZ segment — perimeter breach",
         "short_base":"Isolate DMZ. Review all perimeter controls and ingress rules.",
         "long_base" :"Redesign DMZ architecture. Implement additional monitoring.",
         "gap"       :"DMZ breach — attacker at network perimeter. Internal threat elevated."},
    38: {"group":"F","label":"Critical infrastructure — maximum priority",
         "short_base":"Activate emergency response. Notify senior leadership immediately.",
         "long_base" :"Implement critical infrastructure protection programme.",
         "gap"       :"Critical infrastructure attack — maximum organisational response."},
    39: {"group":"G","label":"Repeated IP — persistent threat actor",
         "short_base":"Block IP range. Add to threat intelligence. Trace actor profile.",
         "long_base" :"Implement automated IP reputation blocking. Subscribe to threat intel feeds.",
         "gap"       :"Persistent attacker — existing blocking controls clearly insufficient."},
    40: {"group":"G","label":"Escalating anomaly — campaign building",
         "short_base":"Increase monitoring frequency. Consider pre-emptive containment.",
         "long_base" :"Implement predictive threat detection. Set escalating alert thresholds.",
         "gap"       :"Escalating attack pattern — action required before attack reaches peak."},
    41: {"group":"G","label":"Unknown attack — new threat signature",
         "short_base":"Submit IOCs to threat intelligence. Create new detection signature.",
         "long_base" :"Implement ML-based anomaly detection for unknown threat patterns.",
         "gap"       :"Unknown attack type — existing signature coverage has a gap."},
    42: {"group":"G","label":"Distributed sources — botnet attack",
         "short_base":"Implement geo-blocking for attack origin countries. Contact upstream ISP.",
         "long_base" :"Deploy botnet detection service. Implement IP reputation filtering.",
         "gap"       :"Botnet attack — large-scale coordinated threat requiring ISP cooperation."},
    43: {"group":"G","label":"Long duration night campaign",
         "short_base":"Activate on-call immediately. Implement emergency rate limiting.",
         "long_base" :"Implement automated response for sustained overnight attacks.",
         "gap"       :"Sustained overnight campaign — automated containment response required."},
    44: {"group":"G","label":"Anomaly spike — sudden traffic pattern",
         "short_base":"Investigate traffic source and pattern immediately.",
         "long_base" :"Implement dynamic anomaly-based alerting thresholds.",
         "gap"       :"Sudden anomaly spike — significant deviation from baseline requires investigation."},
    45: {"group":"H","label":"L1 — Analyst handles independently",
         "short_base":"Document findings in ticketing system. Close within SLA.",
         "long_base" :"Use event for analyst training and detection baseline improvement.",
         "gap"       :"Ensure analyst follows standard L1 response procedure consistently."},
    46: {"group":"H","label":"L2 — Senior analyst review required",
         "short_base":"Escalate to senior analyst within 2 hours. Brief on findings.",
         "long_base" :"Review L1 analyst training and escalation criteria accuracy.",
         "gap"       :"Senior review required — L1 scope or expertise exceeded."},
    47: {"group":"H","label":"L3 — SOC manager escalation",
         "short_base":"Notify SOC manager immediately. Prepare incident briefing.",
         "long_base" :"Review escalation thresholds and SOC manager notification procedures.",
         "gap"       :"SOC manager involvement required — significant security event."},
    48: {"group":"H","label":"L4 — CISO + legal team",
         "short_base":"Notify CISO and legal within 1 hour. Prepare executive briefing.",
         "long_base" :"Review breach notification obligations and regulatory requirements.",
         "gap"       :"CISO escalation required — potential regulatory and legal impact."},
    49: {"group":"H","label":"L5 — Board + external authorities",
         "short_base":"Notify board and relevant authorities immediately. Engage crisis firm.",
         "long_base" :"Engage external crisis management. Review disclosure obligations.",
         "gap"       :"Board-level incident — maximum organisational and regulatory response."},
}

GROUP_LABELS = {
    "A":"Severity","B":"Attack type","C":"Time context","D":"Control gap",
    "E":"Compound","F":"Segment","G":"Pattern","H":"Escalation"
}

# ================================================================
# HELPER FUNCTIONS
# ================================================================
def get_time_slot(row):
    night   = int(row.get("is_night",   0))
    weekend = int(row.get("is_weekend", 0))
    peak    = int(row.get("is_peak",    0))
    if night:   return "night"
    if weekend: return "weekend"
    if peak:    return "peak"
    return "normal"

def get_risk_tier(risk_score):
    if risk_score >= 76: return 4
    if risk_score >= 51: return 3
    if risk_score >= 26: return 2
    return 1

def get_segment_key(segment):
    for key in SEGMENT_ACTIONS:
        if key.lower() in str(segment).lower():
            return key
    return None

# ================================================================
# LEVEL 1 — 9,600+ DYNAMIC RECOMMENDATION GENERATOR
# ================================================================
def generate_9600_recommendation(row, code):
    """
    Generates unique recommendation by combining:
    - LSTM predicted code (50 codes)
    - Network segment (Finance/HR/IT/etc)
    - Severity level (Critical/High/Medium/Low)
    - Time slot (Night/Weekend/Peak/Normal)
    - Risk tier (1-4 based on risk score)

    50 × 3 × 4 × 4 × 4 = 9,600+ unique combinations
    """
    template = REC_TEMPLATES.get(code, REC_TEMPLATES[3])
    attack   = str(row.get("Attack Type",       "Unknown"))
    segment  = str(row.get("Network Segment",   "Unknown"))
    sev      = str(row.get("predicted_severity","Low"))
    risk     = float(row.get("risk_score",       0))
    src_ip   = str(row.get("Source IP Address", "Unknown"))

    # Get context dimensions
    time_slot    = get_time_slot(row)
    risk_tier    = get_risk_tier(risk)
    segment_key  = get_segment_key(segment)
    seg_actions  = SEGMENT_ACTIONS.get(segment_key, SEGMENT_DEFAULT)
    time_actions = TIME_ACTIONS[time_slot]
    tier_actions = RISK_TIER_ACTIONS[risk_tier]
    sev_actions  = SEVERITY_ACTIONS.get(sev, SEVERITY_ACTIONS["Low"])

    # Flags
    malware  = int(row.get("malware_flag",       0))
    ignored  = int(row.get("was_ignored",        0))
    firewall = int(row.get("has_firewall_log",   1))
    proxy    = int(row.get("via_proxy",          0))
    rep_ip   = int(row.get("repeated_ip",        0))
    esc_anom = int(row.get("escalating_anomaly", 0))

    # ── L1 DYNAMIC IMMEDIATE ACTION ───────────────────────────
    # Built from: segment + severity + time + risk tier + flags
    immediate_parts = []

    # Segment context
    if segment_key:
        immediate_parts.append(f"{segment} segment {attack} attack detected.")
    else:
        immediate_parts.append(f"{attack} attack detected.")

    # Risk tier priority
    immediate_parts.append(tier_actions["immediate"])

    # Severity response
    immediate_parts.append(sev_actions["response"])

    # IP block
    if src_ip not in ["Unknown", "N/A", ""]:
        immediate_parts.append(f"Block source IP {src_ip} immediately.")

    # Repeated IP warning
    if rep_ip:
        immediate_parts.append(
            "WARNING: This source IP has been seen before — persistent threat actor."
        )

    # Time context
    immediate_parts.append(time_actions["immediate"])

    # Segment specific action
    if segment_key:
        immediate_parts.append(seg_actions["immediate"])

    # Critical flags
    if malware:
        immediate_parts.append(
            "Malware confirmed — isolate all affected hosts before any remediation."
        )
    if ignored:
        immediate_parts.append(
            "CRITICAL ALERT: This event was previously ignored — fundamental control gap."
        )
    if not firewall:
        immediate_parts.append(
            "No firewall log captured — investigate logging infrastructure immediately."
        )
    if proxy:
        immediate_parts.append(
            "Proxy evasion detected — trace true traffic origin before blocking."
        )
    if esc_anom:
        immediate_parts.append(
            "Anomaly score escalating — attack campaign may be building toward larger event."
        )

    # Escalation based on tier + segment
    immediate_parts.append(tier_actions["escalation"])
    if segment_key:
        immediate_parts.append(seg_actions["escalate"])
    immediate_parts.append(sev_actions["notify"])

    dynamic_immediate = " ".join(immediate_parts)

    # ── DYNAMIC SHORT TERM ────────────────────────────────────
    short_parts = [
        template["short_base"],
        f"Focus investigation on {segment} segment.",
        time_actions["coverage"],
        tier_actions["resources"],
    ]
    if segment_key:
        short_parts.append(seg_actions["immediate"])
    dynamic_short = " ".join(short_parts)

    # ── DYNAMIC LONG TERM ─────────────────────────────────────
    long_parts = [
        template["long_base"],
        seg_actions["long_term"] if segment_key else "",
        time_actions["long_term"],
        sev_actions["forensics"],
    ]
    dynamic_long = " ".join([p for p in long_parts if p])

    # ── DYNAMIC CONTROL GAP ───────────────────────────────────
    gap_parts = [template["gap"]]
    if ignored:
        gap_parts.append("Event ignored — systemic alert handling failure.")
    if not firewall:
        gap_parts.append("Missing firewall log — audit compliance at risk.")
    if proxy:
        gap_parts.append("Proxy evasion undetected — perimeter visibility gap.")
    dynamic_gap = " ".join(gap_parts)

    return {
        "immediate_action"   : dynamic_immediate,
        "short_term_action"  : dynamic_short,
        "long_term_strategy" : dynamic_long,
        "control_gap_note"   : dynamic_gap,
        "attack_specific"    : ATTACK_NOTES.get(attack, ATTACK_NOTES["Unknown"]),
        "recommendation_context": {
            "code"       : code,
            "group"      : template["group"],
            "segment"    : segment,
            "severity"   : sev,
            "time_slot"  : time_slot,
            "risk_tier"  : risk_tier,
            "tier_label" : tier_actions["label"],
            "time_label" : time_actions["label"],
            "combination": f"Code{code}-{segment_key or 'General'}-{sev}-{time_slot}-Tier{risk_tier}",
        }
    }


# ================================================================
# LEVEL 2 — MULTI-LABEL
# ================================================================
def get_secondary_codes(row, primary_code, all_probs):
    sorted_probs = sorted(enumerate(all_probs), key=lambda x: x[1], reverse=True)
    secondary, possible = [], []
    for code, prob in sorted_probs[1:6]:
        pct = round(float(prob) * 100, 1)
        if pct >= 15 and code != primary_code:
            secondary.append({
                "code"      : int(code),
                "group"     : REC_TEMPLATES.get(code, {}).get("group","?"),
                "label"     : REC_TEMPLATES.get(code, {}).get("label",""),
                "confidence": pct,
            })
        elif pct >= 8 and code != primary_code:
            possible.append({
                "code"      : int(code),
                "group"     : REC_TEMPLATES.get(code, {}).get("group","?"),
                "label"     : REC_TEMPLATES.get(code, {}).get("label",""),
                "confidence": pct,
            })
    return secondary[:2], possible[:2]


# ================================================================
# LEVEL 3 — CONFIDENCE
# ================================================================
def get_confidence_assessment(confidence, code):
    if confidence >= 85:
        return {"level":"HIGH",     "percentage":round(confidence,1),
                "action":"High confidence — proceed with primary recommendation.",
                "color":"green"}
    elif confidence >= 65:
        return {"level":"MEDIUM",   "percentage":round(confidence,1),
                "action":"Medium confidence — review secondary recommendations also.",
                "color":"yellow"}
    elif confidence >= 45:
        return {"level":"LOW",      "percentage":round(confidence,1),
                "action":"Low confidence — manual analyst review recommended.",
                "color":"orange"}
    return     {"level":"UNCERTAIN","percentage":round(confidence,1),
                "action":"Uncertain prediction — analyst must classify manually.",
                "color":"red"}


# ================================================================
# LEVEL 4 — TREND ANALYSIS
# ================================================================
def analyse_trend(results):
    if len(results) < 5:
        return {"trend":"INSUFFICIENT_DATA","direction":"unknown",
                "warning":None,"prediction":"Not enough events for trend analysis.",
                "risk_trend":[]}
    recent      = results[-10:]
    risk_scores = [r.get("risk_score", 0) for r in recent]
    sev_counts  = {}
    for r in recent:
        sev = r.get("predicted_severity","Low")
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    diff = 0
    if len(risk_scores) >= 3:
        diff = np.mean(risk_scores[-3:]) - np.mean(risk_scores[:3])

    if diff > 15:
        direction = "INCREASING"
        warning   = f"Risk increasing by {diff:.1f} — attack campaign may be escalating!"
        prediction= "Pre-emptive containment recommended before next event."
    elif diff < -15:
        direction = "DECREASING"
        warning   = None
        prediction= "Risk reducing — continue monitoring current posture."
    else:
        direction = "STABLE"
        warning   = None
        prediction= "Risk stable — maintain current response posture."

    if sev_counts.get("Critical", 0) >= 2:
        warning = f"{sev_counts['Critical']} Critical events detected — major incident may be underway!"

    return {
        "trend"           : direction,
        "direction"       : direction,
        "warning"         : warning,
        "prediction"      : prediction,
        "risk_trend"      : risk_scores,
        "avg_risk_recent" : round(float(np.mean(risk_scores[-3:])), 1),
        "avg_risk_overall": round(float(np.mean(risk_scores)), 1),
        "severity_counts" : sev_counts,
    }


# ================================================================
# PREPROCESSING
# ================================================================
def preprocess_events(df):
    fill_rules = {
        "Malware Indicators":"Not Detected","Alerts/Warnings":"No Alert",
        "Proxy Information" :"Direct","Firewall Logs":"No Log",
        "IDS/IPS Alerts"    :"No Alert",
    }
    for col, val in fill_rules.items():
        if col in df.columns:
            df[col] = df[col].fillna(val)

    df["Timestamp"]   = pd.to_datetime(df["Timestamp"], errors="coerce")
    df["Timestamp"]   = df["Timestamp"].fillna(pd.Timestamp.now())
    df = df.sort_values("Timestamp").reset_index(drop=True)

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
    if "Proxy Information" in df.columns:
        df["via_proxy"] = (df["Proxy Information"] != "Direct").astype(int)
    else:
        df["via_proxy"] = 0

    df["source_ip_str"]      = df["Source IP Address"].astype(str)
    df["repeated_ip"]        = 0
    df["escalating_anomaly"] = 0
    df["anomaly_trend"]      = 0.0

    for i in range(10, len(df)):
        recent = df["source_ip_str"].iloc[i-10:i].tolist()
        if df["source_ip_str"].iloc[i] in recent:
            df.at[i, "repeated_ip"] = 1

    for i in range(5, len(df)):
        scores = df["Anomaly Scores"].iloc[i-5:i+1].tolist()
        if scores[-1] > scores[-3] > scores[0]:
            df.at[i, "escalating_anomaly"] = 1
        df.at[i, "anomaly_trend"] = round(scores[-1] - scores[0], 2)

    if "risk_score" not in df.columns:
        df["risk_score"] = (
            df.get("Anomaly Scores", 50) * 0.35 +
            df["malware_flag"]   * 20 + df["was_ignored"]  * 15 +
            df["is_night"]       * 10 + (1-df["has_firewall_log"]) * 8 +
            df["has_ids_alert"]  * 5  + df["via_proxy"]    * 4 +
            df["is_weekend"]     * 3
        ).clip(0, 100).round(2)

    if "control_maturity" not in df.columns:
        df["control_maturity"] = (
            (df["has_firewall_log"]+df["has_ids_alert"])/2*40 +
            df["was_blocked"]*40 + (1-df["was_ignored"])*20
        ).clip(0, 100).round(2)

    if "response_effectiveness" not in df.columns:
        df["response_effectiveness"] = (
            df["was_blocked"]*50 + df["has_firewall_log"]*20 + df["has_ids_alert"]*20
        ).clip(0, 100).round(2)

    if "predicted_severity" not in df.columns:
        def sev(r):
            s = r["risk_score"]
            if s >= 66: return "High"
            if s >= 33: return "Medium"
            return "Low"
        df["predicted_severity"]  = df.apply(sev, axis=1)
        df["severity_confidence"] = 0.75

    if "compliance_status" not in df.columns:
        df["compliance_status"] = df.apply(
            lambda r: "Non-Compliant" if (r["was_ignored"]==1 or r["has_firewall_log"]==0)
            else "Compliant", axis=1)
        df["violation_type"] = df.apply(
            lambda r: "Ignored-Event" if r["was_ignored"]==1
            else "Missing-Log" if r["has_firewall_log"]==0 else "None", axis=1)

    return df


def build_sequences(X_scaled, window_size):
    sequences = []
    for i in range(len(X_scaled)):
        if i < window_size - 1:
            pad = np.zeros((window_size-1-i, X_scaled.shape[1]))
            seq = np.vstack([pad, X_scaled[:i+1]])
        else:
            seq = X_scaled[i-window_size+1:i+1]
        sequences.append(seq)
    return np.array(sequences)


# ================================================================
# ROUTES
# ================================================================
@app.get("/")
def root():
    return {
        "service"         : "Recommendation Engine v3.0",
        "model"           : "Stacked LSTM — 50 codes · 8 groups",
        "unique_recs"     : "9,600+ (50 codes × 4 context dimensions)",
        "levels"          : ["L1 Dynamic 9600+","L2 Multi-label","L3 Confidence","L4 Trend"],
        "window_size"     : WINDOW_SIZE,
        "n_codes"         : N_CODES,
        "status"          : "running"
    }


@app.get("/health")
def health():
    mongo_status = "unavailable"
    try:
        if db is not None:
            mongo_client.server_info()
            mongo_status = "connected"
    except Exception as e:
        mongo_status = f"error: {str(e)[:50]}"
    return {
        "status" : "ok",
        "model"  : "loaded — 50 codes · 9600+ recommendations",
        "mongodb": mongo_status,
        "time"   : datetime.now().isoformat()
    }


@app.post("/api/recommendations")
async def get_recommendations(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="CSV is empty")

    print(f"Received {len(df)} events from {file.filename}")

    df = preprocess_events(df)

    CATEGORICAL = [c for c in [
        "Attack Type","Protocol","Traffic Type","Network Segment",
        "predicted_severity","compliance_status","violation_type",
    ] if c in df.columns]

    NUMERICAL = [c for c in [
        "hour","day_of_week","month","is_night","is_weekend","is_peak",
        "Anomaly Scores","malware_flag","has_firewall_log","has_ids_alert",
        "was_ignored","was_blocked","via_proxy","repeated_ip",
        "escalating_anomaly","anomaly_trend","severity_confidence",
        "risk_score","control_maturity","response_effectiveness",
    ] if c in df.columns]

    df_enc   = pd.get_dummies(df[CATEGORICAL+NUMERICAL], columns=CATEGORICAL)
    df_enc   = df_enc.reindex(columns=FEATURE_COLS, fill_value=0)
    X_scaled = scaler.transform(df_enc.astype(float))
    X_seq    = build_sequences(X_scaled, WINDOW_SIZE)

    y_prob = model.predict(X_seq, verbose=0)
    if y_prob.shape[1] < N_CODES:
        pad    = np.zeros((y_prob.shape[0], N_CODES-y_prob.shape[1]))
        y_prob = np.concatenate([y_prob, pad], axis=1)

    y_pred = np.argmax(y_prob, axis=1)
    confs  = np.max(y_prob,  axis=1)

    results    = []
    group_dist = {g:0 for g in "ABCDEFGH"}
    code_dist  = {}

    for i in range(len(df)):
        row        = df.iloc[i]
        code       = int(y_pred[i])
        confidence = round(float(confs[i])*100, 2)
        template   = REC_TEMPLATES.get(code, REC_TEMPLATES[3])

        # 9,600+ unique recommendation
        rec_content = generate_9600_recommendation(row, code)

        # L2 multi-label
        secondary, possible = get_secondary_codes(row, code, y_prob[i])

        # L3 confidence
        conf_assessment = get_confidence_assessment(confidence, code)

        # Risk flags
        flags = []
        if row.get("was_ignored",       0)==1: flags.append("Event ignored")
        if row.get("is_night",          0)==1: flags.append("Off-hours attack")
        if row.get("is_weekend",        0)==1: flags.append("Weekend attack")
        if row.get("malware_flag",      0)==1: flags.append("Malware detected")
        if row.get("has_firewall_log",  0)==0: flags.append("No firewall log")
        if row.get("has_ids_alert",     0)==0: flags.append("No IDS alert")
        if row.get("via_proxy",         0)==1: flags.append("Proxy evasion")
        if row.get("repeated_ip",       0)==1: flags.append("Repeated source IP")
        if row.get("escalating_anomaly",0)==1: flags.append("Escalating anomaly")

        result = {
            "event_index"             : i,
            "timestamp"               : str(row.get("Timestamp","")),
            "source_ip"               : str(row.get("Source IP Address","N/A")),
            "destination_ip"          : str(row.get("Destination IP Address","N/A")),
            "attack_type"             : str(row.get("Attack Type","Unknown")),
            "predicted_severity"      : str(row.get("predicted_severity","Low")),
            "risk_score"              : float(row.get("risk_score",0)),
            "network_segment"         : str(row.get("Network Segment","Unknown")),
            "rec_code"                : code,
            "rec_group"               : template["group"],
            "rec_label"               : template["label"],
            "confidence"              : confidence,
            # L1 — 9,600+ dynamic
            "immediate_action"        : rec_content["immediate_action"],
            "short_term_action"       : rec_content["short_term_action"],
            "long_term_strategy"      : rec_content["long_term_strategy"],
            "control_gap_note"        : rec_content["control_gap_note"],
            "attack_specific"         : rec_content["attack_specific"],
            "recommendation_context"  : rec_content["recommendation_context"],
            "risk_context"            : " | ".join(flags) if flags else "No additional risk flags",
            # L2
            "secondary_recommendations": secondary,
            "possible_recommendations" : possible,
            # L3
            "confidence_assessment"    : conf_assessment,
        }
        results.append(result)

        grp = template["group"]
        group_dist[grp] = group_dist.get(grp, 0) + 1
        code_dist[code] = code_dist.get(code, 0) + 1

    # L4 trend
    trend = analyse_trend(results)

    # Save to MongoDB
    if recommendations_col is not None:
        try:
            docs = [{**r, "saved_at": datetime.now().isoformat()} for r in results]
            recommendations_col.insert_many(docs)
            print(f"Saved {len(docs)} to MongoDB")
        except Exception as e:
            print(f"MongoDB error: {e}")

    total_combinations = len(set(
        r["recommendation_context"]["combination"] for r in results
    ))

    print(f"Generated {total_combinations} unique recommendation combinations")

    return {
        "total_events"          : len(results),
        "processed_at"          : datetime.now().isoformat(),
        "recommendations"       : results,
        "code_distribution"     : {str(k):v for k,v in code_dist.items()},
        "group_distribution"    : group_dist,
        "trend_analysis"        : trend,
        "unique_combinations"   : total_combinations,
        "recommendation_engine" : "9,600+ unique recommendations via 4 context dimensions",
    }


@app.get("/api/recommendations/history")
def get_history(limit: int = 50):
    if recommendations_col is None:
        raise HTTPException(status_code=503, detail="MongoDB unavailable")
    docs = list(
        recommendations_col.find({}, {"_id":0})
        .sort("saved_at",-1).limit(limit)
    )
    return {"count": len(docs), "recommendations": docs}


@app.delete("/api/recommendations/clear")
def clear_history():
    if recommendations_col is None:
        raise HTTPException(status_code=503, detail="MongoDB unavailable")
    result = recommendations_col.delete_many({})
    return {"deleted": result.deleted_count}


@app.get("/api/model/info")
def model_info():
    return {
        "model_type"            : metadata.get("model_type","Stacked LSTM"),
        "window_size"           : WINDOW_SIZE,
        "n_codes"               : N_CODES,
        "n_groups"              : 8,
        "unique_recommendations": "9,600+",
        "context_dimensions"    : {
            "codes"    : "50 LSTM output codes",
            "segments" : "3+ network segments (Finance/HR/IT/etc)",
            "severity" : "4 levels (Critical/High/Medium/Low)",
            "time"     : "4 slots (Night/Weekend/Peak/Normal)",
            "risk_tier": "4 tiers (0-25/26-50/51-75/76-100)",
        },
        "levels": {
            "L1":"Dynamic 9,600+ recommendation generation",
            "L2":"Multi-label secondary predictions",
            "L3":"Confidence scoring + uncertainty quantification",
            "L4":"Trend analysis + campaign detection",
        },
        "test_accuracy" : metadata.get("test_accuracy",""),
        "architecture"  : metadata.get("architecture",""),
    }