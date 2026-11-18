// Métricas básicas en memoria: número de peticiones, tiempo promedio y memoria.
const state = { total: 0, totalMs: 0, porEstado: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 }, inicio: Date.now() };

function metricsMiddleware(req, res, next) {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    state.total += 1;
    state.totalMs += ms;
    const clase = `${Math.floor(res.statusCode / 100)}xx`;
    if (state.porEstado[clase] !== undefined) state.porEstado[clase] += 1;
  });
  next();
}

function snapshot() {
  const mem = process.memoryUsage();
  const mb = (n) => Math.round((n / 1024 / 1024) * 10) / 10;
  return {
    peticiones: { total: state.total, por_estado: { ...state.porEstado } },
    tiempo_promedio_ms: state.total ? Math.round((state.totalMs / state.total) * 100) / 100 : 0,
    memoria_mb: { rss: mb(mem.rss), heap_usado: mb(mem.heapUsed), heap_total: mb(mem.heapTotal) },
    uptime_s: Math.round(process.uptime()),
    iniciado: new Date(state.inicio).toISOString(),
  };
}

module.exports = { metricsMiddleware, snapshot };
