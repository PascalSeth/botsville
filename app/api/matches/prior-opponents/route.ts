import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : null;

    // fetch recent scheduled matches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchWhere: any = {};
    if (since) matchWhere.OR = [{ scheduledTime: { gte: since } }, { updatedAt: { gte: since } }];
    const matches = await prisma.match.findMany({
      where: matchWhere,
      select: { teamAId: true, teamBId: true, scheduledTime: true, updatedAt: true },
    });

    // fetch recent challenges (includes pending/accepted which indicate prior contact)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chalWhere: any = {};
    if (since) chalWhere.OR = [{ createdAt: { gte: since } }, { scheduledAt: { gte: since } }];
    const challenges = await prisma.matchChallenge.findMany({
      where: chalWhere,
      select: { challengerTeamId: true, challengedTeamId: true, createdAt: true, scheduledAt: true, updatedAt: true },
    });

    // Normalize pairs and keep the latest seen timestamp per pair
    const pairMap = new Map<string, { teamAId: string; teamBId: string; lastMetAt: string }>();

    const addPair = (a: string, b: string | null, time?: string | Date | null) => {
      if (!a || !b) return;
      const ida = a < b ? a : b;
      const idb = a < b ? b : a;
      const key = `${ida}|${idb}`;
      const ts = time ? new Date(time).toISOString() : new Date().toISOString();
      const existing = pairMap.get(key);
      if (!existing || existing.lastMetAt < ts) {
        pairMap.set(key, { teamAId: ida, teamBId: idb, lastMetAt: ts });
      }
    };

    for (const m of matches) {
      addPair(m.teamAId, m.teamBId, m.scheduledTime ?? m.updatedAt ?? new Date());
    }
    for (const c of challenges) {
      addPair(c.challengerTeamId, c.challengedTeamId, c.scheduledAt ?? c.createdAt ?? c.updatedAt ?? new Date());
    }

    const pairs = Array.from(pairMap.values());
    return NextResponse.json({ pairs });
  } catch (err) {
    console.error('prior-opponents error', err);
    return NextResponse.json({ error: 'Failed to fetch prior opponents' }, { status: 500 });
  }
}
