import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;

    const [meta, builds, comments, topPlayers] = await Promise.all([
      prisma.heroMeta.findFirst({
        where: { hero: { equals: slug, mode: "insensitive" } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.heroBuild.findMany({
        where: { heroSlug: slug },
        include: { createdBy: { select: { id: true, ign: true, photo: true } } },
        orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      prisma.heroComment.findMany({
        where: { heroSlug: slug },
        include: { user: { select: { id: true, ign: true, photo: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.player.findMany({
        where: { signatureHero: { equals: slug, mode: "insensitive" }, deletedAt: null },
        select: {
          id: true,
          ign: true,
          role: true,
          winRate: true,
          photo: true,
          team: { select: { id: true, name: true, tag: true } },
        },
        orderBy: [{ winRate: "desc" }, { mvpCount: "desc" }],
        take: 10,
      }),
    ]);

    return apiSuccess({
      hero: slug,
      meta,
      builds,
      comments,
      topPlayers,
    });
  } catch (error: unknown) {
    console.error("Hero GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch hero page data", 500);
  }
}
