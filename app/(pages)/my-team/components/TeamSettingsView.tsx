import React, { useState } from 'react';
import { Camera, Shield, Save, Loader2, MapPin, Tag, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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
        toast.success("Squad logo uploaded!");
      } else {
        toast.error(data.error || "Logo upload failed");
      }
    } catch {
      toast.error("Logo upload failed");
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
        toast.success("Squad banner uploaded!");
      } else {
        toast.error(data.error || "Banner upload failed");
      }
    } catch {
      toast.error("Banner upload failed");
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="p-6 rounded-3xl bg-[#0f0f17] border border-white/10 shadow-2xl space-y-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-wide text-white flex items-center gap-2">
            <Shield className="text-amber-400" size={20} /> Squad Identity &amp; Customization
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            Update your squad name, clan tag, region, logo, and banner image.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Shield size={14} /> Team Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isCaptain}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Tag size={14} /> Clan Tag (2-5 Chars)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                disabled={!isCaptain}
                maxLength={5}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 uppercase font-mono disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} /> Regional Base / City
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={!isCaptain}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Camera size={14} /> Squad Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Squad Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Shield size={24} className="text-white/20" />
                  )}
                </div>
                {isCaptain && (
                  <label className="flex-1 flex items-center justify-center gap-2 h-16 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs text-zinc-400 rounded-xl cursor-pointer transition-colors px-4">
                    {uploadingLogo ? (
                      <><Loader2 size={14} className="animate-spin text-amber-400" /> Uploading...</>
                    ) : (
                      <><UploadCloud size={14} className="text-amber-400" /> Upload Logo File</>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoUpload} 
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* ── Squad Banner Image Upload ───────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="block text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-amber-400" /> Squad Hero Banner Image
            </label>
            <p className="text-[11px] text-zinc-500">
              Upload a wide backdrop banner for your team profile header (PNG, JPG, WEBP).
            </p>

            {bannerUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-[21/9] sm:aspect-[21/7] bg-black group">
                <img src={bannerUrl} alt="Squad Banner Preview" className="w-full h-full object-cover" />
                {isCaptain && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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
                      onClick={() => setBannerUrl('')}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold uppercase rounded-xl border border-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              isCaptain && (
                <label className="w-full h-32 bg-white/[0.02] hover:bg-white/[0.05] border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
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
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
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
