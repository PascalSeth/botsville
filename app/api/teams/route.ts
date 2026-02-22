import { NextRequest } from "next/server";
import {
  requireActiveUser,
  apiError,
  apiSuccess,
  isValidTeamTag,
  isValidHexColor,
  isValidRegion,
} from "@/lib/api-utils";
import { TeamStatus } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

// GET - List all teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const region = searchParams.get("region");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: { deletedAt: null; status?: TeamStatus; region?: string } = { deletedAt: null };
    if (status && Object.values(TeamStatus).includes(status as TeamStatus)) {
      where.status = status as TeamStatus;
    }
    if (region) {
      where.region = region;
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          captain: {
            select: {
              id: true,
              ign: true,
              photo: true,
            },
          },
          players: {
            where: { deletedAt: null },
            select: {
              id: true,
              ign: true,
              role: true,
              secondaryRole: true,
              signatureHero: true,
              photo: true,
              isSubstitute: true,
              realName: true,
              user: {
                select: {
                  id: true,
                  ign: true,
                  photo: true,
                },
              },
            },
          },
          standings: {
            select: {
              rank: true,
              points: true,
              wins: true,
              losses: true,
              tier: true,
              season: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
            orderBy: { season: { startDate: "desc" } },
            take: 1,
          },
          _count: {
            select: {
              players: true,
            },
          },
        },
        orderBy: { registeredAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.team.count({ where }),
    ]);

    // Transform teams to include computed stats
    const teamsWithStats = teams.map(team => {
      const standing = team.standings[0];
      return {
        ...team,
        rank: standing?.rank ?? 0,
        points: standing?.points ?? 0,
        wins: standing?.wins ?? 0,
        losses: standing?.losses ?? 0,
        tier: standing?.tier ?? 'C',
        standings: undefined, // Remove raw standings from response
      };
    });

    return apiSuccess({
      teams: teamsWithStats,
      pagination: {
        total,
        limit,
        skip,
      },
    });
  } catch (error: unknown) {
    console.error("Get teams error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to fetch teams", 500);
  }
}

// POST - Create new team
export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { name, tag, region, color, logo, banner } = body;

    // Validation
    if (!name || !tag || !region) {
      return apiError("Name, tag, and region are required");
    }

    if (name.length < 3 || name.length > 50) {
      return apiError("Team name must be 3-50 characters");
    }

    if (!isValidTeamTag(tag)) {
      return apiError("Team tag must be 3-5 uppercase alphanumeric characters");
    }

    if (!isValidRegion(region)) {
      return apiError("Invalid region");
    }

    if (color && !isValidHexColor(color)) {
      return apiError("Invalid color format (must be hex, e.g., #FF0000)");
    }

    // Check if user already has a team
    const existingTeam = await prisma.team.findFirst({
      where: {
        captainId: user.id,
        deletedAt: null,
      },
    });

    if (existingTeam) {
      return apiError("You already have a team");
    }

    // Check if user is already a player on another team
    const existingPlayer = await prisma.player.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (existingPlayer) {
      return apiError(`You are already a player on ${existingPlayer.team.name}`);
    }

    // Check if team name or tag already exists
    const nameExists = await prisma.team.findUnique({
      where: { name },
    });

    if (nameExists) {
      return apiError("Team name already taken");
    }

    const tagUpper = tag.toUpperCase();
    const tagExists = await prisma.team.findUnique({
      where: { tag: tagUpper },
    });

    if (tagExists) {
      return apiError("Team tag already taken");
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        tag: tagUpper,
        region,
        color: color || null,
        logo: logo || null,
        banner: banner || null,
        captainId: user.id,
        status: TeamStatus.ACTIVE,
      },
      include: {
        captain: {
          select: {
            id: true,
            ign: true,
            photo: true,
          },
        },
      },
    });

    return apiSuccess(
      {
        message: "Team created successfully",
        team,
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Create team error:", error);
    return apiError(error instanceof Error ? error.message : "Failed to create team", 500);
  }
}



