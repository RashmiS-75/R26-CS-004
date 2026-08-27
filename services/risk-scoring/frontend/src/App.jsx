import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Shield, FileText, AlertTriangle,
  BarChart3, Settings, Upload, Bell, Moon, Sun
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ScatterChart, Scatter, LineChart, Line
} from 'recharts'
import audixaLogo from './assets/g.png'

const RANGE_COLORS = ['#16A34A', '#84CC16', '#EAB308', '#EA580C', '#DC2626']

function App() {
  const [activeTab, setActiveTab] = useState('risk-scoring')
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [detailed, setDetailed] = useState([])
  const [loading, setLoading] = useState(false)
  const [scoreBuckets, setScoreBuckets] = useState([])
  const [riskDistribution, setRiskDistribution] = useState([])
  const [priorityMix, setPriorityMix] = useState([])
  const [heat, setHeat] = useState([])
  const [scatterData, setScatterData] = useState([])
  const [lineData, setLineData] = useState([])
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('audixa-dark-mode') === 'true') setDarkMode(true)
  }, [])
  useEffect(() => {
    localStorage.setItem('audixa-dark-mode', darkMode)
  }, [darkMode])

  const handleAnalyze = async () => {
    if (!file) return alert('Please upload a firewall log CSV first')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://127.0.0.1:8000/analyze', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed')
      const data = await res.json()
      const summary = data.summary || {}
      const rows = (data.detailed || []).map((r) => ({
        ...r,
        predicted_label: Number(r.predicted_label ?? -1),
        likelihood: Number(r.likelihood ?? r.probability ?? 0),
        probability: Number(r.probability ?? r.likelihood ?? 0),
        impact: Number(r.impact ?? 0),
        risk_score: Number(r.risk_score ?? 0),
        risk_level: r.risk_level || 'Low',
      }))

      const scores = rows.map((r) => r.risk_score)
      const avg = mean(scores)
      const maxScore = scores.length ? Math.max(...scores) : 0
      const minScore = scores.length ? Math.min(...scores) : 0
      const median = quantile(scores, 0.5)
      const p90 = quantile(scores, 0.9)
      const total = summary.total ?? rows.length
      const critical = summary.critical || 0
      const high = summary.high || 0
      const medium = summary.medium || 0
      const low = summary.low || 0
      const attention = critical + high
      const suspicious = rows.filter((r) => r.predicted_label === 1).length

      setResults({
        total,
        avgScore: n1(summary.avg_score ?? avg),
        maxScore: n1(summary.max_score ?? maxScore),
        minScore: n1(minScore),
        medianScore: n1(median),
        p90: n1(p90),
        critical, high, medium, low, attention, suspicious,
        coverageHigh: pct(attention, total),
      })
      setDetailed(rows)

      const buckets = [
        { range: '0–20', min: 0, max: 20 },
        { range: '20–40', min: 20, max: 40 },
        { range: '40–60', min: 40, max: 60 },
        { range: '60–80', min: 60, max: 80 },
        { range: '80–100', min: 80, max: 101 },
      ]

      setScoreBuckets(buckets.map((b, i) => ({
        range: b.range,
        count: rows.filter((r) => r.risk_score >= b.min && r.risk_score < b.max).length,
        color: RANGE_COLORS[i],
      })))

      setPriorityMix(buckets.map((b) => {
        const inRange = rows.filter((r) => r.risk_score >= b.min && r.risk_score < b.max)
        return {
          range: b.range,
          Low: inRange.filter((r) => r.risk_level === 'Low').length,
          Medium: inRange.filter((r) => r.risk_level === 'Medium').length,
          High: inRange.filter((r) => r.risk_level === 'High').length,
          Critical: inRange.filter((r) => r.risk_level === 'Critical').length,
        }
      }))

      setRiskDistribution([
        { name: 'Critical', value: critical, color: '#DC2626' },
        { name: 'High', value: high, color: '#EA580C' },
        { name: 'Medium', value: medium, color: '#CA8A04' },
        { name: 'Low', value: low, color: '#16A34A' },
      ])

      setHeat(buckets.map((b) => {
        const inRange = rows.filter((r) => r.risk_score >= b.min && r.risk_score < b.max)
        return {
          range: b.range,
          Suspicious: inRange.filter((r) => r.predicted_label === 1).length,
          Normal: inRange.filter((r) => r.predicted_label === 0).length,
        }
      }))

      const sample = rows.filter((_, i) => i % 12 === 0).slice(0, 400)
      setScatterData(sample.map((r) => ({
        x: Number((r.probability ?? r.likelihood ?? 0).toFixed(3)),
        y: Number(r.risk_score.toFixed(2)),
      })))

      const sorted = [...rows].sort((a, b) => a.risk_score - b.risk_score)
      const step = Math.max(1, Math.floor(sorted.length / 50))
      let running = 0
      const line = []
      sorted.forEach((r, idx) => {
        running += r.risk_score
        if (idx % step === 0 || idx === sorted.length - 1) {
          line.push({
            point: line.length + 1,
            risk: Number(r.risk_score.toFixed(2)),
            avg: Number((running / (idx + 1)).toFixed(2)),
          })
        }
      })
      setLineData(line)
    } catch {
      alert('Unable to analyse this file. Please upload a valid firewall log CSV.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!detailed.length) return alert('No results to export')
    const engine = ['predicted_label', 'probability', 'likelihood', 'impact', 'risk_score', 'risk_level']
    const original = Object.keys(detailed[0]).filter((k) => !engine.includes(k))
    const headers = [...original, 'predicted_label', 'probability', 'impact', 'risk_score', 'risk_level']
    const csv = [
      headers.join(','),
      ...detailed.map((row) =>
        headers.map((h) => `"${String((h === 'probability' ? (row.probability ?? row.likelihood) : row[h]) ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audixa_firewall_risk_report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const bgMain = darkMode ? 'bg-[#07110C]' : 'bg-[#EEF1EC]'
  const bgCard = darkMode ? 'bg-[#122017]' : 'bg-white'
  const border = darkMode ? 'border-[#1F2E24]' : 'border-[#D7DDD6]'
  const text = darkMode ? 'text-gray-100' : 'text-gray-900'
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500'
  const gauge = results ? Math.min(100, Number(results.avgScore)) : 0

  return (
    <div className={`flex h-screen ${bgMain} ${text} font-sans`}>
      <aside className="w-56 bg-[#101A14] text-white flex flex-col">
        <div className="bg-white px-3 py-3 flex justify-center">
          <img src={audixaLogo} alt="Audixa" className="h-10 object-contain" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<LayoutDashboard size={16} />} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Shield size={16} />} label="Risk Scoring" active={activeTab === 'risk-scoring'} onClick={() => setActiveTab('risk-scoring')} />
          <NavItem icon={<FileText size={16} />} label="Log Review" onClick={() => setActiveTab('logs')} />
          <NavItem icon={<BarChart3 size={16} />} label="Reports" onClick={() => setActiveTab('reports')} />
          <NavItem icon={<AlertTriangle size={16} />} label="Alerts" onClick={() => setActiveTab('alerts')} />
          <NavItem icon={<Settings size={16} />} label="Settings" onClick={() => setActiveTab('settings')} />
        </nav>
      </aside>

      <div className="flex-1 overflow-hidden flex flex-col">
        <header className={`h-16 ${bgCard} border-b ${border} px-5 flex items-center justify-between`}>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">FIREWALL RISK ENGINE</h1>
            <p className={`text-[11px] ${muted}`}>Operational risk scoring and audit exposure view</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-md ${darkMode ? 'bg-[#1F2E24]' : 'bg-gray-100'}`}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Bell size={15} className={muted} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {activeTab !== 'risk-scoring' ? (
            <p className={muted}>Reserved workspace section</p>
          ) : (
            <>
              <div className={`${bgCard} border ${border} rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex items-center gap-2 text-sm font-medium"><Upload size={15} /> Log Intake</div>
                <div className="flex items-center gap-2">
                  <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className={`text-xs ${muted}`} />
                  <button onClick={handleAnalyze} disabled={loading} className="px-3 py-2 text-xs rounded-md bg-[#3E522C] text-white">
                    {loading ? 'Processing...' : 'Run Risk Assessment'}
                  </button>
                  <button onClick={handleExport} className="px-3 py-2 text-xs rounded-md border border-[#3E522C] text-[#3E522C]">
                    Export CSV
                  </button>
                </div>
              </div>

              {!results ? (
                <p className={`text-sm ${muted}`}>Upload a firewall log CSV to populate the control center.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-4">
                    <Tile label="Risk Index" value={results.avgScore} color="bg-[#3E522C]" />
                    <Tile label="Peak Risk" value={results.maxScore} color="bg-[#7F1D1D]" />
                    <Tile label="90th Percentile" value={results.p90} color="bg-[#9A3412]" />
                    <Tile label="Median" value={results.medianScore} color="bg-[#1F3B2C]" />
                    <Tile label="Attention Load" value={`${results.coverageHigh}%`} color="bg-[#7C2D12]" />
                    <Tile label="Logs Assessed" value={Number(results.total).toLocaleString()} color="bg-[#374151]" />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">RISK INDEX GAUGE</p>
                      <div className="h-28 flex items-end gap-1">
                        {[0, 20, 40, 60, 80, 100].map((x) => (
                          <div key={x} className="flex-1 rounded-t" style={{
                            height: `${20 + x * 0.7}%`,
                            background: gauge >= x ? (x >= 80 ? '#DC2626' : x >= 60 ? '#EA580C' : x >= 40 ? '#EAB308' : '#16A34A') : (darkMode ? '#1F2E24' : '#E5E7EB')
                          }} />
                        ))}
                      </div>
                      <p className="text-3xl font-bold mt-3">{results.avgScore}</p>
                      <p className={`text-xs ${muted}`}>Current batch risk index</p>
                    </div>

                    <div className={`xl:col-span-2 ${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">RISK SCORE DISTRIBUTION</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={scoreBuckets}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count">
                            {scoreBuckets.map((e, i) => <Cell key={i} fill={e.color || RANGE_COLORS[i]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">PRIORITY REGISTER</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={riskDistribution} dataKey="value" innerRadius={34} outerRadius={52}>
                            {riskDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      {riskDistribution.map((x) => (
                        <div key={x.name} className="flex justify-between text-xs py-0.5"><span>{x.name}</span><b>{x.value}</b></div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">SCORE x PRIORITY HEATMAP</p>
                      <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={priorityMix}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Low" stackId="a" fill="#16A34A" />
                          <Bar dataKey="Medium" stackId="a" fill="#CA8A04" />
                          <Bar dataKey="High" stackId="a" fill="#EA580C" />
                          <Bar dataKey="Critical" stackId="a" fill="#DC2626" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">SUSPICIOUS EXPOSURE MAP</p>
                      <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={heat}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Suspicious" stackId="a" fill="#7F1D1D" />
                          <Bar dataKey="Normal" stackId="a" fill="#3E522C" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">RISK vs CONFIDENCE SCATTER</p>
                      <ResponsiveContainer width="100%" height={230}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" dataKey="x" name="Confidence" domain={[0, 1]} tick={{ fontSize: 11 }} />
                          <YAxis type="number" dataKey="y" name="Risk Score" domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter data={scatterData} fill="#EA580C" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                      <p className="text-xs font-semibold mb-2">RISK TREND LINE</p>
                      <ResponsiveContainer width="100%" height={230}>
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="point" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="risk" stroke="#DC2626" dot={false} name="Risk score" />
                          <Line type="monotone" dataKey="avg" stroke="#3E522C" dot={false} name="Running average" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`${bgCard} border ${border} rounded-lg p-4`}>
                    <p className="text-xs font-semibold mb-3">CONTROL INSIGHTS</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <Note text={`Risk index ${results.avgScore} | median ${results.medianScore} | peak ${results.maxScore}`} />
                      <Note text={`${results.attention} events in High/Critical follow-up queue`} />
                      <Note text={`${results.suspicious} logs flagged as suspicious`} />
                      <Note text={`90th percentile score ${results.p90} indicates upper-tail exposure`} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }
function quantile(a, q) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]
}
function n1(v) { return Number(v || 0).toFixed(1) }
function pct(n, d) { return d ? ((n / d) * 100).toFixed(1) : 0 }

function Tile({ label, value, color }) {
  return (
    <div className={`${color} text-white rounded-lg p-3`}>
      <p className="text-[10px] uppercase tracking-wide text-white/80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
function Note({ text }) {
  return <div className="bg-[#F3F4F6] rounded-md px-3 py-2 text-gray-700">{text}</div>
}
function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer ${active ? 'bg-[#3E522C] text-white' : 'text-gray-300 hover:bg-[#1A261E]'}`}>
      {icon}<span>{label}</span>
    </div>
  )
}

export default App