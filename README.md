# El Yunque — Sistema de gestión del taller

Monorepo con la API (Node.js/Express + PostgreSQL) y el frontend (React + Vite).
Implementa lo completado en los Sprints 1–3 del Jira (proyecto ELYUNQUE): backend, base de datos, JWT/roles, Swagger, frontend React y pruebas.

```
backend/    API REST, migraciones, seed, Swagger, colección Postman, pruebas (Jest + Supertest)
frontend/   SPA React (Router, AuthContext, axios), pruebas (Vitest + Testing Library), Nginx
docker-compose.yml   PostgreSQL + backend + frontend
```

## Arranque con Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:3000 · Swagger: http://localhost:3000/api-docs

Usuarios demo (solo con `SEED_ON_START=true`):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@elyunque.com | Admin123! |
| Vendedor | vendedor@elyunque.com | Vendedor123! |
| Encargado | encargado@elyunque.com | Encargado123! |
| Cliente | cliente@elyunque.com | Cliente123! |

**Cambie `JWT_SECRET` y desactive el seed en producción.**

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
cd backend && npm test    # crea/usa la BD elyunque_test; umbral de cobertura 80%
cd frontend && npm test
```

## Flujo de negocio

`inicial → cotizada → aceptada | rechazada → vendida` (también `cancelada`).
Costo = materiales + horas × `tarifa_hora` (tabla `parametros`). Cada cotización tiene un consecutivo único (`COT-00001`); solo una cotización aceptada puede convertirse en venta.

## Roles

| Rol | Acceso |
|---|---|
| Administrador | Todo, incluida la gestión de usuarios |
| Vendedor | Clientes, solicitudes, cotizaciones, decisión y ventas |
| Encargado | Consulta de clientes/solicitudes, materiales, cálculo y cotizaciones |
| Cliente | Consulta del estado de sus propias solicitudes |

La colección Postman está en `backend/postman/` (regenerar con `npm run postman`).

## Pendiente (Sprints 4–7)

CI con GitHub Actions, despliegue en VPS, seguridad (validación, Helmet, rate limit) y observabilidad.
