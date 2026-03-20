'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

type Standing = {
  id: string;
  rank: number;
  previousRank: number | null;
  wins: number;
  losses: number;
  forfeits: number;
  points: number;
  streak: string | null;
  tier: string;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
    color: string | null;
  };
};

type Tournament = {
  id: string;
  name: string;
  status: string;
};

function RankDelta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return <span className="text-[#555]">—</span>;
  const delta = previous - current;
  if (delta === 0) return <span className="text-[#555]">—</span>;
  if (delta > 0) return (
    <div className="flex items-center gap-1 text-emerald-400 text-[10px]">
      <TrendingUp size={12} /> +{delta}
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-red-400 text-[10px]">
      <TrendingDown size={12} /> -{Math.abs(delta)}
    </div>
  );
}

export default function TournamentStandingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migratingPoints, setMigratingPoints] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const [isMigratedToMLBB, setIsMigratedToMLBB] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch tournament info
      const tournamentRes = await fetch(`/api/tournaments/${slug}`);
      if (!tournamentRes.ok) throw new Error('Tournament not found');
      const tournamentData = await tournamentRes.json();
      setTournament(tournamentData);

      // Check if already migrated
      const rules = tournamentData.rules || [];
      setIsMigratedToMLBB(rules.some((r: string) => r.includes('MLBB')));

      // Fetch standings
      const standingsRes = await fetch(`/api/tournaments/${tournamentData.id}/standings`);
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        setStandings(standingsData?.standings || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchData();
  }, [slug]);

  const handleMigrateToMLBBPoints = async () => {
    if (!tournament) return;

    setMigratingPoints(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/migrate-to-mlbb-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Migration failed');
      }

      setMigrationSuccess(true);
      setIsMigratedToMLBB(true);
      setTimeout(() => setMigrationSuccess(false), 3000);
      
      // Refresh standings
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to migrate points');
    } finally {
      setMigratingPoints(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#08080d]">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/tournaments/${slug}`} className="text-[#666] hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="font-black text-3xl text-white uppercase tracking-[0.08em]">
              {tournament.name}
            </h1>
            <p className="text-sm text-[#666] mt-1">Tournament Standings</p>
          </div>
        </div>

        {/* Migration Alert */}
        {!isMigratedToMLBB && (
          <div className="bg-blue-500/10 border border-blue-400/30 rounded p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-blue-300">⚡ Upgrade to MLBB Points System</p>
                <p className="text-xs text-blue-200/70 mt-1">
                  Migrate this tournament to use the professional MLBB points system (3/2/1/0) for fair scoring:
                  <br />• 2-0 Win: 3 pts | • 2-1 Win: 2 pts | • 1-2 Loss: 1 pt | • 0-2 Loss: 0 pts
                </p>
              </div>
              <button
                onClick={handleMigrateToMLBBPoints}
                disabled={migratingPoints}
                className="shrink-0 ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded transition"
              >
                {migratingPoints ? 'Migrating...' : 'Migrate Now'}
              </button>
            </div>
          </div>
        )}

        {migrationSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded p-4">
            <p className="text-sm font-bold text-emerald-300">✓ Successfully migrated to MLBB points system!</p>
          </div>
        )}

        {/* Standings table */}
        {standings.length > 0 ? (
          <div className="border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0f]/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/2">
                    <th className="px-4 py-3 font-bold text-[#666] w-12">#</th>
                    <th className="px-4 py-3 font-bold text-[#666]">Team</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">W</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">L</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">FF</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">PTS</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">Streak</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">Δ</th>
                    <th className="px-4 py-3 font-bold text-[#666] text-center">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    >
                      <td className="px-4 py-4 text-[#e8a000] font-black">{s.rank}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {s.team.logo ? (
                            <Image
                              src={s.team.logo}
                              alt={s.team.tag}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                              style={{ background: s.team.color ?? '#333' }}
                            >
                              {s.team.tag.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">{s.team.name}</div>
                            <div className="text-[10px] text-[#666]">[{s.team.tag}]</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-emerald-400 font-bold">{s.wins}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-red-400 font-bold">{s.losses}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-[#666]">{s.forfeits}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-black ${s.points < 0 ? 'text-red-400' : 'text-[#e8a000]'}`}>
                          {s.points}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {s.streak ? (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                            s.streak.startsWith('W')
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {s.streak}
                          </span>
                        ) : (
                          <span className="text-[#555]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <RankDelta current={s.rank} previous={s.previousRank} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-[10px] font-bold text-[#888]">{s.tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg bg-[#0a0a0f]/80 p-12 text-center">
            <p className="text-[#666] text-lg">No standings available yet</p>
          </div>
        )}

        {/* Legend */}
        {standings.length > 0 && (
          <div className="border border-white/10 rounded-lg p-4 bg-white/2 space-y-2">
            <div className="text-xs text-[#666] space-y-1">
              <p>
                <strong className="text-white">W</strong> = Wins •{' '}
                <strong className="text-white">L</strong> = Losses •{' '}
                <strong className="text-white">FF</strong> = Forfeits •{' '}
                <strong className="text-white">PTS</strong> = Points
              </p>
              <p>
                <strong className="text-white">Δ</strong> = Rank change (↑ = up, ↓ = down)
              </p>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <p className="text-[10px] font-bold text-[#e8a000] mb-1.5">MLBB Points System (3/2/1/0):</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#aaa]">
                <div><span className="text-emerald-400 font-bold">2-0 Win</span> = +3 pts</div>
                <div><span className="text-sky-400 font-bold">2-1 Win</span> = +2 pts</div>
                <div><span className="text-orange-400 font-bold">1-2 Loss</span> = +1 pt</div>
                <div><span className="text-red-400 font-bold">0-2 Loss</span> = 0 pts</div>
              </div>
              <p className="text-[10px] text-[#666] mt-1.5">Tiebreaker: Points → Wins → Head-to-Head</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
