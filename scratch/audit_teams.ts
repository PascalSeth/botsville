import { prisma } from "../lib/prisma";

async function auditAndRepair() {
  console.log("=== Team Captaincy Audit ===");
  
  const allTeams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      players: {
        where: { deletedAt: null },
        select: {
          id: true,
          ign: true,
          userId: true,
          isSubstitute: true
        },
      },
    },
  });

  console.log(`Analyzing ${allTeams.length} active teams...`);

  const stuckTeams = [];

  for (const team of allTeams) {
    const hasCaptain = !!team.captainId;
    const registeredPlayers = team.players.filter(p => !!p.userId);
    
    let isStuck = false;
    let reason = "";

    if (!hasCaptain) {
      isStuck = true;
      reason = "Missing captainId";
    } else {
      const captainRecord = await prisma.user.findUnique({
        where: { id: team.captainId! }
      });
      if (!captainRecord) {
        isStuck = true;
        reason = "Captain User record missing (Dangling reference)";
      }
    }

    if (isStuck) {
      stuckTeams.push({
        team: team.name,
        id: team.id,
        reason,
        candidates: registeredPlayers.map(p => p.ign).join(", ") || "None"
      });
    }
  }

  if (stuckTeams.length === 0) {
    console.log("SUCCESS: No stuck teams found. All teams have valid captains.");
    return;
  }

  console.log(`\nFound ${stuckTeams.length} stuck teams:`);
  console.table(stuckTeams);

  console.log("\nStarting REPAIR...");

  for (const issue of stuckTeams) {
    const team = allTeams.find(t => t.id === issue.id);
    if (!team) continue;

    const registeredPlayers = team.players.filter(p => !!p.userId);
    if (registeredPlayers.length > 0) {
      // Prioritize non-substitutes, then longest serving
      const newCaptain = registeredPlayers.sort((a, b) => (a.isSubstitute ? 1 : -1))[0];
      
      console.log(`Fixing ${team.name}: Assigning ${newCaptain.ign} (${newCaptain.userId}) as Captain...`);
      
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: newCaptain.userId }
      });
      
      console.log(`Fixed ${team.name}.`);
    } else {
      console.log(`SKIPPED ${team.name}: No registered users found to promote.`);
    }
  }

  console.log("\n=== Repair Finished ===");
}

auditAndRepair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
