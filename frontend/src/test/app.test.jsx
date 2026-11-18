import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api } from '../services/api';
import { renderApp, USUARIOS } from './utils';

beforeEach(() => {
  vi.spyOn(api, 'get').mockImplementation((url) => Promise.resolve({ data: url === '/ventas' ? { total: 0, data: [], page: 1, limit: 10 } : [] }));
});
afterEach(() => vi.restoreAllMocks());

describe('App: rutas y roles', () => {
  test('sin sesión redirige al login', async () => {
    renderApp(<App />, { ruta: '/solicitudes' });
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  test('el login correcto lleva al inicio', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { token: 'jwt', usuario: USUARIOS.vendedor } });
    renderApp(<App />, { ruta: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'v@x.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Hola, Vera')).toBeInTheDocument();
  });

  test('con sesión activa, /login redirige al inicio', async () => {
    renderApp(<App />, { ruta: '/login', usuario: USUARIOS.vendedor });
    expect(await screen.findByText('Hola, Vera')).toBeInTheDocument();
  });

  test('el Administrador ve todo el menú y puede cerrar sesión', async () => {
    renderApp(<App />, { ruta: '/', usuario: USUARIOS.admin });
    for (const texto of ['Inicio', 'Solicitudes', 'Clientes', 'Ventas', 'Usuarios', 'Monitoreo']) {
      expect(await screen.findByRole('link', { name: texto })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  test('el Cliente solo ve Inicio y Solicitudes, y recibe 403 en rutas ajenas', async () => {
    renderApp(<App />, { ruta: '/usuarios', usuario: USUARIOS.cliente });
    expect(await screen.findByText(/403/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitudes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ventas' })).not.toBeInTheDocument();
  });

  test('rutas desconocidas llevan al inicio', async () => {
    renderApp(<App />, { ruta: '/no-existe', usuario: USUARIOS.encargado });
    expect(await screen.findByText('Hola, Edgar')).toBeInTheDocument();
  });
});
