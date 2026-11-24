import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  LogOut, 
  FileText
} from 'lucide-react';
import { TacticalButton, HudCorners, PulseDot, cn } from './command/hud';
import { isSpktRole } from '../utils/rbacHelper';

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
  const isSpkt = isSpktRole(userRole);

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

  const officerName = currentUserProfile?.full_name || currentUserProfile?.nama || (isSuperAdmin ? 'Super Admin Satreskrim' : isSpkt ? 'Petugas SPKT' : 'Personel Penyidik');
  const officerPangkat = currentUserProfile?.pangkat || (isSuperAdmin ? 'POLRI' : '-');
  const officerNrp = currentUserProfile?.rank_nrp || currentUserProfile?.nrp || '-';
  const officerJabatan = currentUserProfile?.jabatan || (isSuperAdmin ? 'Super Admin' : isSpkt ? 'Petugas Loket SPKT' : 'Penyidik Pembantu');
  const officerInitials = officerName ? officerName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'P';

  return (
    <header
      className="sticky top-0 z-[90] h-14 w-full px-4 flex items-center justify-between gap-4 shrink-0 no-print"
      style={{
        backgroundColor: 'rgba(11, 14, 20, 0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
      }}
    >
      {/* Left (Search - Tersembunyi untuk Role SPKT agar tidak mencari berkas LP/tersangka) */}
      {isSpkt ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131924] border border-[rgba(245,158,11,0.35)] text-[11px] font-mono font-bold text-[#FBBF24]">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span>MODE LOKET SPKT • AKSES TERISOLASI</span>
        </div>
      ) : (
        <div className="relative w-72 md:w-80 flex items-center">
          <Search size={15} className="absolute left-3.5 text-[#CBD5E1]/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. LP, Tersangka, Pasal, Saksi..."
            className="h-9 w-full bg-[#131924] border border-[rgba(148,163,184,0.18)] rounded-full px-4 pl-9 text-xs text-white placeholder-[#94A3B8]/65 font-mono outline-none focus:border-[#FF2A2A] transition-colors"
          />
          <span className="absolute right-2.5 rounded-full border border-[rgba(148,163,184,0.22)] bg-[#0B0E14] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#CBD5E1]/75 pointer-events-none">
            Ctrl + K
          </span>
        </div>
      )}

      {/* Tengah (Widget Waktu Taktis) */}
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#131924] border border-[rgba(148,163,184,0.18)] rounded-full font-mono text-xs text-[#CBD5E1]">
        <PulseDot />
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[#94A3B8]">{timeStr.date || 'Memuat...'}</span>
          <span className="font-bold text-white">{timeStr.time || '--:--:-- WITA'}</span>
        </div>
      </div>

      {/* Kanan (Action & Profile) */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Tombol BUAT MINDIK (Disembunyikan untuk Role SPKT) */}
        {!isSpkt && (
          <TacticalButton
            label="Buat Mindik"
            icon={FileText}
            variant="crimson-glow"
            className="h-9 px-4 font-mono text-xs rounded-full bg-[linear-gradient(135deg,#E61919_0%,#FF2A2A_100%)] text-white border-[#FF5252] hover:!bg-white hover:!text-[#0B0E14] hover:!border-white shadow-[0_4px_20px_rgba(255,42,42,0.40)]"
            onClick={onNewDoc}
          />
        )}

        {/* Kartu Profil */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-[#131924] border border-[rgba(148,163,184,0.18)] rounded-full text-left">
          <div className="w-7 h-7 flex items-center justify-center bg-[#0B0E14] border border-[#FF2A2A]/55 text-[#FF3B3B] font-mono text-[11px] font-bold rounded-full shrink-0">
            {officerInitials || 'P'}
          </div>
          <div className="flex flex-col justify-center leading-tight pr-1">
            <span className="text-xs font-medium text-white line-clamp-1">
              {officerName}
            </span>
            <span className="text-[10px] font-mono text-[#94A3B8]">
              {officerJabatan}
            </span>
          </div>
        </div>

        {/* Tombol KELUAR */}
        {onLogout && (
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="h-9 px-3.5 flex items-center gap-1.5 border border-[rgba(148,163,184,0.22)] bg-[#131924]/70 hover:bg-[#FFFFFF] hover:text-[#0B0E14] hover:border-white rounded-full text-xs font-mono text-[#CBD5E1] transition-colors"
            title="Keluar dari Sesi E-Mindik"
          >
            [<LogOut size={13} className="ml-0.5" />
            <span>KELUAR]</span>
          </button>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)}>
          <div 
            className="w-full max-w-md rounded-2xl border border-[rgba(148,163,184,0.20)] bg-[#11161F] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.14)] pb-4">
              <LogOut size={20} className="text-[#FF2A2A]" />
              <h3 className="heading-font text-lg font-semibold text-white m-0">Konfirmasi Keluar Sesi</h3>
            </div>

            <div className="py-6 text-sm text-[#CBD5E1]/85">
              Apakah Anda ingin mengakhiri sesi dinas aktif di sistem E-Mindik Satreskrim?
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(148,163,184,0.14)]">
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="rounded-full border border-[rgba(148,163,184,0.25)] bg-transparent px-4 py-2 text-sm font-medium text-[#CBD5E1] hover:bg-white/5 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }} 
                className="flex items-center gap-2 rounded-full bg-[#FF2A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#0B0E14] transition-colors shadow-[0_4px_16px_rgba(255,42,42,0.35)]"
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




