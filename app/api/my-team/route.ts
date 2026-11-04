import { ensureTeamRosterBalance } from "@/lib/team-roster";
import { requireActiveUser, apiError, apiSuccess, generateUniqueTeamCode } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET - Get current user's team with full details
export async function GET() {
  try {
    const user = await requireActiveUser();

    // Check if user is a captain of a team
    const captainOf = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
      include: {
        players: {
          where: { deletedAt: null },
          select: {
            id: true,
            ign: true,
            role: true,
            photo: true,
            isSubstitute: true,
            user: {
              select: {
                id: true,
                ign: true,
                photo: true,
              },
            },
          },
          orderBy: [
            { isSubstitute: "asc" },
            { role: "asc" },
          ],
        },
      },
    });

    if (captainOf) {
      const capStarters = captainOf.players.filter((p) => !p.isSubstitute);
      const capSubs = captainOf.players.filter((p) => p.isSubstitute);
      if (capStarters.length > 5 || (capStarters.length < 5 && capSubs.length > 0)) {
        await ensureTeamRosterBalance(captainOf.id);
        captainOf.players = await prisma.player.findMany({
          where: { teamId: captainOf.id, deletedAt: null },
          select: {
            id: true,
            ign: true,
            role: true,
            photo: true,
            isSubstitute: true,
            user: {
              select: { id: true, ign: true, photo: true },
            },
          },
          orderBy: [{ isSubstitute: "asc" }, { role: "asc" }],
        });
      }
      let teamCode = captainOf.teamCode;
      if (!teamCode) {
        teamCode = await generateUniqueTeamCode();
        await prisma.team.update({
          where: { id: captainOf.id },
          data: { teamCode },
        });
      }
      return apiSuccess({
        ...captainOf,
        teamCode,
        isCaptain: true,
      });
    }

    // Check if user is a player on a team
    const playerRecord = await prisma.player.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
              select: {
                id: true,
                ign: true,
                role: true,
                photo: true,
                isSubstitute: true,
                user: {
                  select: {
                    id: true,
                    ign: true,
                    photo: true,
                  },
                },
              },
              orderBy: [
                { isSubstitute: "asc" },
                { role: "asc" },
              ],
            },
          },
        },
      },
    });

    if (playerRecord?.team) {
      // Auto-cleanup: if the team has been disbanded (soft-deleted), free the player silently
      if (playerRecord.team.deletedAt) {
        await prisma.player.delete({ where: { id: playerRecord.id } });
        return apiSuccess(null);
      }
      const memStarters = playerRecord.team.players.filter((p) => !p.isSubstitute);
      const memSubs = playerRecord.team.players.filter((p) => p.isSubstitute);
      if (memStarters.length > 5 || (memStarters.length < 5 && memSubs.length > 0)) {
        await ensureTeamRosterBalance(playerRecord.team.id);
        playerRecord.team.players = await prisma.player.findMany({
          where: { teamId: playerRecord.team.id, deletedAt: null },
          select: {
            id: true,
            ign: true,
            role: true,
            photo: true,
            isSubstitute: true,
            user: {
              select: { id: true, ign: true, photo: true },
            },
          },
          orderBy: [{ isSubstitute: "asc" }, { role: "asc" }],
        });
      }
      let teamCode = playerRecord.team.teamCode;
      if (!teamCode) {
        teamCode = await generateUniqueTeamCode();
        await prisma.team.update({
          where: { id: playerRecord.team.id },
          data: { teamCode },
        });
      }
      return apiSuccess({
        ...playerRecord.team,
        teamCode,
        isCaptain: playerRecord.team.captainId === user.id,
      });
    }

    // No team found
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Get my team error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to fetch team",
      500
    );
  }
}
