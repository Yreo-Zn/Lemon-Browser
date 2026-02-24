/**
 * LEMON BROWSER — Tutorial / Onboarding (Renderer)
 * ===================================================
 */

import { state, dom } from './state.js';
import { saveGlobalSettings } from './settings-manager.js';
import { returnToHome } from './tabs.js';

let currentTutorialStep = 0;

const tutorialSteps = [
  {
    title: '¡Bienvenido a Lemon!',
    description: 'Lemon Browser es un navegador ligero y minimalista diseñado para la productividad.',
    icon: '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
  },
  {
    title: 'Atajos de Navegación',
    description: 'Navega rápido usando el teclado. Personaliza estos atajos en los ajustes.',
    isShortcuts: true,
    shortcuts: [
      { name: 'Buscar / Abrir barra', keys: 'Ctrl + ↑' },
      { name: 'Cerrar página actual', keys: 'Ctrl + ↓' },
      { name: 'Atrás / Adelante', keys: 'Ctrl + ← / →' }
    ]
  },
  {
    title: 'Gestión de Pestañas',
    description: 'Las burbujas inferiores gestionan tus sitios abiertos. Click derecho para más opciones.',
    isShortcuts: true,
    shortcuts: [
      { name: 'Siguiente pestaña', keys: 'Alt + →' },
      { name: 'Anterior pestaña', keys: 'Alt + ←' },
      { name: 'Centrar ventana', keys: 'Alt + ↑' }
    ]
  },
  {
    title: 'Configuración y Estilo',
    description: 'Haz clic en el engranaje de la barra de búsqueda para cambiar el color de acento y más.',
    icon: '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0l.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
  }
];

function showStep(index) {
  currentTutorialStep = index;
  const step = tutorialSteps[index];

  if (step.isShortcuts) {
    dom.tutorialContent.innerHTML = `
      <h2>${step.title}</h2>
      <p>${step.description}</p>
      <div class="tutorial-shortcut-list">
        ${step.shortcuts.map(s => `
          <div class="tutorial-shortcut-item">
            <span>${s.name}</span>
            <span class="kbd">${s.keys}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    dom.tutorialContent.innerHTML = `
      <div class="tutorial-step-img">${step.icon || ''}</div>
      <h2>${step.title}</h2>
      <p>${step.description}</p>
    `;
  }

  dom.tutorialDots.innerHTML = tutorialSteps.map((_, i) =>
    `<div class="tutorial-dot ${i === index ? 'active' : ''}"></div>`
  ).join('');

  dom.tutorialNext.textContent = index === tutorialSteps.length - 1 ? '¡Empezar!' : 'Siguiente';
}

function finishTutorial() {
  dom.tutorialOverlay.style.opacity = '0';
  state.globalSettings['tutorial-completed'] = true;
  saveGlobalSettings();

  setTimeout(() => {
    dom.tutorialOverlay.classList.add('hidden');
    if (state.openPages.length === 0) returnToHome();
  }, 500);
}

export function initTutorial() {
  if (state.globalSettings['tutorial-completed'] === true) {
    dom.tutorialOverlay.classList.add('hidden');
  } else {
    dom.tutorialOverlay.classList.remove('hidden');
    showStep(0);
  }

  dom.tutorialNext.onclick = () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      showStep(currentTutorialStep + 1);
    } else {
      finishTutorial();
    }
  };

  dom.tutorialSkip.onclick = () => finishTutorial();
}
