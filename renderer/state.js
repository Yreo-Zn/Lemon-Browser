/**
 * LEMON BROWSER — Estado Compartido y Referencias DOM (Renderer)
 * ================================================================
 */

import { defaultShortcuts } from './config.js';

// ── Estado mutable de la aplicación ─────────────────────────────

export const state = {
  globalSettings: {},
  openPages: [],
  activePageIndex: -1,
  savedPages: [],
  recentSites: [],
  currentEngine: 'google',
  currentShortcuts: { ...defaultShortcuts },
  isInteractive: null,
  selectedIndex: -1,
  previewTimer: null,
  searchIdleTimer: null,
  contextTargetIndex: -1,
};

// ── Referencias DOM (pobladas en initDOM) ───────────────────────

export const dom = {
  searchBar: null,
  barContainer: null,
  suggestionsBox: null,
  resultsArea: null,
  previewContainer: null,
  previewView: null,
  wrapper: null,
  currentEngineBtn: null,
  engineDropdown: null,
  currentEngineIcon: null,
  mainBrowserContainer: null,
  settingsBtn: null,
  settingsContainer: null,
  settingsWebview: null,
  windowControlsContainer: null,
  minBtn: null,
  maxBtn: null,
  closeBtn: null,
  activeSearchesContainer: null,
  closeSearchContainer: null,
  closeTabsBtn: null,
  dotContextMenu: null,
  ctxClose: null,
  ctxMute: null,
  dragPillContainer: null,
  tutorialOverlay: null,
  tutorialContent: null,
  tutorialDots: null,
  tutorialNext: null,
  tutorialSkip: null,
  savedPagesContainer: null,
  savedPagesTrigger: null,
  savedPagesTriggerInner: null,
  menuOverlay: null,
};

export function initDOM() {
  dom.searchBar = document.getElementById('search-bar');
  dom.barContainer = document.getElementById('bar-container');
  dom.suggestionsBox = document.getElementById('suggestions');
  dom.resultsArea = document.getElementById('results-area');
  dom.previewContainer = document.getElementById('preview-container');
  dom.previewView = document.getElementById('preview-view');
  dom.wrapper = document.querySelector('.search-wrapper');
  dom.currentEngineBtn = document.getElementById('current-engine-btn');
  dom.engineDropdown = document.getElementById('engine-dropdown');
  dom.currentEngineIcon = document.getElementById('current-engine-icon');
  dom.mainBrowserContainer = document.getElementById('main-browser-container');
  dom.settingsBtn = document.getElementById('settings-btn');
  dom.settingsContainer = document.getElementById('settings-container');
  dom.settingsWebview = document.getElementById('settings-webview');
  dom.windowControlsContainer = document.getElementById('window-controls-container');
  dom.minBtn = document.getElementById('min-btn');
  dom.maxBtn = document.getElementById('max-btn');
  dom.closeBtn = document.getElementById('close-btn');
  dom.activeSearchesContainer = document.getElementById('active-searches-container');
  dom.closeSearchContainer = document.getElementById('close-search-container');
  dom.closeTabsBtn = document.getElementById('close-tabs-btn');
  dom.dotContextMenu = document.getElementById('dot-context-menu');
  dom.ctxClose = document.getElementById('ctx-close');
  dom.ctxMute = document.getElementById('ctx-mute');
  dom.dragPillContainer = document.getElementById('drag-pill-container');
  dom.tutorialOverlay = document.getElementById('tutorial-overlay');
  dom.tutorialContent = document.getElementById('tutorial-content');
  dom.tutorialDots = document.getElementById('tutorial-dots');
  dom.tutorialNext = document.getElementById('tutorial-next');
  dom.tutorialSkip = document.getElementById('tutorial-skip');
  dom.savedPagesContainer = document.getElementById('saved-pages-container');
  dom.savedPagesTrigger = document.getElementById('saved-pages-trigger');
  dom.savedPagesTriggerInner = document.getElementById('saved-pages-trigger-inner');
  dom.menuOverlay = document.getElementById('menu-overlay');
}
