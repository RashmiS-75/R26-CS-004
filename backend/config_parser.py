from pathlib import Path


def get_configuration_metadata(file_path):
    """
    Returns basic metadata about the uploaded configuration.
    More detailed vendor/rule information is obtained from
    the extracted dataframe.
    """

    path = Path(file_path)

    return {
        "configuration_name": path.name,
        "vendor": "Unknown",
    }


def detect_vendor(dataframe):
    """
    Attempt to determine the vendor from a Vendor column.
    """

    if dataframe is None or dataframe.empty:
        return "Unknown"

    if "Vendor" in dataframe.columns:

        values = (
            dataframe["Vendor"]
            .dropna()
            .astype(str)
            .str.strip()
        )

        values = values[
            values != ""
        ]

        if not values.empty:
            return values.iloc[0]

    return "Unknown"