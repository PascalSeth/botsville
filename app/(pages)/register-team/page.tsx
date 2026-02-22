'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Plus, ChevronDown, Shield, Sword, Zap,
  Crosshair, Anchor, CheckCircle, AlertCircle, User, Image as ImageIcon, Loader2
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type Role = 'exp' | 'jungle' | 'mage' | 'marksman' | 'roam';

interface Player {
  id: string;
  inGameName: string;
  role: Role | '';
  image: string | null;
  imageUrl: string | null; // URL from Supabase storage
}

interface TeamForm {
  teamName: string;
  tag: string;
  region: string;
  logo: string | null;
  logoUrl: string | null; // URL from Supabase storage
  banner: string | null;
  bannerUrl: string | null; // URL from Supabase storage
  players: Player[];
}

// ── Regions ────────────────────────────────────────────────
const REGIONS = [
  'Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast'
] as const;

// ── Upload helper ──────────────────────────────────────────
async function uploadImageToSupabase(image: string, type: string, bucket: string = 'teams'): Promise<string | null> {
  try {
    console.log(`Uploading ${type} to ${bucket}...`);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, type, bucket }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Upload failed:', data.error);
      return null;
    }
    console.log(`Upload successful:`, data.url);
    return data.url;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

// ── Role config ────────────────────────────────────────────
const ROLES: { value: Role; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { value: 'exp',       label: 'EXP Laner',  icon: <Sword size={12} />,      color: '#e8a000', desc: 'Fighter / Assassin' },
  { value: 'jungle',   label: 'Jungler',     icon: <Zap size={12} />,        color: '#22c55e', desc: 'Roam & Secure' },
  { value: 'mage',     label: 'Mage',        icon: <Shield size={12} />,     color: '#a855f7', desc: 'Mid Lane Magic' },
  { value: 'marksman', label: 'Marksman',    icon: <Crosshair size={12} />,  color: '#3b82f6', desc: 'Gold Lane Carry' },
  { value: 'roam',     label: 'Roamer',      icon: <Anchor size={12} />,     color: '#f43f5e', desc: 'Support / Tank' },
];

const getRoleConfig = (role: Role | '') => ROLES.find(r => r.value === role) || null;

const emptyPlayer = (): Player => ({
  id: Math.random().toString(36).slice(2),
  inGameName: '',
  role: '',
  image: null,
  imageUrl: null,
});

// ── File → base64 ──────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ── Image Drop Zone ────────────────────────────────────────
const ImageDropZone = ({
  value, onChange, label, hint, aspect = 'square', icon,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
  hint?: string;
  aspect?: 'square' | 'banner' | 'player';
  icon?: React.ReactNode;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const b64 = await fileToBase64(file);
    onChange(b64);
  }, [onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const aspectClass = aspect === 'banner'
    ? 'aspect-[3/1]'
    : aspect === 'player'
    ? 'aspect-[3/4]'
    : 'aspect-square';

  return (
    <div className="w-full">
      {label && <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase mb-1.5">{label}</p>}
      <motion.div
        whileHover={{ borderColor: 'rgba(232,160,0,0.5)' }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !value && inputRef.current?.click()}
        className={`
          relative overflow-hidden ${aspectClass} border transition-all duration-200 cursor-pointer group
          ${dragging ? 'border-[#e8a000]/60 bg-[#e8a000]/[0.06]' : 'border-white/[0.08] bg-[#0d0d14]'}
          ${value ? 'cursor-default' : 'cursor-pointer'}
        `}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="bg-[#e8a000] text-black text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5"
                >
                  Change
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onChange(null); }}
                  className="bg-white/10 text-white text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5"
                >
                  Remove
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <motion.div
              animate={dragging ? { scale: 1.2, opacity: 1 } : { scale: 1, opacity: 0.3 }}
              className="text-[#e8a000]"
            >
              {icon || <Upload size={20} />}
            </motion.div>
            <p className="text-[#444] text-[9px] tracking-[0.12em] uppercase text-center px-2">
              {hint || 'Drop or click'}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (file) await handleFile(file);
            e.target.value = '';
          }}
        />
      </motion.div>
    </div>
  );
};

// ── Role Selector ──────────────────────────────────────────
const RoleSelector = ({ value, onChange }: { value: Role | ''; onChange: (r: Role) => void }) => {
  const [open, setOpen] = useState(false);
  const selected = getRoleConfig(value);

  return (
    <div className="relative">
      <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase mb-1.5">Role</p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(o => !o)}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 border text-left transition-colors duration-200
          ${open ? 'border-[#e8a000]/50 bg-[#e8a000]/[0.04]' : 'border-white/[0.08] bg-[#0d0d14] hover:border-white/20'}
        `}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span style={{ color: selected.color }}>{selected.icon}</span>
            <span className="text-white font-bold text-xs tracking-wide uppercase">{selected.label}</span>
          </span>
        ) : (
          <span className="text-[#444] text-xs tracking-wide uppercase">Select role…</span>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} className="text-[#444]" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d0d14] border border-white/[0.1] shadow-2xl shadow-black/60"
          >
            {ROLES.map(r => (
              <motion.button
                key={r.value}
                type="button"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                onClick={() => { onChange(r.value); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${value === r.value ? 'bg-white/[0.06]' : ''}`}
              >
                <span style={{ color: r.color }} className="shrink-0">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold tracking-wide uppercase">{r.label}</p>
                  <p className="text-[#444] text-[9px] tracking-wider">{r.desc}</p>
                </div>
                {value === r.value && <CheckCircle size={10} style={{ color: r.color }} />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Text Input ─────────────────────────────────────────────
const FieldInput = ({
  label, value, onChange, placeholder, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number;
}) => (
  <div>
    <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase mb-1.5">{label}</p>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full bg-[#0d0d14] border border-white/[0.08] text-white text-sm font-bold tracking-wide uppercase placeholder-[#333] px-3 py-2.5 outline-none focus:border-[#e8a000]/50 transition-colors duration-200"
    />
  </div>
);

// ── Player Card Editor ─────────────────────────────────────
const PlayerEditor = ({
  player, index, onChange, onRemove, canRemove,
}: {
  player: Player; index: number;
  onChange: (p: Player) => void;
  onRemove: () => void;
  canRemove: boolean;
}) => {
  const role = getRoleConfig(player.role);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="relative border border-white/[0.07] bg-[#0c0c12]"
    >
      {/* Player index bar */}
      <div
        className="absolute top-0 left-0 bottom-0 w-0.5 transition-colors duration-300"
        style={{ background: role ? role.color : '#222' }}
      />

      <div className="pl-4 pr-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#333] font-black text-[9px] tracking-[0.2em] uppercase font-mono">
              Player {String(index + 1).padStart(2, '0')}
            </span>
            {role && (
              <span
                className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 border"
                style={{ color: role.color, borderColor: `${role.color}40`, background: `${role.color}10` }}
              >
                {role.icon}
                {role.label}
              </span>
            )}
          </div>
          {canRemove && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRemove}
              className="text-[#333] hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-3">
          {/* Player image */}
          <ImageDropZone
            value={player.image}
            onChange={v => onChange({ ...player, image: v })}
            label=""
            hint="Photo"
            aspect="player"
            icon={<User size={16} />}
          />

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <FieldInput
              label="In-Game Name"
              value={player.inGameName}
              onChange={v => onChange({ ...player, inGameName: v })}
              placeholder="YourIGN"
              maxLength={20}
            />
            <RoleSelector
              value={player.role}
              onChange={r => onChange({ ...player, role: r })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Live Preview Card ──────────────────────────────────────
const LivePreview = ({ form }: { form: TeamForm }) => {
  const filledPlayers = form.players.filter(p => p.inGameName || p.role || p.image);

  return (
    <div className="sticky top-6">
      <p className="text-[#333] text-[9px] tracking-[0.2em] uppercase mb-3 border-l-2 border-[#e8a000] pl-3">Live Preview</p>

      <div className="border border-white/[0.07] bg-[#0c0c12] overflow-hidden">
        {/* Banner */}
        <div className="relative h-24 sm:h-28 bg-[#080810] overflow-hidden">
          {form.banner ? (
            <img src={form.banner} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={20} className="text-[#1a1a22]" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-transparent to-transparent" />
          {/* Logo overlapping banner */}
          <div className="absolute bottom-0 left-4 translate-y-1/2">
            <div className="w-12 h-12 border-2 border-[#0c0c12] bg-[#0d0d14] overflow-hidden">
              {form.logo ? (
                <img src={form.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Shield size={16} className="text-[#222]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team name */}
        <div className="px-4 pt-8 pb-3 border-b border-white/[0.05]">
          <h3 className="text-white font-black text-base tracking-[0.12em] uppercase leading-tight">
            {form.teamName || <span className="text-[#222]">Team Name</span>}
          </h3>
          <p className="text-[#e8a000]/60 text-[9px] tracking-[0.15em] uppercase mt-0.5">
            {form.tag && <span>[{form.tag}] </span>}
            {form.region && <span>· {form.region}</span>}
            {!form.tag && !form.region && 'Team Tag & Region'}
          </p>
          <p className="text-[#555] text-[9px] tracking-[0.15em] uppercase mt-0.5">
            {filledPlayers.length}/5 Players
          </p>
        </div>

        {/* Players list */}
        <div className="divide-y divide-white/[0.04]">
          {ROLES.map(role => {
            const player = form.players.find(p => p.role === role.value);
            const hasPLayer = player && (player.inGameName || player.image);
            return (
              <div key={role.value} className="flex items-center gap-3 px-4 py-2.5">
                {/* Avatar */}
                <div className="w-7 h-7 shrink-0 border border-white/10 overflow-hidden bg-[#0d0d14]">
                  {hasPLayer && player.image ? (
                    <img src={player.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={10} className="text-[#1e1e28]" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[11px] tracking-wide uppercase truncate">
                    {hasPLayer ? player.inGameName || '—' : <span className="text-[#222]">Empty</span>}
                  </p>
                  <p className="text-[9px] tracking-widest uppercase" style={{ color: role.color }}>
                    {role.label}
                  </p>
                </div>
                {/* Role icon */}
                <span style={{ color: hasPLayer ? role.color : '#1e1e28' }}>{role.icon}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Step indicator ─────────────────────────────────────────
const steps = ['Team Identity', 'Roster', 'Review'];

const StepBar = ({ current }: { current: number }) => (
  <div className="flex items-center gap-0 mb-8">
    {steps.map((s, i) => (
      <React.Fragment key={s}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              background: i <= current ? '#e8a000' : '#1a1a22',
              borderColor: i <= current ? '#e8a000' : '#2a2a32',
            }}
            className="w-5 h-5 border flex items-center justify-center shrink-0"
          >
            {i < current ? (
              <CheckCircle size={10} className="text-black" />
            ) : (
              <span className="text-[9px] font-black" style={{ color: i === current ? '#000' : '#444' }}>
                {i + 1}
              </span>
            )}
          </motion.div>
          <span className={`text-[9px] tracking-[0.15em] uppercase font-bold whitespace-nowrap ${i === current ? 'text-[#e8a000]' : i < current ? 'text-[#555]' : 'text-[#2a2a2a]'}`}>
            {s}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div className="flex-1 mx-3 h-px bg-[#1a1a22] min-w-[20px]">
            <motion.div
              className="h-full bg-[#e8a000]"
              animate={{ width: i < current ? '100%' : '0%' }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Review Screen ──────────────────────────────────────────
const ReviewScreen = ({ 
  form, 
  onSubmit, 
  onBack, 
  isSubmitting, 
  submitError 
}: { 
  form: TeamForm; 
  onSubmit: () => void; 
  onBack: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}) => {
  const issues: string[] = [];
  if (!form.teamName) issues.push('Team name is required');
  if (!form.tag || form.tag.length < 3) issues.push('Team tag is required (3-5 characters)');
  if (!form.region) issues.push('Region is required');
  if (!form.logo) issues.push('Team logo is required');
  const roles = form.players.map(p => p.role).filter(Boolean);
  const uniqueRoles = new Set(roles);
  if (uniqueRoles.size < 5) issues.push('All 5 role slots must be filled');
  if (form.players.some(p => !p.inGameName)) issues.push('All players need an in-game name');
  const valid = issues.length === 0;

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <h3 className="text-white font-black text-sm tracking-[0.2em] uppercase mb-4 border-l-2 border-[#e8a000] pl-3">
        Review & Submit
      </h3>

      {/* API Error */}
      {submitError && (
        <div className="mb-4 border border-red-500/20 bg-red-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={12} className="text-red-400" />
            <p className="text-red-400 text-[9px] tracking-[0.15em] uppercase font-black">Registration Failed</p>
          </div>
          <p className="text-[#666] text-[10px] tracking-wide">{submitError}</p>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mb-4 border border-red-500/20 bg-red-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={12} className="text-red-400" />
            <p className="text-red-400 text-[9px] tracking-[0.15em] uppercase font-black">Fix before submitting</p>
          </div>
          {issues.map(issue => (
            <p key={issue} className="text-[#666] text-[10px] tracking-wide mt-1">· {issue}</p>
          ))}
        </div>
      )}

      {/* Team summary */}
      <div className="border border-white/[0.07] bg-[#0c0c12] mb-4">
        <div className="flex items-center gap-4 p-4 border-b border-white/[0.05]">
          <div className="w-12 h-12 border border-white/10 overflow-hidden bg-[#0d0d14] shrink-0">
            {form.logo && <img src={form.logo} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-white font-black text-base tracking-wide uppercase">{form.teamName}</p>
            <p className="text-[#e8a000]/60 text-[9px] tracking-widest uppercase">[{form.tag}] · {form.region}</p>
            <p className="text-[#555] text-[9px] tracking-widest uppercase mt-0.5">
              {form.players.filter(p => p.inGameName).length} / 5 Players Ready
            </p>
          </div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {form.players.map((p, i) => {
            const role = getRoleConfig(p.role);
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-8 h-8 border border-white/[0.08] overflow-hidden bg-[#0d0d14] shrink-0">
                  {p.image
                    ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-[#222]" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xs tracking-wide uppercase truncate">
                    {p.inGameName || <span className="text-red-400">Missing</span>}
                  </p>
                  {role && (
                    <p className="text-[9px] tracking-widest uppercase" style={{ color: role.color }}>{role.label}</p>
                  )}
                </div>
                {(!p.inGameName || !p.role) && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                {(p.inGameName && p.role) && <CheckCircle size={12} className="text-green-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 border border-white/10 text-[#666] text-[10px] font-black tracking-[0.15em] uppercase py-3 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
        >
          ← Back
        </motion.button>
        <motion.button
          whileHover={valid && !isSubmitting ? { scale: 1.02 } : {}}
          whileTap={valid && !isSubmitting ? { scale: 0.97 } : {}}
          onClick={valid && !isSubmitting ? onSubmit : undefined}
          disabled={isSubmitting}
          className={`flex-[2] text-[10px] font-black tracking-[0.15em] uppercase py-3 transition-all flex items-center justify-center gap-2 ${
            isSubmitting
              ? 'bg-[#e8a000]/50 text-black cursor-wait'
              : valid
              ? 'bg-[#e8a000] hover:bg-[#ffb800] text-black'
              : 'bg-[#1a1a22] text-[#333] cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Registering...
            </>
          ) : (
            'Register Team →'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Success Screen ─────────────────────────────────────────
const SuccessScreen = ({ form, onReset }: { form: TeamForm; onReset: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-8"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      className="w-16 h-16 bg-[#e8a000] flex items-center justify-center mx-auto mb-6"
    >
      <CheckCircle size={32} className="text-black" />
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      {form.logo && (
        <div className="w-16 h-16 border-2 border-[#e8a000]/30 overflow-hidden mx-auto mb-4">
          <img src={form.logo} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <h2 className="text-white font-black text-2xl tracking-[0.15em] uppercase mb-2">{form.teamName}</h2>
      <p className="text-[#e8a000]/70 text-[10px] tracking-[0.2em] uppercase mb-1">Team Registered Successfully</p>
      <p className="text-[#444] text-xs tracking-wide mb-8">You will receive a confirmation shortly.</p>

      {/* Confetti-like glow orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#e8a000]"
          style={{ left: `${15 + i * 14}%`, top: '20%' }}
          animate={{ y: [0, -40, 60], opacity: [0, 1, 0], x: [(i % 2 === 0 ? 1 : -1) * 10] }}
          transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
        />
      ))}

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onReset}
        className="border border-[#e8a000]/40 text-[#e8a000] text-[10px] font-black tracking-[0.2em] uppercase px-8 py-3 hover:bg-[#e8a000]/[0.06] transition-all"
      >
        Register Another Team
      </motion.button>
    </motion.div>
  </motion.div>
);

// ── Main Page ──────────────────────────────────────────────
export default function RegisterTeamPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamForm>({
    teamName: '',
    tag: '',
    region: '',
    logo: null,
    logoUrl: null,
    banner: null,
    bannerUrl: null,
    players: ROLES.map(() => emptyPlayer()),
  });

  const updatePlayer = (index: number, player: Player) => {
    const players = [...form.players];
    players[index] = player;
    setForm(f => ({ ...f, players }));
  };

  const addPlayer = () => {
    if (form.players.length >= 6) return;
    setForm(f => ({ ...f, players: [...f.players, emptyPlayer()] }));
  };

  const removePlayer = (index: number) => {
    setForm(f => ({ ...f, players: f.players.filter((_, i) => i !== index) }));
  };

  const handleReset = () => {
    setSubmitted(false);
    setStep(0);
    setSubmitError(null);
    setCreatedTeamId(null);
    setForm({ 
      teamName: '', 
      tag: '', 
      region: '', 
      logo: null, 
      logoUrl: null, 
      banner: null, 
      bannerUrl: null, 
      players: ROLES.map(() => emptyPlayer()) 
    });
  };

  // Submit team registration to API
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Upload images to Supabase storage
      let logoUrl = form.logoUrl;
      let bannerUrl = form.bannerUrl;

      // Upload logo if it's a base64 image (not already uploaded)
      if (form.logo && !form.logoUrl) {
        logoUrl = await uploadImageToSupabase(form.logo, 'logo', 'teams');
        if (!logoUrl) {
          console.warn('Logo upload failed, continuing without logo');
        }
      }

      // Upload banner if it's a base64 image (not already uploaded)
      if (form.banner && !form.bannerUrl) {
        bannerUrl = await uploadImageToSupabase(form.banner, 'banner', 'teams');
        if (!bannerUrl) {
          console.warn('Banner upload failed, continuing without banner');
        }
      }

      // Upload player images
      const playersWithUrls = await Promise.all(
        form.players.map(async (player) => {
          if (player.image && !player.imageUrl) {
            const imageUrl = await uploadImageToSupabase(player.image, `player-${player.id}`, 'players');
            if (!imageUrl) {
              console.warn(`Player ${player.inGameName} image upload failed`);
            }
            return { ...player, imageUrl };
          }
          return player;
        })
      );

      // Step 2: Create the team
      const teamResponse = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.teamName,
          tag: form.tag.toUpperCase(),
          region: form.region,
          logo: logoUrl,
          banner: bannerUrl,
        }),
      });

      const teamData = await teamResponse.json();

      if (!teamResponse.ok) {
        throw new Error(teamData.error || 'Failed to create team');
      }

      const teamId = teamData.team.id;
      setCreatedTeamId(teamId);

      // Step 3: Add players to the team
      const validPlayers = playersWithUrls.filter(p => p.inGameName && p.role);
      
      for (const player of validPlayers) {
        const playerResponse = await fetch(`/api/teams/${teamId}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ign: player.inGameName,
            role: player.role.toUpperCase(),
            photo: player.imageUrl,
            isSubstitute: false,
          }),
        });

        const playerData = await playerResponse.json();

        if (!playerResponse.ok) {
          console.error(`Failed to add player ${player.inGameName}:`, playerData.error);
          // Continue adding other players even if one fails
        }
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to register team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Rajdhani', 'Barlow Condensed', sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Barlow Condensed', 'Rajdhani', sans-serif; }
      `}</style>

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#e8a000]/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#4a90d9]/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-[#e84040]/[0.03] rounded-full blur-3xl" />
        {/* Scanline texture */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)', backgroundSize: '100% 3px' }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#e8a000]" />
            <div>
              <p className="text-[#e8a000] text-[8px] tracking-[0.3em] uppercase font-black">Tournament Season 5</p>
              <h1 className="text-white font-black text-lg tracking-[0.12em] uppercase leading-tight">Register Your Team</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 border border-white/[0.07] px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[#555] text-[9px] tracking-[0.15em] uppercase">Registration Open</span>
          </div>
        </div>
      </motion.header>

      {/* ── Body ── */}
      {submitted ? (
        <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-16">
          <SuccessScreen form={form} onReset={handleReset} />
        </div>
      ) : (
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 xl:gap-10 items-start">

            {/* ── Left: Form ── */}
            <div>
              <StepBar current={step} />

              <AnimatePresence mode="wait">

                {/* STEP 0: Team Identity */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-white font-black text-sm tracking-[0.2em] uppercase mb-5 border-l-2 border-[#e8a000] pl-3">
                      Team Identity
                    </h3>

                    {/* Team name */}
                    <div className="mb-4">
                      <FieldInput
                        label="Team Name"
                        value={form.teamName}
                        onChange={v => setForm(f => ({ ...f, teamName: v }))}
                        placeholder="Enter team name"
                        maxLength={30}
                      />
                    </div>

                    {/* Team Tag + Region */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase mb-1.5">Team Tag</p>
                        <input
                          type="text"
                          value={form.tag}
                          onChange={e => setForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))}
                          placeholder="ABC"
                          maxLength={5}
                          className="w-full bg-[#0d0d14] border border-white/[0.08] text-white text-sm font-bold tracking-wide uppercase placeholder-[#333] px-3 py-2.5 outline-none focus:border-[#e8a000]/50 transition-colors duration-200"
                        />
                        <p className="text-[#333] text-[8px] tracking-wider mt-1">3-5 characters</p>
                      </div>
                      <div>
                        <p className="text-[#555] text-[9px] tracking-[0.18em] uppercase mb-1.5">Region</p>
                        <select
                          value={form.region}
                          onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                          className="w-full bg-[#0d0d14] border border-white/[0.08] text-white text-sm font-bold tracking-wide uppercase px-3 py-2.5 outline-none focus:border-[#e8a000]/50 transition-colors duration-200 cursor-pointer"
                        >
                          <option value="" disabled className="text-[#333]">Select...</option>
                          {REGIONS.map(r => (
                            <option key={r} value={r} className="bg-[#0d0d14] text-white">{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Logo + Banner side by side */}
                    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-4 mb-6">
                      <ImageDropZone
                        value={form.logo}
                        onChange={v => setForm(f => ({ ...f, logo: v }))}
                        label="Team Logo"
                        hint="Square logo"
                        aspect="square"
                        icon={<Shield size={20} />}
                      />
                      <ImageDropZone
                        value={form.banner}
                        onChange={v => setForm(f => ({ ...f, banner: v }))}
                        label="Team Banner"
                        hint="Wide banner image"
                        aspect="banner"
                        icon={<ImageIcon size={20} />}
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep(1)}
                      disabled={!form.teamName || !form.tag || form.tag.length < 3 || !form.region}
                      className={`w-full py-3 text-[10px] font-black tracking-[0.2em] uppercase transition-all ${
                        form.teamName && form.tag.length >= 3 && form.region
                          ? 'bg-[#e8a000] hover:bg-[#ffb800] text-black'
                          : 'bg-[#1a1a22] text-[#333] cursor-not-allowed'
                      }`}
                    >
                      Next: Build Roster →
                    </motion.button>
                  </motion.div>
                )}

                {/* STEP 1: Roster */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-white font-black text-sm tracking-[0.2em] uppercase border-l-2 border-[#e8a000] pl-3">
                        Build Roster
                      </h3>
                      <span className="text-[#444] text-[9px] tracking-widest uppercase">
                        {form.players.length} / 6 slots
                      </span>
                    </div>

                    {/* Role legend */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {ROLES.map(r => (
                        <span
                          key={r.value}
                          className="flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase px-2 py-1 border"
                          style={{ color: r.color, borderColor: `${r.color}30`, background: `${r.color}08` }}
                        >
                          {r.icon}{r.label}
                        </span>
                      ))}
                    </div>

                    <AnimatePresence>
                      <div className="flex flex-col gap-3 mb-4">
                        {form.players.map((player, i) => (
                          <PlayerEditor
                            key={player.id}
                            player={player}
                            index={i}
                            onChange={p => updatePlayer(i, p)}
                            onRemove={() => removePlayer(i)}
                            canRemove={form.players.length > 5}
                          />
                        ))}
                      </div>
                    </AnimatePresence>

                    {form.players.length < 6 && (
                      <motion.button
                        whileHover={{ borderColor: 'rgba(232,160,0,0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={addPlayer}
                        className="w-full border border-dashed border-white/[0.1] text-[#444] hover:text-[#e8a000] text-[10px] font-black tracking-[0.2em] uppercase py-3 flex items-center justify-center gap-2 transition-colors mb-4"
                      >
                        <Plus size={12} /> Add Sub Player
                      </motion.button>
                    )}

                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(0)}
                        className="flex-1 border border-white/10 text-[#666] text-[10px] font-black tracking-[0.15em] uppercase py-3 hover:border-white/20 hover:text-white transition-all"
                      >
                        ← Back
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(2)}
                        className="flex-[2] bg-[#e8a000] hover:bg-[#ffb800] text-black text-[10px] font-black tracking-[0.2em] uppercase py-3 transition-colors"
                      >
                        Review & Submit →
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Review */}
                {step === 2 && (
                  <ReviewScreen
                    key="step2"
                    form={form}
                    onBack={() => setStep(1)}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    submitError={submitError}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ── Right: Live Preview ── */}
            <div className="hidden lg:block">
              <LivePreview form={form} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom glow line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#e84040]/20 via-[#e8a000]/30 to-[#4a90d9]/20 pointer-events-none" />
    </div>
  );
}