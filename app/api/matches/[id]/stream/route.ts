import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { AdminRoleType, MatchStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// PATCH - Toggle live status and/or set the stream link for a match.
// STREAMER can only touch these two fields, nothing else on the match.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { status, streamUrl } = body;

    const isStreamer =
      user.role === AdminRoleType.STREAMER ||
      user.role === AdminRoleType.TOURNAMENT_ADMIN ||
      user.role === AdminRoleType.SUPER_ADMIN;

    if (!isStreamer) {
      return apiError("Only streamers and admins can update stream info", 403);
    }

    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) {
      return apiError("Match not found", 404);
    }

    const updateData: { status?: MatchStatus; streamUrl?: string | null } = {};

    if (status !== undefined) {
      if (status !== MatchStatus.LIVE && status !== MatchStatus.UPCOMING) {
        return apiError("Streamers can only toggle status between LIVE and UPCOMING");
      }
      updateData.status = status;
    }

    if (streamUrl !== undefined) {
      updateData.streamUrl = streamUrl || null;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.match.update({
      where: { id },
      data: updateData,
    });

    return apiSuccess({
      message: "Stream info updated successfully",
      match: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update stream info";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Update stream info error:", error);
    return apiError(message, 500);
  }
}
