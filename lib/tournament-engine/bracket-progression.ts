import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";

/**
 * Shared Auto-Bracket Progression Hook
 * Executes automatically whenever a match result is finalized/completed.
 */
export async function handleMatchProgression(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { select: { id: true, name: true, captainId: true } },
      teamB: { select: { id: true, name: true, captainId: true } },
      nextMatch: true,
      loserNextMatch: true,
      tournament: { select: { id: true, seasonId: true, defaultBestOf: true } },
    },
  });

  if (!match || match.status !== MatchStatus.COMPLETED || !match.winnerId) {
    return { success: false, reason: "Match not completed or missing winner" };
  }

  const winnerId = match.winnerId;
  const loserId =
    match.teamAId === winnerId ? match.teamBId : match.teamAId;

  const updates: string[] = [];

  // --- 1. Advance Winner to nextMatchId ---
  if (match.nextMatchId && match.nextMatch) {
    const nextM = match.nextMatch;

    // Slot winner into teamA if empty, else teamB
    const updateData: { teamAId?: string; teamBId?: string } = {};
    if (!nextM.teamAId) {
      updateData.teamAId = winnerId;
    } else if (!nextM.teamBId && nextM.teamAId !== winnerId) {
      updateData.teamBId = winnerId;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.match.update({
        where: { id: match.nextMatchId },
        data: updateData,
      });
      updates.push(`Winner advanced to match ${match.nextMatchId}`);
    }
  }

  // --- 2. Advance Loser to loserNextId (Double Elimination) ---
  if (match.loserNextId && match.loserNextMatch && loserId) {
    const loserM = match.loserNextMatch;

    const updateData: { teamAId?: string; teamBId?: string } = {};
    if (!loserM.teamAId) {
      updateData.teamAId = loserId;
    } else if (!loserM.teamBId && loserM.teamAId !== loserId) {
      updateData.teamBId = loserId;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.match.update({
        where: { id: match.loserNextId },
        data: updateData,
      });
      updates.push(`Loser advanced to lower bracket match ${match.loserNextId}`);
    }
  }

  // --- 3. Grand Final Bracket Reset Logic ---
  // If Grand Final match is won by teamB (who came from lower bracket), trigger a BRACKET RESET series
  if (
    match.bracketType === BracketType.GRAND_FINAL &&
    loserId &&
    match.teamBId === winnerId
  ) {
    // Check if bracket reset already created
    const existingReset = await prisma.match.findFirst({
      where: {
        tournamentId: match.tournamentId,
        bracketType: BracketType.BRACKET_RESET,
      },
    });

    if (!existingReset) {
      const resetTime = new Date(
        match.scheduledTime.getTime() + 2 * 60 * 60 * 1000
      ); // 2 hours later

      const resetMatch = await prisma.match.create({
        data: {
          tournamentId: match.tournamentId,
          teamAId: winnerId,
          teamBId: loserId,
          status: MatchStatus.UPCOMING,
          bestOf: match.bestOf,
          bracketType: BracketType.BRACKET_RESET,
          stage: "Grand Final — Bracket Reset (Decider)",
          scheduledTime: resetTime,
        },
      });

      updates.push(`Bracket Reset match created (${resetMatch.id})`);
    }
  }

  // --- 4. Notify Team Captains ---
  const notifications: Promise<unknown>[] = [];

  if (match.teamA?.captainId) {
    notifications.push(
      prisma.notification.create({
        data: {
          userId: match.teamA.captainId,
          type: "MATCH_RESULT_SUBMITTED",
          title: "Match Result Finalized",
          message: `Match result for ${match.stage || "Match"} has been finalized.`,
          linkUrl: `/matches/${match.id}`,
        },
      })
    );
  }

  if (match.teamB?.captainId) {
    notifications.push(
      prisma.notification.create({
        data: {
          userId: match.teamB.captainId,
          type: "MATCH_RESULT_SUBMITTED",
          title: "Match Result Finalized",
          message: `Match result for ${match.stage || "Match"} has been finalized.`,
          linkUrl: `/matches/${match.id}`,
        },
      })
    );
  }

  await Promise.all(notifications);

  return { success: true, updates };
}
