/**
 * LEMON BROWSER — UI: Controles de Ventana, Arrastre, Settings Panel, IPC (Renderer)
 * =====================================================================================
 */

import { DESKTOP_UA } from './config.js';
import { state, dom } from './state.js';
import { setInteractive, updateControlsMode, resetSearchIdleTimer } from './ghost-mode.js';
import { saveGlobalSettings, applyAccentColor, applyTheme, applyAnimationSettings, getScrollbarCSS } from './settings-manager.js';
import {
  navigateTo, switchNextTab, switchPrevTab, closeCurrentPage, closePageAtIndex,
  savePage, returnToHome, renderSavedPages, saveOpenPagesState, switchToPage,
  reopenLastClosedTab
} from './tabs.js';
import { hidePreview } from './search.js';

let settingsListenerAttached = false;

// ── Controles de ventana ────────────────────────────────────────

export function setupWindowControls() {
  if (dom.minBtn) dom.minBtn.onclick = () => window.electronAPI.windowMinimize();
  if (dom.maxBtn) dom.maxBtn.onclick = () => window.electronAPI.windowMaximize();
  if (dom.closeBtn) dom.closeBtn.onclick = () => window.electronAPI.windowClose();

  // Set initial icon based on maximized state
  window.electronAPI.getMaximizedState().then(isMaximized => {
    updateMaxBtn(isMaximized);
  }).catch(() => {});
}

const svgMaximize = '<svg width="10" height="10" viewBox="0 0 10 10"><rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="white"/></svg>';
const svgRestore = '<svg width="10" height="10" viewBox="0 0 10 10"><rect width="7" height="7" x="0" y="3" fill="none" stroke="white"/><polyline points="3,3 3,0.5 9.5,0.5 9.5,7 7,7" fill="none" stroke="white"/></svg>';

function updateMaxBtn(isMaximized) {
  if (!dom.maxBtn) return;
  dom.maxBtn.innerHTML = isMaximized ? svgRestore : svgMaximize;
  dom.maxBtn.title = isMaximized ? 'Restaurar' : 'Maximizar';
}

// ── Arrastre (Drag Pill) ────────────────────────────────────────

export function setupDragPill() {
  const dragPill = document.getElementById('drag-pill');
  if (!dragPill) return;

  let isDragging = false;

  dragPill.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragPill.setPointerCapture(e.pointerId);
    window.electronAPI.windowDragStart({ mouseX: e.clientX, mouseY: e.clientY });
    setInteractive(true);
  });

  dragPill.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    window.electronAPI.windowDragMove({ screenX: e.screenX, screenY: e.screenY });
  });

  dragPill.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      dragPill.releasePointerCapture(e.pointerId);
      window.electronAPI.windowDragEnd();
    }
  });

  dragPill.addEventListener('lostpointercapture', () => {
    if (isDragging) {
      isDragging = false;
      window.electronAPI.windowDragEnd();
    }
  });
}

// ── Menú contextual de pestaña ──────────────────────────────────

export function setupTabContextMenu() {
  if (dom.ctxClose) {
    dom.ctxClose.onclick = () => {
      closePageAtIndex(state.contextTargetIndex);
      dom.dotContextMenu.classList.add('hidden');
    };
  }

  if (dom.ctxMute) {
    dom.ctxMute.onclick = () => {
      const page = state.openPages[state.contextTargetIndex];
      if (page) {
        const muted = page.webview.isAudioMuted();
        page.webview.setAudioMuted(!muted);
      }
      dom.dotContextMenu.classList.add('hidden');
    };
  }

  // Botón "Guardar en marcadores"
  const ctxSave = document.createElement('div');
  ctxSave.className = 'context-item';
  ctxSave.id = 'ctx-save';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  const svgPath = document.createElementNS(svgNS, 'path');
  svgPath.setAttribute('d', 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z');
  svg.appendChild(svgPath);

  const span = document.createElement('span');
  span.textContent = 'Guardar en marcadores';

  ctxSave.appendChild(svg);
  ctxSave.appendChild(span);

  ctxSave.onclick = () => {
    const page = state.openPages[state.contextTargetIndex];
    if (page) savePage(page);
    dom.dotContextMenu.classList.add('hidden');
  };

  if (dom.dotContextMenu) dom.dotContextMenu.appendChild(ctxSave);

  // Cerrar menú contextual
  function closeTabContextMenu() {
    if (dom.dotContextMenu) dom.dotContextMenu.classList.add('hidden');
  }

  window.addEventListener('mousedown', (e) => {
    if (dom.dotContextMenu && !dom.dotContextMenu.contains(e.target)) closeTabContextMenu();
  }, true);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTabContextMenu();
  });

  window.addEventListener('blur', () => closeTabContextMenu());
}

// ── Cerrar pestaña (botón) ──────────────────────────────────────

export function setupCloseTabButton() {
  if (dom.closeTabsBtn) {
    dom.closeTabsBtn.onclick = (e) => {
      e.stopPropagation();
      closeCurrentPage();
    };
  }
}

// ── Panel de Settings (webview) ─────────────────────────────────

export async function openSettings() {
  const settingsUrl = await window.electronAPI.getSettingsUrl();

  if (dom.mainBrowserContainer) dom.mainBrowserContainer.classList.add('hidden');

  if (dom.settingsContainer && dom.settingsWebview) {
    dom.settingsContainer.classList.remove('hidden');
    dom.settingsWebview.setAttribute('useragent', DESKTOP_UA);
    dom.settingsWebview.src = settingsUrl;

    if (!settingsListenerAttached) {
      settingsListenerAttached = true;

      const channelHandlers = {
        'close-settings': () => {
          dom.settingsContainer.classList.add('hidden');
          if (state.openPages.length > 0) {
            dom.mainBrowserContainer.classList.remove('hidden');
            if (dom.closeSearchContainer) dom.closeSearchContainer.classList.remove('hidden');
            updateControlsMode(false);
            setInteractive(true);
          } else {
            returnToHome();
          }
        },
        'accent-color-changed': (args) => {
          state.globalSettings['accentColor'] = args[0];
          saveGlobalSettings();
          applyAccentColor(args[0]);
        },
        'shortcuts-changed': (args) => {
          state.currentShortcuts = args[0];
          state.globalSettings['browser-shortcuts'] = state.currentShortcuts;
          saveGlobalSettings();
          window.electronAPI.updateShortcuts(state.currentShortcuts);
        },
        'theme-changed': (args) => {
          const { theme, enabled } = args[0];
          state.globalSettings[theme + '-toggle'] = enabled;
          saveGlobalSettings();
          applyTheme(theme, enabled);
        },
        'remember-pages-changed': (args) => {
          state.globalSettings['remember-pages-toggle'] = args[0];
          saveGlobalSettings();
          saveOpenPagesState();
        },
        'adblock-changed': (args) => {
          state.globalSettings['adblock-toggle'] = args[0];
          saveGlobalSettings();
          window.electronAPI.setAdblockEnabled(args[0]);
        },
        'animation-settings-changed': (args) => {
          const { reduceMotion, noAnimations } = args[0];
          state.globalSettings['reduce-motion-toggle'] = reduceMotion;
          state.globalSettings['no-animations-toggle'] = noAnimations;
          saveGlobalSettings();
          applyAnimationSettings();
        },
        'open-url': (args) => {
          dom.settingsContainer.classList.add('hidden');
          navigateTo(args[0]);
        }
      };

      dom.settingsWebview.addEventListener('ipc-message', (event) => {
        const handler = channelHandlers[event.channel];
        if (handler) handler(event.args);
      });
    }

    setInteractive(true);
    updateControlsMode(false, true);
    dom.wrapper.style.display = 'none';
    if (dom.closeSearchContainer) dom.closeSearchContainer.classList.add('hidden');
  }
}

export function setupSettingsButton() {
  dom.settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSettings();
  });
}

// ── IPC Listeners desde Main Process ────────────────────────────

export function setupIPCListeners() {

  // ── Find-in-Page state & helpers (declared early for use by Escape handler) ──

  const findBar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input');
  const findCount = document.getElementById('find-count');
  const findNextBtn = document.getElementById('find-next-btn');
  const findPrevBtn = document.getElementById('find-prev-btn');
  const findCloseBtn = document.getElementById('find-close-btn');

  let findActive = false;

  function getActiveWebview() {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      return state.openPages[state.activePageIndex].webview;
    }
    return null;
  }

  function openFindBar() {
    if (!findBar) return;
    findBar.classList.remove('hidden');
    findInput.focus();
    findInput.select();
    findActive = true;
  }

  function closeFindBar() {
    if (!findBar) return;
    findBar.classList.add('hidden');
    findActive = false;
    findCount.textContent = '';
    const wv = getActiveWebview();
    if (wv) {
      try { wv.stopFindInPage('clearSelection'); } catch (_) {}
    }
  }

  function doFind(forward) {
    const wv = getActiveWebview();
    if (!wv || !findInput.value) return;
    wv.findInPage(findInput.value, { forward, findNext: true });
  }

  // ── IPC Listeners ─────────────────────────────────────────────

  window.electronAPI.onRequestInitialAdblock(() => {
    const enabled = state.globalSettings['adblock-toggle'] !== false;
    window.electronAPI.setAdblockEnabled(enabled);
  });

  window.electronAPI.onWindowMaximizedState((isMaximized) => {
    document.body.classList.toggle('is-maximized', isMaximized);
    updateMaxBtn(isMaximized);
    renderSavedPages();
  });

  window.electronAPI.onWindowRestored(() => {
    setInteractive(true);
    document.body.classList.toggle('pages-open', state.openPages.length > 0);

    window.electronAPI.getMaximizedState().then(isMaximized => {
      document.body.classList.toggle('is-maximized', isMaximized);
      updateMaxBtn(isMaximized);
    }).catch(() => {});

    renderSavedPages();
  });

  window.electronAPI.onWindowFullscreenState((isFullscreen) => {
    document.body.classList.toggle('is-fullscreen', isFullscreen);
  });

  window.electronAPI.onBrowserGoBack(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      if (wv.canGoBack()) wv.goBack();
    }
  });

  window.electronAPI.onBrowserGoForward(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      if (wv.canGoForward()) wv.goForward();
    }
  });

  window.electronAPI.onBrowserFocusSearch(() => {
    dom.wrapper.style.display = 'flex';
    document.body.classList.add('search-bar-active');
    updateControlsMode(false);
    renderSavedPages();
    dom.searchBar.focus();
    dom.searchBar.select();
    setInteractive(true);
    resetSearchIdleTimer();
  });

  window.electronAPI.onBrowserNextTab(() => switchNextTab());
  window.electronAPI.onBrowserPrevTab(() => switchPrevTab());
  window.electronAPI.onBrowserCloseTab(() => closeCurrentPage());

  window.electronAPI.onBrowserNewTab((url) => navigateTo(url));

  window.electronAPI.onOpenSettingsRequested(() => openSettings());

  // ── Standard Browser Actions ──────────────────────────────────

  window.electronAPI.onBrowserToggleDevtools(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      if (wv.isDevToolsOpened()) wv.closeDevTools();
      else wv.openDevTools();
    }
  });

  window.electronAPI.onBrowserReload(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      state.openPages[state.activePageIndex].webview.reload();
    }
  });

  window.electronAPI.onBrowserHardReload(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      state.openPages[state.activePageIndex].webview.reloadIgnoringCache();
    }
  });

  window.electronAPI.onBrowserSwitchTab((index) => {
    if (state.openPages.length === 0) return;
    if (index === 9) {
      switchToPage(state.openPages.length - 1);
    } else if (index <= state.openPages.length) {
      switchToPage(index - 1);
    }
  });

  window.electronAPI.onBrowserSavePage(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      import('./tabs.js').then(m => m.savePage(state.openPages[state.activePageIndex]));
    }
  });

  window.electronAPI.onBrowserToggleHistory(() => {
    import('./history.js').then(m => m.toggleHistory());
  });


  window.electronAPI.onBrowserEscape(() => {
    // Close find bar if open
    if (findActive) {
      closeFindBar();
      return;
    }
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      if (wv.isLoading()) wv.stop();
    }
    hidePreview();
    if (dom.searchBar) dom.searchBar.blur();
  });

  window.electronAPI.onBrowserZoomIn(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      wv.setZoomLevel(wv.getZoomLevel() + 0.5);
    }
  });

  window.electronAPI.onBrowserZoomOut(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      const wv = state.openPages[state.activePageIndex].webview;
      wv.setZoomLevel(wv.getZoomLevel() - 0.5);
    }
  });

  window.electronAPI.onBrowserZoomReset(() => {
    if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
      state.openPages[state.activePageIndex].webview.setZoomLevel(0);
    }
  });

  // ── Find-in-Page wiring ────────────────────────────────────────

  if (findInput) {
    findInput.addEventListener('input', () => {
      const wv = getActiveWebview();
      if (!wv || !findInput.value) {
        findCount.textContent = '';
        if (wv) try { wv.stopFindInPage('clearSelection'); } catch (_) {}
        return;
      }
      wv.findInPage(findInput.value);
    });

    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doFind(!e.shiftKey);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFindBar();
      }
    });
  }

  if (findNextBtn) findNextBtn.addEventListener('click', () => doFind(true));
  if (findPrevBtn) findPrevBtn.addEventListener('click', () => doFind(false));
  if (findCloseBtn) findCloseBtn.addEventListener('click', () => closeFindBar());

  // Listen for found-in-page results on active webview
  function attachFindListener(wv) {
    wv.addEventListener('found-in-page', (e) => {
      if (findActive && e.result) {
        const { activeMatchOrdinal, matches } = e.result;
        findCount.textContent = matches > 0 ? `${activeMatchOrdinal}/${matches}` : 'No results';
      }
    });
  }

  // Attach to existing and future webviews
  const findObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.tagName === 'WEBVIEW') attachFindListener(node);
      }
    }
  });
  if (dom.mainBrowserContainer) {
    findObserver.observe(dom.mainBrowserContainer, { childList: true });
    dom.mainBrowserContainer.querySelectorAll('webview').forEach(attachFindListener);
  }

  window.electronAPI.onBrowserFind(() => openFindBar());
  window.electronAPI.onBrowserFindNext(() => {
    if (findActive) doFind(true);
    else openFindBar();
  });
  window.electronAPI.onBrowserFindPrev(() => {
    if (findActive) doFind(false);
    else openFindBar();
  });

  window.electronAPI.onBrowserFullscreen(() => {
    window.electronAPI.windowMaximize();
  });

  // ── Additional Standard Browser Actions ───────────────────────

  window.electronAPI.onBrowserReopenTab(() => reopenLastClosedTab());

  window.electronAPI.onBrowserPrint(() => {
    const wv = getActiveWebview();
    if (wv) wv.print();
  });

  window.electronAPI.onBrowserViewSource(() => {
    const wv = getActiveWebview();
    if (wv) {
      const url = wv.getURL();
      if (url) navigateTo('view-source:' + url);
    }
  });

  window.electronAPI.onBrowserHome(() => returnToHome());

  window.electronAPI.onBrowserBackIfNotInput(() => {
    // Only go back if no text input is focused in the main renderer
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return; // Let backspace work normally in inputs
    }
    const wv = getActiveWebview();
    if (wv && wv.canGoBack()) wv.goBack();
  });

  window.electronAPI.onTriggerExtensionInstall(async (extensionId) => {
    await openSettings();
    if (dom.settingsWebview.isLoading()) {
      dom.settingsWebview.addEventListener('dom-ready', () => {
        dom.settingsWebview.send('trigger-extension-install', extensionId);
      }, { once: true });
    } else {
      dom.settingsWebview.send('trigger-extension-install', extensionId);
    }
  });

  window.electronAPI.onTriggerEdgeExtensionInstall(async (extensionId) => {
    await openSettings();
    if (dom.settingsWebview.isLoading()) {
      dom.settingsWebview.addEventListener('dom-ready', () => {
        dom.settingsWebview.send('trigger-edge-extension-install', extensionId);
      }, { once: true });
    } else {
      dom.settingsWebview.send('trigger-edge-extension-install', extensionId);
    }
  });

  window.electronAPI.onTriggerOperaExtensionInstall(async (extensionSlug) => {
    await openSettings();
    if (dom.settingsWebview.isLoading()) {
      dom.settingsWebview.addEventListener('dom-ready', () => {
        dom.settingsWebview.send('trigger-opera-extension-install', extensionSlug);
      }, { once: true });
    } else {
      dom.settingsWebview.send('trigger-opera-extension-install', extensionSlug);
    }
  });
}
