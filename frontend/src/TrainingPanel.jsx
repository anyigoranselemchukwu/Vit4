// frontend/src/TrainingPanel.jsx
// VIT Sports Intelligence — v3.0.0 Beast Mode Training Panel

import { useEffect, useRef, useState } from 'react'
import { API_KEY, getApiKey } from './api'
import { useTheme } from './ThemeProvider'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Styles ────────────────────────────────────────────────────────────────────
const card  = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }
const title = { fontSize:'1rem', fontWeight:700, color:'#0f172a', marginBottom:14, marginTop:0 }
const lbl   = { display:'block', fontSize:'0.78rem', fontWeight:600, color:'#475569', marginBottom:4 }
const inp   = { width:'100%', padding:'8px 12px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'0.9rem', background:'#f8fafc', outline:'none', boxSizing:'border-box' }
const btnP  = { background:'linear-gradient(135deg,#0ea5e9,#6366f1)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnG  = { background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnO  = { background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const btnS  = { background:'#f1f5f9', color:'#334155', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }
const pill  = c => ({ display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700,
  background: c==='green'?'#dcfce7':c==='red'?'#fee2e2':c==='yellow'?'#fef9c3':c==='blue'?'#dbeafe':c==='purple'?'#ede9fe':c==='orange'?'#ffedd5':'#f1f5f9',
  color:      c==='green'?'#15803d':c==='red'?'#b91c1c':c==='yellow'?'#92400e':c==='blue'?'#1d4ed8':c==='purple'?'#7c3aed':c==='orange'?'#c2410c':'#64748b' })

function apiFetch(path, opts={}) {
  return fetch(`${API_BASE}${path}`, { headers:{'Content-Type':'application/json', ...(getApiKey() ? {'x-api-key':getApiKey()} : {})}, ...opts })
    .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t || r.statusText) }); return r.json() })
}

const LEAGUES = [
  'premier_league',
  'la_liga',
  'bundesliga',
  'serie_a',
  'ligue_1',
  'championship',
  'eredivisie',
  'primeira_liga',
  'scottish_premiership',
  'belgian_pro_league',
]

const SIM_PRESETS = [
  { key:'dev',      label:'Dev',      size:'10K',    warn:false,  desc:'Quick test (10,000 matches)' },
  { key:'standard', label:'Standard', size:'100K',   warn:false,  desc:'Good coverage (100,000 matches)' },
  { key:'large',    label:'Large',    size:'500K',   warn:true,   desc:'High quality (500,000 matches)' },
  { key:'full',     label:'Full',     size:'1M',     warn:true,   desc:'Production grade (1M matches)' },
]

// ── Section: Simulation Engine ────────────────────────────────────────────────
function SimulationPanel({ apiKey }) {
  const [preset, setPreset] = useState('dev')
  const [tierFracs, setTierFracs] = useState({ tier1:0.60, tier2:0.30, tier3:0.10 })
  const [margin, setMargin] = useState(0.075)
  const [seed, setSeed] = useState(42)
  const [running, setRunning] = useState(false)
  const [simJob, setSimJob] = useState(null)
  const [jobs, setJobs] = useState([])
  const [dataset, setDataset] = useState(null)
  const [err, setErr] = useState('')
  const pollRef = useRef(null)

  useEffect(() => { if (apiKey) loadJobs() }, [apiKey])

  async function loadJobs() {
    try {
      const r = await apiFetch(`/training/simulate/jobs`)
      setJobs(r.jobs || [])
      setDataset(r.sim_dataset)
    } catch(e) { console.error(e) }
  }

  async function startSim() {
    setRunning(true); setErr(''); setSimJob(null)
    try {
      const r = await apiFetch(`/training/simulate`, {
        method:'POST',
        body: JSON.stringify({
          preset,
          seed,
          tier1_frac: tierFracs.tier1,
          tier2_frac: tierFracs.tier2,
          tier3_frac: tierFracs.tier3,
          market_margin: margin,
        })
      })
      setSimJob(r)
      pollRef.current = setInterval(() => pollSim(r.job_id), 2000)
    } catch(e) { setErr(e.message); setRunning(false) }
  }

  async function pollSim(jid) {
    try {
      const r = await apiFetch(`/training/simulate/status/${jid}`)
      setSimJob(r)
      if (r.status === 'completed' || r.status === 'failed') {
        clearInterval(pollRef.current)
        setRunning(false)
        await loadJobs()
      }
    } catch(e) { clearInterval(pollRef.current); setRunning(false) }
  }

  const selected = SIM_PRESETS.find(p => p.key === preset) || SIM_PRESETS[0]

  return (
    <div style={card}>
      <h3 style={title}>🎮 Simulation Engine — Synthetic Match Generator</h3>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
        Generate 3-tier synthetic football matches using Poisson goal simulation with market odds.
        Use the generated dataset to bootstrap-train all models before touching real data.
      </p>

      {/* Tier explanation */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { tier:1, label:'Tier 1 — Base', color:'#dbeafe', tc:'#1d4ed8', desc:'Pure Poisson + noise', frac:tierFracs.tier1 },
          { tier:2, label:'Tier 2 — Context', color:'#dcfce7', tc:'#15803d', desc:'Form + fatigue', frac:tierFracs.tier2 },
          { tier:3, label:'Tier 3 — Chaos', color:'#fee2e2', tc:'#b91c1c', desc:'Red cards + anomalies', frac:tierFracs.tier3 },
        ].map(t => (
          <div key={t.tier} style={{ padding:'10px 12px', background:t.color, borderRadius:8 }}>
            <div style={{ fontWeight:700, fontSize:'0.8rem', color:t.tc }}>{t.label}</div>
            <div style={{ fontSize:'0.72rem', color:'#475569', marginTop:2 }}>{t.desc}</div>
            <div style={{ fontWeight:700, fontSize:'1rem', color:t.tc, marginTop:4 }}>{Math.round(t.frac*100)}%</div>
          </div>
        ))}
      </div>

      {/* Preset selector */}
      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Dataset Size Preset</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {SIM_PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              style={{ ...btnS, background: preset===p.key?'#0ea5e9':undefined, color: preset===p.key?'#fff':undefined,
                borderColor: preset===p.key?'#0ea5e9':undefined, padding:'7px 14px', fontSize:'0.82rem' }}>
              {p.label} ({p.size})
            </button>
          ))}
        </div>
        {selected && <div style={{ marginTop:6, fontSize:'0.78rem', color: selected.warn?'#b45309':'#64748b' }}>
          {selected.warn ? '⚠️ ' : 'ℹ️ '}{selected.desc}
        </div>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:14 }}>
        <div>
          <label style={lbl}>Market Margin (%)</label>
          <input style={inp} type="number" step="0.005" min="0.02" max="0.15"
            value={margin} onChange={e=>setMargin(parseFloat(e.target.value))} />
        </div>
        <div>
          <label style={lbl}>Random Seed</label>
          <input style={inp} type="number" min="0"
            value={seed} onChange={e=>setSeed(parseInt(e.target.value)||42)} />
        </div>
      </div>

      {err && <div style={{ marginBottom:12, padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem' }}>{err}</div>}

      <button style={btnG} onClick={startSim} disabled={running}>
        {running ? '⚙️ Generating…' : '▶ Generate Synthetic Dataset'}
      </button>

      {/* Active job progress */}
      {simJob && (
        <div style={{ marginTop:14, padding:'12px 16px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontWeight:600, fontSize:'0.85rem' }}>Job #{simJob.job_id?.slice(0,8)}</span>
            <span style={pill(simJob.status==='completed'?'green':simJob.status==='running'?'blue':simJob.status==='failed'?'red':'gray')}>{simJob.status}</span>
          </div>
          {simJob.status === 'running' && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:4 }}>
                {(simJob.matches_generated||0).toLocaleString()} / {(simJob.total_matches||0).toLocaleString()} matches ({simJob.progress_pct||0}%)
              </div>
              <div style={{ background:'#e2e8f0', borderRadius:99, height:8, overflow:'hidden' }}>
                <div style={{ width:`${simJob.progress_pct||0}%`, background:'linear-gradient(90deg,#10b981,#0ea5e9)', height:'100%', borderRadius:99, transition:'width 0.5s' }} />
              </div>
            </div>
          )}
          {simJob.stats && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8, fontSize:'0.78rem' }}>
              {[
                ['Matches', simJob.stats.total_matches?.toLocaleString()],
                ['File Size', `${simJob.stats.size_mb} MB`],
                ['Time', `${simJob.stats.elapsed_s}s`],
                ['Avg Goals', simJob.stats.outcome_distribution ? Object.values(simJob.stats.outcome_distribution).reduce((a,b)=>a+b,0) > 0 ? '~2.6' : '—' : '—'],
              ].map(([k,v]) => (
                <div key={k} style={{ padding:'6px 8px', background:'#fff', borderRadius:6, border:'1px solid #e2e8f0' }}>
                  <div style={{ color:'#64748b', fontSize:'0.7rem' }}>{k}</div>
                  <div style={{ fontWeight:700, color:'#0f172a' }}>{v}</div>
                </div>
              ))}
              {simJob.stats.outcome_distribution && (
                <div style={{ padding:'6px 8px', background:'#fff', borderRadius:6, border:'1px solid #e2e8f0' }}>
                  <div style={{ color:'#64748b', fontSize:'0.7rem' }}>Outcomes H/D/A</div>
                  <div style={{ fontWeight:700, fontSize:'0.75rem' }}>
                    {simJob.stats.outcome_distribution.H?.toLocaleString()} / {simJob.stats.outcome_distribution.D?.toLocaleString()} / {simJob.stats.outcome_distribution.A?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dataset status */}
      {dataset && (
        <div style={{ marginTop:12, padding:'10px 14px', background: dataset.exists?'#f0fdf4':'#fff1f2',
          borderRadius:8, border:`1px solid ${dataset.exists?'#86efac':'#fca5a5'}`, fontSize:'0.82rem' }}>
          {dataset.exists
            ? <span style={{ color:'#15803d' }}>✅ Simulation dataset ready — {dataset.size_mb} MB on disk</span>
            : <span style={{ color:'#b91c1c' }}>No simulation dataset yet. Generate one above first.</span>}
        </div>
      )}
    </div>
  )
}

// ── Section: Bootstrap Training ───────────────────────────────────────────────
function BootstrapPanel({ apiKey, onJobStarted }) {
  const [maxMatches, setMaxMatches] = useState(50000)
  const [useSim, setUseSim] = useState(true)
  const [useHist, setUseHist] = useState(true)
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [err, setErr] = useState('')
  const [dataStats, setDataStats] = useState(null)

  useEffect(() => { if (apiKey) loadDataStats() }, [apiKey])

  async function loadDataStats() {
    try {
      const r = await apiFetch(`/training/dataset/stats`)
      setDataStats(r)
    } catch(e) {}
  }

  async function startBootstrap() {
    setRunning(true); setErr(''); setJobId(null)
    try {
      const r = await apiFetch(`/training/bootstrap`, {
        method:'POST',
        body: JSON.stringify({ max_matches: maxMatches, use_simulated: useSim, use_historical: useHist })
      })
      setJobId(r.job_id)
      if (onJobStarted) onJobStarted(r.job_id)
    } catch(e) { setErr(e.message) }
    finally { setRunning(false) }
  }

  return (
    <div style={card}>
      <h3 style={title}>🧬 Bootstrap Training — Educate Before Real Data</h3>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
        Pre-train all models on synthetic + historical data before exposure to live matches.
        No model starts empty — they start educated.
      </p>

      {/* Data source stats */}
      {dataStats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Historical Matches', val: dataStats.historical?.count?.toLocaleString() || '0', color:'#dbeafe', tc:'#1d4ed8', ok: dataStats.historical?.exists },
            { label:'Simulated Matches', val: dataStats.simulated?.count?.toLocaleString() || '0', color:'#dcfce7', tc:'#15803d', ok: dataStats.simulated?.exists },
            { label:'Total Available', val: dataStats.total?.toLocaleString() || '0', color:'#ede9fe', tc:'#7c3aed', ok: dataStats.total > 0 },
          ].map(s => (
            <div key={s.label} style={{ padding:'10px 12px', background: s.ok ? s.color : '#f1f5f9', borderRadius:8 }}>
              <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{s.label}</div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color: s.ok ? s.tc : '#94a3b8' }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:14 }}>
        <div>
          <label style={lbl}>Max Matches to Use</label>
          <input style={inp} type="number" min="1000" max="500000" step="1000"
            value={maxMatches} onChange={e=>setMaxMatches(parseInt(e.target.value)||50000)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:8 }}>
          {[['useSim', useSim, setUseSim, 'Include Simulated Data'], ['useHist', useHist, setUseHist, 'Include Historical Data']].map(([k,v,set,label]) => (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.82rem', cursor:'pointer' }}>
              <input type="checkbox" checked={v} onChange={e=>set(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {err && <div style={{ marginBottom:12, padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem' }}>{err}</div>}

      {jobId && (
        <div style={{ marginBottom:12, padding:'8px 12px', background:'#dcfce7', borderRadius:8, color:'#15803d', fontSize:'0.85rem', fontWeight:600 }}>
          ✅ Bootstrap job #{jobId.slice(0,8)} started — track progress in Live Progress below
        </div>
      )}

      <button style={btnG} onClick={startBootstrap} disabled={running || (!useSim && !useHist)}>
        {running ? 'Starting…' : '🧬 Start Bootstrap Training'}
      </button>

      <div style={{ marginTop:12, padding:'10px 14px', background:'#fafafa', borderRadius:8, border:'1px solid #e2e8f0', fontSize:'0.78rem', color:'#64748b' }}>
        <strong>📐 Hybrid Loss Active:</strong> Models train with Loss = 0.7 × prediction_error + 0.3 × market_error,
        combining outcome accuracy with market-implied probability alignment.
      </div>
    </div>
  )
}

// ── Section: Self-Play ────────────────────────────────────────────────────────
function SelfPlayPanel({ apiKey, onJobStarted }) {
  const [episodes, setEpisodes] = useState(500)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const pollRef = useRef(null)

  async function startSelfPlay() {
    setRunning(true); setErr(''); setResult(null)
    try {
      const r = await apiFetch(`/training/self-play`, {
        method:'POST',
        body: JSON.stringify({ sim_matches: episodes })
      })
      if (onJobStarted) onJobStarted(r.job_id)
      pollRef.current = setInterval(() => pollJob(r.job_id), 2500)
    } catch(e) { setErr(e.message); setRunning(false) }
  }

  async function pollJob(jid) {
    try {
      const r = await apiFetch(`/training/status/${jid}`)
      if (r.status === 'completed' || r.status === 'failed') {
        clearInterval(pollRef.current)
        setResult(r.summary)
        setRunning(false)
      }
    } catch(e) { clearInterval(pollRef.current); setRunning(false) }
  }

  return (
    <div style={card}>
      <h3 style={title}>⚔️ Self-Play — RL Agent vs Simulated Market</h3>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
        The RL agent predicts on simulated matches, faces simulated bookmaker odds, and learns
        profit/loss signals. Teaches it to exploit market inefficiencies, not just predict results.
      </p>

      <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap', marginBottom:14 }}>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={lbl}>Simulation Matches</label>
          <input style={inp} type="number" min="100" max="5000" step="100"
            value={episodes} onChange={e=>setEpisodes(parseInt(e.target.value)||500)} />
        </div>
        <button style={btnO} onClick={startSelfPlay} disabled={running}>
          {running ? '⚔️ Self-play in progress…' : '⚔️ Start Self-Play'}
        </button>
      </div>

      {err && <div style={{ padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem', marginBottom:10 }}>{err}</div>}

      {result && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8 }}>
          {[
            ['Bets Placed', result.total_bets, '#dbeafe'],
            ['Wins', result.wins, '#dcfce7'],
            ['Win Rate', `${((result.win_rate||0)*100).toFixed(1)}%`, result.win_rate>0.5?'#dcfce7':'#fee2e2'],
            ['Total P&L', `${result.total_profit>0?'+':''}${(result.total_profit||0).toFixed(2)}u`, result.total_profit>0?'#dcfce7':'#fee2e2'],
            ['ROI', `${((result.roi||0)*100).toFixed(1)}%`, result.roi>0?'#dcfce7':'#fee2e2'],
          ].map(([k,v,bg]) => (
            <div key={k} style={{ padding:'10px 12px', background:bg, borderRadius:8, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{k}</div>
              <div style={{ fontWeight:800, fontSize:'1rem' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section: Edge Memory ──────────────────────────────────────────────────────
function EdgeMemoryPanel({ apiKey }) {
  const [patterns, setPatterns] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [minSample, setMinSample] = useState(30)
  const [decaying, setDecaying] = useState(false)

  useEffect(() => { if (apiKey) load() }, [apiKey])

  async function load() {
    setLoading(true); setErr('')
    try {
      const r = await apiFetch(`/training/edge-memory?min_sample=${minSample}`)
      setPatterns(r.patterns || [])
      setSummary(r.summary)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  async function applyDecay() {
    setDecaying(true)
    try {
      await apiFetch(`/training/edge-memory/decay?days=1`, { method:'POST' })
      await load()
    } catch(e) { setErr(e.message) }
    finally { setDecaying(false) }
  }

  const getRoiColor = roi => roi > 0.05 ? 'green' : roi > 0 ? 'yellow' : 'red'

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h3 style={{...title, marginBottom:0}}>🧠 Edge Memory — Profitable Pattern Tracker</h3>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{...btnS, padding:'6px 14px', fontSize:'0.78rem'}} onClick={applyDecay} disabled={decaying}>
            {decaying ? '…' : '📉 Apply Decay'}
          </button>
          <button style={{...btnS, padding:'6px 14px', fontSize:'0.78rem'}} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>
      <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
        Profitable betting patterns detected from simulated + real matches. ROI decays over time —
        bookmakers adapt. Dead edges are archived automatically.
      </p>

      {summary && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {[
            ['Total Patterns', summary.total_patterns, '#dbeafe', '#1d4ed8'],
            ['Active', summary.active, '#dcfce7', '#15803d'],
            ['Archived', summary.archived, '#f1f5f9', '#475569'],
          ].map(([l,v,bg,tc]) => (
            <div key={l} style={{ padding:'8px 16px', background:bg, borderRadius:8, minWidth:90 }}>
              <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{l}</div>
              <div style={{ fontWeight:800, fontSize:'1.2rem', color:tc }}>{v ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {err && <div style={{ padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem', marginBottom:12 }}>{err}</div>}

      {patterns.length === 0 && !loading && (
        <div style={{ padding:'16px', background:'#f8fafc', borderRadius:8, textAlign:'center', color:'#94a3b8', fontSize:'0.85rem' }}>
          No active patterns yet — run Simulation + Bootstrap Training to populate edge memory.
        </div>
      )}

      {patterns.length > 0 && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['Pattern', 'Market', 'ROI', 'Sample', 'Decay Rate', 'Status'].map(h =>
                  <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:'0.75rem' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {patterns.map(p => (
                <tr key={p.edge_id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'7px 12px', fontWeight:600 }}>{p.description || p.edge_id}</td>
                  <td style={{ padding:'7px 12px' }}><span style={pill('blue')}>{p.market}</span></td>
                  <td style={{ padding:'7px 12px', fontWeight:700, color: p.roi>0?'#15803d':'#b91c1c' }}>
                    {p.roi>0?'+':''}{((p.roi||0)*100).toFixed(1)}%
                  </td>
                  <td style={{ padding:'7px 12px', color:'#64748b' }}>{p.sample_size?.toLocaleString()}</td>
                  <td style={{ padding:'7px 12px', color:'#94a3b8', fontSize:'0.75rem' }}>-{((p.decay_rate||0)*100).toFixed(1)}%/day</td>
                  <td style={{ padding:'7px 12px' }}><span style={pill(getRoiColor(p.roi))}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop:12, padding:'8px 12px', background:'#fafafa', borderRadius:8, border:'1px solid #e2e8f0', fontSize:'0.76rem', color:'#64748b' }}>
        <strong>💡 How it works:</strong> Each match result updates pattern ROI via exponential moving average.
        Patterns decay {'-'}3%/day by default — edges that bookmakers close become unprofitable and auto-archive.
      </div>
    </div>
  )
}

// ── Section: Smart Odds Strategy ──────────────────────────────────────────────
function OddsStrategyCard() {
  return (
    <div style={card}>
      <h3 style={title}>📡 Smart Odds API Strategy</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { icon:'🎯', title:'Opening Odds', subtitle:'Once per match', desc:'Captured when match is listed. Cached forever.', color:'#dbeafe', tc:'#1d4ed8' },
          { icon:'⏰', title:'Pre-Match Odds', subtitle:'1–2 hrs before kickoff', desc:'Last snapshot before market closes. High signal.', color:'#dcfce7', tc:'#15803d' },
          { icon:'🔒', title:'Closing Odds', subtitle:'At kickoff (gold)', desc:'Most informative signal — used for CLV calculation.', color:'#ede9fe', tc:'#7c3aed' },
        ].map(s => (
          <div key={s.title} style={{ padding:'12px 14px', background:s.color, borderRadius:10, border:`1px solid ${s.tc}33` }}>
            <div style={{ fontSize:'1.4rem', marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:s.tc }}>{s.title}</div>
            <div style={{ fontSize:'0.72rem', color:'#475569', marginBottom:4 }}>{s.subtitle}</div>
            <div style={{ fontSize:'0.72rem', color:'#64748b' }}>{s.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, fontSize:'0.82rem' }}>
        {[
          ['Max calls / match', '3', '#f1f5f9'],
          ['Tracking 20 matches/day', '60 calls/day', '#f1f5f9'],
          ['Free tier allowance', '~500/day', '#dcfce7'],
          ['Cache strategy', 'Permanent', '#dcfce7'],
        ].map(([k,v,bg]) => (
          <div key={k} style={{ padding:'8px 12px', background:bg, borderRadius:8, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{k}</div>
            <div style={{ fontWeight:700, color:'#0f172a' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main TrainingPanel ─────────────────────────────────────────────────────────
const TABS = ['Beast Mode', 'Training Run', 'Model Architecture', 'Compare & Promote']

export default function TrainingPanel({ apiKey }) {
  const { theme } = useTheme()
  const key = apiKey || API_KEY
  const [activeTab, setActiveTab] = useState('Beast Mode')

  // Classic training state
  const [config, setConfig] = useState({
    leagues: LEAGUES, date_from:'2023-01-01', date_to:'2025-12-31',
    validation_split:0.20, max_epochs:100, note:''
  })
  const [starting, setStarting] = useState(false)
  const [startErr, setStartErr] = useState('')
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState('idle')
  const [events, setEvents] = useState([])
  const [progress, setProgress] = useState({ current:0, total:0 })
  const [modelResults, setModelResults] = useState([])
  const esRef = useRef(null)
  const logRef = useRef(null)

  // Jobs list
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsL] = useState(false)

  // Model architecture
  const [modelsInfo, setModelsInfo] = useState(null)
  const [modelsInfoLoading, setModelsInfoLoading] = useState(false)

  // Compare
  const [cmpA, setCmpA] = useState('')
  const [cmpB, setCmpB] = useState('')
  const [comparison, setComparison] = useState(null)
  const [cmpLoading, setCmpL] = useState(false)
  const [cmpErr, setCmpErr] = useState('')

  // Promote
  const [promoting, setPromoting] = useState(false)
  const [promoteMsg, setPromoteMsg] = useState('')

  useEffect(() => {
    if (apiKey) { loadJobs(); loadModelsInfo() }
    return () => esRef.current?.close()
  }, [apiKey])
  useEffect(() => { logRef.current?.scrollIntoView({ behavior:'smooth' }) }, [events])

  async function loadModelsInfo() {
    setModelsInfoLoading(true)
    try { const r = await apiFetch(`/training/models/info`); setModelsInfo(r) }
    catch(e) { console.error('modelsInfo:', e) }
    finally { setModelsInfoLoading(false) }
  }

  async function loadJobs() {
    setJobsL(true)
    try { const r = await apiFetch(`/training/jobs`); setJobs(r.jobs || []) }
    catch(e) { console.error(e) } finally { setJobsL(false) }
  }

  async function startTraining() {
    setStarting(true); setStartErr(''); setEvents([]); setModelResults([]); setProgress({current:0,total:0})
    try {
      const r = await apiFetch(`/training/start`, { method:'POST', body:JSON.stringify(config) })
      setJobId(r.job_id); setJobStatus('queued')
      streamProgress(r.job_id)
      await loadJobs()
    } catch(e) { setStartErr(e.message) } finally { setStarting(false) }
  }

  function streamProgress(jid) {
    esRef.current?.close()
    const es = new EventSource(`${API_BASE}/training/progress/${jid}`)
    esRef.current = es
    es.onmessage = (e) => {
      const d = JSON.parse(e.data)
      if (d.type === 'heartbeat')   { setProgress({ current:d.current, total:d.total }); setJobStatus(d.status) }
      if (d.type === 'model_start') { setEvents(ev => [...ev, `[${d.index}/${d.total}] Training ${d.model}…`]) }
      if (d.type === 'model_done')  { setModelResults(mr => [...mr, { name:d.model, accuracy:d.accuracy, elapsed:d.elapsed_s, ok:true }]) }
      if (d.type === 'model_error') { setModelResults(mr => [...mr, { name:d.model, error:d.error, ok:false }]) }
      if (d.type === 'done')        { setJobStatus('completed'); setEvents(ev => [...ev, `✅ Complete — avg accuracy: ${(d.summary?.avg_accuracy*100||0).toFixed(1)}%`]); es.close(); loadJobs() }
      if (d.type === 'stream_end')  { es.close(); loadJobs() }
    }
    es.onerror = () => { setJobStatus('error'); es.close() }
  }

  async function compare() {
    if (!cmpA || !cmpB) { setCmpErr('Select both versions'); return }
    setCmpL(true); setCmpErr(''); setComparison(null)
    try { setComparison(await apiFetch(`/training/compare?job_id_a=${cmpA}&job_id_b=${cmpB}`)) }
    catch(e) { setCmpErr(e.message) } finally { setCmpL(false) }
  }

  async function promote(jid) {
    setPromoting(true); setPromoteMsg('')
    try {
      await apiFetch(`/training/promote`, { method:'POST', body:JSON.stringify({ job_id:jid, reason:'Manually promoted from UI' }) })
      setPromoteMsg(`✅ Version ${jid.slice(0,8)} promoted to production`)
      await loadJobs()
    } catch(e) { setPromoteMsg(`❌ ${e.message}`) }
    finally { setPromoting(false) }
  }

  function handleJobStarted(jid) {
    setJobId(jid); setJobStatus('queued'); setEvents([]); setModelResults([]); setProgress({current:0,total:0})
    streamProgress(jid)
    setActiveTab('Training Run')
    loadJobs()
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const pct = progress.total > 0 ? Math.round(progress.current / progress.total * 100) : 0

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px',
      background: theme.bg.primary,
    }}>

      {/* ── Tab navigation ────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#f1f5f9', borderRadius:10, padding:4, flexWrap:'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex:1, minWidth:100, padding:'8px 14px', border:'none', borderRadius:8, fontWeight:600,
            fontSize:'0.82rem', cursor:'pointer', transition:'all 0.2s',
            background: activeTab===tab ? '#fff' : 'transparent',
            color:      activeTab===tab ? '#0ea5e9' : '#64748b',
            boxShadow:  activeTab===tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{tab}</button>
        ))}
      </div>

      {/* ── BEAST MODE TAB ────────────────────────────────────────────── */}
      {activeTab === 'Beast Mode' && (
        <>
          <div style={{ padding:'10px 16px', background:'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius:10, marginBottom:20, color:'#fff' }}>
            <div style={{ fontWeight:800, fontSize:'1.05rem', marginBottom:4 }}>🧠 VIT Beast Mode Training Architecture</div>
            <div style={{ fontSize:'0.82rem', color:'#94a3b8', lineHeight:1.5 }}>
              Full pipeline: Simulate → Bootstrap → Self-Play → Hybrid Loss → Edge Memory → Continuous Learning.
              Your system predicts reality, understands market behavior, and remembers profitable patterns.
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap', fontSize:'0.72rem' }}>
              {['3-Tier Simulation','Bootstrap Training','Self-Play RL','Hybrid Loss','Edge Memory','Continuous Learning'].map(f => (
                <span key={f} style={{ padding:'2px 10px', background:'#334155', borderRadius:99, color:'#94a3b8' }}>{f}</span>
              ))}
            </div>
          </div>

          <SimulationPanel apiKey={key} />
          <BootstrapPanel apiKey={key} onJobStarted={handleJobStarted} />
          <SelfPlayPanel apiKey={key} onJobStarted={handleJobStarted} />
          <EdgeMemoryPanel apiKey={key} />
          <OddsStrategyCard />
        </>
      )}

      {/* ── TRAINING RUN TAB ──────────────────────────────────────────── */}
      {activeTab === 'Training Run' && (
        <>
          {/* Start Training */}
          <div style={card}>
            <h3 style={title}>🧠 Start Training Run</h3>
            <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-8, marginBottom:16 }}>
              Train all loaded models on historical + Odds API enriched data. Progress streams in real-time.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:16 }}>
              {[['date_from','From Date','date'],['date_to','To Date','date']].map(([k,l,t]) => (
                <div key={k}><label style={lbl}>{l}</label>
                  <input style={inp} type={t} value={config[k]} onChange={e=>setConfig(c=>({...c,[k]:e.target.value}))} /></div>
              ))}
              <div><label style={lbl}>Validation Split</label>
                <input style={inp} type="number" step="0.05" min="0.1" max="0.4"
                  value={config.validation_split} onChange={e=>setConfig(c=>({...c,validation_split:parseFloat(e.target.value)}))} /></div>
              <div><label style={lbl}>Max Epochs</label>
                <input style={inp} type="number" min="10" max="500"
                  value={config.max_epochs} onChange={e=>setConfig(c=>({...c,max_epochs:parseInt(e.target.value)}))} /></div>
            </div>
            <div style={{ marginBottom:16 }}><label style={lbl}>Run Note (optional)</label>
              <input style={inp} type="text" placeholder="e.g. Post-bootstrap fine-tune"
                value={config.note} onChange={e=>setConfig(c=>({...c,note:e.target.value}))} /></div>
            {startErr && <div style={{ marginBottom:12, padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem' }}>{startErr}</div>}
            <button style={btnP} onClick={startTraining} disabled={starting || jobStatus==='running'}>
              {starting ? 'Starting…' : jobStatus==='running' ? '⏳ Training in progress…' : '▶ Start Training Run'}
            </button>
          </div>

          {/* Live Progress */}
          {(jobStatus !== 'idle' || events.length > 0) && (
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <h3 style={{...title, marginBottom:0}}>
                  ⚡ Live Progress
                  {jobId && <span style={{ marginLeft:10, fontFamily:'monospace', fontSize:'0.78rem', color:'#64748b' }}>#{jobId}</span>}
                </h3>
                <span style={pill(jobStatus==='completed'?'green':jobStatus==='running'?'blue':jobStatus==='error'?'red':'gray')}>{jobStatus}</span>
              </div>
              {progress.total > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', color:'#64748b', marginBottom:5 }}>
                    <span>Models trained</span><span>{progress.current}/{progress.total} ({pct}%)</span>
                  </div>
                  <div style={{ background:'#e2e8f0', borderRadius:99, height:10, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, background:'linear-gradient(90deg,#10b981,#0ea5e9)', height:'100%', borderRadius:99, transition:'width 0.5s' }} />
                  </div>
                </div>
              )}
              {modelResults.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:14 }}>
                  {modelResults.map((m,i) => (
                    <div key={i} style={{ padding:'8px 12px', background:m.ok?'#f0fdf4':'#fff1f2', borderRadius:8, border:`1px solid ${m.ok?'#86efac':'#fca5a5'}`, fontSize:'0.82rem' }}>
                      <div style={{ fontWeight:700, marginBottom:2 }}>{m.name}</div>
                      {m.ok
                        ? <><span style={{ color:'#15803d' }}>{(m.accuracy*100).toFixed(1)}% acc</span> <span style={{ color:'#94a3b8' }}>{m.elapsed}s</span></>
                        : <span style={{ color:'#b91c1c' }}>✕ {m.error?.slice(0,40)}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px', maxHeight:120, overflowY:'auto', fontSize:'0.8rem', fontFamily:'monospace', color:'#475569' }}>
                {events.map((e,i) => <div key={i}>{e}</div>)}
                {events.length === 0 && <span style={{ color:'#94a3b8' }}>Waiting for events…</span>}
                <div ref={logRef} />
              </div>
            </div>
          )}

          {/* Training History */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{...title, marginBottom:0}}>📋 Training History</h3>
              <button style={btnS} onClick={loadJobs} disabled={jobsLoading}>{jobsLoading?'Loading…':'↻ Refresh'}</button>
            </div>
            {jobs.length === 0
              ? <p style={{ color:'#94a3b8', fontSize:'0.88rem', margin:0 }}>No training runs yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                      {['Job ID','Type','Status','Avg Accuracy','Models','Created',''].map(h =>
                        <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>
                      )}
                    </tr></thead>
                    <tbody>
                      {jobs.map(j => (
                        <tr key={j.job_id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:'0.82rem', color:'#64748b' }}>
                            {j.job_id.slice(0,8)}
                            {j.is_production && <span style={{ marginLeft:6, ...pill('green') }}>★ PROD</span>}
                          </td>
                          <td style={{ padding:'7px 12px' }}>
                            <span style={pill(j.training_type==='bootstrap'?'purple':j.training_type==='self_play'?'orange':'blue')}>
                              {j.training_type || 'standard'}
                            </span>
                          </td>
                          <td style={{ padding:'7px 12px' }}><span style={pill(j.status==='completed'?'green':j.status==='running'?'blue':'red')}>{j.status}</span></td>
                          <td style={{ padding:'7px 12px', fontSize:'0.85rem', fontWeight:600 }}>
                            {j.avg_accuracy ? `${(j.avg_accuracy*100).toFixed(1)}%` : '—'}
                          </td>
                          <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{j.models_trained || '—'}</td>
                          <td style={{ padding:'7px 12px', fontSize:'0.8rem', color:'#94a3b8' }}>
                            {j.created_at ? new Date(j.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                          </td>
                          <td style={{ padding:'7px 12px' }}>
                            {j.status==='completed' && !j.is_production && (
                              <button style={{ ...btnP, padding:'5px 12px', fontSize:'0.78rem' }}
                                onClick={()=>promote(j.job_id)} disabled={promoting}>
                                {promoting?'…':'⬆ Promote'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
            {promoteMsg && <div style={{ marginTop:10, fontSize:'0.85rem', color:promoteMsg.startsWith('✅')?'#15803d':'#b91c1c', fontWeight:600 }}>{promoteMsg}</div>}
          </div>
        </>
      )}

      {/* ── MODEL ARCHITECTURE TAB ────────────────────────────────────── */}
      {activeTab === 'Model Architecture' && (
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{...title, marginBottom:0}}>🤖 Model Architecture & Child Networks</h3>
            <button style={btnS} onClick={loadModelsInfo} disabled={modelsInfoLoading}>
              {modelsInfoLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          <p style={{ fontSize:'0.85rem', color:'#64748b', marginTop:-4, marginBottom:16 }}>
            Live view of all loaded models, their types, training status, and internal child networks.
          </p>
          {modelsInfoLoading && !modelsInfo && <p style={{ color:'#94a3b8', fontSize:'0.88rem' }}>Loading model architecture…</p>}
          {modelsInfo && (
            <>
              <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  ['Total Models', modelsInfo.total_models, '#dbeafe', '#1d4ed8'],
                  ['Loaded', modelsInfo.models_loaded, '#dcfce7', '#15803d'],
                  ['Trained', modelsInfo.models_trained, '#f0fdf4', '#166534'],
                ].map(([label, val, bg, color]) => (
                  <div key={label} style={{ padding:'8px 16px', background:bg, borderRadius:8, minWidth:100 }}>
                    <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:600 }}>{label}</div>
                    <div style={{ fontSize:'1.4rem', fontWeight:800, color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12 }}>
                {modelsInfo.models?.map(m => (
                  <div key={m.key} style={{
                    padding:12, borderRadius:10, border:`1px solid ${m.trained?'#86efac':'#e2e8f0'}`,
                    background: m.trained ? '#f0fdf4' : '#f8fafc'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:'0.88rem', fontWeight:700 }}>{m.model_name}</div>
                      <span style={pill(m.trained?'green':'gray')}>{m.trained?'trained':'untrained'}</span>
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:6 }}>Type: {m.model_type}</div>
                    {m.child_models?.length > 0 && (
                      <>
                        <div style={{ fontSize:'0.72rem', color:'#0f172a', fontWeight:600, marginBottom:4 }}>Child Networks:</div>
                        <ul style={{ fontSize:'0.72rem', color:'#475569', margin:'0 0 0 14px', padding:0 }}>
                          {m.child_models.map(c => <li key={c}>{c}</li>)}
                        </ul>
                      </>
                    )}
                    <div style={{ marginTop:6, fontSize:'0.7rem', color:'#94a3b8' }}>
                      Weight: {m.weight?.toFixed(2)} {m.supported_markets?.length > 0 && `| Markets: ${m.supported_markets.join(', ')}`}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, padding:12, background:'#fafaf0', borderRadius:8, fontSize:'0.8rem', color:'#475569' }}>
                <strong>💡 Note:</strong> Untrained models use market-implied probability fallback during prediction.
                Run Bootstrap Training to pre-educate all models on synthetic data.
              </div>
            </>
          )}
          {!modelsInfo && !modelsInfoLoading && (
            <div style={{ padding:'12px', background:'#fff1f2', borderRadius:8, fontSize:'0.85rem', color:'#b91c1c' }}>
              Could not load model architecture. Check that the backend is running.
            </div>
          )}
        </div>
      )}

      {/* ── COMPARE & PROMOTE TAB ─────────────────────────────────────── */}
      {activeTab === 'Compare & Promote' && (
        <>
          {completedJobs.length < 2 && (
            <div style={{ ...card, textAlign:'center', color:'#94a3b8', fontSize:'0.88rem' }}>
              Need at least 2 completed training runs to compare. Go to the Training Run tab to train models.
            </div>
          )}
          {completedJobs.length >= 2 && (
            <div style={card}>
              <h3 style={title}>🔬 Compare Versions</h3>
              <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap', marginBottom:14 }}>
                {[['Version A (baseline)', cmpA, setCmpA], ['Version B (candidate)', cmpB, setCmpB]].map(([l,v,set]) => (
                  <div key={l} style={{ flex:1, minWidth:180 }}>
                    <label style={lbl}>{l}</label>
                    <select style={inp} value={v} onChange={e=>set(e.target.value)}>
                      <option value="">— Select —</option>
                      {completedJobs.map(j => (
                        <option key={j.job_id} value={j.job_id}>
                          {j.job_id.slice(0,8)} — {(j.avg_accuracy*100||0).toFixed(1)}% acc {j.is_production?'★':''}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <button style={btnP} onClick={compare} disabled={cmpLoading}>{cmpLoading?'Comparing…':'⚡ Compare'}</button>
              </div>
              {cmpErr && <div style={{ padding:'8px 12px', background:'#fee2e2', borderRadius:8, color:'#b91c1c', fontSize:'0.85rem', marginBottom:12 }}>{cmpErr}</div>}
              {comparison && (
                <div>
                  <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
                    <div style={{ padding:'10px 16px', background:'#f0fdf4', borderRadius:10, flex:1 }}>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>Version A accuracy</div>
                      <div style={{ fontSize:'1.4rem', fontWeight:800 }}>{(comparison.version_a.summary.avg_accuracy*100||0).toFixed(1)}%</div>
                    </div>
                    <div style={{ padding:'10px 16px', background:comparison.overall_delta>0?'#f0fdf4':'#fff1f2', borderRadius:10, flex:1 }}>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>Version B accuracy</div>
                      <div style={{ fontSize:'1.4rem', fontWeight:800 }}>{(comparison.version_b.summary.avg_accuracy*100||0).toFixed(1)}%</div>
                    </div>
                    <div style={{ padding:'10px 16px', background:'#f0f9ff', borderRadius:10, flex:1 }}>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>Δ Improvement</div>
                      <div style={{ fontSize:'1.4rem', fontWeight:800, color:comparison.overall_delta>0?'#15803d':'#b91c1c' }}>
                        {comparison.overall_delta>0?'+':''}{(comparison.overall_delta*100).toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ padding:'10px 16px', background:'#fafaf0', borderRadius:10, flex:1 }}>
                      <div style={{ fontSize:'0.78rem', color:'#64748b' }}>Recommendation</div>
                      <div style={{ fontSize:'1rem', fontWeight:800, textTransform:'uppercase',
                        color:comparison.recommendation==='promote'?'#15803d':comparison.recommendation==='rollback'?'#b91c1c':'#92400e' }}>
                        {comparison.recommendation==='promote'?'✅ Promote':comparison.recommendation==='rollback'?'⬇ Rollback':'= Neutral'}
                      </div>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                        {['Model','Acc A','Acc B','Δ',''].map(h =>
                          <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:'0.76rem', fontWeight:700, color:'#475569' }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {comparison.per_model?.map(m => (
                          <tr key={m.model} style={{ borderBottom:'1px solid #f1f5f9' }}>
                            <td style={{ padding:'7px 12px', fontSize:'0.85rem', fontWeight:600 }}>{m.model_name}</td>
                            <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{(m.accuracy_a*100).toFixed(1)}%</td>
                            <td style={{ padding:'7px 12px', fontSize:'0.82rem' }}>{(m.accuracy_b*100).toFixed(1)}%</td>
                            <td style={{ padding:'7px 12px', fontSize:'0.82rem', fontWeight:700, color:m.delta>0?'#15803d':m.delta<0?'#b91c1c':'#94a3b8' }}>
                              {m.delta>0?'+':''}{(m.delta*100).toFixed(2)}%
                            </td>
                            <td style={{ padding:'7px 12px' }}>{m.improved?'✅':'↓'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {comparison.recommendation === 'promote' && (
                    <button style={{ ...btnP, marginTop:14 }} onClick={()=>promote(cmpB)} disabled={promoting}>
                      {promoting?'Promoting…':'⬆ Promote Version B to Production'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
