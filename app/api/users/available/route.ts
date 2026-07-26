import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const teamId = searchParams.get("teamId")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    // Build user search filter
    const where: any = {
      deletedAt: null,
      status: "ACTIVE",
    };

    if (q.length > 0) {
      where.ign = {
        contains: q,
        mode: "insensitive",
      };
    } else {
      // Default: show users open to offers or recent active users
      where.openToOffers = true;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        ign: true,
        photo: true,
        mainRole: true,
        region: true,
        openToOffers: true,
        player: {
          select: {
            id: true,
            deletedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                deletedAt: true,
              },
            },
          },
        },
      },
      orderBy: [
        { openToOffers: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Check pending invites for specified teamId if provided
    let pendingInviteIGNs = new Set<string>();
    if (teamId) {
      const pendingInvites = await prisma.teamInvite.findMany({
        where: {
          teamId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { toIGN: true },
      });
      pendingInviteIGNs = new Set(pendingInvites.map((i) => i.toIGN.toLowerCase()));
    }

    const formattedUsers = users.map((u) => {
      const activePlayer = u.player && !u.player.deletedAt && u.player.team && !u.player.team.deletedAt;
      return {
        id: u.id,
        ign: u.ign,
        photo: u.photo,
        mainRole: u.mainRole,
        region: u.region,
        openToOffers: u.openToOffers,
        inTeam: Boolean(activePlayer),
        teamName: activePlayer ? u.player?.team?.name : null,
        teamTag: activePlayer ? u.player?.team?.tag : null,
        hasPendingInvite: pendingInviteIGNs.has(u.ign.toLowerCase()),
      };
    });

    return apiSuccess({ users: formattedUsers }, 200, {
      "Cache-Control": "private, no-cache",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to search available users";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Search available users error:", error);
    return apiError(message, 500);
  }
}
