// Serve the screen calibrator: drag the four screen corners by eye, save them to the plate's
// .json, and every recorder picks the corrected geometry up on the next take.
//
//   node scripts/calibrate.js assets/plates/pov-desk.png [402]
//   node scripts/calibrate.js assets/plates/laptop-desk.png 1512
//
// Why this exists: inferring the quad from the plate is guesswork. In these renders the
// screen is black and so are the bezel, the body, the contact shadow and the feathers around
// it, so "where the screen ends" moves 10-30px depending on the darkness threshold — and a
// rounded screen's true corners are never in the mask at all, they have to be extrapolated.
// That left ~±25px of irreducible ambiguity, which is exactly the "barely off" you can see.
// The eye is the ground truth the detector was approximating, so use it directly, once.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLATE = process.argv[2];
const LAYOUTW = process.argv[3] || '402';
const PORT = 8130;
if (!PLATE || !fs.existsSync(path.join(ROOT, PLATE))) {
  console.error('usage: node scripts/calibrate.js <plate.png relative to repo> [layoutWidth]');
  process.exit(2);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');

  if (u.pathname === '/quad') {
    const plate = u.searchParams.get('plate');
    const j = path.join(ROOT, plate.replace(/\.png$/, '.json'));
    if (!fs.existsSync(j)) {                       // no measurement yet — seed one
      execFileSync('python3', [path.join(__dirname, 'measure-frame.py'),
        path.join(ROOT, plate), '--json'], { stdio: ['ignore', fs.openSync(j, 'w'), 'inherit'] });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(j));
    return;
  }

  if (u.pathname === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { plate, quad_pct } = JSON.parse(body);
      const j = path.join(ROOT, plate.replace(/\.png$/, '.json'));
      const cur = JSON.parse(fs.readFileSync(j, 'utf8'));
      // keep every other measured field; the quad is the only thing the eye overrides
      cur.quad_pct = quad_pct;
      cur.calibrated_by_eye = true;
      fs.writeFileSync(j, JSON.stringify(cur, null, 1));
      console.log('saved quad -> ' + path.relative(ROOT, j));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('saved to ' + path.basename(j));
    });
    return;
  }

  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  fs.readFile(p, (e, buf) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
});

srv.listen(PORT, () => {
  const url = `http://localhost:${PORT}/templates/calibrate.html`
            + `?plate=${encodeURIComponent(PLATE)}&layoutw=${LAYOUTW}`;
  console.log('calibrator: ' + url);
  console.log('drag the four corners onto the glass, then Save. Ctrl-C when done.');
  execFileSync('open', [url]);
});
