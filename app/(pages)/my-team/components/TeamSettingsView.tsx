import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Camera, Shield, Save, Loader2, MapPin, Tag, UploadCloud, Image as ImageIcon, Trash2, Copy, Check, Key } from 'lucide-react';
import { toast } from 'sonner';
import { fileToCompressedDataUrl } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
  tag: string;
  teamCode?: string | null;
  region: string;
  logo: string | null;
  banner: string | null;
  status: string;
  isRecruiting?: boolean;
  captainId: string;
  isCaptain?: boolean;
}

interface TeamSettingsViewProps {
  team: Team;
  isCaptain: boolean;
  onUpdateTeamSettings: (updates: Partial<Team>) => Promise<void>;
}

const REGIONS = ['Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale', 'Sunyani', 'Ho'];

export default function TeamSettingsView({
  team,
  isCaptain,
  onUpdateTeamSettings,
}: TeamSettingsViewProps) {
  const [name, setName] = useState(team.name);
  const [tag, setTag] = useState(team.tag);
  const [region, setRegion] = useState(team.region || 'Accra');
  const [logoUrl, setLogoUrl] = useState(team.logo || '');
  const [bannerUrl, setBannerUrl] = useState(team.banner || '');
  const [copiedCode, setCopiedCode] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    setName(team.name);
    setTag(team.tag);
    setRegion(team.region || 'Accra');
    setLogoUrl(team.logo || '');
    setBannerUrl(team.banner || '');
  }, [team.name, team.tag, team.region, team.logo, team.banner]);

  const fileToDataUrl = (file: File) => fileToCompressedDataUrl(file);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "teams",
          bucket: "images",
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setLogoUrl(data.url);
        await onUpdateTeamSettings({ logo: data.url });
        toast.success("Squad logo updated successfully!");
      } else {
        toast.error(data.error || "Logo upload failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      setLogoUrl('');
      await onUpdateTeamSettings({ logo: null });
      toast.success("Squad logo removed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove squad logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageDataUrl,
          type: "teams",
          bucket: "images",
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setBannerUrl(data.url);
        await onUpdateTeamSettings({ banner: data.url });
        toast.success("Squad banner updated successfully!");
      } else {
        toast.error(data.error || "Banner upload failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Banner upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    setUploadingBanner(true);
    try {
      setBannerUrl('');
      await onUpdateTeamSettings({ banner: null });
      toast.success("Squad banner removed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove squad banner");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptain) return;
    setSaving(true);
    try {
      await onUpdateTeamSettings({
        name,
        tag,
        region,
        logo: logoUrl || null,
        banner: bannerUrl || null,
      });
      toast.success('Squad profile updated successfully!');
    } catch {
      toast.error('Failed to update squad profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="p-4 sm:p-6 rounded-2xl bg-[#101a28] border border-white/10 shadow-2xl space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="text-amber-400" size={20} /> Team identity
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            Update your squad name, clan tag, region, logo, and banner image.
          </p>
        </div>

        {/* ── Permanent Team Code Display ── */}
        <div className="p-4 rounded-lg bg-black/40 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
              <Key size={14} className="text-amber-400" /> Permanent Team Code
            </p>
            <p className="text-zinc-400 text-[11px] mt-0.5">
              Share this 6-character code with new recruits so they can enter it when signing up to automatically join your squad.
            </p>
          </div>
          {team.teamCode ? (
            <div className="flex items-center gap-2 bg-black/60 border border-amber-500/40 px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-auto">
              <span className="text-amber-400 font-mono font-black text-sm tracking-widest">{team.teamCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(team.teamCode || '');
                  setCopiedCode(true);
                  toast.success('Team Code copied to clipboard!');
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 transition-colors"
                title="Copy Team Code"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          ) : (
            <span className="text-zinc-500 text-xs font-mono">Not Assigned</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Shield size={14} /> Team Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isCaptain}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Tag size={14} /> Clan Tag (3–5 characters)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                disabled={!isCaptain}
                minLength={3}
                maxLength={5}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 uppercase font-mono disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} /> Region/City
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={!isCaptain}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Camera size={14} /> Squad Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Squad Logo" fill className="object-cover" unoptimized />
                  ) : (
                    <Shield size={24} className="text-white/20" />
                  )}
                </div>
                {isCaptain && (
                  <div className="flex-1 flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 h-16 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs text-zinc-300 rounded-xl cursor-pointer transition-colors px-4">
                      {uploadingLogo ? (
                        <><Loader2 size={14} className="animate-spin text-amber-400" /> Saving...</>
                      ) : (
                        <><UploadCloud size={14} className="text-amber-400" /> {logoUrl ? "Change Logo" : "Upload Logo File"}</>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                        className="h-16 px-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors flex items-center justify-center shrink-0"
                        title="Remove Logo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Squad Banner Image Upload ───────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-amber-400" /> Squad Hero Banner Image
            </label>
            <p className="text-[11px] text-zinc-500">
              Upload a wide backdrop banner for your team profile header (PNG, JPG, WEBP).
            </p>

            {bannerUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-white/10 aspect-21/9 sm:aspect-21/7 bg-black group">
                <Image src={bannerUrl} alt="Squad Banner Preview" fill className="object-cover" unoptimized />
                {isCaptain && (
                  <div className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase rounded-xl cursor-pointer transition-colors flex items-center gap-2">
                      {uploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                      <span>Change File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerUpload}
                        disabled={uploadingBanner}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      disabled={uploadingBanner}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold uppercase rounded-xl border border-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              isCaptain && (
                <label className="w-full h-32 bg-white/2 hover:bg-white/5 border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                  {uploadingBanner ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Loader2 size={18} className="animate-spin" /> Uploading Banner File...
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                        <UploadCloud size={22} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-wider text-white">Upload Banner Image File</p>
                      <p className="text-[10px] text-zinc-500">Recommended aspect ratio 21:9 (MAX 5MB)</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                  />
                </label>
              )
            )}
          </div>

          {isCaptain && (
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingLogo || uploadingBanner}
                className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Squad Settings</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
