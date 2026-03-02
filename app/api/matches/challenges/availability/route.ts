import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

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

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart") ?? undefined;

    const latestPing = await prisma.weeklyScrimPing.findFirst({
      orderBy: { weekStart: "desc" },
      select: {
        weekStart: true,
        scrimDate: true,
        message: true,
        updatedAt: true,
      },
    });

    const selectedWeekStart = getWeekStart(weekStartParam ?? latestPing?.weekStart?.toISOString());

    const ping = await prisma.weeklyScrimPing.findUnique({
      where: { weekStart: selectedWeekStart },
      select: {
        weekStart: true,
        scrimDate: true,
        message: true,
        updatedAt: true,
      },
    });

    const availabilities = await prisma.weeklyScrimAvailability.findMany({
      where: {
        weekStart: selectedWeekStart,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            captainId: true,
          },
        },
      },
      orderBy: [{ isAvailable: "desc" }, { updatedAt: "desc" }],
    });

    const availableTeams = availabilities.filter((entry) => entry.isAvailable);

    if (user.role) {
      return apiSuccess({
        weekStart: selectedWeekStart,
        ping,
        availabilities,
        availableTeams,
      });
    }

    const captainTeam = await getCaptainTeam(user.id);
    if (!captainTeam) {
      return apiSuccess({
        weekStart: selectedWeekStart,
        ping,
        availableTeams,
        team: null,
        availability: null,
      });
    }

    const availability = await prisma.weeklyScrimAvailability.findUnique({
      where: {
        teamId_weekStart: {
          teamId: captainTeam.id,
          weekStart: selectedWeekStart,
        },
      },
    });

    return apiSuccess({
      weekStart: selectedWeekStart,
      ping,
      availableTeams,
      team: captainTeam,
      availability,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch scrim availability";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json().catch(() => ({}));
    const isAvailable = body?.isAvailable;
    const note = typeof body?.note === "string" ? body.note.trim() : null;

    if (typeof isAvailable !== "boolean") {
      return apiError("isAvailable boolean is required");
    }

    const captainTeam = await getCaptainTeam(user.id);
    if (!captainTeam) {
      return apiError("Only team captains can set scrim availability", 403);
    }

    const latestPing = await prisma.weeklyScrimPing.findFirst({
      orderBy: { weekStart: "desc" },
      select: { weekStart: true },
    });

    const selectedWeekStart = getWeekStart(body?.weekStart ?? latestPing?.weekStart?.toISOString());

    const availability = await prisma.weeklyScrimAvailability.upsert({
      where: {
        teamId_weekStart: {
          teamId: captainTeam.id,
          weekStart: selectedWeekStart,
        },
      },
      create: {
        teamId: captainTeam.id,
        captainId: user.id,
        weekStart: selectedWeekStart,
        isAvailable,
        note: note && note.length > 0 ? note.slice(0, 200) : null,
      },
      update: {
        captainId: user.id,
        isAvailable,
        note: note && note.length > 0 ? note.slice(0, 200) : null,
      },
    });

    return apiSuccess({
      message: isAvailable ? "Availability set to available" : "Availability set to unavailable",
      weekStart: selectedWeekStart,
      availability,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update scrim availability";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}
