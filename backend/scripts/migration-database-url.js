/**
 * Prisma migrate must use a direct Postgres URL (not PgBouncer pooled).
 * Neon/Vercel often set DATABASE_URL to the pooled host (-pooler suffix).
 */
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
    // Neon pooler sometimes uses port 6543; direct uses 5432.
    if (parsed.port === '6543') parsed.port = '5432';
    return parsed.toString();
  } catch {
    return url.replace('-pooler', '');
  }
}

module.exports = { getMigrationDatabaseUrl };
