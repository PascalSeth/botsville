import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

function toHeroKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isValidImageUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  return /^https?:\/\//i.test(value);
}

export async function GET() {
  try {
    const heroes = await prisma.heroCatalog.findMany({
      where: { active: true },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        imageUrl: true,
      },
    });

    return apiSuccess({ heroes });
  } catch (error: unknown) {
    console.error("Hero catalog GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch hero catalog", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    if (!user.role) return apiError("Forbidden", 403);

    const body = await request.json();
    const { name, imageUrl, key } = body;

    if (!name || typeof name !== "string") return apiError("name is required");
    if (!imageUrl || typeof imageUrl !== "string" || !isValidImageUrl(imageUrl)) {
      return apiError("imageUrl must be a valid path or URL");
    }

    const heroKey = toHeroKey(typeof key === "string" && key.trim() ? key : name);
    if (!heroKey) return apiError("A valid hero key is required");

    const existing = await prisma.heroCatalog.findUnique({ where: { key: heroKey } });
    if (existing) return apiError("Hero key already exists");

    const hero = await prisma.heroCatalog.create({
      data: {
        key: heroKey,
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        active: true,
        createdById: user.id,
      },
      select: {
        id: true,
        key: true,
        name: true,
        imageUrl: true,
        active: true,
        createdAt: true,
      },
    });

    return apiSuccess({ message: "Hero added", hero }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add hero";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Hero catalog POST error:", error);
    return apiError(message, 500);
  }
}
