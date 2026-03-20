'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BracketVisualization } from '@/app/components/sections/BracketVisualization';
import { ChevronLeft, Loader2, AlertCircle, Filter } from 'lucide-react';

type BracketMatch = {
  id: string;
  teamA: { id: string; name: string; tag: string; logo: string | null } | null;
  teamB: { id: string; name: string; tag: string; logo: string | null } | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scheduledTime: string;
  bracketType: 'WINNER_BRACKET' | 'LOSER_BRACKET' | 'GRAND_FINAL' | 'GROUP_STAGE';
  bracketPosition: number;
  round: number;
  nextMatchId: string | null;
  loserNextId: string | null;
};

type Tournament = {
  id: string;
  name: string;
  status: string;
};

export default function TournamentBracketPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bracketFilter, setBracketFilter] = useState<'all' | 'WINNER_BRACKET' | 'LOSER_BRACKET' | 'GRAND_FINAL' | 'GROUP_STAGE'>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament info
        const tournamentRes = await fetch(`/api/tournaments/${slug}`);
        if (!tournamentRes.ok) throw new Error('Tournament not found');
        const tournamentData = await tournamentRes.json();
        setTournament(tournamentData);

        // Fetch bracket data (only matches with bracketType set)
        const bracketRes = await fetch(`/api/brackets/matches?tournamentId=${tournamentData.id}`);
        if (!bracketRes.ok) throw new Error('Failed to load bracket');
        const bracketData = await bracketRes.json();
        setMatches(Array.isArray(bracketData) ? bracketData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bracket');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080d]">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080d] gap-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-white text-lg">{error || 'Tournament not found'}</p>
        <Link href="/tournaments" className="text-[#e8a000] hover:underline">
          Back to tournaments
        </Link>
      </div>
    );
  }

  const filteredMatches = bracketFilter === 'all' 
    ? matches 
    : matches.filter(m => m.bracketType === bracketFilter);

  return (
    <div className="min-h-screen bg-[#08080d]">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/tournaments/${slug}`} className="text-[#666] hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="font-black text-3xl text-white uppercase tracking-[0.08em]">
              {tournament.name}
            </h1>
            <p className="text-sm text-[#666] mt-1">Tournament Bracket</p>
          </div>
        </div>

        {/* Filter buttons */}
        {matches.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs font-black text-[#666] uppercase tracking-wider flex items-center gap-2">
              <Filter size={14} /> Filter:
            </span>
            {['all', 'GROUP_STAGE', 'WINNER_BRACKET', 'LOSER_BRACKET', 'GRAND_FINAL'].map((type) => (
              <button
                key={type}
                onClick={() => setBracketFilter(type as 'all' | 'GROUP_STAGE' | 'WINNER_BRACKET' | 'LOSER_BRACKET' | 'GRAND_FINAL')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded transition-colors ${
                  bracketFilter === type
                    ? 'bg-[#e8a000] text-black'
                    : 'border border-white/20 text-[#aaa] hover:border-white/40'
                }`}
              >
                {type === 'all' ? 'All Stages' : type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Bracket visualization */}
        {filteredMatches.length > 0 ? (
          <div className="border border-white/10 rounded-lg bg-[#0a0a0f]/80 p-6 overflow-x-auto">
            <BracketVisualization
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              matches={filteredMatches as any}
              tournamentName={tournament.name}
              isLoading={false}
            />
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg bg-[#0a0a0f]/80 p-12 text-center">
            <p className="text-[#666] text-lg">Bracket not available yet. Check back soon!</p>
          </div>
        )}

        {/* Recent matches list */}
        {matches.length > 0 && (
          <div className="border border-white/10 rounded-lg bg-[#0a0a0f]/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#e8a000]">
                Recent Matches
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {matches
                .filter(m => m.status === 'COMPLETED' || m.status === 'LIVE')
                .slice(0, 10)
                .map((match) => (
                  <div key={match.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/1 transition-colors">
                    <div className="flex-1 flex items-center gap-4">
                      {/* Team A */}
                      <div className="flex-1 text-right">
                        <div className={`font-semibold text-sm ${
                          match.winnerId === match.teamA?.id ? 'text-white' : 'text-[#888]'
                        }`}>
                          {match.teamA?.name || 'TBD'}
                        </div>
                        <div className="text-[10px] text-[#666]">{match.teamA?.tag}</div>
                      </div>

                      {/* Score */}
                      <div className="w-16 text-center">
                        <div className="text-lg font-black text-[#e8a000] font-mono">
                          {match.scoreA} – {match.scoreB}
                        </div>
                        <div className="text-[9px] text-[#666] uppercase font-bold mt-1">
                          {match.status === 'LIVE' ? (
                            <span className="text-red-400">LIVE</span>
                          ) : (
                            match.bracketType.replace(/_/g, ' ')
                          )}
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${
                          match.winnerId === match.teamB?.id ? 'text-white' : 'text-[#888]'
                        }`}>
                          {match.teamB?.name || 'TBD'}
                        </div>
                        <div className="text-[10px] text-[#666]">{match.teamB?.tag}</div>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-right text-xs text-[#666] min-w-25">
                      {new Date(match.scheduledTime).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
