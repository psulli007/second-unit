// Record a LIVE app inside a RENDERED device frame (templates/device-stage.html).
//
// The whole point: no compositing, no motion tracking, no AI. The device frame
// and the app's screen render together in one browser page, so the geometry is
// exact by construction, the text is native-resolution sharp, and the screen's
// own glow spills onto the frame for real. Pasting a UI screenshot onto a photo
// of a phone never survives a second look — the perspective is subtly wrong, the
// edges are too clean, and the screen doesn't light anything.
//
// Two frame sources:
//   photoreal — a photograph of the device with the screen OFF, background
//               removed, plus a measured screen rect (scripts/measure-frame.py).
//               Strongly preferred.
//   CSS       — the drawn fallback frame in templates/device-stage.html. Fine
//               for internal work, obviously synthetic on a big screen.
//
// Usage: see examples/05-record-device-stage.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const { assemble } = require('./stopmo-common');
const { frameReady } = require('../lib/app-target');
const { cfg } = require('../lib/config');

const ROOT = path.resolve(__dirname, '..');
const FPS = 30;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// The stage page loads the app in an iframe, so it has to be served over http —
// file:// gives you an opaque cross-origin frame you cannot drive.
function serve(root, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(p, (e, buf) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}

// Pin an app's largest rounded panel full-viewport inside the frame, so a
// modal/embedded UI fills the device screen instead of floating in a gutter.
async function fullbleedFrame(frame) {
  await frame.evaluate(() => {
    let best = null;
    for (const d of document.querySelectorAll('div')) {
      const cs = getComputedStyle(d); const b = d.getBoundingClientRect();
      if (parseFloat(cs.borderRadius) > 8 && b.width > 600 && b.height > 300) {
        const a = b.width * b.height;
        if (!best || a > best.a) best = { el: d, a };
      }
    }
    if (!best) return;
    best.el.style.cssText += ';position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;max-width:100vw !important;max-height:100vh !important;border-radius:0 !important;margin:0 !important;transform:none !important;';
    let p = best.el.parentElement;
    while (p && p !== document.body) {
      p.style.cssText += ';position:static !important;transform:none !important;padding:0 !important;margin:0 !important;max-width:none !important;max-height:none !important;overflow:visible !important;border-radius:0 !important;';
      p = p.parentElement;
    }
    document.documentElement.style.background = '#fff';
    document.body.style.background = '#fff';
  });
}

/**
 * Build a device stage and return it ready to film.
 *
 * @param browserType   playwright.chromium
 * @param opts.device   'phone' | 'laptop'
 * @param opts.frameDir where JPEG frames are written
 * @param opts.bg       stage background — a CSS colour, gradient, or image url.
 *                      Use a generated environment plate here (see the
 *                      location-plate-builder skill) to put the device in a room.
 * @param opts.tilt     degrees of Y-rotation on the device. Small (±8) reads as
 *                      a photograph; large reads as a stock mockup.
 * @param opts.frame    path (repo-relative, leading slash) to a photoreal
 *                      cutout PNG. Omit for the CSS frame.
 * @param opts.meas     path to the JSON from scripts/measure-frame.py
 * @param opts.appUrl   what the iframe loads (default: APP_URL from config.env)
 * @param opts.port     local static-server port
 * @param opts.initScripts  addInitScript payloads (popover suppression etc.)
 */
async function openDeviceStage(browserType, opts = {}) {
  const device = opts.device || 'phone';
  const frameDir = opts.frameDir || path.join(process.cwd(), 'out', `stage-${device}`, 'frames');
  const port = opts.port || 8123;
  const appUrl = opts.appUrl || cfg.APP_URL || 'http://localhost:5173';
  fs.mkdirSync(frameDir, { recursive: true });

  const srv = await serve(ROOT, port);
  const browser = await browserType.launch();
  const size = device === 'phone' ? { width: 2160, height: 3840 } : { width: 3840, height: 2160 };
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  for (const s of (opts.initScripts || [])) await context.addInitScript(s);
  const page = await context.newPage();

  let url = `http://localhost:${port}/templates/device-stage.html`
          + `?device=${device}&bg=${encodeURIComponent(opts.bg || '#151310')}`
          + `&tilt=${opts.tilt ?? 0}&src=${encodeURIComponent(appUrl)}`;

  const measAbs = opts.meas ? path.resolve(ROOT, opts.meas) : null;
  const frameAbs = opts.frame ? path.resolve(ROOT, String(opts.frame).replace(/^\//, '')) : null;
  if (measAbs && frameAbs && fs.existsSync(measAbs) && fs.existsSync(frameAbs)) {
    const m = JSON.parse(fs.readFileSync(measAbs, 'utf8'));
    const pc = m.screen_pct;
    url += `&frame=${encodeURIComponent(opts.frame)}`
         + `&rect=${pc.left},${pc.top},${pc.width},${pc.height}`
         + `&rad=${m.radius_pct_of_screen_w}`;
    console.log(`photoreal frame: ${opts.frame}  screen aspect ${m.screen_aspect}`);
  } else {
    console.log('no photoreal frame supplied — using the CSS-drawn frame');
  }

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__stageReady === true, null, { timeout: 30000 });

  const handle = await page.waitForSelector('#screen', { timeout: 30000 });
  const frame = await handle.contentFrame();
  await frameReady(frame);
  if (cfg.APP_HIDE_CSS) await frame.addStyleTag({ content: cfg.APP_HIDE_CSS }).catch(() => {});

  // Never film a screen that is still fading in — a half-opacity hero shot is
  // the kind of defect you only notice after you've shipped it.
  await frame.waitForFunction(() => {
    const sp = document.querySelector('[class*=loading], [class*=spinner]');
    if (sp && sp.offsetParent) return false;
    const el = document.body.firstElementChild;
    return !el || parseFloat(getComputedStyle(el).opacity || '1') > 0.98;
  }, null, { timeout: 20000 }).catch(() => {});

  // ── stop-motion timeline over the STAGE page (frame + screen together) ────
  const frames = [];
  let n = 0;
  const shot = async (dur) => {
    const f = path.join(frameDir, `f${String(n++).padStart(6, '0')}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 92 });
    frames.push({ file: f, dur });
  };
  const scroller = () => frame.evaluateHandle(() => {
    let best = document.scrollingElement, gap = -1;
    for (const el of document.querySelectorAll('div,main,section')) {
      const g = el.scrollHeight - el.clientHeight; const r = el.getBoundingClientRect();
      if (g > 60 && g > gap && r.width > innerWidth * .5 && r.height > innerHeight * .4) { best = el; gap = g; }
    }
    return best;
  });

  const t = {
    hold: (s) => shot(s),
    glide: async (toY, secs) => {
      const h = await scroller();
      const from = await h.evaluate(el => el.scrollTop);
      const steps = Math.max(2, Math.round(secs * FPS));
      for (let i = 1; i <= steps; i++) {
        await h.evaluate((el, y) => { el.scrollTop = y; }, from + (toY - from) * easeInOut(i / steps));
        await shot(1 / FPS);
      }
      await h.dispose();
    },
    type: async (locator, text, { cps = 12 } = {}) => {
      await locator.click();
      await shot(0.2);
      for (const ch of text) { await page.keyboard.type(ch); await shot(1 / cps); }
    },
    // Real-time capture for genuinely async beats. Durations come from the wall
    // clock, so a live wait plays back at its true length.
    live: async (secs) => {
      const t0 = Date.now(); let last = t0;
      while (Date.now() - t0 < secs * 1000) {
        await shot(0);
        const now = Date.now();
        frames[frames.length - 1].dur = (now - last) / 1000;
        last = now;
      }
    },
    settle: (ms) => page.waitForTimeout(ms),
    shot,
  };

  const close = async () => { await context.close(); await browser.close(); srv.close(); };
  return { browser, context, page, frame, frames, t, assemble, fullbleedFrame, close, device };
}

module.exports = { openDeviceStage, fullbleedFrame, serve, FPS };
