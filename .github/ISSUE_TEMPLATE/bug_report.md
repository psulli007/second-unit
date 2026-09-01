---
name: Bug report
about: Something in the studio behaves incorrectly
labels: bug
---

**What happened**

<!-- What you ran and what came out. -->

**What you expected**

**Reproduce**

```bash
# the exact commands, ideally against the bundled demo app:
#   node scripts/demo-app.js &
#   node examples/01-record-desktop.js
```

Does it also happen against the bundled demo app (`node scripts/demo-app.js`), or only
against your own app? This is the single most useful thing to know — it separates a studio
bug from a selector/config problem.

**Output**

<!-- Paste `node scripts/qa-take.js <clip> --json`, and a frame grid if it's a visual issue:
     ffmpeg -i clip.mp4 -vf "fps=1/3,scale=420:-1,tile=3x2" -frames:v 1 grid.png -->

**Environment**

- OS:
- `node --version`:
- `ffmpeg -version | head -1`:
- `node scripts/check.js` passes: yes / no
