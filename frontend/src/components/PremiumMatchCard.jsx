// frontend/src/components/PremiumMatchCard.jsx
// Enhanced match card with premium design, confidence/risk visualizations

import { useTheme } from '../ThemeProvider'
import { GRADIENTS, SHADOWS, TRANSITIONS } from '../theme'

function ConfidenceMeter({ confidence, risk }) {
  const { theme } = useTheme()
  const riskLevel = risk > 0.7 ? 'high' : risk > 0.4 ? 'medium' : 'low'
  const riskColor = riskLevel === 'high' ? theme.accent.danger : 
                    riskLevel === 'medium' ? theme.accent.warning : 
                    theme.accent.success
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Confidence bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.text.tertiary, minWidth: 50 }}>
          Confidence
        </span>
        <div style={{
          flex: 1,
          height: 6,
          background: theme.bg.tertiary,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, confidence * 100))}%`,
            background: GRADIENTS.primary,
            transition: `width ${TRANSITIONS.base}`,
          }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.text.primary, minWidth: 40 }}>
          {(confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Risk indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.text.tertiary, minWidth: 50 }}>
          Risk Level
        </span>
        <div style={{
          display: 'flex',
          gap: 4,
          flex: 1,
        }}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                background: risk >= threshold ? riskColor : theme.bg.tertiary,
                borderRadius: 2,
                transition: `background ${TRANSITIONS.base}`,
              }}
            />
          ))}
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: riskColor,
          minWidth: 50,
          textAlign: 'right',
        }}>
          {riskLevel.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

export default function PremiumMatchCard({ match, onSelect, isLoading }) {
  const { theme, isDark } = useTheme()
  const confidence = match.avg_1x2_confidence || 0.65
  const risk = Math.max(0, 1 - confidence)

  if (isLoading) {
    return (
      <div style={{
        background: theme.bg.primary,
        border: `1px solid ${theme.border.light}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}>
        <div style={{ height: 20, background: theme.bg.tertiary, borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 16, background: theme.bg.tertiary, borderRadius: 4, marginBottom: 8, width: '80%' }} />
        <div style={{ height: 16, background: theme.bg.tertiary, borderRadius: 4, width: '60%' }} />
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(match.match_id)}
      style={{
        background: theme.bg.primary,
        border: `1px solid ${theme.border.light}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.base}`,
        boxShadow: SHADOWS.sm,
        hover: {
          borderColor: theme.accent.primary,
          boxShadow: SHADOWS.lg,
          transform: 'translateY(-2px)',
        },
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme.accent.primary
        e.currentTarget.style.boxShadow = SHADOWS.lg
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.border.light
        e.currentTarget.style.boxShadow = SHADOWS.sm
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header with teams and odds */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.border.light}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: theme.text.primary,
            marginBottom: 4,
          }}>
            {match.home_team} <span style={{ color: theme.text.tertiary }}>vs</span> {match.away_team}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: theme.text.tertiary,
          }}>
            {new Date(match.kickoff_time).toLocaleDateString()} • {match.league?.replace(/_/g, ' ')}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}>
          <div style={{
            background: GRADIENTS.primary,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            {match.best_odds ? `${match.best_odds.toFixed(2)} odds` : 'No odds'}
          </div>
          {match.pick_type && (
            <div style={{
              background: match.pick_type === 'certified' ? theme.accent.success : theme.accent.warning,
              color: '#fff',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: '0.65rem',
              fontWeight: 700,
            }}>
              {match.pick_type === 'certified' ? '🏅 CERTIFIED' : '⚡ HIGH CONF'}
            </div>
          )}
        </div>
      </div>

      {/* Prediction section */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}>
          {['1', 'X', '2'].map((outcome) => {
            const probs = match.model_consensus_probs || {}
            const prob = outcome === '1' ? probs.home : outcome === 'X' ? probs.draw : probs.away
            const pct = prob ? Math.round(prob * 100) : 0
            return (
              <div key={outcome} style={{
                background: theme.bg.secondary,
                padding: 12,
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: theme.text.tertiary, marginBottom: 4 }}>
                  {outcome === '1' ? 'Home Win' : outcome === 'X' ? 'Draw' : 'Away Win'}
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  background: GRADIENTS.primary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {pct}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Confidence and risk meters */}
        <ConfidenceMeter confidence={confidence} risk={risk} />

        {/* Model agreement */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${theme.border.light}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: theme.text.tertiary, marginBottom: 2 }}>
              Model Agreement
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: theme.accent.primary }}>
              {match.model_agreement_pct || 0}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: theme.text.tertiary, marginBottom: 2 }}>
              Models
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: theme.accent.secondary }}>
              {match.num_models || 0}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', color: theme.text.tertiary, marginBottom: 2 }}>
              Stake %
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: theme.accent.success }}>
              {((match.recommended_stake || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        background: theme.bg.secondary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '0.75rem',
        color: theme.accent.primary,
        fontWeight: 600,
      }}>
        <span>{new Date(match.timestamp).toLocaleTimeString()}</span>
        <span>View Details →</span>
      </div>
    </div>
  )
}
