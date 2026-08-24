'use strict';

/**
 * Minimal leveled logger with ISO timestamps.
 * Set LOG_LEVEL=debug|info|warn|error (default: info).
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const activeLevel = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

function emit(level, message, meta) {
  if (LEVELS[level] < activeLevel) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (meta !== undefined) out(line, meta);
  else out(line);
}

module.exports = {
  debug: (m, meta) => emit('debug', m, meta),
  info: (m, meta) => emit('info', m, meta),
  warn: (m, meta) => emit('warn', m, meta),
  error: (m, meta) => emit('error', m, meta),
};
