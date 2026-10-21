const router = require('express').Router();
const db = require('../config/db');
const { HttpError, asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');
const { registrarVenta } = require('../services/cotizacionService');

router.use(authenticate, authorize('Vendedor'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.body.cotizacion_id) throw new HttpError(400, 'cotizacion_id es obligatorio');
    res.status(201).json(await registrarVenta(req.body.cotizacion_id, req.user.id));
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const params = [req.query.desde || null, req.query.hasta || null, req.query.cliente_id || null];
    const where = `($1::date IS NULL OR v.created_at >= $1) AND ($2::date IS NULL OR v.created_at < ($2::date + 1))
                   AND ($3::int IS NULL OR s.cliente_id=$3)`;
    const from = `FROM ventas v JOIN solicitudes s ON s.id=v.solicitud_id JOIN clientes c ON c.id=s.cliente_id
                  JOIN cotizaciones q ON q.id=v.cotizacion_id`;
    const total = await db.query(`SELECT count(*)::int AS n ${from} WHERE ${where}`, params);
    const { rows } = await db.query(
      `SELECT v.*, c.nombre AS cliente_nombre, q.consecutivo ${from} WHERE ${where}
       ORDER BY v.id DESC LIMIT $4 OFFSET $5`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ data: rows, page, limit, total: total.rows[0].n });
  })
);

module.exports = router;
