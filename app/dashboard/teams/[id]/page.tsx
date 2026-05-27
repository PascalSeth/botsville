"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { dashboardFetch } from "../../lib/api";

type Player = {
  id: string;
  ign: string;
  role: string;
  secondaryRole?: string | null;
  signatureHero?: string | null;
  photo?: string | null;
  realName?: string | null;
  isSubstitute: boolean;
  user?: { id: string; ign: string; photo: string | null } | null;
};

type Team = {
  id: string;
  name: string;
  tag: string;
  region: string;
  status: string;
  color?: string | null;
  logo?: string | null;
  captain?: { id: string; ign: string; photo: string | null } | null;
  players: Player[];
  _count?: { players: number; registrations: number; matchesAsA: number; matchesAsB: number };
};

function playerPhoto(p: Player): string | null {
  return p.photo ?? p.user?.photo ?? null;
}

function Avatar({ src, ign }: { src: string | null; ign: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-[#e8a000] font-black text-xl select-none">
        {ign.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={ign}
      fill
      className="object-cover"
      onError={() => setErr(true)}
    />
  );
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await dashboardFetch<Team>(`/api/teams/${id}`);
    setLoading(false);
    if (err) { setError(err); return; }
    setTeam(data ?? null);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const playersWithPhoto = team?.players.filter((p) => playerPhoto(p) !== null) ?? [];

  function toggle(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(playersWithPhoto.map((p) => p.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function downloadZip() {
    if (selected.size === 0) return;
    setDownloading(true);
    setDlError(null);
    try {
      const res = await fetch(`/api/admin/teams/${id}/photos-zip`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setDlError(json.error ?? `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${team?.tag ?? id}-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDlError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-[#666]">Loading team...</div>
    );
  }

  if (error || !team) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-[#888] hover:text-white transition-colors">
          ← Back
        </button>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error ?? "Team not found"}
        </div>
      </div>
    );
  }

  const starters = team.players.filter((p) => !p.isSubstitute);
  const subs = team.players.filter((p) => p.isSubstitute);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 text-sm text-[#888] hover:text-white transition-colors shrink-0">
          ← Back
        </button>
        {team.logo && (
          <div className="group relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d14]">
            <Image src={team.logo} alt={`${team.name} logo`} fill className="object-contain p-1" />
            <a
              href={team.logo}
              download
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download logo"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v10m0 0l-3-3m3 3l3-3M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
              {team.name}
            </h1>
            <span className="font-mono text-[#e8a000] text-sm font-bold">[{team.tag}]</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                team.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : team.status === "SUSPENDED"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-[#666]/20 text-[#888]"
              }`}
            >
              {team.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#666]">
            {team.region} · Captain: <span className="text-[#aaa]">{team.captain?.ign ?? "—"}</span>
          </p>
        </div>
      </div>

      {/* Download controls */}
      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-[#888] font-semibold uppercase tracking-widest text-[10px]">
          Player Photos
        </span>
        <span className="text-xs text-[#666]">
          {playersWithPhoto.length} photo{playersWithPhoto.length !== 1 ? "s" : ""} available
        </span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <span className="text-xs text-[#e8a000]">{selected.size} selected</span>
          )}
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border border-white/10 text-[#888] hover:text-white hover:border-white/30 transition-colors"
          >
            Select All
          </button>
          {selected.size > 0 && (
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border border-white/10 text-[#888] hover:text-white hover:border-white/30 transition-colors"
            >
              Deselect All
            </button>
          )}
          <button
            onClick={downloadZip}
            disabled={selected.size === 0 || downloading}
            className="px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {downloading ? "Zipping…" : `Download ZIP${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>

      {dlError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {dlError}
        </div>
      )}

      {/* Roster sections */}
      {[
        { label: "Starters", list: starters },
        { label: "Substitutes", list: subs },
      ]
        .filter(({ list }) => list.length > 0)
        .map(({ label, list }) => (
          <div key={label} className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#666]">{label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {list.map((player) => {
                const photo = playerPhoto(player);
                const isSelected = selected.has(player.id);
                const hasPhoto = photo !== null;
                return (
                  <div
                    key={player.id}
                    onClick={() => hasPhoto && toggle(player.id)}
                    className={`relative rounded-lg overflow-hidden border transition-all select-none ${
                      hasPhoto ? "cursor-pointer" : "cursor-default opacity-60"
                    } ${
                      isSelected
                        ? "border-[#e8a000] ring-1 ring-[#e8a000]/50"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Photo */}
                    <div className="relative aspect-square w-full bg-[#0d0d14]">
                      <Avatar src={photo} ign={player.ign} />
                      {/* Checkbox overlay */}
                      {hasPhoto && (
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#e8a000] border-[#e8a000]"
                            : "bg-black/40 border-white/40"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-black" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      )}
                      {/* No photo badge */}
                      {!hasPhoto && (
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 text-[9px] text-[#666] font-bold uppercase tracking-wider rounded">
                          No photo
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2 bg-[#0a0a0f]">
                      <p className="text-white text-xs font-bold truncate">{player.ign}</p>
                      <p className="text-[#666] text-[10px] truncate">{player.role}{player.secondaryRole ? ` / ${player.secondaryRole}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {team.players.length === 0 && (
        <div className="p-8 text-center text-[#666]">No players on this team.</div>
      )}
    </div>
  );
}
