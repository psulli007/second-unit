#!/usr/bin/env node
// Proves R2 round-trips a file byte-for-byte: upload a REAL video from the
// library (not a synthetic test file), download it back, hash both sides,
// compare. Cleans up the test object afterward regardless of outcome.
//
// Credentials come from environment — never hardcode, never commit:
//   R2_ACCOUNT_ID or R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_BUCKET_NAME
//
// Usage:
//   source /path/to/your/r2.env   # wherever you keep the credentials locally
//   node scripts/r2-roundtrip-test.js [path/to/a/real/video.mp4]
//
// With no argument, it picks the largest .mp4 it can find under
// final-4k-masters/ or final-4k-pov/ — biggest file = most representative
// real-world test, not a trivial one.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    console.error('Source your R2 credentials file first, then re-run.');
    process.exit(1);
  }
  return v;
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function findLargestMp4(dirs) {
  let best = null;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.mp4')) continue;
      const p = path.join(dir, name);
      const size = fs.statSync(p).size;
      if (!best || size > best.size) best = { path: p, size };
    }
  }
  return best;
}

async function main() {
  const endpoint = process.env.R2_ENDPOINT
    || (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : need('R2_ENDPOINT'));
  const accessKeyId = need('R2_ACCESS_KEY_ID');
  const secretAccessKey = need('R2_SECRET_ACCESS_KEY');
  const bucket = need('R2_BUCKET_NAME');

  let localPath = process.argv[2];
  if (!localPath) {
    const found = findLargestMp4([
      path.join(__dirname, '..', 'final-4k-masters'),
      path.join(__dirname, '..', 'final-4k-pov'),
      path.join(__dirname, '..', 'final-4k-devicestage'),
    ]);
    if (!found) {
      console.error('No local video given and none found under final-4k-*/.');
      console.error('Usage: node scripts/r2-roundtrip-test.js <path/to/video.mp4>');
      process.exit(1);
    }
    localPath = found.path;
  }
  if (!fs.existsSync(localPath)) {
    console.error(`File not found: ${localPath}`);
    process.exit(1);
  }

  const prefix = process.env.R2_PREFIX ? `${process.env.R2_PREFIX}/` : '';
  const size = fs.statSync(localPath).size;
  const key = `${prefix}_roundtrip-test/${Date.now()}-${path.basename(localPath)}`;
  const tmpDownload = path.join(os.tmpdir(), `r2-roundtrip-${Date.now()}-${path.basename(localPath)}`);

  console.log('== R2 round-trip integrity test ==');
  console.log(`bucket:    ${bucket}`);
  console.log(`endpoint:  ${endpoint}`);
  console.log(`test file: ${localPath} (${(size / 1048576).toFixed(1)} MB)`);
  console.log(`test key:  ${key}`);
  console.log();

  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log('1/4 hashing local file (SHA-256)...');
  const localHash = await sha256(localPath);
  console.log(`    ${localHash}`);

  console.log('2/4 uploading...');
  const t0 = Date.now();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentLength: size,
    ContentType: 'video/mp4',
  }));
  console.log(`    done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  console.log('3/4 downloading back...');
  const t1 = Date.now();
  const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(tmpDownload);
    get.Body.pipe(out);
    get.Body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
  console.log(`    done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  console.log('4/4 hashing downloaded file + comparing...');
  const downloadedHash = await sha256(tmpDownload);
  const downloadedSize = fs.statSync(tmpDownload).size;
  console.log(`    ${downloadedHash}`);

  // cleanup regardless of outcome
  fs.unlinkSync(tmpDownload);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});

  console.log();
  const sizeMatch = size === downloadedSize;
  const hashMatch = localHash === downloadedHash;

  if (sizeMatch && hashMatch) {
    console.log(`PASS — byte-identical round trip (${size} bytes, SHA-256 matched).`);
    process.exit(0);
  } else {
    console.log('FAIL — round trip did NOT preserve the file exactly.');
    console.log(`  local size:      ${size}`);
    console.log(`  downloaded size: ${downloadedSize}`);
    console.log(`  local hash:      ${localHash}`);
    console.log(`  downloaded hash: ${downloadedHash}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message || err);
  process.exit(1);
});
