from pathlib import Path
from io import StringIO
import json
import re

import pandas as pd

from .config_parser import (
    get_configuration_metadata,
    detect_vendor,
)


class RuleExtractor:

    CANONICAL_COLUMNS = [

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


    ALIASES = {

        "source zone": "Source_Zone",
        "source_zone": "Source_Zone",

        "source address": "Source_Address",
        "source_address": "Source_Address",
        "source ip": "Source_Address",

        "source user": "Source_User",
        "source_user": "Source_User",

        "source device": "Source_Device",
        "source_device": "Source_Device",

        "destination zone": "Destination_Zone",
        "destination_zone": "Destination_Zone",

        "destination address": "Destination_Address",
        "destination_address": "Destination_Address",
        "destination ip": "Destination_Address",

        "application": "Application",
        "app": "Application",

        "service": "Service",

        "url category": "URL_Category",
        "url_category": "URL_Category",

        "action": "Action",

        "profile": "Profile",
        "options": "Options",

        "rule usage": "Rule_Usage",
        "rule_usage": "Rule_Usage",

        "description": "Description",

        "rule usage hit count":
            "Rule_Usage_Hit_Count",

        "rule_usage_hit_count":
            "Rule_Usage_Hit_Count",

        "rule usage last hit":
            "Rule_Usage_Last_Hit",

        "rule_usage_last_hit":
            "Rule_Usage_Last_Hit",

        "rule usage first hit":
            "Rule_Usage_First_Hit",

        "rule_usage_first_hit":
            "Rule_Usage_First_Hit",

        "rule usage apps seen":
            "Rule_Usage_Apps_Seen",

        "rule_usage_apps_seen":
            "Rule_Usage_Apps_Seen",

        "days with no new apps":
            "Days_With_No_New_Apps",

        "days_with_no_new_apps":
            "Days_With_No_New_Apps",

        "modified": "Modified",
        "created": "Created",

        "firewall id": "Firewall_ID",
        "firewall_id": "Firewall_ID",

        "vendor": "Vendor",

        "rule order": "Rule_Order",
        "rule_order": "Rule_Order",

        "chain": "Chain",
        "direction": "Direction",

        "source ip type":
            "Source_IP_Type",

        "source_ip_type":
            "Source_IP_Type",

        "destination ip type":
            "Destination_IP_Type",

        "destination_ip_type":
            "Destination_IP_Type",

        "source port":
            "Source_Port",

        "source_port":
            "Source_Port",

        "destination port":
            "Destination_Port",

        "destination_port":
            "Destination_Port",

        "protocol": "Protocol",

        "logging": "Logging",
        "enabled": "Enabled",
        "schedule": "Schedule",
        "nat": "NAT",

        "user group": "User_Group",
        "user_group": "User_Group",

        "interface in": "Interface_In",
        "interface_in": "Interface_In",

        "interface out": "Interface_Out",
        "interface_out": "Interface_Out",

        "expected action":
            "Expected_Action",

        "expected_action":
            "Expected_Action",

        "control id": "Control_ID",
        "control_id": "Control_ID",

        "control requirement":
            "Control_Requirement",

        "control_requirement":
            "Control_Requirement",
    }


    def extract(self, file_path):

        path = Path(file_path)

        dataframe = self.load_file(path)

        if dataframe is None:
            dataframe = pd.DataFrame()

        dataframe = self.normalize_columns(
            dataframe
        )

        dataframe = self.clean_dataframe(
            dataframe
        )

        configuration = (
            get_configuration_metadata(path)
        )

        configuration["vendor"] = (
            detect_vendor(dataframe)
        )

        return configuration, dataframe


    def load_file(self, path):

        extension = path.suffix.lower()

        if extension == ".csv":

            return pd.read_csv(
                path,
                dtype=str,
                encoding="utf-8",
                encoding_errors="ignore",
                on_bad_lines="skip",
            )


        if extension in {
            ".xlsx",
            ".xls",
            ".xlsm",
        }:

            sheets = pd.read_excel(
                path,
                sheet_name=None,
            )

            if not sheets:
                return pd.DataFrame()

            # Select the largest non-empty sheet
            non_empty = [
                df
                for df in sheets.values()
                if df is not None and not df.empty
            ]

            if not non_empty:
                return pd.DataFrame()

            return max(
                non_empty,
                key=lambda df: len(df)
            )


        if extension == ".json":

            return self.load_json(path)


        if extension in {
            ".yaml",
            ".yml",
        }:

            return self.load_yaml(path)


        if extension == ".xml":

            try:
                return pd.read_xml(path)
            except Exception:
                return pd.DataFrame()


        return self.load_text(path)


    def load_json(self, path):

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:

            data = json.load(file)


        if isinstance(data, list):

            return pd.json_normalize(data)


        if isinstance(data, dict):

            for value in data.values():

                if isinstance(value, list):

                    return pd.json_normalize(
                        value
                    )

            return pd.json_normalize(
                data
            )


        return pd.DataFrame()


    def load_yaml(self, path):

        import yaml

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:

            data = yaml.safe_load(file)


        if isinstance(data, list):

            return pd.json_normalize(data)


        if isinstance(data, dict):

            for value in data.values():

                if isinstance(value, list):

                    return pd.json_normalize(
                        value
                    )

            return pd.json_normalize(
                data
            )


        return pd.DataFrame()


    def load_text(self, path):

        with open(
            path,
            "r",
            encoding="utf-8",
            errors="ignore",
        ) as file:

            lines = [
                line.strip()
                for line in file
                if line.strip()
            ]


        if not lines:

            return pd.DataFrame()


        # Try common delimiters
        for delimiter in [
            ",",
            "\t",
            "|",
            ";",
        ]:

            if delimiter in lines[0]:

                return pd.read_csv(
                    StringIO(
                        "\n".join(lines)
                    ),
                    sep=re.escape(delimiter),
                    engine="python",
                )


        # key=value / key:value style
        records = []

        current = {}

        for line in lines:

            if "=" in line:

                key, value = line.split(
                    "=",
                    1
                )

                current[
                    key.strip()
                ] = value.strip()

            elif ":" in line:

                key, value = line.split(
                    ":",
                    1
                )

                current[
                    key.strip()
                ] = value.strip()


            if current:

                records.append(
                    current
                )

                current = {}


        if records:

            return pd.DataFrame(
                records
            )


        return pd.DataFrame({
            "Description": lines
        })


    def normalize_columns(
        self,
        dataframe,
    ):

        dataframe = dataframe.copy()

        rename_map = {}


        for column in dataframe.columns:

            original = str(column).strip()

            normalized = (
                original
                .lower()
                .replace("-", "_")
            )

            normalized = re.sub(
                r"\s+",
                " ",
                normalized,
            )


            if normalized in self.ALIASES:

                rename_map[column] = (
                    self.ALIASES[
                        normalized
                    ]
                )

            else:

                rename_map[column] = original


        dataframe.rename(
            columns=rename_map,
            inplace=True,
        )


        # Add missing canonical columns
        for column in self.CANONICAL_COLUMNS:

            if column not in dataframe.columns:

                dataframe[column] = ""


        # Keep the expected order
        dataframe = dataframe[
            self.CANONICAL_COLUMNS
        ]


        return dataframe


    def clean_dataframe(
        self,
        dataframe,
    ):

        dataframe = dataframe.copy()

        dataframe = dataframe.replace(
            {
                "nan": "",
                "NaN": "",
                "None": "",
            }
        )

        dataframe = dataframe.fillna("")


        numeric_columns = [

            "Rule_Usage_Hit_Count",
            "Rule_Usage_Apps_Seen",
            "Days_With_No_New_Apps",
            "Rule_Order",
            "Source_Port",
            "Destination_Port",

        ]


        for column in numeric_columns:

            dataframe[column] = pd.to_numeric(
                dataframe[column],
                errors="coerce",
            )


        dataframe = dataframe.dropna(
            how="all"
        )


        dataframe.reset_index(
            drop=True,
            inplace=True,
        )


        return dataframe