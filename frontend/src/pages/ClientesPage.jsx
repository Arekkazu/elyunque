import { useEffect, useState } from 'react';
import { api, mensajeError } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VACIO = { nombre: '', documento: '', telefono: '', email: '', direccion: '' };

export default function ClientesPage() {
  const { usuario } = useAuth();
  const puedeEditar = ['Administrador', 'Vendedor'].includes(usuario.rol);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  const cargar = () =>
    api.get('/clientes', { params: { q: q || undefined } }).then((r) => setClientes(r.data)).catch((e) => setError(mensajeError(e)));
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(e) {
    e.preventDefault();
    setError('');
    try { await api.post('/clientes', form); setForm(VACIO); cargar(); } catch (err) { setError(mensajeError(err)); }
  }
  async function desactivar(id) {
    try { await api.delete(`/clientes/${id}`); cargar(); } catch (err) { setError(mensajeError(err)); }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>Clientes</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="row">
        <input placeholder="Buscar por nombre o documento" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={cargar}>Buscar</button>
      </div>
      {puedeEditar && (
        <form className="card row" onSubmit={crear}>
          <input placeholder="Nombre" value={form.nombre} onChange={set('nombre')} required />
          <input placeholder="Documento" value={form.documento} onChange={set('documento')} required />
          <input placeholder="Teléfono" value={form.telefono} onChange={set('telefono')} />
          <input placeholder="Email" value={form.email} onChange={set('email')} />
          <button type="submit">Crear cliente</button>
        </form>
      )}
      <table>
        <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Email</th><th /></tr></thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td><td>{c.documento}</td><td>{c.telefono}</td><td>{c.email}</td>
              <td>{puedeEditar && <button className="secondary" onClick={() => desactivar(c.id)}>Desactivar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
