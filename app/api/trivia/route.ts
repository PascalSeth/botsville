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

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0"));
    const active = searchParams.get("active");

    const where: Prisma.TriviaFactWhereInput = {};
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;
    const category = searchParams.get("category");
    if (category && TRIVIA_CATEGORIES.includes(category as TriviaCategory)) {
      where.category = category as TriviaCategory;
    }

    const [trivia, total] = await Promise.all([
      prisma.triviaFact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.triviaFact.count({ where }),
    ]);

    return apiSuccess({
      trivia,
      pagination: { total, limit, skip },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.startsWith("Invalid")) return apiError(message, 400);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Trivia list error:", error);
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(AdminRoleType.CONTENT_ADMIN);
    const body = await request.json();
    const { category, title, teaser, choices, correctAnswerIndex, reveal, heroSlug, isActive, periodFrom, periodTo, images } = body;

    if (!teaser?.trim()) {
      return apiError("Question (teaser) is required");
    }

    // Validate choices
    const parsedChoices = Array.isArray(choices)
      ? choices.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];

    if (parsedChoices.length < 2) {
      return apiError("At least 2 answer choices are required");
    }

    const parsedCorrectIndex = typeof correctAnswerIndex === "number" && correctAnswerIndex >= 0 && correctAnswerIndex < parsedChoices.length
      ? correctAnswerIndex
      : 0;

    const parsedCategory = category && TRIVIA_CATEGORIES.includes(category)
      ? (category as TriviaCategory)
      : TriviaCategory.GENERAL;

    const parsedFrom = parseOptionalDate(periodFrom, "periodFrom");
    const parsedTo = parseOptionalDate(periodTo, "periodTo");
    const parsedImages = parseImages(images) ?? [];

    const trivia = await prisma.triviaFact.create({
      data: {
        category: parsedCategory,
        title: title?.trim() || "",
        teaser: teaser.trim(),
        choices: parsedChoices,
        correctAnswerIndex: parsedCorrectIndex,
        reveal: reveal?.trim() || "",
        heroSlug: heroSlug?.trim() || null,
        isActive: isActive === undefined ? true : Boolean(isActive),
        images: parsedImages,
        periodFrom: parsedFrom,
        periodTo: parsedTo,
      },
    });

    await createAuditLog(admin.id, "CREATE_TRIVIA", "TriviaFact", trivia.id, JSON.stringify({ title: trivia.title }));

    return apiSuccess({ trivia }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message.startsWith("Invalid")) return apiError(message, 400);
    if (message.includes("Forbidden")) return apiError(message, 403);
    console.error("Trivia create error:", error);
    return apiError(message, 500);
  }
}
