import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  requireActiveUser,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { MatchStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// POST - Raise dispute
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return apiError("Dispute reason is required");
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        teamA: {
          select: { captainId: true },
        },
        teamB: {
          select: { captainId: true },
        },
        dispute: true,
      },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    if (match.status !== MatchStatus.COMPLETED) {
      return apiError("Can only dispute completed matches");
    }

    // Check if user is captain of one of the teams
    const isCaptain = match.teamA.captainId === user.id || match.teamB.captainId === user.id;
    if (!isCaptain) {
      return apiError("Only team captains can raise disputes", 403);
    }

    // Check if dispute already exists
    if (match.dispute) {
      return apiError("Dispute already raised for this match");
    }

    // Check 2-hour window
    const matchUpdated = match.updatedAt || match.createdAt;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (matchUpdated < twoHoursAgo) {
      return apiError("Dispute window has expired (2 hours after match completion)");
    }

    // Create dispute
    const dispute = await prisma.matchDispute.create({
      data: {
        matchId: id,
        raisedById: user.id,
        reason,
      },
    });

    // Update match status
    await prisma.match.update({
      where: { id },
      data: { status: MatchStatus.DISPUTED },
    });

    // Notify referee and tournament admin
    const admins = await prisma.adminRole.findMany({
      where: {
        role: { in: [AdminRoleType.TOURNAMENT_ADMIN, AdminRoleType.SUPER_ADMIN] },
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: "MATCH_DISPUTED",
          title: "Match Disputed",
          message: `Match ${id} has been disputed. Reason: ${reason}`,
          linkUrl: `/matches/${id}`,
        },
      });
    }

    if (match.refereeId) {
      await prisma.notification.create({
        data: {
          userId: match.refereeId,
          type: "MATCH_DISPUTED",
          title: "Match Disputed",
          message: `Match ${id} has been disputed. Reason: ${reason}`,
          linkUrl: `/matches/${id}`,
        },
      });
    }

    return apiSuccess(
      {
        message: "Dispute raised successfully",
        dispute,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to raise dispute";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Raise dispute error:", error);
    return apiError(message, 500);
  }
}

// PUT - Resolve dispute
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { resolution, resultChanged, scoreA, scoreB, winnerId } = body;

    if (!resolution) {
      return apiError("Resolution is required");
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        dispute: true,
        teamA: {
          select: { captainId: true },
        },
        teamB: {
          select: { captainId: true },
        },
      },
    });

    if (!match || !match.dispute) {
      return apiError("Dispute not found", 404);
    }

    if (match.dispute.resolvedAt) {
      return apiError("Dispute already resolved");
    }

    // Update match if result changed
    if (resultChanged) {
      const updateData: Prisma.MatchUpdateInput = {};
      if (scoreA !== undefined) updateData.scoreA = parseInt(scoreA);
      if (scoreB !== undefined) updateData.scoreB = parseInt(scoreB);
      if (winnerId !== undefined) updateData.winner = { connect: { id: winnerId } };

      await prisma.match.update({
        where: { id },
        data: {
          ...updateData,
          status: MatchStatus.COMPLETED,
        },
      });
    } else {
      await prisma.match.update({
        where: { id },
        data: { status: MatchStatus.COMPLETED },
      });
    }

    // Resolve dispute
    await prisma.matchDispute.update({
      where: { matchId: id },
      data: {
        resolvedAt: new Date(),
        resolvedById: admin.id,
        resolution,
        resultChanged: Boolean(resultChanged),
      },
    });

    // Notify both captains
    if (match.teamA.captainId) {
      await prisma.notification.create({
        data: {
          userId: match.teamA.captainId,
          type: "MATCH_DISPUTE_RESOLVED",
          title: "Dispute Resolved",
          message: `Dispute for match ${id} has been resolved. ${resolution}`,
          linkUrl: `/matches/${id}`,
        },
      });
    }

    if (match.teamB.captainId) {
      await prisma.notification.create({
        data: {
          userId: match.teamB.captainId,
          type: "MATCH_DISPUTE_RESOLVED",
          title: "Dispute Resolved",
          message: `Dispute for match ${id} has been resolved. ${resolution}`,
          linkUrl: `/matches/${id}`,
        },
      });
    }

    // Create audit log
    await createAuditLog(
      admin.id,
      "RESOLVE_DISPUTE",
      "MatchDispute",
      match.dispute.id,
      JSON.stringify({ resolution, resultChanged })
    );

    return apiSuccess({
      message: "Dispute resolved successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve dispute";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Resolve dispute error:", error);
    return apiError(message, 500);
  }
}



