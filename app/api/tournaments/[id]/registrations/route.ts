import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { RegistrationStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List tournament registrations
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.TournamentRegistrationWhereInput = { tournamentId: id };
    if (status && Object.values(RegistrationStatus).includes(status as RegistrationStatus)) {
      where.status = status as RegistrationStatus;
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
            region: true,
            captain: {
              select: {
                id: true,
                ign: true,
              },
            },
            _count: {
              select: {
                players: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { registeredAt: "asc" },
      ],
    });

    return apiSuccess(registrations);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch registrations";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Get registrations error:", error);
    return apiError(message, 500);
  }
}

// PUT - Approve/reject registration
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { registrationId, action, reason, seed } = body; // action: "approve" | "reject"

    if (!registrationId || !action) {
      return apiError("Registration ID and action are required");
    }

    if (!["approve", "reject"].includes(action)) {
      return apiError("Action must be 'approve' or 'reject'");
    }

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
        team: {
          include: {
            captain: {
              select: {
                id: true,
                ign: true,
              },
            },
          },
        },
      },
    });

    if (!registration || registration.tournamentId !== id) {
      return apiError("Registration not found", 404);
    }

    if (registration.status !== RegistrationStatus.PENDING) {
      return apiError("Registration is not pending");
    }

    if (action === "reject") {
      await prisma.tournamentRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.REJECTED,
          rejectionReason: reason || null,
        },
      });

      // Notify captain
      await prisma.notification.create({
        data: {
          userId: registration.team.captainId!,
          type: "TOURNAMENT_REGISTRATION_REJECTED",
          title: "Tournament Registration Rejected",
          message: `Your registration for ${registration.tournament.name} was rejected. ${reason || ""}`,
          linkUrl: `/tournaments/${id}`,
        },
      });

      // Create audit log
      await createAuditLog(
        admin.id,
        "REJECT_REGISTRATION",
        "TournamentRegistration",
        registrationId,
        JSON.stringify({ reason })
      );

      return apiSuccess({ message: "Registration rejected" });
    }

    // Approve
    if (registration.tournament.filled >= registration.tournament.slots) {
      return apiError("Tournament is full");
    }

    // Assign seed if provided
    const seedNumber = seed || registration.tournament.filled + 1;

    await prisma.tournamentRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.APPROVED,
        seed: seedNumber,
      },
    });

    // Update tournament filled count
    await prisma.tournament.update({
      where: { id },
      data: {
        filled: { increment: 1 },
      },
    });

    // Remove from waitlist if exists
    await prisma.waitlist.deleteMany({
      where: {
        tournamentId: id,
        teamId: registration.teamId,
      },
    });

    // Notify captain
    await prisma.notification.create({
      data: {
        userId: registration.team.captainId!,
        type: "TOURNAMENT_REGISTRATION_APPROVED",
        title: "Tournament Registration Approved",
        message: `Your registration for ${registration.tournament.name} was approved. Seed: ${seedNumber}`,
        linkUrl: `/tournaments/${id}`,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "APPROVE_REGISTRATION",
      "TournamentRegistration",
      registrationId,
      JSON.stringify({ seed: seedNumber })
    );

    return apiSuccess({
      message: "Registration approved",
      seed: seedNumber,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update registration";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Approve/reject registration error:", error);
    return apiError(message, 500);
  }
}



