import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminRoleType, PollStatus } from "@/app/generated/prisma/enums";
import { apiError, apiSuccess, createAuditLog, requireAdmin } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new Error("Invalid expiresAt");
  return d;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;

    const poll = await prisma.poll.findUnique({ where: { id }, include: { options: true, _count: { select: { votes: true } } } });
    if (!poll) return apiError("Poll not found", 404);

    return apiSuccess({ poll });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch poll";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Poll GET error:", error);
    return apiError(message, 500);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();

    const updateData: Prisma.PollUpdateInput = {};

    if (body.question !== undefined) updateData.question = String(body.question).trim();
    if (body.status !== undefined) {
      const statusUpper = String(body.status).toUpperCase();
      if (!Object.values(PollStatus).includes(statusUpper as PollStatus)) return apiError("Invalid status", 400);
      updateData.status = statusUpper as PollStatus;
    }
    if (body.expiresAt !== undefined) updateData.expiresAt = parseDate(body.expiresAt);

    const optionsToAdd = Array.isArray(body.optionsToAdd)
      ? body.optionsToAdd.map((val: string) => String(val).trim()).filter(Boolean)
      : [];

    if (!Object.keys(updateData).length && optionsToAdd.length === 0) {
      return apiError("No fields to update", 400);
    }

    const updated = await prisma.poll.update({
      where: { id },
      data: {
        ...updateData,
        options: optionsToAdd.length ? { create: optionsToAdd.map((text: string) => ({ text })) } : undefined,
      },
      include: { options: true, _count: { select: { votes: true } } },
    });

    await createAuditLog(admin.id, "UPDATE_POLL", "Poll", id, JSON.stringify({ ...updateData, optionsToAdd }));

    return apiSuccess({ poll: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update poll";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    if (message.startsWith("Invalid")) return apiError(message, 400);
    console.error("Poll PATCH error:", error);
    return apiError(message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;

    await prisma.$transaction([
      prisma.pollVote.deleteMany({ where: { pollId: id } }),
      prisma.pollOption.deleteMany({ where: { pollId: id } }),
      prisma.poll.delete({ where: { id } }),
    ]);

    await createAuditLog(admin.id, "DELETE_POLL", "Poll", id);

    return apiSuccess({ message: "Poll deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete poll";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Poll DELETE error:", error);
    return apiError(message, 500);
  }
}
