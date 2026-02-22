"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Video, Check, X, Loader2 } from "lucide-react";

type VideoItem = {
  id: string;
  title: string;
  videoUrl: string;
  matchup: string | null;
  status: string;
  featured: boolean;
  createdAt: string;
  tournament?: { id: string; name: string } | null;
  submittedBy?: { id: string; ign: string } | null;
};

type Payload = {
  videos: VideoItem[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardScrimVaultPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status) params.set("status", status);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/scrim-vault?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setVideos([]);
      return;
    }
    setError(null);
    setVideos(data?.videos ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApproveReject = async (videoId: string, action: "approve" | "reject", rejectionReason?: string) => {
    setActing(videoId);
    setError(null);
    const { error: err } = await dashboardFetch("/api/scrim-vault", {
      method: "PUT",
      body: JSON.stringify({ videoId, action, rejectionReason: action === "reject" ? rejectionReason || "Rejected by admin" : undefined }),
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
            Scrim vault
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Approve or reject team-submitted YouTube scrim links. Set featured for homepage.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
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
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No videos found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Title</th>
                  <th className="p-3">Submitted by</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Featured</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{v.title}</td>
                    <td className="p-3 text-[#aaa] text-sm">{v.submittedBy?.ign ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          v.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : v.status === "REJECTED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">{v.featured ? "Yes" : "No"}</td>
                    <td className="p-3 text-[#666] text-sm">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      {v.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={acting === v.id}
                            onClick={() => handleApproveReject(v.id, "approve")}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase disabled:opacity-50"
                          >
                            {acting === v.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={acting === v.id}
                            onClick={() => handleApproveReject(v.id, "reject")}
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
