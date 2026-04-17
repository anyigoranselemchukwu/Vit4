// frontend/src/components/PremiumModal.jsx
// Enhanced modal component with smooth transitions and responsive design

import { useTheme } from '../ThemeProvider'
import { SHADOWS, TRANSITIONS } from '../theme'

export default function PremiumModal({ isOpen, onClose, title, children, size = 'md' }) {
  const { theme } = useTheme()

  if (!isOpen) return null

  const sizes = {
    sm: { maxWidth: 400 },
    md: { maxWidth: 600 },
    lg: { maxWidth: 900 },
    xl: { maxWidth: 1200 },
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        animation: `fadeIn ${TRANSITIONS.fast} ease-out`,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          background: theme.bg.primary,
          borderRadius: 16,
          boxShadow: SHADOWS['2xl'],
          maxHeight: '90vh',
          overflow: 'auto',
          animation: `slideUp ${TRANSITIONS.base} ease-out`,
          ...sizes[size],
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 24,
            borderBottom: `1px solid ${theme.border.light}`,
            position: 'sticky',
            top: 0,
            background: theme.bg.primary,
            zIndex: 10,
          }}
        >
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: theme.text.primary,
            margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: theme.text.tertiary,
              transition: `color ${TRANSITIONS.fast}`,
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => e.target.style.color = theme.text.primary}
            onMouseLeave={(e) => e.target.style.color = theme.text.tertiary}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
