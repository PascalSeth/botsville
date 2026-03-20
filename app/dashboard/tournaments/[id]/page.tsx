"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2, X, Plus } from "lucide-react";

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  prizePool: string | null;
  status: string;
  format: string;
  date: string;
  location: string;
  isOnline: boolean;
  slots: number;
  season?: { id: string; name: string } | null;
  _count?: { registrations: number; matches: number };
  banner?: string | null;
  rules?: string[];
};

type TournamentRegistration = {
  id: string;
  status: string;
  seed: number | null;
  registeredAt: string;
  team: {
    id: string;
    name: string;
    tag: string;
    captain?: { ign: string | null } | null;
    _count?: { players: number };
  };
};

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [actingRegistrationId, setActingRegistrationId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [showBulkRegisterModal, setShowBulkRegisterModal] = useState(false);
  const [bulkTeamIds, setBulkTeamIds] = useState<string>("");
  const [bulkAutoApprove, setBulkAutoApprove] = useState(true);
  const [bulkSeed, setBulkSeed] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [loadingAvailableTeams, setLoadingAvailableTeams] = useState(false);
  const [recalculatingPoints, setRecalculatingPoints] = useState(false);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);

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
    if (!id) return;
    (async () => {
      setLoading(true);
      setLoadingRegistrations(true);

      const [{ data, error: err }, { data: registrationsData, error: registrationsError }] = await Promise.all([
        dashboardFetch<Tournament>(`/api/tournaments/${id}`),
        dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`),
      ]);

      setLoading(false);
      setLoadingRegistrations(false);

      if (err) {
        setError(err);
        setTournament(null);
        return;
      }

      if (!registrationsError && Array.isArray(registrationsData)) {
        setRegistrations(registrationsData);
      } else {
        setRegistrations([]);
      }

      setTournament(data ?? null);
    })();
  }, [id]);

  const refreshRegistrations = async () => {
    if (!id) return;
    const { data: registrationsData, error: registrationsError } = await dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`);
    if (!registrationsError && Array.isArray(registrationsData)) {
      setRegistrations(registrationsData);
    }
  };

  const fetchAvailableTeams = async () => {
    setLoadingAvailableTeams(true);
    setAvailableTeams([]);

    try {
      // First, refresh registrations to get the latest data
      const { data: registrationsData, error: registrationsError } = await dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`);
      
      let currentRegistrations = registrations;
      if (!registrationsError && Array.isArray(registrationsData)) {
        currentRegistrations = registrationsData;
        setRegistrations(registrationsData);
      }

      // Get registered team IDs (include PENDING and APPROVED, exclude REJECTED)
      const registeredTeamIds = new Set(
        currentRegistrations
          .filter((r: any) => r.status !== "REJECTED")
          .map((r) => r.team.id)
      );
      console.log("Registered teams:", registeredTeamIds);

      const response = await fetch("/api/teams?limit=1000&status=ACTIVE");
      const result = await response.json();

      console.log("Teams response:", result);

      if (Array.isArray(result.teams)) {
        // Filter out already registered teams (including pending)
        const unregisteredTeams = result.teams.filter((team: any) => !registeredTeamIds.has(team.id));
        
        console.log("Total ACTIVE teams:", result.teams.length);
        console.log("Registered team count:", registeredTeamIds.size);
        console.log("Unregistered teams:", unregisteredTeams.length);
        console.log("Unregistered teams list:", unregisteredTeams.map((t: any) => ({ id: t.id, name: t.name })));

        setAvailableTeams(unregisteredTeams);
      } else {
        console.error("Invalid teams response format:", result);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      setAvailableTeams([]);
    } finally {
      setLoadingAvailableTeams(false);
    }
  };

  const handleOpenBulkRegisterModal = async () => {
    setShowBulkRegisterModal(true);
    setSelectedTeamIds(new Set());
    await fetchAvailableTeams();
  };

  const handleBulkRegisterTeams = async () => {
    if (selectedTeamIds.size === 0) {
      setBulkMessage("Please select at least one team");
      return;
    }

    setBulkLoading(true);
    setBulkMessage(null);

    const teamIds = Array.from(selectedTeamIds);

    const { data, error: bulkError } = await dashboardFetch<{ message?: string; results?: any[] }>(`/api/tournaments/${id}/registrations`, {
      method: "POST",
      body: JSON.stringify({
        teamIds,
        autoApprove: bulkAutoApprove,
        seed: bulkSeed ? parseInt(bulkSeed) : undefined,
      }),
    });

    setBulkLoading(false);

    if (bulkError) {
      setBulkMessage(`Error: ${bulkError}`);
      return;
    }

    if (data?.results) {
      const successful = data.results.filter((r: any) => r.success).length;
      const failed = data.results.filter((r: any) => !r.success).length;
      setBulkMessage(`✓ Complete: ${successful} registered successfully, ${failed} failed`);
    } else {
      setBulkMessage(data?.message || "Teams registered successfully!");
    }

    // Reset form
    setBulkTeamIds("");
    setBulkSeed("");
    setSelectedTeamIds(new Set());

    // Refresh registrations
    await refreshRegistrations();

    // Close modal after 2 seconds
    setTimeout(() => {
      setShowBulkRegisterModal(false);
      setBulkMessage(null);
    }, 2000);
  };

  const handleRegistrationAction = async (registrationId: string, action: "approve" | "reject") => {
    if (!id) return;

    setActionError(null);
    setActionMessage(null);
    setActingRegistrationId(registrationId);

    const { data, error: updateError } = await dashboardFetch<{ message?: string }>(`/api/tournaments/${id}/registrations`, {
      method: "PUT",
      body: JSON.stringify({ registrationId, action }),
    });

    setActingRegistrationId(null);

    if (updateError) {
      setActionError(updateError);
      return;
    }

    setActionMessage(data?.message || (action === "approve" ? "Registration approved" : "Registration rejected"));
    await refreshRegistrations();
  };

  const updateTournamentImage = async () => {
    if (!id || !imageFile) {
      setImageMessage("Select an image file first.");
      return;
    }

    setImageMessage(null);
    setSavingImage(true);

    try {
      setUploadingImage(true);
      const imageDataUrl = await fileToDataUrl(imageFile);
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
      setUploadingImage(false);

      if (!uploadResponse.ok || !uploadData?.url) {
        setImageMessage(uploadData?.error || "Failed to upload image");
        setSavingImage(false);
        return;
      }

      const { data, error: updateError } = await dashboardFetch<{ tournament?: Tournament }>(`/api/tournaments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ banner: uploadData.url }),
      });

      if (updateError) {
        setImageMessage(updateError);
        setSavingImage(false);
        return;
      }

      if (data?.tournament) {
        setTournament((prev) => (prev ? { ...prev, banner: data.tournament?.banner ?? uploadData.url } : prev));
      } else {
        setTournament((prev) => (prev ? { ...prev, banner: uploadData.url } : prev));
      }

      setImageFile(null);
      setImageMessage("Tournament image updated.");
    } catch (uploadError) {
      setImageMessage(uploadError instanceof Error ? uploadError.message : "Failed to update image");
    } finally {
      setUploadingImage(false);
      setSavingImage(false);
    }
  };

  const handleRecalculatePoints = async () => {
    if (!id || !tournament) return;

    setPointsMessage(null);
    setRecalculatingPoints(true);

    try {
      const res = await fetch(`/api/tournaments/${id}/migrate-to-mlbb-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to recalculate points");
      }

      const result = await res.json();
      const teamCount = result.teamsAffected || 0;
      const matchCount = result.matchesProcessed || 0;
      
      // Create success message with details
      const message = `✓ Standings updated: ${teamCount} teams recalculated from ${matchCount} completed matches (MLBB 3/2/1/0)`;
      setPointsMessage(message);
      
      // Refresh tournament data
      const tournamentRes = await fetch(`/api/tournaments/${id}`);
      if (tournamentRes.ok) {
        const updatedTournament = await tournamentRes.json();
        setTournament(updatedTournament);
      }

      // Keep message longer so user can see results
      setTimeout(() => setPointsMessage(null), 5000);
    } catch (err) {
      setPointsMessage(err instanceof Error ? err.message : "Failed to recalculate points");
    } finally {
      setRecalculatingPoints(false);
    }
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <p className="text-[#666]">Missing tournament ID.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-[#666]">Loading...</div>;
  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }
  if (!tournament) return <div className="p-8 text-[#666]">Tournament not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">← Tournaments</Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tournaments/${tournament.id}/edit`}
            className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
          >
            Edit
          </Link>
          <Link
            href={`/dashboard/matches?tournamentId=${tournament.id}`}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
          >
            View matches
          </Link>
        </div>
      </div>
      <div>
        <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
          {tournament.name}
        </h1>
        {tournament.subtitle && <p className="mt-1 text-[#888]">{tournament.subtitle}</p>}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4 space-y-3 max-w-2xl">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Tournament image</p>
        <label className="w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-sm text-white flex items-center">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="w-full text-white file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
          />
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={updateTournamentImage}
            disabled={savingImage || uploadingImage || !imageFile}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 inline-flex items-center gap-2"
          >
            {(savingImage || uploadingImage) ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploadingImage ? "Uploading..." : savingImage ? "Saving..." : "Update image"}
          </button>
          <span className="text-[11px] text-[#777]">Stored in Supabase bucket: images</span>
        </div>
        {imageMessage ? <p className="text-sm text-[#aaa]">{imageMessage}</p> : null}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Status</p>
          <p className="text-white font-semibold mt-1">{tournament.status}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Format</p>
          <p className="text-white font-semibold mt-1">{tournament.format.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Season</p>
          <p className="text-white font-semibold mt-1">{tournament.season?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Date</p>
          <p className="text-white font-semibold mt-1">{new Date(tournament.date).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Location</p>
          <p className="text-white font-semibold mt-1">{tournament.location} {tournament.isOnline ? "(Online)" : ""}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Slots</p>
          <p className="text-white font-semibold mt-1">{tournament.slots}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Registrations</p>
          <p className="text-white font-semibold mt-1">{tournament._count?.registrations ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Matches</p>
          <p className="text-white font-semibold mt-1">{tournament._count?.matches ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Prize pool</p>
          <p className="text-white font-semibold mt-1">{tournament.prizePool ?? "No prize pool"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Rules</p>
        {tournament.rules && tournament.rules.length > 0 ? (
          <ul className="space-y-2">
            {tournament.rules.map((rule, index) => (
              <li key={`${rule}-${index}`} className="text-sm text-[#ccc]">• {rule}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#777]">No rules set for this tournament.</p>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Points System - MLBB 3/2/1/0</p>
            <p className="text-xs text-[#888] mt-1">Recalculate all team standings from completed match results</p>
          </div>
          <button
            onClick={handleRecalculatePoints}
            disabled={recalculatingPoints || !tournament._count?.matches}
            className="shrink-0 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded transition"
          >
            {recalculatingPoints ? <Loader2 size={14} className="animate-spin" /> : null}
            {recalculatingPoints ? "Recalculating..." : "Recalculate Points"}
          </button>
        </div>

        {/* Points System Breakdown */}
        <div className="grid grid-cols-2 gap-2 bg-[#000]/30 rounded p-3">
          <div className="text-[11px]">
            <span className="text-[#e8a000] font-bold">2-0 Win:</span>
            <span className="text-[#ccc] ml-1">+3 pts</span>
          </div>
          <div className="text-[11px]">
            <span className="text-[#e8a000] font-bold">2-1 Win:</span>
            <span className="text-[#ccc] ml-1">+2 pts</span>
          </div>
          <div className="text-[11px]">
            <span className="text-[#e8a000] font-bold">1-2 Loss:</span>
            <span className="text-[#ccc] ml-1">+1 pt</span>
          </div>
          <div className="text-[11px]">
            <span className="text-[#e8a000] font-bold">0-2 Loss:</span>
            <span className="text-[#ccc] ml-1">+0 pts</span>
          </div>
        </div>

        {pointsMessage && (
          <div className={`rounded px-3 py-2 text-sm font-semibold ${pointsMessage.startsWith("✓") ? "bg-[#27ae60]/10 text-[#27ae60] border border-[#27ae60]/30" : "bg-red-500/10 text-red-300 border border-red-500/30"}`}>
            {pointsMessage}
          </div>
        )}
        
        {!pointsMessage && tournament._count?.matches && (
          <p className="text-xs text-[#666]">
            Ready to recalculate. Found <strong>{tournament._count?.matches}</strong> matches.
          </p>
        )}
        
        {!tournament._count?.matches && (
          <p className="text-xs text-[#999] bg-[#333]/30 rounded px-2 py-1.5">
            ⚠️ No matches yet. Add completed matches before recalculating standings.
          </p>
        )}
      </div>

      {/* Bulk Register Modal */}
      {showBulkRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-lg uppercase tracking-wider">Register Teams</h2>
              <button
                onClick={() => {
                  setShowBulkRegisterModal(false);
                  setBulkMessage(null);
                }}
                className="text-[#999] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666] mb-2">
                  Available Teams ({selectedTeamIds.size} selected)
                </label>
                
                {loadingAvailableTeams ? (
                  <div className="text-center py-4 text-[#888]">
                    <Loader2 size={16} className="animate-spin inline-block" />
                    <p className="text-xs mt-2">Loading teams...</p>
                  </div>
                ) : availableTeams.length === 0 ? (
                  <div className="bg-[#0d0d14] border border-white/10 rounded px-3 py-4 text-center text-[#666] text-sm">
                    No teams available to register
                  </div>
                ) : (
                  <div className="bg-[#0d0d14] border border-white/10 rounded max-h-64 overflow-y-auto">
                    {availableTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => {
                          const newSelected = new Set(selectedTeamIds);
                          if (newSelected.has(team.id)) {
                            newSelected.delete(team.id);
                          } else {
                            newSelected.add(team.id);
                          }
                          setSelectedTeamIds(newSelected);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.has(team.id)}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[#e8a000] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{team.name}</p>
                          <p className="text-[#666] text-xs">{team.tag || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={bulkAutoApprove}
                  onChange={(e) => setBulkAutoApprove(e.target.checked)}
                  className="w-4 h-4 accent-[#e8a000]"
                />
                <label htmlFor="autoApprove" className="text-sm text-[#ccc] cursor-pointer">
                  Auto-approve registrations
                </label>
              </div>

              {bulkAutoApprove && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#666] mb-2">
                    Starting Seed (optional)
                  </label>
                  <input
                    type="number"
                    value={bulkSeed}
                    onChange={(e) => setBulkSeed(e.target.value)}
                    placeholder="1"
                    className="w-full bg-[#0d0d14] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#e8a000]/50"
                  />
                </div>
              )}

              {bulkMessage && (
                <div className={`rounded px-3 py-2 text-sm ${bulkMessage.startsWith("✓") ? "bg-[#27ae60]/10 text-[#27ae60] border border-[#27ae60]/30" : "bg-red-500/10 text-red-300 border border-red-500/30"}`}>
                  {bulkMessage}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleBulkRegisterTeams}
                  disabled={bulkLoading || selectedTeamIds.size === 0}
                  className="flex-1 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {bulkLoading ? "Registering..." : "Register Teams"}
                </button>
                <button
                  onClick={() => {
                    setShowBulkRegisterModal(false);
                    setBulkMessage(null);
                  }}
                  className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Registered teams</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBulkRegisterModal}
              className="px-3 py-1.5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] inline-flex items-center gap-1 rounded"
            >
              <Plus size={14} />
              Add Teams
            </button>
            <p className="text-[10px] text-[#888] uppercase tracking-wider">{registrations.length} total</p>
          </div>
        </div>

        {actionError ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{actionError}</div>
        ) : null}
        {actionMessage ? (
          <div className="rounded border border-[#e8a000]/30 bg-[#e8a000]/10 px-3 py-2 text-xs text-[#f5c15a]">{actionMessage}</div>
        ) : null}

        {loadingRegistrations ? (
          <p className="text-sm text-[#777]">Loading registered teams...</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-[#777]">No teams have registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-2">Team</th>
                  <th className="p-2">Tag</th>
                  <th className="p-2">Captain</th>
                  <th className="p-2">Players</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Seed</th>
                  <th className="p-2">Registered</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id} className="border-b border-white/5">
                    <td className="p-2 text-white font-semibold">{registration.team.name}</td>
                    <td className="p-2 text-[#aaa] text-sm">{registration.team.tag}</td>
                    <td className="p-2 text-[#aaa] text-sm">{registration.team.captain?.ign ?? "—"}</td>
                    <td className="p-2 text-[#aaa] text-sm">{registration.team._count?.players ?? 0}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                        {registration.status}
                      </span>
                    </td>
                    <td className="p-2 text-[#aaa] text-sm">{registration.seed ?? "—"}</td>
                    <td className="p-2 text-[#aaa] text-sm">{new Date(registration.registeredAt).toLocaleDateString()}</td>
                    <td className="p-2">
                      {registration.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRegistrationAction(registration.id, "approve")}
                            disabled={actingRegistrationId === registration.id}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-[#27ae60]/20 text-[#27ae60] border border-[#27ae60]/30 hover:bg-[#27ae60]/30 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegistrationAction(registration.id, "reject")}
                            disabled={actingRegistrationId === registration.id}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#666] uppercase tracking-wide">No action</span>
                      )}
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
