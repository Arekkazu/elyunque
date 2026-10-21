import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const INACTIVIDAD_MS = 30 * 60 * 1000; // cierre de sesión por inactividad

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuario);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;
    let timer;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVIDAD_MS);
    };
    const eventos = ['mousemove', 'keydown', 'click'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar));
    reiniciar();
    return () => {
      clearTimeout(timer);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [usuario, logout]);

  const value = useMemo(() => ({ usuario, login, logout }), [usuario, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
