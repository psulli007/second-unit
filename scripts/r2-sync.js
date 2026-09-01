#!/usr/bin/env node
// Upload/download/list finished videos and images against the shared R2
// bucket, always scoped under this studio's prefix (never the bucket root —
// other projects may share the same bucket).
//
// Setup once: source your local R2 credentials file (see r2-env-example.sh),
// which supplies R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY. The non-secret
// config (bucket, endpoint, prefix) is read from config.env automatically.
//
// Usage:
//   node scripts/r2-sync.js upload   <local-file-or-dir> [remote-subpath]
//   node scripts/r2-sync.js download <remote-key> <local-dest>
//   node scripts/r2-sync.js list     [remote-subpath]
//
// Examples:
//   node scripts/r2-sync.js upload out/masters/desktop-search.mp4
//   node scripts/r2-sync.js upload out/masters/ masters
//   node scripts/r2-sync.js list masters
//   node scripts/r2-sync.js download widget-studio/masters/d-groceries.mp4 ./tmp/d-groceries.mp4

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

function loadConfigEnv() {
  const p = path.join(__dirname, '..', 'config.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadConfigEnv();

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    console.error('Source your R2 credentials file first (see scripts/r2-env-example.sh).');
    process.exit(1);
  }
  return v;
}

const bucket = need('R2_BUCKET_NAME');
const endpoint = need('R2_ENDPOINT');
const prefix = (process.env.R2_PREFIX || '').replace(/\/$/, '');
const accessKeyId = need('R2_ACCESS_KEY_ID');
const secretAccessKey = need('R2_SECRET_ACCESS_KEY');

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (c) => hash.update(c));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    // Audio matters: Higgsfield's media_import_url rejects application/octet-stream
    // outright, so an mp3 uploaded without this is unusable as a generation input.
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
    // Review pages are served straight from the bucket. Without these a browser
    // DOWNLOADS the page instead of rendering it, which silently breaks
    // "open this link on your phone".
    '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';
}

function scopedKey(remoteSubpath) {
  const clean = remoteSubpath.replace(/^\/+/, '');
  return prefix ? `${prefix}/${clean}` : clean;
}

async function uploadOne(localFile, remoteSubpath) {
  const key = scopedKey(remoteSubpath);
  const size = fs.statSync(localFile).size;
  const localHash = await sha256(localFile);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(localFile),
    ContentLength: size,
    ContentType: contentTypeFor(localFile),
  }));

  // verify immediately — HeadObject's ETag is an MD5 for non-multipart
  // uploads, which covers everything this studio produces; re-download and
  // hash for anything you need triple-checked (see r2-roundtrip-test.js).
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const remoteMd5 = (head.ETag || '').replace(/"/g, '');
  const localMd5 = crypto.createHash('md5').update(fs.readFileSync(localFile)).digest('hex');
  const ok = remoteMd5 === localMd5;

  console.log(`${ok ? '✓' : '✗ MISMATCH'} ${key}  (${(size / 1048576).toFixed(1)} MB)`);
  if (!ok) console.log(`    local md5: ${localMd5}  remote etag: ${remoteMd5}`);
  return { key, ok, url: `${process.env.R2_PUBLIC_URL || ''}/${key}` };
}

async function cmdUpload(localPath, remoteSubpath) {
  if (!fs.existsSync(localPath)) {
    console.error(`Not found: ${localPath}`);
    process.exit(1);
  }
  const stat = fs.statSync(localPath);
  const results = [];
  if (stat.isDirectory()) {
    const base = remoteSubpath || path.basename(localPath);
    const files = fs.readdirSync(localPath).filter((f) => !f.startsWith('.'));
    for (const f of files) {
      const full = path.join(localPath, f);
      if (fs.statSync(full).isFile()) {
        results.push(await uploadOne(full, `${base}/${f}`));
      }
    }
  } else {
    // A subpath with no file extension is a destination FOLDER (append the
    // filename); one with an extension is taken as the exact destination
    // filename. This disambiguates `upload file.mp4 masters` (-> folder,
    // caught as a bug in testing — it silently uploaded a file literally
    // named "masters" with no extension) from `upload file.mp4 masters/x.mp4`.
    let remote;
    if (!remoteSubpath) {
      remote = path.basename(localPath);
    } else if (remoteSubpath.endsWith('/') || !path.extname(remoteSubpath)) {
      remote = `${remoteSubpath.replace(/\/$/, '')}/${path.basename(localPath)}`;
    } else {
      remote = remoteSubpath;
    }
    results.push(await uploadOne(localPath, remote));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length} uploaded, ${failed.length} failed verification.`);
  if (failed.length) process.exit(1);
}

async function cmdList(remoteSubpath) {
  const p = scopedKey(remoteSubpath || '');
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: p, MaxKeys: 1000 }));
  for (const o of res.Contents || []) {
    console.log(`${(o.Size / 1048576).toFixed(1).padStart(8)} MB  ${o.Key}`);
  }
  console.log(`\n${res.KeyCount || 0} object(s) under "${p}"${res.IsTruncated ? ' (truncated, more exist)' : ''}`);
}

async function cmdDownload(remoteKey, localDest) {
  const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: remoteKey }));
  fs.mkdirSync(path.dirname(localDest), { recursive: true });
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(localDest);
    get.Body.pipe(out);
    get.Body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
  console.log(`Downloaded ${remoteKey} -> ${localDest}`);
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'upload' && a) return cmdUpload(a, b);
  if (cmd === 'list') return cmdList(a);
  if (cmd === 'download' && a && b) return cmdDownload(a, b);
  console.error('Usage:');
  console.error('  node scripts/r2-sync.js upload   <local-file-or-dir> [remote-subpath]');
  console.error('  node scripts/r2-sync.js list     [remote-subpath]');
  console.error('  node scripts/r2-sync.js download <remote-key> <local-dest>');
  process.exit(1);
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});
