const morgan = require('morgan');
const { accessLogger } = require('../config/logger');

// Morgan genera un objeto JSON por petición: método, ruta, código y tiempo de respuesta.
const format = (tokens, req, res) =>
  JSON.stringify({
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens['response-time'](req, res)),
    ip: req.ip,
    userId: req.user ? req.user.id : undefined,
  });

module.exports = morgan(format, {
  stream: {
    write: (line) => {
      try {
        const { method, path, status, responseTimeMs, ip, userId } = JSON.parse(line);
        accessLogger.info('request', { method, path, status, responseTimeMs, ip, userId });
      } catch {
        /* línea inválida: se ignora */
      }
    },
  },
});
