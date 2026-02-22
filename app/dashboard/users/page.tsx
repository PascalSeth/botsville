"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Users } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  ign: string;
  status: string;
  mainRole?: string;
  role: string | null;
  createdAt?: string;
};

type Payload = {
  users: UserRow[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/admin/users?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setUsers([]);
      return;
    }
    setError(null);
    setUsers(data?.users ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [debouncedSearch, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            Users
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Browse and manage user accounts, status, and IGN. Assign admin roles from the Admin roles page.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search email or IGN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm w-48 outline-none focus:border-[#e8a000]/50"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="BANNED">BANNED</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">IGN</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Main role</th>
                  <th className="p-3">Admin role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{u.ign}</td>
                    <td className="p-3 text-[#aaa] text-sm">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : u.status === "BANNED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">{u.mainRole ?? "—"}</td>
                    <td className="p-3 text-[#e8a000] text-sm font-semibold">{u.role ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="p-3 border-t border-white/10 text-[10px] text-[#666] uppercase tracking-wider">
            Total: {pagination.total}
          </div>
        )}
      </div>
    </div>
  );
}
