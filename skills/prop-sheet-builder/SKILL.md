---
name: prop-sheet-builder
description: "Banana Pro image prompt director for prop reference sheets — physical objects a character interacts with (a tool, an ingredient, a piece of gear) and graphic/UI elements (a floating data card, a HUD readout, an on-screen overlay). Use whenever the user wants a 'prop sheet', 'object reference', 'prop reference', or a floating UI/graphic element built as a reusable asset. Two modes: PHYSICAL (3-view front/three-quarter/back on mid-gray seamless, matches the character's established render style) and GRAPHIC/UI (single-plate floating element, pulls from the project's brand system if one exists). Distinct from banana-pro-director-2.0 (character-focused) and ghost-mannequin-character-sheet (3-panel character sheets) — this is the prop-specific counterpart to both."
---

# Prop Sheet Builder — Object & UI Element Reference

A locked Banana Pro prompt structure for building **prop reference sheets** — the third leg of the character/location/prop asset triangle (see `banana-pro-director-2.0` for characters, and any location-plate workflow for settings). Covers two distinct prop types that need different treatment.

---

## THE TWO PROP TYPES

**Type A — Physical prop.** A tangible object a character holds, uses, or interacts with: a tool, an ingredient, a piece of gear, a held item. Needs multiple viewing angles because it will be composited into scenes from different camera positions.

**Type B — Graphic/UI prop.** A designed element that isn't a physical object photographed on a table — a floating data card, a HUD overlay, a UI panel, a stat readout, an on-screen graphic. Needs typography, brand-color, and layout treatment instead of multi-angle photography.

Identify which type before writing anything — they use different canonical structures below.

---

## TYPE A — PHYSICAL PROP (3-VIEW SHEET)

**Layout:** One frame, three views side by side on a continuous mid-gray seamless backdrop — **front, three-quarter, and back** — matched lighting across all three, same convention as a character sheet.

**Style-matching rule:** Default assumption is the prop should render in the *same visual register as the character it will appear with* — if the character is a 3D-stylized cartoon (Pixar-lite render), state that explicitly in the prop prompt, since GPT Image 2 tends to default to photoreal product photography for food/object prompts even when a stylized register is requested in text. This drift is common enough to expect it, not just guard against it.

**Exception — intentional style mixing.** Photoreal food/props next to a stylized cartoon character is a legitimate, common technique in food/cooking content (it can make the food read as more appetizing while keeping the character charming) — confirm with the user whether a style mismatch that comes back is actually wanted before treating it as a failed generation and re-running. Don't assume it's an error; ask.

**Material specificity:** Push for one or two concrete, specific material details per prop (a natural imperfection, a texture note, a wear mark) — a prop described too generically reads flat and fake. "Warm brown eggshell with natural subtle speckling" beats "an egg."

**No unnecessary branding:** Physical props stay unbranded/generic unless the prop IS a branded item the project owns (e.g., the project's own product packaging) — never invent or imply a real third-party brand.

**Canonical Type A template:**

```
A 3-view prop reference sheet in one frame: front, three-quarter, and back view of [the object], side by side on a continuous mid-gray seamless backdrop, matched lighting across all views. [Object description — form, one or two specific material/texture details, any natural imperfection or wear]. [Render style line — match the character's established style exactly, e.g. "3D-stylized cartoon render matching a Pixar-lite aesthetic — soft rounded material rendering, warm cinematic lighting, matte never-plastic surfaces" OR "photoreal, real material physics, real cinema capture"].

Mid-gray seamless studio background, even neutral mid-gray, no seam line, no gradient. Relight from scratch: one broad diffused soft key light from camera-[left/right] and slightly above, gentle wrap, no harsh shadows, no rim light, no hair light, no kicker. [Material] renders at its true natural color, warmth preserved, never washed-out, never cool-shifted by the background. [Material-specific texture line — real paper grain / real matte shell / real skin texture / real metal surface]. Fine cinema grain, soft natural film grain. Photographed not generated.
```

---

## TYPE B — GRAPHIC/UI PROP (SINGLE PLATE)

**Layout:** One plate, the graphic element alone (a card, panel, HUD readout) — angled in a plausible perspective (floating/suspended, or flat-on if that's how it'll actually appear on screen) on a continuous mid-gray seamless backdrop so it composites cleanly into any scene.

**Pull from the project's brand system.** If a design-token file, brand kit, or prior brand memory exists for the project, use its actual colors/typography language rather than inventing generic UI styling — name the specific hex/color-family and font character (e.g. "warm coral-red brand tone," "clean modern rounded sans-serif") so the graphic reads as *this brand's* UI, not stock interface design.

**Content structure over content accuracy:** Describe the layout hierarchy (header → tag → data rows, or whatever the actual layout is) and the *type* of each piece of text (bold header, label, stat number) rather than dictating exact copy the model will likely mangle anyway — image models are unreliable at rendering precise arbitrary text/numbers. If exact copy matters, plan on a post-production text overlay rather than baking it into the generation (same lesson as the subtitle/homophone gotcha in `animated-fact-explainers`).

**No real logos or brand names** unless it's the project's own mark, same rule as everywhere else in this asset-building pipeline.

**Canonical Type B template:**

```
A single UI prop reference plate: [the element — a floating frosted-glass card / a HUD panel / an on-screen overlay], [perspective — angled in three-quarter as if suspended in mid-air / flat-on as it would appear on screen], on a continuous mid-gray seamless backdrop. [Material description of the graphic surface — glass/glow/opacity, edge treatment, shadow].

The [element]'s content, in [typography description pulled from brand system]: [layout hierarchy — header, tag, rows, in the order they read]. Text hierarchy: [what's bold, what's a label, what's an accent color]. [Brand accent color, named specifically]. Clean generous padding, [corner treatment], minimal and uncluttered — no logos, no real brand names.

Mid-gray seamless studio background, even neutral mid-gray, no seam line, no gradient. Soft diffused studio light from camera-[left/right], [material-appropriate light interaction — glass refraction, glow, matte reflection], no harsh reflections. Rendered as a clean modern UI/motion-graphics element, crisp edges, soft ambient occlusion where the element meets its shadow. Photographed not generated, like a real product render of a physical [surface type] with [content] printed/displayed on it.
```

---

## READING PROJECT CONTEXT

Before writing either type, check for and use:
- An existing character reference sheet (for style-matching, Type A)
- A brand-kit/design-tokens file or brand memory (for Type B typography/color)
- Any prior prop sheets from the same project (for consistency — matching lighting angle, matching material-rendering language)

Never invent brand colors/fonts if the project has real ones on file — pull the actual values.

---

## TYPE C — POV / FIRST-PERSON DEVICE PLATE (with screen replacement)

A first-person POV shot where the "camera" is the character's own eyes, looking at a device (laptop, phone, tablet) they're using — the character's own hands/wings/paws visible at the frame edges the way you see your own hands. The device screen is rendered as a **blank glowing placeholder**, then the real product UI is composited on in post. This is the highest-fidelity way to show a stylized character "using" a real product, because the UI is never AI-rendered (which garbles it) — it's screen-replaced with actual footage.

**Why POV + screen-replace beats generating the UI directly:** (1) the real product UI is always pixel-accurate; (2) one POV plate is reusable across every video — swap the screen per shot (one flow per video, same plate); (3) blank-screen plates are trivial to mask and warp onto. Validated in production: a stylised animal character's wings on a photoreal laptop/phone, with real product footage comped onto the screen.

**Prompt rules for a screen-replaceable POV plate:**
- First-person framing: "as if looking through the eyes of [character], gazing down at [device]."
- Character's own appendages visible at the bottom/edge of frame, described by their locked identity colors (e.g. "coral-red and salmon parrot wing-tips with teal accents"). Note the intentional style-mix if a cartoon character holds a photoreal device.
- **The screen is the key:** "a clean softly glowing pale off-white rectangle, evenly lit, NO interface, NO icons, NO text, NO logos — a flat blank lit screen ready for compositing." A flat, evenly-lit, untextured screen is what makes post screen-replacement clean.
- Device: photoreal or style-matched per the style-match rule above.
- Background: the location, softly blurred (shallow depth of field) so the plate reads anywhere and the device/screen stays the focus.

**HANDS-ON-DEVICE IS A TRAP FOR NON-HUMAN CHARACTERS.** A POV shot with the character's hands *on* the device works only when a **wrapped grip hides the hand** (e.g. a wing wrapping a phone — validated, looks great). It FAILS when hands are splayed *on* a surface: a bird has no fingers, so wings flat on a keyboard render as awkward feather-flaps. Learned the hard way on a laptop POV that had to be rebuilt.

**The reliable pattern — separate "show the product" from "show the character":**
- **"Show the product" → a CLEAN DEVICE PROP: no hands, no character, blank screen, device sitting on a surface** (laptop open on a counter, phone on a stand), screen facing camera. AI nails these every time — it only ever fails at hands-on-keys. This is the workhorse "screen container." Then composite the real UI on. In the video edit, the character talks/gestures in one shot, then you CUT to the clean device showing the real product working — standard product-video grammar.
- **"Show the character" → the character holds the device only where a grip hides the hand** (the phone-in-wing POV), used sparingly as a bonus beat, never as the product-walkthrough workhorse.

## THE BLANK-SCREEN TRICK (how to get a real product UI into a Seedance shot)

**Never put the UI on the screen before Seedance touches it.** Proven head-to-head:

- **Control (UI baked into the start frame):** Seedance re-renders the screen and destroys
  it. Real output: "Search Reyond mcipe tries", "Zcmitute Simp Grahen Roteatie Reond" —
  every string is nonsense. Prompting "the interface stays exactly as in the reference,
  perfectly legible and unchanged" does NOT save it.
- **The trick:** generate the shot with the device screen left **BLANK** (flat, evenly-lit,
  pale off-white). Seedance animates the device, the room, the light — but there's no text
  to mangle. Then in post, **re-detect the screen quad on every frame** and warp the real
  UI recording on. Result: real cinematic motion AND pixel-accurate UI.

Why the tracking works: the same bright / low-saturation blob the still-compositor keys on
survives the generation, because it's the one thing you told the model to keep featureless.
`screen-comp-video.py track` fills any dropped frames from neighbours and moving-averages
the corners so jitter doesn't read as shimmer.

**Detect with a SEED POINT, never a bounding box.** A box fails the instant the camera
pushes in: the screen grows outside it, you warp onto a clipped sub-region, and you get
white L-shaped margins along the right/bottom of the screen. `screenlib.py` instead masks
bright/low-sat pixels, labels connected components, takes the component containing a seed,
and uses only that component's corners — then feeds frame N's centroid as frame N+1's seed
so it follows the screen at any scale.

**Fit the UI "cover", not corner-to-corner.** Mapping UI corners straight to screen corners
stretches whenever the aspects differ. Center-crop the UI to the screen's aspect first so it
fills the screen undistorted.

**A high detection percentage proves nothing about quality.** 100% detection and a broken
composite are entirely compatible (that exact combination shipped once). Always review FULL
frames sampled across the clip — never a single cropped frame.

**Content selection is part of the technique.** A UI state with a large empty area reads as
a *broken page* when frozen on a device screen, even though it looks fine as a transition
inside the source recording. Pick a state that fills the screen (a populated list/grid), and
skip the source's opening beat if it starts sparse.

Prompt rules for a trackable clip:
- State the blank screen as a **positive lock**, repeated: "the screen remains a completely
  BLANK, evenly-lit, flat pale off-white rectangle for the entire clip — no interface, no
  icons, no text, no logos, no reflections, no images ever appear on the screen."
- Also lock the geometry: "the device's shape, position, and screen corners stay stable and
  clearly defined." Corners are what you're tracking.
- Keep the move gentle (slow push-in, small drift). Whip pans and hard parallax make the
  screen quad ambiguous and the composite starts to swim.
- Put the life in the *environment* (dust motes, light shift, background atmosphere), not
  in the device.

**Three tiers, pick per shot:**
1. **Static device + composited UI video** (`screen-comp-video.py static --push 0.05`) — no
   AI at all, zero risk, add a gentle push-in for life. Best default for a plain product beat.
2. **Seedance blank-screen + tracked composite** (`... track`) — real generated motion and
   accurate UI. Use when the shot wants to feel filmed.
3. **UI baked in before generation** — never. Documented here only as the failure mode.

**The post screen-replacement (compositing step):** perspective-warp the real UI screenshot/footage onto the screen quad. Tooling on this machine: **PIL + numpy** (no OpenCV/ImageMagick). A reusable CLI is built at **`scripts/screen-comp.py`** — `python3 scripts/screen-comp.py <device.png> <ui.png> <out.png> [--box x0,y0,x1,y1] [--rad N]`. It auto-detects the near-white screen quad (bright + low-saturation pixels, extreme-corner method inside `--box` to avoid window glare), solves an 8-coeff perspective transform (screen quad → UI corners), warps with a rounded-rect alpha, and applies a **realism pass** (warm-pickup + dim so the screen lives in the scene light, a soft diagonal glare band, matched film grain, and a bezel inner-shadow) so the screen doesn't read as pasted-on. The UI is never re-rendered by AI — it's the real screenshot, pixel-perfect. Source your UI frames from this repo's own recordings (`examples/02-record-mobile.js` = 540×960, `examples/01-record-desktop.js` = 1280×800) and extract a clean frame with ffmpeg. For video, apply the same warp per-frame (corner-pin track) rather than a still, or keep the device near-locked so one warp holds.

## PRE-PROMPT CONFIRMATION

Same discipline as the other Banana Pro skills in this set: a short bulleted check before delivering the full prompt — prop type (A/B/C), what it needs to match (character style or brand system), any variation from the standard layout. Skip only for a minor tweak to a just-delivered prompt.

---

## UNIVERSAL RULES (carried from `banana-pro-director-2.0`)

1. No aspect ratio written into the prompt — set in the Higgsfield UI.
2. No real brand/product names — generic description, or the project's own mark only.
3. Mid-gray seamless is the locked default backdrop.
4. Single fenced code block per prop on delivery.

---

## HANDOFFS

Physical props (Type A) feed `cinema-worldbuilder-pro-30` as `@tag` references the same way character/location references do. Graphic/UI props (Type B) are typically composited in **post** rather than baked into a live-action Seedance plate — check with the user whether the floating-card moment should be: (a) generated directly into the scene via Seedance/Banana Pro, or (b) shot as a clean element and composited afterward in editing, which gives more control over exact stat text. Pairs with `banana-pro-director-2.0` (character it appears alongside) and `ghost-mannequin-character-sheet` (matching render-style source).
