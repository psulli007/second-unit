---
name: studio-router
description: "Entry point for any video request — routes 'make a video', 'record a demo', 'create a clip/short/UGC video' to the right pipeline in this studio and enforces the standing rules before anything is filmed or generated. Install it at user level so it fires wherever the studio happens to be cloned. Use it when a video is asked for and it is not yet obvious which pipeline applies; each pipeline's own skill takes over from there."
---

# Studio Router

The other skills in this repo each do one job well. This one decides which job it is, and
stops the two failure modes that happen before any of them get a chance: filming the wrong
thing, and rebuilding a recording rig that already exists.

**Install this one at user level** (`~/.claude/skills/studio-router/`), not inside the repo.
Its whole purpose is to fire when someone asks for a video *somewhere else* — in the product
repo, in an empty directory — and point the work at the studio.

## Standing rules — apply to every video, before routing

- **Real product UI only.** Never mock up, re-draw, or generate an app screen. Generated
  interfaces read as fake to viewers who cannot say why, and the credibility is the whole
  asset. Generation is for atmosphere, characters, hardware and b-roll.
- **No generated humans.** If the content needs a presenter, use a character (see
  `story-bible-builder`) or no presenter at all. A synthetic person in a product video is a
  trust problem that no amount of quality fixes.
- **Generated b-roll carries zero UI, zero text, zero faces**, and only ever sits between
  real footage.
- **Nothing ships unverified.** `qa-take.js` on the file you are actually delivering, then
  read a frame strip. A statistic and a visibly broken composite are regularly true at once.
- **No claim the footage does not show**, and never an earnings or income promise.

## Finding the studio

⚠️ **Locate it; do not assume a path.** The studio gets cloned wherever each person or
machine puts it. Check the working directory and its parent first, then search from home:

```bash
find ~ -maxdepth 4 -type d -name second-unit 2>/dev/null
```

If you cannot find it, say so and ask where it lives or whether it needs cloning. Never
guess a path, and never start rebuilding recorders because the studio was not where you
expected — that is how a session ends up with an improvised pipeline that cannot reach 4K
and skips every verification gate.

Then **work inside the studio directory**, so its project skill and config load.
Bootstrap first: `scripts/bootstrap.sh`, then a dev server if you are filming one.

## Routing

| The request is about… | Go to | Then |
|---|---|---|
| A feature of an app you can run | `.claude/skills/feature-video` | Probe → record → verify → derive formats |
| The product embedded in a site you do not control (customer site, partner install) | `scripts/site-common.js` + `examples/06-record-third-party-site.js` | Consent first; ads blocked; read the frames for pixel-baked names |
| A short social cut from an existing master | `product-demo-videos` | One master, several cuts — never re-film per platform |
| A character hook + product demo (the 22–45 s vertical format) | `talking-head-concept-video` | Follow its verification gates exactly |
| A character using a device with the live app on its screen | `pov-device-film` + `device-screen-studio` | Never composite UI onto a photo of a phone |
| A new character, location, prop, or scene | `story-bible-builder` → `ghost-mannequin-character-sheet` → `banana-pro-director-2.0` | Lock identity before generating anything else |
| Generated motion | `cinema-worldbuilder-pro-30` | Check the render resolution; it silently drops to 720p |
| Voice, or a character talking | `character-voiceover` → `character-lipsync` | Generate WITH the audio, never repaint a mouth |
| Posting or scheduling a finished cut | `social-publishing` | Dry run, named account, human confirmation |

## Deliverables

- Every verified video goes to the library (`LIBRARY_DIR` in `config.env`) immediately, with
  its `INDEX.md` entry — not at the end of the batch. A cut that exists only in `out/` is a
  cut that gets lost in the next clean.
- Deliver each one as it finishes. Batching deliveries hides a broken take until the end,
  when re-filming costs the most.
