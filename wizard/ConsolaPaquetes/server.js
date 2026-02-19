const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const app = express();

// 1. Cargar configuración de erp.yml
let config;
try {
    const fileContents = fs.readFileSync(path.join(__dirname, '../../erp.yml'), 'utf8');
    config = yaml.load(fileContents);
} catch (e) {
    console.error("Error cargando erp.yml:", e);
    process.exit(1);
}

// 2. Extraer parámetros de conexión
const dbSettings = config.connections.find(c => c.name === "erpdb");
const PORT = config.bk_consola_pktes_port || 4002;

// 3. Crear Pool de Conexión
// Eliminar el wrapper 'tcp(...)' del DSN para compatibilidad con Node.js
const connectionString = dbSettings.dsn.replace(/@tcp\((.+?)\)/, '@$1');
const pool = mysql.createPool(connectionString);

app.use(express.static('public'));
app.use(express.json());

// 4. Endpoint Principal
app.get('/api/tablero', async (req, res) => {
    try {
        // Ejecutamos ambos SPs en paralelo
        const [resTablero] = await pool.query('CALL get_tablero(?)', ['PAQ']);
        const [resPaquetes] = await pool.query('CALL get_paquetes(NOW())');

        res.json({
            columnas: resTablero[0],
            paquetes: resPaquetes[0],
            google_maps: config.google_maps
        });
    } catch (err) {
        console.error("Error en DB:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor Consola Paquetes v1.01 iniciado en puerto: ${PORT}`);
});
