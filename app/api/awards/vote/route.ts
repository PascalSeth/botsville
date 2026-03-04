import { NextRequest } from "next/server";
import { getCurrentUser, requireAuth, apiError, apiSuccess } from "@/lib/api-utils";
import { GameRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// GET — current user's votes for a season
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiSuccess({ votes: {} });

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    if (!seasonId) return apiError("seasonId is required");

    const votes = await prisma.roleVote.findMany({
      where: { userId: user.id, seasonId },
      select: { role: true, playerId: true },
    });

    // Return as a map: { EXP: "playerId", JUNGLE: "playerId", ... }
    const voteMap: Record<string, string> = {};
    for (const v of votes) voteMap[v.role] = v.playerId;

    return apiSuccess({ votes: voteMap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch votes";
    return apiError(message, 500);
  }
}

// POST — cast or toggle a vote
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { playerId, role, seasonId } = body;

    if (!playerId || !role || !seasonId) {
      return apiError("playerId, role, and seasonId are required");
    }
    if (!Object.values(GameRole).includes(role as GameRole)) {
      return apiError("Invalid role");
    }

    // Verify season exists and is ACTIVE
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return apiError("Season not found", 404);
    if (season.status !== "ACTIVE") return apiError("Voting is only open during an active season");

    // Verify player exists and plays this role for the given season
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, role: true, secondaryRole: true, teamId: true },
    });
    if (!player) return apiError("Player not found", 404);
    if (player.role !== (role as GameRole) && player.secondaryRole !== (role as GameRole)) {
      return apiError("Player does not play this role");
    }

    // Toggle: if user already voted for this exact player in this role, remove the vote
    const existing = await prisma.roleVote.findUnique({
      where: { userId_role_seasonId: { userId: user.id, role: role as GameRole, seasonId } },
    });

    if (existing && existing.playerId === playerId) {
      // Un-vote
      await prisma.roleVote.delete({ where: { id: existing.id } });
      return apiSuccess({ action: "removed", role, playerId });
    }

    // Upsert: new vote or switch vote
    const vote = await prisma.roleVote.upsert({
      where: { userId_role_seasonId: { userId: user.id, role: role as GameRole, seasonId } },
      create: { userId: user.id, playerId, role: role as GameRole, seasonId },
      update: { playerId },
    });

    return apiSuccess({ action: "voted", vote });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cast vote";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Vote error:", error);
    return apiError(message, 500);
  }
}
