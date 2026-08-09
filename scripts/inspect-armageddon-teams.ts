import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const armageddon = await prisma.tournament.findFirst({
    where: { name: { contains: 'ARMAGEDDON', mode: 'insensitive' } },
  });

  if (!armageddon) {
    console.log("Tournament not found");
    return;
  }

  const regs = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: armageddon.id, status: 'APPROVED' },
    include: { team: true },
  });

  console.log("Approved Teams:");
  for (const r of regs) {
    console.log(`ID: ${r.team.id} | Name: "${r.team.name}" | Tag: "${r.team.tag}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
