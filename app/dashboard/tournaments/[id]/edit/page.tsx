"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { dashboardFetch } from "../../../lib/api";

type Season = { id: string; name: string; status: string };

type Tournament = {
  id: string;
  seasonId: string;
  name: string;
  subtitle: string | null;
  format: string;
  location: string;
  isOnline: boolean;
  date: string;
  registrationDeadline: string;
  slots: number;
  prizePool: string | null;
  status: string;
  banner: string | null;
  rules?: string[];
};

const FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS_PLAYOFFS"];

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);

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
  const [status, setStatus] = useState("UPCOMING");
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

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

  const dateInputValue = useMemo(() => {
    if (!date) return "";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, [date]);

  const deadlineInputValue = useMemo(() => {
    if (!registrationDeadline) return "";
    const parsed = new Date(registrationDeadline);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }, [registrationDeadline]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const [{ data: seasonsData, error: seasonsError }, { data: tournamentData, error: tournamentError }] = await Promise.all([
        dashboardFetch<Season[]>("/api/seasons"),
        dashboardFetch<Tournament>(`/api/tournaments/${id}`),
      ]);

      setLoadingSeasons(false);
      if (!seasonsError && Array.isArray(seasonsData)) {
        setSeasons(seasonsData);
      }

      if (tournamentError || !tournamentData) {
        setError(tournamentError || "Tournament not found");
        setLoading(false);
        return;
      }

      setSeasonId(tournamentData.seasonId);
      setName(tournamentData.name);
      setSubtitle(tournamentData.subtitle || "");
      setFormat(tournamentData.format);
      setLocation(tournamentData.location || "");
      setIsOnline(Boolean(tournamentData.isOnline));
      setDate(tournamentData.date);
      setRegistrationDeadline(tournamentData.registrationDeadline);
      setSlots(tournamentData.slots);
      setPrizePool(tournamentData.prizePool || "");
      setRulesText((tournamentData.rules || []).join("\n"));
      setStatus(tournamentData.status);
      setCurrentBanner(tournamentData.banner || null);
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (!seasonId || !name || !format || !dateInputValue || !deadlineInputValue || slots < 2) {
      setError("Fill required fields.");
      return;
    }

    if (!isOnline && !location.trim()) {
      setError("Location is required for offline tournaments.");
      return;
    }

    const startDateIso = new Date(dateInputValue).toISOString();
    const deadlineIso = new Date(deadlineInputValue).toISOString();
    if (new Date(deadlineIso).getTime() >= new Date(startDateIso).getTime()) {
      setError("Registration deadline must be before tournament start date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let banner = currentBanner;

    if (bannerFile) {
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
        banner = uploadData.url;
      } catch (uploadError) {
        setUploadingImage(false);
        setSubmitting(false);
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload tournament image");
        return;
      }
      setUploadingImage(false);
    }

    const { error: updateError } = await dashboardFetch(`/api/tournaments/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        seasonId,
        name,
        subtitle: subtitle || null,
        format,
        location: location.trim() || "Online",
        isOnline,
        date: startDateIso,
        registrationDeadline: deadlineIso,
        slots,
        prizePool: prizePool.trim() ? prizePool.trim() : null,
        rules: rulesText
          .split("\n")
          .map((rule) => rule.trim())
          .filter(Boolean),
        status,
        banner,
      }),
    });

    setSubmitting(false);
    if (updateError) {
      setError(updateError);
      return;
    }

    router.push(`/dashboard/tournaments/${id}`);
  };

  if (!id) {
    return <div className="text-[#666]">Missing tournament ID.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-[#666]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/tournaments/${id}`} className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">
          ← Tournament
        </Link>
        <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">Edit tournament</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      ) : null}

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
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
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
              {FORMATS.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, " ")}
                </option>
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
          <label htmlFor="isOnline" className="text-sm text-[#aaa]">
            Online
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Start date *</label>
            <input
              type="datetime-local"
              value={dateInputValue}
              onChange={(e) => setDate(new Date(e.target.value).toISOString())}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Registration deadline *</label>
            <input
              type="datetime-local"
              value={deadlineInputValue}
              onChange={(e) => setRegistrationDeadline(new Date(e.target.value).toISOString())}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              <option value="UPCOMING">UPCOMING</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ONGOING">ONGOING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">Prize pool</label>
            <input
              type="text"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="Optional"
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
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

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block">Tournament image</label>
          {currentBanner ? (
            <img src={currentBanner} alt="Current banner" className="w-full max-h-48 object-cover rounded border border-white/10" />
          ) : (
            <div className="w-full h-28 rounded border border-dashed border-white/15 text-[#666] text-xs uppercase tracking-wider flex items-center justify-center">
              No current image
            </div>
          )}
          <label className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white flex items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
              className="w-full text-white file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
            />
          </label>
          <p className="text-[10px] text-[#555]">Leave empty to keep current image. Uploaded to Supabase bucket: images</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || loadingSeasons || uploadingImage}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploadingImage ? "Uploading image..." : "Save changes"}
          </button>
          <Link
            href={`/dashboard/tournaments/${id}`}
            className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
