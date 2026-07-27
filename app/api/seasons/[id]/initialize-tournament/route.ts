import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import {
  AdminRoleType,
  TournamentFormat,
  TournamentStatus,
  MatchStatus,
  StageType,
  StageStatus,
  PointSystem,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  generateRoundRobinSchedule,
  buildSingleEliminationBracket,
  buildDoubleEliminationBracket,
  divideTeamsIntoGroups,
  buildGroupStageSchedule,
  generateSwissRoundPairings,
} from "@/lib/tournament-engine";

/**
 * POST /api/seasons/[id]/initialize-tournament
 *
 * UNIFIED TOURNAMENT LAUNCH ENDPOINT
 * Creates a Tournament + TournamentStage + Rounds + Matches for ANY format and ANY number of teams.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id: seasonId } = await context.params;
    const body = await request.json();

    const {
      tournamentName,
      format, // SINGLE_ELIMINATION | DOUBLE_ELIMINATION | ROUND_ROBIN | GROUP_STAGE | SWISS
      teamIds,
      startDate: inputStartDate,
      defaultBestOf = 3,
      pointSystem = PointSystem.MLBB_WEIGHTED,
      // Group stage params
      numGroups,
      drawMode = "SEEDED",
      manualGroups,
      // Swiss params
      swissRounds,
      // Double elim params
      seedingByesCount,
    }: {
      tournamentName?: string;
      format: TournamentFormat;
      teamIds: string[];
      startDate?: string;
      defaultBestOf?: number;
      pointSystem?: PointSystem;
      numGroups?: number;
      drawMode?: "SEEDED" | "RANDOM" | "MANUAL";
      manualGroups?: Record<string, string[]>;
      swissRounds?: number;
      seedingByesCount?: number;
    } = body;

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      return apiError("At least 2 registered teams required");
    }

    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return apiError("Season not found", 404);

    const startDate = inputStartDate ? new Date(inputStartDate) : new Date(season.startDate);
    if (isNaN(startDate.getTime())) return apiError("Invalid startDate");

    // Verify teams exist
    const validTeams = await prisma.team.findMany({
      where: { id: { in: teamIds }, deletedAt: null },
      select: { id: true, name: true, tag: true },
    });
    if (validTeams.length !== teamIds.length) {
      return apiError("One or more team IDs are invalid");
    }

    const name = (tournamentName && tournamentName.trim()) ? tournamentName.trim() : `${season.name} — ${format.replace(/_/g, " ")}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tournament record
      const tournament = await tx.tournament.create({
        data: {
          seasonId,
          name,
          format,
          location: "Online",
          isOnline: true,
          date: startDate,
          registrationDeadline: startDate,
          slots: teamIds.length,
          filled: teamIds.length,
          status: TournamentStatus.ONGOING,
          pointSystem,
          defaultBestOf,
          banner: body.banner || null,
          heroImage: body.heroImage || null,
          prizePool: body.prizePool || null,
          rules: body.rules || [],
        },
      });

      // 2. Register all teams
      await tx.tournamentRegistration.createMany({
        data: teamIds.map((teamId, idx) => ({
          tournamentId: tournament.id,
          teamId,
          status: "APPROVED" as const,
          seed: idx + 1,
        })),
        skipDuplicates: true,
      });

      // 3. Create Primary Stage
      let stageType: StageType = StageType.ROUND_ROBIN;
      if (format === TournamentFormat.SINGLE_ELIMINATION) stageType = StageType.SINGLE_ELIMINATION;
      if (format === TournamentFormat.DOUBLE_ELIMINATION) stageType = StageType.DOUBLE_ELIMINATION;
      if (format === TournamentFormat.GROUP_STAGE) stageType = StageType.GROUP_STAGE;
      if (format === TournamentFormat.SWISS) stageType = StageType.SWISS;

      const stage = await tx.tournamentStage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 1",
          order: 1,
          stageType,
          status: StageStatus.ACTIVE,
          format,
          defaultBestOf,
          pointSystem,
          numGroups: numGroups || null,
          swissRounds: swissRounds || null,
        },
      });

      let totalMatchesCount = 0;

      // ── FORMAT BRANCHING ─────────────────────────────────────

      // --- BRANCH A: ROUND ROBIN ---
      if (format === TournamentFormat.ROUND_ROBIN) {
        const rounds = generateRoundRobinSchedule(teamIds);
        totalMatchesCount = rounds.reduce((sum, r) => sum + r.length, 0);

        for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
          const roundObj = await tx.round.create({
            data: {
              stageId: stage.id,
              number: rIdx + 1,
              displayName: `Week ${rIdx + 1}`,
              bestOf: defaultBestOf,
            },
          });

          const roundDate = new Date(startDate);
          roundDate.setDate(roundDate.getDate() + rIdx * 7);

          const matchesData = rounds[rIdx].map(([teamAId, teamBId], mIdx) => ({
            tournamentId: tournament.id,
            stageId: stage.id,
            roundId: roundObj.id,
            teamAId,
            teamBId,
            round: rIdx + 1,
            scheduledTime: new Date(roundDate.getTime() + mIdx * 60 * 60 * 1000),
            status: MatchStatus.UPCOMING,
            bestOf: defaultBestOf,
            stage: `Week ${rIdx + 1}`,
          }));

          await tx.match.createMany({ data: matchesData });
        }

        // Initialize TeamStanding rows for season standings
        await tx.teamStanding.createMany({
          data: teamIds.map((teamId) => ({
            teamId,
            seasonId,
            rank: 0,
            wins: 0,
            losses: 0,
            forfeits: 0,
            points: 0,
          })),
          skipDuplicates: true,
        });
      }

      // --- BRANCH B: SINGLE ELIMINATION ---
      else if (format === TournamentFormat.SINGLE_ELIMINATION) {
        const { rounds } = buildSingleEliminationBracket(teamIds);
        totalMatchesCount = rounds.reduce((sum, r) => sum + r.length, 0);

        for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
          const roundObj = await tx.round.create({
            data: {
              stageId: stage.id,
              number: rIdx + 1,
              displayName: rounds[rIdx][0]?.stageName || `Round ${rIdx + 1}`,
              bestOf: rIdx === rounds.length - 1 ? 7 : defaultBestOf,
            },
          });

          const roundDate = new Date(startDate);
          roundDate.setDate(roundDate.getDate() + rIdx * 2);

          for (const mDef of rounds[rIdx]) {
            await tx.match.create({
              data: {
                tournamentId: tournament.id,
                stageId: stage.id,
                roundId: roundObj.id,
                teamAId: mDef.teamAId || teamIds[0], // placeholder fallback if unassigned
                teamBId: mDef.teamBId,
                status: mDef.isBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
                winnerId: mDef.winnerId,
                bestOf: roundObj.bestOf,
                stage: mDef.stageName,
                scheduledTime: roundDate,
              },
            });
          }
        }
      }

      // --- BRANCH C: DOUBLE ELIMINATION ---
      else if (format === TournamentFormat.DOUBLE_ELIMINATION) {
        const matchDefs = buildDoubleEliminationBracket(teamIds, {
          seedingByesCount,
          bestOfUpper: defaultBestOf,
          bestOfLower: defaultBestOf,
          bestOfFinal: 7,
        });
        totalMatchesCount = matchDefs.length;

        // Map tempIds to real created Match IDs
        const tempToRealIdMap = new Map<string, string>();

        const roundObj = await tx.round.create({
          data: {
            stageId: stage.id,
            number: 1,
            displayName: "Playoffs Bracket",
            bestOf: defaultBestOf,
          },
        });

        // 1st pass: create all matches
        for (const mDef of matchDefs) {
          const createdM = await tx.match.create({
            data: {
              tournamentId: tournament.id,
              stageId: stage.id,
              roundId: roundObj.id,
              teamAId: mDef.teamAId || teamIds[0],
              teamBId: mDef.teamBId,
              status: mDef.isBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
              winnerId: mDef.winnerId,
              bestOf: mDef.bestOf,
              stage: mDef.stageName,
              bracketType: mDef.bracketType,
              bracketPosition: mDef.bracketPosition,
              scheduledTime: startDate,
            },
          });
          tempToRealIdMap.set(mDef.tempId, createdM.id);
        }

        // 2nd pass: update nextMatchId and loserNextId links
        for (const mDef of matchDefs) {
          const realId = tempToRealIdMap.get(mDef.tempId);
          if (realId) {
            const nextRealId = mDef.nextTempId ? tempToRealIdMap.get(mDef.nextTempId) || null : null;
            const loserNextRealId = mDef.loserNextTempId ? tempToRealIdMap.get(mDef.loserNextTempId) || null : null;

            await tx.match.update({
              where: { id: realId },
              data: {
                nextMatchId: nextRealId,
                loserNextId: loserNextRealId,
              },
            });
          }
        }
      }

      // --- BRANCH D: GROUP STAGE ---
      else if (format === TournamentFormat.GROUP_STAGE) {
        const groupsCount = numGroups || Math.max(2, Math.floor(teamIds.length / 4));
        const groupsAssignments = divideTeamsIntoGroups(teamIds, groupsCount, drawMode, manualGroups);
        const { groupMatches } = buildGroupStageSchedule(groupsAssignments);
        totalMatchesCount = groupMatches.length;

        // Create TournamentGroup rows
        for (const g of groupsAssignments) {
          const groupRow = await tx.tournamentGroup.create({
            data: {
              tournamentId: tournament.id,
              name: g.groupName,
            },
          });

          await tx.tournamentGroupTeam.createMany({
            data: g.teamIds.map((teamId) => ({
              groupId: groupRow.id,
              teamId,
            })),
          });
        }

        // Create Round records & Matches
        const roundsCount = Math.max(...groupMatches.map((m) => m.round));
        for (let r = 1; r <= roundsCount; r++) {
          const roundObj = await tx.round.create({
            data: {
              stageId: stage.id,
              number: r,
              displayName: `Group Round ${r}`,
              bestOf: defaultBestOf,
            },
          });

          const roundMatches = groupMatches.filter((m) => m.round === r);
          const matchesData = roundMatches.map((m, idx) => ({
            tournamentId: tournament.id,
            stageId: stage.id,
            roundId: roundObj.id,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            round: r,
            scheduledTime: new Date(startDate.getTime() + (r - 1) * 7 * 86400000 + idx * 3600000),
            status: MatchStatus.UPCOMING,
            bestOf: defaultBestOf,
            stage: `${m.groupName} — Match ${idx + 1}`,
          }));

          await tx.match.createMany({ data: matchesData });
        }
      }

      // --- BRANCH E: SWISS ---
      else if (format === TournamentFormat.SWISS) {
        const roundsTotal = swissRounds || Math.ceil(Math.log2(teamIds.length)) + 1;

        // Build initial Swiss Team Records
        const teamRecords = teamIds.map((id) => ({
          teamId: id,
          wins: 0,
          losses: 0,
          previousOpponentIds: [],
        }));

        const r1Pairings = generateSwissRoundPairings(teamRecords, 1);
        totalMatchesCount = r1Pairings.length;

        const roundObj = await tx.round.create({
          data: {
            stageId: stage.id,
            number: 1,
            displayName: "Swiss Round 1",
            bestOf: defaultBestOf,
          },
        });

        for (let idx = 0; idx < r1Pairings.length; idx++) {
          const p = r1Pairings[idx];
          await tx.match.create({
            data: {
              tournamentId: tournament.id,
              stageId: stage.id,
              roundId: roundObj.id,
              teamAId: p.teamAId,
              teamBId: p.teamBId,
              status: p.isBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
              winnerId: p.isBye ? p.teamAId : null,
              bestOf: defaultBestOf,
              stage: `Swiss R1 (${p.recordGroup})`,
              scheduledTime: new Date(startDate.getTime() + idx * 3600000),
            },
          });
        }
      }

      return { tournament, stage, totalMatchesCount };
    });

    await createAuditLog(
      admin.id,
      "LAUNCH_TOURNAMENT",
      "Tournament",
      result.tournament.id,
      JSON.stringify({
        seasonId,
        format,
        teamCount: teamIds.length,
        totalMatches: result.totalMatchesCount,
      })
    );

    return apiSuccess(
      {
        message: `Tournament ${result.tournament.name} launched successfully with format ${format}`,
        tournament: result.tournament,
        stage: result.stage,
        matchesCount: result.totalMatchesCount,
      },
      201
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("[INITIALIZE TOURNAMENT ERROR]", err);
    return apiError(err instanceof Error ? err.message : "Failed to initialize tournament", 500);
  }
}
