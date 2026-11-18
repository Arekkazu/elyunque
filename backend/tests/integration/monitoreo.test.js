const fs = require('fs');
const { request, app, tokenDe, auth } = require('./helpers');
const db = require('../../src/config/db');
const { logger, tail, ACCESS_FILE, ERROR_FILE } = require('../../src/config/logger');

afterAll(() => db.pool.end());

describe('/health', () => {
  test('200 con estado, conexión a la BD y uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(res.body.uptime_s).toBeGreaterThanOrEqual(0);
  });

  test('503 con el detalle cuando falla la BD', async () => {
    const espia = jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('conexión rechazada'));
    const res = await request(app).get('/health');
    espia.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', db: 'down', detalle: 'conexión rechazada' });
  });
});

describe('/metrics y /monitoreo/logs', () => {
  test('solo el Administrador accede', async () => {
    expect((await request(app).get('/metrics')).status).toBe(401);
    const vendedor = await tokenDe('vendedor');
    expect((await request(app).get('/metrics').set(auth(vendedor))).status).toBe(403);
    expect((await request(app).get('/monitoreo/logs').set(auth(vendedor))).status).toBe(403);
  });

  test('métricas: peticiones, tiempo promedio y memoria', async () => {
    const admin = await tokenDe('admin');
    const res = await request(app).get('/metrics').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.peticiones.total).toBeGreaterThan(0);
    expect(res.body.peticiones.por_estado).toHaveProperty('2xx');
    expect(res.body.tiempo_promedio_ms).toBeGreaterThanOrEqual(0);
    expect(res.body.memoria_mb.rss).toBeGreaterThan(0);
  });

  test('access.log registra método, ruta, código y tiempo en JSON', async () => {
    const admin = await tokenDe('admin');
    await request(app).get('/health');
    await new Promise((r) => setTimeout(r, 200)); // Winston escribe de forma asíncrona
    const res = await request(app).get('/monitoreo/logs?access=5').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.access.length).toBeGreaterThan(0);
    expect(res.body.access[0]).toMatchObject({ method: expect.any(String), path: expect.any(String), status: expect.any(Number) });
    expect(res.body.access[0].responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(ACCESS_FILE)).toBe(true);
  });

  test('los errores 500 se registran en error.log con stack y no se exponen al cliente', async () => {
    const admin = await tokenDe('admin');
    const espia = jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('fallo interno secreto'));
    // authenticate consulta la BD: el error simulado llega al manejador global como 500
    const res = await request(app).get('/clientes').set(auth(admin));
    espia.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
    await new Promise((r) => setTimeout(r, 200));
    const logs = await request(app).get('/monitoreo/logs?errors=5').set(auth(admin));
    expect(logs.body.errors[0].message).toBe('fallo interno secreto');
    expect(logs.body.errors[0].stack).toContain('Error');
    expect(logs.body.ultimo_incidente).toBe(logs.body.errors[0].timestamp);
  });
});

describe('logger.tail', () => {
  test('devuelve vacío si el archivo no existe y respeta el límite', () => {
    expect(tail('/ruta/inexistente.log', 5)).toEqual([]);
    logger.error('uno');
    logger.error('dos');
    return new Promise((r) => setTimeout(r, 200)).then(() => {
      expect(tail(ERROR_FILE, 1)).toHaveLength(1);
    });
  });
});
