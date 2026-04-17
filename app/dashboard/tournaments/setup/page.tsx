'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Trophy, Zap, Users, Play, AlertCircle, Loader2,
  ChevronRight, Settings, CheckCircle, Clock,
  ChevronLeft, Layout, Shield, Target, Plus, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import Link from 'next/link';

type Tournament = {
  id: string;
  name: string;
  format: string;
  status: string;
  filled: number;
  slots: number;
  seasonId: string;
  registrationDeadline: string;
  numGroups?: number;
  teamsPerGroup?: number;
  matchesPerTeam?: number;
  matchesBeforeBracket?: number;
};

type Team = {
  id: string;
  name: string;
  tag: string;
};

// Premium Glass Card Component
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'tournament-setup' | 'league' | 'playoffs'>('tournament-setup');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tournament setup wizard state
  const [setupStep, setSetupStep] = useState<'select' | 'configure' | 'allocate' | 'bracket' | 'finals'>('select');

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Group stage configuration
  const [groupConfig, setGroupConfig] = useState({
    numGroups: 1,
    teamsPerGroup: 4,
    matchesPerTeam: 3,
  });

  // Finals configuration
  const [finalsForm, setFinalsForm] = useState({
    semifinalsBestOf: 3,
    thirdPlaceBestOf: 3,
    grandFinalBestOf: 5,
  });

  // League form
  const [leagueForm, setLeagueForm] = useState({
    teamIds: [] as string[],
    leagueStartDate: new Date().toISOString().split('T')[0],
    leagueName: '',
    bestOf: 1,
  });

  // Playoffs form
  const [playoffsForm, setPlayoffsForm] = useState({
    playoffsStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Group Allocation State
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [proposedGroups, setProposedGroups] = useState<{ name: string; teams: Team[] }[]>([]);
  const [savingGroups, setSavingGroups] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all tournaments with CLOSED or ONGOING status
      const tourRes = await fetch('/api/tournaments?limit=50');
      if (tourRes.ok) {
        const data = await tourRes.json();
        const filtered = (data.tournaments || []).filter(
          (t: Tournament) => t.status === 'CLOSED' || t.status === 'ONGOING'
        );
        setTournaments(filtered);
      }

      // Fetch teams
      const teamRes = await fetch('/api/teams?limit=50');
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeams(data.teams || []);
      }
      
      const paramSelectedId = searchParams.get('selectedId');
      const paramStep = searchParams.get('step');
      
      if (paramSelectedId) {
        // We need the filtered results from above, fetch logic was slightly broken in previous version
        const tourResCheck = await fetch('/api/tournaments?limit=50');
        const dataCheck = await tourResCheck.json();
        const filteredCheck = (dataCheck.tournaments || []).filter(
          (t: Tournament) => t.status === 'CLOSED' || t.status === 'ONGOING'
        );
        
        const found = filteredCheck.find((t: Tournament) => t.id === paramSelectedId);
        if (found) {
          setSelectedTournament(found);
          if (found.numGroups) {
            setGroupConfig({
              numGroups: found.numGroups,
              teamsPerGroup: found.teamsPerGroup || 4,
              matchesPerTeam: found.matchesPerTeam || 3,
            });
          }
          if (paramStep === 'configure') {
            setSetupStep('configure');
          }
        }
      }

    } catch (_err) {
      console.error('Error fetching data:', _err);
    }
  };

  const expectedMatches = Math.round(
    groupConfig.numGroups * (groupConfig.teamsPerGroup * groupConfig.matchesPerTeam / 2)
  );

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    if (tournament.numGroups) {
      setGroupConfig({
        numGroups: tournament.numGroups,
        teamsPerGroup: tournament.teamsPerGroup || 4,
        matchesPerTeam: tournament.matchesPerTeam || 3,
      });
    }
    setSetupStep('configure');
  };

  const handleConfigureGroupStage = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numGroups: groupConfig.numGroups,
          teamsPerGroup: groupConfig.teamsPerGroup,
          matchesPerTeam: groupConfig.matchesPerTeam,
          matchesBeforeBracket: expectedMatches,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to configure group stage');
      }

      setSuccess(`✅ Group stage configured! Proposed total matches: ${expectedMatches}.`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Fetch approved teams for allocation
      const regRes = await fetch(`/api/tournaments/${selectedTournament.id}/registrations?status=APPROVED`);
      if (regRes.ok) {
        const regs = await regRes.json();
        setApprovedTeams(regs.map((r: any) => ({ id: r.team.id, name: r.team.name, tag: r.team.tag })));
      }
      
      setSetupStep('allocate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure group stage');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = () => {
    if (approvedTeams.length === 0) return;
    
    // Shuffle teams
    const shuffled = [...approvedTeams].sort(() => Math.random() - 0.5);
    
    // Split into groups
    const newGroups = Array.from({ length: groupConfig.numGroups }, (_, i) => ({
      name: `Group ${String.fromCharCode(65 + i)}`,
      teams: [] as Team[]
    }));
    
    shuffled.forEach((team, idx) => {
      newGroups[idx % groupConfig.numGroups].teams.push(team);
    });
    
    setProposedGroups(newGroups);
  };

  const handleConfirmAllocation = async () => {
    if (!selectedTournament || proposedGroups.length === 0) return;

    setSavingGroups(true);
    try {
      // 1. Clear existing groups
      await fetch(`/api/tournaments/${selectedTournament.id}/groups`, { method: 'DELETE' });

      // 2. Create new groups sequentially
      for (const group of proposedGroups) {
        const res = await fetch(`/api/tournaments/${selectedTournament.id}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: group.name,
            teams: group.teams.map(t => t.id)
          })
        });
        if (!res.ok) throw new Error(`Failed to create ${group.name}`);
      }

      setSuccess(`✅ Groups successfully deployed! ${approvedTeams.length} teams assigned. Initializing match roadmap...`);
      
      // 3. Trigger Orchestrator (Zero-Config)
      setOrchestrating(true);
      const orchRes = await fetch(`/api/tournaments/${selectedTournament.id}/initialize-orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // We rely on API fallbacks for StartDate and PlayDays
        })
      });

      if (!orchRes.ok) {
        const orchData = await orchRes.json();
        throw new Error(orchData.error || 'Groups saved, but failed to initialize match roadmap');
      }

      const orchResult = await orchRes.json();
      setSuccess(`✅ Setup Complete! Groups saved and ${orchResult.matchCount} matches generated.`);
      setTimeout(() => setSuccess(null), 5000);
      
      setSetupStep('bracket');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize group setup');
    } finally {
      setSavingGroups(false);
      setOrchestrating(false);
    }
  };


  const handleAutoGenerateBracket = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/auto-generate-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 400 && data.message?.includes('already exist')) {
          setSuccess('ℹ️ Bracket already exists. Proceeding.');
          setTimeout(() => setSuccess(null), 2000);
          setSetupStep('finals');
          return;
        }
        throw new Error(data.error || 'Failed to generate bracket');
      }

      setSuccess('✅ Bracket automatically generated from current standings!');
      setTimeout(() => setSuccess(null), 3000);
      setSetupStep('finals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate bracket');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureFinals = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      setSuccess('✅ Tournament fully configured! Automated workflow is active.');
      setTimeout(() => {
        setSetupStep('select');
        setSelectedTournament(null);
        setGroupConfig({ numGroups: 1, teamsPerGroup: 4, matchesPerTeam: 3 });
        setSuccess(null);
        fetchData();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure finals');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueCreate = async () => {
    if (leagueForm.teamIds.length < 2) {
      setError('Select at least 2 teams');
      return;
    }

    setLoading(true);
    try {
      const seasonRes = await fetch('/api/seasons');
      if (!seasonRes.ok) throw new Error('Failed to fetch seasons');
      const seasonData = await seasonRes.json();
      const activeSeason = seasonData.seasons?.find(
        (s: { status: string }) => s.status === 'ACTIVE'
      );
      if (!activeSeason) throw new Error('No active season');

      const res = await fetch(`/api/seasons/${activeSeason.id}/initialize-league`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: leagueForm.teamIds,
          leagueStartDate: leagueForm.leagueStartDate,
          leagueName: leagueForm.leagueName || `League ${new Date().toLocaleDateString()}`,
          bestOf: leagueForm.bestOf,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create league');
      }

      const totalMatches = Math.floor((leagueForm.teamIds.length * (leagueForm.teamIds.length - 1)) / 2);
      setSuccess(`✅ League created! ${totalMatches} total encounters across ${leagueForm.teamIds.length} teams.`);
      setLeagueForm({ ...leagueForm, teamIds: [], leagueName: '' });
      setTimeout(() => {
        fetchData();
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamSelection = (teamId: string) => {
    setLeagueForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <Trophy size={32} className="text-[#e8a000]" />
               <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Setup <span className="text-[#e8a000]">Workflow</span></h1>
             </div>
             <p className="text-[#555] text-sm font-medium tracking-wide max-w-lg">
               Initialize and automate the transition between group stages and knockout brackets for your esports events.
             </p>
          </div>
          
          <div className="flex bg-white/[0.03] backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
            {(
              [
                { id: 'tournament-setup', label: 'Automated', icon: Zap },
                { id: 'league', label: 'League', icon: Users },
                { id: 'playoffs', label: 'Playoffs', icon: Trophy },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isSelected
                      ? 'bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/20'
                      : 'text-[#666] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Action Alerts */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`rounded-2xl border px-6 py-4 flex items-center justify-between gap-4 shadow-2xl ${
                error ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
              }`}
            >
              <div className="flex items-center gap-4">
                {error ? <AlertCircle className="text-red-400 shrink-0" size={20} /> : <CheckCircle className="text-emerald-400 shrink-0" size={20} />}
                <p className={`text-sm font-bold ${error ? 'text-red-300' : 'text-emerald-300'}`}>
                  {error || success}
                </p>
              </div>
              <button onClick={() => { setError(null); setSuccess(null); }} className="text-white/20 hover:text-white transition-colors uppercase font-black text-[10px]">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="grid grid-cols-1 gap-12">
          {activeTab === 'tournament-setup' && (
            <div className="space-y-12">
              {/* Premium Workflow Stepper */}
              <div className="flex items-center justify-between relative px-2">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/5 z-0" />
                {(
                  [
                    { id: 'select', label: 'Select', icon: Play },
                    { id: 'configure', label: 'Config', icon: Settings },
                    { id: 'allocate', label: 'Match', icon: Users },
                    { id: 'bracket', label: 'Autofill', icon: Zap },
                    { id: 'finals', label: 'Finalize', icon: Trophy },
                  ] as const
                ).map((step, idx) => {

                  const stepIds = ['select', 'configure', 'allocate', 'bracket', 'finals'] as const;
                  const stepIndex = stepIds.indexOf(setupStep);
                  const isActive = setupStep === step.id;
                  const isCompleted = stepIndex > idx;

                  
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border ${
                          isActive
                            ? 'bg-[#e8a000] border-[#e8a000] text-black shadow-2xl shadow-[#e8a000]/40 scale-110'
                            : isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-[#0a0a0f] border-white/10 text-[#555]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle size={24} /> : React.createElement(step.icon, { size: 24 })}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] transform translate-y-2 ${isActive ? 'text-[#e8a000]' : isCompleted ? 'text-emerald-400' : 'text-[#444]'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Step Components */}
              <AnimatePresence mode="wait">
                {setupStep === 'select' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {tournaments.length === 0 ? (
                         <div className="col-span-full py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                           <Clock size={40} className="text-[#333] mx-auto" />
                           <p className="text-[#555] font-black uppercase tracking-[0.2em] text-[10px]">No eligible tournaments found</p>
                           <p className="text-[12px] text-[#444]">Ensure tournaments are marked as CLOSED or ONGOING.</p>
                         </div>
                       ) : (
                         tournaments.map((t, idx) => (
                           <motion.button
                             key={t.id}
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: idx * 0.1 }}
                             onClick={() => handleSelectTournament(t)}
                             className="group text-left"
                           >
                              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-[#e8a000]/50 hover:bg-white/[0.05] rounded-2xl p-6 transition-all h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Trophy size={80} />
                                </div>
                                <p className="text-[10px] font-black text-[#e8a000]/60 uppercase tracking-[0.2em] mb-4">Registration Concluded</p>
                                <h4 className="text-xl font-black text-white uppercase tracking-tight mb-6 group-hover:text-[#e8a000]">{t.name}</h4>
                                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                                   <div>
                                     <p className="text-[9px] font-black text-[#555] uppercase tracking-wider mb-1">Format</p>
                                     <p className="text-xs text-white uppercase font-bold">{t.format.split('_')[0]}</p>
                                   </div>
                                   <div>
                                     <p className="text-[9px] font-black text-[#555] uppercase tracking-wider mb-1">Occupancy</p>
                                     <p className="text-xs text-white uppercase font-bold">{t.filled} / {t.slots} TEAMS</p>
                                   </div>
                                </div>
                                <div className="mt-8 flex items-center justify-between">
                                  <span className="bg-[#e8a000]/10 text-[#e8a000] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{t.status}</span>
                                  <ChevronRight size={16} className="text-[#e8a000] transform group-hover:translate-x-1 transition-transform" />
                                </div>
                              </div>
                           </motion.button>
                         ))
                       )}
                    </div>
                  </motion.div>
                )}

                {setupStep === 'configure' && selectedTournament && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto w-full">
                    <GlassCard>
                       <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                          <div className="p-4 rounded-2xl bg-[#e8a000]/10 text-[#e8a000]"><Settings size={28} /></div>
                          <div>
                            <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.2em] mb-1">Phase 01: Architecture</p>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Define <span className="text-[#e8a000]">Group Metrics</span></h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#555]">Number of Groups</label>
                             <input
                               type="number"
                               min={1} max={16}
                               value={groupConfig.numGroups}
                               onChange={(e) => setGroupConfig({ ...groupConfig, numGroups: parseInt(e.target.value, 10) || 1 })}
                               className="w-full bg-white/[0.03] border border-white/10 text-white p-4 rounded-xl font-mono text-center focus:border-[#e8a000]/50 outline-none"
                             />
                             <p className="text-[9px] text-[#444] font-medium leading-tight px-1">How many separate pools of teams will compete.</p>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#555]">Teams Per Group</label>
                             <input
                               type="number"
                               min={2} max={16}
                               value={groupConfig.teamsPerGroup}
                               onChange={(e) => setGroupConfig({ ...groupConfig, teamsPerGroup: parseInt(e.target.value, 10) || 4 })}
                               className="w-full bg-white/[0.03] border border-white/10 text-white p-4 rounded-xl font-mono text-center focus:border-[#e8a000]/50 outline-none"
                             />
                             <p className="text-[9px] text-[#444] font-medium leading-tight px-1">The maximum number of teams in each pool.</p>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#555]">Encounters Per Team</label>
                             <input
                               type="number"
                               min={1} max={15}
                               value={groupConfig.matchesPerTeam}
                               onChange={(e) => setGroupConfig({ ...groupConfig, matchesPerTeam: parseInt(e.target.value, 10) || 3 })}
                               className="w-full bg-white/[0.03] border border-white/10 text-white p-4 rounded-xl font-mono text-center focus:border-[#e8a000]/50 outline-none"
                             />
                             <p className="text-[9px] text-[#444] font-medium leading-tight px-1">How many times each team plays every other team.</p>
                          </div>
                       </div>

                       <div className="p-8 rounded-2xl bg-[#e8a000]/[0.05] border border-[#e8a000]/20 flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                          <div className="flex items-center gap-5">
                            <div className="p-3 rounded-full bg-[#e8a000] text-black"><Target size={24} /></div>
                            <div>
                              <p className="text-[9px] font-black text-[#e8a000] uppercase tracking-[0.2em] mb-1">Threshold Signature</p>
                              <p className="text-3xl font-black text-white">{expectedMatches} TOTAL MATCHES</p>
                            </div>
                          </div>
                          <div className="max-w-[240px]">
                            <p className="text-[11px] text-[#555] font-medium leading-relaxed">
                              Knockout bracket protocols will initialize automatically upon reaching this match count milestone.
                            </p>
                          </div>
                       </div>

                       <div className="flex gap-4">
                          <button onClick={() => setSetupStep('select')} className="px-8 py-4 bg-white/5 text-[#aaa] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">Abort</button>
                          <button onClick={handleConfigureGroupStage} disabled={loading} className="flex-1 px-8 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#ffb800] shadow-xl shadow-[#e8a000]/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                            Synchronize Blueprint
                          </button>
                       </div>
                    </GlassCard>
                  </motion.div>
                )}

                {setupStep === 'allocate' && selectedTournament && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-4xl mx-auto w-full">
                    <GlassCard>
                      <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400"><Users size={28} /></div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Phase 1.5: Allocation</p>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Match Teams <span className="text-indigo-400">to Groups</span></h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                             <CheckCircle size={14} className="text-emerald-400" />
                             {approvedTeams.length} Approved Teams Found
                          </h4>
                          <p className="text-[10px] text-[#555] font-black uppercase tracking-widest mt-1">Ready for group distribution</p>
                        </div>
                        <button 
                          onClick={handleAutoMatch}
                          className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <Zap size={14} className="text-[#e8a000]" /> Shuffle Teams
                        </button>
                      </div>

                      {proposedGroups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                           {proposedGroups.map((group, idx) => (
                             <motion.div 
                                key={group.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6"
                             >
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{group.name}</span>
                                  <span className="text-[9px] font-bold text-white/20 uppercase">{group.teams.length} Teams</span>
                                </div>
                                <div className="space-y-2">
                                   {group.teams.map(team => (
                                     <div key={team.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                                        <span className="text-[10px] font-black text-[#888] uppercase tracking-wider">{team.tag}</span>
                                        <span className="text-[10px] text-white/40 truncate">{team.name}</span>
                                     </div>
                                   ))}
                                </div>
                             </motion.div>
                           ))}
                        </div>
                      ) : (
                        <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl mb-12">
                           <Layout size={40} className="text-white/5 mx-auto mb-4" />
                           <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Click Shuffle to generate preview</p>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <button onClick={() => setSetupStep('configure')} className="px-8 py-4 bg-white/5 text-[#aaa] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">Back</button>
                         <button 
                          onClick={handleConfirmAllocation} 
                          disabled={savingGroups || orchestrating || proposedGroups.length === 0} 
                          className="flex-1 px-8 py-4 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-indigo-600 shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-30"
                        >
                          {(savingGroups || orchestrating) ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                          {orchestrating ? 'Generating Roadmap...' : 'Save & Confirm Assignments'}
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {setupStep === 'bracket' && selectedTournament && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-3xl mx-auto w-full">
                    <GlassCard className="border-emerald-500/20 bg-emerald-500/[0.02]">
                       <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400"><Zap size={28} /></div>
                          <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Phase 02: Automation</p>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Seeding & <span className="text-emerald-400">Knockout</span></h3>
                          </div>
                       </div>

                       <div className="space-y-6 mb-12">
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="flex items-center gap-3 text-emerald-400">
                               <CheckCircle size={18} />
                               <p className="text-xs font-black uppercase tracking-widest">Live Integration Active</p>
                            </div>
                            <p className="text-sm text-[#777] leading-relaxed">
                              Admin match submissions for <span className="text-white font-bold">{selectedTournament.name}</span> are now being tracked. 
                              The standings engine will prioritize higher seeds and resolve ties across <span className="text-white font-bold">{groupConfig.numGroups} groups</span>.
                            </p>
                          </div>
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="flex items-center gap-3 text-emerald-400">
                               <CheckCircle size={18} />
                               <p className="text-xs font-black uppercase tracking-widest">Automatic Generation Ready</p>
                            </div>
                            <p className="text-sm text-[#777] leading-relaxed">
                              The bracket grid will be rendered instantly once the <span className="text-white font-bold">{expectedMatches} match threshold</span> is met.
                            </p>
                          </div>
                       </div>

                       <div className="flex gap-4">
                          <button onClick={() => setSetupStep('configure')} className="px-8 py-4 bg-white/5 text-[#aaa] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">Config</button>
                          <button onClick={handleAutoGenerateBracket} disabled={loading} className="flex-1 px-8 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                            Permit Autofill
                          </button>
                       </div>
                    </GlassCard>
                  </motion.div>
                )}

                {setupStep === 'finals' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto w-full">
                    <GlassCard>
                       <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                          <div className="p-4 rounded-2xl bg-[#e8a000]/10 text-[#e8a000]"><Trophy size={28} /></div>
                          <div>
                            <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.2em] mb-1">Phase 03: Culmination</p>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Series <span className="text-[#e8a000]">Governance</span></h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                          {[
                            { label: 'Semifinals', state: 'semifinalsBestOf' },
                            { label: '3rd Place', state: 'thirdPlaceBestOf' },
                            { label: 'Grand Finals', state: 'grandFinalBestOf' }
                          ].map((item) => (
                            <div key={item.label} className="space-y-3">
                               <label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#555]">{item.label}</label>
                               <select
                                 value={finalsForm[item.state as keyof typeof finalsForm]}
                                 onChange={(e) => setFinalsForm({ ...finalsForm, [item.state]: parseInt(e.target.value) })}
                                 className="w-full bg-white/[0.03] border border-white/10 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-[#e8a000]/50 appearance-none"
                               >
                                 <option value={1} className="bg-[#0a0a0f]">Single Game</option>
                                 <option value={3} className="bg-[#0a0a0f]">Best of 3</option>
                                 <option value={5} className="bg-[#0a0a0f]">Best of 5</option>
                               </select>
                            </div>
                          ))}
                       </div>

                       <div className="flex gap-4">
                          <button onClick={() => setSetupStep('bracket')} className="px-8 py-4 bg-white/5 text-[#aaa] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">Back</button>
                          <button onClick={handleConfigureFinals} disabled={loading} className="flex-1 px-8 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#ffb800] shadow-xl shadow-[#e8a000]/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Seal Setup
                          </button>
                       </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'league' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto w-full">
              <GlassCard>
                <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                  <div className="p-4 rounded-2xl bg-[#e8a000]/10 text-[#e8a000]"><Users size={28} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Initialize <span className="text-[#e8a000]">League Archive</span></h3>
                    <p className="text-[10px] text-[#555] font-black uppercase tracking-widest mt-1">Round-Robin Structure Generation</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                   <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block mb-2">Display Name</label>
                        <input
                          type="text"
                          value={leagueForm.leagueName}
                          onChange={(e) => setLeagueForm({ ...leagueForm, leagueName: e.target.value })}
                          placeholder="Botsville Season 2 Pro League"
                          className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#e8a000]/50 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block mb-2">Commencement</label>
                          <input
                            type="date"
                            value={leagueForm.leagueStartDate}
                            onChange={(e) => setLeagueForm({ ...leagueForm, leagueStartDate: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/10 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block mb-2">Series Depth</label>
                          <select
                            value={leagueForm.bestOf}
                            onChange={(e) => setLeagueForm({ ...leagueForm, bestOf: parseInt(e.target.value) })}
                            className="w-full bg-white/[0.03] border border-white/10 text-[#e8a000] px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                          >
                            <option value={1} className="bg-[#0a0a0f]">BO1</option>
                            <option value={3} className="bg-[#0a0a0f]">BO3</option>
                            <option value={5} className="bg-[#0a0a0f]">BO5</option>
                          </select>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Participant Selection ({leagueForm.teamIds.length})</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto bg-black/40 border border-white/10 p-4 rounded-2xl scrollbar-hide">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => toggleTeamSelection(team.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                              leagueForm.teamIds.includes(team.id)
                                ? 'bg-[#e8a000]/10 border-[#e8a000]/30 text-white'
                                : 'bg-white/[0.02] border-white/5 text-[#555] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full border ${leagueForm.teamIds.includes(team.id) ? 'bg-[#e8a000] border-[#e8a000]' : 'border-white/20'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{team.tag}</span>
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="flex pt-6 border-t border-white/5">
                   <button
                     onClick={handleLeagueCreate}
                     disabled={loading || leagueForm.teamIds.length < 2}
                     className="flex-1 px-8 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-[#ffb800] shadow-xl shadow-[#e8a000]/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                     Simulate League & Deploy
                   </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === 'playoffs' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto w-full">
               <GlassCard className="text-center py-20">
                  <Trophy size={48} className="text-[#333] mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Phase Restricted</h3>
                  <p className="text-sm text-[#555] font-medium max-w-sm mx-auto mb-10">
                    Seeding system for season-wide playoffs is currently being synchronized with current leaderboard metrics.
                  </p>
                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full inline-flex items-center gap-3">
                     <Clock size={14} className="text-[#e8a000]" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-[#aaa]">Coming Online Soon</span>
                  </div>
               </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TournamentSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
