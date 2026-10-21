const db = require('../config/db');
const { HttpError } = require('../config/httpError');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Cálculo puro: materiales + mano de obra (horas × tarifa). */
function calcular({ materiales = [], horas = 0, tarifaHora }) {
  const costo_materiales = round2(
    materiales.reduce((acc, m) => acc + Number(m.cantidad) * Number(m.precio_unitario), 0)
  );
  const costo_mano_obra = round2(Number(horas) * Number(tarifaHora));
  return { costo_materiales, costo_mano_obra, total: round2(costo_materiales + costo_mano_obra) };
}

async function obtenerTarifaHora(client = db) {
  const { rows } = await client.query("SELECT valor FROM parametros WHERE clave='tarifa_hora'");
  if (!rows[0]) throw new HttpError(500, 'Tarifa por hora no parametrizada');
  return Number(rows[0].valor);
}

/** Calcula el costo de una solicitud con sus materiales y la tarifa parametrizada. */
async function calcularSolicitud(solicitudId, client = db) {
  const sol = await client.query('SELECT id, horas_estimadas FROM solicitudes WHERE id=$1', [solicitudId]);
  if (!sol.rows[0]) throw new HttpError(404, 'Solicitud no encontrada');
  const mats = await client.query(
    'SELECT cantidad, precio_unitario FROM materiales_solicitud WHERE solicitud_id=$1',
    [solicitudId]
  );
  const tarifaHora = await obtenerTarifaHora(client);
  return calcular({ materiales: mats.rows, horas: sol.rows[0].horas_estimadas, tarifaHora });
}

module.exports = { calcular, calcularSolicitud, obtenerTarifaHora, round2 };
