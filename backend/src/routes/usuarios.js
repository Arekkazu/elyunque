const router = require('express').Router();
const db = require('../config/db');
const { HttpError, asyncHandler } = require('../config/httpError');
const { authenticate, authorize } = require('../middlewares/auth');
const { hashPassword } = require('../services/authService');

const ROLES = ['Administrador', 'Vendedor', 'Encargado', 'Cliente'];
const COLS = 'id, nombre, email, rol, activo, created_at';

router.use(authenticate, authorize());

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(`SELECT ${COLS} FROM usuarios ORDER BY id`);
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) throw new HttpError(400, 'nombre, email y password son obligatorios');
    if (!ROLES.includes(rol)) throw new HttpError(400, `rol debe ser uno de: ${ROLES.join(', ')}`);
    if (password.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    const { rows } = await db.query(
      `INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
      [nombre, email, await hashPassword(password), rol]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { nombre, email, rol, password } = req.body;
    if (rol && !ROLES.includes(rol)) throw new HttpError(400, `rol debe ser uno de: ${ROLES.join(', ')}`);
    const hash = password ? await hashPassword(password) : null;
    const { rows } = await db.query(
      `UPDATE usuarios SET nombre=COALESCE($2,nombre), email=COALESCE($3,email), rol=COALESCE($4,rol),
         password_hash=COALESCE($5,password_hash) WHERE id=$1 RETURNING ${COLS}`,
      [req.params.id, nombre, email, rol, hash]
    );
    if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
    res.json(rows[0]);
  })
);

router.patch(
  '/:id/desactivar',
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) throw new HttpError(409, 'No puede desactivarse a sí mismo');
    const { rows } = await db.query(`UPDATE usuarios SET activo=false WHERE id=$1 RETURNING ${COLS}`, [
      req.params.id,
    ]);
    if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
    res.json(rows[0]);
  })
);

module.exports = router;
