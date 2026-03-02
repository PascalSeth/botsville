'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Users, Plus, AlertCircle, X, Loader2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Player {
  id: string;
  ign: string;
  role: string;
  photo: string | null;
  isSubstitute: boolean;
  user?: {
    id: string;
    ign: string;
    photo: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  tag: string;
  teamCode?: string | null;
  region: string;
  logo: string | null;
  banner: string | null;
  status: string;
  isRecruiting?: boolean;
  captainId: string;
  isCaptain?: boolean;
  players: Player[];
}

interface UserProfile {
  id: string;
  ign: string;
  mainRole: string;
  favoriteHero: string | null;
  favoriteSkin: string | null;
  rankBadge: string | null;
  region: string | null;
  headline: string | null;
  player?: {
    role: string;
    winRate: number;
  } | null;
}

interface HeroCatalogOption {
  id: string;
  key: string;
  name: string;
  imageUrl: string;
}

interface MatchChallenge {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'SCHEDULED';
  weekStart: string;
  createdAt: string;
  challengerTeamId: string;
  challengedTeamId: string;
  challengerTeam?: { id: string; name: string; tag: string } | null;
  challengedTeam?: { id: string; name: string; tag: string } | null;
}

interface TeamOption {
  id: string;
  name: string;
  tag: string;
}

interface WeeklyScrimPing {
  weekStart: string;
  scrimDate: string;
  message?: string | null;
  updatedAt: string;
}

interface WeeklyScrimAvailability {
  id: string;
  teamId: string;
  weekStart: string;
  isAvailable: boolean;
  note?: string | null;
  updatedAt: string;
}

const MAIN_ROLES = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'] as const;
const PROFILE_REGIONS = ['Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'] as const;
const RANK_BADGES = [
  'WARRIOR',
  'ELITE',
  'MASTER',
  'GRANDMASTER',
  'EPIC',
  'LEGEND',
  'MYTHIC',
  'MYTHICAL_HONOR',
  'MYTHICAL_GLORY',
  'MYTHICAL_IMMORTAL',
] as const;

export default function MyTeamPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    mainRole: 'EXP',
    favoriteHero: '',
    favoriteSkin: '',
    rankBadge: '',
    region: '',
    headline: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [heroOptions, setHeroOptions] = useState<HeroCatalogOption[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [savingTeamSettings, setSavingTeamSettings] = useState(false);
  const [teamSettingsError, setTeamSettingsError] = useState<string | null>(null);
  const [teamSettingsSuccess, setTeamSettingsSuccess] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<MatchChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [challengeActionLoading, setChallengeActionLoading] = useState<string | null>(null);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeTeamId, setChallengeTeamId] = useState('');
  const [challengeWeekStart, setChallengeWeekStart] = useState('');
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<string | null>(null);
  const [weeklyPing, setWeeklyPing] = useState<WeeklyScrimPing | null>(null);
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyScrimAvailability | null>(null);
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMyTeam();
      fetchProfile();
      fetchHeroCatalog();
    }
  }, [status]);

  useEffect(() => {
    setProfileForm((prev) => {
      if (!prev.favoriteHero) return prev;
      const exists = heroOptions.some((hero) => hero.key === prev.favoriteHero);
      return exists ? prev : { ...prev, favoriteHero: '' };
    });
  }, [heroOptions]);

  const fetchMyTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-team');
      const data = await response.json();
      
      if (response.ok && data) {
        setTeam(data);
      } else {
        setTeam(null);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      const data = await response.json();

      if (!response.ok) {
        setProfileError(data?.error || 'Failed to load profile');
        return;
      }

      setProfile(data);
      setProfileForm({
        mainRole: data.mainRole ?? 'EXP',
        favoriteHero: data.favoriteHero ?? '',
        favoriteSkin: data.favoriteSkin ?? '',
        rankBadge: data.rankBadge ?? '',
        region: data.region ?? '',
        headline: data.headline ?? '',
      });
      setProfileError(null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError('Failed to load profile');
    }
  };

  const fetchHeroCatalog = async () => {
    try {
      const response = await fetch('/api/heroes/catalog');
      const data = await response.json();
      if (!response.ok) return;
      setHeroOptions(Array.isArray(data?.heroes) ? data.heroes : []);
    } catch (err) {
      console.error('Error fetching heroes catalog:', err);
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload = {
        mainRole: profileForm.mainRole,
        favoriteHero: profileForm.favoriteHero || null,
        favoriteSkin: profileForm.favoriteSkin || null,
        rankBadge: profileForm.rankBadge || null,
        region: profileForm.region || null,
        headline: profileForm.headline || null,
      };

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setProfileError(data?.error || 'Failed to save profile');
        return;
      }

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mainRole: data.mainRole,
          favoriteHero: data.favoriteHero,
          favoriteSkin: data.favoriteSkin,
          rankBadge: data.rankBadge,
          region: data.region,
          headline: data.headline,
        };
      });
      setProfileSuccess('Profile updated');
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const generateInviteCode = async () => {
    if (!team) return;
    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/invite-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 10, expiresAt: null }),
      });
      const data = await response.json();
      if (response.ok && data.link) {
        setInviteCode(data.link.code);
      }
    } catch (err) {
      console.error('Error generating invite:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!team || !confirm('Are you sure you want to remove this player?')) return;
    setRemovingPlayerId(playerId);
    try {
      const response = await fetch(`/api/teams/${team.id}/players/${playerId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchMyTeam();
      }
    } catch (err) {
      console.error('Error removing player:', err);
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const updateRecruitingStatus = async (isRecruiting: boolean) => {
    if (!team || !team.isCaptain) return;

    setSavingTeamSettings(true);
    setTeamSettingsError(null);
    setTeamSettingsSuccess(null);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecruiting }),
      });
      const data = await response.json();

      if (!response.ok) {
        setTeamSettingsError(data?.error || 'Failed to update team settings');
        return;
      }

      setTeam((prev) => (prev ? { ...prev, isRecruiting: data.team?.isRecruiting ?? isRecruiting } : prev));
      setTeamSettingsSuccess(isRecruiting ? 'Team is now accepting members' : 'Team recruitment closed');
    } catch (err) {
      console.error('Error updating recruiting settings:', err);
      setTeamSettingsError('Failed to update team settings');
    } finally {
      setSavingTeamSettings(false);
    }
  };

  const fetchChallenges = useCallback(async () => {
    try {
      setLoadingChallenges(true);
      const response = await fetch('/api/matches/challenges');
      const data = await response.json();
      if (!response.ok) {
        setChallengeError(data?.error || 'Failed to load challenges');
        return;
      }
      setChallenges(Array.isArray(data?.challenges) ? data.challenges : []);
    } catch (err) {
      console.error('Error fetching challenges:', err);
      setChallengeError('Failed to load challenges');
    } finally {
      setLoadingChallenges(false);
    }
  }, []);

  const fetchWeeklyAvailability = useCallback(async () => {
    if (!team?.isCaptain) return;
    try {
      setAvailabilityLoading(true);
      const response = await fetch('/api/matches/challenges/availability');
      const data = await response.json();
      if (!response.ok) {
        setChallengeError(data?.error || 'Failed to load weekly availability');
        return;
      }

      setWeeklyPing(data?.ping ?? null);
      setWeeklyAvailability(data?.availability ?? null);
      setAvailabilityNote(data?.availability?.note ?? '');
    } catch (err) {
      console.error('Error fetching weekly availability:', err);
      setChallengeError('Failed to load weekly availability');
    } finally {
      setAvailabilityLoading(false);
    }
  }, [team?.isCaptain]);

  const fetchTeamOptions = useCallback(async () => {
    if (!team) return;
    try {
      const response = await fetch('/api/teams?limit=200');
      const data = await response.json();
      if (!response.ok) return;
      const items: TeamOption[] = (Array.isArray(data?.teams) ? data.teams : [])
        .filter((entry: TeamOption) => entry.id !== team.id)
        .map((entry: TeamOption) => ({ id: entry.id, name: entry.name, tag: entry.tag }));
      setTeamOptions(items);
      if (!challengeTeamId && items.length > 0) {
        setChallengeTeamId(items[0].id);
      }
    } catch (err) {
      console.error('Error fetching team options:', err);
    }
  }, [team, challengeTeamId]);

  const submitChallenge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeTeamId) {
      setChallengeError('Select a team to challenge');
      return;
    }

    setChallengeActionLoading('create');
    setChallengeError(null);
    setChallengeSuccess(null);

    try {
      const response = await fetch('/api/matches/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengedTeamId: challengeTeamId,
          message: challengeMessage || null,
          weekStart: challengeWeekStart || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setChallengeError(data?.error || 'Failed to send challenge');
        return;
      }
      setChallengeSuccess('Challenge sent successfully');
      setChallengeMessage('');
      await fetchChallenges();
    } catch (err) {
      console.error('Error creating challenge:', err);
      setChallengeError('Failed to send challenge');
    } finally {
      setChallengeActionLoading(null);
    }
  };

  const respondToChallenge = async (challengeId: string, action: 'accept' | 'reject' | 'cancel') => {
    setChallengeActionLoading(challengeId);
    setChallengeError(null);
    setChallengeSuccess(null);

    try {
      const response = await fetch(`/api/matches/challenges/${challengeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setChallengeError(data?.error || 'Failed to update challenge');
        return;
      }
      setChallengeSuccess(data?.message || 'Challenge updated');
      await fetchChallenges();
    } catch (err) {
      console.error('Error updating challenge:', err);
      setChallengeError('Failed to update challenge');
    } finally {
      setChallengeActionLoading(null);
    }
  };

  const updateWeeklyAvailability = async (isAvailable: boolean) => {
    setAvailabilitySaving(true);
    setChallengeError(null);
    setChallengeSuccess(null);

    try {
      const response = await fetch('/api/matches/challenges/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable,
          note: availabilityNote || null,
          weekStart: weeklyPing?.weekStart ?? null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setChallengeError(data?.error || 'Failed to update weekly availability');
        return;
      }

      setChallengeSuccess(data?.message || 'Weekly availability updated');
      await fetchWeeklyAvailability();
    } catch (err) {
      console.error('Error updating weekly availability:', err);
      setChallengeError('Failed to update weekly availability');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  useEffect(() => {
    if (!team?.isCaptain) return;
    fetchChallenges();
    fetchTeamOptions();
    fetchWeeklyAvailability();
  }, [team?.id, team?.isCaptain, fetchChallenges, fetchTeamOptions, fetchWeeklyAvailability]);

  const roleColors: Record<string, string> = {
    EXP: '#e8a000',
    JUNGLE: '#22c55e',
    MAGE: '#a855f7',
    MARKSMAN: '#3b82f6',
    ROAM: '#f43f5e',
  };

  const availabilityStatus = !weeklyPing
    ? 'NO_PING'
    : weeklyAvailability
      ? (weeklyAvailability.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE')
      : 'NOT_SET';

  const availabilityStatusStyle: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    UNAVAILABLE: 'bg-red-500/15 border-red-500/40 text-red-400',
    NOT_SET: 'bg-white/10 border-white/20 text-[#bbb]',
    NO_PING: 'bg-white/10 border-white/20 text-[#777]',
  };

  const availabilityStatusLabel: Record<string, string> = {
    AVAILABLE: 'Available',
    UNAVAILABLE: 'Unavailable',
    NOT_SET: 'Not set yet',
    NO_PING: 'Waiting for admin ping',
  };

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#e8a000] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-[#666] mb-4">Please log in to view your team</p>
          <Link href="/login" className="bg-[#e8a000] text-black px-6 py-2 font-bold uppercase tracking-wider">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#e8a000] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-[#e8a000]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-[#e8a000]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase mb-2">No Team Yet</h1>
          <p className="text-[#666] mb-6">You are not part of a team. Create one or wait for an invite!</p>
          <Link
            href="/register-team"
            className="inline-flex items-center gap-2 bg-[#e8a000] hover:bg-[#ffb800] text-black px-6 py-3 font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={16} /> Register a Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Rajdhani', 'Barlow Condensed', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Barlow Condensed', 'Rajdhani', sans-serif; }
      `}</style>

      {/* Banner */}
      <div className="relative h-48 bg-[#080810] overflow-hidden">
        {team.banner ? (
          <img src={team.banner} alt="" className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#e8a000]/10 to-[#4a90d9]/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        
        {/* Logo overlapping banner */}
        <div className="absolute bottom-0 left-8 translate-y-1/2">
          <div className="w-24 h-24 border-4 border-[#0a0a0f] bg-[#0d0d14] overflow-hidden">
            {team.logo ? (
              <img src={team.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shield size={32} className="text-[#333]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-6">
        {error && (
          <div className="mb-4 border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-[0.1em] uppercase">{team.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[#e8a000]/70 text-sm tracking-widest">[{team.tag}]</span>
              {team.teamCode && (
                <>
                  <span className="text-[#555]">·</span>
                  <span className="text-[#e8a000] text-sm tracking-[0.2em] uppercase">Code {team.teamCode}</span>
                </>
              )}
              <span className="text-[#555]">·</span>
              <span className="text-[#666] text-sm">{team.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${
              team.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {team.status}
            </span>
            <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${
              team.isRecruiting ? 'bg-[#e8a000]/20 text-[#e8a000]' : 'bg-white/10 text-[#888]'
            }`}>
              {team.isRecruiting ? 'Looking for Members' : 'Recruitment Closed'}
            </span>
          </div>
        </div>
      </div>

      {team.isCaptain && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0c0c12] border border-white/[0.07] p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">Recruitment Settings</h2>
                  <p className="text-[#666] text-xs mt-2">Share this team code during signup: <span className="text-[#e8a000] tracking-[0.2em]">{team.teamCode || 'Not available'}</span></p>
                </div>

                <button
                  onClick={() => updateRecruitingStatus(!(team.isRecruiting ?? true))}
                  disabled={savingTeamSettings}
                  className="text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors disabled:opacity-50"
                >
                  {savingTeamSettings ? 'Saving...' : (team.isRecruiting ? 'Stop Accepting Members' : 'Accept Members')}
                </button>
              </div>

              {(teamSettingsError || teamSettingsSuccess) && (
                <p className={`text-sm ${teamSettingsError ? 'text-red-400' : 'text-green-400'}`}>
                  {teamSettingsError || teamSettingsSuccess}
                </p>
              )}
            </div>

            <div className="bg-[#0c0c12] border border-white/[0.07] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">Captain Availability</h2>
                <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border font-bold ${availabilityStatusStyle[availabilityStatus]}`}>
                  {availabilityStatusLabel[availabilityStatus]}
                </span>
              </div>

              {availabilityLoading ? (
                <p className="text-[#666] text-sm">Loading availability…</p>
              ) : !weeklyPing ? (
                <p className="text-[#666] text-sm">No weekly ping yet. Availability opens after admin ping.</p>
              ) : (
                <>
                  <p className="text-[#777] text-xs">
                    Week of {new Date(weeklyPing.weekStart).toLocaleDateString()} · Scrim date {new Date(weeklyPing.scrimDate).toLocaleString()}
                  </p>
                  {weeklyAvailability?.updatedAt && (
                    <p className="text-[11px] text-[#666]">
                      Last updated: {new Date(weeklyAvailability.updatedAt).toLocaleString()}
                    </p>
                  )}
                  <textarea
                    value={availabilityNote}
                    onChange={(event) => setAvailabilityNote(event.target.value)}
                    maxLength={200}
                    rows={2}
                    placeholder="Optional note (e.g., available after 7pm)"
                    className="w-full bg-[#0b0b12] border border-white/10 px-3 py-2 text-white text-sm"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {!weeklyAvailability?.isAvailable && (
                      <button
                        type="button"
                        disabled={availabilitySaving}
                        onClick={() => updateWeeklyAvailability(true)}
                        className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 bg-emerald-500/10 border-emerald-500/30"
                      >
                        {availabilitySaving ? 'Saving...' : 'Mark Available'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={availabilitySaving}
                      onClick={() => updateWeeklyAvailability(false)}
                      className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border text-red-400 hover:bg-red-500/20 disabled:opacity-50 ${
                        weeklyAvailability && !weeklyAvailability.isAvailable
                          ? 'bg-red-500/25 border-red-500/60'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      {availabilitySaving ? 'Saving...' : (weeklyAvailability && !weeklyAvailability.isAvailable ? 'Unavailable ✓' : 'Mark Unavailable')}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#777]">
                    This status is what admin uses to pair weekly scrims.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#0c0c12] border border-white/[0.07] p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="text-sm font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">Create Weekly Challenge</h3>
              <p className="text-[#666] text-xs mt-2">Challenge another team this week. Once accepted, an admin schedules the match date.</p>
            </div>

            <form onSubmit={submitChallenge} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={challengeTeamId}
                onChange={(event) => setChallengeTeamId(event.target.value)}
                className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
                required
              >
                <option value="">Select team</option>
                {teamOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name} [{option.tag}]</option>
                ))}
              </select>
              <input
                type="date"
                value={challengeWeekStart}
                onChange={(event) => setChallengeWeekStart(event.target.value)}
                className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              />
              <input
                value={challengeMessage}
                onChange={(event) => setChallengeMessage(event.target.value)}
                maxLength={140}
                placeholder="Message (optional)"
                className="bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm sm:col-span-2"
              />
              <button
                type="submit"
                disabled={challengeActionLoading === 'create'}
                className="text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors disabled:opacity-50"
              >
                {challengeActionLoading === 'create' ? 'Sending...' : 'Send Challenge'}
              </button>
            </form>

            {(challengeError || challengeSuccess) && (
              <p className={`text-sm ${challengeError ? 'text-red-400' : 'text-green-400'}`}>
                {challengeError || challengeSuccess}
              </p>
            )}
          </div>

          <div className="bg-[#0c0c12] border border-white/[0.07] p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">Challenge Queue</h3>

            <div className="space-y-2">
              {loadingChallenges ? (
                <p className="text-[#666] text-sm">Loading challenges...</p>
              ) : challenges.length === 0 ? (
                <p className="text-[#666] text-sm">No weekly challenges yet.</p>
              ) : (
                challenges.map((challenge) => {
                  const isIncoming = challenge.challengedTeamId === team.id;
                  const isOutgoing = challenge.challengerTeamId === team.id;
                  return (
                    <div key={challenge.id} className="border border-white/10 bg-[#0d0d14] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm text-white font-semibold">
                          {challenge.challengerTeam?.name ?? 'Team A'} vs {challenge.challengedTeam?.name ?? 'Team B'}
                        </p>
                        <p className="text-[11px] text-[#777]">
                          Week of {new Date(challenge.weekStart).toLocaleDateString()} · {challenge.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isIncoming && challenge.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={challengeActionLoading === challenge.id}
                              onClick={() => respondToChallenge(challenge.id, 'accept')}
                              className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={challengeActionLoading === challenge.id}
                              onClick={() => respondToChallenge(challenge.id, 'reject')}
                              className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isOutgoing && ['PENDING', 'ACCEPTED'].includes(challenge.status) && (
                          <button
                            type="button"
                            disabled={challengeActionLoading === challenge.id}
                            onClick={() => respondToChallenge(challenge.id, 'cancel')}
                            className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 bg-white/5 border border-white/20 text-[#aaa] hover:bg-white/10 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="bg-[#0c0c12] border border-white/[0.07] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">
              Player Profile
            </h2>
            <div className="text-right">
              <p className="text-[10px] text-[#666] uppercase tracking-widest">Current Role</p>
              <p className="text-sm font-bold text-[#e8a000]">{profile?.player?.role ?? profileForm.mainRole}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#0d0d14] border border-white/5 p-3">
              <p className="text-[10px] text-[#666] tracking-widest uppercase">IGN</p>
              <p className="text-sm font-bold text-white truncate">{profile?.ign || session?.user?.name || 'Player'}</p>
            </div>
            <div className="bg-[#0d0d14] border border-white/5 p-3">
              <p className="text-[10px] text-[#666] tracking-widest uppercase">Win Rate</p>
              <p className="text-sm font-bold text-white">{profile?.player?.winRate ? `${profile.player.winRate.toFixed(1)}%` : '0.0%'}</p>
            </div>
            <div className="bg-[#0d0d14] border border-white/5 p-3">
              <p className="text-[10px] text-[#666] tracking-widest uppercase">Region</p>
              <p className="text-sm font-bold text-white">{profileForm.region || 'Not set'}</p>
            </div>
            <div className="bg-[#0d0d14] border border-white/5 p-3">
              <p className="text-[10px] text-[#666] tracking-widest uppercase">Rank Badge</p>
              <p className="text-sm font-bold text-white">{profileForm.rankBadge || 'Not set'}</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Main Role
              <select
                value={profileForm.mainRole}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, mainRole: event.target.value }))}
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              >
                {MAIN_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Region
              <select
                value={profileForm.region}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, region: event.target.value }))}
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              >
                <option value="">Select region</option>
                {PROFILE_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>

            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Main Hero
              <select
                value={profileForm.favoriteHero}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, favoriteHero: event.target.value }))}
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              >
                <option value="">Select hero cutout</option>
                {heroOptions.map((hero) => (
                  <option key={hero.id} value={hero.key}>{hero.name}</option>
                ))}
              </select>
            </label>

            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Favorite Skin
              <input
                value={profileForm.favoriteSkin}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, favoriteSkin: event.target.value }))}
                maxLength={80}
                placeholder="e.g. Dragon Boy"
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              />
            </label>

            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Rank Badge
              <select
                value={profileForm.rankBadge}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, rankBadge: event.target.value }))}
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              >
                <option value="">Select rank</option>
                {RANK_BADGES.map((badge) => (
                  <option key={badge} value={badge}>{badge}</option>
                ))}
              </select>
            </label>

            <label className="text-[11px] text-[#888] uppercase tracking-wider">
              Headline
              <input
                value={profileForm.headline}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, headline: event.target.value }))}
                maxLength={120}
                placeholder="Short intro or grind goal"
                className="mt-1 w-full bg-[#0d0d14] border border-white/10 px-3 py-2 text-white text-sm"
              />
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="text-[10px] font-bold tracking-widest uppercase px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
              {profileError && <p className="text-sm text-red-400">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-green-400">{profileSuccess}</p>}
            </div>
          </form>
        </div>
      </div>

      {/* Players Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3">
            Roster
          </h2>
          {team.isCaptain && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowManageModal(true); }}
                className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 border border-white/10 text-[#888] hover:text-white hover:border-[#e8a000]/40 transition-colors"
              >
                Manage
              </button>
              <button
                onClick={() => { setShowInviteModal(true); generateInviteCode(); }}
                className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] hover:bg-[#e8a000]/20 transition-colors"
              >
                + Invite
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3">
          {team.players.map((player) => {
            const roleColor = roleColors[player.role] || '#666';
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-[#0c0c12] border border-white/[0.07]"
              >
                {/* Player Avatar */}
                <div className="w-12 h-12 border border-white/10 overflow-hidden bg-[#0d0d14] shrink-0">
                  {player.photo ? (
                    <img src={player.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={16} className="text-[#333]" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold tracking-wide uppercase truncate">{player.ign}</p>
                  <p className="text-[10px] tracking-widest uppercase" style={{ color: roleColor }}>
                    {player.role}
                    {player.isSubstitute && ' (Sub)'}
                  </p>
                </div>

                {/* Role indicator */}
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ background: roleColor }}
                />
              </motion.div>
            );
          })}
        </div>

        {team.players.length < 5 && (
          <div className="mt-4 p-4 border border-dashed border-white/10 text-center">
            <p className="text-[#555] text-sm">Need {5 - team.players.length} more player(s) to complete roster</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c12] border border-white/10 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-wider uppercase">Invite Players</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-[#666] hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-[#888] text-sm mb-4">Share this code with players you want to invite:</p>
              
              {generatingCode ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#e8a000]" />
                </div>
              ) : inviteCode ? (
                <div className="bg-[#0d0d14] border border-[#e8a000]/30 p-4 text-center">
                  <p className="text-[#e8a000] text-2xl font-black tracking-[0.3em]">{inviteCode}</p>
                </div>
              ) : (
                <p className="text-[#666] text-center">Failed to generate invite code</p>
              )}
              
              <p className="text-[#555] text-xs mt-4 text-center">
                Players can use this code at /join to join your team
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Players Modal */}
      <AnimatePresence>
        {showManageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowManageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c12] border border-white/10 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black tracking-wider uppercase">Manage Players</h3>
                <button onClick={() => setShowManageModal(false)} className="text-[#666] hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-[#0d0d14] border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border border-white/10 overflow-hidden bg-[#0d0d14]">
                        {player.photo ? (
                          <img src={player.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={12} className="text-[#333]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{player.ign}</p>
                        <p className="text-[10px] text-[#666] uppercase">{player.role}</p>
                      </div>
                    </div>
                    {player.user?.id !== session?.user?.id && (
                      <button
                        onClick={() => removePlayer(player.id)}
                        disabled={removingPlayerId === player.id}
                        className="text-[#666] hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {removingPlayerId === player.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
