#!/usr/bin/env node
/**
 * Configure CORS on the R2 bucket so browser uploads from the admin dashboard work.
 * Usage: node scripts/configure-r2-cors.js
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

  const extraOrigins = (process.env.R2_CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origins = [
    'https://dashboard-mu-six-42.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
    ...extraOrigins,
  ];

  const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require(require.resolve(
    '@aws-sdk/client-s3',
    { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] },
  ));

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const corsRules = [
    {
      AllowedOrigins: [...new Set(origins)],
      AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ];

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsRules },
    }),
  );

  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log('R2 CORS configured for bucket:', bucket);
  console.log('Allowed origins:', current.CORSRules?.[0]?.AllowedOrigins?.join(', '));
}

main().catch((err) => {
  console.error('Failed to configure R2 CORS:', err.message || err);
  process.exit(1);
});
