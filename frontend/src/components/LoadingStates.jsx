// frontend/src/components/LoadingStates.jsx
// Premium loading and error state components

import { useTheme } from '../ThemeProvider'
import { GRADIENTS, SHADOWS } from '../theme'

export function SkeletonLoader({ height = 20, width = '100%', style = {} }) {
  const { theme } = useTheme()
  return (
    <div
      style={{
        height,
        width,
        background: theme.bg.tertiary,
        borderRadius: 8,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style,
      }}
    />
  )
}

export function MatchCardSkeleton() {
  const { theme } = useTheme()
  return (
    <div style={{
      background: theme.bg.primary,
      border: `1px solid ${theme.border.light}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <SkeletonLoader height={24} marginBottom={12} />
      <SkeletonLoader height={16} marginBottom={8} width="80%" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SkeletonLoader height={60} />
        <SkeletonLoader height={60} />
        <SkeletonLoader height={60} />
      </div>
    </div>
  )
}

export function ErrorState({ icon = '⚠️', title, message, onRetry, retryLabel = 'Try Again' }) {
  const { theme } = useTheme()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        color: theme.text.primary,
        marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: theme.text.tertiary,
        marginBottom: 24,
        maxWidth: 400,
      }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: GRADIENTS.primary,
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          🔄 {retryLabel}
        </button>
      )}
    </div>
  )
}

export function LoadingSpinner({ size = 40, color = undefined }) {
  const { theme } = useTheme()
  const spinColor = color || theme.accent.primary

  return (
    <div style={{
      display: 'inline-block',
      width: size,
      height: size,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <svg
        className="spinner"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <circle cx="12" cy="12" r="10" stroke={spinColor} strokeWidth="2" opacity="0.2" />
        <path
          d="M 12 2 A 10 10 0 0 1 22 12"
          stroke={spinColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, message, action, actionLabel = 'Get Started' }) {
  const { theme } = useTheme()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
      textAlign: 'center',
      background: theme.bg.secondary,
      borderRadius: 12,
      border: `1px dashed ${theme.border.medium}`,
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        color: theme.text.primary,
        marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: theme.text.tertiary,
        marginBottom: 24,
        maxWidth: 400,
      }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action}
          style={{
            background: GRADIENTS.primary,
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ProgressBar({ progress = 0, label = '', isSuccess = false, isError = false }) {
  const { theme } = useTheme()

  const color = isError ? theme.accent.danger : isSuccess ? theme.accent.success : theme.accent.primary

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.text.secondary }}>
          {label}
        </span>
        <span style={{ fontSize: '0.85rem', color: theme.text.tertiary }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div style={{
        height: 8,
        background: theme.bg.tertiary,
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div
          style={{
            height: '100%',
            background: color,
            width: `${Math.max(0, Math.min(100, progress))}%`,
            transition: 'width 300ms ease-out',
          }}
        />
      </div>
    </div>
  )
}

export function ErrorBoundary({ children, fallback = null }) {
  const handleError = (error, info) => {
    console.error('Error:', error, info)
  }

  try {
    return children
  } catch (error) {
    handleError(error, { componentStack: '' })
    return fallback || <ErrorState title="Something went wrong" message={error?.message || 'An unexpected error occurred'} />
  }
}
