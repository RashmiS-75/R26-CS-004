import { useEffect, useMemo, useState } from 'react'
import {
  Upload,
  Download,
  History,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
} from 'recharts'

import { apiFetch } from '../api'

const RANGE_COLORS = [
  '#16A34A',
  '#84CC16',
  '#EAB308',
  '#EA580C',
  '#DC2626',
]

const PRIORITY_COLORS = {
  Low: '#16A34A',
  Medium: '#CA8A04',
  High: '#EA580C',
  Critical: '#DC2626',
}

function RiskScoring() {
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [detailed, setDetailed] = useState([])

  const [loading, setLoading] = useState(false)

  const [scoreBuckets, setScoreBuckets] = useState([])
  const [priorityMix, setPriorityMix] = useState([])
  const [heat, setHeat] = useState([])
  const [scatterData, setScatterData] = useState([])
  const [lineData, setLineData] = useState([])

  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const [selectedRow, setSelectedRow] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const rowsPerPage = 10

  // ============================================================
  // LOAD ASSESSMENT HISTORY
  // ============================================================

  const loadHistory = async () => {
    try {
      const res = await apiFetch('/risk/sessions')

      if (res.ok) {
        const data = await res.json()

        setHistory(
          Array.isArray(data)
            ? data
            : []
        )
      }
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // ============================================================
  // RUN RISK ASSESSMENT
  // ============================================================

  const handleAnalyze = async () => {
    if (!file) {
      alert(
        'Please upload a firewall log CSV first.'
      )
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()

      formData.append(
        'file',
        file
      )

      const res = await apiFetch('/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error =
          await res.json()

        throw new Error(
          error.detail ||
            'Risk assessment failed.'
        )
      }

      const data =
        await res.json()

      const summary =
        data.summary || {}

      // ========================================================
      // NORMALIZE DETAILED RESULTS
      // ========================================================

      const rows = (
        data.detailed || []
      ).map((r) => ({
        ...r,

        predicted_label:
          Number(
            r.predicted_label ??
              -1
          ),

        likelihood:
          Number(
            r.likelihood ??
              r.probability ??
              0
          ),

        probability:
          Number(
            r.probability ??
              r.likelihood ??
              0
          ),

        impact:
          Number(
            r.impact ?? 0
          ),

        risk_score:
          Number(
            r.risk_score ?? 0
          ),

        risk_level:
          r.risk_level ||
          'Low',
      }))

      // ========================================================
      // CALCULATE RISK STATISTICS
      // ========================================================

      const scores =
        rows.map(
          (r) =>
            r.risk_score
        )

      const avg =
        mean(scores)

      const maxScore =
        scores.length
          ? Math.max(
              ...scores
            )
          : 0

      const minScore =
        scores.length
          ? Math.min(
              ...scores
            )
          : 0

      const median =
        quantile(
          scores,
          0.5
        )

      const p90 =
        quantile(
          scores,
          0.9
        )

      const total =
        Number(
          summary.total ??
            rows.length
        )

      const critical =
        Number(
          summary.critical ||
            0
        )

      const high =
        Number(
          summary.high ||
            0
        )

      const medium =
        Number(
          summary.medium ||
            0
        )

      const low =
        Number(
          summary.low ||
            0
        )

      const attention =
        critical + high

      const suspicious =
        rows.filter(
          (r) =>
            r.predicted_label ===
            1
        ).length

      const attentionRate =
        pct(
          attention,
          total
        )

      // ========================================================
      // SUMMARY
      // ========================================================

      const nextResults = {
        total,

        avgScore: n1(
          summary.avg_score ??
            avg
        ),

        maxScore: n1(
          summary.max_score ??
            maxScore
        ),

        minScore: n1(
          minScore
        ),

        medianScore: n1(
          median
        ),

        p90: n1(
          p90
        ),

        critical,
        high,
        medium,
        low,

        attention,
        suspicious,

        attentionRate,
      }

      setResults(
        nextResults
      )

      setDetailed(
        rows
      )

      // Reset table pagination
      setCurrentPage(1)

      localStorage.setItem(
        'audixa-last-risk',
        JSON.stringify(
          nextResults
        )
      )

      await loadHistory()

      // ========================================================
      // SCORE RANGE DISTRIBUTION
      // ========================================================

      const buckets = [
        {
          range: '0–20',
          min: 0,
          max: 20,
        },
        {
          range: '20–40',
          min: 20,
          max: 40,
        },
        {
          range: '40–60',
          min: 40,
          max: 60,
        },
        {
          range: '60–80',
          min: 60,
          max: 80,
        },
        {
          range: '80–100',
          min: 80,
          max: 101,
        },
      ]

      setScoreBuckets(
        buckets.map(
          (b, index) => ({
            range:
              b.range,

            count:
              rows.filter(
                (r) =>
                  r.risk_score >=
                    b.min &&
                  r.risk_score <
                    b.max
              ).length,

            color:
              RANGE_COLORS[
                index
              ],
          })
        )
      )

      // ========================================================
      // SCORE × PRIORITY
      // ========================================================

      setPriorityMix(
        buckets.map((b) => {
          const inRange =
            rows.filter(
              (r) =>
                r.risk_score >=
                  b.min &&
                r.risk_score <
                  b.max
            )

          return {
            range:
              b.range,

            Low:
              inRange.filter(
                (r) =>
                  r.risk_level ===
                  'Low'
              ).length,

            Medium:
              inRange.filter(
                (r) =>
                  r.risk_level ===
                  'Medium'
              ).length,

            High:
              inRange.filter(
                (r) =>
                  r.risk_level ===
                  'High'
              ).length,

            Critical:
              inRange.filter(
                (r) =>
                  r.risk_level ===
                  'Critical'
              ).length,
          }
        })
      )

      // ========================================================
      // SUSPICIOUS EXPOSURE
      // ========================================================

      setHeat(
        buckets.map((b) => {
          const inRange =
            rows.filter(
              (r) =>
                r.risk_score >=
                  b.min &&
                r.risk_score <
                  b.max
            )

          return {
            range:
              b.range,

            Suspicious:
              inRange.filter(
                (r) =>
                  r.predicted_label ===
                  1
              ).length,

            Normal:
              inRange.filter(
                (r) =>
                  r.predicted_label ===
                  0
              ).length,
          }
        })
      )

      // ========================================================
      // RISK SCORE VS CONFIDENCE
      // ========================================================

      const sample =
        rows
          .filter(
            (_, index) =>
              index % 12 ===
              0
          )
          .slice(0, 400)

      setScatterData(
        sample.map(
          (r) => ({
            x: Number(
              (
                r.probability ??
                r.likelihood ??
                0
              ).toFixed(3)
            ),

            y: Number(
              r.risk_score.toFixed(
                2
              )
            ),
          })
        )
      )

      // ========================================================
      // RISK SCORE TREND
      // ========================================================

      const sorted =
        [...rows].sort(
          (a, b) =>
            a.risk_score -
            b.risk_score
        )

      const step =
        Math.max(
          1,
          Math.floor(
            sorted.length /
              50
          )
        )

      let running = 0

      const trend = []

      sorted.forEach(
        (r, index) => {
          running +=
            r.risk_score

          if (
            index %
                step ===
              0 ||
            index ===
              sorted.length - 1
          ) {
            trend.push({
              point:
                trend.length +
                1,

              risk: Number(
                r.risk_score.toFixed(
                  2
                )
              ),

              avg: Number(
                (
                  running /
                  (index + 1)
                ).toFixed(2)
              ),
            })
          }
        }
      )

      setLineData(
        trend
      )

    } catch (error) {
      console.error(
        error
      )

      alert(
        error.message ||
          'Unable to analyse this file.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // EXPORT RESULTS
  // ============================================================

  const handleExport = () => {
    if (!detailed.length) {
      alert(
        'No results available to export.'
      )

      return
    }

    const engineFields = [
      'predicted_label',
      'probability',
      'likelihood',
      'impact',
      'risk_score',
      'risk_level',
    ]

    const originalFields =
      Object.keys(
        detailed[0]
      ).filter(
        (key) =>
          !engineFields.includes(
            key
          )
      )

    const headers = [
      ...originalFields,
      'predicted_label',
      'probability',
      'impact',
      'risk_score',
      'risk_level',
    ]

    const csv = [
      headers.join(','),

      ...detailed.map(
        (row) =>
          headers
            .map((header) => {
              const value =
                header ===
                'probability'
                  ? row.probability ??
                    row.likelihood
                  : row[
                      header
                    ]

              return `"${String(
                value ?? ''
              ).replace(
                /"/g,
                '""'
              )}"`
            })
            .join(',')
      ),
    ].join('\n')

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const anchor =
      document.createElement(
        'a'
      )

    anchor.href = url

    anchor.download =
      'audixa_risk_assessment_results.csv'

    anchor.click()

    URL.revokeObjectURL(
      url
    )
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages =
    Math.ceil(
      detailed.length /
        rowsPerPage
    )

  const paginatedRows =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        rowsPerPage

      const end =
        start + rowsPerPage

      return detailed.slice(
        start,
        end
      )
    }, [
      detailed,
      currentPage,
    ])

  const pageStart =
    detailed.length === 0
      ? 0
      : (currentPage - 1) *
          rowsPerPage +
        1

  const pageEnd =
    Math.min(
      currentPage *
        rowsPerPage,
      detailed.length
    )

  const goToPage =
    (page) => {
      if (
        page < 1 ||
        page > totalPages
      ) {
        return
      }

      setCurrentPage(
        page
      )

      document
        .getElementById(
          'risk-details'
        )
        ?.scrollIntoView({
          behavior:
            'smooth',
          block: 'start',
        })
    }

  // ============================================================
  // ANALYTICAL INSIGHTS
  // ============================================================

  const riskScore =
    results
      ? Number(
          results.avgScore
        )
      : 0

  const suspiciousRate =
    results &&
    results.total
      ? (
          (results.suspicious /
            results.total) *
          100
        ).toFixed(1)
      : '0.0'

  const highestRiskBucket =
    useMemo(() => {
      if (
        !scoreBuckets.length
      ) {
        return null
      }

      return [
        ...scoreBuckets,
      ].sort(
        (a, b) =>
          b.count -
          a.count
      )[0]
    }, [
      scoreBuckets,
    ])

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-5 md:p-7 bg-[#EEF1EC] min-h-full text-gray-900">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

        <div className="flex items-center gap-3">

          <div className="w-2 h-10 rounded-full bg-[#3E522C]" />

          <div>

            <h1 className="text-3xl font-bold text-gray-900">
              Risk Scoring Engine
            </h1>

            <p className="text-[15px] text-gray-600 mt-1">
              Comprehensive assessment of firewall
              activity and risk exposure.
            </p>

          </div>

        </div>

        <button
          onClick={() => {
            setShowHistory(
              true
            )

            loadHistory()
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
        >
          <History size={17} />

          Assessment History
        </button>

      </div>

      {/* ======================================================
          FILE UPLOAD
      ====================================================== */}

      <div className="bg-white border border-[#D7DDD6] rounded-2xl p-5 mb-5">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>

            <div className="flex items-center gap-2">

              <Upload
                size={19}
                className="text-[#3E522C]"
              />

              <p className="text-lg font-bold">
                Firewall Log Assessment
              </p>

            </div>

            <p className="text-[15px] text-gray-600 mt-1">
              Upload a firewall log CSV to generate
              a comprehensive risk assessment.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <input
              type="file"
              accept=".csv"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              className="text-[15px] text-gray-600"
            />

            <button
              onClick={
                handleAnalyze
              }
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#3E522C] text-white hover:bg-[#324522] disabled:opacity-60"
            >
              {loading
                ? 'Analysing...'
                : 'Run Risk Assessment'}
            </button>

            <button
              onClick={
                handleExport
              }
              disabled={
                !detailed.length
              }
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-[#3E522C] text-[#3E522C] hover:bg-[#F5F7F3] disabled:opacity-40"
            >
              <Download
                size={16}
              />

              Export Results
            </button>

          </div>

        </div>

        {file && (

          <div className="mt-4 px-4 py-3 bg-[#F5F7F3] rounded-lg text-[15px] text-gray-600">

            Selected file:{' '}

            <span className="font-semibold text-gray-900">
              {file.name}
            </span>

          </div>

        )}

      </div>

      {/* ======================================================
          HISTORY MODAL
      ====================================================== */}

      {showHistory && (

        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[82vh] overflow-auto">

            <div className="flex items-center justify-between p-6 border-b">

              <div>

                <h2 className="text-xl font-bold text-gray-900">
                  Risk Assessment History
                </h2>

                <p className="text-[15px] text-gray-600 mt-1">
                  Previously processed risk assessment
                  sessions.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowHistory(
                    false
                  )
                }
                className="p-2.5 rounded-lg hover:bg-gray-100"
              >
                <X size={21} />
              </button>

            </div>

            <div className="p-6">

              {history.length >
              0 ? (

                <div className="overflow-x-auto border border-gray-200 rounded-xl">

                  <table className="w-full text-base">

                    <thead>

                      <tr className="bg-[#F5F7F3] border-b border-gray-200">

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Filename
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Total
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Avg Score
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Critical
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          High
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Medium
                        </th>

                        <th className="px-4 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                          Low
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {history.map(
                        (
                          h,
                          index
                        ) => (

                          <tr
                            key={
                              h.id ??
                              index
                            }
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >

                            <td className="px-4 py-4 text-[15px] font-semibold text-gray-800">
                              {h.filename ||
                                '-'}
                            </td>

                            <td className="px-4 py-4 text-[15px] text-gray-700">
                              {h.total ??
                                '-'}
                            </td>

                            <td className="px-4 py-4 text-[15px] font-bold text-gray-900">
                              {formatNumber(
                                h.avgScore ??
                                  h.avg_score
                              )}
                            </td>

                            <td className="px-4 py-4 text-[15px] text-gray-700">
                              {h.critical ??
                                0}
                            </td>

                            <td className="px-4 py-4 text-[15px] text-gray-700">
                              {h.high ??
                                0}
                            </td>

                            <td className="px-4 py-4 text-[15px] text-gray-700">
                              {h.medium ??
                                0}
                            </td>

                            <td className="px-4 py-4 text-[15px] text-gray-700">
                              {h.low ??
                                0}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="py-10 text-center">

                  <p className="text-[15px] text-gray-600">
                    No saved risk assessments
                    available.
                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!results ? (

        <div className="bg-white border border-[#D7DDD6] rounded-2xl p-16 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3E522C]/10 flex items-center justify-center">

            <Upload
              size={30}
              className="text-[#3E522C]"
            />

          </div>

          <h2 className="text-xl font-bold mt-5">
            No Risk Assessment Available
          </h2>

          <p className="text-[15px] text-gray-600 mt-2 max-w-xl mx-auto leading-6">
            Upload a firewall log CSV and run the
            assessment to generate risk scoring,
            exposure analysis, confidence analysis,
            trends and detailed risk insights.
          </p>

        </div>

      ) : (

        <>

          {/* ==================================================
              EXECUTIVE SUMMARY
          ================================================== */}

          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-5">

            <SummaryTile
              label="Average Risk"
              value={
                results.avgScore
              }
              color="bg-[#1F2A1A]"
            />

            <SummaryTile
              label="Peak Risk"
              value={
                results.maxScore
              }
              color="bg-[#7F1D1D]"
            />

            <SummaryTile
              label="90th Percentile"
              value={
                results.p90
              }
              color="bg-[#9A3412]"
            />

            <SummaryTile
              label="Median Risk"
              value={
                results.medianScore
              }
              color="bg-[#374151]"
            />

            <SummaryTile
              label="Attention Exposure"
              value={`${results.attentionRate}%`}
              color="bg-[#713F12]"
            />

            <SummaryTile
              label="Logs Assessed"
              value={Number(
                results.total
              ).toLocaleString()}
              color="bg-[#3E522C]"
            />

          </div>

          {/* ==================================================
              RISK SCORE
          ================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

            <div className="bg-white border border-[#D7DDD6] rounded-2xl p-6">

              <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
                Overall Risk Assessment
              </p>

              <div className="mt-5 flex items-center justify-center">

                <RiskGauge
                  value={
                    riskScore
                  }
                />

              </div>

              <div className="text-center mt-4">

                <p className="text-[15px] text-gray-600">
                  Average risk score
                </p>

                <p className="text-[15px] font-semibold mt-2 text-gray-800">
                  Based on{' '}
                  {Number(
                    results.total
                  ).toLocaleString()}{' '}
                  assessed events
                </p>

              </div>

            </div>

            {/* ==================================================
                SCORE DISTRIBUTION
            ================================================== */}

            <div className="xl:col-span-2 bg-white border border-[#D7DDD6] rounded-2xl p-5">

              <SectionHeader
                title="Risk Score Distribution"
                subtitle="Distribution of assessed events across numerical score ranges."
              />

              <div className="h-64 mt-4">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      scoreBuckets
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="range"
                      tick={{
                        fontSize: 13,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 13,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    >

                      {scoreBuckets.map(
                        (
                          entry,
                          index
                        ) => (

                          <Cell
                            key={
                              index
                            }
                            fill={
                              entry.color
                            }
                          />

                        )
                      )}

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">

                <MiniInsight
                  label="Largest Score Range"
                  value={
                    highestRiskBucket
                      ? highestRiskBucket.range
                      : '-'
                  }
                />

                <MiniInsight
                  label="Events in Range"
                  value={
                    highestRiskBucket
                      ? Number(
                          highestRiskBucket.count
                        ).toLocaleString()
                      : '-'
                  }
                />

              </div>

            </div>

          </div>

          {/* ==================================================
              EXPOSURE ANALYSIS
          ================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">

            <AnalysisPanel
              title="Score × Priority Analysis"
              subtitle="Relationship between numerical score ranges and risk priority."
            >

              <div className="h-64">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      priorityMix
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="range"
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          '13px',
                      }}
                    />

                    <Bar
                      dataKey="Low"
                      stackId="priority"
                      fill={
                        PRIORITY_COLORS.Low
                      }
                    />

                    <Bar
                      dataKey="Medium"
                      stackId="priority"
                      fill={
                        PRIORITY_COLORS.Medium
                      }
                    />

                    <Bar
                      dataKey="High"
                      stackId="priority"
                      fill={
                        PRIORITY_COLORS.High
                      }
                    />

                    <Bar
                      dataKey="Critical"
                      stackId="priority"
                      fill={
                        PRIORITY_COLORS.Critical
                      }
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">

                <MiniInsight
                  label="Attention Events"
                  value={Number(
                    results.attention
                  ).toLocaleString()}
                />

                <MiniInsight
                  label="Attention Exposure"
                  value={`${results.attentionRate}%`}
                />

              </div>

            </AnalysisPanel>

            {/* ==================================================
                SUSPICIOUS EXPOSURE
            ================================================== */}

            <AnalysisPanel
              title="Suspicious Exposure Analysis"
              subtitle="Suspicious versus normal events across risk score ranges."
            >

              <div className="h-64">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={heat}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="range"
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          '13px',
                      }}
                    />

                    <Bar
                      dataKey="Suspicious"
                      stackId="exposure"
                      fill="#7F1D1D"
                    />

                    <Bar
                      dataKey="Normal"
                      stackId="exposure"
                      fill="#3E522C"
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">

                <MiniInsight
                  label="Suspicious Events"
                  value={Number(
                    results.suspicious
                  ).toLocaleString()}
                />

                <MiniInsight
                  label="Suspicious Rate"
                  value={`${suspiciousRate}%`}
                />

              </div>

            </AnalysisPanel>

          </div>

          {/* ==================================================
              MODEL ANALYSIS
          ================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">

            <AnalysisPanel
              title="Risk Score vs Confidence"
              subtitle="Relationship between model confidence and generated risk score."
            >

              <div className="h-72">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <ScatterChart>

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Confidence"
                      domain={[
                        0,
                        1,
                      ]}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Risk Score"
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip />

                    <Scatter
                      data={
                        scatterData
                      }
                      fill="#EA580C"
                    />

                  </ScatterChart>

                </ResponsiveContainer>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">

                <MiniInsight
                  label="Sampled Events"
                  value={
                    scatterData.length
                  }
                />

                <MiniInsight
                  label="Confidence Scale"
                  value="0 – 1"
                />

              </div>

            </AnalysisPanel>

            {/* ==================================================
                TREND
            ================================================== */}

            <AnalysisPanel
              title="Risk Score Trend"
              subtitle="Risk scores compared with the running average."
            >

              <div className="h-72">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={
                      lineData
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="point"
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          '13px',
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="risk"
                      stroke="#DC2626"
                      dot={false}
                      strokeWidth={2}
                      name="Risk Score"
                    />

                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="#3E522C"
                      dot={false}
                      strokeWidth={3}
                      name="Running Average"
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            </AnalysisPanel>

          </div>

          {/* ==================================================
              KEY INSIGHTS
          ================================================== */}

          <div className="bg-white border border-[#D7DDD6] rounded-2xl p-5 mb-5">

            <SectionHeader
              title="Risk Assessment Insights"
              subtitle="Key findings derived from the current firewall risk assessment."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">

              <InsightBox
                title="Overall Exposure"
                value={
                  results.avgScore
                }
                description="Average risk score across the assessed dataset."
              />

              <InsightBox
                title="Upper-Tail Exposure"
                value={
                  results.p90
                }
                description="90th percentile score representing elevated-end exposure."
              />

              <InsightBox
                title="Attention Queue"
                value={`${Number(
                  results.attention
                ).toLocaleString()}`}
                description={`${results.attentionRate}% of assessed events fall into the higher-priority attention group.`}
              />

              <InsightBox
                title="Suspicious Activity"
                value={`${suspiciousRate}%`}
                description={`${Number(
                  results.suspicious
                ).toLocaleString()} events were flagged as suspicious.`}
              />

            </div>

          </div>

          {/* ==================================================
              DETAILED ASSESSMENT
          ================================================== */}

          <div
            id="risk-details"
            className="bg-white border border-[#D7DDD6] rounded-2xl p-5 mb-5"
          >

            {/* HEADER */}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">

              <div>

                <h3 className="text-lg font-bold text-gray-900">
                  Detailed Risk Assessment
                </h3>

                <p className="text-[15px] text-gray-600 mt-1">
                  Review individual firewall events
                  and their generated risk assessment.
                </p>

              </div>

              <div className="text-[15px] text-gray-600">

                Showing{' '}

                <span className="font-bold text-gray-900">
                  {pageStart}
                </span>

                {' – '}

                <span className="font-bold text-gray-900">
                  {pageEnd}
                </span>

                {' of '}

                <span className="font-bold text-gray-900">
                  {detailed.length.toLocaleString()}
                </span>

                {' records'}

              </div>

            </div>

            {/* TABLE */}

            <div className="overflow-x-auto border border-gray-200 rounded-xl">

              <table className="w-full text-base">

                <thead>

                  <tr className="bg-[#F5F7F3] border-b border-gray-200">

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      #
                    </th>

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Risk Score
                    </th>

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Risk Level
                    </th>

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Confidence
                    </th>

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Impact
                    </th>

                    <th className="px-5 py-4 text-left !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Prediction
                    </th>

                    <th className="px-5 py-4 text-right !text-[18px] !font-bold !leading-6 text-gray-800 whitespace-nowrap">
                      Details
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {paginatedRows.map(
                    (
                      row,
                      index
                    ) => {

                      const globalIndex =
                        (currentPage -
                          1) *
                          rowsPerPage +
                        index +
                        1

                      const confidence =
                        Number(
                          row.probability ??
                            row.likelihood ??
                            0
                        ) * 100

                      return (

                        <tr
                          key={
                            globalIndex
                          }
                          onClick={() =>
                            setSelectedRow(
                              row
                            )
                          }
                          className="border-b border-gray-100 hover:bg-[#F8FAF7] cursor-pointer transition-colors"
                        >

                          {/* NUMBER */}

                          <td className="px-5 py-4 text-base text-gray-600 font-semibold">
                            {globalIndex}
                          </td>

                          {/* RISK SCORE */}

                          <td className="px-5 py-4">

                            <span className="text-lg font-bold text-gray-900">
                              {Number(
                                row.risk_score
                              ).toFixed(
                                2
                              )}
                            </span>

                            <span className="text-sm text-gray-400 ml-1">
                              /100
                            </span>

                          </td>

                          {/* RISK LEVEL */}

                          <td className="px-5 py-4">

                            <RiskLevelBadge
                              level={
                                row.risk_level
                              }
                            />

                          </td>

                          {/* CONFIDENCE */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">

                                <div
                                  className="h-full bg-[#3E522C] rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      confidence
                                    )}%`,
                                  }}
                                />

                              </div>

                              <span className="text-base font-semibold text-gray-700 whitespace-nowrap">
                                {confidence.toFixed(
                                  1
                                )}
                                %
                              </span>

                            </div>

                          </td>

                          {/* IMPACT */}

                          <td className="px-5 py-4 text-base text-gray-700 font-semibold">
                            {Number(
                              row.impact ??
                                0
                            ).toFixed(
                              2
                            )}
                          </td>

                          {/* PREDICTION */}

                          <td className="px-5 py-4">

                            <PredictionBadge
                              value={
                                row.predicted_label
                              }
                            />

                          </td>

                          {/* DETAILS */}

                          <td className="px-5 py-4 text-right">

                            <button
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation()

                                setSelectedRow(
                                  row
                                )
                              }}
                              className="text-base font-semibold text-[#3E522C] hover:underline"
                            >
                              View
                            </button>

                          </td>

                        </tr>

                      )
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* ==================================================
                PAGINATION
            ================================================== */}

            {totalPages >
              1 && (

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">

                <p className="text-[15px] text-gray-600">

                  Page{' '}

                  <span className="font-bold text-gray-900">
                    {currentPage}
                  </span>

                  {' of '}

                  <span className="font-bold text-gray-900">
                    {totalPages}
                  </span>

                </p>

                <div className="flex items-center gap-1">

                  {/* PREVIOUS */}

                  <button
                    onClick={() =>
                      goToPage(
                        currentPage -
                          1
                      )
                    }
                    disabled={
                      currentPage ===
                      1
                    }
                    className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    <ChevronLeft
                      size={17}
                    />

                    Previous

                  </button>

                  {/* PAGE NUMBERS */}

                  <div className="flex items-center gap-1 mx-2">

                    {getPageNumbers(
                      currentPage,
                      totalPages
                    ).map(
                      (
                        page,
                        index
                      ) =>
                        page ===
                        '...' ? (

                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-[15px] text-gray-400"
                          >
                            ...
                          </span>

                        ) : (

                          <button
                            key={
                              page
                            }
                            onClick={() =>
                              goToPage(
                                page
                              )
                            }
                            className={`w-10 h-10 text-sm font-semibold rounded-lg ${
                              currentPage ===
                              page
                                ? 'bg-[#3E522C] text-white'
                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>

                        )
                    )}

                  </div>

                  {/* NEXT */}

                  <button
                    onClick={() =>
                      goToPage(
                        currentPage +
                          1
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    Next

                    <ChevronRight
                      size={17}
                    />

                  </button>

                </div>

              </div>

            )}

            <p className="text-[13px] text-gray-500 mt-4">
              Click any record to view its complete
              risk assessment details. Export Results
              contains the complete dataset.
            </p>

          </div>

          {/* ==================================================
              SELECTED RECORD MODAL
          ================================================== */}

          {selectedRow && (

            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">

              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto">

                {/* MODAL HEADER */}

                <div className="flex items-center justify-between p-6 border-b">

                  <div>

                    <h3 className="text-xl font-bold text-gray-900">
                      Risk Assessment Detail
                    </h3>

                    <p className="text-[15px] text-gray-600 mt-1">
                      Detailed analytical output for
                      the selected firewall event.
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setSelectedRow(
                        null
                      )
                    }
                    className="p-2.5 rounded-lg hover:bg-gray-100"
                  >
                    <X size={21} />
                  </button>

                </div>

                {/* MODAL CONTENT */}

                <div className="p-6">

                  {/* SCORE */}

                  <div className="bg-[#F5F7F3] rounded-2xl p-6 text-center mb-5">

                    <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                      Generated Risk Score
                    </p>

                    <p className="text-5xl font-bold text-[#1F2A1A] mt-3">
                      {Number(
                        selectedRow.risk_score
                      ).toFixed(
                        2
                      )}
                    </p>

                    <p className="text-[15px] text-gray-500 mt-1">
                      out of 100
                    </p>

                    <div className="mt-4">

                      <RiskLevelBadge
                        level={
                          selectedRow.risk_level
                        }
                        large
                      />

                    </div>

                  </div>

                  {/* ANALYTICAL VALUES */}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                    <DetailItem
                      label="Risk Score"
                      value={Number(
                        selectedRow.risk_score
                      ).toFixed(
                        2
                      )}
                    />

                    <DetailItem
                      label="Risk Level"
                      value={
                        selectedRow.risk_level
                      }
                    />

                    <DetailItem
                      label="Confidence"
                      value={`${(
                        Number(
                          selectedRow.probability ??
                            selectedRow.likelihood ??
                            0
                        ) * 100
                      ).toFixed(
                        1
                      )}%`}
                    />

                    <DetailItem
                      label="Impact"
                      value={Number(
                        selectedRow.impact ??
                          0
                      ).toFixed(
                        2
                      )}
                    />

                    <DetailItem
                      label="Likelihood"
                      value={Number(
                        selectedRow.likelihood ??
                          0
                      ).toFixed(
                        3
                      )}
                    />

                    <DetailItem
                      label="Prediction"
                      value={
                        selectedRow.predicted_label ===
                        1
                          ? 'Suspicious'
                          : selectedRow.predicted_label ===
                            0
                          ? 'Normal'
                          : 'Unknown'
                      }
                    />

                  </div>

                  {/* EVENT DATA */}

                  <div className="mt-6">

                    <h4 className="text-base font-bold mb-3">
                      Event Data
                    </h4>

                    <div className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-auto">

                      <div className="space-y-3">

                        {Object.entries(
                          selectedRow
                        )
                          .filter(
                            ([
                              key,
                            ]) =>
                              ![
                                'risk_score',
                                'risk_level',
                                'impact',
                                'likelihood',
                                'probability',
                                'predicted_label',
                              ].includes(
                                key
                              )
                          )
                          .slice(
                            0,
                            20
                          )
                          .map(
                            ([
                              key,
                              value,
                            ]) => (

                              <div
                                key={
                                  key
                                }
                                className="flex justify-between gap-5 border-b border-gray-200 pb-2 text-[15px]"
                              >

                                <span className="text-gray-600 font-semibold">
                                  {key}
                                </span>

                                <span className="text-gray-900 text-right break-all">
                                  {String(
                                    value ??
                                      '-'
                                  )}
                                </span>

                              </div>

                            )
                          )}

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          )}

        </>

      )}

    </div>
  )
}

/* ============================================================
   SUMMARY TILE
============================================================ */

function SummaryTile({
  label,
  value,
  color,
}) {
  return (
    <div
      className={`${color} text-white rounded-xl p-4`}
    >

      <p className="text-xs uppercase tracking-wide text-white/80 font-medium">
        {label}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

    </div>
  )
}

/* ============================================================
   RISK GAUGE
============================================================ */

function RiskGauge({
  value,
}) {
  const safeValue =
    Math.min(
      100,
      Math.max(
        0,
        Number(value) ||
          0
      )
    )

  const data = [
    {
      name: 'Score',
      value:
        safeValue,
    },
    {
      name: 'Remaining',
      value:
        100 -
        safeValue,
    },
  ]

  return (
    <div className="relative w-56 h-56">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={72}
            outerRadius={88}
            paddingAngle={1}
          >

            <Cell fill="#3E522C" />

            <Cell fill="#E5E7EB" />

          </Pie>

        </PieChart>

      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center">

        <p className="text-4xl font-bold text-gray-900">
          {safeValue.toFixed(
            1
          )}
        </p>

        <p className="text-sm text-gray-500 mt-1">
          / 100
        </p>

      </div>

    </div>
  )
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <div>

      <h3 className="text-lg font-bold text-gray-900">
        {title}
      </h3>

      <p className="text-[15px] text-gray-600 mt-1">
        {subtitle}
      </p>

    </div>
  )
}

/* ============================================================
   ANALYSIS PANEL
============================================================ */

function AnalysisPanel({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="bg-white border border-[#D7DDD6] rounded-2xl p-5">

      <SectionHeader
        title={title}
        subtitle={subtitle}
      />

      <div className="mt-4">
        {children}
      </div>

    </div>
  )
}

/* ============================================================
   MINI INSIGHT
============================================================ */

function MiniInsight({
  label,
  value,
}) {
  return (
    <div className="bg-[#F5F7F3] rounded-xl p-3.5">

      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {label}
      </p>

      <p className="text-[15px] font-bold text-gray-900 mt-1.5">
        {value}
      </p>

    </div>
  )
}

/* ============================================================
   INSIGHT BOX
============================================================ */

function InsightBox({
  title,
  value,
  description,
}) {
  return (
    <div className="border border-[#D7DDD6] rounded-xl p-4">

      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {title}
      </p>

      <p className="text-2xl font-bold text-gray-900 mt-2">
        {value}
      </p>

      <p className="text-[15px] text-gray-600 leading-5 mt-2">
        {description}
      </p>

    </div>
  )
}

/* ============================================================
   DETAIL ITEM
============================================================ */

function DetailItem({
  label,
  value,
}) {
  return (
    <div className="bg-[#F5F7F3] rounded-xl p-4">

      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {label}
      </p>

      <p className="text-[15px] font-bold text-gray-900 mt-2">
        {String(value)}
      </p>

    </div>
  )
}

/* ============================================================
   RISK LEVEL BADGE
============================================================ */

function RiskLevelBadge({
  level,
  large = false,
}) {
  const styles = {
    Critical:
      'bg-red-100 text-red-700 border-red-200',

    High:
      'bg-orange-100 text-orange-700 border-orange-200',

    Medium:
      'bg-yellow-100 text-yellow-700 border-yellow-200',

    Low:
      'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <span
      className={`inline-flex items-center ${
        large
          ? 'px-4 py-2 text-sm'
          : 'px-3 py-1.5 text-sm'
      } rounded-full font-bold border ${
        styles[level] ||
        'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      {level ||
        'Unknown'}
    </span>
  )
}

/* ============================================================
   PREDICTION BADGE
============================================================ */

function PredictionBadge({
  value,
}) {
  if (value === 1) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-100">
        Suspicious
      </span>
    )
  }

  if (value === 0) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-100">
        Normal
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      Unknown
    </span>
  )
}

/* ============================================================
   PAGINATION NUMBERS
============================================================ */

function getPageNumbers(
  currentPage,
  totalPages
) {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (_, i) =>
        i + 1
    )
  }

  if (
    currentPage <= 4
  ) {
    return [
      1,
      2,
      3,
      4,
      5,
      '...',
      totalPages,
    ]
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      '...',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ]
}

/* ============================================================
   MATH HELPERS
============================================================ */

function mean(
  array
) {
  return array.length
    ? array.reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      ) /
        array.length
    : 0
}

function quantile(
  array,
  q
) {
  if (!array.length) {
    return 0
  }

  const sorted =
    [...array].sort(
      (a, b) =>
        a - b
    )

  const index = Math.min(
    sorted.length - 1,
    Math.floor(
      q *
        (sorted.length - 1)
    )
  )

  return sorted[
    index
  ]
}

function n1(
  value
) {
  return Number(
    value || 0
  ).toFixed(1)
}

function pct(
  numerator,
  denominator
) {
  return denominator
    ? (
        (numerator /
          denominator) *
        100
      ).toFixed(1)
    : '0.0'
}

function formatNumber(
  value
) {
  if (
    value ===
      undefined ||
    value === null ||
    value === ''
  ) {
    return '-'
  }

  const number =
    Number(value)

  if (
    Number.isNaN(
      number
    )
  ) {
    return String(
      value
    )
  }

  return number.toFixed(
    2
  )
}

export default RiskScoring