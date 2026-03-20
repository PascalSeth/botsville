import { prisma } from "@/lib/prisma";

async function setupBracketProgression() {
  try {
    console.log("Setting up bracket progression from match results...");

    // Get the tournament
    const tournament = await prisma.tournament.findFirst({
      where: { name: "Season 1 Scrims" },
      include: {
        matches: {
          include: {
            teamA: true,
            teamB: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!tournament) {
      console.log("Tournament not found");
      return;
    }

    console.log(`Found tournament: ${tournament.name}`);
    console.log(`Matches: ${tournament.matches.length}`);

    // Assign group stage bracket type to all existing matches
    for (const match of tournament.matches) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          bracketType: "GROUP_STAGE",
          round: match.round || 1,
          bracketPosition: match.bracketPosition || 0,
        },
      });
    }

    console.log(`✅ Assigned GROUP_STAGE bracket type to ${tournament.matches.length} matches`);

    console.log("\n✅ Setup complete!");
    console.log(`Total matches: ${tournament.matches.length}`);
    console.log(`- Group Stage: ${tournament.matches.length} matches`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBracketProgression();

