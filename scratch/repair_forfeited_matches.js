const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairForfeits() {
  console.log("Searching for forfeited matches with missing winnerId...");
  
  const forfeitedMatches = await prisma.match.findMany({
    where: { 
      status: 'FORFEITED',
      winnerId: null
    }
  });

  console.log(`Found ${forfeitedMatches.length} matches to repair.`);

  for (const m of forfeitedMatches) {
    if (!m.forfeitedById) {
      console.log(`Match ${m.id}: Missing forfeitedById. Cannot auto-repair winner.`);
      continue;
    }

    let winnerId = null;
    if (m.forfeitedById === m.teamAId) winnerId = m.teamBId;
    else if (m.forfeitedById === m.teamBId) winnerId = m.teamAId;

    if (winnerId) {
      console.log(`Match ${m.id}: Repairing. Forfeiter: ${m.forfeitedById}, New Winner: ${winnerId}`);
      await prisma.match.update({
        where: { id: m.id },
        data: { winnerId }
      });
    }
  }

  console.log("Repair complete.");
}

repairForfeits().catch(console.error).finally(() => prisma.$disconnect());
