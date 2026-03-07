/**
 * LEMON BROWSER — CoRax Panel (Renderer Module, ESM)
 * ====================================================
 * Manages the CoRax sidebar panel UI.
 * Shows live constitutional status, heartbeat, petreas, skills,
 * audit trail feed, command interface, and handles renderer-side actions.
 */

import { state, dom } from './state.js';
import { setInteractive } from './ghost-mode.js';
import { navigateTo } from './tabs.js';

let panelOpen = false;
let heartbeatInterval = null;
let lastAuditCount = 0;

// ── DOM Setup ───────────────────────────────────────────────────

export function setupCoraxPanel() {
  const toggle = document.getElementById('corax-toggle-btn');
  const panel = document.getElementById('corax-panel');
  const closeBtn = document.getElementById('corax-close-btn');

  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    toggle.classList.toggle('active', panelOpen);
    if (panelOpen) {
      setInteractive(true);
      loadCoraxStatus();
      startHeartbeatPoll();
    } else {
      stopHeartbeatPoll();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panelOpen = false;
      panel.classList.remove('open');
      toggle.classList.remove('active');
      stopHeartbeatPoll();
    });
  }

  // Command input
  const input = document.getElementById('corax-cmd-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        executeCommand(input.value.trim());
        input.value = '';
      }
    });
  }

  // Listen for renderer-side actions from main process
  setupActionListener();
}

// ── Heartbeat poll (while panel is open) ───────────────────────

function startHeartbeatPoll() {
  stopHeartbeatPoll();
  heartbeatInterval = setInterval(pollLiveData, 5000);
  pollLiveData();
}

function stopHeartbeatPoll() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function pollLiveData() {
  await Promise.all([
    updateHeartbeatIndicator(),
    updateAuditFeed()
  ]);
}

async function updateHeartbeatIndicator() {
  const dot = document.getElementById('corax-heartbeat-dot');
  if (!dot) return;
  try {
    const hb = await window.electronAPI.constitutionGetHeartbeat();
    if (hb && hb.running) {
      dot.classList.add('alive');
      dot.classList.remove('dead');
    } else {
      dot.classList.add('dead');
      dot.classList.remove('alive');
    }
  } catch {
    dot.classList.add('dead');
    dot.classList.remove('alive');
  }
}

async function updateAuditFeed() {
  const feed = document.getElementById('corax-audit-feed');
  if (!feed) return;
  try {
    const entries = await window.electronAPI.constitutionGetAudit(6);
    if (!entries || entries.length === lastAuditCount) return;
    lastAuditCount = entries.length;
    feed.innerHTML = entries.reverse().map(e => {
      const t = e.timestamp ? new Date(e.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
      return `<div class="corax-audit-entry"><span class="audit-time">${esc(t)}</span> <span class="audit-event">${esc(e.event || e.type || '')}</span></div>`;
    }).join('');
  } catch { /* audit not available */ }
}

// ── Action listener (main → renderer) ───────────────────────────

function setupActionListener() {
  window.electronAPI.onCoraxAction((action, ...args) => {
    const logEl = document.getElementById('corax-log');

    switch (action) {
      case 'open-settings':
        if (dom.settingsBtn) dom.settingsBtn.click();
        break;

      case 'open-tab': {
        const url = args[0];
        if (url) navigateTo(url);
        break;
      }

      case 'get-tabs': {
        const count = state.openPages.length;
        const info = state.openPages.map((p, i) => {
          const marker = i === state.activePageIndex ? '→ ' : '  ';
          return `${marker}${p.name || p.url}`;
        });
        const msg = count === 0
          ? 'No hay pestañas abiertas.'
          : `Pestañas (${count}):\n${info.join('\n')}`;
        if (logEl) appendLog(logEl, 'ok', msg);
        break;
      }

      case 'toggle-ghost': {
        const current = state.isInteractive;
        setInteractive(!current);
        if (logEl) appendLog(logEl, 'ok', `Ghost mode: ${!current ? 'desactivado' : 'activado'}`);
        break;
      }
    }
  });
}

// ── Load Status ─────────────────────────────────────────────────

async function loadCoraxStatus() {
  const statusEl = document.getElementById('corax-status-content');
  const skillsEl = document.getElementById('corax-skills-list');
  if (!statusEl) return;

  try {
    const status = await window.electronAPI.coraxGetStatus();
    if (!status) {
      statusEl.innerHTML = '<div class="corax-error">CoRax no disponible</div>';
      return;
    }

    const m = status.manifest;

    // Build petreas HTML (2-column grid)
    let petreasHtml = '';
    if (status.constitutionActive && status.petreas.length > 0) {
      petreasHtml = `
        <div class="corax-section-inline">Petreas</div>
        <div class="corax-petreas">
          ${status.petreas.map(p => `
            <div class="corax-petrea ${esc(p.status)}" title="PETREA ${p.id}: ${esc(p.name)}">
              <span class="corax-petrea-dot"></span>
              <span>${esc(p.name)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build soul HTML
    let soulHtml = '';
    try {
      const soul = await window.electronAPI.constitutionGetSoul();
      if (soul) {
        const nodeId = soul.NODE_ID || 'active';
        const shortId = nodeId.length > 16 ? nodeId.slice(0, 16) + '\u2026' : nodeId;
        soulHtml = `<div class="corax-soul" title="${esc(nodeId)}">${esc(shortId)}</div>`;
      }
    } catch { /* no soul data */ }

    statusEl.innerHTML = `
      <div class="corax-identity">
        <span class="corax-symbol" id="corax-heartbeat-dot">\u25CE</span>
        <div>
          <div class="corax-name">${esc(m ? m.name : 'CoRax Node')}</div>
          <div class="corax-version">${esc(m ? `v${m.version} \xb7 ${m.constitution}` : 'Desconocido')}</div>
          ${soulHtml}
        </div>
      </div>
      ${status.constitutionActive
        ? '<div class="corax-constitution-badge">Constituci\u00f3n Activa</div>'
        : '<div class="corax-constitution-badge inactive">Constituci\u00f3n inactiva</div>'
      }
      ${petreasHtml}
      <div class="corax-section-inline">Capas</div>
      <div class="corax-layers">
        ${status.layers.map(l => `
          <div class="corax-layer ${esc(l.status)}">
            <span class="corax-layer-dot"></span>
            <span>${esc(l.name)}</span>
          </div>
        `).join('')}
      </div>
      <div class="corax-section-inline">Actividad</div>
      <div class="corax-audit-feed" id="corax-audit-feed"></div>
      <div class="corax-meta">
        ${status.skillCount} skill${status.skillCount !== 1 ? 's' : ''} \xb7 MCP ${status.mcpReady ? 'activo' : 'inactivo'}
      </div>
    `;

    // Trigger live data update
    pollLiveData();

    // Skills list
    if (skillsEl) {
      const skills = await window.electronAPI.coraxGetSkills();
      skillsEl.innerHTML = skills.map(s => `
        <div class="corax-skill-card" data-skill="${esc(s.id)}">
          <div class="corax-skill-name">${esc(s.id)}</div>
          <div class="corax-skill-desc">${esc(s.description || 'Sin descripci\u00f3n')}</div>
        </div>
      `).join('');

      skillsEl.querySelectorAll('.corax-skill-card').forEach(card => {
        card.addEventListener('click', () => {
          executeCommand(card.dataset.skill);
        });
      });
    }
  } catch (err) {
    statusEl.innerHTML = `<div class="corax-error">Error: ${esc(err.message)}</div>`;
  }
}

// ── Execute Command ─────────────────────────────────────────────

async function executeCommand(cmd) {
  const logEl = document.getElementById('corax-log');
  if (!logEl) return;

  appendLog(logEl, 'cmd', `> ${cmd}`);

  try {
    const result = await window.electronAPI.coraxExecute(cmd);
    if (result.message) appendLog(logEl, result.ok ? 'ok' : 'err', result.message);
  } catch (err) {
    appendLog(logEl, 'err', err.message);
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function appendLog(container, type, text) {
  const entry = document.createElement('div');
  entry.className = `corax-log-entry ${type}`;
  entry.textContent = text;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;

  while (container.children.length > 50) {
    container.removeChild(container.firstChild);
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
