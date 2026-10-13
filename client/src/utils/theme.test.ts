// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, getStoredTheme, resolveThemeMode } from './theme'

const makeStorage = () => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
}

describe('theme utilities', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), configurable: true })
    vi.unstubAllGlobals()
    document.documentElement.dataset.theme = ''
  })

  it('resolves theme by user preference when it is explicitly set', () => {
    expect(resolveThemeMode('light')).toBe('light')
    expect(resolveThemeMode('dark')).toBe('dark')
  })

  it('falls back to the operating system theme when mode is system', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    })

    expect(resolveThemeMode('system')).toBe('dark')
  })

  it('persists the chosen theme and updates the document root', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), configurable: true })
    localStorage.setItem('tripsplit-theme', 'dark')

    expect(getStoredTheme()).toBe('dark')
    expect(applyTheme('dark')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.body.style.colorScheme).toBe('dark')
  })
})
