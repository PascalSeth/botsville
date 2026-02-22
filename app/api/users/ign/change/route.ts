import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess, isValidIGN } from "@/lib/api-utils";
import { findUserByEmailOrIgn } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { newIGN } = body;

    if (!newIGN) {
      return apiError("New IGN is required");
    }

    if (!isValidIGN(newIGN)) {
      return apiError("IGN must be 3-20 characters (alphanumeric, spaces, underscores only)");
    }

    // Check if IGN is already taken
    const existing = await findUserByEmailOrIgn(newIGN);
    if (existing && existing.id !== user.id) {
      return apiError("IGN already taken");
    }

    // Get current user to save old IGN
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { ign: true },
    });

    if (!currentUser) {
      return apiError("User not found", 404);
    }

    if (currentUser.ign === newIGN) {
      return apiError("New IGN must be different from current IGN");
    }

    // TODO: Check if user has already changed IGN this season
    // For now, we'll allow one change per season (implement season check later)

    // Save old IGN to history
    await prisma.ignHistory.create({
      data: {
        userId: user.id,
        oldIgn: currentUser.ign,
      },
    });

    // Update user IGN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { ign: newIGN },
      select: {
        id: true,
        ign: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      message: "IGN changed successfully",
      user: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to change IGN";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Change IGN error:", error);
    return apiError(message, 500);
  }
}



