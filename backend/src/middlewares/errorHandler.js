const { HttpError } = require('../config/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'Recurso no encontrado'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  // Violación de unicidad en PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  if (err.code === '23503') return res.status(409).json({ error: 'Referencia a un registro inexistente' });
  const status = err.status || 500;
  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
}

module.exports = { notFound, errorHandler };
