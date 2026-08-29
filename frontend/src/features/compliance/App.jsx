import { useMemo, useState } from "react";

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";

import { Doughnut, Bar } from "react-chartjs-2";

import "./style.css";


ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);


// ============================================================
// FASTAPI URL
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8004";


// ============================================================
// HELPERS
// ============================================================

function firstValue(object, keys, fallback = "—") {

    if (!object || typeof object !== "object") {
        return fallback;
    }

    for (const key of keys) {

        const value = object[key];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}


function toNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function percentValue(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0.00%";
    }

    // Supports both 0.67 and 67
    if (number <= 1) {
        return `${(number * 100).toFixed(2)}%`;
    }

    return `${number.toFixed(2)}%`;
}


function normalizeStatus(value) {

    if (!value) {
        return "Unknown";
    }

    const text =
        String(value).trim().toLowerCase();

    if (
        text === "1" ||
        text === "true" ||
        text.includes("compliant")
            && !text.includes("non")
    ) {
        return "Compliant";
    }

    if (
        text === "0" ||
        text === "false" ||
        text.includes("non-compliant") ||
        text.includes("non compliant")
    ) {
        return "Non-Compliant";
    }

    return String(value);
}


// ============================================================
// NORMALIZE API RESPONSE
// ============================================================

function normalizeResults(data, filename) {

    const source =
        data?.data && typeof data.data === "object"
            ? data.data
            : data;


    let rawRules =
        source?.rules ||
        source?.results ||
        source?.predictions ||
        source?.rule_results ||
        [];


    if (!Array.isArray(rawRules)) {
        rawRules = [];
    }


    const rules =
        rawRules.map(
            (rule, index) => {

                const details =
                    rule?.details ||
                    rule?.configuration ||
                    rule?.rule ||
                    rule;


                const status =
                    normalizeStatus(
                        firstValue(
                            rule,
                            [
                                "status",
                                "compliance_status",
                                "prediction",
                                "label",
                                "class"
                            ],
                            ""
                        )
                    );


                return {

                    ...rule,

                    rule_number:
                        firstValue(
                            rule,
                            [
                                "rule_number",
                                "rule_id",
                                "Rule_ID",
                                "Rule Id",
                                "id",
                                "ID"
                            ],
                            index + 1
                        ),

                    status,

                    confidence:
                        toNumber(
                            firstValue(
                                rule,
                                [
                                    "confidence",
                                    "ensemble_probability",
                                    "probability"
                                ],
                                0
                            )
                        ),

                    random_forest_probability:
                        toNumber(
                            firstValue(
                                rule,
                                [
                                    "random_forest_probability",
                                    "random_forest_score",
                                    "rf_probability"
                                ],
                                0
                            )
                        ),

                    xgboost_probability:
                        toNumber(
                            firstValue(
                                rule,
                                [
                                    "xgboost_probability",
                                    "xgboost_score",
                                    "xgb_probability"
                                ],
                                0
                            )
                        ),

                    ensemble_probability:
                        toNumber(
                            firstValue(
                                rule,
                                [
                                    "ensemble_probability",
                                    "ensemble_score",
                                    "probability"
                                ],
                                0
                            )
                        ),

                    details,

                };
            }
        );


    const compliantRules =
        toNumber(
            firstValue(
                source,
                [
                    "compliant_rules",
                    "compliant_count",
                    "compliant"
                ],
                rules.filter(
                    rule =>
                        rule.status === "Compliant"
                ).length
            )
        );


    const nonCompliantRules =
        toNumber(
            firstValue(
                source,
                [
                    "non_compliant_rules",
                    "non_compliant_count",
                    "non_compliant"
                ],
                rules.filter(
                    rule =>
                        rule.status === "Non-Compliant"
                ).length
            )
        );


    const totalRules =
        toNumber(
            firstValue(
                source,
                [
                    "total_rules",
                    "total",
                    "rule_count"
                ],
                compliantRules +
                nonCompliantRules ||
                rules.length
            )
        );


    let compliancePercentage =
        firstValue(
            source,
            [
                "compliance_percentage",
                "overall_compliance",
                "compliance_rate"
            ],
            null
        );


    if (compliancePercentage === null) {

        compliancePercentage =
            totalRules > 0
                ? (
                    compliantRules /
                    totalRules *
                    100
                ).toFixed(2)
                : "0.00";

    }


    // Handle APIs that return 0.67 instead of 67
    const numericCompliance =
        toNumber(
            compliancePercentage
        );


    if (
        numericCompliance <= 1
    ) {
        compliancePercentage =
            (
                numericCompliance *
                100
            ).toFixed(2);
    } else {
        compliancePercentage =
            numericCompliance.toFixed(2);
    }


    const configurationName =
        firstValue(
            source,
            [
                "configuration_name",
                "filename",
                "file_name",
                "config_name"
            ],
            filename || "Configuration"
        );


    const vendor =
        firstValue(
            source,
            [
                "vendor",
                "Vendor",
                "firewall_vendor"
            ],
            "—"
        );


    const overallStatus =
        firstValue(
            source,
            [
                "overall_status",
                "status"
            ],
            totalRules > 0 &&
            compliantRules >=
                nonCompliantRules
                ? "Compliant"
                : "Non-Compliant"
        );


    return {

        ...source,

        total_rules:
            totalRules,

        compliant_rules:
            compliantRules,

        non_compliant_rules:
            nonCompliantRules,

        compliance_percentage:
            compliancePercentage,

        configuration_name:
            configurationName,

        vendor,

        overall_status:
            overallStatus,

        rules,

    };
}


// ============================================================
// APP
// ============================================================

function App() {

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [results, setResults] =
        useState(null);

    const [selectedRule, setSelectedRule] =
        useState(null);

    const [filter, setFilter] =
        useState("all");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    // ========================================================
    // FILE
    // ========================================================

    const handleFileChange = (event) => {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setSelectedFile(file);
        setResults(null);
        setSelectedRule(null);
        setError("");
    };


    // ========================================================
    // ANALYZE
    // ========================================================

    const handleAnalyze = async () => {

        if (!selectedFile) {

            setError(
                "Please choose a firewall configuration file."
            );

            return;
        }


        setLoading(true);
        setError("");
        setResults(null);
        setSelectedRule(null);


        const formData =
            new FormData();

        formData.append(
            "file",
            selectedFile
        );


        try {

            console.log(
                "Sending request to:",
                `${API_BASE_URL}/api/analyze`
            );


            const response =
                await fetch(
                    `${API_BASE_URL}/api/analyze`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );


            const responseText =
                await response.text();


            let data;

            try {

                data =
                    JSON.parse(
                        responseText
                    );

            } catch {

                throw new Error(
                    `FastAPI returned HTTP ${response.status}.`
                );
            }


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    data.error ||
                    `FastAPI error: HTTP ${response.status}`
                );
            }


            if (
                data.success === false
            ) {

                throw new Error(
                    data.error ||
                    "Analysis failed."
                );
            }


            const normalized =
                normalizeResults(
                    data,
                    selectedFile.name
                );


            console.log(
                "Normalized result:",
                normalized
            );


            setResults(
                normalized
            );


        } catch (err) {

            console.error(
                "ANALYSIS ERROR:",
                err
            );


            if (
                err instanceof TypeError
            ) {

                setError(
                    "React cannot connect to FastAPI at " +
                    `${API_BASE_URL}. ` +
                    "Make sure the FastAPI server is running."
                );

            } else {

                setError(
                    err.message ||
                    "Unable to analyze configuration."
                );

            }

        } finally {

            setLoading(false);

        }

    };


    // ========================================================
    // FILTERED RULES
    // ========================================================

    const filteredRules =
        useMemo(() => {

            if (!results) {
                return [];
            }


            if (
                filter === "compliant"
            ) {

                return results.rules.filter(
                    rule =>
                        rule.status ===
                        "Compliant"
                );

            }


            if (
                filter === "non-compliant"
            ) {

                return results.rules.filter(
                    rule =>
                        rule.status ===
                        "Non-Compliant"
                );

            }


            return results.rules;

        }, [
            results,
            filter
        ]);


    // ========================================================
    // DOUGHNUT DATA
    // ========================================================

    const doughnutData = {

        labels: [
            "Compliant",
            "Non-Compliant",
        ],

        datasets: [

            {
                data: [

                    results?.compliant_rules ?? 0,

                    results?.non_compliant_rules ?? 0,

                ],

                backgroundColor: [
                    "#63b32e",
                    "#c94b42",
                ],

                borderWidth: 0,

            }

        ]

    };


    const doughnutOptions = {

        responsive: true,

        maintainAspectRatio: false,

        cutout: "64%",

        plugins: {

            legend: {

                position: "bottom",

                labels: {

                    usePointStyle: true,

                    padding: 15,

                    font: {
                        size: 11
                    }

                }

            }

        }

    };


    // ========================================================
    // BAR DATA
    // ========================================================

    const barData = {

        labels: [
            "Compliant",
            "Non-Compliant",
        ],

        datasets: [

            {
                data: [

                    results?.compliant_rules ?? 0,

                    results?.non_compliant_rules ?? 0,

                ],

                backgroundColor: [
                    "#63b32e",
                    "#c94b42",
                ],

                borderRadius: 3,

                barThickness: 90,

            }

        ]

    };


    const barOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                display: false
            }

        },

        scales: {

            x: {

                grid: {
                    display: false
                },

                ticks: {
                    font: {
                        size: 10
                    }
                }

            },

            y: {

                beginAtZero: true,

                ticks: {
                    precision: 0
                },

                grid: {
                    color: "#e7ebe4"
                }

            }

        }

    };


    // ========================================================
    // SIDEBAR
    // ========================================================

    const menuItems = [

        ["▦", "Dashboard"],
        ["♢", "Audit Overview"],
        ["▤", "Log Classification"],
        ["◉", "Risk Scoring"],
        ["✓", "Compliance Analysis"],
        ["▱", "Reports"],
        ["♧", "Alerts"],
        ["▣", "Evidence Library"],
        ["⚙", "Settings"],

    ];


    // ========================================================
    // PAGE
    // ========================================================

    return (

        <div className="app">


            {/* SIDEBAR */}

            <aside className="sidebar">

                <div className="brand">

                    <div className="brand-logo">
                        🛡
                    </div>

                    <div>

                        <h1>
                            FIREWALL AUDIT
                        </h1>

                        <p>
                            Audit Analytics System
                        </p>

                    </div>

                </div>


                <nav>

                    {
                        menuItems.map(
                            ([icon, label]) => (

                                <div
                                    key={label}
                                    className={
                                        label ===
                                        "Compliance Analysis"
                                            ? "menu-item active"
                                            : "menu-item"
                                    }
                                >

                                    <span>
                                        {icon}
                                    </span>

                                    <span>
                                        {label}
                                    </span>

                                </div>

                            )
                        )
                    }

                </nav>


                <div className="sidebar-footer">

                    <div>
                        🛡
                    </div>

                    <div>

                        <strong>
                            Firewall Audit Platform
                        </strong>

                        <small>
                            Secure. Compliant. Assured.
                        </small>

                    </div>

                </div>

            </aside>


            {/* MAIN */}

            <main className="main">


                {/* HEADER */}

                <header className="header">

                    <div>

                        <h2>
                            Compliance Analysis
                        </h2>

                        <p>
                            Automated Firewall Configuration
                            Compliance Assessment
                        </p>

                    </div>


                    <div className="profile">

                        <span>
                            🔔
                        </span>

                        <div className="avatar">
                            A
                        </div>

                        <div>

                            <strong>
                                Admin User
                            </strong>

                            <small>
                                Administrator
                            </small>

                        </div>

                    </div>

                </header>


                <div className="content">


                    {/* UPLOAD */}

                    <section className="upload-box">

                        <div className="upload-description">

                            <div className="upload-icon">
                                ⇧
                            </div>

                            <div>

                                <h3>
                                    Upload Firewall Configuration
                                </h3>

                                <p>
                                    Upload a firewall configuration
                                    file to automatically evaluate
                                    rule compliance.
                                </p>

                            </div>

                        </div>


                        <div className="upload-actions">

                            <input
                                id="firewall-file"
                                type="file"
                                hidden
                                accept=".xlsx,.xls,.csv,.json,.txt,.conf,.cfg,.xml,.yaml,.yml"
                                onChange={
                                    handleFileChange
                                }
                            />


                            <label
                                htmlFor="firewall-file"
                                className="choose-file"
                            >
                                📁 Choose File
                            </label>


                            <span className="filename">

                                {
                                    selectedFile
                                        ? selectedFile.name
                                        : "No file selected"
                                }

                            </span>


                            <button
                                className="analyze"
                                onClick={
                                    handleAnalyze
                                }
                                disabled={
                                    loading
                                }
                            >

                                {
                                    loading
                                        ? "Analyzing..."
                                        : "Analyze Configuration"
                                }

                            </button>

                        </div>

                    </section>


                    {/* ERROR */}

                    {
                        error && (

                            <div className="error">
                                {error}
                            </div>

                        )
                    }


                    {/* SUMMARY CARDS */}

                    <section className="summary-grid">


                        <button
                            className="summary total"
                            onClick={() =>
                                setFilter("all")
                            }
                        >

                            <div className="card-icon">
                                ▤
                            </div>

                            <div>

                                <span>
                                    Total Rules
                                </span>

                                <strong>
                                    {
                                        results?.total_rules ??
                                        0
                                    }
                                </strong>

                                <small>
                                    Rules analyzed
                                </small>

                            </div>

                        </button>


                        <button
                            className="summary compliant"
                            onClick={() =>
                                setFilter("compliant")
                            }
                        >

                            <div className="card-icon">
                                ✓
                            </div>

                            <div>

                                <span>
                                    Compliant Rules
                                </span>

                                <strong>
                                    {
                                        results?.compliant_rules ??
                                        0
                                    }
                                </strong>

                                <small>
                                    Click to view compliant rules
                                </small>

                            </div>

                        </button>


                        <button
                            className="summary non-compliant"
                            onClick={() =>
                                setFilter(
                                    "non-compliant"
                                )
                            }
                        >

                            <div className="card-icon">
                                !
                            </div>

                            <div>

                                <span>
                                    Non-Compliant Rules
                                </span>

                                <strong>
                                    {
                                        results?.non_compliant_rules ??
                                        0
                                    }
                                </strong>

                                <small>
                                    Click to view violations
                                </small>

                            </div>

                        </button>


                        <div className="summary overall">

                            <div className="card-icon">
                                %
                            </div>

                            <div>

                                <span>
                                    Overall Compliance
                                </span>

                                <strong>

                                    {
                                        results
                                            ? `${results.compliance_percentage}%`
                                            : "0%"
                                    }

                                </strong>

                                <small>
                                    Current configuration
                                </small>

                            </div>

                        </div>


                    </section>


                    {/* CONFIGURATION */}

                    <section className="configuration">

                        <div>

                            <span>
                                Configuration
                            </span>

                            <h3>

                                {
                                    results
                                        ? results.configuration_name
                                        : "No configuration analyzed"
                                }

                            </h3>

                            <p>

                                Vendor:{" "}

                                {
                                    results
                                        ? results.vendor
                                        : "—"
                                }

                            </p>

                        </div>


                        <span
                            className={
                                results

                                    ? (
                                        results.overall_status ===
                                        "Compliant"

                                            ? "badge good"
                                            : "badge bad"
                                    )

                                    : "badge waiting"
                            }
                        >

                            {
                                results
                                    ? results.overall_status
                                    : "Awaiting Analysis"
                            }

                        </span>

                    </section>


                    {/* GRAPHS */}

                    <section className="graphs">


                        <div className="panel">

                            <div className="panel-heading">

                                <div>

                                    <h3>
                                        Compliance Distribution
                                    </h3>

                                    <p>
                                        Compliant and non-compliant
                                        rule distribution
                                    </p>

                                </div>

                            </div>


                            <div className="chart-area">

                                {
                                    results

                                        ? (

                                            <Doughnut
                                                data={
                                                    doughnutData
                                                }
                                                options={
                                                    doughnutOptions
                                                }
                                            />

                                        )

                                        : (

                                            <div className="chart-empty">
                                                No analysis data
                                            </div>

                                        )
                                }

                            </div>

                        </div>


                        <div className="panel">

                            <div className="panel-heading">

                                <div>

                                    <h3>
                                        Rule Status Overview
                                    </h3>

                                    <p>
                                        Firewall rule compliance
                                        count
                                    </p>

                                </div>

                            </div>


                            <div className="chart-area">

                                {
                                    results

                                        ? (

                                            <Bar
                                                data={
                                                    barData
                                                }
                                                options={
                                                    barOptions
                                                }
                                            />

                                        )

                                        : (

                                            <div className="chart-empty">
                                                No analysis data
                                            </div>

                                        )
                                }

                            </div>

                        </div>

                    </section>


                    {/* RULE ANALYSIS */}

                    {
                        results && (

                            <section className="panel analysis">

                                <div className="panel-heading">

                                    <div>

                                        <h3>
                                            Rule Analysis
                                        </h3>

                                        <p>
                                            Click a rule to view
                                            complete configuration
                                            details
                                        </p>

                                    </div>


                                    <div className="filters">

                                        <button
                                            className={
                                                filter === "all"
                                                    ? "filter active"
                                                    : "filter"
                                            }
                                            onClick={() =>
                                                setFilter("all")
                                            }
                                        >
                                            All
                                        </button>


                                        <button
                                            className={
                                                filter === "compliant"
                                                    ? "filter active"
                                                    : "filter"
                                            }
                                            onClick={() =>
                                                setFilter(
                                                    "compliant"
                                                )
                                            }
                                        >
                                            Compliant
                                        </button>


                                        <button
                                            className={
                                                filter === "non-compliant"
                                                    ? "filter active"
                                                    : "filter"
                                            }
                                            onClick={() =>
                                                setFilter(
                                                    "non-compliant"
                                                )
                                            }
                                        >
                                            Non-Compliant
                                        </button>

                                    </div>

                                </div>


                                <div className="table-container">

                                    <table>

                                        <thead>

                                            <tr>

                                                <th>
                                                    Rule
                                                </th>

                                                <th>
                                                    Action
                                                </th>

                                                <th>
                                                    Protocol
                                                </th>

                                                <th>
                                                    Source
                                                </th>

                                                <th>
                                                    Destination
                                                </th>

                                                <th>
                                                    Status
                                                </th>

                                                <th>
                                                    Confidence
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {
                                                filteredRules.map(
                                                    rule => {

                                                        const details =
                                                            rule.details ||
                                                            {};


                                                        return (

                                                            <tr
                                                                key={
                                                                    String(
                                                                        rule.rule_number
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    setSelectedRule(
                                                                        rule
                                                                    )
                                                                }
                                                            >

                                                                <td>
                                                                    Rule{" "}
                                                                    {
                                                                        rule.rule_number
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        firstValue(
                                                                            details,
                                                                            [
                                                                                "Action",
                                                                                "action",
                                                                                "Expected_Action"
                                                                            ]
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        firstValue(
                                                                            details,
                                                                            [
                                                                                "Protocol",
                                                                                "protocol"
                                                                            ]
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        firstValue(
                                                                            details,
                                                                            [
                                                                                "Source_Address",
                                                                                "Source Address",
                                                                                "Source",
                                                                                "Source_Zone"
                                                                            ]
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        firstValue(
                                                                            details,
                                                                            [
                                                                                "Destination_Address",
                                                                                "Destination Address",
                                                                                "Destination",
                                                                                "Destination_Zone"
                                                                            ]
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>

                                                                    <span
                                                                        className={
                                                                            rule.status ===
                                                                            "Compliant"

                                                                                ? "table-good"

                                                                                : "table-bad"
                                                                        }
                                                                    >

                                                                        {
                                                                            rule.status
                                                                        }

                                                                    </span>

                                                                </td>


                                                                <td>

                                                                    {
                                                                        percentValue(
                                                                            rule.confidence
                                                                        )
                                                                    }

                                                                </td>

                                                            </tr>

                                                        );

                                                    }
                                                )

                                            }

                                        </tbody>

                                    </table>


                                    {
                                        filteredRules.length ===
                                        0 && (

                                            <div className="empty-table">

                                                No rules found.

                                            </div>

                                        )
                                    }

                                </div>

                            </section>

                        )
                    }


                    {/* RULE DETAILS */}

                    {
                        results &&
                        selectedRule && (

                            <section className="panel details-panel">

                                <div className="panel-heading">

                                    <div>

                                        <h3>
                                            Rule Details
                                        </h3>

                                        <p>
                                            Rule{" "}
                                            {
                                                selectedRule.rule_number
                                            }
                                        </p>

                                    </div>


                                    <span
                                        className={
                                            selectedRule.status ===
                                            "Compliant"

                                                ? "badge good"
                                                : "badge bad"
                                        }
                                    >

                                        {
                                            selectedRule.status
                                        }

                                    </span>

                                </div>


                                <div className="prediction-grid">

                                    <div>

                                        <span>
                                            Random Forest
                                        </span>

                                        <strong>
                                            {
                                                percentValue(
                                                    selectedRule
                                                    .random_forest_probability
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            XGBoost
                                        </span>

                                        <strong>
                                            {
                                                percentValue(
                                                    selectedRule
                                                    .xgboost_probability
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Ensemble
                                        </span>

                                        <strong>
                                            {
                                                percentValue(
                                                    selectedRule
                                                    .ensemble_probability
                                                )
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Confidence
                                        </span>

                                        <strong>
                                            {
                                                percentValue(
                                                    selectedRule
                                                    .confidence
                                                )
                                            }
                                        </strong>

                                    </div>

                                </div>


                                <div className="details-grid">

                                    {
                                        Object.entries(
                                            selectedRule.details ||
                                            {}
                                        ).map(
                                            ([key, value]) => (

                                                <div
                                                    key={key}
                                                    className="detail"
                                                >

                                                    <label>
                                                        {
                                                            key.replace(
                                                                /_/g,
                                                                " "
                                                            )
                                                        }
                                                    </label>

                                                    <span>
                                                        {
                                                            value ===
                                                                null ||
                                                            value ===
                                                                undefined ||
                                                            value === ""
                                                                ? "—"
                                                                : String(
                                                                    value
                                                                )
                                                        }
                                                    </span>

                                                </div>

                                            )
                                        )
                                    }

                                </div>

                            </section>

                        )
                    }

                </div>


                <footer>
                    Configuration Compliance Analysis Engine
                </footer>


            </main>

        </div>

    );
}


export default App;