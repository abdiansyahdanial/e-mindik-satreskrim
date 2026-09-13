import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle,
  Shield,
  Key,
  Clock,
  UserX,
  Phone,
  Mail,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendAccountApprovedEmail } from '../services/emailService';

export default function UserManagementModal({ isOpen, onClose, currentUserId }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'rbac'
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setMessage({ type: 'error', text: `Gagal memuat profil akun: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  // Separate pending from active profiles
  const pendingProfiles = profiles.filter(p => 
    p.status === 'pending' || 
    p.role === 'pending' || 
    (!p.status && p.role === 'penyidik' && p.role !== 'super_admin' && p.role !== 'admin' && p.role !== 'anggota')
  );

  const activeProfiles = profiles.filter(p => !pendingProfiles.some(pp => pp.id === p.id));

  // Automatically switch tab if there are pending users initially
  useEffect(() => {
    if (isOpen && profiles.length > 0) {
      if (pendingProfiles.length > 0) {
        setActiveTab('pending');
      } else {
        setActiveTab('rbac');
      }
    }
  }, [isOpen, profiles.length]);

  // 1. Setujui Akun Penyidik
  const handleApproveUser = async (profile) => {
    setSavingId(profile.id);
    setMessage(null);
    try {
      // Non-destructive update in public.profiles
      let updatePayload = {
        role: 'anggota',
      };
      
      // Try including status: 'active'
      const { error: err1 } = await supabase
        .from('profiles')
        .update({ role: 'anggota', status: 'active' })
        .eq('id', profile.id);

      if (err1) {
        // Fallback if status column doesn't exist on profiles
        const { error: err2 } = await supabase
          .from('profiles')
          .update({ role: 'anggota' })
          .eq('id', profile.id);
        if (err2) throw err2;
      }

      // Update in-memory state
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: 'anggota', status: 'active' } : p));

      // Kirim email notifikasi aktivasi ke penyidik (non-blocking)
      const officerData = {
        nama: profile.full_name || profile.nama || 'Penyidik',
        pangkat: profile.pangkat || 'BRIPKA',
        nrp: profile.rank_nrp || profile.nrp || '-',
        jabatan: profile.jabatan || 'Penyidik Pembantu',
        satker: profile.satker || 'Satreskrim Polres Kolaka Timur',
        unit: profile.unit || 'Satreskrim',
        email: profile.email || ''
      };
      sendAccountApprovedEmail(officerData);

      setMessage({ 
        type: 'success', 
        text: `Akun ${profile.full_name || 'Penyidik'} berhasil disetujui! Email aktivasi telah dikirimkan.` 
      });
    } catch (err) {
      console.error('Error approving user:', err);
      setMessage({ type: 'error', text: `Gagal menyetujui akun: ${err.message}` });
    } finally {
      setSavingId(null);
    }
  };

  // 2. Tolak Akun Penyidik
  const handleRejectUser = async (profile) => {
    const confirmReject = window.confirm(`Apakah Anda yakin ingin menolak permohonan pendaftaran personel ${profile.full_name || ''}?`);
    if (!confirmReject) return;

    setSavingId(profile.id);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'rejected' })
        .eq('id', profile.id);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: 'rejected', status: 'rejected' } : p));
      setMessage({ type: 'success', text: `Pendaftaran akun ${profile.full_name} telah ditolak.` });
    } catch (err) {
      console.error('Error rejecting user:', err);
      setMessage({ type: 'error', text: `Gagal menolak akun: ${err.message}` });
    } finally {
      setSavingId(null);
    }
  };

  // 3. Ubah Role RBAC untuk Akun Aktif
  const handleRoleChange = async (userId, newRole) => {
    setSavingId(userId);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      setMessage({ type: 'success', text: `Peran akun berhasil diubah menjadi '${newRole}'!` });
    } catch (err) {
      console.error('Error updating role:', err);
      setMessage({ type: 'error', text: `Gagal memperbarui peran: ${err.message}` });
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '720px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid #A855F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={22} color="#C084FC" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Manajemen Personel & Verifikasi Kedinasan</span>
                <span className="badge badge-purple" style={{ fontSize: '9px' }}>SUPER ADMIN</span>
              </h3>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Verifikasi pendaftar baru dan kelola hak akses peran RBAC Satreskrim
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              onClick={fetchProfiles} 
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Segarkan data pendaftar"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Pending Approval vs RBAC Management */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(6, 11, 24, 0.4)',
          padding: '0 20px'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('pending'); setMessage(null); }}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '2px solid #F59E0B' : '2px solid transparent',
              color: activeTab === 'pending' ? '#FCD34D' : 'var(--text-secondary)',
              fontWeight: activeTab === 'pending' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={15} color={activeTab === 'pending' ? '#F59E0B' : 'currentColor'} />
            <span>Verifikasi Pendaftar Baru</span>
            {pendingProfiles.length > 0 && (
              <span style={{
                background: '#F59E0B',
                color: '#000',
                borderRadius: '12px',
                padding: '2px 7px',
                fontSize: '10px',
                fontWeight: 800
              }}>
                {pendingProfiles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('rbac'); setMessage(null); }}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'rbac' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'rbac' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'rbac' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={15} color={activeTab === 'rbac' ? 'var(--accent-cyan)' : 'currentColor'} />
            <span>Hak Akses Akun Aktif (RBAC)</span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFF',
              borderRadius: '12px',
              padding: '2px 7px',
              fontSize: '10px'
            }}>
              {activeProfiles.length}
            </span>
          </button>
        </div>

        {/* Alert / Notice */}
        {message && (
          <div style={{
            margin: '14px 20px 0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12.5px',
            color: '#FFF',
          }}>
            {message.type === 'success' ? <Check size={16} color="var(--accent-green)" /> : <AlertCircle size={16} color="var(--accent-red)" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div>Memuat data profil akun dari Supabase...</div>
            </div>
          ) : activeTab === 'pending' ? (
            /* TAB 1: VERIFIKASI PENDAFTAR BARU (PENDING) */
            pendingProfiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={40} color="var(--accent-green)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                <div style={{ color: '#FFF', fontWeight: 600, fontSize: '14px' }}>Tidak Ada Pendaftar Menunggu Verifikasi</div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#94A3B8' }}>
                  Seluruh personel yang mendaftar telah ditinjau dan diverifikasi.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: '#FCD34D'
                }}>
                  Menampilkan <strong>{pendingProfiles.length} personel baru</strong> yang mendaftar dan membutuhkan persetujuan Super Admin untuk dapat mengakses sistem e-Mindik.
                </div>

                {pendingProfiles.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>
                            {p.full_name || p.nama || 'Personel Baru'}
                          </span>
                          <span className="badge badge-yellow" style={{ fontSize: '9px', fontWeight: 700 }}>
                            MENUNGGU PERSETUJUAN
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Terdaftar: {new Date(p.created_at).toLocaleString('id-ID')} WITA
                        </div>
                      </div>

                      {/* Tombol Aksi Super Admin */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleApproveUser(p)}
                          disabled={savingId === p.id}
                          className="btn btn-primary btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                            border: '1px solid #22C55E',
                            color: '#FFF',
                            fontWeight: 700,
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          {savingId === p.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>Setujui Akun</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectUser(p)}
                          disabled={savingId === p.id}
                          className="btn btn-secondary btn-sm"
                          style={{
                            color: 'var(--accent-red)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserX size={14} />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </div>

                    {/* Detail Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px',
                      background: 'rgba(6, 11, 24, 0.6)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px'
                    }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>PANGKAT & NRP:</span>
                        <strong style={{ color: '#FFF' }}>{p.pangkat || '-'}</strong> • <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{p.rank_nrp || p.nrp || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>JABATAN & UNIT:</span>
                        <span style={{ color: '#CBD5E1' }}>{p.jabatan || 'Penyidik Pembantu'} {p.unit ? `(${p.unit})` : ''}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>SATUAN KERJA:</span>
                        <span style={{ color: '#CBD5E1' }}>{p.satker || 'Satreskrim Polres Kolaka Timur'}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>EMAIL LOGIN:</span>
                        <span style={{ color: '#CBD5E1' }}>{p.email || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>NO. HP / WA:</span>
                        <span style={{ color: '#CBD5E1' }}>{p.phone || p.no_hp || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* TAB 2: MANAJEMEN ROLE RBAC (AKUN AKTIF) */
            <div>
              {/* Role Explainer Card */}
              <div style={{
                padding: '12px 14px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <div>
                  <strong style={{ color: '#C084FC' }}>1. Super Admin</strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                    Akses mutlak ke seluruh modul + Manajemen Akun RBAC + Template Studio.
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--accent-cyan)' }}>2. Admin</strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                    Akses Mindik, Berkas, & wewenang khusus HAPUS berkas perkara.
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--accent-green)' }}>3. Anggota</strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                    Peran default. Input LP baru & jalankan generator mindik.
                  </p>
                </div>
              </div>

              {activeProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  Tidak ada akun aktif yang terdaftar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeProfiles.map((p) => {
                    const isSelf = p.id === currentUserId;
                    const isSuper = p.role === 'super_admin';
                    const isAdmin = p.role === 'admin';

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--bg-secondary)',
                          border: isSelf ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#FFF' }}>
                              {p.full_name || p.nama || 'Personel Satreskrim'}
                            </span>
                            {isSelf && (
                              <span className="badge badge-cyan" style={{ fontSize: '9px' }}>
                                AKUN ANDA
                              </span>
                            )}
                            <span className={`badge ${isSuper ? 'badge-purple' : isAdmin ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '9.5px' }}>
                              {isSuper ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'ANGGOTA'}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span className="mono">{p.rank_nrp || p.nrp || p.email || p.id.slice(0, 13)}</span>
                            {p.created_at && (
                              <span> • Terdaftar: {new Date(p.created_at).toLocaleDateString('id-ID')}</span>
                            )}
                          </div>
                        </div>

                        {/* Role Selector Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={p.role || 'anggota'}
                            disabled={savingId === p.id || isSelf}
                            onChange={(e) => handleRoleChange(p.id, e.target.value)}
                            className="form-select"
                            style={{
                              fontSize: '11.5px',
                              padding: '6px 10px',
                              width: '140px',
                              borderColor: isSuper ? '#A855F7' : isAdmin ? 'var(--accent-cyan)' : 'var(--border-glass)'
                            }}
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="anggota">Anggota</option>
                          </select>

                          {savingId === p.id && (
                            <RefreshCw size={14} className="animate-spin" color="var(--accent-cyan)" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', padding: '12px 20px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary btn-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
