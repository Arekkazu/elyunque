import { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Ingrese email y contraseña');
      return;
    }
    setCargando(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={submit} className="card login">
      <h1>El Yunque</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  );
}
