// EXAMPLE 5 — the live app on a photoreal device, in one render.
//
//   node examples/05-record-device-stage.js phone
//   node examples/05-record-device-stage.js laptop
//
// Read the device-screen-studio skill before using this in anger. The short
// version: generate (or shoot) the device with its screen OFF, remove the
// background, measure the screen rect once with scripts/measure-frame.py, and
// then let the browser render the frame and the live app together. Never paste
// a UI onto a device photograph — it does not survive being looked at.
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { openDeviceStage } = require('../scripts/device-stage');

const DEVICE = process.argv[2] || 'phone';
const OUT = path.join(process.cwd(), 'out', `stage-${DEVICE}`);

(async () => {
  const stage = await openDeviceStage(chromium, {
    device: DEVICE,
    frameDir: path.join(OUT, 'frames'),
    // A flat colour is fine for a product page. For a scene, point this at a
    // generated environment plate (see the location-plate-builder skill).
    bg: '#151310',
    tilt: DEVICE === 'phone' ? -6 : 4,
    // Supply your own measured frame to get out of CSS-frame territory:
    // frame: '/assets/device-frames/phone-cutout.png',
    // meas:  'assets/device-frames/phone.json',
  });
  const { page, frame, t } = stage;

  // If your app renders as a panel, pin it full-bleed inside the device screen.
  if (DEVICE === 'laptop') { await stage.fullbleedFrame(frame); await t.settle(900); }
  await t.settle(2000);

  await t.hold(2.2);
  await t.glide(700, 1.8);  await t.hold(1.6);
  await t.glide(1500, 1.8); await t.hold(1.6);
  await t.glide(0, 2.0);    await t.hold(1.4);

  const input = frame.locator('input[type="search"], input[placeholder]').first();
  try {
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await t.type(input, 'a real query');
    await t.settle(1600);
    await t.live(2.2);        // results arriving, at true speed
    await t.hold(2.4);
  } catch (e) {
    console.log('note: search beat skipped (' + e.message.split('\n')[0] + ')');
    await t.hold(2.0);
  }

  console.log(`frames: ${stage.frames.length}`);
  const out = stage.assemble(stage.frames, path.join(OUT, `stage-${DEVICE}.mp4`));
  console.log('output: ' + execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', out]).toString().trim());

  await stage.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
