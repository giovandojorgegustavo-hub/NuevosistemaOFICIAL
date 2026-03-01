# CU4002 - Deploy Produccion

## Contenido del artefacto
- `app/` codigo ejecutable del CU4002.
- `deploy/systemd/cu4002.service` unidad systemd.
- `deploy/pm2/ecosystem.cjs` config PM2.
- `scripts/start.sh` arranque directo.
- `scripts/smoke-test.sh` prueba de humo no destructiva.

## Requisitos
- Linux x86_64
- Node.js 20+
- MySQL client instalado (`mysql`)
- Acceso a DB configurada en `app/erp.yml`

## Pasos de deploy (systemd)
1. Copiar carpeta release a servidor: `/opt/erp/cu4002`.
2. Instalar dependencias:
   - `cd /opt/erp/cu4002/app`
   - `npm ci --omit=dev`
3. Crear logs:
   - `sudo mkdir -p /var/log/cu4002 && sudo chown -R erp:erp /var/log/cu4002`
4. Instalar servicio:
   - `sudo cp /opt/erp/cu4002/deploy/systemd/cu4002.service /etc/systemd/system/cu4002.service`
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now cu4002`
5. Validar:
   - `sudo systemctl status cu4002 --no-pager`
   - `ss -ltnp | grep 3018`

## Pasos de deploy (PM2)
1. `cd /opt/erp/cu4002/app`
2. `npm ci --omit=dev`
3. `pm2 start /opt/erp/cu4002/deploy/pm2/ecosystem.cjs`
4. `pm2 save`

## Smoke test post-deploy
- `BASE_URL=http://127.0.0.1:3018 /opt/erp/cu4002/scripts/smoke-test.sh`

## Empaquetado del artefacto
Desde el root del repo:
- `tar -czf releases/CU4002-20260228.tar.gz -C releases CU4002-20260228`
