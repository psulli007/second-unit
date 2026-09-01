// Shared bits for MOBILE-view recordings (default 540x960).
//
// - TAP_INIT: touch-style tap ripple (no desktop arrow — an on-screen mouse
//   pointer instantly reads as "this was filmed on a laptop")
// - redactScript(): text substitution at render time, for filming a staging
//   environment whose hostnames/tenant names shouldn't appear on camera
// - tap(): box-centered mouse click. Mobile carousels and sheets fail
//   Playwright's visibility waits mid-transform; coordinate clicks work.
const { openApp } = require('../lib/app-target');
const { cfg } = require('../lib/config');

const TAP_INIT = `(() => {
  if (window.__vsTap) return; window.__vsTap = true;
  document.addEventListener('mousedown', (e) => {
    if (!document.body) return;
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.35);border:2.5px solid ${'${ACCENT}'};left:' + (e.clientX-17) + 'px;top:' + (e.clientY-17) + 'px;transform:scale(.5);opacity:1;transition:transform .5s ease-out,opacity .5s ease-out;';
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 650);
  }, true);
})();`.replace('${ACCENT}', cfg.BRAND_ACCENT || '#4F46E5');

// Build a redaction init-script from a [find, replace] list.
//
// Use this ONLY for incidental environment leakage — a staging hostname, an
// internal tenant slug — never to misrepresent what the product does. If you
// have nothing to redact, don't install it.
//
//   context.addInitScript(redactScript([['acme-staging.internal', 'acme.com']]))
function redactScript(pairs = []) {
  return `(() => {
    const MAP = ${JSON.stringify(pairs)};
    if (!MAP.length) return;
    const apply = s => { let o = s; for (const [a,b] of MAP) if (o.indexOf(a)!==-1) o = o.split(a).join(b); return o; };
    const scrub = () => { try {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      const ns = []; while (w.nextNode()) ns.push(w.currentNode);
      for (const n of ns) { const v = n.nodeValue; if (v) { const nv = apply(v); if (nv !== v) n.nodeValue = nv; } }
    } catch(e){} };
    const start = () => { scrub(); new MutationObserver(scrub).observe(document.documentElement,{childList:true,subtree:true,characterData:true}); setInterval(scrub,200); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();`;
}

async function tap(page, loc, opts = {}) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(opts.settle ?? 350);
  const b = await loc.boundingBox();
  if (!b) throw new Error('tap: no bounding box');
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(opts.after ?? 250);
}

// Open the app at mobile size, recording video, tap ripple installed.
async function setup(browserType, videoDir, opts = {}) {
  const width = opts.width || 540, height = opts.height || 960;
  const initScripts = [TAP_INIT];
  if (opts.redact && opts.redact.length) initScripts.unshift(redactScript(opts.redact));
  return openApp(browserType, {
    viewport: { width, height },
    recordVideo: { dir: videoDir, size: { width, height } },
    initScripts,
  });
}

// Click a tab until it reports active. Tab clicks can silently no-op right
// after load, while the app is still wiring its handlers — one click and a
// hopeful sleep produces a recording of the wrong screen.
async function clickUntilActive(page, locator, { activeClass = 'is-active', tries = 5, wait = 1200 } = {}) {
  for (let i = 0; i < tries; i++) {
    const b = await locator.boundingBox().catch(() => null);
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(wait);
    const cls = await locator.getAttribute('class').catch(() => '');
    if (cls && cls.includes(activeClass)) return;
  }
  throw new Error('element never became active');
}

module.exports = { TAP_INIT, redactScript, tap, setup, clickUntilActive };
