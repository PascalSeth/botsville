import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { MatchStatus } from "@/app/generated/prisma/enums";
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

    // Compute per-game winners from performances (each performance has .won boolean)
    const winsByTeam: Record<string, number> = {};
    const games = [...new Set(match.performances.map((p) => p.gameNumber))];
    for (const g of games) {
      const perfs = match.performances.filter((p) => p.gameNumber === g);
      // Determine which team won this game by counting 'won' occurrences per player's team
      const teamWinCounts: Record<string, number> = {};
      for (const p of perfs) {
        // use player.teamId if available
        const tid = (p.player && (p.player as any).teamId) || (p.player && (p.player as any).team?.id) || null;
        if (p.won && tid) {
          teamWinCounts[tid] = (teamWinCounts[tid] || 0) + 1;
        }
      }
      const winnerTeamId = Object.keys(teamWinCounts).sort((a, b) => (teamWinCounts[b] || 0) - (teamWinCounts[a] || 0))[0];
      if (winnerTeamId) winsByTeam[winnerTeamId] = (winsByTeam[winnerTeamId] || 0) + 1;
    }

    // If we have computed wins, update match score and winner accordingly
    if (Object.keys(winsByTeam).length > 0) {
      const scoreA = winsByTeam[match.teamA?.id || ''] || 0;
      const scoreB = winsByTeam[match.teamB?.id || ''] || 0;
      let winnerId: string | null = null;
      if (scoreA > scoreB) winnerId = match.teamA?.id ?? null;
      if (scoreB > scoreA) winnerId = match.teamB?.id ?? null;

      // Update match record if not already completed
      if (match.status !== MatchStatus.COMPLETED && match.status !== MatchStatus.FORFEITED) {
        await prisma.match.update({
          where: { id: matchId },
          data: {
            scoreA,
            scoreB,
            status: MatchStatus.COMPLETED,
            ...(winnerId ? { winner: { connect: { id: winnerId } } } : {}),
          },
        });
      }
    }

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

  // Calculate smoothed, weighted KDA:
  // Use assist weight, death-floor per-game, and small Bayesian prior to reduce volatility for few games.
  const ASSIST_WEIGHT = 0.5;
  const PRIOR_NUM = 2; // small prior added to numerator
  const PRIOR_DEN = 1; // small prior added to denominator

  // Use death-floor per game for denominator accumulation
  const totalDeathsAdjusted = performances.reduce((sum, p) => sum + Math.max(1, p.deaths), 0);
  const numerator = totalKills + totalAssists * ASSIST_WEIGHT + PRIOR_NUM;
  const denominator = totalDeathsAdjusted + PRIOR_DEN;
  const kda = numerator / denominator;
  
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

      const seasonDeathsAdjusted = seasonPerformances.reduce((s, p) => s + Math.max(1, p.deaths), 0);
      const seasonKda = (seasonKills + seasonAssists * ASSIST_WEIGHT + PRIOR_NUM) / (seasonDeathsAdjusted + PRIOR_DEN);
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
