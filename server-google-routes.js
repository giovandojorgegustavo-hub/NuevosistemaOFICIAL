const express = require('express');

const app = express();
const PORT = process.env.PORT || 3008;
const API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const REQUEST_TIMEOUT_MS = 8000;

const LATLNG_RE = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/distancia', async (req, res) => {
  const { origen, destino } = req.query;
  if (!API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_ROUTES_API_KEY missing' });
  }
  if (!origen || !destino || !LATLNG_RE.test(origen) || !LATLNG_RE.test(destino)) {
    return res.status(400).json({ error: 'Invalid origen/destino. Use lat,lng' });
  }

  const [oLat, oLng] = origen.split(',').map(Number);
  const [dLat, dLng] = destino.split(',').map(Number);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
      },
      signal: controller.signal,
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
        destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
        travelMode: 'TWO_WHEELER'
      })
    });

    const data = await response.json();
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error('Routes API error:', data);
      return res.status(502).json({ error: 'Routes API error', details: data });
    }

    const route = data?.routes?.[0];
    if (!route || typeof route.distanceMeters !== 'number' || !route.duration) {
      console.error('Routes API missing expected data:', data);
      return res.status(502).json({ error: 'Routes API returned no route data' });
    }

    res.json({
      distancia_metros: route.distanceMeters,
      duracion: route.duration
    });
  } catch (err) {
    const isTimeout = err && err.name === 'AbortError';
    console.error('Request failed:', err);
    res.status(500).json({ error: isTimeout ? 'Request timed out' : 'Request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Routes API proxy listening on http://127.0.0.1:${PORT}`);
});
