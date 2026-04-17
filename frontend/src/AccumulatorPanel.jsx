// frontend/src/AccumulatorPanel.jsx
// VIT Sports Intelligence — v2.3.0
// Accumulator Generator: fetch candidates → build combos → send to Telegram

import { useState } from 'react'
import {
  fetchAccumulatorCandidates,
  generateAccumulators,
  sendAccumulatorToTelegram,
  API_KEY,
} from './api'

// ── Style tokens (matching AdminPanel) ───────────────────────────────
const card = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 12, padding: '20px 24px', marginBottom: 20,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}
const sectionTitle = { fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 14, marginTop: 0 }
const labelStyle   = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }
const inputStyle   = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', background: '#f8fafc', outline: 'none' }
const btnPrimary   = { background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }
const btnSecondary = { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }
const btnDanger    = { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }

const pill = (color) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
  background: color === 'green' ? '#dcfce7' : color === 'yellow' ? '#fef9c3' : color === 'blue' ? '#dbeafe' : '#f1f5f9',
  color:      color === 'green' ? '#15803d' : color === 'yellow' ? '#92400e' : color === 'blue' ? '#1d4ed8' : '#64748b',
})

const SIDE_LABELS = { home: '🏠 HOME', draw: '🤝 DRAW', away: '✈️ AWAY' }
const LEAGUE_LABELS = {
  premier_league: 'EPL',
  la_liga: 'La Liga',
  bundesliga: 'Bund',
  serie_a: 'Serie A',
  ligue_1: 'L1',
  championship: 'Championship',
  eredivisie: 'Eredivisie',
  primeira_liga: 'Primeira Liga',
  scottish_premiership: 'Scottish Premiership',
  belgian_pro_league: 'Belgian Pro League',
}

// ── Edge strength emoji ───────────────────────────────────────────────
function edgeEmoji(e) {
  if (e >= 0.05) return '🔥🔥🔥'
  if (e >= 0.03) return '🔥🔥'
  if (e >= 0.01) return '🔥'
  return '📊'
}

// ── Candidate Card ────────────────────────────────────────────────────
function CandidateCard({ c, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        border: `2px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
        background: selected ? '#eef2ff' : '#fafafa',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
        {c.home_team.split(' ').slice(-1)} <span style={{ color: '#94a3b8' }}>vs</span> {c.away_team.split(' ').slice(-1)}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>
        <span style={pill('blue')}>{LEAGUE_LABELS[c.league] || c.league}</span>
        {' '}{c.kickoff?.slice(0, 10)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={pill('green')}>{SIDE_LABELS[c.best_side]} @ {c.best_odds.toFixed(2)}</span>
        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
          {edgeEmoji(c.edge)} {(c.edge * 100).toFixed(1)}% edge
        </span>
        <span style={{ fontSize: '0.78rem', color: '#6366f1' }}>
          {(c.confidence * 100).toFixed(0)}% conf
        </span>
      </div>
    </div>
  )
}

// ── Accumulator Card ──────────────────────────────────────────────────
function AccumulatorCard({ acc, onSend, sending }) {
  const adjEdge = acc.adjusted_edge
  const hasPenalty = acc.correlation_penalty > 0

  return (
    <div style={{
      border: `2px solid ${adjEdge > 0.03 ? '#6366f1' : '#e2e8f0'}`,
      borderRadius: 12, padding: '16px 18px',
      background: adjEdge > 0.03 ? '#fafafe' : '#fff',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 800, fontSize: '1rem' }}>
          {acc.n_legs}-Leg Acca {edgeEmoji(adjEdge)}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={pill(adjEdge > 0.03 ? 'green' : adjEdge > 0 ? 'yellow' : 'gray')}>
            Edge: {(adjEdge * 100).toFixed(2)}%
          </span>
          <span style={pill('blue')}>
            @ {acc.combined_odds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Legs */}
      <div style={{ marginBottom: 12 }}>
        {acc.legs.map((leg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
            <span style={{ color: '#94a3b8', minWidth: 16 }}>{i + 1}.</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{leg.home_team} vs {leg.away_team}</span>
            <span style={pill('green')}>{SIDE_LABELS[leg.best_side]}</span>
            <span style={{ color: '#64748b' }}>@ {leg.best_odds.toFixed(2)}</span>
            <span style={{ color: '#6366f1' }}>{(leg.confidence * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: '#64748b', flexWrap: 'wrap', marginBottom: 12 }}>
        <span>Combined prob: <strong>{(acc.combined_prob * 100).toFixed(2)}%</strong></span>
        <span>Fair odds: <strong>{acc.fair_odds.toFixed(2)}</strong></span>
        <span>Avg conf: <strong>{(acc.avg_confidence * 100).toFixed(0)}%</strong></span>
        <span>Stake: <strong style={{ color: '#0ea5e9' }}>{(acc.kelly_stake * 100).toFixed(1)}%</strong></span>
        {hasPenalty && (
          <span style={{ color: '#f59e0b' }}>
            ⚠ Correlation penalty: -{(acc.correlation_penalty * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Send button */}
      <button
        style={{ ...btnPrimary, fontSize: '0.83rem', padding: '7px 16px' }}
        onClick={() => onSend(acc)}
        disabled={sending}
      >
        {sending ? 'Sending…' : '📲 Send to Telegram'}
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function AccumulatorPanel({ apiKey }) {
  const key = apiKey || API_KEY

  // Candidates
  const [candidates, setCandidates] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [candLoading, setCandLoading] = useState(false)
  const [candError, setCandError]     = useState('')
  const [candFilters, setCandFilters] = useState({ minConfidence: 0.60, minEdge: 0.01, count: 15 })

  // Accumulators
  const [accumulators, setAccumulators] = useState([])
  const [accLoading, setAccLoading]     = useState(false)
  const [accError, setAccError]         = useState('')
  const [accFilters, setAccFilters]     = useState({ minLegs: 2, maxLegs: 6, topN: 10 })

  // Sending
  const [sendingIdx, setSendingIdx] = useState(null)
  const [sendMsg, setSendMsg]       = useState('')

  async function loadCandidates() {
    setCandLoading(true); setCandError(''); setCandidates([]); setSelectedIds(new Set()); setAccumulators([])
    try {
      const r = await fetchAccumulatorCandidates(key, candFilters)
      setCandidates(r.candidates || [])
      // Auto-select all
      setSelectedIds(new Set((r.candidates || []).map((_, i) => i)))
    } catch (e) { setCandError(e.message) }
    finally { setCandLoading(false) }
  }

  function toggleCandidate(i) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function buildAccumulators() {
    const selected = candidates.filter((_, i) => selectedIds.has(i))
    if (selected.length < accFilters.minLegs) {
      setAccError(`Select at least ${accFilters.minLegs} candidates.`); return
    }
    setAccLoading(true); setAccError(''); setAccumulators([])
    try {
      const r = await generateAccumulators(key, {
        candidates: selected,
        minLegs:    accFilters.minLegs,
        maxLegs:    Math.min(accFilters.maxLegs, selected.length),
        topN:       accFilters.topN,
      })
      setAccumulators(r.accumulators || [])
    } catch (e) { setAccError(e.message) }
    finally { setAccLoading(false) }
  }

  async function sendToTelegram(acc, idx) {
    setSendingIdx(idx); setSendMsg('')
    try {
      const r = await sendAccumulatorToTelegram(key, acc)
      setSendMsg(r.sent ? '✅ Sent to Telegram!' : '❌ Send failed')
    } catch (e) { setSendMsg(`❌ ${e.message}`) }
    finally { setSendingIdx(null) }
  }

  const selectedCount = selectedIds.size

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Step 1: Fetch Candidates ─────────────────────────────── */}
      <div style={card}>
        <h3 style={sectionTitle}>Step 1 — Fetch Candidates</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: -6, marginBottom: 14 }}>
          Pulls upcoming fixtures, runs predictions, and returns matches with positive edge for accumulator legs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Min Confidence</label>
            <input style={inputStyle} type="number" step="0.05" min="0" max="1"
              value={candFilters.minConfidence}
              onChange={e => setCandFilters(f => ({ ...f, minConfidence: parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label style={labelStyle}>Min Edge</label>
            <input style={inputStyle} type="number" step="0.005" min="0" max="0.5"
              value={candFilters.minEdge}
              onChange={e => setCandFilters(f => ({ ...f, minEdge: parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label style={labelStyle}>Max Matches to Scan</label>
            <input style={inputStyle} type="number" min="5" max="30"
              value={candFilters.count}
              onChange={e => setCandFilters(f => ({ ...f, count: parseInt(e.target.value) }))} />
          </div>
        </div>

        <button style={btnPrimary} onClick={loadCandidates} disabled={candLoading}>
          {candLoading ? 'Fetching candidates…' : '🔍 Find Candidates'}
        </button>

        {candError && <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>{candError}</div>}

        {candidates.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                {candidates.length} candidates found — {selectedCount} selected
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnSecondary, padding: '6px 14px', fontSize: '0.82rem' }}
                  onClick={() => setSelectedIds(new Set(candidates.map((_, i) => i)))}>
                  Select All
                </button>
                <button style={{ ...btnSecondary, padding: '6px 14px', fontSize: '0.82rem' }}
                  onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {candidates.map((c, i) => (
                <CandidateCard key={i} c={c} selected={selectedIds.has(i)} onToggle={() => toggleCandidate(i)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: Build Accumulators ───────────────────────────── */}
      {candidates.length > 0 && (
        <div style={card}>
          <h3 style={sectionTitle}>Step 2 — Build Accumulators</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Min Legs</label>
              <input style={inputStyle} type="number" min="2" max="8"
                value={accFilters.minLegs}
                onChange={e => setAccFilters(f => ({ ...f, minLegs: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Max Legs</label>
              <input style={inputStyle} type="number" min="2" max="8"
                value={accFilters.maxLegs}
                onChange={e => setAccFilters(f => ({ ...f, maxLegs: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Top N Results</label>
              <input style={inputStyle} type="number" min="1" max="20"
                value={accFilters.topN}
                onChange={e => setAccFilters(f => ({ ...f, topN: parseInt(e.target.value) }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={buildAccumulators} disabled={accLoading || selectedCount < accFilters.minLegs}>
              {accLoading ? 'Generating…' : `🎰 Generate Accumulators (${selectedCount} selected)`}
            </button>
            {selectedCount < accFilters.minLegs && (
              <span style={{ fontSize: '0.82rem', color: '#f59e0b' }}>
                ⚠ Select at least {accFilters.minLegs} candidates
              </span>
            )}
          </div>

          {accError && <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem' }}>{accError}</div>}
        </div>
      )}

      {/* ── Step 3: Top Accumulators ─────────────────────────────── */}
      {accumulators.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>
              Step 3 — Top {accumulators.length} Accumulators
            </h3>
            {sendMsg && (
              <span style={{ fontSize: '0.85rem', color: sendMsg.startsWith('✅') ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                {sendMsg}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.83rem', color: '#64748b', marginTop: -8, marginBottom: 16 }}>
            Sorted by adjusted edge (after same-league correlation penalty). Click "Send to Telegram" to push any accumulator to your channel.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
            {accumulators.map((acc, i) => (
              <AccumulatorCard
                key={i}
                acc={acc}
                onSend={(a) => sendToTelegram(a, i)}
                sending={sendingIdx === i}
              />
            ))}
          </div>
        </div>
      )}

      {accumulators.length === 0 && !accLoading && candidates.length > 0 && (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎰</div>
          <p style={{ margin: 0 }}>Select candidates and click Generate to build accumulators.</p>
        </div>
      )}
    </div>
  )
}
