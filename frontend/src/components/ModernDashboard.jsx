// frontend/src/components/ModernDashboard.jsx
// Premium landing/dashboard screen with hero section and key metrics

import { useTheme } from '../ThemeProvider'
import { GRADIENTS, SHADOWS, TRANSITIONS } from '../theme'

function StatCard({ icon, label, value, subtext, color, onClick }) {
  const { theme } = useTheme()

  return (
    <div
      onClick={onClick}
      style={{
        background: theme.bg.primary,
        border: `1px solid ${theme.border.light}`,
        borderRadius: 12,
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${TRANSITIONS.base}`,
        boxShadow: SHADOWS.sm,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = color
          e.currentTarget.style.boxShadow = SHADOWS.lg
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.border.light
          e.currentTarget.style.boxShadow = SHADOWS.sm
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Gradient background accent */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        background: `${color}15`,
        borderRadius: '50%',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: '1.8rem' }}>{icon}</span>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: theme.text.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {label}
          </div>
        </div>

        <div style={{
          fontSize: '2rem',
          fontWeight: 800,
          background: GRADIENTS.primary,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          {value}
        </div>

        {subtext && (
          <div style={{
            fontSize: '0.75rem',
            color: theme.text.tertiary,
          }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroSection() {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 40,
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: GRADIENTS.premium,
        opacity: 0.1,
        zIndex: 0,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px 40px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* Header with theme toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: theme.text.primary,
              margin: '0 0 8px 0',
              background: GRADIENTS.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              VIT Sports Intelligence
            </h1>
            <p style={{
              fontSize: '1rem',
              color: theme.text.secondary,
              margin: 0,
            }}>
              AI-Powered Football Prediction & Analytics Platform
            </p>
          </div>

          <button
            onClick={toggleTheme}
            style={{
              background: theme.bg.secondary,
              border: `1px solid ${theme.border.light}`,
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: `all ${TRANSITIONS.base}`,
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Description */}
        <div style={{
          maxWidth: 600,
        }}>
          <p style={{
            fontSize: '1.1rem',
            lineHeight: 1.8,
            color: theme.text.secondary,
            margin: 0,
          }}>
            Join top bettors analyzing player form, injury updates, team dynamics, and historical trends. 
            Get certified picks powered by an ensemble of 12+ specialized AI models with real-time odds scanning.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ModernDashboard({
  stats = {},
  health = {},
  onNavigate = () => {},
  children,
}) {
  const { theme } = useTheme()

  const defaultStats = {
    upcomingMatches: stats.upcomingMatches || 0,
    activeModels: stats.activeModels || 0,
    certifiedPicks: stats.certifiedPicks || 0,
    winRate: stats.winRate || '68.5%',
    roi: stats.roi || '+12.3%',
    totalBankroll: stats.totalBankroll || '$45,230',
  }

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: '20px',
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Hero Section */}
      <HeroSection />

      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 20,
        marginBottom: 40,
      }}>
        <StatCard
          icon="📅"
          label="Upcoming Matches"
          value={defaultStats.upcomingMatches}
          subtext="This week"
          color={theme.accent.primary}
          onClick={() => onNavigate('dashboard')}
        />
        <StatCard
          icon="🤖"
          label="Active Models"
          value={defaultStats.activeModels}
          subtext="Ready to predict"
          color={theme.accent.secondary}
          onClick={() => onNavigate('admin')}
        />
        <StatCard
          icon="🏅"
          label="Certified Picks"
          value={defaultStats.certifiedPicks}
          subtext="This season"
          color={theme.accent.success}
          onClick={() => onNavigate('picks')}
        />
        <StatCard
          icon="🎯"
          label="Win Rate"
          value={defaultStats.winRate}
          subtext="All-time average"
          color="#f59e0b"
        />
        <StatCard
          icon="💰"
          label="ROI"
          value={defaultStats.roi}
          subtext="Season performance"
          color={theme.accent.success}
          onClick={() => onNavigate('analytics')}
        />
        <StatCard
          icon="💵"
          label="Bankroll"
          value={defaultStats.totalBankroll}
          subtext="Current balance"
          color={theme.accent.primary}
          onClick={() => onNavigate('analytics')}
        />
      </div>

      {/* Health Status */}
      {health && Object.keys(health).length > 0 && (
        <div style={{
          padding: 24,
          background: theme.bg.primary,
          border: `1px solid ${theme.border.light}`,
          borderRadius: 12,
          marginBottom: 40,
          boxShadow: SHADOWS.sm,
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: theme.text.primary,
            marginBottom: 16,
            marginTop: 0,
          }}>
            System Health
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}>
            {Object.entries(health).map(([key, status]) => {
              const isHealthy = status === true || status?.status === 'healthy'
              return (
                <div
                  key={key}
                  style={{
                    padding: 12,
                    background: theme.bg.secondary,
                    borderLeft: `3px solid ${isHealthy ? theme.accent.success : theme.accent.danger}`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{
                    fontSize: '1.2rem',
                  }}>
                    {isHealthy ? '✓' : '✗'}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: theme.text.tertiary,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: isHealthy ? theme.accent.success : theme.accent.danger,
                      fontWeight: 700,
                    }}>
                      {isHealthy ? 'Operational' : 'Issue detected'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content area */}
      {children}
    </div>
  )
}
