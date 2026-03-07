#!/usr/bin/env node
/**
 * Lemon Browser MCP Server — Browser Tools (Full Skill Coverage)
 * ===============================================================
 * Swarm Node: Lemon Browser · Capa 5 (Tool Design + MCP)
 * Constitución CoRax v0 · Art. 2.1 (MCP-First)
 *
 * 15 tools covering all 5 CoRax skills via Chrome DevTools Protocol (CDP).
 * Uses Node 22 native WebSocket (no ws dependency needed).
 *
 * Skills → Tools:
 *   browser-testing  — lemon_launch, lemon_stop, lemon_screenshot, lemon_eval, lemon_logs, lemon_errors
 *   tab-mgr          — lemon_navigate, lemon_new_tab, lemon_close_tab, lemon_list_tabs, lemon_switch_tab
 *   settings-mgr     — lemon_set_search_engine, lemon_get_settings, lemon_set_setting
 *   ghost-mode       — lemon_ghost_mode
 *   extension-mgr    — lemon_install_extension
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
];

const server = new Server(
  { name: 'lemon-browser', version: '1.0.0' },
  { capabilities: { tools: {} } },
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
