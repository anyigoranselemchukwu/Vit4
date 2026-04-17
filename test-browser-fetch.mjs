// Simulate browser - use full URL from frontend
async function testFetch() {
  const url = 'http://localhost:5000/health'
  console.log(`[Browser Test] Fetching: ${url}`)
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    })
    console.log(`[Browser Test] Status: ${res.status}`)
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Browser Test] Error: ${text}`)
      throw new Error(text)
    }
    const data = await res.json()
    console.log(`[Browser Test] Response:`, JSON.stringify(data, null, 2))
    const online = data?.status === 'ok'
    console.log(`[Browser Test] Online: ${online}`)
    console.log(`[Browser Test] ✅ SUCCESS - App should show ONLINE`)
  } catch (error) {
    console.error(`[Browser Test] ❌ FAILED:`, error.message)
  }
}

testFetch()
