"use client";

import { useRoleGuard, useRole } from "../lib/useRole";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardFetch } from "../lib/api";

type Team = {
  id: string;
  name: string;
  tag: string;
  region: string;
  status: string;
  captain?: { id: string; ign: string } | null;
  _count?: { players: number };
  rank?: number;
  points?: number;
};

type Payload = { teams: Team[]; pagination: { total: number; limit: number; skip: number } };

export default function DashboardTeamsPage() {
  const { isAllowed: __roleAllowed } = useRoleGuard(["TOURNAMENT_ADMIN"]);
  const { role } = useRole();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status) params.set("status", status);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/teams?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setTeams([]);
      return;
    }
    setError(null);
    setTeams(data?.teams ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    if (!confirm("Are you sure you want to merge these teams? The source team will be disbanded and players transferred as substitutes.")) return;
    
    setIsMerging(true);
    try {
      const res = await dashboardFetch<{ message?: string }>(`/api/admin/teams/merge`, {
        method: "POST",
        body: JSON.stringify({ sourceTeamId: mergeSource, targetTeamId: mergeTarget }),
      });
      if (res.error) {
        setError(res.error);
      } else {
        setError(null);
        setMergeSource("");
        setMergeTarget("");
        alert(res.data?.message || "Teams merged successfully!");
        await load();
      }
    } catch (err: any) {
      setError(err.message || "Failed to merge teams");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            Teams
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            View and manage teams, status, and suspensions.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* MERGE TEAMS ADMIN PANEL */}
      {role === "SUPER_ADMIN" && (
        <div className="p-4 bg-[#0a0a0f] border border-white/10 rounded-lg flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-[#666] uppercase tracking-wider mb-1">Target Team (Keeps Identity)</label>
            <select 
              value={mergeTarget} 
              onChange={e => setMergeTarget(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none"
            >
              <option value="">-- Select Target Team --</option>
              {teams.filter(t => t.id !== mergeSource && t.status === 'ACTIVE').map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t._count?.players ?? 0}/20)</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-[#666] uppercase tracking-wider mb-1">Source Team (Disbands & Joins Target)</label>
            <select 
              value={mergeSource} 
              onChange={e => setMergeSource(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none"
            >
              <option value="">-- Select Source Team --</option>
              {teams.filter(t => t.id !== mergeTarget && t.status === 'ACTIVE').map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t._count?.players ?? 0}/20)</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleMerge}
            disabled={!mergeTarget || !mergeSource || isMerging}
            className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
          >
            {isMerging ? "Merging..." : "Merge Teams"}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No teams found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Name</th>
                  <th className="p-3">Tag</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Captain</th>
                  <th className="p-3">Players</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <Link href={`/dashboard/teams/${t.id}`} className="text-white font-semibold hover:text-[#e8a000] transition-colors">
                        {t.name}
                      </Link>
                    </td>
                    <td className="p-3 text-[#e8a000] font-mono text-sm">{t.tag}</td>
                    <td className="p-3 text-[#aaa] text-sm">{t.region}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          t.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : t.status === "SUSPENDED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#666]/20 text-[#888]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{t.captain?.ign ?? "—"}</td>
                    <td className="p-3 text-[#666] text-sm flex items-center justify-between gap-3">
                      <span>{t._count?.players ?? 0}</span>
                      <button
                        onClick={async () => {
                          if (!confirm(`Disband team "${t.name}"? This will remove it from the league.`)) return;
                          const res = await dashboardFetch<{ message?: string }>(`/api/admin/teams/${t.id}/disband`, {
                            method: "DELETE",
                          });
                          if (res.error) {
                            setError(res.error);
                            return;
                          }
                          setError(null);
                          await load();
                        }}
                        className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Disband team (admin only)"
                      >
                        Disband
                      </button>
                    </td>
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
