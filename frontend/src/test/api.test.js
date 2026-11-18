import { api, mensajeError, money, navegar } from '../services/api';
import { fechaHora, formatearUptime } from '../services/format';

const interceptorRespuesta = () => api.interceptors.response.handlers[0];
const interceptorPeticion = () => api.interceptors.request.handlers[0];

describe('api', () => {
  beforeEach(() => localStorage.clear());

  test('adjunta el JWT guardado en cada petición', () => {
    localStorage.setItem('token', 'abc');
    expect(interceptorPeticion().fulfilled({ headers: {} }).headers.Authorization).toBe('Bearer abc');
    localStorage.clear();
    expect(interceptorPeticion().fulfilled({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  test('401 cierra la sesión y redirige al login', async () => {
    const ir = vi.spyOn(navegar, 'aLogin').mockImplementation(() => {});
    localStorage.setItem('token', 'abc');
    localStorage.setItem('usuario', '{}');
    await expect(interceptorRespuesta().rejected({ response: { status: 401 }, config: { url: '/clientes' } })).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(ir).toHaveBeenCalled();
  });

  test('401 en el propio login no redirige (credenciales incorrectas)', async () => {
    const ir = vi.spyOn(navegar, 'aLogin').mockImplementation(() => {});
    ir.mockClear();
    await expect(interceptorRespuesta().rejected({ response: { status: 401 }, config: { url: '/auth/login' } })).rejects.toBeDefined();
    expect(ir).not.toHaveBeenCalled();
  });

  test('403 marca el error como prohibido y las respuestas correctas pasan', async () => {
    const err = { response: { status: 403 }, config: { url: '/usuarios' } };
    await expect(interceptorRespuesta().rejected(err)).rejects.toMatchObject({ forbidden: true });
    expect(interceptorRespuesta().fulfilled({ data: 1 })).toEqual({ data: 1 });
  });

  test('mensajeError prioriza campos inválidos, luego el error del servidor, luego un texto genérico', () => {
    expect(mensajeError({ response: { data: { error: 'Datos inválidos', campos: [{ campo: 'nombre', mensaje: 'es obligatorio' }] } } }))
      .toBe('Datos inválidos: nombre es obligatorio');
    expect(mensajeError({ response: { data: { error: 'Ya existe' } } })).toBe('Ya existe');
    expect(mensajeError({})).toBe('No se pudo completar la operación');
  });

  test('money da formato de pesos colombianos', () => {
    expect(money(70000)).toMatch(/70\.000/);
  });
});

describe('format', () => {
  test('formatearUptime', () => {
    expect(formatearUptime(45)).toBe('0 min 45 s');
    expect(formatearUptime(3 * 3600 + 120)).toBe('3 h 2 min');
    expect(formatearUptime(2 * 86400 + 5 * 3600)).toBe('2 d 5 h');
  });

  test('fechaHora', () => {
    expect(fechaHora(null)).toBe('—');
    expect(fechaHora('2026-11-18T12:00:00Z')).toMatch(/2026/);
  });
});
