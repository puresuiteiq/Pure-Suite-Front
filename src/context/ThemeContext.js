import { createContext } from 'react'

/**
 * Theme context: { theme: 'light' | 'dark', toggleTheme, setTheme }.
 * Split from the provider (3-file pattern) so this module exports only the
 * context object — keeps Fast Refresh / oxlint's only-export-components happy.
 */
export const ThemeContext = createContext(null)
