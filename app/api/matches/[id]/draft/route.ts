import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { DraftType, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get match draft data
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const gameNumber = searchParams.get("gameNumber");

    const where: Prisma.MatchDraftWhereInput = { matchId: id };
    if (gameNumber) {
      where.gameNumber = parseInt(gameNumber);
    }

    const drafts = await prisma.matchDraft.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
      orderBy: [{ gameNumber: "asc" }, { order: "asc" }],
    });

    return apiSuccess(drafts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch draft";
    console.error("Get draft error:", error);
    return apiError(message, 500);
  }
}

// POST - Record draft data
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { drafts } = body; // Array of draft entries

    if (!drafts || !Array.isArray(drafts)) {
      return apiError("Drafts array is required");
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        teamA: true,
        teamB: true,
      },
    });

    if (!match) {
      return apiError("Match not found", 404);
    }

    // Only referees and tournament admins can record draft
    const isReferee = user.role === AdminRoleType.REFEREE || user.role === AdminRoleType.TOURNAMENT_ADMIN || user.role === AdminRoleType.SUPER_ADMIN;

    if (!isReferee) {
      return apiError("Only referees can record draft data", 403);
    }

    const createdDrafts = [];
    for (const draft of drafts) {
      const { gameNumber, teamId, hero, type, phase, order } = draft;

      if (!gameNumber || !teamId || !hero || !type || !phase || order === undefined) {
        return apiError("All draft fields are required");
      }

      if (teamId !== match.teamAId && teamId !== match.teamBId) {
        return apiError(`Team ${teamId} is not part of this match`);
      }

      if (!Object.values(DraftType).includes(type)) {
        return apiError("Invalid draft type");
      }

      const created = await prisma.matchDraft.create({
        data: {
          matchId: id,
          gameNumber: parseInt(gameNumber),
          teamId,
          hero,
          type: type as DraftType,
          phase,
          order: parseInt(order),
        },
      });

      createdDrafts.push(created);
    }

    return apiSuccess(
      {
        message: "Draft data recorded successfully",
        drafts: createdDrafts,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record draft";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Record draft error:", error);
    return apiError(message, 500);
  }
}



