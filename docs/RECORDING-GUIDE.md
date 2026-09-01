# Recording guide

The operating manual for filming a real product. Read this before writing a recorder;
almost every rule here exists because breaking it cost a take.

## The one rule

**You are recording REAL UI.** Never mock, stage, or fabricate a screen. Everything on
camera must be the actual app talking to a real backend. AI generation has a place in this
repo — atmosphere, characters, environments, device bodies — but never the interface, never
text the product would render, and never a fake result.

This is not just an ethics rule, it is a quality rule. Fabricated UI reads as fake to
viewers who cannot say why, and the whole video pays for it.

## Setup

- `scripts/bootstrap.sh` once per machine, then `scripts/dev-server.sh` if you cloned an
  app into `app/`.
- Not sure whether a problem is yours or the studio's? Run the same recorder against the
  bundled demo app (`node scripts/demo-app.js`, then `node examples/01-record-desktop.js`).
  It takes a minute and it splits the question cleanly.
- `config.env` holds everything machine- or product-specific: `APP_URL`, the readiness gate,
  the CSS to hide, brand tokens, library path. No recorder should hardcode any of it.
- Playwright + Chromium install at the repo root, so `require('playwright')` resolves from
  any subdirectory.
- ffmpeg: resolve via `command -v ffmpeg`; the path differs per machine.

## Method — follow it in this order

**1. PROBE first, with no video.** Open a headless page, drive the flow, `page.screenshot()`
at each step, and dump the visible controls when you need selectors:

```js
await page.evaluate(() => [...document.querySelectorAll('button, input, [role=button]')]
  .filter(e => e.offsetParent)
  .map(e => ({ tag: e.tagName, text: e.innerText?.slice(0, 40), cls: e.className })))
```

Then **read the screenshots** before writing a single selector. Guessing selectors from
memory of the app is the single largest source of wasted takes.

**2. RECORD.** New browser context per take — a fresh context is a fresh session, which is
what makes a take reproducible. Pace the scenes:

- `waitForSelector` on real content, never `waitForTimeout` as a substitute. A sleep either
  films a spinner or wastes three seconds, and which one you get depends on the network.
- 2–3 s holds on states you want the viewer to actually read.
- Real typing: `pressSequentially({ delay: 85 })`. An instantly-filled field is the clearest
  "this is a robot" tell in a product demo.
- Print a `MARK` line at every beat. This is what lets the cutter land cuts on scene
  boundaries instead of mid-keystroke — see the `product-demo-videos` skill.
- Only hide non-substantive chrome (loading overlays, empty dev-only ad slots, cookie
  banners) via `APP_HIDE_CSS`. Never hide real UI to make a feature look better than it is.

**3. VERIFY.** Run the automated gate first, then look:

```bash
node scripts/qa-take.js out/desktop/take.mp4           # screen recording
node scripts/qa-take.js out/pov/take.mp4 --plate       # POV / device-stage take
ffmpeg -i out/desktop/take.mp4 -vf fps=1/4 out/frames/f_%02d.png
```

Pass `--plate` for anything filmed on a device stage or a POV plate. Those takes carry
continuous hand-held drift, so every frame should differ and a 1.5 s static run is a real
defect; a plain screen recording holds still on purpose and would fail that check on every
well-paced demo.

Read the frames. Every check in `qa-take.js` exists because that defect actually shipped
once — twice after the reviewer had convinced themselves it wasn't there. Reviewing a couple
of stills does not catch a frozen hold, an edge gap, or an empty-screen stall.

Re-record on stuck spinners, dead time, or error toasts (unless you are demoing errors). Cap
it at two retries, then report the blocker honestly rather than shipping something worse.

**4. EXPORT.** Trim the lead-in, then:

```bash
ffmpeg -ss <trim> -i in.webm -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart out.mp4
```

Playwright records VP8/WebM. Renaming to `.mp4` without transcoding produces a file every
downstream tool mis-reads and ffmpeg writes nothing from.

**5. DELIVER immediately.** Copy each verified cut to `$LIBRARY_DIR` as soon as it's done and
update the index. Batching deliveries at the end of a session is how videos get lost.

## Safety rules — non-negotiable

- **Never log in with real credentials.** Use a test/anonymous session.
- **Never submit personal data.** For an email-capture or signup flow, show the form and the
  CTA appearing — that *is* the deliverable. Do not submit it.
- **Never complete a purchase or subscription.** Record up to the point the payment UI is
  shown, never past it.
- **Never film production data.** Someone's real name in a demo video is a leak, and it will
  outlive the video.
- If a feature genuinely cannot be exercised (backend rejects it, flag is off), **don't fake
  it.** Say so and move on.

## Gotchas, all hit for real

- **Fresh context = fresh user.** Flows that create objects (plans, items, saves) do so under
  that session. Fine against a dev backend; think twice against anything else.
- **The first recording after a cold dev server is unreliable** — the browser starts driving
  while the bundler is still compiling. Warm it, and retry once before believing a failure.
- **HMR desyncs the page after a git pull.** Restart the dev server rather than debugging a
  phantom.
- **`scroll-behavior: smooth` breaks per-frame scrolling.** Each `scrollTop` write restarts an
  animation and reads back the old value, so a "does this scroll?" probe concludes "no" and
  every glide silently no-ops. Inject `*{scroll-behavior:auto!important}` for stop-motion.
- **Wait for images to DECODE, not just exist.** "In the DOM" ≠ "on screen". Poll
  `img.complete && img.naturalWidth > 0` or you'll film a grid of grey boxes.
- **Real backend waits are content.** A streaming answer or a live timer is the proof the
  footage is real. Keep those at 1× in the edit — speeding them up is what makes a demo feel
  fabricated even when it isn't.
