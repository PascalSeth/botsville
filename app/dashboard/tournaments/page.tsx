"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardFetch } from "../lib/api";
import { Trophy, Plus, Loader2 } from "lucide-react";

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  date: string;
  format: string;
  filled?: number;
  season?: { id: string; name: string } | null;
  _count?: { registrations: number; matches: number };
};

type Payload = {
  tournaments: Tournament[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status) params.set("status", status);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/tournaments?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setTournaments([]);
      return;
    }
    setError(null);
    setTournaments(data?.tournaments ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            Tournaments
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Create and manage tournaments, registrations, brackets, and prizes.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All statuses</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ONGOING">ONGOING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <Link
            href="/dashboard/tournaments/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
          >
            <Plus size={16} /> New
          </Link>
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
        ) : tournaments.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No tournaments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Name</th>
                  <th className="p-3">Season</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Registrations</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{t.name}</td>
                    <td className="p-3 text-[#aaa] text-sm">{t.season?.name ?? "—"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#e8a000]/20 text-[#e8a000]">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-3 text-[#666] text-sm">{t.format}</td>
                    <td className="p-3 text-[#666] text-sm">{t.filled ?? t._count?.registrations ?? 0}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/matches?tournamentId=${t.id}`}
                        className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline"
                      >
                        Matches
                      </Link>
                      {" · "}
                      <Link
                        href={`/dashboard/tournaments/${t.id}`}
                        className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline"
                      >
                        View
                      </Link>
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
