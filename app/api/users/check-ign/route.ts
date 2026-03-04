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

  if (!ign || ign.length < 3 || !teamCode || teamCode.length !== 6) {
    return apiSuccess({ found: false, team: null });
  }

  const player = await prisma.player.findFirst({
    where: {
      ign,
      userId: null,
      deletedAt: null,
      team: { teamCode },
    },
    select: {
      id: true,
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          tag: true,
          logo: true,
          color: true,
        },
      },
    },
  });

  if (!player) {
    return apiSuccess({ found: false, team: null });
  }

  return apiSuccess({
    found: true,
    team: player.team,
    role: player.role,
  });
}
