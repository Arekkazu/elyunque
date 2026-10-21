require('dotenv').config();
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en las variables de entorno');
  process.exit(1);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API El Yunque escuchando en :${port} (docs en /api-docs)`));
