import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// DELETE /api/matches/challenges/reset - Hard delete all match challenges (SUPER_ADMIN or TOURNAMENT_ADMIN)
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);

    const deleteResult = await prisma.matchChallenge.deleteMany({});

    await createAuditLog(
      admin.id,
      "RESET_ALL_CHALLENGES",
      "MATCH_CHALLENGE",
      "ALL",
      JSON.stringify({ count: deleteResult.count })
    );

    return apiSuccess({
      message: `Successfully reset and hard deleted ${deleteResult.count} match challenge(s).`,
      count: deleteResult.count,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset challenges";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}
