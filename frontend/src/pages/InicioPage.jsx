import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensajeError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';

const ESTADOS = ['inicial', 'cotizada', 'aceptada', 'rechazada', 'cancelada', 'vendida'];

export default function InicioPage() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState(null);
  const [ventas, setVentas] = useState(null);
  const [error, setError] = useState('');
  const verVentas = ['Administrador', 'Vendedor'].includes(usuario.rol);
  const esCliente = usuario.rol === 'Cliente';

  useEffect(() => {
    api.get('/solicitudes').then((r) => setSolicitudes(r.data)).catch((e) => setError(mensajeError(e)));
    if (verVentas) api.get('/ventas', { params: { limit: 1 } }).then((r) => setVentas(r.data.total)).catch(() => {});
  }, [verVentas]);

  const cuenta = (estado) => (solicitudes || []).filter((s) => s.estado === estado).length;
  const enCurso = cuenta('inicial') + cuenta('cotizada') + cuenta('aceptada');

  return (
    <>
      <h2>Hola, {usuario.nombre.split(' ')[0]}</h2>
      <p className="muted">{esCliente ? 'Consulte el estado de sus trabajos.' : 'Resumen del taller.'}</p>
      {error && <p role="alert" className="error">{error}</p>}
      {!solicitudes && !error && <p className="muted">Cargando…</p>}
      {solicitudes && (
        <>
          <div className="stats">
            <StatCard titulo="Solicitudes en curso" valor={enCurso} tono="acento" />
            <StatCard titulo="Pendientes de cotizar" valor={cuenta('inicial')} />
            <StatCard titulo="Cotizaciones por decidir" valor={cuenta('cotizada')} />
            {verVentas && <StatCard titulo="Ventas registradas" valor={ventas ?? '—'} />}
          </div>
          <h3>Solicitudes por estado</h3>
          <div className="chips">
            {ESTADOS.map((e) => (
              <span key={e} className={`badge ${e}`}>{e}: {cuenta(e)}</span>
            ))}
          </div>
          <h3>Más recientes</h3>
          {solicitudes.length === 0 ? (
            <p className="muted">Aún no hay solicitudes.</p>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {solicitudes.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td><td>{s.cliente_nombre}</td><td>{s.descripcion}</td>
                    <td><span className={`badge ${s.estado}`}>{s.estado}</span></td>
                    <td><Link to={esCliente ? `/estado/${s.id}` : `/solicitudes/${s.id}`}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
