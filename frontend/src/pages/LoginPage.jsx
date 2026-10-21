import { Navigate, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  if (usuario) return <Navigate to="/solicitudes" replace />;
  return <LoginForm onLogin={async (e, p) => { await login(e, p); navigate('/solicitudes'); }} />;
}
