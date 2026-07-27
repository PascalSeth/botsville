"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, ChevronLeft, Trophy, Settings, 
  Globe, MapPin, Calendar, Clock, Zap, 
  ListChecks, Layout, Plus, Shield, AlertCircle, Sparkles, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  heroImage: string | null;
  pointSystem?: "MLBB_WEIGHTED" | "STANDARD";
  defaultBestOf?: number;
  rules?: string[];
  numGroups?: number;
  teamsPerGroup?: number;
  matchesPerTeam?: number;
  matchesBeforeBracket?: number;
};

type TournamentWithRegistrations = Tournament & {
  registrations?: Array<{ id: string; teamId: string }>;
};

const FORMATS = [
  "GROUP_STAGE",
  "DOUBLE_ELIMINATION",
  "SINGLE_ELIMINATION",
  "ROUND_ROBIN",
  "SWISS",
];

// Glass Card Component for the premium look
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-[#0a0a0f] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

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
  const [format, setFormat] = useState("GROUP_STAGE");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [date, setDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [slots, setSlots] = useState(16);
  const [prizePool, setPrizePool] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [status, setStatus] = useState("UPCOMING");
  
  // Format and Rule parameters
  const [defaultBestOf, setDefaultBestOf] = useState<number>(3);
  const [pointSystem, setPointSystem] = useState<"MLBB_WEIGHTED" | "STANDARD">("MLBB_WEIGHTED");
  const [playDaysPerWeek, setPlayDaysPerWeek] = useState<number[]>([5, 6, 0]);
  const [matchesPerDay, setMatchesPerDay] = useState<number>(4);

  // Banner & Hero Image assets
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrlInput, setBannerUrlInput] = useState<string>("");

  const [currentHeroImage, setCurrentHeroImage] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroUrlInput, setHeroUrlInput] = useState<string>("");

  // Group stage parameters
  const [numGroups, setNumGroups] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [matchesPerTeam, setMatchesPerTeam] = useState(3);
  const [registeredTeamsCount, setRegisteredTeamsCount] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);

  // Auto-calculate matches before bracket (total group stage matches)
  const matchesBeforeBracket = useMemo(() => {
    return numGroups > 0 && teamsPerGroup > 0 
      ? Math.round(numGroups * (teamsPerGroup * matchesPerTeam / 2))
      : 0;
  }, [numGroups, teamsPerGroup, matchesPerTeam]);

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

  const uploadImage = async (file: File): Promise<string> => {
    const imageDataUrl = await fileToDataUrl(file);
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
      throw new Error(uploadData?.error || "Failed to upload image file");
    }
    return uploadData.url;
  };

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

  // Check if registration is closed
  const isRegistrationClosed = useMemo(() => {
    if (!registrationDeadline) return false;
    return new Date() > new Date(registrationDeadline);
  }, [registrationDeadline]);

  // Check if tournament can have group stage configured
  const canConfigureGroupStage = useMemo(() => {
    return format === "GROUP_STAGE";
  }, [format]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);

      // 1. Fetch seasons list
      setLoadingSeasons(true);
      const { data: seasonsData } = await dashboardFetch<Season[]>("/api/seasons");
      setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
      setLoadingSeasons(false);

      // 2. Fetch target tournament
      const { data: tournamentData, error: tournamentError } = await dashboardFetch<TournamentWithRegistrations>(
        `/api/tournaments/${id}`
      );

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
      setBannerUrlInput(tournamentData.banner || "");

      setCurrentHeroImage(tournamentData.heroImage || null);
      setHeroUrlInput(tournamentData.heroImage || "");

      setDefaultBestOf(tournamentData.defaultBestOf || 3);
      setPointSystem(tournamentData.pointSystem || "MLBB_WEIGHTED");
      if (Array.isArray((tournamentData as unknown as { playDaysPerWeek?: number[] }).playDaysPerWeek)) {
        setPlayDaysPerWeek((tournamentData as unknown as { playDaysPerWeek: number[] }).playDaysPerWeek);
      }
      if (typeof (tournamentData as unknown as { matchesPerDay?: number }).matchesPerDay === "number") {
        setMatchesPerDay((tournamentData as unknown as { matchesPerDay: number }).matchesPerDay);
      }

      setNumGroups(tournamentData.numGroups || 2);
      setTeamsPerGroup(tournamentData.teamsPerGroup || 4);
      setMatchesPerTeam(tournamentData.matchesPerTeam || 3);

      if (tournamentData.registrations) {
        setRegisteredTeamsCount(tournamentData.registrations.length);
      }
      
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (!seasonId || !name || !format || !dateInputValue || !deadlineInputValue || slots < 2) {
      setError("Please complete all required fields.");
      return;
    }

    if (!isOnline && !location.trim()) {
      setError("Location is required for offline/LAN tournaments.");
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

    let banner = bannerUrlInput.trim() || currentBanner;
    let heroImage = heroUrlInput.trim() || currentHeroImage;

    try {
      if (bannerFile) {
        setUploadingImage(true);
        banner = await uploadImage(bannerFile);
      }
      if (heroFile) {
        setUploadingImage(true);
        heroImage = await uploadImage(heroFile);
      }
    } catch (upErr) {
      setUploadingImage(false);
      setSubmitting(false);
      setError(upErr instanceof Error ? upErr.message : "Failed to upload image file");
      return;
    }
    setUploadingImage(false);

    const { error: updateError } = await dashboardFetch(`/api/tournaments/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        seasonId,
        name: name.trim(),
        subtitle: subtitle.trim() || null,
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
        banner: banner || null,
        heroImage: heroImage || null,
        defaultBestOf,
        pointSystem,
        playDaysPerWeek,
        matchesPerDay,
        numGroups,
        teamsPerGroup,
        matchesPerTeam,
        matchesBeforeBracket,
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
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
        <p className="text-[#666] font-bold uppercase tracking-widest text-[10px]">Loading Tournament Editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <Link href={`/dashboard/tournaments/${id}`} className="group flex items-center gap-2 text-[#e8a000] text-xs font-black uppercase tracking-[0.2em] transition-all hover:gap-3">
            <ChevronLeft size={16} /> Back to Tournament
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
              Edit <span className="text-[#e8a000]">Tournament</span>
            </h1>
            <p className="text-[#555] text-sm font-medium tracking-wide">Update event parameters, dates, images, rules, and point allocations.</p>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 flex items-center gap-4"
          >
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-sm text-red-300 font-bold">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card 1: Core Identity */}
          <GlassCard delay={0.1}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Trophy size={18} className="text-[#e8a000]" /> Core Identity
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Tournament Name Input & Live Banner */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">
                  Tournament Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ghana MLBB Championship Season 6"
                  className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all font-bold"
                  required
                />

                {/* Live Preview Bar */}
                <div className="p-3.5 rounded-xl border border-[#e8a000]/30 bg-[#e8a000]/5 flex items-center justify-between mt-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest">
                      Live Tournament Display Title
                    </p>
                    <p className="text-base font-black text-white mt-0.5">
                      {name.trim() || "Untitled Tournament"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded bg-[#e8a000] text-black">
                    {format.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. The Road to Grand Finals"
                  className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Active Season</label>
                  {loadingSeasons ? (
                    <div className="h-[46px] bg-white/[0.02] rounded-xl animate-pulse" />
                  ) : (
                    <select
                      value={seasonId}
                      onChange={(e) => setSeasonId(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 appearance-none transition-all cursor-pointer"
                      required
                    >
                      <option value="" disabled className="bg-[#0a0a0f]">Select Season</option>
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0a0a0f]">{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Display Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-[#e8a000] font-black px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 appearance-none transition-all cursor-pointer"
                  >
                    {['UPCOMING','OPEN','CLOSED','ONGOING','COMPLETED','CANCELLED'].map(s => (
                      <option key={s} value={s} className="bg-[#0a0a0f] text-white font-bold">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Card 2: Format & Match Rules */}
          <GlassCard delay={0.2}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Settings size={18} className="text-[#e8a000]" /> Logistics, Format &amp; Series Rules
              </h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Primary Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 appearance-none transition-all cursor-pointer"
                  >
                    {FORMATS.map((item) => (
                      <option key={item} value={item} className="bg-[#0a0a0f]">
                        {item.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Max Team Slots</label>
                  <input
                    type="number"
                    min={2}
                    value={slots}
                    onChange={(e) => setSlots(parseInt(e.target.value, 10) || 2)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all"
                  />
                </div>
              </div>

              {/* Point System & Series Best-of */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Series Length (Best of N)</label>
                  <select
                    value={defaultBestOf}
                    onChange={(e) => setDefaultBestOf(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value={1} className="bg-[#0a0a0f]">BO1 (Best of 1)</option>
                    <option value={3} className="bg-[#0a0a0f]">BO3 (Best of 3 — Standard)</option>
                    <option value={5} className="bg-[#0a0a0f]">BO5 (Best of 5 — Pro Play)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Ranking Point System</label>
                  <select
                    value={pointSystem}
                    onChange={(e) => setPointSystem(e.target.value as "MLBB_WEIGHTED" | "STANDARD")}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="MLBB_WEIGHTED" className="bg-[#0a0a0f]">MLBB Pro Weighted (3-0=3pts, 2-1=2pts, 1-2=1pt)</option>
                    <option value="STANDARD" className="bg-[#0a0a0f]">Standard Win/Loss Points</option>
                  </select>
                </div>
              </div>

              {/* Match Specs Summary Badge */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#888] uppercase text-[10px]">Group Games:</span>
                  <span className="text-[#e8a000] font-black">BO{defaultBestOf}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#888] uppercase text-[10px]">Playoffs Matches:</span>
                  <span className="text-amber-400 font-black">BO5</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#888] uppercase text-[10px]">Grand Finals:</span>
                  <span className="text-emerald-400 font-black">BO7</span>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between gap-4">
                   <div>
                     <p className="text-sm font-bold text-white uppercase tracking-wider">Tournament Environment</p>
                     <p className="text-xs text-[#555]">Is this competition held online or at an offline venue?</p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setIsOnline(!isOnline)}
                     className={`w-24 shrink-0 h-10 rounded-full transition-all flex items-center px-1 ${isOnline ? 'bg-[#e8a000]' : 'bg-white/10'}`}
                   >
                     <motion.div 
                        animate={{ x: isOnline ? 56 : 0 }}
                        className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
                     >
                       {isOnline ? <Globe size={14} className="text-[#e8a000]" /> : <MapPin size={14} className="text-[#666]" />}
                     </motion.div>
                   </button>
                </div>

                {!isOnline && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2 mt-4">Venue Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Accra Mall Arena, Ghana"
                      className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all"
                      required={!isOnline}
                    />
                  </motion.div>
                )}
              </div>

              {/* Matchdays Selection */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block">
                  Weekly Matchdays Schedule (Active Game Days)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 5, label: "Friday" },
                    { id: 6, label: "Saturday" },
                    { id: 0, label: "Sunday" },
                    { id: 1, label: "Monday" },
                    { id: 2, label: "Tuesday" },
                    { id: 3, label: "Wednesday" },
                    { id: 4, label: "Thursday" },
                  ].map((day) => {
                    const active = playDaysPerWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setPlayDaysPerWeek((prev) =>
                            prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id]
                          );
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                          active
                            ? "bg-[#e8a000] text-black border-[#e8a000] shadow-md shadow-[#e8a000]/20"
                            : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Tournament Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" size={16} />
                    <input
                      type="datetime-local"
                      value={dateInputValue}
                      onChange={(e) => setDate(new Date(e.target.value).toISOString())}
                      className="w-full bg-white/[0.03] border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 transition-all [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Registration Deadline</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" size={16} />
                    <input
                      type="datetime-local"
                      value={deadlineInputValue}
                      onChange={(e) => setRegistrationDeadline(new Date(e.target.value).toISOString())}
                      className="w-full bg-white/[0.03] border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 transition-all [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Card 3: Group Stage Config */}
          <AnimatePresence>
            {canConfigureGroupStage && (
              <GlassCard delay={0.3} className="border-[#e8a000]/20 bg-[#e8a000]/[0.02]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Layout size={18} className="text-[#e8a000]" /> Group Stage Parameters
                    </h2>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setManualOverride(!manualOverride)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all border ${manualOverride ? 'bg-[#e8a000]/10 border-[#e8a000] text-[#e8a000]' : 'bg-white/5 border-white/10 text-[#555]'}`}
                  >
                    Manual Override
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Number of Groups</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={numGroups}
                      onChange={(e) => setNumGroups(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Teams per Group</label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={teamsPerGroup}
                      onChange={(e) => setTeamsPerGroup(parseInt(e.target.value, 10) || 4)}
                      className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Matches per Team</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={matchesPerTeam}
                      onChange={(e) => setMatchesPerTeam(parseInt(e.target.value, 10) || 3)}
                      className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-[#e8a000]/[0.05] border border-[#e8a000]/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-[#e8a000]">
                    <Zap size={24} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Bracket Trigger Threshold</p>
                      <p className="text-xl font-black">{matchesBeforeBracket} Matches</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </AnimatePresence>

          {/* Card 4: Prizes & Rules */}
          <GlassCard delay={0.4}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <ListChecks size={18} className="text-[#e8a000]" /> Rewards & Governance
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Prize Pool Description</label>
                <input
                  type="text"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  placeholder="e.g. GH₵ 5,000 + Custom Trophy"
                  className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Tournament Rules (One per line)</label>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={6}
                  placeholder={`1. Standard MLBB Tournament Rules apply.\n2. Respect all participants and administrators.\n3. Mandatory 30min check-in before Lobby start.`}
                  className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 focus:bg-white/[0.05] transition-all font-mono leading-relaxed"
                />
              </div>
            </div>
          </GlassCard>

          {/* Card 5: Media & Visual Assets (Banner & Hero Uploads) */}
          <GlassCard delay={0.5}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={18} className="text-[#e8a000]" /> Visual Assets &amp; Banners
              </h2>
            </div>

            <div className="space-y-8">
              {/* Banner Image Asset */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block">
                  Tournament Banner Image
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={bannerUrlInput}
                    onChange={(e) => setBannerUrlInput(e.target.value)}
                    placeholder="https://... (CDN image URL)"
                    className="flex-1 bg-white/[0.03] border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs outline-none focus:border-[#e8a000]"
                  />
                  <label className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase rounded-xl cursor-pointer transition-all shrink-0 flex items-center gap-2">
                    <Plus size={14} /> Upload File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBannerFile(file);
                          const url = URL.createObjectURL(file);
                          setCurrentBanner(url);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {(bannerFile || currentBanner || bannerUrlInput) && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[21/9] bg-black">
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : (bannerUrlInput || currentBanner || "")}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Hero Featured Image Asset */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block">
                  Hero Featured Character Image
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={heroUrlInput}
                    onChange={(e) => setHeroUrlInput(e.target.value)}
                    placeholder="https://... (CDN image URL)"
                    className="flex-1 bg-white/[0.03] border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs outline-none focus:border-[#e8a000]"
                  />
                  <label className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase rounded-xl cursor-pointer transition-all shrink-0 flex items-center gap-2">
                    <Plus size={14} /> Upload File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setHeroFile(file);
                          const url = URL.createObjectURL(file);
                          setCurrentHeroImage(url);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {(heroFile || currentHeroImage || heroUrlInput) && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 h-40 bg-black flex items-center justify-center p-4">
                    <img
                      src={heroFile ? URL.createObjectURL(heroFile) : (heroUrlInput || currentHeroImage || "")}
                      alt="Hero Preview"
                      className="max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Action Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 pt-6"
          >
            <button
              type="submit"
              disabled={submitting || loadingSeasons || uploadingImage}
              className="flex-1 px-8 py-5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-[#ffb800] disabled:opacity-50 flex items-center justify-center gap-3 rounded-2xl transition-all shadow-xl shadow-[#e8a000]/10 active:scale-[0.98]"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              {uploadingImage ? "Uploading Asset..." : submitting ? "Saving Changes..." : "Save Tournament Settings"}
            </button>
            <Link
              href={`/dashboard/tournaments/${id}`}
              className="px-8 py-5 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 rounded-2xl transition-all active:scale-[0.98]"
            >
              Cancel
            </Link>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
