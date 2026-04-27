const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDarkHorse() {
  console.log("Searching for Team DarkHorse...");
  const team = await prisma.team.findFirst({
    where: { 
      OR: [
        { name: { contains: 'DarkHorse', mode: 'insensitive' } },
        { tag: 'TDH' }
      ]
    }
  });

  if (!team) {
    console.log("Team not found.");
    return;
  }

  console.log(`Found: ${team.name} (${team.id})`);

  const season = await prisma.season.findFirst({
    where: { name: { contains: 'Season 1', mode: 'insensitive' } }
  });

  if (!season) {
    console.log("Season 1 not found.");
    return;
  }

  console.log(`In Season: ${season.name} (${season.id})`);

  const matches = await prisma.match.findMany({
    where: {
      tournament: { seasonId: season.id },
      OR: [
        { teamAId: team.id },
        { teamBId: team.id }
      ],
      status: { in: ['COMPLETED', 'FORFEITED', 'RESTING'] }
    },
    orderBy: { scheduledTime: 'asc' }
  });

  console.log(`Found ${matches.length} matches:`);
  matches.forEach(m => {
    const role = m.teamAId === team.id ? 'TeamA' : 'TeamB';
    const isWin = m.winnerId === team.id;
    const isForfeit = m.status === 'FORFEITED';
    const forfByMe = m.forfeitedById === team.id;
    
    console.log(`- Match ${m.id}: Status=${m.status}, Role=${role}, WinnerId=${m.winnerId}, Forfeiter=${m.forfeitedById}, Win=${isWin}, FF=${isForfeit}, FFbyMe=${forfByMe}`);
  });
}

debugDarkHorse().catch(console.error).finally(() => prisma.$disconnect());
