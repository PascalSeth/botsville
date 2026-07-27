"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Sparkles,
  UserCheck,
  Calendar,
  Users,
  Globe,
} from "lucide-react";
import { dashboardFetch } from "../../lib/api";

type SeasonOption = {
  id: string;
  name: string;
  status: string;
};

type TeamOption = {
  id: string;
  name: string;
  tag: string;
};

type TournamentFormat =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "GROUP_STAGE"
  | "SWISS";

const FORMAT_OPTIONS: {
  id: TournamentFormat;
  title: string;
  tagline: string;
  description: string;
  badge: string;
}[] = [
  {
    id: "GROUP_STAGE",
    title: "Group Stage + Playoffs",
    tagline: "MPL Pro Style — Best for 8 to 20+ Teams",
    description: "Teams split into groups for round-robin play. Top teams advance to double-elimination playoffs.",
    badge: "RECOMMENDED",
  },
  {
    id: "DOUBLE_ELIMINATION",
    title: "Double Elimination Playoffs",
    tagline: "Upper & Lower Bracket — Second Chance",
    description: "Every team gets a second chance in the lower bracket. Only eliminated after two losses.",
    badge: "PRO PLAY",
  },
  {
    id: "SINGLE_ELIMINATION",
    title: "Single Elimination Cup",
    tagline: "Knockout Bracket — Fast & High Stakes",
    description: "Standard knockout tournament. Lose once and you are out. Quickest to conclude.",
    badge: "FAST CUP",
  },
  {
    id: "ROUND_ROBIN",
    title: "Round Robin League",
    tagline: "Full Season Table — Every Team Plays Everyone",
    description: "Every team plays every other team over weekly matchdays. Ranked by cumulative points.",
    badge: "LEAGUE",
  },
  {
    id: "SWISS",
    title: "Swiss System",
    tagline: "M-Series Style — Dynamic Record Pairing",
    description: "Teams pair each round against others with identical records. Qualify at 3 wins, eliminate at 3 losses.",
    badge: "WORLD CHAMP",
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: dataUrl,
      type: "tournaments",
      bucket: "images",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Failed to upload image file");
  }
  return data.url;
}

export default function SetupTournamentWizardPage() {
  const router = useRouter();

  // Step 1: Format, Step 2: Settings, Step 3: Registration Mode & Launch
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Data sources
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);

  // Form selections
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [tournamentName, setTournamentName] = useState<string>("Ghana MLBB Group Stage Qualifier");
  const [subtitle, setSubtitle] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>("GROUP_STAGE");
  const [slots, setSlots] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>("");
  const [registrationDeadline, setRegistrationDeadline] = useState<string>("");
  const [defaultBestOf, setDefaultBestOf] = useState<number>(3);
  const [pointSystem, setPointSystem] = useState<"MLBB_WEIGHTED" | "STANDARD">("MLBB_WEIGHTED");

  // File Upload State
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [prizePool, setPrizePool] = useState<string>("");
  const [rules, setRules] = useState<string>("");

  // Registration Mode
  const [launchMode, setLaunchMode] = useState<"OPEN_REGISTRATION" | "INVITATIONAL">("OPEN_REGISTRATION");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Matchday & Orchestration Parameters
  const [playDaysPerWeek, setPlayDaysPerWeek] = useState<number[]>([5, 6, 0]); // Fri(5), Sat(6), Sun(0)
  const [matchesPerDay, setMatchesPerDay] = useState<number>(4);
  const [tiebreakerSequence, setTiebreakerSequence] = useState<string[]>(["H2H", "GD", "TIME"]);

  // Format-specific settings
  const [numGroups, setNumGroups] = useState<number>(2);
  const [drawMode, setDrawMode] = useState<"SEEDED" | "RANDOM">("SEEDED");
  const [swissRounds, setSwissRounds] = useState<number>(5);
  const [seedingByesCount, setSeedingByesCount] = useState<number>(0);

  // Loading & error states
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoadingInitial(true);
      const [seasonsRes, teamsRes] = await Promise.all([
        dashboardFetch<SeasonOption[]>("/api/seasons"),
        dashboardFetch<{ teams: TeamOption[] }>("/api/teams?status=ACTIVE&limit=100"),
      ]);
      setLoadingInitial(false);

      if (seasonsRes.data && Array.isArray(seasonsRes.data)) {
        setSeasons(seasonsRes.data);
        const active = seasonsRes.data.find((s) => s.status === "ACTIVE");
        if (active) setSelectedSeasonId(active.id);
      }

      if (teamsRes.data) {
        const teamsList = Array.isArray(teamsRes.data)
          ? (teamsRes.data as unknown as TeamOption[])
          : teamsRes.data.teams ?? [];
        setAllTeams(teamsList);
        setSelectedTeamIds(teamsList.map((t) => t.id));
      }
    }
    void init();
  }, []);

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) {
      setError("Please select a season");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Perform image file uploads if selected
    let finalBanner = bannerUrl;
    let finalHero = heroImageUrl;

    try {
      if (bannerFile) {
        finalBanner = await uploadImageFile(bannerFile);
      }
      if (heroFile) {
        finalHero = await uploadImageFile(heroFile);
      }
    } catch (upErr) {
      setSubmitting(false);
      setError(upErr instanceof Error ? upErr.message : "Failed to upload image");
      return;
    }

    // MODE 1: Open Public Registration
    if (launchMode === "OPEN_REGISTRATION") {
      const { data, error: err } = await dashboardFetch<{ id: string }>(
        "/api/tournaments",
        {
          method: "POST",
          body: JSON.stringify({
            seasonId: selectedSeasonId,
            name: tournamentName.trim() ? tournamentName.trim() : `Ghana MLBB ${selectedFormat.replace(/_/g, " ")} Qualifier`,
            subtitle: subtitle || undefined,
            format: selectedFormat,
            location: "Online",
            isOnline: true,
            date: startDate || new Date().toISOString(),
            registrationDeadline: registrationDeadline || startDate || new Date().toISOString(),
            slots,
            banner: finalBanner || undefined,
            heroImage: finalHero || undefined,
            prizePool: prizePool || undefined,
            rules: rules ? rules.split("\n").filter((r) => r.trim().length > 0) : [],
            status: "OPEN",
            pointSystem,
            defaultBestOf,
            playDaysPerWeek,
            matchesPerDay,
            tiebreakerSequence,
            numGroups: selectedFormat === "GROUP_STAGE" ? numGroups : undefined,
          }),
        }
      );

      setSubmitting(false);

      if (err) {
        setError(err);
        return;
      }

      if (data?.id) {
        router.push(`/dashboard/tournaments/${data.id}`);
      } else {
        router.push("/dashboard/tournaments");
      }
      return;
    }

    // MODE 2: Invitational (Pre-select Active Teams and Launch Schedule Immediately)
    if (selectedTeamIds.length < 2) {
      setSubmitting(false);
      setError("At least 2 teams are required to generate an instant schedule");
      return;
    }

    const { data, error: err } = await dashboardFetch<{ tournament: { id: string } }>(
      `/api/seasons/${selectedSeasonId}/initialize-tournament`,
      {
        method: "POST",
        body: JSON.stringify({
          tournamentName: tournamentName || undefined,
          format: selectedFormat,
          teamIds: selectedTeamIds,
          startDate: startDate || undefined,
          banner: finalBanner || undefined,
          heroImage: finalHero || undefined,
          prizePool: prizePool || undefined,
          rules: rules ? rules.split("\n").filter((r) => r.trim().length > 0) : [],
          defaultBestOf,
          pointSystem,
          playDaysPerWeek,
          matchesPerDay,
          tiebreakerSequence,
          numGroups: selectedFormat === "GROUP_STAGE" ? numGroups : undefined,
          drawMode: selectedFormat === "GROUP_STAGE" ? drawMode : undefined,
          swissRounds: selectedFormat === "SWISS" ? swissRounds : undefined,
          seedingByesCount: selectedFormat === "DOUBLE_ELIMINATION" ? seedingByesCount : undefined,
        }),
      }
    );

    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    if (data?.tournament?.id) {
      router.push(`/dashboard/tournaments/${data.tournament.id}`);
    } else {
      router.push("/dashboard/tournaments");
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Link
          href="/dashboard/tournaments"
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
            Tournament Launch Wizard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Create an open registration tournament or pre-launch an invitational league.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        {[
          { num: 1, label: "1. Select Format" },
          { num: 2, label: "2. Tournament Settings" },
          { num: 3, label: "3. Launch & Registration" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num as 1 | 2 | 3)}
            className={`py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider text-left transition-all ${
              step === s.num
                ? "border-[#e8a000] bg-[#e8a000]/10 text-white"
                : step > s.num
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-white/10 bg-[#0d0d14] text-gray-500 hover:border-white/20"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Feedback banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── STEP 1: FORMAT SELECTION ─────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-[#e8a000]">
              Choose Tournament Format
            </h2>
            <p className="text-xs text-gray-400">
              Select the format for this competition. Every format automatically scales to your team count.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORMAT_OPTIONS.map((f) => {
              const selected = selectedFormat === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedFormat(f.id);
                    if (!tournamentName || tournamentName.startsWith("Ghana MLBB")) {
                      setTournamentName(`Ghana MLBB ${f.title}`);
                    }
                  }}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                    selected
                      ? "border-[#e8a000] bg-[#e8a000]/10 text-white shadow-lg shadow-[#e8a000]/5"
                      : "border-white/10 bg-[#0a0a0f] text-gray-400 hover:border-white/20 hover:bg-white/2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-white/10 text-gray-300">
                      {f.badge}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selected ? "border-[#e8a000] bg-[#e8a000]" : "border-white/30"
                      }`}
                    >
                      {selected && <CheckCircle size={10} className="text-black" />}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">{f.title}</h3>
                  <p className="text-xs font-bold text-[#e8a000] mt-0.5">{f.tagline}</p>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#ffb800] transition-colors"
            >
              Continue to Settings &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: FORMAT & REGISTRATION SETTINGS ─────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-[#e8a000]">
              Tournament Parameters
            </h2>
            <p className="text-xs text-gray-400">
              Set up slots, dates, and series rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0a0f] p-6 rounded-2xl border border-white/10">
            {/* Target Season */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Target Season
              </label>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Name */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Tournament Name
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. Ghana MLBB Spring Championship"
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000] font-bold"
              />
              
              {/* Live Preview Banner */}
              <div className="p-3.5 rounded-xl border border-[#e8a000]/30 bg-[#e8a000]/5 flex items-center justify-between mt-2">
                <div>
                  <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest">
                    Live Tournament Display Name
                  </p>
                  <p className="text-base font-black text-white mt-0.5">
                    {tournamentName.trim() || "Untitled Tournament"}
                  </p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded bg-[#e8a000] text-black">
                  {selectedFormat.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Maximum Slots */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Maximum Team Slots
              </label>
              <input
                type="number"
                min={4}
                max={64}
                value={slots}
                onChange={(e) => setSlots(Number(e.target.value))}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              />
            </div>

            {/* Match Specifications & Series Rules */}
            <div className="space-y-2 col-span-1 md:col-span-2 pt-2 border-t border-white/5">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Match Specifications &amp; Series Rules
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400">Regular Series Length (Best of N)</span>
                  <select
                    value={defaultBestOf}
                    onChange={(e) => setDefaultBestOf(Number(e.target.value))}
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
                  >
                    <option value={1}>BO1 (Best of 1 — Single Game)</option>
                    <option value={3}>BO3 (Best of 3 — Standard Pro Series)</option>
                    <option value={5}>BO5 (Best of 5 — High Stakes Series)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400">Ranking Point System</span>
                  <select
                    value={pointSystem}
                    onChange={(e) => setPointSystem(e.target.value as "MLBB_WEIGHTED" | "STANDARD")}
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
                  >
                    <option value="MLBB_WEIGHTED">MLBB Pro Weighted (3-0=3pts, 2-1=2pts, 1-2=1pt)</option>
                    <option value="STANDARD">Standard Win/Loss Points (1pt per match win)</option>
                  </select>
                </div>
              </div>

              {/* Match Specs Summary Badge */}
              <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-400 uppercase text-[10px]">Group Games:</span>
                  <span className="text-[#e8a000] font-black">BO{defaultBestOf}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-400 uppercase text-[10px]">Playoffs Matches:</span>
                  <span className="text-amber-400 font-black">BO5</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-400 uppercase text-[10px]">Grand Finals:</span>
                  <span className="text-emerald-400 font-black">BO7</span>
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Tournament Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              />
            </div>

            {/* Registration Deadline */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Registration Deadline
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              />
            </div>

            {/* Matchdays Selection */}
            <div className="space-y-2 col-span-1 md:col-span-2 pt-2 border-t border-white/5">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
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

            {/* Prize Pool */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Prize Pool Display
              </label>
              <input
                type="text"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="e.g. GH₵ 5,000 + Trophies"
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              />
            </div>

            {/* Banner Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Tournament Banner Image
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-colors flex items-center gap-2">
                  <span className="text-[#e8a000]">+ Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBannerFile(file);
                        setBannerPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    setBannerPreview(e.target.value || null);
                  }}
                  placeholder="Or paste image URL..."
                  className="flex-1 bg-[#0d0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]"
                />
              </div>
              {bannerPreview && (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 bg-black/40 mt-2">
                  <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerUrl("");
                      setBannerPreview(null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Hero Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Hero Featured Image
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-colors flex items-center gap-2">
                  <span className="text-[#e8a000]">+ Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setHeroFile(file);
                        setHeroPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={heroImageUrl}
                  onChange={(e) => {
                    setHeroImageUrl(e.target.value);
                    setHeroPreview(e.target.value || null);
                  }}
                  placeholder="Or paste image URL..."
                  className="flex-1 bg-[#0d0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]"
                />
              </div>
              {heroPreview && (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 bg-black/40 mt-2">
                  <img src={heroPreview} alt="Hero Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setHeroFile(null);
                      setHeroImageUrl("");
                      setHeroPreview(null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Tournament Rules */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                Tournament Rules (One rule per line)
              </label>
              <textarea
                rows={3}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder={"BO3 per series\nNo pause without referee consent\nOfficial MLBB custom lobby rules apply"}
                className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8a000]"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-white/20 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/5 transition-colors"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-[#e8a000] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#ffb800] transition-colors"
            >
              Registration Mode &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: LAUNCH MODE & REGISTRATION ─────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-[#e8a000]">
              Choose Registration &amp; Launch Mode
            </h2>
            <p className="text-xs text-gray-400">
              Decide whether to open public registrations for team captains or pre-launch an invitational immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode A: Open Registration */}
            <div
              onClick={() => setLaunchMode("OPEN_REGISTRATION")}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                launchMode === "OPEN_REGISTRATION"
                  ? "border-[#e8a000] bg-[#e8a000]/10 text-white shadow-lg shadow-[#e8a000]/5"
                  : "border-white/10 bg-[#0a0a0f] text-gray-400 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-5 h-5 text-[#e8a000]" />
                <h3 className="text-base font-black text-white">Open Public Registration</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mt-2">
                Opens registration on the public site. Team captains submit their roster. Once registration closes, you click <strong>&quot;Generate Schedule&quot;</strong> on the tournament dashboard using the approved teams.
              </p>
            </div>

            {/* Mode B: Invitational / Pre-select Teams */}
            <div
              onClick={() => setLaunchMode("INVITATIONAL")}
              className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                launchMode === "INVITATIONAL"
                  ? "border-[#e8a000] bg-[#e8a000]/10 text-white shadow-lg shadow-[#e8a000]/5"
                  : "border-white/10 bg-[#0a0a0f] text-gray-400 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-[#e8a000]" />
                <h3 className="text-base font-black text-white">Invitational / Instant Schedule</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mt-2">
                Bypasses public registration. Pre-select active teams right now and immediately generate the round-robin/bracket schedule.
              </p>
            </div>
          </div>

          {/* If Invitational mode, show team selector */}
          {launchMode === "INVITATIONAL" && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-black uppercase text-[#e8a000]">
                Pre-select Active Teams ({selectedTeamIds.length} / {allTeams.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                {allTeams.map((t) => {
                  const checked = selectedTeamIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeam(t.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs transition-colors ${
                        checked
                          ? "border-[#e8a000] bg-[#e8a000]/10 text-white font-bold"
                          : "border-white/10 bg-[#0d0d14] text-gray-400"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded border shrink-0 ${checked ? "bg-[#e8a000] border-[#e8a000]" : "border-white/30"}`} />
                      <span className="truncate">[{t.tag}] {t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-white/20 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/5 transition-colors"
            >
              &larr; Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#e8a000] text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#ffb800] transition-colors shadow-lg shadow-[#e8a000]/20 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {submitting
                ? "Creating..."
                : launchMode === "OPEN_REGISTRATION"
                ? "Open Tournament Registration"
                : "Launch Invitational Tournament"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
