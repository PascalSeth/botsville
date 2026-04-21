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

    // Check if email or IGN already exists as an actual User
    const existingUser = await findUserByEmailOrIgn(email);
    if (existingUser) {
      return apiError("Email already registered");
    }

    const existingIGNUser = await findUserByEmailOrIgn(ign);
    if (existingIGNUser) {
      return apiError("IGN already taken");
    }

    // Check Player roster for identity overlaps
    const rosterEntry = await prisma.player.findFirst({
      where: {
        ign: { equals: ign, mode: "insensitive" },
        deletedAt: null,
      },
      select: { 
        id: true, 
        userId: true,
        teamId: true,
        team: { select: { name: true } } 
      },
    });

    if (rosterEntry) {
      // Scenario 1: Actual linked player (userId exists)
      if (rosterEntry.userId) {
        return apiError("IGN already taken");
      }

      // Scenario 2: Placeholder (userId is null)
      // Check if we are currently trying to join the SAME team as the placeholder
      const joiningSameTeam = teamToJoin && rosterEntry.teamId === teamToJoin.id;

      if (!joiningSameTeam) {
        return apiError(
          `This IGN is already assigned to ${rosterEntry.team?.name || "a team"}. Please ask your Captain for the Team Code to register and claim this record.`
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

        // AUTO-CAPTAINCY: If the team has no captain, make this user the captain
        const team = await transaction.team.findUnique({
          where: { id: teamToJoin.id },
          select: { captainId: true }
        });
        if (!team?.captainId) {
          await transaction.team.update({
            where: { id: teamToJoin.id },
            data: { captainId: createdUser.id }
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



