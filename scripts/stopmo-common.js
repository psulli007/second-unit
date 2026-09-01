// STOP-MOTION 4K recording engine.
//
// Principle: page.screenshot() respects deviceScaleFactor (video capture never does),
// so we drive the UI in deterministic steps and screenshot each output frame:
//   desktop: viewport 1280x800 @ DSF 3 -> 3840x2400 frames
//   mobile:  viewport 540x960  @ DSF 4 -> 2160x3840 frames
// Native layout, native breakpoints (no zoom shims). ~484ms per frame wall-clock ->
// ~15s wall per 1s of 30fps motion; holds cost a single frame.
//
// The timeline is a list of frames with explicit OUTPUT durations:
//   hold(s)                  1 frame, duration s
//   glide(y, s)              eased scroll of the app's scroll container to y over s seconds
//                            (one frame per 1/fps of output time)
//   type(locator, text)      real key events, 1 frame per char (~12 cps on screen)
//   tap(locator)             click + 2 frames catching the ripple
//   live(s)                  documentary mode: capture as fast as possible for s REAL
//                            seconds, durations = real elapsed (for AI streaming, toasts)
//   settle(ms)               real-time wait, no frames (network/app catch-up)
// assemble() -> CFR 30fps mp4 via concat durations.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { TAP_INIT } = require('./mobile-common');
const { openApp } = require('../lib/app-target');
const { fullbleed } = require('./rec4k-common');

const MODES = {
  desktop: { width: 1280, height: 800, dsf: 3 },   // 3840x2400
  // Height chosen to match a photoreal phone frame's MEASURED screen aspect (0.4545),
  // so the master drops into that frame with no crop and no stretch. Re-measure your
  // own frame with scripts/measure-frame.py and set the height to match.
  //
  // Two lessons worth keeping: (1) get the device aspect from HEIGHT, never by
  // narrowing the width — narrowing changes which responsive breakpoint the app
  // renders at, so you end up filming a different layout than the one you meant to;
  // (2) for device-screen compositing film at the device's REAL point width (e.g.
  // 402pt for a modern iPhone, see the device-screen-studio skill) — at 540 the UI
  // renders ~34% too small once it's inside a phone frame.
  mobile: { width: 540, height: 1188, dsf: 4 },    // 2160x4752, aspect 0.4545
  // 9:16 variant, only when a master is destined for social (TikTok/Reels/Shorts).
  mobile916: { width: 540, height: 960, dsf: 4 },  // 2160x3840
};
const FPS = 30;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

async function setupStopmo(browserType, mode, frameDir, opts = {}) {
  const m = MODES[mode];
  if (!m) throw new Error('mode must be desktop|mobile');
  fs.mkdirSync(frameDir, { recursive: true });
  // Timed popovers, onboarding celebrations and "rate us" nags will interrupt an
  // otherwise perfect take, minutes in. Suppress them BEFORE the app boots — pass
  // `opts.initScripts` with whatever your app keys off, e.g.:
  //   ["try{sessionStorage.setItem('onboarding_dismissed','1')}catch(e){}",
  //    "window.addEventListener('app-celebrate', e => e.stopImmediatePropagation(), true);"]
  // Init scripts run before app code, so a capture-phase swallow wins.
  const { browser, context, page } = await openApp(browserType, {
    viewport: { width: m.width, height: m.height },
    contextOptions: { deviceScaleFactor: m.dsf },
    initScripts: [TAP_INIT, ...(opts.initScripts || [])],
  });

  const frames = []; // { file, dur }
  let n = 0;
  async function shot(dur) {
    const file = path.join(frameDir, `f${String(n++).padStart(6, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    frames.push({ file, dur });
  }

  // Many apps scroll inside a container, not the window. Find the tallest scroller
  // and fall back to the document if there isn't one.
  async function scroller() {
    return page.evaluateHandle(() => {
      let best = document.scrollingElement, bestGap = (document.scrollingElement?.scrollHeight || 0) - innerHeight;
      for (const el of document.querySelectorAll('div,main,section')) {
        const gap = el.scrollHeight - el.clientHeight;
        const r = el.getBoundingClientRect();
        if (gap > 60 && gap > bestGap && r.width > innerWidth * 0.5 && r.height > innerHeight * 0.4) { best = el; bestGap = gap; }
      }
      return best;
    });
  }

  const t = {
    hold: async (s) => { await shot(s); },

    glide: async (toY, s) => {
      const h = await scroller();
      const fromY = await h.evaluate(el => el.scrollTop);
      const steps = Math.max(2, Math.round(s * FPS));
      for (let i = 1; i <= steps; i++) {
        const y = fromY + (toY - fromY) * easeInOut(i / steps);
        await h.evaluate((el, yy) => { el.scrollTop = yy; }, y);
        await shot(1 / FPS);
      }
      await h.dispose();
    },

    type: async (locator, text, { cps = 12 } = {}) => {
      await locator.click();
      await shot(0.15);
      for (const ch of text) {
        await page.keyboard.type(ch);
        await shot(1 / cps);
      }
    },

    tap: async (locator, { after = 0.35 } = {}) => {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      const b = await locator.boundingBox();
      if (!b) throw new Error('tap: no bounding box');
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await shot(0.22);        // ripple fresh (screenshot latency lands mid-animation)
      await shot(after);       // ripple fading / UI reacting
    },

    live: async (s) => {
      const t0 = Date.now();
      let last = t0;
      while (Date.now() - t0 < s * 1000) {
        await shot(0); // duration patched below
        const now = Date.now();
        frames[frames.length - 1].dur = (now - last) / 1000;
        last = now;
      }
    },

    settle: (ms) => page.waitForTimeout(ms),
    shot,
  };

  return { browser, context, page, frames, t, mode: m };
}

function assemble(frames, outMp4, { crf = 16, fps = FPS } = {}) {
  if (!frames.length) throw new Error('assemble: no frames');
  const listFile = outMp4 + '.concat.txt';
  const abs = f => path.resolve(f).replace(/'/g, "'\\''");
  const lines = ["ffconcat version 1.0"];
  for (const f of frames) {
    lines.push(`file '${abs(f.file)}'`);
    lines.push(`duration ${Math.max(f.dur, 1 / 120).toFixed(4)}`);
  }
  lines.push(`file '${abs(frames[frames.length - 1].file)}'`);
  fs.writeFileSync(listFile, lines.join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', `fps=${fps}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4], { stdio: 'inherit' });
  return outMp4;
}

module.exports = { setupStopmo, assemble, fullbleed, MODES, FPS };
