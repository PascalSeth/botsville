"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, Trophy, Calendar, Layout, 
  Users, ChevronRight, Filter, 
  Search, Loader2, Clock, Globe,
  Shield, Edit, Swords, Target, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardFetch } from "../lib/api";

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  date: string;
  format: string;
  filled?: number;
  slots: number;
  season?: { id: string; name: string } | null;
  _count?: { registrations: number; matches: number };
  banner?: string | null;
};

type Payload = {
  tournaments: Tournament[];
  pagination: { total: number; limit: number; skip: number };
};

// Premium Glass Card Component
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all hover:bg-white/[0.05] group ${className}`}
  >
    {children}
  </motion.div>
);

export default function DashboardTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (status) params.set("status", status);

      const { data, error: err } = await dashboardFetch<Payload>(`/api/tournaments?${params}`);
      if (isCancelled) return;

      setLoading(false);
      if (err) {
        setError(err);
        setTournaments([]);
        return;
      }

      setError(null);
      setTournaments(data?.tournaments ?? []);
      if (data?.pagination) setPagination(data.pagination);
    };

    void run();
    return () => {
      isCancelled = true;
    };
  }, [status]);

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8"
        >
          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <Trophy size={32} className="text-[#e8a000]" />
               <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Event <span className="text-[#e8a000]">Registry</span></h1>
             </div>
             <p className="text-[#555] text-sm font-medium tracking-wide max-w-lg">
               System deployment, participant manifest management, and automated workflow tracking for the Botsville ecosystem.
             </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex bg-white/[0.03] backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
               <div className="flex items-center px-4 text-[#444] self-stretch border-r border-white/5 mr-1">
                 <Filter size={14} />
               </div>
               <select
                 value={status}
                 onChange={(e) => setStatus(e.target.value)}
                 className="bg-transparent text-white pl-2 pr-6 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
               >
                 <option value="" className="bg-[#0a0a0f]">All Archive Phases</option>
                 {['UPCOMING','OPEN','CLOSED','ONGOING','COMPLETED','CANCELLED'].map(s => (
                   <option key={s} value={s} className="bg-[#0a0a0f]">{s}</option>
                 ))}
               </select>
             </div>

             <Link
               href="/dashboard/tournaments/new"
               className="flex items-center gap-3 px-8 py-4 bg-[#e8a000] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#ffb800] transition-all shadow-xl shadow-[#e8a000]/10 rounded-2xl active:scale-[0.98]"
             >
               <Plus size={16} /> Deploy New Event
             </Link>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 flex items-center gap-4">
            <Shield className="text-red-400 shrink-0" size={20} />
            <p className="text-sm text-red-300 font-bold uppercase tracking-widest leading-none">Security Alert: {error}</p>
          </div>
        )}

        {/* Tournament Grid */}
        <div className="relative">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center gap-4">
              <Loader2 size={32} className="animate-spin text-[#e8a000]" />
              <p className="text-[#333] font-black uppercase tracking-[0.4em] text-[10px]">Accessing Database Archive...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="py-40 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
              <Clock size={48} className="text-[#222] mx-auto" />
              <p className="text-[#444] font-black uppercase tracking-[0.2em] text-[10px]">No Active Deployments Found</p>
              <Link href="/dashboard/tournaments/new" className="text-[#e8a000] text-xs font-bold uppercase tracking-widest hover:underline">Initiate First Tournament</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {tournaments.map((t, idx) => (
                  <GlassCard key={t.id} delay={idx * 0.05} className="relative overflow-hidden">
                    {/* Background Subtle Logo or Accent */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                       <Trophy size={120} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                       <div className="flex items-start justify-between mb-6">
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            t.status === 'OPEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            t.status === 'ONGOING' ? 'bg-[#e8a000]/10 border-[#e8a000]/20 text-[#e8a000]' :
                            'bg-white/5 border-white/10 text-[#555]'
                          }`}>
                            {t.status}
                          </div>
                          <p className="text-[9px] font-black text-[#333] uppercase tracking-widest font-mono">ID: {t.id.split('-')[0]}</p>
                       </div>

                       <div className="space-y-2 mb-8 flex-1">
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[#e8a000] transition-colors leading-tight">
                            {t.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[#555]">
                            <p className="text-[10px] font-black uppercase tracking-widest">{t.season?.name || "Independent Season"}</p>
                            <span className="h-1 w-1 bg-white/20 rounded-full" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{t.format.replace(/_/g, " ")}</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 mb-8">
                          <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-white/5 text-[#444] transition-colors group-hover:text-[#e8a000]"><Calendar size={14} /></div>
                             <div>
                               <p className="text-[8px] font-black text-[#333] uppercase tracking-wider">Launch Sequence</p>
                               <p className="text-[10px] font-bold text-white uppercase">{new Date(t.date).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="p-2 rounded-lg bg-white/5 text-[#444] transition-colors group-hover:text-[#e8a000]"><Users size={14} /></div>
                             <div>
                               <p className="text-[8px] font-black text-[#333] uppercase tracking-wider">Manifest Load</p>
                               <p className="text-[10px] font-bold text-white uppercase">{t.filled ?? t._count?.registrations ?? 0} / {t.slots} TEAMS</p>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 pt-2">
                          <Link
                            href={`/dashboard/tournaments/${t.id}`}
                            className="flex-1 py-3 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-center flex items-center justify-center gap-2"
                          >
                            <Layout size={12} /> Access Archive
                          </Link>
                          <Link
                            href={`/dashboard/tournaments/${t.id}/edit`}
                            className="p-3 bg-white/5 border border-white/10 text-[#444] hover:text-[#e8a000] hover:border-[#e8a000]/30 rounded-xl transition-all"
                          >
                             <Edit size={16} />
                          </Link>
                          <Link
                            href={`/dashboard/matches?tournamentId=${t.id}`}
                            className="p-3 bg-white/5 border border-white/10 text-[#444] hover:text-emerald-400 hover:border-emerald-400/30 rounded-xl transition-all"
                          >
                             <Swords size={16} />
                          </Link>
                       </div>
                    </div>
                  </GlassCard>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination/Summary Footer */}
        {!loading && pagination.total > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between pt-12 border-t border-white/5">
            <div className="flex items-center gap-4">
               <div className="px-4 py-2 bg-white/5 rounded-full">
                 <p className="text-[9px] font-black text-[#444] uppercase tracking-widest">Global Instance Count: <span className="text-white">{pagination.total}</span></p>
               </div>
            </div>
            {/* Pagination Controls could go here if limit is smaller than total */}
          </motion.div>
        )}
      </div>
    </div>
  );
}
