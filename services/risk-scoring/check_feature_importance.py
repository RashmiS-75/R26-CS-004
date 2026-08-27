import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score

from src.preprocessing import load_data, clean_data, prepare_features
from src.impact import calculate_permutation_importance, calculate_shap_importance

model = joblib.load("models/best_risk_model.pkl")

df = load_data("data/labeled_dataset_for_GRU-CNN.csv")
df = clean_data(df)

# sample for speed
df = df.sample(n=min(8000, len(df)), random_state=42).reset_index(drop=True)
X, y = prepare_features(df)

EXPECTED = [
    "proto", "action", "service", "utmaction", "duration",
    "sentbyte", "rcvdbyte", "sentpkt", "rcvdpkt", "trandisp",
    "bytes_total", "pkt_total", "pkt_ratio"
]
available = [c for c in EXPECTED if c in X.columns]
X = X[available].copy()
X = X.fillna(X.median(numeric_only=True))

print("Features used:", available)
print("Accuracy:", round(accuracy_score(y, model.predict(X)), 4))

# 1) Permutation importance
perm = calculate_permutation_importance(model, X, y, n_repeats=3)
perm_df = pd.DataFrame({
    "feature": available,
    "permutation_importance": perm
}).sort_values("permutation_importance", ascending=False)

print("\n===== Permutation Importance (higher = more important for correct prediction) =====")
print(perm_df.to_string(index=False))

# 2) SHAP importance
shap_imp = calculate_shap_importance(model, X, max_samples=300)
shap_df = pd.DataFrame({
    "feature": available,
    "shap_importance": shap_imp
}).sort_values("shap_importance", ascending=False)

print("\n===== SHAP Importance =====")
print(shap_df.to_string(index=False))

# 3) Tree model importance if available
if hasattr(model, "feature_importances_"):
    tree_df = pd.DataFrame({
        "feature": available,
        "model_importance": model.feature_importances_
    }).sort_values("model_importance", ascending=False)
    print("\n===== Model Feature Importance =====")
    print(tree_df.to_string(index=False))