# src/models.py

import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import accuracy_score, roc_auc_score
from xgboost import XGBClassifier
import warnings

# Suppress all warnings
warnings.filterwarnings("ignore")
np.seterr(all="ignore")

def train_and_select_best_model(X_train, X_test, y_train, y_test):
    print("\n===== Training Multiple Models with Hyperparameter Tuning =====")

    # 1. Logistic Regression
    print("\nTuning Logistic Regression...")
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr_params = {
        'C': [0.01, 0.1, 1, 10],
        'penalty': ['l2'],
        'solver': ['lbfgs']
    }
    lr_search = RandomizedSearchCV(lr, lr_params, n_iter=4, scoring='roc_auc', cv=3, n_jobs=-1, random_state=42)
    lr_search.fit(X_train, y_train)
    best_lr = lr_search.best_estimator_

    # 2. Random Forest
    print("Tuning Random Forest...")
    rf = RandomForestClassifier(random_state=42, n_jobs=-1)
    rf_params = {
        'n_estimators': [100, 150, 200],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5]
    }
    rf_search = RandomizedSearchCV(rf, rf_params, n_iter=6, scoring='roc_auc', cv=3, n_jobs=-1, random_state=42)
    rf_search.fit(X_train, y_train)
    best_rf = rf_search.best_estimator_

    # 3. Gradient Boosting
    print("Tuning Gradient Boosting...")
    gb = GradientBoostingClassifier(random_state=42)
    gb_params = {
        'n_estimators': [100, 150],
        'learning_rate': [0.05, 0.1],
        'max_depth': [3, 5]
    }
    gb_search = RandomizedSearchCV(gb, gb_params, n_iter=4, scoring='roc_auc', cv=3, n_jobs=-1, random_state=42)
    gb_search.fit(X_train, y_train)
    best_gb = gb_search.best_estimator_

    # 4. XGBoost
    print("Tuning XGBoost...")
    xgb = XGBClassifier(eval_metric='logloss', random_state=42, n_jobs=-1)
    xgb_params = {
        'n_estimators': [100, 150, 200],
        'max_depth': [3, 5, 7],
        'learning_rate': [0.05, 0.1],
        'subsample': [0.8, 1.0]
    }
    xgb_search = RandomizedSearchCV(xgb, xgb_params, n_iter=6, scoring='roc_auc', cv=3, n_jobs=-1, random_state=42)
    xgb_search.fit(X_train, y_train)
    best_xgb = xgb_search.best_estimator_

    # Evaluate tuned models
    models = {
        "Logistic Regression": best_lr,
        "Random Forest": best_rf,
        "Gradient Boosting": best_gb,
        "XGBoost": best_xgb
    }

    results = []
    best_model = None
    best_auc = 0
    best_name = ""

    print("\n===== Evaluating Tuned Models =====")

    for name, model in models.items():
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        auc_score = roc_auc_score(y_test, y_prob)

        results.append({
            "Model": name,
            "Accuracy": round(acc, 4),
            "AUC": round(auc_score, 4)
        })

        print(f"{name} → Accuracy: {acc:.4f} | AUC: {auc_score:.4f}")

        if auc_score > best_auc:
            best_auc = auc_score
            best_model = model
            best_name = name

    results_df = pd.DataFrame(results).sort_values(by="AUC", ascending=False)
    print("\n===== Model Comparison (After Tuning) =====")
    print(results_df)

    print(f"\n✅ Best Model Selected: {best_name} (AUC = {best_auc:.4f})")

    joblib.dump(best_model, "models/best_risk_model.pkl")
    print("✅ Best model saved to models/best_risk_model.pkl")

    return best_model, results_df