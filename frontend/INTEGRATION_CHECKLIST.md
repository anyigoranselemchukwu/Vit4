// frontend/INTEGRATION_CHECKLIST.md
# 🎯 Integration Checklist - Quick Reference

Print this out or bookmark it! Check off items as you complete them.

---

## ✅ Phase 1: Foundation Setup (30 min)

- [ ] **1.1** Verify React 19+ installed (`npm list react`)
- [ ] **1.2** Confirm new files exist in `src/`:
  - [ ] `theme.js`
  - [ ] `ThemeProvider.jsx`
  - [ ] `premium-styles.css`
  - [ ] `components/` folder with 6 files
- [ ] **1.3** Edit `main.jsx`:
  - [ ] Import `ThemeProvider`
  - [ ] Import `premium-styles.css`
  - [ ] Wrap `<App />` with `<ThemeProvider>`
  - [ ] Test: No console errors after `npm run dev`

**Checkpoint:** Header should show theme toggle (☀️/🌙) and dark mode should work

---

## ✅ Phase 2: Navigation (15 min)

- [ ] **2.1** Create `src/navConfig.js` with NAV_ITEMS
- [ ] **2.2** Update `App.jsx`:
  - [ ] Import `ResponsiveNav`
  - [ ] Import `NAV_ITEMS` from navConfig
  - [ ] Add `<ResponsiveNav>` at top of render
  - [ ] Remove old navigation code
- [ ] **2.3** Test:
  - [ ] Nav items appear in header
  - [ ] Clicking nav items changes active state (color changes)
  - [ ] On mobile (<768px): hamburger menu appears and works
  - [ ] Theme toggle still works

**Checkpoint:** ResponsiveNav displays correctly on desktop and mobile ✓

---

## ✅ Phase 3: Dashboard Screen (20 min)

- [ ] **3.1** Create `src/pages/DashboardPage.jsx`:
  - [ ] Import `ModernDashboard`
  - [ ] Set up state for stats, health, loading
  - [ ] Add `useEffect` to load data from API
  - [ ] Fetch health endpoint
  - [ ] Calculate stats from history
- [ ] **3.2** Update `App.jsx`:
  - [ ] Import `DashboardPage`
  - [ ] Replace `{tab === 'dashboard' && ...}` with new component
- [ ] **3.3** Test:
  - [ ] Dashboard loads when visiting home
  - [ ] Hero section displays
  - [ ] Stat cards show correct numbers
  - [ ] Health indicators show status
  - [ ] Theme toggle works on dashboard
  - [ ] Mobile: stat cards stack into 1-2 columns

**Checkpoint:** Dashboard page looks premium with stats and health indicators ✓

---

## ✅ Phase 4: Match Cards (25 min)

- [ ] **4.1** Update match displays:
  - [ ] Import `PremiumMatchCard` 
  - [ ] In PicksPanel.jsx (or similar):
    - [ ] Remove old PickCard component
    - [ ] Replace with `<PremiumMatchCard>`
  - [ ] In main App.jsx fixture display:
    - [ ] Replace old fixture rows with `<PremiumMatchCard>`
- [ ] **4.2** Test:
  - [ ] Picks page shows premium cards
  - [ ] Card highlights when hovering (desktop)
  - [ ] Confidence meter displays
  - [ ] Risk level shows (LOW/MEDIUM/HIGH with color)
  - [ ] Clicking card opens match detail
  - [ ] Mobile: cards are properly sized
  - [ ] Cards show loading skeleton when `isLoading={true}`

**Checkpoint:** Match cards look premium with confidence/risk visualizations ✓

---

## ✅ Phase 5: Match Detail Modal (20 min)

- [ ] **5.1** Update `MatchDetail.jsx`:
  - [ ] Import `PremiumModal`, `AIInsightComparison`, loading states
  - [ ] Replace old modal structure with `<PremiumModal>`
  - [ ] Move match detail content inside modal
  - [ ] Add `<AIInsightComparison>` section
  - [ ] Add error handling with `<ErrorState>`
  - [ ] Add loading spinner with `<LoadingSpinner>`
- [ ] **5.2** Test:
  - [ ] Click match card opens modal with animation
  - [ ] Modal has proper title (teams)
  - [ ] AI insights section appears (or shows empty state)
  - [ ] Closing modal works (click X or background)
  - [ ] Mobile: modal is responsive and readable
  - [ ] Error state appears if API fails
  - [ ] Retry button works

**Checkpoint:** Match detail modal has smooth animations and AI insights ✓

---

## ✅ Phase 6: Loading & Error States (15 min)

- [ ] **6.1** Update prediction/result sections:
  - [ ] Import loading state components
  - [ ] Replace old "Loading..." text with `<LoadingSpinner>`
  - [ ] Replace old error messages with `<ErrorState>`
  - [ ] Add `<EmptyState>` for no-data cases
- [ ] **6.2** Update match list loading:
  - [ ] Use `<MatchCardSkeleton>` while loading
  - [ ] Show when `historyLoading === true`
- [ ] **6.3** Test:
  - [ ] Hover predictions show spinner
  - [ ] Failed API call shows error with retry btn
  - [ ] Empty lists show empty state with CTA
  - [ ] Match card skeleton animates (pulse effect)

**Checkpoint:** All loading/error states are polished ✓

---

## ✅ Phase 7: Other Pages (10 min)

- [ ] **7.1** Analytics Page:
  - [ ] Add `useTheme()` hook
  - [ ] Wrap content with theme-aware styling
  - [ ] Test dark mode works
- [ ] **7.2** Training Page:
  - [ ] Add `useTheme()` hook
  - [ ] Wrap content with theme-aware styling
  - [ ] Test dark mode works
- [ ] **7.3** Other Pages (OddsPanel, AccumulatorPanel):
  - [ ] Repeat steps for each page

**Checkpoint:** All pages support dark mode ✓

---

## ✅ Phase 8: Full Testing (20 min)

### Theme Switching
- [ ] Click theme toggle (☀️/🌙)
- [ ] Page fades to dark mode smoothly
- [ ] Refresh page - dark mode persists
- [ ] All text is readable in both modes
- [ ] No white text on light background
- [ ] No dark text on dark background

### Responsive Design
- [ ] Open DevTools (F12)
- [ ] Toggle responsive mode (Ctrl+Shift+M)
- [ ] Test at **375px** (mobile):
  - [ ] All content visible
  - [ ] No horizontal scroll
  - [ ] Hamburger menu appears
  - [ ] Cards stack vertically
  - [ ] Text is readable
- [ ] Test at **768px** (tablet):
  - [ ] 2 columns for cards
  - [ ] Sidebar visible
  - [ ] Proper spacing
- [ ] Test at **1024px** (desktop):
  - [ ] 3+ columns
  - [ ] Full features visible
  - [ ] Hover effects work

### Mobile Navigation
- [ ] At 375px width:
  - [ ] Hamburger menu (≡) appears
  - [ ] Click to open drawer
  - [ ] All nav items visible
  - [ ] Click item to navigate
  - [ ] Drawer closes after selection
  - [ ] Click again to toggle closed

### Components
- [ ] **Match Cards:**
  - [ ] Desktop: hover lifts card
  - [ ] Mobile: card is tappable
  - [ ] Confidence meter fills correctly
  - [ ] Risk indicator shows correct level
- [ ] **Modals:**
  - [ ] Open smoothly
  - [ ] Close smoothly
  - [ ] Click outside to close
  - [ ] Focus managed properly
- [ ] **Spinners:**
  - [ ] Animate smoothly
  - [ ] Stop after 5+ seconds
- [ ] **Error States:**
  - [ ] Show error icon
  - [ ] Show error message
  - [ ] Retry button works

### Accessibility
- [ ] Press **Tab** key:
  - [ ] Focus visible on all buttons
  - [ ] Can reach all interactive elements
  - [ ] Focus order is logical (top-to-bottom, left-to-right)
- [ ] Press **Enter** on focused button:
  - [ ] Button activates correctly
- [ ] Screen reader (if available):
  - [ ] Can read page structure
  - [ ] Buttons announced correctly
  - [ ] Images have alt text

### Dark Mode with Components
- [ ] Enable dark mode
- [ ] Check **every page:**
  - [ ] Text contrast is good (light text)
  - [ ] Buttons are visible
  - [ ] Icons are visible
  - [ ] Backgrounds are appropriate
  - [ ] Borders are visible

**Checkpoint:** All tests pass! ✓

---

## ✅ Phase 9: Optimization (Optional, 10 min)

- [ ] **9.1** Performance:
  - [ ] Open DevTools Performance tab
  - [ ] Scroll through match list
  - [ ] Should stay 60fps (no jank)
  - [ ] If laggy: add memoization to PremiumMatchCard
- [ ] **9.2** Lighthouse:
  - [ ] F12 > Lighthouse
  - [ ] Run audit
  - [ ] Performance > 90
  - [ ] Accessibility > 95
- [ ] **9.3** Bundle Size:
  - [ ] Check `npm run build` output
  - [ ] CSS bundle should be <50KB
  - [ ] Check for unused CSS

**Checkpoint:** App runs smoothly at 60fps ✓

---

## 🎉 Final Verification

- [ ] **Theme:** Dark mode works and persists
- [ ] **Navigation:** All pages accessible, mobile menu works
- [ ] **Dashboard:** Shows stats and health
- [ ] **Match Cards:** Look premium, responsive
- [ ] **Match Detail:** Modal with AI insights
- [ ] **Loading:** All states have appropriate feedback
- [ ] **Mobile:** Responsive and touch-friendly
- [ ] **Accessibility:** Keyboard navigable, high contrast
- [ ] **Performance:** Smooth animations, 60fps scrolling

---

## 🚀 Deployment Ready Checklist

Before pushing to production:

- [ ] All console errors cleared
- [ ] No warnings in DevTools
- [ ] Tested on real mobile device (not just emulator)
- [ ] Tested in Chrome, Firefox, Safari
- [ ] Dark mode tested in both modes
- [ ] API calls working
- [ ] No broken images
- [ ] All links working
- [ ] Lighthouse scores acceptable
- [ ] Loading states tested with slow network (DevTools > Network > Slow 3G)

---

## 📝 Notes

**Time Taken:**
- Started: _____________
- Completed: _____________
- Total Time: ___________

**Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Customizations Made:**
1. _________________________________
2. _________________________________
3. _________________________________

---

## 📞 Quick Troubleshooting

If something isn't working:

1. **Check console (F12 > Console)**
   - Any red errors?
   - Note the error

2. **Check main.jsx**
   - ThemeProvider wrapping App?
   - premium-styles.css imported?

3. **Check component imports**
   - Is component properly imported?
   - Is path correct?

4. **Hard refresh**
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)

5. **Clear cache**
   - F12 > Application > Storage > Clear All

6. **Still broken?**
   - Check INTEGRATION_GUIDE.md troubleshooting section
   - Check PREMIUM_COMPONENTS.md documentation

---

**✅ All done? You now have a premium sports intelligence frontend!** 🎉
