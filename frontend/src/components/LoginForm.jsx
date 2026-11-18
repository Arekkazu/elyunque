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
    <div className="login-pagina">
    <form onSubmit={submit} className="card login">
      <h1 className="marca-grande">EL YUNQUE</h1>
      <p className="muted">Gestión del taller de metalistería</p>
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
    </div>
  );
}
