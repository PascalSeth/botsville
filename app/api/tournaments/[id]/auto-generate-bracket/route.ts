import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/app/generated/prisma/enums";

/**
 * POST /api/tournaments/[id]/auto-generate-bracket
 * 
 * Automatically generates winner's and loser's brackets from group stage standings.
 * 
 * Process:
 * 1. Verify group stage is complete
 * 2. Get top teams from standings (seeds)
 * 3. Create bracket matches with proper seeding
 * 4. Link matches for bracket progression
 * 5. Return bracket structure
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          select: {
            id: true,
            status: true,
            round: true,
            bracketType: true,
          },
        },
        registrations: {
          where: { status: "APPROVED" },
          select: { teamId: true },
        },
      },
    });

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    // Check if group stage is complete
    const groupMatches = tournament.matches.filter((m) => m.round !== null || m.bracketType === null);
    const completedGroupMatches = groupMatches.filter(
      (m) => m.status === MatchStatus.COMPLETED || m.status === MatchStatus.FORFEITED
    ).length;

    const groupStageComplete = groupMatches.length > 0 && completedGroupMatches === groupMatches.length;

    if (!groupStageComplete) {
      return apiError(
        `Group stage not yet complete: ${completedGroupMatches}/${groupMatches.length} matches completed`,
        400
      );
    }

    // Check if bracket already exists
    const existingBracketMatches = tournament.matches.filter(
      (m) => m.bracketType !== null && m.bracketType !== "GROUP_STAGE"
    );

    if (existingBracketMatches.length > 0) {
      return apiError("Bracket matches already exist for this tournament", 400);
    }

    // Get standings for seeding
    const standings = await prisma.teamStanding.findMany({
      where: { seasonId: tournament.seasonId },
      include: {
        team: {
          select: { id: true, name: true, tag: true },
        },
      },
      orderBy: [{ points: "desc" }, { wins: "desc" }],
    });

    if (standings.length < 2) {
      return apiError("Not enough teams with standings to generate bracket", 400);
    }

    // Get seeded teams (top 8, or available count if less)
    const totalTeams = tournament.registrations.length;
    const numBracketTeams = Math.min(8, totalTeams); // Default bracket size
    const seededTeams = standings.slice(0, numBracketTeams);

    // Verify all seeds have team data
    const seeds = seededTeams
      .filter((s) => s.team)
      .map((s) => ({
        seedPosition: seededTeams.indexOf(s) + 1,
        teamId: s.teamId,
        teamName: s.team.name,
        teamTag: s.team.tag || s.team.name,
        points: s.points,
        wins: s.wins,
      }));

    if (seeds.length < 2) {
      return apiError("Not enough teams with valid data to generate bracket", 400);
    }

    // Generate bracket matches in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create first round matches with proper seeding
      // Standard 8-team bracket: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6
      const bracketMatchups = generateBracketMatchups(seeds);

      // Create all matches
      const createdMatches = [];
      for (let i = 0; i < bracketMatchups.length; i++) {
        const matchup = bracketMatchups[i];
        const match = await tx.match.create({
          data: {
            tournamentId,
            teamAId: matchup.seed1.teamId,
            teamBId: matchup.seed2.teamId,
            scheduledTime: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // 1 day apart
            status: MatchStatus.UPCOMING,
            bestOf: 3,
            stage: `Bracket Round 1: #${matchup.seed1.seedPosition} vs #${matchup.seed2.seedPosition}`,
            bracketType: "WINNER_BRACKET",
            bracketPosition: i + 1,
          },
          include: {
            teamA: { select: { id: true, name: true, tag: true } },
            teamB: { select: { id: true, name: true, tag: true } },
          },
        });
        createdMatches.push(match);
      }

      // Link matches for bracket progression (winners advance)
      const secondRoundMatches = [];
      for (let i = 0; i < createdMatches.length; i += 2) {
        if (i + 1 < createdMatches.length) {
          // Create finals match (winner of match i vs winner of match i+1)
          const finalsMatch = await tx.match.create({
            data: {
              tournamentId,
              teamAId: createdMatches[i].teamAId, // Placeholder - will be updated when winners determined
              teamBId: createdMatches[i + 1].teamAId, // Placeholder
              scheduledTime: new Date(Date.now() + (createdMatches.length + 2) * 24 * 60 * 60 * 1000),
              status: MatchStatus.UPCOMING,
              bestOf: 5,
              stage: "Grand Finals",
              bracketType: "GRAND_FINAL",
              bracketPosition: i / 2 + 1,
            },
            include: {
              teamA: { select: { id: true, name: true, tag: true } },
              teamB: { select: { id: true, name: true, tag: true } },
            },
          });
          secondRoundMatches.push(finalsMatch);

          // Link first round matches to finals
          await tx.match.update({
            where: { id: createdMatches[i].id },
            data: { nextMatchId: finalsMatch.id },
          });
          await tx.match.update({
            where: { id: createdMatches[i + 1].id },
            data: { nextMatchId: finalsMatch.id },
          });
        }
      }

      return {
        firstRoundMatches: createdMatches,
        secondRoundMatches,
        seeds,
        totalMatchesCreated: createdMatches.length + secondRoundMatches.length,
      };
    });

    // Log the action
    await createAuditLog(
      admin.id,
      "AUTO_GENERATE_BRACKET",
      "Tournament",
      tournamentId,
      JSON.stringify({
        firstRoundMatches: result.firstRoundMatches.length,
        secondRoundMatches: result.secondRoundMatches.length,
        seeds: result.seeds.map((s) => ({ position: s.seedPosition, team: s.teamName })),
      })
    );

    return apiSuccess(
      {
        message: `Bracket auto-generated successfully!`,
        tournament: {
          id: tournamentId,
          name: tournament.name,
        },
        bracket: {
          seeds: result.seeds,
          firstRound: result.firstRoundMatches.map((m) => ({
            id: m.id,
            matchupLabel: `${m.teamA?.tag || m.teamA?.name} vs ${m.teamB?.tag || m.teamB?.name}`,
            status: m.status,
          })),
          finals: result.secondRoundMatches.map((m) => ({
            id: m.id,
            stage: m.stage,
            status: m.status,
          })),
          totalMatches: result.totalMatchesCreated,
        },
      },
      201
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to auto-generate bracket";
    return apiError(msg, 500);
  }
}

/**
 * Generate bracket matchups with proper seeding
 * Standard 8-team bracket: 1vs8, 4vs5, 2vs7, 3vs6
 */
function generateBracketMatchups(
  seeds: Array<{ seedPosition: number; teamId: string; teamName: string; teamTag: string }>
) {
  if (seeds.length < 2) return [];

  // Pad to 8 if needed (remaining teams get byes or are inserted)
  while (seeds.length < 8) {
    seeds.push({
      seedPosition: seeds.length + 1,
      teamId: "",
      teamName: "BYE",
      teamTag: "BYE",
    });
  }

  // Standard bracket seeding: 1v8, 4v5, 2v7, 3v6
  const matchups = [
    { seed1: seeds[0], seed2: seeds[7] },
    { seed1: seeds[3], seed2: seeds[4] },
    { seed1: seeds[1], seed2: seeds[6] },
    { seed1: seeds[2], seed2: seeds[5] },
  ];

  return matchups.filter((m) => m.seed1.teamId && m.seed2.teamId); // Filter out BYE teams
}
