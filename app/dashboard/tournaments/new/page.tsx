"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2 } from "lucide-react";

type Season = { id: string; name: string; status: string };

const FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS_PLAYOFFS"];

export default function NewTournamentPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [date, setDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [slots, setSlots] = useState(16);
  const [prizePool, setPrizePool] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  useEffect(() => {
    (async () => {
      const { data, error: err } = await dashboardFetch<Season[]>("/api/seasons");
      setLoadingSeasons(false);
      if (!err && Array.isArray(data)) {
        setSeasons(data);
        if (data.length) setSeasonId(data[0].id);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId || !name || !format || (!isOnline && !location.trim()) || !date || !registrationDeadline || slots < 2) {
      setError("Fill required fields.");
      return;
    }
    if (!bannerFile) {
      setError("Tournament image is required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    let uploadedBannerUrl: string | null = null;
    try {
      setUploadingImage(true);
      const imageDataUrl = await fileToDataUrl(bannerFile);
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "tournaments",
          bucket: "images",
        }),
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData?.url) {
        setUploadingImage(false);
        setSubmitting(false);
        setError(uploadData?.error || "Failed to upload tournament image");
        return;
      }
      uploadedBannerUrl = uploadData.url;
    } catch (uploadError) {
      setUploadingImage(false);
      setSubmitting(false);
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload tournament image");
      return;
    }
    setUploadingImage(false);

    const { data, error: err } = await dashboardFetch<{ tournament?: { id: string } }>("/api/tournaments", {
      method: "POST",
      body: JSON.stringify({
        seasonId,
        name,
        subtitle: subtitle || undefined,
        format,
        location: location.trim() || null,
        isOnline,
        date: new Date(date).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        slots,
        prizePool: prizePool.trim() ? prizePool.trim() : null,
        rules: rulesText
          .split("\n")
          .map((rule) => rule.trim())
          .filter(Boolean),
        banner: uploadedBannerUrl,
      }),
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    const id = (data as { tournament?: { id: string } })?.tournament?.id;
    if (id) router.push(`/dashboard/tournaments?id=${id}`);
    else router.push("/dashboard/tournaments");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">
          ← Tournaments
        </Link>
        <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
          New tournament
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 max-w-2xl space-y-4">
        {loadingSeasons ? (
          <p className="text-[#666]">Loading seasons...</p>
        ) : (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Season *</label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            >
              <option value="">Select season</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Format *</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Slots *</label>
            <input
              type="number"
              min={2}
              value={slots}
              onChange={(e) => setSlots(parseInt(e.target.value, 10) || 2)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
            Location {isOnline ? "(optional)" : "*"}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={isOnline ? "Optional for online tournaments" : "e.g. Accra"}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required={!isOnline}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isOnline"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="accent-[#e8a000]"
          />
          <label htmlFor="isOnline" className="text-sm text-[#aaa]">Online</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Start date *</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Registration deadline *</label>
            <input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Prize pool (optional)</label>
          <input
            type="text"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            placeholder="Leave blank for weekly scrims / fun tournaments"
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Rules (one per line)</label>
          <textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            rows={5}
            placeholder={"No emulator\nBo3 matches\nCheck-in 30 minutes before start"}
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Tournament image *</label>
          <label className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white flex items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
              className="w-full text-white file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
              required
            />
          </label>
          <p className="text-[10px] text-[#555] mt-1">Uploaded to Supabase bucket: images</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || loadingSeasons || uploadingImage}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploadingImage ? "Uploading image..." : "Create tournament"}
          </button>
          <Link
            href="/dashboard/tournaments"
            className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
