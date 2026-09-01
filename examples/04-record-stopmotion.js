// EXAMPLE 4 — stop-motion 4K: the sharpest output this repo can produce.
//
//   node examples/04-record-stopmotion.js desktop | mobile
//
// The trick: page.screenshot() DOES respect deviceScaleFactor (video capture
// never does). So instead of filming, drive the UI in deterministic steps and
// screenshot every output frame, then assemble at a constant 30fps. You get
// native layout, native breakpoints, no zoom shims, and genuinely crisp text.
//
// The trade: ~15 seconds of wall-clock per 1 second of finished motion. Holds
// are free (one frame, long duration), motion is expensive. That inverts how
// you write a shot — long holds and short glides, which is also better editing.
//
// The timeline verbs, all of which take OUTPUT seconds, not real ones:
//   t.hold(s)              one frame held for s
//   t.glide(y, s)          eased scroll to y over s
//   t.type(locator, text)  real key events, one frame per character
//   t.tap(locator)         click + two frames catching the ripple
//   t.live(s)              real-time capture for s REAL seconds — use this for
//                          anything genuinely asynchronous (a streaming answer,
//                          a progress bar). Faking those is what makes demos lie.
//   t.settle(ms)           wait without filming (let the network catch up)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { setupStopmo, assemble, fullbleed } = require('../scripts/stopmo-common');

const MODE = process.argv[2] || 'desktop';
const OUT = path.join(process.cwd(), 'out', `stopmo-${MODE}`);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const t0 = Date.now();
  const rec = await setupStopmo(chromium, MODE, `${OUT}/frames`, {
    // Timed popovers and onboarding celebrations will ruin a take minutes in.
    // Suppress them before the app boots, keyed to whatever your app listens for:
    // initScripts: [
    //   "try{sessionStorage.setItem('onboarding_dismissed','1')}catch(e){}",
    //   "window.addEventListener('app-celebrate', e => e.stopImmediatePropagation(), true);",
    // ],
  });
  const { page, t } = rec;

  await page.waitForSelector('[data-testid=main-content]', { timeout: 30000 });
  await t.settle(2500);
  if (MODE === 'desktop') { await fullbleed(page); await t.settle(600); }

  await t.hold(2.0);            // opening state
  await t.glide(600, 1.6);      // browse down
  await t.hold(1.6);
  await t.glide(1200, 1.6);
  await t.hold(1.6);
  await t.glide(0, 1.8);        // back to top
  await t.hold(1.0);

  // Open the create flow. t.tap() spends two frames catching the click ripple, which is
  // what makes a click legible at 30fps instead of a state that changes for no reason.
  await t.tap(page.getByTestId('create'));
  await page.waitForSelector('dialog[open]', { timeout: 10000 });
  await t.hold(1.0);

  await t.type(page.getByTestId('name'), 'Launch assets');
  await t.hold(0.8);

  // The async beat. `live` captures in real time and stamps each frame with its true
  // elapsed duration, so the wait plays back at the length it actually took. This is the
  // shot that proves the footage is real — never speed it up.
  await t.tap(page.getByTestId('save'));
  await t.live(2.6);
  await page.waitForSelector('[data-testid=result]', { timeout: 30000 });
  await t.hold(2.4);

  console.log(`frames: ${rec.frames.length}, wall: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const out = assemble(rec.frames, `${OUT}/take-${MODE}.mp4`);
  console.log('output: ' + execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', out]).toString().trim());

  await rec.context.close();
  await rec.browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
