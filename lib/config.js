// Reads config.env (or config.example.env as a fallback) into process.env-style
// values, so every script shares one source of truth and no script hardcodes a
// URL, a brand colour or a library path.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val.replace(/\$\{?HOME\}?/g, process.env.HOME || '');
  }
  return out;
}

// Precedence: real environment > config.env > config.example.env.
const fromExample = parseEnvFile(path.join(ROOT, 'config.example.env'));
const fromLocal = parseEnvFile(path.join(ROOT, 'config.env'));
const cfg = { ...fromExample, ...fromLocal };
for (const k of Object.keys(cfg)) {
  if (process.env[k] !== undefined && process.env[k] !== '') cfg[k] = process.env[k];
}

const brand = {
  name: cfg.BRAND_NAME || 'Your Product',
  accent: cfg.BRAND_ACCENT || '#4F46E5',
  accent2: cfg.BRAND_ACCENT_2 || '#7C6BF5',
  ink: cfg.BRAND_INK || '#1F2430',
  paper: cfg.BRAND_PAPER || '#F7F7F9',
  font: cfg.BRAND_FONT || 'Inter',
};

module.exports = { ROOT, cfg, brand };
