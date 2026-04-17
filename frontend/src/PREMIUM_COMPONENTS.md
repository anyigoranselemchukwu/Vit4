// frontend/src/PREMIUM_COMPONENTS.md
# Premium Frontend Components Guide

## Overview

This document describes the new premium UI components and design system for VIT Sports Intelligence. All components support:
- ✨ **Dark Mode** - Automatic theme switching
- 📱 **Responsive Design** - Mobile-first, fully responsive
- ⚡ **Performance** - Optimized animations and transitions
- ♿ **Accessibility** - WCAG 2.1 compliant
- 🎨 **Premium Styling** - Gradient effects, shadows, smooth transitions

## System Requirements

- React 19+
- Modern browser (Chrome, Firefox, Safari, Edge)

## Design System

### Theme Context (`theme.js` + `ThemeProvider.jsx`)

All design tokens are centralized in `theme.js` and provided via `ThemeProvider`:

```jsx
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from './ThemeProvider'

// Wrap app
<ThemeProvider>
  <App />
</ThemeProvider>

// Use in components
function MyComponent() {
  const { theme, isDark, toggleTheme } = useTheme()
  return <div style={{ background: theme.bg.primary }} />
}
```

#### Token Structure

```javascript
THEME.light / THEME.dark = {
  bg: { primary, secondary, tertiary, hover }
  text: { primary, secondary, tertiary, muted }
  border: { light, medium, dark }
  accent: { primary, secondary, success, warning, danger, info }
}

GRADIENTS = { primary, success, danger, warning, premium }
SHADOWS = { sm, md, lg, xl, '2xl' }
TRANSITIONS = { fast, base, slow }
```

---

## Component Reference

### 1. PremiumMatchCard

Enhanced match card with confidence/risk visualizations and responsive design.

**Props:**
- `match` (object) - Match data object
- `onSelect` (function) - Callback when card is clicked
- `isLoading` (boolean) - Show skeleton while loading

**Features:**
- Confidence meter with gradient fill
- Risk level indicator (LOW/MEDIUM/HIGH)
- Model agreement percentage
- Smart odds display
- Hover effects on desktop
- Fully responsive on mobile

**Example:**
```jsx
import PremiumMatchCard from './components/PremiumMatchCard'

<PremiumMatchCard
  match={matchData}
  onSelect={(id) => console.log('Selected:', id)}
  isLoading={false}
/>
```

---

### 2. AIInsightComparison

Side-by-side comparison of AI insights from Gemini, Claude, and Grok.

**Props:**
- `matchId` (string) - The match ID
- `insights` (object) - { gemini, claude, grok } with { summary, key_factors, recommendation, confidence }
- `isLoading` (boolean) - Show skeleton while loading
- `onRefresh` (function) - Callback to refresh insights

**Features:**
- Color-coded provider cards
- Summary, key factors, and recommendations
- Consensus analysis section
- Empty state handling
- Loading state with skeleton

**Example:**
```jsx
import AIInsightComparison from './components/AIInsightComparison'

const insights = {
  gemini: {
    summary: "Strong defensive matchup...",
    key_factors: ["Factor 1", "Factor 2"],
    recommendation: "Back Over 2.5 Goals",
    confidence: 0.85
  },
  claude: { /* ... */ },
  grok: { /* ... */ }
}

<AIInsightComparison
  matchId="match123"
  insights={insights}
  isLoading={false}
  onRefresh={() => loadInsights()}
/>
```

---

### 3. ModernDashboard

Premium landing/dashboard screen with hero section and quick stats.

**Props:**
- `stats` (object) - { upcomingMatches, activeModels, certifiedPicks, winRate, roi, totalBankroll }
- `health` (object) - System health status { db_connected, models_loaded, etc }
- `onNavigate` (function) - Navigation callback
- `children` (React nodes) - Additional content to display

**Features:**
- Animated hero section with branding
- Theme toggle button
- Quick stat cards (clickable)
- System health indicators
- Gradient text effects
- Fully responsive grid

**Example:**
```jsx
import ModernDashboard from './components/ModernDashboard'

<ModernDashboard
  stats={{
    upcomingMatches: 24,
    activeModels: 12,
    certifiedPicks: 8,
    winRate: '68.5%',
    roi: '+12.3%',
    totalBankroll: '$45,230'
  }}
  health={{
    db_connected: true,
    models_loaded: true,
    cache_available: true
  }}
  onNavigate={(page) => setTab(page)}
>
  {/* Dashboard content */}
</ModernDashboard>
```

---

### 4. PremiumModal

Enhanced modal with smooth transitions and responsive sizing.

**Props:**
- `isOpen` (boolean) - Modal visibility
- `onClose` (function) - Close callback
- `title` (string) - Modal title
- `size` ('sm' | 'md' | 'lg' | 'xl') - Modal size
- `children` (React nodes) - Modal content

**Features:**
- Smooth fade and slide animations
- Backdrop blur effect
- Responsive sizing and positioning
- Sticky header on scroll
- Click outside to close
- Proper z-index management

**Example:**
```jsx
import PremiumModal from './components/PremiumModal'

<PremiumModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  title="Match Details"
  size="lg"
>
  <p>Modal content here</p>
</PremiumModal>
```

---

### 5. Loading States (`LoadingStates.jsx`)

Collection of premium loading and error components:

#### SkeletonLoader
```jsx
<SkeletonLoader height={20} width="80%" />
```

#### MatchCardSkeleton
```jsx
<MatchCardSkeleton />
```

#### ErrorState
```jsx
<ErrorState
  icon="⚠️"
  title="Failed to Load"
  message="Please try again"
  onRetry={handleRetry}
  retryLabel="Reload"
/>
```

#### LoadingSpinner
```jsx
<LoadingSpinner size={40} color="#0ea5e9" />
```

#### EmptyState
```jsx
<EmptyState
  icon="📭"
  title="No Matches"
  message="No upcoming matches available"
  action={() => navigate('/')}
  actionLabel="View All"
/>
```

#### ProgressBar
```jsx
<ProgressBar
  progress={75}
  label="Processing"
  isSuccess={false}
  isError={false}
/>
```

---

### 6. ResponsiveNav

Mobile-responsive navigation with hamburger menu.

**Props:**
- `items` (array) - Navigation groups: [{ id, label, items: [{ id, icon, label }] }]
- `activeId` (string) - Active nav item ID
- `onNavigate` (function) - Navigation callback
- `branding` (string) - Brand name/logo

**Features:**
- Desktop horizontal nav
- Mobile vertical drawer menu
- Automatic hamburger menu on mobile
- Theme toggle button
- Auto-hide menu on selection
- Smooth animations

**Example:**
```jsx
import ResponsiveNav from './components/ResponsiveNav'

const navItems = [
  {
    label: 'Predict',
    items: [
      { id: 'dashboard', icon: '▤', label: 'Dashboard' },
      { id: 'picks', icon: '★', label: 'Picks' }
    ]
  }
]

<ResponsiveNav
  items={navItems}
  activeId={currentTab}
  onNavigate={(id) => setTab(id)}
  branding="VIT Intelligence"
/>
```

---

## Global Styles

### CSS File (`premium-styles.css`)

Comprehensive CSS with:
- CSS Custom Properties (dark mode support)
- Typography system (h1-h6, p)
- Button styles (.btn, .btn-primary, .btn-secondary)
- Form styles (input, select, textarea)
- Card styles (.card)
- Loading states (@keyframes pulse, shimmer)
- Error and empty states
- Responsive utilities (@media queries)
- Accessibility features (prefers-reduced-motion)
- Utility classes (spacing, flex, grid)

**Import in main app:**
```jsx
import './premium-styles.css'
```

---

## Integration Checklist

- [ ] Import `ThemeProvider` and wrap App
- [ ] Import `premium-styles.css` in main
- [ ] Replace old components with premium versions
- [ ] Update App.jsx to use ResponsiveNav
- [ ] Add ModernDashboard as home screen
- [ ] Integrate AIInsightComparison in match detail
- [ ] Use PremiumMatchCard for match lists
- [ ] Add loading/error states with new components
- [ ] Test dark mode toggle
- [ ] Test mobile responsiveness
- [ ] Test accessibility with screen reader

---

## Best Practices

1. **Always use `useTheme()`** in components to access colors
2. **Use design tokens** instead of hardcoded colors
3. **Add loading states** with SkeletonLoader
4. **Add error boundaries** with ErrorState
5. **Test mobile** with DevTools responsive mode
6. **Test dark mode** by toggling theme
7. **Use proper contrasts** for accessibility
8. **Prefer flex/grid** for responsive layouts
9. **Use CSS variables** in inline styles
10. **Load images lazily** for performance

---

## Performance Tips

- Memoize heavy components with `React.memo()`
- Use `useCallback` for event handlers
- Lazy load modals and heavy sections
- Optimize images with proper formats
- Use CSS containment for animations
- Minimize re-renders with proper state management

---

## Accessibility

All components follow WCAG 2.1 guidelines:
- Proper color contrast ratios
- Keyboard navigation support
- ARIA labels where needed
- Focus indicators visible
- Reduced motion respects user preferences
- Semantic HTML structure

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android)

---

## Troubleshooting

**Dark mode not working?**
- Ensure `ThemeProvider` wraps your entire app
- Check localStorage for 'vit_theme_dark'

**Styles not applied?**
- Import `premium-styles.css` before your components
- Verify theme context is available (useTheme)

**Responsive layout broken?**
- Check CSS media queries in browser DevTools
- Test with actual mobile device, not just emulator
- Verify touch targets are at least 44x44px

**Animations choppy?**
- Check if animations are being interrupted
- Verify `prefers-reduced-motion` is respected
- Use `will-change` CSS property sparingly
