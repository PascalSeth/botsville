import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { AdminRoleType, TournamentFormat, TournamentStatus } from "@/app/generated/prisma/enums";

// GET - Get active season with its scrim tournament
export async function GET() {
  try {
    await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        scrimTournamentId: true,
        scrimTournament: {
          select: {
            id: true,
            name: true,
            status: true,
            format: true,
            heroImage: true,
            _count: { select: { matches: true } },
          },
        },
        tournaments: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            format: true,
            phase: true,
            heroImage: true,
            _count: { select: { matches: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!activeSeason) {
      return apiError("No active season found", 404);
    }

    return apiSuccess({
      season: activeSeason,
      scrimTournament: activeSeason.scrimTournament,
      availableTournaments: activeSeason.tournaments.filter(
        (t) => !t.phase // Exclude league/playoff phase tournaments
      ),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch season info";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}

// POST - Create a new scrim tournament for the active season
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const body = await request.json();
    const { name, heroImage, setAsDefault } = body as { name?: string; heroImage?: string; setAsDefault?: boolean };

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, endDate: true },
    });

    if (!activeSeason) {
      return apiError("No active season found", 404);
    }

    const tournamentName = name?.trim() || `${activeSeason.name} Scrims`;

    // Check if a tournament with this name already exists
    const existing = await prisma.tournament.findFirst({
      where: {
        seasonId: activeSeason.id,
        name: tournamentName,
        deletedAt: null,
      },
    });

    if (existing) {
      return apiError(`A tournament named "${tournamentName}" already exists`, 400);
    }

    const registrationDeadline = new Date();
    registrationDeadline.setDate(registrationDeadline.getDate() + 7);

    const tournament = await prisma.tournament.create({
      data: {
        seasonId: activeSeason.id,
        name: tournamentName,
        subtitle: "Weekly community scrims",
        format: TournamentFormat.ROUND_ROBIN,
        location: "Online",
        isOnline: true,
        date: activeSeason.endDate,
        registrationDeadline,
        slots: 128,
        status: TournamentStatus.OPEN,
        prizePool: null,
        heroImage: heroImage?.trim() || null,
      },
    });

    // Optionally set as the season's default scrim tournament
    if (setAsDefault) {
      await prisma.season.update({
        where: { id: activeSeason.id },
        data: { scrimTournamentId: tournament.id },
      });
    }

    await createAuditLog(
      admin.id,
      "CREATE_SCRIM_TOURNAMENT",
      "Tournament",
      tournament.id,
      JSON.stringify({ name: tournamentName, seasonId: activeSeason.id, setAsDefault })
    );

    return apiSuccess({
      message: "Scrim tournament created",
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
      },
      isDefault: setAsDefault ?? false,
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create scrim tournament";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}

// PUT - Set an existing tournament as the season's scrim tournament
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const body = await request.json();
    const { tournamentId } = body as { tournamentId?: string };

    if (!tournamentId || typeof tournamentId !== "string") {
      return apiError("tournamentId is required", 400);
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    if (!activeSeason) {
      return apiError("No active season found", 404);
    }

    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        seasonId: activeSeason.id,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!tournament) {
      return apiError("Tournament not found in the active season", 404);
    }

    await prisma.season.update({
      where: { id: activeSeason.id },
      data: { scrimTournamentId: tournamentId },
    });

    await createAuditLog(
      admin.id,
      "SET_SCRIM_TOURNAMENT",
      "Season",
      activeSeason.id,
      JSON.stringify({ tournamentId, tournamentName: tournament.name })
    );

    return apiSuccess({
      message: `"${tournament.name}" is now the scrim tournament for ${activeSeason.name}`,
      tournament,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set scrim tournament";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
