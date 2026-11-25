import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
  isValidHexColor,
} from "@/lib/api-utils";
import { TournamentStatus, TournamentFormat, AdminRoleType } from "@/app/generated/prisma/enums";
import { cacheResult, invalidatePattern } from "@/lib/redis";

import { prisma } from "@/lib/prisma";
import { Prisma } from '@/app/generated/prisma/client';
import { allocateGroups, defaultDrawConfig, drawSourceSignature, validateDraft, type FixtureDraft } from '@/lib/tournament-planner';

// GET - List tournaments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const seasonId = searchParams.get("seasonId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Generate cache key based on query params
    const cacheKey = `tournaments:${status || "all"}:${seasonId || "all"}:${limit}:${skip}`;

    const data = await cacheResult(
      cacheKey,
      async () => {
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
                where: { status: { in: ['APPROVED', 'PENDING'] } },
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

        return {
          tournaments: tournamentsWithFilled,
          pagination: {
            total,
            limit,
            skip,
          },
        };
      },
      { ttl: 300 } // Cache for 5 minutes
    );

    return apiSuccess(data);
  } catch (error: unknown) {
    console.error("Get tournaments error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch tournaments", 500);
  }
}

// POST - Create tournament
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
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

    const normalizedLocation = typeof location === "string" ? location.trim() : "";

    const normalizedPrizePool = typeof prizePool === "string" && prizePool.trim().length > 0
      ? prizePool.trim()
      : null;

    // Validation
    if (!seasonId || !name || !format || !date || !registrationDeadline || !slots) {
      return apiError("Season ID, name, format, date, registration deadline, and slots are required");
    }

    if (!isOnline && !normalizedLocation) {
      return apiError("Location is required for offline tournaments");
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

    const usesGroupDraw = ['GROUP_STAGE', 'ROUND_ROBIN'].includes(format);
    let initialDraft: FixtureDraft | undefined;
    if (usesGroupDraw) {
      try {
        const defaults = defaultDrawConfig({
          date: startDate, format, playDaysPerWeek: body.playDaysPerWeek ?? [0, 1, 2, 3, 4, 5, 6],
          matchesPerDay: body.matchesPerDay ?? 4, defaultBestOf: body.defaultBestOf ?? 3,
          numGroups: body.numGroups ?? null, teamsPerGroup: null, roundRobinLegs: 1,
          drawMode: body.drawMode ?? 'SEEDED', pointSystem: body.pointSystem ?? 'STANDARD', stages: [], registrations: [],
        });
        initialDraft = {
          config: { ...defaults, ...(body.playDates !== undefined && { playDates: body.playDates }) },
          groups: allocateGroups([], defaults.numGroups, defaults.drawMode),
          sourceSignature: drawSourceSignature(format, defaults, body.tiebreakerSequence ?? []),
        };
        validateDraft(initialDraft, [], format);
      } catch (error) { return apiError(error instanceof Error ? error.message : 'Check the tournament schedule.'); }
    }

    // Create tournament + initial stage
    const tournament = await prisma.tournament.create({
      data: {
        seasonId,
        name,
        subtitle: subtitle || null,
        description: description || null,
        format: format as TournamentFormat,
        location: normalizedLocation || "Online",
        isOnline: Boolean(isOnline),
        date: startDate,
        registrationDeadline: deadline,
        slots,
        status: TournamentStatus.OPEN,
        color: color || null,
        tags: tags || [],
        heroImage: heroImage || null,
        banner: banner || null,
        rules: rules || [],
        prizePool: normalizedPrizePool,
        ...(initialDraft && {
          playDaysPerWeek: initialDraft.config.playDays, matchesPerDay: initialDraft.config.matchesPerDay,
          defaultBestOf: initialDraft.config.bestOf, pointSystem: initialDraft.config.pointSystem,
          numGroups: initialDraft.config.numGroups, drawMode: initialDraft.config.drawMode,
          tiebreakerSequence: body.tiebreakerSequence ?? [],
          ...(body.playDates !== undefined && { fixtureDraft: { create: { data: initialDraft as unknown as Prisma.InputJsonValue } } }),
        }),
        stages: {
          create: {
            name: "Stage 1",
            order: 1,
            format: format as TournamentFormat,
            status: "UPCOMING",
          },
        },
      },
      include: {
        stages: true,
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

    // Invalidate tournament cache
    await invalidatePattern("tournaments:*");

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



