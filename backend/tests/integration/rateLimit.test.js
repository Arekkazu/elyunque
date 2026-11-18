// El límite se lee al cargar la app, por eso se configura antes de requerirla.
process.env.LOGIN_RATE_MAX = '3';
process.env.LOGIN_RATE_WINDOW_MS = '60000';

const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

afterAll(() => pool.end());

test('el login se bloquea con 429 tras superar el límite de intentos', async () => {
  const intento = () => request(app).post('/auth/login').send({ email: 'admin@elyunque.com', password: 'incorrecta' });
  for (let i = 0; i < 3; i++) expect((await intento()).status).toBe(401);
  const bloqueado = await intento();
  expect(bloqueado.status).toBe(429);
  expect(bloqueado.body.error).toMatch(/demasiados/i);
});
