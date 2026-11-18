import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../services/api';
import { renderApp, USUARIOS } from './utils';
import SolicitudDetallePage from '../pages/SolicitudDetallePage';
import MonitoreoPage from '../pages/MonitoreoPage';

afterEach(() => vi.restoreAllMocks());

const base = {
  id: 7, cliente_nombre: 'Ana', descripcion: 'Reja metálica', horas_estimadas: 2, estado: 'inicial',
  materiales: [{ id: 1, nombre: 'Varilla', cantidad: 4, precio_unitario: 5000 }], cotizaciones: [],
};
const cotizacion = { id: 9, consecutivo: 'COT-00009', costo_materiales: 20000, costo_mano_obra: 50000, total: 70000, estado: 'pendiente' };
const ruta = { ruta: '/solicitudes/7', path: '/solicitudes/:id' };
const montar = (sol, rol = 'vendedor') => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: sol });
  return renderApp(<SolicitudDetallePage />, { usuario: USUARIOS[rol], ...ruta });
};

describe('SolicitudDetallePage', () => {
  test('flujo inicial: agregar material, calcular y generar cotización', async () => {
    const post = vi.spyOn(api, 'post').mockImplementation((url) =>
      Promise.resolve({ data: url.endsWith('/calcular') ? { costo_materiales: 20000, costo_mano_obra: 50000, total: 70000 } : {} }));
    montar(base);
    expect(await screen.findByText('Solicitud #7')).toBeInTheDocument();
    expect(screen.getByText('Varilla')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Material'), 'Lámina');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar material' }));
    expect(post).toHaveBeenCalledWith('/solicitudes/7/materiales', { nombre: 'Lámina', cantidad: 1, precio_unitario: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Calcular costo' }));
    expect(await screen.findByText(/Total: .*70\.000/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    expect(post).toHaveBeenCalledWith('/cotizaciones', { solicitud_id: 7 });
  });

  test('cotización pendiente: aceptar', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    montar({ ...base, estado: 'cotizada', cotizaciones: [cotizacion] });
    expect(await screen.findByText(/COT-00009/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Calcular costo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(patch).toHaveBeenCalledWith('/cotizaciones/9/decision', { decision: 'aceptada' });
  });

  test('cotización aceptada: registrar venta y cancelar', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    montar({ ...base, estado: 'aceptada', cotizaciones: [{ ...cotizacion, estado: 'aceptada' }] });
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar venta' }));
    expect(post).toHaveBeenCalledWith('/ventas', { cotizacion_id: 9 });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
    expect(patch).toHaveBeenCalledWith('/solicitudes/7/cancelar');
  });

  test('el Encargado no ve acciones de venta ni cancelar', async () => {
    montar({ ...base, estado: 'aceptada', cotizaciones: [{ ...cotizacion, estado: 'aceptada' }] }, 'encargado');
    await screen.findByText('Solicitud #7');
    expect(screen.queryByRole('button', { name: 'Registrar venta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar solicitud' })).not.toBeInTheDocument();
  });

  test('muestra errores del servidor en las acciones', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({ response: { data: { error: 'Solo se puede cotizar una solicitud en estado inicial' } } });
    montar(base);
    await userEvent.click(await screen.findByRole('button', { name: 'Generar cotización' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo se puede cotizar');
  });

  test('error al cargar la solicitud', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ response: { data: { error: 'Solicitud no encontrada' } } });
    renderApp(<SolicitudDetallePage />, { usuario: USUARIOS.vendedor, ...ruta });
    expect(await screen.findByRole('alert')).toHaveTextContent('Solicitud no encontrada');
  });
});

describe('MonitoreoPage', () => {
  const metricas = {
    peticiones: { total: 120, por_estado: { '2xx': 100, '3xx': 0, '4xx': 18, '5xx': 2 } },
    tiempo_promedio_ms: 4.5, memoria_mb: { rss: 80, heap_usado: 30, heap_total: 50 }, uptime_s: 90,
  };
  const logs = {
    access: [
      { timestamp: '2026-11-18T10:00:00Z', method: 'GET', path: '/health', status: 200, responseTimeMs: 1.2 },
      { timestamp: '2026-11-18T10:00:01Z', method: 'POST', path: '/auth/login', status: 401, responseTimeMs: 3 },
      { timestamp: '2026-11-18T10:00:02Z', method: 'GET', path: '/x', status: 500, responseTimeMs: 3 },
    ],
    errors: [{ timestamp: '2026-11-18T09:00:00Z', message: 'fallo de prueba', method: 'GET', path: '/x' }],
    ultimo_incidente: '2026-11-18T09:00:00Z',
  };
  const simular = (health) => vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url === '/health') return typeof health === 'function' ? health() : Promise.resolve({ data: health });
    return Promise.resolve({ data: url === '/metrics' ? metricas : logs });
  });

  test('servidor online con métricas y logs', async () => {
    simular({ status: 'ok', db: 'up', uptime_s: 3700 });
    renderApp(<MonitoreoPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByText('Online')).toBeInTheDocument();
    expect(screen.getByText('1 h 1 min')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('4.5 ms')).toBeInTheDocument();
    expect(screen.getByText('fallo de prueba')).toBeInTheDocument();
    expect(screen.getByText('/auth/login')).toBeInTheDocument();
  });

  test('base de datos caída (503) se muestra como offline', async () => {
    simular(() => Promise.reject({ response: { status: 503, data: { status: 'error', db: 'down' } } }));
    renderApp(<MonitoreoPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Base de datos: down')).toBeInTheDocument();
  });

  test('servidor inalcanzable y botón actualizar', async () => {
    const get = simular(() => Promise.reject(new Error('red')));
    renderApp(<MonitoreoPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    const antes = get.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(antes));
  });

  test('sin logs y error al cargar métricas', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) =>
      url === '/health' ? Promise.resolve({ data: { status: 'ok', db: 'up', uptime_s: 5 } }) : Promise.reject({ response: { data: { error: 'Sin permisos' } } }));
    renderApp(<MonitoreoPage />, { usuario: USUARIOS.admin });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin permisos');
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Sin errores registrados')).toBeInTheDocument();
  });
});
