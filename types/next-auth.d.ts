import { AdminRoleType, UserStatus } from "@/app/generated/prisma/enums";
import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      ign: string;
      role: AdminRoleType | null;
      status: UserStatus;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    ign: string;
    role: AdminRoleType | null;
    status: UserStatus;
    emailVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    ign: string;
    role: AdminRoleType | null;
    status: UserStatus;
    emailVerified: boolean;
  }
}
