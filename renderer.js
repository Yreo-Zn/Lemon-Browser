/**
 * LEMON BROWSER — Punto de entrada del Renderer (ES Module)
 * ===========================================================
 * Importa y orquesta todos los módulos del renderer.
 */

import { initDOM } from './renderer/state.js';
import { initSettings } from './renderer/settings-manager.js';
import { setupGhostMode } from './renderer/ghost-mode.js';
import { setupSearch, updateEngineUI } from './renderer/search.js';
import {
  setupBookmarksTrigger, setupHibernation, renderSavedPages, restorePages
} from './renderer/tabs.js';
import { initTutorial } from './renderer/tutorial.js';
import {
  setupWindowControls, setupDragPill, setupTabContextMenu,
  setupCloseTabButton, setupSettingsButton, setupIPCListeners
} from './renderer/ui.js';

// ── Inicialización ──────────────────────────────────────────────

initDOM();
setupWindowControls();
setupDragPill();
setupTabContextMenu();
setupCloseTabButton();
setupSettingsButton();
setupGhostMode();
setupSearch();
setupBookmarksTrigger();
setupHibernation();
setupIPCListeners();

// Cargar settings (async) → aplica tema, color, atajos
await initSettings();

// Post-init: necesitan settings cargados
renderSavedPages();
updateEngineUI();
restorePages();
initTutorial();
