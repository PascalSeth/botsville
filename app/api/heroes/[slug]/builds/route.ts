import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const builds = await prisma.heroBuild.findMany({
      where: { heroSlug: slug },
      include: { createdBy: { select: { id: true, ign: true, photo: true } } },
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
    });
    return apiSuccess({ builds });
  } catch (error: unknown) {
    console.error("Hero builds GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch builds", 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireActiveUser();
    const { slug } = await context.params;
    const body = await request.json();
    const { title, description, buildImageUrl } = body;

    if (!title) return apiError("title is required");

    const build = await prisma.heroBuild.create({
      data: {
        heroSlug: slug,
        title,
        description: description || null,
        buildImageUrl: buildImageUrl || null,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, ign: true, photo: true } } },
    });

    return apiSuccess({ message: "Build submitted", build }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit build";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Hero builds POST error:", error);
    return apiError(message, 500);
  }
}
