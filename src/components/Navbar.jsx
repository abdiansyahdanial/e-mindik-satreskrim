import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  PlusCircle, 
  FilePlus, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react';

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
  const [timeStr, setTimeStr] = useState('');
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
      setTimeStr(`${date} • ${time} WITA`);
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
    <header className="app-navbar no-print" style={{
      height: 'var(--header-height)',
      background: '#0E1420',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1E293B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 90,
    }}>
      {/* Left: Quick Search with Command Palette Clue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 1 400px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search size={15} color="#64748B" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. LP, Tersangka, Pasal, Saksi..."
            style={{
              width: '100%',
              background: '#141C2B',
              border: '1px solid #263347',
              borderRadius: '8px',
              padding: '7px 70px 7px 34px',
              fontSize: '12.5px',
              color: '#F8FAFC',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#DC2626';
              e.target.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.2)';
              e.target.style.background = '#182234';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#263347';
              e.target.style.boxShadow = 'none';
              e.target.style.background = '#141C2B';
            }}
          />
          <span style={{
            position: 'absolute',
            right: '8px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: '#64748B',
            background: '#0B0F17',
            border: '1px solid #263347',
            padding: '1px 5px',
            borderRadius: '4px',
            pointerEvents: 'none'
          }}>
            Ctrl + K
          </span>
        </div>
      </div>

      {/* Middle: Live Tactical Clock (UTC+8 WITA) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 14px',
        background: '#141C2B',
        borderRadius: '6px',
        border: '1px solid #263347',
        fontSize: '11.5px',
        color: '#94A3B8',
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10B981',
          boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
          display: 'inline-block'
        }} />
        <Clock size={13} color="#64748B" />
        <span className="mono" style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#CBD5E1' }}>
          {timeStr || 'Memuat waktu...'}
        </span>
      </div>

      {/* Right: Actions & Officer Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Quick Action: New Case */}
        <button 
          onClick={onNewCase}
          className="btn btn-secondary btn-sm"
          title="Input Laporan Polisi Baru"
        >
          <PlusCircle size={14} />
          <span>Input LP Baru</span>
        </button>

        {/* Quick Action: Generate Mindik */}
        <button 
          onClick={onNewDoc}
          className="btn btn-primary btn-sm"
          title="Buat Dokumen Mindik Baru"
        >
          <FilePlus size={14} />
          <span>Buat Mindik</span>
        </button>

        {/* Khusus Super Admin: Tombol Kelola RBAC */}
        {isSuperAdmin && onOpenUserManagement && (
          <button
            type="button"
            onClick={onOpenUserManagement}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: 'rgba(168, 85, 247, 0.4)',
              color: '#C084FC',
              background: '#141C2B'
            }}
            title="Kelola Peran Akun (RBAC)"
          >
            <ShieldAlert size={14} color="#A855F7" />
            <span>Kelola RBAC</span>
          </button>
        )}

        {/* Officer Active Session */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '5px 12px',
          background: '#141C2B',
          border: isSuperAdmin 
            ? '1px solid rgba(220, 38, 38, 0.4)' 
            : '1px solid #263347',
          borderRadius: '8px',
          marginLeft: '4px',
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '6px',
            background: isSuperAdmin ? 'rgba(220, 38, 38, 0.15)' : '#182234',
            border: isSuperAdmin 
              ? '1px solid rgba(220, 38, 38, 0.4)' 
              : '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '11px',
            color: isSuperAdmin ? '#F87171' : '#F8FAFC',
          }}>
            {officerInitials || 'P'}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC' }}>
              {officerName}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span>{officerPangkat && officerPangkat !== '-' ? `${officerPangkat} • ` : ''}{officerJabatan}</span>
              <span className="mono" style={{ color: '#64748B' }}>• {officerNrp}</span>
              <span 
                style={{
                  fontSize: '8px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 700,
                  background: isSuperAdmin ? 'rgba(220, 38, 38, 0.18)' : '#1E293B',
                  color: isSuperAdmin ? '#FCA5A5' : isAdmin ? '#38BDF8' : '#34D399',
                  border: isSuperAdmin ? '1px solid rgba(220, 38, 38, 0.35)' : '1px solid #334155'
                }}
              >
                {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'ANGGOTA'}
              </span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', color: '#F87171', borderColor: 'rgba(220, 38, 38, 0.3)' }}
            title="Keluar dari Sesi E-Mindik"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLogoutModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LogOut size={20} color="var(--accent-red)" />
                <h3 style={{ fontSize: '15px', margin: 0 }}>Konfirmasi Keluar Sesi</h3>
              </div>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Apakah Anda ingin mengakhiri sesi dinas aktif di sistem E-Mindik Satreskrim?
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setIsLogoutModalOpen(false)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }} 
                className="btn btn-danger btn-sm"
              >
                <LogOut size={14} />
                <span>Ya, Keluar Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
