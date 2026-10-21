const jwt = require('jsonwebtoken');
const { HttpError } = require('../config/httpError');

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Token requerido'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new HttpError(401, 'Token inválido o expirado'));
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
