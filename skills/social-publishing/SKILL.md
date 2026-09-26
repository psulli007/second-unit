---
name: social-publishing
description: "Scheduling and posting finished videos to social platforms through an aggregator API, without posting the wrong thing to the wrong account. Use whenever the ask is to post, schedule, or publish a finished cut — 'put this on TikTok', 'schedule the reel', 'post it Monday morning'. Covers the post-package layout, the account-targeting rule that exists because brands routinely own more than one account per platform, the dry-run-first workflow, and the confirmations required before anything goes public. Pairs with product-demo-videos (what to cut per platform) and templates/make-social-captions.js (captions)."
---

# Social Publishing

Posting is **public, irreversible, and attributed to a brand that is not yours to spend**.
Everything here exists to make the failure modes loud before they happen rather than after.

This skill is about the publishing step only. What to cut for which platform — lengths,
aspects, the hook rule — is `product-demo-videos`.

## Pick one path and delete the others

Aggregators (Buffer, Later, Publer, Zapier-style bridges, whatever your team already pays
for) all expose roughly the same shape: connect accounts once, upload media, schedule a post
per account. Pick the one where the accounts are actually connected and use only that.

**Check that accounts are connected before you build anything against a path.** A generation
platform's built-in "post to TikTok" tool looked like the obvious route on one project; its
account list returned empty, and authorising it would have created a second, redundant path
to maintain. One `GET /accounts` call answered it in a minute.

Keep that call in your workflow permanently, not just on day one: when a post starts failing
with a 403, the first thing to check is whether that account has quietly disconnected. An
account that a person has to re-link in a web UI cannot be fixed from the API, and eleven
scheduled posts failing at once usually means one disconnected account, not eleven problems.

## ⚠️ The rule that matters: name the account

**Any scheduled row on a platform with more than one connected account MUST name the
account explicitly.**

```js
{ dir: 'posts/tiktok/launch-clip', platform: 'tiktok',
  account: 'brand-consumer',          // ← required, matched case-insensitively
  when: '2026-03-02T17:30:00' },
```

Most brands of any size own two or more accounts per platform — a consumer one and a
business/publisher one, often a regional one. Publishing consumer content to the business
account is off-brand in public, not merely suboptimal, and you cannot infer which is which
from the video's content.

The original implementation of one of these scripts read a single env var and otherwise fell
back to `accounts[0]` — whichever the API happened to return first. With two accounts on a
platform that posts to the wrong brand about half the time. The rule now is that the code
**refuses to guess**: an ambiguous or unmatched row is skipped with a message naming the
available accounts.

### Two traps that are not hypothetical

**1 — Display names and profile names get inverted.** On a real setup, the account whose
`displayName` was the consumer brand belonged to the *business* profile, and vice versa. The
same inversion appeared on a second platform in the same workspace. Match on the profile name
or the account `_id`, never on display name alone, and print all of them in the dry run so
they are copy-pasteable.

**2 — A committed schedule accumulates history.** Rows whose dates have passed are not
skipped by most APIs; a live run re-uploads and re-posts them, and a scheduled time in the
past often publishes immediately. Check every date before a live run, or comment out
completed campaigns.

## Post package layout

One directory per post:

```
posts/<platform>/<slug>/
  video.mp4     # exactly this filename — the script looks for nothing else
  post.md       # '## Caption' and '## Hashtags' sections
```

The caption sent is the Caption section, a blank line, then Hashtags. A missing `video.mp4`
skips that row rather than failing the whole run — a half-prepared batch should still
publish the finished half.

## Workflow — the dry run is not optional

```bash
node schedule-posts.js           # DRY RUN: resolve accounts, validate files, print the plan
node schedule-posts.js --live    # upload and schedule
```

(This repo ships no scheduler — every team's aggregator differs. Write one thin script
against your vendor and give it these two modes.)

The dry run resolves every account and validates every file **without uploading anything**.
Always run it, read the resolved account names back, and confirm them with whoever owns the
brand before going live.

**Before a live run, a human must have confirmed:** which account, the caption, and the
schedule time. Those are their calls, not your inferences — "post it to TikTok" is not
sufficient when two TikTok accounts exist.

Make the runner **idempotent**: record what posted where, and skip any platform already
marked posted. Then a failed batch can be re-run after the fix and only sends what failed.

## How these APIs publish

The common shape, whichever vendor:

1. `POST /media/presign` → returns an upload URL
2. `PUT` the file to that URL
3. `POST /posts` with the caption, `mediaItems: [{url, type:'video'}]`, `scheduledFor`, an
   explicit `timezone`, and `platforms: [{platform, accountId}]`

Two details that bite:

- **Scheduling is wall-clock in the timezone you send.** Send the timezone explicitly rather
  than relying on a workspace default, and remember that "9am" is a different instant for a
  reviewer in another zone.
- **Media must usually be reachable by public URL.** If you host masters yourself, check that
  the CDN in front of them does not block the aggregator's fetcher — one setup returned 403
  to a Python user-agent while serving browsers and the vendor fine. Test with the same
  client the vendor uses, not with curl from your laptop.

## Before anything goes out

- Captions written for muted viewing (`templates/make-social-captions.js`); an uncaptioned
  short is a silent film of a UI.
- `qa-take.js` clean on the exact file you are uploading, not on an earlier render.
- No claim in the caption the video does not show. Never an earnings or income promise.
- Consent confirmed for any third party visible in the footage — a customer's site, a real
  person's name or photo. See `scripts/site-common.js` for what redaction can and cannot do.
