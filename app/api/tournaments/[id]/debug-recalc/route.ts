import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      OR: [{ bracketType: BracketType.GROUP_STAGE }, { bracketType: null }],
      status: { in: [MatchStatus.COMPLETED, MatchStatus.FORFEITED, MatchStatus.RESTING] },
    },
    select: {
      id: true, teamAId: true, teamBId: true, winnerId: true, status: true,
      bestOf: true, scheduledTime: true, scoreA: true, scoreB: true
    }
  });

  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId },
    include: { teams: { select: { teamId: true } } },
  });

  const teamGroupMap: Record<string, string> = {};
  const accum: any = {};
  const ensure = (groupName: string, teamId: string) => {
    accum[groupName] ??= {};
    accum[groupName][teamId] ??= { wins: 0, losses: 0, draws: 0, groupPoints: 0, gameWins: 0, gameLosses: 0 };
    return accum[groupName][teamId];
  };

  if (groups.length > 0) {
    for (const g of groups) {
      for (const t of g.teams) {
        teamGroupMap[t.teamId] = g.name;
        ensure(g.name, t.teamId);
      }
    }
  }

  const outputLog = [];

  for (const m of matches) {
    const { teamAId, teamBId, status, scheduledTime } = m;
    
    if (status === MatchStatus.RESTING || !teamBId) {
      const isPast = !scheduledTime || new Date(scheduledTime) <= new Date();
      outputLog.push({ matchId: m.id, teamAId, teamBId, status, scheduledTime, isPast, action: isPast ? "Processed" : "Skipped" });
      
      if (!isPast) continue;

      const groupNameA = teamGroupMap[teamAId];
      if (!groupNameA) {
        outputLog.push({ error: "No group found for team A" });
        continue;
      }
      
      const a = ensure(groupNameA, teamAId);
      a.wins++;
      a.groupPoints += 3;
      a.gameWins += m.bestOf ? Math.ceil(m.bestOf / 2) : 2; 
      continue;
    }
  }

  return NextResponse.json({
    currentTime: new Date().toISOString(),
    matchesFetched: matches.length,
    outputLog,
    accum
  });
}
