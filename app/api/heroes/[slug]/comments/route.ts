import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const comments = await prisma.heroComment.findMany({
      where: { heroSlug: slug },
      include: { user: { select: { id: true, ign: true, photo: true } } },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ comments });
  } catch (error: unknown) {
    console.error("Hero comments GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch comments", 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireActiveUser();
    const { slug } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") return apiError("content is required");

    const comment = await prisma.heroComment.create({
      data: { heroSlug: slug, userId: user.id, content },
      include: { user: { select: { id: true, ign: true, photo: true } } },
    });

    return apiSuccess({ message: "Comment added", comment }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add comment";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Hero comments POST error:", error);
    return apiError(message, 500);
  }
}
