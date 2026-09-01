// One still of any plate + chrome combo, to check geometry BEFORE spending a
// full take on it. A device-stage take is expensive; a misplaced screen rect or
// a wrong layout width is cheap to catch here and painful to catch after.
//
//   node scripts/probe-stage.js <plateRelPath.png> <chrome> <device> <out.png> [layoutw]
//
//   plateRelPath  repo-relative path to the photoreal cutout PNG. A sibling
//                 .json (from scripts/measure-frame.py) must exist next to it.
//   chrome        none | safari | macos   — draws browser chrome on the screen
//   device        phone | laptop
//   layoutw       CSS layout width for the app inside the screen (default 402
//                 for phone, 1512 for laptop). Get this right: the app should
//                 render at the device's REAL point width, not scaled down.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const http = require('http');
const { frameReady } = require('../lib/app-target');
const { cfg } = require('../lib/config');
const { fullbleedFrame } = require('./device-stage');

const ROOT = path.resolve(__dirname, '..'); const PORT = 8126;
const [PLATE_REL, CHROME, DEVICE, OUTP, LAYOUTW] = process.argv.slice(2);
if (!PLATE_REL || !OUTP) {
  console.error('usage: probe-stage.js <plate.png> <none|safari|macos> <phone|laptop> <out.png> [layoutw]');
  process.exit(2);
}

const serve = (root, port) => new Promise(r => {
  const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
  http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(p,(e,b)=>{ if(e){s.writeHead(404);s.end();return;} s.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'}); s.end(b); });
  }).listen(port, function(){ r(this); });
});

(async () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, PLATE_REL.replace(/\.png$/,'.json')),'utf8'));
  const quad = m.quad_pct.flat().join(',');
  const srv = await serve(ROOT, PORT);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: m.image.w, height: m.image.h }, deviceScaleFactor: 1 });
  const p = await c.newPage();

  let url = `http://localhost:${PORT}/templates/device-stage.html?device=${DEVICE}`
    + `&frame=${encodeURIComponent('/'+PLATE_REL)}&quad=${quad}&rad=${m.radius_pct_of_screen_w || 11}&bg=%23000`
    + `&src=${encodeURIComponent(cfg.APP_URL || 'http://localhost:5173')}`
    + `&chrome=${CHROME}&pose=0`;   // pose=0 — no hand-held drift, so this isolates geometry
  if (LAYOUTW) url += `&layoutw=${LAYOUTW}`;

  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__stageReady === true, null, { timeout: 30000 });
  const h = await p.waitForSelector('#screen', { timeout: 30000 });
  const f = await h.contentFrame();
  await frameReady(f);
  await f.addStyleTag({ content: `*{scroll-behavior:auto!important} ${cfg.APP_HIDE_CSS || ''}` });

  if (DEVICE === 'laptop') { await fullbleedFrame(f); await p.waitForTimeout(1200); }
  await p.waitForTimeout(4500);
  await p.screenshot({ path: OUTP });
  console.log('wrote ' + OUTP);
  await c.close(); await b.close(); srv.close();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
