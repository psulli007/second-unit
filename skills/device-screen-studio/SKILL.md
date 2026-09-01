---
name: device-screen-studio
description: "Put a real product UI on a real-looking device screen, in stills or video, WITHOUT compositing artifacts. Use whenever the ask is 'show the app on a phone/laptop', a device mockup, a product-in-device shot, a screen recording inside a device frame, or a hero shot of software running on hardware. The method: RENDER the device and the live UI together (photoreal device photo with the screen switched off + the live app positioned in the measured screen rect), never paste a UI onto a device photograph. Covers generating the device plate, keying it out, measuring the screen, matching the capture aspect, and recording at 4K."
---

# Device Screen Studio

Getting a real product UI onto a real-looking device is the single highest-failure task in
this whole pipeline. This skill is the method that finally worked, and the record of what
doesn't — read the failure modes first, because they are not obvious and each one cost a
full rebuild.

## THE CORE RULE

**Render the device and the screen together. Never paste a UI onto a device photograph, and
never let a video model render the UI.**

Two tempting approaches both fail for reasons you cannot fix downstream:

1. **Paste the UI onto an AI device photo** (perspective-warp a screenshot onto the screen).
   The photo was *lit for the blank screen it was generated with*, so: no screen bounce (the
   keyboard/bezel/desk stay lit as if by a bright white panel), no glass reflections (the
   pasted UI is dead matte), a flat-plane 4-corner warp that can't match lens distortion, and
   an unavoidable "sticker on a photo" read. Glare bands and grain are cosmetics over a
   physics mismatch.
2. **Let a video model animate a frame with the UI already on the screen.** It re-renders the
   screen and destroys every string. Real output from a run that explicitly demanded "the
   interface stays exactly as in the reference, perfectly legible and unchanged":
   *"Search Reyond mcipe tries"*, *"Zcmitute Simp Grahen Roteatie Reond"*. Prompting cannot
   save this.

## THE METHOD

A **photoreal device photo with its screen switched OFF**, backdrop keyed to transparency,
with the **live app in an iframe positioned exactly in the measured screen rectangle**, over
any background you like. Rendered together in one browser page and captured with the
stop-motion 4K engine. Result: photographic metal, pixel-perfect native-resolution UI, exact
geometry, zero warping, zero tracking, zero AI touching the interface, fully repeatable.

### Pieces

| File | Role |
|---|---|
| `templates/device-stage.html` | the stage: background + device frame + live app iframe + glass/glow layers |
| `templates/device-frames.css` | CSS-drawn phone/laptop frames (fallback when there's no photo plate) |
| `scripts/measure-frame.py` | finds the OFF screen rect + corner radius in a device photo, as % of the image |
| `scripts/frame-cutout.py` | keys the studio backdrop to transparency, keeping the contact shadow as soft alpha |
| `scripts/device-stage.js` | builds the stage and returns it filmable — `openDeviceStage()` gives you `{ page, frame, t, assemble }` with the stop-motion timeline |
| `examples/05-record-device-stage.js` | worked example; copy it per flow. The POV variant is the same thing with a whole-scene plate (a character holding the phone) in `quad` mode |

### Steps

**1 — Generate the device plate.** One image model call. The prompt must nail four things or
the plate is unusable: dead-straight-on (no perspective, so the screen is a true rectangle),
screen completely OFF (pure uniform black, no UI/reflections/glare), whole device in frame
with margin, and a plain seamless backdrop with a soft contact shadow.

> A photorealistic product photograph of a modern titanium smartphone, shot perfectly
> straight-on and dead-centered, absolutely no perspective distortion and no tilt — the
> phone's face is exactly parallel to the camera sensor so the screen is a perfect rectangle.
> Portrait orientation, the ENTIRE phone fully visible with generous even margin on all four
> sides, nothing cropped. The screen is completely OFF: a pure solid black rectangle,
> absolutely uniform, with NO interface, NO icons, NO text, NO logos, NO reflections and NO
> glare anywhere on the screen glass. Natural brushed titanium frame with realistic flat
> sides, a fine bright chamfer where the metal meets the front glass, subtle real specular
> highlights along the metal edges, and a pill-shaped black cutout near the top of the
> screen. Studio product lighting: large soft box from upper-left, clean gentle falloff, no
> harsh hotspots. Plain seamless mid-gray studio background, evenly lit, soft contact shadow
> beneath the phone. Tack-sharp macro product photography, real metal micro-texture,
> photographed not generated.

Generate 2–3 and pick on two criteria: **cleanest metal/chamfer detail**, and **screen aspect
closest to what you'll record**. Reject plates where the notch/island renders as an outlined
shape rather than a solid cutout.

**2 — Measure it.** `python3 scripts/measure-frame.py <plate.png> --json > <plate>.json`
Emits the screen rect as percentages (so the plate scales freely) plus the corner radius and
the screen aspect. **Measure the ORIGINAL, not the cutout** — after keying, the transparent
area is black and the dark-screen detector will report the whole image as the screen.

**3 — Key the backdrop.** `python3 scripts/frame-cutout.py <plate.png> <plate>-cutout.png`
Gives a transparent device with its contact shadow preserved as soft alpha, so it still sits
on a surface over any background. Verify by compositing over a checkerboard before trusting it.

**4 — Match the capture aspect to the plate.** Set the recording viewport so its aspect equals
the plate's measured `screen_aspect`, then the app fills the screen with no crop and no
stretch. **Adjust HEIGHT, never narrow the width below what the app's layout needs** — see the
layout-width failure mode below.

**5 — Record.** Copy `examples/05-record-device-stage.js` and set `device`, `frame`, `meas`, `bg`, `tilt`.
It auto-picks `<device>-canonical-cutout.png` + `<device>-canonical.json` if present, else
falls back to the CSS frame. `--bg` takes a URL, which is the move that matters:
**pass a location plate as the background** and you get the warmth of a real environment with
the crispness of a render. Also `--tilt <deg>` for a 3D rotation, `--frame`/`--meas` to
override the plate.

Record which plate is CANON in your own asset folder's ASSETS.md (the CANON phone plate is the
chroma one). Plate `.png` + `.json` are a unit — the json holds the measured screen quad.

## GENERATE THE PLATE WITH A GREEN SCREEN, NOT A BLACK ONE

**This is the single most important rule in this document.** Generate the device plate with
the screen as a flat saturated chroma green (~#00B140), not switched off.

A black screen cannot be measured reliably, because in these renders the bezel, the body, the
contact shadow and (on POV plates) the hand/feathers around the case are *also* black. There
is no unambiguous boundary to find. Consequences, all of which actually happened:

- The mask leaked, so the measured aspect came out 0.52 for a 0.46 phone.
- "Where the screen ends" moved 10-30px depending on the darkness threshold.
- Fitting the four edges — the textbook method — threw a corner **131px off the device**,
  even with span filtering and MAD outlier rejection.
- A rounded screen's true corners are not in the mask at all and must be extrapolated.
- Net: ~±25px of irreducible ambiguity, which reads on screen as "the line-up is *just*
  barely off" — visible to the client, and unfixable by more tuning.

Green is separable by HUE, so the mask is exact, the edge lands on a pixel, edge-fitting
becomes safe, and — best of all — **any misalignment shows up as a bright green fringe**
instead of a subtle dark one. Errors become obvious instead of arguable.

Prompt an existing black plate into a chroma one so the composition is preserved:

> Recreate this exact photograph with ONE change: the screen is a chroma-key green screen
> instead of black. Keep the composition, camera angle, framing and lighting exactly as in the
> reference. The screen must be a completely FLAT, UNIFORM, HIGHLY SATURATED PURE CHROMA GREEN
> rectangle (~#00B140) filling the entire display right to the edges of the glass, absolutely
> uniform, with NO interface, icons, text, logos, reflections, glare, gradient or shading. The
> boundary between the green and the black bezel must be crisp and hard-edged, with the
> display's rounded corners precisely defined. Everything else stays exactly as in the
> reference.

Then `measure-frame.py --green`, and close the loop with `scripts/autocal.py`.

### Close the loop — don't trust the plate measurement alone

`scripts/autocal.py <plate.png> [layoutw]` renders the real stage, looks at what is still
green, and re-solves. The insight that makes it work: on a chroma plate the true screen is
exactly **(pixels still green) ∪ (pixels the UI already covers)**. Fit the edges to that union
and it converges in 2-3 passes. Measured on the phone plate: **38,082 → 2,348 residual green
pixels (94% reduction)**, ending at ~0.25% of screen area with visually clean corners.

Two details it must handle, both of which cost a pass:
- **The notch drags the top edge down.** It bites into the top at dead centre and is wide
  enough to skew the fit by ~50px. Sample the outer thirds when fitting the top edge only.
- **The app's own UI may be green.** These recipe cards carry green "✓ Cozy" badges, which a
  naive green test counts as leak (30,610 false pixels). Separate plate chroma from UI green
  by requiring high saturation AND a high green level (`g > r*1.8 && g > b*1.8 && sat > .55`).

`scripts/calibrate.js <plate.png> [layoutw]` remains as the manual fallback: drag the four
corners over the live UI with a 6× loupe and save. Use it when a plate defeats autocal.

## MAKING IT READ AS A REAL PHONE

Correct geometry is necessary but not sufficient. A pixel-perfect screen in a perfect
rectangle still reads as "off". Five things fix that, roughly in order of impact:

**1 — Film at the device's REAL logical width.** This is the biggest one and the easiest to
get wrong. Recording at 540 CSS px and scaling into a 402pt screen makes every card, button
and label ~34% too small: it reads as a shrunken desktop page, not a phone. Set
`layoutw` to the real device width (iPhone 16 Pro = **402**). Do not pick a wider viewport to
make a layout problem go away — see the tab-strip note below.

**2 — Draw the browser chrome (`chrome=safari`).** A bare full-bleed app with its own close
button reads as neither native app nor website. An iOS status bar (time, signal, wifi,
battery), a Dynamic Island that **occludes** the page, and Safari's bottom URL bar showing
a real-looking domain instantly answer "what am I looking at" — and they make an embedded UI's
modal-with-an-X framing make sense. The chrome takes real vertical space, exactly as on a
phone, so the web content band is genuinely shorter.

**3 — Let the screen and the room exchange light.** Two layers: a `warm` multiply gradient
over the screen (a neutral-cool UI inside a golden kitchen looks like a pasted photograph),
and a `spill` screen-blend glow **on top of the plate** throwing the screen's light back onto
the hand and surfaces.

**4 — Round the screen corners and occlude the notch.** `rad` ~11–13% of screen width.

**5 — Add hand-held micro-motion (`pose`).** A plate locked to the pixel for 25 seconds is a
loud CGI tell. `installPose()` sums incommensurable sines into translate/rotate/scale so the
drift never visibly repeats, and the recorder advances it by each frame's own playback
duration — so a 3-second hold drifts as much as 90 glide steps would. Deterministic, not
rAF-driven, because a stop-motion capture samples rAF unevenly.

## FAILURE MODES (all of these actually happened)

- **The app's own image assets become the resolution ceiling.** Filming at 4K renders text at
  full device resolution, so any bitmap the app serves is the only soft thing on screen. This
  app served `.../small.jpeg` (256×256) while hosting `medium` (512) and `large` (1024) under
  the same token — swapping to `large` gave +37% measured sharpness for free. Always compare
  each `img.naturalWidth` against `rect.width × captureScale` before blaming the encoder.
- **Watch for PERCENT-ENCODED paths when rewriting asset URLs.** These URLs contain
  `%2Fsmall.jpeg`, so a `/small.jpeg` match silently never fires — and the recording looks
  plausible enough that you'll believe it worked. Verify by reading back `naturalWidth`, not
  by eyeballing a frame (different takes show different recipes, so "looks sharper" proves
  nothing).
- **Never compare sharpness across two different takes.** Scroll position, results and drift
  all differ, so a focus metric is meaningless. Fetch the same asset at both resolutions,
  render both at the capture size, and compare those.
- **A hold must be MANY frames, not one long frame.** Emitting a 3s hold as a single frame
  with `dur: 3` freezes the picture solid — any per-frame effect (the pose drift) then only
  steps *between* holds, and the plate jumps. Holds are where most of a take's screen time
  lives, so this silently kills the motion across most of the clip. Symptom: median
  frame-to-frame delta ~0.002. Emit `secs * FPS` frames instead (~0.3s of wall time each at
  4K, so a 25s take costs ~4 minutes — worth it).
- **Verify motion frame-to-frame, not end-to-end.** Comparing t=2 against t=20 showed plenty
  of movement while every individual frame was frozen. Measure `mean|diff|` between
  *consecutive* frames and flag runs below threshold.
- **Capturing a live wait at ~3fps stutters.** Documentary-mode capture can only manage ~3fps
  at 4K, so each frame is repeated ~9x to fill 30fps. For a nearly-static loading state, hold
  at full frame rate instead and let the drift carry it.
- **A one-shot DOM cleanup races the app's own rendering.** Hiding an unwanted banner once
  after boot worked in one take and failed in the next, because the element re-mounts on tab
  change. Use a `MutationObserver` so the hide is persistent.
- **Baseline overscan must exceed the drift.** With `pose` on, scale must beat max
  |translate| + the corner swing from `rotate()`, or the plate briefly exposes a black gap at
  the frame edge. At scale 1.018 this hit 0.9% of edge pixels; 1.034 fixed it. Verify by
  compositing corner crops over a red backing — an edge-darkness statistic alone can't tell a
  gap from the plate's own dark corners.
- **A hand-held plate's screen is not a rectangle — use `quad` mode.** And do not trust the
  bbox-derived numbers on such a plate: dark scenery (a shadowed floor, dark wood) touching
  the black screen inflates the box, so `screen_aspect` and `radius` come out meaningless
  (measured 0.53 for a phone screen) while the **corner quad is still correct**. Seed the
  detector inside the screen, then verify by drawing the quad back onto the plate.
- **`scroll-behavior: smooth` breaks a stop-motion recorder.** Each per-frame `scrollTop`
  assignment restarts an animation and reads back the OLD value, so a "does this element
  actually scroll" probe concludes "no" and every glide silently no-ops — leaving ~12s frozen
  on one frame. Inject `*{scroll-behavior:auto!important}` into the captured page.
- **Some panes refuse to be scrolled from outside.** A chat log that auto-scrolls itself will
  snap back (237 → 0) every time. Don't fight it; if the content is legible unscrolled, hold
  on it and let the pose drift carry the shot.
- **"Overflows" is not the same as "clips".** This app's mobile tab strip is horizontally
  **scrollable** at every width below 540, so a tab cut off at the edge is normal iOS
  behaviour, not a layout bug — and not a reason to film at a fake width.
- **Spreading options and overriding a key with `undefined` silently un-boots the app.**
  `{...BASE, initialTab: undefined}` clears BASE's own value. Only override what you mean to.
- **A glow layered behind an opaque plate does nothing.** In quad mode the plate is a full
  photo, not a keyed cutout, so the light layer must go on top.

- **A fixed detection box clips as the camera pushes in.** If you ever do track a screen
  through motion, the screen grows outside the box and you warp onto a sub-region — white
  L-shaped margins on the right and bottom. Use seed-following detection, not a box.
- **A high tracking/detection percentage proves nothing.** 100% detection and a visibly broken
  composite are entirely compatible. **Always review FULL frames sampled across the clip**,
  never one cropped frame.
- **The backdrop is a gradient, not a flat colour.** Keying by tolerance against the corner
  colour stops partway across the field and leaves a ragged blob around the device. Model the
  backdrop **per row** (median of the outer margin left and right, interpolated across).
- **The contact shadow gets absorbed into the device.** It also "differs from the backdrop" and
  touches the device, so a single loose mask renders it opaque — a light ragged patch under the
  phone. Isolate the device body with a **strict** threshold, take its bounding box, and only
  accept loose-mask pixels inside it.
- **Layout width must be explicit.** If the iframe's CSS width is derived from the frame's pixel
  size, the app lays out at whatever that happens to be (~500px) and silently clips its own
  nav. Pin the layout width (540 phone / 1200 laptop for this app) and scale that to fill the
  screen rect.
- **Narrowing the viewport to hit an aspect breaks the app's layout.** At 432px CSS this app's
  mobile nav overflows and clips "Meal Plan" and "Help" — the app doing it, not your crop. Get
  the aspect from height.
- **Filming a half-loaded screen.** Wait out the app's fade-in/spinner explicitly (poll for
  opacity > 0.98 and no visible spinner) or you capture a ghostly screen.
- **A modal-in-a-page app shows its page margins on the screen.** Apply the full-bleed
  modal-pinning INSIDE the iframe, not on the outer page.
- **Same-origin.** Serve the stage from a local static server on the same origin as the app, or
  the iframe can't be driven. `scripts/device-stage.js` runs one on :8123.
- **One selector miss kills a whole take.** Wrap optional beats (typing, taps) in try/catch and
  log a note instead of throwing.
- **Content choice is part of the technique.** A UI state with a large empty area reads as a
  *broken page* when frozen on a device screen, even though it's fine as a transition in the
  source. Pick a populated state; skip the source's opening beat if it starts sparse.

## WHEN CSS FRAMES ARE ENOUGH

`device-frames.css` draws phone/laptop frames from real device proportions (iPhone 16 Pro:
402×874pt, 0.460 aspect, ~2.8% bezel, ~17.5% body corner radius, Dynamic Island ~31% of screen
width; MacBook-style laptop with the notch cut into the display). They're clean and scale to
any size — good for a quick pass or a flat/graphic look. But CSS plateaus at "very good vector
mockup": gradients are too smooth to read as brushed metal, and the result looks slightly
toy-like next to a photo plate. **For "completely realistic", use a photo plate.**

## HANDOFFS

To make a finished FILM with this method (run order, the stop-motion engine, app-state prep,
the QA gate and delivery), use `pov-device-film`. This skill is the geometry half.


The device shot is the *product* beat. Keep the character (see `story-bible-builder`) in their
own shots and cut between them — standard product-video grammar, and it avoids the
hands-on-a-device problem documented in `prop-sheet-builder` (a wrapped grip can hide a hand;
hands splayed on a keyboard cannot). Source recordings come from the 4K stop-motion engine
(`scripts/stopmo-common.js`, `final-4k-masters/INDEX.md`). For compositing a recording onto a
device *photograph* anyway — the tier-1/2 fallbacks — see `scripts/screen-comp-video.py` and
the Type C section of `prop-sheet-builder`.
