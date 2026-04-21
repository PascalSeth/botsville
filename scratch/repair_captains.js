const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
  console.log("Starting Captaincy Repair...");
  
  const stuckTeams = await prisma.team.findMany({
    where: {
      deletedAt: null,
      OR: [
        { captainId: null },
      ]
    },
    include: {
      players: {
        where: { deletedAt: null, userId: { not: null } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  console.log(`Found ${stuckTeams.length} teams with no captain.`);

  for (const team of stuckTeams) {
    if (team.players.length > 0) {
      const firstRegistrant = team.players[0];
      
      console.log(`Team: ${team.name} | First Registrant: ${firstRegistrant.ign} (${firstRegistrant.userId})`);
      
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: firstRegistrant.userId }
      });

      console.log(`SUCCESS: Promoted ${firstRegistrant.ign} to Captain of ${team.name}`);
    } else {
      console.log(`WARNING: Team ${team.name} has no registered members to promote.`);
    }
  }

  console.log("Repair finished.");
}

repair()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
