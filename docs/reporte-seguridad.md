# Reporte de seguridad — El Yunque

Fecha: 18 de noviembre de 2026. Alcance: backend (Node.js/Express + PostgreSQL), frontend (React) y contenedores.

## 1. Análisis de dependencias (`npm audit`)

| Proyecto | Hallazgos iniciales (producción) | Acción | Resultado producción |
|---|---|---|---|
| backend | `body-parser` < 1.20.9, alta (denegación de servicio) | `npm audit fix` | 0 vulnerabilidades |
| frontend | `follow-redirects` 1.16.0–1.16.1, alta; `react-router` ≤ 7.17.0, moderadas (redirección abierta) | `npm audit fix` y actualización a `react-router-dom` 7 | 0 vulnerabilidades |

Dependencias de desarrollo (no se incluyen en las imágenes Docker): quedan 38 hallazgos en backend (34 altos, 4 moderados) y 7 altos en frontend. Todos provienen de `picomatch` y utilidades de pruebas/compilación (Jest, Vite, Vitest); no hay versión corregida publicada. Riesgo aceptado: solo se ejecutan en desarrollo y CI. El pipeline ejecuta `npm audit --omit=dev --audit-level=high` y falla si aparece una vulnerabilidad alta o crítica en producción.

## 2. Estado frente a OWASP Top 10 (2021)

| Riesgo | Control implementado | Estado |
|---|---|---|
| A01 Control de acceso roto | Middleware de roles en cada ruta; el cliente solo ve sus solicitudes; el rol se lee de la BD en cada petición, así que desactivar un usuario revoca su token | Cubierto |
| A02 Fallas criptográficas | Contraseñas con bcrypt; JWT HS256 con secreto por variable de entorno; HSTS con Helmet. TLS (HTTPS) pendiente en el VPS | Parcial |
| A03 Inyección | Consultas parametrizadas; validación con express-validator en todas las rutas con entrada; se eliminan scripts y etiquetas HTML antes de guardar | Cubierto |
| A04 Diseño inseguro | Máquina de estados de la solicitud validada en servicio; transacciones con bloqueo de fila; límite de tamaño de cuerpo (100 kb) | Cubierto |
| A05 Configuración incorrecta | Helmet (CSP, nosniff, X-Frame-Options), sin `X-Powered-By`, CORS con lista blanca, contenedor sin root, secretos por entorno, seed desactivado en producción | Cubierto |
| A06 Componentes vulnerables | `npm audit` en CI; versiones fijadas con `package-lock.json` | Cubierto |
| A07 Fallas de autenticación | Límite de 10 intentos de login por minuto por IP; mensaje único para credenciales inválidas; token con expiración máxima de 8 h; cierre de sesión por inactividad en el frontend | Cubierto |
| A08 Integridad de software y datos | `npm ci` con lockfile; imágenes etiquetadas por commit; despliegue solo tras CI exitoso | Cubierto |
| A09 Registro y monitoreo | Winston (error.log) y Morgan (access.log) en JSON; `/health`, `/metrics` y panel de monitoreo | Cubierto |
| A10 SSRF | El servidor no realiza peticiones a URLs suministradas por el usuario | No aplica |

## 3. Riesgos conocidos y pendientes

| Riesgo | Nivel | Acción pendiente |
|---|---|---|
| El token JWT se guarda en `localStorage` (expuesto si hubiera XSS) | Medio | Mitigado por CSP, sanitización y escape de React; evaluar cookie `HttpOnly` |
| El límite de intentos de login usa memoria del proceso | Bajo | Usar almacén compartido (Redis) si se escala a varias réplicas |
| Sin HTTPS en el VPS | Alto si se expone a internet | Terminar TLS con Cloudflare, Caddy o Let's Encrypt |
| Sin política de complejidad de contraseña (solo longitud mínima de 8) | Bajo | Agregar reglas de complejidad |
| Usuarios demo creados con `SEED_ON_START=true` | Alto en producción | Mantener `SEED_ON_START=false` y cambiar contraseñas |
