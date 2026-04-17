// src/pages/SubscriptionPage.jsx
// VIT Sports Intelligence — Subscription Plans UI

import { useState, useEffect } from 'react'
import { fetchSubscriptionPlans, fetchMyPlan, upgradePlan } from '../api'

const PLAN_COLORS = {
  free:  { bg: '#f8fafc', border: '#cbd5e1', accent: '#64748b', badge: '#94a3b8' },
  pro:   { bg: '#eff6ff', border: '#3b82f6', accent: '#2563eb', badge: '#3b82f6' },
  elite: { bg: '#fdf4ff', border: '#a855f7', accent: '#7c3aed', badge: '#a855f7' },
}

const FEATURE_LABELS = {
  predictions:          '🔮 Match Predictions',
  basic_history:        '📜 Prediction History',
  advanced_analytics:   '📊 Advanced Analytics',
  ai_insights:          '✨ Multi-Agent AI Insights',
  accumulator_builder:  '⊕ Accumulator Builder',
  model_breakdown:      '🧠 Model Breakdown',
  telegram_alerts:      '📱 Telegram Alerts',
  bankroll_tools:       '💰 Bankroll Tools',
  csv_upload:           '📂 CSV/JSON Data Upload',
  priority_support:     '⭐ Priority Support',
}

function PlanCard({ plan, currentPlan, onUpgrade, loading }) {
  const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free
  const isCurrent = currentPlan === plan.name
  const isDowngrade = plan.name === 'free' && currentPlan !== 'free'

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${isCurrent ? colors.accent : colors.border}`,
      borderRadius: 16,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      position: 'relative',
      boxShadow: isCurrent ? `0 0 0 3px ${colors.accent}33` : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      {isCurrent && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          background: colors.accent, color: '#fff',
          fontSize: '0.72rem', fontWeight: 700,
          padding: '3px 12px', borderRadius: 20,
        }}>CURRENT PLAN</div>
      )}

      {plan.name === 'pro' && !isCurrent && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          background: '#3b82f6', color: '#fff',
          fontSize: '0.72rem', fontWeight: 700,
          padding: '3px 12px', borderRadius: 20,
        }}>MOST POPULAR</div>
      )}

      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: colors.accent }}>
          {plan.display_name}
        </div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
          {plan.description}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
          {plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}`}
        </span>
        {plan.price_monthly > 0 && (
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/month</span>
        )}
      </div>

      {plan.price_monthly > 0 && (
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          or ${plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
        </div>
      )}

      {plan.limits?.predictions_per_day != null ? (
        <div style={{
          background: '#f1f5f9', borderRadius: 8, padding: '8px 12px',
          fontSize: '0.82rem', color: '#334155', fontWeight: 600,
        }}>
          {plan.limits.predictions_per_day} predictions/day
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4', borderRadius: 8, padding: '8px 12px',
          fontSize: '0.82rem', color: '#15803d', fontWeight: 600,
        }}>
          ∞ Unlimited predictions
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {Object.entries(FEATURE_LABELS).map(([key, label]) => {
          const included = plan.features?.[key]
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem' }}>
              <span style={{ color: included ? '#10b981' : '#cbd5e1', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                {included ? '✓' : '–'}
              </span>
              <span style={{ color: included ? '#1e293b' : '#94a3b8' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {!isCurrent && !isDowngrade && (
        <button
          onClick={() => onUpgrade(plan.name)}
          disabled={loading}
          style={{
            background: loading ? '#e2e8f0' : `linear-gradient(135deg, ${colors.accent}, ${colors.badge})`,
            color: loading ? '#94a3b8' : '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 0',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Upgrading…' : `Upgrade to ${plan.display_name}`}
        </button>
      )}

      {isCurrent && (
        <div style={{
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRadius: 10, padding: '12px 0',
          textAlign: 'center', fontWeight: 700,
          fontSize: '0.88rem', color: colors.accent,
        }}>
          Active Plan ✓
        </div>
      )}
    </div>
  )
}

export default function SubscriptionPage({ apiKey }) {
  const [plans, setPlans] = useState([])
  const [myPlan, setMyPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [apiKey])

  async function loadAll() {
    setLoading(true)
    try {
      const [plansRes, planRes] = await Promise.allSettled([
        fetchSubscriptionPlans(),
        apiKey ? fetchMyPlan(apiKey) : Promise.resolve(null),
      ])
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.plans || [])
      if (planRes.status === 'fulfilled' && planRes.value) setMyPlan(planRes.value)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planName) {
    if (!apiKey) {
      setError('Enter your API key first to manage your subscription.')
      return
    }
    setUpgrading(true)
    setError('')
    setMessage('')
    try {
      const res = await upgradePlan(apiKey, planName)
      setMessage(res.message || `Upgraded to ${planName}!`)
      await loadAll()
    } catch (e) {
      let msg = e.message
      try { msg = JSON.parse(e.message)?.detail?.message || msg } catch {}
      setError(msg)
    } finally {
      setUpgrading(false)
    }
  }

  const currentPlanName = myPlan?.plan?.name || 'free'

  return (
    <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Choose Your Plan
        </h2>
        <p style={{ color: '#64748b', marginTop: 8, fontSize: '0.95rem' }}>
          Unlock the full power of VIT Sports Intelligence
        </p>

        {myPlan?.usage && (
          <div style={{
            display: 'inline-flex', gap: 24, background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '10px 24px', marginTop: 12, fontSize: '0.85rem', color: '#475569',
          }}>
            <span>Plan: <strong style={{ color: '#1e293b' }}>{myPlan.plan?.display_name || 'Free'}</strong></span>
            <span>Today: <strong style={{ color: '#2563eb' }}>{myPlan.usage.predictions_today}/{myPlan.usage.limit_today ?? '∞'} predictions</strong></span>
            {myPlan.subscription?.period_end && (
              <span>Renews: <strong>{new Date(myPlan.subscription.period_end).toLocaleDateString()}</strong></span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: '0.88rem',
        }}>⚠️ {error}</div>
      )}
      {message && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
          padding: '12px 16px', color: '#15803d', marginBottom: 16, fontSize: '0.88rem',
        }}>✅ {message}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>Loading plans…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.name}
              plan={plan}
              currentPlan={currentPlanName}
              onUpgrade={handleUpgrade}
              loading={upgrading}
            />
          ))}
        </div>
      )}

      <div style={{
        marginTop: 32, background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 12, padding: '16px 20px', fontSize: '0.85rem', color: '#92400e',
      }}>
        <strong>💳 Payment Integration:</strong> Stripe integration is ready to be activated.
        Once connected, you'll be charged monthly and can cancel anytime.
        Your plan is tied to your API key.
      </div>
    </div>
  )
}
