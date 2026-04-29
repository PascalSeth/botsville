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
  heroSlug?: string | null;
  title?: string | null;
};

const triviaData40: TriviaSeed[] = [
  // ═══════════════════════════════════════════════════════════
  // 🧠 THE 2026 META (New Heroes & Revamps)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero must manage 'Resolve' to transform into a high-impact 'Sacred Beast'?",
    choices: ["Lukas", "Fredrinn", "Yu Zhong", "Minotaur"],
    correctAnswerIndex: 0,
    reveal: "Lukas, the Beast of Light, gains Resolve by attacking; at max stacks, he unleashes his Sacred Beast form!",
    heroSlug: "lukas",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero's Ultimate 'Mandate of the People' reveals all enemies and applies a divine stun?",
    choices: ["Novaria", "Zetian", "Xavier", "Yve"],
    correctAnswerIndex: 1,
    reveal: "Zetian, the Peerless Empress, grants allies speed while bringing divine retribution to all enemies!",
    heroSlug: "zetian",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero uses a 'Lantern of Spirits' to toss airborne enemies around the battlefield?",
    choices: ["Lunox", "Zhuxin", "Kagura", "Vexana"],
    correctAnswerIndex: 1,
    reveal: "Zhuxin captures enemy wishes in her lantern, using her ember butterflies to control their positioning!",
    heroSlug: "zhuxin",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero switches between 'Thunder' (Assassin) and 'Torrent' (Tank) forms using their Ultimate?",
    choices: ["Sora", "Roger", "Edith", "Selena"],
    correctAnswerIndex: 0,
    reveal: "Sora is the ultimate all-rounder, shifting his entire stat block between offense and defense!",
    heroSlug: "sora",
  },
  {
    category: TriviaCategory.GUESS_THE_HERO,
    teaser: "Which hero uses 'Bone Shards' to amplify their basic attacks into a storm of projectiles?",
    choices: ["Obsidia", "Moskov", "Hanzo", "Granger"],
    correctAnswerIndex: 0,
    reveal: "Obsidia collects Bone Shards from fallen foes, unleashing them all at once for massive burst!",
    heroSlug: "obsidia",
  },

  // ═══════════════════════════════════════════════════════════
  // ⚔️ MECHANICAL MASTERY (Pro Tactics)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero has a special interaction where they can use basic attacks while moving through obstacles?",
    choices: ["Obsidia", "Ling", "Fanny", "Joy"],
    correctAnswerIndex: 0,
    reveal: "While tethered in her Phantom state, Obsidia ignores terrain and never stops attacking!",
    heroSlug: "obsidia",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero requires hitting a perfect musical beat to unlock their Ultimate damage?",
    choices: ["Cici", "Joy", "Melissa", "Lylia"],
    correctAnswerIndex: 1,
    reveal: "Joy is a rhythm assassin; missing a beat during her dashes ruins her power!",
    heroSlug: "joy",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero's Ultimate is locked until you strike 4 weakness points on a single target?",
    choices: ["Wanwan", "Paquito", "Benedetta", "Lancelot"],
    correctAnswerIndex: 0,
    reveal: "Wanwan's 'Crossbow of Tang' remains sealed until her passive reveals the target's flaws!",
    heroSlug: "wanwan",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero gains infinite dashes but ONLY if they hit a target that hasn't been marked yet?",
    choices: ["Lancelot", "Arlott", "Benedetta", "Chou"],
    correctAnswerIndex: 0,
    reveal: "Lancelot's 'Puncture' resets every time he hits a new, unmarked unit!",
    heroSlug: "lancelot",
  },
  {
    category: TriviaCategory.HARDEST_HEROES,
    teaser: "Which hero uses 'Skill Echo' to cast their recently used ability a second time for free?",
    choices: ["Valentina", "Julian", "Lylia", "Angela"],
    correctAnswerIndex: 1,
    reveal: "Julian’s unique passive allows him to enhance and 'echo' a skill after a 2-skill combo!",
    heroSlug: "julian",
  },

  // ═══════════════════════════════════════════════════════════
  // 😂 FUNNY & WEIRD FACTS
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero is an owl who stays on the map as an egg even after dying?",
    choices: ["Diggie", "Nana", "Angela", "Floryn"],
    correctAnswerIndex: 0,
    reveal: "Diggie's egg form allows him to scout and annoy enemies while waiting to respawn!",
    heroSlug: "diggie",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero literally 'eats' their teammates to protect them from damage?",
    choices: ["Barats", "Akai", "Gloo", "Diggie"],
    correctAnswerIndex: 0,
    reveal: "Barats can swallow allies to reposition them safely during a chaotic fight!",
    heroSlug: "barats",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero's sidekick 'Dew' provides an extra item slot called the 'Seed of Hope'?",
    choices: ["Floryn", "Angela", "Estes", "Rafaela"],
    correctAnswerIndex: 0,
    reveal: "Floryn’s buddy Dew upgrades an ally’s stats through a special exclusive item!",
    heroSlug: "floryn",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero says: 'Why am I crying? Oh! Because of onion'?",
    choices: ["Akai", "Lancelot", "Badang", "Wanwan"],
    correctAnswerIndex: 1,
    reveal: "Lancelot’s flamboyant personality includes some very dramatic (and vegetable-related) voice lines!",
    heroSlug: "lancelot",
  },
  {
    category: TriviaCategory.FUNNY_FACTS,
    teaser: "Which hero was found 'crawling out of a coffin' after her parents passed away?",
    choices: ["Vexana", "Zhuxin", "Alice", "Selena"],
    correctAnswerIndex: 1,
    reveal: "Zhuxin's lore reveals a dark origin, leading people to view her as an ill omen!",
    heroSlug: "zhuxin",
  },

  // ═══════════════════════════════════════════════════════════
  // 🔥 POWER ULTIMATES
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero can 'borrow' the Ultimate ability of any enemy hero they face?",
    choices: ["Valentina", "Julian", "Lylia", "Vexana"],
    correctAnswerIndex: 0,
    reveal: "Valentina's 'I Am You' allows her to turn the enemy's best weapons against them!",
    heroSlug: "valentina",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero fires a giant global laser across the map?",
    choices: ["Pharsa", "Xavier", "Yve", "Vale"],
    correctAnswerIndex: 1,
    reveal: "Xavier's 'Dawning Light' can strike enemies (or steal the Lord) from anywhere!",
    heroSlug: "xavier",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero summons a massive 'Sanctuary' that prevents allies from dying?",
    choices: ["Faramis", "Estes", "Angela", "Minotaur"],
    correctAnswerIndex: 0,
    reveal: "Faramis’s 'Cult Altar' provides a temporary state of immortality for his team!",
    heroSlug: "faramis",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero's Ultimate 'Mountain Shocker' reveals the location of EVERY enemy hero?",
    choices: ["Selena", "Yi Sun-shin", "Aldous", "Novaria"],
    correctAnswerIndex: 1,
    reveal: "YSS reveals all enemies and rains fire on them, making bushes useless!",
    heroSlug: "yi-sun-shin",
  },
  {
    category: TriviaCategory.POWER_ULTIMATE,
    teaser: "Which hero can create a portal that teleports minions and creeps along with allies?",
    choices: ["Luo Yi", "Chip", "Valentina", "Mathilda"],
    correctAnswerIndex: 1,
    reveal: "Chip's 'Why Walk?' special skill allows for massive map pressure with lane-pushing portals!",
    heroSlug: "chip",
  },

  // ═══════════════════════════════════════════════════════════
  // 🐉 LORE & SECRETS
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.LORE,
    teaser: "Who is the elder brother of Gusion and the current head of House Paxley?",
    choices: ["Aamon", "Nolan", "Julian", "Xavier"],
    correctAnswerIndex: 0,
    reveal: "Aamon handles the dark secrets of House Paxley to shield Gusion from family laws!",
    heroSlug: "aamon",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero is the biological daughter of the Abyssal hero Terizla?",
    choices: ["Ruby", "Cici", "Selena", "Vexana"],
    correctAnswerIndex: 1,
    reveal: "Cici’s cheerful nature hides her family connection to the smithing master Terizla!",
    heroSlug: "cici",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Who is the younger sister of the Moniyan Princess Silvanna?",
    choices: ["Karina", "Selena", "Guinevere", "Fanny"],
    correctAnswerIndex: 1,
    reveal: "Selena was the long-lost sister of Silvanna, kidnapped and corrupted by the Abyss!",
    heroSlug: "selena",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero was a student of the Great Dragon alongside the Black Dragon Yu Zhong?",
    choices: ["Zilong", "Ling", "Baxia", "All of the above"],
    correctAnswerIndex: 3,
    reveal: "Zilong, Ling, and Baxia were all fellow disciples under the Great Dragon!",
    heroSlug: "zilong",
  },
  {
    category: TriviaCategory.LORE,
    teaser: "Which hero is a high-ranking official from Zhu'an who can hear the desires of mortal hearts?",
    choices: ["Zhuxin", "Zetian", "Luo Yi", "Kagura"],
    correctAnswerIndex: 0,
    reveal: "Zhuxin wanders with her lantern, fulfilling or wagering the purest wishes of mortals!",
    heroSlug: "zhuxin",
  },

  // ═══════════════════════════════════════════════════════════
  // 👑 OG HEROES (Oldest in MLBB)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero was the very first Marksman introduced in the game?",
    choices: ["Layla", "Miya", "Bruno", "Clint"],
    correctAnswerIndex: 1,
    reveal: "Miya was the first hero on the roster when MLBB launched in 2016!",
    heroSlug: "miya",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Before his revamp, which hero was a human with a blue cape instead of an Orcish Chieftain?",
    choices: ["Tigreal", "Balmond", "Bane", "Alucard"],
    correctAnswerIndex: 2,
    reveal: "Bane used to be human before his transformation into the undead captain!",
    heroSlug: "bane",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero is famously known for the voice line 'Heroes never fade!'?",
    choices: ["Zilong", "Alucard", "Tigreal", "Balmond"],
    correctAnswerIndex: 1,
    reveal: "Alucard's legendary catchphrase has been a fan favorite since the early seasons!",
    heroSlug: "alucard",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero was renamed from 'Yun Zhao' early in the game's history?",
    choices: ["Zilong", "Chou", "Sun", "Yi Sun-shin"],
    correctAnswerIndex: 0,
    reveal: "Zilong was originally Yun Zhao before his name was updated for global audiences!",
    heroSlug: "zilong",
  },
  {
    category: TriviaCategory.OG_HEROES,
    teaser: "Which hero has the classic 'Spin-to-Win' skill used in the original tutorial?",
    choices: ["Balmond", "Alucard", "Saber", "Tigreal"],
    correctAnswerIndex: 0,
    reveal: "Balmond’s Cyclone Sweep is the quintessential spinning attack of MLBB!",
    heroSlug: "balmond",
  },

  // ═══════════════════════════════════════════════════════════
  // 🧩 EMOJI GUESS THE HERO
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🌌🔭🌠",
    choices: ["Cyclops", "Novaria", "Zhask", "Yve"],
    correctAnswerIndex: 1,
    reveal: "Novaria, the Star Rebel, snipes from the stars!",
    heroSlug: "novaria",
    title: "Emoji Guess #11",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🎭🌀🪄",
    choices: ["Valentina", "Luo Yi", "Harley", "Guinevere"],
    correctAnswerIndex: 0,
    reveal: "Valentina uses shadow masks to copy her enemies!",
    heroSlug: "valentina",
    title: "Emoji Guess #12",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🦋🏮🪷",
    choices: ["Zhuxin", "Lunox", "Guinevere", "Odette"],
    correctAnswerIndex: 0,
    reveal: "Zhuxin uses her spirit lantern and butterflies to control the field!",
    heroSlug: "zhuxin",
    title: "Emoji Guess #13",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "⚓🏴☠️🦑",
    choices: ["Bane", "Atlas", "Kadita", "Terizla"],
    correctAnswerIndex: 0,
    reveal: "Bane leads the pirate fleet of the Frozen Seas!",
    heroSlug: "bane",
    title: "Emoji Guess #14",
  },
  {
    category: TriviaCategory.EMOJI_GUESS,
    teaser: "🐉🔥🗡️",
    choices: ["Yu Zhong", "Zilong", "Valir", "X.Borg"],
    correctAnswerIndex: 1,
    reveal: "Zilong is the Son of the Dragon, famous for his spear and speed!",
    heroSlug: "zilong",
    title: "Emoji Guess #15",
  },

  // ═══════════════════════════════════════════════════════════
  // 🎯 SKIN & ITEMS (The Final Round)
  // ═══════════════════════════════════════════════════════════
  {
    category: TriviaCategory.SKIN,
    teaser: "Which hero received the first ever 'Zenith' tier skin called 'Storm Tide'?",
    choices: ["Vexana", "Zhuxin", "Alice", "Lunox"],
    correctAnswerIndex: 0,
    reveal: "Vexana’s 'Storm Tide' introduced the Zenith tier with complex animations!",
    heroSlug: "vexana",
  },
  {
    category: TriviaCategory.SKIN,
    teaser: "Which hero has the Legend skin called 'Cosmic Gleam'?",
    choices: ["Gusion", "Guinevere", "Granger", "Lesley"],
    correctAnswerIndex: 1,
    reveal: "Guinevere’s 'Cosmic Gleam' is one of the most stunning Legend skins in the game!",
    heroSlug: "guinevere",
  },
  {
    category: TriviaCategory.SKIN,
    teaser: "Which hero received the Kung Fu Panda collaboration skin as Po?",
    choices: ["Akai", "Thamuz", "Ling", "Kai"],
    correctAnswerIndex: 0,
    reveal: "Akai was the perfect fit for the Dragon Warrior, Po, in the MLBB x Kung Fu Panda crossover!",
    heroSlug: "akai",
  },
  {
    category: TriviaCategory.GENERAL,
    teaser: "Which jungle item is essential for dealing True Damage to creeps and securing the Lord?",
    choices: ["Retribution", "Execute", "Inspire", "Flicker"],
    correctAnswerIndex: 0,
    reveal: "Retribution is the lifeline of every Jungler in the Land of Dawn!",
    heroSlug: null,
  },
  {
    category: TriviaCategory.GENERAL,
    teaser: "How many heroes in MLBB possess exactly 0 forms of CC (Crowd Control) in their base kit?",
    choices: ["0", "2", "5", "8"],
    correctAnswerIndex: 1,
    reveal: "Sun and Fanny are famously the only heroes with no crowd control abilities!",
    heroSlug: null,
  },
];

async function main() {
  console.log("🎮 Seeding MLBB Hero Trivia Quiz 40...\n");

  console.log("🗑️ Deleting old trivia facts (or we can preserve them)...");
  // Optional: const deleteResult = await prisma.triviaFact.deleteMany();
  // console.log(`✅ Deleted ${deleteResult.count} old trivia facts.`);

  // Count existing trivia
  const existingCount = await prisma.triviaFact.count();
  console.log(`📊 Existing trivia in database: ${existingCount}`);

  // Insert trivia
  let created = 0;
  let skipped = 0;

  for (const item of triviaData40) {
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
    }[stat.category as string] || "❓";
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
