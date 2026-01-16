# Registro multipaso (wizard)

Wizard multipaso (Pedido → Factura → Entrega → Emisión) con Bootstrap 5.3 y JavaScript ES6+.

## Ejecutar

Requiere Node.js 18+.

```bash
npm i
npm run start
```

Luego abre `http://localhost:3000`.

## Conectar a MariaDB/MySQL (requerido)

El backend se conecta usando `erp.yml` (sin datos mock). Debes apuntar a la BD real indicada por `connections[].name` y el DSN en `connections[].dsn`.

Ejemplo mínimo (formato soportado):

```yml
connections:
  - name: "erpdb"
    dsn: "mysql://erpuser:password@tcp(127.0.0.1:3306)/erpdb"
```

## Endpoints

- `GET /api/db-status`: valida conexión usando `erp.yml`.
- `GET /api/clients`: `CALL get_clientes()`
- `GET /api/products`: `CALL get_productos()`
- `GET /api/bases`: `CALL get_bases()`
- `GET /api/packings`: `CALL get_packing()`
- `GET /api/clients/:id/direcciones`: `CALL get_direcciones(id)`
- `GET /api/clients/:id/direccionesprov`: `CALL get_direccionesprov(id)`
- `GET /api/clients/:id/numrecibe`: `CALL get_numrecibe(id)`
- `GET /api/sql-logs`: log in-memory de sentencias SQL ejecutadas por el backend
- `POST /api/erp/emit`: crea `pedidos`, `pedido_detalle`, `mov_contable`, `mov_contable_detalle`, `movimientos`, `movimiento_detalle` (transacción)
- `POST /api/notas-credito/emitir`: crea `mov_contable` y `mov_contable_detalle` para nota de credito (transacción)

## Notas

- Si tu entorno bloquea abrir puertos (error `EPERM`), ejecuta el proyecto fuera del sandbox o cambia el puerto con `PORT=...`.
- El guardado de progreso se hace en `localStorage` (clave `formWizard:v1`).
- El schema y los procedimientos de ejemplo están en `mysqlultimo.sql`.
