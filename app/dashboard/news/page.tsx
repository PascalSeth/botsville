"use client";

import { useRoleGuard } from "../lib/useRole";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import { Plus, Loader2, X, Upload, FileText, Image as ImageIcon, Flame, Calendar, Layers, MessageCircle } from "lucide-react";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";
import { WhatsAppShareModal } from "@/app/components/WhatsAppShareModal";

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  category: string;
  image: string | null;
  images: string[];
  publishedAt: string | null;
  createdAt: string;
  _count?: { reactions: number };
};

type Payload = {
  articles: Article[];
  pagination: { total: number; limit: number; skip: number };
};

const CATEGORIES = ["PATCH_NOTES", "NEW_EVENT", "NEW_HERO", "INTERVIEW"];
const STATUSES = ["DRAFT", "PUBLISHED"];

const CATEGORY_COLORS: Record<string, string> = {
  PATCH_NOTES: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  NEW_EVENT: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  NEW_HERO: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  INTERVIEW: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function DashboardNewsPage() {
  const { role } = useRoleGuard(["CONTENT_ADMIN", "EDITOR", "INTERVIEWER"]);
  const isInterviewer = role === "INTERVIEWER";
  const availableCategories = isInterviewer ? ["INTERVIEW"] : CATEGORIES;
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [selectedArticleForWhatsApp, setSelectedArticleForWhatsApp] = useState<Article | null>(null);

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
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newFeatured, setNewFeatured] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
    setNewImages([]);
    setNewFeatured(false);
    setCreateError(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `news/${Date.now()}-${safeName}`;
    const { url, error } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
    if (!error && url) {
      setNewImage(url);
    } else {
      setCreateError("Failed to upload cover image");
    }
    setUploadingCover(false);
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `news/gallery/${Date.now()}-${safeName}`;
      const { url, error } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
      if (!error && url) {
        uploadedUrls.push(url);
      }
    }

    if (uploadedUrls.length > 0) {
      setNewImages(prev => [...prev, ...uploadedUrls]);
    } else {
      setCreateError("Failed to upload gallery images");
    }
    setUploadingGallery(false);
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
        category: isInterviewer ? "INTERVIEW" : newCategory,
        status: newStatus,
        image: newImage.trim() || null,
        images: newImages,
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
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em] flex items-center gap-2">
            <Layers className="text-[#e8a000]" size={22} /> News Desk
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Manage, write, and curate news articles, patches, and player interviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0c0c14] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-[#ffb800] transition-all shadow-[0_0_20px_rgba(232,160,0,0.15)]"
          >
            <Plus size={14} /> Write Article
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Grid view of articles */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[280px] rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0f]/50 p-12 text-center text-[#666] flex flex-col items-center justify-center gap-3">
          <FileText size={40} className="text-white/10" />
          <p className="text-sm font-bold uppercase tracking-wider">No articles created yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((a) => {
            const hasCover = Boolean(a.image);
            const secondaryImagesCount = a.images?.length ?? 0;

            return (
              <div
                key={a.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-[#0c0c14]/90 backdrop-blur-xl transition-all duration-300 hover:border-white/15 hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                {/* Visual Cover card area */}
                <div className="relative aspect-[16/9] w-full bg-white/[0.02] overflow-hidden">
                  {hasCover ? (
                    <Image
                      src={a.image!}
                      alt={a.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/10 gap-1.5">
                      <ImageIcon size={32} />
                      <span className="text-[9px] font-black uppercase tracking-wider">No Cover Image</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${
                      CATEGORY_COLORS[a.category] || "text-white bg-white/10 border-white/20"
                    }`}>
                      {a.category.replace(/_/g, " ")}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${
                      a.status === "PUBLISHED"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-white/40 bg-white/5 border-white/10"
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  {/* Secondary Image count badge */}
                  {secondaryImagesCount > 0 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[8px] font-black text-white/80 flex items-center gap-1">
                      <ImageIcon size={9} />
                      {secondaryImagesCount} GALLERY {secondaryImagesCount === 1 ? "IMAGE" : "IMAGES"}
                    </div>
                  )}
                </div>

                {/* Article Info */}
                <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-white group-hover:text-[#e8a000] transition-colors leading-snug line-clamp-2">
                      {a.title}
                    </h3>
                    {a.subtitle && (
                      <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                        {a.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-[10px] text-white/45 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-[#e8a000]" />
                        {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "Draft"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame size={11} className="text-[#ff4d4d]" />
                        {a._count?.reactions ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {a.status === "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={() => setSelectedArticleForWhatsApp(a)}
                          className="px-2.5 py-1 bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black rounded text-[9px] font-black uppercase tracking-wider transition-all border border-[#25D366]/30 flex items-center gap-1 shadow-sm shadow-[#25D366]/10"
                          title="Broadcast to WhatsApp"
                        >
                          <MessageCircle size={11} fill="currentColor" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      {(!isInterviewer || a.category === "INTERVIEW") ? (
                        <Link
                          href={`/dashboard/news/${a.id}`}
                          className="px-3 py-1 bg-white/5 hover:bg-[#e8a000] hover:text-black rounded text-[9px] font-black uppercase tracking-wider transition-all border border-white/10"
                        >
                          Edit / Rework
                        </Link>
                      ) : (
                        <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination info */}
      {pagination.total > 0 && (
        <div className="text-[10px] text-[#555] font-black uppercase tracking-widest text-right">
          Total logs: {pagination.total} articles
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => { setShowCreate(false); resetCreateForm(); }}
              className="absolute top-4 right-4 text-[#666] hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="font-black text-xl tracking-tight text-white uppercase tracking-[0.08em] mb-6 flex items-center gap-2">
              <Plus className="text-[#e8a000]" size={18} /> Compose Article
            </h2>

            {createError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                  placeholder="Catchy headline..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  placeholder="Optional brief snippet..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={isInterviewer}
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 disabled:opacity-60"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cover Image & Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cover Image */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#e8a000] block mb-1">Primary Cover Image</label>
                  <div className="space-y-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed rounded-lg text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
                    >
                      {uploadingCover ? (
                        <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload size={16} /> Cover Image</>
                      )}
                    </label>
                    {newImage && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                        <Image src={newImage} alt="Cover Preview" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => { setNewImage(""); if (coverInputRef.current) coverInputRef.current.value = ""; }}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Gallery Images */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Gallery Images (Multiple)</label>
                  <div className="space-y-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleGalleryUpload(e.target.files)}
                      className="hidden"
                      id="gallery-upload"
                    />
                    <label
                      htmlFor="gallery-upload"
                      className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed rounded-lg text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
                    >
                      {uploadingGallery ? (
                        <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload size={16} /> Upload Gallery</>
                      )}
                    </label>

                    {newImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto no-scrollbar border border-white/5 p-1.5 rounded-lg bg-white/[0.01]">
                        {newImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-white/10">
                            <Image src={img} alt={`Gallery Preview ${idx}`} fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 bg-black/80 rounded-full text-white hover:bg-red-500 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newFeatured}
                  onChange={(e) => setNewFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#e8a000]"
                />
                <label htmlFor="featured" className="text-xs text-[#aaa]">Featured story</label>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Body</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={8}
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-y"
                  placeholder="Markdown or standard article content..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Publish Article
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); resetCreateForm(); }}
                  className="px-5 py-2.5 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {selectedArticleForWhatsApp && (
        <WhatsAppShareModal
          isOpen={Boolean(selectedArticleForWhatsApp)}
          onClose={() => setSelectedArticleForWhatsApp(null)}
          article={{
            id: selectedArticleForWhatsApp.id,
            title: selectedArticleForWhatsApp.title,
            subtitle: selectedArticleForWhatsApp.subtitle,
            image: selectedArticleForWhatsApp.image,
            category: selectedArticleForWhatsApp.category,
            publishedAt: selectedArticleForWhatsApp.publishedAt,
          }}
        />
      )}
    </div>
  );
}
