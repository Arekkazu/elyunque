import { useCallback, useEffect, useState } from 'react';
import { api, mensajeError } from '../services/api';
import { fechaHora, formatearUptime } from '../services/format';
import StatCard from '../components/StatCard';

const REFRESCO_MS = 10000;

/** Dashboard de monitoreo: estado del servidor, métricas y últimos logs. */
export default function MonitoreoPage() {
  const [health, setHealth] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [logs, setLogs] = useState({ access: [], errors: [], ultimo_incidente: null });
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const h = await api.get('/health');
      setHealth(h.data);
    } catch (e) {
      setHealth(e.response?.data || { status: 'error', db: 'down' });
      if (!e.response) setHealth({ status: 'offline' });
    }
    try {
      const [m, l] = await Promise.all([
        api.get('/metrics'),
        api.get('/monitoreo/logs', { params: { access: 20, errors: 10 } }),
      ]);
      setMetricas(m.data);
      setLogs(l.data);
    } catch (e) {
      setError(mensajeError(e));
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const online = health?.status === 'ok';
  return (
    <>
      <div className="row between">
        <h2>Monitoreo</h2>
        <button className="secondary" onClick={cargar}>Actualizar</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      <div className="stats">
        <StatCard titulo="Servidor" valor={health ? (online ? 'Online' : 'Offline') : '…'} tono={online ? 'ok' : 'mal'} detalle={health?.db ? `Base de datos: ${health.db}` : undefined} />
        <StatCard titulo="Uptime del proceso" valor={health?.uptime_s !== undefined ? formatearUptime(health.uptime_s) : '—'} detalle="El uptime mensual lo reporta UptimeRobot" />
        <StatCard titulo="Último incidente" valor={logs.ultimo_incidente ? fechaHora(logs.ultimo_incidente) : 'Ninguno'} tono={logs.ultimo_incidente ? 'mal' : ''} />
      </div>

      {metricas && (
        <div className="stats">
          <StatCard titulo="Peticiones" valor={metricas.peticiones.total} detalle={`4xx: ${metricas.peticiones.por_estado['4xx']} · 5xx: ${metricas.peticiones.por_estado['5xx']}`} />
          <StatCard titulo="Tiempo promedio" valor={`${metricas.tiempo_promedio_ms} ms`} />
          <StatCard titulo="Memoria (RSS)" valor={`${metricas.memoria_mb.rss} MB`} detalle={`Heap: ${metricas.memoria_mb.heap_usado} MB`} />
        </div>
      )}

      <h3>Últimas peticiones (access.log)</h3>
      <table>
        <thead><tr><th>Fecha</th><th>Método</th><th>Ruta</th><th>Código</th><th>Tiempo</th></tr></thead>
        <tbody>
          {logs.access.map((l, i) => (
            <tr key={i}>
              <td>{fechaHora(l.timestamp)}</td><td>{l.method}</td><td>{l.path}</td>
              <td><span className={`badge ${l.status >= 500 ? 'cancelada' : l.status >= 400 ? 'cotizada' : 'aceptada'}`}>{l.status}</span></td>
              <td>{l.responseTimeMs} ms</td>
            </tr>
          ))}
          {logs.access.length === 0 && <tr><td colSpan="5" className="muted">Sin registros</td></tr>}
        </tbody>
      </table>

      <h3>Últimos errores (error.log)</h3>
      <table>
        <thead><tr><th>Fecha</th><th>Mensaje</th><th>Ruta</th></tr></thead>
        <tbody>
          {logs.errors.map((l, i) => (
            <tr key={i}><td>{fechaHora(l.timestamp)}</td><td>{l.message}</td><td>{l.method} {l.path}</td></tr>
          ))}
          {logs.errors.length === 0 && <tr><td colSpan="3" className="muted">Sin errores registrados</td></tr>}
        </tbody>
      </table>
    </>
  );
}
