import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@/app/generated/prisma/enums";

// GET - Get the active solo draft event config and available tournaments
export async function GET(request: NextRequest) {
  try {
    await requireAdmin([AdminRoleType.SUPER_ADMIN, AdminRoleType.TOURNAMENT_ADMIN]);

    // Find the most recently updated active event or just the most recent one
    let event = await prisma.soloDraftEvent.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!event) {
      event = await prisma.soloDraftEvent.create({
        data: {
          title: "Solo Draft Event",
          isActive: true,
          maxTeams: 8,
          playersPerTeam: 5,
          tournamentId: null,
        },
      });
    }

    const tournaments = await prisma.tournament.findMany({
      where: {
        status: { in: ["UPCOMING", "OPEN", "CLOSED"] },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    return apiSuccess({ event, tournaments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch event";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Get solo event error:", error);
    return apiError("Internal server error", 500);
  }
}

// POST - Update the solo draft event config
export async function POST(request: NextRequest) {
  try {
    await requireAdmin([AdminRoleType.SUPER_ADMIN, AdminRoleType.TOURNAMENT_ADMIN]);

    const body = await request.json();
    const { id, title, isActive, maxTeams, playersPerTeam, tournamentId } = body;

    if (!id) return apiError("Missing event ID", 400);

    const event = await prisma.soloDraftEvent.update({
      where: { id },
      data: {
        title,
        isActive: Boolean(isActive),
        maxTeams: Number(maxTeams),
        playersPerTeam: Number(playersPerTeam),
        tournamentId: tournamentId || null,
      },
    });

    return apiSuccess({ event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Update solo event error:", error);
    return apiError("Internal server error", 500);
  }
}
