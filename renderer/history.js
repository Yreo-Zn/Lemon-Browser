/**
 * LEMON BROWSER — Browsing History (Renderer)
 * ==============================================
 * Records navigations and provides a searchable history overlay.
 */

import { state, dom } from './state.js';
import { navigateTo } from './tabs.js';
import { setInteractive } from './ghost-mode.js';

let overlay = null;
let searchInput = null;
let resultsContainer = null;

// ── Record a navigation in the persistent history ───────────────

export function recordNavigation(url, title) {
  if (!url || url === 'about:blank') return;
  window.electronAPI.historyAdd({ url, title: title || url });
}

// ── Setup history overlay ───────────────────────────────────────

export function setupHistory() {
  // Create overlay (hidden by default)
  overlay = document.createElement('div');
  overlay.id = 'history-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div class="history-panel glass">
      <div class="history-header">
        <span class="history-title">Historial</span>
        <div class="history-actions">
          <button id="history-clear-btn" class="history-btn" title="Borrar historial">\u2715 Borrar</button>
          <button id="history-close-btn" class="history-btn">\u2715</button>
        </div>
      </div>
      <input type="text" id="history-search-input" placeholder="Buscar en el historial..." autocomplete="off" spellcheck="false" />
      <div id="history-results" class="history-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  searchInput = document.getElementById('history-search-input');
  resultsContainer = document.getElementById('history-results');

  searchInput.addEventListener('input', () => loadResults(searchInput.value));

  document.getElementById('history-close-btn').addEventListener('click', hideHistory);
  document.getElementById('history-clear-btn').addEventListener('click', async () => {
    await window.electronAPI.historyClear();
    loadResults('');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideHistory();
  });
}

// ── Show / Hide  FALTA CONFIGURAR QUE SE MUESTRE CON CONTROL + G─────────────────────────────────────────────────

export function showHistory() {
  if (!overlay) return;
  setInteractive(true);
  overlay.classList.remove('hidden');
  searchInput.value = '';
  searchInput.focus();
  loadResults('');
}

export function hideHistory() {
  if (!overlay) return;
  overlay.classList.add('hidden');
}

export function toggleHistory() {
  if (!overlay) return;
  if (overlay.classList.contains('hidden')) showHistory();
  else hideHistory();
}

// ── Load results ────────────────────────────────────────────────

async function loadResults(query) {
  if (!resultsContainer) return;
  try {
    const entries = await window.electronAPI.historySearch(query, 100);
    if (!entries || entries.length === 0) {
      resultsContainer.innerHTML = '<div class="history-empty">Sin resultados</div>';
      return;
    }
    resultsContainer.innerHTML = '';
    let lastDate = '';
    for (const entry of entries) {
      const date = new Date(entry.timestamp);
      const dateStr = date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        const sep = document.createElement('div');
        sep.className = 'history-date-sep';
        sep.textContent = dateStr;
        resultsContainer.appendChild(sep);
      }

      const item = document.createElement('div');
      item.className = 'history-item';
      item.addEventListener('click', () => {
        hideHistory();
        navigateTo(entry.url);
      });

      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

      const info = document.createElement('div');
      info.className = 'history-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'history-item-title';
      titleEl.textContent = entry.title || entry.url;

      const urlEl = document.createElement('div');
      urlEl.className = 'history-item-url';
      urlEl.textContent = entry.url;

      info.appendChild(titleEl);
      info.appendChild(urlEl);

      item.appendChild(time);
      item.appendChild(info);
      resultsContainer.appendChild(item);
    }
  } catch {
    resultsContainer.innerHTML = '<div class="history-empty">Error cargando historial</div>';
  }
}
