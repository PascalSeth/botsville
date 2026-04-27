"use client";

import { useState, useEffect } from "react";
import { 
  Layout, 
  Swords, 
  Tv, 
  Zap, 
  ArrowLeftRight, 
  Calendar, 
  Clock, 
  Globe, 
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardFetch } from "../lib/api";

type Match = {
  id: string;
  teamA: { id: string; name: string; tag: string; logo: string | null };
  teamB: { id: string; name: string; tag: string; logo: string | null } | null;
  scheduledTime: string;
  lobby: "LOBBY_A" | "LOBBY_B";
  status: string;
  round: number;
  playDay: number;
};

type OrchestratorControlProps = {
  tournamentId: string;
  onRefresh?: () => void;
};

export default function OrchestratorControl({ tournamentId, onRefresh }: OrchestratorControlProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await dashboardFetch<Match[]>(`/api/tournaments/${tournamentId}/matches`);
      if (err) throw new Error(err);
      
      // Filter for group stage matches only
      const groupMatches = (data || []).filter(m => !!m.playDay);
      setMatches(groupMatches);
      
      // Default to first play day
      if (groupMatches.length > 0) {
        const minDay = Math.min(...groupMatches.map(m => m.playDay));
        setCurrentDay(minDay);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  const handleSwapLobby = async (matchId: string) => {
    setSwappingId(matchId);
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const newLobby = match.lobby === "LOBBY_A" ? "LOBBY_B" : "LOBBY_A";
      
      // Simple PUT to update match lobby
      const { error: err } = await dashboardFetch(`/api/tournaments/${tournamentId}/matches`, {
        method: "PUT",
        body: JSON.stringify({ matchId, lobby: newLobby })
      });

      if (err) throw new Error(err);

      // Optimistic update
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, lobby: newLobby as any } : m));
    } catch (err) {
      console.error("Swap failed:", err);
    } finally {
      setSwappingId(null);
    }
  };

  const days = Array.from(new Set(matches.map(m => m.playDay))).sort((a, b) => a - b);
  const currentDayMatches = matches.filter(m => m.playDay === currentDay);
  const lobbyAMatches = currentDayMatches.filter(m => m.lobby === "LOBBY_A").sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const lobbyBMatches = currentDayMatches.filter(m => m.lobby === "LOBBY_B").sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  if (loading && matches.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
        <Loader2 className="animate-spin text-[#e8a000]" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Visualizing Blueprint...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl text-center">
        <Layout size={40} className="text-white/10" />
        <div>
          <p className="text-sm font-bold text-white uppercase tracking-tight">Roadmap Empty</p>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Deploy the orchestrator to generate the Selection V2 blueprint.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Day Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#e8a000]/10 border border-[#e8a000]/20 flex items-center justify-center text-[#e8a000]">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Live <span className="text-[#e8a000]">Blueprint</span></h2>
            <p className="text-[10px] font-black text-[#555] uppercase tracking-widest">Roadmap Control & Lobby Dispatcher</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                currentDay === day 
                  ? "bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Lobby A - Broadcast */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Tv size={16} className="text-[#e8a000]" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Lobby A (Broadcast)</span>
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">{lobbyAMatches.length} Matches</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {lobbyAMatches.map((match, i) => (
                <MatchRow 
                  key={match.id} 
                  match={match} 
                  index={i} 
                  isSwapping={swappingId === match.id}
                  onSwap={() => handleSwapLobby(match.id)}
                />
              ))}
              {lobbyAMatches.length === 0 && <EmptyLobby emoji="🎥" label="No broadcast matches" />}
            </AnimatePresence>
          </div>
        </div>

        {/* Lobby B - Scouting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-blue-400" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Lobby B (Scouting)</span>
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">{lobbyBMatches.length} Matches</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {lobbyBMatches.map((match, i) => (
                <MatchRow 
                  key={match.id} 
                  match={match} 
                  index={i} 
                  isSwapping={swappingId === match.id}
                  onSwap={() => handleSwapLobby(match.id)}
                />
              ))}
              {lobbyBMatches.length === 0 && <EmptyLobby emoji="⚔️" label="No scouting matches" />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match, index, onSwap, isSwapping }: { match: Match; index: number; onSwap: () => void; isSwapping: boolean }) {
  const isResting = match.status === "RESTING" || !match.teamB;
  const time = new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-white/20 transition-all ${isResting ? 'opacity-60 border-dashed' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4 overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Clock size={12} className="text-[#555]" />
            <span className="text-[9px] font-mono font-bold text-white/40">{time}</span>
          </div>

          <div className="h-8 w-px bg-white/5" />

          {isResting ? (
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-black text-[10px]">?</div>
                <div>
                   <p className="text-xs font-black text-white/60 uppercase">{match.teamA.name}</p>
                   <p className="text-[9px] font-black text-[#e8a000] uppercase tracking-widest">REST DAY (BYE)</p>
                </div>
             </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
               <TeamBlock team={match.teamA} />
               <Swords size={10} className="text-[#333] shrink-0" />
               <TeamBlock team={match.teamB!} />
            </div>
          )}
        </div>

        <button 
          onClick={onSwap}
          disabled={isSwapping || isResting}
          className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:bg-[#e8a000] hover:text-black transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
        >
          {isSwapping ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
        </button>
      </div>
    </motion.div>
  );
}

function TeamBlock({ team }: { team: Match["teamA"] | null }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-white/40">TBD</span>
        </div>
        <p className="text-[10px] font-bold text-white/40 uppercase truncate min-w-0">TBD</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {team.logo ? (
          <img src={team.logo} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[9px] font-black text-white/40">{team.tag.substring(0, 2)}</span>
        )}
      </div>
      <p className="text-[10px] font-bold text-white/80 uppercase truncate min-w-0">{team.tag}</p>
    </div>
  );
}

function EmptyLobby({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="py-8 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center opacity-40">
       <span className="text-xl mb-2">{emoji}</span>
       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</p>
    </div>
  );
}
