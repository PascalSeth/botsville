import { prisma } from "../lib/prisma";

async function detailedAudit() {
  console.log("=== Detailed Captaincy Audit ===");
  
  const allTeams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      captain: { select: { id: true, ign: true, email: true } },
      players: {
        where: { deletedAt: null },
        select: {
          id: true,
          ign: true,
          userId: true,
          user: { select: { email: true } }
        },
      },
    },
  });

  for (const team of allTeams) {
    const registeredCount = team.players.filter(p => !!p.userId).length;
    console.log(`\nTeam: ${team.name} | Tag: ${team.tag}`);
    console.log(`- Captain in DB: ${team.captain?.ign || 'NONE'} (${team.captainId || 'N/A'})`);
    console.log(`- Players (${team.players.length}):`);
    team.players.forEach(p => {
      console.log(`  · ${p.ign.padEnd(15)} | Registered: ${p.userId ? 'YES' : 'NO'} ${p.userId === team.captainId ? '[CURRENT CAPTAIN]' : ''}`);
    });

    if (registeredCount > 0 && !team.captainId) {
       console.log("  [!] ISSUE: Team has registered members but NO captainId.");
    }
    
    if (team.captainId && !team.players.some(p => p.userId === team.captainId)) {
       console.log("  [!] ISSUE: Captain is NOT a player on the team roster!");
    }
  }

  console.log("\n=== Audit Finished ===");
}

detailedAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
