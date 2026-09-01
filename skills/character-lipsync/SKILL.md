---
name: character-lipsync
description: "Make an animated character actually speak — driving mouth movement from a voice track. Use when a character needs to talk on camera, when turning a voiced script into a talking-head clip, or when deciding whether to lip-sync at all versus cutting away. SOLVED (2026-07-31): use minimax_h3 with the voice track as audio_references — it generates already-synced video and, unlike post-hoc mouth replacement, works on b-roll where the character is turned away; pass the still as image_references not start_image, tops out at 2K. Beat wan2_7, which dropped a whole word. Prior finding (2026-07-30): Higgsfield's seedance_2_0 is gestural-only (verified); sync.so (api.sync.so, model sync-3) does genuine phoneme-accurate sync on our exact character style — tested and verified frame-by-frame, zero mismatches — BUT ONLY on presenter framing: it silently no-ops (returns a re-encode with a motionless mouth, status COMPLETED, no error) on full-body b-roll where the face is small or turned away, so verify every job with an SSIM diff against the input. Records the working API call, real caveats (slow, watermarked on this tier, doesn't upscale), and the cutaway/off-screen workarounds still worth using for anything beyond a short hook line. Pairs with character-voiceover (getting the voice) and cinema-worldbuilder-pro-30 (the video prompt)."
---

# Character Lip Sync

## ✅ THE ANSWER (2026-07-31): generate WITH the audio, don't repaint the mouth after

**Use `minimax_h3` with the voice track as `audio_references`.** It generates a clip that is
already lip-synced. This replaces the entire generate-silent-then-sync.so pipeline below, and
it is better on the axis that actually blocked us.

**Why it wins: it works on b-roll framing.** sync.so is mouth-*replacement* on finished footage —
it needs to find a forward-facing face and silently no-ops when it can't (see the failure section
below). A model that generates to the audio has no such gate: it synced the character while their head was
turned **down and away toward the onions**, the exact shot sync.so refused.

**Verified against the voice track's own silence map** (`silencedetect` on the source VO, then
frames sampled inside known speech and known silence windows):

| | speech 0.8s | silence 2.5s | speech 3.5s | silence 4.8s | speech 5.4s ("Okay") |
|---|---|---|---|---|---|
| `minimax_h3` | open ✓ | closed ✓ | open ✓ | closed ✓ | open ✓ |
| `wan2_7` | open ✓ | closed ✓ | open ✓ | closed ✓ | **closed ✗** |

A human picked the same winner by eye before seeing the frame data — *"the first lip sync was
better; the second forgot to sync the word okay."* Wan 2.7 genuinely dropped the final word; both
frames inside "Okay" show a shut mouth. Trust the human read, then confirm it with frames.

**It keeps YOUR voice track — but as a re-encode, not a passthrough.** Critical check, because
these models can generate their own audio: compare the output's silence map to the source VO's.
Ours matched within ~15 ms across every beat, so the original TTS read survived rather than
being substituted.

⚠️ **Do NOT re-mux your original mp3 under the minimax picture.** Measured 2026-07-31: the
returned audio correlates with our source at only r≈0.41 (waveform and envelope), with a local
inversion around 0.70–0.80 s implying ~100 ms of local re-timing. The silence structure matches;
the samples do not. **The mouth is synced to what minimax returned, not to your file** — swap the
audio and you reintroduce exactly the drift you were trying to fix. Keep the model's audio and
loudness-normalise it instead.

### ⚠️⚠️ NEVER HAND IT SILENCE — it fills the gap with invented speech

**The single most important operational rule, hit independently in two experiments the same
night.** `minimax_h3` treats a silent stretch as space to fill: it **generates its own audio at
full speech level and lip-syncs the beak to it.**

| case | silence given | what it did |
|---|---|---|
| 2.4 s hook padded to the 5 s minimum | ~2.6 s trailing | invented ~0.85 s of audio at 3.51–4.36 s, mouthed it |
| 15 s mishap beat, dialogue ends at 9.83 s | 5.2 s trailing | kept mouthing words at 10.5 / 11.5 / 12.5 s, then injected ~0.8 s of speech at 13.54–14.32 s where the source is digital silence (−91 dB) |

**So: request a duration that matches the SPOKEN span, not the beat length.** If a beat needs a
silent tail (a reaction, a hold, a visual payoff after the line), generate the spoken part only
and get the tail from a separate silent generation or the existing footage — do not ask one
generation to cover both. And always check the tail of the output before shipping.

Two hard limits that bite alongside this:
- **The audio reference must be ≤ the requested duration.** A 15.083 s track against `duration: 15`
  made the job fail *silently* — no error surfaced, it simply produced nothing.
- **Extracting audio from an mp4 by seeking can lose time.** Cutting a 15.083 s window straight out
  of the assembled cut returned 13.73 s, because the mux has timestamp gaps with no packets — every
  word would have shifted. Decode the full track first with
  `-af aresample=async=1:first_pts=0`, then cut.

**`image_references` overrides framing language in the prompt.** Asked for chest-up presenter
framing, it held the reference still's full-body composition instead. Usually what you want
(identity and blocking stay locked to the approved look) — but you cannot re-frame via prompt,
only by supplying a differently-framed reference. Notably it lip-synced fine on that full-body
wide, where the head is a small fraction of frame: precisely the case sync.so silently no-ops on.

```
model: minimax_h3
medias:
  - role: image_references     # NOT start_image — see gotcha
    value: <still media id>
  - role: audio_references
    value: <voice track media id>
resolution: "2K"               # 1440x2560; no 4K — upscale after if needed
duration: <seconds>            # 5-15
```

**Gotchas, all hit for real:**
- `minimax_h3` rejects `start_image` when audio is attached: *"start_image/end_image cannot be
  mixed with reference media; audio_references require at least one image or video reference."*
  Use `image_references`.
- **No 4K.** `minimax_h3` tops out at 2K (1440×2560), `wan2_7` at 1080p. Upscale afterward with
  `bytedance_video_upscale` or `topaz_video` if 4K is required.
- Higgsfield's `media_import_url` **rejects `application/octet-stream`** — an mp3 served with the
  wrong content-type cannot be imported at all. `scripts/r2-sync.js` had no audio MIME types until
  2026-07-31; check the served `content-type` before blaming the model.

Everything below is the older post-hoc approach. Keep it for the failure analysis — especially
the SSIM check, which is still how you prove any lip-sync step actually did something.

## THE HEADLINE FACT

**Higgsfield has no dedicated lip-sync model.** Two catalog searches (2026-07-28) for
"lip sync / talking avatar / audio-driven video / mouth movement synced to voice" returned no
model that names lip sync as a capability. Anyone looking for a `lipsync` model will not find
one — that is the answer, not a failed search.

What exists instead is **audio as a reference input** to video models, plus workflow tools.

**Speak 2.0 does not do this.** It is Higgsfield's *voice generation* product — text to audio,
script-as-performance. Its guide covers no video input, no character animation and no talking
avatars. It produces the voice track you would then need to sync; it does not sync it.

## What the catalog actually offers

| Model | Audio capability | Notes |
|---|---|---|
| **`seedance_2_0`** | `audio_references` media role + `generate_audio` bool | The ONLY model in the catalog that accepts an external audio track at all (confirmed 2026-07-30 — see below). Gestural sync only, not phoneme-accurate. |
| `seedance_2_0_mini` | same (untested) | Cheaper, 480p/720p only |
| `grok_video_v15` | ❌ **no audio input** | Tested 2026-07-30: rejects any `audio` media role outright — `Allowed: [start_image]`. Its "native audio direction" tag is not an audio-sync capability accessible through this API. |
| `kling2_6` | ❌ **no audio input** | Tested 2026-07-30: same rejection, `Allowed: [start_image]`. Its `sound` bool generates its OWN audio — it cannot take or sync to a supplied track. |
| `explainer_video` (tool) | — | Workflow, not a model. Produced our earlier explainer videos. |

**Verdict (2026-07-30): `seedance_2_0` is not just the best option in Higgsfield, it's the only
one.** Two alternate Higgsfield vendors were tested by actually attempting the call, not by
reading their marketing copy — both hard-rejected an audio reference. There is no better
Higgsfield model to switch to.

## ✅ Outside Higgsfield: sync.so actually solves this (tested 2026-07-30)

Real phoneme-level lip sync exists, just not inside Higgsfield. Tested `api.sync.so`
(`model: sync-3`) on a 3s beak-movement clip against a short VO line, verified the same way as
the Seedance test — pulling frames at close intervals and checking whether the mouth shape
actually varies with the words, not just whether it's open or closed.

**Result: genuinely correct.** 8 sampled frames across one continuous sentence each showed a
distinct beak shape (wide open + tongue visible at 0.2s, fully closed at 0.8s, slightly parted
at 1.4s), and the beak correctly returned to closed/neutral in the trailing silence after the
sentence ended. Zero mismatches, vs. 2 of 6 on the Seedance test. This is real phoneme shaping,
not gestural energy-matching.

**API basics:** `POST https://api.sync.so/v2/generate`, header `x-api-key` (not `Authorization:
Bearer` — the docs at `sync.so/docs/llms.txt` gave a wrong base URL and auth header; the
correct ones came from the specific `create.md` reference page). Body is an `input` array of
`{type: "video"|"audio", url: ...}` — both must be **public URLs** (R2 works well for this).
Video-to-video architecture matches our pipeline exactly: generate the Seedance clip and the
Fish VO separately, then hand both to sync.so as a final pass.

**Three real caveats before using this for real delivery:**
1. **Slow, but variable.** ~9 minutes for a 2.4s clip on the first run; a second 2.4s clip on
   the same tier finished in **under 5 minutes**. Treat ~10 min as the planning number and poll
   rather than assuming a fixed wait.
2. **Watermarked** on the free/trial tier — a visible "sync.so" logo top-left plus a centered
   mark during some frames. **Creator, $19/mo, was the lowest tier that removed it**
   (verified: after upgrading, the next production clip came back clean across six sampled
   frames — no logo top-left, no centered mark). Hobbyist ($5/mo) keeps the watermark. Creator
   also covered clips up to 5 min and 3 concurrent jobs. Re-check current pricing before relying
   on this.
3. **Output resolution matched input resolution** (720p in, 720p out) — despite `sync-3`'s
   "4K native" billing, it did not upscale. Feed it a 4K source clip (per the standing 4K rule
   above) if 4K output is needed; don't expect it to upscale for you.

**Cost:** ~$0.05/sec on the base tier — trivial for a single short hook beat.

### ⚠️ It's also in the Higgsfield catalog now — worth testing before the next hook

`models_explore(action:'list', type:'video')` lists **`sync_so` — "Sync Lipsync 3"**, taking
media roles `input_video` / `input_audio`, plus a `sync_mode` parameter:

| `sync_mode` | Behavior on a video/audio duration mismatch |
|---|---|
| `bounce` (default) | ping-pongs the video |
| `loop` | repeats it |
| `cut_off` | truncates to the shorter input |
| `silence` | pads the audio |
| `remap` | **retimes the video to the audio** |

If this works it removes the R2 upload round-trip, the separate API key, and the public-URL
requirement entirely — pass media ids like any other Higgsfield generation. `remap` is also a
direct lever on the alignment problem.

**Untested as of 2026-07-30. Verify by actually calling it, not by trusting this table** —
that is exactly how `grok_video_v15` and `kling2_6` were caught: both advertised audio
capability in the catalog and both hard-rejected an audio role on the real call. Until it's
confirmed, the direct `api.sync.so` path above is the known-good one.

### Not a substitute: `cinematic_studio_video_v2`

It genuinely supports per-shot prompting (`multi_shots` + `multi_shot_mode` + a `multi_prompt`
array), which looks perfect for beat-timed performance. **But its only media role is
`start_image`** — no `image_references`, so the character's identity lock is gone. Not worth the trade.
Note `seedance_2_0` echoes `multi_shots` / `multi_prompt` back in its job params but does *not*
declare them as supported parameters; don't read that echo as a capability.

Given this, the real workflow for a talking beat is now: **generate the video AND the audio
separately as always, then run the finished pair through sync.so as a last step** — rather than
routing audio through Seedance's `audio_references` role at all.

**A human review confirmed it** ("that was pretty good actually") after watching the actual
watermarked test clip, not just the frame-comparison numbers. Both checks agree this is a real
option for a character talking on camera — and the two agreeing is the point: neither the metric
nor the eyeball is trustworthy alone.

### ❌ IT SILENTLY NO-OPS ON NON-PRESENTER FRAMING (2026-07-30)

**sync.so returned a re-encode with a completely motionless beak** when fed a full-body b-roll
clip. No error, no warning — `status: COMPLETED`, correct 6.5s duration, a real file downloaded.
It looks like success until you check the picture.

The clip: the character full-body in a 9:16 4K frame, head turned **down and to his right** looking at
onions, face maybe 15% of frame height, beak in three-quarter profile. Against the hook clip
that worked: **chest-up presenter framing, face large and square to the lens.**

**How it was caught, and how to catch it next time — two independent checks:**

1. **Frames tight on the mouth, inside a known speech window.** Four frames spanning 0.9s of
   continuous speech: beak closed and identical in all four.
2. **SSIM against the input video.** This is the decisive one and it's cheap:
   ```bash
   ffmpeg -i synced.mp4 -i input.mp4 -lavfi "[0:v][1:v]ssim" -f null -
   ```
   Real sync shows speech frames scoring **markedly lower** than silence frames — the mouth
   region genuinely changed. Here it was flat ~0.98 across both (speech 0.9813 / 0.9785,
   silence 0.9787 / 0.9795). **Uniform SSIM with no speech/silence spread means it did nothing**
   and the ~0.98 is just re-encode noise.

**The rule this confirms:** lip sync needs the face large and toward the lens. Step 2 of the
order of operations below already said "presenter framing, chest-up, eyes to lens" — this is
what happens when you skip it. ⚠️ Framing and gaze both differed between the working and failing
clips, so which one is decisive is **not isolated**; treat both as required rather than
gambling on one.

**Practical consequence for a "day in the life" cut:** a beat where the character is working,
looking at something, or turned away **cannot be lip-synced** — that's not a prompt problem to
tune, it's outside what the tool does. Either shoot that beat presenter-framed (facing camera,
chest-up) or leave it as VO b-roll. This is the same conclusion as "consider not lip-syncing"
below, arrived at the expensive way.

**Critical parameter detail:** pass the voice track as media role **`audio`**. The server
rewrites it to `audio_references` automatically — the adjustment note reads
*"Seedance 2.0 backend expects schema-key media roles"*. Set `generate_audio: false` when you
supply your own track, or the model layers its own audio on top of yours.

**The preset trap:** a talking-character prompt gets matched to a Higgsfield preset ("IN THE
DARK" fired on a straightforward talking-parrot prompt). The job is *not submitted* — you get a
recommendation instead. Resubmit with `declined_preset_id: <that id>` to generate literally.
Miss this and it looks like the call silently did nothing.

## ✅ RESOLVED (2026-07-30) — it's gestural, not lip sync

Tested against the real result, not assumed: downloaded the completed clip and its source
audio, ran `silencedetect` to find known speech vs. silence windows, then extracted and
visually compared frames at those exact timestamps. Do this rather than watching the clip —
"it looks synced" is exactly the judgement this test exists to overrule.

**Verdict: loosely correlated, not phoneme-accurate.** 4 of 6 sampled frames matched (beak open
during speech, closed during silence) — but 2 didn't: beak **closed** at a clear speech moment,
and still **parted** deep inside a 1-second silence gap. `seedance_2_0`'s audio reference drives
general "animated while talking" timing/energy, not mouth shapes tracking words. It is not a
lip-sync model and testing more prompt language will not fix this — it's what the model does.

**Also found: a duration mismatch.** Source audio was 8.32s; the generated video was 8.04s.
The last ~0.3s of speech has no corresponding video at all. Check this on every generation —
it's a distinct failure from the sync-quality question above.

**What this means for production:** the "consider not lip-syncing" section below is now the
default, not a fallback. Reserve direct-to-camera character shots for **wordless reactions**
(laughs, gasps, a startled beak-open) where loose correlation reads as expressive rather than
wrong. Any actual line of dialogue goes over a cutaway, off-screen, or a turned-away shot.

## THE MOST IMPORTANT ADVICE: consider not lip-syncing

Lip sync is the highest-risk, lowest-reward part of character video, and the audience notices
failure far more than they notice success. Three approaches that dodge it:

**1 — VO over cutaways.** The character appears on screen for the hook and the CTA; the voice
carries the middle over product footage or scene shots. Zero sync risk, and it's how most
brand-character ads are actually cut. **Default to this.**

**2 — Character speaks off-screen / turned away.** Voice plays over a shot of them working,
back to camera, or in profile. Personality lands, mouth never has to match.

**3 — Cut on the tricky words.** If a clip mostly syncs but breaks on a phrase, cut away to a
reaction or product beat for those two seconds. A jump cut is invisible; bad sync is not.

**A beak is more forgiving than lips.** There are no teeth, no lip-rounding, no tongue — an
open/close cycle roughly matched to syllables reads as speech. That is a genuine advantage for
this character over a human presenter, and it means "good enough" sync may genuinely be good
enough here.

## Order of operations

1. **Lock the voice first** (`character-voiceover`). Sync work against a voice you'll replace
   is wasted. Do this once per character, and generate the track in your TTS provider — not
   in the video tool, whose built-in voices are a different (usually worse) casting decision.
2. **Generate the still** (`scene-prompt-builder`) — presenter framing, chest-up, eyes to lens.
3. **Generate the voice track**, then trim it to the exact clip length before animating.
4. **Animate** with the still as `start_image` and the track as `audio`.
5. **Review at full speed with sound on.** Sync errors are invisible frame-by-frame and obvious
   in motion — the opposite of the geometry problems in `device-screen-studio`.
6. If sync fails on part of the line, **cut away** rather than regenerate the whole clip.
