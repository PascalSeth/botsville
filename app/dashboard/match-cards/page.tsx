'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, RefreshCw, Sparkles, Image as ImageIcon, Check } from 'lucide-react';

interface TeamItem {
  id: string;
  name: string;
  tag: string | null;
  logo: string | null;
}

interface MatchItem {
  id: string;
  scheduledTime: string;
  stage: string | null;
  lobby: string | null;
  teamA: TeamItem;
  teamB: TeamItem;
}

export default function MatchCardDesignerPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('custom');

  // Input states
  const [teamAName, setTeamAName] = useState('CERUS AL EGAN');
  const [teamBName, setTeamBName] = useState('AD57 AUY');
  const [teamATag, setTeamATag] = useState('CAE');
  const [teamBTag, setTeamBTag] = useState('AD57');
  const [logoA, setLogoA] = useState('');
  const [logoB, setLogoB] = useState('');
  
  const [dateStr, setDateStr] = useState('24 JULY 2026');
  const [timeStr, setTimeStr] = useState('18:00 GMT');
  const [stage, setStage] = useState('GRAND FINALS');
  const [lobby, setLobby] = useState('LOBBY A');

  // Colors
  const [colorA, setColorA] = useState('#e8740a');
  const [colorB, setColorB] = useState('#3b82f6');

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch initial teams and matches
  useEffect(() => {
    // Fetch Teams
    fetch('/api/teams?limit=100')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.teams)) {
          setTeams(data.teams);
        }
      })
      .catch(() => {});

    // Fetch Matches (or load from tournaments)
    fetch('/api/tournaments')
      .then(res => res.ok ? res.json() : null)
      .then(async data => {
        if (data && Array.isArray(data.tournaments) && data.tournaments.length > 0) {
          const activeTourney = data.tournaments[0];
          const mRes = await fetch(`/api/tournaments/${activeTourney.id}/matches`);
          if (mRes.ok) {
            const matchesData = await mRes.json();
            if (Array.isArray(matchesData)) {
              setMatches(matchesData);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update fields when selecting a match
  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    if (matchId === 'custom') return;

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    setRenderError(false);
    
    setTeamAName(match.teamA.name);
    setTeamBName(match.teamB.name);
    setTeamATag(match.teamA.tag || 'TMA');
    setTeamBTag(match.teamB.tag || 'TMB');
    setLogoA(match.teamA.logo || '');
    setLogoB(match.teamB.logo || '');

    const d = new Date(match.scheduledTime);
    setDateStr(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase());
    setTimeStr(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' GMT');
    setStage(match.stage || 'PLAYOFFS');
    setLobby(match.lobby || 'LOBBY A');
  };

  // Compile image URL
  const queryParams = new URLSearchParams({
    teamA: teamAName,
    teamB: teamBName,
    tagA: teamATag,
    tagB: teamBTag,
    logoA: logoA,
    logoB: logoB,
    date: dateStr,
    time: timeStr,
    stage: stage,
    lobby: lobby,
    colorA: colorA,
    colorB: colorB,
  });

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const imageUrl = `${originUrl}/api/og/match-card?${queryParams.toString()}&v=${reloadKey}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(imageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const triggerDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${teamATag}-vs-${teamBTag}-matchcard.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: Open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="text-[#e8a000] w-6 h-6 animate-pulse" />
            Match Card Designer
          </h1>
          <p className="text-white/40 text-xs mt-1">
            Programmatically generate custom high-res match graphics and Open Graph assets.
          </p>
        </div>

        {/* Load Match presets drop-down */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/30 uppercase">Preset:</span>
          <select
            value={selectedMatchId}
            onChange={(e) => handleMatchSelect(e.target.value)}
            className="bg-[#0e0e15] border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-[#e8a000]/40 outline-none w-52"
          >
            <option value="custom">[ Custom Designer ]</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.teamA.tag || 'TMA'} vs {m.teamB.tag || 'TMB'} ({m.stage || 'Match'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5 bg-[#0b0c10] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#e8a000] pb-2 border-b border-white/5">
            Card Data & Style
          </h3>

          {/* Teams Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div className="space-y-3">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Team A (Left)</label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                placeholder="Team Name"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <input
                type="text"
                value={teamATag}
                onChange={(e) => setTeamATag(e.target.value)}
                placeholder="Tag"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <input
                type="text"
                value={logoA}
                onChange={(e) => setLogoA(e.target.value)}
                placeholder="Logo URL (optional)"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorA}
                  onChange={(e) => setColorA(e.target.value)}
                  className="w-6 h-6 border-none bg-transparent cursor-pointer rounded"
                />
                <span className="text-[10px] font-mono text-white/50">{colorA}</span>
              </div>
            </div>

            {/* Team B */}
            <div className="space-y-3">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Team B (Right)</label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                placeholder="Team Name"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <input
                type="text"
                value={teamBTag}
                onChange={(e) => setTeamBTag(e.target.value)}
                placeholder="Tag"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <input
                type="text"
                value={logoB}
                onChange={(e) => setLogoB(e.target.value)}
                placeholder="Logo URL (optional)"
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorB}
                  onChange={(e) => setColorB(e.target.value)}
                  className="w-6 h-6 border-none bg-transparent cursor-pointer rounded"
                />
                <span className="text-[10px] font-mono text-white/50">{colorB}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-white/5 my-2" />

          {/* Match metadata details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Stage</label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Lobby</label>
              <input
                type="text"
                value={lobby}
                onChange={(e) => setLobby(e.target.value)}
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Time</label>
              <input
                type="text"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-white/40 uppercase block">Date</label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-[#0d0e14] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-white/20"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realtime Canvas/Image Output Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-[#0b0c10] border border-white/5 rounded-xl p-5 flex flex-col items-center justify-between flex-1">
            <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <ImageIcon className="text-[#e8a000] w-4 h-4" /> Live Render Preview
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold uppercase transition-colors"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={triggerDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8a000] hover:bg-[#ffb700] text-black rounded text-[10px] font-bold uppercase transition-transform active:scale-95"
                >
                  <Download className="w-3 h-3" /> Download Card
                </button>
              </div>
            </div>

            {/* The actual generated Next.js OG image */}
            <div className="relative w-full aspect-[1200/630] border border-white/10 rounded-lg overflow-hidden bg-[#04050a] flex items-center justify-center">
              {renderError ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <p className="text-xs text-white/50 max-w-sm">
                    Failed to generate card preview. This can happen if the server is starting up or compiling the Edge function.
                  </p>
                  <button
                    onClick={() => {
                      setRenderError(false);
                      setReloadKey(prev => prev + 1);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#e8a000]/10 border border-[#e8a000]/30 hover:border-[#e8a000]/60 text-[#e8a000] rounded text-xs font-bold uppercase transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Render
                  </button>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt="Match Card Render Output"
                  className="w-full h-full object-contain"
                  onLoad={() => setRenderError(false)}
                  onError={() => setRenderError(true)}
                />
              )}
            </div>

            {/* API Endpoint Readout */}
            <div className="w-full mt-4 bg-black/40 border border-white/5 p-3 rounded font-mono text-[9px] text-white/50 break-all select-all flex items-center justify-between gap-3">
              <span>{imageUrl}</span>
              <button onClick={copyToClipboard} className="shrink-0 text-white/40 hover:text-white">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
