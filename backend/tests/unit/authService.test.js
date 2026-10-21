const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const db = require('../../src/config/db');
const { login } = require('../../src/services/authService');

describe('authService.login', () => {
  const usuario = { id: 7, nombre: 'Ana', email: 'ana@x.com', rol: 'Vendedor', activo: true };

  beforeEach(async () => {
    usuario.password_hash = await bcrypt.hash('Secreta123', 4);
    db.query.mockReset();
  });

  test('devuelve un JWT con id y rol cuando las credenciales son correctas', async () => {
    db.query.mockResolvedValue({ rows: [usuario] });
    const r = await login('ana@x.com', 'Secreta123');
    const payload = jwt.verify(r.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ id: 7, rol: 'Vendedor' });
    expect(r.usuario).not.toHaveProperty('password_hash');
  });

  test('rechaza contraseña incorrecta con 401', async () => {
    db.query.mockResolvedValue({ rows: [usuario] });
    await expect(login('ana@x.com', 'mala')).rejects.toMatchObject({ status: 401 });
  });

  test('rechaza usuario inexistente o inactivo con 401', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(login('no@x.com', 'x')).rejects.toMatchObject({ status: 401 });
    db.query.mockResolvedValue({ rows: [{ ...usuario, activo: false }] });
    await expect(login('ana@x.com', 'Secreta123')).rejects.toMatchObject({ status: 401 });
  });

  test('exige email y contraseña', async () => {
    await expect(login('', '')).rejects.toMatchObject({ status: 400 });
  });
});
