# train_model.py
# Intelligent Firewall Log Risk Scoring Engine - Retraining Script

from src.preprocessing import load_data, clean_data, prepare_ml_features, split_data
from src.models import train_and_select_best_model
from src.impact import calculate_permutation_importance, calculate_shap_importance
from src.risk_scorer import calculate_risk_score

from sklearn.metrics import (
    confusion_matrix, classification_report,
    roc_curve, auc, precision_recall_curve, average_precision_score,
    accuracy_score, roc_auc_score
)
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.feature_selection import mutual_info_classif

import matplotlib.pyplot as plt
import pandas as pd
import joblib
import numpy as np
import os

os.makedirs("models", exist_ok=True)
os.makedirs("reports", exist_ok=True)

print("===== Starting Risk Scoring Engine Retraining =====")

# ====================== 1. Load and Clean Data ======================
df = load_data("data/labeled_dataset_for_GRU-CNN.csv")
df = clean_data(df)

# ====================== 2. Prepare ML Features only ======================
# utmaction excluded from ML; reserved for fuzzy impact
X, y = prepare_ml_features(df)

# ====================== 3. Stricter split for more realistic accuracy ======================
X_train, X_test, y_train, y_test = split_data(X, y, test_size=0.85)

# ====================== 4. Train all models and select best ======================
best_model, comparison = train_and_select_best_model(X_train, X_test, y_train, y_test)

# Save feature list used by model
joblib.dump(list(X.columns), "models/model_features.pkl")
print("✅ Saved models/model_features.pkl")

# ====================== 5. Research importances ======================
print("\n===== Calculating Permutation Importance =====")
perm_importances = calculate_permutation_importance(best_model, X_test, y_test, n_repeats=3)
joblib.dump(perm_importances, "models/permutation_importance.pkl")
print("✅ Permutation Importance saved")

print("\n===== Calculating SHAP Importance =====")
shap_importances = calculate_shap_importance(best_model, X_test, max_samples=300)
joblib.dump(shap_importances, "models/shap_importance.pkl")
print("✅ SHAP Importance saved")

# ====================== 6. Probability & Binary Prediction ======================
y_prob = best_model.predict_proba(X_test)[:, 1]
y_pred_binary = (y_prob >= 0.5).astype(int)

print("\n===== Label Mapping Justification =====")
print("Probability < 0.5  → Predicted as Benign (0)")
print("Probability >= 0.5 → Predicted as Malicious (1)")

print("\n===== Best Model Test Metrics =====")
print("Accuracy:", round(accuracy_score(y_test, y_pred_binary), 4))
print("AUC:", round(roc_auc_score(y_test, y_prob), 4))

# ====================== 7. Confusion Matrix ======================
cm = confusion_matrix(y_test, y_pred_binary)
cm_df = pd.DataFrame(
    cm,
    index=["Actual Benign (0)", "Actual Malicious (1)"],
    columns=["Predicted Benign (0)", "Predicted Malicious (1)"]
)
print("\n===== Confusion Matrix =====")
print(cm_df)

print("\n===== Classification Report =====")
print(classification_report(y_test, y_pred_binary, target_names=["Benign", "Malicious"]))

# ====================== 8. ROC Curve ======================
fpr, tpr, _ = roc_curve(y_test, y_prob)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color="darkorange", lw=2, label=f"ROC curve (AUC = {roc_auc:.4f})")
plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--", label="Random Classifier")
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve - Firewall Risk Scoring Engine")
plt.legend(loc="lower right")
plt.grid(True)
plt.savefig("reports/roc_curve.png", dpi=300, bbox_inches="tight")
plt.close()
print(f"\n✅ ROC Curve saved → reports/roc_curve.png (AUC = {roc_auc:.4f})")

# ====================== 9. Precision-Recall Curve ======================
precision, recall, _ = precision_recall_curve(y_test, y_prob)
avg_precision = average_precision_score(y_test, y_prob)

plt.figure(figsize=(8, 6))
plt.plot(recall, precision, color="blue", lw=2, label=f"PR curve (AP = {avg_precision:.4f})")
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve - Firewall Risk Scoring Engine")
plt.legend(loc="lower left")
plt.grid(True)
plt.savefig("reports/precision_recall_curve.png", dpi=300, bbox_inches="tight")
plt.close()
print(f"✅ Precision-Recall Curve saved → reports/precision_recall_curve.png (AP = {avg_precision:.4f})")

# ====================== 10. Test Risk Score (Fuzzy Impact path) ======================
print("\n===== Testing Risk Score (Likelihood × Fuzzy Impact × 100) =====")
sample_results = calculate_risk_score(best_model, X_test.head(10))
print(sample_results)

# ====================== 11. More Realistic Evaluation ======================
print("\n===== More Realistic Evaluation =====")

print("\n--- 5-Fold Cross Validation ---")
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_auc = cross_val_score(best_model, X, y, cv=skf, scoring="roc_auc", n_jobs=-1)
cv_acc = cross_val_score(best_model, X, y, cv=skf, scoring="accuracy", n_jobs=-1)

print(f"Cross-Validation AUC Scores: {np.round(cv_auc, 4)}")
print(f"Mean CV AUC: {cv_auc.mean():.4f} (+/- {cv_auc.std():.4f})")
print(f"Mean CV Accuracy: {cv_acc.mean():.4f} (+/- {cv_acc.std():.4f})")

print("\n--- Evaluation on Difficult Cases ---")
difficult_mask = (y_prob > 0.3) & (y_prob < 0.7)
X_difficult = X_test[difficult_mask]
y_difficult = y_test[difficult_mask]

if len(X_difficult) > 0:
    y_prob_diff = best_model.predict_proba(X_difficult)[:, 1]
    y_pred_diff = (y_prob_diff >= 0.5).astype(int)
    print(f"Number of difficult cases: {len(X_difficult)}")
    print(f"Accuracy on difficult cases: {accuracy_score(y_difficult, y_pred_diff):.4f}")
    if len(np.unique(y_difficult)) > 1:
        print(f"AUC on difficult cases: {roc_auc_score(y_difficult, y_prob_diff):.4f}")
    else:
        print("AUC on difficult cases: Not defined (only one class present)")
else:
    print("No difficult cases found (model is highly confident on all samples)")

# ====================== 12. Data Leakage Investigation ======================
print("\n===== Data Leakage Investigation =====")
mi_scores = mutual_info_classif(X, y, random_state=42)
mi_df = pd.DataFrame({
    "Feature": X.columns,
    "Mutual_Information": mi_scores
}).sort_values(by="Mutual_Information", ascending=False)

print("\nMutual Information with Label (higher = stronger relationship):")
print(mi_df.to_string(index=False))

print("\nAbsolute Correlation with Label:")
corr = X.corrwith(y).abs().sort_values(ascending=False)
print(corr)

print("\n✅ Training completed successfully!")
print("Files saved:")
print(" - models/best_risk_model.pkl")
print(" - models/model_features.pkl")
print(" - models/permutation_importance.pkl")
print(" - models/shap_importance.pkl")
print(" - reports/roc_curve.png")
print(" - reports/precision_recall_curve.png")