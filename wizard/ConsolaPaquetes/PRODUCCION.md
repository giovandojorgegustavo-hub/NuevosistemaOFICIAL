# Consola Paquetes - Checklist de Produccion

## Variables de entorno recomendadas

- `NODE_ENV=production`
- `SESSION_TTL_MS=900000` (15 minutos)
- `JSON_LIMIT=128kb`
- `CORS_ORIGINS=https://tu-dominio.com,https://app.tu-dominio.com`

Si `CORS_ORIGINS` se deja vacio, el servicio acepta cualquier origen con cabecera `Origin`.

## Arranque

- Validacion de sintaxis:
  - `npm run check`
- Arranque normal:
  - `npm start`
- Arranque modo produccion:
  - `npm run prod`

## Endpoints operativos

- Health:
  - `GET /api/health`
- Readiness (verifica DB):
  - `GET /api/ready`

## Endurecimientos incluidos

- `x-powered-by` deshabilitado.
- Cabeceras de seguridad basicas (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- HSTS en `NODE_ENV=production`.
- CORS configurable por `CORS_ORIGINS`.
- Limite de payload JSON configurable por `JSON_LIMIT`.
- Cierre elegante en `SIGTERM`/`SIGINT` (cierra server y pool MySQL).

## Recomendaciones para despliegue

- Ejecutar detras de un reverse proxy (Nginx/Traefik) con TLS.
- Reinicio automatico con systemd/pm2/k8s.
- Monitorear `GET /api/ready` para health checks del orquestador.
