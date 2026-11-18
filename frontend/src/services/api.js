import axios from 'axios';

// Redirección aislada para poder simularla en pruebas
export const navegar = { aLogin: () => window.location.assign('/login') };

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Adjunta el JWT en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401: sesión inválida/expirada → login. 403: se marca para mostrar "sin permiso".
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const esLogin = error.config?.url?.includes('/auth/login');
    if (status === 401 && !esLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') navegar.aLogin();
    }
    if (status === 403) error.forbidden = true;
    return Promise.reject(error);
  }
);

export const mensajeError = (e) => {
  const data = e.response?.data;
  if (data?.campos?.length) return `${data.error}: ${data.campos.map((c) => `${c.campo} ${c.mensaje}`).join('; ')}`;
  return data?.error || 'No se pudo completar la operación';
};
export const money = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));
