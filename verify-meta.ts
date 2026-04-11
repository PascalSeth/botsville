import { prisma } from "./lib/prisma";
import { MatchStatus, MainRole, MetaTier, DraftType } from "./app/generated/prisma/enums";

// Copy mapping for verification
const HERO_ROLE_MAPPING: Record<string, MainRole> = {
  "Akai": "ROAM", "Aldous": "EXP", "Alpha": "JUNGLE", "Argus": "EXP", "Arlott": "EXP", 
  "Badang": "EXP", "Balmond": "JUNGLE", "Bane": "EXP", "Barats": "JUNGLE", "Baxia": "JUNGLE", 
  "Belerick": "ROAM", "Benedetta": "EXP", "Chou": "EXP", "Dyrroth": "EXP", "Edith": "EXP", 
  "Esmeralda": "EXP", "Freya": "JUNGLE", "Gatotkaca": "ROAM", "Gloo": "EXP", "Guinevere": "JUNGLE", 
  "Hilda": "ROAM", "Jawhead": "JUNGLE", "Joy": "JUNGLE", "Julian": "EXP", "Khaleed": "EXP", 
  "Lapu-Lapu": "EXP", "Leomord": "JUNGLE", "Martis": "JUNGLE", "Masha": "EXP", "Minsitthar": "ROAM", 
  "Paquito": "EXP", "Phoveus": "EXP", "Ruby": "EXP", "Silvanna": "EXP", "Sun": "EXP", 
  "Terizla": "EXP", "Thamuz": "EXP", "Uranus": "EXP", "X.Borg": "EXP", "Yu Zhong": "EXP", "Zilong": "EXP",
  "Aamon": "JUNGLE", "Fanny": "JUNGLE", "Gusion": "JUNGLE", "Hanzo": "JUNGLE", "Harley": "JUNGLE", 
  "Hayabusa": "JUNGLE", "Helcurt": "JUNGLE", "Karina": "JUNGLE", "Lancelot": "JUNGLE", "Ling": "JUNGLE", 
  "Natalia": "ROAM", "Nolan": "JUNGLE", "Roger": "JUNGLE", "Saber": "JUNGLE", "Yin": "JUNGLE", 
  "Yi Sun-shin": "JUNGLE", "Granger": "JUNGLE", "Fredrinn": "JUNGLE",
  "Alice": "MID", "Aurora": "MID", "Cecilion": "MID", "Chang'e": "MID", "Cyclops": "MID", 
  "Eudora": "MID", "Faramis": "MID", "Gord": "MID", "Harith": "MID", "Kadita": "MID", 
  "Kagura": "MID", "Lunox": "MID", "Luo Yi": "MID", "Lylia": "MID", "Nana": "MID", 
  "Novaria": "MID", "Odette": "MID", "Pharsa": "MID", "Valentina": "MID", "Valir": "MID", 
  "Vale": "MID", "Vexana": "MID", "Xavier": "MID", "Yve": "MID", "Zhask": "MID", "Zhuxin": "MID",
  "Beatrix": "GOLD", "Brody": "GOLD", "Bruno": "GOLD", "Claude": "GOLD", "Clint": "GOLD", 
  "Hanabi": "GOLD", "Irithel": "GOLD", "Karrie": "GOLD", "Layla": "GOLD", "Lesley": "GOLD", 
  "Melissa": "GOLD", "Miya": "GOLD", "Moskov": "GOLD", "Natan": "GOLD", "Popol and Kupa": "GOLD", 
  "Wanwan": "GOLD", "Ixia": "GOLD", "Cici": "EXP",
  "Atlas": "ROAM", "Carmilla": "ROAM", "Diggie": "ROAM", "Estes": "ROAM", "Floryn": "ROAM", 
  "Franco": "ROAM", "Hylos": "ROAM", "Johnson": "ROAM", "Kaja": "ROAM", "Khufra": "ROAM", 
  "Lolita": "ROAM", "Minotaur": "ROAM", "Rafaela": "ROAM", "Tigreal": "ROAM", "Angela": "ROAM", "Selena": "ROAM",
};

async function updateHeroMeta(seasonId: string) {
  const matches = await prisma.match.findMany({
    where: { tournament: { seasonId }, status: "COMPLETED" },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);
  if (matchIds.length === 0) return;
  const perfGames = await prisma.matchPerformance.groupBy({
    by: ["matchId", "gameNumber"],
    where: { matchId: { in: matchIds } },
  });
  const totalGames = perfGames.length;
  if (totalGames === 0) return;
  const perfs = await prisma.matchPerformance.findMany({
    where: { matchId: { in: matchIds } },
    select: { hero: true, won: true },
  });
  const heroStats: Record<string, { picks: number; wins: number; bans: number }> = {};
  for (const p of perfs) {
    if (!heroStats[p.hero]) heroStats[p.hero] = { picks: 0, wins: 0, bans: 0 };
    heroStats[p.hero].picks++;
    if (p.won) heroStats[p.hero].wins++;
  }
  const bans = await prisma.matchDraft.findMany({
    where: { matchId: { in: matchIds }, type: "BAN" },
    select: { hero: true },
  });
  for (const b of bans) {
    if (!heroStats[b.hero]) heroStats[b.hero] = { picks: 0, wins: 0, bans: 0 };
    heroStats[b.hero].bans++;
  }
  for (const [heroName, stats] of Object.entries(heroStats)) {
    const pickRate = stats.picks / totalGames;
    const banRate = stats.bans / totalGames;
    const winRate = stats.picks > 0 ? stats.wins / stats.picks : 0;
    const score = (winRate * 0.5) + (pickRate * 0.3) + (banRate * 0.2);
    let tier: MetaTier = "C";
    if (score >= 0.55 || (winRate > 0.6 && pickRate > 0.1)) tier = "S_PLUS";
    else if (score >= 0.45) tier = "S";
    else if (score >= 0.35) tier = "A";
    else if (score >= 0.25) tier = "B";
    const role = HERO_ROLE_MAPPING[heroName] || "MID";
    await prisma.heroMeta.upsert({
      where: { hero_seasonId: { hero: heroName, seasonId } },
      update: { pickRate, banRate, winRate, tier, role },
      create: { hero: heroName, seasonId, pickRate, banRate, winRate, tier, role },
    });
  }
}

async function verify() {
  console.log("🚀 Seeding test data...");

  let season = await prisma.season.findFirst({ where: { status: "ACTIVE" } });
  if (!season) {
    season = await prisma.season.create({
      data: { name: "Verification Season", status: "ACTIVE", startDate: new Date(), endDate: new Date(Date.now() + 86400000) }
    });
  }

  const teamA = await prisma.team.upsert({
    where: { tag: "V_ALPHA" },
    update: {},
    create: { name: "Verify Alpha", tag: "V_ALPHA", region: "Accra" }
  });

  const teamB = await prisma.team.upsert({
    where: { tag: "V_BETA" },
    update: {},
    create: { name: "Verify Beta", tag: "V_BETA", region: "Kumasi" }
  });

  const playerA = await prisma.player.upsert({
    where: { ign: "V_PlayerA" },
    update: { teamId: teamA.id },
    create: { teamId: teamA.id, ign: "V_PlayerA", role: "EXP" }
  });

  const playerB = await prisma.player.upsert({
    where: { ign: "V_PlayerB" },
    update: { teamId: teamB.id },
    create: { teamId: teamB.id, ign: "V_PlayerB", role: "MID" }
  });

  const tournament = await prisma.tournament.create({
    data: { seasonId: season.id, name: "Verification Tournament", format: "SINGLE_ELIMINATION", location: "Online", date: new Date(), registrationDeadline: new Date(), slots: 16 }
  });

  const match = await prisma.match.create({
    data: { tournamentId: tournament.id, teamAId: teamA.id, teamBId: teamB.id, scheduledTime: new Date(), status: "COMPLETED", scoreA: 1, scoreB: 0 }
  });

  // Hero Stats:
  // Chou: 1 Pick, 1 Win -> 100% WR, 100% PickRate (1 game total)
  // Alice: 1 Pick, 0 Win -> 0% WR, 100% PickRate
  // Fanny: 1 Ban -> 100% BanRate
  
  await prisma.matchDraft.create({
    data: { matchId: match.id, gameNumber: 1, teamId: teamA.id, hero: "Fanny", type: "BAN", phase: "BAN_1", order: 1 }
  });

  await prisma.matchPerformance.createMany({
    data: [
      { matchId: match.id, gameNumber: 1, playerId: playerA.id, hero: "Chou", side: "BLUE", won: true, kills: 10, deaths: 0, assists: 0 },
      { matchId: match.id, gameNumber: 1, playerId: playerB.id, hero: "Alice", side: "RED", won: false, kills: 0, deaths: 10, assists: 0 },
    ]
  });

  console.log("Running updateHeroMeta...");
  await updateHeroMeta(season.id);

  console.log("Checking results...");
  const chou = await prisma.heroMeta.findUnique({ where: { hero_seasonId: { hero: "Chou", seasonId: season.id } } });
  const fanny = await prisma.heroMeta.findUnique({ where: { hero_seasonId: { hero: "Fanny", seasonId: season.id } } });
  const alice = await prisma.heroMeta.findUnique({ where: { hero_seasonId: { hero: "Alice", seasonId: season.id } } });

  console.log("Chou Meta:", JSON.stringify(chou, null, 2));
  console.log("Fanny Meta:", JSON.stringify(fanny, null, 2));
  console.log("Alice Meta:", JSON.stringify(alice, null, 2));
  
  if (chou?.pickRate === 1 && chou?.winRate === 1 && fanny?.banRate === 1 && alice?.pickRate === 1 && alice?.winRate === 0) {
    console.log("✅ Verification SUCCESSFUL!");
  } else {
    console.log("❌ Verification FAILED!");
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
