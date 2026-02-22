"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Palette, Check, X, Loader2 } from "lucide-react";

type Artwork = {
  id: string;
  title: string;
  imageUrl: string;
  approved: boolean;
  rejectionReason: string | null;
  urgentReview: boolean;
  createdAt: string;
  artist?: { id: string; ign: string } | null;
  _count?: { reports: number };
};

type Payload = {
  artworks: Artwork[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardFanArtPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"" | "pending" | "approved">("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (filter === "pending") params.set("approved", "false"); // pending = not yet approved
    if (filter === "approved") params.set("approved", "true");
    const { data, error: err } = await dashboardFetch<Payload>(`/api/fan-art?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setArtworks([]);
      return;
    }
    setError(null);
    setArtworks(data?.artworks ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApproveReject = async (artworkId: string, action: "approve" | "reject", rejectionReason?: string) => {
    setActing(artworkId);
    setError(null);
    const { error: err } = await dashboardFetch("/api/fan-art", {
      method: "PUT",
      body: JSON.stringify({
        artworkId,
        action,
        rejectionReason: action === "reject" ? rejectionReason || "Rejected by moderator" : undefined,
      }),
    });
    setActing(null);
    if (err) {
      setError(err);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
            Fan art
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Approve or reject fan art submissions with a reason. Review reported pieces.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | "pending" | "approved")}
          className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : artworks.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No fan art found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Title</th>
                  <th className="p-3">Artist</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reports</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artworks.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{a.title}</td>
                    <td className="p-3 text-[#aaa] text-sm">{a.artist?.ign ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          a.approved
                            ? "bg-emerald-500/20 text-emerald-400"
                            : a.rejectionReason
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}
                      >
                        {a.approved ? "Approved" : a.rejectionReason ? "Rejected" : "Pending"}
                      </span>
                      {a.urgentReview && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-400 text-[10px]">Urgent</span>
                      )}
                    </td>
                    <td className="p-3 text-[#666] text-sm">{a._count?.reports ?? 0}</td>
                    <td className="p-3 text-[#666] text-sm">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      {!a.approved && !a.rejectionReason && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={acting === a.id}
                            onClick={() => handleApproveReject(a.id, "approve")}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase disabled:opacity-50"
                          >
                            {acting === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={acting === a.id}
                            onClick={() => handleApproveReject(a.id, "reject")}
                            className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-bold uppercase disabled:opacity-50"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      )}
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
