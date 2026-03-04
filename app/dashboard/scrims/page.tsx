"use client";

import { useState, useEffect, useCallback } from "react";
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
  heroImage?: string | null;
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
  const [newTournamentImage, setNewTournamentImage] = useState("");
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
    const { data, error: err } = await dashboardFetch<{ tournament: ScrimTournament }>(
      "/api/seasons/scrim-tournament",
      { method: "POST", body: JSON.stringify({ name: newTournamentName.trim(), heroImage: newTournamentImage.trim() || null, setAsDefault: true }) }
    );
    setCreatingTournament(false);
    if (err) { setError(err); return; }
    setSuccess(`Tournament "${data?.tournament?.name}" created and set as default.`);
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
                  {scrimTournament.heroImage && (
                    <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden border border-white/10">
                      <Image
                        src={scrimTournament.heroImage}
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
                <input
                  type="url"
                  value={newTournamentImage}
                  onChange={(e) => setNewTournamentImage(e.target.value)}
                  placeholder="Image URL (optional)"
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                />
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
