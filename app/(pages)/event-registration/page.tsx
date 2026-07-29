"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, UploadCloud, Users, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

type EventTeam = {
  id: string;
  name: string;
  playerCount: number;
};

type EventConfig = {
  id: string;
  title: string;
  isActive: boolean;
  maxTeams: number;
  playersPerTeam: number;
};

export default function EventRegistrationPage() {
  const router = useRouter();
  
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/event-registration");
      const json = await res.json();
      
      const eventData = json.event || json.data?.event;
      const teamsData = json.teams || json.data?.teams || [];
      if (eventData) {
        setEvent(eventData);
        setTeams(teamsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "profiles",
          bucket: "images",
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPhotoUrl(data.url);
        toast.success("Player portrait photo uploaded!");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleJoin = async () => {
    if (!photoUrl) {
      toast.error("Please upload your player portrait photo first!");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/event-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to join event");
      } else {
        toast.success(data.message || data.data?.message || "Successfully joined!");
        router.push("/my-team"); // Redirect to their new team page
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setJoining(false);
      loadData();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08080d] text-white pt-24 lg:pt-28 p-4 sm:p-8 flex justify-center">
        <Loader2 className="animate-spin text-[#e8a000]" size={32} />
      </main>
    );
  }

  if (!event || !event.isActive) {
    return (
      <main className="min-h-screen bg-[#08080d] text-white pt-24 lg:pt-28 p-4 sm:p-8 text-center space-y-4">
        <Trophy size={48} className="mx-auto text-zinc-600 mb-6" />
        <h1 className="text-3xl font-black tracking-widest uppercase">Registration Closed</h1>
        <p className="text-[#777] max-w-md mx-auto">
          There are currently no active Solo Draft Events. Stay tuned for the next announcement!
        </p>
      </main>
    );
  }

  // Calculate current capacity
  let totalPlayers = 0;
  teams.forEach(t => totalPlayers += t.playerCount);
  const maxPlayers = event.maxTeams * event.playersPerTeam;
  const isFull = totalPlayers >= maxPlayers;

  return (
    <main className="min-h-screen bg-[#08080d] text-white pt-24 lg:pt-28 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest uppercase text-[#e8a000] drop-shadow-[0_0_15px_rgba(232,160,0,0.3)]">
            {event.title}
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Join the solo queue draft! The first player to join a new team becomes the Captain and can set the team name and logo.
          </p>
          
          <div className="inline-flex items-center gap-4 bg-[#0d0d14] border border-white/10 rounded-xl px-6 py-3">
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-zinc-500">Slots Filled</span>
              <span className="text-xl font-bold font-mono text-white">
                {totalPlayers} <span className="text-zinc-600">/</span> {maxPlayers}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-zinc-500">Teams Formed</span>
              <span className="text-xl font-bold font-mono text-white">
                {teams.length} <span className="text-zinc-600">/</span> {event.maxTeams}
              </span>
            </div>
          </div>
        </div>

        {/* Join Form */}
        {!isFull ? (
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase">Step 1: Upload Player Portrait</h3>
              <p className="text-xs text-zinc-400">
                All registered players must upload a portrait photo of themselves for the official tournament introduction video and player profile.
              </p>
            </div>

            <div className="flex flex-col items-center">
              {photoUrl ? (
                <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-black/60 border border-white/10 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="Player Portrait" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button 
                      onClick={() => setPhotoUrl("")}
                      className="px-4 py-2 bg-red-500/80 text-white text-xs font-bold uppercase rounded-lg backdrop-blur-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-sm h-48 border-2 border-dashed border-white/20 hover:border-[#e8a000]/50 rounded-xl bg-white/5 cursor-pointer transition-colors group">
                  {uploadingImage ? (
                    <Loader2 size={32} className="animate-spin text-[#e8a000]" />
                  ) : (
                    <>
                      <UploadCloud size={32} className="text-zinc-500 group-hover:text-[#e8a000] mb-3 transition-colors" />
                      <span className="text-sm font-bold text-zinc-300">Click to upload photo</span>
                      <span className="text-xs text-zinc-500 mt-1">JPG, PNG or WEBP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleJoin}
                disabled={joining || !photoUrl}
                className="w-full py-4 rounded-xl bg-[#e8a000] hover:bg-[#ffb800] text-black font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:hover:bg-[#e8a000] flex items-center justify-center gap-2"
              >
                {joining ? <Loader2 size={18} className="animate-spin" /> : null}
                {joining ? "Joining..." : "Join Event"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0f] border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl max-w-xl mx-auto">
            <h3 className="text-xl font-black uppercase text-red-400 mb-2">Registration Full</h3>
            <p className="text-zinc-400 text-sm">
              All 8 team slots have been completely filled for this event.
            </p>
          </div>
        )}

        {/* Current Teams Display */}
        <div className="space-y-4 pt-8">
          <h3 className="text-lg font-black uppercase text-zinc-300 flex items-center gap-2 justify-center">
            <Users size={20} className="text-[#e8a000]" /> Current Rosters
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {teams.map((team, idx) => (
              <div key={team.id} className="bg-[#0a0a0f] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-zinc-500">Slot {idx + 1}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${team.playerCount >= event.playersPerTeam ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {team.playerCount} / {event.playersPerTeam}
                  </span>
                </div>
                <h4 className="font-bold text-white truncate" title={team.name}>{team.name}</h4>
                
                {/* Visual slot indicators */}
                <div className="flex gap-1">
                  {Array.from({ length: event.playersPerTeam }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 flex-1 rounded-full ${i < team.playerCount ? 'bg-[#e8a000]' : 'bg-white/10'}`} 
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {/* Empty placeholders up to maxTeams */}
            {Array.from({ length: Math.max(0, event.maxTeams - teams.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center min-h-[100px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Available Slot</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
