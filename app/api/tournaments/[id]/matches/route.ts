import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { MatchStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List tournament matches
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");

    const where: Prisma.MatchWhereInput = { tournamentId: id };
    if (status && Object.values(MatchStatus).includes(status as MatchStatus)) {
      where.status = status as MatchStatus;
    }
    if (stage) {
      where.stage = { contains: stage };
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        teamA: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
          },
        },
        teamB: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
        challengeRequest: {
          select: {
            id: true,
            status: true,
            challengerTeamId: true,
            challengedTeamId: true,
          },
        },
        _count: {
          select: {
            screenshots: true,
            performances: true,
          },
        },
      },
      orderBy: { scheduledTime: "asc" },
    });

    return apiSuccess(matches);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch matches";
    console.error("Get matches error:", error);
    return apiError(message, 500);
  }
}

// POST - Create match
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { teamAId, teamBId, scheduledTime, stage, bestOf, refereeId } = body;

    if (!teamAId || !teamBId || !scheduledTime) {
      return apiError("Team A, Team B, and scheduled time are required");
    }

    if (teamAId === teamBId) {
      return apiError("Teams must be different");
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    // Auto-register teams if not already registered
    let teamAReg = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: id,
          teamId: teamAId,
        },
      },
    });

    if (!teamAReg) {
      // Team A not registered, create registration with APPROVED status
      teamAReg = await prisma.tournamentRegistration.create({
        data: {
          tournamentId: id,
          teamId: teamAId,
          status: "APPROVED",
        },
      });
    } else if (teamAReg.status !== "APPROVED") {
      // Team A registered but not approved, update to APPROVED
      teamAReg = await prisma.tournamentRegistration.update({
        where: {
          tournamentId_teamId: {
            tournamentId: id,
            teamId: teamAId,
          },
        },
        data: { status: "APPROVED" },
      });
    }

    let teamBReg = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: id,
          teamId: teamBId,
        },
      },
    });

    if (!teamBReg) {
      // Team B not registered, create registration with APPROVED status
      teamBReg = await prisma.tournamentRegistration.create({
        data: {
          tournamentId: id,
          teamId: teamBId,
          status: "APPROVED",
        },
      });
    } else if (teamBReg.status !== "APPROVED") {
      // Team B registered but not approved, update to APPROVED
      teamBReg = await prisma.tournamentRegistration.update({
        where: {
          tournamentId_teamId: {
            tournamentId: id,
            teamId: teamBId,
          },
        },
        data: { status: "APPROVED" },
      });
    }

    const scheduled = new Date(scheduledTime);
    if (isNaN(scheduled.getTime())) {
      return apiError("Invalid scheduled time format");
    }

    const match = await prisma.match.create({
      data: {
        tournamentId: id,
        teamAId,
        teamBId,
        scheduledTime: scheduled,
        stage: stage || null,
        bestOf: bestOf || 3,
        refereeId: refereeId || null,
        status: MatchStatus.UPCOMING,
      },
      include: {
        teamA: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
        teamB: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    // Notify both team captains
    const [teamA, teamB] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamAId },
        select: { captainId: true },
      }),
      prisma.team.findUnique({
        where: { id: teamBId },
        select: { captainId: true },
      }),
    ]);

    if (teamA?.captainId) {
      await prisma.notification.create({
        data: {
          userId: teamA.captainId,
          type: "MATCH_SCHEDULED",
          title: "Match Scheduled",
          message: `Your match against ${match.teamB.name} is scheduled for ${scheduled.toLocaleString()}`,
          linkUrl: `/matches/${match.id}`,
        },
      });
    }

    if (teamB?.captainId) {
      await prisma.notification.create({
        data: {
          userId: teamB.captainId,
          type: "MATCH_SCHEDULED",
          title: "Match Scheduled",
          message: `Your match against ${match.teamA.name} is scheduled for ${scheduled.toLocaleString()}`,
          linkUrl: `/matches/${match.id}`,
        },
      });
    }

    // Create audit log
    await createAuditLog(
      admin.id,
      "CREATE_MATCH",
      "Match",
      match.id,
      JSON.stringify({ teamAId, teamBId, scheduledTime })
    );

    return apiSuccess(
      {
        message: "Match created successfully",
        match,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create match";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Create match error:", error);
    return apiError(message, 500);
  }
}



