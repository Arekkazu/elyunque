export const formatearUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min ${s % 60} s`;
};

export const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-CO') : '—');

// Flujo normal de una solicitud, para el indicador de progreso
export const PASOS = ['inicial', 'cotizada', 'aceptada', 'vendida'];
