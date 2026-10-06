import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  LogOut, 
  FileText
} from 'lucide-react';
import { TacticalButton, HudCorners, PulseDot, cn } from './command/hud';

export default function Navbar({ 
  onNewCase, 
  onNewDoc, 
  searchQuery, 
  setSearchQuery,
  currentUserProfile = null,
  userRole = 'anggota',
  onLogout,
  onOpenUserManagement
}) {
  const [timeStr, setTimeStr] = useState({});
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';

  // Clock WITA (UTC+8)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const time = new Intl.DateTimeFormat('id-ID', options).format(now);
      const dateOptions = {
        timeZone: 'Asia/Makassar',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      };
      const date = new Intl.DateTimeFormat('id-ID', dateOptions).format(now);
      setTimeStr({ date, time: `${time} WITA` });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const officerName = currentUserProfile?.full_name || currentUserProfile?.nama || (isSuperAdmin ? 'Super Admin Satreskrim' : 'Personel Penyidik');
  const officerPangkat = currentUserProfile?.pangkat || (isSuperAdmin ? 'POLRI' : '-');
  const officerNrp = currentUserProfile?.rank_nrp || currentUserProfile?.nrp || '-';
  const officerJabatan = currentUserProfile?.jabatan || (isSuperAdmin ? 'Super Admin' : 'Penyidik Pembantu');
  const officerInitials = officerName ? officerName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'P';

  return (
    <header className="sticky top-0 z-[90] h-14 w-full border-b border-white/10 bg-[#05070a]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 shrink-0 no-print">
      {/* Left (Search) */}
      <div className="relative w-72 md:w-80 flex items-center">
        <Search size={15} className="absolute left-3 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari No. LP, Tersangka, Pasal, Saksi..."
          className="h-9 w-full bg-black/40 border border-white/10 rounded px-3 pl-9 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-red-500/50"
        />
        <span className="absolute right-2 rounded-sm border border-white/10 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 pointer-events-none">
          Ctrl + K
        </span>
      </div>

      {/* Tengah (Widget Waktu Taktis) */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/40 border border-white/10 rounded font-mono text-xs text-zinc-300">
        <PulseDot />
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-zinc-400">{timeStr.date || 'Memuat...'}</span>
          <span className="font-bold text-white">{timeStr.time || '--:--:-- WITA'}</span>
        </div>
      </div>

      {/* Kanan (Action & Profile) */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Tombol BUAT MINDIK */}
        <TacticalButton
          label="Buat Mindik"
          icon={FileText}
          variant="crimson-glow"
          className="h-9 px-3.5 font-mono text-xs rounded"
          onClick={onNewDoc}
        />

        {/* Kartu Profil */}
        <div className="flex items-center gap-2.5 px-2.5 py-1 bg-black/40 border border-white/10 rounded text-left">
          <div className="w-7 h-7 flex items-center justify-center bg-zinc-900 border border-white/20 text-white font-mono text-[11px] rounded shrink-0">
            {officerInitials || 'P'}
          </div>
          <div className="flex flex-col justify-center leading-tight">
            <span className="text-xs font-medium text-white line-clamp-1">
              {officerName}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {officerJabatan}
            </span>
          </div>
        </div>

        {/* Tombol KELUAR */}
        {onLogout && (
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="h-9 px-3 flex items-center gap-1.5 border border-white/10 bg-black/40 hover:bg-white/5 rounded text-xs font-mono text-zinc-300 transition-colors"
            title="Keluar dari Sesi E-Mindik"
          >
            [<LogOut size={13} className="ml-0.5" />
            <span>KELUAR]</span>
          </button>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)}>
          <div 
            className="w-full max-w-md rounded-md border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <LogOut size={20} className="text-red-500" />
              <h3 className="text-lg font-semibold text-white m-0">Konfirmasi Keluar Sesi</h3>
            </div>

            <div className="py-6 text-sm text-slate-400">
              Apakah Anda ingin mengakhiri sesi dinas aktif di sistem E-Mindik Satreskrim?
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }} 
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <LogOut size={16} />
                <span>Ya, Keluar Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}




