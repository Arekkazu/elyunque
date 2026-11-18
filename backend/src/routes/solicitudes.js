const router = require('express').Router();
const db = require('../config/db');
const { HttpError, asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');
const { rules } = require('../middlewares/validate');
const { calcularSolicitud } = require('../services/calculoService');
const { notificarCambioEstado } = require('../services/notificacionService');

const ESTADOS = ['inicial', 'cotizada', 'aceptada', 'rechazada', 'cancelada', 'vendida'];

router.use(authenticate);

async function getSolicitud(id) {
  const { rows } = await db.query(
    `SELECT s.*, c.nombre AS cliente_nombre FROM solicitudes s JOIN clientes c ON c.id=s.cliente_id WHERE s.id=$1`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Solicitud no encontrada');
  return rows[0];
}

function exigirInicial(sol, accion) {
  if (sol.estado !== 'inicial') throw new HttpError(409, `Solo se puede ${accion} una solicitud en estado inicial`);
}

router.get(
  '/',
  authorize('Vendedor', 'Encargado', 'Cliente'),
  asyncHandler(async (req, res) => {
    const { estado, cliente_id, desde, hasta } = req.query;
    if (estado && !ESTADOS.includes(estado)) throw new HttpError(400, 'Estado inválido');
    const { rows } = await db.query(
      `SELECT s.*, c.nombre AS cliente_nombre FROM solicitudes s JOIN clientes c ON c.id=s.cliente_id
       WHERE ($1::text IS NULL OR s.estado=$1)
         AND ($2::int IS NULL OR s.cliente_id=$2)
         AND ($3::date IS NULL OR s.created_at >= $3)
         AND ($4::date IS NULL OR s.created_at < ($4::date + 1))
         AND ($5::int IS NULL OR c.usuario_id=$5)
       ORDER BY s.id DESC`,
      [estado || null, cliente_id || null, desde || null, hasta || null, req.user.rol === 'Cliente' ? req.user.id : null]
    );
    res.json(rows);
  })
);

router.post(
  '/',
  authorize('Vendedor'),
  rules.solicitudCrear,
  asyncHandler(async (req, res) => {
    const { cliente_id, descripcion, horas_estimadas = 0 } = req.body;
    if (!cliente_id || !descripcion) throw new HttpError(400, 'cliente_id y descripcion son obligatorios');
    if (Number(horas_estimadas) < 0) throw new HttpError(400, 'horas_estimadas no puede ser negativa');
    const { rows } = await db.query(
      `INSERT INTO solicitudes(cliente_id, descripcion, horas_estimadas, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [cliente_id, descripcion, horas_estimadas, req.user.id]
    );
    res.status(201).json(rows[0]);
  })
);

router.get(
  '/:id/estado',
  rules.soloId,
  authorize('Vendedor', 'Encargado', 'Cliente'),
  asyncHandler(async (req, res) => {
    const sol = await getSolicitud(req.params.id);
    if (req.user.rol === 'Cliente') {
      const own = await db.query('SELECT 1 FROM clientes WHERE id=$1 AND usuario_id=$2', [sol.cliente_id, req.user.id]);
      if (!own.rowCount) throw new HttpError(403, 'No tiene permisos para ver esta solicitud');
    }
    const cot = await db.query(
      'SELECT consecutivo, total, estado FROM cotizaciones WHERE solicitud_id=$1 ORDER BY id DESC LIMIT 1',
      [sol.id]
    );
    const venta = await db.query('SELECT id, total, created_at FROM ventas WHERE solicitud_id=$1', [sol.id]);
    res.json({
      solicitud_id: sol.id,
      estado: sol.estado,
      actualizado: sol.updated_at,
      cotizacion: cot.rows[0] || null,
      venta: venta.rows[0] || null,
    });
  })
);

router.get(
  '/:id',
  rules.soloId,
  authorize('Vendedor', 'Encargado'),
  asyncHandler(async (req, res) => {
    const sol = await getSolicitud(req.params.id);
    const mats = await db.query('SELECT * FROM materiales_solicitud WHERE solicitud_id=$1 ORDER BY id', [sol.id]);
    const cots = await db.query('SELECT * FROM cotizaciones WHERE solicitud_id=$1 ORDER BY id', [sol.id]);
    res.json({ ...sol, materiales: mats.rows, cotizaciones: cots.rows });
  })
);

router.put(
  '/:id',
  rules.solicitudEditar,
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    exigirInicial(await getSolicitud(req.params.id), 'editar');
    const { descripcion, horas_estimadas } = req.body;
    if (horas_estimadas !== undefined && Number(horas_estimadas) < 0) {
      throw new HttpError(400, 'horas_estimadas no puede ser negativa');
    }
    const { rows } = await db.query(
      `UPDATE solicitudes SET descripcion=COALESCE($2,descripcion), horas_estimadas=COALESCE($3,horas_estimadas),
         updated_at=now() WHERE id=$1 RETURNING *`,
      [req.params.id, descripcion, horas_estimadas]
    );
    res.json(rows[0]);
  })
);

router.patch(
  '/:id/cancelar',
  rules.soloId,
  authorize('Vendedor'),
  asyncHandler(async (req, res) => {
    const sol = await getSolicitud(req.params.id);
    if (!['inicial', 'cotizada', 'aceptada'].includes(sol.estado)) {
      throw new HttpError(409, `No se puede cancelar una solicitud en estado ${sol.estado}`);
    }
    const { rows } = await db.query(
      "UPDATE solicitudes SET estado='cancelada', updated_at=now() WHERE id=$1 RETURNING *",
      [sol.id]
    );
    notificarCambioEstado(sol.id, 'cancelada');
    res.json(rows[0]);
  })
);

router.post(
  '/:id/materiales',
  rules.material,
  authorize('Vendedor', 'Encargado'),
  asyncHandler(async (req, res) => {
    exigirInicial(await getSolicitud(req.params.id), 'agregar materiales a');
    const { nombre, cantidad, precio_unitario } = req.body;
    if (!nombre || !(Number(cantidad) > 0) || !(Number(precio_unitario) >= 0)) {
      throw new HttpError(400, 'nombre, cantidad (>0) y precio_unitario (>=0) son obligatorios');
    }
    const { rows } = await db.query(
      `INSERT INTO materiales_solicitud(solicitud_id,nombre,cantidad,precio_unitario) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, nombre, cantidad, precio_unitario]
    );
    res.status(201).json(rows[0]);
  })
);

router.post(
  '/:id/calcular',
  rules.soloId,
  authorize('Vendedor', 'Encargado'),
  asyncHandler(async (req, res) => {
    res.json(await calcularSolicitud(req.params.id));
  })
);

module.exports = router;
