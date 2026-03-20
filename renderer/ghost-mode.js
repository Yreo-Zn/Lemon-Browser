/**
 * LEMON BROWSER — Modo Fantasma / Ghost Mode (Renderer)
 * =======================================================
 * Controla la transparencia al clic (click-through) cuando
 * la ventana no está siendo utilizada activamente.
 */

import { state, dom } from './state.js';

// ── Núcleo ──────────────────────────────────────────────────────

export function setInteractive(value) {
  if (state.isInteractive === value) return;
  state.isInteractive = value;
  window.electronAPI.setIgnoreMouseEvents(!value, { forward: true });
}

export function updateControlsMode(isHome, hideControls = false) {
  if (!dom.windowControlsContainer) return;

  if (hideControls) {
    dom.windowControlsContainer.classList.add('hidden');
  } else {
    dom.windowControlsContainer.classList.remove('hidden');
  }

  if (isHome) {
    if (dom.wrapper) {
      dom.wrapper.appendChild(dom.windowControlsContainer);
      dom.windowControlsContainer.classList.add('on-bar');
    }
    if (dom.dragPillContainer) dom.dragPillContainer.classList.add('hidden');
    document.body.classList.remove('pages-open');
    if (dom.savedPagesContainer) dom.savedPagesContainer.classList.remove('deployed');
    if (dom.libraryEdgeTrigger) dom.libraryEdgeTrigger.classList.add('hidden');
  } else {
    document.body.appendChild(dom.windowControlsContainer);
    dom.windowControlsContainer.classList.remove('on-bar');
    if (dom.dragPillContainer) dom.dragPillContainer.classList.remove('hidden');
    document.body.classList.add('pages-open');
    if (dom.libraryEdgeTrigger) dom.libraryEdgeTrigger.classList.remove('hidden');
  }
}

export function resetSearchIdleTimer() {
  clearTimeout(state.searchIdleTimer);
  if (state.openPages.length > 0) {
    state.searchIdleTimer = setTimeout(() => {
      if (dom.wrapper.style.display === 'flex' && dom.searchBar.value.trim() === '') {
        dom.wrapper.style.display = 'none';
        document.body.classList.remove('search-bar-active');
        updateControlsMode(false);
        if (state.activePageIndex >= 0) setInteractive(true);
      }
    }, 7000);
  }
}

// ── Setup de listeners de modo fantasma ─────────────────────────

export function setupGhostMode() {
  // Wrapper (search bar area)
  if (dom.wrapper) {
    dom.wrapper.addEventListener('mouseenter', () => setInteractive(true));
    dom.wrapper.addEventListener('mouseleave', () => {
      // Si la barra está abierta (flex), no quitamos interactividad para permitir ir a la píldora superior
      if (dom.wrapper.style.display === 'flex') return;

      const hasText = dom.searchBar.value.trim().length > 0;
      const isDropdownOpen = dom.engineDropdown && dom.engineDropdown.classList.contains('visible');
      const hasPreview = dom.previewContainer.classList.contains('show');
      const isBrowserActive = dom.mainBrowserContainer && !dom.mainBrowserContainer.classList.contains('hidden');
      const isSettingsVisible = dom.settingsContainer && !dom.settingsContainer.classList.contains('hidden');
      const isMouseOverControls = dom.windowControlsContainer && dom.windowControlsContainer.matches(':hover');

      if (!hasPreview && !hasText && !isDropdownOpen && !isBrowserActive && !isSettingsVisible && !isMouseOverControls) {
        setInteractive(false);
      }
    });
  }

  // Window controls
  if (dom.windowControlsContainer) {
    dom.windowControlsContainer.addEventListener('mouseenter', () => setInteractive(true));
    dom.windowControlsContainer.addEventListener('mouseleave', () => {
      const hasText = dom.searchBar.value.trim().length > 0;
      const isBrowserActive = dom.mainBrowserContainer && !dom.mainBrowserContainer.classList.contains('hidden');
      const isSettingsVisible = dom.settingsContainer && !dom.settingsContainer.classList.contains('hidden');
      if (!hasText && !isBrowserActive && !isSettingsVisible && !dom.wrapper.matches(':hover')) {
        setInteractive(false);
      }
    });
  }

  // Edge detection for transparent window resizing (throttled — PERF-01)
  let rafPending = false;
  document.addEventListener('mousemove', (e) => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      handleMouseMove(e);
    });
  });

  // Keep interactive on preview, dropdown, settings, tutorial
  [dom.previewContainer, dom.engineDropdown, dom.tutorialOverlay].forEach(el => {
    if (el) el.addEventListener('mouseenter', () => setInteractive(true));
  });

  if (dom.settingsContainer) {
    dom.settingsContainer.addEventListener('mouseenter', () => setInteractive(true));
    dom.settingsContainer.addEventListener('mouseleave', () => {
      if (dom.settingsContainer.classList.contains('hidden')) setInteractive(false);
    });
  }

  if (dom.savedPagesContainer) {
    dom.savedPagesContainer.addEventListener('mouseenter', () => setInteractive(true));
  }
  if (dom.savedPagesTrigger) {
    dom.savedPagesTrigger.addEventListener('mouseenter', () => setInteractive(true));
  }

  // CoRax panel
  if (dom.coraxPanel) {
    dom.coraxPanel.addEventListener('mouseenter', () => setInteractive(true));
  }

  // Synapse bar (post-ASI navigation)
  const synapseBarEl = document.getElementById('synapse-bar');
  if (synapseBarEl) {
    synapseBarEl.addEventListener('mouseenter', () => setInteractive(true));
  }

  // Initial state
  setInteractive(true);
  document.body.classList.add('search-bar-active');
  updateControlsMode(true);

  // ── Library Reveal Mechanism ─────────────────────────────────
  if (dom.libraryEdgeTrigger) {
    dom.libraryEdgeTrigger.addEventListener('mouseenter', () => {
      if (!document.body.classList.contains('pages-open')) return;
      dom.savedPagesContainer?.classList.add('deployed');
      setInteractive(true);
    });
  }

  if (dom.galleryEdgeTrigger) {
    dom.galleryEdgeTrigger.addEventListener('mouseenter', () => {
      if (!document.body.classList.contains('pages-open')) return;
      import('./tabs.js').then(m => m.renderTabsGallery());
      dom.tabsGalleryContainer?.classList.add('deployed');
      setInteractive(true);
    });
  }

  // Auto-hide when leaving the sidebars
  if (dom.savedPagesContainer) {
    dom.savedPagesContainer.addEventListener('mouseleave', () => {
      dom.savedPagesContainer.classList.remove('deployed');
    });
  }
  if (dom.tabsGalleryContainer) {
    dom.tabsGalleryContainer.addEventListener('mouseleave', () => {
      dom.tabsGalleryContainer.classList.remove('deployed');
    });
  }

  // IPC Toggle for Sidebars (Global Shortcuts)
  if (window.electronAPI) {
    if (window.electronAPI.onToggleLibrary) {
      window.electronAPI.onToggleLibrary(() => {
        const container = dom.savedPagesContainer;
        if (!container) return;
        
        const isOpening = !container.classList.contains('deployed');
        if (isOpening) {
          container.classList.add('deployed');
          container.classList.remove('hidden');
          import('./tabs.js').then(m => m.renderSavedPages());
          setInteractive(true);
        } else {
          container.classList.remove('deployed');
        }
      });
    }

    if (window.electronAPI.onToggleGallery) {
      window.electronAPI.onToggleGallery(() => {
        // En la galería solo mostramos si hay páginas abiertas
        import('./state.js').then(stateMod => {
          const state = stateMod.state;
          if (state.openPages.length === 0) return;
          
          const container = dom.tabsGalleryContainer;
          if (!container) return;
          
          const isOpening = !container.classList.contains('deployed');
          if (isOpening) {
            container.classList.add('deployed');
            container.classList.remove('hidden');
            import('./tabs.js').then(m => m.renderTabsGallery());
            setInteractive(true);
          } else {
            container.classList.remove('deployed');
          }
        });
      });
    }
  }
}

function handleMouseMove(e) {
    const isBrowserActive = dom.mainBrowserContainer && !dom.mainBrowserContainer.classList.contains('hidden');
    const isSettingsVisible = dom.settingsContainer && !dom.settingsContainer.classList.contains('hidden');
    const isTutorialVisible = dom.tutorialOverlay && !dom.tutorialOverlay.classList.contains('hidden');
    const isCoraxOpen = dom.coraxPanel && dom.coraxPanel.classList.contains('open');
    const hasText = dom.searchBar.value.trim().length > 0;

    if (isBrowserActive || isSettingsVisible || isTutorialVisible || isCoraxOpen || hasText) return;

    const edgeThreshold = 10;
    const topInteractiveHeight = 120;

    const isNearEdge =
      e.clientX < edgeThreshold ||
      e.clientX > window.innerWidth - edgeThreshold ||
      e.clientY < edgeThreshold ||
      e.clientY > window.innerHeight - edgeThreshold ||
      e.clientY < topInteractiveHeight;

    if (isNearEdge) {
      setInteractive(true);
    } else {
      const isOverAny =
        dom.wrapper.matches(':hover') ||
        dom.windowControlsContainer.matches(':hover') ||
        dom.closeSearchContainer.matches(':hover') ||
        (dom.dragPillContainer && dom.dragPillContainer.matches(':hover')) ||
        (dom.previewContainer && dom.previewContainer.matches(':hover')) ||
        (dom.tutorialOverlay && dom.tutorialOverlay.matches(':hover')) ||
        (dom.libraryEdgeTrigger && dom.libraryEdgeTrigger.matches(':hover')) ||
        (dom.savedPagesContainer && (dom.savedPagesContainer.matches(':hover') || dom.savedPagesContainer.classList.contains('deployed'))) ||
        (dom.menuOverlay && !dom.menuOverlay.classList.contains('hidden')) ||
        (dom.activeSearchesContainer && dom.activeSearchesContainer.matches(':hover')) ||
        (dom.coraxPanel && dom.coraxPanel.classList.contains('open')) ||
        (document.getElementById('synapse-bar')?.matches(':hover')) ||
        (e.clientY < topInteractiveHeight);

      setInteractive(isOverAny);
    }
}
