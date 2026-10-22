import { useState } from 'react'
import {
  UploadCloud, Shield, AlertTriangle, Activity,
  TrendingUp, TrendingDown, Minus, X,
  ChevronRight, Target, Layers, Zap,
  Clock, FileText, AlertOctagon, Download
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const C = {
  accent  : '#aa3bff',
  accentBg: 'rgba(170,59,255,0.07)',
  accentBr: 'rgba(170,59,255,0.25)',
  bg      : '#F4F5F7',
  card    : '#ffffff',
  border  : '#e5e4e7',
  textH   : '#08060d',
  text    : '#6b6375',
  red     : '#dc2626', redBg:'#fef2f2', redBr:'#fecaca',
  orange  : '#ea580c', orangeBg:'#fff7ed', orangeBr:'#fed7aa',
  yellow  : '#ca8a04', yellowBg:'#fefce8', yellowBr:'#fde68a',
  green   : '#16a34a',
  blue    : '#2563eb',
}

const SEV_COLOR  = { Critical:'#dc2626', High:'#ea580c', Medium:'#ca8a04', Low:'#16a34a' }
const SEV_BG     = { Critical:'#fef2f2', High:'#fff7ed', Medium:'#fefce8', Low:'#f0fdf4' }
const SEV_BR     = { Critical:'#fecaca', High:'#fed7aa', Medium:'#fde68a', Low:'#bbf7d0' }
const CONF_COLOR = { HIGH:'#16a34a', MEDIUM:'#ca8a04', LOW:'#ea580c', UNCERTAIN:'#dc2626' }
const GROUP_COLORS = {
  A:'#aa3bff', B:'#dc2626', C:'#2563eb', D:'#ea580c',
  E:'#16a34a', F:'#0891b2', G:'#7c3aed', H:'#db2777',
}
const GROUP_LABELS = {
  A:'Severity', B:'Attack type', C:'Time context', D:'Control gap',
  E:'Compound',  F:'Segment',    G:'Pattern',      H:'Escalation',
}

// ── CSV Export ──────────────────────────────────────────────────
function exportCSV(recs) {
  const headers = [
    'Event','Timestamp','Source IP','Destination IP',
    'Attack Type','Severity','Risk Score','Network Segment',
    'Rec Code','Rec Group','Rec Label','Confidence %',
    'Confidence Level','Time Slot','Risk Tier',
    'Immediate Action','Short Term Action',
    'Long Term Strategy','Control Gap','Attack Specific',
    'Risk Flags','Combination'
  ]

  const rows = recs.map((r,i) => {
    const conf = r.confidence_assessment || {}
    const ctx  = r.recommendation_context || {}
    const esc  = v => `"${String(v||'').replace(/"/g,'""')}"`
    return [
      i+1,
      esc(String(r.timestamp||'').slice(0,16)),
      esc(r.source_ip),
      esc(r.destination_ip),
      esc(r.attack_type),
      esc(r.predicted_severity),
      Number(r.risk_score||0).toFixed(1),
      esc(r.network_segment),
      r.rec_code,
      r.rec_group,
      esc(r.rec_label),
      Number(conf.percentage||0).toFixed(1),
      esc(conf.level),
      esc(ctx.time_slot),
      esc(ctx.tier_label),
      esc(r.immediate_action),
      esc(r.short_term_action),
      esc(r.long_term_strategy),
      esc(r.control_gap_note),
      esc(r.attack_specific),
      esc(r.risk_context),
      esc(ctx.combination),
    ].join(',')
  })

  const csv  = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `audixa_recommendations_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF Export ──────────────────────────────────────────────────
function exportPDF(rec) {
  const sev  = rec.predicted_severity || 'Low'
  const conf = rec.confidence_assessment || {}
  const ctx  = rec.recommendation_context || {}

  const sevColor = {
    Critical:'#dc2626', High:'#ea580c', Medium:'#ca8a04', Low:'#16a34a'
  }[sev] || '#6b6375'

  const timeLabel = ctx.time_slot === 'night'   ? 'Off-hours (night)'
    : ctx.time_slot === 'weekend' ? 'Weekend'
    : ctx.time_slot === 'peak'    ? 'Peak hours'
    : 'Business hours'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Audixa — Security Incident Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #08060d;
         background: #fff; padding: 40px; font-size: 13px; }

  .header { border-bottom: 2px solid #08060d;
            padding-bottom: 16px; margin-bottom: 24px; }
  .header-top { display: flex; justify-content: space-between;
                align-items: flex-start; }
  .brand { font-size: 22px; font-weight: 700; color: #08060d; }
  .brand-sub { font-size: 12px; color: #6b6375; margin-top: 2px; }
  .risk-badge { background: ${SEV_BG[sev]||'#f4f4f4'};
                border: 1px solid ${SEV_BR[sev]||'#ccc'};
                border-radius: 8px; padding: 8px 16px;
                text-align: center; }
  .risk-badge .sev { font-size: 11px; font-weight: 700;
                     color: ${sevColor}; letter-spacing: 1px; }
  .risk-badge .score { font-size: 28px; font-weight: 700; color: ${sevColor}; }
  .risk-badge .label { font-size: 10px; color: ${sevColor}; }

  .report-title { font-size: 18px; font-weight: 700;
                  margin: 16px 0 4px; }
  .report-sub   { font-size: 12px; color: #6b6375; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
               gap: 8px; margin: 16px 0; }
  .info-chip { background: #F4F5F7; border: 1px solid #e5e4e7;
               border-radius: 8px; padding: 8px 12px; }
  .info-chip .lbl { font-size: 10px; color: #6b6375; margin-bottom: 2px; }
  .info-chip .val { font-size: 12px; font-weight: 600; }

  .summary-box { background: ${SEV_BG[sev]||'#f4f4f4'};
                 border: 1px solid ${SEV_BR[sev]||'#ccc'};
                 border-left: 4px solid ${sevColor};
                 border-radius: 8px; padding: 14px 16px;
                 margin-bottom: 16px; }
  .summary-title { font-size: 10px; font-weight: 700;
                   letter-spacing: 1px; color: ${sevColor};
                   text-transform: uppercase; margin-bottom: 8px; }

  .section { margin-bottom: 16px; }
  .section-bar { display: flex; align-items: center; gap: 8px;
                 margin-bottom: 8px; }
  .section-bar .stripe { width: 3px; height: 14px;
                         border-radius: 2px; }
  .section-bar .title  { font-size: 11px; font-weight: 700;
                         letter-spacing: 1px; color: #6b6375;
                         text-transform: uppercase; }
  .section-body { background: #F4F5F7; border: 1px solid #e5e4e7;
                  border-radius: 8px; padding: 12px 16px;
                  line-height: 1.8; }
  .section-body.danger { background: ${SEV_BG[sev]||'#fff'};
                         border-color: ${SEV_BR[sev]||'#ccc'};
                         border-left: 4px solid ${sevColor}; }
  .section-body.warning { background: #fefce8; border-color: #fde68a;
                          border-left: 4px solid #ca8a04; }

  .conf-bar-wrap { height: 6px; background: #e5e4e7;
                   border-radius: 3px; margin: 6px 0; }
  .conf-bar      { height: 100%; border-radius: 3px;
                   background: ${CONF_COLOR[conf.level]||'#ea580c'};
                   width: ${conf.percentage||0}%; }

  .badge-bar { background: #F4F5F7; border: 1px solid #e5e4e7;
               border-radius: 8px; padding: 10px 14px;
               display: flex; justify-content: space-between;
               align-items: center; flex-wrap: wrap; gap: 6px;
               margin-top: 16px; }
  .badge { font-size: 10px; font-weight: 700; padding: 3px 10px;
           border-radius: 999px; }

  .footer { margin-top: 32px; padding-top: 12px;
            border-top: 1px solid #e5e4e7;
            display: flex; justify-content: space-between;
            font-size: 11px; color: #6b6375; }

  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <div class="brand">Audixa</div>
      <div class="brand-sub">Firewall Audit System — Recommendation Engine</div>
    </div>
    <div class="risk-badge">
      <div class="sev">${sev.toUpperCase()}</div>
      <div class="score">${Number(rec.risk_score||0).toFixed(0)}</div>
      <div class="label">risk score</div>
    </div>
  </div>
  <div class="report-title">Security Incident Recommendation Report</div>
  <div class="report-sub">
    Generated by LSTM Recommendation Engine · IT22111692 · Audixa ·
    ${new Date().toLocaleDateString('en-GB', {
      day:'2-digit', month:'long', year:'numeric'
    })}
  </div>
</div>

<div class="info-grid">
  <div class="info-chip">
    <div class="lbl">Attack type</div>
    <div class="val">${rec.attack_type||'—'}</div>
  </div>
  <div class="info-chip">
    <div class="lbl">Network segment</div>
    <div class="val">${rec.network_segment||'—'}</div>
  </div>
  <div class="info-chip">
    <div class="lbl">Timestamp</div>
    <div class="val">${String(rec.timestamp||'').slice(0,16)}</div>
  </div>
  <div class="info-chip">
    <div class="lbl">Source IP</div>
    <div class="val" style="font-family:monospace">${rec.source_ip||'—'}</div>
  </div>
</div>

<div class="summary-box">
  <div class="summary-title">Incident summary</div>
  <div>
    A <strong>${rec.network_segment}</strong> segment
    <strong>${rec.attack_type}</strong> attack has been detected at
    ${String(rec.timestamp||'').slice(0,16)}.
    ${timeLabel} attack detected — ${ctx.tier_label||`Risk Tier ${ctx.risk_tier}`}.
    Please find below our security recommendations for immediate action
    and long-term remediation.
  </div>
</div>

${ctx.combination ? `
<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#aa3bff"></div>
    <div class="title">9,600+ recommendation context</div>
  </div>
  <div class="section-body" style="font-family:monospace; font-size:12px">
    ${ctx.combination}
  </div>
</div>` : ''}

<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#dc2626"></div>
    <div class="title">Immediate action (0–2 hours)</div>
  </div>
  <div class="section-body danger">${rec.immediate_action||'—'}</div>
</div>

${rec.attack_specific ? `
<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#ea580c"></div>
    <div class="title">Attack-specific guidance</div>
  </div>
  <div class="section-body">${rec.attack_specific}</div>
</div>` : ''}

<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#ca8a04"></div>
    <div class="title">Short-term actions (24–72 hours)</div>
  </div>
  <div class="section-body">${rec.short_term_action||'—'}</div>
</div>

<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#2563eb"></div>
    <div class="title">Long-term strategy (30–90 days)</div>
  </div>
  <div class="section-body">${rec.long_term_strategy||'—'}</div>
</div>

${rec.control_gap_note ? `
<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#ca8a04"></div>
    <div class="title">Control gap</div>
  </div>
  <div class="section-body warning">${rec.control_gap_note}</div>
</div>` : ''}

<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#aa3bff"></div>
    <div class="title">L3 — Confidence assessment</div>
  </div>
  <div class="section-body">
    <strong>${conf.level||'—'}</strong> — ${Number(conf.percentage||0).toFixed(1)}%
    <div class="conf-bar-wrap"><div class="conf-bar"></div></div>
    ${conf.action||''}
  </div>
</div>

${rec.risk_context && rec.risk_context !== 'No additional risk flags' ? `
<div class="section">
  <div class="section-bar">
    <div class="stripe" style="background:#ea580c"></div>
    <div class="title">Risk flags</div>
  </div>
  <div class="section-body">${rec.risk_context.split(' | ').join(' · ')}</div>
</div>` : ''}

<div class="badge-bar">
  <div style="display:flex; gap:6px; flex-wrap:wrap">
    <span class="badge" style="background:#aa3bff18;color:#aa3bff">
      Code ${rec.rec_code}
    </span>
    <span class="badge"
      style="background:${GROUP_COLORS[rec.rec_group]}18;
             color:${GROUP_COLORS[rec.rec_group]}">
      Group ${rec.rec_group} — ${GROUP_LABELS[rec.rec_group]||''}
    </span>
    <span class="badge"
      style="background:${CONF_COLOR[conf.level]||'#ea580c'}18;
             color:${CONF_COLOR[conf.level]||'#ea580c'}">
      ${conf.level||'—'} confidence
    </span>
  </div>
  <div style="font-size:11px;color:#6b6375">
    Audixa · IT22111692 · LSTM 50 codes · 9,600+ recommendations
  </div>
</div>

<div class="footer">
  <div>Audixa Firewall Audit System — Recommendation Engine v3.0</div>
  <div>IT22111692 · SLIIT · ${new Date().getFullYear()}</div>
</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`

  const blob   = new Blob([html], { type:'text/html' })
  const url    = URL.createObjectURL(blob)
  const win    = window.open(url, '_blank')
  if (!win) alert('Please allow popups to download the PDF report.')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ── Small helpers ───────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`,
      borderRadius:12, padding:'18px 20px',
      display:'flex', alignItems:'center', gap:14, flex:1, minWidth:140 }}>
      <div style={{ width:40, height:40, borderRadius:10,
        background:`${color}15`, display:'flex', alignItems:'center',
        justifyContent:'center', flexShrink:0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12, color:C.text, marginTop:3 }}>{label}</div>
      </div>
    </div>
  )
}

function Badge({ text, color, bg }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px',
      borderRadius:999, background: bg||`${color}15`,
      color, letterSpacing:'0.5px', whiteSpace:'nowrap' }}>
      {text}
    </span>
  )
}

function SectionBar({ children, color }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px',
      color:C.text, textTransform:'uppercase', marginBottom:10,
      display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:3, height:14,
        background:color||C.accent, borderRadius:2 }} />
      {children}
    </div>
  )
}

function InfoChip({ label, value, mono }) {
  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`,
      borderRadius:8, padding:'10px 14px', flex:1, minWidth:120 }}>
      <div style={{ fontSize:10, color:C.text, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color:C.textH,
        fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

// ── Drawer ──────────────────────────────────────────────────────
function Drawer({ rec, onClose }) {
  if (!rec) return null
  const sev      = rec.predicted_severity || 'Low'
  const conf     = rec.confidence_assessment || {}
  const ctx      = rec.recommendation_context || {}
  const secondary= rec.secondary_recommendations || []
  const possible = rec.possible_recommendations  || []
  const sevColor = SEV_COLOR[sev] || C.text
  const sevBg    = SEV_BG[sev]   || C.bg
  const sevBr    = SEV_BR[sev]   || C.border

  const timeLabel = ctx.time_slot==='night'   ? 'Off-hours (night)'
    : ctx.time_slot==='weekend' ? 'Weekend'
    : ctx.time_slot==='peak'    ? 'Peak hours'
    : 'Business hours'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50,
      display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose}
        style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.25)' }} />

      <div style={{ position:'relative', width:540, background:C.card,
        height:'100vh', overflowY:'auto',
        boxShadow:'-4px 0 24px rgba(0,0,0,0.1)',
        display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${C.border}`,
          background:C.card, position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px',
                color:C.text, textTransform:'uppercase', marginBottom:6 }}>
                Audixa — Security Incident Recommendation
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:C.textH }}>
                {rec.attack_type} — {rec.network_segment} Segment
              </div>
              <div style={{ fontSize:12, color:C.text, marginTop:3 }}>
                Generated by LSTM Recommendation Engine · IT22111692
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ background:sevBg, border:`1px solid ${sevBr}`,
                borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:sevColor }}>
                  {sev.toUpperCase()}
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:sevColor }}>
                  {Number(rec.risk_score).toFixed(0)}
                </div>
                <div style={{ fontSize:10, color:sevColor }}>risk score</div>
              </div>
              <button onClick={onClose}
                style={{ border:'none', background:C.bg, cursor:'pointer',
                  borderRadius:8, padding:6 }}>
                <X size={18} color={C.text} />
              </button>
            </div>
          </div>

          {/* PDF download button */}
          <button
            onClick={() => exportPDF(rec)}
            style={{ marginTop:12, width:'100%', padding:'9px 0',
              borderRadius:8, border:`1px solid ${C.border}`,
              background:C.bg, color:C.textH, fontSize:12,
              fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center',
              justifyContent:'center', gap:6,
              transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background=C.accentBg}
            onMouseLeave={e => e.currentTarget.style.background=C.bg}
          >
            <Download size={14} color={C.accent} />
            Download PDF Report
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:18 }}>

          {/* Info chips */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <InfoChip label="Attack type"  value={rec.attack_type} />
            <InfoChip label="Segment"      value={rec.network_segment} />
            <InfoChip label="Timestamp"    value={String(rec.timestamp||'').slice(0,16)} />
            <InfoChip label="Source IP"    value={rec.source_ip} mono />
          </div>

          {/* Incident summary */}
          <div style={{ background:sevBg, border:`1px solid ${sevBr}`,
            borderLeft:`4px solid ${sevColor}`,
            borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'1px',
              color:sevColor, textTransform:'uppercase', marginBottom:8,
              display:'flex', alignItems:'center', gap:6 }}>
              <AlertOctagon size={13} /> Incident summary
            </div>
            <div style={{ fontSize:13, color:C.textH, lineHeight:1.7 }}>
              A <strong>{rec.network_segment}</strong> segment{' '}
              <strong>{rec.attack_type}</strong> attack has been detected at{' '}
              {String(rec.timestamp||'').slice(0,16)}. {timeLabel} —{' '}
              {ctx.tier_label||`Risk Tier ${ctx.risk_tier}`}.
              Please find below our security recommendations for immediate
              action and long-term remediation.
            </div>
          </div>

          {/* 9600+ context */}
          {ctx.combination && (
            <div style={{ background:C.accentBg, border:`1px solid ${C.accentBr}`,
              borderRadius:10, padding:'12px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.accent,
                marginBottom:6, letterSpacing:'1px' }}>
                9,600+ RECOMMENDATION CONTEXT
              </div>
              <div style={{ fontSize:12, fontFamily:'monospace',
                color:C.textH, wordBreak:'break-all', marginBottom:8 }}>
                {ctx.combination}
              </div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {[['Segment',ctx.segment],['Severity',ctx.severity],
                  ['Time',ctx.time_slot],['Tier',ctx.tier_label?.split('—')[0]]
                ].map(([k,v]) => v && (
                  <div key={k} style={{ fontSize:11, color:C.text }}>
                    <span style={{ fontWeight:600, color:C.textH }}>{k}:</span> {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* L1 */}
          <div>
            <SectionBar color={C.red}>
              <AlertTriangle size={12} /> Immediate action (0–2 hours)
            </SectionBar>
            <div style={{ background:sevBg, border:`1px solid ${sevBr}`,
              borderLeft:`4px solid ${sevColor}`, borderRadius:10,
              padding:'14px 16px', fontSize:13, color:C.textH, lineHeight:1.8 }}>
              {rec.immediate_action}
            </div>
          </div>

          {/* Attack specific */}
          {rec.attack_specific && (
            <div>
              <SectionBar color={C.orange}>
                <Zap size={12} /> Attack-specific guidance
              </SectionBar>
              <div style={{ background:C.bg, border:`1px solid ${C.border}`,
                borderRadius:10, padding:'14px 16px',
                fontSize:13, color:C.textH, lineHeight:1.8 }}>
                {rec.attack_specific}
              </div>
            </div>
          )}

          {/* Short term */}
          <div>
            <SectionBar color={C.yellow}>
              <Clock size={12} /> Short-term actions (24–72 hours)
            </SectionBar>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:10, padding:'14px 16px',
              fontSize:13, color:C.textH, lineHeight:1.8 }}>
              {rec.short_term_action}
            </div>
          </div>

          {/* Long term */}
          <div>
            <SectionBar color={C.blue}>
              <Target size={12} /> Long-term strategy (30–90 days)
            </SectionBar>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:10, padding:'14px 16px',
              fontSize:13, color:C.textH, lineHeight:1.8 }}>
              {rec.long_term_strategy}
            </div>
          </div>

          {/* Control gap */}
          {rec.control_gap_note && (
            <div>
              <SectionBar color={C.yellow}>
                <FileText size={12} /> Control gap
              </SectionBar>
              <div style={{ background:C.yellowBg, border:`1px solid ${C.yellowBr}`,
                borderLeft:`4px solid ${C.yellow}`, borderRadius:10,
                padding:'14px 16px', fontSize:13, color:'#92400e', lineHeight:1.8 }}>
                {rec.control_gap_note}
              </div>
            </div>
          )}

          {/* L2 */}
          {(secondary.length>0 || possible.length>0) && (
            <div>
              <SectionBar>L2 — Multi-label predictions</SectionBar>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {secondary.map((s,i) => (
                  <div key={i} style={{ background:C.bg,
                    border:`1px solid ${C.border}`, borderRadius:8,
                    padding:'9px 13px', display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Badge text={`Code ${s.code}`} color={GROUP_COLORS[s.group]} />
                      <span style={{ fontSize:12, color:C.textH }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:C.accent }}>
                      {s.confidence}%
                    </span>
                  </div>
                ))}
                {possible.map((p,i) => (
                  <div key={i} style={{ background:C.bg,
                    border:`1px dashed ${C.border}`, borderRadius:8,
                    padding:'9px 13px', opacity:0.7, display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Badge text={`Code ${p.code}`} color={C.text} />
                      <span style={{ fontSize:12, color:C.text }}>{p.label}</span>
                    </div>
                    <span style={{ fontSize:12, color:C.text }}>{p.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* L3 */}
          <div>
            <SectionBar>L3 — Confidence assessment</SectionBar>
            <div style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:10, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                marginBottom:8 }}>
                <span style={{ fontWeight:700,
                  color:CONF_COLOR[conf.level]||C.orange }}>
                  {conf.level} — {Number(conf.percentage||0).toFixed(1)}%
                </span>
              </div>
              <div style={{ height:6, background:C.border, borderRadius:3,
                marginBottom:8 }}>
                <div style={{ height:'100%', borderRadius:3,
                  width:`${conf.percentage||0}%`,
                  background:CONF_COLOR[conf.level]||C.orange,
                  transition:'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize:12, color:C.text }}>{conf.action}</div>
            </div>
          </div>

          {/* Risk flags */}
          {rec.risk_context && rec.risk_context!=='No additional risk flags' && (
            <div>
              <SectionBar>Risk flags</SectionBar>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {rec.risk_context.split(' | ').map((f,i) => (
                  <Badge key={i} text={f} color={C.orange} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom badge bar */}
          <div style={{ background:C.bg, border:`1px solid ${C.border}`,
            borderRadius:10, padding:'12px 16px',
            display:'flex', justifyContent:'space-between',
            alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <Badge text={`Code ${rec.rec_code}`} color={C.accent} />
              <Badge text={`Group ${rec.rec_group} — ${GROUP_LABELS[rec.rec_group]||''}`}
                color={GROUP_COLORS[rec.rec_group]} />
              <Badge text={`${conf.level||'—'} confidence`}
                color={CONF_COLOR[conf.level]||C.orange} />
              <Badge text={ctx.tier_label?.split('—')[0]||`Tier ${ctx.risk_tier}`}
                color={C.text} bg={C.card} />
            </div>
            <div style={{ fontSize:11, color:C.text }}>Audixa · IT22111692</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Finding card ────────────────────────────────────────────────
function FindingCard({ rec, index, onClick }) {
  const sev  = rec.predicted_severity || 'Low'
  const conf = rec.confidence_assessment || {}
  return (
    <div onClick={() => onClick(rec)}
      style={{ background:C.card, border:`1px solid ${C.border}`,
        borderLeft:`4px solid ${SEV_COLOR[sev]}`,
        borderRadius:10, padding:'14px 18px', cursor:'pointer',
        transition:'box-shadow 0.15s, transform 0.1s', marginBottom:10 }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow='0 4px 14px rgba(170,59,255,0.1)'
        e.currentTarget.style.transform='translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.transform='none'
      }}>
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <Badge text={`#${index+1} ${sev.toUpperCase()}`} color={SEV_COLOR[sev]} />
          <Badge text={rec.attack_type} color={C.textH} />
          <Badge text={`Grp ${rec.rec_group} · Code ${rec.rec_code}`}
            color={GROUP_COLORS[rec.rec_group]} />
          <Badge text={rec.network_segment} color={C.text} />
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:700, color:SEV_COLOR[sev] }}>
            {Number(rec.risk_score).toFixed(0)}
          </div>
          <div style={{ fontSize:10, color:C.text }}>risk</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:28, marginTop:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:10, color:C.text, marginBottom:2 }}>Timestamp</div>
          <div style={{ fontSize:12, color:C.textH }}>
            {String(rec.timestamp||'').slice(0,16)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:C.text, marginBottom:2 }}>Source IP</div>
          <div style={{ fontSize:12, color:C.textH, fontFamily:'monospace' }}>
            {rec.source_ip}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:C.text, marginBottom:2 }}>Confidence</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:700,
              color:CONF_COLOR[conf.level]||C.orange }}>
              {conf.level}
            </span>
            <div style={{ width:56, height:4, background:C.border, borderRadius:2 }}>
              <div style={{ height:'100%', borderRadius:2,
                width:`${conf.percentage||0}%`,
                background:CONF_COLOR[conf.level]||C.orange }} />
            </div>
            <span style={{ fontSize:10, color:C.text }}>
              {Number(conf.percentage||0).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      <div style={{ marginTop:8, fontSize:12, color:C.text, lineHeight:1.5,
        display:'-webkit-box', WebkitLineClamp:2,
        WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {rec.immediate_action}
      </div>
      <div style={{ marginTop:8, fontSize:11, color:C.accent,
        display:'flex', alignItems:'center', gap:4 }}>
        <ChevronRight size={12} /> Click to view full recommendation report
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────
export default function Dashboard({ result, onBack }) {
  const [selected,  setSelected]  = useState(null)
  const [sevFilter, setSevFilter] = useState('All')
  const [exporting, setExporting] = useState(false)

  const recs  = result?.recommendations || []
  const trend = result?.trend_analysis  || {}

  const sevCounts = recs.reduce((a,r) => {
    a[r.predicted_severity] = (a[r.predicted_severity]||0)+1; return a
  }, {})

  const groupData = Object.entries(result?.group_distribution||{})
    .filter(([,v]) => v>0)
    .map(([g,v]) => ({ name:g, value:v, color:GROUP_COLORS[g]||C.accent }))

  const trendData = (trend.risk_trend||[]).map((v,i) => ({ i:i+1, risk:v }))
  const sevOrder  = ['Critical','High','Medium','Low']
  const filteredRecs = sevFilter==='All' ? recs
    : recs.filter(r => r.predicted_severity===sevFilter)
  const uniqueCombos = result?.unique_combinations || 0

  const TrendIcon = trend.direction==='INCREASING' ? TrendingUp
    : trend.direction==='DECREASING' ? TrendingDown : Minus
  const trendColor = trend.direction==='INCREASING' ? C.red
    : trend.direction==='DECREASING' ? C.green : C.text

  const avgRisk = recs.length
    ? (recs.reduce((s,r) => s+r.risk_score,0)/recs.length).toFixed(1) : '0'

  const handleCSV = () => {
    setExporting(true)
    try { exportCSV(recs) }
    finally { setTimeout(() => setExporting(false), 1000) }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:24 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:22 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Shield size={20} color={C.accent} />
            <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:C.textH }}>
              Recommendation Engine
            </h1>
          </div>
          <p style={{ margin:'4px 0 0 30px', fontSize:12, color:C.text }}>
            {result?.total_events} events ·{' '}
            {new Date(result?.processed_at).toLocaleDateString()} ·{' '}
            <span style={{ color:C.accent, fontWeight:600 }}>
              {uniqueCombos} unique combinations
            </span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {/* CSV Export */}
          <button onClick={handleCSV} disabled={exporting}
            style={{ padding:'8px 14px', borderRadius:8,
              border:`1px solid ${C.border}`, background:C.card,
              color:C.textH, fontSize:12, fontWeight:600,
              cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background=C.accentBg}
            onMouseLeave={e => e.currentTarget.style.background=C.card}>
            <Download size={13} color={C.green} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {/* Upload new */}
          <button onClick={onBack}
            style={{ padding:'8px 14px', borderRadius:8,
              border:`1px solid ${C.border}`, background:C.card,
              color:C.text, fontSize:12, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6 }}>
            <UploadCloud size={13} /> Upload new
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <StatCard label="Total events"        value={result?.total_events}  color={C.accent} icon={Activity} />
        <StatCard label="Critical"            value={sevCounts.Critical||0} color={C.red}    icon={AlertTriangle} />
        <StatCard label="High"                value={sevCounts.High||0}     color={C.orange} icon={Shield} />
        <StatCard label="Avg risk score"      value={avgRisk}               color={C.yellow} icon={Target} />
        <StatCard label="Unique combinations" value={uniqueCombos}          color={C.green}  icon={Layers} />
      </div>

      {/* L4 Trend */}
      {trend.direction && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderRadius:12, padding:'14px 18px', marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendIcon size={17} color={trendColor} />
              <span style={{ fontSize:13, fontWeight:700, color:trendColor }}>
                L4 Trend — {trend.direction}
              </span>
            </div>
            <span style={{ fontSize:12, color:C.text }}>
              avg risk (last 3): {trend.avg_risk_recent}
            </span>
          </div>
          <p style={{ margin:'6px 0 0 25px', fontSize:12, color:C.text }}>
            {trend.warning || trend.prediction}
          </p>
          {trendData.length>0 && (
            <div style={{ marginTop:12, height:58 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <Line type="monotone" dataKey="risk" stroke={C.accent}
                    strokeWidth={2} dot={false} />
                  <Tooltip contentStyle={{ fontSize:11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div style={{ display:'flex', gap:14, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:260, background:C.card,
          border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px',
            color:C.text, textTransform:'uppercase', marginBottom:12,
            display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:3, height:14, background:C.accent, borderRadius:2 }} />
            Severity distribution
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sevOrder.map(s => ({ name:s, count:sevCounts[s]||0 }))}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:C.text }} />
              <YAxis tick={{ fontSize:11, fill:C.text }} />
              <Tooltip contentStyle={{ fontSize:11 }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {sevOrder.map(s => <Cell key={s} fill={SEV_COLOR[s]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex:1, minWidth:260, background:C.card,
          border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px',
            color:C.text, textTransform:'uppercase', marginBottom:12,
            display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:3, height:14, background:C.accent, borderRadius:2 }} />
            Recommendation groups (8 groups — LSTM output)
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={groupData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={32} outerRadius={54}>
                  {groupData.map((g,i) => <Cell key={i} fill={g.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {groupData.map((g,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%',
                      background:g.color }} />
                    <span style={{ fontSize:11, color:C.text }}>
                      {g.name}: {GROUP_LABELS[g.name]}
                    </span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:C.textH }}>
                    {g.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`,
        borderRadius:12, padding:'14px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px',
            color:C.text, textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:3, height:14, background:C.accent, borderRadius:2 }} />
            Audit findings — {filteredRecs.length} · Click any card for full report
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['All',...sevOrder].map(s => {
              const cnt = s==='All' ? recs.length : (sevCounts[s]||0)
              const active = sevFilter===s
              return (
                <button key={s} onClick={() => setSevFilter(s)} style={{
                  padding:'4px 11px', borderRadius:999, border:'none',
                  cursor:'pointer', fontSize:11, fontWeight:600,
                  background: active ? (SEV_COLOR[s]||C.accent) : C.bg,
                  color: active ? '#fff' : C.text,
                  transition:'all 0.15s',
                }}>
                  {s} ({cnt})
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ maxHeight:500, overflowY:'auto', paddingRight:4 }}>
          {filteredRecs.length===0 ? (
            <div style={{ textAlign:'center', padding:28, color:C.text }}>
              No findings for this filter.
            </div>
          ) : (
            filteredRecs.map((rec,i) => (
              <FindingCard key={i} rec={rec} index={i} onClick={setSelected} />
            ))
          )}
        </div>
      </div>

      {selected && <Drawer rec={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}