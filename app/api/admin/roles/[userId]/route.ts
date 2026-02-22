import { NextRequest } from "next/server";
import {
  requireSuperAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

// DELETE - Revoke admin role
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { userId } = await context.params;

    // Get existing role
    const existingRole = await prisma.adminRole.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            ign: true,
          },
        },
      },
    });

    if (!existingRole) {
      return apiError("Admin role not found", 404);
    }

    // Prevent revoking own role
    if (userId === admin.id) {
      return apiError("Cannot revoke your own admin role");
    }

    // Revoke role
    await prisma.adminRole.delete({
      where: { userId },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "REVOKE_ADMIN_ROLE",
      "AdminRole",
      existingRole.id,
      JSON.stringify({ userId, previousRole: existingRole.role })
    );

    return apiSuccess({
      message: "Admin role revoked successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revoke admin role";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Revoke admin role error:", error);
    return apiError(message, 500);
  }
}



