import { useContext } from 'react'
import { ThemeContext } from '../context/ThemeContext'

/** Access the active theme + controls. Throws if used outside <ThemeProvider>. */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
