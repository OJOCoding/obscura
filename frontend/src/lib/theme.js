/**
 * theme.js — persistent dark/light theme support.
 *
 * Applies the stored theme to <html data-theme="..."> so CSS variables
 * swap between palettes declared in index.css.
 */

const STORAGE_KEY = 'obscura_theme'

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  // Fall back to system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  return 'dark'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
}

export function toggleTheme(current) {
  const next = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
