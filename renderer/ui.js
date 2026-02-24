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
  savePage, returnToHome, renderSavedPages, saveOpenPagesState
} from './tabs.js';
import { hidePreview } from './search.js';

let settingsListenerAttached = false;

// ── Controles de ventana ────────────────────────────────────────

export function setupWindowControls() {
  if (dom.minBtn) dom.minBtn.onclick = () => window.electronAPI.windowMinimize();
  if (dom.maxBtn) dom.maxBtn.onclick = () => window.electronAPI.windowMaximize();
  if (dom.closeBtn) dom.closeBtn.onclick = () => window.electronAPI.windowClose();
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
    dom.settingsWebview.setUserAgent(DESKTOP_UA);
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
  window.electronAPI.onRequestInitialAdblock(() => {
    const enabled = state.globalSettings['adblock-toggle'] === true;
    window.electronAPI.setAdblockEnabled(enabled);
  });

  window.electronAPI.onWindowMaximizedState((isMaximized) => {
    document.body.classList.toggle('is-maximized', isMaximized);
    renderSavedPages();
  });

  window.electronAPI.onWindowRestored(() => {
    setInteractive(true);
    document.body.classList.toggle('pages-open', state.openPages.length > 0);

    window.electronAPI.getMaximizedState().then(isMaximized => {
      document.body.classList.toggle('is-maximized', isMaximized);
    }).catch(() => {});

    renderSavedPages();
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
}
