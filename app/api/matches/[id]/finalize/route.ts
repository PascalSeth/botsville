import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// POST /api/matches/[id]/finalize - Finalize match and update all player stats and leaderboards
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin access (TOURNAMENT_ADMIN or higher)
    await requireAdmin();

    const { id: matchId } = await params;

    // Get match with performances and tournament info
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        performances: {
          include: {
            player: true,
          },
        },
        tournament: {
          select: { id: true, seasonId: true },
        },
        teamA: { select: { id: true } },
        teamB: { select: { id: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (!match.performances.length) {
      return NextResponse.json(
        { error: "No performance data recorded for this match" },
        { status: 400 }
      );
    }

    const seasonId = match.tournament?.seasonId;

    // Get unique player IDs from performances
    const playerIds = [...new Set(match.performances.map((p) => p.playerId))];

    // Update each player's stats
    for (const playerId of playerIds) {
      await updatePlayerStats(playerId, seasonId);
    }

    // Update player MVP rankings for the season if available
    if (seasonId) {
      await updateSeasonPlayerRankings(seasonId);
    }

    return NextResponse.json({
      message: "Match finalized! Player stats and leaderboards updated successfully.",
      updatedPlayers: playerIds.length,
    });
  } catch (error) {
    console.error("Error finalizing match:", error);
    return NextResponse.json(
      { error: "Failed to finalize match" },
      { status: 500 }
    );
  }
}

// Update a single player's cumulative stats from all their performances
async function updatePlayerStats(playerId: string, seasonId?: string | null) {
  // Get all performances for this player (including hero)
  const performances = await prisma.matchPerformance.findMany({
    where: { playerId },
    select: {
      kills: true,
      deaths: true,
      assists: true,
      isMvp: true,
      won: true,
      hero: true,
    },
  });

  if (!performances.length) return;

  // Calculate totals
  const totalKills = performances.reduce((sum, p) => sum + p.kills, 0);
  const totalDeaths = performances.reduce((sum, p) => sum + p.deaths, 0);
  const totalAssists = performances.reduce((sum, p) => sum + p.assists, 0);
  const totalGames = performances.length;
  const wins = performances.filter((p) => p.won).length;
  const mvps = performances.filter((p) => p.isMvp).length;

  // Calculate most used hero
  const heroCounts: Record<string, number> = {};
  for (const p of performances) {
    if (p.hero) {
      heroCounts[p.hero] = (heroCounts[p.hero] || 0) + 1;
    }
  }
  const mostUsedHero = Object.entries(heroCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate KDA (kills + assists) / deaths, with deaths = 1 if 0
  const kda = totalDeaths === 0 
    ? totalKills + totalAssists 
    : (totalKills + totalAssists) / totalDeaths;
  
  // Calculate win rate as decimal (0-1) for UI compatibility
  const winRate = totalGames > 0 ? wins / totalGames : 0;

  // Update player record
  await prisma.player.update({
    where: { id: playerId },
    data: {
      kda: Math.round(kda * 100) / 100, // Round to 2 decimal places
      winRate: Math.round(winRate * 100) / 100, // e.g., 0.75 for 75%
      mvpCount: mvps,
      signatureHero: mostUsedHero,
    },
  });

  // Also update or create PlayerMvpRanking if season is provided
  if (seasonId) {
    // Get season-specific performances
    const seasonPerformances = await prisma.matchPerformance.findMany({
      where: {
        playerId,
        match: {
          tournament: {
            seasonId,
          },
        },
      },
      select: {
        kills: true,
        deaths: true,
        assists: true,
        isMvp: true,
        won: true,
        hero: true,
      },
    });

    if (seasonPerformances.length) {
      const seasonKills = seasonPerformances.reduce((sum, p) => sum + p.kills, 0);
      const seasonDeaths = seasonPerformances.reduce((sum, p) => sum + p.deaths, 0);
      const seasonAssists = seasonPerformances.reduce((sum, p) => sum + p.assists, 0);
      const seasonGames = seasonPerformances.length;
      const seasonWins = seasonPerformances.filter((p) => p.won).length;
      const seasonMvps = seasonPerformances.filter((p) => p.isMvp).length;

      // Calculate most used hero for the season
      const seasonHeroCounts: Record<string, number> = {};
      for (const p of seasonPerformances) {
        if (p.hero) {
          seasonHeroCounts[p.hero] = (seasonHeroCounts[p.hero] || 0) + 1;
        }
      }
      const seasonMostUsedHero = Object.entries(seasonHeroCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const seasonKda = seasonDeaths === 0
        ? seasonKills + seasonAssists
        : (seasonKills + seasonAssists) / seasonDeaths;
      const seasonWinRate = seasonGames > 0 ? seasonWins / seasonGames : 0;

      // Upsert PlayerMvpRanking
      await prisma.playerMvpRanking.upsert({
        where: {
          playerId_seasonId: {
            playerId,
            seasonId,
          },
        },
        update: {
          kda: Math.round(seasonKda * 100) / 100,
          winRate: Math.round(seasonWinRate * 100) / 100,
          mvpCount: seasonMvps,
          hero: seasonMostUsedHero,
        },
        create: {
          playerId,
          seasonId,
          rank: 0, // Will be updated in ranking recalculation
          kda: Math.round(seasonKda * 100) / 100,
          winRate: Math.round(seasonWinRate * 100) / 100,
          mvpCount: seasonMvps,
          hero: seasonMostUsedHero,
        },
      });
    }
  }
}

// Recalculate all player rankings for a season
async function updateSeasonPlayerRankings(seasonId: string) {
  // Get all player rankings for this season
  const rankings = await prisma.playerMvpRanking.findMany({
    where: { seasonId },
    orderBy: [
      { mvpCount: "desc" },
      { kda: "desc" },
      { winRate: "desc" },
    ],
  });

  // Update ranks
  for (let i = 0; i < rankings.length; i++) {
    await prisma.playerMvpRanking.update({
      where: { id: rankings[i].id },
      data: { rank: i + 1 },
    });
  }

  // Also update TeamStanding rankings (by points, then by head-to-head if needed)
  const teamStandings = await prisma.teamStanding.findMany({
    where: { seasonId },
    orderBy: [
      { points: "desc" },
      { wins: "desc" },
    ],
  });

  for (let i = 0; i < teamStandings.length; i++) {
    await prisma.teamStanding.update({
      where: { id: teamStandings[i].id },
      data: { rank: i + 1 },
    });
  }
}
