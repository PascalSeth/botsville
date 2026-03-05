'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Check, X, Loader2, AlertCircle, 
  Eye, EyeOff, History, ChevronDown, ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IgnHistoryEntry {
  oldIgn: string;
  changedAt: string;
}

interface UserSettings {
  id: string;
  email: string;
  ign: string;
  createdAt: string;
  ignHistory: IgnHistoryEntry[];
}

const SectionLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 mb-4 border-l-2 border-[#e8a000] pl-3">
    <Icon size={14} className="text-[#e8a000]" />
    <h2 className="text-white font-black text-[11px] tracking-[0.3em] uppercase">{children}</h2>
  </div>
);

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  
  // User data
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [ignValue, setIgnValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Availability check states
  const [ignAvailable, setIgnAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingIgn, setCheckingIgn] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showIgnHistory, setShowIgnHistory] = useState(false);
  
  // Submission states
  const [savingIgn, setSavingIgn] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Success messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/users/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data);
      setIgnValue(data.ign);
      setEmailValue(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router, fetchSettings]);

  // Debounced availability check
  useEffect(() => {
    if (!settings || ignValue === settings.ign) {
      setIgnAvailable(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      if (ignValue.trim().length === 0) {
        setIgnAvailable(null);
        return;
      }
      
      setCheckingIgn(true);
      try {
        const res = await fetch(`/api/users/check-availability?type=ign&value=${encodeURIComponent(ignValue)}`);
        const data = await res.json();
        setIgnAvailable(data.available);
      } catch {
        setIgnAvailable(null);
      } finally {
        setCheckingIgn(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [ignValue, settings]);

  useEffect(() => {
    if (!settings || emailValue.toLowerCase() === settings.email.toLowerCase()) {
      setEmailAvailable(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      if (emailValue.trim().length === 0) {
        setEmailAvailable(null);
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        setEmailAvailable(null);
        return;
      }
      
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/users/check-availability?type=email&value=${encodeURIComponent(emailValue)}`);
        const data = await res.json();
        setEmailAvailable(data.available);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [emailValue, settings]);

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Save IGN
  const handleSaveIgn = async () => {
    if (!settings || ignValue === settings.ign || ignAvailable === false) return;
    
    setSavingIgn(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ign', newValue: ignValue }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSettings(prev => prev ? { ...prev, ign: data.newIgn } : null);
      setIgnAvailable(null);
      showSuccess('IGN updated successfully!');
      
      // Update session to reflect new IGN
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update IGN');
    } finally {
      setSavingIgn(false);
    }
  };

  // Save Email
  const handleSaveEmail = async () => {
    if (!settings || emailValue.toLowerCase() === settings.email.toLowerCase() || emailAvailable === false) return;
    
    setSavingEmail(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', newValue: emailValue }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSettings(prev => prev ? { ...prev, email: data.newEmail } : null);
      setEmailAvailable(null);
      showSuccess('Email updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  // Save Password
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    
    setSavingPassword(true);
    setError(null);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword, newPassword }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#e8a000] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-[#444] uppercase tracking-widest mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-[#e8a000]">Settings</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/5 pb-4 mb-6"
        >
          <h1 className="text-white font-black text-lg tracking-[0.2em] uppercase">Account Settings</h1>
          <p className="text-[#444] text-[10px] tracking-widest uppercase mt-1">Manage your profile</p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-3"
            >
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-400 text-xs font-bold tracking-wide">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-400 text-xs font-bold tracking-wide flex-1">{error}</span>
              <button onClick={() => setError(null)} className="hover:bg-red-500/10 p-1 transition-colors">
                <X className="w-3 h-3 text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IGN Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-white/5 bg-[#0b0b11] p-4"
        >
          <SectionLabel icon={User}>In-Game Name</SectionLabel>

          <div className="space-y-3">
            <div className="relative group">
              <div
                className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
                style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
              />
              <input
                type="text"
                value={ignValue}
                onChange={(e) => setIgnValue(e.target.value)}
                className="w-full bg-transparent text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-[#444] transition-all duration-300 pr-10"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                placeholder="Enter your IGN"
              />
              {/* Availability indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                {checkingIgn ? (
                  <Loader2 className="w-4 h-4 text-[#444] animate-spin" />
                ) : ignAvailable === true ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : ignAvailable === false ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {ignAvailable === false && (
              <p className="text-[10px] text-red-400 tracking-wide">This IGN is already taken</p>
            )}

            {/* IGN History Toggle */}
            {settings?.ignHistory && settings.ignHistory.length > 0 && (
              <button
                onClick={() => setShowIgnHistory(!showIgnHistory)}
                className="flex items-center gap-2 text-[10px] text-[#444] hover:text-white transition-colors tracking-widest uppercase"
              >
                <History className="w-3 h-3" />
                <span>IGN History ({settings.ignHistory.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showIgnHistory ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* IGN History List */}
            <AnimatePresence>
              {showIgnHistory && settings?.ignHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-black/30 border border-white/5 p-3 space-y-2">
                    {settings.ignHistory.map((entry, index) => (
                      <div key={index} className="flex justify-between text-[10px]">
                        <span className="text-[#888] font-mono">{entry.oldIgn}</span>
                        <span className="text-[#444]">
                          {new Date(entry.changedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleSaveIgn}
              disabled={savingIgn || ignValue === settings?.ign || ignAvailable === false || !ignValue.trim()}
              className="w-full bg-[#e8a000] text-black text-[10px] font-black tracking-[0.2em] uppercase py-2.5 hover:bg-[#ffb800] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingIgn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save IGN
            </button>
          </div>
        </motion.div>

        {/* Email Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-white/5 bg-[#0b0b11] p-4"
        >
          <SectionLabel icon={Mail}>Email Address</SectionLabel>

          <div className="space-y-3">
            <div className="relative group">
              <div
                className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
                style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
              />
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="w-full bg-transparent text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-[#444] transition-all duration-300 pr-10"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                placeholder="Enter your email"
              />
              {/* Availability indicator */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                {checkingEmail ? (
                  <Loader2 className="w-4 h-4 text-[#444] animate-spin" />
                ) : emailAvailable === true ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : emailAvailable === false ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {emailAvailable === false && (
              <p className="text-[10px] text-red-400 tracking-wide">This email is already in use</p>
            )}

            <button
              onClick={handleSaveEmail}
              disabled={savingEmail || emailValue.toLowerCase() === settings?.email.toLowerCase() || emailAvailable === false || !emailValue.trim()}
              className="w-full bg-[#e8a000] text-black text-[10px] font-black tracking-[0.2em] uppercase py-2.5 hover:bg-[#ffb800] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save Email
            </button>
          </div>
        </motion.div>

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-white/5 bg-[#0b0b11] p-4"
        >
          <SectionLabel icon={Lock}>Change Password</SectionLabel>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[10px] text-[#444] mb-1 tracking-[0.2em] uppercase">Current Password</label>
              <div className="relative group">
                <div
                  className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
                  style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
                />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-transparent text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-[#444] transition-all duration-300 pr-10"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[10px] text-[#444] mb-1 tracking-[0.2em] uppercase">New Password</label>
              <div className="relative group">
                <div
                  className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
                  style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
                />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-[#444] transition-all duration-300 pr-10"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-[10px] text-[#e8a000] mt-1 tracking-wide">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[10px] text-[#444] mb-1 tracking-[0.2em] uppercase">Confirm Password</label>
              <div className="relative group">
                <div
                  className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
                  style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-[#444] transition-all duration-300 pr-10"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-red-400 mt-1 tracking-wide">Passwords do not match</p>
              )}
            </div>

            <button
              onClick={handleSavePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="w-full bg-[#e8a000] text-black text-[10px] font-black tracking-[0.2em] uppercase py-2.5 hover:bg-[#ffb800] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              Update Password
            </button>
          </div>
        </motion.div>

        {/* Account Info */}
        {settings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border-t border-white/5 pt-4 mt-6"
          >
            <p className="text-[9px] text-[#333] text-center tracking-[0.2em] uppercase">
              Account created {new Date(settings.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
