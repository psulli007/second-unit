---
name: character-voiceover
description: "Cast a character voice and write voiceover scripts that actually perform. Use when choosing or auditioning a voice for a character, writing a VO script for an ad or explainer, or when a generated read sounds like a polished announcer instead of a person. Covers the casting method that narrows a multi-thousand-voice library to a shortlist, the one-file-per-line method (generate each line separately, trim to speech, place with adelay against the picture's observed beats — this is what lets video be cut before audio), writing rhythm into a script (the real fix for 'robotic'), the congruence rule for picking an accent, which measurements predict a listener's choice and which two do not, ElevenLabs v3 audio tags, and the failure modes that make tags come out as spoken words. Pairs with story-bible-builder (who the character is)."
---

# Character Voiceover

## Cast once, then record the casting

Casting is the expensive step and it is easy to redo by accident. When a voice is
chosen, write the decision into your project's story bible (see
`story-bible-builder`) as a locked fact: **provider, voice id, the exact generate
command, and the reason it won.** Every later session then uses it instead of
re-auditioning from scratch — which is a day of work and usually lands somewhere
slightly different, so the character drifts between videos.

A worked example of the shape that record should take:

```bash
# Voice: <provider> id <voice-id> — <descriptor>, ~120 Hz median F0.
# Won on: a reacting read, not an ad read.
curl -X POST https://api.<provider>/v1/tts \
  -H "Authorization: Bearer $(cat ~/.provider_key)" \
  -H "Content-Type: application/json" \
  -d '{"text":"...","reference_id":"<voice-id>","format":"mp3"}' \
  -o out.mp3
```

**Record the writing rule that came with the casting, too.** If a character was
cast on a *reacting* read rather than an ad read, then that character does not
deliver ad copy — they react, and the claim arrives via on-screen text or a
separate straight VO. A polished pitch read in that voice will be wrong every
time, and six months later nobody remembers why.

Timbre is the easy half. What makes a character read as a person is **timing** — the pause
before the punchline, the crack on the laugh, the self-interrupt. Plain text-to-speech gives a
clean confident read every time, which is why a good voice can still sound like a narrator
rather than the character.

## READ THIS FIRST: "robotic" is usually RHYTHM, not the voice

The most useful note in this whole file, and it cost eleven rejected auditions to find.

The note that cracked it, from a listener after a batch that was still wrong: *"the voices are
just barely too slow, or maybe there isn't enough change in speed in the voice, which makes it
sound so off."* That is the diagnosis. Human speech constantly varies pace — it rushes through asides, drops a short beat
flat, slows onto the punchline. **Uniform rhythm reads as robotic more strongly than timbre
does**, and no amount of voice-shopping fixes it.

**NEVER fix rhythm with a global `speech_rate`.** I set 0.9 across a batch to buy comic timing
and made it worse: a global rate slows every syllable *equally*, so the delivery is still
perfectly flat, just slower. The knob cannot create variation — it can only scale it.

**Write the rhythm into the script.** These are the levers, and they work on both engines:

| Device | Effect |
|---|---|
| **Line break** | a real beat between thoughts — the main pacing control |
| **Short sentence next to a long one** | this IS the speed change; the contrast does the work |
| **Ellipsis…** | trailing pause, unresolved |
| **Comma runs** ("I know, I know") | a rushed aside |
| **CAPS** | emphasis, lands the word |
| **Em-dash —** | self-interrupt |

Flat version, and the same content written with pace built in:

```
❌  Okay so, I scorched the rice... again. But here's the thing — that crispy
    bottom? That's the good part.

✅  Okay so, I scorched the rice.
    Again.
    Second time this week, I know, I know...
    But listen. That crispy bottom? THAT is the good part.
```

Same words, same voice, same accent. The second one has a normal open, a short flat drop, a
rushed aside that trails off, then a slow landing — four different speeds in twelve words.

Keep `speech_rate` at **1.0–1.05**. If a line still feels rushed, add a line break, don't slow
the engine.

## ONE FILE PER LINE — don't generate a scene's VO as a single take (2026-07-30)

**Generate each line as its own audio file, then place them by hand against the picture.** A
single take per scene locks you to whatever pacing the TTS happened to produce, and you cannot
move one line without moving all of them. Atomized lines make the gaps *yours*.

This is what makes **video-first ordering** work: generate the picture from the script, then fit
audio to the picture — so the character's expressions and gestures can support the read instead
of being timed blind against it. Per-line files are the mechanism. You cannot fit one continuous
take to a performance you already shot; you can place four short ones.

**The loop:**

1. Generate the video from a timed beat sheet (see `cinema-worldbuilder-pro-30`).
2. Sample frames to find where the beats *actually* landed — not where you asked for them.
3. Generate one file per line.
4. **Trim each to speech only.** Fish Audio pads head and tail with 60–160 ms of silence, which
   silently shifts every placement if you don't strip it:
   ```bash
   ffmpeg -i line.mp3 -af silencedetect=noise=-35dB:d=0.05 -f null - 2>&1 | grep silence
   ffmpeg -y -i line.mp3 -ss <speech_start-0.02> -to <speech_end+0.02> -c:a libmp3lame -q:a 2 t1.mp3
   ```
5. Place with `adelay` (milliseconds), mixing with `normalize=0` so levels don't duck:
   ```bash
   -filter_complex "[1:a]adelay=250|250[a1];[2:a]adelay=1050|1050[a2];\
   [3:a]adelay=3050|3050[a3];[4:a]adelay=5300|5300[a4];\
   [a1][a2][a3][a4]amix=inputs=4:normalize=0,aresample=48000[a]"
   ```
6. Verify placement landed where you intended — `silencedetect` on the *output* should show your
   designed gaps, not the TTS's.

**Design the silences deliberately.** The gaps are the comedy, and they're the thing a single
take will never give you. On the morning beat the two intentional holds were ~1.0 s over the
look and ~0.95 s over the deflate — both sitting on real expression changes in the picture. The
previous version had the same words with no holds, and every pause played over an unchanging
head-tilt.

**Rule of thumb:** if a scene has a punchline, it has at least three sub-beats, so it needs at
least three audio files.

## ElevenLabs v3 audio tags

Bracketed performance direction written **inline in the script**. v3 reads them as *how to say
it*, not as words to speak. They combine mid-sentence:

```
[tired] It's been a long day… [upset] How many more days can I take?
```

| Category | Tags |
|---|---|
| **Emotion** | `[sad]` `[angry]` `[happily]` `[sorrowful]` `[awe]` |
| **Delivery / pacing** | `[whispers]` `[shouts]` `[softly]` `[pause]` `[rushed]` `[drawn out]` `[booming]` |
| **Human reactions** | `[laughs]` `[big laugh]` `[sighs]` `[clears throat]` `[coughing]` |
| **Accent / character** | `[French accent]` `[British accent]` `[pirate voice]` |
| **Sound effects** | `[gunshot]` `[explosion]` `[clapping]` |
| **Multi-speaker** | `[interrupting]` `[overlapping]` |

**Punctuation compounds the tags** — an ellipsis for a natural pause, commas for breathing
patterns, ALL CAPS for emphasis. Use both together; tags alone under-deliver on rhythm.

## Higgsfield Speak 2.0 — script-as-performance

Higgsfield's own voice product uses **the same idea as v3 tags**: you write the script like a
screenplay and the writing itself determines the performance. *"The way you write determines
tone, emotion, and delivery."*

| Device | Effect |
|---|---|
| `[brackets]` | emotion / stage direction — `[whispers]`, `[laughs]` |
| CAPITALS | emphasis |
| Ellipses… | pauses |
| Line breaks | pacing |
| Speaker labels | distinct voices in dialogue |

So the tag craft below is **portable** — it is not ElevenLabs-specific.

⚠️ **Speak 2.0 is not exposed as its own model id in the MCP catalog** (searched 2026-07-28).
It appears to be the Higgsfield UI product. Reachable audio models are `seed_audio`,
`qwen_audio_tts` and `text2speech_v2`. To use Speak 2.0 itself, work in the Higgsfield UI.

**`qwen_audio_tts` is the untried option with real direction control** — it takes an
`instruction` field for *"emotion, dialect, speed, or style"* in plain language, supports
cloned reference-element voices, and exposes `speech_rate` / `pitch_rate` / `seed`. For an
accented character read, an instruction like *"warm Jamaican accent, self-deprecating, laughs
mid-sentence, unhurried"* is a more direct lever than hunting presets. **Try this before
concluding the stack can't do your character.**

## TWO FAILURE MODES THAT DECIDE WHETHER THIS WORKS

**1 — Tags get spoken aloud if the voice can't perform them.** This is the documented failure:
ask a naturally soft-spoken voice for `[shouts]` and it reads the word "shouts". So for a
tag-driven script, audition every candidate on a line containing your most extreme tag, not on
a neutral read. ⚠️ This is about whether a tag *fails*, not about what to cast — an earlier
version of this file said "screen for RANGE, not tone", and the winning voice in the case
study below had the **narrowest measured range in the field**. Use the extreme line to catch broken tags;
don't use it to rank candidates.

**2 — Tags need Eleven v3 specifically.** They do nothing on older models. ⚠️ **UNVERIFIED for
this stack:** our access is `generate_audio` → `model: text2speech_v2`, `variant: elevenlabs`.
Whether that routes to v3 is unconfirmed — the "v2" may be the tool's own versioning rather
than the model's. **Confirm before writing a tagged script**, or the tags silently do nothing
(or worse, get read out).

## Casting method — narrowing a big library

1. **Find the congruence axis first** (species, origin, trade, era) and search that family. This
   is the highest-leverage step; it took 3,700 voices down to ten.
2. **Filter by gender/role**, then **measure median F0** — autocorrelation over 70–350 Hz on
   16 kHz mono, skipping frames below 0.02 RMS. Maps onto a spec like "mid-register"
   (100–145 Hz for a male mid), and it is stable across takes.
3. **Distrust titles.** Community voices titled "deep" measured 198–254 Hz. Measure, don't read.
4. **Generate the same real line** in every candidate — never judge on the vendor's demo reel,
   which is performed to flatter the voice.
5. **Give the human two scripts:** one stress/audition line (extreme — false starts, a panic, a
   recovery) and one piece of *real copy*. The winner is usually decided by the difference
   between the two, not by either one alone.
6. **Listen.** Measurement narrows; only the human picks.

**The stress line is a permanent diagnostic, not ad copy.** Keep it harder than anything you'd
ship so failures surface during casting. Never let it reach a script.

## Case study: how a mascot voice actually got cast

*A real casting, anonymised. The lessons transfer; the specific voice does not.*

17 presets across five engines were rejected as "robotic." What broke the deadlock was
**changing library, not changing prompt**: moving from a ~57-preset catalogue to one with
~3,700 character voices produced the winner in the first two batches.

**If a small preset library fails twice, stop tuning and change libraries.** That is the
transferable lesson — the ceiling was catalogue size, not direction.

### What congruence means, and why it decided this

The character was a tropical bird and the winning voice was Caribbean. Tropical voice,
tropical bird: the voice and the thing on screen agree, so the audience never has to
reconcile them. A German-accented parrot is a joke that needs explaining — and a joke that
needs explaining costs you the first two seconds of every video.

**Look for the congruence axis before auditioning anything** — species, origin, trade, era.
It narrows a 3,700-voice library to a family of ten.

### ⚠️ Two metrics that did NOT work — don't repeat them

Both looked rigorous and both failed against a real listener:

| Metric | Why it failed |
|---|---|
| **Phrase-length variation** | Not a property of the voice. The *same voice and script* scored 0.62 and 0.28 on two generations — TTS re-rolls the performance each call. It only spots a flat *take*. |
| **Pitch range** | The listener picked the voice that scored **lowest in the field** (60). It does not predict preference. |

**F0 median is the one measurement that held** — stable across takes, and it matched the
character spec (100–145 Hz for a male mid-register).

The honest summary: **measurement narrows the field, it never picks the winner.** Use it to
skip obvious misses and to catch titles that lie (community voices titled "deep" measured
198–254 Hz). Then let the human listen.

### Practical: a flat take is not a bad voice

Because performance re-rolls per generation, **regenerate before recasting.** Cheap, and a
completely different fix from changing voices.

## When presets keep failing: clone a performance

`create_voice` / `create_voice_from_confirmed_audio` build a custom voice from a recording.
For a character with comic timing, the strong path is: cast a real actor, direct them against
the character brief, record a clean sample, clone it. You get a performance rather than a
correct reading. Tags then shape variations of a voice that already has the right instincts.

## Two registers, when a character swears

If mild profanity is genuinely in character — the character is careless, or self-deprecating,
or the kind of person who says "oh, *shit*" when they ruin something — it will make the read
land. **But Meta and most paid placements restrict profanity in ads.** So write two registers
rather than sanitising the character everywhere:

| Register | Where | Example |
|---|---|---|
| **Unfiltered** | organic social, owned channels | "Oh, *shit*. [laughs] Okay. That's a new one." |
| **Ad-safe** | any paid Meta/FB placement | "Oh—" then a cut. The self-censor often lands funnier than the word. |

Confirm current Meta policy before building a paid campaign around a bleeped version.

## Writing to the bible

A well-written character spec maps almost one-to-one onto audio tags. This is the payoff for
having written the bible: you stop inventing a performance per script. Worked example, using
the mascot from the case study above:

| Bible line | Tag |
|---|---|
| "cracks slightly on a laugh" | `[laughs]` / `[big laugh]` |
| "well-timed comic pauses that let a mistake land" | `[pause]` + ellipsis |
| "frequently self-interrupts to add a detail he forgot" | `[interrupting]`, em-dash |
| "drops real technique terms then undercuts them" | tone-shift tag mid-line |
| "raspy playful mid-register" | 100–145Hz + a voice with range |

Example, tagged:

```
[warmly] Okay so — I scorched the rice. [pause] Again.
[laughs] But here's the thing… that crispy bottom? That's the good part.
```

**The test for any read:** does it sound like the person in the bible, or like someone
narrating a commercial? A polished announcer read is wrong however good it sounds, whenever
the character is defined by something else. Write the test down as one question in your own
bible, and apply it to every take.

**For ad scripts specifically:** keep the tags sparse. One `[pause]` before the turn and one
dry landing beats a line tagged on every clause, which reads as a performance *about* emotion
rather than a person talking.
