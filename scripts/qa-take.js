// QA a recorded take before anyone watches it.
//
//   node scripts/qa-take.js <video.mp4> [--plate] [--json]
//
// Every check here exists because the corresponding defect actually SHIPPED once, and in two
// cases the reviewer had already convinced themselves it wasn't there. Reviewing a couple of
// stills does not catch any of them.
//
// ── TWO MODES, because "static" means opposite things ────────────────────────────────────
//
// SCREEN (default) — a plain screen recording. The app holds still while the viewer reads,
//   so long static runs are the intended content. Only a clip that never moves at all, or
//   stalls for a very long time, is a defect.
//
// PLATE (`--plate`) — a POV / device-stage take, where the plate carries continuous
//   hand-held drift, so EVERY frame should differ. Here a static run is the signature bug:
//   a hold emitted as one long frame instead of many, which freezes the picture solid and
//   makes the plate jump between holds. That defect is invisible in stills and obvious in
//   motion, which is exactly why it shipped once.
//
// Running the wrong mode gives you confident nonsense in both directions: `--plate` on a
// screen recording fails every well-paced demo, and the default on a POV take waves through
// the one bug it was written to catch.
//
// On a FINISHED CUT containing title/outro cards, expect `frozen` and `dead-tail` WARNs for
// the cards themselves — intentional, not defects.
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');

const SRC = process.argv[2];
const JSON_OUT = process.argv.includes('--json');
const PLATE = process.argv.includes('--plate');
if (!SRC || !fs.existsSync(SRC)) {
  console.error('usage: qa-take.js <video.mp4> [--plate] [--json]');
  process.exit(2);
}

const probe = (a) => execFileSync('ffprobe', ['-v', 'error', ...a, '-of', 'csv=p=0', SRC]).toString().trim();
const dur = parseFloat(probe(['-show_entries', 'format=duration']).replace(/,$/, ''));
const [W, H] = probe(['-select_streams', 'v:0', '-show_entries', 'stream=width,height']).split(',').map(Number);

// Decode every frame as a tiny greyscale bitmap. Small enough to hold the whole clip, big
// enough that a UI change registers.
const SW = 96, SH = Math.round(SW * H / W);
const raw = execSync(
  `ffmpeg -v error -i ${JSON.stringify(SRC)} -vf scale=${SW}:${SH},format=gray -f rawvideo -`,
  { maxBuffer: 1 << 30, encoding: 'buffer' });
const N = Math.floor(raw.length / (SW * SH));
const frame = (i) => raw.subarray(i * SW * SH, (i + 1) * SW * SH);
const fps = N / dur;

const meanAbsDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const deltas = []; for (let i = 1; i < N; i++) deltas.push(meanAbsDiff(frame(i - 1), frame(i)));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

const findings = [];
const add = (sev, check, detail) => findings.push({ sev, check, detail });

// 1. FROZEN. In PLATE mode a hold emitted as one long frame freezes the picture solid, and
//    since drift should make every frame differ, a 1.5s static run is a real defect. In
//    SCREEN mode a static run is a hold — the thing you deliberately recorded — so only an
//    unreasonably long stall counts.
const FROZE = 0.25;
const MINRUN = PLATE ? 1.5 : 4.0;
let runs = [], i = 0;
while (i < deltas.length) {
  if (deltas[i] < FROZE) {
    let j = i; while (j < deltas.length && deltas[j] < FROZE) j++;
    if ((j - i) / fps >= MINRUN) runs.push({ at: +(i / fps).toFixed(1), len: +((j - i + 1) / fps).toFixed(1) });
    i = j;
  } else i++;
}
const med = median(deltas);
if (PLATE) {
  // Drift means the median frame SHOULD differ from the last. If it doesn't, the timeline
  // emitted holds as single long frames and the whole take is a slideshow.
  if (med < 0.02) add('FAIL', 'motion', `median frame-to-frame delta ${med.toFixed(4)} — the clip is essentially a slideshow (holds emitted as single long frames?)`);
  runs.forEach(r => add(r.len >= 3 ? 'FAIL' : 'WARN', 'frozen', `${r.len}s static from ${r.at}s`));
} else {
  // A screen recording only fails if NOTHING ever happens — a dead capture, a page that
  // never loaded, a recorder whose interactions all silently no-oped.
  const moved = deltas.filter(d => d >= FROZE).length;
  if (moved === 0) add('FAIL', 'motion', 'nothing on screen ever changes — the capture is dead (page never loaded, or every interaction no-oped)');
  else if (moved / deltas.length < 0.02) add('WARN', 'motion', `only ${(moved / deltas.length * 100).toFixed(1)}% of frames change — verify the flow actually ran`);
  runs.forEach(r => add(r.len >= 8 ? 'FAIL' : 'WARN', 'frozen', `${r.len}s static from ${r.at}s`));
}

// 2. EDGE GAP. A drifting/scaled plate that under-covers the frame shows the stage's #000
//    backdrop at the border. Test for TRUE black (<3): a dark plate (night scene, black
//    laptop chassis at the frame edge) is dark but never zero, and a <8 cutoff flagged a
//    perfectly good laptop take at 4.2%.
//    Skip frames that are near-black EVERYWHERE: that is a fade to/from black, which is
//    intentional, not a gap. Without this the check fails every cut that opens on a fade —
//    and a gate that cries wolf on normal output stops being read.
const nearlyAllBlack = (f) => {
  let dark = 0;
  for (let i = 0; i < f.length; i++) if (f[i] < 8) dark++;
  return dark / f.length > 0.98;
};
let worstEdge = 0, worstAt = 0;
for (let k = 0; k < N; k += Math.max(1, Math.floor(N / 60))) {
  const f = frame(k);
  if (nearlyAllBlack(f)) continue;
  let dark = 0, tot = 0;
  for (let x = 0; x < SW; x++) { for (const y of [0, 1, SH - 2, SH - 1]) { if (f[y * SW + x] < 3) dark++; tot++; } }
  for (let y = 0; y < SH; y++) { for (const x of [0, 1, SW - 2, SW - 1]) { if (f[y * SW + x] < 3) dark++; tot++; } }
  const pct = dark / tot * 100;
  if (pct > worstEdge) { worstEdge = pct; worstAt = k / fps; }
}
if (worstEdge > 1.5) add('FAIL', 'edge-gap', `${worstEdge.toFixed(1)}% of border pixels black at ${worstAt.toFixed(1)}s — plate under-covers the frame`);
else if (worstEdge > 0.5) add('WARN', 'edge-gap', `${worstEdge.toFixed(1)}% dark border at ${worstAt.toFixed(1)}s (may be the plate's own dark corners — eyeball it)`);

// 3. DEAD TAIL. Ending on several seconds of an unchanging frame reads as a stall.
let tail = 0;
for (let k = deltas.length - 1; k >= 0 && deltas[k] < FROZE; k--) tail++;
if (tail / fps >= 3) add('WARN', 'dead-tail', `clip ends on ${(tail / fps).toFixed(1)}s of static frame`);

// 4. DURATION sanity.
if (dur < 10) add('WARN', 'duration', `${dur.toFixed(1)}s is short for a hero clip`);

// 5. LOW-VARIANCE (near-empty) SCREENS. An empty loading/void state held on screen reads as
//    a broken page. Flag stretches whose frames carry very little detail.
const variance = (f) => { let m = 0; for (const v of f) m += v; m /= f.length; let s = 0; for (const v of f) s += (v - m) ** 2; return s / f.length; };
const vars = []; for (let k = 0; k < N; k++) vars.push(variance(frame(k)));
const vmed = median(vars);
let flat = 0, flatRuns = [], k2 = 0;
while (k2 < N) {
  if (vars[k2] < vmed * 0.55) {
    let j = k2; while (j < N && vars[j] < vmed * 0.55) j++;
    if ((j - k2) / fps >= 2.0) flatRuns.push({ at: +(k2 / fps).toFixed(1), len: +((j - k2) / fps).toFixed(1) });
    k2 = j;
  } else k2++;
}
flatRuns.forEach(r => add('WARN', 'empty-screen', `${r.len}s of unusually flat/empty screen from ${r.at}s`));

const fails = findings.filter(f => f.sev === 'FAIL').length;
if (JSON_OUT) {
  console.log(JSON.stringify({ src: SRC, mode: PLATE ? 'plate' : 'screen', dur, size: [W, H], frames: N, fps: +fps.toFixed(2), medianDelta: +med.toFixed(4), findings }, null, 1));
} else {
  console.log(`${SRC}  ${W}x${H}  ${dur.toFixed(1)}s  ${N}f @${fps.toFixed(1)}  median-delta ${med.toFixed(3)}  [${PLATE ? 'plate' : 'screen'} mode]`);
  if (!findings.length) console.log('  PASS — no issues found');
  for (const f of findings) console.log(`  ${f.sev.padEnd(4)} ${f.check.padEnd(13)} ${f.detail}`);
}
process.exit(fails ? 1 : 0);
