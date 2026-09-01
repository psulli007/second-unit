# Contributing

Thanks for looking. This repo is a working studio rather than a framework, so the bar for
a change is "did you use it, and did it hold up on a real take" more than "does it have a
unit test".

## Setup

```bash
cp config.example.env config.env
scripts/bootstrap.sh
node scripts/demo-app.js &            # the bundled demo app on :5050
node examples/01-record-desktop.js    # should produce a video
node scripts/check.js                 # what CI runs
```

`scripts/check.js` needs neither ffmpeg nor Chromium, so it always runs. Actually recording
needs both.

## The one rule that shapes everything

**Real UI is filmed; it is never generated.** Generation belongs to characters,
environments, props, and device bodies — never the interface, never text the product would
render, never a fabricated result. Changes that blur that line will be declined, however
good the output looks. Fabricated UI reads as fake to viewers who can't articulate why, and
the whole video pays for it.

## What good changes look like

**Write down what went wrong, not just what to do.** Most of the value in `skills/` and the
comments in `scripts/` is failure modes: the tool that silently rendered 720p, the check
that passed while the composite was visibly broken, the "fix" that ran fine and produced
captionless footage. A rule without its failure reads as arbitrary and gets removed by the
next person. If you're fixing something subtle, leave the trap behind in a comment.

**Verify against known-bad input.** If you touch `scripts/qa-take.js`, synthesise a clip
that *should* fail and confirm it does. A detector nobody tested is the same mistake as
trusting a statistic — and this file has made that mistake before.

**Keep it brand-neutral.** Nothing in `scripts/`, `templates/` or `lib/` may hardcode a URL,
a selector, a colour, or a product name. Everything app-specific goes through `config.env`
or `app.config.js`. `scripts/check.js` enforces this.

**Don't commit media.** `*.mp4`, `*.wav` and friends are gitignored on purpose. A handful of
4K takes will make the repo unusable to clone.

## Adding a recorder

Add it to `examples/` as a numbered, self-contained file rather than adding a flag to an
existing one. Flows diverge fast, and a shared recorder with a conditional per flow becomes
unmaintainable quickly. Copy the closest example and change the middle.

Every recorder should:
- go through `lib/app-target.js` rather than calling `page.goto` itself
- `waitForSelector` on real content, never `waitForTimeout` as a substitute
- print `MARK <name> <t>s` at each beat, so the cutter can land cuts on boundaries
- end on a deliberate hold, never mid-action

## Adding a skill

`skills/*/SKILL.md` with YAML frontmatter (`name`, `description`). The description is what
an agent matches against, so make it concrete about *when* to reach for the skill — vague
descriptions never trigger. Say what the skill is distinct from; several of these overlap
and the disambiguation is load-bearing.

## Reporting a bug

Include the take, or how to reproduce one. "The cut looks wrong" is hard to act on;
`qa-take.js --json` output plus a sampled frame grid is easy. The issue templates ask for
this.
