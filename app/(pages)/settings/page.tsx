'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Check, X, Loader2, AlertCircle, 
  Eye, EyeOff, History, ChevronDown
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#141420] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#141420] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account information and security</p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-green-400">{successMessage}</span>
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
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:bg-red-500/20 p-1 rounded">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IGN Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1a2e]/60 border border-white/5 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">In-Game Name (IGN)</h2>
              <p className="text-sm text-gray-400">Your display name in the community</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={ignValue}
                onChange={(e) => setIgnValue(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors pr-12"
                placeholder="Enter your IGN"
              />
              {/* Availability indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingIgn ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : ignAvailable === true ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : ignAvailable === false ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            </div>

            {ignAvailable === false && (
              <p className="text-sm text-red-400">This IGN is already taken</p>
            )}

            {/* IGN History Toggle */}
            {settings?.ignHistory && settings.ignHistory.length > 0 && (
              <button
                onClick={() => setShowIgnHistory(!showIgnHistory)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <History className="w-4 h-4" />
                <span>View IGN History ({settings.ignHistory.length})</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showIgnHistory ? 'rotate-180' : ''}`} />
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
                  <div className="bg-black/20 rounded-lg p-3 space-y-2">
                    {settings.ignHistory.map((entry, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-300">{entry.oldIgn}</span>
                        <span className="text-gray-500">
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
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold py-3 rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingIgn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save IGN
            </button>
          </div>
        </motion.div>

        {/* Email Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1a2e]/60 border border-white/5 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Address</h2>
              <p className="text-sm text-gray-400">Used for account recovery and notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors pr-12"
                placeholder="Enter your email"
              />
              {/* Availability indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingEmail ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : emailAvailable === true ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : emailAvailable === false ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            </div>

            {emailAvailable === false && (
              <p className="text-sm text-red-400">This email is already in use</p>
            )}

            <button
              onClick={handleSaveEmail}
              disabled={savingEmail || emailValue.toLowerCase() === settings?.email.toLowerCase() || emailAvailable === false || !emailValue.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold py-3 rounded-lg hover:from-purple-500 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save Email
            </button>
          </div>
        </motion.div>

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a1a2e]/60 border border-white/5 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Password</h2>
              <p className="text-sm text-gray-400">Keep your account secure</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors pr-12"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors pr-12"
                  placeholder="Enter new password (min. 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-sm text-amber-400 mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors pr-12"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              onClick={handleSavePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:from-cyan-500 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Update Password
            </button>
          </div>
        </motion.div>

        {/* Account Info */}
        {settings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#1a1a2e]/40 border border-white/5 rounded-xl p-4 backdrop-blur-sm"
          >
            <p className="text-sm text-gray-500 text-center">
              Account created on {new Date(settings.createdAt).toLocaleDateString('en-US', {
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
