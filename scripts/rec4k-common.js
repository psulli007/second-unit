// TRUE-4K recording of a web app.
//
// Why not recordVideo/DSF/plain screencast: Playwright recordVideo captures CSS px only;
// CDP screencast also caps at the window surface (CSS px). deviceScaleFactor never
// reaches video. (Screenshots DO respect DSF — but that's stills.)
//
// The lever that works: make the CSS viewport itself 4K and CSS-zoom the page, so the
// ORIGINAL composition renders at N× true resolution (real re-raster, not upscale):
//   desktop: viewport 3840x2400, zoom 3  -> the exact 1280x800 layout, 3x sharp
//   mobile:  viewport 2160x3840, zoom 4  -> the exact 540x960 layout, 4x sharp
// To keep responsive logic identical to the original size, we also:
//   - rewrite every px value in stylesheet @media conditions ×zoom (mobile breakpoint
//     <=900px becomes <=3600px, so 2160 still reads as "mobile"); re-applied via
//     MutationObserver for late-injected <style> tags (Vite HMR/styled inserts)
//   - override window.innerWidth/innerHeight and matchMedia to report layout px (÷zoom)
// Capture: CDP screencast (now at the big surface = real 4K), timestamped frames ->
// assemble() -> CFR 30fps mp4.
//
// Desktop full-bleed: fullbleed(page) pins the widget's rounded modal to inset:0 and
// kills the gray page margin BEFORE capture. Mobile is inherently full-bleed.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openApp, appReady } = require('../lib/app-target');
const { cfg } = require('../lib/config');

const MODES = {
  desktop: { width: 1280, height: 800, zoom: 3 },   // capture 3840x2400
  mobile: { width: 540, height: 960, zoom: 4 },     // capture 2160x3840
};

// Injected before app code: report layout-px metrics to JS, rescale MQ px in CSS.
const zoomShim = (zoom) => `(() => {
  const Z = ${zoom};
  const lw = () => Math.round(window.outerWidth ? document.documentElement.clientWidth / Z : 0) || Math.round(screen.width / Z);
  try {
    Object.defineProperty(window, 'innerWidth',  { get: () => Math.round(document.documentElement.clientWidth  / Z), configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: () => Math.round(document.documentElement.clientHeight / Z), configurable: true });
  } catch (e) {}
  const nativeMM = window.matchMedia.bind(window);
  window.matchMedia = (q) => nativeMM(String(q).replace(/(\\d+(?:\\.\\d+)?)px/g, (_, n) => (parseFloat(n) * Z) + 'px'));
  const scaleSheet = (sheet) => {
    let rules; try { rules = sheet.cssRules; } catch (e) { return; }
    if (!rules) return;
    for (const r of rules) {
      if (r.media && r.media.mediaText && !r.__zoomed) {
        const mt = r.media.mediaText;
        const scaled = mt.replace(/(\\d+(?:\\.\\d+)?)px/g, (_, n) => (parseFloat(n) * Z) + 'px');
        if (scaled !== mt) { try { r.media.mediaText = scaled; } catch (e) {} }
        r.__zoomed = true;
      }
      if (r.cssRules) for (const rr of r.cssRules) { /* nested @supports etc */ }
    }
  };
  const scaleAll = () => { for (const s of document.styleSheets) scaleSheet(s); };
  const boot = () => {
    document.documentElement.style.zoom = String(Z);
    scaleAll();
    new MutationObserver(() => scaleAll()).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(scaleAll, 800); // belt & braces for CSSOM-inserted rules
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();`;

// Tap ripple sized for the zoomed page (positions use visual px ÷ zoom inside the zoomed doc).
const ACCENT = cfg.BRAND_ACCENT || '#4F46E5';
const tapInitZoomed = (zoom) => `(() => {
  if (window.__vsTap) return; window.__vsTap = true;
  const Z = ${zoom};
  document.addEventListener('mousedown', (e) => {
    if (!document.body) return;
    const r = document.createElement('div');
    const x = e.clientX / Z, y = e.clientY / Z;
    r.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.35);border:2.5px solid ${ACCENT};left:' + (x-17) + 'px;top:' + (y-17) + 'px;transform:scale(.5);opacity:1;transition:transform .5s ease-out,opacity .5s ease-out;';
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 650);
  }, true);
})();`;

async function setup4k(browserType, mode, frameDir, opts = {}) {
  const m = MODES[mode];
  if (!m) throw new Error('mode must be desktop|mobile');
  fs.mkdirSync(frameDir, { recursive: true });
  const { browser, context, page } = await openApp(browserType, {
    viewport: { width: m.width * m.zoom, height: m.height * m.zoom },
    initScripts: [
      ...(opts.initScripts || []),
      zoomShim(m.zoom),
      tapInitZoomed(m.zoom),
    ],
  });

  const client = await context.newCDPSession(page);
  const frames = [];
  let started = false;
  client.on('Page.screencastFrame', async (ev) => {
    try {
      const file = path.join(frameDir, `f${String(frames.length).padStart(6, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(ev.data, 'base64'));
      frames.push({ file, ts: ev.metadata.timestamp });
      await client.send('Page.screencastFrameAck', { sessionId: ev.sessionId });
    } catch (e) { /* closing */ }
  });
  async function start() {
    if (started) return; started = true;
    await client.send('Page.startScreencast', {
      format: 'jpeg', quality: 85,
      maxWidth: m.width * m.zoom, maxHeight: m.height * m.zoom, everyNthFrame: 1,
    });
  }
  async function stop() {
    if (!started) return; started = false;
    await client.send('Page.stopScreencast').catch(() => {});
    await new Promise(r => setTimeout(r, 400));
  }
  return { browser, context, page, client, frames, start, stop, mode: m };
}

function assemble(frames, outMp4, { crf = 16, fps = 30, tail = 1.2 } = {}) {
  if (!frames.length) throw new Error('assemble: no frames captured');
  const listFile = outMp4 + '.concat.txt';
  const abs = f => path.resolve(f).replace(/'/g, "'\\''"); // concat resolves relative to the LIST file
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const dur = i + 1 < frames.length ? Math.max(frames[i + 1].ts - frames[i].ts, 1 / 120) : tail;
    lines.push(`file '${abs(frames[i].file)}'`);
    lines.push(`duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${abs(frames[frames.length - 1].file)}'`);
  fs.writeFileSync(listFile, lines.join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', `fps=${fps}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4], { stdio: 'inherit' });
  return outMp4;
}

// Desktop: pin the app's largest rounded panel full-viewport and kill the page
// margin around it, so an embedded/modal UI fills the frame instead of floating
// in a grey gutter. No-ops (returns false) when the app has no such panel.
async function fullbleed(page) {
  await page.evaluate(() => {
    let best = null;
    for (const d of document.querySelectorAll('div')) {
      const cs = getComputedStyle(d); const b = d.getBoundingClientRect();
      if (parseFloat(cs.borderRadius) > 8 && b.width > 900 && b.height > 400) {
        const area = b.width * b.height;
        if (!best || area > best.a) best = { el: d, a: area };
      }
    }
    if (!best) return false;
    let el = best.el;
    el.style.cssText += ';position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;max-width:100vw !important;max-height:100vh !important;border-radius:0 !important;margin:0 !important;transform:none !important;';
    let p = el.parentElement;
    while (p && p !== document.body) {
      p.style.cssText += ';position:static !important;transform:none !important;padding:0 !important;margin:0 !important;max-width:none !important;max-height:none !important;overflow:visible !important;border-radius:0 !important;';
      p = p.parentElement;
    }
    document.documentElement.style.background = '#fff';
    document.body.style.background = '#fff';
    return true;
  });
  await page.waitForTimeout(600);
}

module.exports = { setup4k, assemble, fullbleed, MODES };
