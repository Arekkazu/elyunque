const jwt = require('jsonwebtoken');
const { request, app, tokenDe, auth } = require('./helpers');
const { pool } = require('../../src/config/db');
const { limpiarTexto } = require('../../src/middlewares/validate');

afterAll(() => pool.end());

describe('JWT', () => {
  test('el token expira en máximo 8 horas', async () => {
    const t = jwt.decode(await tokenDe('vendedor'));
    expect(t.exp - t.iat).toBeLessThanOrEqual(8 * 3600);
  });

  test('token expirado → 401 con mensaje de sesión expirada', async () => {
    const t = jwt.sign({ id: 1, rol: 'Administrador' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/clientes').set(auth(t));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expirada/i);
  });

  test('token manipulado, con otra firma o sin algoritmo → 401 sin detalles internos', async () => {
    const valido = await tokenDe('vendedor');
    const manipulado = `${valido.slice(0, -3)}abc`;
    const otraFirma = jwt.sign({ id: 1, rol: 'Administrador' }, 'otra-clave');
    const sinFirma = jwt.sign({ id: 1, rol: 'Administrador' }, '', { algorithm: 'none' });
    for (const t of [manipulado, otraFirma, sinFirma]) {
      const res = await request(app).get('/clientes').set(auth(t));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token inválido');
    }
  });

  test('desactivar un usuario revoca su token vigente', async () => {
    const admin = await tokenDe('admin');
    const email = `revoca${Date.now()}@elyunque.com`;
    const u = await request(app).post('/usuarios').set(auth(admin)).send({ nombre: 'Rev', email, password: 'Revocar123', rol: 'Vendedor' });
    const { body } = await request(app).post('/auth/login').send({ email, password: 'Revocar123' });
    expect((await request(app).get('/clientes').set(auth(body.token))).status).toBe(200);
    await request(app).patch(`/usuarios/${u.body.id}/desactivar`).set(auth(admin));
    expect((await request(app).get('/clientes').set(auth(body.token))).status).toBe(401);
  });
});

describe('Validación y sanitización de entradas', () => {
  let vendedor;
  beforeAll(async () => { vendedor = await tokenDe('vendedor'); });

  test('campos vacíos o de tipo incorrecto → 400 con la lista de campos', async () => {
    const res = await request(app).post('/solicitudes').set(auth(vendedor)).send({ cliente_id: 'abc', descripcion: '', horas_estimadas: -1 });
    expect(res.status).toBe(400);
    const campos = res.body.campos.map((c) => c.campo);
    expect(campos).toEqual(expect.arrayContaining(['cliente_id', 'descripcion', 'horas_estimadas']));
  });

  test('ids inválidos en la ruta → 400 (no 500)', async () => {
    expect((await request(app).get('/solicitudes/abc').set(auth(vendedor))).status).toBe(400);
    expect((await request(app).get("/clientes/1;DROP TABLE clientes").set(auth(vendedor))).status).toBe(400);
    expect((await request(app).post('/solicitudes/abc/calcular').set(auth(vendedor))).status).toBe(400);
  });

  test('el login valida el formato del email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'no-es-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.campos[0].campo).toBe('email');
  });

  test('HTML/script malicioso se elimina antes de guardar', async () => {
    const c = await request(app).post('/clientes').set(auth(vendedor))
      .send({ nombre: '<b>Ana</b><script>alert(1)</script>', documento: `X${Date.now()}` });
    expect(c.status).toBe(201);
    expect(c.body.nombre).toBe('Ana');
    expect(limpiarTexto('<img src=x onerror=alert(1)>Hola')).toBe('Hola');
    expect(limpiarTexto(5)).toBe(5);
  });

  test('un intento de inyección SQL se guarda como texto inofensivo y no altera la BD', async () => {
    const payload = "Robert'); DROP TABLE clientes;--";
    const c = await request(app).post('/clientes').set(auth(vendedor)).send({ nombre: payload, documento: `S${Date.now()}` });
    expect(c.status).toBe(201);
    expect(c.body.nombre).toBe(payload);
    expect((await request(app).get('/clientes').set(auth(vendedor))).status).toBe(200);
  });

  test('cuerpos JSON inválidos o demasiado grandes → 400 / 413', async () => {
    const malo = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(malo.status).toBe(400);
    const grande = await request(app).post('/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) });
    expect(grande.status).toBe(413);
  });

  test('validaciones de ventas, usuarios y materiales', async () => {
    const admin = await tokenDe('admin');
    expect((await request(app).get('/ventas?page=0').set(auth(vendedor))).status).toBe(400);
    expect((await request(app).get('/ventas?desde=ayer').set(auth(vendedor))).status).toBe(400);
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: 'x' })).status).toBe(400);
    expect((await request(app).patch('/cotizaciones/1/decision').set(auth(vendedor)).send({ decision: 'x' })).status).toBe(400);
    expect((await request(app).put('/usuarios/1').set(auth(admin)).send({ rol: 'Dios' })).status).toBe(400);
    expect((await request(app).post('/solicitudes/1/materiales').set(auth(vendedor)).send({ nombre: 'a', cantidad: 'x', precio_unitario: -1 })).status).toBe(400);
  });
});

describe('Cabeceras HTTP y CORS', () => {
  test('Helmet agrega cabeceras de seguridad y no expone X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('Swagger UI sigue funcionando (sin CSP restrictiva)', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  test('CORS solo permite orígenes de la lista blanca', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const mal = await request(app).get('/health').set('Origin', 'https://sitio-malicioso.com');
    expect(mal.headers['access-control-allow-origin']).toBeUndefined();
  });
});
