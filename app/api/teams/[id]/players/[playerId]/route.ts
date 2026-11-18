import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess, isValidIGN } from "@/lib/api-utils";
import { TeamStatus } from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";
import { teamTransaction } from "@/lib/team-transaction";
import { planLineupChange, parseTeamRole, chooseJoinPosition, TeamActionError } from "@/lib/team-lineup";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id, playerId } = await params;
    const body = await request.json();
    const result = await teamTransaction(async tx => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { team: { include: { players: { where: { deletedAt: null } } } } },
      });
      if (!player || player.deletedAt || player.teamId !== id || player.team.deletedAt) throw new TeamActionError('Player not found', 404);
      const manager = player.team.captainId === user.id || Boolean(user.role);
      if (!manager && player.userId !== user.id) throw new TeamActionError('Only the team captain can manage team members', 403);
      const lineupKeys = ['role', 'isSubstitute', 'replacePlayerId', 'swapRoleWithPlayerId', 'swapRoleIfTaken'];
      const changesLineup = lineupKeys.some(key => body[key] !== undefined);
      if (!manager && (changesLineup || body.transferToTeamId !== undefined)) throw new TeamActionError('Only the team captain can change the lineup or transfer players', 403);

      const data: Record<string, unknown> = {};
      if (body.ign !== undefined) {
        const ign = typeof body.ign === 'string' ? body.ign.trim() : '';
        if (!isValidIGN(ign)) throw new TeamActionError('Invalid IGN');
        data.ign = ign;
      }
      if (body.secondaryRole !== undefined) data.secondaryRole = body.secondaryRole ? parseTeamRole(body.secondaryRole) : null;
      for (const key of ['signatureHero', 'photo', 'realName']) {
        if (body[key] !== undefined) {
          if (body[key] !== null && typeof body[key] !== 'string') throw new TeamActionError('Invalid ' + key);
          data[key] = body[key] || null;
        }
      }
      if (body.transferToTeamId != null) {
        if (changesLineup || Object.keys(data).length) throw new TeamActionError('Transfer a player separately from profile or lineup changes.');
        if (player.userId === player.team.captainId) throw new TeamActionError('Transfer captaincy before moving the captain to another team.');
        const target = await tx.team.findUnique({ where: { id: String(body.transferToTeamId) }, include: { players: { where: { deletedAt: null } } } });
        if (!target || target.deletedAt) throw new TeamActionError('Target team not found', 404);
        if (target.id === id) throw new TeamActionError('Player is already on that team');
        if (target.players.length >= 20) throw new TeamActionError('Target team is full (maximum 20 players)');
        const transferred = await tx.player.update({ where: { id: playerId }, data: { teamId: target.id, isSubstitute: chooseJoinPosition(target.players, player.role, player.isSubstitute ? true : undefined) } });
        return { message: 'Player transferred successfully', player: transferred };
      }

      const changes = changesLineup ? planLineupChange(player.team.players, playerId, body) : [];
      if (!changes.length && !Object.keys(data).length) throw new TeamActionError('No fields to update');
      for (const change of changes) {
        const { id: changedId, ...lineup } = change;
        if (changedId === playerId) Object.assign(data, lineup);
        else await tx.player.update({ where: { id: changedId }, data: lineup });
      }
      const updated = await tx.player.update({ where: { id: playerId }, data, include: { user: { select: { id: true, ign: true, photo: true } } } });
      if (body.photo !== undefined && player.userId) await tx.user.update({ where: { id: player.userId }, data: { photo: body.photo || null } });
      return { message: changesLineup ? 'Lineup updated successfully' : 'Player profile updated', player: updated };
    });
    await Promise.all([invalidatePattern('teams:*'), invalidatePattern('leaderboard:*')]);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof TeamActionError) return apiError(error.message, error.status);
    if (error instanceof Error && error.message === 'Unauthorized') return apiError('Unauthorized', 401);
    console.error('Update player error:', error);
    return apiError('Unable to update player. Refresh the roster and try again.', 500);
  }
}

// DELETE - Remove player from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id, playerId } = await params;

    const result = await teamTransaction(async tx => {
    // Get player and team
    const player = await tx.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          include: {
            players: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!player || player.deletedAt || player.teamId !== id || player.team.deletedAt) {
      return apiError("Player not found", 404);
    }

    // Verify captain or admin
    if (player.team.captainId !== user.id && !user.role) {
      // Allow players to leave themselves
      if (player.userId !== user.id) {
        return apiError("Only the team captain can remove players", 403);
      }
    }

    // If the captain is leaving themselves, require manual captaincy transfer first
    const isCaptainLeaving = player.team.captainId === player.userId && player.userId === user.id;
    if (isCaptainLeaving) {
      const othersWithAccount = player.team.players.filter(
        (p) => p.id !== playerId && !p.deletedAt && p.userId
      );
      if (othersWithAccount.length > 0) {
        return apiError(
          "You must transfer captaincy to another player before leaving the team.",
          400
        );
      }
    }

    if (player.userId === player.team.captainId && !isCaptainLeaving) {
      return apiError("Transfer captaincy before removing the captain.");
    }

    // Soft delete player — stats preserved via soft delete
    await tx.player.update({
      where: { id: playerId },
      data: { deletedAt: new Date() },
    });


    // If no captaincy transfer was required but captain left anyway (no eligible players),
    // properly disband the team so its name, tag, teamCode, players, and invites are fully freed
    if (isCaptainLeaving) {
      const disbandedSuffix = Date.now().toString(36);
      const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();

      await tx.team.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          captainId: null,
          status: TeamStatus.INACTIVE,
          name: `${player.team.name.replace(/\[disbanded-.*?\]/, "").trim()} [disbanded-${disbandedSuffix}]`,
          tag: `D${randomSuffix}`,
          teamCode: null,
        },
      });

      // Preserve match history while releasing all roster memberships.
      await tx.player.updateMany({
        where: { teamId: id },
        data: { deletedAt: new Date() },
      });

      // Cancel any pending invites/applications so they don't block re-joining
      await tx.teamInvite.deleteMany({ where: { teamId: id, status: 'PENDING' } });

      // Cancel any active match challenges involving this team
      await tx.matchChallenge.updateMany({
        where: {
          OR: [{ challengerTeamId: id }, { challengedTeamId: id }],
          status: { in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
        },
        data: { status: 'CANCELLED' },
      });

      // Deactivate any active invite links
      await tx.teamInviteLink.updateMany({
        where: { teamId: id, active: true },
        data: { active: false },
      });

      // Invalidate cached team and leaderboard listings

    }



    return apiSuccess({
      message: "Player removed successfully",
    });
    });
    await Promise.all([invalidatePattern("teams:*"), invalidatePattern("leaderboard:*")]);
    return result;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Remove player error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove player";
    return apiError(message, 500);
  }
}



