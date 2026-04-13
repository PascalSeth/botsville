"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, X, Plus, Trophy, Settings, 
  Users, Play, Shield, Gauge, Layout, 
  MapPin, Globe, Calendar, Clock, ChevronLeft,
  AlertCircle, CheckCircle, ListChecks, Edit, Sparkles,
  ExternalLink, Layers, Swords
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardFetch } from "../../lib/api";

type Tournament = {
  id: string;
  name: string;
  subtitle: string | null;
  prizePool: string | null;
  status: string;
  format: string;
  date: string;
  location: string;
  isOnline: boolean;
  slots: number;
  season?: { id: string; name: string } | null;
  _count?: { registrations: number; matches: number };
  banner?: string | null;
  rules?: string[];
};

type TournamentRegistration = {
  id: string;
  status: string;
  seed: number | null;
  registeredAt: string;
  team: {
    id: string;
    name: string;
    tag: string;
    captain?: { ign: string | null } | null;
    _count?: { players: number };
  };
};

type TeamShort = {
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
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [actingRegistrationId, setActingRegistrationId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [showBulkRegisterModal, setShowBulkRegisterModal] = useState(false);
  const [bulkAutoApprove, setBulkAutoApprove] = useState(true);
  const [bulkSeed, setBulkSeed] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [availableTeams, setAvailableTeams] = useState<TeamShort[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [loadingAvailableTeams, setLoadingAvailableTeams] = useState(false);
  const [recalculatingPoints, setRecalculatingPoints] = useState(false);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Failed to read image file"));
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setLoadingRegistrations(true);

      const [{ data, error: err }, { data: registrationsData, error: registrationsError }] = await Promise.all([
        dashboardFetch<Tournament>(`/api/tournaments/${id}`),
        dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`),
      ]);

      setLoading(false);
      setLoadingRegistrations(false);

      if (err) {
        setError(err);
        setTournament(null);
        return;
      }

      if (!registrationsError && Array.isArray(registrationsData)) {
        setRegistrations(registrationsData);
      } else {
        setRegistrations([]);
      }

      setTournament(data ?? null);
    })();
  }, [id]);

  const refreshRegistrations = async () => {
    if (!id) return;
    const { data: registrationsData, error: registrationsError } = await dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`);
    if (!registrationsError && Array.isArray(registrationsData)) {
      setRegistrations(registrationsData);
    }
  };

  const fetchAvailableTeams = async () => {
    setLoadingAvailableTeams(true);
    setAvailableTeams([]);

    try {
      const { data: registrationsData, error: registrationsError } = await dashboardFetch<TournamentRegistration[]>(`/api/tournaments/${id}/registrations`);
      
      let currentRegistrations = registrations;
      if (!registrationsError && Array.isArray(registrationsData)) {
        currentRegistrations = registrationsData;
        setRegistrations(registrationsData);
      }

      const registeredTeamIds = new Set(
        currentRegistrations
          .filter((r) => r.status !== "REJECTED")
          .map((r) => r.team.id)
      );

      const response = await fetch("/api/teams?limit=1000&status=ACTIVE");
      const result = await response.json();

      if (Array.isArray(result.teams)) {
        const unregisteredTeams = result.teams.filter((team: TeamShort) => !registeredTeamIds.has(team.id));
        setAvailableTeams(unregisteredTeams);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoadingAvailableTeams(false);
    }
  };

  const handleOpenBulkRegisterModal = async () => {
    setShowBulkRegisterModal(true);
    setSelectedTeamIds(new Set());
    await fetchAvailableTeams();
  };

  const handleBulkRegisterTeams = async () => {
    if (selectedTeamIds.size === 0) {
      setBulkMessage("Please select at least one team");
      return;
    }

    setBulkLoading(true);
    setBulkMessage(null);

    const teamIds = Array.from(selectedTeamIds);

    const { data, error: bulkError } = await dashboardFetch<{ message?: string; results?: any[] }>(`/api/tournaments/${id}/registrations`, {
      method: "POST",
      body: JSON.stringify({
        teamIds,
        autoApprove: bulkAutoApprove,
        seed: bulkSeed ? parseInt(bulkSeed) : undefined,
      }),
    });

    setBulkLoading(false);

    if (bulkError) {
      setBulkMessage(`Error: ${bulkError}`);
      return;
    }

    setBulkMessage("Teams registered successfully!");
    setSelectedTeamIds(new Set());
    await refreshRegistrations();

    setTimeout(() => {
      setShowBulkRegisterModal(false);
      setBulkMessage(null);
    }, 2000);
  };

  const handleRegistrationAction = async (registrationId: string, action: "approve" | "reject") => {
    if (!id) return;

    setActionError(null);
    setActionMessage(null);
    setActingRegistrationId(registrationId);

    const { data, error: updateError } = await dashboardFetch<{ message?: string }>(`/api/tournaments/${id}/registrations`, {
      method: "PUT",
      body: JSON.stringify({ registrationId, action }),
    });

    setActingRegistrationId(null);

    if (updateError) {
      setActionError(updateError);
      return;
    }

    setActionMessage(data?.message || (action === "approve" ? "Registration approved" : "Registration rejected"));
    await refreshRegistrations();
  };

  const updateTournamentImage = async () => {
    if (!id || !imageFile) {
      setImageMessage("Select an image file first.");
      return;
    }

    setImageMessage(null);
    setSavingImage(true);

    try {
      setUploadingImage(true);
      const imageDataUrl = await fileToDataUrl(imageFile);
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "tournaments",
          bucket: "images",
        }),
      });
      const uploadData = await uploadResponse.json();
      setUploadingImage(false);

      if (!uploadResponse.ok || !uploadData?.url) {
        setImageMessage(uploadData?.error || "Failed to upload image");
        setSavingImage(false);
        return;
      }

      const { data, error: updateError } = await dashboardFetch<{ tournament?: Tournament }>(`/api/tournaments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ banner: uploadData.url }),
      });

      if (updateError) {
        setImageMessage(updateError);
        setSavingImage(false);
        return;
      }

      setTournament((prev) => (prev ? { ...prev, banner: uploadData.url } : prev));
      setImageFile(null);
      setImageMessage("Tournament banner updated.");
    } catch (uploadError) {
      setImageMessage(uploadError instanceof Error ? uploadError.message : "Failed to update image");
    } finally {
      setUploadingImage(false);
      setSavingImage(false);
    }
  };

  const handleRecalculatePoints = async () => {
    if (!id || !tournament) return;

    setPointsMessage(null);
    setRecalculatingPoints(true);

    try {
      const res = await fetch(`/api/tournaments/${id}/migrate-to-mlbb-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to recalculate points");
      }

      const result = await res.json();
      setPointsMessage(`✓ Recalculated ${result.teamsAffected} teams based on ${result.matchesProcessed} matches.`);
      
      const tournamentRes = await fetch(`/api/tournaments/${id}`);
      if (tournamentRes.ok) {
        const updatedTournament = await tournamentRes.json();
        setTournament(updatedTournament);
      }

      setTimeout(() => setPointsMessage(null), 5000);
    } catch (err) {
      setPointsMessage(err instanceof Error ? err.message : "Failed to recalculate points");
    } finally {
      setRecalculatingPoints(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a] flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-[#e8a000]" />
        <p className="text-[#666] font-black uppercase tracking-widest text-[10px]">Synchronizing Tournament Data...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#05050a] p-12 flex flex-col items-center justify-center space-y-6">
        <AlertCircle size={48} className="text-red-500/50" />
        <p className="text-red-300 font-bold uppercase tracking-widest">{error || "Tournament Archive Not Found"}</p>
        <Link href="/dashboard/tournaments" className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] selection:bg-[#e8a000]/30 pb-20">
      {/* Hero Header */}
      <div className="relative h-[400px] w-full overflow-hidden">
        {tournament.banner ? (
          <img src={tournament.banner} alt="" className="w-full h-full object-cover opacity-40 blur-[2px] transition-all duration-1000" />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-[#1a1a2e] to-[#05050a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-[#05050a]/80 to-[#05050a]/20" />
        
        <div className="absolute inset-0 max-w-6xl mx-auto px-6 flex flex-col justify-end pb-12">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Link href="/dashboard/tournaments" className="group flex items-center gap-2 text-[#e8a000] text-xs font-black uppercase tracking-[0.2em] transition-all hover:gap-3">
                <ChevronLeft size={16} /> Dashboard
              </Link>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Trophy size={20} className="text-[#e8a000]" />
                  <span className="text-[10px] font-black text-[#e8a000] uppercase tracking-[0.3em]">{tournament.status}</span>
                  <span className="h-1 w-1 bg-white/20 rounded-full" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{tournament.format.replace(/_/g, " ")}</span>
                </div>
                <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-tight">{tournament.name}</h1>
                {tournament.subtitle && <p className="text-white/40 text-lg font-medium tracking-wide">{tournament.subtitle}</p>}
              </div>

              <div className="flex items-center gap-3 pt-4">
                 <Link href={`/dashboard/tournaments/${tournament.id}/edit`} className="px-6 py-3 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all shadow-xl shadow-[#e8a000]/10 flex items-center gap-2">
                   <Edit size={14} /> Edit Tournament
                 </Link>
                 <Link href={`/dashboard/matches?tournamentId=${tournament.id}`} className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
                   <Swords size={14} className="text-[#e8a000]" /> View Match Grid
                 </Link>
              </div>
           </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Stats & Logistics */}
        <div className="lg:col-span-1 space-y-8">
           <GlassCard delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Event Logistics</h2>
              </div>
              <div className="space-y-6">
                 {[
                   { label: 'Commencement', val: new Date(tournament.date).toLocaleString(), icon: Calendar },
                   { label: 'Venue Environment', val: tournament.location + (tournament.isOnline ? " (Online)" : ""), icon: MapPin },
                   { label: 'Max Capacity', val: `${tournament.slots} Teams`, icon: Users },
                   { label: 'Prize Allocation', val: tournament.prizePool || "Not Specified", icon: Trophy }
                 ].map((item, i) => (
                   <div key={i} className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-white/5 text-[#e8a000]"><item.icon size={16} /></div>
                      <div>
                        <p className="text-[9px] font-black text-[#555] uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-white uppercase">{item.val}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </GlassCard>

           <GlassCard delay={0.2} className="border-[#e8a000]/20 bg-[#e8a000]/[0.02]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">Standings Engine</h2>
                </div>
                <button onClick={handleRecalculatePoints} disabled={recalculatingPoints} className="p-2 rounded-lg bg-[#e8a000] text-black hover:bg-[#ffb800] transition-all active:scale-[0.9] disabled:opacity-50">
                  {recalculatingPoints ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-[#e8a000] uppercase tracking-widest opacity-60">MLBB Standard Protocol</p>
                 <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: '2-0 Clean Win', p: '+3 PTS' },
                      { l: '2-1 Tight Win', p: '+2 PTS' },
                      { l: '1-2 Close Loss', p: '+1 PT' },
                      { l: '0-2 Defeat', p: '+0 PTS' }
                    ].map((row, i) => (
                      <div key={i} className="bg-black/40 border border-white/5 p-3 rounded-xl">
                         <p className="text-[8px] font-black text-[#444] uppercase mb-1">{row.l}</p>
                         <p className="text-xs font-bold text-white">{row.p}</p>
                      </div>
                    ))}
                 </div>
                 {pointsMessage && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                     {pointsMessage}
                   </motion.div>
                 )}
              </div>
           </GlassCard>

           <GlassCard delay={0.3}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                <h2 className="text-xs font-black text-white uppercase tracking-widest">Regulatory Assets</h2>
              </div>
              <div className="space-y-4">
                 <label className="text-[9px] font-black uppercase tracking-widest text-[#555] block">Hero Visual Asset</label>
                 <div className="relative group aspect-video rounded-xl overflow-hidden border border-white/10">
                   {tournament.banner ? (
                     <img src={tournament.banner} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                   ) : (
                     <div className="w-full h-full bg-white/[0.02] flex items-center justify-center text-[#222]"><Layout size={32} /></div>
                   )}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Plus size={12} /> Replace Asset</p>
                   </div>
                 </div>
                 {imageFile && (
                   <button onClick={updateTournamentImage} disabled={savingImage} className="w-full py-3 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all flex items-center justify-center gap-2">
                     {savingImage ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Save Hero Asset
                   </button>
                 )}
                 {imageMessage && <p className="text-[9px] text-[#555] font-black uppercase">{imageMessage}</p>}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                 <label className="text-[9px] font-black uppercase tracking-widest text-[#555] block">Tournament Governance</label>
                 {tournament.rules && tournament.rules.length > 0 ? (
                    <div className="space-y-3">
                       {tournament.rules.map((rule, idx) => (
                         <div key={idx} className="flex gap-3 text-xs text-white/60">
                            <span className="text-[#e8a000] font-black h-fit mt-1">•</span>
                            <span className="font-medium leading-relaxed">{rule}</span>
                         </div>
                       ))}
                    </div>
                 ) : (
                   <p className="text-xs text-[#444] italic">No governance rules provided.</p>
                 )}
              </div>
           </GlassCard>
        </div>

        {/* Right Column: Registrations & Management */}
        <div className="lg:col-span-2 space-y-8">
           <GlassCard delay={0.4}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#e8a000] rounded-full" />
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Participant <span className="text-[#e8a000]">Manifesto</span></h2>
                    <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mt-1">{registrations.length} Active Registrations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleOpenBulkRegisterModal} className="px-5 py-3 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ffb800] transition-all flex items-center gap-2">
                    <Plus size={14} /> Add Participants
                  </button>
                  <Link href={`/dashboard/tournaments/setup?selectedId=${tournament.id}&step=configure`} className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2">
                    <Layers size={14} className="text-[#e8a000]" /> Configure Groups
                  </Link>
                </div>
              </div>

              {actionMessage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-xl bg-[#e8a000]/10 border border-[#e8a000]/30 text-[#e8a000] font-black uppercase text-[10px] tracking-widest flex items-center gap-3"><CheckCircle size={16} /> {actionMessage}</motion.div>}
              {actionError && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-3"><AlertCircle size={16} /> {actionError}</motion.div>}

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-[#444] border-b border-white/5">
                      <th className="pb-4 pr-4">Manifest</th>
                      <th className="pb-4 pr-4">Identity</th>
                      <th className="pb-4 pr-4">Status</th>
                      <th className="pb-4 pr-4">Seed</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRegistrations ? (
                      <tr><td colSpan={5} className="py-12 text-center text-[10px] font-black text-[#333] uppercase tracking-[0.3em]">Querying Database...</td></tr>
                    ) : registrations.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-[10px] font-black text-[#333] uppercase tracking-[0.3em]">No Active Participants Found</td></tr>
                    ) : (
                      registrations.map((reg, idx) => (
                        <tr key={reg.id} className="group border-b border-white/[0.03] last:border-0">
                          <td className="py-5 pr-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#e8a000] font-black uppercase tracking-tighter group-hover:border-[#e8a000]/50 transition-colors">
                                  {reg.team.tag.substring(0, 2)}
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-black text-white uppercase group-hover:text-[#e8a000] transition-colors">{reg.team.name}</p>
                                   <p className="text-[10px] font-black text-[#555] uppercase tracking-widest">{reg.team.tag}</p>
                                </div>
                             </div>
                          </td>
                          <td className="py-5 pr-4">
                             <div className="space-y-0.5">
                               <p className="text-xs font-bold text-white/60">IGN: {reg.team.captain?.ign || "Anonymous"}</p>
                               <p className="text-[9px] font-black text-[#444] uppercase tracking-widest">{reg.team._count?.players || 0} Operators</p>
                             </div>
                          </td>
                          <td className="py-5 pr-4">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                               reg.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 
                               reg.status === 'PENDING' ? 'bg-[#e8a000]/10 text-[#e8a000]' : 
                               'bg-white/5 text-[#555]'
                             }`}>{reg.status}</span>
                          </td>
                          <td className="py-5 pr-4 font-mono text-xs font-bold text-white/40">#{reg.seed || "—"}</td>
                          <td className="py-5 text-right">
                             {reg.status === 'PENDING' ? (
                               <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleRegistrationAction(reg.id, "approve")} disabled={actingRegistrationId === reg.id} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all">
                                    <CheckCircle size={14} />
                                  </button>
                                  <button onClick={() => handleRegistrationAction(reg.id, "reject")} disabled={actingRegistrationId === reg.id} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                    <X size={14} />
                                  </button>
                               </div>
                             ) : (
                               <Link href={`/dashboard/teams/${reg.team.id}`} className="text-[#333] hover:text-[#e8a000] transition-colors"><ExternalLink size={16} /></Link>
                             )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </GlassCard>
        </div>
      </div>

      {/* Bulk Register Modal */}
      <AnimatePresence>
        {showBulkRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="p-3 rounded-2xl bg-[#e8a000]/10 text-[#e8a000]"><Users size={24} /></div>
                     <div>
                       <h2 className="text-xl font-black text-white uppercase tracking-tighter">Manifest <span className="text-[#e8a000]">Synchronizer</span></h2>
                       <p className="text-[10px] font-black text-[#555] uppercase tracking-widest mt-1">Multi-Team Registration Interface</p>
                     </div>
                  </div>
                  <button onClick={() => setShowBulkRegisterModal(false)} className="text-[#333] hover:text-white transition-colors"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Available Combatants ({availableTeams.length})</label>
                     {loadingAvailableTeams ? (
                       <div className="py-20 flex flex-col items-center gap-3 text-[#333]">
                         <Loader2 size={32} className="animate-spin" />
                         <p className="text-[10px] font-black uppercase tracking-widest">Compiling Team Archives...</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                         {availableTeams.map(team => (
                           <button 
                             key={team.id}
                             onClick={() => {
                               const next = new Set(selectedTeamIds);
                               if (next.has(team.id)) next.delete(team.id);
                               else next.add(team.id);
                               setSelectedTeamIds(next);
                             }}
                             className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                               selectedTeamIds.has(team.id) 
                                 ? 'bg-[#e8a000]/10 border-[#e8a000] text-white' 
                                 : 'bg-white/[0.02] border-white/5 text-[#555] hover:bg-white/[0.05]'
                             }`}
                           >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTeamIds.has(team.id) ? 'bg-[#e8a000] border-[#e8a000]' : 'border-white/20'}`}>
                                {selectedTeamIds.has(team.id) && <CheckCircle size={10} className="text-black" />}
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-black uppercase transform tracking-tight">{team.name}</p>
                                <p className="text-[9px] font-black opacity-60 uppercase">{team.tag}</p>
                              </div>
                           </button>
                         ))}
                       </div>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-end">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Auto-Permit Entry</label>
                       <button onClick={() => setBulkAutoApprove(!bulkAutoApprove)} className={`w-full py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${bulkAutoApprove ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-[#444]'}`}>
                         {bulkAutoApprove ? "ENABLED" : "DISABLED"}
                       </button>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#555] block">Seed Signature (Optional)</label>
                       <input type="number" value={bulkSeed} onChange={(e) => setBulkSeed(e.target.value)} placeholder="01" className="w-full bg-white/[0.03] border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-[#e8a000]/50 font-mono text-center" />
                    </div>
                  </div>

                  {bulkMessage && <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black uppercase text-[10px] tracking-widest text-center">{bulkMessage}</div>}
               </div>

               <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#444]">
                    Payload: <span className="text-white">{selectedTeamIds.size} Participants Selected</span>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setShowBulkRegisterModal(false)} className="px-8 py-4 bg-white/5 text-[#aaa] font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                    <button onClick={handleBulkRegisterTeams} disabled={bulkLoading || selectedTeamIds.size === 0} className="px-8 py-4 bg-[#e8a000] text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#ffb800] transition-all flex items-center gap-3 disabled:opacity-30">
                       {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} Deploy Participants
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
