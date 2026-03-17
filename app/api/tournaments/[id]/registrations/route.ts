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

// POST - Manually register team(s) to tournament (Admin only)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { teamIds, autoApprove, seed } = body;

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return apiError("teamIds must be a non-empty array");
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    const results = [];

    for (const teamId of teamIds) {
      try {
        // Check if team exists
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: {
            captain: {
              select: { id: true, ign: true },
            },
          },
        });

        if (!team) {
          results.push({
            teamId,
            success: false,
            message: "Team not found",
          });
          continue;
        }

        // Check if already registered
        const existingReg = await prisma.tournamentRegistration.findUnique({
          where: {
            tournamentId_teamId: {
              tournamentId: id,
              teamId,
            },
          },
        });

        if (existingReg) {
          results.push({
            teamId,
            success: false,
            message: "Team already registered",
            existingStatus: existingReg.status,
          });
          continue;
        }

        // Create registration
        const newRegistration = await prisma.tournamentRegistration.create({
          data: {
            tournamentId: id,
            teamId,
            status: autoApprove ? RegistrationStatus.APPROVED : RegistrationStatus.PENDING,
            seed: autoApprove && seed ? seed : undefined,
          },
        });

        // Update tournament filled count if auto-approved
        if (autoApprove) {
          await prisma.tournament.update({
            where: { id },
            data: { filled: { increment: 1 } },
          });

          // Notify team captain
          if (team.captain) {
            await prisma.notification.create({
              data: {
                userId: team.captain.id,
                type: "TOURNAMENT_REGISTRATION_APPROVED",
                title: "Added to Tournament",
                message: `Your team ${team.name} has been added to ${tournament.name} by an admin.`,
                linkUrl: `/tournaments/${id}`,
              },
            });
          }
        } else {
          // Notify team captain if pending
          if (team.captain) {
            await prisma.notification.create({
              data: {
                userId: team.captain.id,
                type: "TOURNAMENT_REGISTRATION_PENDING",
                title: "Tournament Registration Pending",
                message: `Your team ${team.name} has been registered for ${tournament.name}. Awaiting admin approval.`,
                linkUrl: `/tournaments/${id}`,
              },
            });
          }
        }

        // Create audit log
        await createAuditLog(
          admin.id,
          "ADMIN_REGISTER_TEAM",
          "TournamentRegistration",
          newRegistration.id,
          JSON.stringify({ teamId, autoApprove })
        );

        results.push({
          teamId,
          success: true,
          message: autoApprove ? "Team registered and approved" : "Team registered (pending approval)",
          registrationId: newRegistration.id,
          status: newRegistration.status,
        });
      } catch (error) {
        results.push({
          teamId,
          success: false,
          message: error instanceof Error ? error.message : "Failed to register team",
        });
      }
    }

    return apiSuccess({
      message: "Team registration complete",
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register teams";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Admin register teams error:", error);
    return apiError(message, 500);
  }
}



