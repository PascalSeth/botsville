import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const memes = await prisma.memePost.findMany({
      include: {
        user: { select: { id: true, ign: true, photo: true } },
        template: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return apiSuccess({ memes });
  } catch (error: unknown) {
    console.error("Memes GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch memes", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { templateId, caption, imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return apiError("imageUrl is required");
    }

    if (templateId) {
      const template = await prisma.memeTemplate.findUnique({ where: { id: templateId } });
      if (!template) return apiError("Template not found", 404);
    }

    const meme = await prisma.memePost.create({
      data: {
        userId: user.id,
        templateId: templateId || null,
        caption: caption || null,
        imageUrl,
      },
      include: { template: true },
    });

    return apiSuccess({ message: "Meme posted", meme }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to post meme";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Memes POST error:", error);
    return apiError(message, 500);
  }
}
