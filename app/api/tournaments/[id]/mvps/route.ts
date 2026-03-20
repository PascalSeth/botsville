import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tournaments/[id]/mvps
 * Get tournament MVP rankings
 * Public endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const mvps = await prisma.tournamentMvp.findMany({
      where: { tournamentId },
      orderBy: { ranking: 'asc' },
      include: {
        player: {
          select: {
            id: true,
            ign: true,
            photo: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    const formatted = mvps.map(mvp => ({
      playerId: mvp.player.id,
      playerIgn: mvp.player.ign,
      playerPhoto: mvp.player.photo,
      playerRole: mvp.player.role,
      teamId: mvp.player.team.id,
      teamName: mvp.player.team.name,
      teamTag: mvp.player.team.tag,
      teamLogo: mvp.player.team.logo,
      mvpCount: mvp.mvpCount,
      totalKills: mvp.totalKills,
      totalAssists: mvp.totalAssists,
      totalDeaths: mvp.totalDeaths,
      winRate: mvp.winRate,
      ranking: mvp.ranking,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error('[TOURNAMENT MVPS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
