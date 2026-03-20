import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mvps/match
 * Record match MVP award - Call after match score is finalized
 * Admin/Referee only
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
    if (!adminRole || (adminRole.role !== 'TOURNAMENT_ADMIN' && adminRole.role !== 'REFEREE' && adminRole.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { matchId, playerId, mvpData } = body;

    if (!matchId || !playerId) {
      return NextResponse.json({ error: 'matchId and playerId required' }, { status: 400 });
    }

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { performances: { where: { playerId } } },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.performances.length === 0) {
      return NextResponse.json({ error: 'Player did not participate in this match' }, { status: 400 });
    }

    // Create or update MatchMvp record
    const matchMvp = await prisma.matchMvp.upsert({
      where: { matchId_playerId: { matchId, playerId } },
      create: {
        matchId,
        playerId,
        awards: JSON.stringify(mvpData || { mvp: true }),
      },
      update: {
        awards: JSON.stringify(mvpData || { mvp: true }),
      },
      include: {
        player: { select: { id: true, ign: true } },
        match: { select: { id: true, tournamentId: true } },
      },
    });

    // Update or create Tournament MVP aggregate
    const tournament = await prisma.tournament.findUnique({
      where: { id: match.tournamentId },
    });

    if (tournament) {
      const performance = match.performances[0];
      await prisma.tournamentMvp.upsert({
        where: { tournamentId_playerId: { tournamentId: match.tournamentId, playerId } },
        create: {
          tournamentId: match.tournamentId,
          playerId,
          mvpCount: 1,
          totalKills: performance?.kills || 0,
          totalAssists: performance?.assists || 0,
          totalDeaths: performance?.deaths || 0,
          winRate: performance?.won ? 1.0 : 0.0,
        },
        update: {
          mvpCount: { increment: 1 },
          totalKills: { increment: performance?.kills || 0 },
          totalAssists: { increment: performance?.assists || 0 },
          totalDeaths: { increment: performance?.deaths || 0 },
        },
      });
    }

    return NextResponse.json({ success: true, matchMvp }, { status: 200 });
  } catch (err) {
    console.error('[MVP POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
