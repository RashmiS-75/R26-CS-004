import joblib
import pandas as pd

from pathlib import Path



# PATHS


BASE_DIR = Path(
    __file__
).resolve().parent.parent

MODEL_DIR = BASE_DIR / "models"



# FIREWALL COMPLIANCE PREDICTOR


class FirewallPredictor:
    """
    Loads the trained preprocessing pipeline,
    Random Forest model, XGBoost model and ensemble settings.

    Model convention:
        1 = Compliant
        0 = Non-Compliant
    """

    def __init__(self):

       
        # Load preprocessing pipeline
        

        self.preprocessor = joblib.load(
            MODEL_DIR / "preprocessor.joblib"
        )

        
        # Load Random Forest
        

        self.random_forest = joblib.load(
            MODEL_DIR / "random_forest.joblib"
        )

        
        # Load XGBoost
        

        self.xgboost = joblib.load(
            MODEL_DIR / "xgboost.joblib"
        )

        
        # Load ensemble configuration
        

        self.ensemble_config = joblib.load(
            MODEL_DIR / "ensemble_config.joblib"
        )

        # Safely read configuration
        self.rf_weight = float(
            self.ensemble_config.get(
                "random_forest_weight",
                0.5
            )
        )

        self.xgb_weight = float(
            self.ensemble_config.get(
                "xgboost_weight",
                0.5
            )
        )

        self.threshold = float(
            self.ensemble_config.get(
                "threshold",
                0.5
            )
        )

        
        # Exact features used during training
        

        self.expected_columns = list(
            self.preprocessor.feature_names_in_
        )

        
        # Validate weights
        

        total_weight = (
            self.rf_weight +
            self.xgb_weight
        )

        if total_weight <= 0:

            raise ValueError(
                "Invalid ensemble weights."
            )

    
    # MULTIPLE RULE PREDICTION
    

    def predict_rules(
        self,
        rules_df: pd.DataFrame
    ):

        if rules_df is None:

            raise ValueError(
                "Rules dataframe is missing."
            )

        if rules_df.empty:

            raise ValueError(
                "No firewall rules were provided."
            )

        
        # Validate required features
        

        missing_columns = [
            column
            for column in self.expected_columns
            if column not in rules_df.columns
        ]

        if missing_columns:

            raise ValueError(
                "Missing required configuration features: "
                +
                ", ".join(
                    missing_columns
                )
            )

       
        # Exact training feature order
        

        input_df = rules_df[
            self.expected_columns
        ].copy()

        
        # Apply same preprocessing
        

        processed_data = (
            self.preprocessor.transform(
                input_df
            )
        )

        
        # Model probabilities
        #
        # Class 1 = Compliant
        

        rf_probabilities = (
            self.random_forest
            .predict_proba(
                processed_data
            )[:, 1]
        )

        xgb_probabilities = (
            self.xgboost
            .predict_proba(
                processed_data
            )[:, 1]
        )

        
        # Weighted ensemble
        

        ensemble_probabilities = (
            self.rf_weight
            * rf_probabilities
            +
            self.xgb_weight
            * xgb_probabilities
        )

        
        # Final prediction
        #
        # 1 = Compliant
        # 0 = Non-Compliant
        

        predictions = (
            ensemble_probabilities
            >= self.threshold
        ).astype(int)

        
        # Build results
        

        results = []

        for index in range(
            len(input_df)
        ):

            prediction = int(
                predictions[index]
            )

            rf_probability = float(
                rf_probabilities[index]
            )

            xgb_probability = float(
                xgb_probabilities[index]
            )

            ensemble_probability = float(
                ensemble_probabilities[index]
            )

            status = (
                "Compliant"
                if prediction == 1
                else "Non-Compliant"
            )

            results.append({

                "rule_number":
                    index + 1,

                "prediction":
                    prediction,

                "status":
                    status,

                "random_forest_probability":
                    round(
                        rf_probability,
                        4
                    ),

                "xgboost_probability":
                    round(
                        xgb_probability,
                        4
                    ),

                "ensemble_probability":
                    round(
                        ensemble_probability,
                        4
                    )

            })

        return results

    
    # SINGLE RULE
    

    def predict_rule(
        self,
        rule_data: dict
    ):

        dataframe = pd.DataFrame(
            [rule_data]
        )

        results = self.predict_rules(
            dataframe
        )

        return results[0]



# TEST


if __name__ == "__main__":

    print("=" * 70)
    print("FIREWALL PREDICTOR TEST")
    print("=" * 70)

    predictor = FirewallPredictor()

    print(
        "\nModels loaded successfully."
    )

    print(
        "Random Forest weight:",
        predictor.rf_weight
    )

    print(
        "XGBoost weight:",
        predictor.xgb_weight
    )

    print(
        "Decision threshold:",
        predictor.threshold
    )

    print(
        "Expected input features:",
        len(
            predictor.expected_columns
        )
    )

    print(
        "\nPredictor is ready."
    )