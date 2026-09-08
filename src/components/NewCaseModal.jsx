import React, { useState } from 'react';
import { X, FolderPlus, Check } from 'lucide-react';
import { mockPersonnel } from '../data/mockPersonnel';

export default function NewCaseModal({ onClose, onAddCase, personnel = [] }) {
  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;

  const [formData, setFormData] = useState({
    no_lp: `LP/B/${Math.floor(Math.random() * 800 + 100)}/IX/2026/SPKT/POLRES KOLAKA TIMUR`,
    tindak_pidana: '',
    pasal_uu: '',
    pelapor_name: '',
    terlapor_name: '',
    locus: 'Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
    tempus: '08 September 2026, Pukul 14.00 WITA',
    nik: '',
    gender: 'Laki-laki',
    umur: '30 Tahun',
    pekerjaan: 'Swasta',
    agama: 'Islam',
    alamat: '',
    // 5 slots of investigators
    investigator1: activePersonnel[0]?.id || 'usr-005',
    investigator2: activePersonnel[1]?.id || 'usr-006',
    investigator3: '',
    investigator4: '',
    investigator5: '',
    sprin_val_date: '30 (tiga puluh) hari',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tindak_pidana || !formData.pasal_uu || !formData.pelapor_name) {
      alert('Mohon lengkapi data Tindak Pidana, Pasal UU, dan Nama Pelapor.');
      return;
    }

    setIsSubmitting(true);

    // Build assigned investigators list from slot 1 to 5
    const slots = [
      formData.investigator1,
      formData.investigator2,
      formData.investigator3,
      formData.investigator4,
      formData.investigator5
    ];

    const investigatorsList = [];
    slots.forEach((invId, idx) => {
      if (invId) {
        const found = activePersonnel.find(p => p.id === invId || p.nrp === invId);
        investigatorsList.push({
          user_id: invId,
          role_order: idx + 1,
          nama: found?.nama || 'Penyidik',
          pangkat: found?.pangkat || '',
          nrp: found?.nrp || '',
          jabatan: found?.jabatan || (idx === 0 ? 'Penyidik Utama' : 'Penyidik Pembantu')
        });
      }
    });

    const newCase = {
      id: `case-${Date.now().toString().slice(-6)}`,
      no_lp: formData.no_lp,
      tindak_pidana: formData.tindak_pidana,
      pasal_uu: formData.pasal_uu,
      pasal: `${formData.pasal_uu} tentang ${formData.tindak_pidana}`,
      locus: formData.locus,
      tempus: formData.tempus,
      pelapor_name: formData.pelapor_name,
      terlapor_name: formData.terlapor_name || 'Dalam Penyelidikan',
      sprin_val_date: formData.sprin_val_date,
      sprin_loc: 'Tirawuta',
      sprin_date: new Date().toISOString().split('T')[0],
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
      investigators: investigatorsList,
      person: {
        nama: formData.terlapor_name || 'Dalam Penyelidikan',
        nik: formData.nik || '74050xxxxxxxxxxx',
        gender: formData.gender,
        pob_dob: 'Kolaka Timur',
        umur: formData.umur,
        pekerjaan: formData.pekerjaan || 'Swasta',
        kewarganegaraan: 'Indonesia',
        pendidikan: 'SMA',
        agama: formData.agama,
        marital_status: 'Kawin',
        alamat: formData.alamat || formData.locus,
      },
      references: {
        no_sprin_sidik: '',
        no_sp_tap_tsk: '',
        no_sprin_kap: '',
        no_sprin_han: '',
        no_spdp: '',
      },
    };

    try {
      if (onAddCase) {
        await onAddCase(newCase);
      }
      onClose();
    } catch (err) {
      alert(`Gagal menyimpan perkara: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FolderPlus size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0 }}>Registrasi Berkas Perkara Baru (LP)</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Input Laporan Polisi & Penugasan Tim Penyidik Satreskrim ke Supabase
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
            {/* Nomor LP */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Nomor Laporan Polisi (LP) <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                name="no_lp"
                value={formData.no_lp}
                onChange={handleChange}
                className="form-input mono"
                required
              />
            </div>

            {/* Tindak Pidana & Pasal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Pasal UU yang Disangkakan <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="pasal_uu"
                  value={formData.pasal_uu}
                  onChange={handleChange}
                  placeholder="Contoh: Pasal 363 KUHP"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Pelapor & Terlapor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nama Pelapor / Korban <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="pelapor_name"
                  value={formData.pelapor_name}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Pelapor"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Terlapor / Tersangka</label>
                <input
                  type="text"
                  name="terlapor_name"
                  value={formData.terlapor_name}
                  onChange={handleChange}
                  placeholder="Nama Terlapor (atau 'Dalam Lidik')"
                  className="form-input"
                />
              </div>
            </div>

            {/* Identitas Terlapor Detail */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Identitas Tambahan Terlapor (Untuk Otomasi BAP/SPDP)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik}
                  onChange={handleChange}
                  placeholder="NIK (16 digit)"
                  className="form-input mono"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
                <input
                  type="text"
                  name="umur"
                  value={formData.umur}
                  onChange={handleChange}
                  placeholder="Umur (e.g. 35 Tahun)"
                  className="form-input"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
                <select
                  name="agama"
                  value={formData.agama}
                  onChange={handleChange}
                  className="form-select"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                </select>
              </div>

              <input
                type="text"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Alamat domisili tersangka/terlapor..."
                className="form-input"
                style={{ fontSize: '12px', padding: '6px 10px' }}
              />
            </div>

            {/* Locus & Tempus */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Tempat Kejadian Perkara (Locus) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="locus"
                  value={formData.locus}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Waktu Kejadian (Tempus) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="tempus"
                  value={formData.tempus}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Slot Tim Penyidik 1 s/d 5 (Dinamis dari Supabase) */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 212, 255, 0.04)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0, color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  PENUGASAN TIM PENYIDIK (SLOT 1 S/D 5 DINAMIS)
                </label>
                <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                  {activePersonnel.length} Personel Tersedia
                </span>
              </div>

              {/* Slot 1 & Slot 2 */}
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
                        {p.pangkat} {p.nama} (NRP: {p.nrp})
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
                        {p.pangkat} {p.nama} (NRP: {p.nrp})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot 3, 4, 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Penyidik 3 (Opsional)</label>
                  <select
                    name="investigator3"
                    value={formData.investigator3}
                    onChange={handleChange}
                    className="form-select"
                    style={{ fontSize: '12px' }}
                  >
                    <option value="">-- Kosong --</option>
                    {activePersonnel.map((p) => (
                      <option key={p.id || p.nrp} value={p.id}>
                        {p.pangkat} {p.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Penyidik 4 (Opsional)</label>
                  <select
                    name="investigator4"
                    value={formData.investigator4}
                    onChange={handleChange}
                    className="form-select"
                    style={{ fontSize: '12px' }}
                  >
                    <option value="">-- Kosong --</option>
                    {activePersonnel.map((p) => (
                      <option key={p.id || p.nrp} value={p.id}>
                        {p.pangkat} {p.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Penyidik 5 (Opsional)</label>
                  <select
                    name="investigator5"
                    value={formData.investigator5}
                    onChange={handleChange}
                    className="form-select"
                    style={{ fontSize: '12px' }}
                  >
                    <option value="">-- Kosong --</option>
                    {activePersonnel.map((p) => (
                      <option key={p.id || p.nrp} value={p.id}>
                        {p.pangkat} {p.nama}
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
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perkara ke Supabase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
