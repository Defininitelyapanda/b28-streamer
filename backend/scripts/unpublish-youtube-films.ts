/**
 * Unpublish all legacy YouTube catalog rows (films and trailers).
 * Production catalog should be R2 uploads only.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.catalogVideo.updateMany({
    where: { sourceType: 'youtube', published: true },
    data: { published: false },
  });
  console.log(`Unpublished ${result.count} legacy YouTube catalog rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
