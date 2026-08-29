from config_parser import ConfigurationParser


class RuleExtractor:

    def __init__(self):

        self.parser = ConfigurationParser()

    def extract(
        self,
        file_path
    ):

        configuration = (
            self.parser.parse_file(
                file_path
            )
        )

        rules_dataframe = (
            self.parser.rules_to_dataframe(
                configuration
            )
        )

        return (
            configuration,
            rules_dataframe
        )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    extractor = RuleExtractor()

    configuration, dataframe = (
        extractor.extract(
            "uploads/sample_firewall_config.json"
        )
    )

    print("=" * 70)
    print("RULE EXTRACTION TEST")
    print("=" * 70)

    print(
        "Configuration:",
        configuration[
            "configuration_name"
        ]
    )

    print(
        "Vendor:",
        configuration[
            "vendor"
        ]
    )

    print(
        "Rules:",
        len(dataframe)
    )

    print(
        "Features:",
        dataframe.shape[1]
    )