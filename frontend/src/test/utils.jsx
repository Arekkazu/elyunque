import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

export const USUARIOS = {
  admin: { id: 1, nombre: 'Ana Admin', rol: 'Administrador' },
  vendedor: { id: 2, nombre: 'Vera Vendedora', rol: 'Vendedor' },
  encargado: { id: 3, nombre: 'Edgar Encargado', rol: 'Encargado' },
  cliente: { id: 4, nombre: 'Carla Cliente', rol: 'Cliente' },
};

/** Renderiza con sesión (o sin ella) y enrutador en memoria. `path` define la ruta con parámetros. */
export function renderApp(ui, { usuario = null, ruta = '/', path } = {}) {
  localStorage.clear();
  if (usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('token', 'token-de-prueba');
  }
  const contenido = path ? (
    <Routes><Route path={path} element={ui} /></Routes>
  ) : ui;
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>{contenido}</AuthProvider>
    </MemoryRouter>
  );
}
