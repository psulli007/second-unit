// EXAMPLE 1 — the baseline desktop recording (1280x800, Playwright recordVideo).
//
// Start here. This is the cheapest recorder in the repo and it is good enough
// for most feature demos. Everything else (4K, stop-motion, device stages) is a
// specialisation of this shape:
//
//   open the app  →  wait for REAL content  →  paced interaction  →  final hold
//
// Run:  node examples/01-record-desktop.js
//
// The selectors below are placeholders. Replace them with your app's — and read
// docs/RECORDING-GUIDE.md first: the single biggest cause of a wasted take is
// writing selectors from memory instead of probing the running app.
const path = require('path');
const { chromium } = require('playwright');
const { openApp } = require('../lib/app-target');
const { CURSOR_INIT, humanClick, humanWheel } = require('../scripts/cursor');

const OUT = path.join(process.cwd(), 'out', 'desktop');

(async () => {
  const { browser, context, page } = await openApp(chromium, {
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
    // A visible cursor makes a screen recording legible — without it, things
    // change on screen for no visible reason and the viewer can't follow.
    initScripts: [CURSOR_INIT],
  });

  // MARK lines are how the cutter finds scene boundaries later. Print one at
  // every beat you might want to cut on; scripts/build-flowcut.js turns these
  // timestamps into segments, which is what stops cuts landing mid-action.
  const T0 = Date.now();
  const mark = (n) => console.log('MARK', n, ((Date.now() - T0) / 1000).toFixed(2) + 's');

  // ── Scene 1: the landing state ────────────────────────────────────────────
  // Wait for real content, never a fixed sleep. A sleep either films a spinner
  // or wastes three seconds, and which one you get depends on the network.
  await page.waitForSelector('[data-testid=main-content]', { timeout: 45000 });
  mark('landing');

  // Images that are still decoding read as a broken page on video. Wait for
  // them to actually paint before holding on the shot.
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => i.offsetParent && i.clientWidth > 60);
    return imgs.length === 0 || imgs.every(i => i.complete && i.naturalWidth > 0);
  }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);           // hold so the viewer can read the screen

  // ── Scene 2: browse ───────────────────────────────────────────────────────
  // Scroll in flicks, not one jump — a single instant scroll is unreadable at
  // 30fps and looks like a cut.
  mark('browse');
  await humanWheel(page, 900);
  await page.waitForTimeout(1500);
  await humanWheel(page, -900);
  await page.waitForTimeout(1200);

  // ── Scene 3: a real interaction ───────────────────────────────────────────
  mark('open-form');
  await humanClick(page, page.getByTestId('create'));
  // NB: `[role=dialog]` is an ATTRIBUTE selector — a native <dialog> has that role
  // implicitly but carries no such attribute, so it would never match. Match the element.
  await page.waitForSelector('dialog[open]', { timeout: 15000 });
  await page.waitForTimeout(1200);

  // Type with real key events at human speed. Filling a field instantly is the
  // single clearest "this is automated" tell in a product demo.
  mark('typing');
  const input = page.getByTestId('name');
  await input.click();
  await input.pressSequentially('A realistic value', { delay: 85 });
  await page.waitForTimeout(900);

  // ── Scene 4: the payoff ───────────────────────────────────────────────────
  // Let the real backend take the time it takes. A live wait — a request
  // resolving, an answer streaming in — is the proof the footage is real, and
  // speeding it up in the edit is what makes a demo feel fake. Keep it at 1x.
  mark('submit');
  await humanClick(page, page.getByTestId('save'));
  await page.waitForSelector('[data-testid=result]', { timeout: 30000 });
  mark('result');
  await page.waitForTimeout(3000);           // final hold — never end on a cut

  await context.close();                     // flushes the video file
  await browser.close();
  console.log('done →', OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
