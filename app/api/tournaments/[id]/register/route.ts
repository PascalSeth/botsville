import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { RegistrationStatus, TournamentStatus, GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// POST - Register team for tournament
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    if (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.UPCOMING) {
      return apiError("Tournament is not accepting registrations");
    }

    if (new Date() > tournament.registrationDeadline) {
      return apiError("Registration deadline has passed");
    }

    // Get user's team (must be captain)
    const team = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        players: {
          where: { deletedAt: null },
        },
      },
    });

    if (!team) {
      return apiError("You must be a team captain to register");
    }

    // Check team requirements
    if (team.players.length < 5) {
      return apiError("Team must have at least 5 players");
    }

    // Check if all roles are covered
    const roles = team.players
      .filter((p) => !p.isSubstitute)
      .map((p) => p.role);
    const requiredRoles: GameRole[] = [
      GameRole.EXP,
      GameRole.JUNGLE,
      GameRole.MAGE,
      GameRole.MARKSMAN,
      GameRole.ROAM,
    ];
    const hasAllRoles = requiredRoles.every((role) => roles.includes(role));

    if (!hasAllRoles) {
      return apiError("Team must have players covering all 5 roles (EXP, Jungle, Mage, Marksman, Roam)");
    }

    if (!team.logo || !team.banner) {
      return apiError("Team must have logo and banner uploaded before registering");
    }

    // Check if already registered
    const existingRegistration = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: id,
          teamId: team.id,
        },
      },
    });

    if (existingRegistration) {
      if (existingRegistration.status === RegistrationStatus.APPROVED) {
        return apiError("Team is already registered and approved");
      }
      if (existingRegistration.status === RegistrationStatus.PENDING) {
        return apiError("Registration is already pending");
      }
      // Can reapply if previously rejected
    }

    // Check if tournament is full
    if (tournament.filled >= tournament.slots) {
      // Add to waitlist
      const waitlistCount = await prisma.waitlist.count({
        where: { tournamentId: id },
      });

      const waitlist = await prisma.waitlist.create({
        data: {
          tournamentId: id,
          teamId: team.id,
          position: waitlistCount + 1,
        },
      });

      // Create registration as pending
      await prisma.tournamentRegistration.create({
        data: {
          tournamentId: id,
          teamId: team.id,
          status: RegistrationStatus.PENDING,
        },
      });

      return apiSuccess(
        {
          message: "Tournament is full. Added to waitlist.",
          waitlistPosition: waitlist.position,
        },
        201
      );
    }

    // Create registration
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: id,
        teamId: team.id,
        status: RegistrationStatus.PENDING,
      },
    });

    return apiSuccess(
      {
        message: "Registration submitted successfully",
        registration,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Register for tournament error:", error);
    return apiError(message, 500);
  }
}



