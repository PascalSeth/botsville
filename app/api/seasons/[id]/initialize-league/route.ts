import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { SeasonPhase, TournamentFormat, TournamentStatus, MatchStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// ── Round-robin schedule generator (circle method) ───────────
// Returns an array of rounds; each round is an array of [teamAId, teamBId] pairs.
function generateRoundRobin(teamIds: string[]): Array<Array<[string, string]>> {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push("__BYE__"); // ghost team for odd count
  const n = teams.length;
  const rounds: Array<Array<[string, string]>> = [];

  for (let round = 0; round < n - 1; round++) {
    const roundMatches: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        roundMatches.push([home, away]);
      }
    }
    rounds.push(roundMatches);
    // Rotate: fix teams[0], rotate the rest clockwise
    teams.splice(1, 0, teams.pop()!);
  }
  return rounds;
}

// POST /api/seasons/[id]/initialize-league
// Creates the LEAGUE tournament + all round-robin Match records.
// Body: { teamIds: string[], leagueStartDate?: string (ISO), leagueName?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: seasonId } = await params;
    const body = await request.json();
    const {
      teamIds,
      leagueStartDate,
      leagueName,
    }: { teamIds: string[]; leagueStartDate?: string; leagueName?: string } = body;

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      return apiError("At least 2 teams are required to generate a round-robin schedule");
    }
    if (teamIds.length > 32) {
      return apiError("Maximum 32 teams supported");
    }

    // Verify season exists
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return apiError("Season not found", 404);

    // Prevent duplicate initialisation
    const existing = await prisma.tournament.findFirst({
      where: { seasonId, phase: SeasonPhase.LEAGUE, deletedAt: null },
    });
    if (existing) return apiError("A LEAGUE tournament already exists for this season");

    // Verify all teams exist and are active
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds }, deletedAt: null },
      select: { id: true, name: true, tag: true },
    });
    if (teams.length !== teamIds.length) {
      return apiError("One or more team IDs are invalid or belong to deleted teams");
    }

    const startDate = leagueStartDate ? new Date(leagueStartDate) : new Date(season.startDate);
    if (isNaN(startDate.getTime())) return apiError("Invalid leagueStartDate");

    const rounds = generateRoundRobin(teamIds);
    const totalMatches = rounds.reduce((sum, r) => sum + r.length, 0);

    // Build all Match create data — one week apart per round, noon UTC
    const matchData = rounds.flatMap((round, roundIdx) => {
      const roundDate = new Date(startDate);
      roundDate.setDate(roundDate.getDate() + roundIdx * 7);
      roundDate.setHours(12, 0, 0, 0);

      return round.map(([teamAId, teamBId], matchIdx) => ({
        teamAId,
        teamBId,
        round: roundIdx + 1,
        scheduledTime: new Date(roundDate.getTime() + matchIdx * 60 * 60 * 1000), // 1hr apart
        status: MatchStatus.UPCOMING as MatchStatus,
        bestOf: 3,
        stage: `Week ${roundIdx + 1}`,
      }));
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the LEAGUE tournament
      const tournament = await tx.tournament.create({
        data: {
          seasonId,
          name: leagueName || `${season.name} — Regular Season`,
          format: TournamentFormat.ROUND_ROBIN,
          phase: SeasonPhase.LEAGUE,
          location: "Online",
          isOnline: true,
          date: startDate,
          registrationDeadline: startDate, // league has no separate deadline
          slots: teamIds.length,
          filled: teamIds.length,
          status: TournamentStatus.OPEN,
          rules: [
            "Best of 3 (BO3) per match",
            "Win = 2 points, Loss = 0 points",
            "Forfeit = -1 point to forfeiting team, +2 to opponent",
            "Tiebreaker: Head-to-Head record",
          ],
        },
      });

      // 2. Register all teams to this tournament
      await tx.tournamentRegistration.createMany({
        data: teamIds.map((teamId) => ({
          tournamentId: tournament.id,
          teamId,
          status: "APPROVED" as const,
        })),
        skipDuplicates: true,
      });

      // 3. Create all round-robin matches
      await tx.match.createMany({
        data: matchData.map((m) => ({ ...m, tournamentId: tournament.id })),
      });

      // 4. Initialise TeamStanding rows for each team (season-level cumulative)
      await tx.teamStanding.createMany({
        data: teamIds.map((teamId) => ({
          teamId,
          seasonId,
          rank: 0, // will be updated on first match result
          wins: 0,
          losses: 0,
          forfeits: 0,
          points: 0,
        })),
        skipDuplicates: true,
      });

      return { tournament, totalMatches };
    });

    await createAuditLog(
      admin.id,
      "INITIALIZE_LEAGUE",
      "Tournament",
      result.tournament.id,
      JSON.stringify({ seasonId, teamCount: teamIds.length, totalMatches })
    );

    return apiSuccess(
      {
        message: `League initialised: ${totalMatches} matches generated across ${rounds.length} rounds`,
        tournament: result.tournament,
        rounds: rounds.length,
        totalMatches: result.totalMatches,
      },
      201
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("initialize-league error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to initialize league", 500);
  }
}
