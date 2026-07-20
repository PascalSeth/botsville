import { NextRequest } from "next/server";
import { requireActiveUser, requireAdmin, apiError, apiSuccess, createAuditLog } from "@/lib/api-utils";
import { MatchChallengeStatus, AdminRoleType, ScrimVaultStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

async function getCaptainTeam(userId: string) {
  return prisma.team.findFirst({
    where: {
      captainId: userId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      tag: true,
      captainId: true,
    },
  });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { action, streamUrl, streamerName, scheduledTime, bestOf } = body as {
      action?: string;
      streamUrl?: string;
      streamerName?: string;
      scheduledTime?: string;
      bestOf?: number;
    };

    if (!action) {
      return apiError("action is required");
    }

    const challenge = await prisma.matchChallenge.findUnique({
      where: { id },
      include: {
        challengerTeam: {
          select: { id: true, name: true, captainId: true, tag: true },
        },
        challengedTeam: {
          select: { id: true, name: true, captainId: true, tag: true },
        },
      },
    });

    if (!challenge) {
      return apiError("Challenge not found", 404);
    }

    // ── ACTION: Accept Challenge ────────────────────────────────
    if (action === "accept") {
      if (challenge.status !== MatchChallengeStatus.PENDING) {
        return apiError("Only pending challenges can be accepted");
      }

      const userCaptainTeam = await getCaptainTeam(user.id);
      if (!userCaptainTeam && !user.role) {
        return apiError("Only an active team captain can accept match challenges", 403);
      }

      let acceptingTeamId: string | null = challenge.challengedTeamId;
      if (!acceptingTeamId) {
        if (userCaptainTeam && userCaptainTeam.id === challenge.challengerTeamId) {
          return apiError("You cannot accept your own team's challenge", 400);
        }
        acceptingTeamId = userCaptainTeam?.id || null;
      } else {
        if (challenge.challengedTeam?.captainId !== user.id && !user.role) {
          return apiError("Only the challenged team captain can accept this match", 403);
        }
      }

      if (!acceptingTeamId) {
        return apiError("Could not identify accepting team", 400);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          challengedTeamId: acceptingTeamId,
          status: MatchChallengeStatus.ACCEPTED,
          respondedById: user.id,
          acceptedAt: new Date(),
        },
        include: {
          challengerTeam: { select: { id: true, name: true } },
          challengedTeam: { select: { id: true, name: true } },
        },
      });

      // 1. Notify Challenger Captain
      if (challenge.challengerTeam.captainId) {
        await prisma.notification.create({
          data: {
            userId: challenge.challengerTeam.captainId,
            type: "MATCH_SCHEDULED",
            title: "⚔️ Public Scrim Challenge Accepted!",
            message: `${userCaptainTeam?.name || 'A rival squad'} accepted your public challenge. Tournament admins & streamers have been notified!`,
            linkUrl: "/challenge-arena",
          },
        });
      }

      // 2. Notify Accepting Captain
      if (userCaptainTeam?.captainId) {
        await prisma.notification.create({
          data: {
            userId: userCaptainTeam.captainId,
            type: "MATCH_SCHEDULED",
            title: "⚔️ Match Challenge Accepted!",
            message: `You accepted the challenge from ${challenge.challengerTeam.name}. Match details are now live on the Challenge Arena!`,
            linkUrl: "/challenge-arena",
          },
        });
      }

      return apiSuccess({ message: "Challenge accepted successfully!", challenge: updated });
    }

    // ── ACTION: Schedule & Assign Streamer (Admin / Streamer) ──
    if (action === "schedule" || action === "assign_streamer") {
      if (!user.role) {
        return apiError("Only tournament admins or assigned streamers can schedule/stream matches", 403);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.SCHEDULED,
          scheduledAt: scheduledTime ? new Date(scheduledTime) : new Date(),
        },
      });

      // If YouTube / Stream URL was provided, automatically publish to Scrim Vault!
      let scrimVaultEntry = null;
      if (streamUrl && streamUrl.trim().length > 0) {
        const teamAName = challenge.challengerTeam?.name || "Team A";
        const teamBName = challenge.challengedTeam?.name || "Team B";

        scrimVaultEntry = await prisma.scrimVault.create({
          data: {
            title: `[CHALLENGE LIVE] ${teamAName} vs ${teamBName}`,
            matchup: `${challenge.challengerTeam?.tag || 'A'} vs ${challenge.challengedTeam?.tag || 'B'}`,
            videoUrl: streamUrl.trim(),
            category: "CHALLENGE",
            status: ScrimVaultStatus.APPROVED,
            submittedById: user.id,
            approvedById: user.id,
            featured: true,
          },
        });

        // Notify both captains that match is live in Scrim Vault!
        const captains = [
          challenge.challengerTeam?.captainId,
          challenge.challengedTeam?.captainId,
        ].filter(Boolean) as string[];

        for (const captainId of captains) {
          await prisma.notification.create({
            data: {
              userId: captainId,
              type: "MATCH_SCHEDULED",
              title: "🎥 Live Stream Published to Scrim Vault!",
              message: `Streamer ${streamerName || 'Admin'} has published your challenge live stream link to the Scrim Vault!`,
              linkUrl: "/challenge-arena",
            },
          });
        }
      }

      return apiSuccess({
        message: streamUrl ? "Streamer assigned & published to Scrim Vault!" : "Challenge scheduled",
        challenge: updated,
        scrimVault: scrimVaultEntry,
      });
    }

    // ── ACTION: Reject Challenge ────────────────────────────────
    if (action === "reject") {
      if (challenge.status !== MatchChallengeStatus.PENDING) {
        return apiError("Only pending challenges can be rejected");
      }

      if (challenge.challengedTeam?.captainId !== user.id && !user.role) {
        return apiError("Only the challenged team captain can decline", 403);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.REJECTED,
          respondedById: user.id,
          rejectedAt: new Date(),
        },
      });

      if (challenge.challengerTeam.captainId) {
        await prisma.notification.create({
          data: {
            userId: challenge.challengerTeam.captainId,
            type: "MATCH_SCHEDULED",
            title: "Challenge Declined",
            message: `${challenge.challengedTeam?.name || 'The requested squad'} declined your challenge request.`,
            linkUrl: "/challenge-arena",
          },
        });
      }

      return apiSuccess({ message: "Challenge declined", challenge: updated });
    }

    // ── ACTION: Cancel Challenge ────────────────────────────────
    if (action === "cancel") {
      if (challenge.challengerTeam.captainId !== user.id && !user.role) {
        return apiError("Only the challenging team captain can cancel", 403);
      }

      const updated = await prisma.matchChallenge.update({
        where: { id },
        data: {
          status: MatchChallengeStatus.CANCELLED,
          respondedById: user.id,
        },
      });

      return apiSuccess({ message: "Challenge cancelled", challenge: updated });
    }

    return apiError("Invalid action specified");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update challenge";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError(message, 500);
  }
}
