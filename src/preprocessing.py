# src/preprocessing.py
import pandas as pd
from sklearn.model_selection import train_test_split


# Features used for ML likelihood training
ML_FEATURES = [
    "proto", "action", "service", "duration",
    "sentbyte", "rcvdbyte", "sentpkt", "rcvdpkt", "trandisp",
    "bytes_total", "pkt_total", "pkt_ratio"
]


def load_data(file_path="data/labeled_dataset_for_GRU-CNN.csv"):
    df = pd.read_csv(file_path)
    print("✅ Data loaded successfully! Shape:", df.shape)
    return df


def clean_data(df):
    # Remove duplicated columns
    cols_to_drop = [col for col in df.columns if col.endswith(".1")]
    df = df.drop(columns=cols_to_drop)

    # Drop identifiers / derived / high-leakage fields from training dataframe
    drop_cols = [
        "eventtime", "srcip", "dstip", "cluster", "distance_to_centroid",
        "apprisk", "dstreputation", "appcat"
    ]
    df = df.drop(columns=[col for col in drop_cols if col in df.columns])

    # Handle missing values
    df = df.fillna(df.median(numeric_only=True))

    print("✅ Data cleaned. Remaining columns:", df.columns.tolist())
    return df


def prepare_features(df):
    """Generic full feature/label split (non-ML helpers)."""
    X = df.drop(columns=["label"])
    y = df["label"]
    return X, y


def prepare_ml_features(df):
    """
    Features for likelihood model training/prediction.
    utmaction is intentionally excluded from ML and reserved for Impact.
    """
    cols = [c for c in ML_FEATURES if c in df.columns]
    if len(cols) < 5:
        raise ValueError(f"Not enough ML features found. Available: {df.columns.tolist()}")

    X = df[cols].copy()
    y = df["label"].copy()
    X = X.fillna(X.median(numeric_only=True))

    print("✅ ML features:", cols)
    return X, y


def split_data(X, y, test_size=0.2, random_state=42):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    print(f"✅ Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")
    return X_train, X_test, y_train, y_test