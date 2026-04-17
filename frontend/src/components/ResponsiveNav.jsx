// frontend/src/components/ResponsiveNav.jsx
// Desktop: premium frosted-glass horizontal nav. Mobile: brand bar only.

import { useTheme } from '../ThemeProvider'
import { TRANSITIONS } from '../theme'

export default function ResponsiveNav({ items, activeId, onNavigate, branding }) {
  const { theme, isDark, toggleTheme } = useTheme()

  const headerBg = isDark
    ? 'rgba(15,23,42,0.88)'
    : 'rgba(255,255,255,0.88)'

  const allItems = items.flatMap(group => group.items || [])

  return (
    <>
      <header style={{
        background: headerBg,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        padding: '0 28px',
        height: 62,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)'
          : '0 1px 0 rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>

        {/* Brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            boxShadow: '0 2px 8px rgba(99,102,241,.4)',
            flexShrink: 0,
          }}>
            ⚡
          </div>
          <span style={{
            fontSize: '1.05rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.4px',
          }}>
            {branding || 'VIT Intelligence'}
          </span>
        </div>

        {/* Desktop Nav — hidden on mobile */}
        <nav className="desktop-nav" style={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          margin: '0 20px',
          overflow: 'hidden',
        }}>
          {allItems.map(item => {
            const isActive = activeId === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 999,
                  border: 'none',
                  background: isActive
                    ? (isDark ? 'rgba(99,102,241,0.22)' : 'rgba(59,130,246,0.1)')
                    : 'transparent',
                  color: isActive
                    ? (isDark ? '#a5b4fc' : '#2563eb')
                    : theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: `all ${TRANSITIONS.fast}`,
                  whiteSpace: 'nowrap',
                  letterSpacing: isActive ? '-0.1px' : '0',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.05)'
                    e.currentTarget.style.color = theme.text.primary
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = theme.text.secondary
                  }
                }}
              >
                <span style={{ marginRight: 5, opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right side — theme toggle (desktop only) */}
        <div className="desktop-theme-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={toggleTheme}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: `all ${TRANSITIONS.fast}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-theme-btn { display: none !important; }
        }
      `}</style>
    </>
  )
}
