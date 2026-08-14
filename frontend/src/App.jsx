import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Shield, FileText, AlertTriangle,
  BarChart3, Settings, Upload, Bell, Activity, TrendingUp, Moon, Sun, Download
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import audixaLogo from './assets/g.png'

function App() {
  const [activeTab, setActiveTab] = useState('risk-scoring')
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [detailed, setDetailed] = useState([])
  const [loading, setLoading] = useState(false)
  const [riskDistribution, setRiskDistribution] = useState([])
  const [darkMode, setDarkMode] = useState(false)

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('audixa-dark-mode')
    if (saved === 'true') setDarkMode(true)
  }, [])

  // Save preference
  useEffect(() => {
    localStorage.setItem('audixa-dark-mode', darkMode)
  }, [darkMode])

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleAnalyze = async () => {
    if (!file) return alert('Please upload a CSV file first')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Analysis failed')
      }

      const data = await response.json()
      const summary = data.summary
      setResults(summary)
      setDetailed(data.detailed || [])

      const total = summary.total || 1
      setRiskDistribution([
        { name: 'Critical', value: Math.round((summary.critical / total) * 100), count: summary.critical, color: '#DC2626' },
        { name: 'High', value: Math.round((summary.high / total) * 100), count: summary.high, color: '#EA580C' },
        { name: 'Medium', value: Math.round((summary.medium / total) * 100), count: summary.medium, color: '#CA8A04' },
        { name: 'Low', value: Math.round((summary.low / total) * 100), count: summary.low, color: '#16A34A' },
      ])
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ========== EXPORT FULL AUDIT LOG + RISK SCORES ==========
  const handleExport = () => {
    if (!detailed || detailed.length === 0) {
      alert('No results to export. Please analyze a file first.')
      return
    }

    // Use ALL columns from the detailed results (original log fields + risk scores)
    const headers = Object.keys(detailed[0])

    const csvRows = [
      headers.join(','),
      ...detailed.map(row =>
        headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return ''
          // Escape quotes and wrap in quotes for CSV safety
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        }).join(',')
      )
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'audixa_full_audit_log_with_risk_scores.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const barData = riskDistribution.map(item => ({
    name: item.name,
    count: item.count
  }))

  const highRiskRows = detailed
    .filter(row => row.risk_level === 'Critical' || row.risk_level === 'High')
    .slice(0, 15)

  // Theme classes
  const bgMain = darkMode ? 'bg-[#0F1410]' : 'bg-[#F4F5F7]'
  const bgCard = darkMode ? 'bg-[#1A2218]' : 'bg-white'
  const borderColor = darkMode ? 'border-[#2A3526]' : 'border-gray-200'
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900'
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500'
  const headerBg = darkMode ? 'bg-[#1A2218]' : 'bg-white'

  return (
    <div className={`flex h-screen ${bgMain} ${textPrimary} font-sans transition-colors duration-300`}>
      
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-[#1F2A1A] text-white flex flex-col shadow-xl">
        <div className="bg-white px-4 py-4 flex items-center justify-center border-b border-gray-200">
          <img
            src={audixaLogo}
            alt="Audixa Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <NavItem icon={<LayoutDashboard size={17} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Shield size={17} />} label="Risk Scoring" active={activeTab === 'risk-scoring'} onClick={() => setActiveTab('risk-scoring')} />
          <NavItem icon={<FileText size={17} />} label="Log Classification" active={activeTab === 'log-classification'} onClick={() => setActiveTab('log-classification')} />
          <NavItem icon={<BarChart3 size={17} />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <NavItem icon={<AlertTriangle size={17} />} label="Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          <NavItem icon={<Settings size={17} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="px-5 py-4 text-[11px] text-gray-500 border-t border-[#2E3B28]">
          Component 2 • R26-CS-004
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className={`h-16 ${headerBg} border-b ${borderColor} flex items-center justify-between px-8 shadow-sm transition-colors`}>
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Risk Scoring Engine</h2>
            <p className={`text-xs ${textSecondary}`}>Intelligent Firewall Log Risk Analysis • Audixa</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${darkMode ? 'bg-[#2A3526] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              Risk = Probability × Impact × 100
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition ${darkMode ? 'bg-[#2A3526] text-yellow-400 hover:bg-[#354230]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Bell size={18} className={textSecondary} />
            <div className="w-8 h-8 rounded-full bg-[#4A5C2E] flex items-center justify-center text-white text-sm font-semibold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-7">
          {activeTab === 'risk-scoring' && (
            <>
              {/* Upload Section */}
              <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm p-5 mb-6 transition-colors`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className={`font-semibold ${textPrimary} flex items-center gap-2`}>
                      <Upload size={18} className="text-[#4A5C2E]" />
                      Upload Firewall Log
                    </h3>
                    <p className={`text-sm ${textSecondary} mt-1`}>
                      Upload a processed CSV to generate risk scores using the trained model
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className={`text-sm ${textSecondary} file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#E8EDE0] file:text-[#1F2A1A] hover:file:bg-[#D5DEC8]`}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="px-5 py-2.5 bg-[#4A5C2E] hover:bg-[#3A4A24] text-white text-sm font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                      {loading ? 'Analyzing...' : 'Analyze Risk'}
                    </button>
                  </div>
                </div>
              </div>

              {results ? (
                <>
                  {/* Metric Cards */}
                  <div className="grid grid-cols-4 gap-5 mb-6">
                    <MetricCard title="Total Logs" value={results.total.toLocaleString()} subtitle="Processed records" color="bg-[#4A5C2E]" />
                    <MetricCard title="Critical Risk" value={results.critical} subtitle={`${((results.critical / results.total) * 100).toFixed(1)}% of total`} color="bg-[#DC2626]" />
                    <MetricCard title="High Risk" value={results.high} subtitle={`${((results.high / results.total) * 100).toFixed(1)}% of total`} color="bg-[#EA580C]" />
                    <MetricCard title="Low + Medium" value={(results.low + results.medium).toLocaleString()} subtitle="Acceptable risk range" color="bg-[#15803D]" />
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm p-6 transition-colors`}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>Risk Level Distribution</h3>
                        <Activity size={16} className={textSecondary} />
                      </div>
                      <p className={`text-sm ${textSecondary} mb-4`}>Percentage breakdown of risk categories</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-5 mt-2 flex-wrap">
                        {riskDistribution.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-sm">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className={textSecondary}>{item.name}</span>
                            <span className={`font-semibold ${textPrimary}`}>{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm p-6 transition-colors`}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>Risk Count by Level</h3>
                        <TrendingUp size={16} className={textSecondary} />
                      </div>
                      <p className={`text-sm ${textSecondary} mb-4`}>Number of logs in each risk category</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#2A3526' : '#E5E7EB'} />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }} />
                          <YAxis tick={{ fontSize: 12, fill: darkMode ? '#9CA3AF' : '#6B7280' }} />
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1A2218' : '#fff', borderColor: darkMode ? '#2A3526' : '#E5E7EB' }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {barData.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={riskDistribution[index]?.color || '#4A5C2E'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Insights + Table */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className={`${bgCard} rounded-xl border ${borderColor} shadow-sm p-6 transition-colors`}>
                      <h3 className={`font-semibold ${textPrimary} mb-1`}>Analysis Insights</h3>
                      <p className={`text-sm ${textSecondary} mb-5`}>Key findings from this scan</p>
                      <div className="space-y-4">
                        <InsightRow label="Model Used" value="Random Forest (Tuned)" darkMode={darkMode} />
                        <InsightRow label="Scoring Formula" value="Prob × Impact × 100" darkMode={darkMode} />
                        <InsightRow label="Explainability" value="SHAP + Permutation" darkMode={darkMode} />
                        <InsightRow label="Critical Threshold" value="Score ≥ 80" darkMode={darkMode} />
                        <InsightRow label="High Threshold" value="Score 60 – 79" darkMode={darkMode} />
                        <InsightRow label="Total High+Critical" value={results.critical + results.high} darkMode={darkMode} />
                      </div>
                    </div>

                    <div className={`col-span-2 ${bgCard} rounded-xl border ${borderColor} shadow-sm p-6 transition-colors`}>
                      <h3 className={`font-semibold ${textPrimary} mb-1`}>High & Critical Risk Logs</h3>
                      <p className={`text-sm ${textSecondary} mb-4`}>Top records requiring attention</p>
                      {highRiskRows.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className={`border-b ${borderColor} text-left ${textSecondary}`}>
                                <th className="pb-3 font-medium">#</th>
                                <th className="pb-3 font-medium">Probability</th>
                                <th className="pb-3 font-medium">Impact</th>
                                <th className="pb-3 font-medium">Risk Score</th>
                                <th className="pb-3 font-medium">Level</th>
                              </tr>
                            </thead>
                            <tbody>
                              {highRiskRows.map((row, idx) => (
                                <tr key={idx} className={`border-b ${borderColor} last:border-0`}>
                                  <td className={`py-2.5 ${textSecondary}`}>{idx + 1}</td>
                                  <td className="py-2.5">{Number(row.probability).toFixed(4)}</td>
                                  <td className="py-2.5">{Number(row.impact).toFixed(4)}</td>
                                  <td className="py-2.5 font-semibold">{Number(row.risk_score).toFixed(2)}</td>
                                  <td className="py-2.5">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                      row.risk_level === 'Critical'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {row.risk_level}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className={`text-center py-10 ${textSecondary} text-sm`}>
                          No High or Critical records in the returned sample
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Mode + Download Button */}
                  <div className="flex items-center justify-between bg-[#E8EDE0] rounded-xl px-5 py-3.5 text-sm text-[#1F2A1A]">
                    <div className="flex items-center gap-2">
                      <Shield size={16} />
                      <span>
                        <strong>Live Mode:</strong> Results generated by your trained model. 
                        Download includes full original log fields + risk scores.
                      </span>
                    </div>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4A5C2E] hover:bg-[#3A4A24] text-white text-sm font-medium rounded-lg transition"
                    >
                      <Download size={16} />
                      Download Full Audit Log with Risk Scores
                    </button>
                  </div>
                </>
              ) : (
                <div className={`flex flex-col items-center justify-center py-28 ${textSecondary}`}>
                  <div className={`w-20 h-20 rounded-full ${darkMode ? 'bg-[#1A2218]' : 'bg-gray-100'} flex items-center justify-center mb-5`}>
                    <Shield size={36} className="opacity-40" />
                  </div>
                  <p className={`text-lg font-medium ${textPrimary}`}>No analysis yet</p>
                  <p className="text-sm mt-1">Upload a processed firewall log CSV to begin risk scoring</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'dashboard' && (
            <Placeholder title="Dashboard Overview" desc="Overall system summary will appear here" icon={<LayoutDashboard size={48} />} darkMode={darkMode} />
          )}

          {activeTab !== 'risk-scoring' && activeTab !== 'dashboard' && (
            <Placeholder
              title={activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              desc="This module is under development"
              icon={<Settings size={48} />}
              darkMode={darkMode}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all ${
        active
          ? 'bg-[#4A5C2E] text-white font-medium'
          : 'text-gray-300 hover:bg-[#2E3B28] hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

function MetricCard({ title, value, subtitle, color }) {
  return (
    <div className={`${color} text-white rounded-xl p-5 shadow-sm`}>
      <p className="text-sm opacity-90 mb-1">{title}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-xs opacity-80 mt-2">{subtitle}</p>
    </div>
  )
}

function InsightRow({ label, value, darkMode }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-0 ${darkMode ? 'border-[#2A3526]' : 'border-gray-100'}`}>
      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

function Placeholder({ title, desc, icon, darkMode }) {
  return (
    <div className={`flex flex-col items-center justify-center py-32 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
      <div className="opacity-40 mb-4">{icon}</div>
      <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : ''}`}>{title}</p>
      <p className="text-sm mt-1">{desc}</p>
    </div>
  )
}

export default App