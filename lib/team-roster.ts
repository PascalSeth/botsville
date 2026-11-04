import { prisma } from "@/lib/prisma";
import { GameRole } from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";

const CORE_ROLES: GameRole[] = [
  GameRole.EXP,
  GameRole.JUNGLE,
  GameRole.MID,
  GameRole.GOLD,
  GameRole.ROAM,
];

/**
 * Ensures a team's roster is perfectly balanced:
 * 1. A team has at most 5 starters.
 * 2. If a team has fewer than 5 starters and has substitutes, substitutes are auto-promoted
 *    until the team has exactly 5 starters (or runs out of substitutes).
 * 3. Starters are allocated distinct roles from [EXP, JUNGLE, MID, GOLD, ROAM] whenever possible.
 */
export async function ensureTeamRosterBalance(teamId: string): Promise<boolean> {
  if (!teamId) return false;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      captainId: true,
      deletedAt: true,
      players: {
        where: { deletedAt: null },
        orderBy: [
          { isSubstitute: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!team || team.deletedAt || team.players.length === 0) {
    return false;
  }

  let starters = team.players.filter((p) => !p.isSubstitute);
  let subs = team.players.filter((p) => p.isSubstitute);
  let modified = false;

  // ── Case 1: More than 5 starters ──
  // Demote excess starters beyond 5. Prioritize captain and earliest created starters.
  if (starters.length > 5) {
    // Sort starters: Captain first, then earliest created
    const sortedStarters = [...starters].sort((a, b) => {
      const aIsCap = a.userId === team.captainId || a.id === team.captainId;
      const bIsCap = b.userId === team.captainId || b.id === team.captainId;
      if (aIsCap && !bIsCap) return -1;
      if (!aIsCap && bIsCap) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const keepStarters = sortedStarters.slice(0, 5);
    const demoteToSubs = sortedStarters.slice(5);

    for (const playerToDemote of demoteToSubs) {
      await prisma.player.update({
        where: { id: playerToDemote.id },
        data: { isSubstitute: true },
      });
      modified = true;
    }

    starters = keepStarters;
    subs = [...demoteToSubs.map((p) => ({ ...p, isSubstitute: true })), ...subs];
  }

  // ── Case 2: Fewer than 5 starters and substitutes exist ──
  // Auto-promote substitutes to reach exactly 5 starters.
  if (starters.length < 5 && subs.length > 0) {
    const slotsNeeded = Math.min(5 - starters.length, subs.length);

    // Identify which core roles are currently filled by starters
    const filledRoles = new Set<GameRole>(starters.map((p) => p.role));
    let missingRoles = CORE_ROLES.filter((r) => !filledRoles.has(r));

    // Score/sort subs so that those who naturally play a missing role are promoted first
    const sortedSubs = [...subs].sort((a, b) => {
      const aMatches = missingRoles.includes(a.role) ? 2 : (a.secondaryRole && missingRoles.includes(a.secondaryRole) ? 1 : 0);
      const bMatches = missingRoles.includes(b.role) ? 2 : (b.secondaryRole && missingRoles.includes(b.secondaryRole) ? 1 : 0);
      if (bMatches !== aMatches) return bMatches - aMatches;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const subsToPromote = sortedSubs.slice(0, slotsNeeded);

    for (const sub of subsToPromote) {
      let targetRole = sub.role;

      if (missingRoles.includes(sub.role)) {
        // Player already has an unfilled role
        targetRole = sub.role;
        missingRoles = missingRoles.filter((r) => r !== sub.role);
      } else if (sub.secondaryRole && missingRoles.includes(sub.secondaryRole)) {
        // Use player's secondary role which fills a missing role
        targetRole = sub.secondaryRole;
        missingRoles = missingRoles.filter((r) => r !== targetRole);
      } else if (missingRoles.length > 0) {
        // Assign the next available missing role
        targetRole = missingRoles[0];
        missingRoles = missingRoles.slice(1);
      }

      await prisma.player.update({
        where: { id: sub.id },
        data: {
          isSubstitute: false,
          role: targetRole,
        },
      });
      modified = true;
      starters.push({ ...sub, isSubstitute: false, role: targetRole });
    }
  }

  if (modified) {
    try {
      await invalidatePattern("teams:*");
      await invalidatePattern("leaderboard:*");
    } catch {
      // ignore cache invalidation errors
    }
  }

  return modified;
}

