// frontend/src/components/BottomNav.jsx
// Native-style bottom tab bar for mobile — only visible on mobile (≤768px)

import { useState } from 'react'
import { useTheme } from '../ThemeProvider'
import { TRANSITIONS } from '../theme'

const MAIN_TABS = [
  { id: 'dashboard',  icon: '▤',  label: 'Home' },
  { id: 'picks',      icon: '★',  label: 'Picks' },
  { id: 'odds',       icon: '◈',  label: 'Odds' },
  { id: 'analytics',  icon: '↗',  label: 'Stats' },
  { id: '__more__',   icon: '⋯',  label: 'More' },
]

const MORE_ITEMS = [
  { id: 'accumulator',  icon: '⊕',  label: 'Accumulators',     group: 'Predict' },
  { id: 'training',     icon: '◎',  label: 'Training',          group: 'System' },
  { id: 'dataset',      icon: '📂', label: 'Dataset',           group: 'System' },
  { id: 'admin',        icon: '⚙',  label: 'Admin',             group: 'System' },
  { id: 'subscription', icon: '💎', label: 'Plans',             group: 'Account' },
]

export default function BottomNav({ activeId, onNavigate, adminKey, onAdminKeyChange }) {
  const { theme, isDark, toggleTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = !MAIN_TABS.slice(0, 4).some(t => t.id === activeId)

  function handleTab(id) {
    if (id === '__more__') {
      setMoreOpen(v => !v)
    } else {
      setMoreOpen(false)
      onNavigate(id)
    }
  }

  function handleMoreItem(id) {
    setMoreOpen(false)
    onNavigate(id)
  }

  const navBg    = isDark ? '#0f172a' : '#ffffff'
  const navBorder = isDark ? '#1e293b' : '#e2e8f0'
  const activeColor = '#0ea5e9'
  const inactiveColor = isDark ? '#64748b' : '#94a3b8'
  const sheetBg  = isDark ? '#1e293b' : '#ffffff'

  return (
    <>
      {/* ── Bottom Tab Bar ──────────────────────────────────────── */}
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 64,
          background: navBg,
          borderTop: `1px solid ${navBorder}`,
          alignItems: 'stretch',
          zIndex: 200,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {MAIN_TABS.map(tab => {
          const isActive = tab.id === '__more__'
            ? isMoreActive || moreOpen
            : activeId === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                color: isActive ? activeColor : inactiveColor,
                transition: `color ${TRANSITIONS.fast}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                fontSize: '1.3rem',
                lineHeight: 1,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                transition: `transform ${TRANSITIONS.fast}`,
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.2px',
              }}>
                {tab.label}
              </span>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 28,
                  height: 3,
                  background: activeColor,
                  borderRadius: '3px 3px 0 0',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── More Sheet Overlay ──────────────────────────────────── */}
      {moreOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 199,
            animation: 'fadeIn 0.18s ease',
          }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── More Sheet ──────────────────────────────────────────── */}
      <div
        className="more-sheet"
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0, right: 0,
          background: sheetBg,
          borderTop: `1px solid ${navBorder}`,
          borderRadius: '20px 20px 0 0',
          zIndex: 200,
          padding: '12px 0 20px',
          transform: moreOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: `transform 0.28s cubic-bezier(.4,0,.2,1)`,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4,
          background: isDark ? '#334155' : '#e2e8f0',
          borderRadius: 2,
          margin: '0 auto 16px',
        }} />

        {/* Group items */}
        {['Predict', 'System', 'Account'].map(group => {
          const items = MORE_ITEMS.filter(i => i.group === group)
          return (
            <div key={group}>
              <div style={{
                padding: '4px 20px 6px',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isDark ? '#475569' : '#94a3b8',
              }}>
                {group}
              </div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleMoreItem(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 20px',
                    border: 'none',
                    background: activeId === item.id
                      ? (isDark ? 'rgba(14,165,233,0.12)' : '#eff6ff')
                      : 'transparent',
                    color: activeId === item.id
                      ? activeColor
                      : (isDark ? '#cbd5e1' : '#0f172a'),
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: activeId === item.id ? 700 : 500,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                  {activeId === item.id && (
                    <span style={{
                      marginLeft: 'auto',
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: activeColor,
                    }} />
                  )}
                </button>
              ))}
            </div>
          )
        })}

        {/* Divider */}
        <div style={{
          height: 1,
          background: navBorder,
          margin: '12px 20px',
        }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '13px 20px',
            border: 'none',
            background: 'transparent',
            color: isDark ? '#cbd5e1' : '#0f172a',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 500,
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>
            {isDark ? '☀️' : '🌙'}
          </span>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Admin key */}
        <div style={{ padding: '8px 20px 4px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: isDark ? '#475569' : '#94a3b8',
            marginBottom: 6,
          }}>
            Admin Key
          </label>
          <input
            type="password"
            placeholder="Enter admin key…"
            value={adminKey}
            onChange={e => onAdminKeyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1.5px solid ${navBorder}`,
              borderRadius: 10,
              background: isDark ? '#0f172a' : '#f8fafc',
              color: isDark ? '#f1f5f9' : '#0f172a',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .bottom-nav button { position: relative; }
      `}</style>
    </>
  )
}
