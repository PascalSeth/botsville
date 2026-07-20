import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/players/cleanup
 * Finds and deletes player records linked to soft-deleted (disbanded) teams,
 * freeing those users to join new teams.
 * Body: { dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    // Find all player records where the team has been disbanded (deletedAt set)
    const orphaned = await prisma.player.findMany({
      where: {
        team: { deletedAt: { not: null } },
      },
      select: {
        id: true,
        ign: true,
        userId: true,
        teamId: true,
        team: { select: { name: true, deletedAt: true } },
      },
    });

    if (dryRun) {
      return apiSuccess({
        dryRun: true,
        count: orphaned.length,
        players: orphaned.map((p) => ({
          id: p.id,
          ign: p.ign,
          userId: p.userId,
          teamId: p.teamId,
          disbandedTeam: p.team.name,
          teamDisbandedAt: p.team.deletedAt,
        })),
      });
    }

    if (orphaned.length === 0) {
      return apiSuccess({ message: "No stuck players found — all clear!", freed: 0 });
    }

    // Hard-delete the orphaned player records
    const { count } = await prisma.player.deleteMany({
      where: {
        id: { in: orphaned.map((p) => p.id) },
      },
    });

    // Invalidate cached team and leaderboard listings
    const { invalidatePattern } = await import("@/lib/redis");
    await invalidatePattern("teams:*");
    await invalidatePattern("leaderboard:*");

    // Also cancel any pending invites from/to these now-freed users
    const userIds = orphaned.map((p) => p.userId).filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.teamInvite.updateMany({
        where: {
          OR: [
            { fromUserId: { in: userIds }, status: "PENDING" },
            { toUserId: { in: userIds }, status: "PENDING" },
          ],
        },
        data: { status: "DECLINED" },
      });
    }

    return apiSuccess({
      message: `Freed ${count} stuck player(s) from disbanded teams.`,
      freed: count,
      players: orphaned.map((p) => ({ ign: p.ign, userId: p.userId, team: p.team.name })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Player cleanup error:", error);
    return apiError(error instanceof Error ? error.message : "Cleanup failed", 500);
  }
}
