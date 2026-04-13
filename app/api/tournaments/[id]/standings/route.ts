import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Fetch group stage standings for this tournament
    const groupStandings = await prisma.groupStageStanding.findMany({
      where: { tournamentId: id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
            color: true,
          },
        },
      },
      orderBy: [
        { groupName: "asc" },
        { groupPoints: "desc" },
        { wins: "desc" },
        { tiebreakerScore: "desc" },
      ],
    });

    // Group the results by groupName
    const standingsByGroup: Record<string, (typeof groupStandings[number] & { rank: number })[]> = {};
    groupStandings.forEach((s) => {
      if (!standingsByGroup[s.groupName]) {
        standingsByGroup[s.groupName] = [];
      }
      standingsByGroup[s.groupName].push({
        ...s,
        rank: standingsByGroup[s.groupName].length + 1,
      });
    });

    return NextResponse.json({ 
      tournamentId: id,
      groups: standingsByGroup 
    });

  } catch (error) {
    console.error("Error fetching tournament standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings", details: String(error) },
      { status: 500 }
    );
  }
}
