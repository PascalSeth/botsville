"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { useRoleGuard } from "../../lib/useRole";
import { Loader2, Trash2, Upload, X, ArrowLeft, Image as ImageIcon, Sparkles } from "lucide-react";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  status: string;
  category: string;
  image: string | null;
  images: string[];
  featured: boolean;
};

const CATEGORIES = ["PATCH_NOTES", "NEW_EVENT", "NEW_HERO", "INTERVIEW"];
const STATUSES = ["DRAFT", "PUBLISHED"];

export default function NewsEditPage() {
  const { role } = useRoleGuard(["CONTENT_ADMIN", "EDITOR", "INTERVIEWER"]);
  const isInterviewer = role === "INTERVIEWER";
  const availableCategories = isInterviewer ? ["INTERVIEW"] : CATEGORIES;
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [category, setCategory] = useState("NEW_EVENT");
  const [image, setImage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
        setImage(a.image ?? "");
        setImages(a.images ?? []);
        setFeatured(a.featured ?? false);
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
      body: JSON.stringify({
        title,
        subtitle: subtitle || null,
        body: body || null,
        status,
        category,
        image: image || null,
        images: images,
        featured,
      }),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setArticle((a) => (a ? { ...a, title, subtitle, body, status, category, image, images, featured } : null));
    router.push("/dashboard/news");
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `news/${Date.now()}-${safeName}`;
    const { url, error: uploadError } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
    if (!uploadError && url) {
      setImage(url);
    } else {
      setError("Failed to upload cover image");
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
      const { url, error: uploadError } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
      if (!uploadError && url) {
        uploadedUrls.push(url);
      }
    }

    if (uploadedUrls.length > 0) {
      setImages(prev => [...prev, ...uploadedUrls]);
    } else {
      setError("Failed to upload gallery images");
    }
    setUploadingGallery(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/news/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (err) {
      setError(err);
      setShowDeleteConfirm(false);
      return;
    }
    router.push("/dashboard/news");
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider flex items-center gap-1">
          <ArrowLeft size={14} /> Back to News
        </Link>
        <p className="text-[#666]">Missing article ID.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[#666]">Loading...</div>;
  if (error && !article) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider flex items-center gap-1">
          <ArrowLeft size={14} /> Back to News
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }
  if (!article) return <div className="p-8 text-[#666]">Article not found.</div>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/news" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
        <ArrowLeft size={14} /> News Desk
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          Rework Article
        </h1>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-500/10 flex items-center gap-2"
        >
          <Trash2 size={14} /> Delete Article
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Side-by-side editing desk */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Body Form (Takes 2 grid blocks) */}
        <div className="lg:col-span-2 space-y-4 bg-[#0c0c14]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Headline *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Snippet Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="featured"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 accent-[#e8a000]"
            />
            <label htmlFor="featured" className="text-xs text-[#aaa]">Featured story</label>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Body / Story Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Start typing your story..."
              className="w-full bg-[#0d0d14] border border-white/10 rounded-lg text-white px-3 py-3 text-sm outline-none focus:border-[#e8a000]/50 resize-y leading-relaxed font-sans"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider rounded-lg hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save Changes
            </button>
            <Link href="/dashboard/news" className="px-5 py-2.5 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white/5">
              Cancel
            </Link>
          </div>
        </div>

        {/* Right Column: Visual Media Manager (Takes 1 grid block) */}
        <div className="space-y-6">
          {/* Primary Cover Image */}
          <div className="bg-[#0c0c14]/50 border border-white/5 rounded-2xl p-5 backdrop-blur-xl space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-[#e8a000] flex items-center gap-1.5">
              <Sparkles size={11} /> Cover Image
            </h2>

            <div className="space-y-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleCoverUpload(e.target.files?.[0] ?? null)}
                className="hidden"
                id="cover-upload-edit"
              />
              <label
                htmlFor="cover-upload-edit"
                className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed rounded-lg text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
              >
                {uploadingCover ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={16} /> {image ? "Change cover image" : "Upload cover image"}</>
                )}
              </label>

              {image ? (
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10">
                  <Image src={image} alt="Cover Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImage(""); if (coverInputRef.current) coverInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="aspect-[16/9] w-full bg-white/[0.01] rounded-xl border border-white/5 flex flex-col items-center justify-center text-white/5">
                  <ImageIcon size={28} />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">No cover image</span>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Gallery Manager */}
          <div className="bg-[#0c0c14]/50 border border-white/5 rounded-2xl p-5 backdrop-blur-xl space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-[#666] flex items-center gap-1.5">
              <ImageIcon size={11} /> Secondary Gallery ({images.length})
            </h2>

            <div className="space-y-4">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleGalleryUpload(e.target.files)}
                className="hidden"
                id="gallery-upload-edit"
              />
              <label
                htmlFor="gallery-upload-edit"
                className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed rounded-lg text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
              >
                {uploadingGallery ? (
                  <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={16} /> Upload Gallery Images</>
                )}
              </label>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group/item">
                      <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white hover:bg-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 bg-white/[0.01] rounded-xl border border-white/5 flex flex-col items-center justify-center text-white/5">
                  <ImageIcon size={22} />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Gallery is empty</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="font-black text-lg text-white uppercase tracking-[0.08em] mb-2">Delete Article?</h2>
            <p className="text-[#888] text-sm mb-6 leading-relaxed">
              Are you sure you want to delete &quot;{article.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Permanent
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-5 py-2.5 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
