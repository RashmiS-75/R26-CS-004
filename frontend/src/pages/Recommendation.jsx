import { useState } from 'react'
import UploadPage from '../features/recommendation/components/UploadPage'
import Dashboard from '../features/recommendation/components/Dashboard'

export default function Recommendation() {
  const [result, setResult] = useState(null)
  const [page, setPage] = useState('upload')

  return (
    <div className="min-h-full">
      {page === 'upload' ? (
        <UploadPage
          onResult={(data) => {
            setResult(data)
            setPage('dashboard')
          }}
        />
      ) : (
        <Dashboard
          result={result}
          onBack={() => {
            setPage('upload')
            setResult(null)
          }}
        />
      )}
    </div>
  )
}