"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardFetch } from "../lib/api";
import { Newspaper } from "lucide-react";

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  category: string;
  publishedAt: string | null;
  createdAt: string;
  _count?: { reactions: number };
};

type Payload = {
  articles: Article[];
  pagination: { total: number; limit: number; skip: number };
};

export default function DashboardNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status) params.set("status", status);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/news?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setArticles([]);
      return;
    }
    setError(null);
    setArticles(data?.articles ?? []);
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
            News
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Create and publish news (DRAFT / PUBLISHED). Categories: PATCH_NOTES, NEW_EVENT, NEW_HERO.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
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
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No articles yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Published</th>
                  <th className="p-3">Reactions</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold">{a.title}</td>
                    <td className="p-3 text-[#aaa] text-sm">{a.category}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          a.status === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#666]/20 text-[#888]"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-[#666] text-sm">{a._count?.reactions ?? 0}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/news/${a.id}`}
                        className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline"
                      >
                        Edit
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
