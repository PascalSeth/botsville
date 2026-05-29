import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest) {
  try {
    const user = await requireActiveUser();

    const team = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!team) {
      return apiError("Team not found", 404);
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { deletedAt: new Date() },
    });

    // Soft-delete all players on the disbanded team (retains stats & records)
    await prisma.player.updateMany({
      where: { teamId: team.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return apiSuccess({ message: "Team disbanded successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Disband team error:", error);
    const message = error instanceof Error ? error.message : "Failed to disband team";
    return apiError(message, 500);
  }
}
