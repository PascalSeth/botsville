import { prisma } from "@/lib/prisma";

async function cleanupBracketMatches() {
  try {
    console.log("Cleaning up extra bracket matches...");

    // Get the tournament
    const tournament = await prisma.tournament.findFirst({
      where: { name: "Season 1 Scrims" },
    });

    if (!tournament) {
      console.log("Tournament not found");
      return;
    }

    // Delete all matches that are not GROUP_STAGE (the ones we just created)
    const deleted = await prisma.match.deleteMany({
      where: {
        tournamentId: tournament.id,
        bracketType: { not: "GROUP_STAGE" },
      },
    });

    console.log(`✅ Deleted ${deleted.count} extra bracket matches`);

    // Verify only GROUP_STAGE matches remain
    const remaining = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true, bracketType: true },
    });

    console.log(`✅ Remaining matches: ${remaining.length}`);
    remaining.forEach((m) => {
      console.log(`  - ${m.bracketType}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupBracketMatches();
