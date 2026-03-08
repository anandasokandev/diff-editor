// server/proxy.js
// Run with: node server/proxy.js
// This proxies /api/claude → https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
// so the browser never calls Google directly (no CORS issue).

const http = require('http');
const https = require('https');

const PORT = 3000;
const API_KEY = process.env.GOOGLE_API_KEY || '';

if (!API_KEY) {
  console.warn('\n⚠  WARNING: GOOGLE_API_KEY env var is not set.');
  console.warn('   Set it before starting:');
  console.warn('   Linux/Mac: export GOOGLE_API_KEY=AIza...');
  console.warn('   Windows: set GOOGLE_API_KEY=AIza...\n');
}

const server = http.createServer((req, res) => {
  // ── CORS headers – allow Angular dev server (port 4200)
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── Pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Only handle POST /api/claude (keeping endpoint name for compatibility)
  if (req.method === 'POST' && req.url === '/api/claude') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/gemini-3-flash-preview:generateContent',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY, // using header per Google docs
        },
      };

      const proxy = https.request(options, (geminiRes) => {
        res.writeHead(geminiRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4200',
        });
        geminiRes.pipe(res);
      });

      proxy.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // ── New route for image generation
  if (req.method === 'POST' && req.url === '/api/image') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
      };

      const proxy = https.request(options, (imgRes) => {
        res.writeHead(imgRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4200',
        });
        imgRes.pipe(res);
      });

      proxy.on('error', (err) => {
        console.error('Image proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // ── 404 for anything else
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅  Craftly proxy running at http://localhost:${PORT}`);
  console.log(`   /api/claude  →  https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`);
  console.log(`\n   Make sure Angular is on http://localhost:4200`);
  console.log(`   API key set: ${API_KEY ? 'YES ✓' : 'NO ✗  (set GOOGLE_API_KEY)'}\n`);
});
