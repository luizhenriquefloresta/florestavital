/**
 * Tema claro/escuro – persistido em localStorage.
 * Respeita prefers-color-scheme na primeira visita.
 */
(function () {
  var STORAGE_KEY = 'florestavital_theme';
  var ATTR = 'data-theme';
  var DARK = 'dark';
  var LIGHT = 'light';

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) { return null; }
  }

  function setStored(theme) {
    try {
      if (theme) localStorage.setItem(STORAGE_KEY, theme);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getEffective() {
    var stored = getStored();
    if (stored === DARK || stored === LIGHT) return stored;
    return prefersDark() ? DARK : LIGHT;
  }

  function apply(theme, save) {
    var html = document.documentElement;
    if (theme === DARK) html.setAttribute(ATTR, DARK);
    else html.removeAttribute(ATTR);
    if (save !== false) setStored(theme);
    updateToggle();
  }

  function updateToggle() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var isDark = document.documentElement.getAttribute(ATTR) === DARK;
    btn.setAttribute('aria-label', isDark ? 'Usar modo claro' : 'Usar modo escuro');
    btn.setAttribute('title', isDark ? 'Modo claro' : 'Modo escuro');
    btn.textContent = isDark ? '\u2600' : '\u263E';
  }

  function toggle() {
    var isDark = document.documentElement.getAttribute(ATTR) === DARK;
    var next = isDark ? LIGHT : DARK;
    apply(next);
  }

  function init() {
    apply(getEffective(), false);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
