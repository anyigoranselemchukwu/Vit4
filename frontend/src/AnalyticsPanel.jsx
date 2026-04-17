// frontend/src/AnalyticsPanel.jsx
// VIT Sports Intelligence — v2.5.0  Analytics Suite

import { useEffect, useState } from 'react'
import { API_KEY } from './api'
import { useTheme } from './ThemeProvider'

const API_BASE = import.meta.env.VITE_API_URL || ''

const card  = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }
const title = { fontSize:'1rem', fontWeight:700, color:'#0f172a', marginBottom:14, marginTop:0 }
const lbl   = { display:'block', fontSize:'0.78rem', fontWeight:600, color:'#475569', marginBottom:4 }
const inp   = { padding:'7px 12px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'0.88rem', background:'#f8fafc', outline:'none' }
const btnP  = { background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnS  = { background:'#f1f5f9', color:'#334155', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const pill  = c => ({ display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700,
  background:c==='green'?'#dcfce7':c==='red'?'#fee2e2':c==='yellow'?'#fef9c3':'#f1f5f9',
  color:c==='green'?'#15803d':c==='red'?'#b91c1c':c==='yellow'?'#92400e':'#64748b' })

function apiFetch(path) {
  return fetch(`${API_BASE}${path}`, { headers:{'x-api-key':API_KEY} }).then(r => {
    if (!r.ok) return r.text().then(t => { throw new Error(t||r.statusText) })
    return r.json()
  })
}

// ── Mini sparkline bar chart ──────────────────────────────────────────
function BarChart({ data, xKey, yKey, color='#6366f1', height=80 }) {
  if (!data?.length) return <div style={{ color:'#94a3b8', fontSize:'0.82rem' }}>No data</div>
  const max = Math.max(...data.map(d => d[yKey]||0))
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height, padding:'4px 0' }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:'100%', background: color, borderRadius:'3px 3px 0 0', opacity:0.85,
            height: max>0 ? `${Math.max(2,(d[yKey]/max)*100)}%` : '2%', transition:'height 0.4s' }} />
        </div>
      ))}
    </div>
  )
}

// ── Equity curve (mini line) ──────────────────────────────────────────
function EquityCurve({ data, height=100 }) {
  if (!data?.length) return <div style={{ color:'#94a3b8', fontSize:'0.82rem' }}>No equity data</div>
  const values = data.map(d => d.bankroll)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 100
  const pts = data.map((d,i) => {
    const x = (i / (data.length-1)) * W
    const y = height - ((d.bankroll - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')
  const isUp = values[values.length-1] >= values[0]
  return (
    <svg width="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={isUp?'#10b981':'#ef4444'} strokeWidth="1.5" />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color='#0f172a' }) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 18px', flex:1, minWidth:140 }}>
      <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:'1.5rem', fontWeight:800, color }}>{value}</div>
      {sub && <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

export default function AnalyticsPanel({ apiKey }) {
  const { theme } = useTheme()
  const key = apiKey || API_KEY

  const [filters, setFilters] = useState({ dateFrom:'', dateTo:'', league:'' })
  const [loading, setLoading] = useState(false)

  const [summary, setSummary]     = useState(null)
  const [accuracy, setAccuracy]   = useState(null)
  const [roi, setRoi]             = useState(null)
  const [clv, setClv]             = useState(null)
  const [contrib, setContrib]     = useState(null)

  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => { if (key) loadSummary() }, [key])

  async function loadSummary() {
    try { setSummary(await apiFetch('/analytics/summary')) } catch(e) { console.error(e) }
  }

  function qs() {
    const p = []
    if (filters.dateFrom) p.push(`date_from=${filters.dateFrom}`)
    if (filters.dateTo)   p.push(`date_to=${filters.dateTo}`)
    if (filters.league)   p.push(`league=${filters.league}`)
    return p.length ? '?' + p.join('&') : ''
  }

  async function loadAll() {
    setLoading(true)
    try {
      const q = qs()
      const [acc, r, c, mc] = await Promise.all([
        apiFetch(`/analytics/accuracy${q}`).catch(()=>null),
        apiFetch(`/analytics/roi${q}`).catch(()=>null),
        apiFetch(`/analytics/clv${q}`).catch(()=>null),
        apiFetch(`/analytics/model-contribution${q}`).catch(()=>null),
      ])
      setAccuracy(acc); setRoi(r); setClv(c); setContrib(mc)
    } finally { setLoading(false) }
  }

  function downloadCSV() {
    window.open(`${API_BASE}/analytics/export/csv${qs()}`, '_blank')
  }

  const tabs = [
    { id:'overview', label:'📊 Overview' },
    { id:'accuracy', label:'🎯 Accuracy' },
    { id:'roi',      label:'💰 ROI' },
    { id:'clv',      label:'📈 CLV' },
    { id:'models',   label:'🤖 Models' },
  ]

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px',
      background: theme.bg.primary,
    }}>

      {/* ── Filters + Controls ────────────────────────────────── */}
      <div style={card}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          {[['dateFrom','From','date'],['dateTo','To','date']].map(([k,l,t]) => (
            <div key={k}><label style={lbl}>{l}</label>
              <input style={inp} type={t} value={filters[k]} onChange={e=>setFilters(f=>({...f,[k]:e.target.value}))} /></div>
          ))}
          <div><label style={lbl}>League</label>
            <select style={inp} value={filters.league} onChange={e=>setFilters(f=>({...f,league:e.target.value}))}>
              <option value="">All leagues</option>
              {[
                'premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1',
                'championship', 'eredivisie', 'primeira_liga',
                'scottish_premiership', 'belgian_pro_league',
              ].map(l =>
                <option key={l} value={l}>{l.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <button style={btnP} onClick={loadAll} disabled={loading}>
            {loading?'Loading…':'📊 Load Analytics'}
          </button>
          <button style={btnS} onClick={downloadCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:'7px 16px', borderRadius:8, border:'1px solid #e2e8f0',
            background: activeTab===t.id ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : '#fff',
            color: activeTab===t.id ? '#fff' : '#334155',
            fontWeight:600, fontSize:'0.85rem', cursor:'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={card}>
          <h3 style={title}>📊 System Overview</h3>
          {summary ? (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <StatCard label="Total Predictions" value={summary.total_predictions?.toLocaleString()} />
              <StatCard label="Settled" value={summary.settled?.toLocaleString()} sub={`${summary.pending} pending`} />
              <StatCard label="Avg CLV" value={`${(summary.avg_clv*100||0).toFixed(2)}%`}
                color={summary.avg_clv>0?'#15803d':'#b91c1c'} />
              <StatCard label="Avg Edge (positive)" value={`${(summary.avg_edge*100||0).toFixed(2)}%`} color='#6366f1' />
            </div>
          ) : <p style={{ color:'#94a3b8' }}>Click Load Analytics to populate.</p>}

          {!accuracy && !roi && (
            <div style={{ marginTop:20, padding:'24px', background:'#f8fafc', borderRadius:10, textAlign:'center', color:'#94a3b8' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>📊</div>
              <p style={{ margin:0 }}>Click "Load Analytics" above to view accuracy, ROI, CLV, and model performance data.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Accuracy ─────────────────────────────────────────── */}
      {activeTab === 'accuracy' && accuracy && (
        <div style={card}>
          <h3 style={title}>🎯 Prediction Accuracy</h3>
          {accuracy.message ? <p style={{ color:'#94a3b8' }}>{accuracy.message}</p> : (
            <>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
                <StatCard label="Overall Accuracy" value={`${(accuracy.overall?.accuracy*100||0).toFixed(1)}%`}
                  sub={`${accuracy.overall?.correct} / ${accuracy.overall?.total}`}
                  color={accuracy.overall?.accuracy>0.5?'#15803d':'#b91c1c'} />
                {Object.entries(accuracy.by_confidence||{}).map(([k,v]) => (
                  <StatCard key={k} label={`Confidence ${v.range}`}
                    value={`${(v.accuracy*100||0).toFixed(1)}%`} sub={`${v.total} bets`} />
                ))}
              </div>

              {/* By league table */}
              <h4 style={{ fontSize:'0.88rem', fontWeight:700, marginBottom:10, color:'#0f172a' }}>By League</h4>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                    {['League','Predictions','Correct','Accuracy'].map(h =>
                      <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{accuracy.by_league?.map(l => (
                    <tr key={l.league} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'7px 12px', fontWeight:600, fontSize:'0.85rem', textTransform:'capitalize' }}>{l.league.replace('_',' ')}</td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{l.total}</td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{l.correct}</td>
                      <td style={{ padding:'7px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:80, background:'#e2e8f0', borderRadius:99, height:6, overflow:'hidden' }}>
                            <div style={{ width:`${l.accuracy*100}%`, height:'100%', background: l.accuracy>0.5?'#10b981':'#f59e0b', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:'0.82rem', fontWeight:700, color: l.accuracy>0.5?'#15803d':'#92400e' }}>
                            {(l.accuracy*100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* Weekly trend */}
              {accuracy.weekly_trend?.length > 0 && (
                <>
                  <h4 style={{ fontSize:'0.88rem', fontWeight:700, margin:'20px 0 8px', color:'#0f172a' }}>Weekly Accuracy Trend</h4>
                  <BarChart data={accuracy.weekly_trend} xKey="week" yKey="accuracy" color='#6366f1' height={70} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#94a3b8', marginTop:4 }}>
                    <span>{accuracy.weekly_trend[0]?.week}</span>
                    <span>{accuracy.weekly_trend[accuracy.weekly_trend.length-1]?.week}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ROI ──────────────────────────────────────────────── */}
      {activeTab === 'roi' && roi && (
        <div style={card}>
          <h3 style={title}>💰 ROI & Equity Curve</h3>
          {roi.message ? <p style={{ color:'#94a3b8' }}>{roi.message}</p> : (
            <>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
                <StatCard label="ROI" value={`${(roi.summary?.roi*100||0).toFixed(2)}%`}
                  color={roi.summary?.roi>0?'#15803d':'#b91c1c'} />
                <StatCard label="Total Profit" value={`$${roi.summary?.total_profit?.toFixed(2)||0}`}
                  color={roi.summary?.total_profit>0?'#15803d':'#b91c1c'} />
                <StatCard label="Win Rate" value={`${(roi.summary?.win_rate*100||0).toFixed(1)}%`}
                  sub={`${roi.summary?.wins}W / ${roi.summary?.losses}L`} />
                <StatCard label="Max Drawdown" value={`${(roi.summary?.max_drawdown*100||0).toFixed(1)}%`}
                  color='#f59e0b' />
                <StatCard label="Final Bankroll" value={`$${roi.summary?.final_bankroll?.toFixed(2)||0}`} />
              </div>

              {roi.equity_curve?.length > 0 && (
                <>
                  <h4 style={{ fontSize:'0.88rem', fontWeight:700, marginBottom:8 }}>Equity Curve</h4>
                  <EquityCurve data={roi.equity_curve} height={120} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#94a3b8', marginTop:4 }}>
                    <span>${roi.equity_curve[0]?.bankroll?.toFixed(0)}</span>
                    <span>${roi.equity_curve[roi.equity_curve.length-1]?.bankroll?.toFixed(0)}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CLV ──────────────────────────────────────────────── */}
      {activeTab === 'clv' && clv && (
        <div style={card}>
          <h3 style={title}>📈 Closing Line Value (CLV)</h3>
          {clv.message ? <p style={{ color:'#94a3b8' }}>{clv.message}</p> : (
            <>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
                <StatCard label="Avg CLV" value={`${(clv.summary?.avg_clv*100||0).toFixed(2)}%`}
                  color={clv.summary?.avg_clv>0?'#15803d':'#b91c1c'} sub="vs closing odds" />
                <StatCard label="Positive CLV %" value={`${(clv.summary?.positive_clv_pct*100||0).toFixed(1)}%`}
                  sub={`${clv.summary?.total} data points`} />
                <StatCard label="Best CLV" value={`${(clv.summary?.max_clv*100||0).toFixed(2)}%`} color='#15803d' />
              </div>

              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                    {['Match','Side','Entry','Close','CLV','Result'].map(h =>
                      <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {clv.series?.slice(0,20).map((s,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'7px 10px', fontSize:'0.82rem' }}>{s.match}</td>
                        <td style={{ padding:'7px 10px', fontSize:'0.82rem', textTransform:'uppercase', fontWeight:600 }}>{s.bet_side}</td>
                        <td style={{ padding:'7px 10px', fontSize:'0.82rem' }}>{s.entry_odds?.toFixed(2)}</td>
                        <td style={{ padding:'7px 10px', fontSize:'0.82rem' }}>{s.closing_odds?.toFixed(2)||'—'}</td>
                        <td style={{ padding:'7px 10px', fontSize:'0.82rem', fontWeight:700, color: s.clv>0?'#15803d':'#b91c1c' }}>
                          {s.clv>0?'+':''}{(s.clv*100).toFixed(2)}%
                        </td>
                        <td style={{ padding:'7px 10px' }}>
                          <span style={pill(s.outcome==='win'?'green':s.outcome==='loss'?'red':'gray')}>
                            {s.outcome||'—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Model Contribution ────────────────────────────────── */}
      {activeTab === 'models' && contrib && (
        <div style={card}>
          <h3 style={title}>🤖 Model Contribution</h3>
          {!contrib.models?.length ? <p style={{ color:'#94a3b8' }}>No model data found.</p> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                  {['Model','Type','Appearances','Part. Rate','Avg Conf','Accuracy','Settled'].map(h =>
                    <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {contrib.models?.map(m => (
                    <tr key={m.model_name} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'7px 12px', fontWeight:700, fontSize:'0.85rem' }}>{m.model_name}</td>
                      <td style={{ padding:'7px 12px', fontSize:'0.78rem', color:'#64748b' }}>{m.model_type}</td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{m.appearances}</td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:50, background:'#e2e8f0', borderRadius:99, height:5, overflow:'hidden' }}>
                            <div style={{ width:`${m.participation_pct*100}%`, height:'100%', background:'#6366f1', borderRadius:99 }} />
                          </div>
                          {(m.participation_pct*100).toFixed(0)}%
                        </div>
                      </td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{(m.avg_confidence*100).toFixed(0)}%</td>
                      <td style={{ padding:'7px 12px', fontWeight:700, fontSize:'0.82rem',
                        color: m.accuracy!=null?(m.accuracy>0.5?'#15803d':'#b91c1c'):'#94a3b8' }}>
                        {m.accuracy!=null ? `${(m.accuracy*100).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding:'7px 12px', fontSize:'0.82rem', color:'#64748b' }}>{m.settled_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {activeTab !== 'overview' && !accuracy && !roi && !clv && !contrib && (
        <div style={{ ...card, textAlign:'center', padding:'32px', color:'#94a3b8' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📊</div>
          <p style={{ margin:0 }}>Click "Load Analytics" to populate this section.</p>
        </div>
      )}
    </div>
  )
}
