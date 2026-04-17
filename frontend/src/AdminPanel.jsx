// frontend/src/AdminPanel.jsx
// VIT Sports Intelligence — v3.1.0 Admin Panel Redesign
// Tabbed dashboard with improved health indicators and cleaner UX

import { useEffect, useRef, useState } from 'react'
import {
  fetchModelStatus, reloadModels,
  fetchDataSourceStatus,
  addManualMatch,
  uploadCSVFixtures,
  uploadModelWeights,
  uploadMatchInsights,
  clearHistory,
  fetchFixturesByDate,
  fetchApiKeys,
  updateApiKey,
  settleResults,
  fetchBankroll,
  fetchDecisionLog,
  fetchAuditLogs,
  adminSetPlan,
  API_KEY,
  getApiKey,
} from './api'

const LEAGUE_OPTIONS = [
  { value: 'premier_league', label: 'Premier League' },
  { value: 'la_liga',        label: 'La Liga' },
  { value: 'bundesliga',     label: 'Bundesliga' },
  { value: 'serie_a',        label: 'Serie A' },
  { value: 'ligue_1',        label: 'Ligue 1' },
  { value: 'championship',   label: 'Championship' },
  { value: 'eredivisie',     label: 'Eredivisie' },
  { value: 'primeira_liga',  label: 'Primeira Liga' },
  { value: 'scottish_premiership', label: 'Scottish Premiership' },
  { value: 'belgian_pro_league', label: 'Belgian Pro League' },
]

// ── Shared style tokens ───────────────────────────────────────────────
const card = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 12, padding: '20px 24px', marginBottom: 20,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}
const sectionTitle = { fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16, marginTop: 0 }
const labelStyle   = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }
const inputStyle   = {
  width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
  borderRadius: 8, fontSize: '0.9rem', background: '#f8fafc', outline: 'none',
}
const btnPrimary = {
  background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff',
  border: 'none', borderRadius: 8, padding: '9px 20px',
  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
}
const btnSecondary = {
  background: '#f1f5f9', color: '#334155',
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px',
  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
}
const badge = (color) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 99,
  fontSize: '0.75rem', fontWeight: 700,
  background: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : color === 'yellow' ? '#fef9c3' : '#f1f5f9',
  color:      color === 'green' ? '#15803d' : color === 'red' ? '#b91c1c' : color === 'yellow' ? '#92400e' : '#64748b',
})

// ── Health indicator component ────────────────────────────────────────
function HealthIndicator({ label, status, message }) {
  const colors = {
    healthy: 'green',
    degraded: 'yellow',
    down: 'red',
    unknown: 'gray'
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={badge(colors[status] || 'gray')}>
        {status === 'healthy' ? '✓' : status === 'degraded' ? '⚠' : status === 'down' ? '✕' : '?'}
      </span>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{label}</div>
        {message && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{message}</div>}
      </div>
    </div>
  )
}

// ── Tab navigation ───────────────────────────────────────────────────
function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
            background: activeTab === tab.id ? '#f8fafc' : 'transparent',
            color: activeTab === tab.id ? '#6366f1' : '#64748b',
            fontWeight: activeTab === tab.id ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Status badge helper ───────────────────────────────────────────────
function SourceBadge({ status }) {
  const map = {
    live:     { color: 'green',  label: '● Live' },
    limited:  { color: 'yellow', label: '⚠ Limited' },
    error:    { color: 'red',    label: '✕ Error' },
    down:     { color: 'red',    label: '✕ Down' },
    no_key:   { color: 'gray',   label: '— No Key' },
  }
  const { color, label } = map[status] || { color: 'gray', label: status }
  return <span style={badge(color)}>{label}</span>
}

// ── Model row ─────────────────────────────────────────────────────────
function ModelRow({ model }) {
  const isReady = model.status === 'ready'
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.88rem' }}>{model.model_name || model.name}</td>
      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.82rem' }}>{model.model_type}</td>
      <td style={{ padding: '8px 12px' }}>
        <span style={badge(isReady ? 'green' : 'red')}>
          {isReady ? '✓ Ready' : '✕ Failed'}
        </span>
      </td>
      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
        {isReady ? `w: ${model.weight?.toFixed(2)}` : (model.error ? model.error.slice(0, 40) + '…' : '—')}
      </td>
    </tr>
  )
}

// ── CSV result row ────────────────────────────────────────────────────
function CsvResultRow({ r }) {
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '6px 10px', fontSize: '0.83rem' }}>{r.home_team} vs {r.away_team}</td>
      <td style={{ padding: '6px 10px', fontSize: '0.83rem', color: '#64748b' }}>{r.league}</td>
      <td style={{ padding: '6px 10px', fontSize: '0.83rem' }}>{(r.home_prob * 100).toFixed(1)}% / {(r.draw_prob * 100).toFixed(1)}% / {(r.away_prob * 100).toFixed(1)}%</td>
      <td style={{ padding: '6px 10px', fontSize: '0.83rem', fontWeight: 700, color: r.edge > 0.02 ? '#10b981' : '#94a3b8' }}>
        {r.has_edge ? `${(r.edge * 100).toFixed(2)}%` : 'No edge'}
      </td>
    </tr>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function AdminPanel({ apiKey }) {
  const key = apiKey || getApiKey() || API_KEY

  // Model status
  const [models, setModels]         = useState(null)
  const [modelsLoading, setML]      = useState(false)
  const [reloading, setReloading]   = useState(false)
  const [reloadMsg, setReloadMsg]   = useState('')
  const [modelsUpdatedAt, setModUpd] = useState(null)

  // Data sources
  const [sources, setSources]       = useState(null)
  const [sourcesLoading, setSL]     = useState(false)

  // Manual match
  const [manualForm, setManualForm] = useState({
    home_team: '', away_team: '', league: 'premier_league',
    kickoff_time: new Date().toISOString().slice(0, 16),
    home_odds: 2.30, draw_odds: 3.30, away_odds: 3.10,
  })
  const [manualResult, setManualResult] = useState(null)
  const [manualLoading, setManualLoad]  = useState(false)
  const [manualError, setManualError]   = useState('')
  const [insightJson, setInsightJson] = useState(null)
  const [insightUploadResult, setInsightUploadResult] = useState(null)
  const [insightUploading, setInsightUploading] = useState(false)
  const [insightUploadError, setInsightUploadError] = useState('')
  const insightFileRef = useRef(null)
  const [standaloneInsightMatchId, setStandaloneInsightMatchId] = useState('')
  const [standaloneInsightFile, setStandaloneInsightFile] = useState(null)
  const [standaloneInsightUploading, setStandaloneInsightUploading] = useState(false)
  const [standaloneInsightResult, setStandaloneInsightResult] = useState(null)
  const [standaloneInsightError, setStandaloneInsightError] = useState('')
  const standaloneInsightRef = useRef(null)

  // Model weights upload
  const [modelZip, setModelZip]         = useState(null)
  const [modelUploadResult, setModelUploadResult] = useState(null)
  const [modelUploading, setModelUploading] = useState(false)
  const [modelUploadError, setModelUploadError] = useState('')
  const modelFileRef = useRef(null)

  // CSV upload
  const [csvFile, setCsvFile]       = useState(null)
  const [csvResult, setCsvResult]   = useState(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvError, setCsvError]     = useState('')
  const fileRef = useRef(null)

  // Prediction history
  const [historyClearing, setHistoryClearing] = useState(false)
  const [historyMessage, setHistoryMessage]   = useState('')

  // API key management
  const [apiKeys, setApiKeys]           = useState(null)
  const [apiKeysLoading, setAKLoading]  = useState(false)
  const [keyDrafts, setKeyDrafts]       = useState({})     // {KEY_NAME: typed value}
  const [keySaving, setKeySaving]       = useState({})     // {KEY_NAME: bool}
  const [keyMessages, setKeyMessages]   = useState({})     // {KEY_NAME: {ok, msg}}

  // Settlement
  const [settleDays, setSettleDays]       = useState(2)
  const [settleLoading, setSettleLoading] = useState(false)
  const [settleResult, setSettleResult]   = useState(null)
  const [settleError, setSettleError]     = useState('')

  // Bankroll
  const [bankroll, setBankroll]         = useState(null)
  const [bankrollLoading, setBRLoad]    = useState(false)
  const [bankrollError, setBRError]     = useState('')

  // Decision Log
  const [decisionLog, setDecisionLog]   = useState(null)
  const [decisionLoading, setDLLoad]    = useState(false)
  const [decisionError, setDLError]     = useState('')

  // Fixture fetcher by date
  const [fixDate, setFixDate]           = useState(null)
  const [fixtures, setFixtures]         = useState(null)
  const [fixturesLoading, setFixLoad]   = useState(false)
  const [fixturesError, setFixError]    = useState('')

  // Streaming predictions (existing)
  const [status, setStatus]         = useState('idle')
  const [log, setLog]               = useState([])
  const [predictions, setPreds]     = useState([])
  const [progress, setProgress]     = useState({ current: 0, total: 0 })
  const [count, setCount]           = useState(10)
  const [streamError, setStreamErr] = useState('')
  const esRef                       = useRef(null)
  const bottomRef                   = useRef(null)

  // Audit log
  const [auditLogs, setAuditLogs]       = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter, setAuditFilter]   = useState('')
  const [auditStatus, setAuditStatus]   = useState('')

  // Subscription management
  const [subTargetKey, setSubTargetKey] = useState('')
  const [subPlan, setSubPlan]           = useState('pro')
  const [subSaving, setSubSaving]       = useState(false)
  const [subMsg, setSubMsg]             = useState('')

  async function loadAuditLogs() {
    setAuditLoading(true)
    try {
      const res = await fetchAuditLogs(key, {
        action: auditFilter || undefined,
        status: auditStatus || undefined,
        limit: 100,
      })
      setAuditLogs(res)
    } catch (e) {
      console.error('Audit log error:', e.message)
    } finally {
      setAuditLoading(false)
    }
  }

  async function handleAdminSetPlan() {
    if (!subTargetKey.trim()) return
    setSubSaving(true); setSubMsg('')
    try {
      await adminSetPlan(key, subTargetKey.trim(), subPlan)
      setSubMsg(`✅ Plan set to "${subPlan}" for the target key.`)
      setSubTargetKey('')
    } catch (e) {
      setSubMsg(`⚠️ ${e.message}`)
    } finally {
      setSubSaving(false)
    }
  }

  useEffect(() => {
    if (!key) return   // no key entered — skip all requests

    loadModelStatus()
    loadDataSources()
    loadApiKeys()
    loadBankroll()

    // Auto-refresh model status every 30 seconds
    const modelTimer = setInterval(loadModelStatus, 30_000)

    return () => {
      clearInterval(modelTimer)
      esRef.current?.close()
    }
  }, [key])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [predictions, log])

  async function loadModelStatus() {
    setML(true)
    try {
      const data = await fetchModelStatus(key)
      setModels(data)
      setModUpd(new Date())
    } catch (e) { console.error(e) }
    finally { setML(false) }
  }

  async function handleReload() {
    setReloading(true); setReloadMsg('')
    try {
      const r = await reloadModels(key)
      setReloadMsg(`✅ ${r.message}`)
      await loadModelStatus()
    } catch (e) { setReloadMsg(`❌ ${e.message}`) }
    finally { setReloading(false) }
  }

  async function loadDataSources() {
    setSL(true)
    try { setSources(await fetchDataSourceStatus(key)) } catch (e) { console.error(e) }
    finally { setSL(false) }
  }

  async function loadApiKeys() {
    setAKLoading(true)
    try { setApiKeys(await fetchApiKeys(key)) } catch (e) { console.error(e) }
    finally { setAKLoading(false) }
  }

  async function saveApiKey(keyName) {
    const newVal = (keyDrafts[keyName] || '').trim()
    if (!newVal) return
    setKeySaving(s => ({ ...s, [keyName]: true }))
    setKeyMessages(m => ({ ...m, [keyName]: null }))
    try {
      const r = await updateApiKey(key, keyName, newVal)
      if (r.errors?.[keyName]) {
        setKeyMessages(m => ({ ...m, [keyName]: { ok: false, msg: r.errors[keyName] } }))
      } else {
        setKeyMessages(m => ({ ...m, [keyName]: { ok: true, msg: 'Saved ✓' } }))
        setKeyDrafts(d => ({ ...d, [keyName]: '' }))
        await loadApiKeys()
      }
    } catch (e) {
      setKeyMessages(m => ({ ...m, [keyName]: { ok: false, msg: e.message } }))
    } finally {
      setKeySaving(s => ({ ...s, [keyName]: false }))
    }
  }

  async function fetchForDate(dateStr) {
    setFixDate(dateStr); setFixLoad(true); setFixError(''); setFixtures(null)
    try {
      const r = await fetchFixturesByDate(key, dateStr)
      setFixtures(r)
    } catch (e) { setFixError(e.message) }
    finally { setFixLoad(false) }
  }

  function updateManual(k, v) { setManualForm(f => ({ ...f, [k]: v })) }

  async function submitManualMatch() {
    setManualLoad(true); setManualError(''); setManualResult(null); setInsightUploadResult(null); setInsightUploadError('')
    try {
      const r = await addManualMatch(key, {
        home_team:    manualForm.home_team.trim(),
        away_team:    manualForm.away_team.trim(),
        league:       manualForm.league,
        kickoff_time: new Date(manualForm.kickoff_time).toISOString(),
        home_odds:    parseFloat(manualForm.home_odds),
        draw_odds:    parseFloat(manualForm.draw_odds),
        away_odds:    parseFloat(manualForm.away_odds),
      })
      setManualResult(r)
    } catch (e) { setManualError(e.message) }
    finally { setManualLoad(false) }
  }

  async function submitInsightUpload() {
    if (!insightJson || !manualResult?.match_id) return
    setInsightUploading(true); setInsightUploadError(''); setInsightUploadResult(null)
    try {
      setInsightUploadResult(await uploadMatchInsights(key, manualResult.match_id, insightJson))
      setInsightJson(null)
      if (insightFileRef.current) insightFileRef.current.value = ''
    } catch (e) {
      setInsightUploadError(e.message)
    } finally {
      setInsightUploading(false)
    }
  }

  async function submitStandaloneInsightUpload() {
    const matchId = parseInt(standaloneInsightMatchId, 10)
    if (!standaloneInsightFile || !matchId) return
    setStandaloneInsightUploading(true); setStandaloneInsightError(''); setStandaloneInsightResult(null)
    try {
      const result = await uploadMatchInsights(key, matchId, standaloneInsightFile)
      setStandaloneInsightResult(result)
      setStandaloneInsightFile(null)
      if (standaloneInsightRef.current) standaloneInsightRef.current.value = ''
    } catch (e) {
      setStandaloneInsightError(e.message)
    } finally {
      setStandaloneInsightUploading(false)
    }
  }

  async function submitModelUpload() {
    if (!modelZip) return
    setModelUploading(true); setModelUploadError(''); setModelUploadResult(null)
    try {
      const r = await uploadModelWeights(key, modelZip)
      setModelUploadResult(r)
      loadModelStatus()
    }
    catch (e) { setModelUploadError(e.message) }
    finally { setModelUploading(false) }
  }

  async function submitCSV() {
    if (!csvFile) return
    setCsvLoading(true); setCsvError(''); setCsvResult(null)
    try { setCsvResult(await uploadCSVFixtures(key, csvFile)) }
    catch (e) { setCsvError(e.message) }
    finally { setCsvLoading(false) }
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all prediction history? This cannot be undone.')) return
    setHistoryClearing(true); setHistoryMessage('')
    try {
      const result = await clearHistory(key)
      setHistoryMessage(`✅ ${result.message}`)
    } catch (e) {
      setHistoryMessage(`❌ ${e.message}`)
    } finally {
      setHistoryClearing(false)
    }
  }

  async function handleSettle() {
    setSettleLoading(true); setSettleResult(null); setSettleError('')
    try {
      const r = await settleResults(key, settleDays)
      setSettleResult(r)
    } catch (e) { setSettleError(e.message) }
    finally { setSettleLoading(false) }
  }

  // ── Bankroll ──────────────────────────────────────────────────────
  async function loadBankroll() {
    setBRLoad(true); setBRError(''); setBankroll(null)
    try {
      const r = await fetchBankroll(key)
      setBankroll(r.bankroll || r)
    } catch (e) { setBRError(e.message || 'Failed to load bankroll') }
    finally { setBRLoad(false) }
  }

  // ── Decision Log ─────────────────────────────────────────────────
  async function loadDecisionLog() {
    setDLLoad(true); setDLError(''); setDecisionLog(null)
    try {
      const r = await fetchDecisionLog(key, 30)
      setDecisionLog(r.decisions || [])
    } catch (e) { setDLError(e.message || 'Failed to load decision log') }
    finally { setDLLoad(false) }
  }

  // ── Streaming predictions ─────────────────────────────────────────
  async function startStream() {
    esRef.current?.close()
    setStatus('running'); setLog([]); setPreds([]); setProgress({ current: 0, total: 0 }); setStreamErr('')
    const controller = new AbortController()
    esRef.current = { close: () => controller.abort() }

    try {
      const res = await fetch('/admin/stream-predictions?count=' + count + '&force_alert=true', {
        headers: key ? { 'x-api-key': key } : {},
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(await res.text() || 'Stream failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          const line = chunk.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          const d = JSON.parse(line.slice(6))
          if (d.type === 'status')     setLog(l => [...l, d.message])
          if (d.type === 'progress')   setProgress({ current: d.current, total: d.total })
          if (d.type === 'prediction') setPreds(p => [...p, d])
          if (d.type === 'error')      setLog(l => [...l, '⚠ ' + (d.fixture ? d.fixture + ': ' : '') + d.message])
          if (d.type === 'done')       { setStatus('done'); controller.abort(); return }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') { setStatus('error'); setStreamErr(e.message || 'Stream disconnected.') }
    }
  }

  function stopStream() { esRef.current?.close(); setStatus('idle') }

  const readyCount = models?.ready ?? '…'
  const totalCount = models?.total ?? '—'

  const DAY_BUTTONS = Array.from({ length: 8 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'short' })
    const dateStr = d.toISOString().slice(0, 10)
    const shortDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { label, shortDate, dateStr }
  })

  const LEAGUE_LABELS = {
    premier_league: 'Premier League', la_liga: 'La Liga',
    bundesliga: 'Bundesliga', serie_a: 'Serie A', ligue_1: 'Ligue 1',
    championship: 'Championship', eredivisie: 'Eredivisie',
    primeira_liga: 'Primeira Liga', scottish_premiership: 'Scottish Prem',
    belgian_pro_league: 'Belgian Pro',
  }

  if (!key) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          ...card,
          textAlign: 'center', padding: '40px 24px',
          background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
          border: '1px solid #bae6fd',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
          <h3 style={{ ...sectionTitle, fontSize: '1.15rem' }}>Admin Key Required</h3>
          <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: 380, margin: '0 auto' }}>
            Enter your admin API key in the <strong>password field at the top of the page</strong> to unlock
            the Admin panel.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 12 }}>
            Default key: <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>admin_key_change_me_in_production</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Fixture Fetcher by Date ───────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>📅 Fetch Fixtures by Day</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 14 }}>
          Select a day to load scheduled fixtures from the Football-Data API.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {DAY_BUTTONS.map(({ label, shortDate, dateStr }) => {
            const isActive = fixDate === dateStr
            return (
              <button
                key={dateStr}
                onClick={() => fetchForDate(dateStr)}
                disabled={fixturesLoading}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid',
                  borderColor: isActive ? '#6366f1' : '#e2e8f0',
                  background: isActive ? '#eef2ff' : '#f8fafc',
                  color: isActive ? '#4338ca' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem', cursor: 'pointer', lineHeight: 1.3,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>{shortDate}</span>
              </button>
            )
          })}
          {fixturesLoading && (
            <span style={{ alignSelf: 'center', color: '#0ea5e9', fontSize: '0.85rem' }}>Loading…</span>
          )}
        </div>

        {fixturesError && (
          <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem', marginBottom: 12 }}>
            ⚠ {fixturesError}
          </div>
        )}

        {fixtures && !fixturesLoading && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
              {fixtures.total} FIXTURE{fixtures.total !== 1 ? 'S' : ''} — {fixDate}
            </div>
            {fixtures.total === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>No fixtures found for this day.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Time', 'Match', 'League', 'Odds (H / D / A)'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fixtures.fixtures.map((f, i) => {
                      const ko = f.kickoff_time ? new Date(f.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
                      const mo = f.market_odds || {}
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{ko}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: '0.88rem' }}>
                            {f.home_team} <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs</span> {f.away_team}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.8rem' }}>
                            {LEAGUE_LABELS[f.league] || f.league}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '0.82rem', color: '#334155' }}>
                            {mo.home ? `${mo.home.toFixed(2)} / ${mo.draw?.toFixed(2)} / ${mo.away?.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── API Key Management ───────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={sectionTitle}>🔑 API Key Management</h3>
          <button style={btnSecondary} onClick={loadApiKeys} disabled={apiKeysLoading}>
            {apiKeysLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0, marginBottom: 16 }}>
          Keys are saved to <code>.env</code> and take effect immediately — no restart needed.
        </p>

        {apiKeys ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {apiKeys.keys.map(k => {
              const draft   = keyDrafts[k.name] ?? ''
              const saving  = keySaving[k.name] ?? false
              const msg     = keyMessages[k.name]
              return (
                <div key={k.name} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{k.label}</span>
                    {k.required && <span style={{ ...badge('yellow'), fontSize: '0.7rem' }}>Required</span>}
                    <span style={{ ...badge(k.is_set ? 'green' : 'red'), fontSize: '0.7rem' }}>
                      {k.is_set ? '● Set' : '○ Not set'}
                    </span>
                    {k.is_set && (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b', letterSpacing: 1 }}>
                        {k.masked}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>{k.description}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="password"
                      placeholder={k.is_set ? 'Enter new value to update…' : 'Enter value…'}
                      value={draft}
                      onChange={e => setKeyDrafts(d => ({ ...d, [k.name]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) saveApiKey(k.name) }}
                      style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                    <button
                      style={{ ...btnPrimary, padding: '8px 18px', opacity: draft.trim() ? 1 : 0.45 }}
                      onClick={() => saveApiKey(k.name)}
                      disabled={saving || !draft.trim()}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  {msg && (
                    <div style={{
                      marginTop: 6, fontSize: '0.8rem', fontWeight: 600,
                      color: msg.ok ? '#15803d' : '#b91c1c',
                    }}>
                      {msg.msg}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            {apiKeysLoading ? 'Loading keys…' : 'Click Refresh to load API key status.'}
          </p>
        )}
      </div>

      {/* ── Model Status ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>
            🤖 Model Status
            <span style={{ marginLeft: 12, ...badge(readyCount >= 10 ? 'green' : readyCount >= 6 ? 'yellow' : 'red') }}>
              {readyCount}/{totalCount} ready
            </span>
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {modelsUpdatedAt && !modelsLoading && (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Updated {modelsUpdatedAt.toLocaleTimeString()} · auto-refreshes every 30s
              </span>
            )}
            {reloadMsg && <span style={{ fontSize: '0.82rem', color: reloadMsg.startsWith('✅') ? '#15803d' : '#b91c1c' }}>{reloadMsg}</span>}
            <button style={btnSecondary} onClick={loadModelStatus} disabled={modelsLoading}>
              {modelsLoading ? 'Loading…' : '↻ Refresh'}
            </button>
            <button style={btnPrimary} onClick={handleReload} disabled={reloading}>
              {reloading ? 'Reloading…' : '⚡ Reload All Models'}
            </button>
          </div>
        </div>

        {models ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Model', 'Type', 'Status', 'Info'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.models?.map(m => <ModelRow key={m.key || m.model_name} model={m} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            {modelsLoading ? 'Loading model status…' : 'Click Refresh to load model status.'}
          </p>
        )}
      </div>

      {/* ── Data Source Health ───────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>📡 Data Source Health</h3>
          <button style={btnSecondary} onClick={loadDataSources} disabled={sourcesLoading}>
            {sourcesLoading ? 'Checking…' : '↻ Recheck'}
          </button>
        </div>
        {sources ? (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {Object.entries(sources.sources || {}).map(([key, val]) => (
              <div key={key} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 18px', flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                  {key === 'football_data' ? '⚽ Football-Data.org' : '📊 The Odds API'}
                </div>
                <div style={{ marginBottom: 4 }}><SourceBadge status={val.status} /></div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{val.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            {sourcesLoading ? 'Checking connections…' : 'Click Recheck to test API connections.'}
          </p>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>🧹 Clear Prediction History</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 6, marginBottom: 0 }}>
              Permanently delete saved prediction history, including match records, predictions, and CLV entries.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{ ...btnSecondary, color: '#b91c1c' }} onClick={handleClearHistory} disabled={historyClearing}>
              {historyClearing ? 'Clearing…' : 'Clear History'}
            </button>
          </div>
        </div>
        {historyMessage && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: historyMessage.startsWith('✅') ? '#ecfdf5' : '#fee2e2', border: historyMessage.startsWith('✅') ? '1px solid #86efac' : '1px solid #fecaca', color: historyMessage.startsWith('✅') ? '#166534' : '#991b1b', fontSize: '0.88rem' }}>
            {historyMessage}
          </div>
        )}
      </div>

      {/* ── Match Settlement ─────────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>⚖️ Settle Finished Matches</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 16 }}>
          Queries Football-Data.org for completed matches and settles unsettled predictions with actual scores,
          CLV, and P&L. Requires <code>FOOTBALL_DATA_API_KEY</code> to be set.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Days to look back</label>
            <select style={{ ...inputStyle, width: 120 }} value={settleDays} onChange={e => setSettleDays(Number(e.target.value))}>
              {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button style={btnPrimary} onClick={handleSettle} disabled={settleLoading}>
              {settleLoading ? '⟳ Settling…' : '⚖️ Run Settlement'}
            </button>
          </div>
        </div>
        {settleError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem', marginTop: 8 }}>
            ❌ {settleError}
          </div>
        )}
        {settleResult && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.88rem', color: '#166534', marginTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ {settleResult.message}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
              <span>Settled: <b>{settleResult.settled}</b></span>
              <span>Already settled: <b>{settleResult.already_settled}</b></span>
              <span>No match in DB: <b>{settleResult.no_db_match ?? 0}</b></span>
              {settleResult.errors > 0 && <span style={{ color: '#b91c1c' }}>Errors: <b>{settleResult.errors}</b></span>}
            </div>
            {Array.isArray(settleResult.details) && settleResult.details.length > 0 && (
              <div style={{ marginTop: 10, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#dcfce7' }}>
                      {['Match', 'Score', 'Outcome', 'Prediction', 'P&L', 'CLV'].map(h => (
                        <th key={h} style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 700, color: '#166534' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settleResult.details.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #bbf7d0' }}>
                        <td style={{ padding: '5px 10px' }}>{d.home_team} vs {d.away_team}</td>
                        <td style={{ padding: '5px 10px' }}>{d.home_goals ?? '?'}-{d.away_goals ?? '?'}</td>
                        <td style={{ padding: '5px 10px', textTransform: 'capitalize' }}>{d.outcome}</td>
                        <td style={{ padding: '5px 10px', textTransform: 'capitalize' }}>{d.bet_side ?? '—'}</td>
                        <td style={{ padding: '5px 10px', fontWeight: 700, color: (d.profit ?? 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {d.profit != null ? `${d.profit >= 0 ? '+' : ''}${d.profit.toFixed(3)}` : '—'}
                        </td>
                        <td style={{ padding: '5px 10px', color: '#64748b' }}>{d.clv_value != null ? d.clv_value.toFixed(3) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bankroll Tracker ─────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>💰 Bankroll Tracker</h3>
          <button style={btnSecondary} onClick={loadBankroll} disabled={bankrollLoading}>
            {bankrollLoading ? '⟳ Loading…' : '🔄 Refresh'}
          </button>
        </div>
        {bankrollError && <div style={{ color: '#b91c1c', fontSize: '0.84rem', marginBottom: 8 }}>{bankrollError}</div>}
        {bankroll && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {[
              ['Balance',   bankroll.balance        != null ? `${bankroll.balance.toFixed(2)} u`  : '—', null],
              ['P&L',       bankroll.total_pnl       != null ? `${bankroll.total_pnl >= 0 ? '+' : ''}${bankroll.total_pnl.toFixed(2)} u` : '—', bankroll.total_pnl],
              ['ROI',       bankroll.roi             != null ? `${(bankroll.roi * 100).toFixed(2)}%` : '—', bankroll.roi],
              ['Win Rate',  bankroll.win_rate        != null ? `${(bankroll.win_rate * 100).toFixed(1)}%` : '—', null],
              ['Bets',      bankroll.total_bets      != null ? bankroll.total_bets : '—', null],
              ['Drawdown',  bankroll.max_drawdown    != null ? `${(bankroll.max_drawdown * 100).toFixed(2)}%` : '—', bankroll.max_drawdown ? -1 : null],
            ].map(([label, val, positive]) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: positive == null ? '#0f172a' : positive >= 0 ? '#15803d' : '#b91c1c' }}>{val}</div>
              </div>
            ))}
          </div>
        )}
        {!bankroll && !bankrollLoading && !bankrollError && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click Refresh to load bankroll state.</p>
        )}
      </div>

      {/* ── Decision Log ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>📋 Decision Log</h3>
          <button style={btnSecondary} onClick={loadDecisionLog} disabled={decisionLoading}>
            {decisionLoading ? '⟳ Loading…' : '🔄 Load Last 30'}
          </button>
        </div>
        {decisionError && <div style={{ color: '#b91c1c', fontSize: '0.84rem' }}>{decisionError}</div>}
        {decisionLog && decisionLog.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No decision log entries yet. Run predictions to populate.</p>
        )}
        {decisionLog && decisionLog.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Match', 'Decision', 'Edge', 'Stake', 'Confidence', 'Time'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisionLog.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 10px' }}>{d.home_team?.split(' ').slice(-1)} v {d.away_team?.split(' ').slice(-1)}</td>
                    <td style={{ padding: '5px 10px' }}><span style={badge(d.decision === 'BET' ? 'green' : 'gray')}>{d.decision || '—'}</span></td>
                    <td style={{ padding: '5px 10px', color: (d.edge ?? 0) > 0 ? '#15803d' : '#94a3b8' }}>{d.edge != null ? `${(d.edge * 100).toFixed(2)}%` : '—'}</td>
                    <td style={{ padding: '5px 10px' }}>{d.stake != null ? `${(d.stake * 100).toFixed(2)}%` : '—'}</td>
                    <td style={{ padding: '5px 10px' }}>{d.confidence != null ? `${(d.confidence * 100).toFixed(1)}%` : '—'}</td>
                    <td style={{ padding: '5px 10px', color: '#94a3b8' }}>{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!decisionLog && !decisionLoading && !decisionError && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click Load to view logged prediction decisions.</p>
        )}
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>✨ Manual AI Agent Insights Upload</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 16 }}>
          Attach real AI analysis to any existing match when Gemini, Claude, or Grok API calls are unavailable.
          The uploaded JSON will be used before API keys.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 180px) 1fr', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Match ID</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              placeholder="e.g. 27"
              value={standaloneInsightMatchId}
              onChange={e => setStandaloneInsightMatchId(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Insight JSON File</label>
            <input
              ref={standaloneInsightRef}
              type="file"
              accept=".json,application/json"
              onChange={e => {
                setStandaloneInsightFile(e.target.files?.[0] || null)
                setStandaloneInsightError('')
                setStandaloneInsightResult(null)
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.78rem', color: '#475569' }}>
          Expected format: <code>{'{"insights":{"gemini":{"summary":"..."},"claude":{"summary":"..."},"grok":{"summary":"..."}}}'}</code>
        </div>

        <button
          style={{ ...btnPrimary, marginTop: 14 }}
          onClick={submitStandaloneInsightUpload}
          disabled={!standaloneInsightFile || !standaloneInsightMatchId || standaloneInsightUploading}
        >
          {standaloneInsightUploading ? 'Uploading insights…' : 'Upload AI Insights to Match'}
        </button>

        {standaloneInsightError && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: '0.82rem' }}>{standaloneInsightError}</div>}
        {standaloneInsightResult && (
          <div style={{ marginTop: 10, color: '#166534', fontSize: '0.82rem' }}>
            Saved insights for match #{standaloneInsightResult.match_id}: {standaloneInsightResult.sources?.join(', ')}
          </div>
        )}
      </div>

      {/* ── Manual Match Entry ───────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>➕ Add Match Manually</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 16 }}>
          Use when the Football-Data API is unavailable. Enter match details to run a prediction immediately.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[['home_team', 'Home Team', 'text', 'e.g. Arsenal'], ['away_team', 'Away Team', 'text', 'e.g. Chelsea']].map(([k, lbl, type, ph]) => (
            <div key={k}>
              <label style={labelStyle}>{lbl}</label>
              <input style={inputStyle} type={type} placeholder={ph}
                value={manualForm[k]} onChange={e => updateManual(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>League</label>
            <select style={inputStyle} value={manualForm.league} onChange={e => updateManual('league', e.target.value)}>
              {LEAGUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Kickoff Time</label>
            <input style={inputStyle} type="datetime-local" value={manualForm.kickoff_time}
              onChange={e => updateManual('kickoff_time', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
          {[['home_odds', 'Home Odds'], ['draw_odds', 'Draw Odds'], ['away_odds', 'Away Odds']].map(([k, lbl]) => (
            <div key={k}>
              <label style={labelStyle}>{lbl}</label>
              <input style={inputStyle} type="number" step="0.01" min="1.01"
                value={manualForm[k]} onChange={e => updateManual(k, e.target.value)} />
            </div>
          ))}
        </div>

        {manualError && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>{manualError}</div>}

        <button style={{ ...btnPrimary, marginTop: 16 }} onClick={submitManualMatch} disabled={manualLoading}>
          {manualLoading ? 'Running prediction…' : '🎯 Run Prediction'}
        </button>

        {manualResult && (
          <div style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#15803d' }}>✅ Prediction complete</div>
            <div style={{ fontSize: '0.82rem', color: '#166534', marginBottom: 8 }}>
              Saved as match #{manualResult.match_id || '—'} so AI-agent insight JSON can be attached.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: '0.88rem' }}>
              {[
                ['Home Win', `${((manualResult.predictions?.home_prob || 0) * 100).toFixed(1)}%`],
                ['Draw',     `${((manualResult.predictions?.draw_prob || 0) * 100).toFixed(1)}%`],
                ['Away Win', `${((manualResult.predictions?.away_prob || 0) * 100).toFixed(1)}%`],
                ['Best Bet', manualResult.best_bet?.best_side?.toUpperCase() || 'None'],
                ['Edge',     `${((manualResult.best_bet?.edge || 0) * 100).toFixed(2)}%`],
                ['Stake',    `${((manualResult.best_bet?.kelly_stake || 0) * 100).toFixed(2)}%`],
              ].map(([l, v]) => (
                <div key={l}><span style={{ color: '#64748b' }}>{l}: </span><strong>{v}</strong></div>
              ))}
            </div>
            {manualResult.match_id && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #bbf7d0' }}>
                <label style={{ ...labelStyle, color: '#166534' }}>Upload AI Agent Insights JSON for this match</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input ref={insightFileRef} type="file" accept=".json,application/json" onChange={e => setInsightJson(e.target.files?.[0] || null)} />
                  <button style={btnSecondary} onClick={submitInsightUpload} disabled={!insightJson || insightUploading}>
                    {insightUploading ? 'Uploading…' : 'Upload Insights'}
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#15803d' }}>
                  Supports provider blocks named <code>gemini</code>, <code>claude</code>, and <code>grok</code>. Uploaded data is used before API keys.
                </div>
                {insightUploadError && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: '0.8rem' }}>{insightUploadError}</div>}
                {insightUploadResult && <div style={{ marginTop: 8, color: '#166534', fontSize: '0.8rem' }}>
                  Insight file saved for {insightUploadResult.sources?.join(', ') || 'agents'}.
                </div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Model Weights Upload ─────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>🧠 Upload Trained Model Weights</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 12 }}>
          After training in Google Colab, upload the <code>vit_models.zip</code> file here.
          Models will be extracted and activated immediately — no restart needed.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14, fontSize: '0.82rem', color: '#475569' }}>
          <strong>Expected zip contents:</strong>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['logistic_v1.pkl','rf_v1.pkl','xgb_v1.pkl','poisson_v1.pkl',
              'elo_v1.pkl','dixon_coles_v1.pkl','lstm_v1.pkl','transformer_v1.pkl',
              'ensemble_v1.pkl','market_v1.pkl','bayes_v1.pkl','hybrid_v1.pkl',
              'training_metrics.json'].map(f => (
              <span key={f} style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 7px', fontSize: '0.75rem', fontFamily: 'monospace' }}>{f}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={modelFileRef} type="file" accept=".zip" style={{ display: 'none' }}
            onChange={e => { setModelZip(e.target.files[0]); setModelUploadResult(null); setModelUploadError('') }} />
          <button style={btnSecondary} onClick={() => modelFileRef.current.click()}>
            📂 {modelZip ? modelZip.name : 'Choose vit_models.zip'}
          </button>
          <button style={btnPrimary} onClick={submitModelUpload} disabled={!modelZip || modelUploading}>
            {modelUploading ? 'Uploading & activating…' : '🚀 Upload & Activate Models'}
          </button>
          {modelZip && !modelUploading && (
            <button style={{ ...btnSecondary, padding: '9px 14px' }}
              onClick={() => { setModelZip(null); setModelUploadResult(null); setModelUploadError(''); modelFileRef.current.value = '' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {modelUploading && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#0ea5e9', fontSize: '0.85rem' }}>
            <div style={{ width: 16, height: 16, border: '2px solid #e0f2fe', borderTop: '2px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Extracting files and loading models into memory…
          </div>
        )}

        {modelUploadError && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>
            {modelUploadError}
          </div>
        )}

        {modelUploadResult && (
          <div style={{ marginTop: 14 }}>
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 6 }}>✅ {modelUploadResult.message}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.82rem' }}>
                <span style={badge('green')}>{modelUploadResult.models_ready}/{modelUploadResult.models_total} models active</span>
                {modelUploadResult.saved_data?.length > 0 && <span style={badge('blue')}>📊 Training data saved</span>}
              </div>
            </div>
            {modelUploadResult.saved_models?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>FILES INSTALLED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {modelUploadResult.saved_models.map(f => (
                    <span key={f} style={{ background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontFamily: 'monospace' }}>✓ {f}</span>
                  ))}
                  {modelUploadResult.saved_data?.map(f => (
                    <span key={f} style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontFamily: 'monospace' }}>✓ {f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CSV Upload ───────────────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>📤 Bulk Upload via CSV</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 12 }}>
          CSV columns: <code>home_team, away_team, league, kickoff_time, home_odds, draw_odds, away_odds</code>
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => setCsvFile(e.target.files[0])} />
          <button style={btnSecondary} onClick={() => fileRef.current.click()}>
            📂 {csvFile ? csvFile.name : 'Choose CSV file'}
          </button>
          <button style={btnPrimary} onClick={submitCSV} disabled={!csvFile || csvLoading}>
            {csvLoading ? 'Processing…' : '⚡ Run Batch Predictions'}
          </button>
          {csvFile && <button style={{ ...btnSecondary, padding: '9px 14px' }} onClick={() => { setCsvFile(null); setCsvResult(null); fileRef.current.value = '' }}>✕ Clear</button>}
        </div>

        {csvError && <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>{csvError}</div>}

        {csvResult && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: '0.88rem' }}>
              <span style={badge('green')}>✓ {csvResult.processed} processed</span>
              {csvResult.errors > 0 && <span style={badge('red')}>✕ {csvResult.errors} errors</span>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Match', 'League', 'H / D / A Prob', 'Edge'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvResult.results?.map((r, i) => <CsvResultRow key={i} r={r} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Stream Predictions (existing, enhanced) ──────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>⚡ Auto-Fetch & Predict</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Fixtures:</label>
            <input type="number" min={1} max={20} value={count}
              onChange={e => setCount(Number(e.target.value))}
              style={{ ...inputStyle, width: 64 }} />
            {status !== 'running'
              ? <button style={btnPrimary} onClick={startStream}>▶ Run</button>
              : <button style={{ ...btnSecondary, color: '#b91c1c' }} onClick={stopStream}>■ Stop</button>
            }
          </div>
        </div>

        {status === 'running' && progress.total > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginBottom: 6 }}>
              <span>Processing…</span><span>{progress.current}/{progress.total}</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${(progress.current / progress.total) * 100}%`, background: 'linear-gradient(90deg,#0ea5e9,#6366f1)', height: '100%', borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}

        {log.map((l, i) => (
          <div key={i} style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 3 }}>{l}</div>
        ))}

        {predictions.length > 0 && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Match', 'H%', 'D%', 'A%', 'Edge', 'Stake', 'Models', 'Alert'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map(p => (
                  <tr key={p.index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem', color: '#94a3b8' }}>#{p.index}</td>
                    <td style={{ padding: '7px 10px', fontSize: '0.83rem', fontWeight: 500 }}>
                      {p.home_team?.split(' ').slice(-1)} <span style={{ color: '#94a3b8' }}>v</span> {p.away_team?.split(' ').slice(-1)}
                    </td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem' }}>{(p.home_prob * 100).toFixed(1)}%</td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem' }}>{(p.draw_prob * 100).toFixed(1)}%</td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem' }}>{(p.away_prob * 100).toFixed(1)}%</td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem', fontWeight: 700, color: p.edge > 0.02 ? '#10b981' : '#94a3b8' }}>
                      {(p.edge * 100).toFixed(2)}%
                    </td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem' }}>{(p.stake * 100).toFixed(2)}%</td>
                    <td style={{ padding: '7px 10px', fontSize: '0.82rem', color: '#64748b' }}>
                      {p.models_used ?? 0}/{p.models_total ?? '—'}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={badge(p.alert_sent ? 'green' : 'gray')}>{p.alert_sent ? '📲 Sent' : '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {streamError && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: '0.85rem' }}>{streamError}</div>}
        <div ref={bottomRef} />
      </div>

      {/* ── Subscription Management ───────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>💎 Subscription Management</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 14 }}>
          Manually assign a subscription plan to an API key (admin override).
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Target API key"
            value={subTargetKey}
            onChange={e => setSubTargetKey(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem' }}
          />
          <select
            value={subPlan}
            onChange={e => setSubPlan(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.88rem' }}
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
          <button
            onClick={handleAdminSetPlan}
            disabled={subSaving || !subTargetKey.trim()}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 18px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            }}
          >
            {subSaving ? 'Setting…' : 'Set Plan'}
          </button>
        </div>
        {subMsg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: subMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            color: subMsg.startsWith('✅') ? '#15803d' : '#dc2626',
            fontSize: '0.85rem',
          }}>
            {subMsg}
          </div>
        )}
      </div>

      {/* ── Audit Log ─────────────────────────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>📋 Audit Log</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter by action…"
            value={auditFilter}
            onChange={e => setAuditFilter(e.target.value)}
            style={{ flex: 1, minWidth: 140, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem' }}
          />
          <select
            value={auditStatus}
            onChange={e => setAuditStatus(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem' }}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>
          <button className="btn btn-secondary" onClick={loadAuditLogs} disabled={auditLoading}>
            {auditLoading ? '⟳ Loading…' : '↺ Load Logs'}
          </button>
        </div>

        {!auditLogs ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Click "Load Logs" to fetch the audit trail.</p>
        ) : auditLogs.total === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No audit log entries found.</p>
        ) : (
          <>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              {auditLogs.total} entries (showing latest {auditLogs.logs?.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Time', 'Action', 'Actor', 'Resource', 'Status', 'Details'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#334155' }}>{log.action}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{log.actor || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{log.resource || '—'}{log.resource_id ? ` #${log.resource_id}` : ''}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                          background: log.status === 'success' ? '#dcfce7' : log.status === 'failure' ? '#fee2e2' : '#fef9c3',
                          color: log.status === 'success' ? '#15803d' : log.status === 'failure' ? '#b91c1c' : '#92400e',
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8', fontSize: '0.75rem', maxWidth: 200 }}>
                        {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
