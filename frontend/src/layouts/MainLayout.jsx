import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      <Sidebar />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
