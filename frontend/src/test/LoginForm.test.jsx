import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../components/LoginForm';

describe('LoginForm', () => {
  test('valida campos vacíos sin llamar al login', async () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ingrese email y contraseña');
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('envía las credenciales', async () => {
    const onLogin = vi.fn().mockResolvedValue();
    render(<LoginForm onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'secreta');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(onLogin).toHaveBeenCalledWith('a@b.com', 'secreta');
  });

  test('muestra el error del servidor', async () => {
    const onLogin = vi.fn().mockRejectedValue({ response: { data: { error: 'Credenciales inválidas' } } });
    render(<LoginForm onLogin={onLogin} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'mala');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });
});
