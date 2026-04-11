"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "../../lib/api";
import { Loader2, UploadCloud, CheckCircle, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Season = { id: string; name: string; status: string };

const FORMATS = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS_PLAYOFFS"];

export default function NewTournamentPage() {
  const router = useRouter();
  
  // Steps
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [seasons, setSeasons] = useState<Season[]>([]);
  
  // Form State
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [date, setDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [pointsWin, setPointsWin] = useState<number | "">(3);
  const [pointsDraw, setPointsDraw] = useState<number | "">(1);
  const [pointsLoss, setPointsLoss] = useState<number | "">(0);
  const [slots, setSlots] = useState<number | "">(16);
  const [matchDays, setMatchDays] = useState<string[]>([]);
  
  // Image Upload State
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await dashboardFetch<Season[]>("/api/seasons");
      setLoadingSeasons(false);
      if (!err && Array.isArray(data)) {
        setSeasons(data);
        if (data.length) setSeasonId(data[0].id);
      }
    })();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setBannerFile(file);
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
    }
  };

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

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!seasonId || !name || !bannerFile) {
        setError("Please complete all required fields and upload an image.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const parsedSlots = Number(slots);
      if (!format || !parsedSlots || parsedSlots < 2) {
        setError("Format and valid slots (min 2) are required.");
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3);
  };

  const toggleMatchDay = (day: string) => {
    setMatchDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    
    if ((!isOnline && !location.trim()) || !date || !registrationDeadline) {
      setError("Fill all required logistics fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let uploadedBannerUrl: string | null = null;
    try {
      const imageDataUrl = await fileToDataUrl(bannerFile!);
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
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || "Failed to upload tournament image");
      }
      uploadedBannerUrl = uploadData.url;
    } catch (uploadError) {
      setSubmitting(false);
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload tournament image");
      return;
    }

    const rulesArray = rulesText
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean);
      
    // Inject Custom System Rules derived from UI
    if (pointsWin !== 3 || pointsDraw !== 1 || pointsLoss !== 0) {
      rulesArray.unshift(`[SYSTEM] Points: Win=${pointsWin}, Draw=${pointsDraw}, Loss=${pointsLoss}`);
    }
    if (matchDays.length > 0) {
      rulesArray.unshift(`[SYSTEM] Match Days: ${matchDays.join(", ")}`);
    }

    const { data, error: err } = await dashboardFetch<{ tournament?: { id: string } }>("/api/tournaments", {
      method: "POST",
      body: JSON.stringify({
        seasonId,
        name,
        subtitle: subtitle || undefined,
        format,
        location: location.trim() || null,
        isOnline,
        date: new Date(date).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        slots: Number(slots) || 16,
        prizePool: prizePool.trim() ? prizePool.trim() : null,
        rules: rulesArray,
        banner: uploadedBannerUrl,
      }),
    });
    
    setSubmitting(false);
    
    if (err) {
      setError(err);
      return;
    }
    
    const id = (data as { tournament?: { id: string } })?.tournament?.id;
    if (id) {
      // Redirect seamlessly to the Setup engine
      router.push(`/dashboard/tournaments/setup?selectedId=${id}&step=configure`);
    } else {
      router.push("/dashboard/tournaments");
    }
  };

  const stepsHtml = [
    { num: 1, title: "Core Details" },
    { num: 2, title: "Format & Rules" },
    { num: 3, title: "Logistics" }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tournaments" className="text-[#e8a000] hover:underline text-sm font-bold uppercase tracking-wider">
          ← Tournaments
        </Link>
        <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
          Tournament Creation Wizard
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between relative bg-white/5 rounded-lg p-6 border border-white/10">
        {stepsHtml.map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1 relative z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 flex-shrink-0 ${
                step === s.num
                  ? "bg-[#e8a000] text-black shadow-[0_0_15px_rgba(232,160,0,0.5)] scale-110"
                  : s.num < step
                  ? "bg-emerald-500/30 text-emerald-400"
                  : "bg-black/50 border border-white/20 text-[#666]"
              }`}
            >
              {s.num < step ? <CheckCircle size={16} /> : s.num}
            </div>
            <p
              className={`ml-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 ${
                step === s.num
                  ? "text-[#e8a000]"
                  : s.num < step
                  ? "text-emerald-400"
                  : "text-[#666]"
              }`}
            >
              {s.title}
            </p>
            {idx < 2 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors duration-500 rounded-full ${
                  step > s.num ? "bg-emerald-500/50" : "bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </motion.div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e8a000] to-transparent opacity-30" />
        
        {/* STEP 1 */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Basic Information</h2>
              <p className="text-[#888] text-sm mt-1">Set the core identity for the event.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {loadingSeasons ? (
                  <p className="text-[#666] text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading seasons...</p>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Season <span className="text-[#e8a000]">*</span></label>
                    <select
                      value={seasonId}
                      onChange={(e) => setSeasonId(e.target.value)}
                      className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors appearance-none"
                      required
                    >
                      <option value="">Select a designated season</option>
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Tournament Name <span className="text-[#e8a000]">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nations Cup Qualifier"
                    className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5">Subtitle <span className="text-[#666] lowercase text-[9px]">(Optional)</span></label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Road to the Finals"
                    className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Drag and Drop Banner */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Cover Artwork <span className="text-[#e8a000]">*</span></label>
                <div 
                  className={`relative w-full aspect-video rounded border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer overflow-hidden ${
                    isDragging ? 'border-[#e8a000] bg-[#e8a000]/5 shadow-[0_0_20px_rgba(232,160,0,0.2)]' : 'border-white/15 bg-[#111116] hover:border-white/30 hover:bg-[#15151a]'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                  />
                  
                  {bannerPreview ? (
                    <>
                      <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2">
                          <UploadCloud size={14} /> Change Image
                        </span>
                      </div>
                      <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                    </>
                  ) : (
                    <div className="space-y-3 relative z-10">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#888]">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Drag & drop an image here</p>
                        <p className="text-xs text-[#666] mt-1">or click to browse from your device</p>
                      </div>
                      <p className="text-[9px] text-[#444] uppercase tracking-wider">1920x1080 recommended</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Format & Rules</h2>
              <p className="text-[#888] text-sm mt-1">Define how the tournament structures matches and points.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Primary Format <span className="text-[#e8a000]">*</span></label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
                  ))}
                </select>
                {format === "ROUND_ROBIN" && (
                  <p className="text-[#e8a000] text-xs mt-2 bg-[#e8a000]/10 p-2 rounded flex items-start gap-2">
                    <span className="font-bold text-base leading-none">ℹ</span>
                    You can configure knockout progression on the Setup Dashboard immediately after wizard completion.
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Maximum Team Slots <span className="text-[#e8a000]">*</span></label>
                <input
                  type="number"
                  min={2}
                  max={128}
                  value={slots}
                  onChange={(e) => setSlots(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                />
              </div>
            </div>

            <div className="border border-white/10 bg-[#111116] rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle size={14} className="text-[#e8a000]" /> Point System Defaults
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-[#888] block mb-1 uppercase tracking-wider">Win</label>
                  <input type="number" min="0" value={pointsWin} onChange={e=>setPointsWin(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-black/50 border border-white/10 text-emerald-400 font-black px-3 py-2 rounded text-sm outline-none focus:border-[#e8a000]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#888] block mb-1 uppercase tracking-wider">Draw</label>
                  <input type="number" min="0" value={pointsDraw} onChange={e=>setPointsDraw(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-black/50 border border-white/10 text-yellow-400 font-black px-3 py-2 rounded text-sm outline-none focus:border-[#e8a000]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#888] block mb-1 uppercase tracking-wider">Loss</label>
                  <input type="number" min="0" value={pointsLoss} onChange={e=>setPointsLoss(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-black/50 border border-white/10 text-red-500 font-black px-3 py-2 rounded text-sm outline-none focus:border-[#e8a000]/50" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Prize Pool <span className="text-[#666] font-normal lowercase text-[9px]">(Optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#666] text-sm">GHS</span>
                  <input
                    type="text"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="e.g. 5,000"
                    className="w-full bg-[#111116] border border-white/10 text-white pl-10 pr-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 block mb-1">Custom Rules (one per line)</label>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={4}
                  placeholder={`No emulator usage allowed\nCheck-in required 30 minutes prior\nDisputes handled via Disc...`}
                  className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors resize-y min-h-24"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">Logistics & Scheduling</h2>
              <p className="text-[#888] text-sm mt-1">Set the timeline and location environment.</p>
            </div>
            
            <div className="flex gap-4 mb-2">
              <button 
                type="button"
                onClick={() => setIsOnline(true)}
                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-bold text-sm transition-all ${isOnline ? 'bg-[#e8a000]/10 border-[#e8a000] text-[#e8a000]' : 'bg-[#111116] border-white/10 text-[#888] hover:text-white'}`}
              >
                🌐 Online Server Area
              </button>
              <button 
                type="button"
                onClick={() => setIsOnline(false)}
                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-bold text-sm transition-all ${!isOnline ? 'bg-[#e8a000]/10 border-[#e8a000] text-[#e8a000]' : 'bg-[#111116] border-white/10 text-[#888] hover:text-white'}`}
              >
                📍 Offline / LAN
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!isOnline && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Venue Location <span className="text-[#e8a000]">*</span></label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Accra Esports Hub, East Legon"
                    className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors"
                  />
                </motion.div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Registration Closes <span className="text-[#e8a000]">*</span></label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-1.5 flex items-center gap-1">Tournament Kicks Off <span className="text-[#e8a000]">*</span></label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#111116] border border-white/10 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-[#e8a000]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111116] border border-white/10 p-5 rounded-lg">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa] block mb-3">Target Match Days <span className="font-normal text-[9px] lowercase ml-1">(Optional helper for schedulers)</span></label>
              <div className="flex flex-wrap gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isSelected = matchDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleMatchDay(day)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors border ${
                        isSelected ? 'bg-[#e8a000]/20 border-[#e8a000]/50 text-[#e8a000]' : 'bg-transparent border-white/10 text-[#666] hover:text-white hover:border-white/30'
                      }`}
                    >
                      {day} {isSelected && <CheckCircle size={10} className="inline ml-1 mb-0.5" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex items-start gap-3 mt-4">
              <span className="text-xl">🚀</span>
              <div>
                <h4 className="font-bold text-blue-400 text-sm">Unified Setup Ready</h4>
                <p className="text-xs text-[#888] mt-1">
                  Upon creation, you will immediately unlock the Phase 2 Setup Dashboard to finalize Group Stages, configure Knockout formatting, and map out your brackets.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Form Controls */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 font-bold text-sm text-[#888] hover:text-white transition-colors border border-white/10 rounded hover:bg-white/5"
            >
              Back
            </button>
          ) : (
            <Link
              href="/dashboard/tournaments"
              className="px-6 py-2.5 font-bold text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel
            </Link>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-white text-black font-black uppercase text-sm tracking-wider rounded hover:bg-gray-200 transition-colors flex items-center gap-1 shadow-lg"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingSeasons}
              className="px-6 py-2.5 bg-gradient-to-r from-[#e8a000] to-[#ffb800] text-black font-black uppercase text-sm tracking-[0.1em] rounded transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2 shadow-[0_0_20px_rgba(232,160,0,0.3)] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]" />
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Committing...
                </>
              ) : (
                <>
                  Create & Setup Next <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
