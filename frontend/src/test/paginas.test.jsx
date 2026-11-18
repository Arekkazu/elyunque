import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../services/api';
import { renderApp, USUARIOS } from './utils';
import UsuariosPage from '../pages/UsuariosPage';
import ClientesPage from '../pages/ClientesPage';
import VentasPage from '../pages/VentasPage';
import EstadoPage from '../pages/EstadoPage';
import InicioPage from '../pages/InicioPage';

afterEach(() => vi.restoreAllMocks());

describe('UsuariosPage', () => {
  const usuarios = [
    { id: 1, nombre: 'Ana Admin', email: 'ana@x.com', rol: 'Administrador', activo: true },
    { id: 2, nombre: 'Beto', email: 'beto@x.com', rol: 'Vendedor', activo: false },
  ];

  test('lista, crea y desactiva usuarios', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: usuarios });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    renderApp(<UsuariosPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByText('beto@x.com')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Nuevo');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'n@x.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña (mín. 8)'), 'Clave12345');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Encargado');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(post).toHaveBeenCalledWith('/usuarios', { nombre: 'Nuevo', email: 'n@x.com', password: 'Clave12345', rol: 'Encargado' });

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(patch).toHaveBeenCalledWith('/usuarios/1/desactivar');
  });

  test('muestra los errores del servidor', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    vi.spyOn(api, 'post').mockRejectedValue({ response: { data: { error: 'El registro ya existe' } } });
    renderApp(<UsuariosPage />, { usuario: USUARIOS.admin });
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'N');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'n@x.com');
    await userEvent.type(screen.getByPlaceholderText('Contraseña (mín. 8)'), 'Clave12345');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El registro ya existe');
  });

  test('error al cargar y al desactivar', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { data: { error: 'Sin conexión' } } });
    renderApp(<UsuariosPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });

  test('error al desactivar', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: usuarios });
    vi.spyOn(api, 'patch').mockRejectedValue({ response: { data: { error: 'No puede desactivarse a sí mismo' } } });
    renderApp(<UsuariosPage />, { usuario: USUARIOS.admin });
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No puede desactivarse');
  });
});

describe('ClientesPage', () => {
  const clientes = [{ id: 1, nombre: 'Ana Pérez', documento: '123', telefono: '300', email: 'a@x.com' }];

  test('Vendedor busca, crea y desactiva clientes', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: clientes });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const del = vi.spyOn(api, 'delete').mockResolvedValue({});
    renderApp(<ClientesPage />, { usuario: USUARIOS.vendedor });
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre o documento'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(get).toHaveBeenLastCalledWith('/clientes', { params: { q: 'Ana' } });

    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Luis');
    await userEvent.type(screen.getByPlaceholderText('Documento'), '999');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(post).toHaveBeenCalledWith('/clientes', expect.objectContaining({ nombre: 'Luis', documento: '999' }));

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(del).toHaveBeenCalledWith('/clientes/1');
  });

  test('el Encargado solo consulta (sin formulario ni acciones)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: clientes });
    renderApp(<ClientesPage />, { usuario: USUARIOS.encargado });
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear cliente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
  });

  test('muestra errores al crear y al desactivar', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: clientes });
    vi.spyOn(api, 'post').mockRejectedValue({ response: { data: { error: 'El registro ya existe' } } });
    vi.spyOn(api, 'delete').mockRejectedValue({ response: { data: { error: 'No permitido' } } });
    renderApp(<ClientesPage />, { usuario: USUARIOS.vendedor });
    await screen.findByText('Ana Pérez');
    await userEvent.type(screen.getByPlaceholderText('Nombre'), 'Luis');
    await userEvent.type(screen.getByPlaceholderText('Documento'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El registro ya existe');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No permitido'));
  });

  test('error al cargar la lista', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({});
    renderApp(<ClientesPage />, { usuario: USUARIOS.vendedor });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la operación');
  });
});

describe('VentasPage', () => {
  const venta = { id: 1, consecutivo: 'COT-00001', cliente_nombre: 'Ana', total: 70000, created_at: '2026-11-01T10:00:00Z' };

  test('lista con filtros y paginación', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [venta], page: 1, limit: 10, total: 25 } });
    renderApp(<VentasPage />, { usuario: USUARIOS.vendedor });
    expect(await screen.findByText('COT-00001')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(get).toHaveBeenLastCalledWith('/ventas', { params: { page: 2 } });

    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-01');
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-30');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(get).toHaveBeenLastCalledWith('/ventas', { params: { page: 1, desde: '2026-11-01', hasta: '2026-11-30' } });
  });

  test('muestra el error de carga', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { data: { error: 'Sin permisos' } } });
    renderApp(<VentasPage />, { usuario: USUARIOS.vendedor });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin permisos');
  });
});

describe('EstadoPage', () => {
  const ruta = { ruta: '/estado/5', path: '/estado/:id' };

  test('el cliente ve el progreso, la cotización y la venta', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        solicitud_id: 5, estado: 'vendida', actualizado: '2026-11-01T10:00:00Z',
        cotizacion: { consecutivo: 'COT-00007', total: 70000, estado: 'aceptada' },
        venta: { id: 1, total: 70000 },
      },
    });
    renderApp(<EstadoPage />, { usuario: USUARIOS.cliente, ...ruta });
    expect(await screen.findByText('Solicitud #5')).toBeInTheDocument();
    expect(screen.getByText(/COT-00007/)).toBeInTheDocument();
    expect(screen.getByText(/Venta registrada/)).toBeInTheDocument();
    expect(screen.getByLabelText('Progreso de la solicitud')).toBeInTheDocument();
  });

  test('estado terminal sin cotización', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { solicitud_id: 5, estado: 'cancelada', actualizado: '2026-11-01T10:00:00Z', cotizacion: null, venta: null } });
    renderApp(<EstadoPage />, { usuario: USUARIOS.cliente, ...ruta });
    expect(await screen.findByRole('status')).toHaveTextContent('Cancelada');
  });

  test('403 si la solicitud es de otro cliente', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { data: { error: 'No tiene permisos para ver esta solicitud' } } });
    renderApp(<EstadoPage />, { usuario: USUARIOS.cliente, ...ruta });
    expect(await screen.findByRole('alert')).toHaveTextContent('No tiene permisos');
  });
});

describe('InicioPage', () => {
  const solicitudes = [
    { id: 1, cliente_nombre: 'Ana', descripcion: 'Reja', estado: 'inicial' },
    { id: 2, cliente_nombre: 'Luis', descripcion: 'Portón', estado: 'cotizada' },
    { id: 3, cliente_nombre: 'Eva', descripcion: 'Escalera', estado: 'vendida' },
  ];
  const mockGet = () => vi.spyOn(api, 'get').mockImplementation((url) =>
    Promise.resolve({ data: url === '/ventas' ? { total: 4, data: [] } : solicitudes }));

  test('el Vendedor ve indicadores y ventas', async () => {
    mockGet();
    renderApp(<InicioPage />, { usuario: USUARIOS.vendedor });
    expect(await screen.findByText('Solicitudes en curso')).toBeInTheDocument();
    const ventas = screen.getByText('Ventas registradas').closest('.stat');
    await waitFor(() => expect(within(ventas).getByText('4')).toBeInTheDocument());
    expect(screen.getByText('inicial: 1')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Abrir' })[0]).toHaveAttribute('href', '/solicitudes/1');
  });

  test('el Cliente no ve ventas y abre el estado', async () => {
    mockGet();
    renderApp(<InicioPage />, { usuario: USUARIOS.cliente });
    expect(await screen.findByText('Consulte el estado de sus trabajos.')).toBeInTheDocument();
    expect(screen.queryByText('Ventas registradas')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Abrir' })[0]).toHaveAttribute('href', '/estado/1');
  });

  test('sin solicitudes y con error', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const { unmount } = renderApp(<InicioPage />, { usuario: USUARIOS.encargado });
    expect(await screen.findByText('Aún no hay solicitudes.')).toBeInTheDocument();
    unmount();
    vi.spyOn(api, 'get').mockRejectedValue({ response: { data: { error: 'Falla' } } });
    renderApp(<InicioPage />, { usuario: USUARIOS.encargado });
    expect(await screen.findByRole('alert')).toHaveTextContent('Falla');
  });
});
