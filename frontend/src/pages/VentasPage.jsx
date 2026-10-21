import { useEffect, useState } from 'react';
import { api, mensajeError, money } from '../services/api';

export default function VentasPage() {
  const [res, setRes] = useState({ data: [], page: 1, limit: 10, total: 0 });
  const [filtros, setFiltros] = useState({ desde: '', hasta: '' });
  const [error, setError] = useState('');

  const cargar = (page = 1) => {
    const params = { page, ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) };
    return api.get('/ventas', { params }).then((r) => setRes(r.data)).catch((e) => setError(mensajeError(e)));
  };
  useEffect(() => { cargar(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const paginas = Math.max(1, Math.ceil(res.total / res.limit));
  return (
    <>
      <h2>Ventas</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="row">
        <input type="date" aria-label="Desde" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
        <input type="date" aria-label="Hasta" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
        <button onClick={() => cargar(1)}>Filtrar</button>
      </div>
      <table>
        <thead><tr><th>#</th><th>Cotización</th><th>Cliente</th><th>Total</th><th>Fecha</th></tr></thead>
        <tbody>
          {res.data.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td><td>{v.consecutivo}</td><td>{v.cliente_nombre}</td>
              <td>{money(v.total)}</td><td>{new Date(v.created_at).toLocaleDateString('es-CO')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button className="secondary" disabled={res.page <= 1} onClick={() => cargar(res.page - 1)}>Anterior</button>
        <span>Página {res.page} de {paginas}</span>
        <button className="secondary" disabled={res.page >= paginas} onClick={() => cargar(res.page + 1)}>Siguiente</button>
      </div>
    </>
  );
}
