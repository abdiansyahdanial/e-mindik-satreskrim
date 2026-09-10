import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CaseEditModal({ isOpen, caseItem, onClose, onSaveSuccess }) {
  if (!isOpen || !caseItem) return null;

  const [formData, setFormData] = useState({
    nomor_lp: '',
    tanggal_lp: '',
    nama_pelapor: '',
    nama_terlapor: '',
    tindak_pidana: '',
    dasar_pasal_uu: '',
    pasal: '',
    locus: '',
    tempus: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (caseItem) {
      // Determine initial date format (YYYY-MM-DD)
      let initialDate = caseItem.tanggal_lp || '';
      if (!initialDate && caseItem.created_at) {
        try {
          initialDate = new Date(caseItem.created_at).toISOString().split('T')[0];
        } catch {
          initialDate = '';
        }
      }

      setFormData({
        nomor_lp: caseItem.nomor_lp || caseItem.no_lp || '',
        tanggal_lp: initialDate,
        nama_pelapor: caseItem.nama_pelapor || caseItem.pelapor_name || '',
        nama_terlapor: caseItem.nama_terlapor || caseItem.terlapor_name || '',
        tindak_pidana: caseItem.tindak_pidana || '',
        dasar_pasal_uu: caseItem.dasar_pasal_uu || caseItem.pasal_uu || '',
        pasal: caseItem.pasal || caseItem.pasal_uu || '',
        locus: caseItem.locus || '',
        tempus: caseItem.tempus || '',
      });
      setErrorMessage(null);
    }
  }, [caseItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-sinkronisasi dasar_pasal_uu ke pasal jika pasal sebelumnya sama atau kosong
      if (name === 'dasar_pasal_uu' && (!prev.pasal || prev.pasal === prev.dasar_pasal_uu)) {
        updated.pasal = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nomor_lp.trim() || !formData.tindak_pidana.trim() || !formData.nama_pelapor.trim()) {
      setErrorMessage('Mohon lengkapi kolom wajib: Nomor LP, Tindak Pidana, dan Nama Pelapor.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const updatePayload = {
      nomor_lp: formData.nomor_lp.trim(),
      tanggal_lp: formData.tanggal_lp,
      nama_pelapor: formData.nama_pelapor.trim(),
      nama_terlapor: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      tindak_pidana: formData.tindak_pidana.trim(),
      dasar_pasal_uu: formData.dasar_pasal_uu.trim(),
      pasal: formData.pasal.trim() || formData.dasar_pasal_uu.trim(),
      locus: formData.locus.trim(),
      tempus: formData.tempus.trim(),
      // Kompatibilitas skema lama
      no_lp: formData.nomor_lp.trim(),
      pelapor_name: formData.nama_pelapor.trim(),
      terlapor_name: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      pasal_uu: formData.dasar_pasal_uu.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('cases')
        .update(updatePayload)
        .eq('id', caseItem.id);

      if (error) throw error;

      const mergedCase = {
        ...caseItem,
        ...updatePayload,
      };

      if (onSaveSuccess) {
        onSaveSuccess(mergedCase);
      }
      onClose();
    } catch (error) {
      console.error('Gagal memperbarui perkara:', error);
      setErrorMessage(`Terjadi kesalahan saat memperbarui perkara: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '780px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Edit3 size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Edit Data Berkas Perkara</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Perbarui data administrasi penyelidikan/penyidikan Laporan Polisi
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
            {errorMessage && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--accent-red)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12.5px',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Banner info */}
            <div style={{
              padding: '10px 14px',
              background: 'rgba(0, 212, 255, 0.06)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Shield size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              <span>
                Perubahan data perkara akan tersimpan langsung di database Supabase dan otomatis tersinkronisasi pada pembuatan dokumen mindik berikutnya.
              </span>
            </div>

            {/* Baris 1: Nomor LP & Tanggal LP */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nomor Laporan Polisi (LP) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="nomor_lp"
                  value={formData.nomor_lp}
                  onChange={handleChange}
                  placeholder="Contoh: LP/B/24/VIII/2026/SPKT/POLRES KOLAKA TIMUR"
                  className="form-input mono"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Tanggal LP <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="date"
                  name="tanggal_lp"
                  value={formData.tanggal_lp}
                  onChange={handleChange}
                  className="form-input mono"
                  required
                />
              </div>
            </div>

            {/* Baris 2: Pelapor & Terlapor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nama Pelapor / Korban <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="nama_pelapor"
                  value={formData.nama_pelapor}
                  onChange={handleChange}
                  placeholder="Nama lengkap saksi pelapor"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Terlapor / Tersangka</label>
                <input
                  type="text"
                  name="nama_terlapor"
                  value={formData.nama_terlapor}
                  onChange={handleChange}
                  placeholder="Nama terlapor (atau Dalam Penyelidikan)"
                  className="form-input"
                />
              </div>
            </div>

            {/* Baris 3: Tindak Pidana */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Tindak Pidana (Dugaan Kasus) <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                name="tindak_pidana"
                value={formData.tindak_pidana}
                onChange={handleChange}
                placeholder="Contoh: Pencurian dengan Pemberatan / Penipuan"
                className="form-input"
                required
              />
            </div>

            {/* Baris 4: Dasar Pasal UU & Rumusan Pasal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Dasar Pasal UU <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="dasar_pasal_uu"
                  value={formData.dasar_pasal_uu}
                  onChange={handleChange}
                  placeholder="Contoh: Pasal 363 ayat (1) ke-3 dan ke-4 KUHP"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Uraian / Rumusan Pasal <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="pasal"
                  value={formData.pasal}
                  onChange={handleChange}
                  placeholder="Contoh: Pasal 363 KUHP tentang Pencurian dengan Pemberatan"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Baris 5: Locus & Tempus Kejadian */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tempat Kejadian (Locus Delicti)</label>
                <input
                  type="text"
                  name="locus"
                  value={formData.locus}
                  onChange={handleChange}
                  placeholder="Contoh: Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Waktu Kejadian (Tempus Delicti)</label>
                <input
                  type="text"
                  name="tempus"
                  value={formData.tempus}
                  onChange={handleChange}
                  placeholder="Contoh: 15 Agustus 2026, Pukul 02.30 WITA"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
