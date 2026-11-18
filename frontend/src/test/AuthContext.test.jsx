import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function Sonda() {
  const { usuario, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="quien">{usuario ? usuario.nombre : 'nadie'}</p>
      <button onClick={() => login('a@b.com', 'x')}>entrar</button>
      <button onClick={logout}>salir</button>
    </div>
  );
}

const montar = () => render(<AuthProvider><Sonda /></AuthProvider>);

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  test('login guarda token y usuario; logout los borra', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { token: 'jwt', usuario: { id: 1, nombre: 'Ana', rol: 'Vendedor' } } });
    montar();
    await userEvent.click(screen.getByText('entrar'));
    expect(screen.getByTestId('quien')).toHaveTextContent('Ana');
    expect(localStorage.getItem('token')).toBe('jwt');
    await userEvent.click(screen.getByText('salir'));
    expect(screen.getByTestId('quien')).toHaveTextContent('nadie');
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('restaura la sesión guardada y tolera datos corruptos', () => {
    localStorage.setItem('usuario', JSON.stringify({ nombre: 'Guardada' }));
    const { unmount } = montar();
    expect(screen.getByTestId('quien')).toHaveTextContent('Guardada');
    unmount();
    localStorage.setItem('usuario', '{no es json');
    montar();
    expect(screen.getAllByTestId('quien').pop()).toHaveTextContent('nadie');
  });

  test('cierra la sesión tras 30 minutos de inactividad', () => {
    vi.useFakeTimers();
    localStorage.setItem('usuario', JSON.stringify({ nombre: 'Ana' }));
    localStorage.setItem('token', 'jwt');
    montar();
    act(() => { vi.advanceTimersByTime(29 * 60 * 1000); });
    expect(screen.getByTestId('quien')).toHaveTextContent('Ana');
    act(() => { window.dispatchEvent(new Event('mousemove')); }); // actividad: reinicia el contador
    act(() => { vi.advanceTimersByTime(29 * 60 * 1000); });
    expect(screen.getByTestId('quien')).toHaveTextContent('Ana');
    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); });
    expect(screen.getByTestId('quien')).toHaveTextContent('nadie');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
