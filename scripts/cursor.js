// Visible "human" cursor for headless recordings.
//
// CURSOR_INIT — addInitScript payload that renders a macOS-style pointer which
// follows real mouse events (Playwright's page.mouse dispatches genuine input
// events, so this tracks everything), presses down slightly on mousedown, and
// spawns a click ripple. pointer-events:none, so it never affects the page.
//
// humanMove / humanClick / humanWheel — drive the mouse the way a person does:
// glide in steps with easing, settle, then click. Use in recorders instead of
// locator.click() for anything on camera:
//   const { CURSOR_INIT, humanClick } = require('./cursor');
//   await context.addInitScript(CURSOR_INIT);
//   ...
//   await humanClick(page, page.getByRole('button', { name: 'Create' }));

const CURSOR_INIT = `(() => {
  if (window.__asCursor) return; window.__asCursor = true;
  const mk = () => {
    if (!document.body) return null;
    const c = document.createElement('div');
    c.id = '__as-cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .06s ease;will-change:left,top;';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.2 L5.5 17.8 L9.1 14.6 L11.3 19.9 L13.9 18.8 L11.7 13.6 L16.5 13.2 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    return c;
  };
  let cur = null;
  const ensure = () => (cur && document.body.contains(cur)) ? cur : (cur = mk());
  document.addEventListener('mousemove', (e) => {
    const c = ensure(); if (!c) return;
    c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
  }, true);
  document.addEventListener('mousedown', (e) => {
    const c = ensure(); if (!c) return;
    c.style.transform = 'translate(-3px,-2px) scale(0.85)';
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;border-radius:50%;border:2.5px solid rgba(242,91,87,.85);left:' + (e.clientX-7) + 'px;top:' + (e.clientY-7) + 'px;opacity:1;transform:scale(.5);transition:transform .45s ease-out,opacity .45s ease-out;';
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(2.6)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
  }, true);
  document.addEventListener('mouseup', () => {
    const c = ensure(); if (!c) return;
    c.style.transform = 'translate(-3px,-2px) scale(1)';
  }, true);
})();`;

// Ease the pointer to (x, y) like a hand would: one smooth glide with easing,
// implemented as many small page.mouse.move steps.
async function humanMove(page, x, y, opts = {}) {
  const steps = opts.steps || 28;
  await page.mouse.move(x + (opts.jitter ? 4 : 0), y + (opts.jitter ? 3 : 0), { steps });
  if (opts.jitter) await page.mouse.move(x, y, { steps: 4 }); // tiny settle
  await page.waitForTimeout(opts.settle ?? 180);
}

// Glide to a locator's center, settle briefly, then click through the real mouse.
// Re-checks the target position after the glide — layout can shift mid-glide
// (toasts, image loads), which would otherwise land the click off-target.
async function humanClick(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.waitFor({ state: 'visible', timeout: opts.timeout || 15000 });
  const center = async () => {
    const b = await locator.boundingBox();
    if (!b) throw new Error('humanClick: no bounding box');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  let { x, y } = await center();
  await humanMove(page, x, y, { jitter: true, settle: opts.settle ?? 220 });
  const now = await center();                       // drift check post-glide
  if (Math.abs(now.x - x) > 4 || Math.abs(now.y - y) > 4) {
    ({ x, y } = now);
    await humanMove(page, x, y, { settle: 120 });
  }
  await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up();
  await page.waitForTimeout(opts.after ?? 150);
}

// Scroll like a person: several small wheel flicks with pauses, not one jump.
async function humanWheel(page, dy, opts = {}) {
  const flicks = opts.flicks || Math.max(2, Math.round(Math.abs(dy) / 160));
  const per = dy / flicks;
  for (let i = 0; i < flicks; i++) {
    await page.mouse.wheel(0, per);
    await page.waitForTimeout(opts.pause ?? 120);
  }
}

module.exports = { CURSOR_INIT, humanMove, humanClick, humanWheel };
