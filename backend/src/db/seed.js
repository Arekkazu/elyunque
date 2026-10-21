require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const USUARIOS = [
  ['Administrador El Yunque', 'admin@elyunque.com', 'Admin123!', 'Administrador'],
  ['Vendedor Demo', 'vendedor@elyunque.com', 'Vendedor123!', 'Vendedor'],
  ['Encargado Demo', 'encargado@elyunque.com', 'Encargado123!', 'Encargado'],
  ['Cliente Demo', 'cliente@elyunque.com', 'Cliente123!', 'Cliente'],
];

async function seed() {
  for (const [nombre, email, pass, rol] of USUARIOS) {
    const hash = await bcrypt.hash(pass, 10);
    await pool.query(
      `INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      [nombre, email, hash, rol]
    );
  }
  await pool.query(
    `INSERT INTO parametros(clave,valor) VALUES ('tarifa_hora', 25000)
     ON CONFLICT (clave) DO NOTHING`
  );
  await pool.query(
    `INSERT INTO clientes(nombre,documento,telefono,email,usuario_id)
     SELECT 'Cliente Demo','900000001','3000000000','cliente@elyunque.com',id
     FROM usuarios WHERE email='cliente@elyunque.com'
     ON CONFLICT (documento) DO NOTHING`
  );
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completado');
      return pool.end();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
