"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/** Read the admin role from the session on the client. */
export function useRole() {
  const { data: session, status } = useSession();
  const actualRole = (session?.user as { role?: string | null } | undefined)?.role ?? null;
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  return {
    role: actualRole,
    actualRole,
    userId,
    loading: status === "loading",
  };
}

/** Utility to update the simulated role (no-op cleanup) */
export function setSimulatedRole(_role: string | null) {
  if (typeof window !== "undefined") {
    localStorage.removeItem("simulatedRole");
  }
}

/**
 * Redirect to /dashboard when the current role is not in the allowed list.
 * SUPER_ADMIN always passes. Returns isAllowed so pages can hold rendering.
 */
export function useRoleGuard(allowed: string[]) {
  const { role, actualRole, userId, loading } = useRole();
  const router = useRouter();

  // The guard should evaluate strictly based on the active role (which is the simulated role if active)
  const isAllowed =
    !loading &&
    (role === "SUPER_ADMIN" || (!!role && allowed.includes(role)));

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace("/dashboard");
    }
  }, [loading, isAllowed, router]);

  return { role, actualRole, userId, loading, isAllowed };
}
