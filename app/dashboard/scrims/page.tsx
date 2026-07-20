"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { dashboardFetch } from "../lib/api";
import {
  Swords,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Tv,
  Calendar,
  Loader2,
  ExternalLink,
  Sparkles,
  UserCheck,
  Trash2,
  XCircle,
  AlertTriangle,
  Flame,
  Radio,
} from "lucide-react";

type MatchChallenge = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "SCHEDULED";
  weekStart: string;
  message?: string | null;
  createdAt: string;
  challengerTeam?: { id: string; name: string; tag: string; logo?: string | null } | null;
  challengedTeam?: { id: string; name: string; tag: string; logo?: string | null } | null;
  initiatedBy?: { id: string; ign: string } | null;
  respondedBy?: { id: string; ign: string } | null;
};

type StreamerFormState = {
  scheduledTime: string;
  streamerName: string;
  streamUrl: string;
};

export default function DashboardScrimsPage() {
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accepted" | "scheduled" | "open" | "all">("accepted");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [forms, setForms] = useState<Record<string, StreamerFormState>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // ── Fetch All Match Challenges ────────────────────────────────
  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await dashboardFetch<{ challenges: MatchChallenge[] }>(
        "/api/matches/challenges"
      );
      if (err) {
        setError(err);
      } else if (data) {
        setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
      }
    } catch {
      setError("Failed to load match challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // ── Admin Action: Accept Challenge ───────────────────────────
  const handleAdminAccept = async (challengeId: string) => {
    setSubmittingId(challengeId);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: err } = await dashboardFetch<{ message?: string }>(
        `/api/matches/challenges/${challengeId}`,
        {
          method: "PUT",
          body: JSON.stringify({ action: "accept" }),
        }
      );
      if (err) {
        setError(err);
      } else {
        setSuccess(data?.message || "Challenge accepted on behalf of squad!");
        await loadChallenges();
      }
    } catch {
      setError("Failed to accept challenge");
    } finally {
      setSubmittingId(null);
    }
  };

  // ── Admin Action: Decline/Cancel Challenge ───────────────────
  const handleAdminAction = async (challengeId: string, action: "reject" | "cancel") => {
    if (!confirm(`Are you sure you want to ${action} this challenge?`)) return;
    setSubmittingId(challengeId);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: err } = await dashboardFetch<{ message?: string }>(
        `/api/matches/challenges/${challengeId}`,
        {
          method: "PUT",
          body: JSON.stringify({ action }),
        }
      );
      if (err) {
        setError(err);
      } else {
        setSuccess(data?.message || `Challenge ${action}ed`);
        await loadChallenges();
      }
    } catch {
      setError(`Failed to ${action} challenge`);
    } finally {
      setSubmittingId(null);
    }
  };

  // ── Assign Streamer & Publish to Scrim Vault ─────────────────
  const handleAssignStreamer = async (challengeId: string) => {
    const form = forms[challengeId] || { scheduledTime: "", streamerName: "", streamUrl: "" };

    setSubmittingId(challengeId);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: err } = await dashboardFetch<{ message?: string }>(
        `/api/matches/challenges/${challengeId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            action: "assign_streamer",
            scheduledTime: form.scheduledTime ? new Date(form.scheduledTime).toISOString() : new Date().toISOString(),
            streamerName: form.streamerName.trim(),
            streamUrl: form.streamUrl.trim(),
          }),
        }
      );

      if (err) {
        setError(err);
      } else {
        setSuccess(
          data?.message || "Streamer assigned & live stream link auto-published to Scrim Vault!"
        );
        await loadChallenges();
      }
    } catch {
      setError("Failed to assign streamer");
    } finally {
      setSubmittingId(null);
    }
  };

  // ── Hard Delete All Challenges ───────────────────────────────
  const handleResetAllChallenges = async () => {
    setResetting(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: err } = await dashboardFetch<{ message?: string; count?: number }>(
        "/api/matches/challenges/reset",
        { method: "DELETE" }
      );
      if (err) {
        setError(err);
      } else {
        setSuccess(data?.message || "All challenges have been reset and hard deleted.");
        setShowResetModal(false);
        await loadChallenges();
      }
    } catch {
      setError("Failed to reset challenges");
    } finally {
      setResetting(false);
    }
  };

  const acceptedChallenges = challenges.filter((c) => c.status === "ACCEPTED");
  const scheduledChallenges = challenges.filter((c) => c.status === "SCHEDULED");
  const openPendingChallenges = challenges.filter((c) => c.status === "PENDING");

  return (
    <div className="space-y-8 pb-16 text-white">
      {/* ── Top Header Hero Banner ────────────────────────────── */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#0e0f17] to-[#07070c] border border-red-500/25 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-500/10">
              <Swords size={13} /> Challenge & Scrim Arena Control Hub
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Challenge <span className="text-red-500">Streamer Hub</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
            Manage accepted squad challenges, assign official streamers, enter YouTube live stream URLs, and auto-publish matches directly to the Scrim Vault.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <button
            onClick={loadChallenges}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-red-400" : "text-zinc-400"} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-3 rounded-2xl bg-red-600/20 border border-red-500/40 hover:bg-red-600 text-red-400 hover:text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl shadow-red-600/20"
          >
            <Trash2 size={14} />
            <span>Reset All Challenges</span>
          </button>
        </div>
      </div>

      {/* ── Live Metric Counter Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#10111a] to-[#0a0a0f] border border-blue-500/30 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Needs Streamer</p>
            <p className="text-3xl font-black text-white mt-1">{acceptedChallenges.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#10111a] to-[#0a0a0f] border border-emerald-500/30 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Streamed Scrims</p>
            <p className="text-3xl font-black text-white mt-1">{scheduledChallenges.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio size={22} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#10111a] to-[#0a0a0f] border border-amber-500/30 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Open Board</p>
            <p className="text-3xl font-black text-white mt-1">{openPendingChallenges.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Globe size={22} />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#10111a] to-[#0a0a0f] border border-purple-500/30 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Total Challenges</p>
            <p className="text-3xl font-black text-white mt-1">{challenges.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Swords size={22} />
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 shadow-lg">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg">
          <CheckCircle size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Sub-Navigation Bar ────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 overflow-x-auto scrollbar-hide">
        {[
          { key: "accepted", label: "Accepted (Needs Streamer)", count: acceptedChallenges.length, icon: UserCheck },
          { key: "scheduled", label: "Scheduled & Live Streamed", count: scheduledChallenges.length, icon: Video },
          { key: "open", label: "Open Board Listings", count: openPendingChallenges.length, icon: Globe },
          { key: "all", label: "All Challenges History", count: challenges.length, icon: Clock },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                active
                  ? "bg-red-600 text-white shadow-xl shadow-red-600/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${active ? "bg-black/40 text-white" : "bg-white/10 text-zinc-400"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Loader2 size={36} className="animate-spin text-red-500" />
          <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Challenge Queue...</p>
        </div>
      ) : activeTab === "accepted" ? (
        /* ── SECTION 1: ACCEPTED CHALLENGES (Assign Streamer & Publish) ─ */
        <div className="space-y-6">
          {acceptedChallenges.length === 0 ? (
            <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
              <CheckCircle size={44} className="text-zinc-600 mx-auto" />
              <h4 className="text-base font-black uppercase tracking-wide text-zinc-400">All Accepted Challenges Streamed!</h4>
              <p className="text-xs text-zinc-600 max-w-md mx-auto">
                No accepted squad challenges currently awaiting streamer assignment. When two captains accept a challenge, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {acceptedChallenges.map((challenge) => {
                const formState = forms[challenge.id] || {
                  scheduledTime: "",
                  streamerName: "",
                  streamUrl: "",
                };

                return (
                  <div
                    key={challenge.id}
                    className="p-7 rounded-3xl bg-gradient-to-b from-[#10121d] to-[#08090f] border border-blue-500/30 space-y-6 shadow-2xl relative overflow-hidden"
                  >
                    {/* Top Status Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <UserCheck size={13} /> BOTH CAPTAINS AGREED — AWAITING STREAMER
                        </span>
                      </div>

                      <button
                        onClick={() => handleAdminAction(challenge.id, "cancel")}
                        className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors"
                      >
                        Cancel Challenge
                      </button>
                    </div>

                    {/* Esports VS Matchup Display */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-3 px-4 rounded-2xl bg-black/40 border border-white/5">
                      {/* Team A */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-amber-400 font-black text-2xl shrink-0 overflow-hidden shadow-xl">
                          {challenge.challengerTeam?.logo ? (
                            <Image src={challenge.challengerTeam.logo} alt={challenge.challengerTeam.name} width={64} height={64} className="object-cover" />
                          ) : (
                            challenge.challengerTeam?.tag || 'A'
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-black px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            [{challenge.challengerTeam?.tag}] Challenger
                          </span>
                          <h3 className="text-xl font-black uppercase text-white tracking-tight mt-1">{challenge.challengerTeam?.name}</h3>
                          <p className="text-[10px] text-zinc-500 font-medium">Captain {challenge.initiatedBy?.ign || '—'}</p>
                        </div>
                      </div>

                      {/* Center VS Shield Badge */}
                      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm uppercase shrink-0 shadow-lg shadow-red-500/10">
                        VS
                      </div>

                      {/* Team B */}
                      <div className="flex items-center gap-4 flex-1 justify-end text-right">
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-black px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            [{challenge.challengedTeam?.tag}] Accepting Rival
                          </span>
                          <h3 className="text-xl font-black uppercase text-white tracking-tight mt-1">{challenge.challengedTeam?.name}</h3>
                          <p className="text-[10px] text-zinc-500 font-medium">Captain {challenge.respondedBy?.ign || '—'}</p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center text-amber-400 font-black text-2xl shrink-0 overflow-hidden shadow-xl">
                          {challenge.challengedTeam?.logo ? (
                            <Image src={challenge.challengedTeam.logo} alt={challenge.challengedTeam.name} width={64} height={64} className="object-cover" />
                          ) : (
                            challenge.challengedTeam?.tag || 'B'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Challenge Note */}
                    {challenge.message && (
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-zinc-300 italic">
                        "{challenge.message}"
                      </div>
                    )}

                    {/* ── Streamer Assignment Setup Box ───────────────────── */}
                    <div className="p-6 rounded-2xl bg-[#06070c] border border-white/10 space-y-5">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Assign Official Streamer & Publish Stream to Scrim Vault
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">
                            Match Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={formState.scheduledTime}
                            onChange={(e) =>
                              setForms((prev) => ({
                                ...prev,
                                [challenge.id]: { ...formState, scheduledTime: e.target.value },
                              }))
                            }
                            className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">
                            Streamer / Caster Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Caster Pro"
                            value={formState.streamerName}
                            onChange={(e) =>
                              setForms((prev) => ({
                                ...prev,
                                [challenge.id]: { ...formState, streamerName: e.target.value },
                              }))
                            }
                            className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">
                            YouTube Live Stream URL
                          </label>
                          <input
                            type="url"
                            placeholder="https://youtube.com/live/..."
                            value={formState.streamUrl}
                            onChange={(e) =>
                              setForms((prev) => ({
                                ...prev,
                                [challenge.id]: { ...formState, streamUrl: e.target.value },
                              }))
                            }
                            className="w-full bg-[#0d0e17] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleAssignStreamer(challenge.id)}
                          disabled={submittingId === challenge.id}
                          className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-500/20 disabled:opacity-50 transition-all"
                        >
                          {submittingId === challenge.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Video size={16} />
                          )}
                          <span>Assign Streamer & Publish to Scrim Vault 🎥</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "scheduled" ? (
        /* ── SECTION 2: SCHEDULED & STREAMED MATCHES ────────────── */
        <div className="space-y-6">
          {scheduledChallenges.length === 0 ? (
            <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
              <Tv size={44} className="text-zinc-600 mx-auto" />
              <h4 className="text-base font-black uppercase tracking-wide text-zinc-400">No Scheduled Streamed Matches</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scheduledChallenges.map((c) => (
                <div key={c.id} className="p-7 rounded-3xl bg-[#0a0b12] border border-emerald-500/30 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Radio size={12} className="animate-pulse" /> LIVE STREAM PUBLISHED TO SCRIM VAULT
                    </span>
                    <button
                      onClick={() => handleAdminAction(c.id, "cancel")}
                      className="text-xs text-red-400 hover:underline font-bold"
                    >
                      Cancel Match
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-3 border-y border-white/5">
                    <div className="text-center flex-1">
                      <span className="text-xs font-mono font-black text-amber-400">[{c.challengerTeam?.tag}]</span>
                      <h4 className="text-white font-black text-base uppercase">{c.challengerTeam?.name}</h4>
                    </div>
                    <div className="text-red-500 font-black text-sm">VS</div>
                    <div className="text-center flex-1">
                      <span className="text-xs font-mono font-black text-amber-400">[{c.challengedTeam?.tag}]</span>
                      <h4 className="text-white font-black text-base uppercase">{c.challengedTeam?.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-400 font-mono text-[10px]">Published to Scrim Vault</span>
                    <a
                      href="/scrim-vault"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline font-bold flex items-center gap-1 text-xs"
                    >
                      Watch Live Stream <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "open" ? (
        /* ── SECTION 3: OPEN BOARD LISTINGS ────────────────────── */
        <div className="space-y-6">
          {openPendingChallenges.length === 0 ? (
            <div className="p-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-3">
              <Globe size={44} className="text-zinc-600 mx-auto" />
              <h4 className="text-base font-black uppercase tracking-wide text-zinc-400">No Open Public Listings Active</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openPendingChallenges.map((c) => (
                <div key={c.id} className="p-6 rounded-3xl bg-[#0a0b12] border border-white/10 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-black text-xs uppercase px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                      [{c.challengerTeam?.tag}] {c.challengerTeam?.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-zinc-300 italic">"{c.message || 'Open Scrim Challenge'}"</p>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleAdminAccept(c.id)}
                      disabled={submittingId === c.id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      Accept on Behalf
                    </button>
                    <button
                      onClick={() => handleAdminAction(c.id, "reject")}
                      disabled={submittingId === c.id}
                      className="py-2.5 px-3.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── SECTION 4: ALL CHALLENGES HISTORY ──────────────────── */
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0a0b12] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase text-zinc-400 bg-white/[0.02]">
                  <th className="p-4">Challenger Squad</th>
                  <th className="p-4">Rival Target</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {challenges.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">
                      [{c.challengerTeam?.tag}] {c.challengerTeam?.name}
                    </td>
                    <td className="p-4 text-zinc-300">
                      {c.challengedTeam ? `[${c.challengedTeam.tag}] ${c.challengedTeam.name}` : 'Open Public Challenge'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        c.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        c.status === 'SCHEDULED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        c.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 font-mono text-[10px]">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleAdminAction(c.id, "cancel")}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Challenge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RESET ALL CHALLENGES CONFIRMATION MODAL ─────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0e1017] border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-white text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-xl">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Reset All Match Challenges?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will <span className="text-red-400 font-bold">HARD DELETE ALL ({challenges.length}) challenge records</span> from the database. This action cannot be undone!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-5 py-3 rounded-2xl border border-white/10 text-zinc-400 text-xs font-bold uppercase hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllChallenges}
                disabled={resetting}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-600/30 disabled:opacity-50 transition-all"
              >
                {resetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Yes, Hard Delete All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
