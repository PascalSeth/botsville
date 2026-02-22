import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { RegistrationStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
    });

    if (!team) {
      return apiError("You must be a team captain to withdraw");
    }

    const registration = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: id,
          teamId: team.id,
        },
      },
    });

    if (!registration) {
      return apiError("Team is not registered for this tournament", 404);
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      return apiError("Can only withdraw from approved registrations");
    }

    // Check withdrawal deadline (48 hours before start)
    const withdrawalDeadline = new Date(tournament.date);
    withdrawalDeadline.setHours(withdrawalDeadline.getHours() - 48);

    const isForfeit = new Date() > withdrawalDeadline;

    await prisma.tournamentRegistration.update({
      where: { id: registration.id },
      data: {
        status: isForfeit ? RegistrationStatus.FORFEITED : RegistrationStatus.WITHDRAWN,
      },
    });

    // Update tournament filled count
    await prisma.tournament.update({
      where: { id },
      data: {
        filled: { decrement: 1 },
      },
    });

    // Offer slot to next waitlist team
    const nextWaitlist = await prisma.waitlist.findFirst({
      where: {
        tournamentId: id,
        offered: false,
      },
      orderBy: { position: "asc" },
      include: {
        team: {
          include: {
            captain: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (nextWaitlist) {
      const offerExpiry = new Date();
      offerExpiry.setHours(offerExpiry.getHours() + 24);

      await prisma.waitlist.update({
        where: { id: nextWaitlist.id },
        data: {
          offered: true,
          offerExpiry,
        },
      });

      await prisma.notification.create({
        data: {
          userId: nextWaitlist.team.captainId!,
          type: "WAITLIST_SLOT_OFFERED",
          title: "Tournament Slot Available",
          message: `A slot has opened up for ${tournament.name}. You have 24 hours to accept.`,
          linkUrl: `/tournaments/${id}`,
        },
      });
    }

    return apiSuccess({
      message: isForfeit
        ? "Withdrawal processed as forfeit"
        : "Withdrawal successful",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to withdraw";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Withdraw from tournament error:", error);
    return apiError(message, 500);
  }
}



