// src/pages/DatasetPanel.jsx
// Priority 5: Dataset Upload, Browser, and Model Comparison

import { useState, useEffect } from 'react'
import {
  uploadTrainingDataset,
  fetchDatasetBrowser,
  fetchModelComparison,
  clearTrainingDataset,
} from '../api'

function fetchDatasetStats(apiKey) {
  return fetch(`/training/dataset/stats?api_key=${encodeURIComponent(apiKey || '')}`)
    .then(r => r.json())
}

function StatBadge({ label, value, color = '#2563eb' }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '10px 16px', textAlign: 'center', minWidth: 110,
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function DatasetPanel({ apiKey }) {
  const [activeTab, setActiveTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [merge, setMerge] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')

  const [stats, setStats] = useState(null)
  const [browser, setBrowser] = useState(null)
  const [browserPage, setBrowserPage] = useState(1)
  const [browserLeague, setBrowserLeague] = useState('')
  const [browserSearch, setBrowserSearch] = useState('')
  const [browserLoading, setBrowserLoading] = useState(false)

  const [models, setModels] = useState(null)
  const [modelsLoading, setModelsLoading] = useState(false)

  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  useEffect(() => {
    loadStats()
  }, [apiKey])

  useEffect(() => {
    if (activeTab === 'browser') loadBrowser()
    if (activeTab === 'models') loadModels()
  }, [activeTab, browserPage, browserLeague])

  async function loadStats() {
    try {
      const s = await fetchDatasetStats(apiKey)
      setStats(s)
    } catch {}
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadError('')
    setUploadResult(null)
    try {
      const res = await uploadTrainingDataset(apiKey, file, merge)
      setUploadResult(res)
      await loadStats()
    } catch (e) {
      let msg = e.message
      try { msg = JSON.parse(msg)?.detail || msg } catch {}
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  async function loadBrowser() {
    setBrowserLoading(true)
    try {
      const res = await fetchDatasetBrowser(apiKey, {
        page: browserPage,
        league: browserLeague || undefined,
        search: browserSearch || undefined,
      })
      setBrowser(res)
    } catch (e) {
      console.error(e)
    } finally {
      setBrowserLoading(false)
    }
  }

  async function loadModels() {
    setModelsLoading(true)
    try {
      const res = await fetchModelComparison(apiKey)
      setModels(res)
    } catch (e) {
      console.error(e)
    } finally {
      setModelsLoading(false)
    }
  }

  async function handleClear() {
    if (!clearConfirm) { setClearConfirm(true); return }
    setClearing(true)
    try {
      await clearTrainingDataset(apiKey)
      await loadStats()
      setBrowser(null)
      setClearConfirm(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setClearing(false)
    }
  }

  const TABS = [
    { id: 'upload', label: '📂 Upload Data' },
    { id: 'browser', label: '🗂 Dataset Browser' },
    { id: 'models', label: '🧠 Model Comparison' },
  ]

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatBadge label="Historical Records" value={stats.historical?.count?.toLocaleString()} color="#2563eb" />
          <StatBadge label="Simulated Records" value={stats.simulated?.count?.toLocaleString()} color="#7c3aed" />
          <StatBadge label="Total Dataset" value={stats.total?.toLocaleString()} color="#0891b2" />
          <StatBadge label="Source" value={stats.historical?.source === 'uploaded_model_weights' ? 'Weights' : 'File'} color="#64748b" />
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === t.id ? 700 : 500,
              padding: '10px 18px', cursor: 'pointer', fontSize: '0.88rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Upload Historical Match Data</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6 }}>
              Upload a <strong>.csv</strong> or <strong>.json</strong> file of historical match results.
              The file will be normalized and saved to <code>historical_matches.json</code> for use in model training.
              <br />
              <strong>CSV required columns:</strong> <code>home_team, away_team, home_goals, away_goals</code>
              <br />
              <strong>Optional:</strong> <code>league, date, season, market_odds, actual_outcome</code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={e => { setFile(e.target.files?.[0] || null); setUploadResult(null); setUploadError('') }}
                style={{ fontSize: '0.88rem', color: '#334155' }}
              />
              {file && (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={merge}
                onChange={e => setMerge(e.target.checked)}
              />
              <span>Merge with existing dataset (instead of replacing)</span>
            </label>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn btn-primary"
              style={{ maxWidth: 220 }}
            >
              {uploading ? '⟳ Uploading…' : '📂 Upload & Normalize'}
            </button>

            {uploadError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: '0.84rem' }}>
                ⚠️ {uploadError}
              </div>
            )}

            {uploadResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 16px', fontSize: '0.85rem', color: '#15803d' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Upload Successful</div>
                <div>Records uploaded: <strong>{uploadResult.records_uploaded?.toLocaleString()}</strong></div>
                <div>Total in dataset: <strong>{uploadResult.records_in_dataset?.toLocaleString()}</strong></div>
                {uploadResult.leagues?.length > 0 && (
                  <div>Leagues: <strong>{uploadResult.leagues.join(', ')}</strong></div>
                )}
                {uploadResult.date_range?.start && (
                  <div>Date range: <strong>{uploadResult.date_range.start} → {uploadResult.date_range.end}</strong></div>
                )}
                {uploadResult.parse_errors?.length > 0 && (
                  <div style={{ color: '#b45309', marginTop: 4 }}>
                    ⚠️ {uploadResult.parse_errors.length} parse errors (first {Math.min(5, uploadResult.parse_errors.length)} shown)
                  </div>
                )}
              </div>
            )}

            {stats?.historical?.count > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  style={{
                    background: clearConfirm ? '#dc2626' : '#f1f5f9',
                    color: clearConfirm ? '#fff' : '#64748b',
                    border: `1px solid ${clearConfirm ? '#dc2626' : '#e2e8f0'}`,
                    borderRadius: 8, padding: '8px 16px',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {clearing ? 'Clearing…' : clearConfirm ? '⚠️ Confirm Clear Dataset' : '🗑 Clear Dataset'}
                </button>
                {clearConfirm && (
                  <button
                    onClick={() => setClearConfirm(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browser Tab */}
      {activeTab === 'browser' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Dataset Browser</div>
            <button className="btn btn-secondary" onClick={loadBrowser}>↺ Refresh</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search team name…"
              value={browserSearch}
              onChange={e => { setBrowserSearch(e.target.value); setBrowserPage(1) }}
              style={{ flex: 1, minWidth: 160, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem' }}
            />
            <select
              value={browserLeague}
              onChange={e => { setBrowserLeague(e.target.value); setBrowserPage(1) }}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem' }}
            >
              <option value="">All Leagues</option>
              {(browser?.leagues || []).map(l => (
                <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={() => { setBrowserSearch(''); setBrowserLeague(''); setBrowserPage(1); loadBrowser() }}>
              Clear
            </button>
          </div>

          {browserLoading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Loading…</div>
          ) : !browser ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No dataset loaded. Upload data first.</div>
          ) : browser.total === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No records match your filter.</div>
          ) : (
            <>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 10 }}>
                {browser.total.toLocaleString()} records · Page {browser.page} of {browser.pages}
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Home</th>
                      <th>Away</th>
                      <th>Score</th>
                      <th>League</th>
                      <th>Date</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {browser.records.map((r, i) => {
                      const score = (r.home_goals != null && r.away_goals != null)
                        ? `${r.home_goals}–${r.away_goals}` : '—'
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.home_team}</td>
                          <td style={{ fontWeight: 600 }}>{r.away_team}</td>
                          <td style={{ fontWeight: 700 }}>{score}</td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {(r.league || '').replace(/_/g, ' ')}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.date || '—'}</td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {r.actual_outcome
                              ? <span style={{
                                  background: r.actual_outcome === 'home' ? '#dcfce7' : r.actual_outcome === 'away' ? '#fee2e2' : '#fef9c3',
                                  color: r.actual_outcome === 'home' ? '#15803d' : r.actual_outcome === 'away' ? '#b91c1c' : '#92400e',
                                  borderRadius: 6, padding: '2px 8px', fontWeight: 700,
                                }}>{r.actual_outcome}</span>
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {browser.pages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary" onClick={() => setBrowserPage(p => Math.max(1, p - 1))} disabled={browser.page <= 1}>← Prev</button>
                  <span className="pagination-label">Page {browser.page} of {browser.pages}</span>
                  <button className="btn btn-secondary" onClick={() => setBrowserPage(p => Math.min(browser.pages, p + 1))} disabled={browser.page >= browser.pages}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Model Comparison Tab */}
      {activeTab === 'models' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Model Performance Comparison</div>
            <button className="btn btn-secondary" onClick={loadModels} disabled={modelsLoading}>
              {modelsLoading ? '⟳' : '↺'} Refresh
            </button>
          </div>

          {modelsLoading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Loading metrics…</div>
          ) : !models || models.models?.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              No model metrics available. Run a training job first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {models.models.map((m, i) => {
                const acc = m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : '—'
                const loss = m.log_loss != null ? m.log_loss.toFixed(4) : '—'
                const ece = m.calibration_error != null ? m.calibration_error.toFixed(4) : '—'
                const rank = i + 1
                return (
                  <div key={m.model} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '12px 16px', background: i === 0 ? '#fffbeb' : '#f8fafc',
                    border: `1px solid ${i === 0 ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: 10, flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#e2e8f0',
                      color: rank <= 3 ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {rank}
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{m.model}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {m.training_samples ? `${m.training_samples.toLocaleString()} samples` : ''}
                        {m.last_trained ? ` · ${new Date(m.last_trained).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>{acc}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Accuracy</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#6366f1', fontSize: '1rem' }}>{loss}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Log Loss</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>{ece}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Calibration Err</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.88rem' }}>v{m.version || 1}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Version</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
