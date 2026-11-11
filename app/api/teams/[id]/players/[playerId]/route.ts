import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  isValidIGN,
} from "@/lib/api-utils";
import { GameRole, TeamStatus } from "@/app/generated/prisma/enums";
import { invalidatePattern } from "@/lib/redis";
import { ensureTeamRosterBalance } from "@/lib/team-roster";

import { prisma } from "@/lib/prisma";

// PUT - Update player
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id, playerId } = await params;
    const body = await request.json();
    const {
      ign,
      role,
      secondaryRole,
      signatureHero,
      photo,
      realName,
      isSubstitute,
      transferToTeamId,
      replacePlayerId,
      swapRoleWithPlayerId,
      swapRoleIfTaken,
    } = body;

    // Get player and team
    const player = await prisma.player.findUnique({
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

    if (!player || player.deletedAt || player.teamId !== id) {
      return apiError("Player not found", 404);
    }

    // Verify captain or admin for team/lineup operations
    const isCaptainOrAdmin = player.team.captainId === user.id || Boolean(user.role);
    if (!isCaptainOrAdmin) {
      // Allow players to update their own basic profile info only
      if (player.userId !== user.id) {
        return apiError("Only the team captain can manage team members", 403);
      }
      if (isSubstitute !== undefined || replacePlayerId || swapRoleWithPlayerId || transferToTeamId) {
        return apiError("Only the team captain can change lineup, substitutions, or transfers", 403);
      }
    }

    // ── 1. SWAP ROLES BETWEEN TWO PLAYERS ───────────────────────────────────
    if (swapRoleWithPlayerId) {
      if (!isCaptainOrAdmin) {
        return apiError("Only the team captain can swap player roles", 403);
      }

      const partner = player.team.players.find(
        (p) => p.id === swapRoleWithPlayerId && !p.deletedAt
      );

      if (!partner) {
        return apiError("Target player to swap roles with not found", 404);
      }

      if (partner.id === player.id) {
        return apiError("Cannot swap roles with the same player");
      }

      const roleForPlayer = partner.role;
      const roleForPartner = player.role;

      await prisma.$transaction([
        prisma.player.update({
          where: { id: player.id },
          data: { role: roleForPlayer },
        }),
        prisma.player.update({
          where: { id: partner.id },
          data: { role: roleForPartner },
        }),
      ]);

      await invalidatePattern("teams:*");
      await invalidatePattern("leaderboard:*");

      return apiSuccess({
        message: `Swapped roles: ${player.ign} is now ${roleForPlayer}, and ${partner.ign} is now ${roleForPartner}`,
      });
    }

    // ── 2. SUBSTITUTION / REPLACEMENT WORKFLOW ──────────────────────────────
    if (replacePlayerId) {
      if (!isCaptainOrAdmin) {
        return apiError("Only the team captain can perform substitutions", 403);
      }

      const replacedPlayer = player.team.players.find(
        (p) => p.id === replacePlayerId && !p.deletedAt
      );

      if (!replacedPlayer) {
        return apiError("Player to replace not found on team", 404);
      }

      if (replacedPlayer.id === player.id) {
        return apiError("Cannot replace player with themselves");
      }

      // Case A: player is currently substitute, replacedPlayer is starter (Promoting sub, demoting starter)
      if (player.isSubstitute && !replacedPlayer.isSubstitute) {
        const targetRole = (role as GameRole) || replacedPlayer.role;
        if (!Object.values(GameRole).includes(targetRole)) {
          return apiError("Invalid target role. Must be EXP, JUNGLE, MID, GOLD, or ROAM");
        }

        // Check if targetRole is already occupied by ANOTHER starter
        const otherStarters = player.team.players.filter(
          (p) => !p.isSubstitute && p.id !== replacedPlayer.id && p.id !== player.id
        );
        const conflict = otherStarters.find((p) => p.role === targetRole);
        if (conflict) {
          return apiError(
            `Role ${targetRole} is already held by starter ${conflict.ign}. Please pick another role or replace ${conflict.ign}.`
          );
        }

        await prisma.$transaction([
          prisma.player.update({
            where: { id: replacedPlayer.id },
            data: { isSubstitute: true },
          }),
          prisma.player.update({
            where: { id: player.id },
            data: {
              isSubstitute: false,
              role: targetRole,
              ...(photo !== undefined ? { photo: photo || null } : {}),
            },
          }),
        ]);

        await invalidatePattern("teams:*");
        await invalidatePattern("leaderboard:*");
        await ensureTeamRosterBalance(player.teamId);

        return apiSuccess({
          message: `${player.ign} promoted to Starting Five (${targetRole}). ${replacedPlayer.ign} moved to Reserves.`,
        });
      }

      // Case B: player is starter, replacedPlayer is substitute (Subbing out starter, subbing in reserve)
      if (!player.isSubstitute && replacedPlayer.isSubstitute) {
        const targetRole = (role as GameRole) || player.role;
        if (!Object.values(GameRole).includes(targetRole)) {
          return apiError("Invalid target role. Must be EXP, JUNGLE, MID, GOLD, or ROAM");
        }

        const otherStarters = player.team.players.filter(
          (p) => !p.isSubstitute && p.id !== player.id && p.id !== replacedPlayer.id
        );
        const conflict = otherStarters.find((p) => p.role === targetRole);
        if (conflict) {
          return apiError(
            `Role ${targetRole} is already held by starter ${conflict.ign}.`
          );
        }

        await prisma.$transaction([
          prisma.player.update({
            where: { id: player.id },
            data: {
              isSubstitute: true,
              ...(photo !== undefined ? { photo: photo || null } : {}),
            },
          }),
          prisma.player.update({
            where: { id: replacedPlayer.id },
            data: {
              isSubstitute: false,
              role: targetRole,
            },
          }),
        ]);

        await invalidatePattern("teams:*");
        await invalidatePattern("leaderboard:*");
        await ensureTeamRosterBalance(player.teamId);

        return apiSuccess({
          message: `${replacedPlayer.ign} promoted to Starting Five (${targetRole}). ${player.ign} moved to Reserves.`,
        });
      }

      // Case C: Both are starters -> swap their roles
      if (!player.isSubstitute && !replacedPlayer.isSubstitute) {
        const roleA = player.role;
        const roleB = replacedPlayer.role;

        await prisma.$transaction([
          prisma.player.update({
            where: { id: player.id },
            data: { role: roleB },
          }),
          prisma.player.update({
            where: { id: replacedPlayer.id },
            data: { role: roleA },
          }),
        ]);

        await invalidatePattern("teams:*");
        await invalidatePattern("leaderboard:*");

        return apiSuccess({
          message: `Swapped roles: ${player.ign} (${roleB}) and ${replacedPlayer.ign} (${roleA})`,
        });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (ign !== undefined) {
      const trimmed = String(ign).trim();
      if (!trimmed || !isValidIGN(trimmed)) {
        return apiError("Invalid IGN");
      }
      updateData.ign = trimmed;
    }

    if (role !== undefined) {
      const roleUpper = String(role).toUpperCase();
      if (!Object.values(GameRole).includes(roleUpper as GameRole)) {
        return apiError("Invalid role. Valid roles: EXP, JUNGLE, MID, GOLD, ROAM");
      }
      const targetRole = roleUpper as GameRole;

      // Check if role is already taken by another starter
      const willBeStarter = isSubstitute !== undefined ? !Boolean(isSubstitute) : !player.isSubstitute;
      if (willBeStarter && targetRole !== player.role) {
        const roleTaken = player.team.players.find(
          (p) => p.id !== playerId && p.role === targetRole && !p.isSubstitute
        );
        if (roleTaken) {
          if (swapRoleIfTaken) {
            // Atomically swap roles with the starter who currently holds this role
            await prisma.player.update({
              where: { id: roleTaken.id },
              data: { role: player.role },
            });
          } else {
            return apiError(
              `Role ${targetRole} is already filled by ${roleTaken.ign}. Swap roles or select another role.`
            );
          }
        }
      }
      updateData.role = targetRole;
    }

    if (secondaryRole !== undefined) {
      if (secondaryRole && !Object.values(GameRole).includes(secondaryRole as GameRole)) {
        return apiError("Invalid secondary role");
      }
      updateData.secondaryRole = secondaryRole
        ? (secondaryRole as GameRole)
        : null;
    }

    if (signatureHero !== undefined) updateData.signatureHero = signatureHero || null;
    if (photo !== undefined) {
      updateData.photo = photo || null;
      if (player.userId) {
        await prisma.user.update({
          where: { id: player.userId },
          data: { photo: photo || null },
        }).catch((err) => console.error("Sync user photo error:", err));
      }
    }
    if (realName !== undefined) updateData.realName = realName || null;

    // Handle isSubstitute toggle with validation
    if (isSubstitute !== undefined) {
      const wantsToBeStarter = !Boolean(isSubstitute);
      const currentlySubstitute = player.isSubstitute;

      // Promoting from sub to starter without specify replacement
      if (wantsToBeStarter && currentlySubstitute) {
        const currentStarters = player.team.players.filter(
          (p) => p.id !== playerId && !p.isSubstitute
        );

        // Check starter limit
        if (currentStarters.length >= 5) {
          return apiError(
            "Starting lineup is full (5/5). Please select which starter to replace."
          );
        }

        // Check role conflict
        const targetRole = (updateData.role as GameRole) ?? player.role;
        const roleConflict = currentStarters.find((p) => p.role === targetRole);
        if (roleConflict) {
          return apiError(
            `Cannot promote to starter: ${targetRole} role is already taken by ${roleConflict.ign}. Please pick an open role or select who to replace.`
          );
        }
      }

      // Demoting from starter to sub without specify replacement
      if (!wantsToBeStarter && !currentlySubstitute) {
        const currentStartersCount = player.team.players.filter(
          (p) => !p.isSubstitute
        ).length;
        const subsCount = player.team.players.filter((p) => p.isSubstitute).length;

        if (currentStartersCount <= 5 && subsCount > 0) {
          return apiError(
            "A team must maintain 5 starting players in its lineup. Please select a substitute to replace this starter."
          );
        }
      }

      updateData.isSubstitute = Boolean(isSubstitute);
    }

    // Handle transferring player to another team (preserve stats)
    if (typeof transferToTeamId !== 'undefined' && transferToTeamId !== null) {
      // Only team captain or admin can transfer a player
      if (player.team.captainId !== user.id && !user.role) {
        return apiError("Only the team captain can transfer players", 403);
      }

      // Validate target team
      const targetTeam = await prisma.team.findUnique({
        where: { id: String(transferToTeamId) },
        include: { players: { where: { deletedAt: null } } },
      });

      if (!targetTeam || targetTeam.deletedAt) {
        return apiError("Target team not found", 404);
      }

      // Check target team size (max 20)
      if (targetTeam.players.length >= 20) {
        return apiError("Target team is full (maximum 20 players)");
      }

      // Prevent transferring into same team
      if (player.teamId === targetTeam.id) {
        return apiError("Player is already on that team");
      }

      // Ensure IGN uniqueness in target team
      const ignExists = targetTeam.players.find((p) => p.ign === player.ign && !p.deletedAt);
      if (ignExists) {
        return apiError("A player with the same IGN already exists on the target team");
      }

      // Perform transfer: update teamId while preserving stats
      const transferred = await prisma.player.update({
        where: { id: playerId },
        data: {
          teamId: targetTeam.id,
          isSubstitute: targetTeam.players.filter((p) => !p.isSubstitute).length >= 5 ? true : player.isSubstitute,
        },
        include: {
          user: { select: { id: true, ign: true, photo: true } },
          team: { select: { id: true, name: true, tag: true } },
        },
      });

      // Notify both captains
      try {
        await prisma.notification.create({
          data: {
            userId: player.team.captainId!,
            type: "PLAYER_REMOVED",
            title: "Player Transferred",
            message: `${player.ign} was transferred to ${targetTeam.name}`,
            linkUrl: `/teams/${player.teamId}`,
          },
        });
      } catch (e) {
        // ignore notification errors
      }

      try {
        if (targetTeam.captainId) {
          await prisma.notification.create({
            data: {
              userId: targetTeam.captainId!,
              type: "PLAYER_JOINED",
              title: "Player Transferred In",
              message: `${player.ign} was transferred into your team`,
              linkUrl: `/teams/${targetTeam.id}`,
            },
          });
        }
      } catch (e) {
        // ignore
      }

      await invalidatePattern("teams:*");

      await ensureTeamRosterBalance(player.teamId);
      await ensureTeamRosterBalance(targetTeam.id);

      return apiSuccess({ message: "Player transferred successfully", player: transferred });
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update");
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    await invalidatePattern("teams:*");

    return apiSuccess({
      message: "Player updated successfully",
      player: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Update player error:", error);
    const message = error instanceof Error ? error.message : "Failed to update player";
    return apiError(message, 500);
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

    // Get player and team
    const player = await prisma.player.findUnique({
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

    if (!player || player.deletedAt || player.teamId !== id) {
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

    // Soft delete player — stats preserved via soft delete
    await prisma.player.update({
      where: { id: playerId },
      data: { deletedAt: new Date() },
    });

    if (!isCaptainLeaving) {
      await ensureTeamRosterBalance(id);
    }

    // If no captaincy transfer was required but captain left anyway (no eligible players),
    // properly disband the team so its name, tag, teamCode, players, and invites are fully freed
    if (isCaptainLeaving) {
      const disbandedSuffix = Date.now().toString(36);
      const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();

      await prisma.team.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: TeamStatus.INACTIVE,
          name: `${player.team.name.replace(/\[disbanded-.*?\]/, "").trim()} [disbanded-${disbandedSuffix}]`,
          tag: `D${randomSuffix}`,
          teamCode: null,
        },
      });

      // Hard-delete all player records for this team so members are fully freed
      await prisma.player.deleteMany({
        where: { teamId: id },
      });

      // Cancel any pending invites/applications so they don't block re-joining
      await prisma.teamInvite.updateMany({
        where: { teamId: id, status: 'PENDING' },
        data: { status: 'DECLINED' },
      });

      // Cancel any active match challenges involving this team
      await prisma.matchChallenge.updateMany({
        where: {
          OR: [{ challengerTeamId: id }, { challengedTeamId: id }],
          status: { in: ['PENDING', 'ACCEPTED', 'SCHEDULED'] },
        },
        data: { status: 'CANCELLED' },
      });

      // Deactivate any active invite links
      await prisma.teamInviteLink.updateMany({
        where: { teamId: id, active: true },
        data: { active: false },
      });

      // Invalidate cached team and leaderboard listings
      await invalidatePattern("teams:*");
      await invalidatePattern("leaderboard:*");
    }

    await invalidatePattern("teams:*");

    return apiSuccess({
      message: "Player removed successfully",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Remove player error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove player";
    return apiError(message, 500);
  }
}



