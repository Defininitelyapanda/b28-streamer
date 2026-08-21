#!/usr/bin/env node
/**
 * Verify Cloudflare R2 credentials and bucket access.
 * Usage (from repo root):
 *   node scripts/verify-r2-connection.js
 * Reads R2_* from process.env or backend/.env via dotenv if present.
 */

const fs = require('fs');
const path = require('path');

function loadBackendEnv() {
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadBackendEnv();

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  const missing = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucket) missing.push('R2_BUCKET_NAME');

  if (missing.length) {
    console.error('Missing:', missing.join(', '));
    console.error('Create token: https://dash.cloudflare.com/' + (accountId || '<account-id>') + '/r2/overview');
    process.exit(1);
  }

  const backendNodeModules = path.join(__dirname, '..', 'backend', 'node_modules');
  const { S3Client, HeadBucketCommand, ListObjectsV2Command } = require(require.resolve('@aws-sdk/client-s3', { paths: [backendNodeModules] }));
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    console.log('OK R2 bucket accessible:', bucket);
    console.log('   endpoint:', `https://${accountId}.r2.cloudflarestorage.com`);
    console.log('   objects:', list.KeyCount ?? list.Contents?.length ?? 0, '(sample list, max 5)');
    process.exit(0);
  } catch (err) {
    console.error('R2 verification failed:', err.message || err);
    process.exit(1);
  }
}

main();
