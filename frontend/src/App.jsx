
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Shield,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  Bell,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import audixaLogo from './assets/g.png'
import RiskScoring from './pages/RiskScoring'
import Login from './pages/Login'
import Recommendation from './pages/Recommendation'
import Compliance from './pages/Compliance'
import BatchAnalysisPage from './features/log-classification/pages/BatchAnalysisPage'
import UserManagement from './pages/UserManagement'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Platform overview',
    icon: LayoutDashboard,
  },
  {
    id: 'risk-scoring',
    label: 'Risk Scoring',
    description: 'Firewall risk assessment',
    icon: Shield,
  },
  {
    id: 'log-classification',
    label: 'Log Classification',
    description: 'Traffic log analysis',
    icon: FileText,
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    description: 'Risk treatment insights',
    icon: BarChart3,
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Security control assessment',
    icon: AlertTriangle,
  },
  {
    id: 'user-management',
    label: 'User Management',
    description: 'Create and manage accounts',
    icon: Users,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Account preferences',
    icon: Settings,
  },
]

const PAGE_DETAILS = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Your cybersecurity audit workspace',
  },
  'risk-scoring': {
    title: 'Risk Scoring Engine',
    subtitle: 'Firewall log risk assessment',
  },
  'log-classification': {
    title: 'Log Classification Engine',
    subtitle: 'Firewall traffic classification and analysis',
  },
  recommendations: {
    title: 'Recommendations',
    subtitle: 'Actionable insights for risk treatment',
  },
  compliance: {
    title: 'Compliance',
    subtitle: 'Security control and compliance assessment',
  },
  'user-management': {
    title: 'User Management',
    subtitle: 'Create and assign access roles for Audixa accounts',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your account and preferences',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Review generated audit reports',
  },
  alerts: {
    title: 'Alerts',
    subtitle: 'Monitor alerts and notifications',
  },
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('audixa-user')) || null
  } catch {
    return null
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('audixa-dark-mode') === 'true'
  })

  const [user, setUser] = useState(readStoredUser)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('audixa-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setActiveTab('dashboard')
      setSidebarOpen(false)
    }

    window.addEventListener('audixa:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener(
        'audixa:unauthorized',
        handleUnauthorized
      )
    }
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [activeTab])

  // Prevent a non-admin user from opening the admin page
  // through a manually selected frontend tab.
  useEffect(() => {
    if (
      activeTab === 'user-management' &&
      user?.role?.toLowerCase() !== 'admin'
    ) {
      setActiveTab('dashboard')
    }
  }, [activeTab, user])

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)

    if (loggedInUser) {
      localStorage.setItem(
        'audixa-user',
        JSON.stringify(loggedInUser)
      )
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('audixa-user')
    setUser(null)
    setActiveTab('dashboard')
    setSidebarOpen(false)
  }

  const toggleDarkMode = () => {
    setDarkMode((current) => !current)
  }

  const page = PAGE_DETAILS[activeTab] || PAGE_DETAILS.dashboard

  const bgMain = darkMode ? 'bg-[#0F1410]' : 'bg-[#F4F5F7]'
  const bgCard = darkMode ? 'bg-[#1A2218]' : 'bg-white'

  const borderColor = darkMode
    ? 'border-[#2A3526]'
    : 'border-gray-200'

  const textPrimary = darkMode
    ? 'text-gray-100'
    : 'text-gray-900'

  const textSecondary = darkMode
    ? 'text-gray-400'
    : 'text-gray-500'

  const headerBg = darkMode ? 'bg-[#1A2218]' : 'bg-white'

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div
      className={`flex h-screen overflow-hidden ${bgMain} ${textPrimary} font-sans transition-colors duration-300`}
    >
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          bg-[#101A14] text-white shadow-xl
          transition-transform duration-300
          lg:static lg:z-auto lg:translate-x-0
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
          <img
            src={audixaLogo}
            alt="Audixa"
            className="h-14 w-auto max-w-[210px] object-contain"
          />

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto px-3 py-6"
        >
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Workspace
          </p>

          <div className="space-y-1">
            {NAV_ITEMS.filter(
              (item) =>
                item.id !== 'user-management' ||
                user.role?.toLowerCase() === 'admin'
            ).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>

          <div className="my-6 border-t border-[#2E3B28]" />

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Other
          </p>

          <div className="space-y-1">
            <NavItem
              item={{
                id: 'reports',
                label: 'Reports',
                description: 'Audit reporting',
                icon: BarChart3,
              }}
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
            />

            <NavItem
              item={{
                id: 'alerts',
                label: 'Alerts',
                description: 'Security notifications',
                icon: Bell,
              }}
              active={activeTab === 'alerts'}
              onClick={() => setActiveTab('alerts')}
            />
          </div>
        </nav>

        {/* User profile */}
        <div className="shrink-0 border-t border-[#2E3B28] p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4A5C2E] text-sm font-semibold text-white">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-100">
                {user.name || 'Audixa User'}
              </p>

              <p className="mt-0.5 truncate text-xs text-gray-400">
                {user.role || 'User'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-[#2E3B28] hover:text-white"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main application */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className={`
            ${headerBg} border-b ${borderColor}
            relative z-30 flex min-h-20 shrink-0
            items-center justify-between gap-4
            px-4 py-3 shadow-sm transition-colors
            sm:px-6 lg:px-8
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className={`shrink-0 rounded-lg p-2 transition hover:bg-gray-100 lg:hidden ${
                darkMode
                  ? 'text-gray-200 hover:bg-[#2A3526]'
                  : 'text-gray-600'
              }`}
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className={`truncate text-base font-semibold sm:text-lg ${textPrimary}`}
                >
                  {page.title}
                </h1>
              </div>

              <p
                className={`mt-1 hidden truncate text-xs sm:block ${textSecondary}`}
              >
                {page.subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={`
                hidden rounded-full px-3 py-1.5
                text-xs font-medium sm:inline-flex
                ${
                  darkMode
                    ? 'bg-[#2A3526] text-gray-300'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {user.role || 'User'}
            </span>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label={
                darkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              title={
                darkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              className={`
                rounded-lg p-2.5 transition
                ${
                  darkMode
                    ? 'bg-[#2A3526] text-yellow-400 hover:bg-[#354230]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setActiveTab('alerts')}
              className={`
                relative rounded-lg p-2.5 transition
                ${
                  darkMode
                    ? 'text-gray-300 hover:bg-[#2A3526]'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Bell size={18} />
            </button>

            <div className="hidden h-8 w-px bg-gray-200 sm:block" />

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              aria-label="Open account settings"
              title="Account settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4A5C2E] text-sm font-semibold text-white transition hover:opacity-90"
            >
              {user.name?.[0]?.toUpperCase() || 'A'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          key={activeTab}
          id="main-content"
          className={`
            min-h-0 flex-1 overflow-y-auto overscroll-contain
            ${
              activeTab === 'risk-scoring'
                ? 'p-0'
                : 'p-4 sm:p-6 lg:p-7'
            }
          `}
        >
          {activeTab === 'dashboard' && (
            <Dashboard user={user} darkMode={darkMode} />
          )}

          {activeTab === 'risk-scoring' && <RiskScoring />}

          {activeTab === 'log-classification' && (
            <BatchAnalysisPage darkMode={darkMode} />
          )}

          {activeTab === 'recommendations' && <Recommendation />}

          {activeTab === 'compliance' && <Compliance />}

          {/* Admin-only User Management */}
          {activeTab === 'user-management' &&
            user.role?.toLowerCase() === 'admin' && (
              <UserManagement />
            )}

          {activeTab === 'reports' && (
            <Placeholder
              title="Reports"
              desc="Your audit reports and analysis summaries will be available here."
              icon={<BarChart3 size={42} />}
              darkMode={darkMode}
              bgCard={bgCard}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {activeTab === 'alerts' && (
            <Placeholder
              title="Alerts"
              desc="Security alerts and platform notifications will be available here."
              icon={<AlertTriangle size={42} />}
              darkMode={darkMode}
              bgCard={bgCard}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              user={user}
              darkMode={darkMode}
              bgCard={bgCard}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`
        group flex w-full items-center gap-3
        rounded-lg px-3 py-3 text-left
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#4A5C2E]
        ${
          active
            ? 'bg-[#4A5C2E] text-white shadow-sm'
            : 'text-gray-300 hover:bg-[#2E3B28] hover:text-white'
        }
      `}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className="shrink-0"
      />

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {item.label}
        </span>

        <span
          className={`mt-0.5 block truncate text-[10px] ${
            active
              ? 'text-gray-200'
              : 'text-gray-500 group-hover:text-gray-300'
          }`}
        >
          {item.description}
        </span>
      </span>

      {active && (
        <ChevronRight
          size={15}
          className="shrink-0 text-gray-200"
        />
      )}
    </button>
  )
}

function SettingsPage({
  user,
  darkMode,
  bgCard,
  borderColor,
  textPrimary,
  textSecondary,
  onLogout,
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h2 className={`text-xl font-semibold ${textPrimary}`}>
          Account settings
        </h2>

        <p className={`mt-1 text-sm ${textSecondary}`}>
          Review your account information and session.
        </p>
      </div>

      <section
        className={`${bgCard} rounded-xl border ${borderColor} p-5 shadow-sm sm:p-6`}
      >
        <div className={`flex items-center gap-4 border-b ${borderColor} pb-5`}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4A5C2E] text-xl font-semibold text-white">
            {user.name?.[0]?.toUpperCase() || 'A'}
          </div>

          <div className="min-w-0">
            <h3 className={`truncate text-base font-semibold ${textPrimary}`}>
              {user.name || 'Audixa User'}
            </h3>

            <p className={`mt-1 text-sm ${textSecondary}`}>
              {user.role || 'User'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          <AccountRow
            label="Full name"
            value={user.name}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />

          <AccountRow
            label="Username"
            value={user.username}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />

          <AccountRow
            label="Role"
            value={user.role}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#7F1D1D] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <LogOut size={16} />
          Logout
        </button>
      </section>
    </div>
  )
}

function AccountRow({
  label,
  value,
  textPrimary,
  textSecondary,
}) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className={`text-sm ${textSecondary}`}>
        {label}
      </span>

      <span className={`break-all text-sm font-medium sm:text-right ${textPrimary}`}>
        {value || 'Not provided'}
      </span>
    </div>
  )
}

function Placeholder({
  title,
  desc,
  icon,
  darkMode,
  bgCard,
  borderColor,
  textPrimary,
  textSecondary,
}) {
  return (
    <div
      className={`
        flex min-h-[420px] items-center justify-center
        rounded-xl border ${borderColor} ${bgCard}
        px-5 py-12 text-center shadow-sm
      `}
    >
      <div className="flex max-w-md flex-col items-center">
        <div
          className={`
            mb-5 flex h-16 w-16 items-center justify-center
            rounded-2xl
            ${darkMode ? 'bg-[#2A3526]' : 'bg-gray-100'}
            ${darkMode ? 'text-gray-300' : 'text-gray-500'}
          `}
        >
          {icon}
        </div>

        <h2 className={`text-lg font-semibold ${textPrimary}`}>
          {title}
        </h2>

        <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
          {desc}
        </p>

        <span className="mt-5 rounded-full bg-[#4A5C2E]/10 px-3 py-1 text-xs font-medium text-[#4A5C2E]">
          Coming soon
        </span>
      </div>
    </div>
  )
}

export default App
