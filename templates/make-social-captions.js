// Renders vertical caption overlays (1080x1920 transparent PNGs) + an end card.
//
// Why heavy shadow and not a box: short-form video is watched muted and over
// unpredictable footage, so captions need to survive any background. A white
// ExtraBold face with a multi-direction black soft shadow reads on everything;
// a translucent box behind the text reads as a subtitle track and gets ignored.
//
//   node templates/make-social-captions.js [outDir]   # default: ./captions
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { brand } = require('../lib/config');

const OUT = process.argv[2] || path.join(process.cwd(), 'captions');
const { name: BRAND_NAME, accent: A1, accent2: A2, paper: PAPER, font: FONT } = brand;
const FONT_URL = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT)}:wght@400;600;800&display=swap`;
const END_SUB = process.env.END_SUB || 'Your tagline';

const BASE_CSS = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1920px;background:transparent;font-family:'${FONT}',system-ui,sans-serif;
       -webkit-font-smoothing:antialiased;position:relative}
  .cap{position:absolute;top:240px;left:60px;right:60px;text-align:center;
       font-size:64px;font-weight:800;line-height:1.25;color:#fff;letter-spacing:-0.02em;
       text-shadow:0 0 8px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.75),
                   0 3px 6px rgba(0,0,0,.9), 0 -2px 5px rgba(0,0,0,.7),
                   2px 0 5px rgba(0,0,0,.7), -2px 0 5px rgba(0,0,0,.7)}
`;

// ── EDIT ME ─────────────────────────────────────────────────────────────────
// One caption per scene. Caption 1 is the hook and is the only line most people
// will read — write it as the promise, not as a label. <br> where you want the
// line to actually break; don't leave it to the browser.
const CAPTIONS = [
  ['cap-1.png', 'the hook goes here<br>— make it a promise'],
  ['cap-2.png', 'what happens next'],
  ['cap-3.png', 'and then this'],
  ['cap-4.png', 'the payoff'],
];
// ────────────────────────────────────────────────────────────────────────────

const END_CSS = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1920px;background:${PAPER};font-family:'${FONT}',system-ui,sans-serif;
       display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
       -webkit-font-smoothing:antialiased}
  h1{font-size:132px;font-weight:800;letter-spacing:-0.045em;
     background:linear-gradient(90deg,${A1},${A2});-webkit-background-clip:text;
     background-clip:text;color:transparent}
  .sub{font-size:40px;color:#606060;letter-spacing:-0.01em}
  .dot{width:16px;height:16px;border-radius:50%;background:linear-gradient(90deg,${A1},${A2});margin-top:14px}
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [file, html] of CAPTIONS) {
    await page.setContent(`<style>${BASE_CSS}</style><div class="cap">${html}</div>`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, file), omitBackground: true });
    console.log(file);
  }
  await page.setContent(
    `<style>${END_CSS}</style><h1>${BRAND_NAME}</h1><div class="sub">${END_SUB}</div><div class="dot"></div>`,
    { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'endcard.png') });
  console.log('endcard.png');
  await browser.close();
})();
