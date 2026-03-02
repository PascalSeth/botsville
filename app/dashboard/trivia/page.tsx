"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";
import { Brain, Loader2, Plus, RefreshCcw, ToggleLeft, ToggleRight, X } from "lucide-react";

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

type Payload = {
  trivia: TriviaFact[];
  pagination: { total: number; limit: number; skip: number };
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function DashboardTriviaPage() {
  const [trivia, setTrivia] = useState<TriviaFact[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [reveal, setReveal] = useState("");
  const [heroSlug, setHeroSlug] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const activeCount = useMemo(() => trivia.filter((t) => t.isActive).length, [trivia]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await dashboardFetch<Payload>("/api/trivia?limit=50");
    setLoading(false);
    if (err) {
      setError(err);
      setTrivia([]);
      return;
    }
    setError(null);
    const payload = data as Payload | undefined;
    setTrivia(payload?.trivia ?? []);
    if (payload?.pagination) setPagination(payload.pagination);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    const { data, error: err } = await dashboardFetch<{ trivia: TriviaFact }>("/api/trivia", {
      method: "POST",
      body: JSON.stringify({
        title,
        teaser,
        reveal,
        heroSlug: heroSlug || null,
        isActive,
        images,
        periodFrom: toIso(periodFrom),
        periodTo: toIso(periodTo),
      }),
    });
    setSaving(false);
    if (err) {
      setCreateError(err);
      return;
    }
    const created = (data as { trivia?: TriviaFact })?.trivia;
    if (created) {
      setTrivia((list) => [created, ...list]);
      setTitle("");
      setTeaser("");
      setReveal("");
      setHeroSlug("");
      setImages([]);
      setIsActive(true);
      setPeriodFrom("");
      setPeriodTo("");
    }
  };

  const handleToggle = async (item: TriviaFact) => {
    setActionId(item.id);
    const { data, error: err } = await dashboardFetch<{ trivia: TriviaFact }>(`/api/trivia/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    setActionId(null);
    if (err) {
      setError(err);
      return;
    }
    const updated = (data as { trivia?: TriviaFact })?.trivia;
    if (updated) {
      setTrivia((list) => list.map((t) => (t.id === item.id ? updated : t)));
    }
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

  const handleDelete = async (item: TriviaFact) => {
    if (!confirm("Delete this trivia?")) return;
    setActionId(item.id);
    const { error: err } = await dashboardFetch(`/api/trivia/${item.id}`, { method: "DELETE" });
    setActionId(null);
    if (err) {
      setError(err);
      return;
    }
    setTrivia((list) => list.filter((t) => t.id !== item.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-[0.08em] flex items-center gap-2">
            <Brain size={22} className="text-[#e8a000]" />
            Trivia
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Manage daily trivia facts. Active items surface on Community highlights and grant XP on reveal.
          </p>
          <p className="mt-1 text-xs text-[#666]">
            Active now: {activeCount} / {pagination.total || trivia.length}
          </p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d0d14] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#aaa] hover:border-[#e8a000]/40 hover:text-white"
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666]">Create trivia</p>
              <p className="text-xs text-[#555]">Title, teaser, reveal, optional hero and window.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#e8a000] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:bg-[#ffb800] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>

          {createError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{createError}</div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Teaser *</label>
            <input
              type="text"
              value={teaser}
              onChange={(e) => setTeaser(e.target.value)}
              required
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Reveal *</label>
            <textarea
              value={reveal}
              onChange={(e) => setReveal(e.target.value)}
              required
              rows={3}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-y"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Hero slug</label>
              <input
                type="text"
                value={heroSlug}
                onChange={(e) => setHeroSlug(e.target.value)}
                placeholder="e.g. kagura"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Upload image</label>
              <label className="flex min-h-23 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/10 bg-[#0d0d14] px-3 py-3 text-center hover:border-[#e8a000]/40 hover:bg-[#0f0f16] transition-colors">
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
                <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Active now</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d0d14] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#aaa] hover:border-[#e8a000]/40 hover:text-white"
              >
                {isActive ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} className="text-[#555]" />}
                {isActive ? "Active" : "Inactive"}
              </button>
              <span className="text-[11px] text-[#555]">Shown if inside window</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Window start</label>
              <input
                type="datetime-local"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Window end</label>
              <input
                type="datetime-local"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
          </div>
        </form>

        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666]">Active windows</p>
              <p className="text-xs text-[#555]">Only active + in-range trivia appear on the site.</p>
            </div>
          </div>
          <ul className="space-y-2">
            {trivia.slice(0, 3).map((t) => (
              <li key={t.id} className="rounded border border-white/5 bg-white/2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{t.title}</p>
                    <p className="text-[11px] text-[#666] truncate">{t.teaser}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      t.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-[#333]/30 text-[#888]"
                    }`}
                  >
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[11px] text-[#555] mt-1">
                  {formatDate(t.periodFrom)} → {formatDate(t.periodTo)}
                </p>
              </li>
            ))}
            {trivia.length === 0 && <p className="text-[#555] text-sm">No trivia yet.</p>}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : trivia.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No trivia yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Title</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Window</th>
                  <th className="p-3">Hero</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trivia.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-3 text-white font-semibold">
                      <div className="space-y-1">
                        <p>{item.title}</p>
                        <p className="text-xs text-[#777] line-clamp-1">{item.teaser}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                          item.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-[#444]/30 text-[#888]"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">
                      <div>{formatDate(item.periodFrom)}</div>
                      <div className="text-[11px] text-[#555]">{formatDate(item.periodTo)}</div>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{item.heroSlug || "—"}</td>
                    <td className="p-3 text-[#666] text-sm">{formatDate(item.updatedAt)}</td>
                    <td className="p-3 space-x-3">
                      <span className="text-[10px] text-[#555] mr-2">{item.images?.length ?? 0} img</span>
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={actionId === item.id}
                        className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline disabled:opacity-50"
                      >
                        {item.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <Link
                        href={`/dashboard/trivia/${item.id}`}
                        className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={actionId === item.id}
                        className="text-[10px] font-bold uppercase text-red-400 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
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
