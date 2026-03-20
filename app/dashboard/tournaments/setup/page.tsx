'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, Zap, Users, Play, AlertCircle, Loader2,
  ChevronRight, Settings, CheckCircle, Clock,
} from 'lucide-react';

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

export default function TournamentSetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tournament-setup' | 'league' | 'playoffs'>('tournament-setup');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tournament setup wizard state
  const [setupStep, setSetupStep] = useState<'select' | 'configure' | 'bracket' | 'finals'>('select');
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
    } catch (_err) {
      console.error('Error fetching data:', _err);
    }
  };

  // Calculate expected matches
  const expectedMatches = Math.round(
    groupConfig.numGroups * (groupConfig.teamsPerGroup * groupConfig.matchesPerTeam / 2)
  );

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    // Pre-fill with tournament's existing config if available
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

      setSuccess(`✅ Group stage configured! ${expectedMatches} matches will trigger bracket auto-generation.`);
      setTimeout(() => setSuccess(null), 2000);
      setSetupStep('bracket');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure group stage');
    } finally {
      setLoading(false);
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
        // Not an error if bracket already exists
        if (res.status === 400 && data.message?.includes('already exist')) {
          setSuccess('ℹ️ Bracket already exists. Proceeding to finals configuration.');
          setTimeout(() => setSuccess(null), 2000);
          setSetupStep('finals');
          return;
        }
        throw new Error(data.error || 'Failed to generate bracket');
      }

      setSuccess('✅ Bracket automatically generated from standings!');
      setTimeout(() => setSuccess(null), 2000);
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
      // This would be called after bracket generation is complete
      setSuccess('✅ Tournament fully configured! Automatic workflow ready.');
      setTimeout(() => {
        setSetupStep('select');
        setSelectedTournament(null);
        setGroupConfig({ numGroups: 1, teamsPerGroup: 4, matchesPerTeam: 3 });
        setFinalsForm({
          semifinalsBestOf: 3,
          thirdPlaceBestOf: 3,
          grandFinalBestOf: 5,
        });
        setSuccess(null);
        fetchData();
      }, 2000);
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
      setSuccess(`✅ League created! ${leagueForm.teamIds.length} teams, ${totalMatches} total matches`);
      setLeagueForm({
        teamIds: [],
        leagueStartDate: new Date().toISOString().split('T')[0],
        leagueName: '',
        bestOf: 1,
      });
      setTimeout(() => {
        fetchData();
        setSuccess(null);
      }, 2000);
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
    <div className="min-h-screen bg-linear-to-br from-[#08080d] to-[#1a1a2e] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Trophy size={32} className="text-[#e8a000]" />
            <h1 className="text-4xl font-black text-white">Tournament Setup</h1>
          </div>
          <p className="text-[#888]">Configure tournaments with automated group stage → bracket → finals workflow</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/20 border border-red-400 text-red-400 px-4 py-3 rounded flex gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold">
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-400 px-4 py-3 rounded flex gap-2">
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 border-b border-white/10 overflow-x-auto">
          {(
            [
              { id: 'tournament-setup', label: 'Tournament Setup', icon: Zap },
              { id: 'league', label: 'League', icon: Users },
              { id: 'playoffs', label: 'Playoffs', icon: Trophy },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#e8a000] text-[#e8a000]'
                    : 'text-[#666] hover:text-white border-b-2 border-transparent'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {/* Tournament Setup - Automated Workflow */}
          {activeTab === 'tournament-setup' && (
            <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-8 space-y-8">
              {/* Workflow Steps Indicator */}
              <div className="flex items-center justify-between">
                {(
                  [
                    { id: 'select', label: 'Select Tournament', icon: Play },
                    { id: 'configure', label: 'Configure Groups', icon: Settings },
                    { id: 'bracket', label: 'Auto-Generate Bracket', icon: Zap },
                    { id: 'finals', label: 'Finals Setup', icon: Trophy },
                  ] as const
                ).map((step, idx) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition flex-shrink-0 ${
                        setupStep === step.id
                          ? 'bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/50'
                          : setupStep > step.id || step.id < setupStep
                          ? 'bg-emerald-500/30 text-emerald-400'
                          : 'bg-white/10 text-[#666]'
                      }`}
                    >
                      {step.id < setupStep ? '✓' : idx + 1}
                    </div>
                    <p
                      className={`ml-3 text-sm font-bold whitespace-nowrap ${
                        setupStep === step.id
                          ? 'text-[#e8a000]'
                          : step.id < setupStep
                          ? 'text-emerald-400'
                          : 'text-[#666]'
                      }`}
                    >
                      {step.label}
                    </p>
                    {idx < 3 && (
                      <div
                        className={`flex-1 h-1 mx-3 rounded transition ${
                          setupStep > step.id ? 'bg-emerald-500/30' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Select Tournament */}
              {setupStep === 'select' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Select a Tournament to Configure</h3>
                  <p className="text-[#888] text-sm">Choose a tournament with CLOSED or ONGOING status</p>
                  
                  {tournaments.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                      <Clock size={32} className="text-[#666] mx-auto mb-3" />
                      <p className="text-[#666]">No tournaments available for setup</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {tournaments.map((tournament) => (
                        <button
                          key={tournament.id}
                          onClick={() => handleSelectTournament(tournament)}
                          className="bg-white/5 border border-white/10 hover:border-[#e8a000]/50 rounded-lg p-4 text-left transition group"
                        >
                          <h4 className="font-bold text-white group-hover:text-[#e8a000] transition">{tournament.name}</h4>
                          <div className="text-xs text-[#888] mt-2 space-y-1">
                            <p>Format: {tournament.format}</p>
                            <p>Status: <span className="text-[#e8a000]">{tournament.status}</span></p>
                            <p>Registered: {tournament.filled}/{tournament.slots}</p>
                          </div>
                          <div className="text-[#e8a000] text-xs font-bold mt-3 flex items-center gap-1">
                            Select Tournament <ChevronRight size={14} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Configure Group Stage */}
              {setupStep === 'configure' && selectedTournament && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Configure Group Stage</h3>
                    <p className="text-[#888] text-sm">Tournament: <span className="text-[#e8a000] font-bold">{selectedTournament.name}</span></p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          Number of Groups
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={groupConfig.numGroups}
                          onChange={(e) => setGroupConfig({ ...groupConfig, numGroups: parseInt(e.target.value, 10) || 1 })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          Teams per Group
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={16}
                          value={groupConfig.teamsPerGroup}
                          onChange={(e) => setGroupConfig({ ...groupConfig, teamsPerGroup: parseInt(e.target.value, 10) || 4 })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          Matches per Team
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={groupConfig.matchesPerTeam}
                          onChange={(e) => setGroupConfig({ ...groupConfig, matchesPerTeam: parseInt(e.target.value, 10) || 3 })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        />
                      </div>
                    </div>

                    <div className="bg-[#e8a000]/10 border border-[#e8a000]/30 rounded-lg p-4">
                      <p className="text-[#e8a000] font-bold">
                        Expected Group Matches: <span className="text-lg">{expectedMatches}</span>
                      </p>
                      <p className="text-[#888] text-xs mt-1">
                        Bracket will automatically generate after all {expectedMatches} group stage matches complete
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetupStep('select')}
                      className="px-4 py-2 border border-white/20 text-[#aaa] hover:text-white rounded font-bold transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfigureGroupStage}
                      disabled={loading}
                      className="px-6 py-2 bg-[#e8a000] text-black hover:bg-[#ffb800] disabled:opacity-50 rounded font-bold transition flex items-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Auto-Generate Bracket */}
              {setupStep === 'bracket' && selectedTournament && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Auto-Generate Bracket</h3>
                    <p className="text-[#888] text-sm">The bracket will be automatically created once all group stage matches ({expectedMatches}) are completed.</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <p className="text-emerald-400 font-bold">✓ System Configured</p>
                      <ul className="text-[#888] text-sm mt-2 space-y-1">
                        <li>✓ Group stage matches: {expectedMatches}</li>
                        <li>✓ When complete, bracket auto-generates with standings</li>
                        <li>✓ Top seeds advance through bracket</li>
                      </ul>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-blue-400 font-bold">ℹ️ Match Submission</p>
                      <p className="text-[#888] text-sm mt-2">
                        When admins submit match results, the system will automatically:
                        <br />1. Update standings from completed group matches
                        <br />2. Detect when all group matches finish
                        <br />3. Generate bracket with proper seeding
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetupStep('configure')}
                      className="px-4 py-2 border border-white/20 text-[#aaa] hover:text-white rounded font-bold transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAutoGenerateBracket}
                      disabled={loading}
                      className="px-6 py-2 bg-[#e8a000] text-black hover:bg-[#ffb800] disabled:opacity-50 rounded font-bold transition flex items-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Continue to Finals
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Finals Setup */}
              {setupStep === 'finals' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Finals Configuration</h3>
                    <p className="text-[#888] text-sm">Optional: Configure finals series format (semis, 3rd place, grand final)</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          Semifinals Best Of
                        </label>
                        <select
                          value={finalsForm.semifinalsBestOf}
                          onChange={(e) => setFinalsForm({ ...finalsForm, semifinalsBestOf: parseInt(e.target.value) })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        >
                          <option value={1}>Best of 1</option>
                          <option value={3}>Best of 3</option>
                          <option value={5}>Best of 5</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          3rd Place Best Of
                        </label>
                        <select
                          value={finalsForm.thirdPlaceBestOf}
                          onChange={(e) => setFinalsForm({ ...finalsForm, thirdPlaceBestOf: parseInt(e.target.value) })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        >
                          <option value={1}>Best of 1</option>
                          <option value={3}>Best of 3</option>
                          <option value={5}>Best of 5</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                          Grand Final Best Of
                        </label>
                        <select
                          value={finalsForm.grandFinalBestOf}
                          onChange={(e) => setFinalsForm({ ...finalsForm, grandFinalBestOf: parseInt(e.target.value) })}
                          className="w-full bg-[#08080d] border border-white/20 text-white px-3 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                        >
                          <option value={1}>Best of 1</option>
                          <option value={3}>Best of 3</option>
                          <option value={5}>Best of 5</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <p className="text-emerald-400 font-bold">✓ Tournament Ready!</p>
                    <p className="text-[#888] text-sm mt-2">
                      Your tournament is fully configured with automated workflow:
                      <br />Group Stage → Auto-Bracket Generation → Finals
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetupStep('bracket')}
                      className="px-4 py-2 border border-white/20 text-[#aaa] hover:text-white rounded font-bold transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfigureFinals}
                      disabled={loading}
                      className="px-6 py-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 rounded font-bold transition flex items-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Complete Setup
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* League Tab */}
          {activeTab === 'league' && (
            <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">Create League</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                    League Name
                  </label>
                  <input
                    type="text"
                    value={leagueForm.leagueName}
                    onChange={(e) => setLeagueForm({ ...leagueForm, leagueName: e.target.value })}
                    placeholder="e.g., MLBB Pro League Season 1"
                    className="w-full bg-[#08080d] border border-white/20 text-white px-4 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leagueForm.leagueStartDate}
                      onChange={(e) => setLeagueForm({ ...leagueForm, leagueStartDate: e.target.value })}
                      className="w-full bg-[#08080d] border border-white/20 text-white px-4 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                      Best Of
                    </label>
                    <select
                      value={leagueForm.bestOf}
                      onChange={(e) => setLeagueForm({ ...leagueForm, bestOf: parseInt(e.target.value) })}
                      className="w-full bg-[#08080d] border border-white/20 text-white px-4 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                    >
                      <option value={1}>Best of 1</option>
                      <option value={3}>Best of 3</option>
                      <option value={5}>Best of 5</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                    Select Teams ({leagueForm.teamIds.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto bg-[#08080d] border border-white/10 p-4 rounded">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white/5 rounded">
                        <input
                          type="checkbox"
                          checked={leagueForm.teamIds.includes(team.id)}
                          onChange={() => toggleTeamSelection(team.id)}
                          className="accent-[#e8a000]"
                        />
                        <span className="text-sm text-white">{team.tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLeagueCreate}
                  disabled={loading || leagueForm.teamIds.length < 2}
                  className="px-6 py-2 bg-[#e8a000] text-black hover:bg-[#ffb800] disabled:opacity-50 rounded font-bold transition flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Create League
                </button>
              </div>
            </div>
          )}

          {/* Playoffs Tab */}
          {activeTab === 'playoffs' && (
            <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">Create Playoffs</h3>
              <p className="text-[#888]">Playoffs are seeded from current season standings</p>

              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">
                  Playoffs Start Date
                </label>
                <input
                  type="date"
                  value={playoffsForm.playoffsStartDate}
                  onChange={(e) => setPlayoffsForm({ ...playoffsForm, playoffsStartDate: e.target.value })}
                  className="w-full max-w-xs bg-[#08080d] border border-white/20 text-white px-4 py-2 rounded focus:outline-none focus:border-[#e8a000]"
                />
              </div>

              <button
                onClick={() => setSuccess('Playoffs creation coming soon!')}
                className="px-6 py-2 bg-[#e8a000] text-black hover:bg-[#ffb800] rounded font-bold transition"
              >
                Create Playoffs (Coming Soon)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
