import React, { useState } from 'react';
import { X, FolderPlus, Check, Shield, FileText } from 'lucide-react';
import { mockPersonnel } from '../data/mockPersonnel';

export default function CaseCreateModal({ onClose, onAddCase, personnel = [] }) {
  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nomor_lp: `LP/B/${Math.floor(Math.random() * 800 + 100)}/IX/2026/SPKT/POLRES KOLAKA TIMUR`,
    tanggal_lp: todayStr,
    nama_pelapor: '',
    nama_terlapor: '',
    tindak_pidana: '',
    dasar_pasal_uu: '',
    pasal: '',
    locus: 'Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
    tempus: '08 September 2026, Pukul 14.00 WITA',
    // Tim Penyidik
    investigator1: activePersonnel[0]?.id || 'usr-005',
    investigator2: activePersonnel[1]?.id || 'usr-006',
    investigator3: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-fill pasal jika dasar_pasal_uu diketik dan pasal masih kosong
      if (name === 'dasar_pasal_uu' && !prev.pasal) {
        updated.pasal = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nomor_lp || !formData.tindak_pidana || !formData.nama_pelapor) {
      alert('Mohon lengkapi data wajib: Nomor LP, Tindak Pidana, dan Nama Pelapor.');
      return;
    }

    setIsSubmitting(true);

    // Siapkan daftar penyidik yang ditugaskan
    const assignedSlots = [
      formData.investigator1,
      formData.investigator2,
      formData.investigator3
    ].filter(Boolean);

    const investigatorsList = assignedSlots.map((invId, idx) => {
      const found = activePersonnel.find((p) => p.id === invId || p.nrp === invId);
      return {
        user_id: invId,
        role_order: idx + 1,
        nama: found?.nama || 'Penyidik',
        pangkat: found?.pangkat || '',
        nrp: found?.nrp || '',
        jabatan: found?.jabatan || (idx === 0 ? 'Penyidik Pembantu' : 'Penyidik Pembantu')
      };
    });

    const newCase = {
      id: `case-${Date.now().toString().slice(-6)}`,
      // Standar kolom baru
      nomor_lp: formData.nomor_lp.trim(),
      tanggal_lp: formData.tanggal_lp,
      nama_pelapor: formData.nama_pelapor.trim(),
      nama_terlapor: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      tindak_pidana: formData.tindak_pidana.trim(),
      dasar_pasal_uu: formData.dasar_pasal_uu.trim(),
      pasal: formData.pasal.trim() || formData.dasar_pasal_uu.trim(),
      locus: formData.locus.trim(),
      tempus: formData.tempus.trim(),
      // Rantai rujukan nomor surat turunan disetel NULL karena belum diterbitkan saat awal LP
      no_sprin_sidik: null,
      no_spdp: null,
      no_p21_kn: null,
      // Kompatibilitas skema lama
      no_lp: formData.nomor_lp.trim(),
      pelapor_name: formData.nama_pelapor.trim(),
      terlapor_name: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      pasal_uu: formData.dasar_pasal_uu.trim(),
      sprin_val_date: '30 (tiga puluh) hari',
      sprin_loc: 'Tirawuta',
      sprin_date: formData.tanggal_lp,
      status: 'active',
      created_at: new Date().toISOString(),
      investigators: investigatorsList,
      person: {
        nama: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
        nik: '-',
        gender: 'Laki-laki',
        alamat: formData.locus.trim()
      },
      references: {
        no_sprin_sidik: '',
        no_spdp: '',
        no_p21_kn: ''
      }
    };

    try {
      if (onAddCase) {
        await onAddCase(newCase);
      }
      onClose();
    } catch (err) {
      alert(`Gagal menyimpan berkas perkara: ${err.message}`);
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
              <FolderPlus size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Pendaftaran Perkara Baru (Laporan Polisi)</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Formulir data dasar Laporan Polisi (Mindik Tahap Awal)
              </div>
            </div>
          </div>

          <button 
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Info Box Standarisasi */}
            <div style={{
              padding: '10px 14px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Shield size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
              <span>
                Nomor surat turunan (SP.Sidik, SPDP, SP.Kap, SP.Han) belum diterbitkan saat awal LP masuk. Nomor-nomor tersebut akan tercatat otomatis melalui <strong>Chain of Reference</strong> saat dokumen dibuat.
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
                  placeholder="Nama lengkap pelapor..."
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nama Terlapor (Cukup Nama Biasa)
                </label>
                <input
                  type="text"
                  name="nama_terlapor"
                  value={formData.nama_terlapor}
                  onChange={handleChange}
                  placeholder="Nama terlapor (atau 'Dalam Penyelidikan')"
                  className="form-input"
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  *Identitas yuridis lengkap diinput saat penetapan tersangka (SP.TAP.TSK).
                </span>
              </div>
            </div>

            {/* Baris 3: Tindak Pidana, Dasar Pasal UU, Pasal */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Tindak Pidana <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                name="tindak_pidana"
                value={formData.tindak_pidana}
                onChange={handleChange}
                placeholder="Contoh: Pencurian dengan Pemberatan"
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Dasar Pasal UU (Konsiderans Hukum) <span style={{ color: 'var(--accent-red)' }}>*</span>
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
                  Rumusan Pasal Disangkakan
                </label>
                <input
                  type="text"
                  name="pasal"
                  value={formData.pasal}
                  onChange={handleChange}
                  placeholder="Contoh: Pasal 363 KUHP"
                  className="form-input"
                />
              </div>
            </div>

            {/* Baris 4: Locus & Tempus */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Tempat Kejadian / Locus Delicti <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="locus"
                  value={formData.locus}
                  onChange={handleChange}
                  placeholder="Lokasi kejadian perkara..."
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Waktu Kejadian / Tempus Delicti <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="tempus"
                  value={formData.tempus}
                  onChange={handleChange}
                  placeholder="Waktu kejadian perkara..."
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Penugasan Tim Penyidik Satreskrim */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 212, 255, 0.04)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <label className="form-label" style={{ margin: 0, color: 'var(--accent-cyan)', fontWeight: 700 }}>
                PENUGASAN TIM PENYIDIK SATRESKRIM
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Penyidik 1 (Penyidik Utama) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <select
                    name="investigator1"
                    value={formData.investigator1}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    {activePersonnel.map((p) => (
                      <option key={p.id || p.nrp} value={p.id}>
                        {p.pangkat} {p.nama} ({p.jabatan || 'Penyidik'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Penyidik 2 (Penyidik Pembantu)
                  </label>
                  <select
                    name="investigator2"
                    value={formData.investigator2}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">-- Pilih Penyidik 2 --</option>
                    {activePersonnel.map((p) => (
                      <option key={p.id || p.nrp} value={p.id}>
                        {p.pangkat} {p.nama} ({p.jabatan || 'Penyidik'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              <Check size={14} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Daftarkan Laporan Polisi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
