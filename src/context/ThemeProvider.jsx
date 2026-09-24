import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContext'

const STORAGE_KEY = 'theme'

/** Read the initial theme: saved preference → system preference → light.
 *  Runs synchronously so the first render matches the pre-paint <html> attribute
 *  set in index.html (no flash, no mismatch). */
function initialTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Owns the light/dark theme for the whole app. Reflects it onto
 * <html data-theme="…"> (which the CSS in index.css keys off) and persists the
 * choice to localStorage. Wrap the app in this once, above everything.
 */
export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme)

  // Reflect the active theme onto <html> (the CSS keys off data-theme).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Follow the OS theme only while the user hasn't made an explicit choice
  // (i.e. nothing persisted yet).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return
      } catch {
        /* ignore */
      }
      setThemeState(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Persist only on an explicit user action, so OS-following stays active until
  // the user actually picks a theme.
  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode / storage disabled — theme still applies for the session */
    }
  }, [])
  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [setTheme, theme],
  )

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
