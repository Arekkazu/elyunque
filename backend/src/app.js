const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const requestLogger = require('./middlewares/requestLogger');
const { metricsMiddleware } = require('./middlewares/metrics');
const { apiLimiter } = require('./middlewares/rateLimit');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás de Nginx: toma la IP real del cliente

// Cabeceras de seguridad (HSTS, nosniff, X-Frame-Options, CSP...). Swagger UI necesita
// scripts en línea, por lo que /api-docs usa Helmet sin CSP.
const helmetApi = helmet();
const helmetDocs = helmet({ contentSecurityPolicy: false });
app.use((req, res, next) => (req.path.startsWith('/api-docs') ? helmetDocs : helmetApi)(req, res, next));

// CORS con lista blanca de orígenes (separados por coma en CORS_ORIGIN).
const origenes = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: origenes }));

app.use(express.json({ limit: '100kb' }));
app.use(metricsMiddleware);
app.use(requestLogger);

app.use(require('./routes/monitoreo')); // /health, /metrics, /monitoreo/logs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use(apiLimiter);
app.use('/auth', require('./routes/auth'));
app.use('/usuarios', require('./routes/usuarios'));
app.use('/clientes', require('./routes/clientes'));
app.use('/solicitudes', require('./routes/solicitudes'));
app.use('/cotizaciones', require('./routes/cotizaciones'));
app.use('/ventas', require('./routes/ventas'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
