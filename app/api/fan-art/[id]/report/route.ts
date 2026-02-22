import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return apiError("Report reason is required");
    }

    const artwork = await prisma.fanArt.findUnique({
      where: { id },
    });

    if (!artwork) {
      return apiError("Artwork not found", 404);
    }

    // Check if user already reported
    const existingReport = await prisma.fanArtReport.findUnique({
      where: {
        fanArtId_reporterId: {
          fanArtId: id,
          reporterId: user.id,
        },
      },
    });

    if (existingReport) {
      return apiError("You have already reported this artwork");
    }

    // Create report
    await prisma.fanArtReport.create({
      data: {
        fanArtId: id,
        reporterId: user.id,
        reason,
      },
    });

    // Check report count - if 3+, flag for urgent review
    const reportCount = await prisma.fanArtReport.count({
      where: { fanArtId: id },
    });

    if (reportCount >= 3) {
      await prisma.fanArt.update({
        where: { id },
        data: { urgentReview: true },
      });
    }

    return apiSuccess(
      {
        message: "Report submitted successfully",
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit report";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Report fan art error:", error);
    return apiError(message, 500);
  }
}



