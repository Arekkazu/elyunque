CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('Administrador','Vendedor','Encargado','Cliente')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  documento VARCHAR(30) NOT NULL UNIQUE,
  telefono VARCHAR(30),
  email VARCHAR(150),
  direccion VARCHAR(200),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Precios y tarifas parametrizados (ej. tarifa_hora)
CREATE TABLE IF NOT EXISTS parametros (
  clave VARCHAR(50) PRIMARY KEY,
  valor NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  descripcion TEXT NOT NULL,
  horas_estimadas NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (horas_estimadas >= 0),
  estado VARCHAR(15) NOT NULL DEFAULT 'inicial'
    CHECK (estado IN ('inicial','cotizada','aceptada','rechazada','cancelada','vendida')),
  created_by INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON solicitudes(cliente_id);

CREATE TABLE IF NOT EXISTS materiales_solicitud (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,2) NOT NULL CHECK (precio_unitario >= 0)
);

CREATE SEQUENCE IF NOT EXISTS cotizacion_consecutivo_seq START 1;

CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),
  consecutivo VARCHAR(20) NOT NULL UNIQUE,
  costo_materiales NUMERIC(14,2) NOT NULL,
  costo_mano_obra NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','rechazada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decidida_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL UNIQUE REFERENCES cotizaciones(id),
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),
  total NUMERIC(14,2) NOT NULL,
  vendedor_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
