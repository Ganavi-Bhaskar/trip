export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'tripsplit-theme'

export function resolveThemeMode(theme: ThemeMode | null | undefined): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const value = window.localStorage.getItem(THEME_STORAGE_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  const resolvedTheme = resolveThemeMode(theme)
  const root = document.documentElement
  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
  root.classList.remove('theme-light', 'theme-dark')
  root.classList.add(`theme-${resolvedTheme}`)
  document.body.style.colorScheme = resolvedTheme
  document.body.classList.remove('theme-light', 'theme-dark')
  document.body.classList.add(`theme-${resolvedTheme}`)
  return resolvedTheme
}
