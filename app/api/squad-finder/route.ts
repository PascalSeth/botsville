import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess, isValidRegion } from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const region = searchParams.get("region");
    const rankBadge = searchParams.get("rankBadge");

    const where: Prisma.SquadListingWhereInput = { active: true };
    if (role && Object.values(MainRole).includes(role as MainRole)) {
      where.preferredRole = role as MainRole;
    }
    if (region && isValidRegion(region)) {
      where.region = region;
    }
    if (rankBadge) {
      where.rankBadge = rankBadge;
    }

    const listings = await prisma.squadListing.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            ign: true,
            photo: true,
            mainRole: true,
            rankBadge: true,
            region: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return apiSuccess({ listings });
  } catch (error: unknown) {
    console.error("Squad finder GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch squad listings", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { rankBadge, preferredRole, region, message, active } = body;

    if (!rankBadge || typeof rankBadge !== "string") return apiError("rankBadge is required");
    if (!preferredRole || !Object.values(MainRole).includes(preferredRole)) return apiError("Invalid preferredRole");
    if (!region || !isValidRegion(region)) return apiError("Invalid region");

    const existing = await prisma.squadListing.findFirst({ where: { userId: user.id }, select: { id: true } });
    const payload: Omit<Prisma.SquadListingUncheckedCreateInput, "userId"> = {
      rankBadge,
      preferredRole,
      region,
      message: message || null,
      active: active === undefined ? true : Boolean(active),
    };

    const listing = existing
      ? await prisma.squadListing.update({ where: { id: existing.id }, data: payload })
      : await prisma.squadListing.create({ data: { ...payload, userId: user.id } });

    return apiSuccess({ message: "Squad listing saved", listing });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save squad listing";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Squad finder POST error:", error);
    return apiError(message, 500);
  }
}
