'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Image as ImageIcon, Trash2, Calendar, Shield, Swords, Sparkles, Check, AlertCircle } from 'lucide-react';

import { useRoleGuard } from '../lib/useRole';

interface TeamItem {
  id: string;
  name: string;
  tag: string | null;
  logo: string | null;
}

interface MatchItem {
  id: string;
  scheduledTime: string;
  status: string;
  stage: string | null;
  lobby: string | null;
  teamA: TeamItem;
  teamB: TeamItem;
  flyerUrl?: string | null;
  flyerType?: string | null;
}

interface TournamentItem {
  id: string;
  name: string;
  status: string;
}

export default function MatchFlyersDashboard() {
  const { isAllowed: __roleAllowed } = useRoleGuard(["TOURNAMENT_ADMIN", "CONTENT_ADMIN", "EDITOR"]);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>('');
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [activeMatch, setActiveMatch] = useState<MatchItem | null>(null);


  // Upload state
  const [uploading, setUploading] = useState(false);
  const [flyerUrl, setFlyerUrl] = useState('');
  const [flyerType, setFlyerType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Tournaments
  useEffect(() => {
    fetch('/api/tournaments?limit=50')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const list = Array.isArray(data?.tournaments) ? data.tournaments : [];
        setTournaments(list);
        if (list.length > 0) {
          setSelectedTourneyId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Matches for chosen tournament
  const loadMatches = useCallback(async (tourneyId: string) => {
    if (!tourneyId) return;
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/tournaments/${tourneyId}/matches`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMatches(data);
        }
      }
    } catch {
      // error loading matches
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTourneyId) {
      loadMatches(selectedTourneyId);
    }
  }, [selectedTourneyId, loadMatches]);

  if (!__roleAllowed) return null;

  const selectMatch = (match: MatchItem) => {
    setActiveMatch(match);
    setFlyerUrl(match.flyerUrl || '');
    setFlyerType((match.flyerType as 'IMAGE' | 'VIDEO') || 'IMAGE');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Failed to read file'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const base64Data = await fileToDataUrl(file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          type: 'match-flyer',
          bucket: 'images',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Upload failed');
      }

      const data = await res.json();
      if (data?.url) {
        setFlyerUrl(data.url);
        // Auto detect type
        if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
          setFlyerType('VIDEO');
        } else {
          setFlyerType('IMAGE');
        }
        setSuccessMsg('File uploaded successfully!');
      } else {
        throw new Error('No url returned from upload handler');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setErrorMsg(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveFlyer = async () => {
    if (!activeMatch) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/matches/${activeMatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flyerUrl: flyerUrl || null,
          flyerType: flyerUrl ? flyerType : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || errorData?.message || 'Failed to update match flyer');
      }

      setSuccessMsg('Flyer assigned successfully!');
      
      // Refresh local list
      await loadMatches(selectedTourneyId);
      
      // Reset active match popup slowly
      setTimeout(() => {
        setActiveMatch(null);
      }, 1000);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setErrorMsg(errorMsg);
    }
  };

  const handleRemoveFlyer = async () => {
    if (!activeMatch) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/matches/${activeMatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flyerUrl: null,
          flyerType: null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || errorData?.message || 'Failed to remove flyer');
      }

      setFlyerUrl('');
      setSuccessMsg('Flyer removed successfully!');
      await loadMatches(selectedTourneyId);
      
      setTimeout(() => {
        setActiveMatch(null);
      }, 1000);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setErrorMsg(errorMsg);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="text-[#e8a000] w-6 h-6 animate-pulse" />
            Match Flyers Manager
          </h1>
          <p className="text-white/40 text-xs mt-1">
            Upload custom Canva designs (images or videos) and assign them to specific matches.
          </p>
        </div>

        {/* Tournament selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/30 uppercase">Tournament:</span>
          <select
            value={selectedTourneyId}
            onChange={(e) => setSelectedTourneyId(e.target.value)}
            className="bg-[#0e0e15] border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-[#e8a000]/40 outline-none w-64"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingMatches ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#e8a000] border-white/5 animate-spin" />
          <span className="text-xs font-mono text-white/40 uppercase">Loading match list...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-[#090a0f]">
          <Swords className="text-white/20 w-12 h-12 mb-3" />
          <p className="text-sm text-white/50 font-bold uppercase tracking-wider">No Matches Found</p>
          <p className="text-xs text-white/30 mt-1">Create matches in the tournament bracket or schedule first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => {
            const hasFlyer = Boolean(match.flyerUrl);
            const isVideo = match.flyerType === 'VIDEO';

            return (
              <div
                key={match.id}
                className="bg-[#0b0c10] border border-white/5 hover:border-white/10 rounded-xl overflow-hidden flex flex-col justify-between group transition-all duration-300"
              >
                {/* Visual Header representing current flyer preview */}
                <div className="relative aspect-[16/9] w-full bg-[#040508] border-b border-white/5 flex items-center justify-center overflow-hidden">
                  {hasFlyer ? (
                    isVideo ? (
                      <video
                        src={match.flyerUrl!}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <Image
                        src={match.flyerUrl!}
                        alt="Match flyer"
                        fill
                        className="object-cover opacity-80"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center text-center p-4">
                      <ImageIcon className="text-white/10 w-8 h-8 mb-1" />
                      <span className="text-[10px] font-mono text-white/30 uppercase">No custom design</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                    <span className="bg-black/60 border border-white/10 rounded px-2 py-0.5 font-mono text-[8px] text-white/60">
                      {match.stage || 'Group Stage'}
                    </span>
                    {hasFlyer && (
                      <span className="bg-[#e8a000]/20 border border-[#e8a000]/40 text-[#e8a000] rounded px-2 py-0.5 font-mono text-[8px] font-bold">
                        {isVideo ? 'VIDEO' : 'IMAGE'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {match.teamA.logo ? (
                        <img src={match.teamA.logo} alt="" className="w-5 h-5 object-contain" />
                      ) : (
                        <Shield className="w-4 h-4 text-white/30" />
                      )}
                      <span className="text-xs font-black text-white/80">{match.teamA.tag || match.teamA.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/30">VS</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white/80">{match.teamB?.tag || match.teamB?.name || 'TBD'}</span>
                      {match.teamB?.logo ? (
                        <img src={match.teamB.logo} alt="" className="w-5 h-5 object-contain" />
                      ) : (
                        <Shield className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                      <Calendar size={11} /> {new Date(match.scheduledTime).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </span>

                    <button
                      onClick={() => selectMatch(match)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[9px] font-black uppercase tracking-wider transition-colors border border-white/10"
                    >
                      {hasFlyer ? 'Edit Flyer' : 'Assign Flyer'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLYER ASSIGN MODAL/POPUP */}
      {activeMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setActiveMatch(null)}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#08080d] p-6 shadow-2xl space-y-5">
            
            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-[#e8a000] uppercase tracking-widest block mb-1">
                Assign Custom Graphic
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                {activeMatch.teamA.name} VS {activeMatch.teamB?.name || 'TBD'}
              </h3>
              <p className="text-xs text-white/40 mt-1">
                Select your Canva design file to upload as the match flyer.
              </p>
            </div>

            {/* Preview inside popup */}
            <div className="relative aspect-[16/9] w-full bg-black/50 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center">
              {flyerUrl ? (
                flyerType === 'VIDEO' ? (
                  <video src={flyerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={flyerUrl} alt="Flyer" className="w-full h-full object-contain" />
                )
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="text-white/10 w-10 h-10 mx-auto mb-2" />
                  <span className="text-xs font-mono text-white/30 uppercase">No flyer uploaded yet</span>
                </div>
              )}
            </div>

            {/* Input Controls */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-white/40 uppercase block">1. Select Canva File (Image or MP4 Video)</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-white/20 rounded px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer text-xs font-bold text-white transition-colors">
                    <Upload size={14} />
                    {uploading ? 'Uploading...' : 'Choose File'}
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  
                  {flyerUrl && (
                    <button
                      onClick={handleRemoveFlyer}
                      className="px-4 py-3 border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 text-xs font-bold transition-colors"
                      title="Remove Flyer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {flyerUrl && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/40 uppercase block">2. Flyer Format Type</label>
                    <select
                      value={flyerType}
                      onChange={(e) => setReloadType(e.target.value as 'IMAGE' | 'VIDEO')}
                      className="w-full bg-[#0d0e14] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="IMAGE">Static Image (PNG, JPG, WebP)</option>
                      <option value="VIDEO">Dynamic Video (MP4, WebM)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/40 uppercase block">3. URL (Manual edit)</label>
                    <input
                      type="text"
                      value={flyerUrl}
                      onChange={(e) => setFlyerUrl(e.target.value)}
                      className="w-full bg-[#0d0e14] border border-white/10 rounded px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono bg-red-500/10 p-2.5 rounded border border-red-500/20">
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20">
                <Check size={14} /> {successMsg}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-white/5">
              <button
                onClick={handleSaveFlyer}
                disabled={uploading}
                className="flex-1 py-3 bg-[#e8a000] hover:bg-[#ffb700] disabled:bg-white/10 disabled:text-white/40 text-black text-xs font-black uppercase tracking-wider rounded transition-colors"
              >
                Save Assignment
              </button>
              <button
                onClick={() => setActiveMatch(null)}
                className="px-6 py-3 border border-white/15 text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider rounded transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );

  // Quick type cast helper inside change callback
  function setReloadType(val: 'IMAGE' | 'VIDEO') {
    setFlyerType(val);
  }
}
