import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function checkNewModels() {
  console.log('🔍 Checking NEW models...\n');

  try {
    const [matchMvps, tournamentMvps, teamRecords, seasonAwards] = await Promise.all([
      prisma.matchMvp.count(),
      prisma.tournamentMvp.count(),
      prisma.teamSeasonRecord.count(),
      prisma.seasonAwards.count(),
    ]);

    console.log('📊 New Models Status:');
    console.log(`  - MatchMvp records: ${matchMvps}`);
    console.log(`  - TournamentMvp records: ${tournamentMvps}`);
    console.log(`  - TeamSeasonRecord records: ${teamRecords}`);
    console.log(`  - SeasonAwards records: ${seasonAwards}`);

    // Show details
    if (matchMvps > 0) {
      const mvps = await prisma.matchMvp.findMany({
        take: 3,
        include: { player: { select: { ign: true } } },
      });
      console.log('\n📋 Sample MatchMvps:');
      mvps.forEach(m => console.log(`  - ${m.player.ign}: ${m.awards}`));
    }

    if (tournamentMvps > 0) {
      const mvps = await prisma.tournamentMvp.findMany({
        take: 3,
        include: { player: { select: { ign: true } }, tournament: { select: { name: true } } },
      });
      console.log('\n🏆 Sample TournamentMvps:');
      mvps.forEach(m => console.log(`  - ${m.player.ign} in ${m.tournament.name}: ${m.mvpCount} MVPs, Ranking: ${m.ranking}`));
    }

    if (teamRecords > 0) {
      const records = await prisma.teamSeasonRecord.findMany({
        take: 3,
        include: { team: { select: { name: true } }, season: { select: { name: true } } },
      });
      console.log('\n📈 Sample TeamSeasonRecords:');
      records.forEach(r => console.log(`  - ${r.team.name} in ${r.season.name}: ${r.wins}W-${r.losses}L-${r.forfeits}F, ${r.points} pts`));
    }

    if (seasonAwards > 0) {
      const awards = await prisma.seasonAwards.findMany({
        take: 3,
        include: { season: { select: { name: true } }, championTeam: { select: { name: true } } },
      });
      console.log('\n🎖️  Sample SeasonAwards:');
      awards.forEach(a => console.log(`  - ${a.season.name}: Champion = ${a.championTeam?.name || 'N/A'}`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewModels();
