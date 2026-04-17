/**
 * Script to recalculate all TeamStandings from completed matches
 * Run with: npx tsx scripts/recalculate-team-standings.ts
 */

import { prisma } from "../lib/prisma";
import { MatchStatus, Tier } from "../app/generated/prisma/enums";

function updateStreak(current: string | null, won: boolean): string {
  if (!current) return won ? "W1" : "L1";
  const letter = current[0];
  const count = parseInt(current.slice(1)) || 1;
  if ((won && letter === "W") || (!won && letter === "L")) return `${letter}${count + 1}`;
  return won ? "W1" : "L1";
}

async function main() {
  console.log("Starting team standings recalculation...\n");

  // Get all completed/forfeited matches with tournament info
  const matches = await prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED] },
      winnerId: { not: null },
    },
    include: {
      tournament: {
        select: { seasonId: true },
      },
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
    },
    orderBy: { scheduledTime: "asc" }, // Process in chronological order
  });

  console.log(`Found ${matches.length} completed matches to process.\n`);

  // Group matches by season
  const matchesBySeason = new Map<string, typeof matches>();
  for (const match of matches) {
    const seasonId = match.tournament?.seasonId;
    if (!seasonId) continue;
    
    if (!matchesBySeason.has(seasonId)) {
      matchesBySeason.set(seasonId, []);
    }
    matchesBySeason.get(seasonId)!.push(match);
  }

  for (const [seasonId, seasonMatches] of matchesBySeason) {
    console.log(`\n--- Processing season: ${seasonId} (${seasonMatches.length} matches) ---`);

    // Reset/delete existing standings for this season
    await prisma.teamStanding.deleteMany({ where: { seasonId } });
    await prisma.headToHead.deleteMany({ where: { seasonId } });
    console.log("Cleared existing standings for season.");

    // Track team stats
    const teamStats = new Map<string, {
      wins: number;
      losses: number;
      forfeits: number;
      points: number;
      streak: string;
    }>();

    // Track H2H: "teamA_teamB" (alphabetically sorted) => { teamAWins, teamBWins }
    const h2hStats = new Map<string, { teamAId: string; teamBId: string; teamAWins: number; teamBWins: number }>();

    for (const match of seasonMatches) {
      const winnerId = match.winnerId!;
      const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
      const isForfeit = match.status === MatchStatus.FORFEITED;

      // Initialize team stats if needed
      if (!teamStats.has(winnerId)) {
        teamStats.set(winnerId, { wins: 0, losses: 0, forfeits: 0, points: 0, streak: "" });
      }

      // Update winner
      const winnerStats = teamStats.get(winnerId)!;
      winnerStats.wins += 1;
      winnerStats.points += 2;
      winnerStats.streak = updateStreak(winnerStats.streak, true);

      if (loserId) {
        if (!teamStats.has(loserId)) {
          teamStats.set(loserId, { wins: 0, losses: 0, forfeits: 0, points: 0, streak: "" });
        }

        // Update loser
        const loserStats = teamStats.get(loserId)!;
        loserStats.losses += 1;
        if (isForfeit) {
          loserStats.forfeits += 1;
          loserStats.points -= 1;
        }
        loserStats.streak = updateStreak(loserStats.streak, false);

        // Update H2H
        const [teamAId, teamBId] = winnerId < loserId ? [winnerId, loserId] : [loserId, winnerId];
        const h2hKey = `${teamAId}_${teamBId}`;
        if (!h2hStats.has(h2hKey)) {
          h2hStats.set(h2hKey, { teamAId, teamBId, teamAWins: 0, teamBWins: 0 });
        }
        const h2h = h2hStats.get(h2hKey)!;
        if (winnerId === teamAId) {
          h2h.teamAWins += 1;
        } else {
          h2h.teamBWins += 1;
        }
      }

    }

    // Sort teams by points (desc), wins (desc), forfeits (asc) for ranking
    const sortedTeams = [...teamStats.entries()].sort(([, a], [, b]) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.forfeits - b.forfeits;
    });

    // Create TeamStanding records
    for (let i = 0; i < sortedTeams.length; i++) {
      const [teamId, stats] = sortedTeams[i];
      await prisma.teamStanding.create({
        data: {
          teamId,
          seasonId,
          rank: i + 1,
          wins: stats.wins,
          losses: stats.losses,
          forfeits: stats.forfeits,
          points: stats.points,
          streak: stats.streak || null,
          tier: Tier.C, // Default tier
        },
      });
      console.log(`  Created standing for team ${teamId}: Rank ${i + 1}, W${stats.wins}-L${stats.losses}, ${stats.points}pts`);
    }

    // Create HeadToHead records
    for (const [, h2h] of h2hStats) {
      await prisma.headToHead.create({
        data: {
          seasonId,
          teamAId: h2h.teamAId,
          teamBId: h2h.teamBId,
          teamAWins: h2h.teamAWins,
          teamBWins: h2h.teamBWins,
        },
      });
    }
    console.log(`  Created ${h2hStats.size} H2H records.`);
  }

  console.log("\n✅ Team standings recalculation complete!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
