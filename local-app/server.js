#!/usr/bin/env node
// Simple HTTPS dev server for PAX Era Pro web app
// Serves static files and mocks the consumer-service API

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8443;
const USE_HTTPS = process.env.USE_HTTPS === '1';
const STATIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.json': 'application/json',
};

// Stable mock values so tokens survive server restarts within the same session
const MOCK_UUID  = 'local-anonymous-00000000-0000-0000-0000-000000000001';
const MOCK_TOKEN = 'local-mock-bearer-token.not-a-real-jwt';

const ANON_USER = {
  uuid: MOCK_UUID,
  peripheralId: null,
  type: 'ANONYMOUS',
  devices: [],
  recentlyViewedPods: [],
  recentSearches: [],
  location: null,
  email: null,
  anonymousUsageHistory: null,
  hasVerifiedEmail: false,
  roles: null,
  profile: null,
  dataSharingPreferences: { shareUsageData: false },
};

// Routes that need an exact method+path match
const API_ROUTES = {
  // Auth — app expects response.data.credentials.token
  'POST /api/v1/anonymous-users':       { status: 201, body: { ...ANON_USER, credentials: { token: MOCK_TOKEN } } },
  'POST /api/v1/anonymous-users/login': { status: 200, body: { ...ANON_USER, credentials: { token: MOCK_TOKEN } } },

  // Session / profile
  'GET /api/v1/users/me':                         { status: 200, body: ANON_USER },
  'GET /api/v1/experiments/assigned-variations':  { status: 200, body: { assignedVariations: [] } },
  'GET /api/v1/announcements/email-collection':   { status: 200, body: { viewed: true } },
};

function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers (needed for BT API in some browsers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // API routes — must be matched before SPA fallback so they never return HTML
  if (pathname.startsWith('/api/')) {
    const apiKey = `${req.method} ${pathname}`;
    const firmwareMatch = pathname.match(/^\/api\/v1\/models\/.+\/devices\/.+\/firmware$/);

    if (API_ROUTES[apiKey]) {
      const route = API_ROUTES[apiKey];
      res.writeHead(route.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(route.body));
      return;
    }
    if (firmwareMatch) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ up_to_date: true, version: null }));
      return;
    }
    // Unknown API endpoint — return empty 200 so the app doesn't crash
    console.warn(`Unhandled API: ${req.method} ${pathname}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
    return;
  }

  // Static files — URL-decode the path so %20 spaces resolve to real filenames
  const decodedPathname = decodeURIComponent(pathname);
  let filePath = path.join(STATIC_DIR, decodedPathname === '/' ? 'index.html' : decodedPathname);

  // No extension = SPA route → serve index.html
  if (!path.extname(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(`Not found: ${pathname}`);
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

let server;
if (USE_HTTPS) {
  // Provide your own cert/key via env or generate with mkcert
  const certFile = process.env.SSL_CERT || 'localhost.pem';
  const keyFile  = process.env.SSL_KEY  || 'localhost-key.pem';
  try {
    const options = {
      cert: fs.readFileSync(certFile),
      key:  fs.readFileSync(keyFile),
    };
    server = https.createServer(options, handleRequest);
    console.log(`Starting HTTPS server (Web Bluetooth requires HTTPS or localhost)`);
  } catch (e) {
    console.error(`Could not load TLS certs (${certFile}, ${keyFile}): ${e.message}`);
    console.error(`Falling back to HTTP on localhost (Bluetooth may still work on localhost)`);
    server = http.createServer(handleRequest);
  }
} else {
  server = http.createServer(handleRequest);
  console.log(`Starting HTTP server — Web Bluetooth works on localhost without HTTPS`);
}

server.listen(PORT, '127.0.0.1', () => {
  const proto = USE_HTTPS ? 'https' : 'http';
  console.log(`PAX Web App running at ${proto}://localhost:${PORT}/device/era-pro`);
  console.log(`  For HTTPS: USE_HTTPS=1 node server.js`);
  console.log(`  SSL certs: set SSL_CERT and SSL_KEY env vars, or use mkcert:`);
  console.log(`    mkcert localhost && USE_HTTPS=1 SSL_CERT=localhost.pem SSL_KEY=localhost-key.pem node server.js`);
});
