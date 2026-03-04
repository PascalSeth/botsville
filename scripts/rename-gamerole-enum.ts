/**
 * One-time migration: rename GameRole enum values
 *   MAGE      → MID
 *   MARKSMAN  → GOLD
 *
 * PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE directly,
 * which is safe on live data (no column rewrites needed).
 */
import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = { adapter };
const prisma = new PrismaClient(prismaOptions);

async function main() {
  console.log('Renaming GameRole enum values...');

  await prisma.$executeRawUnsafe(
    `ALTER TYPE "GameRole" RENAME VALUE 'MAGE' TO 'MID'`
  );
  console.log('  MAGE → MID ✓');

  await prisma.$executeRawUnsafe(
    `ALTER TYPE "GameRole" RENAME VALUE 'MARKSMAN' TO 'GOLD'`
  );
  console.log('  MARKSMAN → GOLD ✓');

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
