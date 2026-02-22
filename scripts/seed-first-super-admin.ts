/**
 * Create the first SUPER_ADMIN user with email, IGN, and password.
 * Uses the same bcrypt hashing as the app. Run once after deployment.
 *
 * Usage (set env vars, then run):
 *   ADMIN_EMAIL=admin@example.com ADMIN_IGN=Admin ADMIN_PASSWORD=YourSecurePassword123 npx tsx scripts/seed-first-super-admin.ts
 *
 * Or create a .env.local with ADMIN_EMAIL, ADMIN_IGN, ADMIN_PASSWORD and run:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-first-super-admin.ts
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { MainRole } from "../app/generated/prisma/enums";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_IGN = "Admin";
const ADMIN_PASSWORD = "YourSecurePassword123";

async function main() {
  if (ADMIN_PASSWORD.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: ADMIN_EMAIL }, { ign: ADMIN_IGN }],
    },
    include: { adminRole: true },
  });

  if (existingUser) {
    if (existingUser.adminRole) {
      console.log(
        `User ${existingUser.email} already has role ${existingUser.adminRole.role}. Nothing to do.`
      );
      return;
    }
    // User exists but has no admin role — assign SUPER_ADMIN
    await prisma.adminRole.create({
      data: {
        userId: existingUser.id,
        role: "SUPER_ADMIN",
        assignedBy: null,
      },
    });
    console.log(`Assigned SUPER_ADMIN to existing user: ${existingUser.email}`);
    return;
  }

  // Create new user with hashed password, then assign SUPER_ADMIN
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      ign: ADMIN_IGN,
      password: hashedPassword,
      mainRole: MainRole.SUPPORT,
      emailVerified: false,
    },
  });

  await prisma.adminRole.create({
    data: {
      userId: user.id,
      role: "SUPER_ADMIN",
      assignedBy: null,
    },
  });

  console.log(
    `Created first SUPER_ADMIN: ${user.email} (IGN: ${user.ign}). You can log in at /login.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
