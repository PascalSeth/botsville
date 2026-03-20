'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Loader2, AlertCircle, Trophy, Flame, Shield, Star } from 'lucide-react';

type PlayerProfile = {
  id: string;
  ign: string;
  photo: string | null;
  role: string;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
  };
};

type TeamAward = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
};

type SeasonAwards = {
  seasonId: string;
  seasonName: string;
  championTeam: TeamAward | null;
  runnerUpTeam: TeamAward | null;
  thirdPlaceTeam: TeamAward | null;
  seasonMvp: PlayerProfile | null;
  bestOffender: PlayerProfile | null;
  bestDefender: PlayerProfile | null;
  awardedAt: string;
};

type TournamentMvp = {
  id: string;
  playerId: string;
  playerIgn: string;
  playerPhoto: string | null;
  playerRole: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogo: string | null;
  mvpCount: number;
  totalKills: number;
  totalAssists: number;
  totalDeaths: number;
  winRate: number;
  ranking: number;
};

type Tournament = {
  id: string;
  name: string;
  status: string;
  season?: { id: string; name: string } | null;
};

export default function TournamentAwardsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [awards, setAwards] = useState<SeasonAwards | null>(null);
  const [mvps, setMvps] = useState<TournamentMvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'podium' | 'mvp' | 'stats'>('podium');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament info
        const tournamentRes = await fetch(`/api/tournaments/${slug}`);
        if (!tournamentRes.ok) throw new Error('Tournament not found');
        const tournamentData = await tournamentRes.json();
        setTournament(tournamentData);

        // Fetch season awards if tournament has a season
        if (tournamentData.season?.id) {
          const awardsRes = await fetch(`/api/seasons/${tournamentData.season.id}/awards`);
          if (awardsRes.ok) {
            const awardsData = await awardsRes.json();
            setAwards(awardsData);
          }

          // Fetch tournament MVPs for the season
          const mvpsRes = await fetch(`/api/seasons/${tournamentData.season.id}/mvps`);
          if (mvpsRes.ok) {
            const mvpsData = await mvpsRes.json();
            setMvps(mvpsData?.mvps || []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load awards');
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
            <p className="text-sm text-[#666] mt-1">Awards & MVPs</p>
          </div>
        </div>

        {!awards && mvps.length === 0 ? (
          <div className="border border-white/10 rounded-lg bg-[#0a0a0f]/80 p-12 text-center">
            <p className="text-[#666] text-lg">Awards not available yet</p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="border-b border-white/10 flex gap-6">
              <button
                onClick={() => setTab('podium')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab === 'podium'
                    ? 'text-[#e8a000] border-b-2 border-[#e8a000]'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Trophy size={14} /> Podium
                </span>
              </button>
              <button
                onClick={() => setTab('mvp')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab === 'mvp'
                    ? 'text-[#e8a000] border-b-2 border-[#e8a000]'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star size={14} /> MVP Awards
                </span>
              </button>
              <button
                onClick={() => setTab('stats')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tab === 'stats'
                    ? 'text-[#e8a000] border-b-2 border-[#e8a000]'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Flame size={14} /> Top Performers
                </span>
              </button>
            </div>

            {/* Podium tab */}
            {tab === 'podium' && awards && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Silver (2nd) */}
                  {awards.runnerUpTeam && (
                    <div className="border border-white/10 rounded-lg p-6 text-center space-y-3 order-2 sm:order-1">
                      <div className="text-3xl">🥈</div>
                      <div className="text-xs font-black text-gray-400 uppercase tracking-wider">2nd Place</div>
                      {awards.runnerUpTeam.logo && (
                        <Image
                          src={awards.runnerUpTeam.logo}
                          alt={awards.runnerUpTeam.name}
                          width={60}
                          height={60}
                          className="w-16 h-16 mx-auto rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-black text-white text-lg">{awards.runnerUpTeam.name}</div>
                        <div className="text-xs text-[#666]">{awards.runnerUpTeam.tag}</div>
                      </div>
                    </div>
                  )}

                  {/* Gold (1st) */}
                  {awards.championTeam && (
                    <div className="border border-[#e8a000]/30 rounded-lg p-6 text-center space-y-3 bg-[#e8a000]/5 order-1 sm:order-2 sm:scale-105">
                      <div className="text-5xl">🏆</div>
                      <div className="text-xs font-black text-[#e8a000] uppercase tracking-wider">Champion</div>
                      {awards.championTeam.logo && (
                        <Image
                          src={awards.championTeam.logo}
                          alt={awards.championTeam.name}
                          width={60}
                          height={60}
                          className="w-16 h-16 mx-auto rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-black text-white text-lg">{awards.championTeam.name}</div>
                        <div className="text-xs text-[#666]">{awards.championTeam.tag}</div>
                      </div>
                    </div>
                  )}

                  {/* Bronze (3rd) */}
                  {awards.thirdPlaceTeam && (
                    <div className="border border-white/10 rounded-lg p-6 text-center space-y-3 order-3">
                      <div className="text-3xl">🥉</div>
                      <div className="text-xs font-black text-orange-600 uppercase tracking-wider">3rd Place</div>
                      {awards.thirdPlaceTeam.logo && (
                        <Image
                          src={awards.thirdPlaceTeam.logo}
                          alt={awards.thirdPlaceTeam.name}
                          width={60}
                          height={60}
                          className="w-16 h-16 mx-auto rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-black text-white text-lg">{awards.thirdPlaceTeam.name}</div>
                        <div className="text-xs text-[#666]">{awards.thirdPlaceTeam.tag}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MVP Awards tab */}
            {tab === 'mvp' && awards && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Season MVP */}
                {awards.seasonMvp && (
                  <div className="border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wider">
                      <Star size={16} /> Season MVP
                    </div>
                    <div className="flex gap-3">
                      {awards.seasonMvp.photo && (
                        <Image
                          src={awards.seasonMvp.photo}
                          alt={awards.seasonMvp.ign}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{awards.seasonMvp.ign}</div>
                        <div className="text-xs text-[#666]">{awards.seasonMvp.team.name}</div>
                        <div className="text-xs text-[#e8a000] font-bold mt-1">{awards.seasonMvp.role}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Best Attacker */}
                {awards.bestOffender && (
                  <div className="border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
                      <Flame size={16} /> Best Attacker
                    </div>
                    <div className="flex gap-3">
                      {awards.bestOffender.photo && (
                        <Image
                          src={awards.bestOffender.photo}
                          alt={awards.bestOffender.ign}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{awards.bestOffender.ign}</div>
                        <div className="text-xs text-[#666]">{awards.bestOffender.team.name}</div>
                        <div className="text-xs text-red-400 font-bold mt-1">{awards.bestOffender.role}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Best Defender */}
                {awards.bestDefender && (
                  <div className="border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                      <Shield size={16} /> Best Defender
                    </div>
                    <div className="flex gap-3">
                      {awards.bestDefender.photo && (
                        <Image
                          src={awards.bestDefender.photo}
                          alt={awards.bestDefender.ign}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{awards.bestDefender.ign}</div>
                        <div className="text-xs text-[#666]">{awards.bestDefender.team.name}</div>
                        <div className="text-xs text-blue-400 font-bold mt-1">{awards.bestDefender.role}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Performers tab */}
            {tab === 'stats' && mvps.length > 0 && (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/2">
                        <th className="px-4 py-3 font-bold text-[#666]">#</th>
                        <th className="px-4 py-3 font-bold text-[#666]">Player</th>
                        <th className="px-4 py-3 font-bold text-[#666] text-center">MVP</th>
                        <th className="px-4 py-3 font-bold text-[#666] text-center">Kills</th>
                        <th className="px-4 py-3 font-bold text-[#666] text-center">Assists</th>
                        <th className="px-4 py-3 font-bold text-[#666] text-center">Deaths</th>
                        <th className="px-4 py-3 font-bold text-[#666] text-center">W/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mvps.slice(0, 10).map((mvp) => (
                        <tr key={mvp.id} className="border-b border-white/5 hover:bg-white/2">
                          <td className="px-4 py-3 text-[#e8a000] font-black">{mvp.ranking}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {mvp.playerPhoto && (
                                <Image
                                  src={mvp.playerPhoto}
                                  alt={mvp.playerIgn}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-semibold text-white">{mvp.playerIgn}</div>
                                <div className="text-xs text-[#666]">{mvp.teamTag}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-yellow-400 font-bold">{mvp.mvpCount}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{mvp.totalKills}</td>
                          <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{mvp.totalAssists}</td>
                          <td className="px-4 py-3 text-center text-red-400 font-semibold">{mvp.totalDeaths}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[#e8a000] font-bold">
                              {(mvp.winRate * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
