-- =============================================================================
-- Seed the first SUPER_ADMIN (bootstrap) — role only, no password
-- The user must already exist. Passwords are hashed with bcrypt in the app;
-- you cannot set a plain password here.
--
-- To create the first admin WITH a password (recommended), use the Node script:
--   ADMIN_EMAIL=... ADMIN_IGN=... ADMIN_PASSWORD=... npx tsx scripts/seed-first-super-admin.ts
-- =============================================================================

-- Option A: Assign SUPER_ADMIN to an existing user by EMAIL
-- Replace 'admin@example.com' with the account that should be the first admin.
INSERT INTO admin_roles (id, "userId", role, "assignedBy", "assignedAt")
SELECT
  gen_random_uuid(),
  u.id,
  'SUPER_ADMIN',
  NULL,
  NOW()
FROM users u
WHERE u.email = 'admin@example.com'
  AND u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar WHERE ar."userId" = u.id
  );

-- Option B: Assign SUPER_ADMIN to an existing user by USER ID (uncomment and use)
-- Replace '<your-user-uuid>' with the actual user id from the users table.
/*
INSERT INTO admin_roles (id, "userId", role, "assignedBy", "assignedAt")
VALUES (
  gen_random_uuid(),
  '<your-user-uuid>',
  'SUPER_ADMIN',
  NULL,
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;
*/

-- Verify (optional): list admin roles
-- SELECT ar.id, ar.role, ar."assignedAt", u.email, u.ign FROM admin_roles ar JOIN users u ON u.id = ar."userId";
