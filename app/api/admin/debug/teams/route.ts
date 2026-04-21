import { NextRequest } from "next/server";
import { requireSuperAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/debug/teams
 * Scans for leaderless teams or teams with invalid captainIds.
 */
export async function GET() {
  try {
    await requireSuperAdmin();

    const teams = await prisma.team.findMany({
      where: { deletedAt: null },
      include: {
        players: {
          where: { deletedAt: null },
          select: {
            id: true,
            ign: true,
            userId: true,
          },
        },
      },
    });

    const issues = [];

    for (const team of teams) {
      const hasCaptain = !!team.captainId;
      const registeredPlayers = team.players.filter((p) => !!p.userId);
      
      let captainStillExists = false;
      if (hasCaptain) {
        const user = await prisma.user.findUnique({
          where: { id: team.captainId! },
          select: { id: true },
        });
        captainStillExists = !!user;
      }

      const status = {
        name: team.name,
        id: team.id,
        captainId: team.captainId,
        playerCount: team.players.length,
        registeredCount: registeredPlayers.length,
        hasCaptain,
        captainStillExists,
        isStuck: !hasCaptain || (!captainStillExists && hasCaptain),
        potentialCaptains: registeredPlayers.map(p => ({ ign: p.ign, userId: p.userId }))
      };

      if (status.isStuck) {
        issues.push(status);
      }
    }

    return apiSuccess({
      summary: {
        totalActiveTeams: teams.length,
        stuckTeams: issues.length,
      },
      issues
    });
  } catch (error) {
    console.error("Debug Teams GET error:", error);
    return apiError(error instanceof Error ? error.message : "Debug failed", 500);
  }
}

/**
 * POST /api/admin/debug/teams?action=repair
 * Automatically assigns the first registered member as captain for leaderless teams.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action !== "repair") {
      return apiError("Missing or invalid action. Use ?action=repair", 400);
    }

    const stuckTeams = await prisma.team.findMany({
      where: {
        deletedAt: null,
        OR: [
          { captainId: null },
          {
            captain: { is: null } // This handles cases where captainId exists but User is deleted
          }
        ]
      },
      include: {
        players: {
          where: { deletedAt: null, userId: { not: null } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const results = {
      repaired: 0,
      couldNotRepair: 0,
      details: [] as string[]
    };

    await prisma.$transaction(async (tx) => {
      for (const team of stuckTeams) {
        if (team.players.length > 0) {
          const firstRegistrant = team.players[0];
          
          await tx.team.update({
            where: { id: team.id },
            data: { captainId: firstRegistrant.userId }
          });

          await tx.adminAuditLog.create({
            data: {
              actorId: adminUser.id,
              action: "AUTO_REPAIR_CAPTAIN",
              targetType: "Team",
              targetId: team.id,
              details: `Assigned ${firstRegistrant.ign} (${firstRegistrant.userId}) as captain of leaderless team ${team.name}`
            }
          });

          results.repaired++;
          results.details.push(`REPAIRED: ${team.name} -> ${firstRegistrant.ign}`);
        } else {
          results.couldNotRepair++;
        }
      }
    });

    return apiSuccess(results);
  } catch (error) {
    console.error("Debug Teams POST error:", error);
    return apiError(error instanceof Error ? error.message : "Repair failed", 500);
  }
}
