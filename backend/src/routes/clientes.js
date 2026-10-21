const router = require('express').Router();
const db = require('../config/db');
const { HttpError, asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('Vendedor', 'Encargado'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : null;
    const { rows } = await db.query(
      `SELECT * FROM clientes WHERE activo=true AND ($1::text IS NULL OR nombre ILIKE $1 OR documento ILIKE $1)
       ORDER BY nombre`,
      [q]
    );
    res.json(rows);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM clientes WHERE id=$1', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Cliente no encontrado');
    res.json(rows[0]);
  })
);

router.post(
  '/',
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    const { nombre, documento, telefono, email, direccion } = req.body;
    if (!nombre || !documento) throw new HttpError(400, 'nombre y documento son obligatorios');
    const { rows } = await db.query(
      `INSERT INTO clientes(nombre,documento,telefono,email,direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, documento, telefono, email, direccion]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    const { nombre, documento, telefono, email, direccion } = req.body;
    const { rows } = await db.query(
      `UPDATE clientes SET nombre=COALESCE($2,nombre), documento=COALESCE($3,documento),
         telefono=COALESCE($4,telefono), email=COALESCE($5,email), direccion=COALESCE($6,direccion)
       WHERE id=$1 RETURNING *`,
      [req.params.id, nombre, documento, telefono, email, direccion]
    );
    if (!rows[0]) throw new HttpError(404, 'Cliente no encontrado');
    res.json(rows[0]);
  })
);

// Baja lógica para conservar el historial de solicitudes y ventas
router.delete(
  '/:id',
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await db.query('UPDATE clientes SET activo=false WHERE id=$1', [req.params.id]);
    if (!rowCount) throw new HttpError(404, 'Cliente no encontrado');
    res.status(204).end();
  })
);

module.exports = router;
