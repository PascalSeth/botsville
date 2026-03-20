'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar, MapPin, Trophy, Users, ChevronRight,
  Swords, Medal, Zap, AlertCircle,
  Share2, Heart, Loader2,
} from 'lucide-react';

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  format: string;
  location: string;
  date: string;
  slots: number;
  status: string;
  season?: { id: string; name: string } | null;
  image: string | null;
  prizePool?: string | null;
  rules?: string[];
};

type Standing = {
  rank: number;
  team: { id: string; name: string; tag: string; logo: string | null };
  wins: number;
  losses: number;
  points: number;
};

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch by slug/ID
        const response = await fetch(`/api/tournaments/${slug}`);
        if (!response.ok) throw new Error('Tournament not found');
        
        const data = await response.json();
        setTournament(data);

        // Fetch standings if available
        try {
          const standingsRes = await fetch(`/api/tournaments/${data.id}/standings`);
          if (standingsRes.ok) {
            const standingsData = await standingsRes.json();
            setStandings(standingsData?.standings || []);
          }
        } catch {
          // Standings may not be available yet
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournament');
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
      <div className="min-h-screen flex items-center justify-center bg-[#08080d]">
        <div className="text-center space-y-4">
          <AlertCircle size={32} className="mx-auto text-red-400" />
          <p className="text-white text-lg">{error || 'Tournament not found'}</p>
          <Link href="/tournaments" className="text-[#e8a000] hover:underline">
            Back to tournaments
          </Link>
        </div>
      </div>
    );
  }

  const isLive = tournament.status === 'LIVE' || tournament.status === 'ONGOING';
  const isCompleted = tournament.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#08080d]">
      {/* Hero section */}
      {tournament.image && (
        <div className="relative h-64 sm:h-96 overflow-hidden border-b border-white/10">
          <Image
            src={tournament.image}
            alt={tournament.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#08080d]" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-black text-3xl sm:text-4xl text-white uppercase tracking-[0.08em]">
                {tournament.name}
              </h1>
              {tournament.subtitle && (
                <p className="text-[#888] text-sm mt-1">{tournament.subtitle}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
              isLive ? 'bg-red-500/20 text-red-400' :
              isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-[#e8a000]/20 text-[#e8a000]'
            }`}>
              {tournament.status}
            </span>
          </div>
          {tournament.season && (
            <p className="text-[#666] text-sm">Season: {tournament.season.name}</p>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-white/10 rounded p-3">
            <div className="text-[10px] text-[#666] uppercase tracking-wider font-bold mb-1">
              Date & Time
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-[#e8a000] mt-0.5 shrink-0" />
              <span className="text-sm text-white font-semibold">
                {new Date(tournament.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="border border-white/10 rounded p-3">
            <div className="text-[10px] text-[#666] uppercase tracking-wider font-bold mb-1">
              Format
            </div>
            <div className="flex items-start gap-2">
              <Swords size={14} className="text-[#e8a000] mt-0.5 shrink-0" />
              <span className="text-sm text-white font-semibold">
                {tournament.format.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="border border-white/10 rounded p-3">
            <div className="text-[10px] text-[#666] uppercase tracking-wider font-bold mb-1">
              Slots
            </div>
            <div className="flex items-start gap-2">
              <Users size={14} className="text-[#e8a000] mt-0.5 shrink-0" />
              <span className="text-sm text-white font-semibold">
                {tournament.slots} teams
              </span>
            </div>
          </div>

          <div className="border border-white/10 rounded p-3">
            <div className="text-[10px] text-[#666] uppercase tracking-wider font-bold mb-1">
              Location
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-[#e8a000] mt-0.5 shrink-0" />
              <span className="text-sm text-white font-semibold">
                {tournament.location || 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="border-b border-white/10 flex gap-6 overflow-x-auto">
          <Link
            href={`/tournaments/${slug}`}
            className="pb-3 text-sm font-bold uppercase tracking-wider text-[#e8a000] border-b-2 border-[#e8a000]"
          >
            Overview
          </Link>
          <Link
            href={`/tournaments/${slug}/bracket`}
            className="pb-3 text-sm font-bold uppercase tracking-wider text-[#666] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1">
              <Trophy size={14} /> Bracket
            </span>
          </Link>
          <Link
            href={`/tournaments/${slug}/standings`}
            className="pb-3 text-sm font-bold uppercase tracking-wider text-[#666] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1">
              <Medal size={14} /> Standings
            </span>
          </Link>
          {isCompleted && (
            <Link
              href={`/tournaments/${slug}/awards`}
              className="pb-3 text-sm font-bold uppercase tracking-wider text-[#666] hover:text-white transition-colors"
            >
              <span className="flex items-center gap-1">
                <Zap size={14} /> Awards
              </span>
            </Link>
          )}
        </div>

        {/* Description section */}
        {tournament.description && (
          <div className="border border-white/10 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              About
            </h2>
            <p className="text-[#aaa] leading-relaxed whitespace-pre-wrap">
              {tournament.description}
            </p>
          </div>
        )}

        {/* Quick standings preview */}
        {standings.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-white/2">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#e8a000]">
                Standings Preview
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/2">
                    <th className="px-6 py-3 font-bold text-[#666]">#</th>
                    <th className="px-6 py-3 font-bold text-[#666]">Team</th>
                    <th className="px-6 py-3 font-bold text-[#666] text-center">W</th>
                    <th className="px-6 py-3 font-bold text-[#666] text-center">L</th>
                    <th className="px-6 py-3 font-bold text-[#666] text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 5).map((s) => (
                    <tr key={s.team.id} className="border-b border-white/5 hover:bg-white/1">
                      <td className="px-6 py-3 text-[#e8a000] font-black">{s.rank}</td>
                      <td className="px-6 py-3 font-semibold text-white">{s.team.name}</td>
                      <td className="px-6 py-3 text-center text-emerald-400 font-bold">{s.wins}</td>
                      <td className="px-6 py-3 text-center text-red-400 font-bold">{s.losses}</td>
                      <td className="px-6 py-3 text-center text-[#e8a000] font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {standings.length > 5 && (
              <div className="px-6 py-4 text-center border-t border-white/10">
                <Link
                  href={`/tournaments/${slug}/standings`}
                  className="text-[#e8a000] text-sm font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  View all standings <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3 flex-wrap">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] transition-colors">
            <Heart size={14} /> Interested
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-white/20 text-[#aaa] text-xs font-black uppercase tracking-wider hover:border-white/40 transition-colors">
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
