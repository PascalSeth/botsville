const { PrismaClient } = require('./app/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    include: { matches: { where: { status: "RESTING" } } }
  });
  
  const targetT = tournaments.find(t => t.matches.length > 0);
  if (!targetT) {
    console.log("No resting matches found in any tournament");
    return;
  }
  
  const tournamentId = targetT.id;
  console.log("Checking tournament:", targetT.name);

  // EXACT log of what the RESTING logic is doing:
  const matches = await prisma.match.findMany({
    where: {
      tournamentId, status: "RESTING"
    },
    select: { id: true, teamAId: true, teamBId: true, status: true, scheduledTime: true, bestOf: true }
  });

  for (const m of matches) {
    const isPast = !m.scheduledTime || new Date(m.scheduledTime) <= new Date();
    console.log(`Match: ${m.id} | A: ${m.teamAId} | B: ${m.teamBId} | Date: ${m.scheduledTime} | IsPast: ${isPast}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
