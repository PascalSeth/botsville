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
      tag: true,
      captainId: true,
    },
  });
}

// GET - List challenges (public arena listings + team challenges)
export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const weekStartParam = searchParams.get("weekStart");

    const where: Prisma.MatchChallengeWhereInput = {
      challengerTeam: { deletedAt: null },
    };


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

    // Public Arena Mode: Return all challenges (or public listings + user team challenges)
    const challenges = await prisma.matchChallenge.findMany({
      where,
      include: {
        challengerTeam: {
          select: { id: true, name: true, tag: true, logo: true },
        },
        challengedTeam: {
          select: { id: true, name: true, tag: true, logo: true },
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

// POST - Create a new challenge (Direct or Public Open Challenge)
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();

    const captainTeam = await getCaptainTeam(user.id);
    if (!captainTeam && !user.role) {
      return apiError("Only active team captains can issue match challenges", 403);
    }

    const body = await request.json();
    const { challengedTeamId, message, weekStart: rawWeekStart } = body as {
      challengedTeamId?: string | null;
      message?: string | null;
      weekStart?: string | null;
    };

    const challengerTeamId = captainTeam?.id;
    if (!challengerTeamId) {
      return apiError("Could not identify challenger team", 400);
    }

    if (challengedTeamId && challengedTeamId === challengerTeamId) {
      return apiError("You cannot challenge your own team", 400);
    }

    let targetTeam = null;
    if (challengedTeamId) {
      targetTeam = await prisma.team.findFirst({
        where: {
          id: challengedTeamId,
          deletedAt: null,
          status: "ACTIVE",
        },
        select: { id: true, name: true, captainId: true },
      });

      if (!targetTeam) {
        return apiError("Challenged team not found or inactive", 404);
      }
    }

    const weekStart = getWeekStart(rawWeekStart || undefined);

    const challengeData: any = {
      challengerTeam: { connect: { id: challengerTeamId } },
      initiatedBy: { connect: { id: user.id } },
      weekStart,
      message: message?.trim() || null,
      status: MatchChallengeStatus.PENDING,
    };
    if (targetTeam?.id) {
      challengeData.challengedTeam = { connect: { id: targetTeam.id } };
    }

    const challenge = await prisma.matchChallenge.create({
      data: challengeData,

      include: {
        challengerTeam: { select: { id: true, name: true, tag: true } },
        challengedTeam: { select: { id: true, name: true, tag: true } },
      },
    });

    // Notify targeted captain if direct challenge
    if (targetTeam?.captainId) {
      await prisma.notification.create({
        data: {
          userId: targetTeam.captainId,
          type: "MATCH_SCHEDULED",
          title: "Direct Squad Challenge!",
          message: `${captainTeam.name} has issued a direct match challenge to your squad.`,
          linkUrl: "/challenge-arena",
        },
      });
    }

    return apiSuccess({ challenge }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create challenge";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}
