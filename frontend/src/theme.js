// frontend/src/theme.js
// Premium design system for VIT Sports Intelligence

export const THEME = {
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      hover: '#f0f4f8',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      muted: '#94a3b8',
    },
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      dark: '#94a3b8',
    },
    accent: {
      primary: '#0ea5e9',
      secondary: '#6366f1',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
    },
  },
  dark: {
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      hover: '#475569',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      muted: '#64748b',
    },
    border: {
      light: '#334155',
      medium: '#475569',
      dark: '#64748b',
    },
    accent: {
      primary: '#38bdf8',
      secondary: '#a78bfa',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#60a5fa',
    },
  },
}

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
}

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  success: 'linear-gradient(135deg, #10b981, #34d399)',
  danger: 'linear-gradient(135deg, #ef4444, #f87171)',
  warning: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  premium: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a78bfa 100%)',
}

export const TRANSITIONS = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
}
