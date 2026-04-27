"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, Trash2, UserPlus, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type TeamPreview = {
  id: string;
  name: string;
  tag: string;
  groupName: string;
  groupRank: number;
  globalRank: number;
};

type ManualMatchup = {
  team1Id: string;
  team1Name: string;
  team2Id: string | null;
  team2Name: string | null;
};

type Props = {
  tournamentId: string;
  teamsPerGroup: number;
  isNextRound?: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function ManualSeedingModal({ tournamentId, teamsPerGroup, isNextRound, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pool, setPool] = useState<TeamPreview[]>([]);
  const [matchups, setMatchups] = useState<ManualMatchup[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // For constructing a matchup
  const [selectedTeam1, setSelectedTeam1] = useState<TeamPreview | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<TeamPreview | null | "BYE">(null);

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const endpoint = isNextRound 
        ? `/api/tournaments/${tournamentId}/generate-next-round/preview` 
        : `/api/tournaments/${tournamentId}/advance-to-playoffs/preview?teamsPerGroup=${teamsPerGroup}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch preview");
      setPool(data.teams);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching teams");
      setLoading(false);
    }
  };

  const addMatchup = () => {
    if (!selectedTeam1 || !selectedTeam2) return;

    const newMatchup: ManualMatchup = {
      team1Id: selectedTeam1.id,
      team1Name: selectedTeam1.name,
      team2Id: selectedTeam2 === "BYE" ? null : selectedTeam2.id,
      team2Name: selectedTeam2 === "BYE" ? "BYE" : selectedTeam2.name,
    };

    setMatchups([...matchups, newMatchup]);
    setPool(pool.filter(t => t.id !== selectedTeam1.id && (selectedTeam2 === "BYE" || t.id !== selectedTeam2.id)));
    
    setSelectedTeam1(null);
    setSelectedTeam2(null);
  };

  const removeMatchup = (index: number) => {
    const m = matchups[index];
    const updatedMatchups = matchups.filter((_, i) => i !== index);
    setMatchups(updatedMatchups);

    // Restore teams to pool
    const restoredTeams = [];
    if (m.team1Id) restoredTeams.push({ id: m.team1Id, name: m.team1Name, tag: m.team1Name, groupName: "Restored", groupRank: 0, globalRank: 0 });
    if (m.team2Id) restoredTeams.push({ id: m.team2Id, name: m.team2Name!, tag: m.team2Name!, groupName: "Restored", groupRank: 0, globalRank: 0 });
    
    // We should fetch again to get accurate data, or just append minimal objects.
    // For simplicity, refetching is safest to restore correct ordering and data.
    // But since this is client side, let's just refetch to make it robust.
    refetchAndFilter(updatedMatchups);
  };

  const refetchAndFilter = async (currentMatchups: ManualMatchup[]) => {
    setLoading(true);
    const endpoint = isNextRound 
      ? `/api/tournaments/${tournamentId}/generate-next-round/preview` 
      : `/api/tournaments/${tournamentId}/advance-to-playoffs/preview?teamsPerGroup=${teamsPerGroup}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    if (res.ok) {
      const usedIds = new Set(currentMatchups.flatMap(m => [m.team1Id, m.team2Id]).filter(Boolean));
      setPool(data.teams.filter((t: any) => !usedIds.has(t.id)));
    }
    setLoading(false);
  };

  const submitManualBracket = async () => {
    if (pool.length > 0) {
      alert("Please assign all teams to matchups before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isNextRound
        ? `/api/tournaments/${tournamentId}/generate-next-round`
        : `/api/tournaments/${tournamentId}/advance-to-playoffs`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsPerGroup, manualMatchups: matchups })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate bracket");

      onSuccess(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting bracket");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Manual Playoff Seeding</h2>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                {isNextRound ? "Build your custom matchups for the Next Round" : "Build your custom Round 1 matchups"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Pool */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center justify-between">
              Unassigned Teams
              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{pool.length} remaining</span>
            </h3>
            
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">{error}</div>
            ) : pool.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">All teams assigned!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pool.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">{t.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Group {t.groupName} • Rank {t.groupRank}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedTeam1(t)}
                        disabled={selectedTeam1?.id === t.id}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                          selectedTeam1?.id === t.id ? "bg-indigo-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Team A
                      </button>
                      <button 
                        onClick={() => setSelectedTeam2(t)}
                        disabled={selectedTeam2 !== "BYE" && selectedTeam2?.id === t.id}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                          selectedTeam2 !== "BYE" && selectedTeam2?.id === t.id ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Team B
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Matchup Builder */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 mt-6">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Construct Matchup</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-black/40 border border-white/10 rounded-lg text-center text-xs font-bold text-white truncate">
                  {selectedTeam1 ? selectedTeam1.name : "Select Team A"}
                </div>
                <div className="text-white/40 text-[10px] font-black">VS</div>
                <div className="flex-1 p-3 bg-black/40 border border-white/10 rounded-lg text-center text-xs font-bold text-white truncate relative group">
                  {selectedTeam2 === "BYE" ? "BYE" : selectedTeam2 ? selectedTeam2.name : "Select Team B"}
                  <button 
                    onClick={() => setSelectedTeam2("BYE")}
                    className="absolute -top-2 -right-2 bg-zinc-800 text-white/60 text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                  >
                    Set BYE
                  </button>
                </div>
              </div>
              <button 
                onClick={addMatchup}
                disabled={!selectedTeam1 || !selectedTeam2}
                className="w-full mt-4 py-3 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-indigo-600 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={14} /> Add Matchup
              </button>
            </div>
          </div>

          {/* Right Column: Matchups */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center justify-between">
              {isNextRound ? "Next Round Bracket" : "Round 1 Bracket"}
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px]">{matchups.length} Matches</span>
            </h3>

            {matchups.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">No matchups created yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchups.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white/30 w-4">#{i+1}</span>
                      <div className="text-xs font-bold text-white w-24 truncate">{m.team1Name}</div>
                      <span className="text-[9px] font-black text-emerald-400">VS</span>
                      <div className={`text-xs font-bold w-24 truncate ${m.team2Name === "BYE" ? "text-white/30" : "text-white"}`}>
                        {m.team2Name}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeMatchup(i)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={submitManualBracket}
            disabled={submitting || pool.length > 0 || matchups.length === 0}
            className="px-8 py-3 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-30"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate Bracket
          </button>
        </div>
      </motion.div>
    </div>
  );
}
