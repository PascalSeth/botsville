# Fix Plan: TypeScript Errors in lib/api-utils.ts

## Overview

Three TypeScript errors need to be fixed in `lib/api-utils.ts`:

1. **TS2614**: `getServerSession` is not exported from `next-auth` (NextAuth v5 breaking change)
2. **TS2554**: `PrismaClient` constructor expects 1 argument (Prisma v7 requires adapter)
3. **ESLint**: Explicit `any` type should be replaced with proper typing

## Root Cause Analysis

### NextAuth v5 Migration

The project uses `next-auth@^5.0.0-beta.30`. In NextAuth v5:
- `getServerSession` has been **removed**
- `authOptions` pattern has been replaced with a new configuration pattern
- The new approach exports an `auth()` function directly from the NextAuth instance

### Prisma v7 with PrismaPg Adapter

The project uses `@prisma/client@^7.4.1` with `@prisma/adapter-pg`. In Prisma v7:
- `PrismaClient` constructor **requires** an `adapter` option when using driver adapters
- The correct pattern uses `PrismaPg` adapter with connection string

### Correct PrismaClient Pattern

```typescript
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
```

## Implementation Plan

### Step 1: Create Centralized Prisma Client

Create `lib/prisma.ts` to avoid duplicating PrismaClient setup across files:

```typescript
// lib/prisma.ts
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### Step 2: Update lib/auth-config.ts for NextAuth v5

Export the `auth` function from NextAuth:

```typescript
// lib/auth-config.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      // ... existing config
    }),
  ],
  callbacks: {
    // ... existing callbacks
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// Keep authOptions for backward compatibility if needed
export const authOptions = { /* config */ };
```

### Step 3: Update lib/api-utils.ts

```typescript
// lib/api-utils.ts
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { NextResponse } from "next/server";

/**
 * Get the current authenticated user session
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

// ... rest of the functions remain the same

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
```

### Step 4: Update lib/auth.ts

Replace local PrismaClient with centralized import:

```typescript
// lib/auth.ts
import { prisma } from "@/lib/prisma";
import { MainRole } from "@/app/generated/prisma/enums";
import bcrypt from "bcryptjs";

// Remove: import { prisma } from "@/lib/prisma";

// ... rest of the functions remain the same
```

### Step 5: Update app/api/auth/[...nextauth]/route.ts

Use the new NextAuth v5 handlers pattern:

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth-config";

export const { GET, POST } = handlers;
```

## Files to Modify

| File | Changes |
|------|---------|
| `lib/prisma.ts` | **CREATE** - Centralized PrismaClient with PrismaPg adapter |
| `lib/auth-config.ts` | **MODIFY** - Export `auth`, `handlers` from NextAuth; import prisma from lib/prisma |
| `lib/api-utils.ts` | **MODIFY** - Import `auth` and `prisma`; fix `any` type |
| `lib/auth.ts` | **MODIFY** - Import prisma from lib/prisma |
| `app/api/auth/[...nextauth]/route.ts` | **MODIFY** - Use handlers export |

## Benefits

1. **Single source of truth** for PrismaClient configuration
2. **Proper connection pooling** with global instance in development
3. **NextAuth v5 compatibility** with modern auth() pattern
4. **Type safety** with generic apiSuccess function
5. **No more workarounds** using `as any` casts

## Testing Checklist

- [ ] TypeScript compilation passes without errors
- [ ] ESLint passes without warnings
- [ ] Authentication flow works (login/logout)
- [ ] API routes that use prisma work correctly
- [ ] Session retrieval works with new auth() pattern
