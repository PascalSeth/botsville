import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import {
  SeasonPhase,
  TournamentFormat,
  TournamentStatus,
  MatchStatus,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// POST /api/seasons/[id]/initialize-playoffs
// Reads the top 4 teams from TeamStanding and creates:
//   - PLAYOFFS tournament
//   - SF1: #1 vs #4  (BO5)
//   - SF2: #2 vs #3  (BO5)
//   - 3rd Place match (BO3)  — teams TBD, filled after semis
//   - Grand Final     (BO7)  — teams TBD, filled after semis
// Body: { playoffsStartDate: string (ISO) }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: seasonId } = await params;
    const body = await request.json();
    const { playoffsStartDate }: { playoffsStartDate: string } = body;

    if (!playoffsStartDate) return apiError("playoffsStartDate is required");

    const startDate = new Date(playoffsStartDate);
    if (isNaN(startDate.getTime())) return apiError("Invalid playoffsStartDate");

    // Prevent duplicate playoffs
    const existing = await prisma.tournament.findFirst({
      where: { seasonId, phase: SeasonPhase.PLAYOFFS, deletedAt: null },
    });
    if (existing) return apiError("A PLAYOFFS tournament already exists for this season");

    // Get top 4 from standings
    const top4 = await prisma.teamStanding.findMany({
      where: { seasonId },
      orderBy: [{ points: "desc" }, { wins: "desc" }, { rank: "asc" }],
      take: 4,
      include: { team: { select: { id: true, name: true, tag: true } } },
    });

    if (top4.length < 4) {
      return apiError(
        `Need at least 4 ranked teams to generate playoffs (found ${top4.length}). Submit more match results first.`
      );
    }

    const [seed1, seed2, seed3, seed4] = top4;

    // Dates: SF on day 0, 3rd place on day +3, Grand Final on day +5 (spans 2 days)
    const sfDate = new Date(startDate);
    const sfDate2 = new Date(startDate);
    sfDate2.setHours(sfDate2.getHours() + 3); // SF2 3 hours after SF1
    const thirdPlaceDate = new Date(startDate);
    thirdPlaceDate.setDate(thirdPlaceDate.getDate() + 3);
    const grandFinalDate = new Date(startDate);
    grandFinalDate.setDate(grandFinalDate.getDate() + 5);

    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.create({
        data: {
          seasonId,
          name: `${(await tx.season.findUnique({ where: { id: seasonId } }))?.name ?? "Season"} — Playoffs`,
          format: TournamentFormat.SINGLE_ELIMINATION,
          phase: SeasonPhase.PLAYOFFS,
          location: "Online",
          isOnline: true,
          date: startDate,
          registrationDeadline: startDate,
          slots: 4,
          filled: 4,
          status: TournamentStatus.UPCOMING,
          rules: [
            "Semi-Finals: Best of 5 (BO5)",
            "3rd Place match: Best of 3 (BO3)",
            "Grand Final: Best of 7 (BO7) — played over two days",
          ],
        },
      });

      // Register top 4 teams
      await tx.tournamentRegistration.createMany({
        data: [seed1, seed2, seed3, seed4].map((s) => ({
          tournamentId: tournament.id,
          teamId: s.teamId,
          status: "APPROVED" as const,
          seed: s.rank,
        })),
        skipDuplicates: true,
      });

      // SF1: #1 vs #4
      const sf1 = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          teamAId: seed1.teamId,
          teamBId: seed4.teamId,
          scheduledTime: sfDate,
          status: MatchStatus.UPCOMING,
          bestOf: 5,
          stage: `Semi-Final 1 (#${seed1.rank} ${seed1.team.tag} vs #${seed4.rank} ${seed4.team.tag})`,
        },
      });

      // SF2: #2 vs #3
      const sf2 = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          teamAId: seed2.teamId,
          teamBId: seed3.teamId,
          scheduledTime: sfDate2,
          status: MatchStatus.UPCOMING,
          bestOf: 5,
          stage: `Semi-Final 2 (#${seed2.rank} ${seed2.team.tag} vs #${seed3.rank} ${seed3.team.tag})`,
        },
      });

      // 3rd Place: TBD — both teamAId/teamBId will be updated after semis
      const thirdPlace = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          teamAId: seed3.teamId, // SF2 loser — placeholder, updated by result handler
          teamBId: seed4.teamId, // SF1 loser — placeholder
          scheduledTime: thirdPlaceDate,
          status: MatchStatus.UPCOMING,
          bestOf: 3,
          stage: "3rd Place Match",
        },
      });

      // Grand Final: TBD
      const grandFinal = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          teamAId: seed1.teamId, // SF1 winner — placeholder
          teamBId: seed2.teamId, // SF2 winner — placeholder
          scheduledTime: grandFinalDate,
          status: MatchStatus.UPCOMING,
          bestOf: 7,
          stage: "Grand Final",
        },
      });

      return { tournament, sf1, sf2, thirdPlace, grandFinal };
    });

    await createAuditLog(
      admin.id,
      "INITIALIZE_PLAYOFFS",
      "Tournament",
      result.tournament.id,
      JSON.stringify({
        seasonId,
        seeds: top4.map((t) => ({ rank: t.rank, team: t.team.name })),
      })
    );

    return apiSuccess(
      {
        message: "Playoffs bracket generated",
        tournament: result.tournament,
        matches: {
          sf1: result.sf1,
          sf2: result.sf2,
          thirdPlace: result.thirdPlace,
          grandFinal: result.grandFinal,
        },
        seeds: top4.map((t) => ({ rank: t.rank, teamId: t.teamId, name: t.team.name })),
      },
      201
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) return apiError("Unauthorized", 401);
    if (err instanceof Error && err.message.includes("Forbidden")) return apiError(err.message, 403);
    console.error("initialize-playoffs error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to initialize playoffs", 500);
  }
}
