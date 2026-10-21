const { request, app, tokenDe, auth } = require('./helpers');
const { pool } = require('../../src/config/db');

afterAll(() => pool.end());

describe('Autenticación y roles', () => {
  test('login correcto devuelve 200 y token', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@elyunque.com', password: 'Admin123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.rol).toBe('Administrador');
  });

  test('login con credenciales incorrectas devuelve 401', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@elyunque.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  test('ruta protegida sin token devuelve 401', async () => {
    expect((await request(app).get('/clientes')).status).toBe(401);
    expect((await request(app).get('/clientes').set('Authorization', 'Bearer basura')).status).toBe(401);
  });

  test('rol sin permiso devuelve 403', async () => {
    const cliente = await tokenDe('cliente');
    expect((await request(app).get('/usuarios').set(auth(cliente))).status).toBe(403);
    const vendedor = await tokenDe('vendedor');
    expect((await request(app).post('/usuarios').set(auth(vendedor)).send({})).status).toBe(403);
  });

  test('el administrador gestiona usuarios y un usuario desactivado no puede entrar', async () => {
    const admin = await tokenDe('admin');
    const email = `tmp${Date.now()}@elyunque.com`;
    const creado = await request(app).post('/usuarios').set(auth(admin))
      .send({ nombre: 'Temporal', email, password: 'Temporal123', rol: 'Vendedor' });
    expect(creado.status).toBe(201);
    expect(creado.body).not.toHaveProperty('password_hash');

    expect((await request(app).post('/usuarios').set(auth(admin)).send({ nombre: 'x', email, password: 'Temporal123', rol: 'Vendedor' })).status).toBe(409);
    expect((await request(app).post('/usuarios').set(auth(admin)).send({ nombre: 'x', email: 'a@b.c', password: '123', rol: 'Vendedor' })).status).toBe(400);
    expect((await request(app).put(`/usuarios/${creado.body.id}`).set(auth(admin)).send({ nombre: 'Editado' })).body.nombre).toBe('Editado');

    expect((await request(app).post('/auth/login').send({ email, password: 'Temporal123' })).status).toBe(200);
    expect((await request(app).patch(`/usuarios/${creado.body.id}/desactivar`).set(auth(admin))).body.activo).toBe(false);
    expect((await request(app).post('/auth/login').send({ email, password: 'Temporal123' })).status).toBe(401);
    expect((await request(app).get('/usuarios').set(auth(admin))).body.length).toBeGreaterThan(3);
  });

  test('rutas inexistentes devuelven 404 y /health responde', async () => {
    expect((await request(app).get('/nada')).status).toBe(404);
    expect((await request(app).get('/health')).body.status).toBe('ok');
    expect((await request(app).get('/api-docs/')).status).toBe(200);
  });
});
