import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '../.env.vercel.production');
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/^DATABASE_URL="(.+)"$/);
  if (match) {
    process.env.DATABASE_URL = match[1];
    break;
  }
  const unquoted = line.match(/^DATABASE_URL=(.+)$/);
  if (unquoted) {
    process.env.DATABASE_URL = unquoted[1];
    break;
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.vercel.production');
  process.exit(1);
}

execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
