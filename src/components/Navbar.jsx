import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  PlusCircle, 
  FilePlus, 
  LogOut, 
  ShieldAlert, 
  UserCheck 
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
  const isAnggota = userRole === 'anggota' || (!isSuperAdmin && !isAdmin);

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

  const officerName = currentUserProfile?.nama || (isSuperAdmin ? 'AKP AHMAD FATONI, S.H.' : 'BRIPKA DEDI PRASETYO, S.H.');
  const officerPangkat = currentUserProfile?.pangkat || (isSuperAdmin ? 'AKP' : 'BRIPKA');
  const officerJabatan = isSuperAdmin 
    ? (currentUserProfile?.jabatan && currentUserProfile.jabatan !== 'Kasat Reskrim' && currentUserProfile.jabatan !== 'Kepala Satuan Reserse Kriminal' ? currentUserProfile.jabatan : 'ABDIANSYAH')
    : (currentUserProfile?.jabatan || 'Penyidik Pembantu');
  const officerInitials = officerName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <header className="app-navbar no-print" style={{
      height: 'var(--header-height)',
      background: 'rgba(6, 11, 24, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 90,
    }}>
      {/* Left: Quick Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 1 380px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. LP, Tersangka, Pasal..."
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-input)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px 8px 36px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-cyan)';
              e.target.style.boxShadow = '0 0 0 2px var(--accent-cyan-dim)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-input)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Middle: Live Tactical Clock */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        background: 'rgba(13, 21, 38, 0.6)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-glass)',
        fontSize: '12px',
        color: 'var(--accent-cyan)',
      }}>
        <Clock size={14} className="animate-pulse" />
        <span className="mono" style={{ fontWeight: 600 }}>{timeStr || 'Memuat waktu...'}</span>
      </div>

      {/* Right: Actions & Officer Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              background: 'rgba(168, 85, 247, 0.1)'
            }}
            title="Kelola Peran Akun (RBAC)"
          >
            <ShieldAlert size={14} />
            <span>Kelola RBAC</span>
          </button>
        )}

        {/* Officer Active Session */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px',
          background: isSuperAdmin 
            ? 'rgba(168, 85, 247, 0.1)' 
            : isAdmin 
            ? 'rgba(0, 212, 255, 0.08)' 
            : 'rgba(34, 197, 94, 0.08)',
          border: `1px solid ${
            isSuperAdmin 
              ? 'rgba(168, 85, 247, 0.4)' 
              : isAdmin 
              ? 'rgba(0, 212, 255, 0.3)' 
              : 'rgba(34, 197, 94, 0.3)'
          }`,
          borderRadius: 'var(--radius-lg)',
          marginLeft: '4px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isSuperAdmin 
              ? 'linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)' 
              : isAdmin 
              ? 'linear-gradient(135deg, #00D4FF 0%, #3B82F6 100%)' 
              : 'linear-gradient(135deg, #22C55E 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '11.5px',
            color: '#060B18',
          }}>
            {officerInitials || 'P'}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {officerName}
            </div>
            <div style={{ fontSize: '10px', color: isSuperAdmin ? '#C084FC' : isAdmin ? 'var(--accent-cyan)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{officerJabatan}</span>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>• {officerNrp}</span>
              <span className={`badge ${isSuperAdmin ? 'badge-purple' : isAdmin ? 'badge-cyan' : 'badge-green'}`} style={{ fontSize: '8.5px', padding: '1px 4px' }}>
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
            style={{ padding: '7px 10px', color: 'var(--accent-red)' }}
            title="Keluar dari Sesi E-Mindik"
          >
            <LogOut size={15} />
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
