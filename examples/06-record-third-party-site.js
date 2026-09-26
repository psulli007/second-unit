// EXAMPLE 6 — record your product embedded in a site you do not control.
//
// The other five examples film an app you run. This one films a page someone else runs,
// with your product inside it: a customer's live site, a partner's staging install, a demo
// tenant. For anything embedded, that is the only place the real thing exists — and it is
// also the footage people believe, because the page around it was obviously not built for
// the demo.
//
// Before you run this against a real customer's site:
//   1. Get their permission, in writing, for footage you intend to publish.
//   2. Check what else is on the page. Their name, their photos, their ads, their
//      subscribers' comments. `setupPlainSite` blocks ad and tracker hosts; everything else
//      that is on that page will be in your video.
//   3. Film a probe first and READ the frames. Pixel-baked text (a name inside a hero image,
//      a watermark on a photo) cannot be redacted by anything in this repo.
//
// Run:  SITE_URL="https://example.com/some-page" node examples/06-record-third-party-site.js
const path = require('path');
const { chromium } = require('playwright');
const { setupPlainSite } = require('../scripts/site-common');
const { cfg } = require('../lib/config');

const URL = process.env.SITE_URL || cfg.SITE_URL;
const OUT = path.join(process.cwd(), 'out', 'site');

(async () => {
  if (!URL) { console.error('set SITE_URL (env or config.env) to the page you are filming'); process.exit(2); }

  // dsf 3 so the frames are sharp enough to crop into; recordVideo is fine for a probe or a
  // web-sized cut. For a master, drop recordVideo and drive stopmo-common's makeTimeline.
  const { browser, context, page } = await setupPlainSite(chromium, {
    viewport: { width: 1280, height: 720 },
    dsf: 3,
    videoDir: OUT,
    // Hosts beyond the built-in ad/tracker list that this particular site loads.
    extraBlockedHosts: [],
  });

  const T0 = Date.now();
  const mark = (n) => console.log('MARK', n, ((Date.now() - T0) / 1000).toFixed(2) + 's');

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  // Wait for YOUR product, not for the page. A host page fires `load` while the embed is
  // still mounting, and a take that starts on the empty slot wastes the whole recording.
  await page.waitForSelector(cfg.APP_READY_SELECTOR || 'body', { timeout: 45000 });
  mark('page');
  await page.waitForTimeout(2500);

  // Many embeds only initialise after a REAL input event (they defer their bundle until the
  // visitor moves or scrolls, to keep the host's page-speed score). A recorder that goes
  // straight to clicking finds nothing there. Move first, then scroll, then act.
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1500);
  mark('embed-visible');

  // …drive your own flow here, marking each beat. Cut on the MARK lines, never a stopwatch.
  mark('done');
  await page.waitForTimeout(1500);

  await context.close();
  await browser.close();
  console.log('done →', OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

// ── Filming a demo install built from someone else's theme ────────────────────────────────
// Use setupSite() instead, and substitute the theme's branding for yours. Text substitution
// does not cover a stock author photo — that is a real person's likeness — so swap the asset:
//
//   const { setupSite } = require('../scripts/site-common');
//   const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">…</svg>`;
//   const { browser, context, page } = await setupSite(chromium, {
//     videoDir: OUT, mobile: true,
//     redact: [['demo-tenant.example.com', 'yourproduct.com'], ['Theme Demo Kitchen', 'Your Product']],
//     swapAssets: [['**/theme-logo.svg', { body: MARK_SVG }],
//                  ['**/secure.gravatar.com/avatar/**', { body: MARK_SVG }]],
//     hide: ['.theme_newsletter_box'],
//   });
