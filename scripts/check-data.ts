import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function checkDatabase() {
  console.log('🔍 Checking database contents...\n');

  try {
    const [tournaments, matches, players, performances, seasons] = await Promise.all([
      prisma.tournament.count(),
      prisma.match.count(),
      prisma.player.count(),
      prisma.matchPerformance.count(),
      prisma.season.count(),
    ]);

    console.log('📊 Database Summary:');
    console.log(`  - Seasons: ${seasons}`);
    console.log(`  - Tournaments: ${tournaments}`);
    console.log(`  - Matches: ${matches}`);
    console.log(`  - Players: ${players}`);
    console.log(`  - Match Performances: ${performances}`);

    if (tournaments === 0) {
      console.log('\n⚠️  No tournaments found. Create some tournaments first!');
    }
    if (matches === 0) {
      console.log('\n⚠️  No matches found. Add match results first!');
    }
    if (performances === 0) {
      console.log('\n⚠️  No match performances found. Record player stats first!');
    }

    // Show sample data
    if (tournaments > 0) {
      const sampleTournaments = await prisma.tournament.findMany({
        take: 3,
        select: { id: true, name: true, status: true },
      });
      console.log('\n📋 Sample Tournaments:');
      sampleTournaments.forEach(t => console.log(`  - ${t.name} (${t.status})`));
    }

    if (matches > 0) {
      const sampleMatches = await prisma.match.findMany({
        take: 3,
        select: { id: true, status: true, scoreA: true, scoreB: true },
      });
      console.log('\n🎮 Sample Matches:');
      sampleMatches.forEach(m => console.log(`  - Status: ${m.status}, Score: ${m.scoreA}-${m.scoreB}`));
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
