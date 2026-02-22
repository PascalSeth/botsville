import { NextRequest } from "next/server";
import {
  requireSuperAdmin,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List all admin roles
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js route handler signature
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const roles = await prisma.adminRole.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            ign: true,
            status: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    return apiSuccess(roles);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin roles";
    if (message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (message.includes("Forbidden")) {
      return apiError(message, 403);
    }
    console.error("Get admin roles error:", error);
    return apiError(message, 500);
  }
}

// POST - Assign admin role
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return apiError("User ID and role are required");
    }

    if (!Object.values(AdminRoleType).includes(role)) {
      return apiError("Invalid admin role");
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, ign: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    // Check if user already has an admin role
    const existingRole = await prisma.adminRole.findUnique({
      where: { userId },
    });

    if (existingRole) {
      return apiError("User already has an admin role. Revoke existing role first.");
    }

    // Assign role
    const adminRole = await prisma.adminRole.create({
      data: {
        userId,
        role: role as AdminRoleType,
        assignedBy: admin.id,
      },
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

    // Create audit log
    await createAuditLog(
      admin.id,
      "ASSIGN_ADMIN_ROLE",
      "AdminRole",
      adminRole.id,
      JSON.stringify({ userId, role })
    );

    return apiSuccess(
      {
        message: "Admin role assigned successfully",
        adminRole,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign admin role";
    if (message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (message.includes("Forbidden")) {
      return apiError(message, 403);
    }
    console.error("Assign admin role error:", error);
    return apiError(message, 500);
  }
}



