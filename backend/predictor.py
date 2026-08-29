from pathlib import Path

import joblib
import numpy as np
import pandas as pd


class FirewallPredictor:

    BASE_DIR = (
        Path(__file__).resolve().parent.parent
    )

    MODEL_DIR = BASE_DIR / "models"


    FALLBACK_COLUMNS = [

        "Source_Zone",
        "Source_Address",
        "Source_User",
        "Source_Device",

        "Destination_Zone",
        "Destination_Address",

        "Application",
        "Service",
        "URL_Category",

        "Action",
        "Profile",
        "Options",

        "Rule_Usage",
        "Description",

        "Rule_Usage_Hit_Count",
        "Rule_Usage_Last_Hit",
        "Rule_Usage_First_Hit",

        "Rule_Usage_Apps_Seen",
        "Days_With_No_New_Apps",

        "Modified",
        "Created",

        "Firewall_ID",
        "Vendor",

        "Rule_Order",
        "Chain",
        "Direction",

        "Source_IP_Type",
        "Destination_IP_Type",

        "Source_Port",
        "Destination_Port",

        "Protocol",
        "Logging",
        "Enabled",
        "Schedule",
        "NAT",

        "User_Group",
        "Interface_In",
        "Interface_Out",

        "Expected_Action",
        "Control_ID",
        "Control_Requirement",
    ]


    def __init__(self):

        self.preprocessor = joblib.load(
            self.MODEL_DIR /
            "preprocessor.joblib"
        )

        self.random_forest = joblib.load(
            self.MODEL_DIR /
            "random_forest.joblib"
        )

        self.xgboost = joblib.load(
            self.MODEL_DIR /
            "xgboost.joblib"
        )

        self.ensemble_config = (
            self.load_ensemble_config()
        )

        self.rf_weight = 0.5
        self.xgb_weight = 0.5
        self.threshold = 0.5

        self.configure()


    def load_ensemble_config(self):

        path = (
            self.MODEL_DIR /
            "ensemble_config.joblib"
        )

        if not path.exists():

            return {}


        try:

            config = joblib.load(
                path
            )

            if isinstance(config, dict):
                return config

        except Exception as error:

            print(
                "Warning:",
                error,
            )


        return {}


    def configure(self):

        config = self.ensemble_config


        self.rf_weight = float(
            config.get(
                "random_forest_weight",
                config.get(
                    "rf_weight",
                    0.5,
                ),
            )
        )


        self.xgb_weight = float(
            config.get(
                "xgboost_weight",
                config.get(
                    "xgb_weight",
                    0.5,
                ),
            )
        )


        self.threshold = float(
            config.get(
                "threshold",
                config.get(
                    "decision_threshold",
                    0.5,
                ),
            )
        )


        total = (
            self.rf_weight +
            self.xgb_weight
        )


        if total <= 0:

            self.rf_weight = 0.5
            self.xgb_weight = 0.5

        else:

            self.rf_weight /= total
            self.xgb_weight /= total


    def get_expected_columns(self):

        # Preferred: columns remembered by fitted preprocessor
        names = getattr(
            self.preprocessor,
            "feature_names_in_",
            None,
        )

        if names is not None:

            return list(names)


        # Some pipelines expose this
        try:

            names = (
                self.preprocessor
                .get_feature_names_out()
            )

            if names is not None:

                return list(names)

        except Exception:
            pass


        # Fallback
        return self.FALLBACK_COLUMNS


    def prepare_dataframe(
        self,
        dataframe,
    ):

        dataframe = dataframe.copy()

        expected_columns = (
            self.get_expected_columns()
        )


        for column in expected_columns:

            if column not in dataframe.columns:

                dataframe[column] = ""


        dataframe = dataframe[
            expected_columns
        ]


        numeric_columns = [

            "Rule_Usage_Hit_Count",
            "Rule_Usage_Apps_Seen",
            "Days_With_No_New_Apps",
            "Rule_Order",
            "Source_Port",
            "Destination_Port",

        ]


        for column in numeric_columns:

            if column in dataframe.columns:

                dataframe[column] = (
                    pd.to_numeric(
                        dataframe[column],
                        errors="coerce",
                    )
                )


        return dataframe


    @staticmethod
    def positive_probability(
        model,
        processed,
    ):

        probabilities = (
            model.predict_proba(
                processed
            )
        )


        if probabilities.ndim != 2:

            return np.asarray(
                probabilities,
                dtype=float,
            )


        if probabilities.shape[1] == 1:

            return probabilities[:, 0]


        classes = getattr(
            model,
            "classes_",
            None,
        )


        if classes is not None:

            classes = list(classes)

            if 1 in classes:

                return probabilities[
                    :,
                    classes.index(1),
                ]


        return probabilities[:, -1]


    def predict_rules(
        self,
        dataframe,
    ):

        prepared = self.prepare_dataframe(
            dataframe
        )


        # Keep a DataFrame with column names
        # when transforming/predicting.
        processed = (
            self.preprocessor.transform(
                prepared
            )
        )


        rf_probability = (
            self.positive_probability(
                self.random_forest,
                processed,
            )
        )


        xgb_probability = (
            self.positive_probability(
                self.xgboost,
                processed,
            )
        )


        ensemble_probability = (
            (
                self.rf_weight *
                rf_probability
            )
            +
            (
                self.xgb_weight *
                xgb_probability
            )
        )


        predictions = (
            ensemble_probability
            >= self.threshold
        ).astype(int)


        results = []


        for index, prediction in enumerate(
            predictions
        ):

            probability = float(
                ensemble_probability[index]
            )


            # Project convention:
            # 1 = Compliant
            # 0 = Non-Compliant

            status = (
                "Compliant"
                if int(prediction) == 1
                else "Non-Compliant"
            )


            confidence = max(
                probability,
                1 - probability,
            )


            results.append({

                "rule_number":
                    index + 1,

                "prediction":
                    int(prediction),

                "status":
                    status,

                "random_forest_probability":
                    round(
                        float(
                            rf_probability[index]
                        ),
                        4,
                    ),

                "xgboost_probability":
                    round(
                        float(
                            xgb_probability[index]
                        ),
                        4,
                    ),

                "ensemble_probability":
                    round(
                        probability,
                        4,
                    ),

                "confidence":
                    round(
                        float(confidence),
                        4,
                    ),

            })


        return results