// frontend/src/OddsPanel.jsx
// VIT Sports Intelligence — v3.0.0  Odds & Arbitrage

import { useState } from 'react'
import { API_KEY, getApiKey } from './api'

const API_BASE = import.meta.env.VITE_API_URL || ''

const card  = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }
const title = { fontSize:'1rem', fontWeight:700, color:'#0f172a', marginBottom:14, marginTop:0 }
const lbl   = { display:'block', fontSize:'0.78rem', fontWeight:600, color:'#475569', marginBottom:4 }
const inp   = { padding:'8px 12px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'0.9rem', background:'#f8fafc', outline:'none' }
const btnP  = { background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnS  = { background:'#f1f5f9', color:'#334155', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnD  = { background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca', borderRadius:8, padding:'6px 14px', fontWeight:600, fontSize:'0.82rem', cursor:'pointer' }
const pill  = c => ({ display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700,
  background:c==='green'?'#dcfce7':c==='red'?'#fee2e2':c==='yellow'?'#fef9c3':c==='blue'?'#dbeafe':'#f1f5f9',
  color:c==='green'?'#15803d':c==='red'?'#b91c1c':c==='yellow'?'#92400e':c==='blue'?'#1d4ed8':'#64748b' })

function apiFetch(path, opts={}) {
  return fetch(`${API_BASE}${path}`, { headers:{'Content-Type':'application/json', ...(getApiKey() ? {'x-api-key':getApiKey()} : {})}, ...opts })
    .then(r => { if(!r.ok) return r.text().then(t=>{throw new Error(t||r.statusText)}); return r.json() })
}

const LEAGUES = [
  {value:'premier_league',label:'Premier League'},
  {value:'la_liga',label:'La Liga'},
  {value:'bundesliga',label:'Bundesliga'},
  {value:'serie_a',label:'Serie A'},
  {value:'ligue_1',label:'Ligue 1'},
  {value:'championship',label:'Championship'},
  {value:'eredivisie',label:'Eredivisie'},
  {value:'primeira_liga',label:'Primeira Liga'},
  {value:'scottish_premiership',label:'Scottish Premiership'},
  {value:'belgian_pro_league',label:'Belgian Pro League'},
]

const BK_LABELS = {
  pinnacle:'Pinnacle', bet365:'Bet365', betfair_ex:'Betfair',
  betway:'Betway', unibet_eu:'Unibet', williamhill:'William Hill', bwin:'Bwin',
}

const tabs = [
  {id:'compare',   label:'📊 Odds Comparison'},
  {id:'arbitrage', label:'💎 Arbitrage Scanner'},
  {id:'injuries',  label:'🏥 Injury Notes'},
  {id:'audit',     label:'📋 Audit Log'},
]

// ── Odds Comparison ───────────────────────────────────────────────────
function OddsCompare({ apiKey }) {
  const key = apiKey || API_KEY
  const [league, setLeague] = useState('premier_league')
  const [data, setData]     = useState(null)
  const [loading, setLoad]  = useState(false)
  const [err, setErr]       = useState('')

  async function load() {
    setLoad(true); setErr(''); setData(null)
    try { setData(await apiFetch(`/odds/compare?league=${league}`)) }
    catch(e) { setErr(e.message) } finally { setLoad(false) }
  }

  return (
    <div style={card}>
      <h3 style={title}>📊 Multi-Bookmaker Odds Comparison</h3>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:14 }}>
        Compare odds across bookmakers to find the best available price for each outcome.
      </p>
      <div style={{ display:'flex', gap:12, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap' }}>
        <div><label style={lbl}>League</label>
          <select style={inp} value={league} onChange={e=>setLeague(e.target.value)}>
            {LEAGUES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <button style={btnP} onClick={load} disabled={loading}>
          {loading ? 'Fetching…' : '🔍 Compare Odds'}
        </button>
      </div>

      {err && <div style={{ padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem', marginBottom:12 }}>{err}</div>}

      {data && (
        <div>
          {data.events?.length === 0
            ? <p style={{ color:'#94a3b8' }}>No events found. API key may be needed or no fixtures this week.</p>
            : data.events?.map((ev,i) => (
              <div key={i} style={{ marginBottom:16, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
                <div style={{ background:'#f8fafc', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <strong style={{ fontSize:'0.9rem' }}>{ev.home_team} vs {ev.away_team}</strong>
                    <span style={{ marginLeft:10, ...pill('blue'), fontSize:'0.72rem' }}>{ev.kickoff?.slice(0,10)}</span>
                  </div>
                  <span style={{ fontSize:'0.75rem', color:'#64748b' }}>{ev.n_bookmakers} books</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ borderBottom:'1px solid #e2e8f0' }}>
                      <th style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.75rem', color:'#475569', fontWeight:700 }}>Bookmaker</th>
                      {['Home','Draw','Away'].map(h => <th key={h} style={{ padding:'7px 12px', textAlign:'center', fontSize:'0.75rem', color:'#475569', fontWeight:700 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {/* Best odds row */}
                      <tr style={{ background:'#f0fdf4', borderBottom:'2px solid #86efac' }}>
                        <td style={{ padding:'7px 12px', fontSize:'0.82rem', fontWeight:700, color:'#15803d' }}>⭐ Best Available</td>
                        {['home','draw','away'].map(side => (
                          <td key={side} style={{ padding:'7px 12px', textAlign:'center', fontWeight:800, fontSize:'0.92rem', color:'#15803d' }}>
                            {ev.best_odds?.[side]?.toFixed(2)||'—'}
                          </td>
                        ))}
                      </tr>
                      {Object.entries(ev.bookmakers||{}).map(([bk,odds]) => (
                        <tr key={bk} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{BK_LABELS[bk]||bk}</td>
                          {['home','draw','away'].map(side => {
                            const isBest = odds[side] === ev.best_odds?.[side]
                            return <td key={side} style={{ padding:'7px 12px', textAlign:'center', fontSize:'0.82rem',
                              fontWeight: isBest?700:400, color: isBest?'#15803d':'#334155',
                              background: isBest?'#f0fdf4':'transparent' }}>
                              {odds[side]?.toFixed(2)||'—'}
                            </td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Arbitrage Scanner ─────────────────────────────────────────────────
function ArbitrageScanner({ apiKey }) {
  const key = apiKey || API_KEY
  const [league, setLeague]    = useState('premier_league')
  const [minProfit, setMinProfit] = useState(0.5)
  const [data, setData]        = useState(null)
  const [loading, setLoad]     = useState(false)
  const [err, setErr]          = useState('')

  async function scan() {
    setLoad(true); setErr(''); setData(null)
    try { setData(await apiFetch(`/odds/arbitrage?league=${league}&min_profit_pct=${minProfit}`)) }
    catch(e) { setErr(e.message) } finally { setLoad(false) }
  }

  return (
    <div style={card}>
      <h3 style={title}>💎 Arbitrage Scanner</h3>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:14 }}>
        Detects guaranteed profit opportunities when different bookmakers price the same event differently.
      </p>
      <div style={{ display:'flex', gap:12, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap' }}>
        <div><label style={lbl}>League</label>
          <select style={inp} value={league} onChange={e=>setLeague(e.target.value)}>
            {LEAGUES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Min Profit %</label>
          <input style={inp} type="number" step="0.1" min="0" value={minProfit}
            onChange={e=>setMinProfit(parseFloat(e.target.value))} /></div>
        <button style={btnP} onClick={scan} disabled={loading}>
          {loading?'Scanning…':'🔍 Scan for Arbs'}
        </button>
      </div>

      {err && <div style={{ padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem', marginBottom:12 }}>{err}</div>}

      {data && (
        <div>
          <div style={{ marginBottom:14, display:'flex', gap:12, fontSize:'0.88rem' }}>
            <span>Scanned: <strong>{data.scanned}</strong></span>
            <span style={pill(data.total_found>0?'green':'gray')}>
              {data.total_found} arb{data.total_found!==1?'s':''} found
            </span>
          </div>

          {data.opportunities?.length === 0
            ? <div style={{ padding:'24px', background:'#f8fafc', borderRadius:10, textAlign:'center', color:'#94a3b8' }}>
                <div>No arbitrage opportunities found above {minProfit}% threshold.</div>
                <div style={{ marginTop:4, fontSize:'0.82rem' }}>Try lowering the minimum profit or check more leagues.</div>
              </div>
            : data.opportunities?.map((arb,i) => (
              <div key={i} style={{ border:'2px solid #86efac', borderRadius:12, padding:'16px 18px', marginBottom:12, background:'#f0fdf4' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <strong style={{ fontSize:'0.95rem' }}>{arb.home_team} vs {arb.away_team}</strong>
                  <div style={{ display:'flex', gap:8 }}>
                    <span style={pill('green')}>+{arb.profit_pct?.toFixed(3)}% profit</span>
                    <span style={pill('blue')}>${arb.guaranteed_profit?.toFixed(2)} per £100</span>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {Object.entries(arb.legs||{}).map(([side,leg]) => (
                    <div key={side} style={{ background:'#fff', borderRadius:8, padding:'10px 14px', border:'1px solid #d1fae5' }}>
                      <div style={{ fontWeight:700, fontSize:'0.85rem', textTransform:'uppercase', marginBottom:4, color:'#15803d' }}>{side}</div>
                      <div style={{ fontSize:'0.9rem', fontWeight:700 }}>{leg.odds?.toFixed(2)}</div>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{BK_LABELS[leg.bookmaker]||leg.bookmaker}</div>
                      <div style={{ fontSize:'0.78rem', color:'#15803d', marginTop:2 }}>Stake: £{leg.stake}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Injury Notes ──────────────────────────────────────────────────────
function InjuryNotes({ apiKey }) {
  const key = apiKey || API_KEY
  const [notes, setNotes]   = useState([])
  const [form, setForm]     = useState({ team:'', player:'', status:'out', note:'' })
  const [loading, setLoad]  = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadNotes() {
    setLoad(true)
    try { const r = await apiFetch(`/odds/injuries`); setNotes(r.injuries||[]) }
    catch(e) { console.error(e) } finally { setLoad(false) }
  }

  async function addNote() {
    if (!form.team || !form.player) return
    setSaving(true)
    try { await apiFetch(`/odds/injuries`, { method:'POST', body:JSON.stringify(form) }); setForm({team:'',player:'',status:'out',note:''}); await loadNotes() }
    catch(e) { alert(e.message) } finally { setSaving(false) }
  }

  async function deleteNote(id) {
    try { await apiFetch(`/odds/injuries/${id}`, {method:'DELETE'}); await loadNotes() }
    catch(e) { alert(e.message) }
  }

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h3 style={{...title, marginBottom:0}}>🏥 Injury & Team News</h3>
        <button style={btnS} onClick={loadNotes} disabled={loading}>{loading?'Loading…':'↻ Refresh'}</button>
      </div>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
        Log key injuries or team news that affect confidence adjustments.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:12 }}>
        {[['team','Team','text','e.g. Arsenal'],['player','Player','text','e.g. Saka']].map(([k,l,t,ph]) => (
          <div key={k}><label style={lbl}>{l}</label>
            <input style={{...inp,width:'100%'}} type={t} placeholder={ph} value={form[k]}
              onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
        ))}
        <div><label style={lbl}>Status</label>
          <select style={{...inp,width:'100%'}} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            <option value="out">Out</option>
            <option value="doubtful">Doubtful</option>
            <option value="returning">Returning</option>
          </select>
        </div>
        <div><label style={lbl}>Note</label>
          <input style={{...inp,width:'100%'}} type="text" placeholder="Optional detail"
            value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} /></div>
      </div>

      <button style={btnP} onClick={addNote} disabled={saving || !form.team || !form.player}>
        {saving?'Saving…':'+ Add Note'}
      </button>

      {notes.length > 0 && (
        <div style={{ marginTop:16 }}>
          {notes.map(n => (
            <div key={n.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px',
              background:'#f8fafc', borderRadius:8, marginBottom:6, border:'1px solid #e2e8f0' }}>
              <div>
                <strong style={{ fontSize:'0.88rem' }}>{n.team} — {n.player}</strong>
                <span style={{ marginLeft:8, ...pill(n.status==='out'?'red':n.status==='returning'?'green':'yellow') }}>
                  {n.status}
                </span>
                {n.note && <span style={{ marginLeft:8, color:'#64748b', fontSize:'0.82rem' }}>{n.note}</span>}
              </div>
              <button style={btnD} onClick={()=>deleteNote(n.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {notes.length === 0 && <p style={{ color:'#94a3b8', fontSize:'0.85rem', marginTop:12 }}>No injury notes. Click Refresh to load.</p>}
    </div>
  )
}

// ── Audit Log ─────────────────────────────────────────────────────────
function AuditLog({ apiKey }) {
  const key = apiKey || API_KEY
  const [log, setLog]     = useState([])
  const [loading, setLoad] = useState(false)

  async function load() {
    setLoad(true)
    try { const r = await apiFetch(`/odds/audit-log`); setLog(r.log||[]) }
    catch(e) { console.error(e) } finally { setLoad(false) }
  }

  const ACTION_COLORS = {
    odds_compare: 'blue', arbitrage_scan: 'green',
    injury_added: 'yellow', injury_deleted: 'red',
  }

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h3 style={{...title, marginBottom:0}}>📋 Audit Log</h3>
        <button style={btnS} onClick={load} disabled={loading}>{loading?'Loading…':'↻ Load Log'}</button>
      </div>
      {log.length === 0
        ? <p style={{ color:'#94a3b8', fontSize:'0.88rem' }}>Click Load Log to view admin actions.</p>
        : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['ID','Action','Details','Timestamp'].map(h =>
                  <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {log.map(entry => (
                  <tr key={entry.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:'0.78rem', color:'#94a3b8' }}>{entry.id}</td>
                    <td style={{ padding:'7px 12px' }}>
                      <span style={pill(ACTION_COLORS[entry.action]||'gray')}>{entry.action}</span>
                    </td>
                    <td style={{ padding:'7px 12px', fontSize:'0.8rem', color:'#64748b' }}>
                      {Object.entries(entry.details||{}).map(([k,v]) => `${k}: ${v}`).join(', ')}
                    </td>
                    <td style={{ padding:'7px 12px', fontSize:'0.8rem', color:'#94a3b8' }}>
                      {new Date(entry.timestamp).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function OddsPanel({ apiKey }) {
  const [activeTab, setActiveTab] = useState('compare')

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>
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

      {activeTab === 'compare'   && <OddsCompare apiKey={apiKey} />}
      {activeTab === 'arbitrage' && <ArbitrageScanner apiKey={apiKey} />}
      {activeTab === 'injuries'  && <InjuryNotes apiKey={apiKey} />}
      {activeTab === 'audit'     && <AuditLog apiKey={apiKey} />}
    </div>
  )
}
