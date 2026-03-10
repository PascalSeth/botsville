import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { InviteStatus, GameRole } from "@/app/generated/prisma/enums";

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
      await prisma.teamInvite.update({
        where: { id },
        data: { status: InviteStatus.EXPIRED },
      });
      return apiError("Invite has expired");
    }

    if (action === "decline") {
      await prisma.teamInvite.update({
        where: { id },
        data: {
          status: InviteStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      // If declined by recipient (invite target), notify sender; if declined by captain (application), notify applicant
      const notifyUserId = isRecipient ? invite.fromUserId : invite.fromUserId;
      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            // Use existing notification types; titles/messages differentiate applications vs invites
            type: "TEAM_INVITE_DECLINED",
            title: isCaptain ? "Application Declined" : "Invite Declined",
            message: isCaptain
              ? `${invite.team?.name} declined the application from ${invite.fromUserId}`
              : `${user.ign} declined your team invite`,
            linkUrl: isCaptain ? `/my-team` : `/teams/${invite.teamId}`,
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
      // Check if target user is already on a team
      const existingPlayer = await prisma.player.findFirst({
        where: { userId: targetUserId, deletedAt: null },
      });
      if (existingPlayer) throw new Error('User is already on a team');

      if (invite.team.players.length >= 9) throw new Error('Team is full (maximum 9 players)');

      const roleTaken = invite.team.players.find((p) => p.role === acceptRole && !p.isSubstitute);
      const isSubstitute = Boolean(roleTaken);

      // If a placeholder player with same IGN already exists on the team (created by captain),
      // attach the user to that player instead of creating a new row (avoids unique ign error).
      const placeholder = await prisma.player.findFirst({
        where: {
          teamId: invite.teamId,
          ign: targetIgn,
          deletedAt: null,
        },
      });

      if (placeholder) {
        if (placeholder.userId) {
          // Shouldn't normally happen, but guard against it
          throw new Error('IGN already associated with a user on this team');
        }

        const player = await prisma.player.update({
          where: { id: placeholder.id },
          data: {
            userId: targetUserId,
            role: acceptRole,
            secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
            isSubstitute,
            updatedAt: new Date(),
          },
        });

        return { player, isSubstitute };
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

      // Check if user is already on a team
      const existingPlayer = await prisma.player.findFirst({ where: { userId: user.id, deletedAt: null } });
      if (existingPlayer) return apiError('You are already on a team');

      if (invite.team.players.length >= 9) return apiError('Team is full (maximum 9 players)');

      const roleTaken = invite.team.players.find((p) => p.role === role && !p.isSubstitute);
      const isSubstitute = Boolean(roleTaken);

      // Cancel other pending invites for this user
      await prisma.teamInvite.updateMany({
        where: { toUserId: user.id, status: InviteStatus.PENDING, id: { not: id } },
        data: { status: InviteStatus.CANCELLED, respondedAt: new Date() },
      });

      const player = await prisma.player.create({
        data: {
          teamId: invite.teamId,
          userId: user.id,
          ign: user.ign,
          role: role as GameRole,
          secondaryRole: secondaryRole ? (secondaryRole as GameRole) : null,
          isSubstitute,
        },
      });

      await prisma.teamInvite.update({ where: { id }, data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() } });

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

        await prisma.teamInvite.update({ where: { id }, data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() } });

        // Cancel other pending invites for this user (they've now joined a team)
        await prisma.teamInvite.updateMany({
          where: {
            toUserId: applicantId,
            status: InviteStatus.PENDING,
            id: { not: id },
          },
          data: { status: InviteStatus.CANCELLED, respondedAt: new Date() },
        });

        // Notify applicant (use existing notification type)
        await prisma.notification.create({
          data: {
            userId: applicantId!,
            type: 'TEAM_INVITE_ACCEPTED',
            title: 'Application Accepted',
            message: `${invite.team?.name} accepted your application`,
            linkUrl: `/my-team`,
          },
        });

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



