import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { MatchStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get match details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
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
        screenshots: {
          orderBy: [{ gameNumber: "asc" }, { uploadedAt: "asc" }],
        },
        performances: {
          include: {
            player: {
              select: {
                id: true,
                ign: true,
                role: true,
              },
            },
          },
          orderBy: [{ gameNumber: "asc" }, { player: { role: "asc" } }],
        },
        drafts: {
          orderBy: [{ gameNumber: "asc" }, { order: "asc" }],
        },
        dispute: true,
      },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    return apiSuccess(match);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch match";
    console.error("Get match error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update match (score, status, etc.)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { status, scoreA, scoreB, elapsed, winnerId } = body;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        teamA: {
          select: { captainId: true },
        },
        teamB: {
          select: { captainId: true },
        },
      },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    // Check permissions
    const isReferee = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;
    const isCaptain = match.teamA.captainId === user.id || match.teamB.captainId === user.id;

    if (!isReferee && !isCaptain) {
      return apiError("Only referees and team captains can update matches", 403);
    }

    const updateData: Prisma.MatchUpdateInput = {};

    if (status !== undefined) {
      if (!Object.values(MatchStatus).includes(status)) {
        return apiError("Invalid status");
      }
      updateData.status = status;
    }

    if (scoreA !== undefined) updateData.scoreA = parseInt(scoreA);
    if (scoreB !== undefined) updateData.scoreB = parseInt(scoreB);
    if (elapsed !== undefined) updateData.elapsed = elapsed;
    if (winnerId !== undefined) {
      if (winnerId !== match.teamAId && winnerId !== match.teamBId) {
        return apiError("Winner must be one of the competing teams");
      }
      updateData.winner = { connect: { id: winnerId } };
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.match.update({
      where: { id },
      data: updateData,
    });

    // If match completed, notify both captains
    if (status === MatchStatus.COMPLETED && updated.winnerId) {
      const [teamA, teamB] = await Promise.all([
        prisma.team.findUnique({
          where: { id: match.teamAId },
          select: { captainId: true },
        }),
        prisma.team.findUnique({
          where: { id: match.teamBId },
          select: { captainId: true },
        }),
      ]);

      if (teamA?.captainId) {
        await prisma.notification.create({
          data: {
            userId: teamA.captainId,
            type: "MATCH_RESULT_SUBMITTED",
            title: "Match Result Submitted",
            message: `Match result has been submitted. You have 2 hours to dispute if needed.`,
            linkUrl: `/matches/${id}`,
          },
        });
      }

      if (teamB?.captainId) {
        await prisma.notification.create({
          data: {
            userId: teamB.captainId,
            type: "MATCH_RESULT_SUBMITTED",
            title: "Match Result Submitted",
            message: `Match result has been submitted. You have 2 hours to dispute if needed.`,
            linkUrl: `/matches/${id}`,
          },
        });
      }
    }

    return apiSuccess({
      message: "Match updated successfully",
      match: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update match";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Update match error:", error);
    return apiError(message, 500);
  }
}



