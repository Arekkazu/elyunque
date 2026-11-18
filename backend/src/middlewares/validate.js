const { body, param, query, validationResult } = require('express-validator');

const ROLES = ['Administrador', 'Vendedor', 'Encargado', 'Cliente'];

/** Elimina scripts y etiquetas HTML antes de guardar el texto. */
const limpiarTexto = (v) =>
  typeof v === 'string'
    ? v
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()
    : v;

const texto = (campo, { max = 200, requerido = true } = {}) => {
  const chain = body(campo);
  const base = requerido ? chain.exists({ values: 'falsy' }).withMessage('es obligatorio') : chain.optional({ values: 'null' });
  return base
    .bail()
    .isString()
    .withMessage('debe ser texto')
    .bail()
    .customSanitizer(limpiarTexto)
    .isLength({ min: requerido ? 1 : 0, max })
    .withMessage(requerido ? `debe tener entre 1 y ${max} caracteres` : `máximo ${max} caracteres`);
};

const numero = (campo, { min = 0, exclusivo = false, requerido = false } = {}) => {
  const chain = body(campo);
  const base = requerido ? chain.exists({ values: 'undefined' }).withMessage('es obligatorio') : chain.optional();
  return base
    .isFloat(exclusivo ? { gt: min } : { min })
    .withMessage(exclusivo ? `debe ser un número mayor que ${min}` : `debe ser un número mayor o igual a ${min}`)
    .toFloat();
};

const idEntero = (campo, { requerido = true } = {}) => {
  const chain = body(campo);
  return (requerido ? chain.exists({ values: 'undefined' }).withMessage('es obligatorio') : chain.optional())
    .isInt({ min: 1 })
    .withMessage('debe ser un entero positivo')
    .toInt();
};

/** Ejecuta las reglas y responde 400 listando los campos inválidos. */
const validar = (...reglas) => [
  ...reglas,
  (req, res, next) => {
    const errores = validationResult(req);
    if (errores.isEmpty()) return next();
    return res.status(400).json({
      error: 'Datos inválidos',
      campos: errores.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  },
];

const paramId = param('id').isInt({ min: 1 }).withMessage('el id debe ser un entero positivo');
const emailValido = (campo, requerido = true) =>
  (requerido ? body(campo).exists({ values: 'falsy' }).withMessage('es obligatorio') : body(campo).optional())
    .isEmail()
    .withMessage('debe ser un email válido')
    .bail()
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })
    .isLength({ max: 150 });

const rules = {
  login: validar(emailValido('email'), body('password').isString().notEmpty().withMessage('es obligatorio')),
  usuarioCrear: validar(
    texto('nombre', { max: 100 }),
    emailValido('email'),
    body('password').isString().isLength({ min: 8, max: 72 }).withMessage('debe tener entre 8 y 72 caracteres'),
    body('rol').isIn(ROLES).withMessage(`debe ser uno de: ${ROLES.join(', ')}`)
  ),
  usuarioEditar: validar(
    paramId,
    texto('nombre', { max: 100, requerido: false }),
    emailValido('email', false),
    body('rol').optional().isIn(ROLES).withMessage(`debe ser uno de: ${ROLES.join(', ')}`),
    body('password').optional().isString().isLength({ min: 8, max: 72 }).withMessage('debe tener entre 8 y 72 caracteres')
  ),
  clienteCrear: validar(
    texto('nombre', { max: 120 }),
    texto('documento', { max: 30 }),
    texto('telefono', { max: 30, requerido: false }),
    emailValido('email', false),
    texto('direccion', { max: 200, requerido: false })
  ),
  clienteEditar: validar(
    paramId,
    texto('nombre', { max: 120, requerido: false }),
    texto('documento', { max: 30, requerido: false }),
    texto('telefono', { max: 30, requerido: false }),
    emailValido('email', false),
    texto('direccion', { max: 200, requerido: false })
  ),
  solicitudCrear: validar(
    idEntero('cliente_id'),
    texto('descripcion', { max: 2000 }),
    numero('horas_estimadas', { min: 0 })
  ),
  solicitudEditar: validar(paramId, texto('descripcion', { max: 2000, requerido: false }), numero('horas_estimadas', { min: 0 })),
  material: validar(
    paramId,
    texto('nombre', { max: 120 }),
    numero('cantidad', { min: 0, exclusivo: true, requerido: true }),
    numero('precio_unitario', { min: 0, requerido: true })
  ),
  cotizacionCrear: validar(idEntero('solicitud_id')),
  decision: validar(paramId, body('decision').isIn(['aceptada', 'rechazada']).withMessage('debe ser "aceptada" o "rechazada"')),
  ventaCrear: validar(idEntero('cotizacion_id')),
  ventasListar: validar(
    query('page').optional().isInt({ min: 1 }).withMessage('debe ser un entero positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('debe estar entre 1 y 100'),
    query('desde').optional().isISO8601().withMessage('debe ser una fecha ISO'),
    query('hasta').optional().isISO8601().withMessage('debe ser una fecha ISO'),
    query('cliente_id').optional().isInt({ min: 1 }).withMessage('debe ser un entero positivo')
  ),
  soloId: validar(paramId),
};

module.exports = { rules, validar, limpiarTexto };
