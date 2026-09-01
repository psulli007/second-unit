---
name: product-demo-videos
description: "Turn a screen recording of a product feature into postable demo clips, and cut the right variant per platform. Use when making a feature demo, a product walkthrough, a launch clip, or 'a video of the new X' from real UI — and whenever one recording needs versions for TikTok, Reels, Shorts, LinkedIn or Facebook. Covers the MARK-based cutting method (recorders timestamp their own scene beats, so cuts land on boundaries instead of mid-action), per-platform length and aspect specs measured against what actually ships, and the hook rule that decides whether anyone watches. Distinct from cinema-worldbuilder-pro-30, which is for generated character film, not real UI."
---

# Product Demo Videos

Real product UI, filmed and cut for social. Not generated footage — see
`cinema-worldbuilder-pro-30` for that.

## The recording is not the video

A raw recorder run is 40–95 s: it types slowly, waits on network, and moves deliberately so
the capture is clean. **Nobody watches that.** Clips that actually perform run **13–23 s**. So every master gets cut, and the cut is where the video is actually made.

## ⭐ Cut on MARKs, never blind

Recorders narrate themselves. Every example recorder in `examples/` prints a line per beat:

```
MARK landing 2.56s   MARK browse 9.14s    MARK open-form 11.64s
MARK typing 22.17s   MARK submit 27.52s   MARK result 33.40s
```

Each mark opens a beat that runs to the next one. That is the difference between a cut that
lands on a scene boundary and one that chops mid-keystroke.

**Speed-ramp, don't drop.** Every beat survives; the dead air inside long beats is sped
through. A demo that skips a step is confusing; one that races through typing is just normal
social grammar. Setup beats compress ~2.8×, payoff beats stay at 1×.

**Which beats are payoff:** the last one, and any beat already under ~3 s. Those are where the
thing you're selling actually appears — the list populating, the result landing. Compress those
and the video has no point.

⚠️ **A recorder with no MARKs can only be trimmed blind** — a centred 22 s window that can
easily miss the payoff entirely. Adding a few `mark()` calls is two minutes per recorder and
upgrades every future cut of it. Do it before the recording, not after.

Feed the marks into `scripts/build-flowcut.js` as segment boundaries: each `{ss, ee, spd,
label}` is one beat, at its own speed, with its own caption.

## Per-platform variants

Measured against what actually ships and performs (all currently 1080×1920):

| Platform | Aspect | Length | Notes |
|---|---|---|---|
| **TikTok** | 9:16 1080×1920 | **15–25 s** | Hard floor 3 s. Sweet spot is short; 22 s is a safe default. |
| **Instagram Reels** | 9:16 1080×1920 | **12–20 s** | Shorter than TikTok. Loops, so a clean last frame matters. |
| **YouTube Shorts** | 9:16 1080×1920 | **≤60 s** | Tolerates the longest cut — good home for a fuller walkthrough. |
| **Facebook Reels** | 9:16 1080×1920 | 15–25 s | Same master as TikTok in practice. |
| **LinkedIn** | 1:1 or 16:9 | **30–90 s** | Different audience: publishers/B2B. Explanatory, not punchy. Square reads better in-feed than vertical. |

**One master, several cuts — not several recordings.** Film once at the highest useful
fidelity, then derive. Re-filming per platform multiplies the flakiest step in the pipeline.

⚠️ **…with one real exception: LinkedIn should not come from the mobile master.** Padding a
9:16 phone recording into a 1:1 frame leaves the UI small and surrounded by black bars —
verified, it works but it reads as an afterthought. Record a *desktop* master
(`examples/01-record-desktop.js`) whose landscape capture fills a square or 16:9 frame
properly, and use that one for LinkedIn. This is the case `scripts/build-flowcut.js`'s
landscape path was built for.

**Pad, never crop, when changing aspect.** A mobile recording is phone-shaped UI; cropping cuts
off the app chrome that makes it read as a real product. Use
`scale=…:force_original_aspect_ratio=decrease` + `pad`.

### ⚠️ Always cut with `build-flowcut.js` — captions are what make it a post

A cut without burned-in captions and music is **raw footage, not a post**, however well the
beats are chosen. Short-form is watched muted, so an uncaptioned cut is a silent film of a UI.
The first auto-generated cuts here had neither, and the verdict from the first person who
watched them was immediate and unprintable.

`scripts/build-flowcut.js` renders captions via Playwright → PNG → `overlay` (this ffmpeg has
**no `drawtext`**), which is the whole house look. Pass `fullFrame: true` in the spec for an
already-vertical mobile recording — it fills the frame with no blur canvas.

⚠️ **I once concluded this tool "cannot cut portrait" and wrote my own scaler.** It threw
*"Invalid too big or non positive size for width '1080'"*, which is what the default landscape
path does to a 540×960 source — but `fullFrame` exists precisely for that case. The
hand-rolled scaler ran fine and silently produced captionless footage. **A tool erroring is not
proof it lacks the feature; read its spec options first.**

Then mux music with `scripts/add-music.sh <video> <track> [out] [LUFS]`. Keep the loudness
consistent per platform — **−14 LUFS for TikTok/Instagram, −18 for Facebook/LinkedIn** — so
cuts made months apart sit together instead of one of them being obviously louder.

## The hook decides whether anyone watches

The first 1–2 s must show **the product doing something**, not a loading state, not an empty
screen, not a logo. If the raw recording opens on an empty list, cut to the first mark instead
of starting at 0.

Beyond that, the honest ordering for a feature demo: show the *result* early, then how it got
there. "The finished thing, populated" is a stronger open than "here is an empty form".

## Captions come from the commits

The best raw material for a caption is the commit body of the change you're filming — that's
where a developer already explained what the change is *for*, in specifics, to another
engineer. `git log --format='%s%n%b' <path>` over the feature's directory beats any amount of
marketing brainstorming. Don't write "check out our new planner"; write what actually shipped.

**Targeting, when you publish:** if you run more than one account per platform (a consumer
account and a developer/B2B one, say), a schedule entry must name its account explicitly —
"post to TikTok" is ambiguous the moment there are two. Dry-run the whole schedule and read
the plan before anything goes live, and confirm each destination. The same demo rarely belongs
on both audiences' feeds.

## Technical gotchas, all hit for real

- **Playwright records VP8/WebM.** Renaming to `.mp4` without transcoding produces a file that
  every downstream tool mis-reads and ffmpeg writes nothing from. Transcode to h264, and add a
  silent aac track so later concat/loudness steps have a stream to work with.
- **The first recording after a cold dev server is unreliable** — the browser starts driving
  while the bundler is still compiling. Warm it, and retry once before believing a failure.
- **Object-storage content types matter.** A review page uploaded without `text/html`
  downloads instead of rendering. `scripts/r2-sync.js` maps html/css/js/audio; check it before
  adding a new type.

## Automating it

Everything above automates cleanly into a twice-weekly job: detect changed features from git →
film → cut → upload → build a review page → notify. Two things are worth knowing before you
build that.

**Curate the map from code path to recorder by hand.** A commit touching `src/components/chat/`
tells you the chat UI changed — not whether the change is worth a video, or which user journey
shows it off. Infer that and you will film noise. Match paths to recorders explicitly, and have
anything unmatched *reported* rather than guessed at; that report is how the map gets extended.

**Nothing publishes without a human.** The job's output is a review page, not a post.
