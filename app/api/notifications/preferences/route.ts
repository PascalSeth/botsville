import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";

import { prisma } from "@/lib/prisma";

// GET - Get notification preferences
export async function GET() {
  try {
    const user = await requireActiveUser();

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
        },
      });
    }

    return apiSuccess(preferences);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch preferences";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Get notification preferences error:", error);
    return apiError(message, 500);
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const {
      emailMatchReminder,
      emailRegistrationDecision,
      emailTournamentStart,
      emailAccountActions,
    } = body;

    const updateData: Prisma.NotificationPreferenceUpdateInput = {};
    if (emailMatchReminder !== undefined)
      updateData.emailMatchReminder = Boolean(emailMatchReminder);
    if (emailRegistrationDecision !== undefined)
      updateData.emailRegistrationDecision = Boolean(emailRegistrationDecision);
    if (emailTournamentStart !== undefined)
      updateData.emailTournamentStart = Boolean(emailTournamentStart);
    if (emailAccountActions !== undefined)
      updateData.emailAccountActions = Boolean(emailAccountActions);

    if (Object.keys(updateData).length === 0) {
      return apiError("No preferences to update");
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        emailMatchReminder: Boolean(emailMatchReminder),
        emailRegistrationDecision: Boolean(emailRegistrationDecision),
        emailTournamentStart: Boolean(emailTournamentStart),
        emailAccountActions: Boolean(emailAccountActions),
      },
    });

    return apiSuccess({
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Update notification preferences error:", error);
    return apiError(message, 500);
  }
}



