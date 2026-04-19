import { prisma } from "./lib/prisma";

async function main() {
  const byes = await prisma.match.findMany({
    where: { 
      teamBId: null, 
      status: "COMPLETED", 
      statsFinalized: true 
    },
    include: { tournament: true }
  });

  console.log(`Found ${byes.length} finalized bye matches...`);
  
  for (const m of byes) {
    if (!m.tournament?.seasonId) continue;
    
    const d = m.scheduledTime ? new Date(m.scheduledTime) : new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    console.log(`Fixing Monthly Standing for Team: ${m.teamAId} | Year: ${year} Month: ${month}`);
    
    // We already gave them TeamStanding points. Let's just fix MonthlyStanding!
    await prisma.monthlyStanding.upsert({
      where: { seasonId_teamId_year_month: { seasonId: m.tournament.seasonId, teamId: m.teamAId, year, month } },
      update: {
        wins: { increment: 1 },
        points: { increment: 3 }
      },
      create: {
        seasonId: m.tournament.seasonId,
        teamId: m.teamAId,
        year, month,
        wins: 1, losses: 0, points: 3, forfeits: 0, rank: 0
      }
    });
  }
}
main().catch(console.error);
