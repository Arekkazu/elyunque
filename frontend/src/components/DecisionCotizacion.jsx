import { money } from '../services/api';

/** Muestra la cotización y permite aceptarla o rechazarla mientras esté pendiente. */
export default function DecisionCotizacion({ cotizacion, onDecidir }) {
  return (
    <div className="card">
      <h3>Cotización {cotizacion.consecutivo}</h3>
      <p>Materiales: {money(cotizacion.costo_materiales)} · Mano de obra: {money(cotizacion.costo_mano_obra)}</p>
      <p><strong>Total: {money(cotizacion.total)}</strong></p>
      <p>Estado: <span className={`badge ${cotizacion.estado}`}>{cotizacion.estado}</span></p>
      {cotizacion.estado === 'pendiente' && (
        <div className="row">
          <button onClick={() => onDecidir(cotizacion.id, 'aceptada')}>Aceptar</button>
          <button className="secondary" onClick={() => onDecidir(cotizacion.id, 'rechazada')}>Rechazar</button>
        </div>
      )}
    </div>
  );
}
