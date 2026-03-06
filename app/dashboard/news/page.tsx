"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import { Plus, Loader2, X, Upload } from "lucide-react";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";

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

const CATEGORIES = ["PATCH_NOTES", "NEW_EVENT", "NEW_HERO"];
const STATUSES = ["DRAFT", "PUBLISHED"];

export default function DashboardNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("NEW_EVENT");
  const [newStatus, setNewStatus] = useState("DRAFT");
  const [newImage, setNewImage] = useState("");
  const [newFeatured, setNewFeatured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const resetCreateForm = () => {
    setNewTitle("");
    setNewSubtitle("");
    setNewBody("");
    setNewCategory("NEW_EVENT");
    setNewStatus("DRAFT");
    setNewImage("");
    setNewFeatured(false);
    setCreateError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `news/${Date.now()}-${safeName}`;
    const { url, error } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
    if (!error && url) {
      setNewImage(url);
    } else {
      setCreateError("Failed to upload image");
    }
    setUploadingImage(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Title is required");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const { error: err } = await dashboardFetch("/api/news", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || null,
        body: newBody.trim() || null,
        category: newCategory,
        status: newStatus,
        image: newImage.trim() || null,
        featured: newFeatured,
      }),
    });

    setCreating(false);
    if (err) {
      setCreateError(err);
      return;
    }

    resetCreateForm();
    setShowCreate(false);
    load();
  };

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
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
          >
            <Plus size={14} /> Create
          </button>
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border border-white/10 rounded-lg p-6">
            <button
              onClick={() => { setShowCreate(false); resetCreateForm(); }}
              className="absolute top-4 right-4 text-[#666] hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="font-black text-xl tracking-tight text-white uppercase tracking-[0.08em] mb-6">
              Create Article
            </h2>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                  placeholder="Article title..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  placeholder="Optional subtitle..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
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
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Image</label>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
                  >
                    {uploadingImage ? (
                      <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload size={16} /> Click to upload image</>
                    )}
                  </label>
                  {newImage && (
                    <div className="relative w-full h-32 rounded overflow-hidden">
                      <Image src={newImage} alt="Preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => { setNewImage(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-white hover:bg-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newFeatured}
                  onChange={(e) => setNewFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#e8a000]"
                />
                <label htmlFor="featured" className="text-sm text-[#aaa]">Featured article</label>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Body</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={8}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-y"
                  placeholder="Article content..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Article
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); resetCreateForm(); }}
                  className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
