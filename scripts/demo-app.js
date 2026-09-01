// Serves demo-app/ so a fresh clone can record something immediately.
//
//   node scripts/demo-app.js [port]      # default 5050
//
// This is scaffolding, not a product. Once you have pointed APP_URL at your own app,
// you never need it again — but keep it around: when a recording breaks, running the
// same recorder against the demo tells you within a minute whether the problem is your
// app, your selectors, or the studio.
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..', 'demo-app');
const PORT = Number(process.argv[2] || process.env.DEMO_PORT || 5050);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  // Never serve outside demo-app/, however the path is spelled.
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
                         'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`demo app on http://localhost:${PORT}`));
