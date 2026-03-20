import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function testAPIs() {
  console.log('🧪 Testing API responses...\n');

  try {
    // 1. Test team leaderboard query
    console.log('📊 Team Leaderboard Query:');
    const activeS = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    
    if (activeS) {
      console.log(`  Season: ${activeS.name}`);
      const standings = await prisma.teamStanding.findMany({
        where: { seasonId: activeS.id },
        select: { rank: true, wins: true, losses: true, points: true, team: { select: { name: true } } },
        orderBy: { rank: 'asc' },
        take: 5,
      });
      console.log(`  Found ${standings.length} team standings`);
      standings.forEach(s => console.log(`    - #${s.rank} ${s.team.name}: ${s.wins}W ${s.losses}L ${s.points}pts`));
    } else {
      console.log('  ⚠️  No ACTIVE season found. Checking ONGOING tournaments...');
      const season = await prisma.season.findFirst({
        select: { id: true, name: true, status: true, tournaments: { select: { status: true } } },
      });
      if (season) {
        console.log(`  Season: ${season.name} (${season.status})`);
        console.log(`  Tournaments: ${season.tournaments.map(t => t.status).join(', ')}`);
      }
    }

    // 2. Test player leaderboard
    console.log('\n🏆 Player Rankings:');
    const rankings = await prisma.playerMvpRanking.findMany({
      where: { season: { status: 'ACTIVE' } },
      select: { rank: true, mvpCount: true, kda: true, player: { select: { ign: true } } },
      orderBy: { mvpCount: 'desc' },
      take: 5,
    });
    console.log(`  Found ${rankings.length} player rankings`);
    rankings.forEach(r => console.log(`    - #${r.rank} ${r.player.ign}: ${r.mvpCount} MVPs, ${r.kda.toFixed(2)} KDA`));

    // 3. Test tournament MVPs
    console.log('\n🎖️  Tournament MVPs:');
    const tMvps = await prisma.tournamentMvp.findMany({
      select: { mvpCount: true, ranking: true, player: { select: { ign: true } }, tournament: { select: { name: true } } },
      orderBy: { ranking: 'asc' },
      take: 5,
    });
    console.log(`  Found ${tMvps.length} tournament MVP records`);
    tMvps.forEach(m => console.log(`    - #${m.ranking} ${m.player.ign} in ${m.tournament.name}: ${m.mvpCount} MVPs`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIs();
