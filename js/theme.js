const STORAGE_KEY = 'wtt-theme';

/** @typedef {'light' | 'dark'} Theme */

/**
 * @returns {Theme}
 */
export function getTheme() {
  const current = document.documentElement.dataset.theme;
  return current === 'light' ? 'light' : 'dark';
}

/**
 * @param {Theme} theme
 */
export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  syncThemeToggle(theme);
}

/**
 * @param {Theme} theme
 */
function syncThemeToggle(theme) {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;

  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Passer en mode clair' : 'Passer en mode sombre');
  btn.setAttribute('title', isDark ? 'Mode clair' : 'Mode sombre');
}

export function initThemeToggle() {
  syncThemeToggle(getTheme());

  const btn = document.getElementById('btn-theme');
  btn?.addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });
}
