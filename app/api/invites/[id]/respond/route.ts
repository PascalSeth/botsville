import { NextRequest } from 'next/server';
import { requireActiveUser, apiError, apiSuccess } from '@/lib/api-utils';
import { invalidatePattern } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { teamTransaction } from '@/lib/team-transaction';
import { isTeamApplication, invitedRole } from '@/lib/team-invites';
import { chooseJoinPosition, parseTeamRole, TeamActionError } from '@/lib/team-lineup';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const { action, role, secondaryRole, isSubstitute } = await request.json();
    if (!['accept', 'decline'].includes(action)) return apiError("Action must be 'accept' or 'decline'");
    const result = await teamTransaction(async tx => {
      const invite = await tx.teamInvite.findUnique({ where: { id }, include: {
        team: { include: { players: { where: { deletedAt: null } } } },
        fromUser: { select: { id: true, ign: true } },
      } });
      if (!invite || invite.team.deletedAt) throw new TeamActionError('Invite or team no longer exists', 404);
      const application = isTeamApplication(invite);
      const recipient = invite.toUserId ? invite.toUserId === user.id : invite.toIGN.toLowerCase() === user.ign.toLowerCase();
      if (application ? invite.team.captainId !== user.id : !recipient) throw new TeamActionError(application ? 'Only the current captain can review this application' : 'Only the invited player can respond to this invite', 403);
      if (invite.status !== 'PENDING') throw new TeamActionError('This request has already been handled', 409);
      if (invite.expiresAt <= new Date()) throw new TeamActionError('This request has expired');
      const nextStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
      // The legacy unique key includes status. Remove only superseded history for this pair.
      await tx.teamInvite.deleteMany({ where: { teamId: invite.teamId, toIGN: invite.toIGN, status: nextStatus, id: { not: id } } });
      if (action === 'decline') {
        await tx.teamInvite.update({ where: { id }, data: { status: 'DECLINED', respondedAt: new Date() } });
        return { message: application ? 'Application declined' : 'Invite declined', notifyUserId: invite.fromUserId, teamId: invite.teamId };
      }
      const targetId = application ? invite.fromUserId : user.id;
      const target = await tx.user.findUnique({ where: { id: targetId } });
      if (!target) throw new TeamActionError('Player account not found', 404);
      const captainOf = await tx.team.findFirst({ where: { captainId: targetId, deletedAt: null } });
      if (captainOf) throw new TeamActionError('This player already captains a team');
      const existing = await tx.player.findUnique({ where: { userId: targetId }, include: { team: { select: { deletedAt: true } } } });
      if (existing && !existing.deletedAt && !existing.team.deletedAt) throw new TeamActionError('This player is already on a team');
      const placeholder = !existing ? await tx.player.findFirst({ where: { ign: { equals: target.ign, mode: 'insensitive' }, userId: null } }) : null;
      if (placeholder && !placeholder.deletedAt && placeholder.teamId !== invite.teamId) throw new TeamActionError('This player is already on another roster');
      const roster = invite.team.players.filter(p => p.id !== placeholder?.id);
      if (roster.length >= 20) throw new TeamActionError('Team is full (maximum 20 players)');
      const acceptRole = parseTeamRole(role ?? invitedRole(invite.message) ?? target.mainRole ?? 'EXP');
      // Only the captain can explicitly place an applicant in the starting lineup.
      const sub = chooseJoinPosition(roster, acceptRole, application ? isSubstitute : undefined);
      const data = { teamId: invite.teamId, userId: target.id, ign: target.ign, role: acceptRole,
        secondaryRole: secondaryRole ? parseTeamRole(secondaryRole) : null, isSubstitute: sub, deletedAt: null };
      const record = existing || placeholder;
      const player = record ? await tx.player.update({ where: { id: record.id }, data }) : await tx.player.create({ data });
      await tx.teamInvite.update({ where: { id }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
      const otherRequests = await tx.teamInvite.findMany({ where: { id: { not: id }, status: 'PENDING', OR: [{ toUserId: target.id }, { fromUserId: target.id }, { toIGN: target.ign }] }, include: { fromUser: { select: { ign: true } }, team: { select: { captainId: true } } } });
      for (const other of otherRequests) {
        const belongsToPlayer = isTeamApplication(other) ? other.fromUserId === target.id : (other.toUserId ? other.toUserId === target.id : other.toIGN.toLowerCase() === target.ign.toLowerCase());
        if (!belongsToPlayer) continue;
        await tx.teamInvite.deleteMany({ where: { teamId: other.teamId, toIGN: other.toIGN, status: 'CANCELLED' } });
        await tx.teamInvite.update({ where: { id: other.id }, data: { status: 'CANCELLED', respondedAt: new Date() } });
      }
      return { message: (application ? 'Application accepted' : 'Invite accepted') + (sub ? ' · joined as a substitute' : ' · joined as starting ' + acceptRole), player, isSubstitute: sub, notifyUserId: application ? target.id : invite.team.captainId, teamId: invite.teamId };
    });
    if (result.notifyUserId) {
      await prisma.notification.create({ data: { userId: result.notifyUserId, type: action === 'accept' ? 'TEAM_INVITE_ACCEPTED' : 'TEAM_INVITE_DECLINED', title: action === 'accept' ? 'Roster request accepted' : 'Roster request declined', message: result.message, linkUrl: '/my-team' } }).catch(error => console.error('Invite notification failed:', error));
    }
    await Promise.all([invalidatePattern('teams:*'), invalidatePattern('leaderboard:*')]);
    return apiSuccess({ message: result.message, ...('player' in result ? { player: result.player, isSubstitute: result.isSubstitute } : {}) }, action === 'accept' ? 201 : 200);
  } catch (error) {
    if (error instanceof TeamActionError) return apiError(error.message, error.status);
    if (error instanceof Error && error.message === 'Unauthorized') return apiError('Unauthorized', 401);
    console.error('Respond to invite error:', error);
    return apiError('Unable to respond. Refresh and try again.', 500);
  }
}
