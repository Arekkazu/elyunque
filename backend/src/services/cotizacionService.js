const db = require('../config/db');
const { HttpError } = require('../config/httpError');
const { calcularSolicitud } = require('./calculoService');
const { notificarCambioEstado } = require('./notificacionService');

async function siguienteConsecutivo(client) {
  const { rows } = await client.query(
    "SELECT 'COT-' || lpad(nextval('cotizacion_consecutivo_seq')::text, 5, '0') AS c"
  );
  return rows[0].c;
}

/** Crea una cotización para una solicitud en estado inicial y la pasa a "cotizada". */
function crearCotizacion(solicitudId) {
  return db.withTransaction(async (client) => {
    const sol = await client.query('SELECT estado FROM solicitudes WHERE id=$1 FOR UPDATE', [solicitudId]);
    if (!sol.rows[0]) throw new HttpError(404, 'Solicitud no encontrada');
    if (sol.rows[0].estado !== 'inicial') {
      throw new HttpError(409, 'Solo se puede cotizar una solicitud en estado inicial');
    }
    const calculo = await calcularSolicitud(solicitudId, client);
    const consecutivo = await siguienteConsecutivo(client);
    const { rows } = await client.query(
      `INSERT INTO cotizaciones(solicitud_id, consecutivo, costo_materiales, costo_mano_obra, total)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [solicitudId, consecutivo, calculo.costo_materiales, calculo.costo_mano_obra, calculo.total]
    );
    await client.query("UPDATE solicitudes SET estado='cotizada', updated_at=now() WHERE id=$1", [solicitudId]);
    notificarCambioEstado(solicitudId, 'cotizada');
    return rows[0];
  });
}

/** El cliente acepta o rechaza la cotización; actualiza la solicitud. */
function decidirCotizacion(id, decision) {
  if (!['aceptada', 'rechazada'].includes(decision)) {
    throw new HttpError(400, 'La decisión debe ser "aceptada" o "rechazada"');
  }
  return db.withTransaction(async (client) => {
    const cot = await client.query('SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE', [id]);
    if (!cot.rows[0]) throw new HttpError(404, 'Cotización no encontrada');
    if (cot.rows[0].estado !== 'pendiente') throw new HttpError(409, 'La cotización ya fue decidida');
    const { rows } = await client.query(
      'UPDATE cotizaciones SET estado=$2, decidida_at=now() WHERE id=$1 RETURNING *',
      [id, decision]
    );
    await client.query('UPDATE solicitudes SET estado=$2, updated_at=now() WHERE id=$1', [
      cot.rows[0].solicitud_id,
      decision,
    ]);
    notificarCambioEstado(cot.rows[0].solicitud_id, decision);
    return rows[0];
  });
}

/** Registra la venta: solo si la cotización fue aceptada y no tiene venta previa. */
function registrarVenta(cotizacionId, vendedorId) {
  return db.withTransaction(async (client) => {
    const cot = await client.query('SELECT * FROM cotizaciones WHERE id=$1 FOR UPDATE', [cotizacionId]);
    if (!cot.rows[0]) throw new HttpError(404, 'Cotización no encontrada');
    if (cot.rows[0].estado !== 'aceptada') {
      throw new HttpError(409, 'Solo se puede registrar una venta de una cotización aceptada');
    }
    const prev = await client.query('SELECT 1 FROM ventas WHERE cotizacion_id=$1', [cotizacionId]);
    if (prev.rowCount) throw new HttpError(409, 'La cotización ya tiene una venta registrada');
    const { rows } = await client.query(
      `INSERT INTO ventas(cotizacion_id, solicitud_id, total, vendedor_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [cotizacionId, cot.rows[0].solicitud_id, cot.rows[0].total, vendedorId]
    );
    await client.query("UPDATE solicitudes SET estado='vendida', updated_at=now() WHERE id=$1", [
      cot.rows[0].solicitud_id,
    ]);
    notificarCambioEstado(cot.rows[0].solicitud_id, 'vendida');
    return rows[0];
  });
}

module.exports = { crearCotizacion, decidirCotizacion, registrarVenta, siguienteConsecutivo };
