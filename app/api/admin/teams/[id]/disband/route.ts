import { NextRequest } from "next/server";
import { requireSuperAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true, deletedAt: true },
    });

    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    await prisma.team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: "DISBAND_TEAM",
        targetType: "Team",
        targetId: team.id,
        details: `Disbanded team ${team.name}`,
      },
    });

    return apiSuccess({ message: "Team disbanded successfully" });
  } catch (error) {
    console.error("Admin disband team error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to disband team",
      500
    );
  }
}
