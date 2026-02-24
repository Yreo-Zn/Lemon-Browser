/**
 * LEMON BROWSER — Logger Estructurado (Main Process)
 * =====================================================
 * Logging con niveles, timestamps, tags de proceso y archivo rotativo.
 * Capa 9 de observabilidad (Art. 13 Constitución CoRax).
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_DIR = path.join(DATA_DIR, 'logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB

let logStream = null;
let currentLogPath = null;
let minLevel = LEVELS.info;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateIfNeeded() {
  if (!currentLogPath) return;
  try {
    const stats = fs.statSync(currentLogPath);
    if (stats.size >= MAX_LOG_SIZE) {
      if (logStream) logStream.end();
      const rotated = currentLogPath.replace('.log', `.${Date.now()}.log`);
      fs.renameSync(currentLogPath, rotated);
      logStream = fs.createWriteStream(currentLogPath, { flags: 'a' });
    }
  } catch (_) { /* file may not exist yet */ }
}

function init(level = 'info') {
  minLevel = LEVELS[level] ?? LEVELS.info;
  ensureLogDir();
  currentLogPath = path.join(LOG_DIR, 'lemon.log');
  rotateIfNeeded();
  logStream = fs.createWriteStream(currentLogPath, { flags: 'a' });
}

function formatEntry(level, tag, message, data) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] [${tag}] ${message}`;
  return data !== undefined ? `${base} ${JSON.stringify(data)}` : base;
}

function write(level, tag, message, data) {
  if (LEVELS[level] < minLevel) return;
  const entry = formatEntry(level, tag, message, data);
  if (logStream) {
    logStream.write(entry + '\n');
  }
  // Also mirror to console
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(entry);
}

function createLogger(tag) {
  return {
    debug: (msg, data) => write('debug', tag, msg, data),
    info:  (msg, data) => write('info',  tag, msg, data),
    warn:  (msg, data) => write('warn',  tag, msg, data),
    error: (msg, data) => write('error', tag, msg, data)
  };
}

function close() {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

module.exports = { init, createLogger, close };
