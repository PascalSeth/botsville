"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import {
  Loader2,
  Megaphone,
  CheckCircle,
  Clock,
  CalendarCheck,
  Swords,
  Users,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trophy,
  Plus,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────
type MatchChallenge = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "SCHEDULED";
  weekStart: string;
  message?: string | null;
  createdAt: string;
  challengerTeam?: { id: string; name: string; tag: string } | null;
  challengedTeam?: { id: string; name: string; tag: string } | null;
  initiatedBy?: { id: string; ign: string } | null;
  scheduledMatch?: { id: string; scheduledTime: string; status: string } | null;
};

type AvailabilityEntry = {
  id: string;
  teamId: string;
  isAvailable: boolean;
  note?: string | null;
  updatedAt: string;
  team?: { id: string; name: string; tag: string } | null;
};

type AvailabilityPayload = {
  weekStart: string;
  ping?: {
    weekStart: string;
    scrimDate: string;
    message?: string | null;
    updatedAt: string;
  } | null;
  availabilities: AvailabilityEntry[];
  availableTeams: AvailabilityEntry[];
};

type ScrimTournament = {
  id: string;
  name: string;
  status: string;
  format: string;
  banner?: string | null;
  _count?: { matches: number };
};

type SeasonInfo = {
  id: string;
  name: string;
  status: string;
  scrimTournamentId?: string | null;
  scrimTournament?: ScrimTournament | null;
};

type ScrimTournamentPayload = {
  season: SeasonInfo;
  scrimTournament?: ScrimTournament | null;
  availableTournaments: ScrimTournament[];
};

// ── Status badge ────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "bg-yellow-500/20",  text: "text-yellow-400",  label: "Pending" },
  ACCEPTED:  { bg: "bg-blue-500/20",    text: "text-blue-400",    label: "Accepted" },
  SCHEDULED: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Scheduled" },
  REJECTED:  { bg: "bg-red-500/20",     text: "text-red-400",     label: "Rejected" },
  CANCELLED: { bg: "bg-[#444]/30",      text: "text-[#777]",      label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Section card ────────────────────────────────────────────
function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count?: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#e8a000]">
          {icon}
          {title}
        </div>
        {count !== undefined && (
          <span className="text-[10px] font-black text-[#555] tabular-nums">{count}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DashboardScrimsPage() {
  // ── Scrim Tournament state
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [scrimTournament, setScrimTournament] = useState<ScrimTournament | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<ScrimTournament[]>([]);
  const [loadingSeason, setLoadingSeason] = useState(true);
  const [newTournamentName, setNewTournamentName] = useState("");
  // stores base64 data-URL of the picked file; uploaded to Supabase on submit
  const [newTournamentImage, setNewTournamentImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [settingTournament, setSettingTournament] = useState(false);
  const [selectedExistingTournament, setSelectedExistingTournament] = useState("");

  // ── Ping state
  const [pingDate, setPingDate] = useState("");
  const [pingWeekStart, setPingWeekStart] = useState("");
  const [pingMessage, setPingMessage] = useState("");
  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  // ── Availability state
  const [availabilities, setAvailabilities] = useState<AvailabilityEntry[]>([]);
  const [availableTeams, setAvailableTeams] = useState<AvailabilityEntry[]>([]);
  const [currentPing, setCurrentPing] = useState<AvailabilityPayload["ping"] | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // ── Challenge state
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [scheduleDrafts, setScheduleDrafts] = useState<
    Record<string, { scheduledTime: string; bestOf: number }>
  >({});
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  // ── Direct pair state
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");
  const [pairTime, setPairTime] = useState("");
  const [pairBo, setPairBo] = useState(3);
  const [pairing, setPairing] = useState(false);

  // ── Auto-generator state
  const [firstMatchDateTime, setFirstMatchDateTime] = useState(""); // datetime-local for first slot
  const [matchesPerDay, setMatchesPerDay] = useState(2);
  const [daysCount, setDaysCount] = useState(3);
  const [spacingMinutes, setSpacingMinutes] = useState(60);
  const [autoBestOf, setAutoBestOf] = useState(3);
  const [autoDrafts, setAutoDrafts] = useState<
    Array<{
      id: string;
      teamAId: string;
      teamAName?: string;
      teamBId: string;
      teamBName?: string;
      scheduledTime: string; // ISO
      bestOf: number;
    }>
  >([]);
  const [generating, setGenerating] = useState(false);
  const [schedulingAuto, setSchedulingAuto] = useState(false);
  const [avoidRematches, setAvoidRematches] = useState(true);

  // ── General
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Loaders ─────────────────────────────────────────────
  const loadSeasonInfo = useCallback(async () => {
    setLoadingSeason(true);
    const { data, error: err } = await dashboardFetch<ScrimTournamentPayload>(
      "/api/seasons/scrim-tournament"
    );
    setLoadingSeason(false);
    if (err || !data) {
      setSeasonInfo(null);
      return;
    }
    setSeasonInfo(data.season ?? null);
    setScrimTournament(data.scrimTournament ?? null);
    setAvailableTournaments(data.availableTournaments ?? []);
    if (data.season?.name && !newTournamentName) {
      setNewTournamentName(`${data.season.name} Scrims`);
    }
  }, [newTournamentName]);

  const loadAvailability = useCallback(async (weekStart?: string) => {
    setLoadingAvail(true);
    const q = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
    const { data, error: err } = await dashboardFetch<AvailabilityPayload>(
      `/api/matches/challenges/availability${q}`
    );
    setLoadingAvail(false);
    if (err || !data) return;

    setAvailabilities(data.availabilities ?? []);
    setAvailableTeams(data.availableTeams ?? []);
    setCurrentPing(data.ping ?? null);

    // pre-fill week start from API
    if (!weekStart && data.weekStart) {
      const ws = new Date(data.weekStart).toISOString().slice(0, 10);
      setPingWeekStart(ws);
    }
    // pre-fill ping date if one exists
    if (data.ping?.scrimDate && !pingDate) {
      const d = new Date(data.ping.scrimDate);
      setPingDate(
        new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      );
    }
    // pre-fill message
    if (data.ping?.message && !pingMessage) {
      setPingMessage(data.ping.message);
    }
  }, [pingDate, pingMessage]);

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    const { data, error: err } = await dashboardFetch<{ challenges: MatchChallenge[] }>(
      "/api/matches/challenges"
    );
    setLoadingChallenges(false);
    if (err || !data) return;
    setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
  }, []);

  useEffect(() => {
    void loadSeasonInfo();
    void loadAvailability();
    void loadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    setError(null);
    setSuccess(null);
    void loadSeasonInfo();
    loadAvailability(pingWeekStart || undefined);
    loadChallenges();
  };

  // ── Scrim Tournament Actions ─────────────────────────────
  const createScrimTournament = async () => {
    if (!newTournamentName.trim()) { setError("Enter a tournament name"); return; }
    setCreatingTournament(true);
    setError(null);

    // Upload image to Supabase first (if one was picked)
    let bannerUrl: string | null = null;
    if (newTournamentImage) {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: newTournamentImage, type: "scrim-banner", bucket: "scrim-vault" }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setCreatingTournament(false);
        setError(uploadData?.error ?? "Image upload failed");
        return;
      }
      bannerUrl = uploadData?.url ?? null;
    }

    const { data, error: err } = await dashboardFetch<{ tournament: ScrimTournament }>(
      "/api/seasons/scrim-tournament",
      { method: "POST", body: JSON.stringify({ name: newTournamentName.trim(), banner: bannerUrl, setAsDefault: true }) }
    );
    setCreatingTournament(false);
    if (err) { setError(err); return; }
    setSuccess(`Tournament "${data?.tournament?.name}" created and set as default.`);
    setNewTournamentImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    await loadSeasonInfo();
  };

  const setExistingTournament = async () => {
    if (!selectedExistingTournament) { setError("Select a tournament"); return; }
    setSettingTournament(true);
    setError(null);
    const { error: err } = await dashboardFetch(
      "/api/seasons/scrim-tournament",
      { method: "PUT", body: JSON.stringify({ tournamentId: selectedExistingTournament }) }
    );
    setSettingTournament(false);
    if (err) { setError(err); return; }
    setSuccess("Scrim tournament updated.");
    setSelectedExistingTournament("");
    await loadSeasonInfo();
  };

  // ── Actions ──────────────────────────────────────────────
  const sendPing = async () => {
    if (!pingDate) { setError("Set a proposed scrim date/time first"); return; }
    setPinging(true);
    setError(null);
    setPingSuccess(null);
    const body: Record<string, string> = { scrimDate: new Date(pingDate).toISOString() };
    if (pingWeekStart) body.weekStart = pingWeekStart;
    if (pingMessage.trim()) body.message = pingMessage.trim();
    const { data, error: err } = await dashboardFetch<{ sent: number; weekStart?: string }>(
      "/api/matches/challenges/weekly-ping",
      { method: "POST", body: JSON.stringify(body) }
    );
    setPinging(false);
    if (err) { setError(err); return; }
    setPingSuccess(`Ping sent to ${data?.sent ?? 0} captain(s).`);
    if (data?.weekStart) setPingWeekStart(new Date(data.weekStart).toISOString().slice(0, 10));
    await loadAvailability(pingWeekStart || undefined);
  };

  const scheduleChallenge = async (challenge: MatchChallenge) => {
    const draft = scheduleDrafts[challenge.id];
    if (!draft?.scheduledTime) { setError("Set date/time for this challenge"); return; }
    setSchedulingId(challenge.id);
    setError(null);
    const { error: err } = await dashboardFetch(`/api/matches/challenges/${challenge.id}`, {
      method: "PUT",
      body: JSON.stringify({
        action: "schedule",
        scheduledTime: new Date(draft.scheduledTime).toISOString(),
        bestOf: draft.bestOf || 3,
      }),
    });
    setSchedulingId(null);
    if (err) { setError(err); return; }
    setSuccess("Challenge scheduled — match created.");
    await loadChallenges();
  };

  const scheduleDirectPair = async () => {
    if (!pairA || !pairB || pairA === pairB) { setError("Select two different available teams"); return; }
    if (!pairTime) { setError("Set a date/time for the match"); return; }
    setPairing(true);
    setError(null);
    const body: Record<string, string | number> = {
      teamAId: pairA,
      teamBId: pairB,
      scheduledTime: new Date(pairTime).toISOString(),
      bestOf: pairBo,
    };
    if (pingWeekStart) body.weekStart = pingWeekStart;
    const { error: err } = await dashboardFetch("/api/matches/challenges/admin-schedule", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setPairing(false);
    if (err) { setError(err); return; }
    setSuccess("Match scheduled directly between available teams.");
    await Promise.all([loadChallenges(), loadAvailability(pingWeekStart || undefined)]);
  };

  // ── Auto-generator helpers
  type LeaderboardRow = { team?: { id: string; name?: string }; rank?: number };
  type TeamEntry = { id: string; name: string; rank: number };
  const fetchStandings = async (): Promise<LeaderboardRow[]> => {
    const res = await fetch(`/api/leaderboards/teams?limit=200`);
    if (!res.ok) return [] as LeaderboardRow[];
    const json = (await res.json()) as { standings?: LeaderboardRow[] } | LeaderboardRow[] | null;
    if (!json) return [];
    if (Array.isArray(json)) return json as LeaderboardRow[];
    return json.standings ?? [];
  };

  const generateMatchups = async () => {
    if (!firstMatchDateTime) { setError("Set first match date/time"); return; }
    setGenerating(true);
    setError(null);
    try {
      // use availableTeams from state; require at least 2
      const pool = availableTeams.filter((t) => t.isAvailable && t.teamId);
    if (pool.length < 2) { setError("Need at least 2 available teams to generate matches"); setGenerating(false); return; }

    // fetch standings to derive buckets
    const standings = await fetchStandings();
    const standingByTeam = new Map<string, number>();
    let maxRank = 0;
    for (const s of standings) {
      if (s.team?.id) {
        standingByTeam.set(s.team.id, s.rank ?? 9999);
        maxRank = Math.max(maxRank, s.rank ?? 0);
      }
    }

    // Prepare team objects and shuffle so every team appears at most once
    const teams = pool.map((p) => ({ id: p.teamId, name: p.team?.name ?? p.teamId, rank: standingByTeam.get(p.teamId) ?? (maxRank + 1) }));

    // shuffle teams but keep some ordering by rank bias: sort by rank then do Fisher-Yates within small windows
    teams.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    // simple shuffle to mix teams while preserving relative rank order roughly
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.max(0, i - Math.floor(Math.random() * Math.min(3, teams.length)));
      const tmp = teams[i];
      teams[i] = teams[j];
      teams[j] = tmp;
    }

    // Pair sequentially so each team appears only once
    const pairCount = Math.floor(teams.length / 2);
    const drafts: typeof autoDrafts = [];
    const firstDate = new Date(firstMatchDateTime);

    // Build set of previous pairs from server endpoint (preferred) or fall back to in-memory challenges
    const previousPairs = new Set<string>();
    if (avoidRematches) {
      try {
        const since = pingWeekStart ? new Date(pingWeekStart).toISOString() : undefined;
        const q = since ? `?since=${encodeURIComponent(since)}` : "";
        const res = await fetch(`/api/matches/prior-opponents${q}`);
        if (res.ok) {
          const json = await res.json();
          for (const p of json.pairs ?? []) {
            const ida = p.teamAId;
            const idb = p.teamBId;
            if (!ida || !idb) continue;
            const key = ida < idb ? `${ida}|${idb}` : `${idb}|${ida}`;
            previousPairs.add(key);
          }
        } else {
          // fallback to using loaded challenges
          for (const c of challenges) {
            const ida = c.challengerTeam?.id;
            const idb = c.challengedTeam?.id;
            if (ida && idb) {
              const key = ida < idb ? `${ida}|${idb}` : `${idb}|${ida}`;
              previousPairs.add(key);
            }
          }
        }
      } catch (e) {
        for (const c of challenges) {
          const ida = c.challengerTeam?.id;
          const idb = c.challengedTeam?.id;
          if (ida && idb) {
            const key = ida < idb ? `${ida}|${idb}` : `${idb}|${ida}`;
            previousPairs.add(key);
          }
        }
      }
    }

    const makePairsFromOrder = (order: TeamEntry[]) => {
      const res: { a: TeamEntry; b: TeamEntry }[] = [];
      for (let i = 0; i < pairCount; i++) {
        const a = order[i * 2];
        const b = order[i * 2 + 1];
        if (!a || !b) return null;
        res.push({ a, b });
      }
      return res;
    };

    let finalPairs: { a: TeamEntry; b: TeamEntry }[] | null = null;

    if (avoidRematches && previousPairs.size > 0) {
      // Try several shuffles to find an order without previous pairs
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // shuffle teams array copy
        const copy = teams.slice();
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = copy[i];
          copy[i] = copy[j];
          copy[j] = tmp;
        }
        const pairs = makePairsFromOrder(copy);
        if (!pairs) continue;
        let ok = true;
        for (const p of pairs) {
          const ida = p.a.id;
          const idb = p.b.id;
          const key = ida < idb ? `${ida}|${idb}` : `${idb}|${ida}`;
          if (previousPairs.has(key)) { ok = false; break; }
        }
        if (ok) { finalPairs = pairs; break; }
      }
    }

    // fallback: use current ordering or first possible pairing
    if (!finalPairs) {
      const defaultPairs = makePairsFromOrder(teams);
      finalPairs = defaultPairs ?? [];
    }

    for (let i = 0; i < finalPairs.length; i++) {
      const a = finalPairs[i].a;
      const b = finalPairs[i].b;
      const idx = i; // pair index
      const dayIndex = Math.floor(idx / matchesPerDay);
      const slotInDay = idx % matchesPerDay;
      const scheduled = new Date(firstDate.getTime() + dayIndex * 24 * 60 * 60 * 1000 + slotInDay * spacingMinutes * 60000);

      drafts.push({
        id: `draft-${i}-${Date.now()}`,
        teamAId: a.id,
        teamAName: a.name,
        teamBId: b.id,
        teamBName: b.name,
        scheduledTime: scheduled.toISOString(),
        bestOf: autoBestOf,
      });
    }

    setAutoDrafts(drafts);
    setGenerating(false);
    } catch (err) {
      console.error('generateMatchups error', err);
      setError(typeof err === 'string' ? err : (err as Error)?.message ?? 'Failed to generate matchups');
      setGenerating(false);
    }
  };

  const scheduleAutoMatches = async () => {
    if (autoDrafts.length === 0) { setError("No generated matches to schedule"); return; }
    setSchedulingAuto(true);
    setError(null);

    for (const d of autoDrafts) {
      const body: Record<string, string | number> = {
        teamAId: d.teamAId,
        teamBId: d.teamBId,
        scheduledTime: new Date(d.scheduledTime).toISOString(),
        bestOf: d.bestOf,
      };
      if (pingWeekStart) body.weekStart = pingWeekStart;
      const { error: err } = await dashboardFetch("/api/matches/challenges/admin-schedule", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (err) {
        setError(err);
        setSchedulingAuto(false);
        return;
      }
    }

    setSchedulingAuto(false);
    setSuccess(`Scheduled ${autoDrafts.length} auto-generated matches.`);
    setAutoDrafts([]);
    await Promise.all([loadChallenges(), loadAvailability(pingWeekStart || undefined)]);
  };

  // ── Derived ──────────────────────────────────────────────
  const acceptedChallenges = challenges.filter((c) => c.status === "ACCEPTED");
  const pendingChallenges = challenges.filter((c) => c.status === "PENDING");
  const scheduledChallenges = challenges.filter((c) => c.status === "SCHEDULED");
  const otherChallenges = challenges.filter((c) =>
    ["REJECTED", "CANCELLED"].includes(c.status)
  );

  const weekLabel = pingWeekStart
    ? new Date(pingWeekStart + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "this week";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
            Weekly Scrims
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Manage the weekly challenge window — ping captains, track availability, schedule matches.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-white/10 text-[#888] hover:text-white hover:border-white/30 text-[10px] font-black uppercase tracking-wider transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Global alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle size={14} className="shrink-0" /> {success}
        </div>
      )}

      {/* ── Step 0: Configure Scrim Tournament ── */}
      <Section title="Step 0 — Scrim Tournament" icon={<Trophy size={14} />}>
        {loadingSeason ? (
          <div className="flex items-center gap-2 text-[#666] text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading season info...
          </div>
        ) : !seasonInfo ? (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={14} /> No active season found. Create one first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current status */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#666]">
                Active Season:
              </span>
              <span className="text-white font-bold">{seasonInfo.name}</span>
            </div>

            {scrimTournament ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  {scrimTournament.banner && (
                    <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden border border-white/10">
                      <Image
                        src={scrimTournament.banner}
                        alt={scrimTournament.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">
                      Current Scrim Tournament
                    </p>
                    <p className="text-white font-bold text-lg">{scrimTournament.name}</p>
                    <p className="text-[#666] text-xs mt-1">
                      {scrimTournament._count?.matches ?? 0} matches · {scrimTournament.status}
                    </p>
                  </div>
                  <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle size={14} />
                  No scrim tournament configured. Create one or select an existing tournament.
                </p>
              </div>
            )}

            {/* Create new or select existing */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {/* Create new */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block">
                  Create New Tournament
                </label>
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder={`${seasonInfo.name} Scrims`}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                />
                {/* File picker — uploads to Supabase on submit */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="scrim-banner-img"
                    className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#555] cursor-pointer"
                  >
                    Banner (optional)
                  </label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 border border-white/10 bg-[#0d0d14] cursor-pointer hover:border-[#e8a000]/40 transition-colors"
                  >
                    {newTournamentImage ? (
                      <>
                        <img
                          src={newTournamentImage}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded shrink-0 border border-white/10"
                        />
                        <span className="text-xs text-[#aaa] truncate flex-1">Image selected</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTournamentImage(null);
                            if (imageInputRef.current) imageInputRef.current.value = "";
                          }}
                          className="text-[#555] hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-wider shrink-0"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-[#444] text-xs tracking-wide">
                        Click to choose file…
                      </span>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    id="scrim-banner-img"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setNewTournamentImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={createScrimTournament}
                  disabled={creatingTournament || !newTournamentName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
                >
                  {creatingTournament ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Create
                </button>
              </div>

              {/* Select existing */}
              {availableTournaments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block">
                    Or Select Existing Tournament
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedExistingTournament}
                      onChange={(e) => setSelectedExistingTournament(e.target.value)}
                      className="flex-1 bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                    >
                      <option value="">— Select —</option>
                      {availableTournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t._count?.matches ?? 0} matches)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={setExistingTournament}
                      disabled={settingTournament || !selectedExistingTournament}
                      className="flex items-center gap-1.5 px-4 py-2 border border-white/10 text-white text-xs font-black uppercase tracking-wider hover:border-[#e8a000]/50 disabled:opacity-50"
                    >
                      {settingTournament ? <Loader2 size={12} className="animate-spin" /> : null}
                      Set
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[#555] text-[10px] pt-2">
              All scheduled scrims will be added as matches under this tournament for easier tracking and leaderboard integration.
            </p>
          </div>
        )}
      </Section>

      {/* ── Step 3c: Auto-generate matchups ── */}
      <Section title="Step 3c — Auto-generate matchups" icon={<RefreshCw size={14} /> }>
        <p className="text-[#666] text-xs mb-3">Generate a balanced set of matchups from available teams. Edit drafts before scheduling.</p>

        <div className="grid sm:grid-cols-3 gap-2 items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">First match (date & time)</label>
            <input
              type="datetime-local"
              value={firstMatchDateTime}
              onChange={(e) => setFirstMatchDateTime(e.target.value)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Matches / day</label>
            <input
              type="number"
              min={1}
              value={matchesPerDay}
              onChange={(e) => setMatchesPerDay(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Days</label>
            <input
              type="number"
              min={1}
              value={daysCount}
              onChange={(e) => setDaysCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Spacing (mins)</label>
            <input
              type="number"
              min={5}
              value={spacingMinutes}
              onChange={(e) => setSpacingMinutes(Math.max(5, parseInt(e.target.value || '60', 10)))}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Format</label>
            <select
              value={autoBestOf}
              onChange={(e) => setAutoBestOf(parseInt(e.target.value, 10))}
              className="bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            >
              <option value={1}>BO1</option>
              <option value={3}>BO3</option>
              <option value={5}>BO5</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-[#bbb]">
                <input
                  type="checkbox"
                  checked={avoidRematches}
                  onChange={(e) => setAvoidRematches(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">Avoid rematches</span>
              </label>
              <div className="flex gap-2">
              <button
                type="button"
                disabled={generating}
                onClick={generateMatchups}
                className="px-4 py-2 bg-[#e8a000] text-black text-[10px] font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
              >
                {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Generate
              </button>
              <button
                type="button"
                disabled={schedulingAuto || autoDrafts.length === 0}
                onClick={scheduleAutoMatches}
                className="px-4 py-2 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider hover:border-[#e8a000]/50 disabled:opacity-50"
              >
                {schedulingAuto ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Schedule All
              </button>
              </div>
            </div>
          </div>
        </div>

        {autoDrafts.length > 0 && (
          <div className="mt-4 space-y-2">
            {autoDrafts.map((d) => (
              <div key={d.id} className="flex items-center gap-2 border border-white/5 bg-white/[0.02] rounded px-3 py-2">
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{d.teamAName} vs {d.teamBName}</p>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="datetime-local"
                      value={new Date(d.scheduledTime).toISOString().slice(0,16)}
                      onChange={(e) => setAutoDrafts((prev) => prev.map((p) => p.id === d.id ? { ...p, scheduledTime: new Date(e.target.value).toISOString() } : p))}
                      className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
                    />
                    <select
                      value={d.bestOf}
                      onChange={(e) => setAutoDrafts((prev) => prev.map((p) => p.id === d.id ? { ...p, bestOf: parseInt(e.target.value, 10) } : p))}
                      className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
                    >
                      <option value={1}>BO1</option>
                      <option value={3}>BO3</option>
                      <option value={5}>BO5</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDrafts((prev) => prev.filter((p) => p.id !== d.id))}
                  className="text-red-400 text-[10px] font-black uppercase tracking-wider"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Step 1: Open window + ping ── */}
      <Section title="Step 1 — Open weekly window & ping captains" icon={<Megaphone size={14} />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">
                Week start (Monday)
              </label>
              <input
                type="date"
                value={pingWeekStart}
                onChange={(e) => setPingWeekStart(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
              <p className="text-[10px] text-[#555] mt-1">Leave blank to use the current week.</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">
                Proposed scrim date &amp; time *
              </label>
              <input
                type="datetime-local"
                value={pingDate}
                onChange={(e) => setPingDate(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">
                Message to captains (optional)
              </label>
              <textarea
                value={pingMessage}
                onChange={(e) => setPingMessage(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="e.g. This week's scrim window is open. Good luck!"
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={sendPing}
              disabled={pinging || !pingDate}
              className="flex items-center gap-2 px-5 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
            >
              {pinging ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />}
              Ping All Captains
            </button>
            {pingSuccess && (
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle size={12} /> {pingSuccess}
              </p>
            )}
          </div>

          {/* Current ping info */}
          {currentPing ? (
            <div className="rounded-md border border-[#e8a000]/20 bg-[#e8a000]/5 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e8a000]">
                Current active ping
              </p>
              <p className="text-white text-sm font-semibold">
                Week of{" "}
                {new Date(currentPing.weekStart).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-[#aaa] text-sm">
                Proposed date:{" "}
                <span className="text-white font-semibold">
                  {new Date(currentPing.scrimDate).toLocaleString()}
                </span>
              </p>
              {currentPing.message && (
                <p className="text-[#888] text-xs italic">&ldquo;{currentPing.message}&rdquo;</p>
              )}
              <p className="text-[#555] text-[10px]">
                Last updated: {new Date(currentPing.updatedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-white/5 bg-white/[0.02] p-4 flex items-center justify-center">
              <p className="text-[#555] text-sm">No ping sent yet for {weekLabel}.</p>
            </div>
          )}
        </div>
      </Section>

      {/* ── Step 2: Availability ── */}
      <Section
        title="Step 2 — Team availability"
        count={availableTeams.length}
        icon={<CalendarCheck size={14} />}
      >
        {loadingAvail ? (
          <div className="flex items-center gap-2 text-[#666] text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : availabilities.length === 0 ? (
          <p className="text-[#555] text-sm">No teams have responded yet. Ping captains in Step 1.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {availabilities.map((entry) => (
              <div
                key={entry.id}
                className={`border px-3 py-2.5 rounded-md ${
                  entry.isAvailable
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-bold">{entry.team?.name ?? "Team"}</p>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider ${
                      entry.isAvailable ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {entry.isAvailable ? "✓ Available" : "✗ Busy"}
                  </span>
                </div>
                <p className="text-[#555] text-[10px]">[{entry.team?.tag ?? "—"}]</p>
                {entry.note && <p className="text-[#888] text-[10px] mt-1 italic">&ldquo;{entry.note}&rdquo;</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Step 3a: Challenge queue ── */}
      <Section
        title="Step 3a — Challenge queue"
        count={challenges.length}
        icon={<Swords size={14} />}
      >
        {loadingChallenges ? (
          <div className="flex items-center gap-2 text-[#666] text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : challenges.length === 0 ? (
          <p className="text-[#555] text-sm">No challenges sent yet this week.</p>
        ) : (
          <div className="space-y-6">
            {/* Needs scheduling — ACCEPTED */}
            {acceptedChallenges.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2 flex items-center gap-1.5">
                  <Clock size={11} /> Needs scheduling ({acceptedChallenges.length})
                </p>
                <div className="space-y-2">
                  {acceptedChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="border border-blue-500/20 bg-blue-500/5 rounded-md p-3 grid md:grid-cols-[1fr_auto] gap-3 items-start"
                    >
                      <div>
                        <p className="text-white font-bold text-sm">
                          {c.challengerTeam?.name ?? "Team A"}{" "}
                          <span className="text-[#555]">vs</span>{" "}
                          {c.challengedTeam?.name ?? "Team B"}
                        </p>
                        <p className="text-[#666] text-[10px] mt-0.5">
                          Week of {new Date(c.weekStart).toLocaleDateString()} · Challenged by{" "}
                          {c.initiatedBy?.ign ?? "—"}
                        </p>
                        {c.message && (
                          <p className="text-[#888] text-[10px] italic mt-0.5">&ldquo;{c.message}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={scheduleDrafts[c.id]?.scheduledTime ?? ""}
                          onChange={(e) =>
                            setScheduleDrafts((prev) => ({
                              ...prev,
                              [c.id]: {
                                scheduledTime: e.target.value,
                                bestOf: prev[c.id]?.bestOf ?? 3,
                              },
                            }))
                          }
                          className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1.5 text-xs outline-none focus:border-[#e8a000]/50"
                        />
                        <select
                          value={scheduleDrafts[c.id]?.bestOf ?? 3}
                          onChange={(e) =>
                            setScheduleDrafts((prev) => ({
                              ...prev,
                              [c.id]: {
                                scheduledTime: prev[c.id]?.scheduledTime ?? "",
                                bestOf: parseInt(e.target.value, 10),
                              },
                            }))
                          }
                          className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1.5 text-xs outline-none focus:border-[#e8a000]/50"
                        >
                          <option value={1}>BO1</option>
                          <option value={3}>BO3</option>
                          <option value={5}>BO5</option>
                          <option value={7}>BO7</option>
                        </select>
                        <button
                          type="button"
                          disabled={schedulingId === c.id}
                          onClick={() => scheduleChallenge(c)}
                          className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-400 disabled:opacity-50 flex items-center gap-1"
                        >
                          {schedulingId === c.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <CheckCircle size={11} />
                          )}
                          Schedule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending response */}
            {pendingChallenges.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-2 flex items-center gap-1.5">
                  <Clock size={11} /> Awaiting opponent response ({pendingChallenges.length})
                </p>
                <div className="space-y-1">
                  {pendingChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="border border-yellow-500/15 bg-yellow-500/5 rounded-md px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {c.challengerTeam?.name ?? "?"} → {c.challengedTeam?.name ?? "?"}
                        </p>
                        <p className="text-[#666] text-[10px]">
                          Week of {new Date(c.weekStart).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled */}
            {scheduledChallenges.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle size={11} /> Scheduled matches ({scheduledChallenges.length})
                </p>
                <div className="space-y-1">
                  {scheduledChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="border border-emerald-500/15 bg-emerald-500/5 rounded-md px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <p className="text-white text-sm font-semibold">
                        {c.challengerTeam?.name ?? "?"} vs {c.challengedTeam?.name ?? "?"}
                      </p>
                      <div className="flex items-center gap-3">
                        {c.scheduledMatch && (
                          <span className="text-[#aaa] text-xs">
                            {new Date(c.scheduledMatch.scheduledTime).toLocaleString()}
                          </span>
                        )}
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected / Cancelled */}
            {otherChallenges.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] mb-2 flex items-center gap-1.5">
                  <XCircle size={11} /> Rejected / Cancelled ({otherChallenges.length})
                </p>
                <div className="space-y-1">
                  {otherChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="border border-white/5 bg-white/[0.02] rounded-md px-3 py-2 flex items-center justify-between gap-3 opacity-60"
                    >
                      <p className="text-[#888] text-sm">
                        {c.challengerTeam?.name ?? "?"} vs {c.challengedTeam?.name ?? "?"}
                      </p>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Step 3b: Direct pair available teams ── */}
      <Section
        title="Step 3b — Schedule available teams directly"
        count={availableTeams.length}
        icon={<Users size={14} />}
      >
        <p className="text-[#666] text-xs mb-4">
          Pair any two available teams without requiring them to have exchanged a challenge first.
          Useful when time is short or when teams cannot find opponents through the challenge flow.
        </p>

        {availableTeams.length < 2 ? (
          <p className="text-[#555] text-sm">
            Need at least 2 available teams. Check Step 2 — teams must mark themselves available first.
          </p>
        ) : (
          <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Team A</label>
              <select
                value={pairA}
                onChange={(e) => setPairA(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value="">Select team</option>
                {availableTeams.map((entry) => (
                  <option key={`a-${entry.teamId}`} value={entry.teamId}>
                    {entry.team?.name ?? entry.teamId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Team B</label>
              <select
                value={pairB}
                onChange={(e) => setPairB(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value="">Select team</option>
                {availableTeams.map((entry) => (
                  <option key={`b-${entry.teamId}`} value={entry.teamId}>
                    {entry.team?.name ?? entry.teamId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Date &amp; time</label>
              <input
                type="datetime-local"
                value={pairTime}
                onChange={(e) => setPairTime(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666] block mb-1">Format</label>
              <select
                value={pairBo}
                onChange={(e) => setPairBo(parseInt(e.target.value, 10))}
                className="bg-[#0d0d14] border border-white/10 text-white px-2 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value={1}>BO1</option>
                <option value={3}>BO3</option>
                <option value={5}>BO5</option>
                <option value={7}>BO7</option>
              </select>
            </div>
            <button
              type="button"
              disabled={pairing}
              onClick={scheduleDirectPair}
              className="px-4 py-2 bg-[#e8a000] text-black text-[10px] font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {pairing ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
              Set Match
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
