'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Shield, Swords, Star, ChevronRight, Trophy, Users, AlertCircle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type Mode = 'login' | 'register';

// ── Left panel stats (decorative) ─────────────────────────
const STATS = [
  { icon: <Trophy   size={12} />, label: 'Active Teams',    value: '6' },
  { icon: <Users    size={12} />, label: 'Registered Players', value: '120+' },
  { icon: <Shield   size={12} />, label: 'Season',          value: 'S5' },
  { icon: <Swords   size={12} />, label: 'Prize Pool',      value: '₵12,800' },
];

// ── Input field ────────────────────────────────────────────
const Field = ({
  label, type = 'text', placeholder, value, onChange, right,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  right?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[#555] text-[10px] font-black tracking-[0.2em] uppercase">{label}</label>
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full bg-[#0a0a10] border border-white/[0.08] text-white text-sm
          px-3 py-2.5 outline-none tracking-wide placeholder:text-[#2a2a2a]
          focus:border-[#e8a000]/50 focus:bg-[#0d0d18]
          transition-all duration-200
          pr-10
        "
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  </div>
);

// ── Role selector (register only) ─────────────────────────
const ROLES = ['Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'] as const;
type PlayerRole = typeof ROLES[number];

const ROLE_COLORS: Record<PlayerRole, string> = {
  Tank:      '#4a90d9',
  Fighter:   '#e8a000',
  Assassin:  '#e84040',
  Mage:      '#9b59b6',
  Marksman:  '#27ae60',
  Support:   '#16a085',
};

const RoleSelector = ({ selected, onSelect }: { selected: PlayerRole | null; onSelect: (r: PlayerRole) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[#555] text-[10px] font-black tracking-[0.2em] uppercase">Main Role</label>
    <div className="grid grid-cols-3 gap-1.5">
      {ROLES.map((r) => {
        const active = selected === r;
        const c = ROLE_COLORS[r];
        return (
          <button
            key={r}
            type="button"
            onClick={() => onSelect(r)}
            className="py-2 text-[10px] font-black tracking-wide uppercase transition-all duration-150 border"
            style={active
              ? { background: `${c}22`, color: c, borderColor: `${c}66` }
              : { background: 'transparent', color: '#444', borderColor: '#ffffff08' }
            }
          >
            {r}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Submit button ──────────────────────────────────────────
const SubmitBtn = ({ label, loading }: { label: string; loading: boolean }) => (
  <button
    type="submit"
    disabled={loading}
    className="
      relative w-full py-3 font-black text-[11px] tracking-[0.25em] uppercase
      bg-[#e8a000] text-black overflow-hidden
      hover:bg-[#ffb800] transition-colors duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      group
    "
  >
    {/* Shine sweep */}
    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-white/20 skew-x-12 transition-transform duration-500 pointer-events-none" />
    <span className="relative flex items-center justify-center gap-2">
      {loading ? 'Processing...' : label}
      {!loading && <ChevronRight size={13} />}
    </span>
  </button>
);

// ── Error Message Component ────────────────────────────────
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[11px]">
    <AlertCircle size={14} />
    <span>{message}</span>
  </div>
);

// ── Success Message Component ──────────────────────────────
const SuccessMessage = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-[11px]">
    <span>{message}</span>
  </div>
);

// ── Error messages mapping
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Configuration': 'Server configuration error. Please try again later.',
  'AccessDenied': 'Access denied. Please check your credentials.',
  'Verification': 'Verification failed. Please try again.',
  'Default': 'An error occurred. Please try again.',
};

// ── Login form ─────────────────────────────────────────────
const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailOrIgn, setEmailOrIgn] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Get error from URL or state
  const urlError = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    urlError ? (AUTH_ERROR_MESSAGES[urlError] || `Authentication error: ${urlError}`) : null
  );

  // Log URL error on mount
  useEffect(() => {
    if (urlError) {
      console.log('[LOGIN] URL error parameter:', urlError);
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear URL error by navigating to clean URL
    if (urlError) {
      window.history.replaceState({}, '', '/login');
    }
    
    setError(null);
    setLoading(true);

    console.log('[LOGIN] Submitting login form for:', emailOrIgn);

    try {
      const result = await signIn('credentials', {
        emailOrIgn,
        password,
        redirect: false,
      });

      console.log('[LOGIN] SignIn result:', { 
        ok: result?.ok, 
        error: result?.error, 
        status: result?.status 
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        console.log('[LOGIN] Login successful, redirecting to home');
        // Redirect to home page
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('[LOGIN] Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <ErrorMessage message={error} />}
      <Field
        label="Email / IGN"
        placeholder="your@email.com or YourIGN"
        value={emailOrIgn}
        onChange={setEmailOrIgn}
      />
      <Field
        label="Password"
        type={showPw ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        right={
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-[#444] hover:text-white transition-colors">
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        }
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="accent-[#e8a000] w-3 h-3" />
          <span className="text-[#444] text-[10px] tracking-wide group-hover:text-[#666] transition-colors">Remember me</span>
        </label>
        <a href="#" className="text-[#444] text-[10px] tracking-wide hover:text-[#e8a000] transition-colors">
          Forgot password?
        </a>
      </div>
      <div className="pt-1">
        <SubmitBtn label="Enter the Arena" loading={loading} />
      </div>
    </form>
  );
};

// ── Role mapping ───────────────────────────────────────────
const ROLE_MAP: Record<PlayerRole, string> = {
  Tank: 'TANK',
  Fighter: 'FIGHTER',
  Assassin: 'ASSASSIN',
  Mage: 'MAGE',
  Marksman: 'MARKSMAN',
  Support: 'SUPPORT',
};

// ── Register form ──────────────────────────────────────────
const RegisterForm = () => {
  const router = useRouter();
  const [ign, setIgn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!ign || !email || !password || !confirm || !role) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (ign.length < 3 || ign.length > 20) {
      setError('IGN must be 3-20 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ign,
          mainRole: ROLE_MAP[role],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Logging you in...');

      // Auto-login after registration
      const loginResult = await signIn('credentials', {
        emailOrIgn: email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        setError('Account created but login failed. Please log in manually.');
        setLoading(false);
        return;
      }

      if (loginResult?.ok) {
        // Redirect to home page
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}
      <Field
        label="In-Game Name (IGN)"
        placeholder="YourMLBBName"
        value={ign}
        onChange={setIgn}
      />
      <Field
        label="Email"
        placeholder="your@email.com"
        type="email"
        value={email}
        onChange={setEmail}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          right={
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-[#444] hover:text-white transition-colors">
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          }
        />
        <Field
          label="Confirm"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={setConfirm}
        />
      </div>
      <RoleSelector selected={role} onSelect={setRole} />
      <p className="text-[#333] text-[9px] leading-relaxed tracking-wide">
        By registering you agree to the Ghana Nagends tournament rules and MLBB community guidelines.
      </p>
      <SubmitBtn label="Join the Squad" loading={loading} />
    </form>
  );
};

// ── Left Panel ─────────────────────────────────────────────
const LeftPanel = ({ mode }: { mode: Mode }) => (
  <div className="hidden lg:flex relative flex-col justify-between p-10 overflow-hidden bg-[#06060c]">
    {/* Background image */}
    <div className="absolute inset-0">
      <Image
        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&q=80"
        alt="Ghana MLBB"
        fill
        className="object-cover brightness-[0.25]"
        priority
      />
      {/* Gold radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(232,160,0,0.15),transparent_60%)]" />
      {/* Vertical grid lines */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 100%' }} />
    </div>

    {/* Top — logo area */}
    <div className="relative z-10">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/mlbb_logobg.png" alt="Ghana Nagends" width={44} height={44} className="object-contain" />
        <div className="flex flex-col leading-none">
          <span className="text-white font-black text-lg tracking-[0.12em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Ghana</span>
          <span className="text-[#e8a000] font-semibold text-sm tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Nagends</span>
        </div>
      </Link>
    </div>

    {/* Center — headline */}
    <div className="relative z-10">
      <p className="text-[#e8a000] text-[10px] tracking-[0.4em] uppercase font-semibold mb-3">Ghana MLBB Season 5</p>
      <h2 className="text-white font-black text-4xl xl:text-5xl leading-tight uppercase tracking-tight">
        {mode === 'login' ? (
          <>Welcome<br />Back,<br /><span className="text-[#e8a000]">Legend.</span></>
        ) : (
          <>Join the<br />Ghana<br /><span className="text-[#e8a000]">Arena.</span></>
        )}
      </h2>
      <p className="text-[#555] text-sm mt-4 leading-relaxed max-w-[260px]">
        {mode === 'login'
          ? 'Your squad is waiting. Log in to track your stats, manage your team, and dominate the leaderboard.'
          : 'Register now to compete in APL & AFL tournaments, earn points, and represent Ghana on the IESF Africa stage.'
        }
      </p>
    </div>

    {/* Bottom — stats */}
    <div className="relative z-10 grid grid-cols-2 gap-3">
      {STATS.map((s) => (
        <div key={s.label} className="bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[#e8a000] mb-1">{s.icon}</div>
          <p className="text-white font-black text-base leading-none">{s.value}</p>
          <p className="text-[#444] text-[9px] tracking-widest uppercase mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Mode Tab ───────────────────────────────────────────────
const ModeTab = ({ mode, active, onClick }: { mode: Mode; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex-1 py-3 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-200 border-b-2"
    style={active
      ? { color: '#e8a000', borderColor: '#e8a000' }
      : { color: '#333',    borderColor: 'transparent' }
    }
  >
    {mode === 'login' ? 'Login' : 'Register'}
  </button>
);

// ── Main Page ──────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap');
      `}</style>

      <main className="min-h-screen bg-[#08080d] grid lg:grid-cols-2">

        {/* ── Left: image + info panel ── */}
        <LeftPanel mode={mode} />

        {/* ── Right: form panel ── */}
        <div className="flex flex-col min-h-screen lg:min-h-0">

          {/* Mobile logo bar */}
          <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0a0a10]">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/mlbb_logobg.png" alt="Ghana Nagends" width={36} height={36} className="object-contain" />
              <div className="flex flex-col leading-none">
                <span className="text-white font-black text-sm tracking-widest uppercase">Ghana</span>
                <span className="text-[#e8a000] text-[10px] tracking-widest uppercase">Nagends</span>
              </div>
            </Link>
            <Link href="/" className="text-[#444] text-[10px] tracking-widest uppercase hover:text-white transition-colors">
              ← Home
            </Link>
          </div>

          {/* Form area — vertically centered */}
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-10">
            <div className="w-full max-w-sm mx-auto lg:max-w-md">

              {/* Top accent */}
              <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/40 to-transparent mb-8" />

              {/* Mode tabs */}
              <div className="flex border-b border-white/[0.06] mb-8">
                <ModeTab mode="login"    active={mode === 'login'}    onClick={() => handleModeChange('login')}    />
                <ModeTab mode="register" active={mode === 'register'} onClick={() => handleModeChange('register')} />
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-white font-black text-2xl tracking-tight uppercase">
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </h1>
                <p className="text-[#444] text-[11px] mt-1 tracking-wide">
                  {mode === 'login'
                    ? 'Enter your credentials to access your dashboard.'
                    : 'Fill in your details to join the Ghana MLBB community.'
                  }
                </p>
              </div>

              {/* Form — animate on switch (Suspense required for useSearchParams in LoginForm) */}
              <div key={mode}>
                {mode === 'login' ? (
                  <Suspense fallback={<div className="flex flex-col gap-4 h-[280px] animate-pulse rounded bg-white/5" />}>
                    <LoginForm />
                  </Suspense>
                ) : (
                  <RegisterForm />
                )}
              </div>

              {/* Switch mode link */}
              <p className="text-[#333] text-[11px] tracking-wide mt-6 text-center">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
                  className="text-[#e8a000] hover:text-white transition-colors font-bold"
                >
                  {mode === 'login' ? 'Register →' : 'Login →'}
                </button>
              </p>

              {/* Bottom accent */}
              <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/20 to-transparent mt-8" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}