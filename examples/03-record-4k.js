// EXAMPLE 3 — TRUE 4K capture via CDP screencast.
//
//   node examples/03-record-4k.js desktop     # 3840x2400
//   node examples/03-record-4k.js mobile      # 2160x3840
//
// Why this exists: Playwright's recordVideo captures CSS pixels only, and
// deviceScaleFactor never reaches the video stream — so you cannot get a 4K
// recording just by asking for one. scripts/rec4k-common.js works around it by
// making the CSS viewport itself 4K and zooming the page, so the layout you
// designed re-rasterises at 3-4x. It also rewrites @media breakpoint values by
// the same factor, so responsive logic still behaves as it does at the real size.
//
// Cost: capture is heavier and slower than example 1. Use it for hero footage
// and anything destined for a device screen; use example 1 for everything else.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { setup4k, assemble, fullbleed } = require('../scripts/rec4k-common');

const MODE = process.argv[2] || 'desktop';
const OUT = path.join(process.cwd(), 'out', `4k-${MODE}`);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const rec = await setup4k(chromium, MODE, `${OUT}/frames`);
  const { page } = rec;

  await page.waitForSelector('[data-testid=main-content]', { timeout: 30000 });
  await page.waitForTimeout(2500);

  // Desktop only: if your app renders as a panel/modal floating in a page
  // gutter, pin it full-viewport so the frame is all UI and no grey margin.
  // Returns quietly if there's no such panel.
  if (MODE === 'desktop') await fullbleed(page);
  await page.waitForTimeout(800);

  // Everything before start() is setup and is NOT filmed. Get the app into the
  // exact state the shot opens on first — a recording that begins with three
  // seconds of navigation is three seconds nobody watches.
  await rec.start();

  await page.waitForTimeout(2500);
  // Note the zoom multiplier: page coordinates are in the zoomed frame, so any
  // pixel distance you scroll or click has to be scaled by rec.mode.zoom.
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 70 * rec.mode.zoom);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1800);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, -70 * rec.mode.zoom);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);

  // Open the create flow and type into it. Note the zoom factor again: locator-based
  // clicks are fine (Playwright resolves real coordinates), but any raw mouse.move or
  // wheel distance you write by hand has to be scaled by rec.mode.zoom.
  await page.getByTestId('create').click();
  await page.waitForSelector('dialog[open]', { timeout: 10000 });
  await page.waitForTimeout(1200);

  const input = page.getByTestId('name');
  await input.click();
  await input.pressSequentially('Launch assets', { delay: 90 });
  await page.waitForTimeout(900);

  // The payoff: a real async wait, filmed at true speed.
  await page.getByTestId('save').click();
  await page.waitForSelector('[data-testid=result]', { timeout: 30000 });
  await page.waitForTimeout(2600);

  await rec.stop();

  console.log(`frames captured: ${rec.frames.length}`);
  const out = assemble(rec.frames, `${OUT}/take-${MODE}.mp4`);
  console.log('output: ' + execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration', '-of', 'csv=s=x:p=0', out]).toString().trim());

  await rec.context.close();
  await rec.browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
