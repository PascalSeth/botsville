import { NextRequest } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminRoleType, TriviaCategory } from "@/app/generated/prisma/enums";
import { apiError, apiSuccess, createAuditLog, requireAdmin } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const TRIVIA_CATEGORIES = Object.values(TriviaCategory);

function parseOptionalDate(value: unknown, label: string): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }
  return date;
}

function parseImages(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Invalid images");
  const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
  return cleaned;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;

    const trivia = await prisma.triviaFact.findUnique({ where: { id } });
    if (!trivia) return apiError("Trivia not found", 404);

    return apiSuccess(trivia);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Trivia get error:", error);
    return apiError(message, 500);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.triviaFact.findUnique({ where: { id } });
    if (!existing) return apiError("Trivia not found", 404);

    const updateData: Prisma.TriviaFactUpdateInput = {};

    if (body.category !== undefined && TRIVIA_CATEGORIES.includes(body.category)) {
      updateData.category = body.category as TriviaCategory;
    }
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.teaser !== undefined) updateData.teaser = String(body.teaser).trim();
    if (body.choices !== undefined) {
      const parsedChoices = Array.isArray(body.choices)
        ? body.choices.map((c: unknown) => String(c).trim()).filter(Boolean)
        : [];
      if (parsedChoices.length >= 2) {
        updateData.choices = parsedChoices;
      }
    }
    if (body.correctAnswerIndex !== undefined) {
      const idx = parseInt(body.correctAnswerIndex);
      if (!isNaN(idx) && idx >= 0) {
        updateData.correctAnswerIndex = idx;
      }
    }
    if (body.reveal !== undefined) updateData.reveal = String(body.reveal).trim();
    if (body.heroSlug !== undefined) updateData.heroSlug = body.heroSlug?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.periodFrom !== undefined) updateData.periodFrom = parseOptionalDate(body.periodFrom, "periodFrom");
    if (body.periodTo !== undefined) updateData.periodTo = parseOptionalDate(body.periodTo, "periodTo");
    if (body.images !== undefined) updateData.images = parseImages(body.images);

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.triviaFact.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog(admin.id, "UPDATE_TRIVIA", "TriviaFact", id, JSON.stringify(updateData));

    return apiSuccess({ trivia: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.startsWith("Invalid")) return apiError(message, 400);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Trivia update error:", error);
    return apiError(message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { id } = await context.params;

    await prisma.triviaFact.delete({ where: { id } });
    await createAuditLog(admin.id, "DELETE_TRIVIA", "TriviaFact", id);

    return apiSuccess({ message: "Trivia deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Trivia delete error:", error);
    return apiError(message, 500);
  }
}
