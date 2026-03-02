import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { MatchChallengeStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

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

async function getCaptainTeam(userId: string) {
  return prisma.team.findFirst({
    where: {
      captainId: userId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      captainId: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const weekStartParam = searchParams.get("weekStart");

    const where: Prisma.MatchChallengeWhereInput = {};

    if (status && Object.values(MatchChallengeStatus).includes(status as MatchChallengeStatus)) {
      where.status = status as MatchChallengeStatus;
    }

    if (weekStartParam) {
      const weekStart = getWeekStart(weekStartParam);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      where.weekStart = {
        gte: weekStart,
        lt: weekEnd,
      };
    }

    if (!user.role) {
      const captainTeam = await getCaptainTeam(user.id);
      if (!captainTeam) {
        return apiSuccess({ challenges: [] });
      }
      where.OR = [
        { challengerTeamId: captainTeam.id },
        { challengedTeamId: captainTeam.id },
      ];
    }

    const challenges = await prisma.matchChallenge.findMany({
      where,
      include: {
        challengerTeam: {
          select: { id: true, name: true, tag: true },
        },
        challengedTeam: {
          select: { id: true, name: true, tag: true },
        },
        initiatedBy: {
          select: { id: true, ign: true },
        },
        respondedBy: {
          select: { id: true, ign: true },
        },
        scheduledMatch: {
          select: { id: true, scheduledTime: true, status: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    return apiSuccess({ challenges });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch challenges";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { challengedTeamId, message, weekStart } = body;

    if (!challengedTeamId || typeof challengedTeamId !== "string") {
      return apiError("challengedTeamId is required");
    }

    const challengerTeam = await getCaptainTeam(user.id);
    if (!challengerTeam) {
      return apiError("Only team captains can create challenges", 403);
    }

    if (challengerTeam.id === challengedTeamId) {
      return apiError("You cannot challenge your own team");
    }

    const challengedTeam = await prisma.team.findFirst({
      where: {
        id: challengedTeamId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        captainId: true,
      },
    });

    if (!challengedTeam) {
      return apiError("Challenged team not found", 404);
    }

    if (!challengedTeam.captainId) {
      return apiError("Challenged team has no captain assigned");
    }

    const normalizedWeekStart = getWeekStart(weekStart);
    const weekEnd = new Date(normalizedWeekStart);
    weekEnd.setDate(normalizedWeekStart.getDate() + 7);

    const duplicate = await prisma.matchChallenge.findFirst({
      where: {
        weekStart: {
          gte: normalizedWeekStart,
          lt: weekEnd,
        },
        status: {
          in: [
            MatchChallengeStatus.PENDING,
            MatchChallengeStatus.ACCEPTED,
            MatchChallengeStatus.SCHEDULED,
          ],
        },
        OR: [
          {
            challengerTeamId: challengerTeam.id,
            challengedTeamId: challengedTeam.id,
          },
          {
            challengerTeamId: challengedTeam.id,
            challengedTeamId: challengerTeam.id,
          },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return apiError("A challenge between these teams already exists for this week");
    }

    const challenge = await prisma.matchChallenge.create({
      data: {
        challengerTeamId: challengerTeam.id,
        challengedTeamId: challengedTeam.id,
        initiatedById: user.id,
        weekStart: normalizedWeekStart,
        message: typeof message === "string" && message.trim().length > 0 ? message.trim() : null,
        status: MatchChallengeStatus.PENDING,
      },
      include: {
        challengerTeam: {
          select: { id: true, name: true, tag: true },
        },
        challengedTeam: {
          select: { id: true, name: true, tag: true },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: challengedTeam.captainId,
        type: "MATCH_SCHEDULED",
        title: "New Team Challenge",
        message: `${challengerTeam.name} challenged your team for this week's scrim. Respond to proceed.`,
        linkUrl: "/my-team",
      },
    });

    return apiSuccess({ message: "Challenge sent", challenge }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create challenge";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}
