import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { applyTheme, getStoredTheme, resolveThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '../utils/theme'

interface ThemeValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeValue | null>(null)

if (typeof document !== 'undefined') {
  applyTheme(getStoredTheme())
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())

  useLayoutEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => applyTheme('system')
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', updateTheme)
    else mediaQuery.addListener(updateTheme)
    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', updateTheme)
      else mediaQuery.removeListener(updateTheme)
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: resolveThemeMode(theme) }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
