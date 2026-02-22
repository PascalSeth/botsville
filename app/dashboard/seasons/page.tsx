"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Calendar, Plus, Loader2 } from "lucide-react";

type Season = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  _count?: { tournaments: number; teamStandings: number };
};

export default function DashboardSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("UPCOMING");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await dashboardFetch<Season[]>("/api/seasons");
    setLoading(false);
    if (err) {
      setError(err);
      setSeasons([]);
      return;
    }
    setError(null);
    setSeasons(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    setCreating(true);
    setError(null);
    const { error: err } = await dashboardFetch("/api/seasons", {
      method: "POST",
      body: JSON.stringify({ name, startDate, endDate, status: status || "UPCOMING" }),
    });
    setCreating(false);
    if (err) {
      setError(err);
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    setShowForm(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            Seasons
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Create and manage seasons. Only one season can be ACTIVE at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
        >
          <Plus size={16} /> New season
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] mb-4 flex items-center gap-2">
            <Calendar size={16} /> Create season
          </h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Season 6"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value="UPCOMING">UPCOMING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : seasons.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No seasons yet. Create one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Tournaments</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{s.name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : s.status === "COMPLETED"
                              ? "bg-[#666]/20 text-[#888]"
                              : "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{new Date(s.startDate).toLocaleDateString()}</td>
                    <td className="p-3 text-[#aaa] text-sm">{new Date(s.endDate).toLocaleDateString()}</td>
                    <td className="p-3 text-[#666] text-sm">{s._count?.tournaments ?? 0}</td>
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
