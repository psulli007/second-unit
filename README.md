# second unit

> In film, the *second unit* is the crew that shoots everything the principal unit doesn't:
> plates, inserts, establishing shots, product close-ups, b-roll. No stars, no dialogue —
> just the footage the film can't be cut without.

A working studio for making **product demos, marketing videos, and AI-generated character
film** — the recording engine, the cutting pipeline, and a set of Claude skills holding the
prompt craft for image and video generation.

It came out of shipping 30+ videos for one product: feature demos filmed from real UI,
social cuts derived from them, and a mascot character with a locked look and a cast voice.
Everything product-specific has been stripped; what's left is the method and the tooling.

Two halves, usable independently:

| | |
|---|---|
| **Real UI** — record an app you actually run, verify it, cut it for each platform | `scripts/`, `templates/`, `examples/` |
| **Generated** — characters, locations, props, scenes, video prompts, voice, lip sync | `skills/` |

The line between them is deliberate: **the interface is always real footage; generation is
for everything around it.** Fabricated UI reads as fake to viewers who can't say why.

---

## Quick start

```bash
git clone <your-fork> second-unit && cd second-unit
cp config.example.env config.env
scripts/bootstrap.sh                  # toolchain check, deps, Chromium, library dirs

node scripts/demo-app.js &            # a small bundled app on :5050
node examples/01-record-desktop.js    # records it — no configuration needed
node scripts/qa-take.js out/desktop/*.webm
```

That works on a fresh clone with nothing configured. `demo-app/` is a deliberately small
fake app that exists so you find out whether ffmpeg, Chromium and the cutter work on your
machine *before* you also debug your own app's selectors. Keep it around: when a recording
breaks later, running the same recorder against the demo tells you in a minute whether the
problem is your app, your selectors, or the studio.

Then point it at your own product — `config.env` is the only file you should need to touch:

```bash
APP_URL="http://localhost:3000"
APP_READY_SELECTOR="[data-testid=app-root]"
```

Nothing in `scripts/`, `lib/` or `templates/` hardcodes a URL, a selector, or a brand colour;
`node scripts/check.js` enforces that.

**Requirements:** Node 20+, ffmpeg, and a browser Playwright can drive. Python 3 with
`pillow` + `numpy` (`pip install -r requirements.txt`) only for the image compositors.

---

## The recording engine

Four recorders, in increasing order of cost and fidelity. Start at the top; most demos never
need to go further down.

| Recorder | Output | Cost | Use for |
|---|---|---|---|
| `examples/01-record-desktop.js` | 1280×800 | fast | most feature demos |
| `examples/02-record-mobile.js` | 540×960 | fast | source for vertical/social |
| `examples/03-record-4k.js` | 3840×2400 / 2160×3840 | slow | hero footage |
| `examples/04-record-stopmotion.js` | same, sharper | ~15 s wall per 1 s output | the sharpest thing here |
| `examples/05-record-device-stage.js` | app live on a photoreal device | slow | hardware shots |
| `examples/06-record-third-party-site.js` | your product inside a page you don't own | fast | embeds, plugins, widgets |

Two non-obvious things they solve:

**You cannot get a 4K web recording by asking for one.** Playwright's `recordVideo` captures
CSS pixels, and `deviceScaleFactor` never reaches the video stream. `scripts/rec4k-common.js`
makes the CSS viewport itself 4K and zooms the page — rewriting `@media` breakpoint values by
the same factor so responsive logic still behaves — and the layout genuinely re-rasterises at
3–4×. `scripts/stopmo-common.js` goes further: `page.screenshot()` *does* respect
`deviceScaleFactor`, so it drives the UI in deterministic steps and screenshots every output
frame. Native layout, native breakpoints, genuinely crisp text.

**For anything embedded, the product only exists inside someone else's page.** A widget, a
plugin, a script tag — filmed on a localhost harness it looks like a mockup of itself.
`scripts/site-common.js` films it in a real host page: ad and tracker hosts blocked so a
stranger's creative never lands in a frame, a document-start redactor for a demo tenant built
from a stock theme, asset swaps for a logo or a stock author photo, and a deploy-freshness
check so you never film a build older than your checkout. What it cannot do is touch pixels —
a name baked into a photo survives everything, so read the frames before you cut. Filming a
customer's live site is a consent question before it is a technical one.

**A UI pasted onto a photo of a phone never survives a second look.**
`scripts/device-stage.js` renders the device frame and the live app together in one page, so
geometry is exact by construction and the screen's own glow spills onto the frame for real.
Measure the screen rect once with `scripts/measure-frame.py`; check geometry with
`scripts/probe-stage.js` before spending a take on it.

### Cutting

`scripts/build-flowcut.js` turns a raw take into a continuous condensed cut: no mid-action
cuts, text overlaid *on* the footage, per-segment speed (fast through typing and waits, 1× at
the payoff), landscape or vertical.

The thing that makes it work: recorders print `MARK <name> <t>s` at every beat, and segments
are cut on those marks. Cutting blind against a stopwatch lands cuts mid-keystroke.

```bash
node scripts/build-flowcut.js raw.webm out.mp4 spec.json [vertical]
node scripts/add-music.sh out.mp4 track.mp3 final.mp4 -14
```

Cards and captions are drawn from `BRAND_*` in `config.env`, and a spec's own `brand` block
overrides them per cut — so one studio produces a client-branded video (their font, their
gradient, their logo on the cards) without forking the cutter. A spec-level `xf` dissolves
every join instead of hard-cutting; a segment's own `xf: 0` keeps that one a cut. Vertical
specs take `fgh`/`crop`/`fgy`/`capTop`/`bgDim` for phone captures that are taller than 9:16,
so the caption sits above the app instead of on it.

### Verifying

```bash
node scripts/qa-take.js <clip.mp4>            # screen recording (default)
node scripts/qa-take.js <clip.mp4> --plate    # POV / device-stage take
```

Non-zero exit on FAIL. Checks for dead captures, frozen holds, edge gaps where a plate
under-covers the frame, dead tails, and held empty screens. Every one exists because that
defect actually shipped once. Run it before you look at the video, not after.

**The two modes matter**, because "static" means opposite things. In a screen recording the
app holds still while the viewer reads — that's the content. In a POV take the plate carries
continuous hand-held drift, so *every* frame should differ, and a static run is the
signature bug: a hold emitted as one long frame, which freezes the picture and makes the
plate jump. Running the wrong mode gives you confident nonsense in both directions.

---

## The skills

Markdown skills for Claude (or any agent that reads `SKILL.md` files). They're the accumulated
prompt craft — including the failures, which is most of the value. Drop the ones you want into
`~/.claude/skills/` or your project's `.claude/skills/`.

**Start here**
- `studio-router` — the entry point: standing rules, then which pipeline a request belongs to.
  Install this one at user level so it fires wherever the studio is cloned.

**Characters and assets**
- `story-bible-builder` — interview-driven: turns a story or brand into one dense canon
  document, shipped as an installable skill so every later prompt already knows the world.
  Start here if you're building a character.
- `ghost-mannequin-character-sheet` — the 3-panel reference sheet (headless front / back /
  face close-up) that locks identity separately from wardrobe.
- `banana-pro-director-2.0` — the image prompt grammar. Face locks, outfits, character
  sheets, scene plates, detail shots, outfit replacement.
- `location-plate-builder` — environments built as functional sets, not pretty backdrops.
- `prop-sheet-builder` — objects and floating UI/graphic elements.
- `scene-prompt-builder` — putting a locked character in a locked location without slop.

**Motion and sound**
- `cinema-worldbuilder-pro-30` — the video prompt grammar. Includes the two mistakes that
  cost whole batches: silently rendering at 720p, and untimed multi-beat shots.
- `character-voiceover` — casting method, and why "robotic" is almost always rhythm rather
  than timbre.
- `character-lipsync` — generate *with* the audio rather than repainting the mouth after;
  what works, what silently no-ops.
- `talking-head-concept-video` — the 22–45 s vertical format: character hook, pivot, product
  b-roll. The sync-verification gates, and the fps-before-zoompan bug that desyncs a whole cut
  without printing a warning.

**Product**
- `product-demo-videos` — MARK-based cutting, per-platform specs, the hook rule.
- `device-screen-studio` — real UI on a real-looking device, without compositing artifacts.
- `pov-device-film` — the full runbook for a character using a device with the live app on it.
- `social-publishing` — posting a finished cut without sending it to the wrong account:
  package layout, dry-run-first, and the account-targeting rule.

---

## Layout

```
config.example.env   the only file you should need to edit
lib/                 config loader + the app-target abstraction
scripts/             recording engines, cutting, QA, compositors
templates/           device stage, card + caption renderers
examples/            five worked recorders — copy one per flow
demo-app/            a small fake app, so a fresh clone can record something
skills/              the SKILL.md pack
docs/                the recording guide
.claude/skills/      the /feature-video pipeline skill
```

`node scripts/check.js` is the repo self-check — syntax, local requires, doc path
references, brand neutrality, secrets, config hygiene. It needs no ffmpeg and no browser, so
it runs anywhere. It's what CI runs.

## Pointing it at your app

Everything app-specific lives in `config.env`:

```bash
APP_URL="http://localhost:3000"
APP_READY_SELECTOR="[data-testid=app-root]"   # or APP_READY_FUNCTION for a global
APP_HIDE_CSS=".cookie-banner{display:none!important}"
BRAND_ACCENT="#4F46E5"
```

If your app needs more than a URL and a readiness gate — an entry function to call, a fixture
user to seed — create `app.config.js` at the repo root exporting `{ async prepare(page) {} }`.
It runs after the readiness gate, before filming.

## Conventions worth keeping

1. **Only real UI.** Generation is for atmosphere, characters, and hardware — never the
   interface, never text the product would render.
2. **Probe, then record.** Never script clicks blind.
3. **Verify frames.** `qa-take.js` first, then look at extracted frames. A statistic and a
   visibly broken composite are regularly true at the same time.
4. **Flush immediately.** Every verified video goes straight to the library.
5. **Captions or it isn't a post.** Short-form is watched muted; an uncaptioned cut is a
   silent film of a UI.

## License

MIT — see [LICENSE](LICENSE). The bundled font is separately licensed; see
[assets/fonts/README.md](assets/fonts/README.md).
