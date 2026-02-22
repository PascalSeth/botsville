import { NextRequest } from "next/server";
import {
  requireAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List prize distributions
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const prizes = await prisma.prizeDistribution.findMany({
      where: { tournamentId: id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
          },
        },
      },
      orderBy: { place: "asc" },
    });

    return apiSuccess(prizes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch prizes";
    console.error("Get prizes error:", error);
    return apiError(message, 500);
  }
}

// POST - Record prize distribution
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();
    const { teamId, place, amount, currency, paid } = body;

    if (!teamId || !place || amount === undefined) {
      return apiError("Team ID, place, and amount are required");
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament || tournament.deletedAt) {
      return apiError("Tournament not found", 404);
    }

    // Check if prize already recorded
    const existing = await prisma.prizeDistribution.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: id,
          teamId,
        },
      },
    });

    if (existing) {
      return apiError("Prize already recorded for this team");
    }

    // Amount in pesewas (GHS * 100)
    const amountInPesewas = Math.round(amount * 100);

    const prize = await prisma.prizeDistribution.create({
      data: {
        tournamentId: id,
        teamId,
        place: parseInt(place),
        amount: amountInPesewas,
        currency: currency || "GHS",
        paid: Boolean(paid),
        paidAt: paid ? new Date() : null,
        recordedById: admin.id,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    // Update team's total prize money
    await prisma.team.update({
      where: { id: teamId },
      data: {
        totalPrizeMoney: { increment: amountInPesewas },
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "RECORD_PRIZE",
      "PrizeDistribution",
      prize.id,
      JSON.stringify({ teamId, place, amount })
    );

    return apiSuccess(
      {
        message: "Prize distribution recorded",
        prize,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record prize";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Record prize error:", error);
    return apiError(message, 500);
  }
}



