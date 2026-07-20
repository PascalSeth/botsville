'use client';

import React, { useState } from 'react';
import { Camera, Shield, Save, Loader2, Globe, MapPin, Tag } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptain) return;
    setSaving(true);
    try {
      await onUpdateTeamSettings({ name, tag, region });
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
            <Shield className="text-amber-400" size={20} /> Squad Identity & Settings
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            Update your squad name, clan tag, region, and visual identity.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          {isCaptain && (
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={saving}
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
