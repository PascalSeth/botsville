"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2 } from "lucide-react";

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

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">Registered teams</p>
          <p className="text-[10px] text-[#888] uppercase tracking-wider">{registrations.length} total</p>
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
