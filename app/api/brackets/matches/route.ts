import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/brackets/matches
 * Create or update bracket match with progression fields
 * Admin only
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { matchId, bracketType, nextMatchId, loserNextId, bracketPosition, round } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify nextMatch and loserNextMatch exist if provided
    if (nextMatchId) {
      const nextMatch = await prisma.match.findUnique({
        where: { id: nextMatchId },
      });
      if (!nextMatch) {
        return NextResponse.json({ error: 'Next match not found' }, { status: 404 });
      }
    }

    if (loserNextId) {
      const loserNext = await prisma.match.findUnique({
        where: { id: loserNextId },
      });
      if (!loserNext) {
        return NextResponse.json({ error: 'Loser next match not found' }, { status: 404 });
      }
    }

    // Update match with bracket fields
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        bracketType: bracketType || match.bracketType,
        nextMatchId: nextMatchId || match.nextMatchId,
        loserNextId: loserNextId || match.loserNextId,
        bracketPosition: bracketPosition ?? match.bracketPosition,
        round: round ?? match.round,
      },
      include: {
        teamA: { select: { id: true, name: true, tag: true, logo: true } },
        teamB: { select: { id: true, name: true, tag: true, logo: true } },
        tournament: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Bracket match updated',
        match: updatedMatch,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[BRACKET MATCHES POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/brackets/matches?tournamentId=xxx
 * Get all bracket matches for a tournament
 * Public endpoint
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get('tournamentId');
    const bracketTypeParam = searchParams.get('bracketType');

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId required' }, { status: 400 });
    }

    // Build where clause dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tournamentId,
      bracketType: bracketTypeParam || { not: null },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches = await (prisma.match.findMany as any)({
      where,
      orderBy: [
        { bracketType: 'asc' },
        { round: 'asc' },
        { bracketPosition: 'asc' },
      ],
      include: {
        teamA: true,
        teamB: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = matches.map((m: any) => ({
      id: m.id,
      tournamentId: m.tournamentId,
      teamA: m.teamA ? {
        id: m.teamA.id,
        name: m.teamA.name,
        tag: m.teamA.tag,
        logo: m.teamA.logo,
      } : null,
      teamB: m.teamB ? {
        id: m.teamB.id,
        name: m.teamB.name,
        tag: m.teamB.tag,
        logo: m.teamB.logo,
      } : null,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      winnerId: m.winnerId,
      status: m.status,
      scheduledTime: m.scheduledTime?.toISOString() || new Date().toISOString(),
      bracketType: m.bracketType,
      bracketPosition: m.bracketPosition,
      round: m.round,
      nextMatchId: m.nextMatchId,
      loserNextId: m.loserNextId,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error('[BRACKET MATCHES GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
