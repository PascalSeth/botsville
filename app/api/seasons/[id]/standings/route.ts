import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET /api/seasons/[id]/standings
// Returns cumulative TeamStanding + per-month MonthlyStanding for the season.
// Query params: ?month=1 (filter monthly to a specific month), ?year=2026
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;
    const { searchParams } = new URL(_request.url);
    const monthFilter = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
    const yearFilter = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;

    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return apiError("Season not found", 404);

    const [cumulative, monthly] = await Promise.all([
      prisma.teamStanding.findMany({
        where: { seasonId },
        orderBy: { rank: "asc" },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              logo: true,
              color: true,
              region: true,
            },
          },
        },
      }),
      prisma.monthlyStanding.findMany({
        where: {
          seasonId,
          ...(monthFilter ? { month: monthFilter } : {}),
          ...(yearFilter ? { year: yearFilter } : {}),
        },
        orderBy: [{ year: "asc" }, { month: "asc" }, { rank: "asc" }],
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
      }),
    ]);

    // Group monthly standings by year+month
    const monthlyGrouped: Record<string, typeof monthly> = {};
    for (const row of monthly) {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      monthlyGrouped[key] ??= [];
      monthlyGrouped[key].push(row);
    }

    return apiSuccess({
      season: { id: season.id, name: season.name, status: season.status },
      cumulative,
      monthly: monthlyGrouped,
    });
  } catch (err) {
    console.error("standings error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to fetch standings", 500);
  }
}
