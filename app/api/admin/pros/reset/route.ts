import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { resetProVotes, getAggregatedVotes } from "@/lib/pro-votes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/pros/reset
 * Admin endpoint to reset interview votes for a specific candidate or all candidates.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const { candidateId, resetAll } = body as { candidateId?: string; resetAll?: boolean };

    await resetProVotes(candidateId);

    // Removed the global notification broadcast to prevent NotificationType typescript error
    // and to avoid spamming the entire database of users.

    const updatedStats = await getAggregatedVotes(admin.id);
    return apiSuccess({ message: "Interview votes reset successfully", ...updatedStats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset votes";
    if (message === "Unauthorized") return apiError("Admin authentication required", 401);
    if (message === "Forbidden") return apiError("Admin access required", 403);
    return apiError(message, 500);
  }
}
