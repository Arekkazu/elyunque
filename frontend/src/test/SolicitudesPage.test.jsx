import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SolicitudesPage from '../pages/SolicitudesPage';
import { api } from '../services/api';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: 'Vendedor', nombre: 'V' } }) }));

const solicitudes = [
  { id: 1, cliente_id: 1, cliente_nombre: 'Ana', descripcion: 'Reja', estado: 'inicial' },
  { id: 2, cliente_id: 2, cliente_nombre: 'Luis', descripcion: 'Portón', estado: 'cotizada' },
];

beforeEach(() => {
  vi.spyOn(api, 'get').mockImplementation((url) =>
    Promise.resolve({ data: url === '/clientes' ? [{ id: 1, nombre: 'Ana' }] : solicitudes })
  );
});

describe('SolicitudesPage', () => {
  test('lista las solicitudes con su estado', async () => {
    render(<MemoryRouter><SolicitudesPage /></MemoryRouter>);
    expect(await screen.findByText('Reja')).toBeInTheDocument();
    expect(screen.getByText('Portón')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'cotizada' })).toBeInTheDocument();
  });

  test('filtra por estado enviando el parámetro al API', async () => {
    render(<MemoryRouter><SolicitudesPage /></MemoryRouter>);
    await screen.findByText('Reja');
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'cotizada');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(api.get).toHaveBeenLastCalledWith('/solicitudes', { params: { estado: 'cotizada' } });
  });

  test('crea una solicitud', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    render(<MemoryRouter><SolicitudesPage /></MemoryRouter>);
    await screen.findByText('Reja');
    await userEvent.selectOptions(screen.getByLabelText('Cliente'), '1');
    await userEvent.type(screen.getByPlaceholderText('Descripción'), 'Escalera');
    await userEvent.click(screen.getByRole('button', { name: 'Crear solicitud' }));
    expect(post).toHaveBeenCalledWith('/solicitudes', { cliente_id: 1, descripcion: 'Escalera', horas_estimadas: 0 });
  });
});
