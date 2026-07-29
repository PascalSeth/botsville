import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { GameRole, TeamStatus } from "@/app/generated/prisma/enums";

export const dynamic = "force-dynamic";

// GET - Get active event config and current team stats
export async function GET() {
  try {
    const event = await prisma.soloDraftEvent.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!event) {
      return apiSuccess({ event: null, teams: [] });
    }

    // Fetch all teams marked as draft teams
    const draftTeams = await prisma.team.findMany({
      where: {
        isDraftTeam: true,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { players: { where: { deletedAt: null } } }
        }
      },
      orderBy: {
        registeredAt: 'asc'
      }
    });

    return apiSuccess({
      event,
      teams: draftTeams.map(t => ({
        id: t.id,
        name: t.name,
        playerCount: t._count.players,
      }))
    });
  } catch (error: unknown) {
    console.error("Get solo draft event error:", error);
    return apiError("Internal server error", 500);
  }
}

// POST - Join a draft team
export async function POST(req: Request) {
  try {
    const user = await requireActiveUser();
    
    const body = await req.json();
    const { photoUrl } = body;

    if (!photoUrl) {
      return apiError("A clear player portrait photo is required.", 400);
    }

    // Check if user is already in an active team
    const activePlayerOnTeam = await prisma.player.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: { team: true },
    });
    
    if (activePlayerOnTeam && activePlayerOnTeam.team && !activePlayerOnTeam.team.deletedAt) {
      return apiError(`You are already in a team (${activePlayerOnTeam.team.name}).`, 400);
    }

    // Find the active event
    const event = await prisma.soloDraftEvent.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!event) {
      return apiError("There is no active Solo Draft Event right now.", 400);
    }

    // Fetch draft teams with their active player counts
    const draftTeams = await prisma.team.findMany({
      where: { isDraftTeam: true, deletedAt: null },
      include: {
        players: { where: { deletedAt: null } }
      },
      orderBy: { registeredAt: 'asc' }
    });

    let targetTeam = null;

    // First try to find a team with space
    for (const team of draftTeams) {
      if (team.players.length < event.playersPerTeam) {
        targetTeam = team;
        break; // found an open team
      }
    }

    let isCaptain = false;

    // If no team found with space, see if we can create a new one
    if (!targetTeam) {
      if (draftTeams.length >= event.maxTeams) {
        return apiError("All team slots are full. Registration is closed.", 400);
      }
      
      // Create a new team
      const newTeamNumber = draftTeams.length + 1;
      targetTeam = await prisma.team.create({
        data: {
          name: `Draft Team ${newTeamNumber}`,
          tag: `DT${newTeamNumber}`,
          region: "EVENT",
          status: TeamStatus.ACTIVE,
          isRecruiting: false,
          isDraftTeam: true,
          captainId: user.id,
          ...(event.tournamentId ? {
            registrations: {
              create: {
                tournamentId: event.tournamentId,
                status: "APPROVED" // Auto-approve draft teams
              }
            }
          } : {})
        }
      });
      
      isCaptain = true;
    }

    // Upsert the Player record for the user (re-use existing player record if one exists, even if soft-deleted)
    const existingPlayerRecord = await prisma.player.findUnique({
      where: { userId: user.id },
    });

    if (existingPlayerRecord) {
      await prisma.player.update({
        where: { id: existingPlayerRecord.id },
        data: {
          teamId: targetTeam.id,
          ign: user.ign,
          role: user.mainRole as unknown as GameRole,
          photo: photoUrl,
          deletedAt: null, // restore active state
        },
      });
    } else {
      await prisma.player.create({
        data: {
          userId: user.id,
          teamId: targetTeam.id,
          ign: user.ign,
          role: user.mainRole as unknown as GameRole,
          photo: photoUrl,
        },
      });
    }

    // Update the user's profile photo globally
    await prisma.user.update({
      where: { id: user.id },
      data: { photo: photoUrl }
    });

    return apiSuccess({ 
      message: isCaptain 
        ? "You have joined the event and became a Captain!" 
        : "You have joined the event team successfully!", 
      team: targetTeam, 
      isCaptain 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to join event";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Join event error:", error);
    return apiError(message, 500);
  }
}
