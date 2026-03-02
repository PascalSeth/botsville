"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Loader2, Megaphone } from "lucide-react";

type Tournament = { id: string; name: string; status: string };
type Match = {
  id: string;
  stage: string;
  status: string;
  scoreA: number;
  scoreB: number;
  scheduledTime: string;
  teamA?: { id: string; name: string; tag: string } | null;
  teamB?: { id: string; name: string; tag: string } | null;
  winner?: { id: string; name: string } | null;
};

type MatchChallenge = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "SCHEDULED";
  weekStart: string;
  createdAt: string;
  challengerTeam?: { id: string; name: string; tag: string } | null;
  challengedTeam?: { id: string; name: string; tag: string } | null;
  scheduledMatch?: { id: string; scheduledTime: string; status: string } | null;
};

type ChallengePayload = { challenges: MatchChallenge[] };

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

export default function DashboardMatchesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, { scheduledTime: string; bestOf: number }>>({});
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [weeklyPingLoading, setWeeklyPingLoading] = useState(false);
  const [weeklyPingSuccess, setWeeklyPingSuccess] = useState<string | null>(null);
  const [weeklyPingDate, setWeeklyPingDate] = useState("");
  const [weeklyWeekStart, setWeeklyWeekStart] = useState("");
  const [availableTeams, setAvailableTeams] = useState<AvailabilityEntry[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [pairTeamAId, setPairTeamAId] = useState("");
  const [pairTeamBId, setPairTeamBId] = useState("");
  const [pairScheduledTime, setPairScheduledTime] = useState("");
  const [pairScheduling, setPairScheduling] = useState(false);
  const [schedulingChallengeId, setSchedulingChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingTournaments(true);
      const { data, error: err } = await dashboardFetch<{ tournaments: Tournament[] }>("/api/tournaments?limit=100");
      setLoadingTournaments(false);
      if (err) {
        setError(err);
        setTournaments([]);
        return;
      }
      setTournaments(data?.tournaments ?? []);
      if (data?.tournaments?.length && !selectedTournamentId) {
        setSelectedTournamentId(data.tournaments[0].id);
      }
    })();
  }, []);

  const loadMatches = useCallback(async () => {
    if (!selectedTournamentId) {
      setMatches([]);
      return;
    }
    setLoadingMatches(true);
    const { data, error: err } = await dashboardFetch<Match[]>(
      `/api/tournaments/${selectedTournamentId}/matches`
    );
    setLoadingMatches(false);
    if (err) {
      setError(err);
      setMatches([]);
      return;
    }
    setError(null);
    setMatches(Array.isArray(data) ? data : []);
  }, [selectedTournamentId]);

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    const { data, error: err } = await dashboardFetch<ChallengePayload>("/api/matches/challenges");
    setLoadingChallenges(false);

    if (err) {
      setError(err);
      setChallenges([]);
      return;
    }

    setChallenges(Array.isArray(data?.challenges) ? data.challenges : []);
  }, []);

  const loadAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    const query = weeklyWeekStart ? `?weekStart=${encodeURIComponent(weeklyWeekStart)}` : "";
    const { data, error: err } = await dashboardFetch<AvailabilityPayload>(`/api/matches/challenges/availability${query}`);
    setLoadingAvailability(false);

    if (err) {
      setError(err);
      setAvailableTeams([]);
      return;
    }

    if (!weeklyWeekStart && data?.weekStart) {
      const date = new Date(data.weekStart);
      setWeeklyWeekStart(date.toISOString().slice(0, 10));
    }

    if (!weeklyPingDate && data?.ping?.scrimDate) {
      const date = new Date(data.ping.scrimDate);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setWeeklyPingDate(local);
    }

    const currentAvailable = Array.isArray(data?.availableTeams) ? data.availableTeams : [];
    setAvailableTeams(currentAvailable);

    if (currentAvailable.length > 0) {
      setPairTeamAId((prev) => prev || currentAvailable[0].teamId);
      setPairTeamBId((prev) => {
        if (prev) return prev;
        return currentAvailable.find((entry) => entry.teamId !== currentAvailable[0].teamId)?.teamId ?? "";
      });
    }
  }, [weeklyWeekStart, weeklyPingDate]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const sendWeeklyPing = async () => {
    if (!weeklyPingDate) {
      setError("Set scrim date/time before pinging captains");
      return;
    }

    setWeeklyPingLoading(true);
    setWeeklyPingSuccess(null);
    setError(null);
    const payload: { scrimDate: string; weekStart?: string } = {
      scrimDate: new Date(weeklyPingDate).toISOString(),
    };
    if (weeklyWeekStart) {
      payload.weekStart = weeklyWeekStart;
    }

    const { data, error: err } = await dashboardFetch<{ sent: number; weekStart?: string }>("/api/matches/challenges/weekly-ping", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setWeeklyPingLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setWeeklyPingSuccess(`Weekly availability ping sent to ${data?.sent ?? 0} captain(s).`);
    if (data?.weekStart) {
      setWeeklyWeekStart(new Date(data.weekStart).toISOString().slice(0, 10));
    }
    await loadAvailability();
  };

  const scheduleChallenge = async (challenge: MatchChallenge) => {
    const draft = scheduleDrafts[challenge.id];
    if (!draft?.scheduledTime) {
      setError("Set scheduled date/time before scheduling");
      return;
    }

    setSchedulingChallengeId(challenge.id);
    setError(null);

    const { error: err } = await dashboardFetch(`/api/matches/challenges/${challenge.id}`, {
      method: "PUT",
      body: JSON.stringify({
        action: "schedule",
        scheduledTime: new Date(draft.scheduledTime).toISOString(),
        tournamentId: selectedTournamentId || undefined,
        bestOf: draft.bestOf || 3,
      }),
    });

    setSchedulingChallengeId(null);

    if (err) {
      setError(err);
      return;
    }

    await Promise.all([loadChallenges(), loadMatches()]);
  };

  const scheduleAvailableTeams = async () => {
    if (!pairTeamAId || !pairTeamBId || pairTeamAId === pairTeamBId) {
      setError("Select two different available teams");
      return;
    }

    if (!pairScheduledTime) {
      setError("Set scheduled date/time for available teams");
      return;
    }

    setPairScheduling(true);
    setError(null);

    const payload: {
      teamAId: string;
      teamBId: string;
      scheduledTime: string;
      weekStart?: string;
      tournamentId?: string;
    } = {
      teamAId: pairTeamAId,
      teamBId: pairTeamBId,
      scheduledTime: new Date(pairScheduledTime).toISOString(),
    };

    if (weeklyWeekStart) {
      payload.weekStart = weeklyWeekStart;
    }

    if (selectedTournamentId) {
      payload.tournamentId = selectedTournamentId;
    }

    const { error: err } = await dashboardFetch("/api/matches/challenges/admin-schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setPairScheduling(false);

    if (err) {
      setError(err);
      return;
    }

    await Promise.all([loadMatches(), loadChallenges()]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
          Matches
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Admin can schedule matches directly, or from accepted team challenges.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-white font-semibold text-sm">Weekly scrim availability</p>
          <p className="text-[#777] text-xs">Ping captains with a scrim date, then schedule only teams that marked available.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={weeklyWeekStart}
              onChange={(event) => setWeeklyWeekStart(event.target.value)}
              className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
            />
            <input
              type="datetime-local"
              value={weeklyPingDate}
              onChange={(event) => setWeeklyPingDate(event.target.value)}
              className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={sendWeeklyPing}
          disabled={weeklyPingLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50"
        >
          {weeklyPingLoading ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
          Ping Captains
        </button>
      </div>

      {weeklyPingSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {weeklyPingSuccess}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="p-3 border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
          Available teams this week
        </div>
        {loadingAvailability ? (
          <div className="p-6 text-center text-[#666]">Loading availability...</div>
        ) : availableTeams.length === 0 ? (
          <div className="p-6 text-center text-[#666]">No teams marked available yet.</div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableTeams.map((entry) => (
                <div key={entry.id} className="border border-white/10 bg-[#0d0d14] px-3 py-2">
                  <p className="text-white text-sm font-semibold">{entry.team?.name ?? "Team"}</p>
                  <p className="text-[#777] text-[11px]">[{entry.team?.tag ?? "—"}] · Available</p>
                  {entry.note ? <p className="text-[#999] text-[11px] mt-1">{entry.note}</p> : null}
                </div>
              ))}
            </div>

            <div className="border border-white/10 bg-[#0d0d14] p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">Schedule from available teams</p>
              <div className="grid md:grid-cols-4 gap-2">
                <select
                  value={pairTeamAId}
                  onChange={(event) => setPairTeamAId(event.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 text-white px-2 py-1.5 text-xs"
                >
                  <option value="">Team A</option>
                  {availableTeams.map((entry) => (
                    <option key={`a-${entry.teamId}`} value={entry.teamId}>{entry.team?.name ?? entry.teamId}</option>
                  ))}
                </select>
                <select
                  value={pairTeamBId}
                  onChange={(event) => setPairTeamBId(event.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 text-white px-2 py-1.5 text-xs"
                >
                  <option value="">Team B</option>
                  {availableTeams.map((entry) => (
                    <option key={`b-${entry.teamId}`} value={entry.teamId}>{entry.team?.name ?? entry.teamId}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={pairScheduledTime}
                  onChange={(event) => setPairScheduledTime(event.target.value)}
                  className="bg-[#0a0a0f] border border-white/10 text-white px-2 py-1.5 text-xs"
                />
                <button
                  type="button"
                  disabled={pairScheduling}
                  onClick={scheduleAvailableTeams}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-[#e8a000] text-black hover:bg-[#ffb800] disabled:opacity-50"
                >
                  {pairScheduling ? "Scheduling..." : "Set Match"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        <div className="p-3 border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
          Challenge queue
        </div>
        {loadingChallenges ? (
          <div className="p-6 text-center text-[#666]">Loading challenges...</div>
        ) : challenges.length === 0 ? (
          <div className="p-6 text-center text-[#666]">No challenges yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Teams</th>
                  <th className="p-3">Week</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-3 text-white font-semibold">
                      {challenge.challengerTeam?.name ?? "Team A"} vs {challenge.challengedTeam?.name ?? "Team B"}
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{new Date(challenge.weekStart).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#e8a000]/20 text-[#e8a000]">
                        {challenge.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {challenge.status === "SCHEDULED" && challenge.scheduledMatch ? (
                        <span className="text-[#aaa] text-xs">{new Date(challenge.scheduledMatch.scheduledTime).toLocaleString()}</span>
                      ) : challenge.status === "ACCEPTED" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={scheduleDrafts[challenge.id]?.scheduledTime ?? ""}
                            onChange={(event) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [challenge.id]: {
                                  scheduledTime: event.target.value,
                                  bestOf: prev[challenge.id]?.bestOf ?? 3,
                                },
                              }))
                            }
                            className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
                          />
                          <select
                            value={scheduleDrafts[challenge.id]?.bestOf ?? 3}
                            onChange={(event) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [challenge.id]: {
                                  scheduledTime: prev[challenge.id]?.scheduledTime ?? "",
                                  bestOf: parseInt(event.target.value, 10),
                                },
                              }))
                            }
                            className="bg-[#0d0d14] border border-white/10 text-white px-2 py-1 text-xs outline-none focus:border-[#e8a000]/50"
                          >
                            <option value={1}>Bo1</option>
                            <option value={3}>Bo3</option>
                            <option value={5}>Bo5</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-[#555] text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {challenge.status === "ACCEPTED" ? (
                        <button
                          type="button"
                          disabled={schedulingChallengeId === challenge.id}
                          onClick={() => scheduleChallenge(challenge)}
                          className="text-[10px] font-bold uppercase text-[#e8a000] hover:underline disabled:opacity-50"
                        >
                          {schedulingChallengeId === challenge.id ? "Scheduling..." : "Schedule"}
                        </button>
                      ) : (
                        <span className="text-[#555] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-2">
          Tournament
        </label>
        <select
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="w-full max-w-md bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
        >
          <option value="">Select tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loadingTournaments || loadingMatches ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : !selectedTournamentId ? (
          <div className="p-8 text-center text-[#666]">Select a tournament above.</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No matches for this tournament.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Stage</th>
                  <th className="p-3">Team A</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Team B</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-3 text-[#aaa] text-sm">{m.stage}</td>
                    <td className="p-3 text-white font-semibold">{m.teamA?.name ?? "TBD"}</td>
                    <td className="p-3 text-[#e8a000] font-mono font-bold">
                      {m.scoreA} – {m.scoreB}
                    </td>
                    <td className="p-3 text-white font-semibold">{m.teamB?.name ?? "TBD"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#e8a000]/20 text-[#e8a000]">
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">
                      {m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
