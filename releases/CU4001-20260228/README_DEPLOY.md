# CU4001 - Deploy Produccion

## Contenido del artefacto
- `app/` codigo ejecutable del CU4001.
- `deploy/systemd/cu4001.service` unidad systemd.
- `deploy/pm2/ecosystem.cjs` config PM2.
- `scripts/start.sh` arranque directo.
- `scripts/smoke-test.sh` prueba de humo no destructiva.

## Requisitos
- Linux x86_64
- Node.js 18+
- MySQL client instalado (`mysql`)
- Acceso a DB configurada en `app/erp.yml`

## Pasos de deploy (systemd)
1. Copiar carpeta release a servidor: `/opt/erp/cu4001`.
2. Instalar dependencias:
   - `cd /opt/erp/cu4001/app`
   - `npm ci --omit=dev`
3. Crear logs:
   - `sudo mkdir -p /var/log/cu4001 && sudo chown -R erp:erp /var/log/cu4001`
4. Instalar servicio:
   - `sudo cp /opt/erp/cu4001/deploy/systemd/cu4001.service /etc/systemd/system/cu4001.service`
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now cu4001`
5. Validar:
   - `sudo systemctl status cu4001 --no-pager`
   - `ss -ltnp | grep 3017`

## Pasos de deploy (PM2)
1. `cd /opt/erp/cu4001/app`
2. `npm ci --omit=dev`
3. `pm2 start /opt/erp/cu4001/deploy/pm2/ecosystem.cjs`
4. `pm2 save`

## Smoke test post-deploy
- `BASE_URL=http://127.0.0.1:3017 /opt/erp/cu4001/scripts/smoke-test.sh`
