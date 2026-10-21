const { request, app, tokenDe, auth } = require('./helpers');
const { pool } = require('../../src/config/db');

afterAll(() => pool.end());

let vendedor, encargado, cliente;
beforeAll(async () => {
  [vendedor, encargado, cliente] = await Promise.all([tokenDe('vendedor'), tokenDe('encargado'), tokenDe('cliente')]);
});

async function nuevaSolicitud(horas = 2) {
  const doc = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const c = await request(app).post('/clientes').set(auth(vendedor)).send({ nombre: 'Cliente Flujo', documento: doc });
  expect(c.status).toBe(201);
  const s = await request(app).post('/solicitudes').set(auth(vendedor))
    .send({ cliente_id: c.body.id, descripcion: 'Reja metálica', horas_estimadas: horas });
  expect(s.status).toBe(201);
  expect(s.body.estado).toBe('inicial');
  return { cliente: c.body, solicitud: s.body };
}

describe('Clientes', () => {
  test('CRUD con baja lógica y validaciones', async () => {
    const { cliente: c } = await nuevaSolicitud();
    expect((await request(app).post('/clientes').set(auth(vendedor)).send({ nombre: 'x' })).status).toBe(400);
    expect((await request(app).post('/clientes').set(auth(vendedor)).send({ nombre: 'Dup', documento: c.documento })).status).toBe(409);
    expect((await request(app).put(`/clientes/${c.id}`).set(auth(vendedor)).send({ telefono: '123' })).body.telefono).toBe('123');
    expect((await request(app).get(`/clientes/${c.id}`).set(auth(encargado))).status).toBe(200);
    expect((await request(app).get('/clientes/999999').set(auth(vendedor))).status).toBe(404);
    expect((await request(app).get('/clientes?q=Flujo').set(auth(vendedor))).body.length).toBeGreaterThan(0);
    expect((await request(app).post('/clientes').set(auth(encargado)).send({ nombre: 'x', documento: '1' })).status).toBe(403);
    expect((await request(app).delete(`/clientes/${c.id}`).set(auth(vendedor))).status).toBe(204);
    const lista = await request(app).get('/clientes').set(auth(vendedor));
    expect(lista.body.find((x) => x.id === c.id)).toBeUndefined();
  });
});

describe('Solicitudes', () => {
  test('editar solo en estado inicial, materiales, filtros y cancelar', async () => {
    const { cliente: c, solicitud: s } = await nuevaSolicitud();
    expect((await request(app).post('/solicitudes').set(auth(vendedor)).send({})).status).toBe(400);
    expect((await request(app).put(`/solicitudes/${s.id}`).set(auth(vendedor)).send({ descripcion: 'Nueva' })).body.descripcion).toBe('Nueva');
    expect((await request(app).post(`/solicitudes/${s.id}/materiales`).set(auth(encargado)).send({ nombre: 'Varilla', cantidad: 0, precio_unitario: 5 })).status).toBe(400);
    expect((await request(app).post(`/solicitudes/${s.id}/materiales`).set(auth(encargado)).send({ nombre: 'Varilla', cantidad: 4, precio_unitario: 5000 })).status).toBe(201);

    const detalle = await request(app).get(`/solicitudes/${s.id}`).set(auth(vendedor));
    expect(detalle.body.materiales).toHaveLength(1);
    expect((await request(app).get(`/solicitudes?cliente_id=${c.id}&estado=inicial`).set(auth(vendedor))).body).toHaveLength(1);
    expect((await request(app).get('/solicitudes?estado=invalido').set(auth(vendedor))).status).toBe(400);
    expect((await request(app).get('/solicitudes/999999').set(auth(vendedor))).status).toBe(404);

    expect((await request(app).patch(`/solicitudes/${s.id}/cancelar`).set(auth(vendedor))).body.estado).toBe('cancelada');
    expect((await request(app).put(`/solicitudes/${s.id}`).set(auth(vendedor)).send({ descripcion: 'x' })).status).toBe(409);
    expect((await request(app).post(`/solicitudes/${s.id}/materiales`).set(auth(vendedor)).send({ nombre: 'a', cantidad: 1, precio_unitario: 1 })).status).toBe(409);
    expect((await request(app).patch(`/solicitudes/${s.id}/cancelar`).set(auth(vendedor))).status).toBe(409);
  });
});

describe('Flujo completo: solicitud → cálculo → cotización → decisión → venta', () => {
  test('camino feliz', async () => {
    const { solicitud: s } = await nuevaSolicitud(2);
    await request(app).post(`/solicitudes/${s.id}/materiales`).set(auth(vendedor)).send({ nombre: 'Lámina', cantidad: 2, precio_unitario: 10000 });

    const calc = await request(app).post(`/solicitudes/${s.id}/calcular`).set(auth(encargado));
    expect(calc.body).toEqual({ costo_materiales: 20000, costo_mano_obra: 50000, total: 70000 });

    const cot = await request(app).post('/cotizaciones').set(auth(encargado)).send({ solicitud_id: s.id });
    expect(cot.status).toBe(201);
    expect(cot.body.consecutivo).toMatch(/^COT-\d{5}$/);
    expect(Number(cot.body.total)).toBe(70000);
    expect((await request(app).get(`/solicitudes/${s.id}/estado`).set(auth(vendedor))).body.estado).toBe('cotizada');

    // no se puede volver a cotizar ni vender antes de aceptar
    expect((await request(app).post('/cotizaciones').set(auth(vendedor)).send({ solicitud_id: s.id })).status).toBe(409);
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: cot.body.id })).status).toBe(409);
    expect((await request(app).patch(`/cotizaciones/${cot.body.id}/decision`).set(auth(vendedor)).send({ decision: 'quizas' })).status).toBe(400);

    const dec = await request(app).patch(`/cotizaciones/${cot.body.id}/decision`).set(auth(vendedor)).send({ decision: 'aceptada' });
    expect(dec.body.estado).toBe('aceptada');
    expect((await request(app).patch(`/cotizaciones/${cot.body.id}/decision`).set(auth(vendedor)).send({ decision: 'rechazada' })).status).toBe(409);

    const venta = await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: cot.body.id });
    expect(venta.status).toBe(201);
    expect(Number(venta.body.total)).toBe(70000);
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: cot.body.id })).status).toBe(409);

    const estado = await request(app).get(`/solicitudes/${s.id}/estado`).set(auth(vendedor));
    expect(estado.body.estado).toBe('vendida');
    expect(estado.body.venta.id).toBe(venta.body.id);

    const lista = await request(app).get('/ventas?limit=5&page=1').set(auth(vendedor));
    expect(lista.body.data.length).toBeGreaterThan(0);
    expect(lista.body).toMatchObject({ page: 1, limit: 5 });
    expect((await request(app).get(`/ventas?desde=2000-01-01&hasta=2999-01-01&cliente_id=${s.cliente_id}`).set(auth(vendedor))).body.total).toBe(1);
  });

  test('cotización rechazada no permite venta y los consecutivos son únicos y crecientes', async () => {
    const a = (await nuevaSolicitud()).solicitud;
    const b = (await nuevaSolicitud()).solicitud;
    const ca = (await request(app).post('/cotizaciones').set(auth(vendedor)).send({ solicitud_id: a.id })).body;
    const cb = (await request(app).post('/cotizaciones').set(auth(vendedor)).send({ solicitud_id: b.id })).body;
    expect(ca.consecutivo).not.toBe(cb.consecutivo);
    expect(Number(cb.consecutivo.slice(4))).toBeGreaterThan(Number(ca.consecutivo.slice(4)));

    await request(app).patch(`/cotizaciones/${ca.id}/decision`).set(auth(vendedor)).send({ decision: 'rechazada' });
    expect((await request(app).get(`/solicitudes/${a.id}/estado`).set(auth(vendedor))).body.estado).toBe('rechazada');
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: ca.id })).status).toBe(409);
    expect((await request(app).post('/cotizaciones').set(auth(vendedor)).send({})).status).toBe(400);
    expect((await request(app).post('/cotizaciones').set(auth(vendedor)).send({ solicitud_id: 999999 })).status).toBe(404);
    expect((await request(app).patch('/cotizaciones/999999/decision').set(auth(vendedor)).send({ decision: 'aceptada' })).status).toBe(404);
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({})).status).toBe(400);
    expect((await request(app).post('/ventas').set(auth(vendedor)).send({ cotizacion_id: 999999 })).status).toBe(404);
  });
});

describe('Estado para el cliente', () => {
  test('el cliente ve solo sus solicitudes', async () => {
    const own = await request(app).get('/clientes').set(auth(vendedor));
    const demo = own.body.find((c) => c.documento === '900000001');
    const mia = await request(app).post('/solicitudes').set(auth(vendedor)).send({ cliente_id: demo.id, descripcion: 'Portón' });
    const { solicitud: ajena } = await nuevaSolicitud();

    const lista = await request(app).get('/solicitudes').set(auth(cliente));
    expect(lista.status).toBe(200);
    expect(lista.body.every((s) => s.cliente_id === demo.id)).toBe(true);
    expect((await request(app).get(`/solicitudes/${mia.body.id}/estado`).set(auth(cliente))).body.estado).toBe('inicial');
    expect((await request(app).get(`/solicitudes/${ajena.id}/estado`).set(auth(cliente))).status).toBe(403);
    expect((await request(app).get(`/solicitudes/${mia.body.id}`).set(auth(cliente))).status).toBe(403);
  });
});
