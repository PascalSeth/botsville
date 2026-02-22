import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

// GET - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const read = searchParams.get("read");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.NotificationWhereInput = { userId: user.id };
    if (read !== null && read !== undefined) {
      where.read = read === "true";
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return apiSuccess({
      notifications,
      pagination: {
        total,
        limit,
        skip,
        unreadCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get notifications error:", error);
    return apiError(message, 500);
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return apiSuccess({ message: "All notifications marked as read" });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return apiError("notificationIds array is required");
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
      },
      data: {
        read: true,
      },
    });

    return apiSuccess({ message: "Notifications marked as read" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notifications";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Mark notifications read error:", error);
    return apiError(message, 500);
  }
}



