/**
 * Script to auto-register teams in tournaments they've played in but weren't registered for.
 * Also ensures monthly standings are created for all teams that played in a season/month.
 * Run with: npx tsx scripts/auto-register-teams-in-tournaments.ts
 */

import { prisma } from "../lib/prisma";

async function main() {
  console.log("Auto-registering teams in tournaments they've played in...\n");

  // Get all tournaments
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, seasonId: true },
  });

  for (const tournament of tournaments) {
    // Get all matches for this tournament
    const matches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      select: { teamAId: true, teamBId: true },
    });
    const teamIds = Array.from(new Set(matches.flatMap(m => [m.teamAId, m.teamBId])));
    if (teamIds.length === 0) continue;

    // Get already registered teams
    const registered = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      select: { teamId: true },
    });
    const registeredIds = new Set(registered.map(r => r.teamId));

    // Register missing teams
    const toRegister = teamIds.filter(id => !registeredIds.has(id));
    for (const teamId of toRegister) {
      await prisma.tournamentRegistration.create({
        data: { tournamentId: tournament.id, teamId },
      });
      console.log(`Registered team ${teamId} in tournament ${tournament.id}`);
    }
  }

  // Ensure monthly standings exist for all teams that played in a season/month
  const seasons = await prisma.season.findMany({ select: { id: true } });
  for (const season of seasons) {
    // Get all matches for this season
    const matches = await prisma.match.findMany({
      where: { tournament: { seasonId: season.id } },
      select: { teamAId: true, teamBId: true, scheduledTime: true },
    });
    const teamIds = Array.from(new Set(matches.flatMap(m => [m.teamAId, m.teamBId])));
    for (const teamId of teamIds) {
      for (const match of matches.filter(m => m.teamAId === teamId || m.teamBId === teamId)) {
        const date = new Date(match.scheduledTime);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const existing = await prisma.monthlyStanding.findUnique({
          where: { seasonId_teamId_year_month: { seasonId: season.id, teamId, year, month } },
        });
        if (!existing) {
          await prisma.monthlyStanding.create({
            data: {
              seasonId: season.id,
              teamId,
              year,
              month,
              wins: 0,
              losses: 0,
              forfeits: 0,
              points: 0,
              rank: 0,
            },
          });
          console.log(`Created monthly standing for team ${teamId} in season ${season.id}, ${year}-${month}`);
        }
      }
    }
  }

  console.log("\n✅ Auto-registration and monthly standing creation complete!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
