import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/app/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const team = await prisma.team.findFirst({
        where: { 
          OR: [
            { name: { contains: 'DarkHorse', mode: 'insensitive' } },
            { tag: 'TDH' }
          ]
        }
      });
    
    if (!team) return apiError("Team not found");

    const season = await prisma.season.findFirst({
        where: { name: { contains: 'Season 1', mode: 'insensitive' } }
    });

    const matches = await prisma.match.findMany({
      where: {
        tournament: { seasonId: season?.id },
        OR: [{ teamAId: team.id }, { teamBId: team.id }],
      },
      include: {
        tournament: { select: { name: true, pointSystem: true } }
      },
      orderBy: { scheduledTime: "asc" }
    });

    return apiSuccess({
      team: { id: team.id, name: team.name, tag: team.tag },
      matchCount: matches.length,
      matches: matches.map(m => ({
        id: m.id,
        tournament: m.tournament.name,
        bracketType: m.bracketType,
        status: m.status,
        teamA: m.teamAId,
        teamB: m.teamBId,
        winner: m.winnerId,
        forfeiter: m.forfeitedById,
        isWin: m.winnerId === team.id,
        isLoss: m.winnerId && m.winnerId !== team.id,
        score: `${m.scoreA} - ${m.scoreB}`
      }))
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Debug failed", 500);
  }
}
