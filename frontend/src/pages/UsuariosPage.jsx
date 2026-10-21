import { useEffect, useState } from 'react';
import { api, mensajeError } from '../services/api';

const ROLES = ['Administrador', 'Vendedor', 'Encargado', 'Cliente'];
const VACIO = { nombre: '', email: '', password: '', rol: 'Vendedor' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  const cargar = () => api.get('/usuarios').then((r) => setUsuarios(r.data)).catch((e) => setError(mensajeError(e)));
  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', form);
      setForm(VACIO);
      cargar();
    } catch (err) { setError(mensajeError(err)); }
  }

  async function desactivar(id) {
    try { await api.patch(`/usuarios/${id}/desactivar`); cargar(); } catch (err) { setError(mensajeError(err)); }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <h2>Usuarios</h2>
      {error && <p role="alert" className="error">{error}</p>}
      <form className="card row" onSubmit={crear}>
        <input placeholder="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Contraseña (mín. 8)" value={form.password} onChange={set('password')} required />
        <select value={form.rol} onChange={set('rol')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        <button type="submit">Crear</button>
      </form>
      <table>
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td><td>{u.activo ? 'Activo' : 'Inactivo'}</td>
              <td>{u.activo && <button className="secondary" onClick={() => desactivar(u.id)}>Desactivar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
