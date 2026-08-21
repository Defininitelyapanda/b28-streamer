const fs = require('fs');
const { execSync } = require('child_process');

const BACKEND_ROOT = '/opt/backend';

/** Prisma migrate must use direct Postgres (not PgBouncer pooled). */
function getMigrationDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL_UNPOOLED) return env.DATABASE_URL_UNPOOLED;
  if (env.DIRECT_URL) return env.DIRECT_URL;

  const url = env.DATABASE_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('-pooler')) {
      parsed.hostname = parsed.hostname.replace('-pooler', '');
    }
    if (parsed.port === '6543') parsed.port = '5432';
    return parsed.toString();
  } catch {
    return url.replace('-pooler', '');
  }
}

console.log('[startup] B28 backend container starting');
console.log('[startup] env present:', {
  DATABASE_URL: Boolean(process.env.DATABASE_URL),
  DATABASE_URL_UNPOOLED: Boolean(process.env.DATABASE_URL_UNPOOLED),
  JWT_ACCESS_SECRET: Boolean(process.env.JWT_ACCESS_SECRET),
  JWT_ACCESS_SECRET_LENGTH: process.env.JWT_ACCESS_SECRET?.length ?? 0,
  NODE_ENV: process.env.NODE_ENV ?? '(unset)',
  PORT: process.env.PORT ?? '(unset)',
  VERCEL: process.env.VERCEL ?? '(unset)',
});

const manifests = [
  `${BACKEND_ROOT}/package.json`,
  `${BACKEND_ROOT}/dist/package.json`,
  `${BACKEND_ROOT}/dist/src/package.json`,
];

for (const manifest of manifests) {
  if (!fs.existsSync(manifest)) continue;
  try {
    JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch {
    console.warn('[startup] Removing corrupt manifest:', manifest);
    fs.unlinkSync(manifest);
  }
}

function runMigrationsAsync() {
  const migrationUrl = getMigrationDatabaseUrl();
  if (!migrationUrl) {
    console.warn('[startup] No DATABASE_URL — skipping migrate');
    return;
  }

  const prismaBin = `${BACKEND_ROOT}/node_modules/prisma/build/index.js`;
  if (!fs.existsSync(prismaBin)) {
    console.warn('[startup] Prisma CLI not found — skipping migrate');
    return;
  }

  setImmediate(() => {
    try {
      execSync(`node "${prismaBin}" migrate deploy`, {
        cwd: BACKEND_ROOT,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: migrationUrl },
      });
      console.log('[startup] Database migrations applied');
    } catch (err) {
      console.warn(
        '[startup] prisma migrate deploy failed (will retry on next cold start):',
        err instanceof Error ? err.message : err,
      );
    }
  });
}

process.on('SIGTERM', () => {
  console.log('[startup] SIGTERM received — shutting down');
  process.exit(0);
});

try {
  require(`${BACKEND_ROOT}/dist/src/main.cjs`);
  runMigrationsAsync();
} catch (err) {
  console.error('[startup] Failed to start NestJS:', err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
}
