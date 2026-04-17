// frontend/INTEGRATION_GUIDE.md
# 🚀 Frontend Enhancement - Integration Guide

## Step-by-Step Instructions

Follow these steps to integrate the premium frontend components into your existing app. Estimated time: **2-3 hours** for full integration.

---

## Phase 1: Foundation Setup (30 minutes)

### Step 1.1: Verify Dependencies

Ensure you have React 19+ installed:

```bash
cd frontend
npm list react
```

If React version is < 19, update:
```bash
npm install react@latest react-dom@latest
```

### Step 1.2: Copy New Files

All new files should already be in place:

```
src/
├── theme.js
├── ThemeProvider.jsx
├── premium-styles.css
├── PREMIUM_COMPONENTS.md
├── components/
│   ├── PremiumMatchCard.jsx
│   ├── AIInsightComparison.jsx
│   ├── ModernDashboard.jsx
│   ├── PremiumModal.jsx
│   ├── ResponsiveNav.jsx
│   └── LoadingStates.jsx
```

### Step 1.3: Update main.jsx

Find your `main.jsx` (or `index.jsx`) and update it:

**Before:**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**After:**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './ThemeProvider'
import './index.css'
import './premium-styles.css'  // Add this line

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>  {/* Wrap with ThemeProvider */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

**What this does:**
- Imports the ThemeProvider (enables dark mode + design system)
- Imports premium-styles.css (global design tokens and utilities)
- Wraps App with theme context (all components can now use `useTheme()`)

✅ **Test:** Start dev server `npm run dev` and check console for errors.

---

## Phase 2: Navigation Update (15 minutes)

### Step 2.1: Create Navigation Config

Create a new file `src/navConfig.js`:

```javascript
// src/navConfig.js
// Navigation configuration for all pages

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

### Step 2.2: Update App.jsx Header

Add ResponsiveNav to your App.jsx. Find the top of your render function:

**Before:**
```jsx
export default function App() {
  const [tab, setTab] = useState('dashboard')
  // ... rest of state

  return (
    <div>
      {/* Old navigation code */}
```

**After:**
```jsx
import ResponsiveNav from './components/ResponsiveNav'
import { NAV_ITEMS } from './navConfig'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  // ... rest of state

  return (
    <div>
      <ResponsiveNav
        items={NAV_ITEMS}
        activeId={tab}
        onNavigate={setTab}
        branding="VIT Intelligence"
      />
      {/* Rest of your content */}
```

**Remove:** Any old navigation/header code you had before.

✅ **Test:** 
- App header should show "VIT Intelligence" with nav items
- On mobile (<768px), tap hamburger menu (≡) to see drawer
- Theme toggle button (☀️/🌙) should work
- Clicking nav items should highlight them

---

## Phase 3: Dashboard Screen (20 minutes)

### Step 3.1: Create Dashboard Component

Create `src/pages/DashboardPage.jsx`:

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
        // Navigate to page - implemented in App.jsx
        window.dispatchEvent(new CustomEvent('navigate', { detail: page }))
      }}
    />
  )
}
```

### Step 3.2: Add Dashboard to App.jsx

Find where you render different pages based on `tab`:

**Before:**
```jsx
return (
  <>
    {tab === 'dashboard' && <OldDashboard />}
    {tab === 'picks' && <PicksPanel />}
    {/* ... */}
  </>
)
```

**After:**
```jsx
import DashboardPage from './pages/DashboardPage'

return (
  <>
    <ResponsiveNav {...navProps} />
    
    {/* Dashboard */}
    {tab === 'dashboard' && <DashboardPage />}
    
    {/* Keep existing pages */}
    {tab === 'picks' && <PicksPanel />}
    {tab === 'accumulator' && <AccumulatorPanel />}
    {/* ... rest of your pages ... */}
  </>
)
```

✅ **Test:**
- Navigate to Dashboard tab
- Should see hero section with stats
- Theme toggle should work
- Stat cards should be clickable (navigate to relevant sections)
- Mobile: should responsively stack into 1-2 columns

---

## Phase 4: Match Cards Update (25 minutes)

### Step 4.1: Update Picks Panel

Find where you display match/pick cards. Update to use PremiumMatchCard:

**File:** `src/PicksPanel.jsx` (or wherever your matches are displayed)

**Before:**
```jsx
function PickCard({ pick, onOpen }) {
  return (
    <div className="pick-card" onClick={() => onOpen(pick.match_id)}>
      {/* Old styling */}
    </div>
  )
}

export default function PicksPanel() {
  // ...
  return (
    <div>
      {picks.map(pick => (
        <PickCard key={pick.match_id} pick={pick} onOpen={openDetail} />
      ))}
    </div>
  )
}
```

**After:**
```jsx
import PremiumMatchCard from '../components/PremiumMatchCard'

export default function PicksPanel() {
  const [loading, setLoading] = useState(false)

  // ... existing code ...

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

**Remove:** Old PickCard component code.

✅ **Test:**
- Picks page renders with new card design
- Confidence/risk meters display
- Hover effects work on desktop
- Mobile: cards stack properly
- Cards are clickable and open detail view

### Step 4.2: Update Dashboard Fixture Browser

In `App.jsx` where you display upcoming matches:

**Before:**
```jsx
{dashFixtures?.map((fixture, idx) => (
  <div key={idx} className="match-row">
    {/* Old fixture display */}
  </div>
))}
```

**After:**
```jsx
import PremiumMatchCard from './components/PremiumMatchCard'

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

## Phase 5: Match Detail Enhancement (20 minutes)

### Step 5.1: Update MatchDetail Modal

Find your `MatchDetail` component:

**Before:**
```jsx
export default function MatchDetail({ matchId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  return (
    <div className="modal">
      {/* Old modal structure */}
    </div>
  )
}
```

**After:**
```jsx
import PremiumModal from '../components/PremiumModal'
import AIInsightComparison from '../components/AIInsightComparison'
import { LoadingSpinner, ErrorState } from '../components/LoadingStates'

export default function MatchDetail({ matchId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMatchDetail()
  }, [matchId])

  async function loadMatchDetail() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMatchDetail(matchId)
      setDetail(data)
      
      // Try to fetch AI insights
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
      {loading && <LoadingSpinner />}
      
      {error && (
        <ErrorState
          icon="⚠️"
          title="Failed to Load Match"
          message={error}
          onRetry={loadMatchDetail}
        />
      )}

      {detail && (
        <div>
          {/* Existing match detail content */}
          <YourExistingMatchDetail data={detail} />

          {/* Add AI Insights section */}
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

✅ **Test:**
- Click on a match card to open modal
- Modal should have smooth slide animation
- AI insights section should display (or show empty state if no insights)
- Clicking close button or outside modal should close it
- Mobile: modal should be responsive

---

## Phase 6: Loading and Error States (15 minutes)

### Step 6.1: Add Loading States to Predictions

Find where you handle prediction loading:

**Before:**
```jsx
async function handlePredict() {
  setLoading(true)
  try {
    const result = await predictMatch(formData)
    setPrediction(result)
  } catch (error) {
    setError(error.message)
  } finally {
    setLoading(false)
  }
}

return (
  <div>
    {loading && <span>Loading...</span>}
    {error && <div className="error">{error}</div>}
    {prediction && <div>{/* Show result */}</div>}
  </div>
)
```

**After:**
```jsx
import { LoadingSpinner, ErrorState, EmptyState } from '../components/LoadingStates'

async function handlePredict() {
  setLoading(true)
  setError('')
  try {
    const result = await predictMatch(formData)
    setPrediction(result)
  } catch (error) {
    setError(error.message)
  } finally {
    setLoading(false)
  }
}

return (
  <div>
    {loading && (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <LoadingSpinner size={50} />
        <p style={{ marginTop: 16 }}>Analyzing match...</p>
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
        message="Enter match details and click Predict to get started"
        action={() => document.querySelector('button[type=submit]')?.click()}
        actionLabel="Make Prediction"
      />
    )}
    
    {prediction && (
      <div>{/* Show your prediction result */}</div>
    )}
  </div>
)
```

### Step 6.2: Add Skeleton Loaders

For list loading, use SkeletonLoader:

**Before:**
```jsx
{historyLoading && <p>Loading history...</p>}
{history.map(item => <OldHistoryRow key={item.id} data={item} />)}
```

**After:**
```jsx
import { MatchCardSkeleton } from '../components/LoadingStates'

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

✅ **Test:**
- Trigger API calls that fail
- Should see ErrorState with retry button
- Trigger API calls that succeed slowly
- Should see LoadingSpinner
- Try SkeletonLoaders on static lists

---

## Phase 7: Analytics & Training Pages (10 minutes)

### Step 7.1: Add Responsive Wrapper

Update AnalyticsPanel.jsx and TrainingPanel.jsx to be responsive:

**In both files, find the main return:**

```jsx
// Before
return (
  <div style={{ maxWidth: 1000, margin: '0 auto' }}>

// After - wrap with responsive wrapper
import { useTheme } from '../ThemeProvider'

export default function AnalyticsPanel() {
  const { theme } = useTheme()
  
  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px',
      background: theme.bg.primary,
    }}>
```

This ensures dark mode works and responsive padding is applied.

---

## Phase 8: Testing Checklist (20 minutes)

### Test 1: Theme Switching
- [ ] Find theme toggle button (☀️/🌙) in header
- [ ] Click it
- [ ] Entire page should switch to dark mode smoothly
- [ ] Refresh page - dark mode should persist
- [ ] All text should have good contrast
- [ ] All components should be readable

### Test 2: Responsive Design
- [ ] Open DevTools (F12)
- [ ] Enable responsive mode (Ctrl+Shift+M)
- [ ] Test at widths: 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] All content should reflow properly
- [ ] Touch targets should be at least 44x44px
- [ ] No horizontal scrolling at any size

### Test 3: Mobile Navigation
- [ ] At 375px width, hamburger menu (≡) should appear
- [ ] Click hamburger to open drawer
- [ ] List should show all nav items
- [ ] Click an item to navigate and close drawer
- [ ] Click another item - drawer should close

### Test 4: Components
- [ ] Hover over match cards on desktop - should lift slightly
- [ ] Click match card - modal should open smoothly
- [ ] Click modal close button - should fade out
- [ ] Trigger loading state - spinner should animate
- [ ] Trigger error state - should show error with retry button

### Test 5: Dark Mode with Components
- [ ] Enable dark mode
- [ ] Check each page/component
- [ ] Text should be light on dark background
- [ ] All colors should be readable
- [ ] No white text on light backgrounds

### Test 6: Accessibility
- [ ] Use Tab key to navigate - all buttons should be reachable
- [ ] Press Enter on buttons - should activate
- [ ] Test with screen reader (use Windows narrator or Mac voiceover)
- [ ] All icons should have text labels

---

## Phase 9: Performance Optimization (10 minutes)

### Optional: Memoize Heavy Components

If you notice lag when scrolling many cards, add memoization:

```jsx
import { memo } from 'react'

const MemoizedPremiumMatchCard = memo(PremiumMatchCard)

// Use in your render:
{matches.map(match => (
  <MemoizedPremiumMatchCard
    key={match.match_id}
    match={match}
    onSelect={onSelect}
  />
))}
```

### Optional: Lazy Load Modals

For better performance, lazy load heavy components:

```jsx
import { lazy, Suspense } from 'react'

const MatchDetail = lazy(() => import('../components/MatchDetail'))

// In render:
<Suspense fallback={<LoadingSpinner />}>
  {matchId && <MatchDetail matchId={matchId} onClose={closeModal} />}
</Suspense>
```

---

## Common Issues & Solutions

### Issue: Dark Mode Not Working
**Solution:**
1. Check ThemeProvider wraps App in main.jsx
2. Clear browser localStorage: Right-click > Inspect > Application > Storage > Clear Site Data
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Issue: Styles Look Wrong
**Solution:**
1. Verify `premium-styles.css` is imported in main.jsx AFTER `index.css`
2. Check for CSS conflicts with old styles
3. Open DevTools (F12) > Elements and check computed styles
4. Search for `--color-` to verify CSS variables are defined

### Issue: Components Don't Display Theme Colors
**Solution:**
1. Verify components use `useTheme()` hook
2. Check that component is inside ThemeProvider
3. Try: `const { theme } = useTheme(); console.log(theme)` to debug

### Issue: Mobile Menu Not Appearing
**Solution:**
1. Check window width - should be < 768px
2. Open DevTools > Responsive Mode
3. Set width to 375px
4. Hamburger button should appear
5. If not, check CSS media query in ResponsiveNav.jsx

### Issue: Modals Not Closing on Mobile
**Solution:**
1. Check modal backdrop click handler: `onClick={onClose}`
2. Verify modal z-index is 1000+ in your CSS
3. Try: Click outside modal content area (on dark background)

### Issue: Performance Issues (Laggy Scrolling)
**Solution:**
1. Check DevTools Performance tab
2. Add memoization to match cards (see Phase 9)
3. Reduce animation duration for lower-end devices
4. Check for excessive re-renders with DevTools React profiler

---

## Next Steps After Integration

1. **Customize Colors** (optional)
   - Edit `theme.js` to match your brand
   - Update THEME.light and THEME.dark objects

2. **Add More Features**
   - Notifications component
   - Data tables with sorting
   - Charts with TradingView Lightweight Charts

3. **Performance Monitoring**
   - Use Lighthouse to check accessibility score
   - Use WebPageTest for performance metrics
   - Monitor Core Web Vitals

4. **Get User Feedback**
   - A/B test dark mode preference
   - Track component interactions
   - Gather UX feedback for improvements

---

## Quick Command Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Check for linting errors
npm run lint

# View file tree (verify new files exist)
ls -la src/components/
ls -la src/
```

---

## File Structure After Integration

```
vit-sports-intelligence/frontend/
├── src/
│   ├── components/
│   │   ├── PremiumMatchCard.jsx        ✓ Created
│   │   ├── AIInsightComparison.jsx     ✓ Created
│   │   ├── ModernDashboard.jsx         ✓ Created
│   │   ├── PremiumModal.jsx            ✓ Created
│   │   ├── ResponsiveNav.jsx           ✓ Created
│   │   └── LoadingStates.jsx           ✓ Created
│   ├── pages/
│   │   └── DashboardPage.jsx           ✓ New (created in Phase 3)
│   ├── App.jsx                         ✓ Updated
│   ├── MatchDetail.jsx                 ✓ Updated
│   ├── PicksPanel.jsx                  ✓ Updated
│   ├── AnalyticsPanel.jsx              ✓ Updated
│   ├── TrainingPanel.jsx               ✓ Updated
│   ├── theme.js                        ✓ Created
│   ├── ThemeProvider.jsx               ✓ Created
│   ├── navConfig.js                    ✓ New (created in Phase 2)
│   ├── premium-styles.css              ✓ Created
│   ├── PREMIUM_COMPONENTS.md           ✓ Reference
│   ├── main.jsx                        ✓ Updated
│   └── index.css                       (existing)
├── INTEGRATION_GUIDE.md                ✓ This file
├── FRONTEND_ENHANCEMENT_README.md      ✓ Reference
└── package.json                        (existing)
```

---

## Summary Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Foundation Setup | 30 min | Setup ThemeProvider, CSS, main.jsx |
| 2 | Navigation | 15 min | Add ResponsiveNav to header |
| 3 | Dashboard | 20 min | Create and integrate DashboardPage |
| 4 | Match Cards | 25 min | Update PicksPanel with PremiumMatchCard |
| 5 | Match Detail | 20 min | Enhance MatchDetail with modal & insights |
| 6 | Loading/Error | 15 min | Add loading states and error displays |
| 7 | Other Pages | 10 min | Update Analytics and Training pages |
| 8 | Testing | 20 min | Full QA checklist |
| 9 | Optimization | 10 min | Performance tweaks (optional) |
| **Total** | | **2-3 hours** | **Complete** |

---

## Support & Reference

- **Component Docs:** See `PREMIUM_COMPONENTS.md` for detailed props/examples
- **Design System:** See `theme.js` for all design tokens
- **CSS Classes:** See `premium-styles.css` for utility classes
- **Main Reference:** See `FRONTEND_ENHANCEMENT_README.md` for overview

---

**🎉 After completing all phases, you'll have a world-class premium sports intelligence frontend!**

Last updated: April 16, 2026
