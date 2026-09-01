// Lossy-palette compress the slideshow PNGs (visually lossless at these sizes).
const sharp = require('sharp');
const fs = require('fs');
// Directory of PNGs to optimise in place. Pass one as argv[2], or edit this default.
const D = process.argv[2] || './out';
const files = ['discover_desktop.png', 'decide_desktop.png', 'plan_and_shop_desktop.png', 'cook_desktop.png', 'save_and_repeat_desktop.png'];
(async () => {
  for (const f of files) {
    const src = `${D}/${f}`;
    const before = fs.statSync(src).size;
    const buf = await sharp(src).png({ palette: true, quality: 92, effort: 8 }).toBuffer();
    if (buf.length < before * 0.9) {
      fs.writeFileSync(src, buf);
      console.log(`${f}: ${(before/1048576).toFixed(1)}MB -> ${(buf.length/1048576).toFixed(1)}MB`);
    } else {
      console.log(`${f}: kept original (${(before/1048576).toFixed(1)}MB, no meaningful win)`);
    }
  }
})();
