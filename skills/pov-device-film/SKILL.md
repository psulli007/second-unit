---
name: pov-device-film
description: "End-to-end runbook for making a POV product film — a character holding/using a device with the REAL app live on its screen, at 4K. Use when asked to make or re-cut a POV phone/laptop video, add a new flow to one, or produce this style of shot for a character or product. Covers the run order, the stop-motion recording engine (holds, hand-held drift, live AI waits), the app-state prep that keeps a hero shot clean, the automated QA gate, and delivery. Pairs with device-screen-studio (getting the UI onto the glass) and story-bible-builder (who the character is)."
---

# POV Device Film

How a finished POV film is actually made. `device-screen-studio` explains getting a
UI onto a screen *correctly*; this is the runbook for turning that into a **film**.

Output of this pipeline: one mp4 per flow under `out/pov/` — 2160×3840 (phone) /
3840×2160 (laptop), 30fps, ~24 Mb/s.

## The shape of it

A generated photo of a character holding a device (**screen a flat chroma green**) + the **real
running app** rendered into the measured screen quad + browser chrome drawn at true OS point
sizes + a stop-motion capture that drives the app and shoots each frame. Nothing is
composited, nothing is tracked, and no AI ever touches the interface.

## Run order

```
1  generate plate (GREEN screen)      -> device-screen-studio
2  python3 scripts/measure-frame.py <plate.png> --green --json > <plate>.json
3  python3 scripts/autocal.py <plate.png> [layoutw]     # closes the loop on the render
4  node scripts/probe-stage.js <plate.png> <chrome> <device> /tmp/x.png [layoutw]   # ONE still
5  node examples/05-record-device-stage.js phone | laptop   # your own copy, per flow
6  node scripts/qa-take.js out/pov/<clip>.mp4 --plate      # must pass before anyone watches
7  import to Photos + review on a real phone
```

Never skip **4**. A still costs ~30s; a take costs ~4 minutes and every geometry or content
error shows up in the still first.

### Commands that work today

```
node examples/05-record-device-stage.js phone   # copy per flow; set frame/meas/bg in the file
node examples/05-record-device-stage.js laptop  # laptop wants pose ~1.7
node scripts/qa-take.js out/pov/<clip>.mp4 --plate
node scripts/calibrate.js <plate.png> [layoutw] # manual 4-corner fallback, with a 6x loupe
```

The recording engine itself is `scripts/device-stage.js` — `openDeviceStage()` returns
`{ page, frame, t, assemble }`, where `t` is the stop-motion timeline
(`hold` / `glide` / `type` / `live` / `settle`). Write one small file per flow rather than
one recorder with a flag per flow; flows diverge fast and a shared recorder ends up as a
tangle of conditionals.

Stage params (`templates/device-stage.html`): `device` `frame` `quad` `rect` `rad` `bg` `tilt`
`src` `layoutw` `chrome` `time` `url` `pose`.

## The recording engine

Playwright drives the live app and screenshots each frame; ffmpeg assembles CFR 30. Screen
recording can't be used — CDP screencast caps at the window surface and never reaches 4K, but
**screenshots do respect deviceScaleFactor**.

**A hold must be MANY frames, never one long frame.** This is the single biggest trap. Emitting
a 3-second hold as one frame with a 3s duration freezes the picture solid, and any per-frame
motion (the hand-held drift) then only steps *between* holds — so the plate jumps. Holds are
where most of a take's screen time lives. Measured: median frame-to-frame delta went 0.002
(a slideshow) → 0.22 (alive) after the fix.

**Hand-held drift (`pose`).** A plate locked to the pixel for 25s is a loud CGI tell.
`installPose()` sums incommensurable sines into translate/rotate/scale so it never visibly
repeats; the recorder advances it by each frame's own playback duration. Amplitude is one dial:
**1.0 phone, 1.7 laptop** — the laptop camera is a *bird's head*, which moves more than a hand
holding a phone, not less. Baseline overscan scales with amplitude so raising `pose` can't
silently open a black gap at the frame edge.

**Live beats.** `live(secs)` shoots as fast as it can and stamps each frame with its real
elapsed time, so a genuine AI wait plays back at true speed. `think(secs, until, cap)` shows a
short loading beat, then waits **off camera** for the result — filming a whole AI wait gives
~15s of empty void that reads as a hang.

## App-state prep (what keeps a hero shot clean)

All of these are in the recorders; port them to any new flow.

- **Open on a POPULATED state.** Empty states are the default for a fresh session, and an
  empty state reads as a broken page — plus a near-white empty card flashes hard against a
  warm scene. Seed data first, or start capturing only after you've navigated somewhere with
  content in it.
- **Wait for images to DECODE, not just exist.** "Results are in the DOM" ≠ "results are shown";
  shooting early catches a grid of grey placeholder boxes. Poll `img.complete && naturalWidth > 0`.
- **Bump asset resolution.** Apps commonly serve a small thumbnail (256px) where a large
  variant (1024px) exists at the same URL with one path segment changed — rewriting those
  requests bought **+37% sharpness for free** here. Check the actual request URLs; in our case
  the path separator was percent-encoded (`%2Fsmall.jpeg`), so a naive `/small.jpeg` match
  silently never fired and the "fix" did nothing for a whole batch.
- **Force instant scrolling.** `scroll-behavior: smooth` makes each per-frame `scrollTop`
  restart an animation and read back the OLD value, so a "does this scroll?" probe concludes
  "no" and every glide no-ops. Inject `*{scroll-behavior:auto!important}`.
- **Suppress intrusions persistently** with a MutationObserver, not a one-shot pass — banners
  remount. Typical offenders: empty-state prompts, upgrade/usage bars, login popovers,
  onboarding celebrations, ad slots. Hide chrome, never real UI: if a feature genuinely shows
  an upsell, that belongs on camera.
- **Pin a modal-in-a-page full-viewport INSIDE the iframe** or the host page's header shows on
  the device screen (desktop especially).
- **Drive by DOM click / focus(), never coordinates.** The iframe sits under a `matrix3d`
  homography, so coordinate hit-testing is unreliable — and a POV shot must show no cursor.

## The QA gate

`node scripts/qa-take.js <clip> --plate` — non-zero exit on FAIL. **The `--plate` flag is
not optional here.** Without it the gate runs in screen-recording mode, where static runs are
expected content — and it will wave through the exact slideshow bug the `motion` check exists
to catch. Every check exists because that
defect actually shipped once, and twice I had convinced myself it wasn't there.

| Check | Catches |
|---|---|
| `motion` | holds emitted as single long frames (a slideshow) |
| `frozen` | any static run ≥1.5s |
| `edge-gap` | the plate under-covering the frame — tests for TRUE black (<3), because a dark plate is dark but never zero |
| `dead-tail` | ending on a stalled frame |
| `empty-screen` | an empty/loading state held on screen |

**Test the detector against known-bad input before trusting it.** Synthesise a frozen clip and
a padded-border clip and confirm both FAIL — an untested detector is the same mistake as
trusting a statistic.

## Reviewing — the rule that matters most

**Always review FULL frames sampled across the clip, never one crop, and never a statistic
alone.** Things that were both true at once in this project: 100% detection and a visibly
broken composite; "sharpness improved" and the fix silently not applied; a 4.2% edge-gap FAIL
that was the laptop's own black chassis.

Corollary: **never compare a metric across two different takes.** Scroll position, content and
drift all differ, so it measures nothing. Compare like for like — same asset, same render size.

## Delivery

Files on disk are the source of truth: the output dir holds exactly one file per clip and each
re-record overwrites in place. For phone review, import to Photos — **into a NEW dated album,
never re-importing into an existing one.** Photos has no delete API and sorts by embedded date,
so re-importing after a re-record leaves old and new versions side by side with identical
filenames and no way to tell them apart. That mistake has been made twice here.
