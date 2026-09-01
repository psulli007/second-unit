---
name: feature-video
description: Produce marketing videos for a product feature from real product footage — bootstrap the studio, probe the feature, record, verify, derive highlight/vertical/square formats. Use when a new feature ships and needs launch videos, when someone asks to "make a video about <feature>", or to refresh videos after UI changes.
---

# Feature Video Pipeline

Produce launch videos for a feature using ONLY real product footage. Read `README.md` and
`docs/RECORDING-GUIDE.md` for the philosophy and the hard rules — this skill is the
executable checklist.

## Inputs

`$ARGUMENTS` = the feature to film (e.g. "recipe notes"). If empty, ask which feature and
which formats (default: demo + highlight; vertical/square on request).

## Steps

1. **Bootstrap.** `scripts/bootstrap.sh` — toolchain check, optional app checkout, deps,
   library folders. Then `scripts/dev-server.sh` if the app lives in `app/`. Report missing
   tools to the user rather than installing them yourself.

2. **Locate the feature** in the running app's source (grep). Find the route, tab id, or
   entry point that opens it. If you can't find the feature in code, say so — never guess.

3. **Probe (no video).** Headless page, drive the flow, screenshot every step, and READ the
   screenshots before writing selectors. Never write a selector from memory.

4. **Record.** Copy the closest `examples/` recorder:
   - `01-record-desktop.js` — the default. 1280×800, cheap, good enough for most demos.
   - `02-record-mobile.js` — source footage for vertical/social cuts.
   - `03-record-4k.js` / `04-record-stopmotion.js` — hero footage, much slower.
   - `05-record-device-stage.js` — the app live on a photoreal device.
   Print a `MARK` at every beat. Real typing, 2–3 s holds.

5. **Verify.** `node scripts/qa-take.js <clip>` must pass, THEN extract frames
   (`ffmpeg -vf fps=1/4`) and read them. Re-record on stuck spinners or dead time; max two
   retries, then report the blocker honestly.

6. **Export + deliver.** Trim lead; `libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart`.
   Copy to `$LIBRARY_DIR` immediately — never batch deliveries.

7. **Derive formats** as requested: cut on the MARKs with `scripts/build-flowcut.js`
   (captions are what make it a post, not raw footage), cards via `templates/make-cards.js`,
   captions via `templates/make-social-captions.js`, music via `scripts/add-music.sh`. Verify
   frames of every derived cut too.

8. **Update the library index**: file, format, duration, audience, feature, suggested channel.

## Hard rules

- Never fake UI; never use AI-generated product imagery. AI b-roll only with zero UI, text,
  or faces, and only as inserts between real footage.
- Never log in with real credentials, create accounts, submit emails, or proceed past a
  payment UI.
- If a feature can't be exercised, report it — don't stage a substitute.
- Deliver each cut as it's finished, not in a batch at the end.
