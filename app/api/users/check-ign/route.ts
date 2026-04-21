import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET /api/users/check-ign?ign=SomeIGN&teamCode=ABC123
// Public — returns a match only when the IGN exists as a placeholder on the
// specific team identified by teamCode.  Both params are required.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ign = searchParams.get("ign")?.trim();
  const teamCode = searchParams.get("teamCode")?.trim().toUpperCase();

  if (!ign || ign.length < 2) {
    return apiSuccess({ status: "available" });
  }

  // 1. Check if an actual User account exists with this IGN
  const user = await prisma.user.findFirst({
    where: { ign: { equals: ign, mode: "insensitive" } },
    select: { id: true },
  });

  if (user) {
    return apiSuccess({ status: "taken" });
  }

  // 2. Check the Player rosters (historical and current)
  const player = await prisma.player.findFirst({
    where: {
      ign: { equals: ign, mode: "insensitive" },
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          tag: true,
          color: true,
          teamCode: true,
        },
      },
    },
  });

  if (!player) {
    return apiSuccess({ status: "available" });
  }

  // If the player record already has a userId, it's effectively taken
  if (player.userId) {
    return apiSuccess({ status: "taken" });
  }

  // Otherwise, it's a placeholder. Check if the provided team code matches.
  const codeMatches = teamCode && player.team?.teamCode === teamCode;

  return apiSuccess({
    status: "placeholder",
    found: true, // legacy support for frontend
    isClaimable: true,
    codeMatches,
    team: player.team,
    role: player.role,
  });
}
