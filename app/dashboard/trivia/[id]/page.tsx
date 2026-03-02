"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";
import { Brain, Loader2, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

type TriviaFact = {
  id: string;
  title: string;
  teaser: string;
  reveal: string;
  heroSlug: string | null;
  images: string[];
  isActive: boolean;
  periodFrom: string | null;
  periodTo: string | null;
  createdAt: string;
  updatedAt: string;
};

function toInputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function TriviaEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [trivia, setTrivia] = useState<TriviaFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [reveal, setReveal] = useState("");
  const [heroSlug, setHeroSlug] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await dashboardFetch<TriviaFact>(`/api/trivia/${id}`);
      setLoading(false);
      if (err) {
        setError(err);
        setTrivia(null);
        return;
      }
      const payload = data as TriviaFact | undefined;
      if (!payload) {
        setTrivia(null);
        return;
      }
      setTrivia(payload);
      setTitle(payload.title);
      setTeaser(payload.teaser);
      setReveal(payload.reveal);
      setHeroSlug(payload.heroSlug ?? "");
      setImages(payload.images ?? []);
      setIsActive(payload.isActive);
      setPeriodFrom(toInputDate(payload.periodFrom));
      setPeriodTo(toInputDate(payload.periodTo));
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const { data, error: err } = await dashboardFetch<{ trivia: TriviaFact }>(`/api/trivia/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        teaser,
        reveal,
        heroSlug: heroSlug || null,
        images,
        isActive,
        periodFrom: toIso(periodFrom),
        periodTo: toIso(periodTo),
      }),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    const updated = (data as { trivia?: TriviaFact })?.trivia;
    if (updated) {
      setTrivia(updated);
      setTitle(updated.title);
      setTeaser(updated.teaser);
      setReveal(updated.reveal);
      setHeroSlug(updated.heroSlug ?? "");
      setImages(updated.images ?? []);
      setIsActive(updated.isActive);
      setPeriodFrom(toInputDate(updated.periodFrom));
      setPeriodTo(toInputDate(updated.periodTo));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this trivia?")) return;
    setSaving(true);
    const { error: err } = await dashboardFetch(`/api/trivia/${id}`, { method: "DELETE" });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/dashboard/trivia");
  };

  const handleUploadImage = async (file: File | null) => {
    if (!file) return;
    setUploadingImage(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `trivia/${Date.now()}-${safeName}`;
    const { url, error } = await uploadImage(STORAGE_BUCKETS.IMAGES, path, file);
    if (!error && url) {
      setImages((prev) => [...prev, url]);
    }
    setUploadingImage(false);
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/trivia" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Trivia</Link>
        <p className="text-[#666]">Missing trivia ID.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[#666]">Loading...</div>;
  if (error && !trivia) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/trivia" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Trivia</Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }
  if (!trivia) return <div className="p-8 text-[#666]">Trivia not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/trivia" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Trivia</Link>
          <h1 className="mt-2 font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em] flex items-center gap-2">
            <Brain size={20} className="text-[#e8a000]" />
            Edit trivia
          </h1>
          <p className="text-xs text-[#555]">Created {new Date(trivia.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d0d14] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#aaa] hover:border-[#e8a000]/40 hover:text-white"
          >
            {isActive ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} className="text-[#555]" />}
            {isActive ? "Active" : "Inactive"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 max-w-3xl space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Teaser *</label>
          <input
            type="text"
            value={teaser}
            onChange={(e) => setTeaser(e.target.value)}
            required
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Reveal *</label>
          <textarea
            value={reveal}
            onChange={(e) => setReveal(e.target.value)}
            required
            rows={4}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-y"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Hero slug</label>
            <input
              type="text"
              value={heroSlug}
              onChange={(e) => setHeroSlug(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Upload image</label>
            <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-[#0d0d14] px-3 py-3 text-center hover:border-[#e8a000]/40 hover:bg-[#0f0f16] transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e.target.files?.[0] ?? null)}
              />
              <span className="text-[11px] text-[#888]">Drop or select an image</span>
              <span className="text-[10px] text-[#555]">Stored in images/trivia</span>
              {uploadingImage && <Loader2 size={14} className="animate-spin text-[#e8a000]" />}
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img) => (
                  <div key={img} className="relative w-20 h-14 rounded border border-white/10 overflow-hidden">
                    <Image src={img} alt="Trivia" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Active</label>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider ${isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-[#444]/30 text-[#888]"}`}>
                {isActive ? "Active" : "Inactive"}
              </span>
              <p className="text-[11px] text-[#666]">Controls whether it can surface on site.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Window start</label>
            <input
              type="datetime-local"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Window end</label>
            <input
              type="datetime-local"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </button>
          <Link href="/dashboard/trivia" className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
