import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function seedNewModels() {
  console.log('🌱 Seeding new models from existing data...\n');

  try {
    // ════════════════════════════════════════════════════════════
    // 1. POPULATE MatchMvp FROM MatchPerformance
    // ════════════════════════════════════════════════════════════
    console.log('📊 Extracting Match MVPs from MatchPerformance...');
    
    const mvpPerformances = await prisma.matchPerformance.findMany({
      where: { isMvp: true },
      include: { match: true, player: true },
    });

    for (const perf of mvpPerformances) {
      const existing = await prisma.matchMvp.findUnique({
        where: { matchId_playerId: { matchId: perf.matchId, playerId: perf.playerId } },
      });

      if (!existing) {
        await prisma.matchMvp.create({
          data: {
            matchId: perf.matchId,
            playerId: perf.playerId,
            awards: JSON.stringify({
              mvp: true,
              kills: perf.kills,
              deaths: perf.deaths,
              assists: perf.assists,
              hero: perf.hero,
              gameNumber: perf.gameNumber,
            }),
          },
        });
      }
    }
    console.log(`✅ Created ${mvpPerformances.length} MatchMvp records\n`);

    // ════════════════════════════════════════════════════════════
    // 2. POPULATE TournamentMvp BY AGGREGATING MatchMvp
    // ════════════════════════════════════════════════════════════
    console.log('🏆 Aggregating Tournament MVPs...');

    const tournaments = await prisma.tournament.findMany({
      include: {
        matches: {
          include: {
            mvpAwards: {
              include: { player: true },
            },
          },
        },
      },
    });

    for (const tournament of tournaments) {
      // Group MVP awards by player
      const mvpsByPlayer: Record<string, { count: number; kills: number; assists: number; deaths: number; wins: number }> = {};

      for (const match of tournament.matches) {
        for (const mvp of match.mvpAwards) {
          if (!mvpsByPlayer[mvp.playerId]) {
            mvpsByPlayer[mvp.playerId] = { count: 0, kills: 0, assists: 0, deaths: 0, wins: 0 };
          }
          mvpsByPlayer[mvp.playerId].count++;

          const awards = JSON.parse(mvp.awards) as { kills?: number; assists?: number; deaths?: number };
          mvpsByPlayer[mvp.playerId].kills += awards.kills || 0;
          mvpsByPlayer[mvp.playerId].assists += awards.assists || 0;
          mvpsByPlayer[mvp.playerId].deaths += awards.deaths || 0;

          // Count as win if player's team won this match
          if (match.winnerId && mvp.player.teamId && mvp.player.teamId === match.winnerId) {
            mvpsByPlayer[mvp.playerId].wins++;
          }
        }
      }

      // Calculate rankings and create TournamentMvp records
      const sortedMvps = Object.entries(mvpsByPlayer)
        .sort(([, a], [, b]) => b.count - a.count);

      for (let i = 0; i < sortedMvps.length; i++) {
        const [playerId, stats] = sortedMvps[i];
        const totalMatches = stats.count;
        const winRate = totalMatches > 0 ? (stats.wins / totalMatches) * 100 : 0;

        const existing = await prisma.tournamentMvp.findUnique({
          where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        });

        if (!existing) {
          await prisma.tournamentMvp.create({
            data: {
              tournamentId: tournament.id,
              playerId,
              mvpCount: stats.count,
              totalKills: stats.kills,
              totalAssists: stats.assists,
              totalDeaths: stats.deaths,
              winRate,
              ranking: i + 1, // 1st MVP, 2nd MVP, etc.
            },
          });
        }
      }

      console.log(`✅ Tournament ${tournament.name}: ${sortedMvps.length} MVPs tracked`);
    }

    console.log();

    // ════════════════════════════════════════════════════════════
    // 3. POPULATE TeamSeasonRecord FROM Match RESULTS
    // ════════════════════════════════════════════════════════════
    console.log('📈 Calculating Team Season Records...');

    const allTournaments = await prisma.tournament.findMany({
      include: {
        matches: {
          where: { status: 'COMPLETED' }, // Only completed matches
          include: { teamA: true, teamB: true, winner: true },
        },
        season: true,
      },
    });

    const teamStats: Record<string, { wins: number; losses: number; forfeits: number }> = {};

    for (const tournament of allTournaments) {
      if (!tournament.seasonId) continue;

      const seasonId = tournament.seasonId;

      for (const match of tournament.matches) {
        const key = `${match.teamAId}:${seasonId}`;
        const keyB = `${match.teamBId}:${seasonId}`;

        if (!teamStats[key]) teamStats[key] = { wins: 0, losses: 0, forfeits: 0 };
        if (!teamStats[keyB]) teamStats[keyB] = { wins: 0, losses: 0, forfeits: 0 };

        if (match.forfeitedById) {
          if (match.forfeitedById === match.teamAId) {
            teamStats[keyB]!.wins++;
            teamStats[key]!.forfeits++;
          } else {
            teamStats[key]!.wins++;
            teamStats[keyB]!.forfeits++;
          }
        } else if (match.winnerId) {
          if (match.winnerId === match.teamAId) {
            teamStats[key]!.wins++;
            teamStats[keyB]!.losses++;
          } else {
            teamStats[keyB]!.wins++;
            teamStats[key]!.losses++;
          }
        }
      }
    }

    for (const [key, stats] of Object.entries(teamStats)) {
      const [teamId, seasonId] = key.split(':');

      const existing = await prisma.teamSeasonRecord.findUnique({
        where: { teamId_seasonId: { teamId, seasonId } },
      });

      if (!existing) {
        const points = stats.wins * 3; // 3 points per win
        await prisma.teamSeasonRecord.create({
          data: {
            teamId,
            seasonId,
            wins: stats.wins,
            losses: stats.losses,
            forfeits: stats.forfeits,
            draws: 0,
            points,
            tier: 'C', // Default tier, can be updated based on tournament placements
          },
        });
      }
    }

    console.log(`✅ Created ${Object.keys(teamStats).length} TeamSeasonRecord entries\n`);

    // ════════════════════════════════════════════════════════════
    // 4. POPULATE SeasonAwards (CHAMPION, RUNNER-UP, 3RD PLACE, MVP)
    // ════════════════════════════════════════════════════════════
    console.log('🎖️  Determining Season Awards...');

    const seasons = await prisma.season.findMany({
      include: {
        teamSeasonRecords: {
          include: { team: true },
          orderBy: { points: 'desc' },
        },
      },
    });

    for (const season of seasons) {
      // Check if awards already exist
      const existingAwards = await prisma.seasonAwards.findUnique({
        where: { seasonId: season.id },
      });
      if (existingAwards) continue;

      // Get top 3 teams by points
      const topTeams = season.teamSeasonRecords.slice(0, 3);

      // Get season MVP (player with most MVP awards across all tournaments)
      let seasonMvp: string | null = null;
      let bestOffender: string | null = null;
      let bestDefender: string | null = null;

      const allMvps = await prisma.tournamentMvp.findMany({
        where: {
          tournament: {
            seasonId: season.id,
          },
        },
        orderBy: { mvpCount: 'desc' },
      });

      if (allMvps.length > 0) {
        seasonMvp = allMvps[0].playerId; // Most MVP awards
      }

      // Find best attacker (most kills across season)
      const topAttacker = await prisma.matchPerformance.findMany({
        where: {
          match: {
            tournament: {
              seasonId: season.id,
            },
          },
        },
        orderBy: { kills: 'desc' },
        take: 1,
      });

      if (topAttacker.length > 0) {
        bestOffender = topAttacker[0].playerId;
      }

      // Find best defender (most assists across season)
      const topDefender = await prisma.matchPerformance.findMany({
        where: {
          match: {
            tournament: {
              seasonId: season.id,
            },
          },
        },
        orderBy: { assists: 'desc' },
        take: 1,
      });

      if (topDefender.length > 0) {
        bestDefender = topDefender[0].playerId;
      }

      // Create SeasonAwards
      try {
        await prisma.seasonAwards.create({
          data: {
            seasonId: season.id,
            championTeamId: topTeams[0]?.teamId || null,
            runnerUpTeamId: topTeams[1]?.teamId || null,
            thirdPlaceTeamId: topTeams[2]?.teamId || null,
            seasonMvpId: seasonMvp,
            bestOffenderId: bestOffender,
            bestDefenderId: bestDefender,
          },
        });

        console.log(`✅ Season "${season.name}": Awards assigned`);
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === 'P2002') {
          console.log(`⏭️  Season "${season.name}": Awards already exist`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✨ Data migration complete!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedNewModels();
