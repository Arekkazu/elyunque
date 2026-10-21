const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { HttpError } = require('../config/httpError');

async function login(email, password) {
  if (!email || !password) throw new HttpError(400, 'Email y contraseña son obligatorios');
  const { rows } = await db.query('SELECT * FROM usuarios WHERE email=$1', [email]);
  const u = rows[0];
  if (!u || !u.activo || !(await bcrypt.compare(password, u.password_hash))) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  return { token, usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } };
}

const hashPassword = (p) => bcrypt.hash(p, 10);

module.exports = { login, hashPassword };
