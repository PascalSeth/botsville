import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tournaments/[id]/groups
 * Create tournament groups for group stage
 * Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const adminRole = await prisma.adminRole.findUnique({
      where: { userId: session.user.id },
    });
    if (!adminRole || (adminRole.role !== 'TOURNAMENT_ADMIN' && adminRole.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id: tournamentId } = await params;
    const body = await req.json();
    const { name, description, teams } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Create or get group
    let group = await prisma.tournamentGroup.findFirst({
      where: {
        tournamentId,
        name,
      },
    });

    if (!group) {
      group = await prisma.tournamentGroup.create({
        data: {
          tournamentId,
          name,
          description,
        },
      });
    }

    // Add teams to group if provided
    if (teams && Array.isArray(teams)) {
      for (const teamId of teams) {
        await prisma.tournamentGroupTeam.upsert({
          where: {
            groupId_teamId: {
              groupId: group.id,
              teamId,
            },
          },
          create: {
            groupId: group.id,
            teamId,
          },
          update: {},
        });
      }
    }

    // Return group with teams
    const fullGroup = await prisma.tournamentGroup.findUnique({
      where: { id: group.id },
      include: {
        teams: {
          include: {
            team: { select: { id: true, name: true, tag: true, logo: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        group: fullGroup,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[TOURNAMENT GROUPS POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tournaments/[id]/groups
 * Get all groups for a tournament
 * Public endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId },
      include: {
        teams: {
          include: {
            team: { select: { id: true, name: true, tag: true, logo: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      teams: g.teams.map(gt => ({
        ...gt.team,
        groupTeamId: gt.id,
      })),
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error('[TOURNAMENT GROUPS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
