"use client";

import { useRoleGuard } from "../lib/useRole";
import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Settings, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type SoloDraftEvent = {
  id: string;
  title: string;
  isActive: boolean;
  maxTeams: number;
  playersPerTeam: number;
  tournamentId: string | null;
};

type TournamentInfo = {
  id: string;
  name: string;
  date: string;
};

export default function DashboardSoloDraftPage() {
  useRoleGuard(["SUPER_ADMIN", "TOURNAMENT_ADMIN"]);
  
  const [event, setEvent] = useState<SoloDraftEvent | null>(null);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [maxTeams, setMaxTeams] = useState(8);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [tournamentId, setTournamentId] = useState<string>("");

  const loadEvent = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await dashboardFetch<{ event: SoloDraftEvent, tournaments: TournamentInfo[] }>("/api/admin/solo-events");
    if (err || !data?.event) {
      setError(err || "Failed to load event");
    } else {
      setEvent(data.event);
      setTournaments(data.tournaments || []);
      setTitle(data.event.title);
      setIsActive(data.event.isActive);
      setMaxTeams(data.event.maxTeams);
      setPlayersPerTeam(data.event.playersPerTeam);
      setTournamentId(data.event.tournamentId || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    setSaving(true);
    setError(null);
    
    const { data, error: err } = await dashboardFetch<{ event: SoloDraftEvent }>("/api/admin/solo-events", {
      method: "POST",
      body: JSON.stringify({
        id: event.id,
        title,
        isActive,
        maxTeams,
        playersPerTeam,
        tournamentId: tournamentId || null,
      }),
    });
    
    setSaving(false);
    
    if (err || !data?.event) {
      setError(err || "Failed to save event");
      toast.error(err || "Failed to save event");
    } else {
      setEvent(data.event);
      toast.success("Event settings saved successfully!");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#666]">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          Solo Draft Event
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Configure the temporary team registration limits and active status.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] mb-4 flex items-center gap-2">
          <Settings size={16} /> Event Settings
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                required
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                Linked Tournament (Auto-Register Teams)
              </label>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value="">-- No Tournament --</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({new Date(t.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3 bg-[#0d0d14] border border-white/10 p-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#e8a000]"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-white cursor-pointer">
                Registration Open
              </label>
              <span className="text-xs text-[#888] ml-2">
                (Turn off to hide the registration page)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                  Total Team Slots Available
                </label>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#666] block mb-1">
                  Players Per Team
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={playersPerTeam}
                  onChange={(e) => setPlayersPerTeam(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
                  required
                />
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
