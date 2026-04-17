// frontend/src/App.jsx — VIT Sports Intelligence Network v3.0.0
// Professional UI: fixed sidebar (desktop) + drawer sidebar (mobile)

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchHealth, fetchHistory, fetchPicks, predictMatch, fetchFixturesByDate, fetchFixtureById, getApiKey, setApiKey } from './api'
import AdminPanel       from './AdminPanel'
import AccumulatorPanel from './AccumulatorPanel'
import TrainingPanel    from './TrainingPanel'
import AnalyticsPanel   from './AnalyticsPanel'
import OddsPanel        from './OddsPanel'
import MatchDetail      from './MatchDetail'
import ResponsiveNav from './components/ResponsiveNav'
import BottomNav     from './components/BottomNav'
import { NAV_ITEMS } from './navConfig'
import DashboardPage from './pages/DashboardPage'
import PremiumMatchCard from './components/PremiumMatchCard'
import { LoadingSpinner } from './components/LoadingStates'
import SubscriptionPage from './pages/SubscriptionPage'
import DatasetPanel from './pages/DatasetPanel'
import './App.css'

/* ── Constants ────────────────────────────────────────────────────── */
const DEFAULT_FORM = {
  home_team: '', away_team: '', league: 'premier_league',
  kickoff_time: new Date().toISOString().slice(0, 16),
}

const LEAGUES = [
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

const PAGE_META = {
  dashboard:    { title: 'Dashboard',        sub: 'Predict match outcomes and review recent analysis' },
  picks:        { title: 'Market Picks',     sub: 'Value bets identified by the ensemble' },
  accumulator:  { title: 'Accumulators',     sub: 'Build multi-leg combination bets' },
  analytics:    { title: 'Analytics',        sub: 'Model accuracy, ROI and CLV tracking' },
  odds:         { title: 'Odds & Arbitrage', sub: 'Multi-bookmaker comparison and arb scanner' },
  training:     { title: 'Training',         sub: 'Retrain models and upload new weights' },
  dataset:      { title: 'Dataset Manager',  sub: 'Upload CSV/JSON data, browse records and compare models' },
  admin:        { title: 'Admin',            sub: 'Data management and system configuration' },
  subscription: { title: 'Subscription Plans', sub: 'Manage your plan and unlock premium features' },
}

/* ── Main App ─────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]              = useState('dashboard')
  const [sidebarOpen, setSidebar]  = useState(false)
  const [health, setHealth]        = useState(null)
  const [history, setHistory]      = useState([])
  const [picks, setPicks]          = useState(null)
  const [form, setForm]            = useState(DEFAULT_FORM)
  const [prediction, setPred]      = useState(null)
  const [loading, setLoading]      = useState(false)
  const [picksLoading, setPL]      = useState(false)
  const [error, setError]          = useState('')
  const [page, setPage]            = useState(0)
  const [matchId, setMatchId]      = useState(null)
  const [adminKey, setAdminKey]    = useState(getApiKey())

  // Dashboard fixture browser
  const [dashFixtures, setDashFixtures]       = useState(null)
  const [dashFixDate, setDashFixDate]         = useState(null)
  const [dashFixLoading, setDashFixLoading]   = useState(false)
  const [dashFixError, setDashFixError]       = useState('')
  const [predictingIdx, setPredictingIdx]     = useState(null)

  const PER_PAGE = 10

  /* Market odds are fetched from OddsPanel instead of manual entry */

  useEffect(() => {
    pollHealth()
    const id = setInterval(pollHealth, 15_000)
    return () => clearInterval(id)
  }, [])

  // Load history only when a key is available; reload whenever key changes
  useEffect(() => {
    if (adminKey) loadHistory()
  }, [adminKey])

  useEffect(() => { if (tab === 'picks' && !picks && adminKey) loadPicks() }, [tab, adminKey])

  async function pollHealth() {
    try {
      const data = await fetchHealth()
      console.log('[Health] Status:', data?.status)
      setHealth(data)
    } catch (error) {
      console.error('[Health] Poll failed:', error.message)
      setHealth(null)
    }
  }

  async function loadHistory() {
    try {
      const r = await fetchHistory(100, 0)
      setHistory(r.predictions || [])
      setPage(0)
    } catch {}
  }

  async function loadPicks() {
    setPL(true)
    try { setPicks(await fetchPicks()) } catch (e) { setError(e.message) } finally { setPL(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.home_team.trim() || !form.away_team.trim()) { setError('Enter both team names.'); return }
    if (form.home_team.trim() === form.away_team.trim())  { setError('Teams must be different.'); return }
    setLoading(true); setError(''); setPred(null)
    try {
      const res = await predictMatch({
        home_team:    form.home_team.trim(),
        away_team:    form.away_team.trim(),
        league:       form.league,
        kickoff_time: new Date(form.kickoff_time).toISOString(),
        market_odds:  {},
      })
      setPred(res)
      await loadHistory()
      if (picks) setPicks(null)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  function field(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const DASH_DAY_BTNS = Array.from({ length: 8 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const label    = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' })
    const dateStr  = d.toISOString().slice(0, 10)
    const shortDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { label, dateStr, shortDate }
  })

  async function loadDashFixtures(dateStr) {
    setDashFixDate(dateStr); setDashFixLoading(true); setDashFixError(''); setDashFixtures(null)
    try { setDashFixtures(await fetchFixturesByDate(adminKey, dateStr)) }
    catch (e) { setDashFixError(e.message) }
    finally { setDashFixLoading(false) }
  }

  async function predictFixture(fix, idx) {
    setPredictingIdx(idx); setError(''); setPred(null)
    try {
      const res = await predictMatch({
        fixture_id:   fix.fixture_id,  // Include unique fixture ID
        home_team:    fix.home_team,
        away_team:    fix.away_team,
        league:       fix.league,
        kickoff_time: fix.kickoff_time || new Date().toISOString(),
        market_odds:  fix.market_odds || {},
      })
      setPred(res)
      setForm(f => ({ ...f, home_team: fix.home_team, away_team: fix.away_team, league: fix.league }))
      await loadHistory()
      if (picks) setPicks(null)
    } catch (e) { setError(e.message) }
    finally { setPredictingIdx(null) }
  }

  const paginated = history.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const maxPages  = Math.ceil(history.length / PER_PAGE)

  /* Status */
  const online   = health?.status === 'ok'
  const modelsOk = (health?.models_loaded || 0) >= 10
  const dbOk     = health?.db_connected

  /* Navigate and close mobile sidebar */
  function navigate(id) {
    setTab(id)
    setSidebar(false)
  }

  const meta = PAGE_META[tab] || {}

  return (
    <div className="app-shell">
      <ResponsiveNav items={NAV_ITEMS} activeId={tab} onNavigate={navigate} branding="VIT Predict" />

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="main-content">

        {/* Admin key and status — desktop only */}
        <div className="admin-bar-desktop" style={{
          padding: '10px 36px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(248,250,252,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="password"
              placeholder="Enter admin key…"
              value={adminKey}
              onChange={(e) => { setAdminKey(e.target.value); setApiKey(e.target.value) }}
              style={{
                padding: '7px 14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 999,
                fontSize: '0.85rem',
                width: 220,
                background: '#fff',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              aria-label="Admin API key"
            />
          </div>
          <div style={{ display:'flex', gap: 6, alignItems: 'center' }}>
            <div className={`status-dot ${online ? 'dot-green' : 'dot-red'}`} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: online ? '#059669' : '#dc2626' }}>
              {online ? 'API Online' : 'API Offline'}
            </span>
          </div>
        </div>

        {/* ── Padded content area ─────────────────────────────────── */}
        <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24, flex: 1, maxWidth: 1260, width: '100%', alignSelf: 'center', boxSizing: 'border-box' }}>

        {/* Page header */}
        <div className="page-head fade-up" key={tab}>
          <div>
            <div className="page-head-title">{meta.title}</div>
            {meta.sub && <div className="page-head-sub">{meta.sub}</div>}
          </div>
        </div>

        {/* ════ DASHBOARD ════════════════════════════════════════ */}
        {tab === 'dashboard' && <DashboardPage />}

        {/* ════ DASHBOARD (stat tiles + fixtures + predictions) ═══ */}
        {tab === 'dashboard' && (
          <div className="fade-up">
            <div className="stats-row">
              <div className="stat-tile blue">
                <div className="stat-label">Total Predictions</div>
                <div className="stat-value blue">{history.length}</div>
              </div>
              <div className="stat-tile green">
                <div className="stat-label">Active Models</div>
                <div className={`stat-value ${modelsOk ? 'green' : ''}`}>
                  {health?.models_loaded ?? '—'}<span style={{ fontSize:'1rem', fontWeight:600 }}>/12</span>
                </div>
              </div>
              <div className="stat-tile purple">
                <div className="stat-label">With Edge &gt;2%</div>
                <div className="stat-value purple">
                  {history.filter(h => (h.final_ev || h.edge || 0) > 0.02).length}
                </div>
              </div>
              <div className="stat-tile orange">
                <div className="stat-label">Avg Edge</div>
                <div className="stat-value orange">
                  {history.length
                    ? `${(history.reduce((s, h) => s + (h.final_ev || h.edge || 0), 0) / history.length * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {/* ── Fixtures by day ─────────────────────────────────── */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📅 Browse Fixtures</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {DASH_DAY_BTNS.map(({ label, dateStr, shortDate }) => {
                  const isActive = dashFixDate === dateStr
                  return (
                    <button
                      key={dateStr}
                      className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '6px 13px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, lineHeight: 1.25 }}
                      onClick={() => loadDashFixtures(dateStr)}
                      disabled={dashFixLoading}
                    >
                      <span>{label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.78 }}>{shortDate}</span>
                    </button>
                  )
                })}
                {dashFixLoading && <span style={{ alignSelf: 'center', color: '#0ea5e9', fontSize: '0.85rem' }}>Loading…</span>}
              </div>

              {dashFixError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {dashFixError}</div>
              )}

              {dashFixtures && !dashFixLoading && (
                <>
                  {dashFixtures.total === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>No fixtures found for {dashFixDate}.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {dashFixtures.fixtures.map((fix, idx) => {
                        const ko = fix.kickoff_time
                          ? new Date(fix.kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                          : '—'
                        const leagueLabel = fix.league?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
                        const mo = fix.market_odds || {}
                        const isPredicting = predictingIdx === idx
                        const isReal = fix.fixture_id && !fix.fixture_id.startsWith('synthetic')
                        return (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 12, padding: '10px 14px', background: '#f8fafc',
                            border: `1px solid ${isReal ? '#10b981' : '#fbbf24'}`, borderRadius: 10, flexWrap: 'wrap',
                          }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                                {fix.home_team} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.8rem' }}>vs</span> {fix.away_team}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                                {leagueLabel} · {ko}
                                {mo.home ? <span style={{ marginLeft: 8, color: '#334155' }}>{mo.home.toFixed(2)} / {mo.draw?.toFixed(2)} / {mo.away?.toFixed(2)}</span> : null}
                                {fix.fixture_id && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#94a3b8' }}>ID: {fix.fixture_id.slice(0, 20)}…</span>}
                              </div>
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '0.82rem', padding: '6px 16px', whiteSpace: 'nowrap', background: isReal ? '#0ea5e9' : '#f59e0b' }}
                              onClick={() => predictFixture(fix, idx)}
                              disabled={isPredicting || loading}
                              title={fix.fixture_id ? `Fixture ID: ${fix.fixture_id}` : 'Synthetic fixture'}
                            >
                              {isPredicting ? '⟳ Running…' : '🔮 Predict'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {!dashFixtures && !dashFixLoading && (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  Select a day above to load scheduled fixtures and predict any match with one click.
                </p>
              )}
            </div>

            {/* Prediction card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🎯 Make a Prediction</div>
              </div>

              <form className="pred-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="home_team">Home Team</label>
                    <input id="home_team" type="text" placeholder="e.g. Arsenal"
                      value={form.home_team} onChange={e => field('home_team', e.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="away_team">Away Team</label>
                    <input id="away_team" type="text" placeholder="e.g. Chelsea"
                      value={form.away_team} onChange={e => field('away_team', e.target.value)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="league">League</label>
                    <select id="league" value={form.league} onChange={e => field('league', e.target.value)}>
                      {LEAGUES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="kickoff">Kickoff Time</label>
                    <input id="kickoff" type="datetime-local" value={form.kickoff_time}
                      onChange={e => field('kickoff_time', e.target.value)} required />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? '⟳ Generating…' : '🔮 Get Prediction'}
                </button>
              </form>

              {error && (
                <div className="alert alert-error" style={{ marginTop: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              {prediction && (
                <div className="result-card">
                  <h3>📊 Prediction Results — {form.home_team} vs {form.away_team}</h3>
                  <dl className="result-grid">
                    {[
                      ['Home Win',   `${(prediction.home_prob * 100).toFixed(1)}%`,                               null],
                      ['Draw',       `${(prediction.draw_prob * 100).toFixed(1)}%`,                               null],
                      ['Away Win',   `${(prediction.away_prob * 100).toFixed(1)}%`,                               null],
                      ['Over 2.5',   prediction.over_25_prob != null ? `${(prediction.over_25_prob * 100).toFixed(1)}%` : '—', null],
                      ['BTTS',       prediction.btts_prob != null ? `${(prediction.btts_prob * 100).toFixed(1)}%` : '—', null],
                      ['Edge',       `${(prediction.final_ev * 100).toFixed(2)}%`,   prediction.final_ev > 0 ? '#059669' : '#dc2626'],
                      ['Stake',      `${(prediction.recommended_stake * 100).toFixed(2)}%`, '#2563eb'],
                      ['Confidence', `${(prediction.confidence * 100).toFixed(0)}%`, '#7c3aed'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="result-tile">
                        <dt>{label}</dt>
                        <dd style={color ? { color, fontWeight: 800 } : {}}>{val}</dd>
                      </div>
                    ))}
                  </dl>
                  <button className="btn btn-secondary"
                    onClick={() => setMatchId(prediction.match_id)}>
                    View Full Detail →
                  </button>
                </div>
              )}
            </div>

            {/* History table */}
            {history.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📈 Prediction History</div>
                  <button className="btn btn-secondary" onClick={loadHistory}>↺ Refresh</button>
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Match</th>
                        <th>FT</th>
                        <th>League</th>
                        <th>1</th>
                        <th>X</th>
                        <th>2</th>
                        <th>Edge</th>
                        <th>Stake</th>
                        <th>P&amp;L</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(item => {
                        const ev = item.final_ev || item.edge || 0
                        const leagueLabel = item.league?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
                        const outcome = item.actual_outcome
                        const outcomeBg = outcome === 'home' ? '#dcfce7' : outcome === 'away' ? '#fee2e2' : outcome === 'draw' ? '#fef9c3' : 'transparent'
                        const outcomeColor = outcome === 'home' ? '#15803d' : outcome === 'away' ? '#b91c1c' : outcome === 'draw' ? '#92400e' : '#94a3b8'
                        return (
                          <tr key={`${item.match_id}-${item.timestamp}`}
                            className="clickable" onClick={() => setMatchId(item.match_id)}>
                            <td>
                              <span style={{ fontWeight: 600 }}>{item.home_team}</span>
                              <span className="text-muted" style={{ margin: '0 5px', fontWeight: 400 }}>v</span>
                              <span style={{ fontWeight: 600 }}>{item.away_team}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {item.ft_score
                                ? <span style={{ fontWeight: 700, fontSize: '0.92rem', background: outcomeBg, color: outcomeColor, borderRadius: 6, padding: '2px 8px' }}>{item.ft_score}</span>
                                : <span className="text-muted" style={{ fontSize: '0.78rem' }}>Pending</span>}
                            </td>
                            <td className="text-muted" style={{ fontSize: '0.8rem' }}>{leagueLabel}</td>
                            <td>{(item.home_prob * 100).toFixed(1)}%</td>
                            <td>{(item.draw_prob * 100).toFixed(1)}%</td>
                            <td>{(item.away_prob * 100).toFixed(1)}%</td>
                            <td className={ev > 0 ? 'text-green' : 'text-red'}>{(ev * 100).toFixed(2)}%</td>
                            <td className="text-blue">{(item.recommended_stake * 100).toFixed(2)}%</td>
                            <td style={{ fontWeight: 600, color: item.profit == null ? '#94a3b8' : item.profit >= 0 ? '#15803d' : '#b91c1c' }}>
                              {item.profit == null ? '—' : `${item.profit >= 0 ? '+' : ''}${item.profit.toFixed(2)}u`}
                            </td>
                            <td className="text-muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {item.timestamp
                                ? new Date(item.timestamp).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {maxPages > 1 && (
                  <div className="pagination">
                    <button className="btn btn-secondary"
                      onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                      ← Prev
                    </button>
                    <span className="pagination-label">Page {page + 1} of {maxPages}</span>
                    <button className="btn btn-secondary"
                      onClick={() => setPage(p => Math.min(maxPages - 1, p + 1))} disabled={page >= maxPages - 1}>
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ PICKS ════════════════════════════════════════════ */}
        {tab === 'picks' && (
          <div className="fade-up">
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
              <button className="btn btn-secondary" onClick={loadPicks} disabled={picksLoading}>
                {picksLoading ? '⟳ Loading…' : '↺ Refresh Picks'}
              </button>
            </div>
            {picksLoading && <LoadingSpinner />}
            {picksLoading && <div className="empty-state"><p>Loading picks…</p></div>}

            {picks && !picksLoading && (
              <>
                {picks.certified_picks?.length > 0 && (
                  <div className="picks-section">
                    <div className="picks-section-header">
                      <h3>Certified Picks</h3>
                      <span className="picks-count">{picks.certified_count}</span>
                    </div>
                    <div className="picks-grid">
                      {picks.certified_picks.map(p => (
                        <PremiumMatchCard key={p.match_id} match={p} onSelect={setMatchId} />
                      ))}
                    </div>
                  </div>
                )}

                {picks.high_confidence_picks?.length > 0 && (
                  <div className="picks-section">
                    <div className="picks-section-header">
                      <h3>High Confidence</h3>
                      <span className="picks-count">{picks.high_confidence_count}</span>
                    </div>
                    <div className="picks-grid">
                      {picks.high_confidence_picks.map(p => (
                        <PremiumMatchCard key={p.match_id} match={p} onSelect={setMatchId} />
                      ))}
                    </div>
                  </div>
                )}

                {!picks.certified_picks?.length && !picks.high_confidence_picks?.length && (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>No qualifying picks yet. Run predictions to populate this.</p>
                  </div>
                )}
              </>
            )}

            {!picks && !picksLoading && (
              <div className="empty-state">
                <div className="empty-icon">🏅</div>
                <p>Click Refresh Picks to load current opportunities.</p>
              </div>
            )}
          </div>
        )}

        {/* ════ ACCUMULATORS ═════════════════════════════════════ */}
        {tab === 'accumulator' && (
          <div className="fade-up">
            <AccumulatorPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ ANALYTICS ════════════════════════════════════════ */}
        {tab === 'analytics' && (
          <div className="fade-up">
            <AnalyticsPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ ODDS ═════════════════════════════════════════════ */}
        {tab === 'odds' && (
          <div className="fade-up">
            <OddsPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ TRAINING ═════════════════════════════════════════ */}
        {tab === 'training' && (
          <div className="fade-up">
            <TrainingPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ DATASET MANAGER ══════════════════════════════════ */}
        {tab === 'dataset' && (
          <div className="fade-up">
            <DatasetPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ ADMIN ════════════════════════════════════════════ */}
        {tab === 'admin' && (
          <div className="fade-up">
            <AdminPanel apiKey={adminKey} />
          </div>
        )}

        {/* ════ SUBSCRIPTION ═════════════════════════════════════ */}
        {tab === 'subscription' && (
          <div className="fade-up">
            <SubscriptionPage apiKey={adminKey} />
          </div>
        )}

        </div>{/* end padded content area */}
      </main>

      {/* ── Bottom Navigation — mobile only ────────────────────── */}
      <BottomNav
        activeId={tab}
        onNavigate={navigate}
        adminKey={adminKey}
        onAdminKeyChange={(val) => { setAdminKey(val); setApiKey(val) }}
      />
    </div>
  )
}
