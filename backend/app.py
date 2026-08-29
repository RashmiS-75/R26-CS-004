from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory
)

from flask_cors import CORS

from pathlib import Path
from werkzeug.utils import secure_filename

import math
import sys



# PATHS


BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

FRONTEND_DIR = (
    BASE_DIR / "frontend"
)

UPLOAD_DIR = (
    BASE_DIR / "uploads"
)


if str(BACKEND_DIR) not in sys.path:

    sys.path.insert(
        0,
        str(BACKEND_DIR)
    )


from rule_extractor import (
    RuleExtractor
)

from predictor import (
    FirewallPredictor
)



# FLASK


app = Flask(
    __name__
)

CORS(app)


# Maximum upload = 5 MB
app.config[
    "MAX_CONTENT_LENGTH"
] = (
    5 * 1024 * 1024
)



# DIRECTORIES

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

FRONTEND_DIR.mkdir(
    parents=True,
    exist_ok=True
)



# SUPPORTED FORMATS


SUPPORTED_EXTENSIONS = {

    ".json",
    ".csv",

    ".xlsx",
    ".xls",
    ".xlsm",

    ".txt",
    ".conf",
    ".cfg",

    ".xml",

    ".yaml",
    ".yml"
}



# ML COMPONENTS


extractor = (
    RuleExtractor()
)

predictor = (
    FirewallPredictor()
)



# JSON VALUE CLEANER


def clean_value(
    value
):

    if value is None:

        return None

    try:

        if (
            isinstance(
                value,
                float
            )
            and math.isnan(
                value
            )
        ):

            return None

    except Exception:

        pass

    try:

        return value.item()

    except Exception:

        return value



# FRONTEND


@app.route(
    "/",
    methods=["GET"]
)
def home():

    return send_from_directory(
        str(FRONTEND_DIR),
        "index.html"
    )


@app.route(
    "/<path:filename>",
    methods=["GET"]
)
def frontend_file(
    filename
):

    return send_from_directory(
        str(FRONTEND_DIR),
        filename
    )



# HEALTH


@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "success":
            True,

        "status":
            "ok",

        "message":
            "Firewall Compliance Analysis API is running"

    })



# SUPPORTED FORMATS


@app.route(
    "/api/supported-formats",
    methods=["GET"]
)
def supported_formats():

    formats = sorted(

        extension.replace(
            ".",
            ""
        )

        for extension
        in SUPPORTED_EXTENSIONS
    )

    return jsonify({

        "success":
            True,

        "formats":
            formats
    })



# ANALYZE


@app.route(
    "/api/analyze",
    methods=["POST"]
)
def analyze():

    try:

        # Check file
        

        if "file" not in request.files:

            return jsonify({

                "success":
                    False,

                "error":
                    "No configuration file uploaded."

            }), 400


        uploaded_file = (
            request.files["file"]
        )


        if not uploaded_file.filename:

            return jsonify({

                "success":
                    False,

                "error":
                    "No file selected."

            }), 400


        
        # Secure filename
        

        filename = secure_filename(
            uploaded_file.filename
        )


        if not filename:

            return jsonify({

                "success":
                    False,

                "error":
                    "Invalid file name."

            }), 400


        
        # Check extension
       

        extension = (
            Path(filename)
            .suffix
            .lower()
        )


        if (
            extension
            not in SUPPORTED_EXTENSIONS
        ):

            return jsonify({

                "success":
                    False,

                "error": (
                    "Unsupported file type. "
                    "Supported formats: "
                    "JSON, CSV, XLSX, XLS, XLSM, "
                    "TXT, CONF, CFG, XML, YAML and YML."
                )

            }), 400


        
        # Save upload
        

        upload_path = (
            UPLOAD_DIR / filename
        )

        uploaded_file.save(
            upload_path
        )


        
        # Extract rules
        

        configuration, rules_df = (
            extractor.extract(
                upload_path
            )
        )


        if (
            rules_df is None
            or rules_df.empty
        ):

            return jsonify({

                "success":
                    False,

                "error":
                    "No firewall configuration rules were extracted."

            }), 400


        
        # ML prediction
        

        predictions = (
            predictor.predict_rules(
                rules_df
            )
        )


        
        # Attach rule details
       

        final_rules = []


        for index, prediction in enumerate(
            predictions
        ):

            raw_rule = (
                rules_df
                .iloc[index]
                .to_dict()
            )


            details = {

                key:
                    clean_value(value)

                for key, value
                in raw_rule.items()
            }


            final_rules.append({

                "rule_number":
                    prediction.get(
                        "rule_number",
                        index + 1
                    ),

                "prediction":
                    int(
                        prediction.get(
                            "prediction",
                            0
                        )
                    ),

                "status":
                    prediction.get(
                        "status",
                        "Unknown"
                    ),

                "random_forest_probability":
                    float(
                        prediction.get(
                            "random_forest_probability",
                            0.0
                        )
                    ),

                "xgboost_probability":
                    float(
                        prediction.get(
                            "xgboost_probability",
                            0.0
                        )
                    ),

                "ensemble_probability":
                    float(
                        prediction.get(
                            "ensemble_probability",
                            0.0
                        )
                    ),

                "details":
                    details

            })


    
        # Summary
        #
        # 1 = Compliant
        # 0 = Non-Compliant
      

        total_rules = len(
            final_rules
        )


        compliant_rules = sum(

            rule["prediction"] == 1

            for rule
            in final_rules
        )


        non_compliant_rules = sum(

            rule["prediction"] == 0

            for rule
            in final_rules
        )


        
        # Compliance percentage
        

        compliance_percentage = (

            (
                compliant_rules /
                total_rules
            )
            * 100

            if total_rules > 0

            else 0.0
        )


       
        # Overall status
        

        overall_status = (

            "Compliant"

            if non_compliant_rules == 0

            else "Non-Compliant"
        )


        
        # Average ensemble confidence
        

        if total_rules > 0:

            average_ensemble_probability = (

                sum(

                    rule.get(
                        "ensemble_probability",
                        0.0
                    )

                    for rule
                    in final_rules

                )
                /
                total_rules
            )

        else:

            average_ensemble_probability = 0.0


        
        # Response
        

        return jsonify({

            "success":
                True,

            "filename":
                filename,

            "configuration_name":
                configuration.get(
                    "configuration_name",
                    filename
                ),

            "vendor":
                configuration.get(
                    "vendor",
                    "Unknown"
                ),

            "total_rules":
                total_rules,

            "compliant_rules":
                compliant_rules,

            "non_compliant_rules":
                non_compliant_rules,

            "compliance_percentage":
                round(
                    compliance_percentage,
                    2
                ),

            "average_ensemble_probability":
                round(
                    average_ensemble_probability,
                    4
                ),

            "overall_status":
                overall_status,

            "rules":
                final_rules

        })


    
    # EXPECTED INPUT ERRORS
    

    except (
        ValueError,
        FileNotFoundError,
        ImportError
    ) as error:

        print(
            "\nVALIDATION ERROR:",
            error
        )

        return jsonify({

            "success":
                False,

            "error":
                str(error)

        }), 400


    
    # UNEXPECTED ERRORS
    

    except Exception as error:

        print(
            "\nAPI ERROR:",
            repr(error)
        )

        return jsonify({

            "success":
                False,

            "error":
                "Configuration analysis failed.",

            "details":
                str(error)

        }), 500



# FILE TOO LARGE


@app.errorhandler(413)
def file_too_large(
    error
):

    return jsonify({

        "success":
            False,

        "error":
            "File is too large. Maximum allowed size is 5 MB."

    }), 413



# SERVER


if __name__ == "__main__":

    print("=" * 75)

    print(
        "FIREWALL COMPLIANCE ANALYSIS SYSTEM"
    )

    print("=" * 75)

    print(
        "\nFrontend:"
    )

    print(
        "http://127.0.0.1:5000/"
    )

    print(
        "\nAPI:"
    )

    print(
        "GET  /api/health"
    )

    print(
        "GET  /api/supported-formats"
    )

    print(
        "POST /api/analyze"
    )

    print(
        "\nSupported:"
    )

    print(
        ", ".join(
            sorted(
                extension.replace(
                    ".",
                    ""
                )
                for extension
                in SUPPORTED_EXTENSIONS
            )
        )
    )

    print(
        "\nStarting server..."
    )


    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )