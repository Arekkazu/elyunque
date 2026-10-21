// Prepara la base de datos de pruebas (separada de la de desarrollo): crea si no existe, migra y siembra.
module.exports = async () => {
  require('./env');
  const { Client } = require('pg');
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const { migrate } = require('../src/db/migrate');
  const { seed } = require('../src/db/seed');
  const { pool } = require('../src/config/db');
  await migrate();
  await seed();
  await pool.end();
};
