"use client";

import { useState, useEffect, useCallback } from "react";
import { GitMerge, X, Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { dashboardFetch } from "../lib/api";

type UserRow = {
  id: string;
  email: string;
  ign: string;
  status: string;
  mainRole?: string;
  role: string | null;
  createdAt?: string;
};

type UserWithTeam = UserRow & {
  teamName: string | null;
};

type PlaceholderPlayer = {
  id: string;
  ign: string;
  matchesPlayed: number;
  mvpCount: number;
  winRate: number;
  team?: { name: string; tag: string } | null;
};

type Payload = {
  users: UserWithTeam[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "placeholders">("users");
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [orphanedPlaceholders, setOrphanedPlaceholders] = useState<PlaceholderPlayer[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Merge Flow State
  const [mergingUser, setMergingUser] = useState<UserWithTeam | null>(null);
  const [mergingPlaceholder, setMergingPlaceholder] = useState<PlaceholderPlayer | null>(null);
  const [userSearchText, setUserSearchText] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserWithTeam[]>([]);
  const [phSearch, setPhSearch] = useState("");
  const [placeholders, setPlaceholders] = useState<PlaceholderPlayer[]>([]); // Results for search in modal
  const [searchingPh, setSearchingPh] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [submittingMerge, setSubmittingMerge] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (debouncedSearch) params.set("search", debouncedSearch);

    if (activeTab === "users") {
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
    } else {
      // Placeholders Tab
      const { data, error: err } = await dashboardFetch<PlaceholderPlayer[]>(`/api/admin/players?isPlaceholder=true&${params}`);
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        setOrphanedPlaceholders(data ?? []);
        setError(null);
        setPagination({ total: data?.length ?? 0, limit: 50, skip: 0 });
      }
    }
  }, [debouncedSearch, status, activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchPlaceholders = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPlaceholders([]);
      return;
    }
    setSearchingPh(true);
    const { data } = await dashboardFetch<PlaceholderPlayer[]>(`/api/admin/players?isPlaceholder=true&search=${encodeURIComponent(query)}`);
    setPlaceholders(data ?? []);
    setSearchingPh(false);
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUser(true);
    const { data } = await dashboardFetch<Payload>(`/api/admin/users?search=${encodeURIComponent(query)}`);
    setUserSearchResults(data?.users ?? []);
    setSearchingUser(false);
  }, []);

  const handleMerge = async (playerId: string, targetUserId?: string) => {
    const userId = targetUserId || mergingUser?.id;
    if (!userId) return;

    if (!confirm(`Are you sure? This will transfer all historical match data to the selected account and permanently link the identities.`)) return;

    setSubmittingMerge(true);
    setMergeError(null);
    try {
      const res = await fetch("/api/admin/players/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, placeholderPlayerId: playerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMergeError(data.error || "Merge failed");
      } else {
        setMergeSuccess("Player records merged successfully!");
        setTimeout(() => {
          setMergingUser(null);
          setMergingPlaceholder(null);
          setMergeSuccess(null);
          void load();
        }, 1500);
      }
    } catch (err) {
      setMergeError("An unexpected error occurred");
    } finally {
      setSubmittingMerge(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            User Directory
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            {activeTab === "users"
              ? "Manage registered user accounts and link historical data."
              : "Historical player records not yet linked to an account."}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm w-48 outline-none focus:border-[#e8a000]/50"
          />
          {activeTab === "users" && (
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
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === "users" ? "text-[#e8a000]" : "text-[#444] hover:text-white"
            }`}
        >
          Active Players
          {activeTab === "users" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8a000]" />}
        </button>
        <button
          onClick={() => setActiveTab("placeholders")}
          className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === "placeholders" ? "text-[#e8a000]" : "text-[#444] hover:text-white"
            }`}
        >
          Unclaimed Records
          {activeTab === "placeholders" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8a000]" />}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-[#444] font-black uppercase tracking-widest animate-pulse">
            Loading {activeTab === "users" ? "Users" : "Orphaned Records"}...
          </div>
        ) : (activeTab === "users" ? users.length === 0 : orphanedPlaceholders.length === 0) ? (
          <div className="p-8 text-center text-[#666]">No {activeTab} found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666] bg-white/[0.02]">
                  {activeTab === "users" ? (
                    <>
                      <th className="p-4">IGN</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Admin Role</th>
                      <th className="p-4">Team</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4">IGN (Placeholder)</th>
                      <th className="p-4">Matches</th>
                      <th className="p-4">Win Rate</th>
                      <th className="p-4">Team</th>
                    </>
                  )}
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "users" ? (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] group transition-colors">
                      <td className="p-4">
                        <div className="text-white font-bold tracking-tight">{u.ign}</div>
                        <div className="text-[10px] text-[#444] uppercase tracking-tighter">{u.mainRole ?? "NO ROLE"}</div>
                      </td>
                      <td className="p-4 text-[#aaa] text-sm font-medium">{u.email}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : u.status === "BANNED"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-[#e8a000]/10 text-[#e8a000] border border-[#e8a000]/20"
                            }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-[#e8a000] text-[10px] font-black uppercase tracking-widest">{u.role ?? "—"}</td>
                      <td className="p-4 text-white text-[10px] font-black uppercase tracking-widest">{u.teamName ?? "—"}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setMergingUser(u);
                            setMergingPlaceholder(null);
                            setPhSearch(u.ign);
                            searchPlaceholders(u.ign);
                          }}
                          className="p-2 text-[#666] hover:text-[#e8a000] transition-colors rounded-lg hover:bg-[#e8a000]/10 border border-transparent hover:border-[#e8a000]/20 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          title="Merge Placeholder"
                        >
                          <GitMerge size={14} />
                          Merge
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  orphanedPlaceholders.map((ph) => (
                    <tr key={ph.id} className="border-b border-white/5 hover:bg-white/[0.02] group transition-colors text-xs">
                      <td className="p-4">
                        <div className="text-white font-bold tracking-tight">{ph.ign}</div>
                      </td>
                      <td className="p-4 text-[#aaa] font-bold">{ph.matchesPlayed} Matches</td>
                      <td className="p-4 text-emerald-400 font-bold">{Math.round(ph.winRate)}%</td>
                      <td className="p-4 text-[#e8a000] text-[10px] font-black uppercase tracking-widest">{ph.team?.name ?? "—"}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setMergingPlaceholder(ph);
                            setMergingUser(null);
                            setUserSearchText(ph.ign);
                            searchUsers(ph.ign);
                          }}
                          className="p-2 text-[#666] hover:text-[#e8a000] transition-colors rounded-lg hover:bg-[#e8a000]/10 border border-transparent hover:border-[#e8a000]/20 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          title="Link to User Account"
                        >
                          <GitMerge size={14} />
                          Link Account
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="p-4 border-t border-white/10 text-[10px] text-[#444] font-black uppercase tracking-widest flex justify-between items-center bg-white/[0.01]">
            <span>Total: {pagination.total} {activeTab === "users" ? "Users" : "Orphaned Records"}</span>
          </div>
        )}
      </div>

      {/* MERGE MODAL (TWO-WAY) */}
      {(mergingUser || mergingPlaceholder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <GitMerge size={16} className="text-[#e8a000]" />
                  {mergingUser ? "Merge Player Records" : "Link Record to Account"}
                </h2>
                <p className="text-[10px] text-[#666] uppercase font-bold tracking-tighter mt-0.5">
                  {mergingUser
                    ? `Target: ${mergingUser.ign} (${mergingUser.email})`
                    : `Source: ${mergingPlaceholder?.ign} (${mergingPlaceholder?.team?.name ?? "No Team"})`}
                </p>
              </div>
              <button
                onClick={() => {
                  setMergingUser(null);
                  setMergingPlaceholder(null);
                  setMergeError(null);
                  setMergeSuccess(null);
                }}
                className="text-[#444] hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {mergeSuccess ? (
                <div className="py-8 text-center space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-emerald-400 font-black uppercase tracking-widest text-sm">{mergeSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#666]">
                      {mergingUser ? "Search Orphaned Placeholders" : "Search Registered Users"}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" size={16} />
                      <input
                        type="text"
                        value={mergingUser ? phSearch : userSearchText}
                        onChange={(e) => {
                          if (mergingUser) {
                            setPhSearch(e.target.value);
                            searchPlaceholders(e.target.value);
                          } else {
                            setUserSearchText(e.target.value);
                            searchUsers(e.target.value);
                          }
                        }}
                        autoFocus
                        placeholder={mergingUser ? "Search IGN..." : "Search Email or IGN..."}
                        className="w-full bg-[#0d0d14] border border-white/10 text-white pl-10 pr-4 py-3 text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#666]">
                        Results ({mergingUser ? placeholders.length : userSearchResults.length})
                      </span>
                      {(searchingPh || searchingUser) && <Loader2 size={12} className="animate-spin text-[#e8a000]" />}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {mergingUser ? (
                        placeholders.length === 0 ? (
                          <div className="p-6 text-center border border-dashed border-white/5 rounded text-[10px] text-[#444] font-black uppercase tracking-widest">
                            {phSearch.length < 2 ? "Type to search..." : "No matching placeholders found"}
                          </div>
                        ) : (
                          placeholders.map((ph) => (
                            <div
                              key={ph.id}
                              className="p-4 border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center justify-between rounded group"
                            >
                              <div>
                                <div className="text-white font-bold tracking-tight">{ph.ign}</div>
                                <div className="text-[10px] text-[#e8a000] uppercase font-black tracking-widest">
                                  {ph.team?.name ?? "No Team"}
                                </div>
                              </div>
                              <button
                                onClick={() => handleMerge(ph.id)}
                                disabled={submittingMerge}
                                className="px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] text-[10px] font-black uppercase tracking-widest hover:bg-[#e8a000]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {submittingMerge ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                                Link & Move
                              </button>
                            </div>
                          ))
                        )
                      ) : (
                        userSearchResults.length === 0 ? (
                          <div className="p-6 text-center border border-dashed border-white/5 rounded text-[10px] text-[#444] font-black uppercase tracking-widest">
                            {userSearchText.length < 2 ? "Type to search users..." : "No matching users found"}
                          </div>
                        ) : (
                          userSearchResults.map((u) => (
                            <div
                              key={u.id}
                              className="p-4 border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center justify-between rounded group"
                            >
                              <div>
                                <div className="text-white font-bold tracking-tight">{u.ign}</div>
                                <div className="text-[10px] text-[#666] uppercase font-bold tracking-widest">
                                  {u.email}
                                </div>
                              </div>
                              <button
                                onClick={() => handleMerge(mergingPlaceholder?.id!, u.id)}
                                disabled={submittingMerge}
                                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {submittingMerge ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                                Link to Account
                              </button>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>

                  {mergeError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
                      <AlertCircle className="text-red-400 shrink-0" size={14} />
                      <p className="text-red-300 text-[10px] leading-relaxed font-bold uppercase tracking-tight">{mergeError}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[9px] text-[#444] font-bold uppercase tracking-tighter text-center leading-relaxed">
                      NOTE: Merging cannot be undone. Historical matches and records from the placeholder will be absorbed into the selected account.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
