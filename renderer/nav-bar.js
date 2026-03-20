/**
 * LEMON BROWSER — Synapse Interface (Renderer)
 * =========================================================
 * Post-ASI navigation paradigm. Not a toolbar — a consciousness.
 * Floating Synapse Pill + Command Surface + Ambient Edge.
 * §17.4 (Browser Action Scoping) · §18.3 (Audit Trail Browser-Aware)
 */

import { state, dom } from './state.js';
import { setInteractive } from './ghost-mode.js';
import { toggleHistory } from './history.js';
import { categorizeTab, esc } from './utils.js';

// ── Internal DOM refs ───────────────────────────────────────────

let synapseBar, synapseDomain, synapseBack, synapseForward, synapseCorax, synapseGlow;
let synapseParticles, synapseStatus, synapseShield;
let ambientEdge;
let commandSurface, commandBackdrop, commandInput, commandPageCtx, commandTabsPreview, commandBookmarksPreview, commandBookmarksPanel;

// ── Setup ───────────────────────────────────────────────────────

export function setupNavBar() {
  synapseBar     = document.getElementById('synapse-bar');
  synapseDomain  = document.getElementById('synapse-domain');
  synapseBack    = document.getElementById('synapse-back');
  synapseForward = document.getElementById('synapse-forward');
  synapseCorax   = document.getElementById('synapse-corax');
  synapseGlow    = document.getElementById('synapse-glow');
  synapseParticles = document.getElementById('synapse-particles');
  synapseStatus    = document.getElementById('synapse-status');
  synapseShield    = document.getElementById('synapse-shield');
  ambientEdge    = document.getElementById('ambient-edge');

  commandSurface     = document.getElementById('command-surface');
  commandBackdrop    = document.getElementById('command-backdrop');
  commandInput       = document.getElementById('command-input');
  commandPageCtx     = document.getElementById('command-page-ctx');
  commandTabsPreview      = document.getElementById('command-tabs-preview');
  commandBookmarksPreview = document.getElementById('command-bookmarks-preview');
  commandBookmarksPanel   = document.getElementById('command-bookmarks-panel');

  if (!synapseBar) return;

  // Back / Forward
  synapseBack?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wv = getActiveWebview();
    if (wv?.canGoBack()) wv.goBack();
  });

  synapseForward?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wv = getActiveWebview();
    if (wv?.canGoForward()) wv.goForward();
  });

  // Center click → open Command Surface
  document.getElementById('synapse-center')?.addEventListener('click', () => {
    openCommandSurface();
  });

  // CoRax dot → toggle CoRax panel
  synapseCorax?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('corax-toggle-btn')?.click();
  });

  // Double-click maximize/restore is handled natively by -webkit-app-region: drag on #synapse-bar.
  // No JS dblclick handler needed — it would double-toggle and cancel itself.

  // Ambient particle system
  initParticles();

  // Command Surface
  initCommandSurface();

  // Global shortcuts handled via Main Process IPC (unificado)
}

// ── Particle System — ambient neural drift ──────────────────────

function initParticles() {
  if (!synapseParticles) return;
  const COUNT = 8;
  for (let i = 0; i < COUNT; i++) {
    createParticle(i * (100 / COUNT));
  }
}

function createParticle(delayPct) {
  const p = document.createElement('div');
  p.className = 'synapse-particle';
  const dur = 5 + Math.random() * 7;
  const y = 15 + Math.random() * 70;
  const dx = 50 + Math.random() * 80;
  const dy = -8 + Math.random() * 16;
  p.style.cssText = `
    left: -2px;
    top: ${y}%;
    --pdx: ${dx}px;
    --pdy: ${dy}px;
    animation-duration: ${dur}s;
    animation-delay: ${(delayPct / 100) * dur}s;
  `;
  synapseParticles.appendChild(p);
}

// ── Command Surface ─────────────────────────────────────────────

function initCommandSurface() {
  if (!commandSurface || !commandInput) return;

  commandBackdrop?.addEventListener('click', () => closeCommandSurface());

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandSurface();
    } else if (e.key === 'Enter' && commandInput.value.trim()) {
      e.preventDefault();
      processInput(commandInput.value.trim());
    }
  });

  // Quick actions
  document.getElementById('command-actions')?.querySelectorAll('.cmd-action').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });
}

function openCommandSurface() {
  if (!commandSurface) return;
  commandSurface.classList.remove('hidden');
  commandInput.value = '';
  if (commandBookmarksPanel) commandBookmarksPanel.classList.add('hidden');

  const wv = getActiveWebview();
  if (wv) {
    try { commandInput.placeholder = wv.getURL(); } catch (_) {
      commandInput.placeholder = 'Navega, busca o pide a CoRax...';
    }
  }

  refreshPageContext();
  refreshTabsPreview();
  refreshBookmarksPreview();
  requestAnimationFrame(() => commandInput.focus());
}

function closeCommandSurface() {
  commandSurface?.classList.add('hidden');
}

function refreshPageContext() {
  if (!commandPageCtx) return;
  const wv = getActiveWebview();
  if (!wv) { commandPageCtx.classList.remove('has-page'); return; }
  try {
    const page = state.openPages[state.activePageIndex];
    const title = page?.name || 'Sin título';
    const url = wv.getURL();
    commandPageCtx.innerHTML =
      `<span class="ctx-title">${esc(title)}</span>` +
      `<span class="ctx-url">${esc(url)}</span>`;
    commandPageCtx.classList.add('has-page');
  } catch (_) {
    commandPageCtx.classList.remove('has-page');
  }
}

function refreshTabsPreview() {
  if (!commandTabsPreview) return;
  if (state.openPages.length <= 1) {
    commandTabsPreview.classList.remove('has-tabs');
    return;
  }

  commandTabsPreview.innerHTML = state.openPages.map((p, i) => {
    const name = p.name || p.url || 'Sin título';
    const active = i === state.activePageIndex;
    const icon = p.favicon
      ? `<img src="${esc(p.favicon)}" alt="">`
      : '<span style="width:14px;height:14px;border-radius:3px;background:var(--accent-color-light);display:inline-block"></span>';
    let domain = '';
    try { domain = new URL(p.url || '').hostname; } catch (_) {}
    return `<div class="cmd-tab-item${active ? ' active' : ''}" data-tab-idx="${i}">
      ${icon}<span class="cmd-tab-name">${esc(name)}</span>
      ${domain ? `<span class="cmd-tab-domain">${esc(domain)}</span>` : ''}
    </div>`;
  }).join('');

  commandTabsPreview.classList.add('has-tabs');

  commandTabsPreview.querySelectorAll('.cmd-tab-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.tabIdx, 10);
      closeCommandSurface();
      import('./tabs.js').then(m => m.switchToPage(idx));
    });
  });
}

function refreshBookmarksPreview() {
  if (!commandBookmarksPreview) return;
  
  if (state.savedPages.length === 0) {
    commandBookmarksPreview.innerHTML = '<div class="cmd-section-label">Sin marcadores</div>';
    return;
  }

  // Grupar por categorías
  const groups = {};
  state.savedPages.forEach(b => {
    const cat = categorizeTab(b.url);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  });

  const sortedCats = Object.keys(groups).sort();
  
  commandBookmarksPreview.innerHTML = sortedCats.map(cat => {
    const bookmarksHTML = groups[cat].map(b => {
      const icon = b.icon 
        ? `<img src="${esc(b.icon)}" alt="">`
        : '<span style="width:14px;height:14px;border-radius:3px;background:var(--accent-color-light);display:inline-block"></span>';
      
      let displayUrl = '';
      try { displayUrl = new URL(b.url).hostname; } catch(_) { displayUrl = b.url; }

      return `<div class="cmd-bookmark-item" data-bookmark-url="${esc(b.url)}">
        ${icon}
        <span class="cmd-bookmark-name">${esc(b.name)}</span>
        <span class="cmd-bookmark-url">${esc(displayUrl)}</span>
      </div>`;
    }).join('');

    return `
      <div class="cmd-bookmark-group">
        <div class="cmd-section-label">${esc(cat)}</div>
        ${bookmarksHTML}
      </div>
    `;
  }).join('');

  commandBookmarksPreview.querySelectorAll('.cmd-bookmark-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.bookmarkUrl;
      closeCommandSurface();
      import('./tabs.js').then(m => m.navigateTo(url));
    });
  });
}

function processInput(input) {
  closeCommandSurface();

  // URL detection
  if (/^https?:\/\//i.test(input) || /^[\w][\w.-]+\.[a-z]{2,}(\/|$)/i.test(input)) {
    const url = input.startsWith('http') ? input : `https://${input}`;
    import('./tabs.js').then(m => m.navigateTo(url));
    return;
  }

  // CoRax command (starts with /)
  if (input.startsWith('/')) {
    const toggle = document.getElementById('corax-toggle-btn');
    const cmdEl  = document.getElementById('corax-cmd-input');
    if (toggle && cmdEl) {
      if (!document.getElementById('corax-panel')?.classList.contains('open')) toggle.click();
      setTimeout(() => {
        cmdEl.value = input;
        cmdEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }, 100);
    }
    return;
  }

  // Search with current engine
  const engines = {
    google:     'https://www.google.com/search?q=',
    bing:       'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave:      'https://search.brave.com/search?q=',
    ecosia:     'https://www.ecosia.org/search?q=',
    perplexity: 'https://www.perplexity.ai/search?q=',
  };
  const base = engines[state.currentEngine] || engines.google;
  import('./tabs.js').then(m => m.navigateTo(base + encodeURIComponent(input)));
}

function handleAction(action) {
  const wv = getActiveWebview();
  switch (action) {
    case 'reload':
      if (wv) wv.reload();
      closeCommandSurface();
      break;
    case 'find':
      closeCommandSurface();
      document.getElementById('find-bar')?.classList.remove('hidden');
      document.getElementById('find-input')?.focus();
      break;
    case 'copy':
      if (wv) {
        try { navigator.clipboard.writeText(wv.getURL()); } catch (_) {}
      }
      closeCommandSurface();
      break;
    case 'corax':
      closeCommandSurface();
      document.getElementById('corax-toggle-btn')?.click();
      break;
    case 'bookmarks':
      if (commandBookmarksPanel) {
        const isHidden = commandBookmarksPanel.classList.toggle('hidden');
        if (!isHidden) refreshBookmarksPreview();
      }
      break;
  }
}

// ── Public API (called from tabs.js) ────────────────────────────

export function showNavBar() {
  synapseBar?.classList.remove('hidden');
  ambientEdge?.classList.remove('hidden');
}

export function hideNavBar() {
  synapseBar?.classList.add('hidden');
  ambientEdge?.classList.add('hidden');
  ambientEdge?.classList.remove('secure', 'insecure', 'loading');
  synapseBar?.classList.remove('secure', 'insecure', 'loading', 'corax-active');
  closeCommandSurface();
}

export function updateNavBar() {
  if (!synapseBar || synapseBar.classList.contains('hidden')) return;
  const wv = getActiveWebview();
  if (!wv) return;

  // Domain
  try {
    const url = wv.getURL();
    synapseDomain.textContent = formatDomain(url);

    const isSecure = url.startsWith('https://');
    synapseBar.classList.toggle('secure', isSecure);
    synapseBar.classList.toggle('insecure', !isSecure && url.startsWith('http://'));
    if (ambientEdge) {
      ambientEdge.classList.remove('loading');
      ambientEdge.classList.toggle('secure', isSecure);
      ambientEdge.classList.toggle('insecure', !isSecure && url.startsWith('http://'));
    }

    // Constitutional status — §17sexies compliance indicator
    if (synapseStatus) {
      synapseStatus.title = isSecure
        ? 'Constitucional · §17sexies activo'
        : url.startsWith('http://') ? 'Precaución · conexión no cifrada' : 'Estado desconocido';
    }
  } catch (_) {
    synapseDomain.textContent = '...';
  }

  // Back / Forward
  try {
    if (synapseBack) synapseBack.disabled = !wv.canGoBack();
    if (synapseForward) synapseForward.disabled = !wv.canGoForward();
  } catch (_) {
    if (synapseBack) synapseBack.disabled = true;
    if (synapseForward) synapseForward.disabled = true;
  }
}

export function attachNavListeners(webview) {
  if (!webview) return;

  webview.addEventListener('did-navigate', () => updateNavBar());
  webview.addEventListener('did-navigate-in-page', () => updateNavBar());

  webview.addEventListener('did-start-loading', () => {
    synapseBar?.classList.add('loading');
    ambientEdge?.classList.add('loading');
    ambientEdge?.classList.remove('secure', 'insecure');
  });

  webview.addEventListener('did-stop-loading', () => {
    synapseBar?.classList.remove('loading');
    ambientEdge?.classList.remove('loading');
    
    // CoRax Semantic Scan (C-4 Pipeline)
    synapseBar?.classList.add('analyzing');
    if (synapseStatus) {
      synapseStatus.title = 'CoRax: Análisis Semántico C-4 en curso...';
    }
    
    setTimeout(() => {
      synapseBar?.classList.remove('analyzing');
      updateNavBar();
    }, 1500);
  });
}

// ── Helpers ──────────────────────────────────────────────────────

function getActiveWebview() {
  if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
    return state.openPages[state.activePageIndex].webview;
  }
  return null;
}

function formatDomain(url) {
  if (!url || url === 'about:blank') return 'Nueva pestaña';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return url.slice(0, 40);
  }
}


