import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { invalidatePattern, deleteFromCache } from "@/lib/redis";

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

// GET /api/admin/heroes - Get ALL heroes (including those without images)
export async function GET() {
  try {
    await requireAdmin([AdminRoleType.SUPER_ADMIN, AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR]);

    const heroes = await prisma.heroCatalog.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        imageUrl: true,
        active: true,
      },
    });

    return apiSuccess({ heroes }, 200, {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
  } catch (error: unknown) {
    console.error("Admin hero catalog GET error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch heroes";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError("Forbidden", 403);
    return apiError(message, 500);
  }
}

// POST /api/admin/heroes - Add a new hero
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin([AdminRoleType.SUPER_ADMIN, AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR]);

    const body = await request.json();
    const { name, imageUrl, key } = body;

    if (!name || typeof name !== "string") return apiError("name is required");

    const heroKey = toHeroKey(typeof key === "string" && key.trim() ? key : name);
    if (!heroKey) return apiError("A valid hero key is required");

    const existing = await prisma.heroCatalog.findUnique({ where: { key: heroKey } });
    if (existing) return apiError("Hero key already exists");

    const hero = await prisma.heroCatalog.create({
      data: {
        key: heroKey,
        name: name.trim(),
        imageUrl: imageUrl && isValidImageUrl(imageUrl) ? imageUrl.trim() : null,
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

    // Invalidate Redis hero cache
    await invalidatePattern("hero-*");
    await deleteFromCache("hero-catalog");

    return apiSuccess({ message: "Hero added", hero }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add hero";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError("Forbidden", 403);
    return apiError(message, 500);
  }
}

// PATCH /api/admin/heroes - Update hero details (name, key, imageUrl, active)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin([AdminRoleType.SUPER_ADMIN, AdminRoleType.CONTENT_ADMIN, AdminRoleType.EDITOR]);

    const body = await request.json();
    const { id, name, key, imageUrl, active } = body;

    if (!id || typeof id !== "string") return apiError("id is required");

    const updateData: Record<string, any> = {};

    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    if (typeof key === "string" && key.trim()) {
      const heroKey = toHeroKey(key);
      if (heroKey) {
        const existing = await prisma.heroCatalog.findFirst({
          where: { key: heroKey, NOT: { id } },
        });
        if (existing) return apiError("Hero key already exists");
        updateData.key = heroKey;
      }
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl && isValidImageUrl(imageUrl) ? imageUrl.trim() : null;
    }

    if (typeof active === "boolean") {
      updateData.active = active;
    }

    const hero = await prisma.heroCatalog.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        key: true,
        name: true,
        imageUrl: true,
        active: true,
      },
    });

    // Invalidate Redis hero cache
    await invalidatePattern("hero-*");
    await deleteFromCache("hero-catalog");

    return apiSuccess({ message: "Hero updated", hero });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update hero";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError("Forbidden", 403);
    return apiError(message, 500);
  }
}
