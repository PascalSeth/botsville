import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  requireAdmin,
  requireActiveUser,
  apiError,
  apiSuccess,
  createAuditLog,
} from "@/lib/api-utils";
import { ScrimVaultStatus, AdminRoleType } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// GET - List scrim vault videos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const tournamentId = searchParams.get("tournamentId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: Prisma.ScrimVaultWhereInput = {};
    
    // Public can only see approved videos
    let user = null;
    try {
      const { requireActiveUser } = await import("@/lib/api-utils");
      user = await requireActiveUser();
    } catch {
      // Not authenticated - public access
    }
    
    if (!user || !user.role) {
      where.status = ScrimVaultStatus.APPROVED;
    } else if (status && Object.values(ScrimVaultStatus).includes(status as ScrimVaultStatus)) {
      where.status = status as ScrimVaultStatus;
    }

    if (featured === "true") {
      where.featured = true;
    }

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    const [videos, total] = await Promise.all([
      prisma.scrimVault.findMany({
        where,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              ign: true,
            },
          },
        },
        orderBy: [
          { featured: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip,
      }),
      prisma.scrimVault.count({ where }),
    ]);

    return apiSuccess({
      videos,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    console.error("Get scrim vault error:", error);
    return apiError(message, 500);
  }
}

// POST - Submit scrim vault video
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { tournamentId, title, matchup, thumbnail, videoUrl, duration, featured } = body;

    if (!title || !videoUrl) {
      return apiError("Title and video URL are required");
    }

    const normalizedVideoUrl = typeof videoUrl === "string" ? videoUrl.trim() : "";
    if (!normalizedVideoUrl || !isHttpUrl(normalizedVideoUrl)) {
      return apiError("Video URL must be a valid http(s) URL");
    }

    const isAdminSubmission = Boolean(user.role);

    const video = await prisma.scrimVault.create({
      data: {
        tournamentId: tournamentId || null,
        submittedById: user.id,
        approvedById: isAdminSubmission ? user.id : null,
        title: title.trim(),
        matchup: matchup || null,
        thumbnail: thumbnail || null,
        videoUrl: normalizedVideoUrl,
        duration: duration || null,
        status: isAdminSubmission ? ScrimVaultStatus.APPROVED : ScrimVaultStatus.PENDING,
        featured: isAdminSubmission ? Boolean(featured) : false,
      },
    });

    return apiSuccess(
      {
        message: "Video submitted successfully",
        video,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Submit scrim vault error:", error);
    return apiError(message, 500);
  }
}

// PUT - Approve/reject scrim vault video
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const body = await request.json();
    const { videoId, action, rejectionReason, featured, title, matchup, videoUrl, duration, thumbnail } = body; // action: "approve" | "reject" | "update"

    if (!videoId || !action) {
      return apiError("Video ID and action are required");
    }

    const video = await prisma.scrimVault.findUnique({
      where: { id: videoId },
      include: {
        submittedBy: {
          select: {
            id: true,
            ign: true,
          },
        },
      },
    });

    if (!video) {
      return apiError("Video not found", 404);
    }

    if (action === "update") {
      const updateData: Prisma.ScrimVaultUpdateInput = {};

      if (title !== undefined) {
        const normalizedTitle = typeof title === "string" ? title.trim() : "";
        if (!normalizedTitle) {
          return apiError("Title is required");
        }
        updateData.title = normalizedTitle;
      }
      if (matchup !== undefined) updateData.matchup = matchup || null;
      if (thumbnail !== undefined) updateData.thumbnail = thumbnail || null;
      if (duration !== undefined) updateData.duration = duration || null;
      if (videoUrl !== undefined) {
        const normalizedVideoUrl = typeof videoUrl === "string" ? videoUrl.trim() : "";
        if (!normalizedVideoUrl || !isHttpUrl(normalizedVideoUrl)) {
          return apiError("Video URL must be a valid http(s) URL");
        }
        updateData.videoUrl = normalizedVideoUrl;
      }
      if (featured !== undefined) updateData.featured = Boolean(featured);

      if (Object.keys(updateData).length === 0) {
        return apiError("No fields to update");
      }

      await prisma.scrimVault.update({
        where: { id: videoId },
        data: updateData,
      });

      await createAuditLog(
        admin.id,
        "UPDATE_SCRIM_VAULT",
        "ScrimVault",
        videoId,
        JSON.stringify(updateData)
      );

      return apiSuccess({ message: "Video updated" });
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return apiError("Rejection reason is required");
      }

      await prisma.scrimVault.update({
        where: { id: videoId },
        data: {
          status: ScrimVaultStatus.REJECTED,
          rejectionReason,
        },
      });

      // Notify submitter
      await prisma.notification.create({
        data: {
          userId: video.submittedById,
          type: "FAN_ART_REJECTED", // Reusing notification type
          title: "Scrim Vault Video Rejected",
          message: `Your video "${video.title}" was rejected. Reason: ${rejectionReason}`,
          linkUrl: `/scrim-vault`,
        },
      });

      // Create audit log
      await createAuditLog(
        admin.id,
        "REJECT_SCRIM_VAULT",
        "ScrimVault",
        videoId,
        JSON.stringify({ reason: rejectionReason })
      );

      return apiSuccess({ message: "Video rejected" });
    }

    // Approve
    await prisma.scrimVault.update({
      where: { id: videoId },
      data: {
        status: ScrimVaultStatus.APPROVED,
        approvedById: admin.id,
        featured: featured !== undefined ? Boolean(featured) : video.featured,
      },
    });

    // Notify submitter
    await prisma.notification.create({
      data: {
        userId: video.submittedById,
        type: "FAN_ART_APPROVED", // Reusing notification type
        title: "Scrim Vault Video Approved",
        message: `Your video "${video.title}" was approved and published`,
        linkUrl: `/scrim-vault/${videoId}`,
      },
    });

    // Create audit log
    await createAuditLog(
      admin.id,
      "APPROVE_SCRIM_VAULT",
      "ScrimVault",
      videoId,
      undefined
    );

    return apiSuccess({ message: "Video approved" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Approve/reject scrim vault error:", error);
    return apiError(message, 500);
  }
}

// DELETE - Remove scrim vault video
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return apiError("Video ID is required");
    }

    const video = await prisma.scrimVault.findUnique({ where: { id: videoId } });
    if (!video) {
      return apiError("Video not found", 404);
    }

    await prisma.scrimVault.delete({ where: { id: videoId } });

    await createAuditLog(
      admin.id,
      "DELETE_SCRIM_VAULT",
      "ScrimVault",
      videoId,
      JSON.stringify({ title: video.title })
    );

    return apiSuccess({ message: "Video deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Delete scrim vault error:", error);
    return apiError(message, 500);
  }
}

