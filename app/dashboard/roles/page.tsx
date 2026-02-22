"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Shield, UserPlus, Trash2, Loader2 } from "lucide-react";

const ROLES = ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "CONTENT_ADMIN", "REFEREE"] as const;

type AdminRoleRow = {
  id: string;
  userId: string;
  role: string;
  assignedAt: string;
  user: { id: string; email: string; ign: string; status: string };
};

type UserRow = {
  id: string;
  email: string;
  ign: string;
  status: string;
  role: string | null;
};

export default function DashboardRolesPage() {
  const [roles, setRoles] = useState<AdminRoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState<string>(ROLES[0]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);

  const loadRoles = useCallback(async () => {
    const { data, error: err } = await dashboardFetch<AdminRoleRow[]>("/api/admin/roles");
    if (err) {
      setError(err);
      setRoles([]);
      return;
    }
    setError(null);
    setRoles(Array.isArray(data) ? data : []);
  }, []);

  const searchUsers = useCallback(async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    const { data, error: err } = await dashboardFetch<{ users: UserRow[] }>(
      `/api/admin/users?search=${encodeURIComponent(userSearch.trim())}&limit=20`
    );
    setSearching(false);
    if (err || !data?.users) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchResults(data.users);
  }, [userSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadRoles();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRoles]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignRole) return;
    setAssigning(true);
    setError(null);
    const { data, error: err } = await dashboardFetch<{ message: string }>("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify({ userId: assignUserId, role: assignRole }),
    });
    setAssigning(false);
    if (err) {
      setError(err);
      return;
    }
    setAssignUserId("");
    setUserSearch("");
    setUserSearchResults([]);
    await loadRoles();
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Revoke this admin role? The user will lose admin access.")) return;
    setRevoking(userId);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/admin/roles/${userId}`, { method: "DELETE" });
    setRevoking(null);
    if (err) {
      setError(err);
      return;
    }
    await loadRoles();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          Admin roles
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Assign or revoke SUPER_ADMIN, TOURNAMENT_ADMIN, CONTENT_ADMIN, REFEREE. Only SUPER_ADMIN can manage roles.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Assign role form */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] mb-4 flex items-center gap-2">
          <UserPlus size={16} /> Assign role
        </h2>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
              Search user (email or IGN)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onBlur={searchUsers}
                placeholder="Type then blur or press Enter"
                className="flex-1 bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
              <button
                type="button"
                onClick={searchUsers}
                disabled={searching}
                className="px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e8a000]/20 border border-[#e8a000]/30 disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>
            {userSearchResults.length > 0 && (
              <ul className="mt-2 border border-white/10 divide-y divide-white/5 max-h-40 overflow-y-auto">
                {userSearchResults.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/5">
                    <span className="text-sm text-white">{u.ign} · {u.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignUserId(u.id);
                        setUserSearchResults([]);
                        setUserSearch(u.ign);
                      }}
                      className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline"
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                User (selected)
              </label>
              <input
                type="text"
                value={assignUserId ? (userSearch || assignUserId.slice(0, 8)) : ""}
                readOnly
                placeholder="Search and select a user"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                Role
              </label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!assignUserId || assigning}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {assigning ? <Loader2 size={14} className="animate-spin" /> : null}
            Assign role
          </button>
        </form>
      </div>

      {/* Current admins table */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] p-4 flex items-center gap-2">
          <Shield size={16} /> Current admins
        </h2>
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No admin roles assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-t border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned</th>
                  <th className="p-3 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{r.user?.ign ?? "—"}</td>
                    <td className="p-3 text-[#aaa] text-sm">{r.user?.email ?? "—"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#e8a000]/20 text-[#e8a000] text-xs font-bold">
                        {r.role}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">
                      {r.assignedAt ? new Date(r.assignedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRevoke(r.userId)}
                        disabled={revoking === r.userId}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-1 disabled:opacity-50"
                      >
                        {revoking === r.userId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
