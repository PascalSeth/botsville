"use client";

import React, { useState } from "react";
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
  Video,
  Palette,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  ExternalLink,
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
