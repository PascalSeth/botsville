import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";

// GET - List all active streamers with their videos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const streamers = await prisma.streamer.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(featured ? { featured: true } : {}),
      },
      include: {
        videos: {
          where: { active: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: 6,
        },
        user: {
          select: { id: true, ign: true, photo: true },
        },
        _count: { select: { videos: true } },
      },
      orderBy: [
        { featured: "desc" },
        { verified: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    return apiSuccess({ streamers });
  } catch (error: unknown) {
    console.error("Streamers GET error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch streamers", 500);
  }
}

// POST - Create or update authenticated user's streamer profile
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();

    const body = await request.json();
    const {
      name,
      bio,
      photo,
      coverImage,
      youtube,
      twitch,
      tiktok,
      facebook,
      instagram,
      twitter,
      discord,
      featured,
      verified,
      active,
    } = body;

    if (!name?.trim()) {
      return apiError("Name is required", 400);
    }

    const existing = await prisma.streamer.findUnique({
      where: { userId: user.id },
    });

    const streamer = await prisma.streamer.upsert({
      where: { userId: user.id },
      update: {
        name: name.trim(),
        bio: bio?.trim() || null,
        photo: photo || null,
        coverImage: coverImage || null,
        youtube: youtube || null,
        twitch: twitch || null,
        tiktok: tiktok || null,
        facebook: facebook || null,
        instagram: instagram || null,
        twitter: twitter || null,
        discord: discord || null,
        ...(user.role === "SUPER_ADMIN" || user.role === "CONTENT_ADMIN"
          ? {
              featured: featured ?? false,
              verified: verified ?? false,
              active: active ?? true,
            }
          : {}),
      },
      create: {
        userId: user.id,
        name: name.trim(),
        bio: bio?.trim() || null,
        photo: photo || null,
        coverImage: coverImage || null,
        youtube: youtube || null,
        twitch: twitch || null,
        tiktok: tiktok || null,
        facebook: facebook || null,
        instagram: instagram || null,
        twitter: twitter || null,
        discord: discord || null,
        featured:
          user.role === "SUPER_ADMIN" || user.role === "CONTENT_ADMIN"
            ? featured ?? false
            : false,
        verified:
          user.role === "SUPER_ADMIN" || user.role === "CONTENT_ADMIN"
            ? verified ?? false
            : false,
        active:
          user.role === "SUPER_ADMIN" || user.role === "CONTENT_ADMIN"
            ? active ?? true
            : true,
      },
    });

    return apiSuccess(
      {
        message: existing ? "Streamer profile updated" : "Streamer profile created",
        streamer,
      },
      existing ? 200 : 201
    );
  } catch (error: unknown) {
    console.error("Streamer POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create streamer";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
