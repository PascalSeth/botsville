import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser();

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        ign: true,
        mainRole: true,
        photo: true,
        status: true,
        emailVerified: true,
        openToOffers: true,
        createdAt: true,
        updatedAt: true,
        adminRole: {
          select: {
            role: true,
            assignedAt: true,
          },
        },
        player: {
          select: {
            id: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                logo: true,
              },
            },
            role: true,
            isSubstitute: true,
          },
        },
        captainOf: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      return apiError("Profile not found", 404);
    }

    return apiSuccess(profile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get profile error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { photo, mainRole, openToOffers } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (photo !== undefined) updateData.photo = photo;
    if (mainRole !== undefined) {
      if (!Object.values(MainRole).includes(mainRole)) {
        return apiError("Invalid main role");
      }
      updateData.mainRole = mainRole;
    }
    if (openToOffers !== undefined) updateData.openToOffers = Boolean(openToOffers);

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        ign: true,
        mainRole: true,
        photo: true,
        openToOffers: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Update profile error:", error);
    return apiError(message, 500);
  }
}

