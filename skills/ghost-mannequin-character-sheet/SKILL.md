---
name: ghost-mannequin-character-sheet
description: "Banana Pro image prompt director for the 3-panel ghost-mannequin character reference sheet — one 16:9 frame, three vertical panels on a continuous mid-gray seamless backdrop: (LEFT) full-body front with the head/neck completely absent (ghost-mannequin/headless garment display, invisible-neck technique), (MIDDLE) full-body back view with the head included, (RIGHT) tight face/head close-up. Use whenever the user wants a 'character sheet', '3-panel sheet', 'reference sheet', or references the headless/ghost-mannequin garment-display technique. Distinct from banana-pro-director-2.0's Mode 2 six-panel sheet, which keeps the head on every body panel — use this skill instead when the user specifically wants the headless-front / back / face-close-up three-panel format."
---

# Ghost-Mannequin Character Sheet — 3-Panel Reference Builder

A locked Banana Pro prompt structure for building a **3-panel character reference sheet** in one 16:9 image. This is a distinct technique from a standard multi-angle character sheet: the front panel uses a **ghost-mannequin / headless garment display** — the outfit and body render exactly as normal, but the head, neck, and everything above the garment's neckline is completely absent from the frame, with the backdrop continuing uninterrupted through that space. This isolates wardrobe/body reference from face/identity reference into cleanly separable panels.

**When to use this vs. banana-pro-director-2.0's Mode 2 six-panel sheet:** this skill is for the specific headless-front / full-body-back / face-close-up three-panel format. If the user wants a standard multi-angle sheet where the head appears in every body panel, that's Mode 2 of `banana-pro-director-2.0` instead. Ask if unclear which format is wanted.

---

## THE THREE PANELS (LOCKED ORDER)

**LEFT PANEL — Headless outfit display (ghost-mannequin).** The exact full-body pose from the character/wardrobe reference. Full wardrobe rendered in complete detail — every garment, layering, accessory, jewelry, footwear. **The head, face, hair, neck, and everything above the top of the garment's neckline/collar are completely absent from the frame** — no floating hair, no ghosted outline, no cutout edge, no visible cross-section, no stump, no blur, no shadow of a head. The backdrop continues cleanly and uninterrupted through the entire space where the head and neck would be. Any collar/neckline/strap that would sit at the neck holds its shape naturally, as if worn on an invisible neck. Full-body framing from where the head would be down to below the feet/footwear.

**MIDDLE PANEL — Full body from behind.** Same character, same pose rotated 180 degrees so the camera sees them from directly behind, full body **head included**, head to below the feet. Hair rendered in full from behind (updo/style structure, loose strand behavior). The back of the outfit — closures, straps, open-back details, hemlines, how the garment falls from behind. Same identity markers/accessories as visible from behind (arm cuffs, back tattoos, etc.).

**RIGHT PANEL — Head and face close-up.** Tight portrait framing from just above the crown/crest down to the top of the garment's neckline/collar at the collarbone (or the equivalent anchor point for a non-human character). Full identity detail: face structure, expression, eyes, all hair/crest detail described in full (style, texture, part, flyaways). Model face-card neutral (or the character's locked default expression), eyes to camera, body squared to camera.

---

## FRAME AND BACKDROP (LOCKED)

- One 16:9 frame, three vertical panels side by side, **thin subtle vertical seams** separate the panels visually but the backdrop reads as **one continuous mid-gray seamless** behind all three — no border frames, no captions, no text.
- All three panels lit and rendered **as one cohesive studio session** — matched lighting, matched color, matched grain, matched fabric/material rendition across all three.
- Mid-gray seamless is the locked default (consistent with `banana-pro-director-2.0`'s standing default) — white only on explicit user request, in which case swap the lighting close for the full cinema stack per that skill's white-backdrop exception.

---

## THE CRITICAL TECHNIQUE — WRITING THE HEADLESS PANEL

The ghost-mannequin panel is the part that's easy to get wrong. The prompt must describe the **absence** explicitly and specifically — this is one of the rare sanctioned exceptions where naming what's NOT there is necessary, because otherwise the model defaults to drawing a head.

Required elements, all present every time:
1. **Explicit absence statement** naming everything that's gone: "the head, face, hair, neck, and everything above [the garment's neckline] are completely absent from the frame."
2. **Anti-artifact list** — the specific failure modes to suppress: "no floating hair, no ghosted outline, no cutout edge, no visible cross-section, no stump, no blur, no shadow of a head."
3. **Backdrop continuity statement** — "the mid-gray seamless backdrop continues cleanly and uninterrupted through the entire space where the head and neck would be."
4. **Invisible-neck garment behavior** — whatever sits at the neckline (collar, halter tie, strap, buttoned collar) is described as holding its natural shape "as if worn on an invisible neck."

Skip any one of these four and the model tends to either draw a faint head anyway or render a visibly broken/cutoff neck stump.

---

## READING REFERENCES

Same rules as `banana-pro-director-2.0`: extract hair, wardrobe, jewelry, body markers, identity by **visual description only** — never invent, never use proper names, never use real brand names (describe a logo generically unless the user explicitly wants their own brand mark reproduced, e.g. an established brand mascot). Age-blind — describe by build/role, never age.

If the user has a locked character reference (a prior face-lock or a full character sheet), study it and mirror the spec back before writing the panel prompt, same as banana-pro-director-2.0's Step 0.

---

## LIGHTING CLOSE (LOCKED — LEAN REMBRANDT GRADE)

Reuse the same lean Rembrandt lighting language `banana-pro-director-2.0` uses for mid-gray plates — it's what keeps the three panels reading as one cohesive session:

```
Mid-gray seamless studio background across all three panels, even neutral mid-gray, no seam line, no gradient, no falloff to black or white. Relight from scratch overriding any reference lighting: one broad diffused soft key light from camera-[left/right] and slightly above, gentle wrap onto the figure and face, a soft triangle of light on the shadow side in each panel, subtle low fill from camera-[opposite side] lifting the shadow side, no hard shadow edges, no rim light, no hair light, no kicker — only the gentlest lifted shadow on the off-light side. Skin/surface reads matte and velvety with a low-contrast milky look, no shine, no oily T-zone. Skin and materials render at their true natural tone, warmth preserved, never washed-out, never cool-shifted by the background. [Material-specific line — fabric renders at its true natural color with soft matte drape and visible weave; metal/other surfaces render with real material character, not chrome, not plastic.]
```

Close every prompt with the standard realism paragraph (adapt human-skin language to the character's actual material — feathers/fur/skin as applicable):

```
Real [skin/feather/fur] with visible natural texture, fine detail catching light along [jawline and hairline / crest and brow ridge], subtle subsurface scattering where applicable, real fabric weave and drape, real hair/feather rendered strand-by-strand or barb-by-barb with natural texture, real material surface on any jewelry/accessories. Photographed on a 50mm prime at a wide aperture, natural round bokeh, even sharpness across all three panels, soft natural film grain. Photographed not generated, never plastic, never waxy, never AI-smoothed.
```

---

## CANONICAL PROMPT TEMPLATE

```
A single 16:9 cinema-character-reference sheet composed as three vertical panels side by side against one continuous mid-gray seamless studio backdrop, all three panels lit as one cohesive studio session with matched lighting, matched color, matched grain, and matched material rendition. Thin subtle vertical seams separate the panels visually but the backdrop reads as continuous mid-gray behind all three, no border frames, no captions, no text.

LEFT PANEL — headless outfit display. The exact full-body pose and framing from the attached reference: [pose description — stance, weight distribution, angle off camera, arm/limb position]. Wearing the exact same outfit/wardrobe as the reference: [full wardrobe description head-to-toe — every garment, layering, accessory, jewelry, footwear]. [Visible body detail at exposed areas — skin/feather tone, identity markers visible in this framing]. The head, face, hair/crest, neck, and everything above [the garment's neckline / collar / anchor point] are completely absent from the frame — no floating hair, no ghosted outline, no cutout edge, no visible cross-section, no stump, no blur, no shadow of a head, the mid-gray seamless backdrop continues cleanly and uninterrupted through the entire space where the head and neck would be. [Neckline/collar] sits naturally as if worn on an invisible neck, holding its shape and folds intact. Full body framing from where the head would be down to below the feet/footwear.

MIDDLE PANEL — full body from behind. Same character standing in the same pose rotated 180 degrees so the camera sees them from directly behind, full body head to below the feet, [pose mirrored as applicable]. [Hair/crest description from behind — style, structure, loose strands/feathers]. The back of the outfit: [back-specific wardrobe detail — closures, straps, open-back details, hem/drape from behind]. [Visible body detail from behind]. [Identity markers/accessories visible from behind]. Arms/limbs in natural resting position.

RIGHT PANEL — head and face close-up. Tight portrait framing from just above the crown/crest down to the top of [the garment's neckline] at the collarbone. [Full identity descriptor — build/heritage or species, skin/feather tone and finish, face structure, eyes, brows, nose/beak, lips, any identity markers, default expression]. Body squared to camera, head level. [Hair/crest readable in full — style, part, texture, flyaways, any face-framing pieces]. [Neckline] visible at the base of the neck.

[LIGHTING CLOSE — mid-gray seamless across all three panels, lean Rembrandt grade per above, adapted key/fill sides and material lines to the scene.]

[REALISM CLOSE — adapted to the character's actual material per above.]
```

---

## UNIVERSAL RULES (carried from `banana-pro-director-2.0`, apply here too)

1. No character names in the prompt output — visual descriptors only.
2. No real brand names in the prompt output, unless the user explicitly wants their own established brand mark reproduced (e.g. a brand mascot's own logo) — confirm this explicitly since it's an exception to the normal rule.
3. No aspect ratio written into the prompt — 16:9 is set in the Higgsfield UI.
4. Pre-prompt confirmation before delivering: references attached, character/wardrobe summary, which side the key light comes from, panel 6-style detail choices if any variation from the standard three panels. Skip only for a minor tweak to a just-delivered prompt.
5. Photoreal is the default register for human characters; for stylized/cartoon characters, keep the *lighting and material physics* discipline (matte skin/feather rendering, real fabric weave, soft film grain) while writing identity in the character's own established style (see the character's locked spec/prior sheet).

---

## HANDOFFS

Pairs with `banana-pro-director-2.0` for face-lock and single-image outfit steps that should exist before this sheet is built (this skill assumes a locked character + approved outfit reference already exist, same gate as Mode 2). Pairs with `cinema-worldbuilder-pro-30` downstream — the face-close panel and full-body panels from this sheet become canonical `@tag` references for Seedance scene prompts. Pairs with `story-bible-builder` for the identity/voice/canon this sheet visualizes.
