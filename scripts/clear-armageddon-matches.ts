import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const armageddon = await prisma.tournament.findFirst({
    where: {
      name: {
        contains: 'ARMAGEDDON',
        mode: 'insensitive',
      },
    },
  });

  if (!armageddon) {
    console.log("Armageddon tournament not found.");
    return;
  }

  console.log(`Armageddon Tournament ID: ${armageddon.id}`);

  const matchCount = await prisma.match.count({
    where: { tournamentId: armageddon.id },
  });

  const deletedMatches = await prisma.match.deleteMany({
    where: { tournamentId: armageddon.id },
  });

  const deletedStandings = await prisma.groupStageStanding.deleteMany({
    where: { tournamentId: armageddon.id },
  });

  console.log(`Successfully cleared Armageddon tournament matches.`);
  console.log(`- Previous match count: ${matchCount}`);
  console.log(`- Matches deleted: ${deletedMatches.count}`);
  console.log(`- Group standings deleted: ${deletedStandings.count}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
