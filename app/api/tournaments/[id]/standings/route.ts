import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log("Fetching standings for tournament:", id);

    // Fetch tournament to get its season
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { seasonId: true },
    });

    console.log("Tournament found:", tournament);

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Fetch season standings
    const standings = await prisma.teamSeasonRecord.findMany({
      where: {
        seasonId: tournament.seasonId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: true,
          },
        },
      },
      orderBy: [
        { points: "desc" },
        { wins: "desc" },
        { losses: "asc" },
      ],
    });

    console.log("Standings found:", standings.length);

    // Add rank
    const rankedStandings = standings.map((record, index) => ({
      id: record.id,
      rank: index + 1,
      wins: record.wins,
      losses: record.losses,
      points: record.points,
      team: record.team,
    }));

    return NextResponse.json({ standings: rankedStandings });
  } catch (error) {
    console.error("Error fetching tournament standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings", details: String(error) },
      { status: 500 }
    );
  }
}
