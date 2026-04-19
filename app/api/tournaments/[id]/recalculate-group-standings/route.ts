import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tournaments/[id]/recalculate-group-standings
 *
 * Wipes and rebuilds GroupStageStanding for a tournament by replaying
 * every completed / forfeited GROUP_STAGE match. No need to re-enter results.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, pointSystem: true, seasonId: true },
    });
    if (!tournament) return apiError("Tournament not found", 404);

    // Fetch all completed group-stage matches with their game results
    const matches = await prisma.match.findMany({
      where: {
        tournamentId,
        OR: [
          { bracketType: BracketType.GROUP_STAGE },
          { bracketType: null }
        ],
        status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED, MatchStatus.RESTING] },
      },
      select: {
        id: true,
        teamAId: true,
        teamBId: true,
        winnerId: true,
        status: true,
        bestOf: true,
        scheduledTime: true,
        scoreA: true,
        scoreB: true,
        statsFinalized: true,
        gameResults: { select: { winnerTeamId: true, durationSeconds: true } },
      },
    });

    if (matches.length === 0) {
      return apiSuccess({ message: "No completed group-stage matches found — nothing to recalculate.", processed: 0 });
    }

    // Fetch all TournamentGroup memberships for this tournament
    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId },
      include: { teams: { select: { teamId: true } } },
    });

    // Build quick lookup: teamId → groupName
    const teamGroupMap: Record<string, string> = {};

    type StandingAccum = {
      wins: number;
      losses: number;
      draws: number;
      groupPoints: number;
      gameWins: number;
      gameLosses: number;
      fastestWinSeconds: number | null;
    };

    const accum: Record<string, Record<string, StandingAccum>> = {};

    const ensure = (groupName: string, teamId: string) => {
      accum[groupName] ??= {};
      accum[groupName][teamId] ??= {
        wins: 0, losses: 0, draws: 0,
        groupPoints: 0, gameWins: 0, gameLosses: 0,
        fastestWinSeconds: null,
      };
      return accum[groupName][teamId];
    };

    const pointSystem = tournament.pointSystem as string | null;

    if (groups.length > 0) {
      for (const g of groups) {
        for (const t of g.teams) {
          teamGroupMap[t.teamId] = g.name;
          ensure(g.name, t.teamId); // Pre-populate 0-stat teams
        }
      }
    } else {
      // Fallback: If no groups exist, treat the whole tournament as "Group A"
      const registrations = await prisma.tournamentRegistration.findMany({
        where: { tournamentId, status: "APPROVED" }
      });
      for (const r of registrations) {
        teamGroupMap[r.teamId] = "Group A";
        ensure("Group A", r.teamId); // Pre-populate 0-stat teams
      }
    }

    for (const m of matches) {
      const { teamAId, teamBId, winnerId, scoreA, scoreB, gameResults, status, bestOf, scheduledTime } = m;

      // Handle BYE / RESTING matches - ONLY if the scheduled time has passed
      if (status === MatchStatus.RESTING || !teamBId) {
        if (!scheduledTime || new Date(scheduledTime) > new Date()) continue;

        // If it's still marked as RESTING/UPCOMING without an opponent, or hasn't had its season stats finalized yet, physically convert it to a COMPLETED win!
        if (status !== MatchStatus.COMPLETED || !m.statsFinalized) {
          const gameWinsToAward = bestOf ? Math.ceil(bestOf / 2) : 2;
          
          await prisma.$transaction(async (tx) => {
            await tx.match.update({
               where: { id: m.id },
               data: {
                 status: MatchStatus.COMPLETED,
                 winnerId: teamAId,
                 scoreA: gameWinsToAward,
                 scoreB: 0,
                 statsFinalized: true,
               }
            });

            // Retroactively award the win to the Global Season Leaderboard!
            if (tournament.seasonId) {
              await tx.teamStanding.upsert({
                where: { teamId_seasonId: { seasonId: tournament.seasonId, teamId: teamAId } },
                update: {
                  wins: { increment: 1 },
                  points: { increment: 3 }
                },
                create: {
                  seasonId: tournament.seasonId,
                  teamId: teamAId,
                  wins: 1,
                  losses: 0,
                  points: 3,
                  rank: 0
                }
              });

              const matchDate = m.scheduledTime ? new Date(m.scheduledTime) : new Date();
              const year = matchDate.getFullYear();
              const month = matchDate.getMonth() + 1;

              await tx.monthlyStanding.upsert({
                where: { seasonId_teamId_year_month: { seasonId: tournament.seasonId, teamId: teamAId, year, month } },
                update: {
                  wins: { increment: 1 },
                  points: { increment: 3 }
                },
                create: {
                  seasonId: tournament.seasonId,
                  teamId: teamAId,
                  year,
                  month,
                  wins: 1,
                  losses: 0,
                  forfeits: 0,
                  points: 3,
                  rank: 0
                }
              });
            }
          });
        }


        const groupNameA = teamGroupMap[teamAId];
        if (!groupNameA) continue;
        
        const a = ensure(groupNameA, teamAId);
        a.wins++;
        // Award max points for a BYE (usually 3)
        // Adjust bestOf / 2 for game wins if bestOf is undefined (assume 3 means 2 wins)
        a.groupPoints += 3;
        a.gameWins += bestOf ? Math.ceil(bestOf / 2) : 2; 
        continue;
      }

      if (!teamBId) continue;

      const groupNameA = teamGroupMap[teamAId];
      const groupNameB = teamGroupMap[teamBId];
      if (!groupNameA || !groupNameB || groupNameA !== groupNameB) continue; // different groups

      const groupName = groupNameA;

      // Points
      let pointsA = 0;
      let pointsB = 0;
      if (pointSystem === "MLBB_WEIGHTED") {
        if (winnerId === teamAId) {
          pointsA = scoreB === 0 ? 3 : 2;
          pointsB = scoreB > 0 ? 1 : 0;
        } else if (winnerId === teamBId) {
          pointsB = scoreA === 0 ? 3 : 2;
          pointsA = scoreA > 0 ? 1 : 0;
        } else {
          // Draw logic for MLBB weighted (if any draws can exist)
          pointsA = 1;
          pointsB = 1;
        }
      } else {
        pointsA = winnerId === teamAId ? 3 : 0;
        pointsB = winnerId === teamBId ? 3 : 0;
      }

      // Fastest win times
      const minWinA = gameResults
        .filter((gr) => gr.winnerTeamId === teamAId && gr.durationSeconds !== null)
        .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);
      const minWinB = gameResults
        .filter((gr) => gr.winnerTeamId === teamBId && gr.durationSeconds !== null)
        .reduce((min, gr) => Math.min(min, gr.durationSeconds!), Infinity);

      // Accumulate Team A
      const a = ensure(groupName, teamAId);
      if (winnerId === teamAId) a.wins++;
      else if (winnerId === teamBId) a.losses++;
      else a.draws++;
      a.groupPoints += pointsA;
      a.gameWins += scoreA;
      a.gameLosses += scoreB;
      if (minWinA !== Infinity) {
        a.fastestWinSeconds = a.fastestWinSeconds === null ? minWinA : Math.min(a.fastestWinSeconds, minWinA);
      }

      // Accumulate Team B
      const b = ensure(groupName, teamBId);
      if (winnerId === teamBId) b.wins++;
      else if (winnerId === teamAId) b.losses++;
      else b.draws++;
      b.groupPoints += pointsB;
      b.gameWins += scoreB;
      b.gameLosses += scoreA;
      if (minWinB !== Infinity) {
        b.fastestWinSeconds = b.fastestWinSeconds === null ? minWinB : Math.min(b.fastestWinSeconds, minWinB);
      }
    }

    // Wipe existing standings and write fresh ones inside a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing standings for this tournament
      await tx.groupStageStanding.deleteMany({ where: { tournamentId } });

      // Create fresh records
      for (const [groupName, teams] of Object.entries(accum)) {
        for (const [teamId, s] of Object.entries(teams)) {
          await tx.groupStageStanding.create({
            data: {
              tournamentId,
              groupName,
              teamId,
              wins: s.wins,
              losses: s.losses,
              draws: s.draws,
              groupPoints: s.groupPoints,
              gameWins: s.gameWins,
              gameLosses: s.gameLosses,
              fastestWinSeconds: s.fastestWinSeconds,
            },
          });
        }
      }
    });

    const totalTeams = Object.values(accum).reduce((n, g) => n + Object.keys(g).length, 0);

    return apiSuccess({
      message: `Group standings rebuilt from ${matches.length} match(es) across ${totalTeams} team entries.`,
      processed: matches.length,
      teams: totalTeams,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("recalculate-group-standings error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to recalculate standings", 500);
  }
}
