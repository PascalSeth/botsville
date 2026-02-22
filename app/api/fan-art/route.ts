import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  requireActiveUser,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List fan art
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approved = searchParams.get("approved");
    const urgentReview = searchParams.get("urgentReview");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.FanArtWhereInput = {};
    
    // Public can only see approved art
    let user = null;
    try {
      const { requireActiveUser } = await import("@/lib/api-utils");
      user = await requireActiveUser();
    } catch {
      // Not authenticated - public access
    }
    
    if (!user || !user.role) {
      where.approved = true;
    } else if (approved != null) {
      where.approved = approved === "true";
    }

    if (urgentReview === "true") {
      where.urgentReview = true;
    }

    const [artworks, total] = await Promise.all([
      prisma.fanArt.findMany({
        where,
        include: {
          artist: {
            select: {
              id: true,
              ign: true,
              photo: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.fanArt.count({ where }),
    ]);

    return apiSuccess({
      artworks,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch fan art";
    console.error("Get fan art error:", error);
    return apiError(message, 500);
  }
}

// POST - Submit fan art
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { title, imageUrl } = body;

    if (!title || !imageUrl) {
      return apiError("Title and image URL are required");
    }

    const artwork = await prisma.fanArt.create({
      data: {
        artistId: user.id,
        title,
        imageUrl,
        approved: false,
      },
    });

    return apiSuccess(
      {
        message: "Fan art submitted successfully",
        artwork,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit fan art";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Submit fan art error:", error);
    return apiError(message, 500);
  }
}

// PUT - Approve/reject fan art
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const body = await request.json();
    const { artworkId, action, rejectionReason } = body; // action: "approve" | "reject"

    if (!artworkId || !action) {
      return apiError("Artwork ID and action are required");
    }

    const artwork = await prisma.fanArt.findUnique({
      where: { id: artworkId },
      include: {
        artist: {
          select: {
            id: true,
            ign: true,
          },
        },
      },
    });

    if (!artwork) {
      return apiError("Artwork not found", 404);
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return apiError("Rejection reason is required");
      }

      await prisma.fanArt.update({
        where: { id: artworkId },
        data: {
          approved: false,
          rejectionReason,
        },
      });

      // Notify artist
      await prisma.notification.create({
        data: {
          userId: artwork.artistId,
          type: "FAN_ART_REJECTED",
          title: "Fan Art Rejected",
          message: `Your fan art "${artwork.title}" was rejected. Reason: ${rejectionReason}`,
          linkUrl: `/fan-art`,
        },
      });

      // Create audit log
      await createAuditLog(
        admin.id,
        "REJECT_FAN_ART",
        "FanArt",
        artworkId,
        JSON.stringify({ reason: rejectionReason })
      );

      return apiSuccess({ message: "Artwork rejected" });
    }

    // Approve
    await prisma.fanArt.update({
      where: { id: artworkId },
      data: {
        approved: true,
        rejectionReason: null,
        urgentReview: false,
      },
    });

    // Notify artist
    await prisma.notification.create({
      data: {
        userId: artwork.artistId,
        type: "FAN_ART_APPROVED",
        title: "Fan Art Approved",
        message: `Your fan art "${artwork.title}" was approved and published`,
        linkUrl: `/fan-art/${artworkId}`,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "APPROVE_FAN_ART",
      "FanArt",
      artworkId,
      undefined
    );

    return apiSuccess({ message: "Artwork approved" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update artwork";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Approve/reject fan art error:", error);
    return apiError(message, 500);
  }
}

