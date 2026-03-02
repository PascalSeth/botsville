import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const SEED_TEMPLATES = [
  { name: "Chou Reaction", imageUrl: "/gif/chou.gif", heroSlug: "chou" },
  { name: "Gusion Burst", imageUrl: "/heroes/gusion.png", heroSlug: "gusion" },
  { name: "Nana Panic", imageUrl: "/heroes/nana.png", heroSlug: "nana" },
];

export async function GET(_request: NextRequest) {
  try {
    for (const template of SEED_TEMPLATES) {
      const existing = await prisma.memeTemplate.findFirst({ where: { name: template.name } });
      if (!existing) {
        await prisma.memeTemplate.create({ data: template });
      }
    }

    const templates = await prisma.memeTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ templates });
  } catch (error: unknown) {
    console.error("Meme templates GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch meme templates", 500);
  }
}
