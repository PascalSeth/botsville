import { prisma } from "../lib/prisma";

// All MLBB heroes
const HEROES = [
  // A
  "Akai", "Aldous", "Alice", "Alpha", "Alucard", "Angela", "Argus", "Atlas", "Aurora",
  // B
  "Badang", "Balmond", "Bane", "Barats", "Baxia", "Belerick", "Benedetta", "Brody", "Bruno",
  // C
  "Carmilla", "Cecilion", "Chang'e", "Claude", "Clint", "Cyclops", "Cici",
  // D
  "Diggie", "Dyrroth",
  // E
  "Edith", "Esmeralda", "Estes", "Eudora",
  // F
  "Fanny", "Faramis", "Floryn", "Fredrinn", "Franco", "Freya",
  // G
  "Gatotkaca", "Gloo", "Gord", "Granger", "Grock", "Guinevere", "Gusion",
  // H
  "Hanabi", "Hanzo", "Harith", "Harley", "Hayabusa", "Helcurt", "Hilda", "Hylos",
  // I
  "Irithel",
  // J
  "Jawhead", "Johnson", "Joy", "Julian",
  // K
  "Kadita", "Kagura", "Kaja", "Karina", "Karrie", "Khaleed", "Khufra", "Kimmy",
  // L
  "Lancelot", "Lapu-Lapu", "Layla", "Leomord", "Lesley", "Ling", "Lolita", "Lunox", "Luo Yi", "Lylia",
  // M
  "Martis", "Masha", "Melissa", "Minotaur", "Minsitthar", "Miya", "Moskov",
  // N
  "Nana", "Natalia", "Nolan", "Novaria",
  // O
  "Odette",
  // P
  "Paquito", "Pharsa", "Phoveus", "Popol and Kupa",
  // R
  "Rafaela", "Roger", "Ruby",
  // S
  "Saber", "Selena", "Silvanna", "Sun",
  // T
  "Terizla", "Thamuz", "Tigreal",
  // U
  "Uranus",
  // V
  "Valentina", "Valir", "Vale", "Vexana",
  // W
  "Wanwan",
  // X
  "Xavier", "X.Borg",
  // Y
  "Yi Sun-shin", "Yin", "Yu Zhong",
  // Z
  "Zhask", "Zhuxin", "Zilong",
];

function toHeroKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  console.log("🦸 Seeding MLBB heroes...\n");

  let added = 0;
  let skipped = 0;

  for (const heroName of HEROES) {
    const key = toHeroKey(heroName);

    const existing = await prisma.heroCatalog.findUnique({ where: { key } });
    if (existing) {
      console.log(`  ⏭️  ${heroName} (${key}) - already exists`);
      skipped++;
      continue;
    }

    await prisma.heroCatalog.create({
      data: {
        key,
        name: heroName,
        imageUrl: null, // No image yet
        active: true,
      },
    });

    console.log(`  ✅ ${heroName} (${key})`);
    added++;
  }

  console.log(`\n✨ Done! Added: ${added}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
