from __future__ import annotations

import io
import json
import logging
import re
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(__name__)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.joblib"
RF_MODEL_PATH = MODEL_DIR / "random_forest.joblib"
XGB_MODEL_PATH = MODEL_DIR / "xgboost.joblib"
ENSEMBLE_CONFIG_PATH = MODEL_DIR / "ensemble_config.joblib"


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Firewall Compliance Analysis API",
    description=(
        "Machine-learning-based firewall configuration "
        "compliance analysis API."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:5175",
        "http://localhost:5175",
        "http://127.0.0.1:5176",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# SUPPORTED FORMATS
# ============================================================

SUPPORTED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
    ".xlsm",
    ".json",
    ".txt",
    ".cfg",
    ".conf",
    ".xml",
    ".yaml",
    ".yml",
}


# ============================================================
# GLOBAL MODELS
# ============================================================

preprocessor: Any = None
random_forest_model: Any = None
xgboost_model: Any = None
ensemble_config: Any = None


# ============================================================
# GENERAL HELPERS
# ============================================================

def safe_value(value: Any) -> Any:
    """Convert pandas/numpy values into JSON-safe values."""

    if value is None:
        return None

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        if np.isnan(value):
            return None
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, Path):
        return str(value)

    return value


def clean_column_name(value: Any) -> str:
    """Normalize dataframe column names."""

    text = str(value)

    text = text.replace("\ufeff", "")
    text = text.strip()
    text = re.sub(r"\s+", " ", text)

    return text


def normalize_dataframe(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:

    dataframe = dataframe.copy()

    dataframe.columns = [
        clean_column_name(column)
        for column in dataframe.columns
    ]

    return dataframe


# ============================================================
# MODEL LOADING
# ============================================================

def load_model_file(
    path: Path,
) -> Any:

    if not path.exists():

        logger.warning(
            "Model file does not exist: %s",
            path,
        )

        return None

    try:

        model = joblib.load(path)

        logger.info(
            "Loaded model: %s",
            path.name,
        )

        return model

    except Exception as exc:

        logger.exception(
            "Unable to load model: %s",
            path,
        )

        raise RuntimeError(
            f"Unable to load {path.name}: {exc}"
        ) from exc


def load_models() -> None:

    global preprocessor
    global random_forest_model
    global xgboost_model
    global ensemble_config

    preprocessor = load_model_file(
        PREPROCESSOR_PATH
    )

    random_forest_model = load_model_file(
        RF_MODEL_PATH
    )

    xgboost_model = load_model_file(
        XGB_MODEL_PATH
    )

    ensemble_config = load_model_file(
        ENSEMBLE_CONFIG_PATH
    )


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event() -> None:

    try:

        load_models()

        logger.info(
            "Firewall Compliance API started successfully."
        )

    except Exception as exc:

        logger.exception(
            "Model startup error: %s",
            exc,
        )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root() -> dict[str, Any]:

    return {
        "message": "Firewall Compliance Analysis API",
        "docs": "/docs",
        "health": "/api/health",
        "supported_formats": "/api/supported-formats",
        "analyze": "/api/analyze",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health() -> dict[str, Any]:

    return {
        "status": "ok",
        "message": (
            "Firewall Compliance Analysis API is running"
        ),
        "models": {
            "preprocessor": (
                preprocessor is not None
            ),
            "random_forest": (
                random_forest_model is not None
            ),
            "xgboost": (
                xgboost_model is not None
            ),
            "ensemble_config": (
                ensemble_config is not None
            ),
        },
    }


# ============================================================
# SUPPORTED FORMATS
# ============================================================

@app.get("/api/supported-formats")
def supported_formats() -> dict[str, Any]:

    return {
        "formats": sorted(
            extension.replace(".", "")
            for extension in SUPPORTED_EXTENSIONS
        ),
        "extensions": sorted(
            SUPPORTED_EXTENSIONS
        ),
    }


# ============================================================
# FILE READERS
# ============================================================

def read_csv_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    last_error = None

    for encoding in (
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1",
    ):

        try:

            return pd.read_csv(
                io.BytesIO(file_bytes),
                encoding=encoding,
            )

        except Exception as exc:

            last_error = exc

    raise ValueError(
        f"Could not read CSV file: {last_error}"
    )


def read_excel_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    try:

        return pd.read_excel(
            io.BytesIO(file_bytes)
        )

    except Exception as exc:

        raise ValueError(
            f"Could not read Excel file: {exc}"
        ) from exc


def read_json_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    try:

        data = json.loads(
            file_bytes.decode(
                "utf-8-sig"
            )
        )

    except Exception as exc:

        raise ValueError(
            f"Invalid JSON file: {exc}"
        ) from exc


    if isinstance(data, list):

        return pd.DataFrame(data)


    if isinstance(data, dict):

        for key in (
            "rules",
            "data",
            "results",
            "configuration",
        ):

            value = data.get(key)

            if isinstance(value, list):

                return pd.DataFrame(value)


        return pd.DataFrame(
            [data]
        )


    raise ValueError(
        "JSON must contain an object or array."
    )


def read_yaml_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    try:

        import yaml

    except ImportError as exc:

        raise ValueError(
            "PyYAML is not installed. "
            "Run: pip install pyyaml"
        ) from exc


    try:

        data = yaml.safe_load(
            file_bytes.decode(
                "utf-8-sig"
            )
        )

    except Exception as exc:

        raise ValueError(
            f"Invalid YAML file: {exc}"
        ) from exc


    if isinstance(data, list):

        return pd.DataFrame(data)


    if isinstance(data, dict):

        for key in (
            "rules",
            "data",
            "results",
            "configuration",
        ):

            value = data.get(key)

            if isinstance(value, list):

                return pd.DataFrame(value)


        return pd.DataFrame(
            [data]
        )


    raise ValueError(
        "YAML must contain an object or array."
    )


def read_xml_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    try:

        return pd.read_xml(
            io.BytesIO(file_bytes)
        )

    except Exception as exc:

        raise ValueError(
            f"Could not read XML file: {exc}"
        ) from exc


def read_text_file(
    file_bytes: bytes,
) -> pd.DataFrame:

    text = None
    last_error = None


    for encoding in (
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1",
    ):

        try:

            text = file_bytes.decode(
                encoding
            )

            break

        except UnicodeDecodeError as exc:

            last_error = exc


    if text is None:

        raise ValueError(
            f"Could not decode text file: {last_error}"
        )


    text = text.strip()


    if not text:

        raise ValueError(
            "Uploaded file is empty."
        )


    # --------------------------------------------------------
    # Try CSV / delimiter-separated data
    # --------------------------------------------------------

    try:

        dataframe = pd.read_csv(
            io.StringIO(text),
            sep=None,
            engine="python",
        )

        if len(dataframe.columns) > 1:

            return dataframe

    except Exception:

        pass


    # --------------------------------------------------------
    # Try JSON
    # --------------------------------------------------------

    try:

        data = json.loads(text)

        if isinstance(data, list):

            return pd.DataFrame(
                data
            )

        if isinstance(data, dict):

            return pd.DataFrame(
                [data]
            )

    except Exception:

        pass


    # --------------------------------------------------------
    # Try key=value / key:value
    # --------------------------------------------------------

    row = {}


    for line in text.splitlines():

        line = line.strip()

        if not line:
            continue


        if "=" in line:

            key, value = line.split(
                "=",
                1,
            )

        elif ":" in line:

            key, value = line.split(
                ":",
                1,
            )

        else:

            continue


        row[
            key.strip()
        ] = value.strip()


    if row:

        return pd.DataFrame(
            [row]
        )


    raise ValueError(
        "Unsupported configuration text format."
    )


# ============================================================
# READ FILE
# ============================================================

def read_uploaded_file(
    filename: str,
    file_bytes: bytes,
) -> pd.DataFrame:

    extension = (
        Path(filename)
        .suffix
        .lower()
    )


    if extension not in SUPPORTED_EXTENSIONS:

        raise ValueError(
            f"Unsupported file format: {extension}"
        )


    if extension == ".csv":

        dataframe = read_csv_file(
            file_bytes
        )


    elif extension in {
        ".xlsx",
        ".xls",
        ".xlsm",
    }:

        dataframe = read_excel_file(
            file_bytes
        )


    elif extension == ".json":

        dataframe = read_json_file(
            file_bytes
        )


    elif extension in {
        ".yaml",
        ".yml",
    }:

        dataframe = read_yaml_file(
            file_bytes
        )


    elif extension == ".xml":

        dataframe = read_xml_file(
            file_bytes
        )


    else:

        dataframe = read_text_file(
            file_bytes
        )


    dataframe = normalize_dataframe(
        dataframe
    )


    if dataframe.empty:

        raise ValueError(
            "The uploaded file contains no rows."
        )


    logger.info(
        "Loaded %s rows and %s columns.",
        len(dataframe),
        len(dataframe.columns),
    )


    logger.info(
        "Columns: %s",
        list(dataframe.columns),
    )


    return dataframe


# ============================================================
# FIND COLUMN
# ============================================================

def find_column(
    dataframe: pd.DataFrame,
    candidates: list[str],
) -> str | None:

    lookup = {}

    for column in dataframe.columns:

        lookup[
            str(column).strip().lower()
        ] = column


    for candidate in candidates:

        key = (
            str(candidate)
            .strip()
            .lower()
        )

        if key in lookup:

            return lookup[key]


    return None


# ============================================================
# GET EXPECTED FEATURES
# ============================================================

def get_expected_features() -> list[str] | None:
    """
    Get the input feature names recorded by the saved
    preprocessor/model.
    """

    objects = [
        preprocessor,
        random_forest_model,
        xgboost_model,
    ]


    for obj in objects:

        if obj is None:
            continue


        names = getattr(
            obj,
            "feature_names_in_",
            None,
        )


        if names is not None:

            return [
                str(name)
                for name in names
            ]


        # Pipeline case
        if hasattr(
            obj,
            "named_steps",
        ):

            for step in (
                obj.named_steps.values()
            ):

                names = getattr(
                    step,
                    "feature_names_in_",
                    None,
                )


                if names is not None:

                    return [
                        str(name)
                        for name in names
                    ]


    return None


# ============================================================
# GET ACTUAL TRANSFORMER
# ============================================================

def get_transformer() -> Any:
    """
    Get the ColumnTransformer from either a direct object
    or a Pipeline.
    """

    if preprocessor is None:

        return None


    if hasattr(
        preprocessor,
        "transformers_",
    ):

        return preprocessor


    if hasattr(
        preprocessor,
        "named_steps",
    ):

        for step in (
            preprocessor.named_steps.values()
        ):

            if hasattr(
                step,
                "transformers_",
            ):

                return step


    return None


# ============================================================
# GET NUMERIC / CATEGORICAL COLUMNS
# ============================================================

def get_column_types() -> tuple[
    list[str],
    list[str],
]:
    """
    Extract numeric and categorical columns from the saved
    ColumnTransformer.

    This is important because the numeric transformer can use
    median imputation, which cannot receive strings.
    """

    numeric_columns = []
    categorical_columns = []


    transformer = get_transformer()


    if transformer is None:

        return (
            numeric_columns,
            categorical_columns,
        )


    try:

        for name, trans, columns in (
            transformer.transformers_
        ):

            name_text = str(
                name
            ).lower()


            if name_text == "remainder":
                continue

            if name_text == "drop":
                continue


            transformer_text = (
                name_text
            )


            if hasattr(
                trans,
                "steps",
            ):

                for step_name, _ in trans.steps:

                    transformer_text += (
                        " "
                        +
                        str(
                            step_name
                        ).lower()
                    )


            if isinstance(
                columns,
                str,
            ):

                column_list = [
                    columns
                ]

            else:

                try:

                    column_list = list(
                        columns
                    )

                except TypeError:

                    column_list = []


            if (
                "num" in transformer_text
                or
                "numeric" in transformer_text
            ):

                numeric_columns.extend(
                    [
                        str(column)
                        for column in column_list
                    ]
                )


            elif (
                "cat" in transformer_text
                or
                "categor" in transformer_text
            ):

                categorical_columns.extend(
                    [
                        str(column)
                        for column in column_list
                    ]
                )


    except Exception as exc:

        logger.warning(
            "Unable to inspect transformer columns: %s",
            exc,
        )


    return (
        numeric_columns,
        categorical_columns,
    )


# ============================================================
# PREPARE FEATURES
# ============================================================

def prepare_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Prepare the uploaded dataframe for the saved
    preprocessing pipeline.
    """

    features = dataframe.copy()


    # --------------------------------------------------------
    # Remove target/output columns
    # --------------------------------------------------------

    target_names = {
        "compliance_status",
        "compliance",
        "target",
        "label",
        "prediction",
        "class",
    }


    target_columns = []


    for column in features.columns:

        normalized = (
            str(column)
            .strip()
            .lower()
            .replace(" ", "_")
        )


        if normalized in target_names:

            target_columns.append(
                column
            )


    if target_columns:

        features = features.drop(
            columns=target_columns,
            errors="ignore",
        )


    # --------------------------------------------------------
    # Align exactly to saved feature names
    # --------------------------------------------------------

    expected = get_expected_features()


    if expected:

        aligned = pd.DataFrame(
            index=features.index
        )


        for expected_column in expected:

            matching_column = None


            # Exact match
            if expected_column in features.columns:

                matching_column = expected_column

            else:

                # Case-insensitive match
                expected_lower = (
                    expected_column
                    .strip()
                    .lower()
                )


                for actual_column in features.columns:

                    actual_lower = (
                        str(actual_column)
                        .strip()
                        .lower()
                    )


                    if (
                        actual_lower
                        ==
                        expected_lower
                    ):

                        matching_column = actual_column

                        break


            if matching_column is not None:

                aligned[
                    expected_column
                ] = features[
                    matching_column
                ]

            else:

                # Missing columns use NaN.
                # Numeric transformers can then
                # handle them using their imputer.
                aligned[
                    expected_column
                ] = np.nan


        features = aligned


    # --------------------------------------------------------
    # Correct numeric columns
    # --------------------------------------------------------

    numeric_columns, categorical_columns = (
        get_column_types()
    )


    for column in numeric_columns:

        if column in features.columns:

            features[
                column
            ] = pd.to_numeric(
                features[column],
                errors="coerce",
            )


    # --------------------------------------------------------
    # Correct categorical columns
    # --------------------------------------------------------

    for column in categorical_columns:

        if column in features.columns:

            features[
                column
            ] = (
                features[column]
                .fillna("")
                .astype(str)
            )


    logger.info(
        "Prepared features: %s",
        list(features.columns),
    )


    logger.info(
        "Numeric columns: %s",
        numeric_columns,
    )


    logger.info(
        "Categorical columns: %s",
        categorical_columns,
    )


    return features


# ============================================================
# TRANSFORM FEATURES
# ============================================================

def transform_features(
    features: pd.DataFrame,
) -> Any:

    if preprocessor is None:

        logger.warning(
            "No preprocessor loaded. "
            "Using raw features."
        )

        return features


    try:

        return preprocessor.transform(
            features
        )

    except Exception as exc:

        logger.exception(
            "Preprocessing failed."
        )

        raise RuntimeError(
            "The uploaded configuration does not match "
            "the saved preprocessing pipeline. "
            f"Details: {exc}"
        ) from exc


# ============================================================
# MODEL PROBABILITY
# ============================================================

def get_probability(
    model: Any,
    transformed: Any,
) -> np.ndarray:

    if model is None:

        return np.zeros(
            len(transformed),
            dtype=float,
        )


    # --------------------------------------------------------
    # predict_proba
    # --------------------------------------------------------

    if hasattr(
        model,
        "predict_proba",
    ):

        probabilities = np.asarray(
            model.predict_proba(
                transformed
            )
        )


        if probabilities.ndim == 1:

            return probabilities.astype(
                float
            )


        classes = getattr(
            model,
            "classes_",
            None,
        )


        if classes is not None:

            classes = list(
                classes
            )


            if 1 in classes:

                return probabilities[
                    :,
                    classes.index(1),
                ].astype(float)


            if "1" in classes:

                return probabilities[
                    :,
                    classes.index("1"),
                ].astype(float)


        return probabilities[
            :,
            -1,
        ].astype(float)


    # --------------------------------------------------------
    # predict
    # --------------------------------------------------------

    if hasattr(
        model,
        "predict",
    ):

        predictions = np.asarray(
            model.predict(
                transformed
            )
        )


        values = []


        for prediction in predictions:

            text = (
                str(prediction)
                .strip()
                .lower()
            )


            if text in {
                "1",
                "true",
                "yes",
                "compliant",
            }:

                values.append(
                    1.0
                )

            elif text in {
                "0",
                "false",
                "no",
                "non-compliant",
                "non compliant",
            }:

                values.append(
                    0.0
                )

            else:

                try:

                    values.append(
                        float(prediction)
                    )

                except Exception:

                    values.append(
                        0.0
                    )


        return np.asarray(
            values,
            dtype=float,
        )


    raise RuntimeError(
        "Loaded model does not support prediction."
    )


# ============================================================
# ENSEMBLE
# ============================================================

def calculate_ensemble(
    rf_probability: np.ndarray | None,
    xgb_probability: np.ndarray | None,
) -> np.ndarray:

    if (
        rf_probability is None
        and
        xgb_probability is None
    ):

        raise RuntimeError(
            "No trained models are available."
        )


    if rf_probability is None:

        return np.asarray(
            xgb_probability,
            dtype=float,
        )


    if xgb_probability is None:

        return np.asarray(
            rf_probability,
            dtype=float,
        )


    rf_weight = 0.5
    xgb_weight = 0.5


    if isinstance(
        ensemble_config,
        dict,
    ):

        try:

            rf_weight = float(
                ensemble_config.get(
                    "random_forest_weight",
                    ensemble_config.get(
                        "rf_weight",
                        0.5,
                    ),
                )
            )


            xgb_weight = float(
                ensemble_config.get(
                    "xgboost_weight",
                    ensemble_config.get(
                        "xgb_weight",
                        0.5,
                    ),
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            rf_weight = 0.5
            xgb_weight = 0.5


    total_weight = (
        rf_weight +
        xgb_weight
    )


    if total_weight <= 0:

        rf_weight = 0.5
        xgb_weight = 0.5
        total_weight = 1.0


    rf_weight /= total_weight
    xgb_weight /= total_weight


    result = (
        rf_probability * rf_weight
        +
        xgb_probability * xgb_weight
    )


    return np.clip(
        result,
        0.0,
        1.0,
    )


# ============================================================
# RULE ID
# ============================================================

def get_rule_id(
    row: pd.Series,
    index: int,
) -> Any:

    candidates = [
        "Rule_ID",
        "Rule Id",
        "RuleID",
        "rule_id",
        "Rule_Name",
        "Rule Name",
        "Name",
        "ID",
        "id",
    ]


    for candidate in candidates:

        candidate_lower = (
            candidate
            .strip()
            .lower()
        )


        for column in row.index:

            column_lower = (
                str(column)
                .strip()
                .lower()
            )


            if (
                column_lower
                ==
                candidate_lower
            ):

                value = row[column]


                try:

                    if pd.isna(value):
                        continue

                except (
                    TypeError,
                    ValueError,
                ):

                    pass


                return safe_value(
                    value
                )


    return index + 1


# ============================================================
# BUILD RULE DETAILS
# ============================================================

def build_rule_details(
    dataframe: pd.DataFrame,
    index: int,
) -> dict[str, Any]:

    row = dataframe.iloc[
        index
    ]


    details = {}


    for column in dataframe.columns:

        details[
            str(column)
        ] = safe_value(
            row[column]
        )


    return details


# ============================================================
# ANALYZE DATAFRAME
# ============================================================

def analyze_dataframe(
    dataframe: pd.DataFrame,
) -> dict[str, Any]:

    if (
        random_forest_model is None
        and
        xgboost_model is None
    ):

        raise RuntimeError(
            "No trained ML models were loaded. "
            "Check the models folder."
        )


    original_dataframe = (
        dataframe.copy()
    )


    # --------------------------------------------------------
    # Prepare and transform
    # --------------------------------------------------------

    features = prepare_features(
        original_dataframe
    )


    transformed = transform_features(
        features
    )


    # --------------------------------------------------------
    # Predictions
    # --------------------------------------------------------

    rf_probability = None
    xgb_probability = None


    if random_forest_model is not None:

        rf_probability = get_probability(
            random_forest_model,
            transformed,
        )


    if xgboost_model is not None:

        xgb_probability = get_probability(
            xgboost_model,
            transformed,
        )


    ensemble_probability = calculate_ensemble(
        rf_probability,
        xgb_probability,
    )


    # --------------------------------------------------------
    # Rule results
    # --------------------------------------------------------

    rules = []


    for index in range(
        len(original_dataframe)
    ):

        ensemble_value = float(
            np.clip(
                ensemble_probability[index],
                0.0,
                1.0,
            )
        )


        status = (
            "Compliant"
            if ensemble_value >= 0.5
            else "Non-Compliant"
        )


        rf_value = (
            float(
                np.clip(
                    rf_probability[index],
                    0.0,
                    1.0,
                )
            )
            if rf_probability is not None
            else ensemble_value
        )


        xgb_value = (
            float(
                np.clip(
                    xgb_probability[index],
                    0.0,
                    1.0,
                )
            )
            if xgb_probability is not None
            else ensemble_value
        )


        row = original_dataframe.iloc[
            index
        ]


        rules.append(
            {
                "rule_number":
                    get_rule_id(
                        row,
                        index,
                    ),

                "status":
                    status,

                "confidence":
                    ensemble_value,

                "random_forest_probability":
                    rf_value,

                "xgboost_probability":
                    xgb_value,

                "ensemble_probability":
                    ensemble_value,

                "details":
                    build_rule_details(
                        original_dataframe,
                        index,
                    ),
            }
        )


    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    total_rules = len(
        rules
    )


    compliant_rules = sum(
        1
        for rule in rules
        if rule["status"]
        == "Compliant"
    )


    non_compliant_rules = (
        total_rules -
        compliant_rules
    )


    compliance_percentage = (
        (
            compliant_rules
            /
            total_rules
            *
            100
        )
        if total_rules > 0
        else 0.0
    )


    overall_status = (
        "Compliant"
        if compliance_percentage >= 50.0
        else "Non-Compliant"
    )


    # --------------------------------------------------------
    # Vendor
    # --------------------------------------------------------

    vendor_column = find_column(
        original_dataframe,
        [
            "Vendor",
            "vendor",
            "Firewall_Vendor",
            "Firewall Vendor",
        ],
    )


    vendor = "—"


    if vendor_column is not None:

        values = (
            original_dataframe[
                vendor_column
            ]
            .dropna()
        )


        if not values.empty:

            vendor = str(
                values.iloc[0]
            )


    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "total_rules":
            total_rules,

        "compliant_rules":
            compliant_rules,

        "non_compliant_rules":
            non_compliant_rules,

        "compliance_percentage":
            round(
                compliance_percentage,
                2,
            ),

        "overall_status":
            overall_status,

        "vendor":
            vendor,

        "rules":
            rules,
    }


# ============================================================
# ANALYZE ENDPOINT
# ============================================================

@app.post("/api/analyze")
async def analyze_configuration(
    file: UploadFile = File(...),
) -> dict[str, Any]:

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )


    filename = Path(
        file.filename
    ).name


    extension = (
        Path(filename)
        .suffix
        .lower()
    )


    if extension not in SUPPORTED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file format: "
                f"{extension}"
            ),
        )


    try:

        file_bytes = await file.read()


        if not file_bytes:

            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )


        logger.info(
            "Starting analysis: %s",
            filename,
        )


        dataframe = read_uploaded_file(
            filename,
            file_bytes,
        )


        analysis = analyze_dataframe(
            dataframe
        )


        return {
            "success": True,

            "message":
                "Configuration analyzed successfully.",

            "configuration_name":
                filename,

            **analysis,
        }


    except HTTPException:

        raise


    except Exception as exc:

        logger.exception(
            "Analysis failed for %s",
            filename,
        )


        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )