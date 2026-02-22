import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

// GET - Get active invite link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;

    // Verify team and captain
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, captainId: true },
    });

    if (!team || team.captainId !== user.id) {
      return apiError("Only team captain can view invite links", 403);
    }

    const link = await prisma.teamInviteLink.findFirst({
      where: {
        teamId: id,
        active: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });

    return apiSuccess(link || null);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Get invite link error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch invite link", 500);
  }
}

// POST - Generate new invite link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;
    const body = await request.json();
    const { maxUses } = body;

    // Verify team and captain
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          where: { deletedAt: null },
        },
      },
    });

    if (!team || team.deletedAt) {
      return apiError("Team not found", 404);
    }

    if (team.captainId !== user.id) {
      return apiError("Only team captain can generate invite links", 403);
    }

    // Deactivate existing active link
    await prisma.teamInviteLink.updateMany({
      where: {
        teamId: id,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // Generate random 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create new link
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const link = await prisma.teamInviteLink.create({
      data: {
        teamId: id,
        createdById: user.id,
        code,
        maxUses: maxUses || 5,
        expiresAt,
        active: true,
      },
    });

    return apiSuccess(
      {
        message: "Invite link generated successfully",
        link: {
          ...link,
          url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join/${code}`,
        },
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Generate invite link error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to generate invite link", 500);
  }
}

// PUT - Deactivate invite link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;
    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return apiError("Link ID is required");
    }

    // Verify team and captain
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, captainId: true },
    });

    if (!team || team.captainId !== user.id) {
      return apiError("Only team captain can deactivate invite links", 403);
    }

    const link = await prisma.teamInviteLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.teamId !== id) {
      return apiError("Invite link not found", 404);
    }

    await prisma.teamInviteLink.update({
      where: { id: linkId },
      data: { active: false },
    });

    return apiSuccess({ message: "Invite link deactivated" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Deactivate invite link error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to deactivate invite link", 500);
  }
}



