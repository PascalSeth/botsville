/**
 * Seed script for MLBB Hero Trivia Quiz
 * Run: npx tsx scripts/seed-trivia.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { TriviaCategory } from "../app/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type TriviaSeed = {
  category: TriviaCategory;
  teaser: string;
  choices: string[];
  correctAnswerIndex: number;
  reveal: string;
  heroSlug?: string;
  title?: string;
};

const triviaData: TriviaSeed[] = [
  // ═══════════════════════════════════════════════════════════
  // 🧠 GUESS THE HERO (Skill Clues)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero swings around the battlefield using steel cables like Spider-Man?",
    choices: ["Gusion", "Fanny", "Ling", "Lancelot"],
    correctAnswerIndex: 1,
    reveal: "Fanny is famous for her cable-swinging mobility that lets her traverse the map in seconds!",
    heroSlug: "fanny",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero can copy another hero's ultimate ability?",
    choices: ["Kadita", "Lunox", "Valentina", "Selena"],
    correctAnswerIndex: 2,
    reveal: "Valentina can copy any enemy hero's ultimate, making her extremely versatile!",
    heroSlug: "valentina",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero drives a transforming car and crashes into enemies?",
    choices: ["Johnson", "X.Borg", "Uranus", "Grock"],
    correctAnswerIndex: 0,
    reveal: "Johnson transforms into a car and can take an ally on a deadly road trip!",
    heroSlug: "johnson",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero fights together with a wolf companion named Kupa?",
    choices: ["Irithel", "Popol and Kupa", "Claude", "Nana"],
    correctAnswerIndex: 1,
    reveal: "Popol and Kupa are an inseparable duo - a hunter and his loyal wolf!",
    heroSlug: "popol-and-kupa",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero can become invisible and silence enemies?",
    choices: ["Helcurt", "Natalia", "Saber", "Hanzo"],
    correctAnswerIndex: 1,
    reveal: "Natalia's passive lets her become invisible in bushes, perfect for ambushing!",
    heroSlug: "natalia",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero can travel through shadows and teleport across the map?",
    choices: ["Lancelot", "Hayabusa", "Benedetta", "Aamon"],
    correctAnswerIndex: 1,
    reveal: "Hayabusa is the Shadow of Iga - a ninja master of shadow techniques!",
    heroSlug: "hayabusa",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero summons lava from the ground and becomes unstoppable?",
    choices: ["Esmeralda", "Thamuz", "Aldous", "Dyrroth"],
    correctAnswerIndex: 1,
    reveal: "Thamuz, the Lord Lava, wields scythes connected by chains of fire!",
    heroSlug: "thamuz",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero rides a giant skeletal horse when using ultimate?",
    choices: ["Alucard", "Leomord", "Khaleed", "Martis"],
    correctAnswerIndex: 1,
    reveal: "Leomord summons his loyal steed Barbiel to charge into battle!",
    heroSlug: "leomord",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero controls black and white cosmic power?",
    choices: ["Kagura", "Lunox", "Odette", "Lylia"],
    correctAnswerIndex: 1,
    reveal: "Lunox balances Order (light) and Chaos (dark) cosmic powers!",
    heroSlug: "lunox",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero can trap enemies inside a boxing ring?",
    choices: ["Chou", "Yin", "Paquito", "Badang"],
    correctAnswerIndex: 1,
    reveal: "Yin can trap a single enemy in his domain - a one-on-one death match!",
    heroSlug: "yin",
  },

  // ═══════════════════════════════════════════════════════════
  // ⚔️ HARDEST HEROES TO MASTER
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero is considered the hardest mechanical hero in MLBB?",
    choices: ["Gusion", "Fanny", "Ling", "Lancelot"],
    correctAnswerIndex: 1,
    reveal: "Fanny requires exceptional cable management and energy control to master!",
    heroSlug: "fanny",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which assassin uses four swords and teleport dashes?",
    choices: ["Gusion", "Hayabusa", "Lancelot", "Saber"],
    correctAnswerIndex: 0,
    reveal: "Gusion's Holy Blade combo requires precise timing and fast reflexes!",
    heroSlug: "gusion",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero jumps between enemy targets with lightning speed?",
    choices: ["Fanny", "Ling", "Karina", "Aamon"],
    correctAnswerIndex: 1,
    reveal: "Ling's wall-jumping mobility makes him one of the hardest assassins to master!",
    heroSlug: "ling",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which marksman is known for high difficulty and jumping around enemies?",
    choices: ["Moskov", "Wanwan", "Karrie", "Claude"],
    correctAnswerIndex: 1,
    reveal: "Wanwan's weakness-based passive and ultimate timing make her extremely skill-intensive!",
    heroSlug: "wanwan",
  },

  // ═══════════════════════════════════════════════════════════
  // 😂 FUNNY / WEIRD HERO FACTS
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero is actually a small girl riding a giant robot?",
    choices: ["Angela", "Jawhead", "Diggie", "Nana"],
    correctAnswerIndex: 1,
    reveal: "Alice is the little girl who controls the robot Jawhead!",
    heroSlug: "jawhead",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero is a literal walking tree?",
    choices: ["Grock", "Belerick", "Hylos", "Gatotkaca"],
    correctAnswerIndex: 1,
    reveal: "Belerick is the Ancient Guard - a sentient tree protecting the Land of Dawn!",
    heroSlug: "belerick",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero throws bombs and laughs like a maniac?",
    choices: ["Bane", "Diggie", "Rafaela", "Faramis"],
    correctAnswerIndex: 1,
    reveal: "Diggie the owl might look cute but loves causing explosive chaos!",
    heroSlug: "diggie",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero summons alien turrets from another dimension?",
    choices: ["Kimmy", "Zhask", "Cyclops", "Yve"],
    correctAnswerIndex: 1,
    reveal: "Zhask is the Swarm Dominator from the Kastiya species!",
    heroSlug: "zhask",
  },

  // ═══════════════════════════════════════════════════════════
  // 👑 OG HEROES (Oldest in MLBB)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero is the very first marksman introduced in the game?",
    choices: ["Layla", "Miya", "Bruno", "Clint"],
    correctAnswerIndex: 1,
    reveal: "Miya was one of the original heroes when MLBB launched in 2016!",
    heroSlug: "miya",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: 'Which hero is known for the phrase "Launch Attack!"?',
    choices: ["Miya", "Layla", "Bruno", "Nana"],
    correctAnswerIndex: 1,
    reveal: "Layla's iconic voice line is loved by the MLBB community!",
    heroSlug: "layla",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero is the classic spinning warrior used by beginners?",
    choices: ["Alucard", "Balmond", "Zilong", "Saber"],
    correctAnswerIndex: 1,
    reveal: "Balmond's spin-to-win strategy has been a classic since day one!",
    heroSlug: "balmond",
  },

  // ═══════════════════════════════════════════════════════════
  // 🔥 POWER ULTIMATE TRIVIA
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero fires a giant global laser across the map?",
    choices: ["Pharsa", "Xavier", "Yve", "Vale"],
    correctAnswerIndex: 1,
    reveal: "Xavier's Dawning Light can strike enemies anywhere on the map!",
    heroSlug: "xavier",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which mage summons a massive bird airstrike?",
    choices: ["Kagura", "Pharsa", "Lylia", "Cecilion"],
    correctAnswerIndex: 1,
    reveal: "Pharsa transforms into a bird and rains destruction from above!",
    heroSlug: "pharsa",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero pulls enemies together using gravity magic?",
    choices: ["Tigreal", "Atlas", "Franco", "Khufra"],
    correctAnswerIndex: 1,
    reveal: "Atlas's Fatal Links can grab the entire enemy team and drag them together!",
    heroSlug: "atlas",
  },

  // ═══════════════════════════════════════════════════════════
  // 🐉 LORE TRIVIA
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero is the Black Dragon of the Moniyan Empire?",
    choices: ["Zilong", "Yu Zhong", "Thamuz", "Dyrroth"],
    correctAnswerIndex: 1,
    reveal: "Yu Zhong is the feared Black Dragon who once ruled with terror!",
    heroSlug: "yu-zhong",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero is the Queen of the Moon Elf tribe?",
    choices: ["Lunox", "Miya", "Silvanna", "Odette"],
    correctAnswerIndex: 1,
    reveal: "Miya is the Moon Elf Queen who protects her people with her bow!",
    heroSlug: "miya",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero controls ocean waves and tidal power?",
    choices: ["Bane", "Kadita", "Atlas", "Belerick"],
    correctAnswerIndex: 1,
    reveal: "Kadita is the Ocean Goddess who commands the seas!",
    heroSlug: "kadita",
  },

  // ═══════════════════════════════════════════════════════════
  // 🎯 SKIN TRIVIA
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.SKIN,
    teaser: 'Which hero has the Legend skin called "Cosmic Gleam"?',
    choices: ["Lesley", "Guinevere", "Granger", "Gusion"],
    correctAnswerIndex: 1,
    reveal: "Guinevere's Cosmic Gleam is one of the most stunning Legend skins!",
    heroSlug: "guinevere",
  },
  {
    category: TriviaCategory.SKIN,
    teaser: "Which hero has a Saint Seiya collaboration skin?",
    choices: ["Zilong", "Chou", "Alucard", "Badang"],
    correctAnswerIndex: 1,
    reveal: "Chou received the Dragon Shiryu skin from the Saint Seiya collab!",
    heroSlug: "chou",
  },

  // ═══════════════════════════════════════════════════════════
  // 🧩 EMOJI GUESS THE HERO
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🧛‍♂️🩸",
    choices: ["Alucard", "Cecilion", "Dyrroth", "Alice"],
    correctAnswerIndex: 1,
    reveal: "Cecilion is the vampire mage who drains blood with his powerful magic!",
    heroSlug: "cecilion",
    title: "Emoji Guess #1",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🐉🔥",
    choices: ["Zhask", "Yu Zhong", "Thamuz", "Valir"],
    correctAnswerIndex: 1,
    reveal: "Yu Zhong is the Black Dragon who breathes devastating fire!",
    heroSlug: "yu-zhong",
    title: "Emoji Guess #2",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "⚡👧",
    choices: ["Aurora", "Eudora", "Guinevere", "Lylia"],
    correctAnswerIndex: 1,
    reveal: "Eudora is the lightning mage who electrifies her enemies!",
    heroSlug: "eudora",
    title: "Emoji Guess #3",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🐺🏹",
    choices: ["Irithel", "Popol and Kupa", "Claude", "Roger"],
    correctAnswerIndex: 1,
    reveal: "Popol and Kupa - the hunter duo with a wolf companion!",
    heroSlug: "popol-and-kupa",
    title: "Emoji Guess #4",
  },
];

async function main() {
  console.log("🎮 Seeding MLBB Hero Trivia Quiz...\n");

  // Count existing trivia
  const existingCount = await prisma.triviaFact.count();
  console.log(`📊 Existing trivia in database: ${existingCount}`);

  // Insert trivia
  let created = 0;
  let skipped = 0;

  for (const item of triviaData) {
    // Check if similar trivia already exists (same teaser)
    const existing = await prisma.triviaFact.findFirst({
      where: { teaser: item.teaser },
    });

    if (existing) {
      console.log(`⏭️  Skipped (exists): ${item.reveal}`);
      skipped++;
      continue;
    }

    await prisma.triviaFact.create({
      data: {
        category: item.category,
        title: item.title || "",
        teaser: item.teaser,
        choices: item.choices,
        correctAnswerIndex: item.correctAnswerIndex,
        reveal: item.reveal,
        heroSlug: item.heroSlug || null,
        isActive: true,
        images: [],
      },
    });

    console.log(`✅ Created: [${item.category}] ${item.reveal}`);
    created++;
  }

  console.log("\n" + "═".repeat(50));
  console.log(`🎉 Done! Created: ${created}, Skipped: ${skipped}`);
  console.log("═".repeat(50));

  // Show category breakdown
  const stats = await prisma.triviaFact.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  console.log("\n📈 Category breakdown:");
  for (const stat of stats) {
    const emoji = {
      GUESS_THE_HERO: "🧠",
      HARDEST_HEROES: "⚔️",
      FUNNY_FACTS: "😂",
      OG_HEROES: "👑",
      POWER_ULTIMATE: "🔥",
      LORE: "🐉",
      SKIN: "🎯",
      EMOJI_GUESS: "🧩",
      GENERAL: "💡",
    }[stat.category] || "❓";
    console.log(`   ${emoji} ${stat.category}: ${stat._count.id}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
