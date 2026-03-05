import { NextRequest } from "next/server";
import { apiError, apiSuccess, requireActiveUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const XP_REWARD = 10; // XP awarded for correct answer

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Validate answer is provided
    if (typeof body.answer !== "string" || !body.answer.trim()) {
      return apiError("answer is required", 400);
    }

    const selectedAnswer = body.answer.trim();

    const now = new Date();
    const trivia = await prisma.triviaFact.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { periodFrom: null, periodTo: null },
          {
            AND: [
              { OR: [{ periodFrom: null }, { periodFrom: { lte: now } }] },
              { OR: [{ periodTo: null }, { periodTo: { gte: now } }] },
            ],
          },
        ],
      },
    });

    if (!trivia) return apiError("Trivia not found", 404);

    // Check if answer is a valid choice
    if (!trivia.choices.includes(selectedAnswer)) {
      return apiError("Invalid answer choice", 400);
    }

    // Check if user already answered
    const existing = await prisma.triviaVote.findUnique({
      where: { triviaId_userId: { triviaId: id, userId: user.id } },
      select: { selectedAnswer: true, isCorrect: true, xpAwarded: true },
    });

    if (existing) {
      const correctAnswer = trivia.choices[trivia.correctAnswerIndex] ?? null;
      const [totalAttempts, correctCount] = await Promise.all([
        prisma.triviaVote.count({ where: { triviaId: id } }),
        prisma.triviaVote.count({ where: { triviaId: id, isCorrect: true } }),
      ]);

      return apiError(
        JSON.stringify({
          message: "You already answered this trivia",
          userAnswer: existing.selectedAnswer,
          isCorrect: existing.isCorrect,
          correctAnswer,
          xpAwarded: existing.xpAwarded,
          reveal: trivia.reveal,
          totalAttempts,
          correctCount,
        }),
        409
      );
    }

    // Check if answer is correct
    const correctAnswer = trivia.choices[trivia.correctAnswerIndex] ?? "";
    const isCorrect = selectedAnswer === correctAnswer;
    const xpAwarded = isCorrect ? XP_REWARD : 0;

    // Create vote and award XP in a transaction
    await prisma.$transaction(async (tx) => {
      // Record the vote
      await tx.triviaVote.create({
        data: {
          triviaId: id,
          userId: user.id,
          selectedAnswer,
          isCorrect,
          xpAwarded,
        },
      });

      // Log the XP event if correct (XP is tracked via UserXpEvent records)
      if (isCorrect) {
        await tx.userXpEvent.create({
          data: {
            userId: user.id,
            type: "TRIVIA_CORRECT",
            xp: XP_REWARD,
            metadata: JSON.stringify({ triviaId: id, answer: selectedAnswer }),
          },
        });
      }
    });

    // Get updated stats
    const [totalAttempts, correctCount] = await Promise.all([
      prisma.triviaVote.count({ where: { triviaId: id } }),
      prisma.triviaVote.count({ where: { triviaId: id, isCorrect: true } }),
    ]);

    return apiSuccess({
      triviaId: id,
      userAnswer: selectedAnswer,
      isCorrect,
      correctAnswer,
      xpAwarded,
      reveal: trivia.reveal,
      totalAttempts,
      correctCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit trivia answer";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    if (message === "Account has been banned" || message === "Account is suspended") return apiError(message, 403);
    console.error("Trivia vote POST error:", error);
    return apiError(message, 500);
  }
}
