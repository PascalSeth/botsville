"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2 } from "lucide-react";

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  status: string;
  category: string;
};

const CATEGORIES = ["PATCH_NOTES", "NEW_EVENT", "NEW_HERO"];
const STATUSES = ["DRAFT", "PUBLISHED"];

export default function NewsEditPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [category, setCategory] = useState("NEW_EVENT");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await dashboardFetch<Article>(`/api/news/${id}`);
      setLoading(false);
      if (err) {
        setError(err);
        setArticle(null);
        return;
      }
      const a = data as Article | undefined;
      setArticle(a ?? null);
      if (a) {
        setTitle(a.title);
        setSubtitle(a.subtitle ?? "");
        setBody(a.body ?? "");
        setStatus(a.status);
        setCategory(a.category);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/news/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, subtitle: subtitle || null, body: body || null, status, category }),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setArticle((a) => (a ? { ...a, title, subtitle, body, status, category } : null));
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← News</Link>
        <p className="text-[#666]">Missing article ID.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[#666]">Loading...</div>;
  if (error && !article) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← News</Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }
  if (!article) return <div className="p-8 text-[#666]">Article not found.</div>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← News</Link>
      <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">Edit article</h1>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 max-w-2xl space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-y"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </button>
          <Link href="/dashboard/news" className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
