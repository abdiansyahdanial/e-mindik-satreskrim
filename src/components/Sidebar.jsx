import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderLock, 
  FileSignature, 
  Archive, 
  Users, 
  ShieldCheck, 
  Radio, 
  ChevronRight,
  FileCode,
  ShieldAlert,
  UserCheck,
  Shield,
  UserCog
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { cn } from './command/hud';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  caseCount, 
  docCount, 
  personnelCount,
  userRole = 'anggota',
  onOpenUserManagement
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';
  const isAnggota = userRole === 'anggota' || (!isSuperAdmin && !isAdmin);

  // All menu items with 3-tier RBAC rules
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Taktis',
      icon: LayoutDashboard,
      badge: null,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'cases',
      label: 'Berkas Perkara',
      icon: FolderLock,
      badge: caseCount || 0,
      badgeColor: 'badge-cyan',
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'generator',
      label: 'Generator Mindik',
      icon: FileSignature,
      badge: 'DOCX',
      badgeColor: 'badge-yellow',
      highlight: true,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'archives',
      label: 'Arsip Dokumen',
      icon: Archive,
      badge: docCount || 0,
      badgeColor: 'badge-neutral',
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'personnel',
      label: 'Personel Penyidik',
      icon: Users,
      badge: personnelCount || 0,
      badgeColor: 'badge-green',
      roles: ['super_admin'], // KHUSUS SUPER ADMIN
    },
    {
      id: 'admin-templates',
      label: 'Template Studio',
      icon: FileCode,
      badge: 'STORAGE',
      badgeColor: 'badge-neutral',
      roles: ['super_admin'], // KHUSUS SUPER ADMIN
    },
  ];

  // Strictly filter menu: only include items matching user's current role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="no-print bg-[#05070a] border-r border-white/10 text-zinc-300 w-[270px] shrink-0 flex flex-col min-h-screen sticky top-0 z-[100]">
      {/* Brand Header with Official Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5 bg-transparent">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center">
          {!logoFailed ? (
            <img
              src={logoImg}
              alt="Logo Sat Reskrim"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <ShieldCheck size={26} className="text-white" />
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-extrabold uppercase leading-[1.2] tracking-[0.06em] text-white">
            E-MINDIK SATRESKRIM
          </div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[0.04em] text-zinc-400">
            POLRES KOLAKA TIMUR
          </div>
        </div>
      </div>

      {/* Role & Security Status Bar */}
      <div className={cn(
        "flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]",
        isSuperAdmin ? "bg-red-950/20" : isAdmin ? "bg-white/5" : "bg-emerald-950/20"
      )}>
        <div className="flex items-center gap-1.5">
          {isSuperAdmin ? (
            <ShieldAlert size={14} className="text-red-500" />
          ) : isAdmin ? (
            <Shield size={14} className="text-white" />
          ) : (
            <UserCheck size={14} className="text-emerald-500" />
          )}
          <span className={cn(
            "font-bold",
            isSuperAdmin ? "text-red-500" : isAdmin ? "text-white" : "text-emerald-500"
          )}>
            {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'ANGGOTA'}
          </span>
        </div>
        <span className="rounded border border-white/10 bg-black/40 px-1.5 py-px text-[9px] font-semibold text-zinc-400">
          SUPABASE
        </span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Menu Akses ({isSuperAdmin ? 'Akses Penuh' : isAdmin ? 'Akses Admin' : 'Akses Anggota'})
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3.5 py-2.5 text-left transition-all duration-200",
                isActive
                  ? "bg-white/[0.04] text-white border-l-[3px] border-l-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]"
                  : "border-l-[3px] border-l-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  size={18} 
                  className={isActive ? "text-red-500" : "text-current"} 
                />
                <span className={cn("text-[13px] tracking-wide", isActive ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge !== null && item.badge !== undefined && (
                  <span className="rounded bg-black/40 border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="text-red-500" />}
              </div>
            </button>
          );
        })}

        {/* Khusus Super Admin: Tombol Kelola Peran Pengguna (RBAC) */}
        {isSuperAdmin && onOpenUserManagement && (
          <div className="mt-3 border-t border-dashed border-red-500/20 pt-2.5">
            <button
              type="button"
              onClick={onOpenUserManagement}
              className="flex w-full items-center justify-between rounded-md border border-red-500/30 bg-[#05070a] px-3.5 py-2.5 text-left text-white transition-all hover:bg-red-500/10 hover:border-red-500/50"
            >
              <div className="flex items-center gap-2.5">
                <UserCog size={17} className="text-red-500" />
                <span className="text-[12.5px] font-semibold">Kelola Peran (RBAC)</span>
              </div>
              <span className="rounded bg-black border border-red-500/30 px-1.5 py-0.5 text-[8.5px] font-bold text-white">
                AKUN
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Quick Ops Banner */}
      <div className="m-3 rounded-lg border border-white/10 bg-[#05070a] p-3.5">
        <div className="mb-1.5 flex items-center gap-2">
          <Radio size={14} className="animate-pulse text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-300">
            MINDIK PRESISI
          </span>
        </div>
        <p className="m-0 text-[11px] leading-[1.4] text-zinc-500">
          Sistem terhubung real-time ke database Supabase & template Word (.docx).
        </p>
      </div>

      {/* Footer / Version */}
      <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-[11px] text-zinc-500 bg-transparent">
        <span>Satreskrim Polrestim &copy; 2026</span>
        <span className="font-mono">v2.1-RBAC</span>
      </div>
    </aside>
  );
}
