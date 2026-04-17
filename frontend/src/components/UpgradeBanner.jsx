// src/components/UpgradeBanner.jsx
// Feature-gated upgrade prompt

const PLAN_LABELS = { free: 'Free', pro: 'Pro', elite: 'Elite' }

const UPGRADE_TARGET = {
  free: 'pro',
  pro: 'elite',
}

export default function UpgradeBanner({ feature, currentPlan = 'free', onNavigate }) {
  const upgradeTo = UPGRADE_TARGET[currentPlan] || 'pro'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      border: '1px solid #4338ca',
      borderRadius: 14,
      padding: '24px 28px',
      textAlign: 'center',
      color: '#e0e7ff',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔒</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6, color: '#fff' }}>
        {feature} requires a {PLAN_LABELS[upgradeTo]} plan
      </div>
      <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: 20 }}>
        You're on the <strong style={{ color: '#818cf8' }}>{PLAN_LABELS[currentPlan]}</strong> plan.
        Upgrade to unlock this feature and much more.
      </div>
      <button
        onClick={() => onNavigate && onNavigate('subscription')}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '11px 28px',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
        }}
      >
        View Plans →
      </button>
    </div>
  )
}
