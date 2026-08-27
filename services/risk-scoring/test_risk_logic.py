import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from src.preprocessing import load_data, clean_data, prepare_features
from src.risk_scorer import calculate_risk_score

print("===== Risk Logic Verification =====")

# 1. Load model
model = joblib.load("models/best_risk_model.pkl")
print("✅ Model loaded")

# 2. Load and clean data
df = load_data("data/labeled_dataset_for_GRU-CNN.csv")
df = clean_data(df)

# Use a sample for fast check
df_sample = df.sample(n=min(5000, len(df)), random_state=42).reset_index(drop=True)

X, y = prepare_features(df_sample)

# Keep only columns model expects if needed
EXPECTED = [
    "proto", "action", "service", "utmaction", "duration",
    "sentbyte", "rcvdbyte", "sentpkt", "rcvdpkt", "trandisp",
    "bytes_total", "pkt_total", "pkt_ratio"
]
available = [c for c in EXPECTED if c in X.columns]
X = X[available].copy()
X = X.fillna(X.median(numeric_only=True))

if "bytes_total" not in X.columns and {"sentbyte", "rcvdbyte"}.issubset(X.columns):
    X["bytes_total"] = X["sentbyte"].fillna(0) + X["rcvdbyte"].fillna(0)
if "pkt_total" not in X.columns and {"sentpkt", "rcvdpkt"}.issubset(X.columns):
    X["pkt_total"] = X["sentpkt"].fillna(0) + X["rcvdpkt"].fillna(0)

print("✅ Sample size:", len(X))

# 3. Run risk engine
results = calculate_risk_score(model, X)
results["true_label"] = y.values

print("\n===== Sample Output =====")
print(results.head(10)[[
    "true_label", "predicted_label", "likelihood", "impact", "risk_score", "risk_level"
]])

# 4. Check predicted label accuracy
acc = accuracy_score(results["true_label"], results["predicted_label"])
print("\n===== Likelihood Model Check =====")
print("Accuracy (predicted_label vs true_label):", round(acc, 4))
print("\nConfusion Matrix:")
print(confusion_matrix(results["true_label"], results["predicted_label"]))
print("\nClassification Report:")
print(classification_report(results["true_label"], results["predicted_label"], digits=4))

# 5. Check formula correctness: risk ≈ L * I * 100
calc = results["likelihood"] * results["impact"] * 100
diff = np.abs(calc - results["risk_score"])
print("\n===== Formula Check: risk = L * I * 100 =====")
print("Max difference:", round(diff.max(), 6))
print("Mean difference:", round(diff.mean(), 6))
print("✅ Formula OK" if diff.max() < 0.05 else "❌ Formula mismatch")

# 6. Score behavior by true label
print("\n===== Risk Score by True Label =====")
print(results.groupby("true_label")["risk_score"].agg(["count", "mean", "min", "max"]).round(2))

# 7. Basic range checks
print("\n===== Range Checks =====")
print("Likelihood range:", results["likelihood"].min(), "→", results["likelihood"].max())
print("Impact range:", results["impact"].min(), "→", results["impact"].max())
print("Risk score range:", results["risk_score"].min(), "→", results["risk_score"].max())

print("\n===== Done =====")