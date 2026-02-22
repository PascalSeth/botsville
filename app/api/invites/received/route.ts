import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { InviteStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Prisma.TeamInviteWhereInput = {
      OR: [{ toUserId: user.id }, { toIGN: user.ign }],
    };

    if (status && Object.values(InviteStatus).includes(status as InviteStatus)) {
      where.status = status as InviteStatus;
    } else {
      // Default to pending invites
      where.status = InviteStatus.PENDING;
      where.expiresAt = { gt: new Date() };
    }

    const invites = await prisma.teamInvite.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
            region: true,
            color: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
    });

    return apiSuccess(invites);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch invites";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get received invites error:", error);
    return apiError(message, 500);
  }
}



