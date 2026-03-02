import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function getWeekStart(value?: string): Date {
  const now = value ? new Date(value) : new Date();
  if (Number.isNaN(now.getTime())) return new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function parseDateTime(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.TOURNAMENT_ADMIN);
    const body = await request.json().catch(() => ({}));
    const scrimDate = parseDateTime(body?.scrimDate);
    if (!scrimDate) {
      return apiError("scrimDate is required and must be a valid date", 400);
    }

    const weekStart = getWeekStart(body?.weekStart);
    const weekLabel = weekStart.toISOString().slice(0, 10);
    const scrimDateLabel = scrimDate.toLocaleString();

    await prisma.weeklyScrimPing.upsert({
      where: { weekStart },
      create: {
        weekStart,
        scrimDate,
        createdById: admin.id,
        message: typeof body?.message === "string" && body.message.trim() ? body.message.trim().slice(0, 200) : null,
      },
      update: {
        scrimDate,
        createdById: admin.id,
        message: typeof body?.message === "string" && body.message.trim() ? body.message.trim().slice(0, 200) : null,
      },
    });

    const captains = await prisma.team.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        captainId: { not: null },
      },
      select: {
        id: true,
        name: true,
        captainId: true,
      },
    });

    const recipientIds = Array.from(new Set(captains.map((team) => team.captainId).filter(Boolean) as string[]));

    if (recipientIds.length === 0) {
      return apiSuccess({ message: "No team captains available", sent: 0 });
    }

    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type: "MATCH_SCHEDULED",
        title: "Weekly Scrim Availability",
        message: `Weekly scrim window ${weekLabel} is open. Proposed scrim date: ${scrimDateLabel}. Set your team availability and challenge another team this week.`,
        linkUrl: "/my-team",
      })),
    });

    await createAuditLog(
      admin.id,
      "PING_WEEKLY_SCRIM_AVAILABILITY",
      "Team",
      "ALL_CAPTAINS",
      JSON.stringify({ weekStart: weekLabel, scrimDate: scrimDate.toISOString(), recipients: recipientIds.length })
    );

    return apiSuccess({
      message: "Weekly scrim ping sent",
      sent: recipientIds.length,
      weekStart,
      scrimDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send weekly scrim notifications";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    return apiError(message, 500);
  }
}
