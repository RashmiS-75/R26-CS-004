import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts'

const COLORS = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#16A34A',
  olive: '#3E522C',
}

export default function Dashboard({ user, darkMode }) {
  const [lastRisk, setLastRisk] = useState(null)
  const [riskHistory, setRiskHistory] = useState([])
  const [lastClass, setLastClass] = useState(null)
  const [classHistory, setClassHistory] = useState([])

  const bg = darkMode ? 'bg-[#1A2218]' : 'bg-white'
  const border = darkMode ? 'border-[#2A3526]' : 'border-gray-200'
  const text = darkMode ? 'text-gray-100' : 'text-gray-900'
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500'

  useEffect(() => {
    try {
      const saved = localStorage.getItem('audixa-last-risk')
      if (saved) setLastRisk(JSON.parse(saved))
    } catch {}

    fetch('http://127.0.0.1:8080/risk/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setRiskHistory(list)
        if (list[0]) setLastRisk((prev) => ({ ...prev, ...list[0] }))
      })
      .catch(() => {})

    fetch('http://127.0.0.1:8080/classify/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setClassHistory(list)
        if (list[0]) setLastClass(list[0])
      })
      .catch(() => {})
  }, [])

  const avgScore = lastRisk?.avgScore || lastRisk?.avg_score || lastRisk?.riskIndex || '-'
  const riskTotal = lastRisk?.total || lastRisk?.logsAssessed || 0
  const classTotal = lastClass?.total_logs || 0

  const riskMix = [
    { name: 'Critical', value: Number(lastRisk?.critical || 0), color: COLORS.critical },
    { name: 'High', value: Number(lastRisk?.high || 0), color: COLORS.high },
    { name: 'Medium', value: Number(lastRisk?.medium || 0), color: COLORS.medium },
    { name: 'Low', value: Number(lastRisk?.low || 0), color: COLORS.low },
  ]

  const classMix = [
    { name: 'High', value: Number(lastClass?.high_count || 0), color: COLORS.high },
    { name: 'Medium', value: Number(lastClass?.medium_count || 0), color: COLORS.medium },
    { name: 'Low', value: Number(lastClass?.low_count || 0), color: COLORS.low },
  ]

  const riskTrend = [...riskHistory].reverse().map((s, i) => ({
    run: i + 1,
    total: Number(s.total || 0),
    high: Number(s.high || 0),
    critical: Number(s.critical || 0),
  }))

  const classTrend = [...classHistory].reverse().map((s, i) => ({
    run: i + 1,
    high: Number(s.high_count || 0),
    medium: Number(s.medium_count || 0),
    low: Number(s.low_count || 0),
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={`text-2xl font-semibold ${text}`}>Audixa Control Center</h3>
          <p className={`text-sm ${muted} mt-1`}>
            Welcome, {user?.name}. Live overview from Risk Scoring and Log Classification.
          </p>
        </div>
        <div className="px-4 py-2 rounded-full bg-[#3E522C] text-white text-xs">
          Last update • {new Date().toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi title="Risk Index" value={avgScore} note={`${riskTotal} logs assessed`} color="bg-[#1F2A1A]" />
        <Kpi title="High + Critical" value={(Number(lastRisk?.critical || 0) + Number(lastRisk?.high || 0)).toLocaleString()} note="Risk follow-up queue" color="bg-[#7F1D1D]" />
        <Kpi title="Classification High" value={Number(lastClass?.high_count || 0).toLocaleString()} note={lastClass?.filename || 'No session'} color="bg-[#3E522C]" />
        <Kpi title="Classified Logs" value={Number(classTotal).toLocaleString()} note={`${classHistory.length} saved sessions`} color="bg-[#374151]" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`xl:col-span-2 ${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">RISK ASSESSMENT TREND</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={riskTrend.length ? riskTrend : [{ run: 1, total: 0, high: 0, critical: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="run" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#3E522C" fill="#3E522C33" name="Logs" />
              <Area type="monotone" dataKey="high" stroke="#EA580C" fill="#EA580C33" name="High" />
              <Area type="monotone" dataKey="critical" stroke="#DC2626" fill="#DC262633" name="Critical" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={`${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">LATEST RISK MIX</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={riskMix} dataKey="value" innerRadius={48} outerRadius={72}>
                {riskMix.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {riskMix.map((x) => (
            <div key={x.name} className="flex justify-between text-sm py-1">
              <span className={muted}>{x.name}</span>
              <b>{x.value}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">LATEST CLASSIFICATION MIX</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={classMix}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value">
                {classMix.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`xl:col-span-2 ${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">CLASSIFICATION SESSION TREND</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={classTrend.length ? classTrend : [{ run: 1, high: 0, medium: 0, low: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="run" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="high" stroke="#EA580C" fill="#EA580C33" name="High" />
              <Area type="monotone" dataKey="medium" stroke="#CA8A04" fill="#CA8A0433" name="Medium" />
              <Area type="monotone" dataKey="low" stroke="#16A34A" fill="#16A34A33" name="Low" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={`${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">LATEST RISK ASSESSMENT</p>
          <Row label="File / source" value={lastRisk?.filename || 'Current batch'} muted={muted} />
          <Row label="Logs assessed" value={riskTotal} muted={muted} />
          <Row label="Average score" value={avgScore} muted={muted} />
          <Row label="Critical" value={lastRisk?.critical ?? 0} muted={muted} />
          <Row label="High" value={lastRisk?.high ?? 0} muted={muted} />
        </div>
        <div className={`${bg} border ${border} rounded-2xl p-5`}>
          <p className="text-xs font-semibold mb-3">LATEST CLASSIFICATION SESSION</p>
          <Row label="File" value={lastClass?.filename || '-'} muted={muted} />
          <Row label="Total logs" value={lastClass?.total_logs ?? 0} muted={muted} />
          <Row label="High" value={lastClass?.high_count ?? 0} muted={muted} />
          <Row label="Medium" value={lastClass?.medium_count ?? 0} muted={muted} />
          <Row label="Low" value={lastClass?.low_count ?? 0} muted={muted} />
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value, note, color }) {
  return (
    <div className={`${color} text-white rounded-2xl p-5`}>
      <p className="text-[11px] uppercase tracking-wide text-white/75">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs mt-2 text-white/75">{note}</p>
    </div>
  )
}

function Row({ label, value, muted }) {
  return (
    <div className="flex justify-between py-2 border-b border-black/5 text-sm">
      <span className={muted}>{label}</span>
      <b>{value}</b>
    </div>
  )
}