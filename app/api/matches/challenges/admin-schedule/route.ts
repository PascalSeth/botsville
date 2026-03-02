import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { AdminRoleType, MatchStatus, TournamentFormat, TournamentStatus } from "@/app/generated/prisma/enums";

function getWeekStart(value?: string): Date {
  const now = value ? new Date(value) : new Date();
  if (Number.isNaN(now.getTime())) return new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function parseDateTime(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function getOrCreateWeeklyScrimTournament(weekStart: Date) {
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  if (!activeSeason) {
    throw new Error("No active season found for weekly scrim scheduling");
  }

  const weekKey = weekStart.toISOString().slice(0, 10);
  const tournamentName = `Weekly Scrim ${weekKey}`;

  const existing = await prisma.tournament.findFirst({
    where: {
      seasonId: activeSeason.id,
      name: tournamentName,
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  endOfWeek.setHours(20, 0, 0, 0);

  const registrationDeadline = new Date(weekStart);
  registrationDeadline.setHours(12, 0, 0, 0);

  return prisma.tournament.create({
    data: {
      seasonId: activeSeason.id,
      name: tournamentName,
      subtitle: "Weekly community scrim",
      format: TournamentFormat.ROUND_ROBIN,
      location: "Online",
      isOnline: true,
      date: endOfWeek,
      registrationDeadline,
      slots: 128,
      status: TournamentStatus.OPEN,
      prizePool: null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const body = await request.json().catch(() => ({}));

    const teamAId = typeof body?.teamAId === "string" ? body.teamAId : "";
    const teamBId = typeof body?.teamBId === "string" ? body.teamBId : "";
    const scheduledTime = parseDateTime(body?.scheduledTime);
    const weekStart = getWeekStart(body?.weekStart);

    if (!teamAId || !teamBId || teamAId === teamBId) {
      return apiError("teamAId and teamBId are required and must be different");
    }

    if (!scheduledTime) {
      return apiError("scheduledTime is required and must be a valid date");
    }

    const [teamA, teamB] = await Promise.all([
      prisma.team.findFirst({ where: { id: teamAId, deletedAt: null, status: "ACTIVE" } }),
      prisma.team.findFirst({ where: { id: teamBId, deletedAt: null, status: "ACTIVE" } }),
    ]);

    if (!teamA || !teamB) {
      return apiError("Both teams must be active");
    }

    const available = await prisma.weeklyScrimAvailability.findMany({
      where: {
        weekStart,
        isAvailable: true,
        teamId: { in: [teamAId, teamBId] },
      },
      select: { teamId: true },
    });

    if (available.length < 2) {
      return apiError("Both teams must be marked available for this week before scheduling");
    }

    const tournament = body?.tournamentId
      ? await prisma.tournament.findFirst({ where: { id: body.tournamentId, deletedAt: null } })
      : await getOrCreateWeeklyScrimTournament(weekStart);

    if (!tournament) {
      return apiError("Tournament not found", 404);
    }

    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId,
        teamBId,
        scheduledTime,
        stage: typeof body?.stage === "string" && body.stage.trim() ? body.stage.trim() : "Weekly Scrim",
        bestOf: typeof body?.bestOf === "number" && body.bestOf > 0 ? body.bestOf : 3,
        status: MatchStatus.UPCOMING,
      },
    });

    const captainIds = [teamA.captainId, teamB.captainId].filter(Boolean) as string[];
    if (captainIds.length > 0) {
      await prisma.notification.createMany({
        data: captainIds.map((captainId) => ({
          userId: captainId,
          type: "MATCH_SCHEDULED",
          title: "Weekly Scrim Scheduled",
          message: `${teamA.name} vs ${teamB.name} is scheduled for ${scheduledTime.toLocaleString()}.`,
          linkUrl: `/matches/${match.id}`,
        })),
      });
    }

    await createAuditLog(
      admin.id,
      "SCHEDULE_AVAILABLE_TEAMS_MATCH",
      "Match",
      match.id,
      JSON.stringify({ teamAId, teamBId, weekStart: weekStart.toISOString(), tournamentId: tournament.id })
    );

    return apiSuccess({ message: "Match scheduled between available teams", match }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to schedule match";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
