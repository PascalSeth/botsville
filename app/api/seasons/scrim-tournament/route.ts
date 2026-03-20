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
            banner: true,
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
            banner: true,
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
    const {
      name,
      banner,
      setAsDefault,
      tournamentType = 'ROUND_ROBIN',
      matchesPerTeam = 4,
      numTeams = 8,
      leagueStartDate,
      swissWinLimit = 3,
      swissLossLimit = 3,
      swissPointsPerWin = 3,
      gslTeamsPerGroup = 4,
      playoffBracketSize = 8,
    } = body as {
      name?: string;
      banner?: string;
      setAsDefault?: boolean;
      tournamentType?: string;
      matchesPerTeam?: number;
      numTeams?: number;
      leagueStartDate?: string;
      swissWinLimit?: number;
      swissLossLimit?: number;
      swissPointsPerWin?: number;
      gslTeamsPerGroup?: number;
      playoffBracketSize?: number;
    };

    // Validate tournament type
    const validTypes = ['ROUND_ROBIN', 'SWISS', 'GSL', 'SINGLE_ELIM', 'DOUBLE_ELIM'];
    if (!validTypes.includes(tournamentType)) {
      return apiError(`Invalid tournament type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Validate based on tournament type
    if (tournamentType === 'ROUND_ROBIN' && (matchesPerTeam < 1 || matchesPerTeam > numTeams - 1)) {
      return apiError(`matchesPerTeam must be between 1 and ${numTeams - 1}`, 400);
    }

    if (tournamentType === 'SWISS') {
      if (swissWinLimit < 1 || swissWinLimit > 10) return apiError('swissWinLimit must be 1-10', 400);
      if (swissLossLimit < 1 || swissLossLimit > 10) return apiError('swissLossLimit must be 1-10', 400);
      if (swissPointsPerWin < 1 || swissPointsPerWin > 10) return apiError('swissPointsPerWin must be 1-10', 400);
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, endDate: true },
    });

    if (!activeSeason) {
      return apiError("No active season found", 404);
    }

    const tournamentName = name?.trim() || `${activeSeason.name} - ${tournamentType}`;

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

    const tournamentDate = leagueStartDate ? new Date(leagueStartDate) : new Date(activeSeason.endDate);
    if (isNaN(tournamentDate.getTime())) {
      return apiError("Invalid tournament date");
    }

    // Build rules based on tournament type
    let rules: string[] = [];
    let totalMatches = 0;
    let description = '';

    if (tournamentType === 'ROUND_ROBIN') {
      totalMatches = Math.floor((numTeams * matchesPerTeam) / 2);
      rules = [
        `${numTeams} teams`,
        `${matchesPerTeam} matches per team (${totalMatches} total)`,
        `Points: Win (3) | 2-1 (2) | 1-2 (1) | Loss (0)`,
        `Format: Round Robin with bracket progression to finals`,
      ];
      description = 'Every team plays every other team multiple times. Used in professional league seasons.';
    } else if (tournamentType === 'SWISS') {
      totalMatches = numTeams * 2; // Estimate
      rules = [
        `${numTeams} teams`,
        `Swiss System: Teams paired by record each round`,
        `Qualify at ${swissWinLimit} wins | Eliminate at ${swissLossLimit} losses`,
        `Points per win: ${swissPointsPerWin}`,
        `Best for large group stages (16+ teams)`,
      ];
      description = 'Perfect for World Championships. Teams play opponents of equal skill level.';
    } else if (tournamentType === 'GSL') {
      totalMatches = (numTeams / 4) * 3; // 3 matches per group of 4
      rules = [
        `${numTeams} teams in groups of ${gslTeamsPerGroup}`,
        `Each group: Winners Match → Elimination Match → Decider`,
        `Top 1 from each group advances (${numTeams / 4} slots to playoffs)`,
        `Used in Mid-Season Cups and regional events`,
      ];
      description = 'Intense group format with zero meaningless games. Used in MSC.';
    } else if (tournamentType === 'SINGLE_ELIM') {
      totalMatches = playoffBracketSize - 1; // Single elim always has n-1 matches
      rules = [
        `${playoffBracketSize} teams bracket`,
        `Single Elimination: One loss and you are out`,
        `Fast, brutal format for qualifiers`,
        `Matches: ${totalMatches}`,
      ];
      description = 'One loss and you\'re eliminated. Perfect for qualifiers with time constraints.';
    } else if (tournamentType === 'DOUBLE_ELIM') {
      totalMatches = (playoffBracketSize * 2) - 2; // Approximate for double elim
      rules = [
        `${playoffBracketSize} teams bracket`,
        `Double Elimination: Upper + Lower brackets`,
        `Grand Final: Winner\'s Bracket vs Loser\'s Bracket champion`,
        `Used in all major MPL and M-Series playoffs`,
        `Matches: ~${totalMatches}`,
      ];
      description = 'The fairest playoff format. Ensures the best two teams meet in the Grand Final.';
    }

    const tournament = await prisma.tournament.create({
      data: {
        seasonId: activeSeason.id,
        name: tournamentName,
        subtitle: description,
        format: tournamentType as TournamentFormat,
        location: "Online",
        isOnline: true,
        date: tournamentDate,
        registrationDeadline,
        slots: numTeams > 16 ? 128 : 64,
        status: TournamentStatus.OPEN,
        prizePool: null,
        banner: banner?.trim() || null,
        rules,
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
      JSON.stringify({
        name: tournamentName,
        seasonId: activeSeason.id,
        setAsDefault,
        tournamentType,
        configuration: { 
          numTeams, 
          matchesPerTeam: tournamentType === 'ROUND_ROBIN' ? matchesPerTeam : undefined,
          swissRules: tournamentType === 'SWISS' ? { swissWinLimit, swissLossLimit, swissPointsPerWin } : undefined,
        },
      })
    );

    return apiSuccess({
      message: "Scrim tournament created",
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        type: tournamentType,
        configuration: {
          teams: numTeams,
          totalMatches,
        },
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
