import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess, isValidRegion } from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

const VALID_RANK_BADGES = [
  "WARRIOR",
  "ELITE",
  "MASTER",
  "GRANDMASTER",
  "EPIC",
  "LEGEND",
  "MYTHIC",
  "MYTHICAL_HONOR",
  "MYTHICAL_GLORY",
  "MYTHICAL_IMMORTAL",
] as const;

// GET - Get current user profile
export async function GET() {
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
        favoriteHero: true,
        favoriteSkin: true,
        rankBadge: true,
        region: true,
        headline: true,
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
            winRate: true,
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
    const { photo, mainRole, openToOffers, favoriteHero, favoriteSkin, rankBadge, region, headline } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (photo !== undefined) updateData.photo = photo;
    if (mainRole !== undefined) {
      if (!Object.values(MainRole).includes(mainRole)) {
        return apiError("Invalid main role");
      }
      updateData.mainRole = mainRole;
    }
    if (favoriteHero !== undefined) {
      if (favoriteHero === null || favoriteHero === "") {
        updateData.favoriteHero = null;
      } else if (typeof favoriteHero === "string" && favoriteHero.trim().length <= 60) {
        const heroKey = favoriteHero.trim();
        const hero = await prisma.heroCatalog.findFirst({
          where: { key: heroKey, active: true },
          select: { id: true },
        });
        if (!hero) {
          return apiError("Invalid favorite hero. Select one from available heroes.");
        }
        updateData.favoriteHero = heroKey;
      } else {
        return apiError("favoriteHero must be a string up to 60 characters");
      }
    }
    if (favoriteSkin !== undefined) {
      if (favoriteSkin === null || favoriteSkin === "") {
        updateData.favoriteSkin = null;
      } else if (typeof favoriteSkin === "string" && favoriteSkin.trim().length <= 80) {
        updateData.favoriteSkin = favoriteSkin.trim();
      } else {
        return apiError("favoriteSkin must be a string up to 80 characters");
      }
    }
    if (rankBadge !== undefined) {
      if (rankBadge === null || rankBadge === "") {
        updateData.rankBadge = null;
      } else if (typeof rankBadge === "string" && VALID_RANK_BADGES.includes(rankBadge as (typeof VALID_RANK_BADGES)[number])) {
        updateData.rankBadge = rankBadge;
      } else {
        return apiError("Invalid rank badge");
      }
    }
    if (region !== undefined) {
      if (region === null || region === "") {
        updateData.region = null;
      } else if (typeof region === "string" && isValidRegion(region)) {
        updateData.region = region;
      } else {
        return apiError("Invalid region");
      }
    }
    if (headline !== undefined) {
      if (headline === null || headline === "") {
        updateData.headline = null;
      } else if (typeof headline === "string" && headline.trim().length <= 120) {
        updateData.headline = headline.trim();
      } else {
        return apiError("headline must be a string up to 120 characters");
      }
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
        favoriteHero: true,
        favoriteSkin: true,
        rankBadge: true,
        region: true,
        headline: true,
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

