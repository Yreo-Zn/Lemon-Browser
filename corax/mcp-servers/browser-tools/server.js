#!/usr/bin/env node
/**
 * Lemon Browser MCP Server — Browser Tools (Testing & Debugging Bridge)
 * =====================================================================
 * Swarm Node: Lemon Browser · Capa 5 (Tool Design + MCP)
 * Constitución CoRax v0 · Art. 2.1 (MCP-First)
 *
 * 5 tools for efficient browser testing via Chrome DevTools Protocol (CDP).
 * Uses Node 22 native WebSocket (no ws dependency needed).
 *
 * Tools:
 *   lemon_launch  — Start browser with CDP debugging
 *   lemon_stop    — Stop browser
 *   lemon_eval    — Execute JS in renderer context
 *   lemon_logs    — Read main process log file
 *   lemon_errors  — Get collected runtime errors from CDP
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
    name: 'lemon_navigate',
    description: 'Navigate the active tab to a URL, or open a new tab if none active.',
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
        case 'lemon_launch': {
          const info = await launchBrowser();
          return { content: [{ type: 'text', text: JSON.stringify(info) }] };
        }

        case 'lemon_stop': {
          const result = stopBrowser();
          return { content: [{ type: 'text', text: result }] };
        }

        case 'lemon_navigate': {
          if (!ws || ws.readyState !== WebSocket.OPEN) await cdpConnect();
          const { url } = args;
          const expr = `
            import('./renderer/state.js').then(m => {
              const state = m.state;
              if (state.activePageIndex >= 0 && state.openPages[state.activePageIndex]) {
                state.openPages[state.activePageIndex].webview.loadURL('${url}');
                return 'Navigated active tab to ' + '${url}';
              } else {
                return import('./renderer/tabs.js').then(t => {
                  t.navigateTo('${url}');
                  return 'Opened new tab to ' + '${url}';
                });
              }
            })
          `;
          const res = await cdpSend('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
          if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception.description || res.exceptionDetails.text);
          return { content: [{ type: 'text', text: res.result.value }] };
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
          // Auto-reconnect if needed
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            try {
              await cdpConnect();
            } catch {
              return {
                content: [{ type: 'text', text: 'CDP not connected. Use lemon_launch first.' }],
                isError: true,
              };
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
            return {
              content: [{
                type: 'text',
                text: `Error: ${ex.text}\n${ex.exception?.description || ''}`,
              }],
              isError: true,
            };
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

          if (snapshot.length === 0) {
            return { content: [{ type: 'text', text: 'No errors collected.' }] };
          }

          return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
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
