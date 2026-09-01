// FLOWCUT builder — the fix for "cards + 3s slivers". Produces a CONTINUOUS
// condensed cut of a raw recording: no mid-action cuts, text overlaid ON the
// footage (not interrupting it), per-segment speed (fast through typing/waits,
// ~1x at payoffs). Landscape (lower-third label pills) or vertical (blur-fill
// canvas + top captions).
//
//   node build-flowcut.js <raw.webm> <out.mp4> <spec.json> [vertical]
//
// spec = {
//   intro: {kicker,h1,sub} | null,    outro: {h1,sub} | null,
//   segments: [ { ss, ee, spd, label }            // footage segment (label optional)
//             | { card: {kicker,h1,sub}, dur } ]  // mid-video callout card (place at
//                                                 // phase boundaries, never mid-action)
// }
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const { brand } = require('../lib/config');

const RAW = process.argv[2], OUT = process.argv[3];
const SPEC = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const VERT = process.argv[5] === 'vertical';
const B = process.env.BUILD_DIR || (VERT ? './build/flowcut-v' : './build/flowcut');
fs.mkdirSync(B, { recursive: true });
const ff = (a) => execFileSync('ffmpeg', ['-y','-v','error', ...a], { stdio: 'inherit' });
// landscape size is overridable (FC_W/FC_H) for 1080p Screen Studio masters;
// S scales the landscape overlay type so pills read the same at any width.
const W = VERT ? 1080 : (+process.env.FC_W || 1280), H = VERT ? 1920 : (+process.env.FC_H || 800);
const S = VERT ? 1 : W / 1280;
const px = (n) => `${Math.round(n * S)}px`;
const grad = (s) => (s || '').replace(/\{grad\}/g, '<span class="grad">').replace(/\{\/grad\}/g, '</span>');

// Brand tokens come from config.env (BRAND_*) so this renderer is nobody's brand
// by default. {grad}…{/grad} in a headline paints that span with the accent ramp.
const FONT = brand.font, A1 = brand.accent, A2 = brand.accent2;
const INK = brand.ink, PAPER = brand.paper;
const FONT_URL = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT)}:wght@400;600;800&display=swap`;

// ---------- overlays ----------
const LABEL_CSS_LANDSCAPE = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;background:transparent;font-family:'${FONT}',system-ui,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
  .pill{position:absolute;left:${px(28)};bottom:${px(26)};display:inline-flex;align-items:center;gap:${px(12)};
        background:rgba(28,24,22,.86);border-radius:999px;padding:${px(12)} ${px(22)} ${px(12)} ${px(14)};
        box-shadow:0 ${px(4)} ${px(18)} rgba(0,0,0,.25)}
  .num{width:${px(34)};height:${px(34)};border-radius:50%;background:linear-gradient(135deg,${A1},${A2});
       color:#fff;font-size:${px(17)};font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .txt{color:#fff;font-size:${px(21)};font-weight:800;letter-spacing:-0.01em;white-space:nowrap}`;
const LABEL_CSS_VERTICAL = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1920px;background:transparent;font-family:'${FONT}',system-ui,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
  .cap{position:absolute;top:200px;left:56px;right:56px;text-align:center;font-size:62px;font-weight:800;line-height:1.2;color:#fff;letter-spacing:-0.02em;
       text-shadow:0 0 8px rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.75),0 3px 6px rgba(0,0,0,.9),2px 0 5px rgba(0,0,0,.7),-2px 0 5px rgba(0,0,0,.7)}`;
const CARD_CSS = `
  @import url('${FONT_URL}');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;
       background:${PAPER};font-family:'${FONT}',system-ui,sans-serif;-webkit-font-smoothing:antialiased;gap:${VERT?'26px':px(18)}}
  .kicker{font-size:${VERT?'34px':px(15)};font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#B0B0B0}
  h1{font-size:${VERT?'110px':px(58)};font-weight:800;letter-spacing:-0.045em;color:${INK};text-align:center;line-height:1.08;max-width:${VERT?'960px':px(1040)}}
  h1 .grad{background:linear-gradient(90deg,${A1},${A2});-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{font-size:${VERT?'42px':px(21)};color:#606060;letter-spacing:-0.01em;text-align:center;max-width:${VERT?'920px':px(820)}}
  .dot{width:${VERT?'16px':px(10)};height:${VERT?'16px':px(10)};border-radius:50%;background:linear-gradient(90deg,${A1},${A2});margin-top:${VERT?'10px':px(10)}}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (html, css, file, transparent) => {
    await page.setContent(`<style>${css}</style>${html}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${B}/${file}`, omitBackground: !!transparent });
  };
  // mid-video callout cards
  const midCards = SPEC.segments.filter(s => s.card);
  for (let i = 0; i < midCards.length; i++) {
    const c = midCards[i].card;
    await shot((c.kicker?`<div class="kicker">${c.kicker}</div>`:'')+`<h1>${grad(c.h1)}</h1>`+(c.sub?`<div class="sub">${c.sub}</div>`:''), CARD_CSS, `mid-${i}.png`);
    midCards[i]._file = `mid-${i}.png`;
  }
  // label PNGs (unique labels)
  const labels = [...new Set(SPEC.segments.map(s => s.label).filter(Boolean))];
  for (let i = 0; i < labels.length; i++) {
    const n = i + 1;
    if (VERT) await shot(`<div class="cap">${labels[i]}</div>`, LABEL_CSS_VERTICAL, `label-${i}.png`, true);
    else await shot(`<div class="pill"><div class="num">${n}</div><div class="txt">${labels[i]}</div></div>`, LABEL_CSS_LANDSCAPE, `label-${i}.png`, true);
  }
  const labelIdx = Object.fromEntries(labels.map((l, i) => [l, i]));
  if (SPEC.intro) await shot((SPEC.intro.kicker?`<div class="kicker">${SPEC.intro.kicker}</div>`:'')+`<h1>${grad(SPEC.intro.h1)}</h1>`+(SPEC.intro.sub?`<div class="sub">${SPEC.intro.sub}</div>`:''), CARD_CSS, 'intro.png');
  if (SPEC.outro) await shot(`<h1>${grad(SPEC.outro.h1)}</h1>`+(SPEC.outro.sub?`<div class="sub">${SPEC.outro.sub}</div>`:'')+'<div class="dot"></div>', CARD_CSS, 'outro.png');
  await browser.close();

  // ---------- segments ----------
  const segFiles = [];
  // vertical: per-segment framing — fgh = zoom (fg height px, default 1000),
  // cx = horizontal crop position 0..1 (0 = left edge, .5 = centered),
  // crop = [w,h,x,y] absolute post-scale crop (spotlight a modal etc.), overrides cx
  const compose = VERT
    ? (inLbl, s = {}) => {
        // fullFrame: 9:16 source (mobile-view recording) — fill the frame, no blur canvas
        if (SPEC.fullFrame) return `[v]scale=1080:1920:flags=lanczos[base]` + (inLbl ? `;[base][1:v]overlay=0:0[lab]` : '');
        const fgh = s.fgh || 1000, cx = s.cx ?? 0.5;
        const cropExpr = s.crop ? `crop=${s.crop[0]}:${s.crop[1]}:${s.crop[2]}:${s.crop[3]}` : `crop=1080:${fgh}:(iw-1080)*${cx}:0`;
        return `[v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:3,eq=brightness=-0.10[bg];[b]scale=-2:${fgh},${cropExpr}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base]` + (inLbl ? `;[base][1:v]overlay=0:0[lab]` : ''); }
    : (inLbl) => `[v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2[base]` + (inLbl ? `;[base][1:v]overlay=0:0[lab]` : '');
  const cardClip = (file, dur, fi, fo, tag) => {
    let vf = 'fps=30,format=yuv420p';
    if (fi) vf += ',fade=t=in:st=0:d=0.3';
    if (fo) vf += `,fade=t=out:st=${(dur-0.4).toFixed(2)}:d=0.4`;
    ff(['-loop','1','-t',String(dur),'-i',`${B}/${file}`,'-vf',vf,'-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-r','30',`${B}/card-${tag}.mp4`]);
    return `${B}/card-${tag}.mp4`;
  };

  let midN = 0;
  SPEC.segments.forEach((s, i) => {
    if (s.card) {  // mid-video callout card — back-to-back chains hard-cut between
      const prevIsCard = i > 0 && !!SPEC.segments[i - 1].card;
      const nextIsCard = i < SPEC.segments.length - 1 && !!SPEC.segments[i + 1].card;
      segFiles.push(cardClip(midCards[midN]._file, s.dur || 3.0, !prevIsCard, !nextIsCard, `mid-${midN}`));
      midN++;
      return;
    }
    const hasLbl = !!s.label;
    // `hold` freezes the last frame for N more seconds — used by the narrated build
    // when a spoken line outruns the footage under it and speeding up isn't an option.
    const hold = s.hold ? `,tpad=stop_mode=clone:stop_duration=${s.hold}` : '';
    const filter = `[0:v]trim=start=${s.ss}:end=${s.ee},setpts=(PTS-STARTPTS)/${s.spd}${hold},fps=30[v];` + compose(hasLbl, s) + `;[${hasLbl?'lab':'base'}]format=yuv420p[out]`;
    const args = ['-i', s.src || RAW];
    if (hasLbl) args.push('-i', `${B}/label-${labelIdx[s.label]}.png`);
    args.push('-filter_complex', filter, '-map', '[out]', '-an', '-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-r','30', `${B}/seg-${String(i).padStart(2,'0')}.mp4`);
    ff(args);
    segFiles.push(`${B}/seg-${String(i).padStart(2,'0')}.mp4`);
  });
  const order = [];
  if (SPEC.intro) order.push(cardClip('intro.png', SPEC.introDur || 1.5, true, false, 'intro'));
  order.push(...segFiles);
  if (SPEC.outro) order.push(cardClip('outro.png', SPEC.outroDur || 2.0, false, true, 'outro'));
  fs.writeFileSync(`${B}/list.txt`, order.map(f => `file '${path.resolve(f)}'`).join('\n'));
  ff(['-f','concat','-safe','0','-i',`${B}/list.txt`,'-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',OUT]);
  const d = execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',OUT]).toString().trim();
  console.log(`flowcut: ${Number(d).toFixed(1)}s ${W}x${H} -> ${OUT}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
