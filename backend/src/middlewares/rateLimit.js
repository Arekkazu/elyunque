const rateLimit = require('express-rate-limit');

// Frena la fuerza bruta contra el login: por defecto 10 intentos por minuto y por IP.
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_MAX) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión, intente de nuevo en un minuto' },
});

// Límite general de la API (protección básica contra abuso).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_RATE_MAX) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intente más tarde' },
});

module.exports = { loginLimiter, apiLimiter };
