import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

// GET - List users (admin only), for dashboard and role assignment
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (status && ["ACTIVE", "SUSPENDED", "BANNED"].includes(status)) {
      where.status = status as "ACTIVE" | "SUSPENDED" | "BANNED";
    }

    if (search.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: "insensitive" } },
        { ign: { contains: term, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          ign: true,
          status: true,
          mainRole: true,
          photo: true,
          createdAt: true,
          adminRole: {
            select: { role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess({
      users: users.map((u) => ({
        ...u,
        role: u.adminRole?.role ?? null,
        adminRole: undefined,
      })),
      pagination: { total, limit, skip },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Get admin users error:", error);
    return apiError(message, 500);
  }
}
