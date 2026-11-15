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
    <header
      className="sticky top-0 z-[90] h-14 w-full px-4 flex items-center justify-between gap-4 shrink-0 no-print"
      style={{
        backgroundColor: 'rgba(14, 12, 10, 0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(251, 219, 175, 0.14)',
      }}
    >
      {/* Left (Search) */}
      <div className="relative w-72 md:w-80 flex items-center">
        <Search size={15} className="absolute left-3.5 text-[#FBDBAF]/60 pointer-events-none" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari No. LP, Tersangka, Pasal, Saksi..."
          className="h-9 w-full bg-[#181411] border border-[#FBDBAF]/20 rounded-full px-4 pl-9 text-xs text-white placeholder-[#FBDBAF]/45 font-mono outline-none focus:border-[#FF5A1F] transition-colors"
        />
        <span className="absolute right-2.5 rounded-full border border-[#FBDBAF]/20 bg-[#0E0C0A] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#FBDBAF]/70 pointer-events-none">
          Ctrl + K
        </span>
      </div>

      {/* Tengah (Widget Waktu Taktis) */}
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#181411] border border-[#FBDBAF]/20 rounded-full font-mono text-xs text-[#FBDBAF]">
        <PulseDot />
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[#FBDBAF]/65">{timeStr.date || 'Memuat...'}</span>
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
          className="h-9 px-4 font-mono text-xs rounded-full bg-[#E07020] text-white border-[#FF5A1F] hover:!bg-white hover:!text-[#0E0C0A] hover:!border-white shadow-[0_0_20px_rgba(224,112,32,0.35)]"
          onClick={onNewDoc}
        />

        {/* Kartu Profil */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-[#181411] border border-[#FBDBAF]/20 rounded-full text-left">
          <div className="w-7 h-7 flex items-center justify-center bg-[#0E0C0A] border border-[#E07020]/50 text-[#FF5A1F] font-mono text-[11px] font-bold rounded-full shrink-0">
            {officerInitials || 'P'}
          </div>
          <div className="flex flex-col justify-center leading-tight pr-1">
            <span className="text-xs font-medium text-white line-clamp-1">
              {officerName}
            </span>
            <span className="text-[10px] font-mono text-[#FBDBAF]/65">
              {officerJabatan}
            </span>
          </div>
        </div>

        {/* Tombol KELUAR */}
        {onLogout && (
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="h-9 px-3.5 flex items-center gap-1.5 border border-[#FBDBAF]/25 bg-transparent hover:bg-[#FFFFFF] hover:text-[#0E0C0A] hover:border-white rounded-full text-xs font-mono text-[#FBDBAF] transition-colors"
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
            className="w-full max-w-md rounded-2xl border border-[#FBDBAF]/20 bg-[#161310] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#FBDBAF]/15 pb-4">
              <LogOut size={20} className="text-[#FF5A1F]" />
              <h3 className="heading-font text-lg font-semibold text-white m-0">Konfirmasi Keluar Sesi</h3>
            </div>

            <div className="py-6 text-sm text-[#FBDBAF]/80">
              Apakah Anda ingin mengakhiri sesi dinas aktif di sistem E-Mindik Satreskrim?
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#FBDBAF]/15">
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="rounded-full border border-[#FBDBAF]/25 bg-transparent px-4 py-2 text-sm font-medium text-[#FBDBAF] hover:bg-white/5 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }} 
                className="flex items-center gap-2 rounded-full bg-[#E07020] px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#0E0C0A] transition-colors"
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




