import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, mensajeError, money } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DecisionCotizacion from '../components/DecisionCotizacion';

export default function SolicitudDetallePage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const esVendedor = ['Administrador', 'Vendedor'].includes(usuario.rol);
  const [sol, setSol] = useState(null);
  const [calculo, setCalculo] = useState(null);
  const [mat, setMat] = useState({ nombre: '', cantidad: 1, precio_unitario: 0 });
  const [error, setError] = useState('');

  const cargar = useCallback(
    () => api.get(`/solicitudes/${id}`).then((r) => setSol(r.data)).catch((e) => setError(mensajeError(e))),
    [id]
  );
  useEffect(() => { cargar(); }, [cargar]);

  const accion = (fn) => async (...args) => {
    setError('');
    try { await fn(...args); await cargar(); } catch (err) { setError(mensajeError(err)); }
  };

  const agregarMaterial = accion(async (e) => {
    e.preventDefault();
    await api.post(`/solicitudes/${id}/materiales`, mat);
    setMat({ nombre: '', cantidad: 1, precio_unitario: 0 });
    setCalculo(null);
  });
  const calcular = accion(async () => setCalculo((await api.post(`/solicitudes/${id}/calcular`)).data));
  const cotizar = accion(() => api.post('/cotizaciones', { solicitud_id: Number(id) }));
  const decidir = accion((cotId, decision) => api.patch(`/cotizaciones/${cotId}/decision`, { decision }));
  const vender = accion((cotId) => api.post('/ventas', { cotizacion_id: cotId }));
  const cancelar = accion(() => api.patch(`/solicitudes/${id}/cancelar`));

  if (!sol) return error ? <p role="alert" className="error">{error}</p> : <p>Cargando…</p>;
  const inicial = sol.estado === 'inicial';
  const ultima = sol.cotizaciones[sol.cotizaciones.length - 1];

  return (
    <>
      <h2>Solicitud #{sol.id} <span className={`badge ${sol.estado}`}>{sol.estado}</span></h2>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="card">
        <p><strong>{sol.cliente_nombre}</strong> — {sol.descripcion}</p>
        <p>Horas estimadas: {sol.horas_estimadas}</p>
        {esVendedor && ['inicial', 'cotizada', 'aceptada'].includes(sol.estado) && (
          <button className="secondary" onClick={cancelar}>Cancelar solicitud</button>
        )}
      </div>

      <h3>Materiales</h3>
      <table>
        <thead><tr><th>Material</th><th>Cantidad</th><th>Precio unitario</th></tr></thead>
        <tbody>
          {sol.materiales.map((m) => (
            <tr key={m.id}><td>{m.nombre}</td><td>{m.cantidad}</td><td>{money(m.precio_unitario)}</td></tr>
          ))}
        </tbody>
      </table>
      {inicial && (
        <form className="card row" onSubmit={agregarMaterial}>
          <input placeholder="Material" value={mat.nombre} onChange={(e) => setMat({ ...mat, nombre: e.target.value })} required />
          <input type="number" min="0.01" step="0.01" aria-label="Cantidad" value={mat.cantidad} onChange={(e) => setMat({ ...mat, cantidad: e.target.value })} />
          <input type="number" min="0" aria-label="Precio unitario" value={mat.precio_unitario} onChange={(e) => setMat({ ...mat, precio_unitario: e.target.value })} />
          <button type="submit">Agregar material</button>
        </form>
      )}

      {inicial && (
        <div className="row">
          <button onClick={calcular}>Calcular costo</button>
          <button onClick={cotizar}>Generar cotización</button>
        </div>
      )}
      {calculo && (
        <div className="card">
          <p>Materiales: {money(calculo.costo_materiales)} · Mano de obra: {money(calculo.costo_mano_obra)}</p>
          <p><strong>Total: {money(calculo.total)}</strong></p>
        </div>
      )}

      {ultima && (
        <>
          <h3>Cotización</h3>
          <DecisionCotizacion cotizacion={ultima} onDecidir={decidir} />
          {esVendedor && sol.estado === 'aceptada' && (
            <button onClick={() => vender(ultima.id)}>Registrar venta</button>
          )}
        </>
      )}
    </>
  );
}
