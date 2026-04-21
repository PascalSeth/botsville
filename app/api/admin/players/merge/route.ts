import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { Prisma, Player, User } from "@/app/generated/prisma/client";

type UserWithPlayer = User & {
  player: Player | null;
};

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization
    const adminUser = await requireAdmin();

    const body = await request.json();
    const { userId, placeholderPlayerId } = body;

    if (!userId || !placeholderPlayerId) {
      return apiError("User ID and Placeholder Player ID are required");
    }

    // 2. Data Fetching
    const user = (await prisma.user.findUnique({
      where: { id: userId },
      include: { player: true },
    })) as UserWithPlayer | null;

    const placeholder = (await prisma.player.findUnique({
      where: { id: placeholderPlayerId },
    })) as Player | null;

    if (!user) return apiError("User not found", 404);
    if (!placeholder) return apiError("Placeholder player not found", 404);
    const currentPlayerId = user.player?.id;

    // 3. Merge Logic (Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // CASE A: User already has a player record -> Absorb historical data into it
      if (currentPlayerId) {
        // Step A: Transfer all match-related data from Placeholder -> Current Player
        
        // 1. Match Performances
        await tx.matchPerformance.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 2. Match MVPs
        await tx.matchMvp.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 3. Tournament MVPs
        await tx.tournamentMvp.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 4. Season/Global MVP Rankings
        await tx.playerMvpRanking.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 5. Awards & Trophies
        await tx.bestRoleAward.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 6. Community Votes
        await tx.roleVote.updateMany({
          where: { playerId: placeholder.id },
          data: { playerId: currentPlayerId }
        });

        // 7. Season Awards (MVP, Offender, Defender)
        await tx.seasonAwards.updateMany({
          where: { seasonMvpId: placeholder.id },
          data: { seasonMvpId: currentPlayerId }
        });
        await tx.seasonAwards.updateMany({
          where: { bestOffenderId: placeholder.id },
          data: { bestOffenderId: currentPlayerId }
        });
        await tx.seasonAwards.updateMany({
          where: { bestDefenderId: placeholder.id },
          data: { bestDefenderId: currentPlayerId }
        });

        // Step B: Update cached stats on the target Player record
        const totalMatches = (user.player?.matchesPlayed ?? 0) + placeholder.matchesPlayed;
        const totalMvps = (user.player?.mvpCount ?? 0) + placeholder.mvpCount;
        
        await tx.player.update({
          where: { id: currentPlayerId },
          data: {
            matchesPlayed: totalMatches,
            mvpCount: totalMvps,
            kda: totalMatches > 0 
              ? ((user.player?.kda ?? 0) * (user.player?.matchesPlayed ?? 0) + (placeholder.kda * placeholder.matchesPlayed)) / totalMatches 
              : 0,
            winRate: totalMatches > 0 
              ? ((user.player?.winRate ?? 0) * (user.player?.matchesPlayed ?? 0) + (placeholder.winRate * placeholder.matchesPlayed)) / totalMatches 
              : 0,
          }
        });

        // Step D: Delete the Placeholder (its data is now moved)
        await tx.player.delete({
          where: { id: placeholder.id },
        });

        // Log the action
        await tx.adminAuditLog.create({
          data: {
            actorId: adminUser.id,
            action: "MERGE_PLACEHOLDER_INTO_PLAYER",
            targetType: "Player",
            targetId: currentPlayerId,
            details: JSON.stringify({
              placeholderId: placeholder.id,
              ign: placeholder.ign,
              matchesTransferred: placeholder.matchesPlayed,
            }),
          },
        });

        return { id: currentPlayerId, matches: totalMatches };
      } 
      
      // CASE B: User does NOT have a player record yet -> Just claim the placeholder!
      else {
        const updated = await tx.player.update({
          where: { id: placeholder.id },
          data: {
            userId: user.id,
            ign: user.ign, // Sync casing to user's preferred casing
          }
        });

        // Log the action
        await tx.adminAuditLog.create({
          data: {
            actorId: adminUser.id,
            action: "CLAIM_PLACEHOLDER_DIRECT",
            targetType: "Player",
            targetId: placeholder.id,
            details: JSON.stringify({
              userId: user.id,
              ign: user.ign,
            }),
          },
        });

        return { id: updated.id, matches: updated.matchesPlayed };
      }
    });

    return apiSuccess({
      message: "Match history successfully merged into user account",
      player: result,
    });
  } catch (error: unknown) {
    console.error("Merge error:", error);
    const message = error instanceof Error ? error.message : "Failed to merge placeholder";
    return apiError(message, 500);
  }
}
