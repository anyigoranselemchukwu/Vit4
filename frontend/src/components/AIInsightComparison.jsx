// frontend/src/components/AIInsightComparison.jsx
// Side-by-side comparison of AI insights from multiple providers

import { useEffect, useState } from 'react'
import { useTheme } from '../ThemeProvider'
import { GRADIENTS, SHADOWS, TRANSITIONS } from '../theme'

const AI_PROVIDERS = {
  gemini: { name: 'Gemini', color: '#4285f4', icon: '🔮' },
  claude: { name: 'Claude', color: '#8b5cf6', icon: '🧠' },
  grok: { name: 'Grok', color: '#10b981', icon: '⚡' },
}

function InsightCard({ provider, insight, isLoading }) {
  const { theme, isDark } = useTheme()
  const providerInfo = AI_PROVIDERS[provider] || { name: provider, color: theme.accent.primary }

  if (!insight && !isLoading) {
    return (
      <div style={{
        background: theme.bg.secondary,
        border: `1px solid ${theme.border.light}`,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
      }}>
        <div style={{ fontSize: 2, marginBottom: 8 }}>—</div>
        <div style={{ color: theme.text.tertiary, fontSize: '0.85rem' }}>
          No insight available
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{
        background: theme.bg.secondary,
        border: `1px solid ${theme.border.light}`,
        borderRadius: 12,
        padding: 20,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}>
        <div style={{ height: 24, background: theme.bg.tertiary, borderRadius: 4, marginBottom: 16, width: '60%' }} />
        <div style={{ height: 16, background: theme.bg.tertiary, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, background: theme.bg.tertiary, borderRadius: 4, marginBottom: 8, width: '90%' }} />
        <div style={{ height: 16, background: theme.bg.tertiary, borderRadius: 4, width: '75%' }} />
      </div>
    )
  }

  return (
    <div style={{
      background: theme.bg.primary,
      border: `2px solid ${providerInfo.color}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: SHADOWS.md,
    }}>
      {/* Header */}
      <div style={{
        background: providerInfo.color,
        color: '#fff',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: '1rem',
        fontWeight: 700,
      }}>
        <span>{providerInfo.icon}</span>
        <span>{providerInfo.name}</span>
        {insight.confidence && (
          <span style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: '0.85rem',
          }}>
            {(insight.confidence * 100).toFixed(0)}% confident
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {insight.summary && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: theme.text.secondary,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}>
              Summary
            </h4>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: theme.text.primary,
              margin: 0,
            }}>
              {insight.summary}
            </p>
          </div>
        )}

        {insight.key_factors && insight.key_factors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: theme.text.secondary,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}>
              Key Factors
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {insight.key_factors.map((factor, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 10,
                    background: theme.bg.secondary,
                    borderRadius: 8,
                    borderLeft: `3px solid ${providerInfo.color}`,
                  }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>→</span>
                  <span style={{ fontSize: '0.9rem', color: theme.text.primary }}>
                    {factor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insight.recommendation && (
          <div style={{
            padding: 12,
            background: `${providerInfo.color}20`,
            borderLeft: `3px solid ${providerInfo.color}`,
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: providerInfo.color,
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              Recommendation
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: theme.text.primary,
              fontWeight: 600,
            }}>
              {insight.recommendation}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIInsightComparison({ matchId, insights, isLoading, onRefresh }) {
  const { theme } = useTheme()
  const [selectedProvider, setSelectedProvider] = useState(null)

  const geminiInsight = insights?.gemini
  const claudeInsight = insights?.claude
  const grokInsight = insights?.grok

  const hasAnyInsight = geminiInsight || claudeInsight || grokInsight

  if (!hasAnyInsight && !isLoading) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.text.primary, marginBottom: 8 }}>
          No AI Insights Available
        </h3>
        <p style={{ fontSize: '0.9rem', color: theme.text.tertiary, marginBottom: 20 }}>
          AI insights will be generated when the match is analyzed by the ensemble.
        </p>
        <button
          onClick={onRefresh}
          style={{
            background: GRADIENTS.primary,
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            transition: `transform ${TRANSITIONS.base}`,
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔄 Refresh Insights
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 24,
      marginTop: 24,
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <InsightCard
        provider="gemini"
        insight={geminiInsight}
        isLoading={isLoading}
      />
      <InsightCard
        provider="claude"
        insight={claudeInsight}
        isLoading={isLoading}
      />
      <InsightCard
        provider="grok"
        insight={grokInsight}
        isLoading={isLoading}
      />

      {/* Agreement summary */}
      {hasAnyInsight && (
        <div style={{
          gridColumn: '1 / -1',
          padding: 20,
          background: theme.bg.secondary,
          border: `1px solid ${theme.border.light}`,
          borderRadius: 12,
          marginTop: 12,
        }}>
          <h4 style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: theme.text.secondary,
            marginBottom: 12,
            textTransform: 'uppercase',
          }}>
            Consensus Analysis
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}>
            {Object.entries(AI_PROVIDERS).map(([key, provider]) => {
              const insight = insights?.[key]
              return (
                <div key={key} style={{
                  padding: 12,
                  background: theme.bg.primary,
                  borderRadius: 8,
                  borderLeft: `3px solid ${provider.color}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.75rem', color: theme.text.tertiary, marginBottom: 4 }}>
                    {provider.name} Status
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: insight ? theme.accent.success : theme.text.tertiary,
                  }}>
                    {insight ? '✓ Generated' : '— Pending'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
