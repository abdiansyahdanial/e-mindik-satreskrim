import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  FolderLock, 
  FileSignature, 
  Archive, 
  Users, 
  ShieldCheck, 
  ChevronRight,
  FileCode,
  ShieldAlert,
  UserCheck,
  Shield,
  UserCog,
  Radio,
  FilePlus
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import './ExpandingSidebar.css';

/**
 * ExpandingSidebar Component
 * Adaptasi presisi dari spesifikasi CSS & JS modern:
 * - Skema Warna: Background #1b2229, Sidebar #ff352d, Hover #ff5740
 * - Dimensi Rail: 94px (tertutup) -> 290px (mengembang)
 * - Transisi: width 760ms cubic-bezier(0.2, 0.74, 0.18, 1)
 * - Hairline divider & Visual cutout pada ikon SVG
 * - Event handling adaptif untuk Desktop (hover/focus/Escape) & Touch (two-tap/click-outside)
 */
export default function ExpandingSidebar({
  activeTab,
  setActiveTab,
  caseCount = 0,
  docCount = 0,
  personnelCount = 0,
  dumasCount = 0,
  userRole = 'anggota',
  onOpenUserManagement
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const sidebarRef = useRef(null);
  const touchHandledRef = useRef(false);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';

  // 3-Tier RBAC Menu Items
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Taktis',
      icon: LayoutDashboard,
      badge: null,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'dumas',
      label: 'Input Dumas / Baru',
      icon: FilePlus,
      badge: dumasCount || null,
      badgeRed: true,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'cases',
      label: 'Berkas Perkara',
      icon: FolderLock,
      badge: caseCount || 0,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'generator',
      label: 'Generator Mindik',
      icon: FileSignature,
      badge: 'DOCX',
      badgeHighlight: true,
      roles: ['super_admin', 'admin', 'anggota'],
    },
    {
      id: 'archives',
      label: 'Arsip Dokumen',
      icon: Archive,
      badge: docCount || 0,
      roles: ['super_admin', 'admin', 'anggota'],

    },
    {
      id: 'personnel',
      label: 'Direktori Personel',
      icon: Users,
      badge: personnelCount || 0,
      roles: ['super_admin'], // Khusus Super Admin
    },
    {
      id: 'admin-templates',
      label: 'Template Studio',
      icon: FileCode,
      badge: 'STORAGE',
      badgePurple: true,
      roles: ['super_admin'], // Khusus Super Admin
    },
  ];

  // Filter menu strictly according to user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  // --- Keyboard & Click Outside Handlers ---
  useEffect(() => {
    // Escape key listener to close rail
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        if (sidebarRef.current && sidebarRef.current.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    };

    // Pointerdown outside sidebar to collapse
    const handlePointerDownOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDownOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isOpen]);

  // --- Desktop Hover & Focus Event Handlers ---
  const handlePointerEnter = useCallback((e) => {
    // Only expand via hover if the pointer is mouse/pen (desktop)
    if (e.pointerType !== 'touch') {
      setIsOpen(true);
    }
  }, []);

  const handlePointerLeave = useCallback((e) => {
    if (e.pointerType !== 'touch') {
      setIsOpen(false);
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback((e) => {
    // If the next focused element is outside the sidebar, collapse
    if (sidebarRef.current && !sidebarRef.current.contains(e.relatedTarget)) {
      setIsOpen(false);
    }
  }, []);

  // --- Touch & Click Interceptor (First Tap: Open, Second Tap: Select) ---
  const handleItemClick = (e, itemId) => {
    // If on a touch device and rail is closed, the first tap simply expands
    if (touchHandledRef.current && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    // Otherwise, perform navigation
    setActiveTab(itemId);
  };

  const handleItemPointerDown = (e) => {
    if (e.pointerType === 'touch') {
      touchHandledRef.current = true;
      if (!isOpen) {
        // First tap: expand sidebar
        setIsOpen(true);
      }
    } else {
      touchHandledRef.current = false;
    }
  };

  return (
    <>
      {/* Mobile Backdrop to close on tap outside */}
      <div 
        className={`es-backdrop ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={`expanding-sidebar no-print ${isOpen ? 'is-expanded' : ''}`}
        aria-expanded={isOpen}
        role="navigation"
        aria-label="Navigasi Utama Satreskrim"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {/* Brand Header */}
        <div className="es-header">
          <div className="es-brand-icon-wrap" title="Sat Reskrim Polres Kolaka Timur">
            {!logoFailed ? (
              <img
                src={logoImg}
                alt="Logo Sat Reskrim"
                className="es-brand-logo"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="es-brand-fallback">
                <ShieldCheck size={26} />
              </div>
            )}
          </div>

          <div className="es-brand-text">
            <span className="es-brand-title">E-Mindik Satreskrim</span>
            <span className="es-brand-subtitle">Polres Kolaka Timur</span>
          </div>
        </div>

        {/* Role & Security Status Bar */}
        <div className="es-role-bar">
          <div className="es-role-indicator">
            <div className={`es-role-dot ${isSuperAdmin ? 'super' : isAdmin ? 'admin' : ''}`} />
            <span className="es-role-label">
              {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN SATKER' : 'PENYIDIK ANGGOTA'}
            </span>
          </div>
          <span className="es-role-tag">PRESISI</span>
        </div>

        {/* Navigation List */}
        <ul className="es-nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id} className="es-nav-item">
                <button
                  type="button"
                  id={`nav-btn-${item.id}`}
                  className={`es-nav-btn ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onPointerDown={handleItemPointerDown}
                  onClick={(e) => handleItemClick(e, item.id)}
                  title={item.label}
                >
                  {/* Active Indicator Notch */}
                  {isActive && <div className="es-active-stripe" />}

                  {/* Visual Cutout Icon Container */}
                  <div className="es-icon-cutout">
                    <Icon className="es-svg-icon" />
                  </div>

                  {/* Text Label & Badges (Transition on expand) */}
                  <div className="es-content-wrap">
                    <span className="es-nav-label">{item.label}</span>

                    <div className="es-badge-wrap">
                      {item.badge !== null && item.badge !== undefined && (
                        <span 
                          className={`es-badge ${
                            item.badgeRed || item.badgeHighlight
                              ? 'highlight' 
                              : item.badgePurple 
                              ? 'purple' 
                              : ''
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight size={15} color="#ffffff" />}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Super Admin RBAC Management Action */}
        {isSuperAdmin && onOpenUserManagement && (
          <div className="es-admin-section">
            <button
              type="button"
              className="es-admin-btn"
              onClick={onOpenUserManagement}
              title="Kelola Peran (RBAC)"
            >
              <div className="es-admin-icon">
                <UserCog size={20} />
              </div>
              <div className="es-admin-text">
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Kelola Akun RBAC</span>
                <span className="es-badge purple" style={{ fontSize: '8px' }}>ADMIN</span>
              </div>
            </button>
          </div>
        )}

        {/* Footer / System Status */}
        <div className="es-footer">
          <div className="es-status-chip">
            <div className="es-pulse-dot" title="Sistem Real-Time Online" />
            <div className="es-footer-text">
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
                MINDIK PRESISI
              </div>
            </div>
          </div>
          <div className="es-footer-text">
            <div className="es-footer-copy">
              <span>Satreskrim Polrestim</span>
              <span className="es-footer-ver">v2.1</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
