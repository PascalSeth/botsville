"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  Trophy,
  UsersRound,
  Swords,
  Newspaper,
  ImagePlus,
  Brain,
  Video,
  Palette,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  ExternalLink,
  Bell,
} from "lucide-react";
import { signOut } from "next-auth/react";

const SIDEBAR_NAV: { label: string; href: string; icon: React.ReactNode; roles?: string[] }[] = [
  { label: "Overview", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Admin roles", href: "/dashboard/roles", icon: <Shield size={18} />, roles: ["SUPER_ADMIN"] },
  { label: "Users", href: "/dashboard/users", icon: <Users size={18} /> },
  { label: "Seasons", href: "/dashboard/seasons", icon: <Calendar size={18} /> },
  { label: "Teams", href: "/dashboard/teams", icon: <UsersRound size={18} /> },
  { label: "Tournaments", href: "/dashboard/tournaments", icon: <Trophy size={18} /> },
  { label: "Matches", href: "/dashboard/matches", icon: <Swords size={18} /> },
  { label: "News", href: "/dashboard/news", icon: <Newspaper size={18} /> },
  { label: "Trivia", href: "/dashboard/trivia", icon: <Brain size={18} />, roles: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { label: "Heroes", href: "/dashboard/heroes", icon: <ImagePlus size={18} /> },
  { label: "Scrim vault", href: "/dashboard/scrim-vault", icon: <Video size={18} /> },
  { label: "Fan art", href: "/dashboard/fan-art", icon: <Palette size={18} /> },
  { label: "Audit log", href: "/dashboard/audit-log", icon: <FileText size={18} /> },
];

type User = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  ign?: string | null;
  role?: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
};

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function DashboardNotificationBell({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=8", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
        pagination?: { unreadCount?: number };
      };

      setNotifications(payload.notifications ?? []);
      setUnreadCount(payload.pagination?.unreadCount ?? 0);
    } catch {
      // ignore navbar errors
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      return;
    }

    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, isLoggedIn]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchNotifications();
  }, [fetchNotifications, isOpen]);

  const markOneAsRead = async (notificationId: string) => {
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.read) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
    } catch {
      // optimistic update only
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      // optimistic update only
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded border border-white/10 text-[#666] hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#e8a000] text-[9px] font-black leading-4 text-black text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-[#0d0d14] border border-white/10 shadow-xl z-50"
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <p className="text-white font-bold text-xs tracking-wider uppercase">Notifications</p>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-[10px] font-bold uppercase tracking-wider text-[#888] hover:text-[#e8a000] disabled:opacity-50"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#777]">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#777]">No notifications yet.</p>
              ) : (
                notifications.map((item) => {
                  const content = (
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${item.read ? "bg-[#333]" : "bg-[#e8a000]"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-[#aaa] leading-relaxed">{item.message}</p>
                        <p className="text-[10px] text-[#666] mt-1">{formatNotificationTime(item.createdAt)}</p>
                      </div>
                    </div>
                  );

                  return item.linkUrl ? (
                    <Link
                      key={item.id}
                      href={item.linkUrl}
                      onClick={() => {
                        void markOneAsRead(item.id);
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => {
                        void markOneAsRead(item.id);
                      }}
                      className="w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = Boolean(user?.id);
  const role = (user as { role?: string | null }).role ?? null;

  const filteredNav = SIDEBAR_NAV.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        .dashboard-font { font-family: 'Barlow Condensed', sans-serif; }
      `}</style>

      {/* Sidebar — desktop */}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen border-r border-[#e8a000]/10
          bg-[#0a0a0f]/98 backdrop-blur-md
          hidden lg:flex flex-col
          transition-[width] duration-300 ease-out
          ${sidebarCollapsed ? "w-[72px]" : "w-[260px]"}
        `}
      >
        {/* Logo strip */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#e8a000]/20 blur-md" />
                <Image
                  src="/mlbb_logobg.png"
                  alt="Botsville"
                  width={36}
                  height={36}
                  className="relative z-10 object-contain"
                />
              </div>
              <span className="dashboard-font text-[#e8a000] font-black text-sm tracking-[0.2em] uppercase">
                Dashboard
              </span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-[#666] hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-all"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <p
            className={`px-3 text-[#444] text-[9px] font-black tracking-[0.25em] uppercase mb-3 ${
              sidebarCollapsed ? "text-center" : ""
            }`}
          >
            {sidebarCollapsed ? "—" : "Manage"}
          </p>
          <ul className="space-y-0.5">
            {filteredNav.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-md px-3 py-2.5
                      text-xs font-bold tracking-wider uppercase transition-all duration-200
                      ${sidebarCollapsed ? "justify-center" : ""}
                      ${
                        isActive
                          ? "bg-[#e8a000]/15 text-[#e8a000] border border-[#e8a000]/30"
                          : "text-[#888] hover:text-white hover:bg-white/[0.04] border border-transparent"
                      }
                    `}
                  >
                    <span className="shrink-0 text-[#e8a000]">{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        {!sidebarCollapsed && (
          <div className="border-t border-white/[0.06] p-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-[#666] hover:text-[#e8a000] hover:bg-white/[0.04] transition-colors"
            >
              <ExternalLink size={14} /> View site
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-screen w-[260px] border-r border-[#e8a000]/10 bg-[#0a0a0f] lg:hidden flex flex-col"
            >
              <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
                <span className="dashboard-font text-[#e8a000] font-black text-sm tracking-[0.2em] uppercase">
                  Menu
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-[#888] hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-2">
                <ul className="space-y-0.5">
                  {filteredNav.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`
                            flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-bold tracking-wider uppercase
                            ${
                              isActive
                                ? "bg-[#e8a000]/15 text-[#e8a000] border border-[#e8a000]/30"
                                : "text-[#888] hover:text-white hover:bg-white/[0.04] border border-transparent"
                            }
                          `}
                        >
                          <span className="shrink-0 text-[#e8a000]">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div
        className={`
          min-h-screen flex flex-col
          transition-[margin] duration-300 ease-out
          ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}
        `}
      >
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0d0d14]/95 px-4 backdrop-blur-md">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded border border-white/10 text-[#888] hover:text-[#e8a000] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="hidden lg:block w-8" />

          <div className="flex flex-1 items-center justify-end gap-3">
            <DashboardNotificationBell isLoggedIn={isLoggedIn} />
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 rounded border border-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-[#666] hover:text-[#e8a000] hover:border-[#e8a000]/30 transition-colors"
            >
              <ExternalLink size={12} /> Site
            </Link>
            <div className="flex items-center gap-2 rounded-md border border-[#e8a000]/20 bg-[#e8a000]/5 px-3 py-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#e8a000]">
                {(user as { role?: string | null }).role ?? "Admin"}
              </span>
              <span className="text-[#888] text-xs">{(user as { ign?: string | null }).ign ?? user.name ?? "—"}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-[#666] hover:text-red-400 hover:border-red-500/30 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </>
  );
}
