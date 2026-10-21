import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensajeError } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADOS = ['inicial', 'cotizada', 'aceptada', 'rechazada', 'cancelada', 'vendida'];

export default function SolicitudesPage() {
  const { usuario } = useAuth();
  const puedeCrear = ['Administrador', 'Vendedor'].includes(usuario.rol);
  const esCliente = usuario.rol === 'Cliente';
  const [solicitudes, setSolicitudes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', desde: '', hasta: '' });
  const [form, setForm] = useState({ cliente_id: '', descripcion: '', horas_estimadas: 0 });
  const [error, setError] = useState('');

  const cargar = () => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    return api.get('/solicitudes', { params }).then((r) => setSolicitudes(r.data)).catch((e) => setError(mensajeError(e)));
  };
  useEffect(() => {
    cargar();
    if (!esCliente) api.get('/clientes').then((r) => setClientes(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/solicitudes', { ...form, cliente_id: Number(form.cliente_id) });
      setForm({ cliente_id: '', descripcion: '', horas_estimadas: 0 });
      cargar();
    } catch (err) { setError(mensajeError(err)); }
  }

  const setF = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });
  return (
    <>
      <h2>{esCliente ? 'Mis solicitudes' : 'Solicitudes'}</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="row">
        <select aria-label="Estado" value={filtros.estado} onChange={setF('estado')}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" aria-label="Desde" value={filtros.desde} onChange={setF('desde')} />
        <input type="date" aria-label="Hasta" value={filtros.hasta} onChange={setF('hasta')} />
        <button onClick={cargar}>Filtrar</button>
      </div>
      {puedeCrear && (
        <form className="card row" onSubmit={crear}>
          <select aria-label="Cliente" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
            <option value="">Cliente…</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
          <input type="number" min="0" step="0.5" aria-label="Horas estimadas" value={form.horas_estimadas} onChange={(e) => setForm({ ...form, horas_estimadas: e.target.value })} />
          <button type="submit">Crear solicitud</button>
        </form>
      )}
      <table>
        <thead><tr><th>#</th><th>Cliente</th><th>Descripción</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td><td>{s.cliente_nombre}</td><td>{s.descripcion}</td>
              <td><span className={`badge ${s.estado}`}>{s.estado}</span></td>
              <td><Link to={esCliente ? `/estado/${s.id}` : `/solicitudes/${s.id}`}>{esCliente ? 'Ver estado' : 'Abrir'}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
