// EXAMPLE 2 — mobile-viewport recording, the source for vertical/social cuts.
//
// Film at a real phone viewport rather than cropping a desktop recording later:
// a crop gives you desktop layout in a phone-shaped hole, which reads wrong to
// anyone who has used the app on a phone.
//
// Run:  node examples/02-record-mobile.js
const path = require('path');
const { chromium } = require('playwright');
const { setup, tap } = require('../scripts/mobile-common');

const OUT = path.join(process.cwd(), 'out', 'mobile');

(async () => {
  // 540x960 is a 9:16 frame that scales cleanly to 1080x1920. Use 390x844 to
  // match an actual iPhone's CSS viewport when layout fidelity matters more
  // than a clean vertical aspect.
  const { browser, context, page } = await setup(chromium, OUT, {
    width: 540, height: 960,
    // Optional: rewrite incidental staging strings that shouldn't be on camera.
    // Use it for hostnames and internal tenant slugs — NEVER to make the product
    // appear to do something it doesn't.
    // redact: [['acme-staging.internal', 'acme.com']],
  });

  const T0 = Date.now();
  const mark = (n) => console.log('MARK', n, ((Date.now() - T0) / 1000).toFixed(2) + 's');

  await page.waitForSelector('[data-testid="main-content"]', { timeout: 45000 });
  mark('landing');
  await page.waitForTimeout(4000);

  // On mobile, tap through coordinates rather than locator.click(). Carousels
  // and bottom sheets mid-transform fail Playwright's visibility checks, and a
  // click that silently never lands costs you the whole take.
  mark('open');
  await tap(page, page.getByRole('button', { name: 'Create' }));
  await page.waitForTimeout(1500);

  mark('typing');
  const input = page.getByRole('textbox').first();
  await input.click();
  await input.pressSequentially('Weeknight plan', { delay: 90 });
  await page.waitForTimeout(1200);

  mark('submit');
  await tap(page, page.getByRole('button', { name: 'Save' }));
  await page.waitForSelector('[data-testid="result"]', { timeout: 30000 });
  mark('result');
  await page.waitForTimeout(3500);

  await context.close();
  await browser.close();
  console.log('done →', OUT);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
