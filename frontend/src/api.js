// frontend/src/api.js
// VIT Sports Intelligence Network — v3.1.0

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
console.log('[API] Base URL:', API_BASE_URL || '(using relative URLs)')
export const API_KEY = ''
export function getApiKey() { return localStorage.getItem('vit_api_key') || '' }
export function setApiKey(value) { localStorage.setItem('vit_api_key', value || '') }

function defaultHeaders(extra = {}) {
  const key = getApiKey()
  return { 'Content-Type': 'application/json', ...(key ? { 'x-api-key': key } : {}), ...extra }
}

function authHeaders(apiKey, extra = {}) {
  const key = apiKey || getApiKey()
  return { 'Content-Type': 'application/json', ...(key ? { 'x-api-key': key } : {}), ...extra }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  try {
    const res = await fetch(url, {
      headers: defaultHeaders(),
      ...options,
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[API] Error at ${path}:`, res.status, text)
      throw new Error(text || res.statusText || 'Request failed')
    }
    return await res.json()
  } catch (error) {
    console.error(`[API] Fetch failed for ${path}:`, error.message)
    throw error
  }
}

// ── Public (no auth required) ──────────────────────────────────────────────
export async function fetchHealth() { return apiFetch('/health') }

// ── Auth-required (key read from localStorage via defaultHeaders) ──────────
export async function fetchHistory(limit = 10, offset = 0) {
  return apiFetch(`/history?limit=${limit}&offset=${offset}`)
}
export async function fetchMatchDetail(matchId) { return apiFetch(`/history/${matchId}`) }
export async function fetchPicks()              { return apiFetch('/history/picks') }

export async function clearHistory(apiKey) {
  return apiFetch('/history/clear-all', { method: 'DELETE', headers: authHeaders(apiKey) })
}

export async function predictMatch(matchData) {
  return apiFetch('/predict', { method: 'POST', body: JSON.stringify(matchData) })
}

// ── Admin — fixtures ───────────────────────────────────────────────────────
export async function fetchFixturesByDate(apiKey, date, count = 25) {
  return apiFetch(`/admin/fixtures/by-date?date=${encodeURIComponent(date)}&count=${count}`, {
    headers: authHeaders(apiKey),
  })
}
export async function fetchFixtureById(fixtureId) {
  return apiFetch(`/admin/fixtures/by-id/${encodeURIComponent(fixtureId)}`)
}

// ── Admin — Model Management ───────────────────────────────────────────────
export async function fetchModelStatus(apiKey) {
  return apiFetch('/admin/models/status', { headers: authHeaders(apiKey) })
}

export async function reloadModels(apiKey, modelKey = null) {
  return apiFetch('/admin/models/reload', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ model_key: modelKey }),
  })
}

// ── Admin — Data Source Health ─────────────────────────────────────────────
export async function fetchDataSourceStatus(apiKey) {
  return apiFetch('/admin/data-sources/status', { headers: authHeaders(apiKey) })
}

// ── Admin — Manual Match Entry ─────────────────────────────────────────────
export async function addManualMatch(apiKey, matchData) {
  return apiFetch('/admin/matches/manual', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(matchData),
  })
}

// ── Admin — CSV Upload ─────────────────────────────────────────────────────
export async function uploadCSVFixtures(apiKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(
    `${API_BASE_URL}/admin/upload/csv`,
    { method: 'POST', headers: apiKey ? { 'x-api-key': apiKey } : {}, body: formData }
  )
  if (!res.ok) throw new Error(await res.text() || 'Upload failed')
  return res.json()
}

// ── Admin — Model Weights Upload ───────────────────────────────────────────
export async function uploadModelWeights(apiKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(
    `${API_BASE_URL}/admin/upload/models`,
    { method: 'POST', headers: apiKey ? { 'x-api-key': apiKey } : {}, body: formData }
  )
  if (!res.ok) throw new Error(await res.text() || 'Upload failed')
  return res.json()
}

export async function uploadMatchInsights(apiKey, matchId, file) {
  const formData = new FormData()
  formData.append('match_id', String(matchId))
  formData.append('file', file)
  const res = await fetch(
    `${API_BASE_URL}/admin/upload/insights`,
    { method: 'POST', headers: apiKey ? { 'x-api-key': apiKey } : {}, body: formData }
  )
  if (!res.ok) throw new Error(await res.text() || 'Insight upload failed')
  return res.json()
}

// ── Admin — Accumulator ────────────────────────────────────────────────────
export async function fetchAccumulatorCandidates(apiKey, { minConfidence = 0.60, minEdge = 0.01, count = 15 } = {}) {
  return apiFetch(
    `/admin/accumulator/candidates?min_confidence=${minConfidence}&min_edge=${minEdge}&count=${count}`,
    { headers: authHeaders(apiKey) }
  )
}

export async function generateAccumulators(apiKey, { candidates, minLegs = 2, maxLegs = 6, topN = 10 }) {
  return apiFetch('/admin/accumulator/generate', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ candidates, min_legs: minLegs, max_legs: maxLegs, top_n: topN }),
  })
}

export async function sendAccumulatorToTelegram(apiKey, accumulator, channelNote = '') {
  return apiFetch('/admin/accumulator/send', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ accumulator, channel_note: channelNote }),
  })
}

// ── Admin — Results Settlement ─────────────────────────────────────────────
export async function settleResults(apiKey, daysBack = 2) {
  return apiFetch(`/admin/settle-results?days_back=${daysBack}`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  })
}

// ── Admin — API Key Management ─────────────────────────────────────────────
export async function fetchApiKeys(apiKey) {
  return apiFetch('/admin/api-keys', { headers: authHeaders(apiKey) })
}

export async function updateApiKey(apiKey, keyName, newValue) {
  return apiFetch('/admin/api-keys/update', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ updates: { [keyName]: newValue } }),
  })
}

// ── Admin — Bankroll ───────────────────────────────────────────────────────
export async function fetchBankroll(apiKey) {
  return apiFetch('/admin/bankroll', { headers: authHeaders(apiKey) })
}

// ── Admin — Decision Log ───────────────────────────────────────────────────
export async function fetchDecisionLog(apiKey, limit = 50) {
  return apiFetch(`/admin/decision-log?limit=${limit}`, { headers: authHeaders(apiKey) })
}

// ── AI Insights ────────────────────────────────────────────────────────────
export async function fetchGeminiInsights(matchId) {
  return apiFetch(`/predict/${matchId}/insights`)
}

export async function fetchMultiAIInsights(matchId, sources = ['gemini', 'claude', 'grok']) {
  const q = sources.join(',')
  return apiFetch(`/ai/multi-insights/${matchId}?sources=${encodeURIComponent(q)}`)
}

// ── Subscription ────────────────────────────────────────────────────────────
export async function fetchSubscriptionPlans() { return apiFetch('/subscription/plans') }

export async function fetchMyPlan(apiKey) {
  return apiFetch('/subscription/my-plan', { headers: authHeaders(apiKey) })
}

export async function upgradePlan(apiKey, plan, paymentToken = null) {
  return apiFetch('/subscription/upgrade', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ plan, payment_token: paymentToken }),
  })
}

export async function adminSetPlan(apiKey, targetApiKey, plan) {
  return apiFetch('/subscription/admin/set-plan', {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ api_key_target: targetApiKey, plan }),
  })
}

// ── Audit Logs ──────────────────────────────────────────────────────────────
export async function fetchAuditLogs(apiKey, { limit = 100, offset = 0, action, actor, status } = {}) {
  const q = new URLSearchParams({ limit, offset })
  if (action) q.set('action', action)
  if (actor) q.set('actor', actor)
  if (status) q.set('status', status)
  return apiFetch(`/audit/logs?${q}`, { headers: authHeaders(apiKey) })
}

// ── Training Dataset ────────────────────────────────────────────────────────
export async function uploadTrainingDataset(apiKey, file, merge = false) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(
    `${API_BASE_URL}/training/dataset/upload?api_key=${encodeURIComponent(apiKey)}&merge=${merge}`,
    { method: 'POST', headers: apiKey ? { 'x-api-key': apiKey } : {}, body: formData }
  )
  if (!res.ok) throw new Error(await res.text() || 'Upload failed')
  return res.json()
}

export async function fetchDatasetBrowser(apiKey, { page = 1, pageSize = 50, league, search } = {}) {
  const q = new URLSearchParams({ api_key: apiKey || '', page, page_size: pageSize })
  if (league) q.set('league', league)
  if (search) q.set('search', search)
  return apiFetch(`/training/dataset/browser?${q}`)
}

export async function fetchModelComparison(apiKey) {
  return apiFetch(`/training/models/compare?api_key=${encodeURIComponent(apiKey || '')}`)
}

export async function clearTrainingDataset(apiKey) {
  return apiFetch(`/training/dataset/clear?api_key=${encodeURIComponent(apiKey || '')}`, { method: 'DELETE' })
}
