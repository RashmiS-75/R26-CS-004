import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import LogClassification from './pages/LogClassification'
import RiskScoring from './pages/RiskScoring'
import Compliance from './pages/Compliance'
import Recommendation from './pages/Recommendation'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="log-classification" element={<LogClassification />} />
          <Route path="risk-scoring" element={<RiskScoring />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="recommendation" element={<Recommendation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
