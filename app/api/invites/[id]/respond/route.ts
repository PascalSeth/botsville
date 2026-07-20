import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { InviteStatus, GameRole } from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";

import { prisma } from "@/lib/prisma";


// POST - Accept or decline invite
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json();
    const { action, role, secondaryRole } = body; // action: "accept" | "decline"

    if (!action || !["accept", "decline"].includes(action)) {
      return apiError("Action must be 'accept' or 'decline'");
    }

    // Get invite
    const invite = await prisma.teamInvite.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
            },
            captain: {
              select: {
                id: true,
                ign: true,
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            ign: true,
          },
        },
      },
    });

    if (!invite) {
      return apiError("Invite not found", 404);
    }

    // Verify invite belongs to user OR the active user is the team captain (for applications)
    const isRecipient = invite.toUserId === user.id || invite.toIGN === user.ign;
    const isCaptain = invite.team?.captain?.id === user.id;

    if (!isRecipient && !isCaptain) {
      return apiError("This invite is not for you", 403);
    }

    // Check if invite is still valid
    if (invite.status !== InviteStatus.PENDING) {
      return apiError("Invite has already been responded to");
    }

    if (invite.expiresAt < new Date()) {
      try {
        await prisma.teamInvite.update({
          where: { id },
          data: { status: InviteStatus.EXPIRED },
        });
      } catch (err: unknown) {
        // Handle unique constraint violation - if a record already exists with this status, just ignore
        if (err instanceof Error && err.message.includes("Unique constraint failed")) {
          console.log("Invite already marked as expired (unique constraint)");
        } else {
          throw err;
        }
      }
      return apiError("Invite has expired");
    }

    if (action === "decline") {
      // Delete any older non-pending records for this team and player to prevent @@unique([teamId, toIGN, status]) collisions
      await prisma.teamInvite.deleteMany({
        where: {
          teamId: invite.teamId,
          toIGN: { equals: invite.toIGN, mode: "insensitive" },
          id: { not: id },
          status: { in: [InviteStatus.DECLINED, InviteStatus.EXPIRED, InviteStatus.CANCELLED] },
        },
      });

      await prisma.teamInvite.update({
        where: { id },
        data: {
          status: InviteStatus.DECLINED,
          respondedAt: new Date(),
        },
      });


      // If declined by recipient (invite target), notify sender; if declined by captain (application), notify applicant
      const notifyUserId = isCaptain ? invite.fromUserId : invite.fromUserId;
      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: "TEAM_INVITE_DECLINED",
            title: isCaptain ? "Application Declined" : "Invite Declined",
            message: isCaptain
              ? `Your application to join ${invite.team?.name || 'the squad'} was declined by the team captain.`
              : `${user.ign} declined your team invite to join ${invite.team?.name || 'the squad'}.`,
            linkUrl: isCaptain ? `/teams` : `/teams/${invite.teamId}`,
          },
        });
      }


      return apiSuccess({ message: "Invite declined" });
    }

    // Accept invite
    // Two cases:
    // 1) recipient (invite target) accepts an invite sent by a team -> behavior unchanged
    // 2) captain (invite target for an application) accepts an application -> create player for the applicant (invite.fromUserId)

    // Default role if not provided (for captain-driven accepts)
    const acceptRole = role && Object.values(GameRole).includes(role) ? (role as GameRole) : GameRole.EXP;

    // Helper to create player for a target user id
    const createPlayerForUser = async (targetUserId: string, targetIgn: string) => {
      // Find target user's active or inactive player record
      const playerRecord = await prisma.player.findFirst({
        where: { userId: targetUserId },
      });
      if (playerRecord && !playerRecord.deletedAt) throw new Error('User is already on a team');

      if (invite.team.players.length >= 20) throw new Error('Team is full (maximum 20 players)');

      const roleTaken = invite.team.players.find((p) => p.role === acceptRole && !p.isSubstitute);
      const isSubstitute = Boolean(roleTaken);

      if (playerRecord) {
        // Restore and reuse the user's existing player record (preserves stats)
        const player = await prisma.player.update({
          where: { id: playerRecord.id },
          data: {
            teamId: invite.teamId,
            ign: targetIgn,
            role: acceptRole,
            secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
            isSubstitute,
            deletedAt: null, // restore
            updatedAt: new Date(),
          },
        });
        return { player, isSubstitute };
      }

      // Check if this IGN exists as a placeholder ANYWHERE (including soft-deleted)
      const placeholder = await prisma.player.findFirst({
        where: {
          ign: { equals: targetIgn, mode: "insensitive" },
          userId: null,
        },
      });

      if (placeholder) {
        // Claim the placeholder and move it to the current team
        const player = await prisma.player.update({
          where: { id: placeholder.id },
          data: {
            userId: targetUserId,
            teamId: invite.teamId, // Transfer to the target team
            role: acceptRole,
            secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
            isSubstitute,
            ign: targetIgn, // Sync casing
            deletedAt: null, // restore if soft-deleted
            updatedAt: new Date(),
          },
        });

        return { player, isSubstitute };
      }

      // Final fallback check for active players (not placeholders)
      const existingActivePlayer = await prisma.player.findFirst({
        where: { 
          ign: { equals: targetIgn, mode: "insensitive" }, 
          userId: { not: null },
          deletedAt: null
        },
      });

      if (existingActivePlayer) {
        throw new Error('IGN is already taken by another active player');
      }

      const player = await prisma.player.create({
        data: {
          teamId: invite.teamId,
          userId: targetUserId,
          ign: targetIgn,
          role: acceptRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          isSubstitute,
        },
      });

      return { player, isSubstitute };
    };

    // If active user is the recipient (normal invite accept)
    // Only treat as a recipient-accept when the invite was sent by the team (not when it's an application from a user)
    if (isRecipient && invite.toUserId === user.id && invite.fromUserId === invite.team?.captain?.id) {
      // Existing behavior: recipient accepts invite for themselves
      if (!role) {
        return apiError('Role is required when accepting invite');
      }

      if (!Object.values(GameRole).includes(role)) {
        return apiError('Invalid role');
      }

      // Find the player's active or inactive player record
      const playerRecord = await prisma.player.findFirst({
        where: { userId: user.id },
      });

      if (playerRecord && !playerRecord.deletedAt) {
        return apiError("You are already on a team");
      }

      if (invite.team.players.length >= 20) return apiError('Team is full (maximum 20 players)');

      const roleTaken = invite.team.players.find((p) => p.role === role && !p.isSubstitute);
      const isSubstitute = Boolean(roleTaken);

      // Cancel other pending invites for this user
      await prisma.teamInvite.updateMany({
        where: { toUserId: user.id, status: InviteStatus.PENDING, id: { not: id } },
        data: { status: InviteStatus.CANCELLED, respondedAt: new Date() },
      });

      let player;
      if (playerRecord) {
        // Restore and reuse the user's existing player record (preserves stats)
        player = await prisma.player.update({
          where: { id: playerRecord.id },
          data: {
            teamId: invite.teamId,
            ign: user.ign,
            role: role as GameRole,
            secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
            isSubstitute,
            deletedAt: null, // restore
            updatedAt: new Date(),
          },
        });
      } else {
        // Check for placeholders first (including soft-deleted) to preserve match history
        const placeholder = await prisma.player.findFirst({
          where: { 
            ign: { equals: user.ign, mode: "insensitive" },
            userId: null,
          },
        });

        if (placeholder) {
          // Claim and transfer the placeholder
          player = await prisma.player.update({
            where: { id: placeholder.id },
            data: {
              userId: user.id,
              teamId: invite.teamId,
              role: role as GameRole,
              secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
              isSubstitute,
              ign: user.ign,
              deletedAt: null, // restore if soft-deleted
              updatedAt: new Date(),
            },
          });
        } else {
          player = await prisma.player.create({
            data: {
              teamId: invite.teamId,
              userId: user.id,
              ign: user.ign,
              role: role as GameRole,
              secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
              isSubstitute,
            },
          });
        }
      }

      try {
        await prisma.teamInvite.update({ where: { id }, data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() } });
      } catch (err: unknown) {
        // Handle unique constraint violation
        if (err instanceof Error && err.message.includes("Unique constraint failed")) {
          console.log("Invite already in accepted state (unique constraint)");
        } else {
          throw err;
        }
      }

      // Notify captain
      if (invite.team.captainId) {
        await prisma.notification.create({
          data: {
            userId: invite.team.captainId!,
            type: 'TEAM_INVITE_ACCEPTED',
            title: 'Invite Accepted',
            message: `${user.ign} joined your team`,
            linkUrl: `/my-team`,
          },
        });
      }

      return apiSuccess({ message: 'Invite accepted successfully', player, isSubstitute }, 201);
    }

    // If active user is the captain handling an application
    if (isCaptain) {
      const applicantId = invite.fromUserId;
      // Use applicant fields from invite if available
      const applicantUser = await prisma.user.findUnique({ where: { id: applicantId } });
      if (!applicantUser && !invite.toIGN) return apiError('Applicant not found');

      try {
        const { player, isSubstitute } = await createPlayerForUser(applicantId!, applicantUser?.ign ?? invite.toIGN ?? '');

        try {
          await prisma.teamInvite.update({ where: { id }, data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() } });
        } catch (err: unknown) {
          // Handle unique constraint violation
          if (err instanceof Error && err.message.includes("Unique constraint failed")) {
            console.log("Invite already in accepted state (unique constraint)");
          } else {
            throw err;
          }
        }

        // Cancel other pending invites/applications for this user (they've now joined a team)
        await prisma.teamInvite.updateMany({
          where: {
            OR: [
              { toUserId: applicantId },
              { fromUserId: applicantId },
            ],
            status: InviteStatus.PENDING,
            id: { not: id },
          },
          data: { status: InviteStatus.CANCELLED, respondedAt: new Date() },
        });

        // Notify applicant when application is accepted
        await prisma.notification.create({
          data: {
            userId: applicantId!,
            type: 'TEAM_INVITE_ACCEPTED',
            title: 'Application Accepted 🎉',
            message: `Congratulations! ${invite.team?.name || 'The squad'} accepted your application. You are now officially on their roster!`,
            linkUrl: `/my-team`,
          },
        });

        await invalidatePattern('teams:*');
        await invalidatePattern('leaderboard:*');

        return apiSuccess({ message: 'Application accepted', player, isSubstitute }, 201);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to accept application';
        return apiError(msg);
      }

    }

    return apiError('Unable to process accept request');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to respond to invite";
    if (message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error("Respond to invite error:", error);
    return apiError(message, 500);
  }
}



