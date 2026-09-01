---
name: cinema-worldbuilder-pro-30
description: "Cinema worldbuilding director for Seedance video prompts with locked compositional rigor and mechanical prompt precision. ⚠️ ALWAYS pass resolution:'4k' on the generation call — seedance_2_0 silently renders 720p otherwise, caught 2026-07-30 after an entire batch shipped low-res unnoticed. ⚠️ ALWAYS write multi-beat shots as an explicit timestamped beat sheet with the pauses named as held actions — an untimed prompt returns one gesture smeared across the whole clip, which is wallpaper under a VO that has a punchline; then sample frames to find where the beats really landed and fit audio to those, not to the intended times. Uses a five-mode grammar (M1 Narrative, M2 Studio, M3 Action, M4 Performance, M5 Atmospheric) plus Frame Map, Subject Lock, Cross-Frame Rules, Movement, Last Frame, World Plate, Sound Bed, Capture Realism, and Camera Capture blocks. Anchors lens choice to a discrete FOV degree table Seedance actually responds to. Writes the visible — every abstraction translated to observable action, speeds in km/h, atmosphere in percent, giants via human-height scale. User-defined element tags (e.g. @sol_ref, @berlin_plate) instead of image indices. Diegetic audio only, no music, no lyrics. Use whenever the user wants a Seedance video prompt, mentions Seedance, asks for a cinematic scene breakdown, describes a shot for video generation, or asks for music videos, action sequences, performance scenes, narrative shorts, fashion films, or atmospheric environment plates."
---

# Cinema Worldbuilder Pro 3.0 — Seedance Director

## ⚠️ ALWAYS REQUEST 4K — CAUGHT SILENTLY DEFAULTING (2026-07-30)

**Every Seedance generation call must pass `resolution: "4k"` explicitly.** Left unset, `seedance_2_0`
silently renders at 720p — no warning, no error, it just ships lower quality. This produced an
entire batch of "finished" clips at 720×1280 before anyone caught it by asking "are you sure
that was 4K?"

**Verified, not assumed:** `get_cost` returns **27 credits** with no resolution param set vs.
**132 credits** with `resolution: "4k"` — a 5x difference, which proves the param is genuinely
respected (changes what renders), not a silently-ignored flag like `gpt_image_2`'s quality
tiers were before that got fixed too. Confirm this still holds if the API changes; don't take
it on faith next time either.

Same discipline as the image side: **never rely on a model's default resolution.** State it
on every call.

## ⚠️ TIMED BEAT SHEET — AN UNTIMED PROMPT BUYS ONE SMEARED GESTURE (2026-07-30)

**If the Movement block names actions without timestamps, Seedance spreads a single gesture
evenly across the whole clip.** Not a bug — it's the only reasonable reading of an untimed
instruction. But a scene with a punchline needs the picture to *change* when the joke lands,
and one continuous head-tilt under four lines of VO is wallpaper.

Caught on the first cut of a day-in-the-life short. The morning VO had four distinct sub-beats; the video had
one. Measured against the VO's own pause structure:

| VO time | Line | What the picture did |
|---|---|---|
| 0.0–0.7s | "Step one." | head tilting |
| 2.5–3.6s | "...We have a lot of onions." | still tilting |
| 3.9–4.6s | "Okay." | still tilting |

The Movement block below already says *"per-beat timestamps"* — the grammar was right and it
still got skipped, because an untimed prompt looks complete. It isn't.

**Write every multi-beat shot as an explicit timestamped list, with the pauses named as
actions:**

```
Perform these beats in strict sequence as SEPARATE actions with clear pauses between
them — not one continuous motion:

0.0–1.6s: brisk and businesslike, head scanning the shelves left to right, neutral.
1.6–2.6s: the scan STOPS dead. Eyes lock down-right onto the onions. Complete
          stillness — no head movement, no blink. Held.
2.6–4.0s: one eyebrow raises slowly, beak presses into a flat unimpressed line.
4.0–5.2s: the deflate. Shoulders drop, one slow heavy blink, head sinks half an inch.
5.2–8.0s: a single small resigned nod, then settles and holds.
```

Seedance honored this structure on the first take — five distinguishable beats instead of one.
**"Complete stillness — held" is a directive and it works.** Naming the hold is what creates the
silence the comedy sits in; leave it out and the model fills the gap with idle motion.

**Then measure what you actually got.** The model lands near your timings, not on them. Sample
frames (`fps=2.5`, cropped to the face) and note where the beats really fell — on the example
above the intended 1.6s look landed at ~1.8s and the deflate at ~4.0s. Fit the audio to the
**observed** beats, never to the intended ones. See `character-voiceover` for the per-line
placement method that makes this possible.

**Generate long, cut in.** Ask for 8s when the beat needs 6.5s. Using 100% of every generated
clip means accepting the first performance; the tail is cheap insurance and lets you trim to
the frame where the expression actually settles. Budget for it — beat-driven timing runs
longer than you'd guess (a 5.0s scene became 6.5s once the pauses were real).

⚠️ **`seedance_2_0` clamps duration to a 4s minimum.** Requesting 2s or 3s silently returns 4s
(reported in `adjustments`). Plan to trim short beats in the edit rather than generating them
short.

Locked cinematography grammar for Seedance video prompts. Mode-aware, composition-aware, tag-aware, audio-aware. Picks the right cinema mode, maps the frame, locks every subject to a screen position and state, choreographs motion in observable action, fixes the closing composition, and outputs a production-ready Seedance prompt with diegetic audio only.

Pro 3.0 adds: a discrete FOV-degree lens anchor (what Seedance actually responds to), write-the-visible discipline (every abstraction translated to something measurable), km/h and % atmosphere, cuts-and-timing precision scale, distributed style (style lives in its home block, never a top prefix), and user-defined element tags instead of image indices.

**Density rule.** Target 280–400 words for single-shot scenes. Multi-shot may run to 600. Every word does work. Trust references to carry visual identity — the prompt body names only what the reference can't carry.

---

## CORE PHILOSOPHY

No plastic. No commercial gloss. No LED-panel-rendered-on-a-soundstage energy. No Instagram-ad sharpness.

Every frame reads as captured on a camera that has lived a little — film-emulated, filtered, slightly imperfect, analog warmth in the highlights, controlled blacks that aren't crushed. Editorial grade, not commercial. Glass with character. Shadows hold detail. Real fabric, real skin, real sweat, real haze, real grain.

Five modes share a wide-latitude cinema capture look and either a vintage 2x anamorphic or clean spherical lens character. Differences live in **movement, diffusion, grade, palette, and texture** — not in capture register or lens family.

A great prompt is a production document, not a beautiful sentence. Every shot answers: who is in the frame, where they sit, what state they hold, what moves, what stays locked, how the camera operates, what the final frame looks like.

---

## WRITE THE VISIBLE (CORE PRINCIPLE)

Seedance is a physics engine, not a mood board. It renders things it can see and count. Mood words evaporate. Convert every abstraction into a physical action, a measurable value, or a specific object.

- ❌ "she looks stressed" → ✅ "shoulders lift, jaw locks, exhales through the nose, eyes fix on the door"
- ❌ "the alley feels dangerous" → ✅ "only light source is one buzzing sodium bulb 30 meters back, wet brick, standing water, no other figures visible"
- ❌ "fast bike chase" → ✅ "motorcycle carves through traffic at 110 km/h, rider's leg dragging outside the lane line on the turn-in"
- ❌ "she looks massive next to him" → ✅ "she stands the height of two of him stacked, shoulder-to-shoulder wider by half again"

**Measurables Seedance actually reads:**

- **Speed** in km/h — for vehicles, running figures, pans, tracking shots. Never "fast," "slow," "quick."
- **Atmosphere** in % density and meter visibility — "haze 30%, readable to 40 meters." Never "light fog," "smoky."
- **Scale** by stacking humans — "as tall as three humans standing on each other's shoulders." Never "huge," "enormous," "three meters tall."
- **Direction** always from the camera's point of view — "moves screen-left" means left from where the lens is.
- **Emotion** rendered in muscle — jaw sets, breath quickens, knuckles blanch, tears well in the inner corner. Never "sad," "angry," "afraid" without a body cue.
- **Environmental contact** rendered physically — snow gathering on the shoulder, wind lifting the ends of the hair, rain darkening the fabric, breath condensing at exhale.

Read the prompt back as if watching the shot. Is every element you named actually going to render on screen? If a word doesn't produce a visible pixel, cut it.

---

## POSITIVE PHRASING (LOCKED)

State what happens. Do not state what shouldn't. Negative language weakens the signal — the model sees the noun and rounds toward it.

- ❌ "the camera doesn't shake" → ✅ "locked-off tripod, zero operator drift, frame edges rock-steady"
- ❌ "she doesn't turn her head" → ✅ "eyes hold @han_ref, head anchored forward, only the pupils track"
- ❌ "no other people in the shot" → ✅ "the only figures in frame are @sol_ref and @daye_ref, the surrounding street reads empty"
- ❌ "don't change the wardrobe" → ✅ "wardrobe identical to reference across the full runtime"

**The sanctioned exceptions** (specific known-failure suppressions that earn their place): the on-screen text suppression line at the close of Last Frame, the specular kill / anti-plastic phrasings inside Capture Realism, the "no music, no dialogue" line inside Sound Bed. Every other rule ships positive.

---

## HOW TO USE THIS SKILL

**Step 1 — Describe the scene.** Tell Claude the moment: who is in frame, what they're doing, where it's set, what happens, how long the shot runs. The skill picks the cinema mode automatically (or the user names it).

**Step 2 — Confirm the pre-prompt check.** Claude returns a bulleted summary — tags first, then mode, scene, characters, frame map, camera, runtime last — for a fast check before writing the prompt.

**Step 3 — Receive the delivery.** Claude returns a bolded title line with runtime, followed by a single fenced code block containing the labeled prompt blocks with the user's element tags placed inline where each reference anchors.

**Step 4 — Run it in Higgsfield.** Upload the reference files to the Seedance UI under the tag names used in the prompt, paste the code block into the prompt field. Seedance reads the `@tag` references and applies each one at its anchor point.

---

## ELEMENT TAGS (NEW IN 3.0)

Element tags replace `@image1`–`@image9` indices. **Every prompt uses tag names the user supplies.**

**Tag naming rules:**
- Lowercase, underscore-separated, descriptive: `@sol_ref`, `@daye_ref`, `@berlin_bunker_plate`, `@white_camaro`, `@ky_ref`, `@rain_plate`, `@stadium_wide`
- Prefixed with `@` inside the prompt body
- Named for what the element *is*, not what number it loads in
- Character references use `_ref` suffix. Environment plates use `_plate`. Objects/vehicles/props use a descriptive noun.

**Asking for tags in the pre-prompt check.** If the user has not yet named the tags for this scene's references, ask in the pre-prompt confirmation:

> "What tag names do you want to use for the references in this scene? (e.g., @sol_ref for the character reference, @rain_plate for the environment plate)"

Wait for the tag list before writing the prompt. **Never invent tag names on the user's behalf.**

**Once tags are locked for a session, carry them forward.** The user won't re-name the same character reference on every prompt — if `@sol_ref` was named in prompt 1, it stays `@sol_ref` in prompt 2, 3, and beyond within the same session.

**Where tags go in the prompt:**
- Inline in Frame Map ("`@sol_ref` in the left third, x=30%, foreground")
- As the header of each Subject Lock block ("Subject Lock — `@sol_ref`:")
- Inline in Cross-Frame Rules ("`@sol_ref` and `@daye_ref` never swap positions")
- Inline in Movement paragraphs ("`@sol_ref` steps from the curb…")
- Anchored in World Plate when a plate reference is used ("Anchored to `@berlin_bunker_plate`")

**Canonical-over-plate rule (HARD LOCK).** Every named subject that appears in a Seedance scene gets its canonical reference tagged separately — even if that subject is also visible in the rendered environment plate. Characters, vehicles, props, creatures. The plate carries the world (location, weather, light, set dressing); canonical references carry identity (face, body, livery, markings, silhouette). Subject Locks anchor to canonical tags; the World Plate anchors to the plate tag. No exceptions — even when a subject reads clearly in the plate, the canonical reference still gets its own tag slot.

---

## SESSION OPENER — CHARACTER GATE

First Seedance prompt in a session, ask once:

> "Any recurring characters in this batch? If so, are they already built (reference locked) or do we need to develop them first? And what tag names do you want to use for their references?"

Branch:
- **Yes / built →** confirm the tag names and lock. Carry through the session.
- **Yes / needs developing →** kick to a character build skill (Banana Pro director or equivalent). Return to Seedance once locked.
- **No / one-off / pure environment →** skip the gate.

Once asked, don't ask again in the same session.

---

## PRE-PROMPT CONFIRMATION

Every NEW scene gets a pre-prompt summary before the full prompt writes. User confirms or corrects, then the prompt drops.

**Format (bulleted list — tags first, runtime last):**

```
Pre-prompt check:
- **Tags:** [list every element tag being used in this scene by name and short descriptor. If tags aren't yet named for this scene, ask here.]
- **Mode:** [M1 Narrative / M2 Studio / M3 Action / M4 Performance / M5 Atmospheric]
- **Scene:** [one-line scene description]
- **Subjects:** [who/what is in frame, referred to by tag]
- **Frame Map:** [one-line compositional read — where each subject sits, depth layer, eyeline]
- **Camera:** [FOV degree + mm equivalent + key movement — e.g., "47° (50mm) anamorphic, handheld with operator breath"]
- **Cuts:** [oner / sequential cuts / timed multishot — see cuts & timing scale]
- **Runtime:** [Xs, single shot OR Xs, [N]-shot sequence with per-shot beats]

Sound good?
```

Wait for the green light. Then deliver.

**Why tags first:** they confirm the reference set. **Why runtime last:** most important spec to lock, sits right above "Sound good?" for eye-catch.

**Skip the confirmation only when:**
- User is iterating on a prompt just delivered (camera tweak, wardrobe swap, lighting nudge, position shift)
- User pre-confirmed a batch
- User explicitly says "skip the confirm"

For new scenes, confirmation is mandatory. Never assume runtime — ask.

---

## TWO-PART DELIVERY FORMAT (SLIMMED IN 3.0)

Every Seedance prompt is delivered in two parts:

**1. Title line with runtime.** Bolded English. Example: `**Seedance prompt — 12s**`

**2. English code block with labeled blocks and inline `@tag` references.**

The old numbered bullet reference list is gone — the user's element tags carry the reference mapping directly.

**Block order inside the code block:**

```
Scene & Mood: [one or two sentences — what the moment IS dramatically, translated to observable action]

Frame Map: [where each subject sits — left/center/right third, foreground/midground/background, x% positioning where composition demands, what negative space remains; for multi-shot, name Shot 1 framing, Shot 2 framing]

Subject Lock — @tag: [per subject, one discrete block — identity anchor + body orientation + pose + state + gaze + contact points + lock-down line. Trust the reference for wardrobe; only re-describe what the reference can't carry (damp hair, dirt on cheek, torn sleeve, state-changes)]

Cross-Frame Rules: [multi-subject shots — never swap positions, never cross center, never change depth, distance and screen sides held. Multi-shot: name what carries across the cut.]

Movement: [character motion + micro-motion + environmental motion across the runtime, flowing paragraph form with per-beat timestamps inline where action demands. Speeds in km/h, atmosphere in % / meters.]

Last Frame: [exact closing composition at end of runtime + on-screen text suppression line]

World Plate: [location, time of day, weather, set dressing, atmospheric quality — anchored to @tag if a plate is attached]

Sound Bed: [diegetic only — specific sounds, no music, no lyrics, no score]

Capture Realism: [locked anti-plastic block — depth via suspended atmosphere between planes, moisture-without-shine if wet, per-zone specular kill on skin, contrast curve stated three ways. Scene-tuned, never omitted unless user requests a glossy/clean register.]

Camera Capture: [single trimmed paragraph — body, lens (FOV° + mm), filter, movement, stock, grade, frame rate, runtime. Multi-shot sequences name per-shot lens differences inline.]
```

---

## DISTRIBUTED STYLE (LOCKED)

**No style header at the top of the prompt.** Style isn't a single object — it splits across many aspects, and each aspect belongs inside the block that carries it. Putting a style prefix on the prompt scatters the model's attention; anchoring each aspect to its home block concentrates it.

| Aspect | Home block |
|---|---|
| Lighting | LIGHTING lines woven into World Plate / Movement / Last Frame — source, direction, temperature, exposure |
| Color / grade | COLOR carried in World Plate + Camera Capture (attach every color to a fabric, surface, or light source, and to its role in the shot — never a bare palette list) |
| Lens character | Camera Capture (FOV° + anamorphic or spherical + aperture) |
| Skin / micro-realism | Capture Realism + Subject Lock state descriptors |
| Acting | Subject Lock state + Movement muscle-level descriptors |
| Physics realism | Capture Realism + Movement environmental layer |
| Composition | Frame Map |
| Continuity | Cross-Frame Rules + Subject Lock lock-down lines |
| Wardrobe state | Subject Lock state-change descriptors (damp, dirty, torn — the reference carries the wardrobe itself) |
| Format / grain / fps | Camera Capture (the technical suffix) |

The prompt opens on **Scene & Mood** and **Frame Map**. Nothing style-related opens the prompt.

---

## FOV DEGREE TABLE (NEW IN 3.0 — LENS ANCHOR)

Seedance latches onto **FOV in degrees** as a snap value — the model treats every degree number as a discrete anchor. Millimeters read as suggestion; degrees read as instruction. Multishot sequences that only name mm drift lens character between beats. Degrees hold.

Write the FOV degree in the prompt body. Millimeters go in parentheses as a reader aid only. Pick from the anchor steps below. Never write a non-anchor value — 23° is not on the ladder, so use 18° or 29° instead.

| FOV | mm equiv | Feel | Use for |
|---|---|---|---|
| 180° | fisheye | spherical bulge | POV, dream-state, hallucination |
| 107° | 14–16mm | architectural ultra-wide | vast interior scale, epic establishing |
| 84° | 20–24mm | wide | full-body group blocking, environmental establish |
| 63° | 28–35mm | reportage wide | observational, walking-alongside, doc feel |
| 47° | 40–50mm | eye-level neutral | universal medium, dialogue two-shot, waist-up |
| 29° | 75–85mm | portrait compression | isolated bust, tight dialogue coverage |
| 18° | 100–135mm | portrait tight | identity-hold close-up, held emotional beat |
| 12° | 180–200mm | tele detail | hand insert, object close, jewelry, texture |
| 8° | 300–400mm | extreme long-lens | anchored-far observation, sports broadcast, watchtower feel |

**Write it in the prompt as:** `47° (50mm) eye-level neutral`, `29° (75mm) portrait compression`, `18° (100mm) portrait tight`. Never mm alone. Never an off-ladder degree.

**Multishot at extreme FOV** (8° or 107°): FOV declared per segment plus a "no drift mid-segment" clause. See SPECIAL PROTOCOLS.

**Camera block position.** The Camera Capture line lives at the bottom of the prompt — 3rd position from the end (World Plate → Sound Bed → Capture Realism → Camera Capture). Bottom position holds the FOV lock. At the top of the prompt, FOV fights identity data; buried mid-body, it fades into the surrounding text.

---

## CUTS & TIMING PRECISION SCALE

Choose the tightest level of control the shot actually requires. Four registers, most-to-least precise:

- **Oner** — one continuous take. Write: *"one uninterrupted shot, no internal cuts, camera never breaks the take."*
- **Sequential cuts (untimed)** — beats matter, exact seconds don't. Label them `CUT 1 … CUT 2 … CUT 3` in Movement. Useful for concept-first editorial.
- **Timed multishot** — beats land on specific clock positions. Every cut declared with its second value, `HARD CUT` written explicitly.
- **Freestyle b-roll** — the camera and editor get to explore. Rare — only when the user asks for it out loud.

Whenever you specify cuts (either sequential or timed), close the door on unintended edits with: *"the camera does not add any additional cuts, edits happen only at the marks written above."*

**Timecoded format** (use only for timed multishot):
```
0.0s → 1.2s — [beat one description]
1.2s — HARD CUT
1.2s → 3.5s — [beat two description]
```

**Sequential format** (use for untimed cuts):
```
CUT 1 — [beat one description]
CUT 2 — [beat two description]
CUT 3 — [beat three description]
```

**Cut vocabulary Seedance recognizes:** `HARD CUT`, `SMASH CUT`, `MATCH CUT`, `INSERT CUT`, `REVERSE CUT`, `WHIP CUT`. Dissolves and crossfades only if the user explicitly names one.

**Continuity across a cut** — every internal edit holds: same subject set, same left/right geometry, same eyeline direction, same light temperature and direction, same wardrobe state, same prop states (drink half-full, jacket on, mic in right hand). State any of these that a scene puts stress on.

**Whip pan timing** — a whip needs at least 0.8 seconds of motion to render as a blur; anything shorter renders as a hard cut:
```
0.3s — Subject A framed, held
0.8s — WHIP begins, motion blur across the pan
1.4s — Subject B framed, held
```

**Speed changes.** When mixing real-time and slow-motion beats in one prompt, put a hard cut at every speed change. Never blend speed inside a single continuous shot — one speed per beat, cut cleanly at the transition.

---

## MODE-SELECT TABLE

| Mode | Use when | Capture | Lens character | Movement | Diffusion | Grade |
|---|---|---|---|---|---|---|
| **M1 Narrative** | Real-world dramatic — streets, kitchens, cars, bars, interiors, exteriors. Anywhere lived-in. | Wide-latitude cinema | Vintage 2x anamorphic, wide aperture — oval bokeh, soft edge falloff | Handheld with operator breath | Light diffusion bloom | Color-negative daylight film, fine 35mm grain, teal-amber |
| **M2 Studio** | White void, clean studio, hyperpop saturated set, fashion film, editorial portrait, performance-on-set | Wide-latitude cinema | Clean spherical, wide aperture — natural round bokeh, even sharpness | Locked tripod with optional slow push | Mild diffusion; intentional highlight bloom on chrome/rhinestone | Saturated editorial, warm-retained blacks, fine grain |
| **M3 Action** | Combat, chase, stunts, war, mech battles, alien encounters, debris, smoke, dust | Wide-latitude cinema | Vintage 2x anamorphic, wide aperture — oval bokeh | Handheld and shaky throughout, no stabilized shots | Light diffusion bloom | Color-negative film, heavier low-light grain, palette per scene, dusty haze |
| **M4 Performance** | Stadium, arena, stage, jumbotron, lightstick crowd, festival pit | Wide-latitude cinema | Vintage 2x anamorphic, wide aperture — oval bokeh, horizontal streak flares | Mixed handheld pit-photographer and orbital, hard cuts | Light diffusion bloom | Color-negative film, fine grain, desaturated cool with warm bloom, stage color cast |
| **M5 Atmospheric** | Abandoned environments, no-humans plates, landscapes, weather, mood establishing | Wide-latitude cinema | Vintage 2x anamorphic, wide aperture — oval bokeh, soft edge falloff | Locked-off or extremely slow push-in / pull-back | Light diffusion bloom | Color-negative film, fine grain, palette-driven (specify hex) |

---

## MODE CAMERA CAPTURE LINES

**M1 — Narrative:**
```
Camera Capture: wide-latitude cinema capture, [FOV°] ([mm]) vintage 2x anamorphic character at a wide aperture — oval bokeh, soft frame-edge falloff — light diffusion bloom softening highlights, handheld with natural operator breath, color-negative daylight film rendition with fine 35mm grain, teal-amber grade, shallow depth of field, 24fps 180° shutter, [X]s.
```

**M2 — Studio:**
```
Camera Capture: wide-latitude cinema capture, [FOV°] ([mm]) clean spherical character at a wide aperture — natural round bokeh, even sharpness — mild diffusion bloom, locked tripod with optional slow push-in, saturated editorial grade, fine grain, warm-retained blacks, 24fps 180° shutter, [X]s.
```
For rhinestone / chrome / surface-detail close-ups, append: `intentional highlight bloom on reflective surfaces, blooming the speculars on chrome and rhinestone.`

**M3 — Action:**
```
Camera Capture: wide-latitude cinema capture, [FOV°] ([mm]) vintage 2x anamorphic character at a wide aperture — oval bokeh, soft edge falloff — light diffusion bloom softening highlights, handheld and shaky throughout with no stabilized shots, color-negative film rendition with heavier low-light grain, [palette descriptor] with dusty atmospheric haze, 24fps 180° shutter, [X]s.
```
For impact slow-motion append: `intercut 96fps high-speed slow-motion at the [moment] holding 180° shutter for natural motion blur.`

**M4 — Performance:**
```
Camera Capture: wide-latitude cinema capture, [FOV°] ([mm]) vintage 2x anamorphic character at a wide aperture — oval bokeh, horizontal streak flares on stage lights — light diffusion bloom softening highlights, mixed handheld pit-photographer and orbital operator energy with hard cuts between angles, color-negative film rendition with fine grain, [stage-lighting color cast], heavy volumetric haze, real sweat sheen, 24fps 180° shutter, [X]s.
```

**M5 — Atmospheric:**
```
Camera Capture: wide-latitude cinema capture, [FOV°] ([mm]) vintage 2x anamorphic character at a wide aperture — oval bokeh, soft edge falloff — light diffusion bloom softening highlights, locked-off or extremely slow push-in only, color-negative film rendition with fine grain, palette grade [hex values], atmospheric haze, weathered material detail, 24fps 180° shutter, [X]s. No humans, environment is the subject.
```

Replace `[palette descriptor]` (M3) with scene language — "daylight overcast," "golden hour warm," "blue-hour cool," "stormy desaturated." Replace `[stage-lighting color cast]` (M4) with scene-specific — "magenta-red from LED cube above," "amber and ultraviolet wash from side rigs." Replace `[hex values]` (M5) with actual codes.

---

## CANONICAL BLOCKS — REFERENCE

### Frame Map
Anchors every subject in screen space before motion enters. Treat the frame as 2D screen space: horizontal (left/center/right third or x%), vertical (upper/center/lower third or y%), depth (foreground/midground/background), frame occupancy (CU/MS/WS or % of frame height), negative space.

Skip x/y % for clear classical compositions (centered single, OTS, profile two-shot). Percentages earn their place when composition is asymmetric or drift would break the shot.

Multi-shot: name Shot 1 framing, Shot 2 framing inline.

### Subject Lock
One discrete block per subject. Never jam multiple into one paragraph. Pin: identity tag, body orientation, pose, state (described by what body/face physically do), expression (lips/eyes/brow/jaw register), gaze direction, contact points (feet on which surface, hand on which object), state-changes reference can't carry (damp, dirty, torn), lock-down line ("face, hair, wardrobe, and silhouette identical throughout").

### Cross-Frame Rules
Multi-subject shots. Standard language: *"@tag1 and @tag2 never swap positions, never cross center, never change depth. Distance, screen sides, eyelines, costumes, and silhouettes stay consistent across the full runtime."*

When subjects must cross: state the crossing explicitly with timing.

### Movement
⚠️ **Per-beat timestamps are mandatory for any shot with more than one beat, not stylistic.**
See the timed-beat-sheet warning at the top of this file — this exact block was in place when a
batch shipped with one smeared gesture per clip, because "per-beat timestamps" reads as optional
polish until you've seen what an untimed prompt returns.

Four layers, named in this order in the flowing paragraph:
1. **Character motion** — physical actions across runtime, per-beat timestamps, speeds in km/h
2. **Micro-motion** — breath, hair, fabric, jewelry
3. **Environmental motion** — rain, smoke, dust, traffic, wind, particles (% density, meter depth)
4. **Camera motion** — only if not covered in Camera Capture; usually omitted here

Never tangle the layers. Each named explicitly, even when the layer is "nothing else moves." Saying nothing moves is a directive; absence is not.

### Last Frame
Exact composition at end of runtime. Where each subject sits at close, final pose/state/gaze, what's in focus, negative space, visual punctuation. Always closes with the on-screen text suppression line (unless in-frame text explicitly requested):

*"No on-screen text, no captions, no signage typography, no rendered text in the frame."*

### World Plate
Location, time of day, weather, set dressing, atmospheric quality. Anchored to `@plate_tag` if a plate reference is attached. If no plate, describe in prose. Atmosphere in % density and meter visibility depth.

### Sound Bed
Diegetic only. Specific sounds: footsteps (specify surface), fabric movement, breath, body sounds, object sounds, environmental ambient, mech/sci-fi diegetic, crowd diegetic, stage diegetic, weather. Never: song names, lyrics, "music plays," score descriptors, genre cues.

**Audio modes:**
- **Mode 1 (default):** Diegetic with SFX and ambient. `Sound Bed: Diegetic only — [sounds], no music, no dialogue except what is physically spoken in frame.`
- **Mode 2:** Silent capture (only if user explicitly says they're adding a track in post AND wants no in-camera audio). `Sound Bed: NONE — fully silent capture. Audio will be added separately in post.`

### Capture Realism (LOCKED — the real-footage engine)
The block that makes the shot read as cinema capture instead of AI video. Names the *physics* — the Camera Capture line names the *gear*. Sits second-to-last, immediately before Camera Capture. Ships on every prompt unless user explicitly asks for glossy/clean/commercial register.

**Four mechanics, all tuned per scene:**

**1. Depth via suspended atmosphere between planes** (default-on in M1/M3/M4/M5, and M2 when depth reads). Atmosphere — haze, mist, air density, particulate — suspended in the air *between* camera, subject, and background. Distant planes render softer, desaturated, lower-contrast than foreground. Tie to the actual planes in this shot. Scale thin/light/heavy per scene.

**2. Moisture without shine** (only if wet/humid/sweaty scene). Surfaces damp, not beaded; wet but not glossy. Muted, saturating moisture, no specular hotspot. Damp matte hair, slight moisture on skin holding matte, wet ground with muted reflection. Skip entirely for bone-dry scenes.

**3. Per-zone specular kill on skin + the flattering ceiling** (skip if no humans). Zero shine on forehead, nose bridge, cheekbones, temples, chin, collarbones. Paired with biology cues: real peach fuzz at jaw and hairline, soft pore texture, subsurface scattering, warmth preserved. **The flattering ceiling is locked** — texture fine, soft, even. Never harsh, severe, unflattering. No acne, no blemishes, no prominent spots, no scarring, no cratered pores, no brutal clinical macro. Realism never makes a face look ugly. Matte carries anti-plastic; fine-and-even carries flattering; tension resolves toward flattering.

**4. Contrast curve stated three ways.** (a) tonal curve — shadows lifted gently, highlights rolled off softly, nothing clipping/crushing. (b) specular removal — all speculars surgically removed from skin, hair, fabric, surfaces, every pixel matte and diffuse. (c) grade — low-contrast, slightly desaturated, warmth preserved. Three statements is what holds it.

**Canonical Capture Realism block (tune every bracket to scene):**
```
Capture Realism: [Foreground subject] sits inside real depth — [thin/light/heavy] atmosphere suspended in the air between camera, subject, and [the far background element], the background rendered softer, desaturated, and lower-contrast than the foreground so the figure sits within the air rather than pasted on a flat plane. [IF WET: Slight moisture has settled on every surface — damp matte hair, slight moisture on skin holding fully matte with no beading and no wet sheen, [wet ground with muted reflection / damp matte fabric], moisture that mutes and deepens without a single specular hotspot.] Skin reads true cinematic matte — zero shine on forehead, nose bridge, cheekbones, temples, chin, and collarbones, real peach fuzz catching light at the jaw and hairline, real soft fine even pore texture, light absorbed like true subsurface scattering, warmth preserved and natural, slightly desaturated but never pale or washed-out or cool-shifted, never plastic, never doll-skin, never AI-rendered, and never harsh — no acne, no blemishes, no enlarged or rough pores, fine flattering texture that keeps the face looking good. Low-contrast curve — shadows lifted gently holding texture, highlights rolled off softly never clipping to white, nothing crushed to black. All specular highlights surgically removed from skin, hair, fabric, and surrounding surfaces, every pixel reading matte and diffuse. Slightly desaturated grade with warmth preserved.
```

**Tuning:** dry scenes delete the `[IF WET: ...]` sentence entirely. No humans (M5 pure environment) drops the skin sentence; keep atmosphere and contrast curve; apply matte-not-glossy to environmental surfaces (wet concrete, metal, glass). Studio M2 editorial gloss: reduce or skip — it's the one mode where controlled specular is intentional. Atmosphere density scales — "thin" for clear interior, "light haze" for most exteriors, "heavy suspended mist" for moody pre-dawn or destroyed-city plate. Never overlaps with Camera Capture — no gear, grade hex, frame rate, or runtime here.

### Camera Capture
Single closing line — body, lens (FOV° + mm), filter, movement, stock, grade, frame rate, runtime. Only camera/grade/film stock language in the whole prompt.

**Default camera energy is handheld** with breath, drift, organic operator movement — even in editorial or observational moments. Lived-in operator presence is part of the cinema register.

**Locked-off tripod is OPT-IN ONLY** — only when user explicitly requests "locked off," "tripod," "no camera movement," "static," "still camera," or names a shot type requiring it (surveillance plate, formal portrait studio, security cam aesthetic).

---

## OPTICAL TECHNIQUES (NEW IN 3.0)

Named lens-and-camera patterns that produce specific recognizable looks. Use them by name-plus-application when the shot calls for one.

**Voyeur / long-lens observation** — the "someone is watching this from a distance" register. Three ingredients required simultaneously:
1. A foreground obstruction covering 20–30% of the frame — a wall edge, a pillar, a branch, a curtain, an arch, a leaf cluster — thrown out of focus
2. Suspended atmosphere between the camera and the subject — haze, dust, humidity, heat waver — stated in % density
3. Extreme long lens at 8° or 12° with the operator positioned far from the subject
The obstruction shape can change between shots in a sequence; the vantage stays anchored — never zoom-in on a voyeur shot.

**Broadcast press-box** — the televised-live-sport read: `8° (300mm) tele lens, operator handheld with a small 1–2cm hunting tremor, hunting for the action from a fixed distant vantage.`

**Foreground-loaded wide (macro-in-a-wide)** — small object made huge, background pushed back into deep space: `84° (24mm) wide, low-angle inches from the object, camera almost touching it.` Great for hero-shot props, hands, hardware.

**Wide portrait** — a close face rendered wide so the room stays legible around them: `63°–84° (28–24mm) wide FOV on a centered face at a normal working distance.` The face stays anchor; the world remains in-frame without going soft.

**Compressed atmosphere column** — the long lens's ability to stack air on itself: at 8°–12°, name the suspended particulate as a compressed column between camera and subject. *"a thick vertical column of suspended dust visible between the operator and the figure,"* *"a wall of heat haze stacked in front of the subject."*

---

## SPECIAL PROTOCOLS

**Extreme-FOV multishot stack (8°, 107° across multiple beats).** These lens ranges drift the fastest — the model loses the lens between beats after two or three cuts. Four locks required in combination, no substitutes:
1. **Anchor reference** — one location or environment reference held across every beat
2. **Opening lens declaration** — the FOV in degrees spoken at the top of every beat
3. **Closing lens declaration** — the FOV in degrees repeated at the end of every beat
4. **Color rendered by tying every hue to a surface, a light source, and a compositional purpose**, never as a bare list of color words
Drop any one of these four and the sequence starts drifting on beat three.

**Pressure fracture / impactless breaks.** When cracks, breaks, or debris need to happen *without* an impact point (glass fracturing from thermal stress, a wall giving way under crowd density, ice splitting from cold):
- Describe the origin as *edge stress* or *slow pressure*, never a point-of-strike
- Move the fracture pattern from edge inward rather than radiating out from a center
- Time the crack progression asymmetrically (0.3s at one edge, 0.6s spreading, 1.0s meeting midline)
- For crowds: *"the crowd pushes forward as a mass under its own weight, no strike, no throw"*

---

## STACKING MODES (Multi-World Sequences)

If a single Seedance sequence cuts between two worlds (M2 white void intercut with M1 kitchen, M3 action intercut with M4 performance): write each shot's Camera Capture specs inline in the closing line. Don't blend modes into one averaged grade. The cut between modes is the visual punch; collapsing kills the contrast.

For multi-shot same-mode sequences, compose one prompt with hard-cut triggers in Movement and one Camera Capture line with per-shot lens differences inline.

---

## RUNTIME & PER-SHOT TIMING

Total runtime stated in two places: title line and closing Camera Capture line. Both must match.

**Always ask runtime — never default.**

**Always pass `resolution: "4k"` on the actual generation call — never default.** Same
category of mistake as runtime: the prompt text can be perfect and the output still ships at
720p if this call parameter is left unset. See the warning at the top of this file.

**Shot complexity guidance:**
- **4–8 seconds** — one strong character action, single locked composition
- **8–12 seconds** — one action plus reveal or hold, optional micro-shift
- **12–15 seconds** — 2–3 simple beats with hard cuts inside the prompt
- **Complex multi-action sequences** — split into separate prompts

Per-shot timing sums to total runtime stated in title and Camera Capture.

---

## UNIVERSAL PROMPT RULES (LOCKED — ALL MODES)

1. **Pre-prompt confirmation on every new scene.** Bulleted list, tags FIRST, runtime LAST. Skip only on iterations of a prompt just delivered.
2. **Two-part delivery format:** (a) bolded English title with runtime, (b) English code block with labeled blocks and inline `@tag` references.
3. **Every element tag mentioned in Pre-prompt Tags appears at least once inside the code block.**
4. **Runtime baked into closing Camera Capture line.** Title runtime = Camera Capture runtime.
5. **Per-shot timing inline in Movement** for any multi-cut sequence.
6. **Discrete labeled blocks inside code block, in order:** Scene & Mood → Frame Map → Subject Lock(s) → Cross-Frame Rules → Movement → Last Frame → World Plate → Sound Bed → Capture Realism → Camera Capture.
7. **One Subject Lock block per subject.** Never jammed into one paragraph.
8. **One Camera Capture line at the bottom — never doubled.** Only camera/grade/film stock language in the whole prompt.
9. **No character names in prompt output.** Refer by tag + visual description.
10. **No platform/tool names in prompt output** ("Higgsfield," "Seedance," "Banana Pro," etc.).
11. **No internal production context** ("carried through the world," "matching the previous scene").
12. **Pure visual description only.** No meta-commentary. Every word describes a visible thing in the frame.
13. **Diegetic audio only.**
14. **Energy over position in Scene & Mood.** What bodies and forces are doing dramatically. Frame Map handles geometry.
15. **Cut triggers:** "Hard cut to," "Smash cut to," "Match cut on."
16. **Age-blind.** Never describe subjects by age. Describe by role, hair, wardrobe, identity markers.
17. **No on-screen text by default.** Last Frame closes with the suppression line unless user requests in-frame text.
18. **Positive locks over negative prohibitions.** See POSITIVE PHRASING section.
19. **One main idea per shot.** One dominant action, one main camera strategy, one lighting motivation. If more, split.
20. **Trust the reference for wardrobe.** Subject Lock names orientation, pose, state, gaze, contact points, state-changes. Wardrobe details visible in the reference are NOT re-described.
21. **Canonical reference always attached, never substituted by the plate.** Every named subject with a reference gets its own tag slot and Subject Lock, even when visible in the plate. Plate carries world; canonical carries identity.
22. **English only inside the code block.**

---

## PRE-DELIVERY PASS (silent QA — run before every delivery)

- [ ] Character gate asked (if first prompt of session) and answer carried
- [ ] Element tags named by user, listed in pre-prompt check, referenced inline in code block
- [ ] Canonical reference attached for every named subject, even when subject appears in plate. Subject Lock for each canonical-tagged subject.
- [ ] Mode selected with rationale
- [ ] Frame Map — every subject pinned to screen position, depth layer, frame occupancy
- [ ] Subject Lock per subject — identity / orientation / pose / state / gaze / contact points / state-changes / lock-down line. Wardrobe NOT re-described from reference.
- [ ] Cross-Frame Rules if 2+ subjects — no swap, no center cross, no depth change, distance held, screen sides held
- [ ] Movement — four layers named (character / micro / environmental / camera), per-beat timestamps where action demands, speeds in km/h, atmosphere in % / meters
- [ ] Last Frame — exact closing composition, on-screen text suppression line
- [ ] World Plate — location, time, weather, set dressing, anchored to plate tag if attached
- [ ] Sound Bed — diegetic mode chosen, specific sounds, no music
- [ ] Capture Realism — depth-via-atmosphere; moisture-without-shine only if wet; per-zone specular kill (dropped if no humans); contrast curve three ways
- [ ] Camera Capture — single trimmed paragraph, FOV° (mm) + body / filter / movement / stock / grade / frame rate / runtime, no doubled camera spec
- [ ] FOV picked from discrete step table (not "23°")
- [ ] Runtime confirmed with user, title runtime = Camera Capture runtime, per-shot timing sums
- [ ] Cuts precision picked (oner / sequential / timed / freestyle), stated correctly
- [ ] Written the visible — no mood-word abstractions, all emotion via muscle movement, speeds in km/h, atmosphere in % / meters, giants via human-height
- [ ] Positive phrasing throughout, negative only in sanctioned suppressions
- [ ] Style distributed — no top prefix
- [ ] No character names, no platform names, no meta-commentary
- [ ] Every element tag from pre-prompt appears inline in code block
- [ ] Total prompt body word count within target range (280–400 single, up to 600 multi)

**Repair pass — if detected, fix before delivery:**
- Too poetic → rewrite Scene & Mood as physical visual instructions
- Overloaded action → split into multi-shot
- Character might drift → tighten Subject Lock with contact points and ground marks
- Subjects might swap → tighten Cross-Frame Rules
- Wardrobe re-described from reference → cut redundant description
- Double camera spec → collapse to single Camera Capture line
- Mode register conflict → keep one cinema mode dominant per shot
- Action too complex → keep one dominant motion, push rest to next shot
- Last Frame missing or vague → write a specific closing composition
- FOV drift on extreme-FOV multishot → apply 4-mechanism consistency stack
- Word count over → trim Subject Lock and Movement first, then Cross-Frame Rules

---

## OPTIONAL HANDOFFS

**Story bible pairing.** If a story bible skill is also active in the session (character voice/movement/stillness/aesthetic era locks), pull character Movement/Stillness descriptors into Subject Lock, pull Speech into Sound Bed for dialogue, pull the aesthetic era block into the grade half of Camera Capture, pull production rules into the Universal Prompt Rules layer. The bible is the identity/context source; this skill is the cinematography grammar.

**Banana Pro handoff.** If the user has a Banana Pro plate for the environment or wants camera grammar to match an existing plate, ask which cinema mode the plate used and lock the matching grammar. The two skills share the five-mode framework.

Otherwise operate standalone.
