const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { HttpError } = require('../config/httpError');

/**
 * Valida el JWT (firma HS256 y expiración) y confirma que el usuario siga activo,
 * de modo que desactivar una cuenta revoca su sesión de inmediato.
 */
async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Token requerido'));
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return next(
      new HttpError(401, err.name === 'TokenExpiredError' ? 'Sesión expirada, inicie sesión de nuevo' : 'Token inválido')
    );
  }
  try {
    const { rows } = await db.query('SELECT id, nombre, rol, activo FROM usuarios WHERE id=$1', [payload.id]);
    if (!rows[0] || !rows[0].activo) return next(new HttpError(401, 'Sesión no válida'));
    req.user = { id: rows[0].id, nombre: rows[0].nombre, rol: rows[0].rol };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Permite acceso a los roles indicados; el Administrador siempre tiene acceso. */
const authorize =
  (...roles) =>
  (req, res, next) =>
    req.user && (req.user.rol === 'Administrador' || roles.includes(req.user.rol))
      ? next()
      : next(new HttpError(403, 'No tiene permisos para esta operación'));

module.exports = { authenticate, authorize };
