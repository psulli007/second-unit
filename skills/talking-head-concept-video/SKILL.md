---
name: talking-head-concept-video
description: "End-to-end recipe for the short vertical concept video — a lip-synced character delivers a hook, pivots, and hands off to product b-roll with beat narration, 22-45s. Use when asked for a 'concept video', a character-hook social cut, '<character> talking about <feature>', or any character-intro-then-demo format. Covers the pipeline (per-line TTS → talking clip → mandatory sync verification → Ken Burns b-roll → assembly), the editorial rule for failed sync spans, and every assembly bug that shipped a bad cut before it was found — the fps-before-zoompan desync above all. Pairs with character-lipsync (the sync method), character-voiceover (the voice), story-bible-builder (who the character is)."
---

# Talking-Head Concept Video

A character says something true and slightly self-deprecating about a problem, then gets out
of the way and lets the product answer it. It is the highest-performing short-form format in
this repo and the one with the most ways to ship broken.

This recipe is the version that survived three rejected drafts. The first delivered cut was
called trash, and every reason turns out to be a mechanical check below. Follow the order;
every step marked MANDATORY earned it.

## The format

```
[HOOK    ~3-4s ] character ON CAMERA, verified sync span only — the pain, in character
[CUTAWAY ~2-4s ] product b-roll; the REST of the hook audio carries over it
[PIVOT   ~5s   ] character ON CAMERA, full clip — flips it and hands off ("Watch this.")
[DEMO    ~4-6s ] b-roll + narration beat N1 (what you are seeing)
[PAYOFF  ~12s  ] b-roll + narration beat N2, then ≥3s of QUIET hold — never end on a word
```

Total 22-45s, 1080x1920. Short beats on camera beat long ones: a face for 3 seconds and
product by second 4 is the grammar that survives review. The cutaway is what makes the hook
work — the audio continues while the picture has already moved on, so the viewer never waits.

## Writing

- **Hook = one specific, personal failure.** "Step three. I used to burn step three every
  single time." Not a value proposition, not a question to camera.
- **Pivot flips it and hands off.** Two short sentences, maximum.
- **N beats describe only what is literally on screen.** If the narration is ahead of the
  picture, the viewer reads it as a promise rather than a demo.
- The character's voice rules live in its own bible (see `story-bible-builder`). A character
  reacts; it does not read ad copy.
- **Claim discipline.** Never put an earnings, income, or revenue promise in a character's
  mouth — or anywhere else. Speed and ease claims are fine. If a line says the product is
  live, the screen must show it live.

## Pipeline

### 1 — Voice, one file PER BEAT

Generate hookA, hookB, N1, N2 as separate files. Never one long read: you need to place them
independently, and a single file forces you to cut audio you did not plan to cut. Measure
every duration with `ffprobe` — those numbers drive every step below.

See `character-voiceover` for casting and for why a read sounds robotic (it is almost always
rhythm, not timbre).

### 2 — Talking clips

Reference still + the beat's audio into an audio-driven video model (see `character-lipsync`
for the model comparison and why generating WITH the audio beats repainting a mouth
afterwards). Prompt = performance direction only — emotion, gesture, "mouth movement matches
the voice, camera locked". Identity comes from the reference image, never from the prompt.

`duration` = ceil(spoken seconds), floor 5. Batch independent clips; they render in parallel.

Two facts that cost takes:
- **Output geometry ignores your reference's aspect.** A portrait reference commonly returns
  a 2560x1440 landscape clip at 25fps with the character roughly centred. Plan a delivery
  crop (`crop=810:1440:(iw-810)/2:0` for a centred subject) rather than assuming 9:16.
- **Slack at the end is ambiguous.** Asking for more duration than the audio fills can make
  the model INVENT speech — or legitimately STRETCH the read to fill the container. They look
  identical in the waveform. Step 3b tells them apart. Do not blind-trim.

### 3 — Verification (MANDATORY — this is the step that makes them good)

Nothing goes on camera unverified. Per clip:

a. **Tail check.** `ffmpeg -ss <spoken_dur> -i clip -af astats` → RMS. ≤ −60 dB is clean.
   Speech-level audio after the line should have ended → step b.
b. **Invented vs stretched.** Run `silencedetect`, count speech segments, compare with the
   script's natural phrasing. Segment count MATCHING the phrase count (just later) = a
   stretched read; keep the whole clip. A short burst AFTER a real gap past the line's end =
   invented; trim at that gap. Both occurred in a single batch.
c. **Locate the face FIRST.** One full frame per clip, side by side. Every generation
   reframes differently, and a fixed crop box will miss — which reads as a failed clip and
   gets a good take thrown away. Two analysis rounds were wasted this way.
d. **Mouth strip.** `fps=3, crop=<face region>, tile=Nx1` across the intended on-camera span.
   Read it against the audio. Varied open/closed shapes tracking the words = good. Mostly
   closed through speech, or the mouth out of frame = FAILED span.
e. **The editorial rule.** A failed span never ships on camera. Shorten the on-camera span to
   what verified and cover the rest with b-roll while the audio continues — or drop the
   character for that beat entirely and open on product. Nobody has ever noticed the second
   one; everybody notices bad sync.

### 4 — B-roll

Real product footage only — the recorders in this repo. To place cuts, build a phase map
first (`fps=1/4, tile`) and read it. Do not guess timestamps from memory of the recording.

**Speed-ramp it. Never ship demo footage at 1x.** Raw takes contain loads, spinners and
think-pauses that read as dead air (the note on the first batch was "slow loading of the UI
and dead silent times"). Defaults: **1.8x** through typing, navigation and loads; **1.35x**
on payoffs; talking clips stay 1x, always, because their sync is the point. A segment that
must fill a fixed wall-time — the cutaway under the hook's remaining audio — keeps its wall
length and simply covers `wall × speed` of source. Trim quiet tails to about 3s.

Ken Burns segment filter, in THIS order:

```
fps=30, setpts=PTS/SPEED, fps=30, <scale/blur-fill>,
zoompan=z='min(zoom+INC,MAX)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,
format=yuv420p
```

- **`fps=30` BEFORE `zoompan` is the single most important line in this file.** zoompan
  re-stamps frames without duplicating them; on a 25fps source it silently shortens the video
  track, and in a concat the audio then drifts by seconds — narration over the wrong picture,
  the character's voice over their own frozen face. That IS the "trash" failure of the first
  cut, and it produces no warning of any kind.
- Narrow sources (a 390x844 phone capture) get blur-fill: split → bg scale-crop-gblur → fg
  `scale=-2:1920` → overlay centre. Native 9:16 sources go full-bleed.
- Zoom: 1.04 max on talking clips, 1.06–1.12 on b-roll. Subtle beats showy every time.

### 5 — Assembly

- **`setsar=1` on every concat input.** Scaling a 390px-wide capture leaves a SAR like
  10127:10128 and the concat filter hard-fails with `Invalid argument` — nothing is written
  and the error does not mention aspect ratio.
- Audio = hook audio (trimmed only per 3b) ++ pivot audio, then the N beats placed with
  `adelay` over the silent b-roll span; `amix=normalize=0`, `loudnorm=I=-16:TP=-1.5`, `apad`,
  cut to total with `-t`.
- **Never re-mux the original TTS file under the generated picture.** The mouth is synced to
  what the video model returned, which is not bit-identical to what you sent it. See
  `character-lipsync`.
- Keep the talking clips' own silent tails as breathing room. End ≥3s after the last word.

### 6 — Final review

A frame strip across the finished cut (5–6 frames) and actually read it: structure lands,
seams clean, branding and redaction correct. Then `qa-take.js`, then deliver.

## Cost and cadence

Roughly two video generations (a few minutes each, run in parallel) plus four TTS lines per
concept. A four-video batch is one sitting: generate all the voice first, launch every
talking clip as one batch, cut b-roll while they render.
