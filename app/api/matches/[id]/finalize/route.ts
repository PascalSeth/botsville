import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { MatchStatus, MainRole, MetaTier, DraftType } from "@/app/generated/prisma/enums";
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
          select: { id: true, seasonId: true, pointSystem: true },
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
        const tid = p.player?.teamId || null;
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
      // Update Hero meta stats for the season
      await updateHeroMeta(seasonId);
    }

    // Update Team & Group Standings (Tournament + Season)
    await updateStandings(matchId);

    // Mark match as stats finalized
    await prisma.match.update({
      where: { id: matchId },
      data: { statsFinalized: true },
    });

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

// Update Hero meta stats for the season based on picks, bans and wins
async function updateHeroMeta(seasonId: string) {
  try {
    // 1. Get all matches for this season
    const matches = await prisma.match.findMany({
      where: {
        tournament: { seasonId },
        status: MatchStatus.COMPLETED,
      },
      select: { id: true },
    });

    const matchIds = matches.map((m) => m.id);
    if (matchIds.length === 0) return;

    // 2. Get total unique games in the season
    // Using MatchPerformance as the source of truth for games played
    const perfGames = await prisma.matchPerformance.groupBy({
      by: ["matchId", "gameNumber"],
      where: { matchId: { in: matchIds } },
    });
    const totalGames = perfGames.length;
    if (totalGames === 0) return;

    // 3. Get total picks and wins per hero
    const perfs = await prisma.matchPerformance.findMany({
      where: { matchId: { in: matchIds } },
      select: { hero: true, won: true },
    });

    const heroStats: Record<string, { picks: number; wins: number; bans: number }> = {};

    for (const p of perfs) {
      if (!heroStats[p.hero]) {
        heroStats[p.hero] = { picks: 0, wins: 0, bans: 0 };
      }
      heroStats[p.hero].picks++;
      if (p.won) {
        heroStats[p.hero].wins++;
      }
    }

    // 4. Get total bans per hero from MatchDraft
    const bans = await prisma.matchDraft.findMany({
      where: { 
        matchId: { in: matchIds },
        type: DraftType.BAN 
      },
      select: { hero: true },
    });

    for (const b of bans) {
      if (!heroStats[b.hero]) {
        heroStats[b.hero] = { picks: 0, wins: 0, bans: 0 };
      }
      heroStats[b.hero].bans++;
    }

    // 5. Update or create HeroMeta entries
    for (const [heroName, stats] of Object.entries(heroStats)) {
      const pickRate = stats.picks / totalGames;
      const banRate = stats.bans / totalGames;
      const winRate = stats.picks > 0 ? stats.wins / stats.picks : 0;

      // Logic for Tier assignment
      // Score based on winRate (weighted), pickRate and banRate (popularity)
      const score = (winRate * 0.5) + (pickRate * 0.3) + (banRate * 0.2);
      
      let tier: MetaTier = MetaTier.C;
      if (score >= 0.55 || (winRate > 0.6 && pickRate > 0.1)) tier = MetaTier.S_PLUS;
      else if (score >= 0.45) tier = MetaTier.S;
      else if (score >= 0.35) tier = MetaTier.A;
      else if (score >= 0.25) tier = MetaTier.B;

      // Get primary role for hero
      const role = HERO_ROLE_MAPPING[heroName] || MainRole.MID;

      await prisma.heroMeta.upsert({
        where: {
          hero_seasonId: {
            hero: heroName,
            seasonId,
          },
        },
        update: {
          pickRate,
          banRate,
          winRate,
          tier,
          role,
        },
        create: {
          hero: heroName,
          seasonId,
          pickRate,
          banRate,
          winRate,
          tier,
          role,
        },
      });
    }
  } catch (error) {
    console.error("Error updating HeroMeta:", error);
  }
}

// Update Tournament Group Standings and Season Standings based on match result
async function updateStandings(matchId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        winner: true,
        gameResults: true,
        tournament: {
          select: { id: true, seasonId: true, pointSystem: true }
        },
      }
    });


    if (!match || !match.tournament) return;

    const { id: tournamentId, seasonId, pointSystem } = match.tournament;
    const teamAId = match.teamAId;
    const teamBId = match.teamBId;
    const winnerId = match.winnerId;

    // Calculate Points based on stats
    const scoreA = match.scoreA || 0;
    const scoreB = match.scoreB || 0;
    const isDraw = !winnerId;
    
    let pointsToAddA = 0;
    let pointsToAddB = 0;

    if (isDraw) {
      pointsToAddA = 1;
      pointsToAddB = 1;
    } else if (pointSystem === 'MLBB_WEIGHTED') {
      // Dynamic Points System
      if (winnerId === teamAId) {
        pointsToAddA = scoreB === 0 ? 3 : 2;
        pointsToAddB = scoreB > 0 ? 1 : 0;
      } else if (winnerId === teamBId) {
        pointsToAddB = scoreA === 0 ? 3 : 2;
        pointsToAddA = scoreA > 0 ? 1 : 0;
      }
    } else {
      // Standard 3/1/0
      pointsToAddA = winnerId === teamAId ? 3 : 0;
      pointsToAddB = winnerId === teamBId ? 3 : 0;
    }

    // New stats calculation
    const gamesWonByA = scoreA;
    const gamesWonByB = scoreB;
    
    const minWinTimeA = match.gameResults
      .filter(gr => gr.winnerTeamId === teamAId && gr.durationSeconds)
      .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);
    
    const minWinTimeB = match.gameResults
      .filter(gr => gr.winnerTeamId === teamBId && gr.durationSeconds)
      .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);


    // ── 1. Update Group Stage Standings (Tournament Level) ──
    // Only if match is tagged as a group stage match
    if (match.bracketType === 'GROUP_STAGE') {
      // Find which group these teams are in
      const groupA = await prisma.tournamentGroup.findFirst({
        where: { tournamentId, teams: { some: { teamId: teamAId } } }
      });
      const groupB = teamBId 
        ? await prisma.tournamentGroup.findFirst({
            where: { tournamentId, teams: { some: { teamId: teamBId } } }
          })
        : null;

      // Usually they are in the same group
      if (groupA && groupB && groupA.id === groupB.id) {
        const groupName = groupA.name;

        // Upsert for Team A
        await prisma.groupStageStanding.upsert({
          where: { tournamentId_groupName_teamId: { tournamentId, groupName, teamId: teamAId } },
          update: {
            losses: { increment: winnerId === teamBId ? 1 : 0 },
            draws: { increment: !winnerId ? 1 : 0 },
            groupPoints: { increment: pointsToAddA },
            gameWins: { increment: gamesWonByA },
            gameLosses: { increment: gamesWonByB },
            fastestWinSeconds: minWinTimeA !== Infinity ? { set: minWinTimeA } : undefined, // Simplification: we'll handle actual min check in Standings API or here
          },
          create: {
            tournamentId,
            groupName,
            teamId: teamAId,
            wins: winnerId === teamAId ? 1 : 0,
            losses: winnerId === teamBId ? 1 : 0,
            draws: !winnerId ? 1 : 0,
            groupPoints: pointsToAddA,
            gameWins: gamesWonByA,
            gameLosses: gamesWonByB,
            fastestWinSeconds: minWinTimeA !== Infinity ? minWinTimeA : null,
          }
        });


        // Upsert for Team B
        if (teamBId) {
          await prisma.groupStageStanding.upsert({
            where: { tournamentId_groupName_teamId: { tournamentId, groupName, teamId: teamBId } },
            update: {
              losses: { increment: winnerId === teamAId ? 1 : 0 },
              draws: { increment: !winnerId ? 1 : 0 },
              groupPoints: { increment: pointsToAddB },
              gameWins: { increment: gamesWonByB },
              gameLosses: { increment: gamesWonByA },
              fastestWinSeconds: minWinTimeB !== Infinity ? { set: minWinTimeB } : undefined,
            },
            create: {
              tournamentId,
              groupName,
              teamId: teamBId,
              wins: winnerId === teamBId ? 1 : 0,
              losses: winnerId === teamAId ? 1 : 0,
              draws: !winnerId ? 1 : 0,
              groupPoints: pointsToAddB,
              gameWins: gamesWonByB,
              gameLosses: gamesWonByA,
              fastestWinSeconds: minWinTimeB !== Infinity ? minWinTimeB : null,
            }
          });

        }
      }
    }

    // ── 2. Update Team Standings (Season Level) ──
    // Points count 1-1 to the season ranking as requested
    // (using the same point system logic as above)


    // Update Team A Season Standing
    await prisma.teamStanding.upsert({
      where: { teamId_seasonId: { seasonId, teamId: teamAId } },
      update: {
        wins: { increment: winnerId === teamAId ? 1 : 0 },
        losses: { increment: winnerId === teamBId ? 1 : 0 },
        points: { increment: pointsToAddA },
      },
      create: {
        seasonId,
        teamId: teamAId,
        wins: winnerId === teamAId ? 1 : 0,
        losses: winnerId === teamBId ? 1 : 0,
        points: pointsToAddA,
        rank: 0,
      }
    });

    // Update Team B Season Standing
    if (teamBId) {
      await prisma.teamStanding.upsert({
        where: { teamId_seasonId: { seasonId, teamId: teamBId } },
        update: {
          wins: { increment: winnerId === teamBId ? 1 : 0 },
          losses: { increment: winnerId === teamAId ? 1 : 0 },
          points: { increment: pointsToAddB },
        },
        create: {
          seasonId,
          teamId: teamBId,
          wins: winnerId === teamBId ? 1 : 0,
          losses: winnerId === teamAId ? 1 : 0,
          points: pointsToAddB,
          rank: 0,
        }
      });
    }

    // ── 3. Update Monthly Standings ──
    if (seasonId) {
      const matchDate = match.scheduledTime ? new Date(match.scheduledTime) : new Date();
      const year = matchDate.getFullYear();
      const month = matchDate.getMonth() + 1;

      // Upsert monthly for Team A
      await prisma.monthlyStanding.upsert({
        where: { seasonId_teamId_year_month: { seasonId, teamId: teamAId, year, month } },
        update: {
          wins: { increment: winnerId === teamAId ? 1 : 0 },
          losses: { increment: winnerId === teamBId ? 1 : 0 },
          points: { increment: pointsToAddA },
        },
        create: {
          seasonId,
          teamId: teamAId,
          year,
          month,
          wins: winnerId === teamAId ? 1 : 0,
          losses: winnerId === teamBId ? 1 : 0,
          points: pointsToAddA,
          rank: 0,
        }
      });

      // Upsert monthly for Team B
      if (teamBId) {
        await prisma.monthlyStanding.upsert({
          where: { seasonId_teamId_year_month: { seasonId, teamId: teamBId, year, month } },
          update: {
            wins: { increment: winnerId === teamBId ? 1 : 0 },
            losses: { increment: winnerId === teamAId ? 1 : 0 },
            points: { increment: pointsToAddB },
          },
          create: {
            seasonId,
            teamId: teamBId,
            year,
            month,
            wins: winnerId === teamBId ? 1 : 0,
            losses: winnerId === teamAId ? 1 : 0,
            points: pointsToAddB,
            rank: 0,
          }
        });
      }
    }

    // Finally, refresh ranks
    await updateSeasonPlayerRankings(seasonId);
  } catch (error) {
    console.error("Error updating standings in finalize:", error);
  }
}

// Map of heroes to their primary lane/role in MLBB Meta context
const HERO_ROLE_MAPPING: Record<string, MainRole> = {
  // EXP Lane (Fighters/Tanks)
  "Akai": MainRole.ROAM, "Aldous": MainRole.EXP, "Alpha": MainRole.JUNGLE, "Argus": MainRole.EXP, "Arlott": MainRole.EXP, 
  "Badang": MainRole.EXP, "Balmond": MainRole.JUNGLE, "Bane": MainRole.EXP, "Barats": MainRole.JUNGLE, "Baxia": MainRole.JUNGLE, 
  "Belerick": MainRole.ROAM, "Benedetta": MainRole.EXP, "Chou": MainRole.EXP, "Dyrroth": MainRole.EXP, "Edith": MainRole.EXP, 
  "Esmeralda": MainRole.EXP, "Freya": MainRole.JUNGLE, "Gatotkaca": MainRole.ROAM, "Gloo": MainRole.EXP, "Guinevere": MainRole.JUNGLE, 
  "Hilda": MainRole.ROAM, "Jawhead": MainRole.JUNGLE, "Joy": MainRole.JUNGLE, "Julian": MainRole.EXP, "Khaleed": MainRole.EXP, 
  "Lapu-Lapu": MainRole.EXP, "Leomord": MainRole.JUNGLE, "Martis": MainRole.JUNGLE, "Masha": MainRole.EXP, "Minsitthar": MainRole.ROAM, 
  "Paquito": MainRole.EXP, "Phoveus": MainRole.EXP, "Ruby": MainRole.EXP, "Silvanna": MainRole.EXP, "Sun": MainRole.EXP, 
  "Terizla": MainRole.EXP, "Thamuz": MainRole.EXP, "Uranus": MainRole.EXP, "X.Borg": MainRole.EXP, "Yu Zhong": MainRole.EXP, "Zilong": MainRole.EXP,
  
  // Jungle (Assassins/Fighters)
  "Aamon": MainRole.JUNGLE, "Fanny": MainRole.JUNGLE, "Gusion": MainRole.JUNGLE, "Hanzo": MainRole.JUNGLE, "Harley": MainRole.JUNGLE, 
  "Hayabusa": MainRole.JUNGLE, "Helcurt": MainRole.JUNGLE, "Karina": MainRole.JUNGLE, "Lancelot": MainRole.JUNGLE, "Ling": MainRole.JUNGLE, 
  "Natalia": MainRole.ROAM, "Nolan": MainRole.JUNGLE, "Roger": MainRole.JUNGLE, "Saber": MainRole.JUNGLE, "Yin": MainRole.JUNGLE, 
  "Yi Sun-shin": MainRole.JUNGLE, "Granger": MainRole.JUNGLE, "Fredrinn": MainRole.JUNGLE,
  
  // Mid Lane (Mages)
  "Alice": MainRole.MID, "Aurora": MainRole.MID, "Cecilion": MainRole.MID, "Chang'e": MainRole.MID, "Cyclops": MainRole.MID, 
  "Eudora": MainRole.MID, "Faramis": MainRole.MID, "Gord": MainRole.MID, "Harith": MainRole.MID, "Kadita": MainRole.MID, 
  "Kagura": MainRole.MID, "Lunox": MainRole.MID, "Luo Yi": MainRole.MID, "Lylia": MainRole.MID, "Nana": MainRole.MID, 
  "Novaria": MainRole.MID, "Odette": MainRole.MID, "Pharsa": MainRole.MID, "Valentina": MainRole.MID, "Valir": MainRole.MID, 
  "Vale": MainRole.MID, "Vexana": MainRole.MID, "Xavier": MainRole.MID, "Yve": MainRole.MID, "Zhask": MainRole.MID, "Zhuxin": MainRole.MID,
  
  // Gold Lane (Marksmen)
  "Beatrix": MainRole.GOLD, "Brody": MainRole.GOLD, "Bruno": MainRole.GOLD, "Claude": MainRole.GOLD, "Clint": MainRole.GOLD, 
  "Hanabi": MainRole.GOLD, "Irithel": MainRole.GOLD, "Karrie": MainRole.GOLD, "Layla": MainRole.GOLD, "Lesley": MainRole.GOLD, 
  "Melissa": MainRole.GOLD, "Miya": MainRole.GOLD, "Moskov": MainRole.GOLD, "Natan": MainRole.GOLD, "Popol and Kupa": MainRole.GOLD, 
  "Wanwan": MainRole.GOLD, "Ixia": MainRole.GOLD, "Cici": MainRole.EXP,
  
  // Roaming (Tanks/Supports)
  "Atlas": MainRole.ROAM, "Carmilla": MainRole.ROAM, "Diggie": MainRole.ROAM, "Estes": MainRole.ROAM, "Floryn": MainRole.ROAM, 
  "Franco": MainRole.ROAM, "Hylos": MainRole.ROAM, "Johnson": MainRole.ROAM, "Kaja": MainRole.ROAM, "Khufra": MainRole.ROAM, 
  "Lolita": MainRole.ROAM, "Minotaur": MainRole.ROAM, "Rafaela": MainRole.ROAM, "Tigreal": MainRole.ROAM, "Angela": MainRole.ROAM, "Selena": MainRole.ROAM,
};
