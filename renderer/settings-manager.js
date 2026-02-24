/**
 * LEMON BROWSER — Gestión de Settings, Temas y Estilos (Renderer)
 * =================================================================
 */

import { searchEngines } from './config.js';
import { state, dom } from './state.js';

// ── Utilidades de color ─────────────────────────────────────────

export function hexToRgb(hex) {
  if (!hex) return { r: 100, g: 150, b: 255 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 100, g: 150, b: 255 };
}

export function getScrollbarCSS() {
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-color').trim();
  const rgb = hexToRgb(accentColor);
  const accentMedium = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;

  return `
    ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
    ::-webkit-scrollbar-track { background: rgba(15, 15, 15, 0.1) !important; }
    ::-webkit-scrollbar-thumb {
      background: rgba(100, 100, 100, 0.3) !important;
      border-radius: 20px !important;
      border: 2px solid transparent !important;
      background-clip: content-box !important;
      transition: background 0.3s !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${accentMedium} !important;
      border: 0px solid transparent !important;
    }
  `;
}

// ── Color de acento ─────────────────────────────────────────────

export function applyAccentColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--accent-color', color);

  const rgb = hexToRgb(color);
  document.documentElement.style.setProperty('--accent-color-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
  document.documentElement.style.setProperty('--accent-color-medium', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  document.documentElement.style.setProperty('--accent-color-dark', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);

  updateWebviewScrollbars();
}

export function updateWebviewScrollbars() {
  const css = getScrollbarCSS();
  state.openPages.forEach(page => {
    if (page.webview && typeof page.webview.insertCSS === 'function') {
      try { page.webview.insertCSS(css); } catch (_) { /* ignore */ }
    }
  });

  if (dom.previewView && typeof dom.previewView.insertCSS === 'function') {
    try { dom.previewView.insertCSS(css); } catch (_) { /* ignore */ }
  }

  if (dom.settingsWebview && typeof dom.settingsWebview.insertCSS === 'function') {
    try { dom.settingsWebview.insertCSS(css); } catch (_) { /* ignore */ }
  }
}

// ── Temas ───────────────────────────────────────────────────────

export function applyTheme(theme, enabled) {
  if (theme === 'liquid-glass') {
    document.body.classList.toggle('liquid-glass', enabled);
  }
}

export function applyAnimationSettings() {
  const reduceMotion = state.globalSettings['reduce-motion-toggle'] === true;
  const noAnimations = state.globalSettings['no-animations-toggle'] === true;
  document.body.classList.toggle('reduce-motion', reduceMotion);
  document.body.classList.toggle('no-animations', noAnimations);
}

// ── Sincronización shortcuts → main ─────────────────────────────

function syncShortcutsWithMain() {
  window.electronAPI.updateShortcuts(state.currentShortcuts);
}

// ── Carga de configuración al inicio ────────────────────────────

export async function initSettings() {
  state.globalSettings = await window.electronAPI.getSettings();

  // Motor de búsqueda
  state.currentEngine = state.globalSettings['preferredEngine'] || 'google';
  if (!searchEngines[state.currentEngine]) state.currentEngine = 'google';

  // Atajos
  if (state.globalSettings['browser-shortcuts']) {
    state.currentShortcuts = state.globalSettings['browser-shortcuts'];
    syncShortcutsWithMain();
  }

  // Color de acento
  applyAccentColor(state.globalSettings['accentColor'] || '#6496ff');

  // Temas
  applyTheme('liquid-glass', state.globalSettings['liquid-glass-toggle'] === true);

  // Animaciones
  applyAnimationSettings();

  // Marcadores
  state.savedPages = state.globalSettings['savedPages'] || [];

  // Recientes
  state.recentSites = state.globalSettings['recentSites'] || [];

  // Posición del trigger de marcadores
  if (state.globalSettings['bookmarksTabLeft'] !== undefined) {
    const trigger = dom.savedPagesTrigger;
    if (trigger) trigger.style.left = state.globalSettings['bookmarksTabLeft'];
  }
}

// ── Persistencia (debounced — B07) ──────────────────────────────

let saveTimer = null;

export function saveGlobalSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.electronAPI.saveSettings(state.globalSettings);
  }, 400);
}
