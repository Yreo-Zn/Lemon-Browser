#!/usr/bin/env node
/**
 * Lemon Browser MCP Server — Browser Tools (Full Skill Coverage)
 * ===============================================================
 * Swarm Node: Lemon Browser · Capa 5 (Tool Design + MCP)
 * Constitución CoRax v0 · Art. 2.1 (MCP-First)
 *
 * 42 tools covering all 7 CoRax skills via Chrome DevTools Protocol (CDP).
 * Uses Node 22 native WebSocket (no ws dependency needed).
 *
 * Skills → Tools:
 *   browser-testing   — lemon_launch, lemon_stop, lemon_screenshot, lemon_eval, lemon_logs, lemon_errors
 *   tab-mgr           — lemon_navigate, lemon_new_tab, lemon_close_tab, lemon_list_tabs, lemon_switch_tab,
 *                        lemon_back, lemon_forward, lemon_reload, lemon_go_home, lemon_reopen_tab,
 *                        lemon_page_info, lemon_find, lemon_zoom
 *   settings-mgr      — lemon_set_search_engine, lemon_get_settings, lemon_set_setting, lemon_shortcuts, lemon_theme
 *   ghost-mode        — lemon_ghost_mode, lemon_window
 *   extension-mgr     — lemon_install_extension, lemon_list_extensions, lemon_remove_extension,
 *                        lemon_extension_options, lemon_adblock
 *   history-mgr       — lemon_history, lemon_history_search, lemon_history_clear
 *   constitution-mgr  — lemon_audit_trail, lemon_bookmark, lemon_constitution_status,
 *                        lemon_constitution_health, lemon_constitution_soul, lemon_constitution_heartbeat
 *   corax-mgr         — lemon_corax_skills, lemon_corax_execute
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// From corax/mcp-servers/browser-tools/ up to Lemon-Browser/
const BROWSER_DIR = path.resolve(__dirname, '..', '..', '..');

/**
 * Resolve the user's Documents folder cross-platform.
 * On Windows, uses the shell to query the known folder (handles locale).
 * Falls back to ~/Documents elsewhere.
 */
function resolveDocumentsDir() {
  if (process.platform === 'win32') {
    try {
      const result = execSync(
        'powershell -NoProfile -Command "[Environment]::GetFolderPath(\'MyDocuments\')"',
        { encoding: 'utf8', timeout: 5000 }
      ).trim();
      if (result && fs.existsSync(result)) return result;
    } catch { /* fall through */ }
  }
  return path.join(os.homedir(), 'Documents');
}
const DATA_DIR = path.join(resolveDocumentsDir(), 'Your_Lemon_Data');
const LOG_FILE = path.join(DATA_DIR, 'logs', 'lemon.log');
const CDP_PORT = 9222;

// ── State ───────────────────────────────────────────────────────

let electronProc = null;
let ws = null;
let msgId = 1;
const pending = new Map();
let collectedErrors = [];

const log = (msg) => process.stderr.write(`[lemon-mcp] ${msg}\n`);

// ── CDP Helpers ─────────────────────────────────────────────────

/**
 * Safely inject a string value into a CDP expression by JSON-serializing it.
 * Prevents code injection via user-supplied URLs or other strings.
 */
function safeStr(s) {
  return JSON.stringify(String(s));
}

function cdpHttpGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}${endpoint}`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('CDP HTTP timeout')); });
  });
}

async function cdpConnect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const targets = await cdpHttpGet('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page target found');

  ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    const onOpen = () => { cleanup(); resolve(); };
    const onError = (e) => { cleanup(); reject(e); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('WS connect timeout')); }, 5000);
    function cleanup() { clearTimeout(timer); ws.removeEventListener('open', onOpen); ws.removeEventListener('error', onError); }
    ws.addEventListener('open', onOpen);
    ws.addEventListener('error', onError);
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());

    // Resolve pending CDP requests
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }

    // Collect runtime exceptions
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      collectedErrors.push({
        ts: new Date().toISOString(),
        type: 'exception',
        text: d?.text || 'Unknown',
        description: d?.exception?.description || '',
        url: d?.url || '',
        line: d?.lineNumber,
        col: d?.columnNumber,
      });
    }

    // Collect console errors/warnings
    if (msg.method === 'Runtime.consoleAPICalled') {
      const p = msg.params;
      if (p.type === 'error' || p.type === 'warning') {
        const text = p.args?.map((a) => a.value || a.description || '').join(' ') || '';
        collectedErrors.push({
          ts: new Date().toISOString(),
          type: `console.${p.type}`,
          text,
        });
      }
    }
  });

  ws.addEventListener('close', () => { ws = null; });
  ws.addEventListener('error', (e) => log('WS error: ' + (e.message || e)));

  // Enable CDP domains for error collection
  await cdpSend('Runtime.enable');
  await cdpSend('Console.enable');
  await cdpSend('Page.enable');
}

function cdpSend(method, params = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error('CDP not connected. Use lemon_launch first.'));
  }
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// ── Process Management ──────────────────────────────────────────

async function waitForCdp(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await cdpHttpGet('/json/version');
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function launchBrowser() {
  // Check if already running (external launch or previous session)
  try {
    const targets = await cdpHttpGet('/json/list');
    if (targets.length > 0) {
      await cdpConnect();
      collectedErrors = [];
      return { status: 'connected_existing', targets: targets.length, pid: electronProc?.pid || 'external' };
    }
  } catch {
    // Not running, proceed to launch
  }

  if (electronProc) throw new Error('Electron process exists but CDP unavailable');

  const isWin = process.platform === 'win32';
  const electronBin = path.join(
    BROWSER_DIR, 'node_modules', '.bin',
    isWin ? 'electron.cmd' : 'electron'
  );

  if (!fs.existsSync(electronBin)) {
    throw new Error('Electron binary not found at: ' + electronBin);
  }

  // CRITICAL FIX: VS Code / Claude Desktop inject ELECTRON_RUN_AS_NODE=1.
  // We must remove it, otherwise the spawned Electron runs as a headless Node process
  // and require('electron').app will be undefined, causing immediate crashes.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  electronProc = spawn(electronBin, ['.', `--remote-debugging-port=${CDP_PORT}`], {
    cwd: BROWSER_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
    detached: false,
  });

  let stderrBuf = '';
  electronProc.stderr.on('data', (d) => { stderrBuf += d.toString(); });
  electronProc.on('exit', (code) => {
    log(`Electron exited (code ${code})`);
    electronProc = null;
    if (ws) { ws.close(); ws = null; }
  });

  const ready = await waitForCdp();
  if (!ready) {
    const err = stderrBuf.slice(0, 500);
    throw new Error('CDP did not become ready. stderr: ' + err);
  }

  await cdpConnect();
  collectedErrors = [];

  return { status: 'launched', pid: electronProc.pid };
}

function stopBrowser() {
  if (ws) { ws.close(); ws = null; }

  if (!electronProc) return 'Not running (no managed process)';

  const pid = electronProc.pid;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' }); }
    catch { /* ignore */ }
  } else {
    electronProc.kill('SIGTERM');
  }
  electronProc = null;
  return `Stopped (PID ${pid})`;
}

// ── Log Reader ──────────────────────────────────────────────────

function readLogs(lines = 50, levelFilter) {
  if (!fs.existsSync(LOG_FILE)) return 'Log file not found: ' + LOG_FILE;

  const content = fs.readFileSync(LOG_FILE, 'utf8');
  let entries = content.split('\n').filter(Boolean);

  if (levelFilter) {
    const lvl = levelFilter.toUpperCase();
    entries = entries.filter((e) => e.includes(`[${lvl}]`));
  }

  return entries.slice(-lines).join('\n') || '(empty)';
}

// ── MCP Server Setup ────────────────────────────────────────────

const TOOLS = [
  // ── browser-testing skill ──────────────────────────────────────
  {
    name: 'lemon_launch',
    description: 'Launch Lemon Browser with CDP debugging. Auto-connects to existing instance if running.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_stop',
    description: 'Stop Lemon Browser process.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_screenshot',
    description: 'Take a screenshot of the browser window (renderer). Returns base64 image.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_eval',
    description: 'Execute JS in renderer via CDP. Access DOM, window.electronAPI, dynamic import() for modules (e.g. import("./renderer/state.js").then(m=>m.state)). Returns stringified result.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JS expression to evaluate in the renderer page context' },
        awaitPromise: { type: 'boolean', description: 'Await promise result (default: true)' },
      },
      required: ['expression'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_logs',
    description: 'Read main-process log entries from lemon.log.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', description: 'Number of lines (default: 50)' },
        level: { type: 'string', description: 'Filter: ERROR | WARN | INFO' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_errors',
    description: 'Get renderer runtime errors/warnings collected via CDP since last call.',
    inputSchema: {
      type: 'object',
      properties: {
        clear: { type: 'boolean', description: 'Clear after reading (default: true)' },
      },
      additionalProperties: false,
    },
  },

  // ── tab-mgr skill ─────────────────────────────────────────────
  {
    name: 'lemon_navigate',
    description: 'Navigate the active tab to a URL. If no tabs are open, creates a new one.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to (e.g., https://example.com)' },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_new_tab',
    description: 'Open a URL in a new tab (always creates a new tab, even if one is active).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open in the new tab' },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_close_tab',
    description: 'Close a tab by index. If no index given, closes the active tab.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Tab index (0-based). Omit to close active tab.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_list_tabs',
    description: 'List all open tabs with their index, URL, title, and active status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_switch_tab',
    description: 'Switch to a tab by index.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Tab index (0-based) to switch to' },
      },
      required: ['index'],
      additionalProperties: false,
    },
  },

  // ── settings-mgr skill ────────────────────────────────────────
  {
    name: 'lemon_set_search_engine',
    description: 'Change the active search engine. Options: google, duckduckgo, bing, ecosia.',
    inputSchema: {
      type: 'object',
      properties: {
        engine: {
          type: 'string',
          description: 'Engine key: google | duckduckgo | bing | ecosia',
          enum: ['google', 'duckduckgo', 'bing', 'ecosia'],
        },
      },
      required: ['engine'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_get_settings',
    description: 'Get current browser settings (all or a specific key).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Specific setting key to read. Omit for all settings.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_set_setting',
    description: 'Change a browser setting by key.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key (e.g., "accent-color", "remember-pages-toggle", "recent-sites-limit")' },
        value: { description: 'Setting value (string, number, or boolean)' },
      },
      required: ['key', 'value'],
      additionalProperties: false,
    },
  },

  // ── ghost-mode skill ──────────────────────────────────────────
  {
    name: 'lemon_ghost_mode',
    description: 'Set ghost mode (click-through transparency). interactive=true makes browser clickable, false makes it transparent/click-through.',
    inputSchema: {
      type: 'object',
      properties: {
        interactive: { type: 'boolean', description: 'true = interactive (normal), false = ghost (click-through)' },
      },
      required: ['interactive'],
      additionalProperties: false,
    },
  },

  // ── extension-mgr skill ───────────────────────────────────────
  {
    name: 'lemon_install_extension',
    description: 'Install a browser extension from Chrome Web Store or Edge Add-ons by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { type: 'string', description: 'Extension ID from Chrome Web Store or Edge Add-ons' },
        store: {
          type: 'string',
          description: 'Store to install from (default: chrome)',
          enum: ['chrome', 'edge'],
        },
      },
      required: ['extensionId'],
      additionalProperties: false,
    },
  },

  // ── history-mgr skill ─────────────────────────────────────────
  {
    name: 'lemon_history',
    description: 'Search or list browsing history. Returns recent entries by default, or filters by query string.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to filter history by URL or title. Omit to list recent entries.' },
        limit: { type: 'number', description: 'Max entries to return (default: 30)' },
        clear: { type: 'boolean', description: 'If true, clears all browsing history instead of searching.' },
      },
      additionalProperties: false,
    },
  },

  // ── constitution-mgr skill ────────────────────────────────────
  {
    name: 'lemon_audit_trail',
    description: 'Read the constitutional audit trail (PETREA 3). Returns recent audit entries from audit-trail.jsonl.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', description: 'Number of entries to return (default: 50)' },
        severity: { type: 'string', description: 'Filter by severity: info | warning | violation' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_bookmark',
    description: 'List, add, or remove bookmarks (saved pages). Add requires the browser to be running with a tab open.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform (default: list)',
          enum: ['list', 'add', 'remove'],
        },
        url: { type: 'string', description: 'URL to add or remove. Required for add/remove.' },
        name: { type: 'string', description: 'Display name for the bookmark (only for add).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_constitution_status',
    description: 'Get the constitution framework status: active/inactive, 7 Petrea statuses, layer health, manifest info.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ── tab-mgr skill (navigation) ────────────────────────────────
  {
    name: 'lemon_back',
    description: 'Navigate the active tab back in history.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_forward',
    description: 'Navigate the active tab forward in history.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_reload',
    description: 'Reload the active tab. Use hard=true to ignore cache.',
    inputSchema: {
      type: 'object',
      properties: {
        hard: { type: 'boolean', description: 'If true, reload ignoring cache (default: false)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_go_home',
    description: 'Return to the home/search screen, closing all visible tabs UI.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_find',
    description: 'Find text within the active tab page. Use action=open to open find bar, action=next/prev to navigate matches, action=close to dismiss.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for on the page.' },
        action: {
          type: 'string',
          description: 'Action: open (default, searches for query), next, prev, close',
          enum: ['open', 'next', 'prev', 'close'],
        },
      },
      additionalProperties: false,
    },
  },

  // ── tab-mgr skill (tab operations) ────────────────────────────
  {
    name: 'lemon_reopen_tab',
    description: 'Reopen the last closed tab (Ctrl+Shift+T equivalent). Supports up to 20 closed tabs.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_page_info',
    description: 'Get detailed info about the active tab: URL, title, loading state, zoom level, can-go-back/forward.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_zoom',
    description: 'Zoom the active tab in, out, or reset to default.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Zoom action (default: reset)',
          enum: ['in', 'out', 'reset'],
        },
        level: { type: 'number', description: 'Set absolute zoom level (e.g. 0 = 100%, 1 = 120%, -1 = 80%). Overrides action.' },
      },
      additionalProperties: false,
    },
  },

  // ── extension-mgr skill (expanded) ────────────────────────────
  {
    name: 'lemon_list_extensions',
    description: 'List all installed browser extensions with their ID, name, version, and status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_remove_extension',
    description: 'Remove/uninstall a browser extension by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { type: 'string', description: 'Extension ID to remove' },
      },
      required: ['extensionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_extension_options',
    description: 'Open the options/settings page of an installed extension.',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { type: 'string', description: 'Extension ID whose options page to open' },
      },
      required: ['extensionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_adblock',
    description: 'Enable or disable the built-in ad blocker (uBlock Origin).',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'true = enable adblock, false = disable' },
      },
      required: ['enabled'],
      additionalProperties: false,
    },
  },

  // ── ghost-mode skill (window control) ─────────────────────────
  {
    name: 'lemon_window',
    description: 'Control the browser window: minimize, maximize, restore, or get current state.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Window action',
          enum: ['minimize', 'maximize', 'restore', 'state'],
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },

  // ── settings-mgr skill (expanded) ─────────────────────────────
  {
    name: 'lemon_shortcuts',
    description: 'Get or update keyboard shortcuts. Pass shortcuts object to update, omit to read current shortcuts.',
    inputSchema: {
      type: 'object',
      properties: {
        shortcuts: {
          type: 'object',
          description: 'Map of action→key bindings to update (e.g. {"navigateBack":"Alt+Left"}). Omit to read current.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_theme',
    description: 'Change the browser theme: accent color, liquid-glass toggle, animation settings.',
    inputSchema: {
      type: 'object',
      properties: {
        accentColor: { type: 'string', description: 'Hex color (e.g. "#4CAF50")' },
        liquidGlass: { type: 'boolean', description: 'Enable/disable liquid-glass theme' },
        reduceMotion: { type: 'boolean', description: 'Enable/disable reduced motion' },
      },
      additionalProperties: false,
    },
  },
  // ── history-mgr (extended) ──────────────────────────────────────
  {
    name: 'lemon_history_search',
    description: 'Search browsing history by query string. Returns matching entries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to filter history entries' },
        limit: { type: 'number', description: 'Max results to return (default 20)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'lemon_history_clear',
    description: 'Clear all browsing history.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  // ── constitution-mgr (extended) ─────────────────────────────────
  {
    name: 'lemon_constitution_health',
    description: 'Get the full health report of the constitutional framework (all 7 Petreas).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_constitution_soul',
    description: 'Get the Soul Template — identity and personality parameters of the browser.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_constitution_heartbeat',
    description: 'Get the last heartbeat data from the constitutional vitality monitor.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  // ── corax-mgr ───────────────────────────────────────────────────
  {
    name: 'lemon_corax_skills',
    description: 'List all registered CoRax skills with their status and metadata.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lemon_corax_execute',
    description: 'Execute a CoRax command by name with optional arguments.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'CoRax command to execute (e.g. "browser-testing", "extension-mgr", "tab-mgr list")' },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
];

// Load system prompt from env (optional). This is useful when the MCP runner
// supports passing in a prompt path via config (e.g. llm mcp). If not provided,
// the server still works as a pure tool server.
const SYSTEM_PROMPT_PATH = process.env.SYSTEM_PROMPT_PATH;
let SYSTEM_PROMPT;
if (SYSTEM_PROMPT_PATH) {
  try {
    SYSTEM_PROMPT = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
    log(`Loaded system prompt from ${SYSTEM_PROMPT_PATH}`);
  } catch (e) {
    log(`Failed to read system prompt at ${SYSTEM_PROMPT_PATH}: ${e.message}`);
  }
}

const serverOptions = { capabilities: { tools: {} } };
if (SYSTEM_PROMPT) serverOptions.systemPrompt = SYSTEM_PROMPT;

const server = new Server(
  { name: 'lemon-browser', version: '1.0.0' },
  serverOptions,
);

// Use dynamic handler registration compatible with SDK v1.x
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => ({ tools: TOOLS }),
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {

        // ── browser-testing skill ──────────────────────────────────

        case 'lemon_launch': {
          const info = await launchBrowser();
          return { content: [{ type: 'text', text: JSON.stringify(info) }] };
        }

        case 'lemon_stop': {
          const result = stopBrowser();
          return { content: [{ type: 'text', text: result }] };
        }

        case 'lemon_screenshot': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const res = await cdpSend('Page.captureScreenshot', { format: 'png' });
          return {
            content: [
              { type: 'text', text: 'Screenshot captured.' },
              { type: 'image', data: res.data, mimeType: 'image/png' }
            ]
          };
        }

        case 'lemon_eval': {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            try { await cdpConnect(); }
            catch {
              return { content: [{ type: 'text', text: 'CDP not connected. Use lemon_launch first.' }], isError: true };
            }
          }

          const result = await cdpSend('Runtime.evaluate', {
            expression: args.expression,
            returnByValue: true,
            awaitPromise: args.awaitPromise !== false,
            generatePreview: true,
          });

          if (result.exceptionDetails) {
            const ex = result.exceptionDetails;
            return { content: [{ type: 'text', text: `Error: ${ex.text}\n${ex.exception?.description || ''}` }], isError: true };
          }

          const val = result.result;
          let text;
          if (val.type === 'undefined') text = 'undefined';
          else if (val.subtype === 'null') text = 'null';
          else if (val.value !== undefined) {
            text = typeof val.value === 'string' ? val.value : JSON.stringify(val.value, null, 2);
          } else if (val.description) {
            text = val.description;
          } else {
            text = `[${val.type}]`;
          }
          return { content: [{ type: 'text', text }] };
        }

        case 'lemon_logs': {
          const text = readLogs(args.lines || 50, args.level);
          return { content: [{ type: 'text', text }] };
        }

        case 'lemon_errors': {
          const snapshot = [...collectedErrors];
          if (args.clear !== false) collectedErrors = [];
          if (snapshot.length === 0) return { content: [{ type: 'text', text: 'No errors collected.' }] };
          return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
        }

        // ── tab-mgr skill ─────────────────────────────────────────

        case 'lemon_navigate': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const url = safeStr(args.url);
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]?.webview) {
                s.openPages[s.activePageIndex].webview.loadURL(${url});
                return 'Navigated active tab to ' + ${url};
              } else {
                return import('./renderer/tabs.js').then(t => {
                  t.navigateTo(${url});
                  return 'Opened new tab to ' + ${url};
                });
              }
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_new_tab': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const url = safeStr(args.url);
          const expr = `import('./renderer/tabs.js').then(t => { t.navigateTo(${url}); return 'Opened new tab: ' + ${url}; })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_close_tab': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const idx = args.index != null ? Number(args.index) : null;
          const expr = idx != null
            ? `import('./renderer/tabs.js').then(t => { t.closePageAtIndex(${idx}); return 'Closed tab at index ${idx}'; })`
            : `import('./renderer/tabs.js').then(t => { t.closeCurrentPage(); return 'Closed active tab'; })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_list_tabs': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              return JSON.stringify(s.openPages.map((p, i) => ({
                index: i,
                url: p.webview ? p.webview.getURL() : (p.url || 'hibernated'),
                title: p.name || '(untitled)',
                active: i === s.activePageIndex,
                hibernated: !p.webview,
              })));
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          const tabs = JSON.parse(res.result.value);
          if (tabs.length === 0) return { content: [{ type: 'text', text: 'No tabs open.' }] };
          const formatted = tabs.map(t =>
            `${t.active ? '→' : ' '} [${t.index}] ${t.title}${t.hibernated ? ' 💤' : ''}\n    ${t.url}`
          ).join('\n');
          return { content: [{ type: 'text', text: `${tabs.length} tab(s) open:\n${formatted}` }] };
        }

        case 'lemon_switch_tab': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const idx = Number(args.index);
          const expr = `
            import('./renderer/state.js').then(m => {
              if (${idx} < 0 || ${idx} >= m.state.openPages.length)
                throw new Error('Tab index ${idx} out of range (0-' + (m.state.openPages.length - 1) + ')');
              return import('./renderer/tabs.js').then(t => {
                t.switchToPage(${idx});
                return 'Switched to tab ${idx}';
              });
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── settings-mgr skill ────────────────────────────────────

        case 'lemon_set_search_engine': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const engine = safeStr(args.engine);
          const expr = `
            Promise.all([
              import('./renderer/config.js'),
              import('./renderer/state.js'),
              import('./renderer/settings-manager.js'),
              import('./renderer/search.js'),
            ]).then(([cfg, st, sm, sr]) => {
              const key = ${engine};
              if (!cfg.searchEngines[key]) throw new Error('Unknown engine: ' + key);
              st.state.currentEngine = key;
              st.state.globalSettings['preferredEngine'] = key;
              sm.saveGlobalSettings();
              sr.updateEngineUI();
              return 'Search engine set to: ' + cfg.searchEngines[key].name;
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_get_settings': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const key = args.key ? safeStr(args.key) : null;
          const expr = key
            ? `import('./renderer/state.js').then(m => JSON.stringify(m.state.globalSettings[${key}]))`
            : `import('./renderer/state.js').then(m => JSON.stringify(m.state.globalSettings, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value || 'undefined' }] };
        }

        case 'lemon_set_setting': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const key = safeStr(args.key);
          const value = JSON.stringify(args.value);
          const expr = `
            Promise.all([
              import('./renderer/state.js'),
              import('./renderer/settings-manager.js'),
            ]).then(([st, sm]) => {
              st.state.globalSettings[${key}] = ${value};
              sm.saveGlobalSettings();
              return 'Setting ' + ${key} + ' = ' + JSON.stringify(${value});
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── ghost-mode skill ──────────────────────────────────────

        case 'lemon_ghost_mode': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const interactive = Boolean(args.interactive);
          const expr = `import('./renderer/ghost-mode.js').then(m => { m.setInteractive(${interactive}); return 'Ghost mode: ${interactive ? 'interactive (normal)' : 'ghost (click-through)'}'; })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── extension-mgr skill ───────────────────────────────────

        case 'lemon_install_extension': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const extId = safeStr(args.extensionId);
          const store = args.store || 'chrome';
          const ipcCall = store === 'edge'
            ? `window.electronAPI.invoke('download-and-install-edge-crx', ${extId})`
            : `window.electronAPI.invoke('download-and-install-crx', ${extId})`;
          const expr = `${ipcCall}.then(r => JSON.stringify(r))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: `Extension install result: ${res.result.value}` }] };
        }

        // ── history-mgr skill ─────────────────────────────────────

        case 'lemon_history': {
          if (args.clear) {
            if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
            const expr = `window.electronAPI.historyClear().then(() => 'History cleared')`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }

          // Read history.json directly from disk (works even if browser is not running)
          const historyFile = path.join(DATA_DIR, 'history.json');
          if (!fs.existsSync(historyFile)) return { content: [{ type: 'text', text: 'No history found.' }] };

          let entries;
          try { entries = JSON.parse(fs.readFileSync(historyFile, 'utf8')); }
          catch { return { content: [{ type: 'text', text: 'History file corrupt or empty.' }] }; }

          const limit = args.limit || 30;
          if (args.query) {
            const q = args.query.toLowerCase();
            entries = entries.filter(e =>
              (e.url && e.url.toLowerCase().includes(q)) ||
              (e.title && e.title.toLowerCase().includes(q))
            );
          }
          entries = entries.slice(-limit).reverse();

          if (entries.length === 0) return { content: [{ type: 'text', text: 'No matching history entries.' }] };

          const formatted = entries.map(e => {
            const date = e.timestamp ? new Date(e.timestamp).toLocaleString() : '?';
            return `[${date}] ${e.title || '(untitled)'}\n  ${e.url}`;
          }).join('\n');
          return { content: [{ type: 'text', text: `${entries.length} entries:\n${formatted}` }] };
        }

        // ── constitution-mgr skill ────────────────────────────────

        case 'lemon_audit_trail': {
          const auditFile = path.join(DATA_DIR, 'audit-trail.jsonl');
          if (!fs.existsSync(auditFile)) return { content: [{ type: 'text', text: 'No audit trail found.' }] };

          const content = fs.readFileSync(auditFile, 'utf8');
          let lines = content.split('\n').filter(Boolean);

          if (args.severity) {
            const sev = args.severity.toLowerCase();
            lines = lines.filter(line => {
              try {
                const entry = JSON.parse(line);
                return (entry.severity || '').toLowerCase() === sev;
              } catch { return false; }
            });
          }

          const limit = args.lines || 50;
          lines = lines.slice(-limit);

          if (lines.length === 0) return { content: [{ type: 'text', text: 'No matching audit entries.' }] };

          const formatted = lines.map(line => {
            try {
              const e = JSON.parse(line);
              const ts = e.timestamp ? new Date(e.timestamp).toLocaleString() : '?';
              return `[${ts}] [${(e.severity || 'info').toUpperCase()}] ${e.action || e.event || '?'} — ${e.detail || e.message || ''}`;
            } catch { return line; }
          }).join('\n');
          return { content: [{ type: 'text', text: `${lines.length} audit entries:\n${formatted}` }] };
        }

        case 'lemon_bookmark': {
          const action = args.action || 'list';

          if (action === 'list') {
            // Read savedPages from settings.json (works offline)
            const settingsFile = path.join(DATA_DIR, 'settings.json');
            if (!fs.existsSync(settingsFile)) return { content: [{ type: 'text', text: 'No bookmarks found.' }] };
            let settings;
            try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); }
            catch { return { content: [{ type: 'text', text: 'Settings file corrupt.' }] }; }
            const saved = settings.savedPages || [];
            if (saved.length === 0) return { content: [{ type: 'text', text: 'No bookmarks saved.' }] };
            const formatted = saved.map((b, i) => `[${i}] ${b.name || '(untitled)'}\n    ${b.url}`).join('\n');
            return { content: [{ type: 'text', text: `${saved.length} bookmark(s):\n${formatted}` }] };
          }

          if (action === 'add') {
            if (!args.url) return { content: [{ type: 'text', text: 'url is required for add' }], isError: true };
            if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
            const url = safeStr(args.url);
            const name = safeStr(args.name || args.url);
            const expr = `
              Promise.all([
                import('./renderer/state.js'),
                import('./renderer/tabs.js'),
                import('./renderer/settings-manager.js'),
              ]).then(([st, tabs, sm]) => {
                const site = { name: ${name}, url: ${url}, icon: 'https://www.google.com/favicon.ico' };
                st.state.savedPages = st.state.savedPages.filter(s => s.url !== ${url});
                st.state.savedPages.unshift(site);
                st.state.globalSettings['savedPages'] = st.state.savedPages;
                sm.saveGlobalSettings();
                tabs.renderSavedPages();
                return 'Bookmark added: ' + ${name};
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }

          if (action === 'remove') {
            if (!args.url) return { content: [{ type: 'text', text: 'url is required for remove' }], isError: true };
            if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
            const url = safeStr(args.url);
            const expr = `
              Promise.all([
                import('./renderer/state.js'),
                import('./renderer/tabs.js'),
                import('./renderer/settings-manager.js'),
              ]).then(([st, tabs, sm]) => {
                const before = st.state.savedPages.length;
                st.state.savedPages = st.state.savedPages.filter(s => s.url !== ${url});
                st.state.globalSettings['savedPages'] = st.state.savedPages;
                sm.saveGlobalSettings();
                tabs.renderSavedPages();
                const removed = before - st.state.savedPages.length;
                return removed > 0 ? 'Bookmark removed: ' + ${url} : 'Bookmark not found: ' + ${url};
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }

          return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
        }

        case 'lemon_constitution_status': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.coraxGetStatus().then(r => JSON.stringify(r))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);

          const status = JSON.parse(res.result.value);
          const lines = [
            `Constitution: ${status.constitutionActive ? 'ACTIVE' : 'INACTIVE'}`,
            `Manifest: ${status.manifest ? `${status.manifest.name} v${status.manifest.version} (${status.manifest.constitution})` : 'N/A'}`,
            `Skills: ${status.skillCount}`,
            `MCP Ready: ${status.mcpReady ? 'Yes' : 'No'}`,
          ];
          if (status.petreas && status.petreas.length > 0) {
            lines.push('', '7 Petreas:');
            for (const p of status.petreas) {
              lines.push(`  [${p.id}] ${p.name}: ${p.status === 'ok' ? '✓' : '✗ ' + p.status}`);
            }
          }
          if (status.layers && status.layers.length > 0) {
            lines.push('', 'Layers:');
            for (const l of status.layers) {
              lines.push(`  [${l.id}] ${l.name}: ${l.status === 'ok' ? '✓' : l.status}`);
            }
          }
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        // ── tab-mgr skill (navigation) ────────────────────────────

        case 'lemon_back': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                const wv = s.openPages[s.activePageIndex].webview;
                if (wv.canGoBack()) { wv.goBack(); return 'Navigated back'; }
                return 'Cannot go back (no history)';
              }
              return 'No active tab';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_forward': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                const wv = s.openPages[s.activePageIndex].webview;
                if (wv.canGoForward()) { wv.goForward(); return 'Navigated forward'; }
                return 'Cannot go forward (no forward history)';
              }
              return 'No active tab';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_reload': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const hard = Boolean(args.hard);
          const method = hard ? 'reloadIgnoringCache' : 'reload';
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                s.openPages[s.activePageIndex].webview.${method}();
                return '${hard ? 'Hard reloaded' : 'Reloaded'} active tab';
              }
              return 'No active tab';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_go_home': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `import('./renderer/tabs.js').then(t => { t.returnToHome(); return 'Returned to home screen'; })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_find': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const action = args.action || 'open';

          if (action === 'close') {
            const expr = `
              import('./renderer/state.js').then(m => {
                const s = m.state;
                if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                  try { s.openPages[s.activePageIndex].webview.stopFindInPage('clearSelection'); } catch(_) {}
                }
                return 'Find bar closed';
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }

          if (action === 'next' || action === 'prev') {
            if (!args.query) return { content: [{ type: 'text', text: 'query is required for find next/prev' }], isError: true };
            const forward = action === 'next';
            const query = safeStr(args.query);
            const expr = `import('./renderer/state.js').then(m => {
                const s = m.state;
                if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                  s.openPages[s.activePageIndex].webview.findInPage(${query}, { forward: ${forward}, findNext: true });
                  return 'Find ${action}: ' + ${query};
                }
                return 'No active tab';
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }

          // action === 'open' — search for query
          if (!args.query) return { content: [{ type: 'text', text: 'query is required for find' }], isError: true };
          const query = safeStr(args.query);
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                s.openPages[s.activePageIndex].webview.findInPage(${query});
                return 'Searching for: ' + ${query};
              }
              return 'No active tab';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── tab-mgr skill (tab operations) ────────────────────────

        case 'lemon_reopen_tab': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `import('./renderer/tabs.js').then(t => { t.reopenLastClosedTab(); return 'Reopened last closed tab'; })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_page_info': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex < 0 || !s.openPages[s.activePageIndex]) return JSON.stringify({ error: 'No active tab' });
              const p = s.openPages[s.activePageIndex];
              const wv = p.webview;
              return JSON.stringify({
                index: s.activePageIndex,
                url: wv.getURL(),
                title: wv.getTitle(),
                loading: wv.isLoading(),
                canGoBack: wv.canGoBack(),
                canGoForward: wv.canGoForward(),
                zoomLevel: wv.getZoomLevel(),
                favicon: p.favicon || null,
                totalTabs: s.openPages.length,
              });
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          const info = JSON.parse(res.result.value);
          if (info.error) return { content: [{ type: 'text', text: info.error }] };
          const lines = [
            `Tab [${info.index}/${info.totalTabs - 1}]: ${info.title}`,
            `URL: ${info.url}`,
            `Loading: ${info.loading ? 'yes' : 'no'}`,
            `Zoom: ${info.zoomLevel === 0 ? '100%' : (100 + info.zoomLevel * 20) + '%'}`,
            `Navigation: ${info.canGoBack ? '← back' : ''}${info.canGoBack && info.canGoForward ? ' | ' : ''}${info.canGoForward ? 'forward →' : ''}${!info.canGoBack && !info.canGoForward ? 'none' : ''}`,
          ];
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        case 'lemon_zoom': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          if (args.level != null) {
            const lvl = Number(args.level);
            const expr = `
              import('./renderer/state.js').then(m => {
                const s = m.state;
                if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) {
                  s.openPages[s.activePageIndex].webview.setZoomLevel(${lvl});
                  return 'Zoom set to level ${lvl}';
                }
                return 'No active tab';
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }
          const action = args.action || 'reset';
          const exprMap = {
            in: `s.openPages[s.activePageIndex].webview.setZoomLevel(s.openPages[s.activePageIndex].webview.getZoomLevel() + 0.5); return 'Zoomed in';`,
            out: `s.openPages[s.activePageIndex].webview.setZoomLevel(s.openPages[s.activePageIndex].webview.getZoomLevel() - 0.5); return 'Zoomed out';`,
            reset: `s.openPages[s.activePageIndex].webview.setZoomLevel(0); return 'Zoom reset to 100%';`,
          };
          const body = exprMap[action] || exprMap.reset;
          const expr = `
            import('./renderer/state.js').then(m => {
              const s = m.state;
              if (s.activePageIndex >= 0 && s.openPages[s.activePageIndex]) { ${body} }
              return 'No active tab';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── extension-mgr skill (expanded) ────────────────────────

        case 'lemon_list_extensions': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.getExtensionsList().then(r => JSON.stringify(r))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          const exts = JSON.parse(res.result.value);
          if (!exts || exts.length === 0) return { content: [{ type: 'text', text: 'No extensions installed.' }] };
          const formatted = exts.map(e =>
            `${e.name || e.id} v${e.version || '?'}\n  ID: ${e.id}\n  Path: ${e.path || '?'}`
          ).join('\n\n');
          return { content: [{ type: 'text', text: `${exts.length} extension(s):\n\n${formatted}` }] };
        }

        case 'lemon_remove_extension': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const extId = safeStr(args.extensionId);
          const expr = `window.electronAPI.removeExtension(${extId}).then(r => JSON.stringify(r))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: `Extension removal result: ${res.result.value}` }] };
        }

        case 'lemon_extension_options': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const extId = safeStr(args.extensionId);
          const expr = `window.electronAPI.openExtensionOptions(${extId}); 'Opened options for ' + ${extId}`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_adblock': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const enabled = Boolean(args.enabled);
          const expr = `window.electronAPI.setAdblockEnabled(${enabled}); 'Adblock ${enabled ? 'enabled' : 'disabled'}'`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── ghost-mode skill (window control) ─────────────────────

        case 'lemon_window': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const action = args.action;
          if (action === 'state') {
            const expr = `window.electronAPI.getMaximizedState().then(r => JSON.stringify({ maximized: r }))`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: `Window state: ${res.result.value}` }] };
          }
          const fnMap = { minimize: 'windowMinimize', maximize: 'windowMaximize', restore: 'windowMaximize' };
          const fn = fnMap[action];
          if (!fn) return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
          // Execute action then wait for Electron to finish the transition before querying state
          const expr = `(async () => {
            window.electronAPI.${fn}();
            await new Promise(r => setTimeout(r, 250));
            const maximized = await window.electronAPI.getMaximizedState();
            return JSON.stringify({ action: '${action}', maximized });
          })()`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── settings-mgr skill (expanded) ─────────────────────────

        case 'lemon_shortcuts': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          if (args.shortcuts) {
            const shortcuts = JSON.stringify(args.shortcuts);
            const expr = `
              Promise.all([
                import('./renderer/state.js'),
                import('./renderer/settings-manager.js'),
              ]).then(([st, sm]) => {
                const current = st.state.globalSettings['customShortcuts'] || {};
                const updated = Object.assign(current, ${shortcuts});
                st.state.globalSettings['customShortcuts'] = updated;
                st.state.currentShortcuts = Object.assign(st.state.currentShortcuts, ${shortcuts});
                sm.saveGlobalSettings();
                window.electronAPI.updateShortcuts(updated);
                return 'Shortcuts updated: ' + JSON.stringify(updated, null, 2);
              })`;
            const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
            if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
            return { content: [{ type: 'text', text: res.result.value }] };
          }
          // Read current shortcuts
          const expr = `
            Promise.all([
              import('./renderer/state.js'),
              import('./renderer/config.js'),
            ]).then(([st, cfg]) => {
              return JSON.stringify({
                defaults: cfg.defaultShortcuts || {},
                custom: st.state.globalSettings['customShortcuts'] || {},
                active: st.state.currentShortcuts || {},
              }, null, 2);
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_theme': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const operations = [];

          if (args.accentColor) {
            const color = safeStr(args.accentColor);
            operations.push(`st.state.globalSettings['accent-color'] = ${color};
              document.documentElement.style.setProperty('--accent-color', ${color});`);
          }
          if (args.liquidGlass != null) {
            const lg = Boolean(args.liquidGlass);
            operations.push(`st.state.globalSettings['liquid-glass-toggle'] = ${lg};
              document.body.classList.toggle('liquid-glass', ${lg});`);
          }
          if (args.reduceMotion != null) {
            const rm = Boolean(args.reduceMotion);
            operations.push(`st.state.globalSettings['reduce-motion-toggle'] = ${rm};
              document.body.classList.toggle('reduce-motion', ${rm});`);
          }

          if (operations.length === 0) {
            return { content: [{ type: 'text', text: 'No theme changes specified. Use accentColor, liquidGlass, or reduceMotion.' }], isError: true };
          }

          const expr = `
            Promise.all([
              import('./renderer/state.js'),
              import('./renderer/settings-manager.js'),
            ]).then(([st, sm]) => {
              ${operations.join('\n')}
              sm.saveGlobalSettings();
              return 'Theme updated';
            })`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── history-mgr (extended) ────────────────────────────────

        case 'lemon_history_search': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const query = safeStr(args.query);
          const limit = Number(args.limit) || 20;
          const expr = `window.electronAPI.historySearch(${query}, ${limit}).then(r => JSON.stringify(r))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_history_clear': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.historyClear().then(() => 'History cleared')`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── constitution-mgr (extended) ───────────────────────────

        case 'lemon_constitution_health': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.constitutionGetHealth().then(r => JSON.stringify(r, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_constitution_soul': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.constitutionGetSoul().then(r => JSON.stringify(r, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_constitution_heartbeat': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.constitutionGetHeartbeat().then(r => JSON.stringify(r, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        // ── corax-mgr ────────────────────────────────────────────

        case 'lemon_corax_skills': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const expr = `window.electronAPI.coraxGetSkills().then(r => JSON.stringify(r, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        case 'lemon_corax_execute': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const command = safeStr(args.command);
          const expr = `window.electronAPI.coraxExecute(${command}).then(r => JSON.stringify(r, null, 2))`;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  },
);

// ── Cleanup on exit ─────────────────────────────────────────────

process.on('SIGINT', () => { stopBrowser(); process.exit(0); });
process.on('SIGTERM', () => { stopBrowser(); process.exit(0); });

// ── Start ───────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
log('Server started');
