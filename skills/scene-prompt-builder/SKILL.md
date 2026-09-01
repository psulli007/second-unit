---
name: scene-prompt-builder
description: "Write a character scene prompt that doesn't look like AI slop. Use when generating a story/scene still or a video start-frame with a locked character in a locked location — any character+place pair. Gives the eight input slots a scene prompt needs, the specific slop tells and the lever that kills each, and the two failure modes unique to a small character. Pairs with story-bible-builder (who the character is) and location-plate-builder (where)."
---

# Scene Prompt Builder

A scene prompt is **two reference images + eight slots**. Most bad output comes from leaving a
slot empty: the model fills it with its most average guess, and the average of everything is
exactly what "AI slop" means. Fill every slot, every time.

## The eight slots

| # | Slot | What it must say |
|---|---|---|
| 1 | **References** | The CANON character sheet (identity) + the location plate (place). Both, always. Keep a short ASSETS.md in your own asset folder naming which sheet and which plate are CANON — "the newest file" is not a canon rule and drift is the result. |
| 2 | **Beat** | One physical action caught MID-motion. Not "cooking" — "lifting the lid, steam hitting his face, head pulled back an inch". |
| 3 | **Gaze** | Where the eyes point, **as a direction**. See the gaze rule below — this is the slot people forget. |
| 4 | **Camera** | Lens mm, height, distance, angle, shot size. Height is the big one. |
| 5 | **Blocking** | Where the character is in the room; which side each prop is on; what he's standing on. |
| 6 | **Light** | ONE motivated source, its direction, and which side the shadow falls. |
| 7 | **Optics** | What's tack sharp, what's soft, what crosses the foreground. |
| 8 | **Exclusions** | The specific wrong thing you expect, named. |

## THE GAZE RULE

**A negative is not enough.** "He is not looking at the camera" tells the model where *not* to
look, so it picks a side at random — and half the time the character is doing one thing while
staring at another, which instantly reads as fake.

State the target **and its direction relative to the character**:

> The pot is on HIS RIGHT SIDE. His head is turned DOWN AND TO HIS RIGHT, tilted forward, so he
> is looking DIRECTLY DOWN INTO the open pot. Both pupils turned toward the pot, down-right.
> He must NOT be looking to his left, NOT straight ahead, NOT at the camera.

Measured effect: identical prompt otherwise, first pass had him side-eyeing away from the pot
he was opening; adding the direction fixed it in one pass. Gaze is the cheapest, highest-impact
correction available.

## The anti-slop map

| The tell | The lever |
|---|---|
| Subject dead-centre, symmetrical | Put them off-centre; let the room out-weigh them |
| Everything sharp corner to corner | Name the focal plane AND what is soft |
| Nothing in front of the subject | **Foreground occlusion** — herbs, a pan handle, the counter edge. Highest value single change; it puts the camera *in the room* |
| Smiling down the lens | Gaze on the task (see the gaze rule) |
| Posed, settled, balanced | Catch them BETWEEN two states — weight shifting, something falling |
| Generic golden glow everywhere | One source, named direction, shadow side named |
| Too clean | Flour dust, a spill, a crooked towel, a smudge on the copper |
| Floats, no weight | Contact: claws gripping the counter edge, apron folding, cloth denting |
| Orange-and-teal over-grade | "Restrained natural colour, no heavy grade" |
| "cinematic, 8k, masterpiece, award-winning" | **Delete these.** They average the output. Say the lens instead |

## Three failure modes for a SMALL character

**Scale drift.** A small character silently becomes human-sized, or the set shrinks around
them. Every scene needs an explicit anchor tying the character to a prop:
*"the copper pot beside him is as tall as his shoulder; he stands ON the counter, not on the
floor."*

**Prop-to-prop drift (caught twice, 2026-07-30).** Anchoring character-to-prop scale is not
enough — two props sized relative to each other need their OWN anchor, or they drift
independently. A lid generated to look right floating in the character's wing came out
visibly narrower than the pot it's supposed to cover — it would drop *into* the pot rather
than sit on top. State the relationship explicitly: *"the lid's diameter matches the pot's rim
exactly, edge to edge — it rests flush across the opening when set down, never narrower than
the rim, never able to pass inside it."* Any two objects that must fit together (lid/pot,
key/lock, lens/cap) need this same explicit fit-anchor — don't assume matching size is implied
by both being scaled correctly to the character.

**Wardrobe drift.** The model reverts to the genre stereotype — a cook-bird gets a chef's hat.
Restate the wardrobe in full every single time, with the negative attached:
*"oatmeal linen crossback apron with the brand wordmark. NO chef's hat, no other clothing,
no accessories."*

## Camera heights that stop a mascot render

Default AI framing is an adult-human eye-level, centred, 50mm hero shot. Deliberately choose:

- **At the character's own eye level** — the single strongest anti-mascot move for a small
  character. Makes the audience share his world instead of looming over it.
- **Below him**, looking up — heroic, or makes the kitchen loom.
- **High, looking down** — makes him small and busy in a big room.

Say the lens (28/35/50/85mm) and the distance in cm. "35mm at his eye level, 40cm away" is a
real camera position; "cinematic close-up" is not.

## Workflow

1. Fill all eight slots; generate **2 variants** at 4k/high.
2. Score the output against the anti-slop table above, one row at a time.
3. Expect ONE systematic miss on the first pass. Fix that slot only and regenerate — do not
   rewrite the whole prompt, or you lose what worked.
4. Keep the winner in your asset folder under `scenes/`, with the story beat in the filename.

Scene stills double as the **start frame** for image-to-video. Compose so there is room for the
motion to happen inside the frame.
