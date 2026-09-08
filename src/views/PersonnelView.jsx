import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Phone, 
  BadgeCheck,
  Shield,
  Clock,
  Radio
} from 'lucide-react';

export default function PersonnelView({ 
  cases = [], 
  personnel = [], 
  onAddPersonnel, 
  onDeletePersonnel,
  userRole = 'super_admin' 
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nama: '',
    pangkat: 'BRIPKA',
    nrp: '',
    jabatan: 'Penyidik Pembantu Unit 1',
    role: 'Penyidik',
    phone: '08',
    status: 'active',
  });

  const isSuperAdmin = userRole === 'super_admin';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nrp.trim()) {
      alert('Nama lengkap dan NRP wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddPersonnel) {
        await onAddPersonnel({
          ...formData,
          nama: formData.nama.trim(),
          nrp: formData.nrp.trim(),
        });
      }
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        nama: '',
        pangkat: 'BRIPKA',
        nrp: '',
        jabatan: 'Penyidik Pembantu Unit 1',
        role: 'Penyidik',
        phone: '08',
        status: 'active',
      });
    } catch (err) {
      alert(`Gagal menambah personel: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!personnelToDelete) return;
    setIsSubmitting(true);
    try {
      if (onDeletePersonnel) {
        await onDeletePersonnel(personnelToDelete.id);
      }
      setPersonnelToDelete(null);
    } catch (err) {
      alert(`Gagal menghapus personel: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} color="var(--accent-cyan)" />
            <span>Direktori Personel Penyidik Satreskrim</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Daftar pejabat dan penyidik aktif Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur terhubung Supabase.
          </p>
        </div>

        {isSuperAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={16} />
            <span>+ Tambah Personel Penyidik</span>
          </button>
        )}
      </div>

      {/* Grid of Personnel Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {personnel.map((p) => {
          // Count cases handled by this investigator
          const assignedCasesCount = cases.filter(c => 
            c.investigators?.some(inv => inv.user_id === p.id || inv.nrp === p.nrp)
          ).length;

          const isKasat = p.role === 'Kasat';
          const isKanit = p.role === 'Kanit';

          return (
            <div
              key={p.id || p.nrp}
              className="glass glass-hover"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isKasat && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'linear-gradient(135deg, #00D4FF, #3B82F6)',
                  color: '#060B18',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '3px 14px',
                  borderBottomLeftRadius: '8px',
                  letterSpacing: '0.05em',
                }}>
                  KOMANDO
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: isKasat 
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(59, 130, 246, 0.2))'
                    : isKanit
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'var(--bg-elevated)',
                  border: isKasat
                    ? '1px solid var(--accent-cyan)'
                    : isKanit
                    ? '1px solid var(--accent-green)'
                    : '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isKasat ? 'var(--accent-cyan)' : isKanit ? 'var(--accent-green)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '13px',
                }}>
                  {p.pangkat}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {p.nama}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '2px' }}>
                    {p.jabatan}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Nomor Registrasi (NRP):</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{p.nrp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kontak Telepon:</span>
                  <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{p.phone || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status Penugasan:</span>
                  <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'standby' ? 'badge-yellow' : 'badge-red'}`} style={{ fontSize: '10px' }}>
                    {p.status === 'active' ? 'SIAGA / AKTIF' : p.status === 'standby' ? 'STANDBY' : 'NON-AKTIF'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Perkara Ditangani:</span>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                    {assignedCasesCount} Perkara
                  </span>
                </div>
              </div>

              {/* Super Admin Actions */}
              {isSuperAdmin && !isKasat && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setPersonnelToDelete(p)}
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    title="Hapus Personel dari Supabase"
                  >
                    <Trash2 size={13} />
                    <span>Hapus Personel</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Tambah Personel Baru (Khusus Super Admin) */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(0, 212, 255, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserPlus size={18} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Registrasi Personel Penyidik Baru</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Simpan data penyidik ke database Supabase Satreskrim
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Nama Lengkap */}
                <div className="form-group">
                  <label className="form-label">
                    Nama Lengkap Beserta Gelar <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    placeholder="Contoh: BRIPKA ANGGA PRATAMA, S.H."
                    className="form-input"
                    required
                  />
                </div>

                {/* Pangkat & NRP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Pangkat</label>
                    <select
                      name="pangkat"
                      value={formData.pangkat}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="AKP">AKP</option>
                      <option value="IPTU">IPTU</option>
                      <option value="IPDA">IPDA</option>
                      <option value="AIPTU">AIPTU</option>
                      <option value="AIPDA">AIPDA</option>
                      <option value="BRIPKA">BRIPKA</option>
                      <option value="BRIGADIR">BRIGADIR</option>
                      <option value="BRIPTU">BRIPTU</option>
                      <option value="BRIPDA">BRIPDA</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      NRP <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="nrp"
                      value={formData.nrp}
                      onChange={handleChange}
                      placeholder="89010234"
                      className="form-input mono"
                      required
                    />
                  </div>
                </div>

                {/* Jabatan & Role */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Jabatan Dinas</label>
                    <input
                      type="text"
                      name="jabatan"
                      value={formData.jabatan}
                      onChange={handleChange}
                      placeholder="Penyidik Pembantu Unit 1"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Klasifikasi Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="Penyidik">Penyidik</option>
                      <option value="Kanit">Kanit</option>
                      <option value="KBO">KBO</option>
                      <option value="Banum">Banum / Bamin</option>
                      <option value="Kasat">Kasat</option>
                    </select>
                  </div>
                </div>

                {/* Nomor Telepon & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nomor Handphone / WA</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="081234567890"
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Penugasan</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="active">Aktif / Siaga</option>
                      <option value="standby">Standby</option>
                      <option value="inactive">Non-Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  <Check size={14} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan ke Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Personel (Pop-up Khusus Super Admin) */}
      {personnelToDelete && (
        <div className="modal-backdrop" onClick={() => setPersonnelToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px', borderColor: 'var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertTriangle size={18} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--accent-red)' }}>
                    Konfirmasi Hapus Personel
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Tindakan ini memerlukan otorisasi Super Admin
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setPersonnelToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menghapus data personel penyidik berikut dari database Supabase?
              </p>

              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                  {personnelToDelete.pangkat} {personnelToDelete.nama}
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  NRP: {personnelToDelete.nrp} • {personnelToDelete.jabatan}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setPersonnelToDelete(null)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={confirmDelete}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
                <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Personel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
