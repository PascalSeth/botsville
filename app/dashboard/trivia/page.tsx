"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";
import { Brain, Loader2, Plus, RefreshCcw, ToggleLeft, ToggleRight, X, Filter, Sparkles } from "lucide-react";

type TriviaCategory =
  | "GUESS_THE_HERO"
  | "HARDEST_HEROES"
  | "FUNNY_FACTS"
  | "OG_HEROES"
  | "POWER_ULTIMATE"
  | "LORE"
  | "SKIN"
  | "EMOJI_GUESS"
  | "GENERAL";

const CATEGORY_CONFIG: Record<TriviaCategory, { label: string; emoji: string; color: string }> = {
  GUESS_THE_HERO: { label: "Guess the Hero", emoji: "🧠", color: "text-purple-400" },
  HARDEST_HEROES: { label: "Hardest Heroes", emoji: "⚔️", color: "text-red-400" },
  FUNNY_FACTS: { label: "Funny Facts", emoji: "😂", color: "text-yellow-400" },
  OG_HEROES: { label: "OG Heroes", emoji: "👑", color: "text-amber-400" },
  POWER_ULTIMATE: { label: "Power Ultimate", emoji: "🔥", color: "text-orange-400" },
  LORE: { label: "Lore", emoji: "🐉", color: "text-emerald-400" },
  SKIN: { label: "Skin Trivia", emoji: "🎯", color: "text-pink-400" },
  EMOJI_GUESS: { label: "Emoji Guess", emoji: "🧩", color: "text-cyan-400" },
  GENERAL: { label: "General", emoji: "💡", color: "text-blue-400" },
};

type TriviaFact = {
  id: string;
  category: TriviaCategory;
  title: string;
  teaser: string;
  choices: string[];
  correctAnswerIndex: number;
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
  const [filterCategory, setFilterCategory] = useState<TriviaCategory | "">("");

  const [category, setCategory] = useState<TriviaCategory>("GUESS_THE_HERO");
  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [choices, setChoices] = useState<string[]>(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [reveal, setReveal] = useState("");
  const [heroSlug, setHeroSlug] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");;

  const activeCount = useMemo(() => trivia.filter((t) => t.isActive).length, [trivia]);
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    trivia.forEach((t) => {
      stats[t.category] = (stats[t.category] || 0) + 1;
    });
    return stats;
  }, [trivia]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filterCategory) params.set("category", filterCategory);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/trivia?${params}`);
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
  }, [filterCategory]);

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
        category,
        title,
        teaser,
        choices: choices.filter(c => c.trim()),
        correctAnswerIndex,
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
      setChoices(["", "", "", ""]);
      setCorrectAnswerIndex(0);
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
            Hero Trivia Quiz
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Create quiz questions by category. Active items surface on Community highlights and grant XP on reveal.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(categoryStats).map(([cat, count]) => (
              <span
                key={cat}
                className={`text-[10px] px-2 py-0.5 rounded bg-white/5 ${CATEGORY_CONFIG[cat as TriviaCategory]?.color || "text-[#888]"}`}
              >
                {CATEGORY_CONFIG[cat as TriviaCategory]?.emoji} {count}
              </span>
            ))}
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              ✓ {activeCount} active
            </span>
          </div>
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
        <form onSubmit={handleCreate} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] flex items-center gap-2">
                <Sparkles size={12} className="text-[#e8a000]" />
                Create Quiz Question
              </p>
              <p className="text-xs text-[#555]">Pick a category, write the clue, set the answer.</p>
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

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as TriviaCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-md text-left text-[11px] font-semibold border transition-all ${
                    category === cat
                      ? "border-[#e8a000] bg-[#e8a000]/10 text-white"
                      : "border-white/10 bg-[#0d0d14] text-[#888] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="mr-1">{CATEGORY_CONFIG[cat].emoji}</span>
                  {CATEGORY_CONFIG[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Question/Clue */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">
              {category === "EMOJI_GUESS" ? "Emoji Clue *" : "Question / Clue *"}
            </label>
            <textarea
              value={teaser}
              onChange={(e) => setTeaser(e.target.value)}
              required
              rows={2}
              placeholder={
                category === "EMOJI_GUESS"
                  ? "e.g. 🧛‍♂️🩸"
                  : category === "GUESS_THE_HERO"
                  ? "e.g. Which hero swings around the battlefield using steel cables like Spider-Man?"
                  : "Enter the question or clue..."
              }
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded resize-y"
            />
          </div>

          {/* Answer (Explanation shown after answering) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Explanation (shown after answering)</label>
            <input
              type="text"
              value={reveal}
              onChange={(e) => setReveal(e.target.value)}
              required
              placeholder="e.g. Fanny is known for her cable mechanics similar to Spider-Man!"
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
            />
          </div>

          {/* Multiple Choice Options */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">
              Answer Choices * (click to mark correct answer)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {choices.map((choice, idx) => (
                <div key={idx} className="relative">
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => {
                      const newChoices = [...choices];
                      newChoices[idx] = e.target.value;
                      setChoices(newChoices);
                    }}
                    required={idx < 2} // At least 2 choices required
                    placeholder={`Option ${idx + 1}${idx < 2 ? ' *' : ''}`}
                    className={`w-full bg-[#0d0d14] border text-white px-3 py-2 text-sm outline-none rounded pr-10 ${
                      correctAnswerIndex === idx
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-white/10 focus:border-[#e8a000]/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setCorrectAnswerIndex(idx)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      correctAnswerIndex === idx
                        ? "bg-emerald-500 text-black"
                        : "bg-white/10 text-[#666] hover:bg-white/20"
                    }`}
                    title={correctAnswerIndex === idx ? "Correct answer" : "Mark as correct"}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#555]">
              Green = correct answer. Users earn +10 XP for picking the right one.
            </p>
          </div>

          {/* Hero Slug and Optional Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Hero slug</label>
              <input
                type="text"
                value={heroSlug}
                onChange={(e) => setHeroSlug(e.target.value)}
                placeholder="e.g. fanny"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Label (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Custom label for this question"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Hint Image (optional)</label>
            <label className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/10 bg-[#0d0d14] px-3 py-3 text-center hover:border-[#e8a000]/40 hover:bg-[#0f0f16] transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e.target.files?.[0] ?? null)}
              />
              <span className="text-[11px] text-[#888]">Drop or select an image</span>
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

          {/* Active & Window */}
          <div className="flex items-center gap-4 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d0d14] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#aaa] hover:border-[#e8a000]/40 hover:text-white"
            >
              {isActive ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} className="text-[#555]" />}
              {isActive ? "Active" : "Inactive"}
            </button>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                placeholder="From"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50 rounded"
              />
              <input
                type="datetime-local"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                placeholder="To"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50 rounded"
              />
            </div>
          </div>
        </form>

        {/* Preview / Quick Stats Panel */}
        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666]">Recent Questions</p>
            <p className="text-xs text-[#555]">Latest trivia questions by category.</p>
          </div>
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {trivia.slice(0, 5).map((t) => {
              const cfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.GENERAL;
              return (
                <li key={t.id} className="rounded border border-white/5 bg-white/2 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm ${cfg.color}`}>{cfg.emoji}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#555]">
                          {cfg.label}
                        </span>
                        <span
                          className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            t.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-[#333]/30 text-[#666]"
                          }`}
                        >
                          {t.isActive ? "Active" : "Off"}
                        </span>
                      </div>
                      <p className="text-white text-sm line-clamp-2">{t.teaser}</p>
                      <p className="text-[11px] text-[#e8a000] mt-1">→ {t.reveal}</p>
                    </div>
                  </div>
                </li>
              );
            })}
            {trivia.length === 0 && <p className="text-[#555] text-sm">No trivia yet.</p>}
          </ul>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {/* Category Filter */}
        <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-[#666]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#666]">Filter:</span>
          <button
            onClick={() => setFilterCategory("")}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
              filterCategory === ""
                ? "bg-[#e8a000]/20 text-[#e8a000]"
                : "text-[#888] hover:text-white"
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_CONFIG) as TriviaCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                filterCategory === cat
                  ? `bg-[#e8a000]/20 ${CATEGORY_CONFIG[cat].color}`
                  : "text-[#888] hover:text-white"
              }`}
            >
              {CATEGORY_CONFIG[cat].emoji}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : trivia.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No trivia yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Category</th>
                  <th className="p-3">Question / Clue</th>
                  <th className="p-3">Choices</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trivia.map((item) => {
                  const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.GENERAL;
                  const correctAnswer = item.choices?.[item.correctAnswerIndex] || item.reveal;
                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="p-3">
                        <span className={`text-sm ${cfg.color}`}>
                          {cfg.emoji}
                        </span>
                        <span className="ml-1 text-[10px] text-[#666]">{cfg.label}</span>
                      </td>
                      <td className="p-3 text-white max-w-xs">
                        <p className="text-sm line-clamp-2">{item.teaser}</p>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {item.choices?.length > 0 ? (
                            item.choices.map((c, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  idx === item.correctAnswerIndex
                                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                                    : "bg-white/5 text-[#888]"
                                }`}
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#e8a000] font-semibold text-sm">{correctAnswer}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            item.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-[#444]/30 text-[#888]"
                          }`}
                        >
                          {item.isActive ? "Active" : "Off"}
                        </span>
                      </td>
                      <td className="p-3 space-x-2">
                        <button
                          onClick={() => handleToggle(item)}
                          disabled={actionId === item.id}
                          className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline disabled:opacity-50"
                        >
                          {item.isActive ? "Off" : "On"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="p-3 border-t border-white/10 text-[10px] text-[#666] uppercase tracking-wider">
            Showing {trivia.length} of {pagination.total}
          </div>
        )}
      </div>
    </div>
  );
}
