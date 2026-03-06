"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  status: string;
  category: string;
  image: string | null;
  featured: boolean;
};

const CATEGORIES = ["PATCH_NOTES", "NEW_EVENT", "NEW_HERO"];
const STATUSES = ["DRAFT", "PUBLISHED"];

export default function NewsEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [category, setCategory] = useState("NEW_EVENT");
  const [image, setImage] = useState("");
  const [featured, setFeatured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        featured,
      }),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setArticle((a) => (a ? { ...a, title, subtitle, body, status, category, image, featured } : null));
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `news/${Date.now()}-${safeName}`;
    const { url, error: uploadError } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
    if (!uploadError && url) {
      setImage(url);
    } else {
      setError("Failed to upload image");
    }
    setUploadingImage(false);
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
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Image</label>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
              className="hidden"
              id="image-upload-edit"
            />
            <label
              htmlFor="image-upload-edit"
              className="flex items-center justify-center gap-2 w-full bg-[#0d0d14] border border-white/10 border-dashed text-[#888] px-3 py-4 text-sm cursor-pointer hover:border-[#e8a000]/50 hover:text-white transition-colors"
            >
              {uploadingImage ? (
                <><Loader2 size={16} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={16} /> {image ? "Change image" : "Click to upload image"}</>
              )}
            </label>
            {image && (
              <div className="relative w-full h-32 rounded overflow-hidden">
                <Image src={image} alt="Preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => { setImage(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="w-4 h-4 accent-[#e8a000]"
          />
          <label htmlFor="featured" className="text-sm text-[#aaa]">Featured article</label>
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
        <div className="flex items-center justify-between pt-2">
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
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-lg p-6">
            <h2 className="font-black text-lg text-white uppercase tracking-[0.08em] mb-2">Delete Article?</h2>
            <p className="text-[#888] text-sm mb-6">
              Are you sure you want to delete &quot;{article.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white text-xs font-black uppercase tracking-wider hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
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
