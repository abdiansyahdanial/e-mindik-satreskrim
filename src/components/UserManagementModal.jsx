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
  Key
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function UserManagementModal({ isOpen, onClose, currentUserId }) {
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
        style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid #A855F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={20} color="#C084FC" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Manajemen Hak Akses & Peran Akun (RBAC)</span>
                <span className="badge badge-purple" style={{ fontSize: '9px' }}>SUPER ADMIN</span>
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Tentukan tingkatan peran: 'super_admin' (Pemilik), 'admin' (Hapus Perkara), atau 'anggota' (Default)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              onClick={fetchProfiles} 
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Segarkan daftar pengguna"
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

        {/* Alert / Notice */}
        {message && (
          <div style={{
            margin: '16px 20px 0',
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

        {/* Role Explainer Card */}
        <div style={{
          margin: '16px 20px 0',
          padding: '12px 14px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
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
              Peran default. Input LP baru & jalankan generator. Dilarang menghapus.
            </p>
          </div>
        </div>

        {/* Body User List */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div>Memuat data akun terdaftar dari Supabase...</div>
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              Tidak ada profil akun yang ditemukan di tabel public.profiles.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profiles.map((p) => {
                const isSelf = p.id === currentUserId;
                const isSuper = p.role === 'super_admin';
                const isAdmin = p.role === 'admin';
                const isAnggota = p.role === 'anggota' || (!isSuper && !isAdmin);

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
                        disabled={savingId === p.id}
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
