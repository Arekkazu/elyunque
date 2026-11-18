// Especificación OpenAPI 3 de la API de El Yunque (servida en /api-docs)
const json = (schema) => ({ content: { 'application/json': { schema } } });
const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const str = { type: 'string' };
const num = { type: 'number' };
const int = { type: 'integer' };
const idParam = { name: 'id', in: 'path', required: true, schema: int };
const q = (name, schema = str) => ({ name, in: 'query', schema });

const op = (tag, summary, { body, params = [], status = 200, secured = true, roles } = {}) => ({
  tags: [tag],
  summary: roles ? `${summary} (roles: ${roles})` : summary,
  security: secured ? [{ bearerAuth: [] }] : [],
  parameters: params,
  ...(body ? { requestBody: { required: true, ...json(body) } } : {}),
  responses: {
    [status]: { description: 'OK' },
    ...(secured ? { 401: { description: 'No autenticado' }, 403: { description: 'Sin permisos' } } : {}),
    400: { description: 'Datos inválidos (lista de campos en `campos`)' },
    429: { description: 'Demasiadas peticiones' },
    409: { description: 'Conflicto de estado' },
  },
});

const cliente = obj({ nombre: str, documento: str, telefono: str, email: str, direccion: str }, ['nombre', 'documento']);

module.exports = {
  openapi: '3.0.3',
  info: { title: 'API El Yunque', version: '1.0.0', description: 'Sistema de gestión del taller El Yunque' },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths: {
    '/health': {
      get: op('Monitoreo', 'Estado del servidor, BD y uptime (503 si la BD falla)', { secured: false }),
    },
    '/metrics': {
      get: op('Monitoreo', 'Métricas: peticiones, tiempo promedio y memoria', { roles: 'Administrador' }),
    },
    '/monitoreo/logs': {
      get: op('Monitoreo', 'Últimas entradas de access.log y error.log', { params: [q('access', int), q('errors', int)], roles: 'Administrador' }),
    },
    '/auth/login': {
      post: op('Auth', 'Iniciar sesión y obtener JWT', {
        secured: false,
        body: obj({ email: str, password: str }, ['email', 'password']),
      }),
    },
    '/usuarios': {
      get: op('Usuarios', 'Listar usuarios', { roles: 'Administrador' }),
      post: op('Usuarios', 'Crear usuario', {
        status: 201,
        roles: 'Administrador',
        body: obj({ nombre: str, email: str, password: str, rol: { type: 'string', enum: ['Administrador', 'Vendedor', 'Encargado', 'Cliente'] } }, ['nombre', 'email', 'password', 'rol']),
      }),
    },
    '/usuarios/{id}': {
      put: op('Usuarios', 'Editar usuario', { params: [idParam], roles: 'Administrador', body: obj({ nombre: str, email: str, rol: str, password: str }) }),
    },
    '/usuarios/{id}/desactivar': {
      patch: op('Usuarios', 'Desactivar usuario', { params: [idParam], roles: 'Administrador' }),
    },
    '/clientes': {
      get: op('Clientes', 'Listar clientes activos', { params: [q('q')], roles: 'Vendedor, Encargado' }),
      post: op('Clientes', 'Crear cliente', { status: 201, body: cliente, roles: 'Vendedor' }),
    },
    '/clientes/{id}': {
      get: op('Clientes', 'Obtener cliente', { params: [idParam], roles: 'Vendedor, Encargado' }),
      put: op('Clientes', 'Editar cliente', { params: [idParam], body: cliente, roles: 'Vendedor' }),
      delete: op('Clientes', 'Desactivar cliente (baja lógica)', { params: [idParam], status: 204, roles: 'Vendedor' }),
    },
    '/solicitudes': {
      get: op('Solicitudes', 'Listar solicitudes con filtros', {
        params: [q('estado'), q('cliente_id', int), q('desde'), q('hasta')],
        roles: 'Vendedor, Encargado, Cliente (solo las propias)',
      }),
      post: op('Solicitudes', 'Crear solicitud', {
        status: 201,
        roles: 'Vendedor',
        body: obj({ cliente_id: int, descripcion: str, horas_estimadas: num }, ['cliente_id', 'descripcion']),
      }),
    },
    '/solicitudes/{id}': {
      get: op('Solicitudes', 'Detalle con materiales y cotizaciones', { params: [idParam], roles: 'Vendedor, Encargado' }),
      put: op('Solicitudes', 'Editar solicitud (solo estado inicial)', { params: [idParam], roles: 'Vendedor', body: obj({ descripcion: str, horas_estimadas: num }) }),
    },
    '/solicitudes/{id}/cancelar': {
      patch: op('Solicitudes', 'Cancelar solicitud', { params: [idParam], roles: 'Vendedor' }),
    },
    '/solicitudes/{id}/materiales': {
      post: op('Solicitudes', 'Agregar material (solo estado inicial)', {
        params: [idParam],
        status: 201,
        roles: 'Vendedor, Encargado',
        body: obj({ nombre: str, cantidad: num, precio_unitario: num }, ['nombre', 'cantidad', 'precio_unitario']),
      }),
    },
    '/solicitudes/{id}/calcular': {
      post: op('Cálculo', 'Calcular costo (materiales + mano de obra)', { params: [idParam], roles: 'Vendedor, Encargado' }),
    },
    '/solicitudes/{id}/estado': {
      get: op('Estados', 'Consultar estado de la solicitud', { params: [idParam], roles: 'Vendedor, Encargado, Cliente (propia)' }),
    },
    '/cotizaciones': {
      post: op('Cotizaciones', 'Generar cotización con consecutivo único', {
        status: 201,
        roles: 'Vendedor, Encargado',
        body: obj({ solicitud_id: int }, ['solicitud_id']),
      }),
    },
    '/cotizaciones/{id}/decision': {
      patch: op('Cotizaciones', 'Aceptar o rechazar cotización', {
        params: [idParam],
        roles: 'Vendedor',
        body: obj({ decision: { type: 'string', enum: ['aceptada', 'rechazada'] } }, ['decision']),
      }),
    },
    '/ventas': {
      post: op('Ventas', 'Registrar venta (solo cotización aceptada)', {
        status: 201,
        roles: 'Vendedor',
        body: obj({ cotizacion_id: int }, ['cotizacion_id']),
      }),
      get: op('Ventas', 'Listar ventas con filtros y paginación', {
        params: [q('desde'), q('hasta'), q('cliente_id', int), q('page', int), q('limit', int)],
        roles: 'Vendedor',
      }),
    },
  },
};
