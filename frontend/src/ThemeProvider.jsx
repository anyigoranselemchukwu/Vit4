// frontend/src/ThemeProvider.jsx
// Theme context for dark mode and light mode support

import { createContext, useContext, useState, useEffect } from 'react'
import { THEME } from './theme'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('vit_theme_dark')
    if (saved !== null) return JSON.parse(saved)
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('vit_theme_dark', JSON.stringify(isDark))
    if (isDark) {
      document.documentElement.style.background = THEME.dark.bg.primary
      document.documentElement.style.color = THEME.dark.text.primary
    } else {
      document.documentElement.style.background = THEME.light.bg.primary
      document.documentElement.style.color = THEME.light.text.primary
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)
  const theme = isDark ? THEME.dark : THEME.light

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      <div style={{
        background: theme.bg.primary,
        color: theme.text.primary,
        transition: 'background-color 0.3s, color 0.3s',
        minHeight: '100vh',
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
