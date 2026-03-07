/**
 * LEMON BROWSER — CoRax Bridge (Main Process)
 * ==============================================
 * IPC handlers for CoRax integration.
 * Reads MANIFEST.md, skill files, provides real execution.
 *
 * Constitutional compliance: Art. 10 (Agent Card), Art. 5ter (Skills),
 * Art. 2.1 (MCP-First), Capa 12 (Canal Adaptador).
 */

const { BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createLogger } = require('./logger');
const { getFramework } = require('./constitution');

const log = createLogger('corax');

const CORAX_DIR = path.join(__dirname, '..', 'corax');
const MANIFEST_PATH = path.join(CORAX_DIR, 'MANIFEST.md');
const SKILLS_DIR = path.join(CORAX_DIR, 'skills');

// ── Parse helpers ───────────────────────────────────────────────

function parseManifest() {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const fields = {};
    const tableRows = raw.match(/\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|/g);
    if (tableRows) {
      for (const row of tableRows) {
        const m = row.match(/\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|/);
        if (m) fields[m[1].trim()] = m[2].trim();
      }
    }
    return {
      name: fields['Nombre'] || 'Lemon Browser',
      version: fields['Versión'] || '?',
      type: fields['Tipo'] || 'Nodo soberano',
      runtime: fields['Runtime'] || 'Electron',
      constitution: fields['Constitución'] || 'CoRax v0'
    };
  } catch (err) {
    log.error('Error parsing MANIFEST.md', { message: err.message });
    return null;
  }
}

function parseSkills() {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    return dirs.map(name => {
      const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
      let description = '';
      if (fs.existsSync(skillPath)) {
        const raw = fs.readFileSync(skillPath, 'utf8');

        // Extract description from YAML frontmatter
        const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const descMatch = fmMatch[1].match(/description:\s*"(.+?)"/);
          if (descMatch) {
            description = descMatch[1];
          }
        }

        // Fallback: first non-empty paragraph after frontmatter
        if (!description) {
          const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
          for (const line of body.split('\n')) {
            const t = line.trim();
            if (t && !t.startsWith('#') && !t.startsWith('|') && !t.startsWith('---') && !t.startsWith('>') && !t.startsWith('```')) {
              description = t;
              break;
            }
          }
        }
      }
      return { id: name, description };
    });
  } catch (err) {
    log.error('Error parsing skills', { message: err.message });
    return [];
  }
}

// ── Skill execution ─────────────────────────────────────────────

function checkPort(port) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(500);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, '127.0.0.1');
  });
}

async function executeSkill(event, command) {
  const parts = command.split(/\s+/);
  const skillId = parts[0];
  const args = parts.slice(1).join(' ');
  const win = BrowserWindow.fromWebContents(event.sender);

  switch (skillId) {
    // ── browser-testing: health diagnostic ────────────────────
    case 'browser-testing': {
      const cdpUp = await checkPort(9222);
      const mcpExists = fs.existsSync(path.join(CORAX_DIR, 'mcp-servers', 'browser-tools', 'server.js'));
      const manifest = parseManifest();
      const skills = parseSkills();
      return {
        ok: true,
        message: [
          '◎ Diagnóstico Lemon Browser',
          `  Versión: ${manifest ? manifest.version : '?'}`,
          `  Runtime: Electron ${process.versions.electron} / Chrome ${process.versions.chrome}`,
          `  Node: ${process.versions.node}`,
          `  CDP (9222): ${cdpUp ? '✓ activo' : '✗ inactivo'}`,
          `  MCP Server: ${mcpExists ? '✓ presente' : '✗ ausente'}`,
          `  Skills: ${skills.length}`,
          `  Proceso: PID ${process.pid}`,
          `  Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB heap`
        ].join('\n')
      };
    }

    // ── extension-mgr: list installed extensions ──────────────
    case 'extension-mgr': {
      try {
        const exts = session.defaultSession.getAllExtensions();
        if (exts.length === 0) {
          return { ok: true, message: 'No hay extensiones instaladas.' };
        }
        const lines = exts.map(e => `  • ${e.name} v${e.version}`);
        return { ok: true, message: `Extensiones (${exts.length}):\n${lines.join('\n')}` };
      } catch (err) {
        return { ok: false, message: `Error listando extensiones: ${err.message}` };
      }
    }

    // ── settings-mgr: open settings panel ─────────────────────
    case 'settings-mgr': {
      if (win) win.webContents.send('corax-action', 'open-settings');
      return { ok: true, message: 'Panel de settings abierto.' };
    }

    // ── tab-mgr: tab operations ───────────────────────────────
    case 'tab-mgr': {
      if (args.startsWith('http')) {
        if (win) win.webContents.send('corax-action', 'open-tab', args);
        return { ok: true, message: `Abriendo: ${args}` };
      }
      if (win) win.webContents.send('corax-action', 'get-tabs');
      return { ok: true, message: '' };
    }

    // ── ghost-mode: toggle ────────────────────────────────────
    case 'ghost-mode': {
      if (win) win.webContents.send('corax-action', 'toggle-ghost');
      return { ok: true, message: '' };
    }

    // ── Unknown command ───────────────────────────────────────
    default: {
      // Try matching partial skill names
      const skills = parseSkills();
      const match = skills.find(s => s.id.includes(skillId));
      if (match) {
        return { ok: false, message: `Skill "${match.id}" reconocida pero sin acción directa. Usa su nombre completo.` };
      }
      return { ok: false, message: `Comando desconocido: ${skillId}` };
    }
  }
}

// ── Register IPC handlers ───────────────────────────────────────

function registerCoraxHandlers() {
  ipcMain.handle('corax-get-status', () => {
    const manifest = parseManifest();
    const skills = parseSkills();
    const mcpServerExists = fs.existsSync(
      path.join(CORAX_DIR, 'mcp-servers', 'browser-tools', 'server.js')
    );
    const fw = getFramework();
    const constitutionActive = fw != null && fw.isInitialized;

    // Build petrea status from live framework
    const petreas = [];
    if (constitutionActive) {
      const petreaNames = [
        { key: 'soulState',          name: 'Soul State',           id: 1 },
        { key: 'preload',            name: 'IPC Whitelist',        id: 2 },
        { key: 'auditTrail',         name: 'Audit Trail',          id: 3 },
        { key: 'credentialVault',    name: 'Credential Vault',     id: 4 },
        { key: 'extensionValidator', name: 'Extension Security',   id: 5 },
        { key: 'integrityMonitor',   name: 'Integrity Monitor',    id: 6 },
        { key: 'networkIsolation',   name: 'Network Isolation',    id: 7 },
      ];
      for (const p of petreaNames) {
        petreas.push({
          id: p.id,
          name: p.name,
          status: fw.modules[p.key] ? 'ok' : 'missing',
        });
      }
    }

    return {
      active: true,
      manifest,
      skillCount: skills.length,
      mcpReady: mcpServerExists,
      constitutionActive,
      petreas,
      layers: [
        { id: 5, name: 'Tool Design + MCP', status: mcpServerExists ? 'ok' : 'missing' },
        { id: 9, name: 'Observabilidad', status: 'ok' },
        { id: 12, name: 'Canal Adaptador', status: 'ok' },
        { id: 13, name: 'Skill Registry', status: skills.length > 0 ? 'ok' : 'empty' }
      ]
    };
  });

  // ── Constitution: live health check ──────────────────────────
  ipcMain.handle('constitution-get-health', async () => {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return { active: false };
    try {
      const validation = await fw.validate();
      return { active: true, validation };
    } catch (err) {
      return { active: true, error: err.message };
    }
  });

  // ── Constitution: soul identity ─────────────────────────────
  ipcMain.handle('constitution-get-soul', async () => {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return null;
    try {
      const soulState = fw.getPetrea('soulState');
      return await soulState.validate();
    } catch {
      return null;
    }
  });

  // ── Constitution: heartbeat status ──────────────────────────
  ipcMain.handle('constitution-get-heartbeat', () => {
    const fw = getFramework();
    if (!fw || !fw.isInitialized || !fw.modules.heartbeat) return null;
    const hb = fw.modules.heartbeat;
    return {
      running: hb.running ?? true,
      cycles: hb.cycles ?? ['IMMEDIATE', 'PERIODIC', 'HOURLY', 'DAILY'],
      lastBeat: hb.lastBeat ?? null,
    };
  });

  // ── Constitution: recent audit events ───────────────────────
  ipcMain.handle('constitution-get-audit', async (_event, count = 10) => {
    const fw = getFramework();
    if (!fw || !fw.isInitialized) return [];
    try {
      const audit = fw.getPetrea('auditTrail');
      const all = await audit.query({});
      return all.slice(-count);
    } catch {
      return [];
    }
  });

  ipcMain.handle('corax-get-skills', () => parseSkills());

  ipcMain.handle('corax-execute', async (event, command) => {
    log.info('CoRax command received', { command });

    // ── PETREA 3: Log skill execution to audit trail ──────────
    try {
      const fw = getFramework();
      if (fw && fw.isInitialized) {
        fw.getPetrea('auditTrail').log({ event: 'skill_executed', command });
      }
    } catch { /* non-blocking */ }

    return executeSkill(event, command);
  });

  log.info('CoRax bridge registrado');
}

module.exports = { registerCoraxHandlers };
