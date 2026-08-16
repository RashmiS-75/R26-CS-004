import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Shield, FileText, BarChart3, Settings } from 'lucide-react'

export default function Sidebar() {
  const itemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 ${
      isActive ? 'bg-[#4A5C2E] text-white' : 'text-gray-300 hover:bg-[#2E3B28]'
    }`

  return (
    <aside className="w-64 bg-[#1F2A1A] text-white min-h-screen p-4">
      <div className="text-xl font-bold mb-8">Audixa</div>
      <nav>
        <NavLink to="/" end className={itemClass}><LayoutDashboard size={17} /> Dashboard</NavLink>
        <NavLink to="/log-classification" className={itemClass}><FileText size={17} /> Log Classification</NavLink>
        <NavLink to="/risk-scoring" className={itemClass}><Shield size={17} /> Risk Scoring</NavLink>
        <NavLink to="/compliance" className={itemClass}><BarChart3 size={17} /> Compliance</NavLink>
        <NavLink to="/recommendation" className={itemClass}><Settings size={17} /> Recommendation</NavLink>
      </nav>
    </aside>
  )
}
