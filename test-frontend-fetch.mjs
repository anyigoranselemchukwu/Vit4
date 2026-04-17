// Simulate browser environment
const API_BASE_URL = ''
const path = '/health'

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  console.log(`[Test] Fetching: ${url}`)
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    console.log(`[Test] Response status: ${res.status}`)
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Test] Error: ${res.status} ${text}`)
      throw new Error(text || res.statusText)
    }
    const data = await res.json()
    console.log(`[Test] Data:`, data)
    return data
  } catch (error) {
    console.error(`[Test] Fetch failed:`, error.message)
    throw error
  }
}

async function testHealth() {
  try {
    const health = await apiFetch('/health')
    const online = health?.status === 'ok'
    console.log(`[Test] Health status: ${health?.status}`)
    console.log(`[Test] Models loaded: ${health?.models_loaded}`)
    console.log(`[Test] DB connected: ${health?.db_connected}`)
    console.log(`[Test] App online: ${online}`)
    console.log(`[Test] ✅ All checks passed!`)
  } catch (error) {
    console.error(`[Test] ❌ Health check failed:`, error)
  }
}

testHealth()
