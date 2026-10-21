import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENU = [
  { to: '/solicitudes', texto: 'Solicitudes', roles: ['Vendedor', 'Encargado', 'Cliente'] },
  { to: '/clientes', texto: 'Clientes', roles: ['Vendedor', 'Encargado'] },
  { to: '/ventas', texto: 'Ventas', roles: ['Vendedor'] },
  { to: '/usuarios', texto: 'Usuarios', roles: [] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const visibles = MENU.filter((m) => usuario.rol === 'Administrador' || m.roles.includes(usuario.rol));
  return (
    <>
      <header className="nav">
        <strong>El Yunque</strong>
        <nav>
          {visibles.map((m) => (
            <NavLink key={m.to} to={m.to}>{m.texto}</NavLink>
          ))}
        </nav>
        <span className="spacer" />
        <span>{usuario.nombre} ({usuario.rol})</span>
        <button className="secondary" onClick={logout}>Cerrar sesión</button>
      </header>
      <main><Outlet /></main>
    </>
  );
}
