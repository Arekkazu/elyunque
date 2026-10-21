import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DecisionCotizacion from '../components/DecisionCotizacion';
import PrivateRoute from '../routes/PrivateRoute';
import { MemoryRouter } from 'react-router-dom';

const cot = { id: 5, consecutivo: 'COT-00005', costo_materiales: 20000, costo_mano_obra: 50000, total: 70000, estado: 'pendiente' };

describe('DecisionCotizacion', () => {
  test('acepta y rechaza una cotización pendiente', async () => {
    const onDecidir = vi.fn();
    render(<DecisionCotizacion cotizacion={cot} onDecidir={onDecidir} />);
    expect(screen.getByText(/COT-00005/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(onDecidir).toHaveBeenNthCalledWith(1, 5, 'aceptada');
    expect(onDecidir).toHaveBeenNthCalledWith(2, 5, 'rechazada');
  });

  test('no muestra botones si ya fue decidida', () => {
    render(<DecisionCotizacion cotizacion={{ ...cot, estado: 'aceptada' }} onDecidir={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: globalThis.__usuario }) }));

describe('PrivateRoute', () => {
  const ui = (roles) => (
    <MemoryRouter><PrivateRoute roles={roles}><p>secreto</p></PrivateRoute></MemoryRouter>
  );

  test('muestra 403 si el rol no está permitido', () => {
    globalThis.__usuario = { rol: 'Cliente' };
    render(ui(['Vendedor']));
    expect(screen.getByRole('alert')).toHaveTextContent('403');
  });

  test('permite el rol autorizado y al administrador', () => {
    globalThis.__usuario = { rol: 'Vendedor' };
    const { unmount } = render(ui(['Vendedor']));
    expect(screen.getByText('secreto')).toBeInTheDocument();
    unmount();
    globalThis.__usuario = { rol: 'Administrador' };
    render(ui([]));
    expect(screen.getByText('secreto')).toBeInTheDocument();
  });
});
