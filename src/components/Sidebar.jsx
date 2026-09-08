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
      badgeColor: 'badge-blue',
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
      badgeColor: 'badge-purple',
      roles: ['super_admin'], // KHUSUS SUPER ADMIN
    },
  ];

  // Strictly filter menu: only include items matching user's current role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="app-sidebar no-print" style={{
      width: '270px',
      background: 'var(--gradient-sidebar)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand Header with Official Logo */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {!logoFailed ? (
            <img
              src={logoImg}
              alt="Logo Sat Reskrim"
              onError={() => setLogoFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.4))',
              }}
            />
          ) : (
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(59, 130, 246, 0.2))',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-cyan)',
            }}>
              <ShieldCheck size={26} color="var(--accent-cyan)" />
            </div>
          )}
        </div>

        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontSize: '12.5px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}>
            E-MINDIK SATRESKRIM
          </div>
          <div style={{
            fontSize: '10px',
            color: 'var(--accent-cyan)',
            letterSpacing: '0.04em',
            fontWeight: 600,
            marginTop: '2px',
          }}>
            POLRES KOLAKA TIMUR
          </div>
        </div>
      </div>

      {/* Role & Security Status Bar */}
      <div style={{
        padding: '10px 18px',
        background: isSuperAdmin 
          ? 'rgba(168, 85, 247, 0.1)' 
          : isAdmin 
          ? 'rgba(0, 212, 255, 0.08)' 
          : 'rgba(34, 197, 94, 0.06)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSuperAdmin ? (
            <ShieldAlert size={14} color="#C084FC" />
          ) : isAdmin ? (
            <Shield size={14} color="var(--accent-cyan)" />
          ) : (
            <UserCheck size={14} color="var(--accent-green)" />
          )}
          <span style={{ 
            fontWeight: 700, 
            color: isSuperAdmin ? '#C084FC' : isAdmin ? 'var(--accent-cyan)' : 'var(--accent-green)' 
          }}>
            {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'ANGGOTA'}
          </span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
          SUPABASE
        </span>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '6px 12px',
        }}>
          Menu Akses ({isSuperAdmin ? 'Akses Penuh' : isAdmin ? 'Akses Admin' : 'Akses Anggota'})
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(0, 212, 255, 0.18) 0%, rgba(59, 130, 246, 0.08) 100%)' 
                  : 'transparent',
                border: isActive 
                  ? '1px solid var(--border-glass-hover)' 
                  : '1px solid transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 0 16px rgba(0, 212, 255, 0.12)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon 
                  size={18} 
                  color={isActive ? 'var(--accent-cyan)' : 'currentColor'} 
                />
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.01em',
                }}>
                  {item.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`badge ${item.badgeColor || 'badge-cyan'}`} style={{ fontSize: '10px' }}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={14} color="var(--accent-cyan)" />}
              </div>
            </button>
          );
        })}

        {/* Khusus Super Admin: Tombol Kelola Peran Pengguna (RBAC) */}
        {isSuperAdmin && onOpenUserManagement && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(168, 85, 247, 0.3)' }}>
            <button
              type="button"
              onClick={onOpenUserManagement}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#E9D5FF',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserCog size={17} color="#C084FC" />
                <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Kelola Peran (RBAC)</span>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '8.5px' }}>AKUN</span>
            </button>
          </div>
        )}
      </nav>

      {/* Quick Ops Banner */}
      <div style={{
        padding: '14px',
        margin: '12px',
        background: 'rgba(13, 21, 38, 0.6)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Radio size={14} color="var(--accent-cyan)" className="animate-pulse" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            MINDIK PRESISI
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
          Sistem terhubung real-time ke database Supabase & template Word (.docx).
        </p>
      </div>

      {/* Footer / Version */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-glass)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Satreskrim Polrestim &copy; 2026</span>
        <span className="mono">v2.1-RBAC</span>
      </div>
    </aside>
  );
}
