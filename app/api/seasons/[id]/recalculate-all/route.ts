import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { MatchStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/seasons/[id]/recalculate-all
 * 
 * The "Nuclear Option":
 * 1. Finds all completed matches in the season.
 * 2. Recalculates Points, Wins, Losses for every team.
 * 3. Rebuilds TeamStanding and MonthlyStanding from scratch.
 * 4. Ensures everything is 100% consistent with match results.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: seasonId } = await params;

    // Fetch all teams registered for this season to ensure they are present in standings
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournament: { seasonId }, status: "APPROVED" },
      select: { teamId: true },
    });
    
    // Fetch all completed/forfeited/resting matches in this season
    const matches = await prisma.match.findMany({
      where: {
        tournament: { seasonId },
        status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED, MatchStatus.RESTING] },
      },
      include: {
        tournament: { select: { pointSystem: true } },
      },
    });

    const teamSeasonStats: Record<string, { wins: number; losses: number; points: number; forfeits: number }> = {};
    const teamMonthlyStats: Record<string, Record<string, { wins: number; losses: number; points: number; forfeits: number }>> = {};

    function ensureSeason(teamId: string) {
      teamSeasonStats[teamId] ??= { wins: 0, losses: 0, points: 0, forfeits: 0 };
    }
    function ensureMonthly(teamId: string, key: string) {
      teamMonthlyStats[teamId] ??= {};
      teamMonthlyStats[teamId][key] ??= { wins: 0, losses: 0, points: 0, forfeits: 0 };
    }

    // Pre-populate with all registered teams
    for (const reg of registrations) {
      ensureSeason(reg.teamId);
    }

    for (const m of matches) {
      if (!m.teamAId) continue;
      
      const date = m.scheduledTime ? new Date(m.scheduledTime) : new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      // For RESTING matches, we only award points if the date has passed
      const isResting = m.status === MatchStatus.RESTING || !m.teamBId;
      if (isResting) {
        if (date > new Date()) continue; // Skip future byes
        
        ensureSeason(m.teamAId);
        ensureMonthly(m.teamAId, monthKey);
        
        teamSeasonStats[m.teamAId].wins++;
        teamSeasonStats[m.teamAId].points += 3; // Bye is always 3 pts
        teamMonthlyStats[m.teamAId][monthKey].wins++;
        teamMonthlyStats[m.teamAId][monthKey].points += 3;
        continue;
      }

      // Regular match MUST have both teams
      if (!m.teamBId) continue;

      const isDraw = m.isDraw || (!m.winnerId && m.status === MatchStatus.COMPLETED);
      const pointSystem = m.tournament.pointSystem;
      const isForfeit = m.status === MatchStatus.FORFEITED;

      ensureSeason(m.teamAId);
      ensureSeason(m.teamBId);
      ensureMonthly(m.teamAId, monthKey);
      ensureMonthly(m.teamBId, monthKey);

      // Points calculation
      let pointsA = 0;
      let pointsB = 0;

      if (isForfeit) {
        if (m.winnerId === m.teamAId) { pointsA = 3; pointsB = 0; }
        else { pointsA = 0; pointsB = 3; }
      } else if (isDraw) {
        pointsA = 1; pointsB = 1;
      } else if (pointSystem === "MLBB_WEIGHTED") {
        if (m.winnerId === m.teamAId) {
          pointsA = (m.scoreB === 0) ? 3 : 2;
          pointsB = (m.scoreB > 0) ? 1 : 0;
        } else {
          pointsB = (m.scoreA === 0) ? 3 : 2;
          pointsA = (m.scoreA > 0) ? 1 : 0;
        }
      } else {
        if (m.winnerId === m.teamAId) { pointsA = 3; pointsB = 0; }
        else { pointsA = 0; pointsB = 3; }
      }

      // Update Season & Monthly Stats
      teamSeasonStats[m.teamAId].points += pointsA;
      teamMonthlyStats[m.teamAId][monthKey].points += pointsA;
      teamSeasonStats[m.teamBId].points += pointsB;
      teamMonthlyStats[m.teamBId][monthKey].points += pointsB;

      if (!isDraw) {
        if (m.winnerId === m.teamAId) {
          teamSeasonStats[m.teamAId].wins++;
          teamMonthlyStats[m.teamAId][monthKey].wins++;
          teamSeasonStats[m.teamBId].losses++;
          teamMonthlyStats[m.teamBId][monthKey].losses++;
        } else if (m.winnerId === m.teamBId) {
          teamSeasonStats[m.teamBId].wins++;
          teamMonthlyStats[m.teamBId][monthKey].wins++;
          teamSeasonStats[m.teamAId].losses++;
          teamMonthlyStats[m.teamAId][monthKey].losses++;
        }
      }

      if (isForfeit && m.forfeitedById) {
        teamSeasonStats[m.forfeitedById].forfeits++;
        teamMonthlyStats[m.forfeitedById][monthKey].forfeits++;
      }
    }

    // 5. Database Update (Nuclear Recalculation)
    console.time("db_update");
    await prisma.$transaction(async (tx) => {
      // Step 1: Clean slate for this season
      await tx.teamStanding.deleteMany({ where: { seasonId } });
      await tx.monthlyStanding.deleteMany({ where: { seasonId } });

      // Step 2: Prepare & Sort Season Standings for Ranking
      const seasonStandingsData = Object.entries(teamSeasonStats)
        .map(([teamId, stats]) => ({
          seasonId,
          teamId,
          wins: stats.wins,
          losses: stats.losses,
          points: stats.points,
          forfeits: stats.forfeits,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.losses - b.losses; // fewer losses is better
        })
        .map((standing, index) => ({
          ...standing,
          rank: index + 1,
        }));

      if (seasonStandingsData.length > 0) {
        await tx.teamStanding.createMany({
          data: seasonStandingsData,
        });

        // Step 2.5: Synchronize Season Awards Podium (Top 3)
        const champion = seasonStandingsData[0]?.teamId;
        const runnerUp = seasonStandingsData[1]?.teamId;
        const thirdPlace = seasonStandingsData[2]?.teamId;

        await tx.seasonAwards.upsert({
          where: { seasonId },
          create: {
            seasonId,
            championTeamId: champion || null,
            runnerUpTeamId: runnerUp || null,
            thirdPlaceTeamId: thirdPlace || null,
          },
          update: {
            championTeamId: champion || null,
            runnerUpTeamId: runnerUp || null,
            thirdPlaceTeamId: thirdPlace || null,
            updatedAt: new Date(),
          },
        });
      }

      // Step 3: Prepare Bulk Data for Monthly Standings
      const monthlyStandingsData: any[] = [];
      for (const [teamId, months] of Object.entries(teamMonthlyStats)) {
        for (const [monthKey, stats] of Object.entries(months)) {
          const [year, month] = monthKey.split("-").map(Number);
          if (isNaN(year) || isNaN(month)) continue;
          
          monthlyStandingsData.push({
            seasonId,
            teamId,
            year,
            month,
            wins: stats.wins,
            losses: stats.losses,
            points: stats.points,
            forfeits: stats.forfeits,
            rank: 0, // monthly ranks are usually handled by the UI/view
          });
        }
      }

      if (monthlyStandingsData.length > 0) {
        await tx.monthlyStanding.createMany({
          data: monthlyStandingsData,
        });
      }
    }, {
      timeout: 30000, // 30 second timeout for large seasons
    });
    console.timeEnd("db_update");

    return apiSuccess({ message: "Season and Monthly standings fully recalculated.", matchesProcessed: matches.length });
  } catch (err) {
    console.error("recalculate-all error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to recalculate", 500);
  }
}
