// NARRATED build — the VO-paced counterpart to build-flowcut.js.
//
// Silent flowcuts pick a speed per segment and let the pictures set the pace. With a
// voiceover that's backwards: the SPOKEN LINE is the fixed quantity and the footage has
// to make room for it. This script measures each recorded line, then rewrites the spec's
// speeds so every beat is at least as long as the sentence spoken over it.
//
//   node build-narrated.js <source.mp4> <spec.json> <vo-dir> <out.mp4> [music.mp3]
//
// Spec segments carry a `vo` index (1-based, matching vo-NN.wav). Consecutive segments
// sharing a `vo` form ONE group covering one spoken line; the group is retimed as a unit
// and the spec's own speeds act as weights, so deliberate contrast (2.6x through a
// spinner, 1x on a payoff) survives retiming.
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');

const [SRC, SPEC_PATH, VO_DIR, OUT, MUSIC] = process.argv.slice(2);
if (!SRC || !SPEC_PATH || !VO_DIR || !OUT) {
  console.error('usage: build-narrated.js <source.mp4> <spec.json> <vo-dir> <out.mp4> [music.mp3]');
  process.exit(1);
}
const SPEC = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
const B = process.env.BUILD_DIR || './build/narrated';
fs.mkdirSync(B, { recursive: true });

const PAD = +(process.env.VO_PAD || 0.6);      // breathing room after each line
const LEAD = +(process.env.VO_LEAD || 0.25);   // picture leads voice by this much
const MIN_SPD = 0.9, MAX_SPD = 3.0;            // never crawl, never blur past a click
const MUSIC_LUFS = process.env.MUSIC_LUFS || '-26';  // well under the voice
const VO_LUFS = process.env.VO_LUFS || '-16';

const ff = (a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { stdio: 'inherit' });
const dur = (f) => +execFileSync('ffprobe', ['-v','error','-show_entries','format=duration',
  '-of','default=noprint_wrappers=1:nokey=1', f]).toString().trim();

// ---------- 1. normalize + measure each line ----------
// Trims leading/trailing silence so the operator's head/tail air doesn't skew timing,
// and levels every line to the same loudness.
const voFile = (n) => {
  const stem = `vo-${String(n).padStart(2, '0')}`;
  const hit = ['wav','m4a','mp3','aiff','caf'].map(e => path.join(VO_DIR, `${stem}.${e}`)).find(fs.existsSync);
  if (!hit) throw new Error(`missing narration line: ${stem}.{wav,m4a,mp3,aiff,caf} in ${VO_DIR}`);
  return hit;
};
const trimmed = {};
const voIndices = new Set();
const collect = (v) => { if (v) voIndices.add(v); };
collect(SPEC.intro && SPEC.intro.vo); collect(SPEC.outro && SPEC.outro.vo);
SPEC.segments.forEach(s => collect(s.vo));

for (const n of [...voIndices].sort((a, b) => a - b)) {
  const out = `${B}/vo-${String(n).padStart(2, '0')}.wav`;
  ff(['-i', voFile(n), '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,' +
      'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,' +
      `loudnorm=I=${VO_LUFS}:TP=-1.5:LRA=11`,
      '-ar', '48000', '-ac', '1', out]);
  trimmed[n] = { file: out, dur: dur(out) };
  console.log(`  line ${n}: ${trimmed[n].dur.toFixed(2)}s`);
}

// ---------- 2. retime segments to the measured lines ----------
const baseOut = (s) => s.card ? (s.dur || 3.0) : (s.ee - s.ss) / s.spd;

// group consecutive segments sharing one vo index
const groups = [];
SPEC.segments.forEach((s, i) => {
  const last = groups[groups.length - 1];
  if (last && last.vo != null && s.vo === last.vo) last.items.push({ s, i });
  else groups.push({ vo: s.vo ?? null, items: [{ s, i }] });
});

const retimed = SPEC.segments.map(s => ({ ...s }));
for (const g of groups) {
  if (g.vo == null) continue;                       // no line over it — leave as authored
  const baseTotal = g.items.reduce((a, { s }) => a + baseOut(s), 0);
  // The authored silent pacing is a FLOOR. A short line must never compress the footage
  // under it — that speeds up the very action the beat exists to show — so narration can
  // only ever stretch a beat. A line shorter than its footage just leaves quiet after it.
  const target = Math.max(trimmed[g.vo].dur + PAD + LEAD, baseTotal);
  const k = baseTotal / target;                     // <=1 by construction: slow down or hold

  let actual = 0;
  for (const { s, i } of g.items) {
    if (s.card) {
      retimed[i].dur = +(baseOut(s) / k).toFixed(3);
      actual += retimed[i].dur;
    } else {
      const spd = Math.min(MAX_SPD, Math.max(MIN_SPD, s.spd * k));
      retimed[i].spd = +spd.toFixed(3);
      actual += (s.ee - s.ss) / spd;
    }
  }
  // clamped short of the line: hold the last frame rather than let the voice overrun
  const deficit = target - actual;
  if (deficit > 0.05) {
    const lastItem = g.items[g.items.length - 1];
    if (lastItem.s.card) retimed[lastItem.i].dur = +(retimed[lastItem.i].dur + deficit).toFixed(3);
    else retimed[lastItem.i].hold = +deficit.toFixed(3);
    actual = target;
  }
  g.outDur = actual;
}

if (SPEC.intro && SPEC.intro.vo) SPEC.introDur = +(trimmed[SPEC.intro.vo].dur + PAD + LEAD).toFixed(3);
if (SPEC.outro && SPEC.outro.vo) SPEC.outroDur = +(trimmed[SPEC.outro.vo].dur + PAD).toFixed(3);

const derived = { ...SPEC, segments: retimed };
const derivedPath = `${B}/spec-retimed.json`;
fs.writeFileSync(derivedPath, JSON.stringify(derived, null, 2));

// ---------- 3. build the picture ----------
const silentVid = `${B}/picture.mp4`;
const fcArgs = [path.join(__dirname, 'build-flowcut.js'), SRC, silentVid, derivedPath];
if (process.env.VERTICAL === '1') fcArgs.push('vertical');   // 1080x1920, zoom-fill + top captions
execFileSync('node', fcArgs, { stdio: 'inherit', env: { ...process.env, BUILD_DIR: `${B}/fc` } });
const total = dur(silentVid);

// ---------- 4. place each line on the timeline ----------
// Offsets accumulate over the SAME durations build-flowcut just used, so the voice lands
// on its own beat by construction rather than by hand-nudging.
let t = SPEC.intro ? (SPEC.introDur || 1.5) : 0;
const placements = [];
if (SPEC.intro && SPEC.intro.vo) placements.push({ vo: SPEC.intro.vo, at: LEAD });
for (const g of groups) {
  if (g.vo != null) placements.push({ vo: g.vo, at: t + LEAD });
  t += g.items.reduce((a, { i }) => a + (retimed[i].card ? retimed[i].dur : (retimed[i].ee - retimed[i].ss) / retimed[i].spd + (retimed[i].hold || 0)), 0);
}
if (SPEC.outro && SPEC.outro.vo) placements.push({ vo: SPEC.outro.vo, at: t + 0.2 });

for (const p of placements) {
  const end = p.at + trimmed[p.vo].dur;
  if (end > total + 0.5) console.warn(`  ! line ${p.vo} ends at ${end.toFixed(1)}s, past the ${total.toFixed(1)}s cut`);
}

const inputs = [], filters = [], mixLabels = [];
placements.forEach((p, n) => {
  inputs.push('-i', trimmed[p.vo].file);
  filters.push(`[${n}:a]adelay=${Math.round(p.at * 1000)}:all=1[v${n}]`);
  mixLabels.push(`[v${n}]`);
});
const voTrack = `${B}/vo-track.wav`;
ff([...inputs, '-filter_complex',
    `${filters.join(';')};${mixLabels.join('')}amix=inputs=${placements.length}:normalize=0:duration=longest,apad=whole_dur=${total}[out]`,
    '-map', '[out]', '-ar', '48000', '-ac', '2', voTrack]);

// ---------- 5. music bed + mux ----------
if (MUSIC) {
  ff(['-i', silentVid, '-i', voTrack, '-stream_loop', '-1', '-i', MUSIC,
      '-filter_complex',
      `[2:a]atrim=0:${total},afade=t=in:st=0:d=1.5,afade=t=out:st=${(total - 2).toFixed(2)}:d=2,` +
      `loudnorm=I=${MUSIC_LUFS}:TP=-2:LRA=11[m];[1:a][m]amix=inputs=2:normalize=0:duration=first[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-shortest', '-movflags', '+faststart', OUT]);
} else {
  ff(['-i', silentVid, '-i', voTrack, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
}
console.log(`narrated: ${dur(OUT).toFixed(1)}s -> ${OUT}${MUSIC ? ` (+ music @ ${MUSIC_LUFS} LUFS)` : ''}`);
