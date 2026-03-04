import { NextRequest } from "next/server";
import { requireActiveUser, requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { MatchChallengeStatus, MatchStatus, TournamentFormat, TournamentStatus, AdminRoleType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function parseDateTime(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function getSeasonScrimTournament() {
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      endDate: true,
      scrimTournamentId: true,
      scrimTournament: { select: { id: true, name: true } },
    },
  });

  if (!activeSeason) {
    throw new Error("No active season found for scrim scheduling");
  }

  // If season has a designated scrim tournament, use it
  if (activeSeason.scrimTournamentId && activeSeason.scrimTournament) {
    return activeSeason.scrimTournament;
  }

  // Otherwise, create or find a default scrim tournament for the season
  const defaultName = `${activeSeason.name} Scrims`;
  const existing = await prisma.tournament.findFirst({
    where: {
      seasonId: activeSeason.id,
      name: defaultName,
      deletedAt: null,
    },
  });

  if (existing) {
    // Set it as the season's scrim tournament for future use
    await prisma.season.update({
      where: { id: activeSeason.id },
      data: { scrimTournamentId: existing.id },
    });
    return existing;
  }

  const registrationDeadline = new Date();
  registrationDeadline.setDate(registrationDeadline.getDate() + 7);

  const tournament = await prisma.tournament.create({
    data: {
      seasonId: activeSeason.id,
      name: defaultName,
      subtitle: "Weekly community scrims",
      format: TournamentFormat.ROUND_ROBIN,
      location: "Online",
      isOnline: true,
      date: activeSeason.endDate,
      registrationDeadline,
      slots: 128,
      status: TournamentStatus.OPEN,
      prizePool: null,
    },
  });

  // Set it as the season's scrim tournament
  await prisma.season.update({
    where: { id: activeSeason.id },
    data: { scrimTournamentId: tournament.id },
  });

  return tournament;
}


export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action) {
      return apiError("action is required");
    }

    const challenge = await prisma.matchChallenge.findUnique({
      where: { id },
      include: {
        challengerTeam: {
          select: { id: true, name: true, captainId: true },
        },
        challengedTeam: {
          select: { id: true, name: true, captainId: true },
        },
      },
    });

    if (!challenge) {
      return apiError("Challenge not found", 404);
    }

    if (action === "accept") {
      if (challenge.status !== MatchChallengeStatus.PENDING) {
        return apiError("Only pending challenges can be accepted");
      }
      if (challenge.challengedTeam.captainId !== user.id) {
        return apiError("Only the challenged team captain can accept", 403);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.ACCEPTED,
          respondedById: user.id,
          acceptedAt: new Date(),
        },
      });

      if (challenge.challengerTeam.captainId) {
        await prisma.notification.create({
          data: {
            userId: challenge.challengerTeam.captainId,
            type: "MATCH_SCHEDULED",
            title: "Challenge Accepted",
            message: `${challenge.challengedTeam.name} accepted your challenge. Admin will schedule the match date.`,
            linkUrl: "/my-team",
          },
        });
      }

      return apiSuccess({ message: "Challenge accepted", challenge: updated });
    }

    if (action === "reject") {
      if (challenge.status !== MatchChallengeStatus.PENDING) {
        return apiError("Only pending challenges can be rejected");
      }
      if (challenge.challengedTeam.captainId !== user.id) {
        return apiError("Only the challenged team captain can reject", 403);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.REJECTED,
          respondedById: user.id,
          rejectedAt: new Date(),
        },
      });

      if (challenge.challengerTeam.captainId) {
        await prisma.notification.create({
          data: {
            userId: challenge.challengerTeam.captainId,
            type: "MATCH_SCHEDULED",
            title: "Challenge Rejected",
            message: `${challenge.challengedTeam.name} declined your challenge this week.`,
            linkUrl: "/my-team",
          },
        });
      }

      return apiSuccess({ message: "Challenge rejected", challenge: updated });
    }

    if (action === "cancel") {
      if (challenge.challengerTeam.captainId !== user.id) {
        return apiError("Only the challenging captain can cancel", 403);
      }
      const cancellableStatuses = new Set<MatchChallengeStatus>([
        MatchChallengeStatus.PENDING,
        MatchChallengeStatus.ACCEPTED,
      ]);
      if (!cancellableStatuses.has(challenge.status)) {
        return apiError("Only pending or accepted challenges can be cancelled");
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.CANCELLED,
          respondedById: user.id,
        },
      });

      return apiSuccess({ message: "Challenge cancelled", challenge: updated });
    }

    if (action === "schedule") {
      const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);

      if (challenge.status !== MatchChallengeStatus.ACCEPTED) {
        return apiError("Only accepted challenges can be scheduled");
      }

      if (challenge.scheduledMatchId) {
        return apiError("Challenge is already scheduled");
      }

      const scheduledTime = parseDateTime(body.scheduledTime);
      if (!scheduledTime) {
        return apiError("scheduledTime is required and must be a valid date");
      }

      const availableTeams = await prisma.weeklyScrimAvailability.findMany({
        where: {
          weekStart: challenge.weekStart,
          isAvailable: true,
          teamId: {
            in: [challenge.challengerTeamId, challenge.challengedTeamId],
          },
        },
        select: { teamId: true },
      });

      if (availableTeams.length < 2) {
        return apiError("Both teams must confirm weekly availability before scheduling", 400);
      }

      const tournament = body.tournamentId
        ? await prisma.tournament.findFirst({
            where: {
              id: body.tournamentId,
              deletedAt: null,
            },
          })
        : await getSeasonScrimTournament();

      if (!tournament) {
        return apiError("Tournament not found", 404);
      }

      const match = await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          teamAId: challenge.challengerTeamId,
          teamBId: challenge.challengedTeamId,
          scheduledTime,
          stage: typeof body.stage === "string" && body.stage.trim() ? body.stage.trim() : "Weekly Scrim",
          bestOf: typeof body.bestOf === "number" && body.bestOf > 0 ? body.bestOf : 3,
          refereeId: typeof body.refereeId === "string" && body.refereeId ? body.refereeId : null,
          status: MatchStatus.UPCOMING,
        },
      });

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.SCHEDULED,
          scheduledAt: new Date(),
          scheduledMatchId: match.id,
          respondedById: admin.id,
        },
      });

      const captainIds = [challenge.challengerTeam.captainId, challenge.challengedTeam.captainId].filter(Boolean) as string[];
      if (captainIds.length > 0) {
        await prisma.notification.createMany({
          data: captainIds.map((captainId) => ({
            userId: captainId,
            type: "MATCH_SCHEDULED",
            title: "Weekly Scrim Scheduled",
            message: `${challenge.challengerTeam.name} vs ${challenge.challengedTeam.name} is scheduled for ${scheduledTime.toLocaleString()}.`,
            linkUrl: `/matches/${match.id}`,
          })),
        });
      }

      await createAuditLog(
        admin.id,
        "SCHEDULE_MATCH_CHALLENGE",
        "MatchChallenge",
        challenge.id,
        JSON.stringify({ matchId: match.id, tournamentId: tournament.id })
      );

      return apiSuccess({ message: "Challenge scheduled", challenge: updated, match });
    }

    return apiError("Unsupported action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process challenge";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
