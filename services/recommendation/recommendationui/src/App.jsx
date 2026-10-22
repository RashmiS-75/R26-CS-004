import { useState } from 'react'
import Dashboard from './components/Dashboard'
import UploadPage from './components/UploadPage'

export default function App() {
  const [result, setResult] = useState(null)
  const [page,   setPage]   = useState('upload')

  const handleResult = (data) => { setResult(data); setPage('dashboard') }
  const handleBack   = ()     => { setPage('upload'); setResult(null) }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7' }}>
      {page === 'upload'
        ? <UploadPage onResult={handleResult} />
        : <Dashboard result={result} onBack={handleBack} />
      }
    </div>
  )
}