import json
import xml.etree.ElementTree as ET

from pathlib import Path

import joblib
import pandas as pd


# PATHS


BASE_DIR = Path(
    __file__
).resolve().parent.parent

PREPROCESSOR_PATH = (
    BASE_DIR /
    "models" /
    "preprocessor.joblib"
)



# PARSER


class ConfigurationParser:

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

    def __init__(self):

        self.preprocessor = joblib.load(
            PREPROCESSOR_PATH
        )

        self.expected_columns = list(
            self.preprocessor.feature_names_in_
        )

    
    # MAIN
    

    def parse_file(
        self,
        file_path
    ):

        file_path = Path(
            file_path
        )

        if not file_path.exists():

            raise FileNotFoundError(
                f"Configuration file not found: "
                f"{file_path}"
            )

        extension = (
            file_path
            .suffix
            .lower()
        )

        if (
            extension
            not in self.SUPPORTED_EXTENSIONS
        ):

            raise ValueError(
                f"Unsupported file format: {extension}"
            )

        if extension == ".json":
            return self._parse_json(
                file_path
            )

        if extension == ".csv":
            return self._parse_csv(
                file_path
            )

        if extension in {
            ".xlsx",
            ".xls",
            ".xlsm"
        }:

            return self._parse_excel(
                file_path
            )

        if extension == ".xml":
            return self._parse_xml(
                file_path
            )

        if extension in {
            ".yaml",
            ".yml"
        }:

            return self._parse_yaml(
                file_path
            )

        if extension in {
            ".txt",
            ".conf",
            ".cfg"
        }:

            return self._parse_text(
                file_path
            )

        raise ValueError(
            "Unable to determine configuration format."
        )

    
    # JSON
    

    def _parse_json(
        self,
        file_path
    ):

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(
                file
            )

        if isinstance(
            data,
            dict
        ):

            configuration_name = data.get(
                "configuration_name",
                file_path.name
            )

            vendor = data.get(
                "vendor",
                "Unknown"
            )

            rules = data.get(
                "rules"
            )

            if rules is None:

                rules = data.get(
                    "data"
                )

        elif isinstance(
            data,
            list
        ):

            configuration_name = (
                file_path.name
            )

            vendor = "Unknown"

            rules = data

        else:

            raise ValueError(
                "Invalid JSON configuration structure."
            )

        if not isinstance(
            rules,
            list
        ):

            raise ValueError(
                "JSON configuration must contain "
                "a rules list."
            )

        if not rules:

            raise ValueError(
                "JSON configuration contains no rules."
            )

        return {

            "configuration_name":
                configuration_name,

            "vendor":
                vendor,

            "rules":
                rules
        }

    # ========================================================
    # CSV
    # ========================================================

    def _parse_csv(
        self,
        file_path
    ):

        dataframe = pd.read_csv(
            file_path
        )

        if dataframe.empty:

            raise ValueError(
                "CSV file contains no data."
            )

        dataframe.columns = [
            str(column).strip()
            for column
            in dataframe.columns
        ]

        self._validate_configuration_columns(
            dataframe
        )

        vendor = self._detect_vendor(
            dataframe
        )

        return {

            "configuration_name":
                file_path.name,

            "vendor":
                vendor,

            "rules":
                dataframe.to_dict(
                    orient="records"
                )
        }

    
    # EXCEL
    

    def _parse_excel(
        self,
        file_path
    ):

        try:

            dataframe = pd.read_excel(
                file_path,
                sheet_name=0
            )

        except Exception as error:

            raise ValueError(
                f"Unable to read Excel file: {error}"
            ) from error

        dataframe = dataframe.dropna(
            how="all"
        )

        dataframe = dataframe.dropna(
            axis=1,
            how="all"
        )

        if dataframe.empty:

            raise ValueError(
                "Excel file contains no data."
            )

        dataframe.columns = [
            str(column).strip()
            for column
            in dataframe.columns
        ]

        
        # Validate
        

        self._validate_configuration_columns(
            dataframe
        )

        
        # Vendor
        

        vendor = self._detect_vendor(
            dataframe
        )

        
        # Dates
        

        for column in dataframe.columns:

            if pd.api.types.is_datetime64_any_dtype(
                dataframe[column]
            ):

                dataframe[column] = (
                    dataframe[column]
                    .dt.strftime(
                        "%Y-%m-%d"
                    )
                )

        # Replace NaN
        dataframe = dataframe.where(
            pd.notnull(dataframe),
            None
        )

        return {

            "configuration_name":
                file_path.name,

            "vendor":
                vendor,

            "rules":
                dataframe.to_dict(
                    orient="records"
                )
        }

    
    # XML
    

    def _parse_xml(
        self,
        file_path
    ):

        tree = ET.parse(
            file_path
        )

        root = tree.getroot()

        vendor = "Unknown"

        vendor_node = root.find(
            ".//vendor"
        )

        if (
            vendor_node is not None
            and vendor_node.text
        ):

            vendor = (
                vendor_node.text.strip()
            )

        rules = []

        for rule_node in root.findall(
            ".//rule"
        ):

            rule = {}

            for child in rule_node:

                rule[
                    child.tag
                ] = (
                    child.text.strip()
                    if child.text
                    else None
                )

            if rule:

                rules.append(
                    rule
                )

        if not rules:

            raise ValueError(
                "No firewall rules were found in XML."
            )

        dataframe = pd.DataFrame(
            rules
        )

        self._validate_configuration_columns(
            dataframe
        )

        return {

            "configuration_name":
                file_path.name,

            "vendor":
                vendor,

            "rules":
                rules
        }

    
    # YAML
    

    def _parse_yaml(
        self,
        file_path
    ):

        try:

            import yaml

        except ImportError:

            raise ImportError(
                "PyYAML is not installed. "
                "Run: pip install pyyaml"
            )

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            data = yaml.safe_load(
                file
            )

        if not isinstance(
            data,
            dict
        ):

            raise ValueError(
                "Invalid YAML configuration."
            )

        configuration_name = data.get(
            "configuration_name",
            file_path.name
        )

        vendor = data.get(
            "vendor",
            "Unknown"
        )

        rules = data.get(
            "rules"
        )

        if not isinstance(
            rules,
            list
        ):

            raise ValueError(
                "YAML configuration must contain "
                "a rules list."
            )

        dataframe = pd.DataFrame(
            rules
        )

        self._validate_configuration_columns(
            dataframe
        )

        return {

            "configuration_name":
                configuration_name,

            "vendor":
                vendor,

            "rules":
                rules
        }

    
    # TXT / CONF / CFG
    

    def _parse_text(
        self,
        file_path
    ):

        rules = []

        current_rule = {}

        with open(
            file_path,
            "r",
            encoding="utf-8",
            errors="replace"
        ) as file:

            for raw_line in file:

                line = raw_line.strip()

                if not line:
                    continue

                if line.startswith("#"):
                    continue

                if line.startswith("//"):
                    continue

                if "=" in line:

                    key, value = (
                        line.split(
                            "=",
                            1
                        )
                    )

                    current_rule[
                        key.strip()
                    ] = value.strip()

        if current_rule:

            rules.append(
                current_rule
            )

        if not rules:

            raise ValueError(
                "Could not extract configuration rules "
                "from this text file. "
                "The current text parser expects "
                "key=value fields."
            )

        dataframe = pd.DataFrame(
            rules
        )

        self._validate_configuration_columns(
            dataframe
        )

        return {

            "configuration_name":
                file_path.name,

            "vendor":
                "Unknown",

            "rules":
                rules
        }

    
    # VALIDATE CONFIGURATION COLUMNS
    

    def _validate_configuration_columns(
        self,
        dataframe
    ):

        if dataframe.empty:

            raise ValueError(
                "The uploaded configuration contains no rules."
            )

        expected = set(
            self.expected_columns
        )

        present = set(
            dataframe.columns
        )

        matching = (
            expected &
            present
        )

        # Need a meaningful number of matching
        # configuration fields.
        minimum_matching = 5

        if len(matching) >= minimum_matching:

            return

        
        # Detect common firewall-log datasets
        

        firewall_log_columns = {

            "Source Port",
            "Destination Port",
            "Packet Length",
            "Protocol",
            "Packet Type",
            "Traffic Type",
            "Action Taken",
            "Network Segment",
            "Malware Indicators",
            "Alerts/Warnings",
            "Firewall Logs",
            "IDS/IPS Alerts"
        }

        log_matches = (
            firewall_log_columns &
            present
        )

        if len(log_matches) >= 3:

            raise ValueError(

                "The uploaded file appears to be "
                "a firewall/security LOG dataset, "
                "not a firewall CONFIGURATION dataset. "
                "Compliance Analysis requires "
                "configuration fields such as "
                "Source_Zone, Destination_Zone, "
                "Application, Service, Action, "
                "Protocol, Logging, Control_ID and "
                "Control_Requirement."
            )

        missing_preview = [
            column
            for column
            in self.expected_columns
            if column not in present
        ][:10]

        raise ValueError(

            "The uploaded file does not contain enough "
            "firewall configuration fields for the "
            "Compliance Analysis model. "
            f"Example missing fields: "
            f"{', '.join(missing_preview)}"
        )

    
    # VENDOR
    

    def _detect_vendor(
        self,
        dataframe
    ):

        if "Vendor" not in dataframe.columns:

            return "Unknown"

        values = (
            dataframe["Vendor"]
            .dropna()
            .astype(str)
            .str.strip()
            .unique()
        )

        if len(values) == 0:

            return "Unknown"

        return values[0]

    
    # DATAFRAME FOR ML
    

    def rules_to_dataframe(
        self,
        configuration
    ):

        rules = configuration[
            "rules"
        ]

        dataframe = pd.DataFrame(
            rules
        )

        # Add missing model columns
        #
        # This is only useful for fields that the
        # preprocessing pipeline itself can safely handle.
        for column in self.expected_columns:

            if column not in dataframe.columns:

                dataframe[column] = None

        dataframe = dataframe[
            self.expected_columns
        ]

        return dataframe