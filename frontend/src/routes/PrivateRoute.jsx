import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Protege rutas por sesión y rol (el Administrador accede a todo). */
export default function PrivateRoute({ roles, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && usuario.rol !== 'Administrador' && !roles.includes(usuario.rol)) {
    return (
      <div className="card" role="alert">
        <h2>403 · Sin permiso</h2>
        <p>Su rol ({usuario.rol}) no puede acceder a esta sección.</p>
      </div>
    );
  }
  return children;
}
