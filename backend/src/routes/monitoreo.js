const router = require('express').Router();
const db = require('../config/db');
const { asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');
const { snapshot } = require('../middlewares/metrics');
const { tail, ACCESS_FILE, ERROR_FILE } = require('../config/logger');

// Público: lo consultan balanceadores y UptimeRobot.
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const base = { uptime_s: Math.round(process.uptime()), timestamp: new Date().toISOString() };
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'up', ...base });
    } catch (err) {
      res.status(503).json({ status: 'error', db: 'down', detalle: err.message, ...base });
    }
  })
);

// Solo Administrador: métricas y logs recientes para el dashboard de monitoreo.
router.get('/metrics', authenticate, authorize(), (req, res) => res.json(snapshot()));

router.get('/monitoreo/logs', authenticate, authorize(), (req, res) => {
  const access = Math.min(100, Number(req.query.access) || 20);
  const errors = Math.min(100, Number(req.query.errors) || 10);
  const errores = tail(ERROR_FILE, errors);
  res.json({
    access: tail(ACCESS_FILE, access),
    errors: errores,
    ultimo_incidente: errores[0] ? errores[0].timestamp : null,
  });
});

module.exports = router;
