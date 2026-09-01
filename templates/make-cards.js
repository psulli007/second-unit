// Renders branded title cards (1280x800 PNGs) via Playwright screenshots.
//
// Styling comes entirely from the BRAND_* tokens in config.env, so this file is
// nobody's brand out of the box. Edit the CARDS array (and only the CARDS array)
// per video; a card deck is script, not code.
//
//   node templates/make-cards.js [outDir]     # default: ./cards
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { brand } = require('../lib/config');

const OUT = process.argv[2] || path.join(process.cwd(), 'cards');
const { name: BRAND_NAME, accent: A1, accent2: A2, ink: INK, paper: PAPER, font: FONT } = brand;
const FONT_URL = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT)}:wght@400;600;800&display=swap`;

// The small uppercase line above a title card's headline. Usually "New in <product>".
const KICKER = process.env.CARD_KICKER || `New in ${BRAND_NAME}`;

const CARD_CSS = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1280px;height:800px;display:flex;flex-direction:column;align-items:center;justify-content:center;
       background:${PAPER};font-family:'${FONT}',system-ui,sans-serif;-webkit-font-smoothing:antialiased;gap:18px}
  .kicker{font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#B0B0B0}
  h1{font-size:64px;font-weight:800;letter-spacing:-0.045em;color:${INK};text-align:center;line-height:1.1}
  h1 .grad{background:linear-gradient(90deg,${A1},${A2});-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{font-size:20px;color:#606060;letter-spacing:-0.01em}
  .num{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,${A1},${A2});
       color:#fff;font-size:24px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
  .dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(90deg,${A1},${A2});margin-top:10px}
`;

// ── EDIT ME ─────────────────────────────────────────────────────────────────
// One entry per card. `grad` paints a span with the accent ramp — use it on the
// one word the card is actually about, not the whole headline.
const CARDS = [
  { file: 'card-intro.png', html: `
      <div class="kicker">${KICKER}</div>
      <h1><span class="grad">Your Feature</span></h1>
      <div class="sub">The one-line promise this video delivers on</div>` },
  { file: 'card-1.png', html: `
      <div class="num">1</div>
      <h1>First step</h1>
      <div class="sub">What the viewer is about to watch happen</div>` },
  { file: 'card-2.png', html: `
      <div class="num">2</div>
      <h1>Second step</h1>
      <div class="sub">Keep these to one short clause</div>` },
  { file: 'card-3.png', html: `
      <div class="num">3</div>
      <h1>The payoff</h1>
      <div class="sub">The result the whole clip was building to</div>` },
  { file: 'card-outro.png', html: `
      <h1><span class="grad">${BRAND_NAME}</span></h1>
      <div class="sub">Your tagline</div>
      <div class="dot"></div>` },
];
// ────────────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  for (const card of CARDS) {
    await page.setContent(`<style>${CARD_CSS}</style>${card.html}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600); // webfont settle — screenshot too early and you get the fallback
    await page.screenshot({ path: path.join(OUT, card.file) });
    console.log(path.join(OUT, card.file));
  }
  await browser.close();
})();
