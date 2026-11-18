# El Yunque — Sistema de gestión del taller

[![CI](https://github.com/Arekkazu/elyunque/actions/workflows/ci.yml/badge.svg)](https://github.com/Arekkazu/elyunque/actions/workflows/ci.yml)

Monorepo con la API (Node.js/Express + PostgreSQL) y el frontend (React + Vite). Cubre el ciclo DevSecOps completo del proyecto (Jira ELYUNQUE, Sprints 1–7): backend, frontend, pruebas, CI/CD, seguridad y observabilidad.

```
backend/              API REST, migraciones, seed, Swagger, Postman, pruebas (Jest + Supertest)
frontend/             SPA React (Router, AuthContext, axios), pruebas (Vitest + Testing Library), Nginx
docker-compose.yml        Desarrollo/demo: PostgreSQL + backend + frontend
docker-compose.prod.yml   Producción en VPS (imágenes de GHCR)
.github/workflows/    ci.yml (pruebas, cobertura, auditoría, build) y cd.yml (despliegue por SSH)
deploy/               Preparación del VPS y variables de producción
docs/                 Reporte de seguridad, diagramas UML (PlantUML), capturas y reportes HTML de cobertura
```

## Arranque con Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:8080 (la API se consume en `/api`)
- API: http://localhost:3000 · Swagger: http://localhost:3000/api-docs · Salud: http://localhost:3000/health

Usuarios demo (solo con `SEED_ON_START=true`):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@elyunque.com | Admin123! |
| Vendedor | vendedor@elyunque.com | Vendedor123! |
| Encargado | encargado@elyunque.com | Encargado123! |
| Cliente | cliente@elyunque.com | Cliente123! |

**En producción: cambie `JWT_SECRET`, las contraseñas y use `SEED_ON_START=false`.**

## Desarrollo local

```bash
# Backend (requiere PostgreSQL)
cd backend && cp .env.example .env && npm install
npm run migrate && npm run seed && npm run dev

# Frontend (proxy /api → localhost:3000)
cd frontend && npm install && npm run dev
```

## Pruebas

```bash
cd backend && npm test    # crea/usa la BD elyunque_test; falla si la cobertura baja de 80 %
cd frontend && npm test   # falla si la cobertura baja de 80 %
```

## Flujo de negocio

`inicial → cotizada → aceptada | rechazada → vendida` (también `cancelada`).
Costo = materiales + horas × `tarifa_hora` (tabla `parametros`). Cada cotización tiene un consecutivo único (`COT-00001`); solo una cotización aceptada puede convertirse en venta.

## Roles

| Rol | Acceso |
|---|---|
| Administrador | Todo, incluida la gestión de usuarios y el monitoreo |
| Vendedor | Clientes, solicitudes, cotizaciones, decisión y ventas |
| Encargado | Consulta de clientes/solicitudes, materiales, cálculo y cotizaciones |
| Cliente | Consulta del estado de sus propias solicitudes |

## Seguridad

Validación y sanitización (express-validator), Helmet, CORS con lista blanca, límite de intentos de login, JWT de máximo 8 h con revocación al desactivar usuarios y `npm audit` en CI. Detalle y estado OWASP en [docs/reporte-seguridad.md](docs/reporte-seguridad.md).

## Observabilidad

- `GET /health` (público): estado, conexión a la BD y uptime; responde 503 si la BD falla. Úselo en UptimeRobot (intervalo de 5 min, correo de alerta).
- `GET /metrics` y `GET /monitoreo/logs` (Administrador): peticiones, tiempo promedio, memoria y últimas entradas de `access.log` y `error.log` (JSON, en `backend/logs/` o el volumen `logs` de Docker).
- Panel **Monitoreo** en el frontend (rol Administrador).

## CI/CD

- **CI** (`ci.yml`): en cada push y PR ejecuta `install`, `test-backend` (con PostgreSQL), `test-frontend`, `security-audit` y `docker-build`; publica los reportes de cobertura como artefactos. Para bloquear el merge con pruebas fallidas, active *Branch protection* en `main` y marque esos jobs como obligatorios.
- **CD** (`cd.yml`): cuando el CI de `main` termina bien, publica las imágenes en GHCR y despliega en el VPS por SSH (`docker compose -f docker-compose.prod.yml pull && up -d`), verificando `/api/health`.
- Secrets requeridos en GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Preparación del servidor: `sudo bash deploy/setup-vps.sh <usuario>` y `deploy/.env.production.example`.
