const request = require('supertest');
const app = require('../../src/app');

const CREDS = {
  admin: ['admin@elyunque.com', 'Admin123!'],
  vendedor: ['vendedor@elyunque.com', 'Vendedor123!'],
  encargado: ['encargado@elyunque.com', 'Encargado123!'],
  cliente: ['cliente@elyunque.com', 'Cliente123!'],
};

async function tokenDe(rol) {
  const [email, password] = CREDS[rol];
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { request, app, tokenDe, auth };
