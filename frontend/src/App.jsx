import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Shield, FileText, AlertTriangle,
  BarChart3, Settings, Bell, Moon, Sun
} from 'lucide-react'
import audixaLogo from './assets/g.png'
import BatchAnalysisPage from './features/log-classification/pages/BatchAnalysisPage'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('audixa-dark-mode')
    if (saved === 'true') setDarkMode(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('audixa-dark-mode', darkMode)
  }, [darkMode])

  const bgMain = darkMode ? 'bg-[#0F1410]' : 'bg-[#F4F5F7]'
  const bgCard = darkMode ? 'bg-[#1A2218]' : 'bg-white'
  const borderColor = darkMode ? 'border-[#2A3526]' : 'border-gray-200'
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900'
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500'
  const headerBg = darkMode ? 'bg-[#1A2218]' : 'bg-white'

  const pageTitle = {
    dashboard: 'Audixa Platform',
    'risk-scoring': 'Risk Scoring Engine',
    'log-classification': 'Log Classification Engine',
    reports: 'Reports',
    alerts: 'Alerts',
    settings: 'Settings',
  }

  const pageSubtitle = {
    dashboard: 'Firewall Audit Analytics • Shared System Shell',
    'risk-scoring': 'Intelligent Firewall Log Risk Analysis • Audixa',
    'log-classification': 'Firewall log classification module • Audixa',
    reports: 'System reports module • Audixa',
    alerts: 'Alerts and notifications • Audixa',
    settings: 'Platform configuration • Audixa',
  }

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
          <NavItem
            icon={<LayoutDashboard size={17} />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem
            icon={<Shield size={17} />}
            label="Risk Scoring"
            active={activeTab === 'risk-scoring'}
            onClick={() => setActiveTab('risk-scoring')}
          />
          <NavItem
            icon={<FileText size={17} />}
            label="Log Classification"
            active={activeTab === 'log-classification'}
            onClick={() => setActiveTab('log-classification')}
          />
          <NavItem
            icon={<BarChart3 size={17} />}
            label="Reports"
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
          />
          <NavItem
            icon={<AlertTriangle size={17} />}
            label="Alerts"
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
          />
          <NavItem
            icon={<Settings size={17} />}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="px-5 py-4 text-[11px] text-gray-500 border-t border-[#2E3B28]">
          R26-CS-004 • Shared Shell
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`h-16 ${headerBg} border-b ${borderColor} flex items-center justify-between px-8 shadow-sm transition-colors`}>
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              {pageTitle[activeTab]}
            </h2>
            <p className={`text-xs ${textSecondary}`}>
              {pageSubtitle[activeTab]}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                darkMode ? 'bg-[#2A3526] text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Independent Components
            </span>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition ${
                darkMode
                  ? 'bg-[#2A3526] text-yellow-400 hover:bg-[#354230]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
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
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-2xl font-semibold ${textPrimary}`}>Dashboard Overview</h3>
                <p className={`text-sm ${textSecondary} mt-1`}>
                  Shared system shell for all Audixa components
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatusCard title="Risk Scoring" value="Under development" owner="it22156860" bgCard={bgCard} borderColor={borderColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <StatusCard title="Log Classification" value="Under development" owner="it22231000" bgCard={bgCard} borderColor={borderColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <StatusCard title="Compliance" value="Under development" owner="it22167064" bgCard={bgCard} borderColor={borderColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <StatusCard title="Recommendation" value="Under development" owner="it22111692" bgCard={bgCard} borderColor={borderColor} textPrimary={textPrimary} textSecondary={textSecondary} />
              </div>
            </div>
          )}

          {activeTab === 'risk-scoring' && (
            <Placeholder
              title="Risk Scoring Engine"
              desc="Owner: it22156860. Full module will be integrated after component completion."
              icon={<Shield size={48} />}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'log-classification' && <BatchAnalysisPage />}

          {activeTab === 'reports' && (
            <Placeholder
              title="Reports"
              desc="Shared reports module placeholder."
              icon={<BarChart3 size={48} />}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'alerts' && (
            <Placeholder
              title="Alerts"
              desc="Shared alerts module placeholder."
              icon={<AlertTriangle size={48} />}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'settings' && (
            <Placeholder
              title="Settings"
              desc="Shared settings placeholder."
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

function StatusCard({ title, value, owner, bgCard, borderColor, textPrimary, textSecondary }) {
  return (
    <div className={`${bgCard} border ${borderColor} rounded-xl p-5 shadow-sm`}>
      <p className={`text-sm ${textSecondary}`}>{title}</p>
      <p className={`text-lg font-semibold mt-2 ${textPrimary}`}>{value}</p>
      <p className={`text-xs mt-2 ${textSecondary}`}>Owner: {owner}</p>
    </div>
  )
}

function Placeholder({ title, desc, icon, darkMode }) {
  return (
    <div className={`flex flex-col items-center justify-center py-32 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
      <div className="opacity-40 mb-4">{icon}</div>
      <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : ''}`}>{title}</p>
      <p className="text-sm mt-1 text-center max-w-md">{desc}</p>
    </div>
  )
}

export default App