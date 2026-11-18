import { teamTransaction } from '@/lib/team-transaction';
import { invalidatePattern } from '@/lib/redis';

/** Repair excess/duplicate starters without promoting substitutes or changing their roles. */
export async function ensureTeamRosterBalance(teamId: string): Promise<boolean> {
  const modified = await teamTransaction(async tx => {
    const team = await tx.team.findUnique({ where: { id: teamId }, include: { players: { where: { deletedAt: null, isSubstitute: false }, orderBy: { createdAt: 'asc' } } } });
    if (!team || team.deletedAt) return false;
    const starters = [...team.players].sort((a, b) => Number(b.userId === team.captainId) - Number(a.userId === team.captainId));
    const roles = new Set<string>();
    const excess: string[] = [];
    for (const player of starters) {
      if (roles.has(player.role) || roles.size >= 5) excess.push(player.id);
      else roles.add(player.role);
    }
    if (!excess.length) return false;
    await tx.player.updateMany({ where: { id: { in: excess } }, data: { isSubstitute: true } });
    return true;
  });
  if (modified) await Promise.all([invalidatePattern('teams:*'), invalidatePattern('leaderboard:*')]);
  return modified;
}
