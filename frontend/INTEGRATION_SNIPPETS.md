// frontend/INTEGRATION_SNIPPETS.md
# 💻 Integration Code Snippets - Copy & Paste Ready

Quick-copy code for each integration step. Find the section, copy the code, paste it!

---

## 1️⃣ Setup: main.jsx

**Location:** `frontend/src/main.jsx`

**Copy and replace your entire main.jsx:**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './ThemeProvider'
import './index.css'
import './premium-styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

✅ **What changed:** Added ThemeProvider import and wrapper, added premium-styles.css import

---

## 2️⃣ Config: navConfig.js

**Location:** `frontend/src/navConfig.js` (NEW FILE)

**Copy entire content below:**

```javascript
// src/navConfig.js
// Navigation configuration for responsive nav

export const NAV_ITEMS = [
  {
    label: 'Predict',
    items: [
      { id: 'dashboard', icon: '▤', label: 'Dashboard' },
      { id: 'picks', icon: '★', label: 'Market Picks' },
      { id: 'accumulator', icon: '⊕', label: 'Accumulators' },
    ],
  },
  {
    label: 'Market',
    items: [
      { id: 'odds', icon: '◈', label: 'Odds & Arbitrage' },
      { id: 'analytics', icon: '↗', label: 'Analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'training', icon: '◎', label: 'Training' },
      { id: 'admin', icon: '⚙', label: 'Admin' },
    ],
  },
]
```

---

## 3️⃣ Navigation: App.jsx Header

**Location:** `frontend/src/App.jsx` - At the top of the render function

**Add these imports at top of file:**

```jsx
import ResponsiveNav from './components/ResponsiveNav'
import { NAV_ITEMS } from './navConfig'
```

**Find your return statement and add ResponsiveNav FIRST:**

```jsx
export default function App() {
  const [tab, setTab] = useState('dashboard')
  // ... all your other state ...

  return (
    <>
      {/* ADD THIS NEW COMPONENT */}
      <ResponsiveNav
        items={NAV_ITEMS}
        activeId={tab}
        onNavigate={setTab}
        branding="VIT Intelligence"
      />

      {/* Then all your existing tab rendering below */}
      {tab === 'dashboard' && <DashboardPage />}
      {tab === 'picks' && <PicksPanel />}
      {/* ... rest of your pages ... */}
    </>
  )
}
```

---

## 4️⃣ Dashboard Page: NEW FILE

**Location:** `frontend/src/pages/DashboardPage.jsx` (NEW FILE)

**Copy entire content:**

```jsx
// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import ModernDashboard from '../components/ModernDashboard'
import { fetchHealth, fetchHistory } from '../api'

export default function DashboardPage() {
  const [stats, setStats] = useState({})
  const [health, setHealth] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Fetch health data
      const healthData = await fetchHealth()
      setHealth({
        db_connected: healthData.db_connected || false,
        models_loaded: healthData.models_loaded || false,
        clv_tracking_enabled: healthData.clv_tracking_enabled || false,
      })

      // Fetch recent history for stats
      const history = await fetchHistory(100)
      const certifiedCount = history.filter(h => h.pick_type === 'certified').length
      
      setStats({
        upcomingMatches: 24,
        activeModels: 12,
        certifiedPicks: certifiedCount,
        winRate: '68.5%',
        roi: '+12.3%',
        totalBankroll: '$45,230',
      })
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModernDashboard
      stats={stats}
      health={health}
      onNavigate={(page) => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: page }))
      }}
    />
  )
}
```

---

## 5️⃣ Update Dashboard Import in App.jsx

**Location:** `frontend/src/App.jsx` - At top of file

**Add import:**
```jsx
import DashboardPage from './pages/DashboardPage'
```

**Find this line in your render:**
```jsx
{tab === 'dashboard' && <OldDashboard />}
```

**Replace with:**
```jsx
{tab === 'dashboard' && <DashboardPage />}
```

---

## 6️⃣ Premium Match Cards: PicksPanel.jsx

**Location:** `frontend/src/PicksPanel.jsx` (or wherever you show picks)

**Add import at top:**
```jsx
import PremiumMatchCard from '../components/PremiumMatchCard'
```

**Find your render function and replace old PickCard component:**

**OLD:**
```jsx
function PickCard({ pick, onOpen }) {
  return (
    <div className="pick-card" onClick={() => onOpen(pick.match_id)}>
      {/* ... old code ... */}
    </div>
  )
}

export default function PicksPanel() {
  return (
    <div>
      {picks.map(pick => (
        <PickCard key={pick.match_id} pick={pick} onOpen={openDetail} />
      ))}
    </div>
  )
}
```

**NEW:**
```jsx
export default function PicksPanel() {
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 32 }}>Market Picks</h1>
      
      {picks.map(pick => (
        <PremiumMatchCard
          key={pick.match_id}
          match={pick}
          onSelect={(id) => openMatchDetail(id)}
          isLoading={loading}
        />
      ))}
    </div>
  )
}
```

---

## 7️⃣ Dashboard Fixture Cards: App.jsx

**Location:** `frontend/src/App.jsx` - Where you render upcoming fixtures

**Add import:**
```jsx
import PremiumMatchCard from './components/PremiumMatchCard'
```

**Find fixture rendering (around line 350ish):**

**OLD:**
```jsx
{dashFixtures?.map((fixture, idx) => (
  <div key={idx} className="match-row">
    {/* ... old fixture display ... */}
  </div>
))}
```

**NEW:**
```jsx
{dashFixtures?.map((fixture, idx) => (
  <PremiumMatchCard
    key={fixture.match_id || idx}
    match={fixture}
    onSelect={(id) => setMatchId(id)}
    isLoading={predictingIdx === idx}
  />
))}
```

---

## 8️⃣ Match Detail Modal: MatchDetail.jsx

**Location:** `frontend/src/MatchDetail.jsx`

**Replace entire component:**

```jsx
import { useEffect, useState } from 'react'
import { fetchMatchDetail } from './api'
import PremiumModal from '../components/PremiumModal'
import AIInsightComparison from '../components/AIInsightComparison'
import { LoadingSpinner, ErrorState } from '../components/LoadingStates'

export default function MatchDetail({ matchId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (matchId) loadMatchDetail()
  }, [matchId])

  async function loadMatchDetail() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMatchDetail(matchId)
      setDetail(data)
      
      if (data.ai_insights) {
        setInsights(data.ai_insights)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PremiumModal
      isOpen={!!matchId}
      onClose={onClose}
      title={detail ? `${detail.home_team} vs ${detail.away_team}` : 'Loading...'}
      size="lg"
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <ErrorState
          icon="⚠️"
          title="Failed to Load"
          message={error}
          onRetry={loadMatchDetail}
        />
      )}

      {detail && (
        <div>
          {/* Your existing match detail content goes here */}
          {/* Just keep your existing component content */}
          
          <hr style={{ margin: '32px 0' }} />
          
          <h3>AI Insights Comparison</h3>
          <AIInsightComparison
            matchId={matchId}
            insights={insights}
            isLoading={loading}
            onRefresh={loadMatchDetail}
          />
        </div>
      )}
    </PremiumModal>
  )
}
```

---

## 9️⃣ Loading States in Predict Form

**Location:** `frontend/src/App.jsx` - Prediction form area

**Add imports:**
```jsx
import { LoadingSpinner, ErrorState, EmptyState } from './components/LoadingStates'
```

**Find your prediction form render and update loading/error sections:**

**OLD:**
```jsx
{loading && <p>Loading...</p>}
{error && <div className="error">{error}</div>}
{prediction && <div>{/* result */}</div>}
```

**NEW:**
```jsx
{loading && (
  <div style={{ textAlign: 'center', padding: 40 }}>
    <LoadingSpinner size={50} />
    <p style={{ marginTop: 16, color: '#64748b' }}>Analyzing match...</p>
  </div>
)}

{error && (
  <ErrorState
    icon="⚠️"
    title="Prediction Failed"
    message={error}
    onRetry={handlePredict}
    retryLabel="Try Again"
  />
)}

{!loading && !error && !prediction && (
  <EmptyState
    icon="📊"
    title="No Prediction Yet"
    message="Enter match details and click Predict to analyze"
  />
)}

{prediction && (
  <div>{/* Your prediction result code */}</div>
)}
```

---

## 🔟 Skeleton Loaders for Lists

**Location:** Where you render match/pick lists while loading

**Add import:**
```jsx
import { MatchCardSkeleton } from './components/LoadingStates'
```

**Find your list rendering:**

**OLD:**
```jsx
{historyLoading && <p>Loading...</p>}
{history.map(item => <OldRow key={item.id} data={item} />)}
```

**NEW:**
```jsx
{historyLoading && (
  <>
    <MatchCardSkeleton />
    <MatchCardSkeleton />
    <MatchCardSkeleton />
  </>
)}

{!historyLoading && history.map(item => (
  <PremiumMatchCard
    key={item.match_id}
    match={item}
    onSelect={openDetail}
    isLoading={false}
  />
))}
```

---

## 1️⃣1️⃣ Analytics Page: useTheme Update

**Location:** `frontend/src/AnalyticsPanel.jsx`

**Add import at top:**
```jsx
import { useTheme } from './ThemeProvider'
```

**Add to component:**
```jsx
export default function AnalyticsPanel({ apiKey }) {
  const { theme } = useTheme()  // Add this line
  const key = apiKey || API_KEY

  // ... rest of component stays same ...

  // In the return, wrap container with theme:
  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '20px',
      background: theme.bg.primary,  // Add this
      color: theme.text.primary,     // Add this
    }}>
      {/* ... rest stays same ... */}
    </div>
  )
}
```

---

## 1️⃣2️⃣ Training Page: useTheme Update

**Location:** `frontend/src/TrainingPanel.jsx`

**Same as above (copy from section 11) - repeat for each page component**

---

## Quick Verification After Each Step

After each copy-paste, test these:

```bash
# 1. Run dev server
npm run dev

# 2. Open browser
http://localhost:5173  # or whatever port shown

# 3. Check console (F12)
# Should see NO red errors

# 4. Test theme toggle
# Click ☀️/🌙 button - should switch modes

# 5. Test navigation
# Click nav items - page should change

# 6. Check mobile
# F12 > Responsive Mode > 375px
# Hamburger menu should appear
```

---

## Common Copy-Paste Mistakes

❌ **DON'T:** Forget import statements
✅ **DO:** Add all imports at top of file

❌ **DON'T:** Copy inside existing functions
✅ **DO:** Replace the entire section

❌ **DON'T:** Keep old code alongside new code
✅ **DO:** Remove old code first

❌ **DON'T:** Forget to update file paths
✅ **DO:** Check `import` paths match your structure

❌ **DON'T:** Skip the functional imports (e.g., `fetchHealth`)
✅ **DO:** Make sure API functions exist in your api.js

---

## File Path Reference

If imports fail, verify these paths:

```
frontend/src/
├── theme.js                    ← For design tokens
├── ThemeProvider.jsx           ← For useTheme() hook
├── premium-styles.css          ← For global styles
├── components/
│   ├── PremiumMatchCard.jsx
│   ├── AIInsightComparison.jsx
│   ├── ModernDashboard.jsx
│   ├── PremiumModal.jsx
│   ├── ResponsiveNav.jsx
│   └── LoadingStates.jsx
├── pages/
│   └── DashboardPage.jsx       ← NEW: Create this
├── App.jsx                     ← UPDATE THIS
├── MatchDetail.jsx             ← UPDATE THIS
├── PicksPanel.jsx              ← UPDATE THIS
├── AnalyticsPanel.jsx          ← UPDATE THIS
├── TrainingPanel.jsx           ← UPDATE THIS
├── api.js                      ← Should already exist
├── navConfig.js                ← NEW: Create this
└── main.jsx                    ← UPDATE THIS
```

---

## Testing Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint

# List components to verify they exist
ls src/components/
ls src/pages/
```

---

## If Something Breaks

1. **Check console errors:** F12 > Console (red text)
2. **Hard refresh:** Ctrl+Shift+R or Cmd+Shift+R
3. **Check imports:** Make sure all import paths are correct
4. **Verify file exists:** `ls -la src/components/PremiumMatchCard.jsx`
5. **Compare with example:** Check INTEGRATION_GUIDE.md

---

**💡 Tip:** Copy one section at a time, test, then move to next. Don't do all at once!
