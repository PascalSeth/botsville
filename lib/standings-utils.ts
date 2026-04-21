import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/app/generated/prisma/enums";

/**
 * Calculates points for a single match based on the point system.
 */
export function calculateMatchPoints(match: {
  status: MatchStatus;
  winnerId: string | null;
  teamAId: string;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  isDraw?: boolean;
  tournament: { pointSystem: string };
}) {
  const { teamAId, teamBId, winnerId, scoreA, scoreB, tournament, status } = match;
  
  let pointsA = 0;
  let pointsB = 0;
  let winsA = 0;
  let winsB = 0;
  let lossesA = 0;
  let lossesB = 0;
  let draws = 0;

  const isCompleted = status === MatchStatus.COMPLETED || status === MatchStatus.FORFEITED;
  const isForfeit = status === MatchStatus.FORFEITED;
  const isBye = !teamBId || status === MatchStatus.RESTING;
  const isDraw = !!match.isDraw || (!winnerId && status === MatchStatus.COMPLETED);

  if (!isCompleted && !isBye) return { pointsA, pointsB, winsA, winsB, lossesA, lossesB, draws };

  if (isBye) {
    // Byes always give 3 points and 1 win
    pointsA = 3;
    winsA = 1;
    return { pointsA, pointsB, winsA, winsB, lossesA, lossesB, draws };
  }

  if (!teamBId) return { pointsA, pointsB, winsA, winsB, lossesA, lossesB, draws };

  // Determine points
  if (isForfeit) {
    if (winnerId === teamAId) { 
      pointsA = 3; 
      pointsB = -1; // Negative penalty for forfeit
      winsA = 1; 
      lossesB = 1; 
    }
    else if (winnerId === teamBId) { 
      pointsA = -1; // Negative penalty for forfeit
      pointsB = 3; 
      winsB = 1; 
      lossesA = 1; 
    }
  } else if (isDraw) {
    pointsA = 1; pointsB = 1; draws = 1;
  } else if (tournament.pointSystem === "MLBB_WEIGHTED") {
    if (winnerId === teamAId) {
      pointsA = (scoreB === 0) ? 3 : 2;
      pointsB = (scoreB > 0) ? 1 : 0;
      winsA = 1; 
      lossesB = 1;
    } else if (winnerId === teamBId) {
      pointsB = (scoreA === 0) ? 3 : 2;
      pointsA = (scoreA > 0) ? 1 : 0;
      winsB = 1; 
      lossesA = 1;
    }
  } else {
    // Standard 3/1/0
    if (winnerId === teamAId) { pointsA = 3; pointsB = 0; winsA = 1; lossesB = 1; }
    else if (winnerId === teamBId) { pointsA = 0; pointsB = 3; winsB = 1; lossesA = 1; }
  }

  return { pointsA, pointsB, winsA, winsB, lossesA, lossesB, draws };
}

/**
 * Recalculates and updates standings for a specific team in a specific season.
 * This is IDEMPOTENT — it always derives current standings from match history.
 */
export async function recalculateTeamSeasonStandings(teamId: string, seasonId: string) {
  // 1. Fetch all completed/forfeited/resting matches for this team in this season
  const matches = await prisma.match.findMany({
    where: {
      tournament: { seasonId },
      OR: [
        { teamAId: teamId },
        { teamBId: teamId }
      ],
      status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED, MatchStatus.RESTING] },
    },
    include: {
      tournament: { select: { pointSystem: true } },
    },
  });

  let totalPoints = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let totalForfeits = 0;

  // 2. Map and aggregate stats
  const monthlyStats: Record<string, { points: number; wins: number; losses: number; year: number; month: number }> = {};

  for (const m of matches) {
    const isTeamA = m.teamAId === teamId;
    const stats = calculateMatchPoints(m);
    
    const p = isTeamA ? stats.pointsA : stats.pointsB;
    const w = isTeamA ? stats.winsA : stats.winsB;
    const l = isTeamA ? stats.lossesA : stats.lossesB;
    const d = stats.draws;
    
    totalPoints += p;
    totalWins += w;
    totalLosses += l;
    totalDraws += d;

    if (m.status === MatchStatus.FORFEITED && m.forfeitedById === teamId) {
      totalForfeits++;
    }

    // Monthly breakdown
    const date = m.scheduledTime ? new Date(m.scheduledTime) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!monthlyStats[key]) {
      monthlyStats[key] = { points: 0, wins: 0, losses: 0, year, month };
    }
    monthlyStats[key].points += p;
    monthlyStats[key].wins += w;
    monthlyStats[key].losses += l;
  }

  // 3. Persist Season Standing
  await prisma.teamStanding.upsert({
    where: { teamId_seasonId: { teamId, seasonId } },
    update: {
      points: totalPoints,
      wins: totalWins,
      losses: totalLosses,
      forfeits: totalForfeits,
    },
    create: {
      teamId,
      seasonId,
      points: totalPoints,
      wins: totalWins,
      losses: totalLosses,
      forfeits: totalForfeits,
      rank: 0, // Rank is usually updated by a global sweep or the UI
    }
  });

  // 4. Persist Monthly Standings
  for (const stats of Object.values(monthlyStats)) {
    await prisma.monthlyStanding.upsert({
      where: { 
        seasonId_teamId_year_month: { 
          seasonId, 
          teamId, 
          year: stats.year, 
          month: stats.month 
        } 
      },
      update: {
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses,
      },
      create: {
        seasonId,
        teamId,
        year: stats.year,
        month: stats.month,
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses,
        rank: 0,
      }
    });
  }

  // 5. Update Group Stage Standings (Tournament Level)
  // Fetch all group stage matches for this team in this tournament to update their group-specific records
  for (const m of matches) {
    if (m.bracketType === 'GROUP_STAGE') {
      // Find the group name for this team in this tournament
      const groupTeam = await prisma.tournamentGroupTeam.findFirst({
        where: { 
          group: { tournamentId: m.tournamentId }, 
          teamId 
        },
        include: { group: true }
      });

      if (groupTeam?.group) {
        const groupName = groupTeam.group.name;
        
        // Fetch all group matches for THIS SPECIFIC group and team to get total group points
        const groupMatches = await prisma.match.findMany({
            where: {
                tournamentId: m.tournamentId,
                bracketType: 'GROUP_STAGE',
                OR: [{ teamAId: teamId }, { teamBId: teamId }],
                status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED] }
            },
            include: { tournament: { select: { pointSystem: true } } }
        });

        let gPoints = 0, gWins = 0, gLosses = 0, gDraws = 0, gGameWins = 0, gGameLosses = 0;
        let fastestWin = null;

        for (const gm of groupMatches) {
            const isTmA = gm.teamAId === teamId;
            const gStats = calculateMatchPoints(gm);
            gPoints += isTmA ? gStats.pointsA : gStats.pointsB;
            gWins += isTmA ? gStats.winsA : gStats.winsB;
            gLosses += isTmA ? gStats.lossesA : gStats.lossesB;
            gDraws += gStats.draws;
            gGameWins += isTmA ? gm.scoreA : gm.scoreB;
            gGameLosses += isTmA ? gm.scoreB : gm.scoreA;
        }

        await prisma.groupStageStanding.upsert({
          where: { 
            tournamentId_groupName_teamId: { 
              tournamentId: m.tournamentId, 
              groupName, 
              teamId 
            } 
          },
          update: {
            groupPoints: gPoints,
            wins: gWins,
            losses: gLosses,
            draws: gDraws,
            gameWins: gGameWins,
            gameLosses: gGameLosses,
          },
          create: {
            tournamentId: m.tournamentId,
            groupName,
            teamId,
            groupPoints: gPoints,
            wins: gWins,
            losses: gLosses,
            draws: gDraws,
            gameWins: gGameWins,
            gameLosses: gGameLosses,
          }
        });
      }
      
      // We only need to do the group update calculation once per tournament/team, 
      // but group stage matches are usually in one tournament anyway.
      // We break here because we only need to find the group once per team.
      break; 
    }
  }

  return { totalPoints, totalWins };
}
