// server/proxy.js
// Run with: node server/proxy.js
// This proxies /api/claude → Gemini text API and /api/image → Gemini image API
// so the browser never calls Google directly (no CORS issue).

// ── Load .env file from project root automatically
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_API_KEY || '';

if (!API_KEY) {
  console.warn('\n⚠  WARNING: GOOGLE_API_KEY is not set.');
  console.warn('   Add it to your .env file:');
  console.warn('   GOOGLE_API_KEY=AIza-your-key-here');
  console.warn('   Then restart the proxy.\n');
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
  console.log(`   Loaded .env : ${require('path').resolve(__dirname, '../.env')}`);
  console.log(`   API key     : ${API_KEY ? 'SET ✓' : 'MISSING ✗  — add GOOGLE_API_KEY to your .env'}`);
  console.log(`\n   /api/claude  → Gemini text generation`);
  console.log(`   /api/image   → Gemini image generation`);
  console.log(`\n   Angular dev server → http://localhost:4200\n`);
});
