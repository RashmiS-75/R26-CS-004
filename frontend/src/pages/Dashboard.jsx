import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#16A34A',
  primary: '#3E522C',
  blue: '#2563EB',
  purple: '#7C3AED',
}
export default function Dashboard({ user, darkMode }) {
  const [lastRisk, setLastRisk] = useState(null)
  const [riskHistory, setRiskHistory] = useState([])
  const [lastClass, setLastClass] = useState(null)
  const [classHistory, setClassHistory] = useState([])
  const [lastRec, setLastRec] = useState(null)
  const [lastComp, setLastComp] = useState(null)
  // ============================================================
  // THEME
  // ============================================================
  const theme = {
    page: darkMode ? 'bg-[#11170F]' : 'bg-[#F7F8F5]',
    card: darkMode ? 'bg-[#1A2218]' : 'bg-white',
    cardAlt: darkMode ? 'bg-[#20291D]' : 'bg-[#F8FAF7]',
    border: darkMode ? 'border-[#2A3526]' : 'border-[#E5E7EB]',
    text: darkMode ? 'text-gray-100' : 'text-gray-900',
    muted: darkMode ? 'text-gray-400' : 'text-gray-500',
    grid: darkMode ? '#34402F' : '#E5E7EB',
    axis: darkMode ? '#9CA3AF' : '#6B7280',
  }
  // ============================================================
  // DATA FETCHING
  // ============================================================
  useEffect(() => {
    // ----------------------------------------------------------
    // Saved Risk Result
    // ----------------------------------------------------------
    try {
      const saved = localStorage.getItem('audixa-last-risk')
      if (saved) {
        setLastRisk(JSON.parse(saved))
      }
    } catch {}
    // ----------------------------------------------------------
    // Saved Recommendation Result
    // ----------------------------------------------------------
    try {
      const saved = localStorage.getItem('audixa-last-recommend')
      if (saved) {
        setLastRec(JSON.parse(saved))
      }
    } catch {}
    // ----------------------------------------------------------
    // Saved Compliance Result
    // ----------------------------------------------------------
    try {
      const saved = localStorage.getItem('audixa-last-compliance')
      if (saved) {
        setLastComp(JSON.parse(saved))
      }
    } catch {}
        // ==========================================================
    // RISK SCORING
    // ==========================================================
    apiFetch('/risk/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setRiskHistory(list)

        if (list[0]) {
          setLastRisk((prev) => ({
            ...(prev || {}),
            ...list[0],
          }))
        }
      })
      .catch(() => {})

    // ==========================================================
    // LOG CLASSIFICATION
    // ==========================================================
    apiFetch('/classify/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setClassHistory(list)

        if (list[0]) {
          setLastClass(list[0])
        }
      })
      .catch(() => {})

    // ==========================================================
    // RECOMMENDATION & AUDIT INSIGHTS
    // ==========================================================
    apiFetch('/recommend/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows)
          ? rows
          : rows?.sessions || []

        if (list[0]) {
          setLastRec(list[0])
        }
      })
      .catch(() => {})

    // ==========================================================
    // CONFIGURATION COMPLIANCE
    // ==========================================================
    apiFetch('/compliance/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows)
          ? rows
          : rows?.sessions || []

        if (list[0]) {
          setLastComp(list[0])
        }
 })
      .catch(() => {})
  }, [])
  // ============================================================
  // RISK DATA
  // ============================================================
  const avgScore =
    lastRisk?.avgScore ??
    lastRisk?.avg_score ??
    lastRisk?.riskIndex ??
    null
  const riskTotal =
    lastRisk?.total ??
    lastRisk?.logsAssessed ??
    lastRisk?.logs_assessed ??
    0
  const riskScore = Number(avgScore)
  // Previous risk score
  const previousRisk = riskHistory?.[1]
  const previousScore =
    previousRisk?.avgScore ??
    previousRisk?.avg_score ??
    previousRisk?.riskIndex ??
    null
  const riskChange =
    previousScore !== null &&
    !Number.isNaN(Number(previousScore)) &&
    !Number.isNaN(riskScore)
      ? riskScore - Number(previousScore)
      : null
  // ============================================================
  // CLASSIFICATION DATA
  // ============================================================
  const classTotal =
    lastClass?.total_logs ??
    lastClass?.total ??
    0
  const classHigh = Number(
    lastClass?.high_count ??
    lastClass?.high ??
    0
  )
  const classMedium = Number(
    lastClass?.medium_count ??
    lastClass?.medium ??
    0
  )
  const classLow = Number(
    lastClass?.low_count ??
    lastClass?.low ??
    0
  )
  const classificationTotal =
    classHigh +
    classMedium +
    classLow
  const highPct =
    classificationTotal > 0
      ? ((classHigh / classificationTotal) * 100).toFixed(1)
      : '0.0'
  const mediumPct =
    classificationTotal > 0
      ? ((classMedium / classificationTotal) * 100).toFixed(1)
      : '0.0'
  const lowPct =
    classificationTotal > 0
      ? ((classLow / classificationTotal) * 100).toFixed(1)
      : '0.0'
  const dominantClassification = useMemo(() => {
    if (classificationTotal === 0) return '-'
    const values = [
      { name: 'High', value: classHigh },
      { name: 'Medium', value: classMedium },
      { name: 'Low', value: classLow },
    ]
    return values.sort((a, b) => b.value - a.value)[0].name
  }, [
    classificationTotal,
    classHigh,
    classMedium,
    classLow,
  ])
  // ============================================================
  // RECOMMENDATION DATA
  // ============================================================
  const recTotal =
    lastRec?.total ??
    lastRec?.count ??
    lastRec?.recommendation_count ??
    lastRec?.recommendations?.length ??
    lastRec?.events?.length ??
    0
  /*
   * These fields are intentionally flexible because the exact
   * recommendation API structure may evolve.
   */
  const priorityRecommendations =
    lastRec?.high_priority ??
    lastRec?.high_priority_count ??
    lastRec?.critical_count ??
    lastRec?.priority_count ??
    lastRec?.high_risk_count ??
    null
  const topAction =
    lastRec?.top_action ??
    lastRec?.recommendation ??
    lastRec?.top_recommendation ??
    lastRec?.recommended_action ??
    null
  const auditInsights =
    lastRec?.audit_insights ??
    lastRec?.insights ??
    lastRec?.findings ??
    null
  // ============================================================
  // COMPLIANCE DATA
  // ============================================================
  const compPct =
    lastComp?.compliance_percentage ??
    lastComp?.overall_compliance ??
    lastComp?.compliance_percent ??
    null
  const compTotal =
    lastComp?.total_rules ??
    lastComp?.total ??
    lastComp?.rules_analysed ??
    lastComp?.rules_analyzed ??
    0
  const compliantRules =
    lastComp?.compliant_rules ??
    lastComp?.compliant ??
    null
  const nonCompliantRules =
    lastComp?.non_compliant_rules ??
    lastComp?.non_compliant ??
    lastComp?.noncompliant ??
    null
  const complianceGap =
    compPct !== null &&
    !Number.isNaN(Number(compPct))
      ? Math.max(0, 100 - Number(compPct))
      : null
  // ============================================================
  // STATUS
  // ============================================================
  const riskStatus = lastRisk
    ? 'Completed'
    : 'Awaiting Analysis'
  const classStatus = lastClass
    ? 'Completed'
    : 'Awaiting Analysis'
  const recStatus = lastRec
    ? 'Completed'
    : 'Awaiting Analysis'
  const compStatus = lastComp
    ? 'Completed'
    : 'Awaiting Analysis'
  // ============================================================
  // CLASSIFICATION CHART
  // ============================================================
  const classMix = useMemo(
    () => [
      {
        name: 'High',
        value: classHigh,
        color: COLORS.high,
      },
      {
        name: 'Medium',
        value: classMedium,
        color: COLORS.medium,
      },
      {
        name: 'Low',
        value: classLow,
        color: COLORS.low,
      },
    ],
    [
      classHigh,
      classMedium,
      classLow,
    ]
  )
  // ============================================================
  // RISK SCORE TREND
  // ============================================================
  const riskTrend = [...riskHistory]
    .reverse()
    .map((session, index) => ({
      run: index + 1,
      score: Number(
        session.avgScore ??
        session.avg_score ??
        session.riskIndex ??
        0
      ),
    }))
  // ============================================================
  // CLASSIFICATION TREND
  // ============================================================
  const classTrend = [...classHistory]
    .reverse()
    .map((session, index) => ({
      run: index + 1,
      high: Number(
        session.high_count ??
        session.high ??
        0
      ),
      medium: Number(
        session.medium_count ??
        session.medium ??
        0
      ),
      low: Number(
        session.low_count ??
        session.low ??
        0
      ),
    }))
  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      className={`min-h-full ${theme.page} p-4 sm:p-5 xl:p-7 space-y-7`}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b ${theme.border}`} >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-12 rounded-full bg-[#3E522C]" />
          <div>
            <h1
              className={`text-2xl md:text-3xl font-bold tracking-tight ${theme.text}`}
            >
              Audixa Control Center
            </h1>
            <p
              className={`text-sm mt-1 ${theme.muted}`}
            >
              Centralized overview of firewall audit intelligence
              across all four engines.
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${theme.border} ${theme.card} shadow-sm`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <div>
            <p
              className={`text-xs font-semibold ${theme.text}`}
            >
              System Active
            </p>
            <p
              className={`text-[11px] ${theme.muted}`}
            >
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      {/* ======================================================
          AUDIT OVERVIEW
      ====================================================== */}
      <div>
        <SectionTitle
          title="Audit Overview"
          subtitle="Key analytical outputs from the latest engine sessions"
          theme={theme}
        />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4"
        >
          <SummaryCard
            title="Risk Score"
            value={
              avgScore !== null
                ? Number(avgScore).toFixed(1)
                : '-'
            }
            subtitle={
              riskTotal
                ? `${Number(riskTotal).toLocaleString()} logs assessed`
                : 'No assessment available'
            }
            icon="◈"
            accent="bg-[#1F2A1A]"
          />
          <SummaryCard
            title="High Severity"
            value={
              classificationTotal
                ? `${highPct}%`
                : '-'
            }
            subtitle={
              classificationTotal
                ? `${classHigh.toLocaleString()} high-severity logs`
                : 'No classification available'
            }
            icon="!"
            accent="bg-[#9A3412]"
          />
          <SummaryCard
            title="Recommendations"
            value={
              Number(recTotal).toLocaleString()
            }
            subtitle={
              lastRec
                ? 'Actionable findings generated'
                : 'No recommendations available'
            }
            icon="✦"
            accent="bg-[#374151]"
          />
          <SummaryCard
            title="Compliance"
            value={
              compPct !== null
                ? `${Number(compPct).toFixed(1)}%`
                : '-'
            }
            subtitle={
              compTotal
                ? `${Number(compTotal).toLocaleString()} rules assessed`
                : 'No compliance assessment'
            }
            icon="✓"
            accent="bg-[#7F1D1D]"
          />
        </div>
      </div>
      {/* ======================================================
          FOUR ENGINE OVERVIEW
      ====================================================== */}
      <div>
        <SectionTitle
          title="Audit Engine Overview"
          subtitle="Independent engines providing complementary audit intelligence"
          theme={theme}
        />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 mt-4"
        >
          <EngineCard
            number="01"
            title="Risk Scoring"
            description="Produces a numerical assessment of the risk associated with analyzed firewall activity."
            status={riskStatus}
            metric={
              avgScore !== null
                ? Number(avgScore).toFixed(1)
                : '-'
            }
            metricLabel="Current Risk Score"
            icon="◈"
            theme={theme}
          />
          <EngineCard
            number="02"
            title="Log Classification"
            description="Analyzes firewall events and categorizes them according to severity."
            status={classStatus}
            metric={
              classificationTotal
                ? `${highPct}%`
                : '-'
            }
            metricLabel="High Severity"
            icon="◫"
            theme={theme}
          />
          <EngineCard
            number="03"
            title="Recommendations"
            description="Converts identified findings into actionable recommendations and audit insights."
            status={recStatus}
            metric={Number(recTotal).toLocaleString()}
            metricLabel="Actionable Findings"
            icon="✦"
            theme={theme}
          />
          <EngineCard
            number="04"
            title="Configuration Compliance"
            description="Evaluates firewall configurations against defined security and compliance requirements."
            status={compStatus}
            metric={
              compPct !== null
                ? `${Number(compPct).toFixed(1)}%`
                : '-'
            }
            metricLabel="Compliance Rate"
            icon="✓"
            theme={theme}
          />
        </div>
      </div>
      {/* ======================================================
          RISK SCORING + LOG CLASSIFICATION
      ====================================================== */}
      <div
        className="grid grid-cols-1 2xl:grid-cols-2 gap-5 items-stretch"
      >
        {/* ==================================================
            RISK SCORING
        ================================================== */}
        <Panel
          title="Risk Scoring Assessment"
          subtitle="Numerical risk assessment from the latest analysis"
          theme={theme}
        >
          {/* Main Risk Score */}
          <div
            className={`rounded-2xl p-6 ${theme.cardAlt} border ${theme.border}`}
          >
            <div className="flex items-end justify-between">
              <div>
                <p
                  className={`text-xs uppercase tracking-wider font-semibold ${theme.muted}`}
                >
                  Current Risk Score
                </p>
                <div className="flex items-end gap-2 mt-1">
                  <span
                    className={`text-5xl font-bold tracking-tight ${theme.text}`}
                  >
                    {avgScore !== null
                      ? Number(avgScore).toFixed(1)
                      : '-'}
                  </span>
                  {avgScore !== null && (
                    <span
                      className={`text-sm mb-2 ${theme.muted}`}
                    >
                      / 100
                    </span>
                  )}
                </div>
              </div>
              {riskChange !== null && (
                <div className="text-right">
                  <p
                    className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
                  >
                    vs Previous
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      riskChange > 0
                        ? 'text-red-600'
                        : riskChange < 0
                        ? 'text-green-600'
                        : theme.text
                    }`}
                  >
                    {riskChange > 0 ? '+' : ''}
                    {riskChange.toFixed(1)}
                  </p>
                </div>
              )}
            </div>
            {/* Score Scale */}
            {avgScore !== null && (
              <div className="mt-6">
                <div
                  className="h-2 bg-gray-200 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-[#3E522C] transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(riskScore, 0),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div
                  className={`flex justify-between text-[10px] mt-1 ${theme.muted}`}
                >
                  <span>0</span>
                  <span>Risk Score Scale</span>
                  <span>100</span>
                </div>
              </div>
            )}
          </div>
          {/* Supporting Analysis */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"
          >
            <InsightMetric
              label="Logs Assessed"
              value={
                Number(riskTotal).toLocaleString()
              }
              theme={theme}
            />
            <InsightMetric
              label="Previous Score"
              value={
                previousScore !== null
                  ? Number(previousScore).toFixed(1)
                  : '-'
              }
              theme={theme}
            />
          </div>
          {/* Trend */}
          <div className="mt-5">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${theme.muted} mb-2`}
            >
              Risk Score Trend
            </p>
            <div className="h-40">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={
                    riskTrend.length
                      ? riskTrend
                      : [{ run: 1, score: 0 }]
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={theme.grid}
                  />
                  <XAxis
                    dataKey="run"
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={COLORS.primary}
                    fill="#3E522C18"
                    strokeWidth={3}
                    name="Risk Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
        {/* ==================================================
            LOG CLASSIFICATION
        ================================================== */}
        <Panel
          title="Log Classification"
          subtitle="Severity distribution from the latest classification"
          theme={theme}
        >
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center"
          >
            {/* Chart */}
            <div className="h-52">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={classMix}
                  margin={{
                    top: 10,
                    right: 5,
                    left: -25,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={theme.grid}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[5, 5, 0, 0]}
                  >
                    {classMix.map((entry, index) => (
                      <Cell
                        key={`classification-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Analytical Values */}
            <div className="space-y-3">
              <ClassificationMetric
                label="High Severity"
                value={`${classHigh.toLocaleString()} (${highPct}%)`}
                color={COLORS.high}
                theme={theme}
              />
              <ClassificationMetric
                label="Medium Severity"
                value={`${classMedium.toLocaleString()} (${mediumPct}%)`}
                color={COLORS.medium}
                theme={theme}
              />
              <ClassificationMetric
                label="Low Severity"
                value={`${classLow.toLocaleString()} (${lowPct}%)`}
                color={COLORS.low}
                theme={theme}
              />
              <div
                className={`border-t ${theme.border} pt-3 mt-3`}
              >
                <div className="flex justify-between">
                  <span
                    className={`text-xs ${theme.muted}`}
                  >
                    Dominant Severity
                  </span>
                  <span
                    className={`text-sm font-bold ${theme.text}`}
                  >
                    {dominantClassification}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span
                    className={`text-xs ${theme.muted}`}
                  >
                    Classified Logs
                  </span>
                  <span
                    className={`text-sm font-bold ${theme.text}`}
                  >
                    {Number(
                      classTotal || classificationTotal
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Classification Trend */}
          <div className="mt-5">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${theme.muted} mb-2`}
            >
              Classification Trend
            </p>
            <div className="h-36">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={
                    classTrend.length
                      ? classTrend
                      : [
                          {
                            run: 1,
                            high: 0,
                            medium: 0,
                            low: 0,
                          },
                        ]
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={theme.grid}
                  />
                  <XAxis
                    dataKey="run"
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: theme.axis,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stroke={COLORS.high}
                    fill="#EA580C18"
                    strokeWidth={2}
                    name="High"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    stroke={COLORS.medium}
                    fill="#CA8A0418"
                    strokeWidth={2}
                    name="Medium"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stroke={COLORS.low}
                    fill="#16A34A18"
                    strokeWidth={2}
                    name="Low"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>
      {/* ======================================================
          RECOMMENDATIONS + COMPLIANCE
      ====================================================== */}
      <div
        className="grid grid-cols-1 2xl:grid-cols-2 gap-5 items-stretch"
      >
        {/* ==================================================
            RECOMMENDATIONS
        ================================================== */}
        <Panel
          title="Recommendation & Audit Insights"
          subtitle="Actionable findings generated from the analysis"
          theme={theme}
        >
          <StatusBanner
            status={recStatus}
            theme={theme}
          />
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"
          >
            <InsightMetric
              label="Total Recommendations"
              value={Number(recTotal).toLocaleString()}
              theme={theme}
            />
            <InsightMetric
              label="Priority Findings"
              value={
                priorityRecommendations !== null
                  ? Number(
                      priorityRecommendations
                    ).toLocaleString()
                  : '-'
              }
              theme={theme}
            />
          </div>
          <div
            className={`mt-4 rounded-xl border ${theme.border} p-4`}
          >
            <p
              className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
            >
              Top Recommended Action
            </p>
            <p
              className={`text-sm font-semibold mt-2 leading-5 ${theme.text}`}
            >
              {topAction ||
                'No recommendation available yet.'}
            </p>
          </div>
          {auditInsights && (
            <div
              className={`mt-3 rounded-xl ${theme.cardAlt} p-4`}
            >
              <p
                className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
              >
                Audit Insight
              </p>
              <p
                className={`text-sm mt-2 leading-5 ${theme.text}`}
              >
                {typeof auditInsights === 'string'
                  ? auditInsights
                  : JSON.stringify(
                      auditInsights
                    )}
              </p>
            </div>
          )}
        </Panel>
        {/* ==================================================
            COMPLIANCE
        ================================================== */}
        <Panel
          title="Configuration Compliance"
          subtitle="Latest firewall configuration assessment"
          theme={theme}
        >
          <div
            className="grid grid-cols-2 gap-3"
          >
            <ComplianceMetric
              label="Compliance Rate"
              value={
                compPct !== null
                  ? `${Number(compPct).toFixed(1)}%`
                  : '-'
              }
              theme={theme}
              highlight
            />
            <ComplianceMetric
              label="Compliance Gap"
              value={
                complianceGap !== null
                  ? `${complianceGap.toFixed(1)}%`
                  : '-'
              }
              theme={theme}
            />
            <ComplianceMetric
              label="Compliant Rules"
              value={
                compliantRules !== null
                  ? Number(
                      compliantRules
                    ).toLocaleString()
                  : '-'
              }
              theme={theme}
            />
            <ComplianceMetric
              label="Non-Compliant"
              value={
                nonCompliantRules !== null
                  ? Number(
                      nonCompliantRules
                    ).toLocaleString()
                  : '-'
              }
              theme={theme}
            />
          </div>
          <div
            className={`mt-4 rounded-xl ${theme.cardAlt} p-4`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p
                  className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
                >
                  Rules Assessed
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${theme.text}`}
                >
                  {compTotal
                    ? Number(
                        compTotal
                      ).toLocaleString()
                    : '-'}
                </p>
              </div>
              <span
                className={`text-xs px-3 py-1.5 rounded-full ${
                  compPct !== null &&
                  Number(compPct) >= 80
                    ? 'bg-green-100 text-green-700'
                    : compPct !== null
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {compPct !== null
                  ? `${Number(compPct).toFixed(1)}% assessed compliance`
                  : 'Awaiting assessment'}
              </span>
            </div>
          </div>
        </Panel>
      </div>
      {/* ======================================================
          RECENT AUDIT ACTIVITY
      ====================================================== */}
      <Panel
        title="Recent Audit Activity"
        subtitle="Latest available output from each independent engine"
        theme={theme}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className={`border-b ${theme.border}`}>
                <th className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}>Engine</th>
                <th className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}>Latest output</th>
                <th className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}>Key result</th>
                <th className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              <ActivityRow engine="Risk Scoring" output={riskTotal ? `${Number(riskTotal).toLocaleString()} logs assessed` : 'No assessment available'} result={avgScore !== null ? `${Number(avgScore).toFixed(1)} / 100` : '—'} status={riskStatus} theme={theme} />
              <ActivityRow engine="Log Classification" output={classificationTotal ? `${Number(classificationTotal).toLocaleString()} events classified` : 'No classification available'} result={classificationTotal ? `${highPct}% high severity` : '—'} status={classStatus} theme={theme} />
              <ActivityRow engine="Audit Insights & Recommendations" output={lastRec ? 'Findings available' : 'No recommendations available'} result={Number(recTotal).toLocaleString() + ' recommendations'} status={recStatus} theme={theme} />
              <ActivityRow engine="Configuration Compliance" output={compTotal ? `${Number(compTotal).toLocaleString()} rules assessed` : 'No compliance assessment'} result={compPct !== null ? `${Number(compPct).toFixed(1)}% compliant` : '—'} status={compStatus} theme={theme} />
            </tbody>
          </table>
        </div>
      </Panel>
      {/* ======================================================
          PLATFORM SUMMARY
      ====================================================== */}
      <div
        className={`rounded-2xl border ${theme.border} ${theme.card} p-5 sm:p-6 shadow-sm`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p
              className={`text-sm font-semibold ${theme.text}`}
            >
              Audixa Audit Intelligence
            </p>
            <p
              className={`text-xs mt-1 ${theme.muted}`}
            >
              Four independent engines transforming firewall
              data into risk, classification, recommendation,
              and compliance insights.
            </p>
          </div>
          <div
            className={`text-xs ${theme.muted}`}
          >
            Logged in as{' '}
            <span
              className={`font-semibold ${theme.text}`}
            >
              {user?.name || 'Audixa User'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
function ActivityRow({ engine, output, result, status, theme }) {
  const completed = status === 'Completed'
  return (
    <tr className={`border-b last:border-b-0 ${theme.border}`}>
      <td className={`px-3 py-3 text-xs font-semibold ${theme.text}`}>{engine}</td>
      <td className={`px-3 py-3 text-xs ${theme.muted}`}>{output}</td>
      <td className={`px-3 py-3 text-xs font-semibold ${theme.text}`}>{result}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${completed ? 'bg-green-500' : 'bg-yellow-500'}`} />
          {status}
        </span>
      </td>
    </tr>
  )
}

/* ============================================================
   SECTION TITLE
============================================================ */
function SectionTitle({
  title,
  subtitle,
  theme,
}) {
  return (
    <div>
      <h2
        className={`text-sm font-bold uppercase tracking-wide ${theme.text}`}
      >
        {title}
      </h2>
      <p
        className={`text-xs mt-1 ${theme.muted}`}
      >
        {subtitle}
      </p>
    </div>
  )
}
/* ============================================================
   SUMMARY CARD
============================================================ */
function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}) {
  return (
    <div
      className={`${accent} text-white rounded-2xl p-5 sm:p-6 min-h-[150px] flex flex-col justify-between shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] uppercase tracking-wider text-white/70"
        >
          {title}
        </p>
        <span
          className="text-lg text-white/80"
        >
          {icon}
        </span>
      </div>
      <div>
        <p
          className="text-3xl font-bold tracking-tight"
        >
          {value}
        </p>
        <p
          className="text-xs mt-2 text-white/65 truncate"
        >
          {subtitle}
        </p>
      </div>
    </div>
  )
}
/* ============================================================
   ENGINE CARD
============================================================ */
function EngineCard({
  number,
  title,
  description,
  status,
  metric,
  metricLabel,
  icon,
  theme,
}) {
  const completed = status === 'Completed'
  return (
    <div
      className={`${theme.card} border ${theme.border} rounded-2xl p-5 h-full shadow-sm hover:shadow-md transition-shadow`}
    >
      <div
        className="flex items-start justify-between gap-2"
      >
        <div
          className="flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl bg-[#3E522C]/10 text-[#3E522C] flex items-center justify-center font-semibold"
          >
            {icon}
          </div>
          <div>
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${theme.muted}`}
            >
              Engine {number}
            </p>
            <h3
              className={`text-sm font-bold ${theme.text}`}
            >
              {title}
            </h3>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
            completed
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {status}
        </span>
      </div>
      <p
        className={`text-xs leading-5 mt-4 min-h-[3.75rem] ${theme.muted}`}
      >
        {description}
      </p>
      <div
        className={`mt-4 pt-4 border-t ${theme.border} flex items-end justify-between`}
      >
        <div>
          <p
            className={`text-2xl font-bold ${theme.text}`}
          >
            {metric}
          </p>
          <p
            className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
          >
            {metricLabel}
          </p>
        </div>
        <span
          className={`text-xs ${theme.muted}`}
        >
          Latest
        </span>
      </div>
    </div>
  )
}
/* ============================================================
   PANEL
============================================================ */
function Panel({
  title,
  subtitle,
  children,
  theme,
}) {
  return (
    <div
      className={`${theme.card} border ${theme.border} rounded-2xl p-5 sm:p-6 shadow-sm h-full`}
    >
      <div className="mb-4">
        <h3
          className={`text-sm font-bold ${theme.text}`}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={`text-xs mt-1 ${theme.muted}`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
/* ============================================================
   INSIGHT METRIC
============================================================ */
function InsightMetric({
  label,
  value,
  theme,
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${theme.border} ${theme.cardAlt}`}
    >
      <p
        className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
      >
        {label}
      </p>
      <p
        className={`text-xl font-bold mt-1 ${theme.text}`}
      >
        {value}
      </p>
    </div>
  )
}
/* ============================================================
   CLASSIFICATION METRIC
============================================================ */
function ClassificationMetric({
  label,
  value,
  color,
  theme,
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
    >
      <div
        className="flex items-center gap-2"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: color,
          }}
        />
        <span
          className={`text-xs ${theme.muted}`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-xs font-bold ${theme.text} text-right`}
      >
        {value}
      </span>
    </div>
  )
}
/* ============================================================
   COMPLIANCE METRIC
============================================================ */
function ComplianceMetric({
  label,
  value,
  theme,
  highlight = false,
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${theme.border} ${
        highlight
          ? 'bg-[#3E522C]/10'
          : theme.cardAlt
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wide ${theme.muted}`}
      >
        {label}
      </p>
      <p
        className={`text-xl font-bold mt-1 ${
          highlight
            ? 'text-[#3E522C]'
            : theme.text
        }`}
      >
        {value}
      </p>
    </div>
  )
}
/* ============================================================
   STATUS BANNER
============================================================ */
function StatusBanner({
  status,
  theme,
}) {
  const completed = status === 'Completed'
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        completed
          ? 'bg-green-50 border border-green-100'
          : 'bg-yellow-50 border border-yellow-100'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          completed
            ? 'bg-green-500'
            : 'bg-yellow-500'
        }`}
      />
      <div>
        <p
          className={`text-xs font-semibold ${
            completed
              ? 'text-green-700'
              : 'text-yellow-700'
          }`}
        >
          {status}
        </p>
        <p
          className="text-[10px] text-gray-500"
        >
          Latest engine session status
        </p>
      </div>
    </div>
  )
}
