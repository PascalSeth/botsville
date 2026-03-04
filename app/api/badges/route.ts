import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { XpEventType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_BADGES = [
  { key: "chou-abuser", name: "Chou Abuser", description: "Wins with style and side-kicks." },
  { key: "ghana-mythic", name: "Ghana Mythic", description: "Reached Mythic on Ghana ladder." },
  { key: "jungle-demon", name: "Jungle Demon", description: "Dominates jungle objectives." },
  { key: "afk-survivor", name: "AFK Survivor", description: "Still wins through adversity." },
  { key: "campus-king", name: "Campus King", description: "Top player in campus scrims." },
];

export async function GET() {
  try {
    const user = await requireActiveUser();

    for (const badge of DEFAULT_BADGES) {
      await prisma.badgeTitle.upsert({ where: { key: badge.key }, update: {}, create: badge });
    }

    const [catalog, userBadges] = await Promise.all([
      prisma.badgeTitle.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.userBadge.findMany({ where: { userId: user.id }, include: { badge: true }, orderBy: { earnedAt: "desc" } }),
    ]);

    return apiSuccess({ catalog, userBadges });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch badges";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Badges GET error:", error);
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { badgeKey } = body;
    if (!badgeKey) return apiError("badgeKey is required");

    const badge = await prisma.badgeTitle.findUnique({ where: { key: badgeKey } });
    if (!badge) return apiError("Badge not found", 404);

    const userBadge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      update: {},
      create: { userId: user.id, badgeId: badge.id },
      include: { badge: true },
    });

    await prisma.userXpEvent.create({
      data: {
        userId: user.id,
        type: XpEventType.BADGE_EARNED,
        xp: 25,
        metadata: `badge:${badge.key}`,
      },
    });

    return apiSuccess({ message: "Badge earned", userBadge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to earn badge";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Badges POST error:", error);
    return apiError(message, 500);
  }
}
