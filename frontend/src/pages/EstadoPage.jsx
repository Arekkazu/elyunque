import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, mensajeError, money } from '../services/api';
import EstadoStepper from '../components/EstadoStepper';

export default function EstadoPage() {
  const { id } = useParams();
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/solicitudes/${id}/estado`).then((r) => setEstado(r.data)).catch((e) => setError(mensajeError(e)));
  }, [id]);

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!estado) return <p>Cargando…</p>;
  return (
    <div className="card">
      <h2>Solicitud #{estado.solicitud_id}</h2>
      <EstadoStepper estado={estado.estado} />
      <p>Última actualización: {new Date(estado.actualizado).toLocaleString('es-CO')}</p>
      {estado.cotizacion && (
        <p>Cotización {estado.cotizacion.consecutivo}: {money(estado.cotizacion.total)} ({estado.cotizacion.estado})</p>
      )}
      {estado.venta && <p>Venta registrada por {money(estado.venta.total)}</p>}
      <Link to="/solicitudes">← Volver</Link>
    </div>
  );
}
