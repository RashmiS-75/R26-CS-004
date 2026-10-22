import { useState } from 'react'
import { UploadCloud, Shield, AlertTriangle, Zap } from 'lucide-react'

const API_URL = 'http://localhost:8000'

const S = {
  page : { minHeight:'100vh', background:'#F4F5F7', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 },
  card : { background:'#fff', border:'1px solid #e5e4e7', borderRadius:14, padding:'32px 28px', width:'100%', maxWidth:520 },
  hdWrap: { textAlign:'center', marginBottom:28 },
  title : { margin:0, fontSize:22, fontWeight:700, color:'#08060d', display:'flex', alignItems:'center', justifyContent:'center', gap:10 },
  sub   : { margin:'6px 0 0', fontSize:13, color:'#6b6375' },
  drop  : (drag, file) => ({
    border: `2px dashed ${drag ? '#aa3bff' : file ? '#16a34a' : '#e5e4e7'}`,
    borderRadius:12, padding:'36px 24px', textAlign:'center',
    cursor:'pointer', background: drag ? 'rgba(170,59,255,0.05)' : '#F4F5F7',
    transition:'all 0.2s', marginBottom:16,
  }),
  btn: (ok) => ({
    width:'100%', padding:'13px 0', borderRadius:10, border:'none',
    background: ok ? '#aa3bff' : '#e5e4e7',
    color:'#fff', fontWeight:700, fontSize:14,
    cursor: ok ? 'pointer' : 'default', transition:'background 0.2s',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  }),
  err  : { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#dc2626', display:'flex', alignItems:'center', gap:8, marginBottom:12 },
  cols : { background:'#F4F5F7', border:'1px solid #e5e4e7', borderRadius:10, padding:'14px 16px', marginTop:16 },
  colHd: { fontSize:11, fontWeight:700, color:'#6b6375', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 },
  tag  : { fontSize:11, padding:'3px 10px', borderRadius:6, background:'#fff', border:'1px solid #e5e4e7', color:'#6b6375', display:'inline-block', margin:'2px 3px' },
}

export default function UploadPage({ onResult }) {
  const [file,    setFile]    = useState(null)
  const [drag,    setDrag]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [step,    setStep]    = useState('')

  const handleFile = (f) => {
    if (!f?.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return }
    setFile(f); setError('')
  }

  const onDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }

  const analyse = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      setStep('Sending to LSTM model...')
      const form = new FormData()
      form.append('file', file)
      setStep('Running 50-code LSTM model...')
      const res = await fetch(`${API_URL}/api/recommendations`, { method:'POST', body:form })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setStep('Saving to MongoDB...')
      const data = await res.json()
      setStep('Building dashboard...')
      await new Promise(r => setTimeout(r, 300))
      onResult(data)
    } catch(e) {
      setError(e.message || 'Failed to connect. Is FastAPI running on port 8000?')
    } finally { setLoading(false); setStep('') }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={S.hdWrap}>
          <div style={S.title}>
            <Shield size={22} color="#aa3bff" />
            Recommendation Engine
          </div>
          <p style={S.sub}>LSTM · 50 codes · 8 groups · 4 levels · 9,600+ unique recommendations</p>
          <p style={{ ...S.sub, marginTop:2 }}>Audixa — IT22111692</p>
        </div>

        {/* Drop zone */}
        <div
          style={S.drop(drag, file)}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('up-input').click()}
        >
          <input id="up-input" type="file" accept=".csv" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <UploadCloud size={36} color={file ? '#16a34a' : '#aa3bff'} style={{ marginBottom:10 }} />
          {file ? (
            <>
              <div style={{ fontWeight:700, color:'#08060d', fontSize:15 }}>{file.name}</div>
              <div style={{ color:'#6b6375', fontSize:12, marginTop:4 }}>
                {(file.size/1024).toFixed(1)} KB · Ready to analyse
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight:600, color:'#08060d', fontSize:15 }}>Drop CSV file here</div>
              <div style={{ color:'#6b6375', fontSize:12, marginTop:6 }}>or click to browse</div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={S.err}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* Loading step */}
        {loading && (
          <div style={{ background:'rgba(170,59,255,0.06)', border:'1px solid rgba(170,59,255,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#aa3bff', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, border:'2px solid rgba(170,59,255,0.3)', borderTop:'2px solid #aa3bff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            {step}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        {/* Button */}
        <button onClick={analyse} disabled={!file || loading} style={S.btn(file && !loading)}>
          {loading ? 'Analysing…' : <><Zap size={15} /> Analyse Firewall Log</>}
        </button>

        {/* Required columns */}
        <div style={S.cols}>
          <div style={S.colHd}>Required CSV Columns</div>
          <div>
            {['Timestamp','Source IP Address','Destination IP Address','Attack Type',
              'Anomaly Scores','Action Taken','Protocol','Network Segment',
              'Malware Indicators','Firewall Logs','IDS/IPS Alerts'].map(c => (
              <span key={c} style={S.tag}>{c}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}