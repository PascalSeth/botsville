import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// This endpoint now just returns the reveal if user has already answered
// XP is awarded when they answer correctly via the /vote endpoint
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;

    const trivia = await prisma.triviaFact.findUnique({ where: { id } });
    if (!trivia || !trivia.isActive) return apiError("Trivia not found", 404);

    // Check if user has answered this trivia
    const userVote = await prisma.triviaVote.findUnique({
      where: { triviaId_userId: { triviaId: id, userId: user.id } },
      select: { selectedAnswer: true, isCorrect: true, xpAwarded: true },
    });

    if (!userVote) {
      return apiError("Answer the quiz first to see the reveal!", 403);
    }

    const correctAnswer = trivia.choices[trivia.correctAnswerIndex] ?? null;

    return apiSuccess({
      reveal: trivia.reveal,
      correctAnswer,
      userAnswer: userVote.selectedAnswer,
      isCorrect: userVote.isCorrect,
      xpAwarded: userVote.xpAwarded,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reveal trivia";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Trivia reveal POST error:", error);
    return apiError(message, 500);
  }
}
