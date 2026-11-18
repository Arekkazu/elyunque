const fs = require('fs');
const os = require('os');
const path = require('path');
const winston = require('winston');

// En pruebas los logs van a un directorio temporal para no ensuciar el repo.
const LOG_DIR =
  process.env.LOG_DIR ||
  (process.env.NODE_ENV === 'test' ? path.join(os.tmpdir(), 'elyunque-test-logs') : path.join(process.cwd(), 'logs'));
fs.mkdirSync(LOG_DIR, { recursive: true });

const ACCESS_FILE = path.join(LOG_DIR, 'access.log');
const ERROR_FILE = path.join(LOG_DIR, 'error.log');

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/** Errores y eventos de la aplicación → error.log (JSON, con stack trace). */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    new winston.transports.File({ filename: ERROR_FILE, level: 'error' }),
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

/** Peticiones HTTP → access.log (JSON). Lo alimenta Morgan. */
const accessLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  transports: [new winston.transports.File({ filename: ACCESS_FILE })],
});

/** Devuelve las últimas `n` entradas JSON de un archivo de log (más recientes primero). */
function tail(file, n) {
  let text;
  try {
    const { size } = fs.statSync(file);
    const length = Math.min(size, 256 * 1024);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, size - length);
    fs.closeSync(fd);
    text = buf.toString('utf8');
  } catch {
    return [];
  }
  const entries = [];
  const lines = text.split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && entries.length < n; i--) {
    try {
      entries.push(JSON.parse(lines[i]));
    } catch {
      /* línea parcial al inicio del bloque leído */
    }
  }
  return entries;
}

module.exports = { logger, accessLogger, tail, ACCESS_FILE, ERROR_FILE, LOG_DIR };
