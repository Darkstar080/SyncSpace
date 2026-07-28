const STORAGE_KEY = 'syncspace_theme'

/**
 * The theme to use right now: an explicit saved choice if the user has
 * ever toggled it, otherwise the OS/browser's CURRENT preference.
 */
export function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return getSystemTheme()
}

export function getSystemTheme() {
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches
  return prefersLight ? 'light' : 'dark'
}

/** True once the user has explicitly picked a theme via the toggle button. */
export function hasExplicitPreference() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark'
}

/** Apply a theme to the document (just the visual switch, no saving). */
export function applyToDocument(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Save an explicit user choice. From this point on, the app stops
 * following OS theme changes for this browser — the user's choice wins
 * from here forward (see watchSystemTheme below).
 */
export function setExplicitTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  applyToDocument(theme)
}

/**
 * Subscribe to LIVE OS theme changes (e.g. the system auto-switching at
 * sunset). Only meaningful while the user hasn't made an explicit
 * choice yet — callers should check hasExplicitPreference() before
 * using this. Returns an unsubscribe function.
 */
export function watchSystemTheme(callback) {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = (e) => callback(e.matches ? 'light' : 'dark')
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}