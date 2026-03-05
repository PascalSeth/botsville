"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { uploadImage, STORAGE_BUCKETS } from "@/lib/supabase";
import { Brain, Loader2, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

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
  const [category, setCategory] = useState<TriviaCategory>("GENERAL");
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
      setCategory(payload.category || "GENERAL");
      setTitle(payload.title);
      setTeaser(payload.teaser);
      // Ensure we always have at least 4 choice slots
      const loadedChoices = payload.choices?.length ? [...payload.choices] : ["", "", "", ""];
      while (loadedChoices.length < 4) loadedChoices.push("");
      setChoices(loadedChoices);
      setCorrectAnswerIndex(payload.correctAnswerIndex ?? 0);
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
        category,
        title,
        teaser,
        choices: choices.filter(c => c.trim()),
        correctAnswerIndex,
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
      setCategory(updated.category || "GENERAL");
      setTitle(updated.title);
      setTeaser(updated.teaser);
      const loadedChoices = updated.choices?.length ? [...updated.choices] : ["", "", "", ""];
      while (loadedChoices.length < 4) loadedChoices.push("");
      setChoices(loadedChoices);
      setCorrectAnswerIndex(updated.correctAnswerIndex ?? 0);
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
          <h1 className="mt-2 font-black text-2xl text-white uppercase tracking-[0.08em] flex items-center gap-2">
            <Brain size={20} className="text-[#e8a000]" />
            Edit Quiz Question
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-sm ${CATEGORY_CONFIG[trivia.category]?.color || "text-[#888]"}`}>
              {CATEGORY_CONFIG[trivia.category]?.emoji || "💡"}
            </span>
            <span className="text-xs text-[#555]">
              {CATEGORY_CONFIG[trivia.category]?.label || "General"} • Created {new Date(trivia.createdAt).toLocaleString()}
            </span>
          </div>
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
        {/* Category Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-2">Category *</label>
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
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
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

        {/* Choices */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-2">
            Choices * <span className="text-[#555] font-normal">(click to mark correct answer)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {choices.map((choice, idx) => (
              <div key={idx} className="relative">
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => {
                    const updated = [...choices];
                    updated[idx] = e.target.value;
                    setChoices(updated);
                  }}
                  placeholder={`Choice ${idx + 1}${idx < 2 ? " *" : ""}`}
                  className={`w-full bg-[#0d0d14] border text-white pl-3 pr-8 py-2 text-sm outline-none rounded transition-colors ${
                    correctAnswerIndex === idx
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-white/10 focus:border-[#e8a000]/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setCorrectAnswerIndex(idx)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    correctAnswerIndex === idx
                      ? "border-emerald-500 bg-emerald-500 text-black"
                      : "border-white/20 hover:border-[#e8a000]/60 text-transparent hover:text-[#666]"
                  }`}
                  title={correctAnswerIndex === idx ? "Correct answer" : "Mark as correct"}
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#555] mt-1">At least 2 choices required. First 2 are required.</p>
        </div>

        {/* Reveal/Explanation */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Reveal / Explanation *</label>
          <textarea
            value={reveal}
            onChange={(e) => setReveal(e.target.value)}
            required
            rows={2}
            placeholder="e.g. Fanny is known for her cable-slinging mobility..."
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded resize-y"
          />
        </div>

        {/* Hero Slug and Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Hero slug</label>
            <input
              type="text"
              value={heroSlug}
              onChange={(e) => setHeroSlug(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
              placeholder="e.g. fanny"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Label (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
              placeholder="Custom label for this question"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Hint Image (optional)</label>
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

        {/* Window Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Window start</label>
            <input
              type="datetime-local"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Window end</label>
            <input
              type="datetime-local"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 rounded"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider rounded hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Changes
          </button>
          <Link href="/dashboard/trivia" className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider rounded hover:bg-white/5">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
