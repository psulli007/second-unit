// The one place that knows anything about YOUR app.
//
// Every recorder in this repo opens a page, waits for the app to actually be
// live, hides non-substantive chrome, and then films. Only the "actually be
// live" part is app-specific — so it lives here, driven by config.env, and no
// recorder hardcodes a URL or a readiness check.
//
//   const { openApp, appReady } = require('../lib/app-target');
//   const { browser, context, page } = await openApp(chromium, { viewport, recordVideo });
//
// If your app needs richer setup than a URL and a readiness gate — an entry
// function to call, a fixture user to seed, query params for a demo tenant —
// put it in a project hook: create `app.config.js` at the repo root exporting
// `{ async prepare(page, opts) {} }` and it runs after the readiness gate.
const fs = require('fs');
const path = require('path');
const { ROOT, cfg } = require('./config');

const APP_URL = cfg.APP_URL || 'http://localhost:5173';
const READY_SELECTOR = cfg.APP_READY_SELECTOR || '';
const READY_FUNCTION = cfg.APP_READY_FUNCTION || '';
const READY_DELAY = Number(cfg.APP_READY_DELAY_MS || 2000);
const HIDE_CSS = cfg.APP_HIDE_CSS || '';

let projectHook = null;
const hookPath = path.join(ROOT, 'app.config.js');
if (fs.existsSync(hookPath)) projectHook = require(hookPath);

// Wait until the app is genuinely interactive. Prefer a real signal (a global
// the app defines, or a selector that only exists post-mount) over a sleep —
// a fixed delay either wastes seconds or films a spinner, depending on the day.
async function appReady(page, { timeout = 30000 } = {}) {
  if (READY_FUNCTION) {
    await page.waitForFunction(
      (name) => {
        const v = name.split('.').reduce((o, k) => (o == null ? o : o[k]), window);
        return typeof v === 'function' || (v !== undefined && v !== null);
      },
      READY_FUNCTION,
      { timeout },
    );
  } else if (READY_SELECTOR) {
    await page.waitForSelector(READY_SELECTOR, { state: 'visible', timeout });
  } else {
    await page.waitForLoadState('load');
    await page.waitForTimeout(READY_DELAY);
  }
  if (HIDE_CSS) await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
}

// Same gate, for a page living inside an iframe (the device-stage compositor
// loads the app in a frame sized to the measured screen rect).
async function frameReady(frame, { timeout = 40000 } = {}) {
  if (READY_FUNCTION) {
    await frame.waitForFunction(
      (name) => {
        const v = name.split('.').reduce((o, k) => (o == null ? o : o[k]), window);
        return typeof v === 'function' || (v !== undefined && v !== null);
      },
      READY_FUNCTION,
      { timeout },
    );
  } else if (READY_SELECTOR) {
    await frame.waitForSelector(READY_SELECTOR, { state: 'visible', timeout });
  } else {
    await frame.waitForTimeout(READY_DELAY);
  }
}

// Open the app in a fresh context and return it filmable.
// `initScripts` are addInitScript payloads (cursor, tap ripple, redaction…).
async function openApp(browserType, opts = {}) {
  const {
    viewport = { width: 1280, height: 800 },
    recordVideo = null,
    initScripts = [],
    url = APP_URL,
    launch = {},
  } = opts;

  const browser = await browserType.launch(launch);
  const context = await browser.newContext({
    viewport,
    ...(recordVideo ? { recordVideo } : {}),
    ...(opts.contextOptions || {}),
  });
  for (const s of initScripts) await context.addInitScript(s);

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await appReady(page);
  if (projectHook && typeof projectHook.prepare === 'function') {
    await projectHook.prepare(page, opts);
  }
  return { browser, context, page };
}

module.exports = { APP_URL, openApp, appReady, frameReady, projectHook };
