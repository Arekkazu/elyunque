import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UsuariosPage from './pages/UsuariosPage';
import ClientesPage from './pages/ClientesPage';
import SolicitudesPage from './pages/SolicitudesPage';
import SolicitudDetallePage from './pages/SolicitudDetallePage';
import EstadoPage from './pages/EstadoPage';
import VentasPage from './pages/VentasPage';

const STAFF = ['Vendedor', 'Encargado'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/solicitudes" element={<PrivateRoute roles={[...STAFF, 'Cliente']}><SolicitudesPage /></PrivateRoute>} />
        <Route path="/solicitudes/:id" element={<PrivateRoute roles={STAFF}><SolicitudDetallePage /></PrivateRoute>} />
        <Route path="/estado/:id" element={<PrivateRoute roles={[...STAFF, 'Cliente']}><EstadoPage /></PrivateRoute>} />
        <Route path="/clientes" element={<PrivateRoute roles={STAFF}><ClientesPage /></PrivateRoute>} />
        <Route path="/ventas" element={<PrivateRoute roles={['Vendedor']}><VentasPage /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute roles={[]}><UsuariosPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/solicitudes" replace />} />
    </Routes>
  );
}
