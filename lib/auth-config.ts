import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

// Helper: throw a CredentialsSignin with a specific code so the
// client can map it to a human-readable message.
function authError(code: string): never {
  const err = new CredentialsSignin();
  err.code = code;
  throw err;
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        emailOrIgn: { label: "Email or IGN", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Starting authorization...");
        console.log("[AUTH] Credentials received:", {
          emailOrIgn: credentials?.emailOrIgn,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.emailOrIgn || !credentials?.password) {
          console.log("[AUTH] Missing credentials - throwing error");
          authError("missing_fields");
        }

        // Find user by email or IGN
        console.log("[AUTH] Looking up user by email or IGN:", credentials.emailOrIgn);
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.emailOrIgn },
              { ign: credentials.emailOrIgn },
            ],
          },
          include: {
            adminRole: true,
          },
        });

        if (!user) {
          console.log("[AUTH] User not found");
          authError("invalid_credentials");
        }

        console.log("[AUTH] User found:", {
          id: user.id,
          email: user.email,
          ign: user.ign,
          status: user.status,
          role: user.adminRole?.role || null,
        });

        // Check if user is deleted
        if (user.deletedAt) {
          console.log("[AUTH] User account is deleted:", user.deletedAt);
          authError("invalid_credentials"); // same message as not-found to avoid enumeration
        }

        // Check user status
        if (user.status === 'BANNED') {
          console.log("[AUTH] User account is banned");
          authError("account_banned");
        }

        if (user.status === 'SUSPENDED') {
          console.log("[AUTH] User account is suspended, checking suspension details");
          if (user.suspendedUntil && user.suspendedUntil > new Date()) {
            const daysLeft = Math.ceil(
              (user.suspendedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            console.log("[AUTH] Suspension active, days remaining:", daysLeft);
            // Encode details as part of the code using URL-safe base64
            const detail = Buffer.from(
              JSON.stringify({ until: user.suspendedUntil, reason: user.suspendReason || null, days: daysLeft })
            ).toString("base64url");
            authError(`account_suspended:${detail}`);
          } else {
            console.log("[AUTH] Suspension expired, allowing login");
          }
        }

        // Verify password
        console.log("[AUTH] Verifying password...");
        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          console.log("[AUTH] Invalid password");
          authError("invalid_credentials");
        }

        console.log("[AUTH] Password verified successfully");

        // Return user object for session
        const userSession = {
          id: user.id,
          email: user.email,
          ign: user.ign,
          name: user.ign, // Use IGN as display name
          image: user.photo || undefined,
          role: user.adminRole?.role || null,
          status: user.status,
          emailVerified: !!user.emailVerified,
          mainRole: user.mainRole ?? null,
        };

        console.log("[AUTH] Authorization successful, returning user:", {
          id: userSession.id,
          ign: userSession.ign,
          role: userSession.role,
        });

        return userSession;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("[AUTH-JWT] JWT callback triggered");
      // Initial sign in
      if (user) {
        console.log("[AUTH-JWT] Initial sign in, adding user data to token:", {
          id: user.id,
          ign: user.ign,
          role: user.role,
          status: user.status,
        });
        token.id = user.id;
        token.ign = user.ign;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = !!user.emailVerified;
        token.mainRole = user.mainRole ?? null;
      } else {
        console.log("[AUTH-JWT] Token refresh/verification, existing token:", {
          id: token.id,
          ign: token.ign,
          role: token.role,
        });
      }

      // Optionally refresh user status on token refresh (not on every request)
      // This runs when the token is refreshed, not on every API call
      // For real-time status checks, consider using middleware or API route checks

      return token;
    },
    async session({ session, token }) {
      console.log("[AUTH-SESSION] Session callback triggered");
      console.log("[AUTH-SESSION] Token data:", {
        id: token.id,
        ign: token.ign,
        role: token.role,
        status: token.status,
      });

      if (session.user) {
        // Refetch user data from database to get latest values (including updated IGN)
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              ign: true,
              photo: true,
              status: true,
              emailVerified: true,
              mainRole: true,
              adminRole: {
                select: { role: true },
              },
            },
          });

          if (freshUser) {
            session.user.id = freshUser.id;
            session.user.email = freshUser.email;
            session.user.ign = freshUser.ign;
            session.user.name = freshUser.ign; // Use IGN as display name
            session.user.image = freshUser.photo || undefined;
            session.user.role = freshUser.adminRole?.role || null;
            session.user.status = freshUser.status;
            session.user.mainRole = freshUser.mainRole ?? null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session.user as any).emailVerified = freshUser.emailVerified;
            console.log("[AUTH-SESSION] Session user populated with fresh DB data:", {
              id: session.user.id,
              ign: session.user.ign,
              role: session.user.role,
              status: session.user.status,
            });
          } else {
            // Fallback to token data if user not found
            session.user.id = token.id;
            session.user.ign = token.ign;
            session.user.role = token.role;
            session.user.status = token.status;
            session.user.mainRole = token.mainRole ?? null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session.user as any).emailVerified = token.emailVerified;
          }
        } catch (error) {
          console.error("[AUTH-SESSION] Error refetching user data:", error);
          // Fallback to token data on error
          session.user.id = token.id;
          session.user.ign = token.ign;
          session.user.role = token.role;
          session.user.status = token.status;
          session.user.mainRole = token.mainRole ?? null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).emailVerified = token.emailVerified;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for Netlify deploy previews and other cloud hosting
});
