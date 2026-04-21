import { NextRequest } from "next/server";
import { hashPassword, findUserByEmailOrIgn } from "@/lib/auth";
import { apiError, apiSuccess, isValidEmail, isValidIGN, isValidTeamCode, notifyTeamMemberJoined } from "@/lib/api-utils";
import { MainRole, GameRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

const ROLE_TO_GAME_ROLE: Record<MainRole, GameRole> = {
  EXP: GameRole.EXP,
  JUNGLE: GameRole.JUNGLE,
  MID: GameRole.MID,
  GOLD: GameRole.GOLD,
  ROAM: GameRole.ROAM,
};

const FRONTEND_ROLE_TO_MAIN_ROLE: Record<string, MainRole> = {
  EXP: MainRole.EXP,
  ROAM: MainRole.ROAM,
  GOLD: MainRole.GOLD,
  MID: MainRole.MID,
  JUNGLE: MainRole.JUNGLE,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, ign, mainRole, teamCode } = body;
    const normalizedTeamCode = typeof teamCode === "string" && teamCode.trim().length > 0
      ? teamCode.trim().toUpperCase()
      : null;

    // Validation
    if (!email || !password || !ign || !mainRole) {
      return apiError("Email, password, IGN, and main role are required");
    }

    if (!isValidEmail(email)) {
      return apiError("Invalid email format");
    }

    if (!isValidIGN(ign)) {
      return apiError("IGN must be 2-20 characters");
    }

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters");
    }

    const normalizedMainRoleInput = typeof mainRole === "string" ? mainRole.trim().toUpperCase() : "";
    const normalizedMainRole = FRONTEND_ROLE_TO_MAIN_ROLE[normalizedMainRoleInput];

    if (!normalizedMainRole) {
      return apiError("Invalid main role");
    }

    if (normalizedTeamCode && !isValidTeamCode(normalizedTeamCode)) {
      return apiError("Team code must be 6 uppercase letters or numbers");
    }

    let teamToJoin: { id: string; name: string; isRecruiting: boolean } | null = null;
    if (normalizedTeamCode) {
      teamToJoin = await prisma.team.findUnique({
        where: { teamCode: normalizedTeamCode },
        select: { id: true, name: true, isRecruiting: true },
      });

      if (!teamToJoin) {
        return apiError("Invalid team code");
      }

      if (!teamToJoin.isRecruiting) {
        return apiError("This team is currently not accepting new members");
      }

      const activePlayerCount = await prisma.player.count({
        where: { teamId: teamToJoin.id, deletedAt: null },
      });

      if (activePlayerCount >= 9) {
        return apiError("This team is already full (maximum 9 players)");
      }
    }

    // Check if email or IGN already exists
    const existingUser = await findUserByEmailOrIgn(email);
    if (existingUser) {
      return apiError("Email already registered");
    }

    const existingIGN = await findUserByEmailOrIgn(ign);
    if (existingIGN) {
      return apiError("IGN already taken");
    }

    // Check if IGN is already on a team's roster (as a placeholder or linked player)
    // If no team code provided, block registration - they need the team code to claim this IGN
    if (!normalizedTeamCode) {
      const rosterEntry = await prisma.player.findFirst({
        where: {
          ign: { equals: ign, mode: "insensitive" },
          deletedAt: null,
        },
        select: { id: true, team: { select: { name: true } } },
      });

      if (rosterEntry) {
        return apiError(
          `This IGN is already on a team roster (${rosterEntry.team.name}). Use your team code to register.`
        );
      }
    } else if (teamToJoin) {
      // Team code provided - check if IGN is on a DIFFERENT team's roster
      const rosterEntry = await prisma.player.findFirst({
        where: {
          ign: { equals: ign, mode: "insensitive" },
          deletedAt: null,
          teamId: { not: teamToJoin.id },
        },
        select: { id: true, team: { select: { name: true } } },
      });

      if (rosterEntry) {
        return apiError(
          `This IGN is already registered to another team (${rosterEntry.team.name})`
        );
      }
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          password: hashedPassword,
          ign,
          mainRole: normalizedMainRole,
          emailVerified: false,
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          ign: true,
          mainRole: true,
          photo: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      if (teamToJoin) {
        // Find if this IGN exists as a placeholder ANYWHERE (global search)
        // This ensures match history is preserved even if the placeholder was on a different team.
        const placeholder = await transaction.player.findFirst({
          where: { 
            ign: { equals: createdUser.ign, mode: "insensitive" }, 
            userId: null, 
            deletedAt: null 
          },
        });

        if (placeholder) {
          // Claim the placeholder and move it to the new team
          await transaction.player.update({
            where: { id: placeholder.id },
            data: { 
              userId: createdUser.id,
              teamId: teamToJoin.id, // Transfer to the new team
              ign: createdUser.ign, // Sync casing with user's preferred IGN
            },
          });
        } else {
          // No matching placeholder — create a fresh player record
          await transaction.player.create({
            data: {
              userId: createdUser.id,
              teamId: teamToJoin.id,
              ign: createdUser.ign,
              role: ROLE_TO_GAME_ROLE[normalizedMainRole],
              isSubstitute: false,
            },
          });
        }
      }

      return createdUser;
    });

    // Fire-and-forget: notify captain + existing members when joining a team
    if (teamToJoin) {
      void notifyTeamMemberJoined({
        teamId: teamToJoin.id,
        joinerIgn: user.ign,
        joinerUserId: user.id,
        role: ROLE_TO_GAME_ROLE[normalizedMainRole],
      });
    }

    return apiSuccess(
      {
        message: "Account created successfully",
        user,
        joinedTeam: teamToJoin
          ? { id: teamToJoin.id, name: teamToJoin.name, code: normalizedTeamCode }
          : null,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create account";
    console.error("Registration error:", error);
    return apiError(message, 500);
  }
}



