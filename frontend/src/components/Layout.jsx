import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENU = [
  { to: '/', texto: 'Inicio', roles: ['Vendedor', 'Encargado', 'Cliente'], end: true },
  { to: '/solicitudes', texto: 'Solicitudes', roles: ['Vendedor', 'Encargado', 'Cliente'] },
  { to: '/clientes', texto: 'Clientes', roles: ['Vendedor', 'Encargado'] },
  { to: '/ventas', texto: 'Ventas', roles: ['Vendedor'] },
  { to: '/usuarios', texto: 'Usuarios', roles: [] },
  { to: '/monitoreo', texto: 'Monitoreo', roles: [] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const visibles = MENU.filter((m) => usuario.rol === 'Administrador' || m.roles.includes(usuario.rol));
  return (
    <>
      <header className="nav">
        <strong className="marca">EL YUNQUE</strong>
        <nav>
          {visibles.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.end}>{m.texto}</NavLink>
          ))}
        </nav>
        <span className="spacer" />
        <span className="usuario">{usuario.nombre} <small>{usuario.rol}</small></span>
        <button className="secondary" onClick={logout}>Cerrar sesión</button>
      </header>
      <main><Outlet /></main>
    </>
  );
}
