// Repo self-check: parse every source file, verify local requires resolve, and confirm
// nothing product-specific has crept back in.
//
//   node scripts/check.js
//
// This is what CI runs. It deliberately does NOT need ffmpeg, Chromium, or a running app —
// a check that only passes on a fully-provisioned machine is a check nobody runs.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
const fail = (msg) => { console.error('  FAIL ' + msg); failures++; };
const ok = (msg) => console.log('  ok   ' + msg);

// Walk tracked-ish files, skipping anything generated.
const SKIP = new Set(['node_modules', '.git', 'out', 'build', 'app', '__pycache__', '.venv']);
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const files = walk(ROOT);
const rel = (f) => path.relative(ROOT, f);

// ── 1. JavaScript parses ────────────────────────────────────────────────────────────────
console.log('\nJavaScript syntax');
const js = files.filter(f => f.endsWith('.js'));
for (const f of js) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`${rel(f)} does not parse\n${e.stderr?.toString().trim()}`); }
}
ok(`${js.length} files parse`);

// ── 2. Local requires resolve ───────────────────────────────────────────────────────────
console.log('\nLocal requires');
let checked = 0;
for (const f of js) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    const target = path.resolve(path.dirname(f), m[1]);
    const found = fs.existsSync(target) || fs.existsSync(target + '.js') ||
                  fs.existsSync(path.join(target, 'index.js'));
    if (!found) fail(`${rel(f)} requires '${m[1]}' which does not exist`);
    checked++;
  }
}
ok(`${checked} local requires resolve`);

// ── 3. Referenced repo paths exist ──────────────────────────────────────────────────────
// Docs and skills name scripts by path constantly; a rename that misses them turns the
// documentation into a list of files that aren't there.
console.log('\nPaths named in docs and skills');
const docs = files.filter(f => f.endsWith('.md'));
let refs = 0, missing = new Set();
for (const f of docs) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b((?:scripts|templates|examples|lib|docs|demo-app)\/[A-Za-z0-9._\/-]+\.(?:js|sh|py|html|css|json|md))/g)) {
    refs++;
    if (!fs.existsSync(path.join(ROOT, m[1]))) missing.add(`${rel(f)} -> ${m[1]}`);
  }
}
for (const m of missing) fail(`dangling path reference: ${m}`);
ok(`${refs} path references, ${refs - missing.size} resolve`);

// ── 4. No product-specific content ──────────────────────────────────────────────────────
// This repo was extracted from a private one. The de-branding is easy to undo by accident
// when porting a fix back, so it is asserted rather than trusted.
console.log('\nBrand neutrality');
const BANNED = /allspice|pimento|\bpico\b|zernio|kevin-demo/i;
let hits = 0;
for (const f of files) {
  if (/\.(ttf|otf|woff2?|png|jpe?g|mp4|mov|webm|wav|mp3)$/i.test(f)) continue;
  if (rel(f) === 'scripts/check.js') continue;
  const src = fs.readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    if (BANNED.test(line)) { fail(`${rel(f)}:${i + 1} contains a product-specific reference`); hits++; }
  });
}
if (!hits) ok('no product-specific references');

// ── 5. No secrets ───────────────────────────────────────────────────────────────────────
console.log('\nSecrets');
const SECRET = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-|-----BEGIN [A-Z ]*PRIVATE KEY)/;
let sec = 0;
for (const f of files) {
  if (/\.(ttf|otf|woff2?|png|jpe?g|mp4|mov|webm|wav|mp3)$/i.test(f)) continue;
  if (rel(f) === 'scripts/check.js') continue;
  const src = fs.readFileSync(f, 'utf8');
  if (SECRET.test(src)) { fail(`${rel(f)} looks like it contains a credential`); sec++; }
}
if (!sec) ok('no credential patterns');

// ── 6. config.env is not committed ──────────────────────────────────────────────────────
console.log('\nConfig hygiene');
try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT }).toString().split('\n');
  for (const bad of ['config.env', 'app.config.js']) {
    if (tracked.includes(bad)) fail(`${bad} is tracked by git — it is machine-local and must stay ignored`);
  }
  ok('config.env and app.config.js are untracked');
} catch { ok('not a git repo — skipped'); }

console.log(failures ? `\n${failures} problem(s)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
