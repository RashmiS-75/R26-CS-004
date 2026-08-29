
// FIREWALL AUDIT - COMPLIANCE ANALYSIS




// GLOBAL VARIABLES


let analysisData = null;

let currentFilter = "all";

let complianceChart = null;

let statusChart = null;


// SUPPORTED FILE TYPES


const supportedExtensions = [

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

];



// INITIALIZE


document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupFileInput();

        setupAnalyzeButton();

        setupSummaryCards();

        setupFilterButtons();

        console.log(
            "Compliance Analysis frontend loaded."
        );

    }
);


// FILE INPUT


function setupFileInput() {

    const fileInput =
        document.getElementById(
            "fileInput"
        );

    const selectedFile =
        document.getElementById(
            "selectedFile"
        );


    if (!fileInput) {

        console.error(
            "ERROR: fileInput element not found."
        );

        return;
    }


    fileInput.addEventListener(
        "change",
        function () {

            clearError();


            if (
                !fileInput.files ||
                fileInput.files.length === 0
            ) {

                if (selectedFile) {

                    selectedFile.textContent =
                        "No file selected";
                }

                return;
            }


            const file =
                fileInput.files[0];


            // Make sure the element exists
            if (selectedFile) {

                selectedFile.textContent =
                    file.name;

            }


            console.log(
                "Selected file:",
                file.name
            );

        }
    );

}



// ANALYZE BUTTON


function setupAnalyzeButton() {

    const analyzeButton =
        document.getElementById(
            "analyzeButton"
        );


    if (!analyzeButton) {

        console.error(
            "ERROR: analyzeButton element not found."
        );

        return;
    }


    analyzeButton.addEventListener(
        "click",
        analyzeConfiguration
    );

}



// ANALYZE CONFIGURATION


async function analyzeConfiguration() {

    clearError();


    const fileInput =
        document.getElementById(
            "fileInput"
        );


    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        showError(
            "Please choose a firewall configuration file first."
        );

        return;
    }


    const file =
        fileInput.files[0];


    
    // Extension
    

    const extension =
        getFileExtension(
            file.name
        );


    if (
        !supportedExtensions.includes(
            extension
        )
    ) {

        showError(
            "Unsupported file type."
        );

        return;
    }


    
    // Size
    

    if (
        file.size >
        5 * 1024 * 1024
    ) {

        showError(
            "File is too large. Maximum size is 5 MB."
        );

        return;
    }


    
    // FormData
    

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    setLoading(
        true
    );


    try {

        console.log(
            "Uploading:",
            file.name
        );


        
        // Backend request
        

        const response =
            await fetch(
                "/api/analyze",
                {
                    method: "POST",
                    body: formData
                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "The backend returned an invalid response."
            );

        }


        console.log(
            "Backend response:",
            data
        );


        
        // API error
        

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.details ||
                "Configuration analysis failed."
            );

        }


        // Store data
        

        analysisData =
            data;


        
        // Display result
        

        displaySummary(
            data
        );


        displayCharts(
            data
        );


        currentFilter =
            "all";


        updateFilterButtons();


        renderRules(
            "all"
        );


        hideDetails();


        scrollToRules();


    } catch (error) {

        console.error(
            "Analysis error:",
            error
        );


        showError(
            error.message ||
            "Configuration analysis failed."
        );


    } finally {

        setLoading(
            false
        );

    }

}



// LOADING


function setLoading(
    isLoading
) {

    const analyzeButton =
        document.getElementById(
            "analyzeButton"
        );


    const loading =
        document.getElementById(
            "loading"
        );


    if (analyzeButton) {

        analyzeButton.disabled =
            isLoading;

        analyzeButton.textContent =
            isLoading
                ? "Analyzing..."
                : "Analyze Configuration";

    }


    if (loading) {

        loading.classList.toggle(
            "hidden",
            !isLoading
        );

    }

}


// SUMMARY


function displaySummary(
    data
) {

    const totalRules =
        document.getElementById(
            "totalRules"
        );

    const compliantRules =
        document.getElementById(
            "compliantRules"
        );

    const nonCompliantRules =
        document.getElementById(
            "nonCompliantRules"
        );

    const compliancePercentage =
        document.getElementById(
            "compliancePercentage"
        );

    const configurationName =
        document.getElementById(
            "configurationName"
        );

    const vendorText =
        document.getElementById(
            "vendorText"
        );

    const overallStatus =
        document.getElementById(
            "overallStatus"
        );


    if (totalRules) {

        totalRules.textContent =
            data.total_rules ?? 0;

    }


    if (compliantRules) {

        compliantRules.textContent =
            data.compliant_rules ?? 0;

    }


    if (nonCompliantRules) {

        nonCompliantRules.textContent =
            data.non_compliant_rules ?? 0;

    }


    if (compliancePercentage) {

        compliancePercentage.textContent =
            `${Number(
                data.compliance_percentage || 0
            ).toFixed(2)}%`;

    }


    if (configurationName) {

        configurationName.textContent =
            data.configuration_name ||
            data.filename ||
            "Unknown Configuration";

    }


    if (vendorText) {

        vendorText.textContent =
            `Vendor: ${
                data.vendor || "Unknown"
            }`;

    }


    if (overallStatus) {

        const status =
            data.overall_status ||
            "Unknown";


        overallStatus.textContent =
            status;


        overallStatus.className =
            "status-pill";


        if (
            status === "Compliant"
        ) {

            overallStatus.classList.add(
                "compliant"
            );

        } else if (
            status === "Non-Compliant"
        ) {

            overallStatus.classList.add(
                "non-compliant"
            );

        }

    }

}



// CHARTS


function displayCharts(
    data
) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    const compliant =
        Number(
            data.compliant_rules
        ) || 0;


    const nonCompliant =
        Number(
            data.non_compliant_rules
        ) || 0;


    createDonutChart(
        compliant,
        nonCompliant
    );


    createBarChart(
        compliant,
        nonCompliant
    );

}



// DONUT CHART


function createDonutChart(
    compliant,
    nonCompliant
) {

    const canvas =
        document.getElementById(
            "complianceChart"
        );


    if (!canvas) {

        console.warn(
            "complianceChart not found."
        );

        return;
    }


    if (complianceChart) {

        complianceChart.destroy();

    }


    complianceChart =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels: [
                        "Compliant",
                        "Non-Compliant"
                    ],

                    datasets: [

                        {

                            data: [
                                compliant,
                                nonCompliant
                            ],

                            backgroundColor: [
                                "#39e75f",
                                "#ee6b6e"
                            ],

                            borderWidth:
                                0

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "68%",

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            }
        );

}



// BAR CHART


function createBarChart(
    compliant,
    nonCompliant
) {

    const canvas =
        document.getElementById(
            "statusChart"
        );


    if (!canvas) {

        console.warn(
            "statusChart not found."
        );

        return;
    }


    if (statusChart) {

        statusChart.destroy();

    }


    statusChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels: [
                        "Compliant",
                        "Non-Compliant"
                    ],

                    datasets: [

                        {

                            label:
                                "Rules",

                            data: [
                                compliant,
                                nonCompliant
                            ],

                            backgroundColor: [
                                "#39e75f",
                                "#ee6b6e"
                            ],

                            borderRadius:
                                7

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display:
                                false

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                precision:
                                    0

                            }

                        }

                    }

                }

            }
        );

}



// SUMMARY CARD FILTERING


function setupSummaryCards() {

    document
        .querySelectorAll(
            ".summary-card[data-filter]"
        )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    function () {

                        if (!analysisData) {

                            showError(
                                "Analyze a configuration first."
                            );

                            return;
                        }


                        currentFilter =
                            card.dataset.filter;


                        updateFilterButtons();


                        renderRules(
                            currentFilter
                        );


                        scrollToRules();

                    }
                );

            }
        );

}



// FILTER BUTTONS


function setupFilterButtons() {

    document
        .querySelectorAll(
            ".filter-button[data-filter]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        if (!analysisData) {

                            return;
                        }


                        currentFilter =
                            button.dataset.filter;


                        updateFilterButtons();


                        renderRules(
                            currentFilter
                        );

                    }
                );

            }
        );

}



// FILTER STATE


function updateFilterButtons() {

    document
        .querySelectorAll(
            ".filter-button[data-filter]"
        )
        .forEach(
            button => {

                button.classList.toggle(

                    "active",

                    button.dataset.filter
                    ===
                    currentFilter

                );

            }
        );

}



// RENDER RULES


function renderRules(
    filter
) {

    if (!analysisData) {

        return;
    }


    const rulesTable =
        document.getElementById(
            "rulesTable"
        );


    if (!rulesTable) {

        return;
    }


    let rules =
        Array.isArray(
            analysisData.rules
        )
            ? analysisData.rules
            : [];


    if (
        filter ===
        "compliant"
    ) {

        rules =
            rules.filter(
                rule =>
                    rule.status ===
                    "Compliant"
            );

    }


    if (
        filter ===
        "non-compliant"
    ) {

        rules =
            rules.filter(
                rule =>
                    rule.status ===
                    "Non-Compliant"
            );

    }


    rulesTable.innerHTML =
        "";


    if (
        rules.length ===
        0
    ) {

        rulesTable.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-state"
                >
                    No rules found for this category.
                </td>

            </tr>

        `;

        return;
    }


    rules.forEach(
        rule => {

            const details =
                rule.details ||
                {};


            const row =
                document.createElement(
                    "tr"
                );


            const statusClass =
                rule.status ===
                "Compliant"
                    ? "compliant"
                    : "non-compliant";


            row.innerHTML = `

                <td class="rule-number">
                    Rule ${safeText(
                        rule.rule_number
                    )}
                </td>

                <td>
                    ${safeText(
                        details.Action
                    )}
                </td>

                <td>
                    ${safeText(
                        details.Protocol
                    )}
                </td>

                <td>
                    ${safeText(
                        details.Source_Address
                    )}
                </td>

                <td>
                    ${safeText(
                        details.Destination_Address
                    )}
                </td>

                <td
                    class="rule-status ${statusClass}"
                >
                    ${
                        rule.status ===
                        "Compliant"

                            ? "✓ Compliant"

                            : "⚠ Non-Compliant"
                    }
                </td>

                <td class="confidence">
                    ${formatProbability(
                        rule.ensemble_probability
                    )}
                </td>

            `;


            row.addEventListener(
                "click",
                function () {

                    showRuleDetails(
                        rule
                    );

                }
            );


            rulesTable.appendChild(
                row
            );

        }
    );

}



// RULE DETAILS


function showRuleDetails(
    rule
) {

    const detailsPanel =
        document.getElementById(
            "detailsPanel"
        );


    if (!detailsPanel) {

        return;
    }


    detailsPanel.classList.remove(
        "hidden"
    );


    const detailsSubtitle =
        document.getElementById(
            "detailsSubtitle"
        );


    const detailsStatus =
        document.getElementById(
            "detailsStatus"
        );


    const detailsRFProbability =
        document.getElementById(
            "detailsRFProbability"
        );


    const detailsXGBProbability =
        document.getElementById(
            "detailsXGBProbability"
        );


    const detailsEnsembleProbability =
        document.getElementById(
            "detailsEnsembleProbability"
        );


    const detailsGrid =
        document.getElementById(
            "detailsGrid"
        );


    if (detailsSubtitle) {

        detailsSubtitle.textContent =
            `Rule ${rule.rule_number}`;

    }


    if (detailsStatus) {

        detailsStatus.textContent =
            rule.status ||
            "Unknown";


        detailsStatus.className =
            "status-pill";


        if (
            rule.status ===
            "Compliant"
        ) {

            detailsStatus.classList.add(
                "compliant"
            );

        } else {

            detailsStatus.classList.add(
                "non-compliant"
            );

        }

    }


    if (detailsRFProbability) {

        detailsRFProbability.textContent =
            formatProbability(
                rule.random_forest_probability
            );

    }


    if (detailsXGBProbability) {

        detailsXGBProbability.textContent =
            formatProbability(
                rule.xgboost_probability
            );

    }


    if (detailsEnsembleProbability) {

        detailsEnsembleProbability.textContent =
            formatProbability(
                rule.ensemble_probability
            );

    }


    if (detailsGrid) {

        detailsGrid.innerHTML =
            "";


        const details =
            rule.details ||
            {};


        Object.entries(
            details
        ).forEach(
            ([key, value]) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "detail-item";


                item.innerHTML = `

                    <label>
                        ${safeText(key)}
                    </label>

                    <span>
                        ${safeText(
                            normalizeValue(
                                value
                            )
                        )}
                    </span>

                `;


                detailsGrid.appendChild(
                    item
                );

            }
        );

    }


    detailsPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}



// HIDE DETAILS


function hideDetails() {

    const detailsPanel =
        document.getElementById(
            "detailsPanel"
        );


    if (detailsPanel) {

        detailsPanel.classList.add(
            "hidden"
        );
    }

}



// FORMAT PROBABILITY


function formatProbability(
    value
) {

    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "—";
    }


    return (
        number * 100
    ).toFixed(2) + "%";

}



// NORMALIZE VALUE


function normalizeValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    return String(
        value
    );

}



// FILE EXTENSION


function getFileExtension(
    filename
) {

    const index =
        filename.lastIndexOf(
            "."
        );


    if (
        index === -1
    ) {

        return "";
    }


    return filename
        .substring(index)
        .toLowerCase();

}



// SAFE HTML


function safeText(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "—";
    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}



// ERROR


function showError(
    message
) {

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    if (!errorMessage) {

        console.error(
            message
        );

        return;
    }


    errorMessage.textContent =
        message;


    errorMessage.classList.remove(
        "hidden"
    );

}


function clearError() {

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    if (!errorMessage) {

        return;
    }


    errorMessage.textContent =
        "";


    errorMessage.classList.add(
        "hidden"
    );

}



// SCROLL


function scrollToRules() {

    const ruleAnalysis =
        document.getElementById(
            "ruleAnalysis"
        );


    if (ruleAnalysis) {

        ruleAnalysis.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}