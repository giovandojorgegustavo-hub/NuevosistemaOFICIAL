// /var/www/NuevosistemaOFICIAL/wizard/ConsolaPaquetes/server.js
const express = require('express');
const mysql = require('mysql2/promise');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));
app.use(express.static(path.join(__dirname, 'public')));

// Load Configuration
let dbConfig = {};
let port = 3000;

try {
    // FIX: Go up two levels to find erp.yml in project root
    const fileContents = fs.readFileSync(path.join(__dirname, '../../erp.yml'), 'utf8');
    const config = yaml.load(fileContents);
    
    // Parse DSN: mysql://user:pass@tcp(host:port)/db
    const dsn = config.connections.find(c => c.name === 'erpdb').dsn;
    const match = dsn.match(/mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)/);
    
    if (match) {
        dbConfig = {
            user: match[1],
            password: match[2],
            host: match[3],
            port: match[4],
            database: match[5],
            dateStrings: true // Important for handling DATETIME correctly
        };
    }

    port = config.ports.services.consola_paquetes || 4004;

} catch (e) {
    console.error("Error loading configuration:", e);
    process.exit(1);
}

// Database Connection Pool
const pool = mysql.createPool(dbConfig);

// Helper to log errors
const logError = (err, context) => {
    console.error(`[${new Date().toISOString()}] Error in ${context}:`, err);
};

const firstResultSet = (rows) => (Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : []);

const extractOtp = (rows) => {
    const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!first) return null;
    const keys = ['otp', 'OTP', 'vOTP', 'codigo_otp', 'token'];
    for (const key of keys) {
        if (first[key] !== undefined && first[key] !== null && String(first[key]).trim() !== '') {
            return String(first[key]);
        }
    }
    const fallback = Object.keys(first)[0];
    return fallback ? String(first[fallback]) : null;
};

const appendQuery = (url, query) => {
    try {
        const parsed = new URL(url);
        Object.entries(query).forEach(([k, v]) => parsed.searchParams.set(k, String(v)));
        return parsed.toString();
    } catch (err) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => params.set(k, String(v)));
        return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }
};

// --- Endpoints ---

// 1. Get Tablero Columns
app.get('/api/board-config', async (req, res) => {
    try {
        const [rows] = await pool.query("CALL get_tablero('PAQ')");
        // SP returns result in the first element of the array
        res.json(rows[0]); 
    } catch (err) {
        logError(err, 'get_tablero');
        res.status(500).json({ error: 'Error loading board columns' });
    }
});

// 2. Get Packages (Cards)
app.get('/api/paquetes', async (req, res) => {
    try {
        // Passing NOW() directly in SQL as requested
        const [rows] = await pool.query("CALL get_paquetes(NOW())");
        res.json(rows[0]);
    } catch (err) {
        logError(err, 'get_paquetes');
        res.status(500).json({ error: 'Error loading packages' });
    }
});

// Alias for frontend expecting /api/packages
app.get('/api/packages', async (req, res) => {
    try {
        const [rows] = await pool.query("CALL get_paquetes(NOW())");
        res.json(firstResultSet(rows));
    } catch (err) {
        logError(err, 'get_paquetes');
        res.status(500).json({ error: 'Error loading packages', detail: err.message });
    }
});

// 3. Get Package Products (Details)
app.get('/api/paquetes/:id/productos', async (req, res) => {
    const { id } = req.params;
    const { tipo_documento } = req.query; // We need type (FAC, etc)

    if (!id || !tipo_documento) {
        return res.status(400).json({ error: 'Missing id or tipo_documento' });
    }

    try {
        const [rows] = await pool.query("CALL get_productos_pkte(?, ?)", [tipo_documento, id]);
        res.json(rows[0]);
    } catch (err) {
        logError(err, 'get_productos_pkte');
        res.status(500).json({ error: 'Error loading package details' });
    }
});

// Alias for frontend expecting /api/details/:type/:code
app.get('/api/details/:type/:code', async (req, res) => {
    const { type, code } = req.params;
    if (!type || !code) {
        return res.status(400).json({ error: 'Missing type or code' });
    }
    try {
        const [rows] = await pool.query("CALL get_productos_pkte(?, ?)", [type, code]);
        res.json(firstResultSet(rows));
    } catch (err) {
        logError(err, 'get_productos_pkte');
        res.status(500).json({ error: 'Error loading package details', detail: err.message });
    }
});

app.post('/api/liquidar', async (req, res) => {
    const vUsuario = 1;
    const vUseCaseToLaunch = 'CU003';
    try {
        const [otpRaw] = await pool.query("CALL generar_otp_usuario(?)", [vUsuario]);
        const vOTP = extractOtp(firstResultSet(otpRaw));
        if (!vOTP) {
            return res.status(500).json({ error: 'No se pudo generar OTP' });
        }

        const [linkRaw] = await pool.query("CALL get_usecase_link(?)", [vUseCaseToLaunch]);
        const linkRows = firstResultSet(linkRaw);
        const vLinkToLaunch = linkRows[0] && linkRows[0].linktolaunch;
        if (!vLinkToLaunch) {
            return res.status(500).json({ error: 'No se encontro link de usecase' });
        }

        const url = appendQuery(vLinkToLaunch, { vUsuario, vOTP });
        return res.json({ ok: true, url, vUsuario, vOTP, usecase: vUseCaseToLaunch });
    } catch (err) {
        logError(err, 'liquidarpaquete');
        return res.status(500).json({ error: 'Error al liquidar', detail: err.message });
    }
});

// Start Server
const server = app.listen(port, () => {
    console.log(`Consola Paquetes running on port ${port}`);
    console.log(`DB Connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${port} is already in use.`);
        console.error(`To fix this, run: fuser -k ${port}/tcp\n`);
        process.exit(1);
    }
});
