"use client";


import { useRoleGuard } from "../lib/useRole";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, Trash2, Upload, Image as ImageIcon, Pencil } from "lucide-react";

type HeroCatalogItem = {
  id: string;
  key: string;
  name: string;
  imageUrl: string | null;
};

const toHeroKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function DashboardHeroesPage() {
  const { isAllowed: __roleAllowed } = useRoleGuard(["CONTENT_ADMIN","EDITOR"]);
  const [heroes, setHeroes] = useState<HeroCatalogItem[]>([]);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "with-image" | "without-image">("all");

  // Edit modal state
  const [editingHero, setEditingHero] = useState<HeroCatalogItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      const response = await fetch(`/api/admin/heroes?t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load heroes");
      setHeroes(Array.isArray(data?.heroes) ? data.heroes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load heroes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Failed to read image file"));
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const imageDataUrl = await fileToDataUrl(imageFile);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageDataUrl,
            type: "heroes",
            bucket: "images",
          }),
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData?.url) {
          throw new Error(uploadData?.error || "Failed to upload image");
        }
        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/admin/heroes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key: key || undefined, imageUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to add hero");

      setSuccess("Hero added to catalog");
      setName("");
      setKey("");
      setIsKeyManuallyEdited(false);
      setImageFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add hero");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImageForHero = async (heroId: string, file: File) => {
    setUploadingId(heroId);
    setError(null);
    setSuccess(null);

    try {
      const imageDataUrl = await fileToDataUrl(file);
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "heroes",
          bucket: "images",
        }),
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || "Failed to upload image");
      }

      const response = await fetch("/api/admin/heroes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: heroId, imageUrl: uploadData.url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to update hero");

      setSuccess("Image uploaded!");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingId(null);
    }
  };

  const removeHero = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/heroes/catalog/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to delete hero");
      setSuccess("Hero removed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete hero");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (hero: HeroCatalogItem) => {
    setEditingHero(hero);
    setEditName(hero.name);
    setEditKey(hero.key);
    setEditFile(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingHero) return;
    setSavingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUrl = editingHero.imageUrl;

      if (editFile) {
        const imageDataUrl = await fileToDataUrl(editFile);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageDataUrl,
            type: "heroes",
            bucket: "images",
          }),
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData?.url) {
          throw new Error(uploadData?.error || "Failed to upload image");
        }
        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/admin/heroes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingHero.id,
          name: editName.trim(),
          key: editKey.trim(),
          imageUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to update hero");

      setSuccess("Hero updated successfully!");
      setEditingHero(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update hero");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredHeroes = heroes.filter((h) => {
    if (filter === "with-image") return h.imageUrl !== null;
    if (filter === "without-image") return h.imageUrl === null;
    return true;
  });

  const withImageCount = heroes.filter((h) => h.imageUrl !== null).length;
  const withoutImageCount = heroes.filter((h) => h.imageUrl === null).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <h1 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-[0.08em]">Hero Cutouts</h1>
        <p className="mt-1 text-sm text-[#888] tracking-wide">
          Manage MLBB heroes. Upload cutout images to make them selectable.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0f]/80 p-4 text-center">
          <p className="text-3xl font-black text-white">{heroes.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Total Heroes</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-3xl font-black text-emerald-400">{withImageCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">With Images</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-3xl font-black text-amber-400">{withoutImageCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60">Need Images</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-white/[0.06] bg-[#0a0a0f]/80 p-5 grid gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!isKeyManuallyEdited) {
              setKey(toHeroKey(nextName));
            }
          }}
          placeholder="Hero name (e.g. Chou)"
          className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white"
          required
        />
        <input
          value={key}
          onChange={(event) => {
            setKey(event.target.value);
            setIsKeyManuallyEdited(event.target.value.trim().length > 0);
          }}
          placeholder="Hero key (optional, e.g. chou)"
          className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white"
        />
        <label className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white flex items-center">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="w-full text-white file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
          />
        </label>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? "Adding..." : "Add Hero"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
        </div>
      </form>

      <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0f]/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000]">Catalog</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 border transition-colors ${
                filter === "all" ? "border-[#e8a000] text-[#e8a000] bg-[#e8a000]/10" : "border-white/10 text-[#666] hover:text-white"
              }`}
            >
              All ({heroes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("with-image")}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 border transition-colors ${
                filter === "with-image" ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" : "border-white/10 text-[#666] hover:text-white"
              }`}
            >
              With Image ({withImageCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("without-image")}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 border transition-colors ${
                filter === "without-image" ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-white/10 text-[#666] hover:text-white"
              }`}
            >
              Need Image ({withoutImageCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#888] text-sm"><Loader2 size={14} className="animate-spin" /> Loading heroes...</div>
        ) : filteredHeroes.length === 0 ? (
          <div className="flex items-center gap-2 text-[#666] text-sm"><AlertCircle size={14} /> No heroes match this filter.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredHeroes.map((hero) => (
              <article key={hero.id} className="border border-white/10 bg-[#0d0d14] p-3">
                <div className="h-28 bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden relative">
                  {hero.imageUrl ? (
                    <img src={hero.imageUrl} alt={hero.name} className="h-full w-full object-contain object-center" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#444]">
                      <ImageIcon size={32} />
                      <span className="text-[10px] uppercase tracking-wider">No Image</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-white uppercase tracking-wide">{hero.name}</p>
                <p className="text-[10px] text-[#888] uppercase tracking-widest">{hero.key}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(hero)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  {!hero.imageUrl && (
                    <label className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer">
                      {uploadingId === hero.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingId === hero.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImageForHero(hero.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => removeHero(hero.id)}
                    disabled={deletingId === hero.id}
                    className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingId === hero.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Edit Hero Modal */}
      {editingHero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0a0a0f] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#e8a000]">
                Edit Hero: {editingHero.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingHero(null)}
                className="text-xs text-[#888] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888] mb-1">
                  Hero Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888] mb-1">
                  Hero Key
                </label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888] mb-1">
                  Replace Cutout Image (Optional)
                </label>
                {editingHero.imageUrl && (
                  <div className="mb-2 h-20 w-20 bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden">
                    <img src={editingHero.imageUrl} alt="Current cutout" className="h-full w-full object-contain" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                  className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHero(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-white/10 text-[#aaa] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#e8a000] text-black hover:bg-[#ffb800] disabled:opacity-50"
                >
                  {savingEdit && <Loader2 size={12} className="animate-spin" />}
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
