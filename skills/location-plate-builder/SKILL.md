---
name: location-plate-builder
description: "Image prompt director for LOCATION plates — a character-empty environment set built as a reusable reference for scenes and video. Use whenever the user wants a 'location', 'set', 'environment plate', 'scene backdrop', or a place for a character to be composited into. Builds functional sets (not just pretty backdrops) with a motivated single light source, three named depth planes, geographic/blocking anchors, and atmospheric depth — following the Higgsfield Cinema Studio locations method. Distinct from prop-sheet-builder (objects) and the character skills — this is the third leg of the character/prop/LOCATION asset triangle."
---

# Location Plate Builder — Environment Set Reference

Locked prompt structure for building **location plates** — the setting a character gets composited into, or a pure environment establishing shot. Based on the Higgsfield Cinema Studio locations method: a location is a **functional set, not an aesthetic frame**. It has to support character blocking, one consistent lighting logic, visible depth across planes, and geographic continuity when the camera moves.

Third leg of the asset triangle: `banana-pro-director-2.0` / `ghost-mannequin-character-sheet` (characters) → `prop-sheet-builder` (objects) → **this** (locations).

---

## THE CORE PRINCIPLE

**Build a set, not a backdrop.** The most common failure is a flat frontal facade that looks nice but has no depth, no defined light direction, and no space for a character to actually stand. Every location plate names its geography (entrances, routes, what's where) and its three depth planes *before* styling, so a character can later be anchored to fixed objects in the space and the light stays consistent when the camera turns.

---

## THE ESSENTIAL LOCKS (every plate)

1. **One motivated light source.** A single named source (a window camera-left, an overhead pendant, a doorway) with a consistent direction and falloff. Never multiple contradictory sources — they create conflicting shadows that read as fake.

2. **Three named depth planes.** Explicitly describe foreground / midground / background as distinct layers. This is what separates a real set from a flat plane. Name what occupies each.

3. **3/4 camera view, not frontal.** Default to a three-quarter angle — it exposes side geometry and separates the three depth planes, giving real placement cues for compositing a character later. Frontal framing flattens the set into a backdrop.

4. **Blocking anchors.** Name fixed objects a character could later be positioned against ("between the counter's end and the window," "in front of the open shelving") rather than vague screen directions. This is what makes the location *functional* for scene work.

5. **Atmospheric depth.** Preserve a little haze / air density so distant planes read softer and further away. Killing the haze makes every plane equally sharp and the space collapses. (Scale it to the room — thin for a clean interior, heavier for a moody or exterior space.)

---

## THE DON'TS (from the method)

- **No frontal facades** that flatten into backdrops with unconstrained hidden geometry.
- **No oily, featureless surfaces** — real materials need real texture; oversharpened surfaces "swim and smear."
- **Don't kill the haze** — atmospheric perspective is what sells depth.
- **No multiple light sources** creating contradictory shadows — one motivated source.

---

## STYLE-MATCH RULE

Same as props: the location renders in the register it will be *used* in. For a stylized-cartoon character, a fully photoreal location can still work as an intentional mix (photoreal environment + cartoon character is a common, appealing look — same call the prop skill flags), but confirm the intent. If the location must match a stylized character exactly, state the cartoon/Pixar-lite render explicitly in the prompt. When in doubt, ask which way the mix should go.

---

## REUSE / CONTINUITY

- One master wide is enough for B-roll or montage **only when no cut depends on exact off-frame geography** — i.e. later invention can't break blocking or continuity.
- If scenes will cut between angles of the same location, generate the plate at 3/4, then **test the reverse angle** to verify the anchor objects, openings, light direction, materials, and depth all stay consistent. Document what drifts.
- A single location plate reused across multiple scenes (e.g. one kitchen for a 4-scene explainer) is the efficient default — lock it once, frame differently per scene.

---

## CANONICAL PROMPT TEMPLATE

```
A [3/4-angle / three-quarter view] cinematic location plate of [the place], no people in frame, [aspect intent — wide establishing]. [Render style — photoreal cinema capture OR 3D-stylized cartoon matching the character, stated explicitly].

FOREGROUND: [what's nearest the camera — a counter edge, a table, foliage — the layer a character could stand behind or beside].
MIDGROUND: [the main playable space — where a character would be placed, with named blocking anchors: the island, the shelving, the window seat].
BACKGROUND: [the deepest layer — a far wall, a doorway to another room, a window view — held softer by atmospheric haze].

LIGHT: one motivated source — [named source and direction, e.g. "warm afternoon light from a large window camera-left"], consistent direction and soft falloff across the room, gentle shadows, no contradictory second source.

MATERIALS & DETAIL: [named surfaces with real texture — wood grain, worn tile, ceramic, linen], real material texture, never oily or smeared.

ATMOSPHERE: [thin/light/moderate] atmospheric haze suspended between the planes so the background reads softer and deeper than the foreground.

[Grade / mood line — color temperature, warmth, film register.] Photographed not generated, real set, real light, real depth — never a flat backdrop.
```

---

## PRE-PROMPT CONFIRMATION

Short bulleted check before the full prompt: the place, the one light source + direction, the three depth-plane contents, the render style (photoreal vs cartoon-match), and whether reverse angles will be needed (which raises the continuity bar). Skip only for a minor tweak to a just-delivered plate.

---

## UNIVERSAL RULES (carried from the asset-building set)

1. No aspect ratio in the prompt body — set in the Higgsfield UI (locations are usually 16:9 or wider, 21:9 for cinematic establishing).
2. No real brand names / signage unless it's the project's own.
3. Mid-gray seamless is NOT used here — locations are full environments, not isolated assets. (That rule is for characters/props only.)
4. Single fenced code block per plate on delivery.

---

## HANDOFFS

The finished location plate becomes a `@plate` reference in `cinema-worldbuilder-pro-30`'s World Plate block (video) and a scene backdrop for `banana-pro-director-2.0`'s Mode 3A (compositing a locked character into the environment). Pairs with `prop-sheet-builder` (props that live in the location) and the character skills (who gets composited in). For a full scene still: location plate + character reference + prop references composited together, then that still becomes the Seedance start-frame.
