import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const roleCount = await prisma.role.count();
  if (roleCount > 0) {
    console.log('Database already seeded — skipping.');
    return;
  }

  console.log('Empty database detected — running seed...');
  execSync('npm run prisma:seed', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
