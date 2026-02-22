import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
  isValidHexColor,
} from "@/lib/api-utils";
import { TournamentStatus, TournamentFormat } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List tournaments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const seasonId = searchParams.get("seasonId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: { deletedAt: null; status?: TournamentStatus; seasonId?: string } = { deletedAt: null };
    if (status && Object.values(TournamentStatus).includes(status as TournamentStatus)) {
      where.status = status as TournamentStatus;
    }
    if (seasonId) {
      where.seasonId = seasonId;
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          season: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          registrations: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
          _count: {
            select: {
              registrations: true,
              matches: true,
            },
          },
        },
        orderBy: { date: "asc" },
        take: limit,
        skip,
      }),
      prisma.tournament.count({ where }),
    ]);

    // Transform to include filled count
    const tournamentsWithFilled = tournaments.map(t => ({
      ...t,
      filled: t.registrations.length,
      registrations: undefined,
    }));

    return apiSuccess({
      tournaments: tournamentsWithFilled,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get tournaments error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch tournaments", 500);
  }
}

// POST - Create tournament
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      seasonId,
      name,
      subtitle,
      description,
      format,
      location,
      isOnline,
      date,
      registrationDeadline,
      slots,
      color,
      tags,
      heroImage,
      banner,
      rules,
      prizePool,
      pointsFormulas,
    } = body;

    // Validation
    if (!seasonId || !name || !format || !location || !date || !registrationDeadline || !slots) {
      return apiError("Season ID, name, format, location, date, registration deadline, and slots are required");
    }

    if (!Object.values(TournamentFormat).includes(format)) {
      return apiError("Invalid tournament format");
    }

    if (color && !isValidHexColor(color)) {
      return apiError("Invalid color format");
    }

    const startDate = new Date(date);
    const deadline = new Date(registrationDeadline);

    if (isNaN(startDate.getTime()) || isNaN(deadline.getTime())) {
      return apiError("Invalid date format");
    }

    if (deadline >= startDate) {
      return apiError("Registration deadline must be before tournament start date");
    }

    if (slots < 2) {
      return apiError("Tournament must have at least 2 slots");
    }

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return apiError("Season not found", 404);
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        seasonId,
        name,
        subtitle: subtitle || null,
        description: description || null,
        format: format as TournamentFormat,
        location,
        isOnline: Boolean(isOnline),
        date: startDate,
        registrationDeadline: deadline,
        slots,
        status: TournamentStatus.UPCOMING,
        color: color || null,
        tags: tags || [],
        heroImage: heroImage || null,
        banner: banner || null,
        rules: rules || [],
        prizePool: prizePool || null,
      },
    });

    // Create points formulas if provided
    if (pointsFormulas && Array.isArray(pointsFormulas)) {
      await prisma.pointsFormula.createMany({
        data: pointsFormulas.map((pf: { placement: number; points: number }) => ({
          tournamentId: tournament.id,
          placement: pf.placement,
          points: pf.points,
        })),
      });
    }

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_TOURNAMENT",
      "Tournament",
      tournament.id,
      JSON.stringify({ name, format, slots })
    );

    return apiSuccess(
      {
        message: "Tournament created successfully",
        tournament,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return apiError(error.message, 403);
    }
    console.error("Create tournament error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to create tournament", 500);
  }
}



