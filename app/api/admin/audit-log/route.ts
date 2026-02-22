import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actorId = searchParams.get("actorId");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (actorId) where.actorId = actorId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              ign: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return apiSuccess({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch audit log";
    if (message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (message.includes("Forbidden")) {
      return apiError(message, 403);
    }
    console.error("Get audit log error:", error);
    return apiError(message, 500);
  }
}


