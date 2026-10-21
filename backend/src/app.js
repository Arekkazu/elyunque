const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use('/auth', require('./routes/auth'));
app.use('/usuarios', require('./routes/usuarios'));
app.use('/clientes', require('./routes/clientes'));
app.use('/solicitudes', require('./routes/solicitudes'));
app.use('/cotizaciones', require('./routes/cotizaciones'));
app.use('/ventas', require('./routes/ventas'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
