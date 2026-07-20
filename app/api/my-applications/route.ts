import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess, formatHumanError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/my-applications
 * Returns all active pending team applications submitted by the logged in user.
 */
export async function GET() {
  try {
    const user = await requireActiveUser();

    // Auto-expire outdated applications first
    await prisma.teamInvite.updateMany({
      where: {
        fromUserId: user.id,
        status: "PENDING",
        expiresAt: { lte: new Date() },
      },
      data: { status: "DECLINED" },
    });

    const applications = await prisma.teamInvite.findMany({
      where: {
        fromUserId: user.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        teamId: true,
        message: true,
        sentAt: true,
        expiresAt: true,
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
      orderBy: { sentAt: "desc" },
    });

    return apiSuccess({ applications });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiSuccess({ applications: [] });
    }
    const formatted = formatHumanError(error);
    return apiError(formatted, 500);
  }
}

/**
 * DELETE /api/my-applications?id=...
 * Withdraws/cancels a pending team application.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const teamId = searchParams.get("teamId");

    if (!id && !teamId) {
      return apiError("Application ID or Team ID is required", 400);
    }

    const whereClause = id
      ? { id, fromUserId: user.id }
      : { teamId: teamId!, fromUserId: user.id, status: "PENDING" as const };

    const application = await prisma.teamInvite.findFirst({
      where: whereClause,
    });

    if (!application) {
      return apiError("Pending application not found", 404);
    }

    await prisma.teamInvite.delete({
      where: { id: application.id },
    });

    return apiSuccess({ message: "Application withdrawn successfully" });
  } catch (error) {
    const formatted = formatHumanError(error);
    return apiError(formatted, 500);
  }
}
