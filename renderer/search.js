/**
 * LEMON BROWSER — Búsqueda, Sugerencias y Preview (Renderer)
 * =============================================================
 */

import { searchEngines, popularSites } from './config.js';
import { state, dom } from './state.js';
import { setInteractive, resetSearchIdleTimer } from './ghost-mode.js';
import { saveGlobalSettings, getScrollbarCSS } from './settings-manager.js';
import { navigateTo } from './tabs.js';

// ── Preview ─────────────────────────────────────────────────────

export function hidePreview() {
  if (dom.wrapper) dom.wrapper.classList.remove('with-preview');
  dom.previewContainer.classList.remove('show');
  if (dom.previewView) {
    try { dom.previewView.stop(); } catch (_) {}
  }
}

function updateSelection(items) {
  items.forEach(i => i.classList.remove('active'));
  clearTimeout(state.previewTimer);
  hidePreview();

  if (state.selectedIndex >= 0 && items[state.selectedIndex]) {
    const sel = items[state.selectedIndex];
    sel.classList.add('active');

    state.previewTimer = setTimeout(() => {
      if (dom.wrapper) dom.wrapper.classList.add('with-preview');

      const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
      dom.previewView.setUserAgent(tabletUA);
      dom.previewView.src = sel.dataset.url;
      dom.previewContainer.classList.add('show');

      dom.previewView.addEventListener('dom-ready', () => {
        dom.previewView.setZoomLevel(0);
      }, { once: true });

      setInteractive(true);
    }, 3000);
  }
}

// ── Sugerencias inteligentes ────────────────────────────────────

function renderSuggestions(query) {
  dom.suggestionsBox.innerHTML = '';
  if (dom.resultsArea) dom.resultsArea.classList.remove('hidden');

  const queryLower = query.toLowerCase().trim();
  const suggestions = [];

  // Sitios recientes (prioridad máxima)
  const matchedRecent = state.recentSites
    .filter(site =>
      site.name.toLowerCase().includes(queryLower) ||
      site.url.toLowerCase().includes(queryLower)
    )
    .slice(0, 2);

  matchedRecent.forEach(site => {
    suggestions.push({ type: 'site', name: site.name, url: site.url, icon: site.icon, isRecent: true });
  });

  // Sitios populares
  const matchedSites = popularSites
    .map(site => {
      let score = 0;
      if (site.name.toLowerCase() === queryLower) score = 1000;
      else if (site.name.toLowerCase().startsWith(queryLower)) score = 500;
      else if (site.name.toLowerCase().includes(queryLower)) score = 300;

      site.keywords.forEach(kw => {
        if (kw === queryLower) score = Math.max(score, 800);
        else if (kw.startsWith(queryLower)) score = Math.max(score, 400);
        else if (kw.includes(queryLower)) score = Math.max(score, 200);
      });

      return { ...site, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  matchedSites.forEach(site => {
    suggestions.push({ type: 'site', name: site.name, url: site.url, icon: site.icon });
  });

  // Búsqueda en motor actual
  if (suggestions.length < 4) {
    const engine = searchEngines[state.currentEngine];
    suggestions.push({
      type: 'search',
      name: `Buscar "${query}" en ${engine.name}`,
      url: `${engine.url}${encodeURIComponent(query)}`,
      icon: engine.icon
    });
  }

  // Renderizar (F0.4: sanitizar innerHTML)
  suggestions.forEach(suggestion => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.dataset.url = suggestion.url;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%';

    const icon = document.createElement('img');
    icon.src = suggestion.icon;
    icon.style.cssText = 'width:20px;height:20px;object-fit:contain';
    icon.onerror = () => { icon.style.display = 'none'; };
    row.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.style.flex = '1';
    nameSpan.textContent = suggestion.name;

    if (suggestion.isRecent) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:0.7em;opacity:0.5;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:10px;margin-left:5px';
      badge.textContent = 'Reciente';
      nameSpan.appendChild(badge);
    }
    row.appendChild(nameSpan);

    if (suggestion.type === 'site') {
      const domain = document.createElement('span');
      domain.style.cssText = 'font-size:0.85em;opacity:0.6';
      domain.textContent = suggestion.url.replace('https://', '').replace('www.', '').split('/')[0];
      row.appendChild(domain);
    }

    div.appendChild(row);
    div.onclick = () => navigateTo(div.dataset.url);
    dom.suggestionsBox.appendChild(div);
  });

  state.selectedIndex = -1;
}

// ── Motor de búsqueda selector ──────────────────────────────────

export function updateEngineUI() {
  dom.currentEngineIcon.src = searchEngines[state.currentEngine].icon;

  dom.engineDropdown.innerHTML = '';
  Object.keys(searchEngines).forEach(key => {
    if (key === state.currentEngine) return;
    const engine = searchEngines[key];

    const item = document.createElement('div');
    item.className = 'engine-option';

    const img = document.createElement('img');
    img.src = engine.icon;
    const span = document.createElement('span');
    span.textContent = engine.name;

    item.appendChild(img);
    item.appendChild(span);
    item.onclick = (e) => {
      e.stopPropagation();
      selectEngine(key);
    };
    dom.engineDropdown.appendChild(item);
  });
}

function selectEngine(engineKey) {
  state.currentEngine = engineKey;
  state.globalSettings['preferredEngine'] = state.currentEngine;
  saveGlobalSettings();
  updateEngineUI();
  toggleDropdown(false);

  if (dom.searchBar.value.trim().length > 0) {
    renderSuggestions(dom.searchBar.value);
  }
  dom.searchBar.focus();
}

function toggleDropdown(forceState) {
  const isVisible = dom.engineDropdown.classList.contains('visible');
  const newState = forceState !== undefined ? forceState : !isVisible;

  if (newState) {
    dom.engineDropdown.classList.remove('hidden');
    requestAnimationFrame(() => dom.engineDropdown.classList.add('visible'));
    setInteractive(true);
  } else {
    dom.engineDropdown.classList.remove('visible');
  }
}

// ── Setup ───────────────────────────────────────────────────────

export function setupSearch() {
  // Keyboard events
  const keyActions = {
    ArrowUp: (items) => {
      state.selectedIndex = Math.max(0, state.selectedIndex - 1);
      updateSelection(items);
    },
    ArrowDown: (items) => {
      state.selectedIndex = Math.min(items.length - 1, state.selectedIndex + 1);
      updateSelection(items);
    },
    Enter: (items) => {
      if (state.selectedIndex >= 0 && items[state.selectedIndex]) {
        navigateTo(items[state.selectedIndex].dataset.url);
      } else {
        const val = dom.searchBar.value;
        if (val) {
          const engine = searchEngines[state.currentEngine];
          navigateTo(`${engine.url}${encodeURIComponent(val)}`);
        }
      }
    }
  };

  dom.searchBar.addEventListener('keydown', (e) => {
    const action = keyActions[e.key];
    if (action) {
      e.preventDefault();
      action(document.querySelectorAll('.suggestion-item'));
    }
  });

  // Input event
  dom.searchBar.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
      clearTimeout(state.searchIdleTimer);
      setInteractive(true);
      dom.barContainer.classList.add('active-mode');
      renderSuggestions(e.target.value);
    } else {
      dom.barContainer.classList.remove('active-mode');
      if (dom.resultsArea) dom.resultsArea.classList.add('hidden');
      hidePreview();
      resetSearchIdleTimer();
      if (!dom.wrapper.matches(':hover')) setInteractive(false);
    }
  });

  // Engine selector
  dom.currentEngineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!dom.currentEngineBtn.contains(e.target) && !dom.engineDropdown.contains(e.target)) {
      if (dom.engineDropdown.classList.contains('visible')) toggleDropdown(false);
    }
  });

  // Preview & settings scrollbar injection
  if (dom.previewView) {
    dom.previewView.addEventListener('dom-ready', () => {
      try { dom.previewView.insertCSS(getScrollbarCSS()); } catch (_) {}
    });
  }

  if (dom.settingsWebview) {
    dom.settingsWebview.addEventListener('dom-ready', () => {
      try { dom.settingsWebview.insertCSS(getScrollbarCSS()); } catch (_) {}
    });
  }

  updateEngineUI();
}
