/**
 * LEMON BROWSER — Pestañas, Navegación, Marcadores e Hibernación (Renderer)
 * ===========================================================================
 */

import { DESKTOP_UA } from './config.js';
import { state, dom } from './state.js';
import { setInteractive, updateControlsMode, resetSearchIdleTimer } from './ghost-mode.js';
import { saveGlobalSettings, getScrollbarCSS } from './settings-manager.js';
import { hidePreview } from './search.js';
import { showNavBar, hideNavBar, attachNavListeners, updateNavBar } from './nav-bar.js';
import { recordNavigation } from './history.js';

// ── Closed tabs stack (for Ctrl+Shift+T) ────────────────────────

const closedTabsStack = [];
const MAX_CLOSED_TABS = 20;

// ── Recientes ───────────────────────────────────────────────────

export function saveRecentSite(site) {
  const limit = parseInt(state.globalSettings['recent-sites-limit'] || '5');
  if (limit <= 0) {
    if (state.recentSites.length > 0) {
      state.recentSites = [];
      state.globalSettings['recentSites'] = state.recentSites;
      saveGlobalSettings();
    }
    return;
  }

  state.recentSites = state.recentSites.filter(s => s.url !== site.url);
  state.recentSites.unshift(site);
  state.recentSites = state.recentSites.slice(0, limit);
  state.globalSettings['recentSites'] = state.recentSites;
  saveGlobalSettings();
}

// ── Guardar estado de páginas abiertas ──────────────────────────

export function saveOpenPagesState() {
  const rememberEnabled = state.globalSettings['remember-pages-toggle'] === true;
  if (!rememberEnabled) {
    state.globalSettings['lastOpenPages'] = [];
    saveGlobalSettings();
    return;
  }

  const pagesToSave = state.openPages.map(page => ({
    url: page.webview ? page.webview.getURL() : page.url,
    name: page.name || page.url,
    favicon: page.favicon
  }));

  state.globalSettings['lastOpenPages'] = pagesToSave;
  saveGlobalSettings();
}

// ── Marcadores ──────────────────────────────────────────────────

export function savePage(page) {
  if (!page || !page.webview) return;
  const site = {
    name: page.name || page.url,
    url: page.webview.getURL(),
    icon: page.favicon || 'https://www.google.com/favicon.ico'
  };

  state.savedPages = state.savedPages.filter(s => s.url !== site.url);
  state.savedPages.unshift(site);
  state.globalSettings['savedPages'] = state.savedPages;
  saveGlobalSettings();
  renderSavedPages();
}

export function renderSavedPages() {
  if (!dom.savedPagesContainer) return;
  dom.savedPagesContainer.innerHTML = '';

  if (document.body.classList.contains('pages-open')) {
    dom.savedPagesContainer.classList.add('vertical');
    dom.savedPagesContainer.classList.remove('horizontal');
  } else {
    dom.savedPagesContainer.classList.add('horizontal');
    dom.savedPagesContainer.classList.remove('vertical');
  }

  if (state.savedPages.length > 0) {
    dom.savedPagesContainer.classList.remove('hidden');
  } else {
    dom.savedPagesContainer.classList.add('hidden');
    return;
  }

  state.savedPages.forEach((page, index) => {
    const item = document.createElement('div');
    item.className = 'saved-page-item glass';

    const img = document.createElement('img');
    img.src = page.icon;
    img.onerror = () => { img.src = 'https://www.google.com/favicon.ico'; };

    const nameSpan = document.createElement('span');
    nameSpan.textContent = page.name;

    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-bookmark';
    removeBtn.title = 'Eliminar';
    removeBtn.textContent = '×';

    item.appendChild(img);
    item.appendChild(nameSpan);
    item.appendChild(removeBtn);

    removeBtn.onclick = (e) => {
      e.stopPropagation();
      state.savedPages.splice(index, 1);
      state.globalSettings['savedPages'] = state.savedPages;
      saveGlobalSettings();
      renderSavedPages();
    };

    item.onclick = (e) => {
      e.stopPropagation();
      navigateTo(page.url);
      if (document.body.classList.contains('pages-open')) {
        dom.savedPagesContainer.classList.remove('deployed');
        if (dom.menuOverlay) dom.menuOverlay.classList.add('hidden');
      }
    };

    dom.savedPagesContainer.appendChild(item);
  });
}

// ── Trigger de marcadores (arrastrable) ─────────────────────────

export function setupBookmarksTrigger() {
  if (!dom.savedPagesTrigger || !dom.savedPagesTriggerInner) return;

  let isDragging = false;
  let startX = 0;
  let startLeft = 0;
  let hasMoved = false;

  dom.savedPagesTriggerInner.addEventListener('pointerdown', (e) => {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startLeft = dom.savedPagesTrigger.offsetLeft;
    dom.savedPagesTriggerInner.setPointerCapture(e.pointerId);
    dom.savedPagesTrigger.style.transition = 'none';
    setInteractive(true);
  });

  dom.savedPagesTriggerInner.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 5) hasMoved = true;

    let newLeft = startLeft + deltaX;
    newLeft = Math.max(10, Math.min(window.innerWidth - dom.savedPagesTrigger.offsetWidth - 10, newLeft));
    dom.savedPagesTrigger.style.left = `${newLeft}px`;
  });

  dom.savedPagesTriggerInner.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;
    dom.savedPagesTrigger.style.transition = 'top var(--trans-spring)';

    state.globalSettings['bookmarksTabLeft'] = dom.savedPagesTrigger.style.left;
    saveGlobalSettings();

    if (!hasMoved) {
      const isDeploying = !dom.savedPagesContainer.classList.contains('deployed');
      dom.savedPagesContainer.classList.toggle('deployed', isDeploying);
      if (dom.menuOverlay) dom.menuOverlay.classList.toggle('hidden', !isDeploying);
      if (isDeploying) {
        setInteractive(true);
        renderSavedPages();
      }
    }
  });

  // Overlay para cerrar bookmarks
  if (dom.menuOverlay) {
    dom.menuOverlay.onclick = (e) => {
      e.stopPropagation();
      dom.savedPagesContainer.classList.remove('deployed');
      dom.menuOverlay.classList.add('hidden');
      setTimeout(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: e.clientX, clientY: e.clientY }));
      }, 100);
    };
  }
}

// ── Cambio de pestaña ───────────────────────────────────────────

export function switchToPage(index) {
  if (index === state.activePageIndex) return;

  if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
    if (state.openPages[state.activePageIndex].webview) {
      state.openPages[state.activePageIndex].webview.classList.add('hidden');
    }
    state.openPages[state.activePageIndex].dot.classList.remove('active');
    state.openPages[state.activePageIndex].lastUsed = Date.now();
  }

  state.activePageIndex = index;

  if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
    const page = state.openPages[state.activePageIndex];
    if (!page.webview) wakeUpPage(page);
    page.webview.classList.remove('hidden');
    page.dot.classList.add('active');
    page.lastUsed = Date.now();
    setInteractive(true);
    attachNavListeners(page.webview);
    updateNavBar();
  }
}

export function switchNextTab() {
  if (state.openPages.length <= 1) return;
  switchToPage((state.activePageIndex + 1) % state.openPages.length);
}

export function switchPrevTab() {
  if (state.openPages.length <= 1) return;
  switchToPage((state.activePageIndex - 1 + state.openPages.length) % state.openPages.length);
}

export function closeCurrentPage() {
  if (state.activePageIndex < 0 || !state.openPages[state.activePageIndex]) return;
  closePageAtIndex(state.activePageIndex);
}

export function closePageAtIndex(index) {
  if (index < 0 || !state.openPages[index]) return;

  const pageToClose = state.openPages[index];

  // Save closed tab info for Ctrl+Shift+T
  try {
    const url = pageToClose.webview ? pageToClose.webview.getURL() : pageToClose.url;
    if (url && url !== 'about:blank') {
      closedTabsStack.push({ url, name: pageToClose.name || url, favicon: pageToClose.favicon });
      if (closedTabsStack.length > MAX_CLOSED_TABS) closedTabsStack.shift();
    }
  } catch (_) {}

  if (pageToClose.webview) pageToClose.webview.remove();
  pageToClose.dot.remove();
  state.openPages.splice(index, 1);

  if (state.openPages.length > 0) {
    if (index === state.activePageIndex) {
      const nextIndex = Math.max(0, index - 1);
      state.activePageIndex = -1;
      switchToPage(nextIndex);
    } else if (index < state.activePageIndex) {
      state.activePageIndex--;
    }
    saveOpenPagesState();
  } else {
    state.activePageIndex = -1;
    returnToHome();
  }
}

// ── Monitoreo de webview (B06) ──────────────────────────────────

function attachWebviewMonitors(webview, page) {
  webview.addEventListener('crashed', () => {
    showCrashOverlay(webview, page, 'Esta página se ha bloqueado.');
  });

  webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode === -3 || e.errorCode === 0) return; // ERR_ABORTED / no-error
    showCrashOverlay(webview, page, `Error cargando página (${e.errorDescription || e.errorCode})`);
  });

  webview.addEventListener('render-process-gone', (_e) => {
    showCrashOverlay(webview, page, 'El proceso de esta página ha finalizado.');
  });
}

function showCrashOverlay(webview, page, message) {
  let overlay = webview.parentElement?.querySelector('.crash-overlay');
  if (overlay) { overlay.remove(); }

  overlay = document.createElement('div');
  overlay.className = 'crash-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);color:#fff;z-index:999;gap:12px;font-family:system-ui';

  const msg = document.createElement('span');
  msg.textContent = message;
  msg.style.fontSize = '1.1em';

  const btn = document.createElement('button');
  btn.textContent = 'Recargar';
  btn.style.cssText = 'padding:8px 24px;border:none;border-radius:8px;background:var(--accent-color,#6496ff);color:#fff;cursor:pointer;font-size:1em';
  btn.onclick = () => {
    overlay.remove();
    try { webview.reload(); } catch (_) {}
  };

  overlay.appendChild(msg);
  overlay.appendChild(btn);

  // Insert overlay as sibling positioned over the webview
  webview.style.position = 'relative';
  if (webview.parentElement) {
    webview.parentElement.style.position = 'relative';
    webview.parentElement.appendChild(overlay);
  }
}

// ── Hibernación ─────────────────────────────────────────────────

function wakeUpPage(page) {
  const webview = document.createElement('webview');
  webview.useragent = DESKTOP_UA;
  webview.setAttribute('allowpopups', '');
  webview.style.cssText = 'width:100vw;height:100vh;background:white';
  webview.src = page.url;

  dom.mainBrowserContainer.appendChild(webview);
  page.webview = webview;

  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons[0]) {
      page.dot.innerHTML = '';
      const img = document.createElement('img');
      img.src = e.favicons[0];
      page.dot.appendChild(img);
      page.favicon = e.favicons[0];
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    page.name = e.title;
    saveOpenPagesState();
    saveRecentSite({
      name: e.title,
      url: webview.getURL(),
      icon: page.favicon || 'https://www.google.com/favicon.ico'
    });
    recordNavigation(webview.getURL(), e.title);
  });

  webview.addEventListener('did-navigate', () => saveOpenPagesState());

  webview.addEventListener('dom-ready', () => {
    try { webview.insertCSS(getScrollbarCSS()); } catch (_) {}
  }, { once: true });

  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    navigateTo(e.url);
  });

  // B06: Monitoreo de crashes y fallos de carga
  attachWebviewMonitors(webview, page);

  attachNavListeners(webview);
}

function hibernatePage(page) {
  if (!page.webview) return;
  page.url = page.webview.getURL();
  page.webview.remove();
  page.webview = null;
  console.log(`Pestaña hibernada: ${page.name || page.url}`);
}

export function setupHibernation() {
  setInterval(() => {
    const HIBERNATION_TIME = 10 * 60 * 1000;
    const now = Date.now();

    state.openPages.forEach((page, index) => {
      if (index === state.activePageIndex) return;
      if (!page.webview) return;
      if (now - page.lastUsed > HIBERNATION_TIME) hibernatePage(page);
    });
  }, 60000);
}

// ── Volver al home ──────────────────────────────────────────────

export function returnToHome() {
  if (dom.mainBrowserContainer) dom.mainBrowserContainer.classList.add('hidden');
  if (dom.settingsContainer) dom.settingsContainer.classList.add('hidden');
  if (dom.closeSearchContainer) dom.closeSearchContainer.classList.add('hidden');

  if (dom.savedPagesContainer) {
    dom.savedPagesContainer.classList.remove('deployed');
    if (dom.menuOverlay) dom.menuOverlay.classList.add('hidden');
  }

  if (dom.wrapper) {
    dom.wrapper.style.display = 'flex';
    dom.searchBar.focus();
    dom.searchBar.select();
  }

  setInteractive(true);
  updateControlsMode(true, false);
  hideNavBar();

  dom.searchBar.value = '';
  dom.barContainer.classList.remove('active-mode');
  if (dom.resultsArea) dom.resultsArea.classList.add('hidden');
  hidePreview();
}

// ── Navegación principal ────────────────────────────────────────

export function navigateTo(url) {
  setInteractive(true);
  hidePreview();
  clearTimeout(state.previewTimer);
  clearTimeout(state.searchIdleTimer);

  if (dom.resultsArea) dom.resultsArea.classList.add('hidden');
  dom.searchBar.value = '';
  dom.searchBar.blur();
  dom.barContainer.classList.remove('active-mode');

  if (dom.settingsContainer) dom.settingsContainer.classList.add('hidden');

  // Desactivar pestaña actual
  if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
    state.openPages[state.activePageIndex].webview.classList.add('hidden');
    state.openPages[state.activePageIndex].dot.classList.remove('active');
  }

  // Crear nueva pestaña
  const webview = document.createElement('webview');
  webview.useragent = DESKTOP_UA;
  webview.setAttribute('allowpopups', '');
  webview.style.cssText = 'width:100vw;height:100vh;background:white';
  webview.src = url;

  dom.mainBrowserContainer.appendChild(webview);

  const dot = document.createElement('div');
  dot.className = 'search-dot active';
  dom.activeSearchesContainer.appendChild(dot);

  const pageObj = { webview, dot, url, lastUsed: Date.now() };
  state.openPages.push(pageObj);
  state.activePageIndex = state.openPages.length - 1;

  saveRecentSite({ name: url, url, icon: 'https://www.google.com/favicon.ico' });

  // Favicon
  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons[0]) {
      dot.innerHTML = '';
      const img = document.createElement('img');
      img.src = e.favicons[0];
      dot.appendChild(img);
      pageObj.favicon = e.favicons[0];
    }
  });

  // Click en dot → switch
  dot.onclick = (e) => {
    e.stopPropagation();
    switchToPage(state.openPages.indexOf(pageObj));
  };

  // Context menu en dot
  dot.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.contextTargetIndex = state.openPages.indexOf(pageObj);

    const rect = dot.getBoundingClientRect();
    dom.dotContextMenu.style.left = `${rect.left}px`;
    dom.dotContextMenu.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    dom.dotContextMenu.classList.remove('hidden');

    const isMuted = webview.isAudioMuted();
    dom.ctxMute.querySelector('span').textContent = isMuted ? 'Activar sonido' : 'Silenciar';

    setInteractive(true);
  };

  // Mostrar browser
  dom.mainBrowserContainer.classList.remove('hidden');
  if (dom.closeSearchContainer) dom.closeSearchContainer.classList.remove('hidden');
  updateControlsMode(false);
  dom.wrapper.style.display = 'none';

  // Nav bar
  attachNavListeners(webview);
  showNavBar();

  // Scrollbar + clear history
  webview.addEventListener('dom-ready', () => {
    webview.clearHistory();
    try { webview.insertCSS(getScrollbarCSS()); } catch (_) {}
  }, { once: true });

  // New window
  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    navigateTo(e.url);
  });

  // Title update
  webview.addEventListener('page-title-updated', (e) => {
    pageObj.name = e.title;
    saveOpenPagesState();
    saveRecentSite({
      name: e.title,
      url: webview.getURL(),
      icon: pageObj.favicon || 'https://www.google.com/favicon.ico'
    });
    // Record to browsing history
    recordNavigation(webview.getURL(), e.title);
  });

  webview.addEventListener('did-navigate', () => saveOpenPagesState());

  // B06: Monitoreo de crashes y fallos de carga
  attachWebviewMonitors(webview, pageObj);
}

// ── Reopen closed tab (Ctrl+Shift+T) ────────────────────────────

export function reopenLastClosedTab() {
  if (closedTabsStack.length === 0) return;
  const tab = closedTabsStack.pop();
  navigateTo(tab.url);
}

// ── Restaurar páginas al inicio ─────────────────────────────────

export function restorePages() {
  const rememberEnabled = state.globalSettings['remember-pages-toggle'] === true;
  if (!rememberEnabled) return;

  const saved = state.globalSettings['lastOpenPages'] || [];
  saved.forEach(page => navigateTo(page.url));
}
