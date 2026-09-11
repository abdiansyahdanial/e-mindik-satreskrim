import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, Shield, AlertCircle, Award, Users, Plus, Trash2, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { mockPersonnel } from '../data/mockPersonnel';

export default function CaseEditModal({ isOpen, caseItem, onClose, onSaveSuccess, personnel = [] }) {
  if (!isOpen || !caseItem) return null;

  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;

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

    // Bagian A: Data Kasat Reskrim
    kasat_nama: '',
    kasat_pangkat: '',
    kasat_nrp: '',

    // Bagian B: Data Tim Penyidik 1 s.d. 5
    penyidik_penangan_index: 1, // Default ke Penyidik 1

    penyidik_1_nama: '',
    penyidik_1_pangkat: '',
    penyidik_1_nrp: '',
    penyidik_1_jabatan: '',

    penyidik_2_nama: '',
    penyidik_2_pangkat: '',
    penyidik_2_nrp: '',
    penyidik_2_jabatan: '',

    penyidik_3_nama: '',
    penyidik_3_pangkat: '',
    penyidik_3_nrp: '',
    penyidik_3_jabatan: '',

    penyidik_4_nama: '',
    penyidik_4_pangkat: '',
    penyidik_4_nrp: '',
    penyidik_4_jabatan: '',

    penyidik_5_nama: '',
    penyidik_5_pangkat: '',
    penyidik_5_nrp: '',
    penyidik_5_jabatan: '',
  });

  const [activeSlotsCount, setActiveSlotsCount] = useState(2);
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

      // Default Kasat fallback jika belum ada di data case
      const fallbackKasat = activePersonnel.find(
        (p) => p.role === 'Kasat' || (p.jabatan || '').toUpperCase().includes('KASAT')
      ) || activePersonnel[0];

      // Default Kanit fallback jika belum ada di data case
      const fallbackKanit = activePersonnel.find(
        (p) => p.role === 'Kanit' || (p.jabatan || '').toUpperCase().includes('KANIT')
      ) || activePersonnel[1] || activePersonnel[0];

      const invList = Array.isArray(caseItem.investigators) ? caseItem.investigators : [];

      // 1. Ekstrak index penyidik penangan dari semua sumber potensial
      let initialPenanganIdx = 1;
      if (caseItem.penyidik_penangan_index) {
        initialPenanganIdx = Number(caseItem.penyidik_penangan_index);
      } else if (caseItem.references?.penyidik_penangan_index) {
        initialPenanganIdx = Number(caseItem.references.penyidik_penangan_index);
      } else if (caseItem.references?.penyidik_penangan?.index) {
        initialPenanganIdx = Number(caseItem.references.penyidik_penangan.index);
      } else if (caseItem.penyidik_penangan?.index) {
        initialPenanganIdx = Number(caseItem.penyidik_penangan.index);
      } else if (invList.length > 0) {
        const foundInv = invList.find((inv) => inv.is_penangan === true || inv.is_penangan === 'true' || inv.is_penangan === 1);
        if (foundInv) {
          initialPenanganIdx = Number(foundInv.role_order) || (invList.indexOf(foundInv) + 1);
        }
      }
      if (!initialPenanganIdx || initialPenanganIdx < 1 || initialPenanganIdx > 5) {
        initialPenanganIdx = 1;
      }

      // 2. Hitung slot aktif awal agar slot terpilih (misal Slot 4) selalu tampil di UI
      let maxActiveSlot = Math.max(2, initialPenanganIdx);
      for (let i = 3; i <= 5; i++) {
        const invSlot = invList.find((inv) => Number(inv.role_order) === i);
        if (caseItem[`penyidik_${i}_nama`] || invSlot?.nama) {
          maxActiveSlot = Math.max(maxActiveSlot, i);
        }
      }
      setActiveSlotsCount(maxActiveSlot);

      // Helper untuk mengambil data slot spesifik
      const getSlotData = (slotNum) => {
        const inv = invList.find((i) => Number(i.role_order) === slotNum);
        return {
          nama: caseItem[`penyidik_${slotNum}_nama`] || inv?.nama || '',
          pangkat: caseItem[`penyidik_${slotNum}_pangkat`] || inv?.pangkat || '',
          nrp: caseItem[`penyidik_${slotNum}_nrp`] || inv?.nrp || '',
          jabatan: caseItem[`penyidik_${slotNum}_jabatan`] || inv?.jabatan || (slotNum === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU'),
        };
      };

      const s1 = getSlotData(1);
      const s2 = getSlotData(2);
      const s3 = getSlotData(3);
      const s4 = getSlotData(4);
      const s5 = getSlotData(5);

      if (!s1.nama) {
        s1.nama = fallbackKanit?.nama || '';
        s1.pangkat = fallbackKanit?.pangkat || '';
        s1.nrp = fallbackKanit?.nrp || '';
      }

      setFormData({
        penyidik_penangan_index: initialPenanganIdx,
        nomor_lp: caseItem.nomor_lp || caseItem.no_lp || '',
        tanggal_lp: initialDate,
        nama_pelapor: caseItem.nama_pelapor || caseItem.pelapor_name || '',
        nama_terlapor: caseItem.nama_terlapor || caseItem.terlapor_name || '',
        tindak_pidana: caseItem.tindak_pidana || '',
        dasar_pasal_uu: caseItem.dasar_pasal_uu || caseItem.pasal_uu || '',
        pasal: caseItem.pasal || caseItem.pasal_uu || '',
        locus: caseItem.locus || '',
        tempus: caseItem.tempus || '',

        // Data Kasat Reskrim
        kasat_nama: caseItem.kasat_nama || fallbackKasat?.nama || '',
        kasat_pangkat: caseItem.kasat_pangkat || fallbackKasat?.pangkat || '',
        kasat_nrp: caseItem.kasat_nrp || fallbackKasat?.nrp || '',

        // Data Penyidik 1 (Wajib)
        penyidik_1_nama: s1.nama,
        penyidik_1_pangkat: s1.pangkat,
        penyidik_1_nrp: s1.nrp,
        penyidik_1_jabatan: s1.jabatan,

        // Data Penyidik 2 s.d. 5 (Opsional)
        penyidik_2_nama: s2.nama,
        penyidik_2_pangkat: s2.pangkat,
        penyidik_2_nrp: s2.nrp,
        penyidik_2_jabatan: s2.jabatan,

        penyidik_3_nama: s3.nama,
        penyidik_3_pangkat: s3.pangkat,
        penyidik_3_nrp: s3.nrp,
        penyidik_3_jabatan: s3.jabatan,

        penyidik_4_nama: s4.nama,
        penyidik_4_pangkat: s4.pangkat,
        penyidik_4_nrp: s4.nrp,
        penyidik_4_jabatan: s4.jabatan,

        penyidik_5_nama: s5.nama,
        penyidik_5_pangkat: s5.pangkat,
        penyidik_5_nrp: s5.nrp,
        penyidik_5_jabatan: s5.jabatan,
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

  const handleQuickFillKasat = (personId) => {
    if (!personId) return;
    const p = activePersonnel.find((item) => item.id === personId || item.nrp === personId);
    if (p) {
      setFormData((prev) => ({
        ...prev,
        kasat_nama: p.nama || '',
        kasat_pangkat: p.pangkat || '',
        kasat_nrp: p.nrp || '',
      }));
    }
  };

  const handleQuickFillPenyidik = (slotIndex, personId) => {
    if (!personId) {
      setFormData((prev) => ({
        ...prev,
        [`penyidik_${slotIndex}_nama`]: '',
        [`penyidik_${slotIndex}_pangkat`]: '',
        [`penyidik_${slotIndex}_nrp`]: '',
        [`penyidik_${slotIndex}_jabatan`]: slotIndex === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU',
      }));
      return;
    }
    const p = activePersonnel.find((item) => item.id === personId || item.nrp === personId);
    if (p) {
      setFormData((prev) => ({
        ...prev,
        [`penyidik_${slotIndex}_nama`]: p.nama || '',
        [`penyidik_${slotIndex}_pangkat`]: p.pangkat || '',
        [`penyidik_${slotIndex}_nrp`]: p.nrp || '',
        [`penyidik_${slotIndex}_jabatan`]: p.jabatan || (slotIndex === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU'),
      }));
    }
  };

  const handleResetSlot = (slotIndex) => {
    setFormData((prev) => ({
      ...prev,
      [`penyidik_${slotIndex}_nama`]: '',
      [`penyidik_${slotIndex}_pangkat`]: '',
      [`penyidik_${slotIndex}_nrp`]: '',
      [`penyidik_${slotIndex}_jabatan`]: slotIndex === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nomor_lp.trim() || !formData.tindak_pidana.trim() || !formData.nama_pelapor.trim()) {
      setErrorMessage('Mohon lengkapi kolom wajib: Nomor LP, Tindak Pidana, dan Nama Pelapor.');
      return;
    }

    if (!formData.kasat_nama.trim() || !formData.kasat_pangkat.trim() || !formData.kasat_nrp.trim()) {
      setErrorMessage('Mohon lengkapi data Kasat Reskrim: Nama, Pangkat, dan NRP.');
      return;
    }

    if (
      !formData.penyidik_1_nama.trim() ||
      !formData.penyidik_1_pangkat.trim() ||
      !formData.penyidik_1_nrp.trim() ||
      !formData.penyidik_1_jabatan.trim()
    ) {
      setErrorMessage('Mohon lengkapi data Penyidik 1 / Kanit (Penyidik Utama / Yang Menerima Perintah).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const penanganIdx = Number(formData.penyidik_penangan_index) || 1;
    const penanganNama = formData[`penyidik_${penanganIdx}_nama`]?.trim() || formData.penyidik_1_nama.trim();
    const penanganPangkat = formData[`penyidik_${penanganIdx}_pangkat`]?.trim() || formData.penyidik_1_pangkat.trim();
    const penanganNrp = formData[`penyidik_${penanganIdx}_nrp`]?.trim() || formData.penyidik_1_nrp.trim();
    const penanganJabatan = formData[`penyidik_${penanganIdx}_jabatan`]?.trim() || (penanganIdx === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU');

    // Siapkan daftar investigators untuk kompatibilitas tampilan dan generator
    const investigatorsList = [1, 2, 3, 4, 5]
      .filter((num) => formData[`penyidik_${num}_nama`]?.trim())
      .map((num) => ({
        role_order: num,
        nama: formData[`penyidik_${num}_nama`].trim(),
        pangkat: formData[`penyidik_${num}_pangkat`]?.trim() || '',
        nrp: formData[`penyidik_${num}_nrp`]?.trim() || '',
        jabatan: formData[`penyidik_${num}_jabatan`]?.trim() || (num === 1 ? 'Kanit' : 'Penyidik Pembantu'),
        is_penangan: num === penanganIdx,
      }));

    // Simpan ke references JSONB yang terbukti aman di Supabase
    const existingReferences = (caseItem.references && typeof caseItem.references === 'object') ? caseItem.references : {};
    const updatedReferences = {
      ...existingReferences,
      penyidik_penangan_index: penanganIdx,
      penyidik_penangan: {
        index: penanganIdx,
        nama: penanganNama,
        pangkat: penanganPangkat,
        nrp: penanganNrp,
        jabatan: penanganJabatan,
      },
    };

    const basePayload = {
      nomor_lp: formData.nomor_lp.trim(),
      tanggal_lp: formData.tanggal_lp,
      nama_pelapor: formData.nama_pelapor.trim(),
      nama_terlapor: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      tindak_pidana: formData.tindak_pidana.trim(),
      dasar_pasal_uu: formData.dasar_pasal_uu.trim(),
      pasal: formData.pasal.trim() || formData.dasar_pasal_uu.trim(),
      locus: formData.locus.trim(),
      tempus: formData.tempus.trim(),

      // A. Data Kasat Reskrim
      kasat_nama: formData.kasat_nama.trim(),
      kasat_pangkat: formData.kasat_pangkat.trim(),
      kasat_nrp: formData.kasat_nrp.trim(),

      // B. Data Tim Penyidik 1 s.d. 5
      penyidik_1_nama: formData.penyidik_1_nama.trim(),
      penyidik_1_pangkat: formData.penyidik_1_pangkat.trim(),
      penyidik_1_nrp: formData.penyidik_1_nrp.trim(),
      penyidik_1_jabatan: formData.penyidik_1_jabatan.trim(),

      penyidik_2_nama: formData.penyidik_2_nama?.trim() || null,
      penyidik_2_pangkat: formData.penyidik_2_pangkat?.trim() || null,
      penyidik_2_nrp: formData.penyidik_2_nrp?.trim() || null,
      penyidik_2_jabatan: formData.penyidik_2_jabatan?.trim() || null,

      penyidik_3_nama: formData.penyidik_3_nama?.trim() || null,
      penyidik_3_pangkat: formData.penyidik_3_pangkat?.trim() || null,
      penyidik_3_nrp: formData.penyidik_3_nrp?.trim() || null,
      penyidik_3_jabatan: formData.penyidik_3_jabatan?.trim() || null,

      penyidik_4_nama: formData.penyidik_4_nama?.trim() || null,
      penyidik_4_pangkat: formData.penyidik_4_pangkat?.trim() || null,
      penyidik_4_nrp: formData.penyidik_4_nrp?.trim() || null,
      penyidik_4_jabatan: formData.penyidik_4_jabatan?.trim() || null,

      penyidik_5_nama: formData.penyidik_5_nama?.trim() || null,
      penyidik_5_pangkat: formData.penyidik_5_pangkat?.trim() || null,
      penyidik_5_nrp: formData.penyidik_5_nrp?.trim() || null,
      penyidik_5_jabatan: formData.penyidik_5_jabatan?.trim() || null,

      investigators: investigatorsList,
      references: updatedReferences,

      // Kompatibilitas skema lama
      no_lp: formData.nomor_lp.trim(),
      pelapor_name: formData.nama_pelapor.trim(),
      terlapor_name: formData.nama_terlapor.trim() || 'Dalam Penyelidikan',
      pasal_uu: formData.dasar_pasal_uu.trim(),
      updated_at: new Date().toISOString(),
    };

    const fullPayload = {
      ...basePayload,
      penyidik_penangan_index: penanganIdx,
      penyidik_penangan_nama: penanganNama,
      penyidik_penangan_pangkat: penanganPangkat,
      penyidik_penangan_nrp: penanganNrp,
      penyidik_penangan_jabatan: penanganJabatan,
      penyidik_penangan: {
        index: penanganIdx,
        nama: penanganNama,
        pangkat: penanganPangkat,
        nrp: penanganNrp,
        jabatan: penanganJabatan,
      },
    };

    try {
      let { error } = await supabase
        .from('cases')
        .update(fullPayload)
        .eq('id', caseItem.id);

      // Resilient Fallback: Jika tabel cases belum memiliki kolom dedicated penyidik_penangan_index (PGRST204)
      if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('schema cache')))) {
        console.warn('PGRST204: Kolom dedicated belum ada di schema cases Supabase, menyimpan ke investigators & references JSONB...');
        const retryResult = await supabase
          .from('cases')
          .update(basePayload)
          .eq('id', caseItem.id);
        error = retryResult.error;
      }

      if (error) throw error;

      const mergedCase = {
        ...caseItem,
        ...fullPayload,
        references: updatedReferences,
        investigators: investigatorsList,
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
        style={{ maxWidth: '850px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Edit Data Berkas Perkara</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Perbarui data administrasi LP dan Tim Penandatangan Mindik
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
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '75vh',
              overflowY: 'auto',
              paddingRight: '6px',
            }}
          >
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--accent-red)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Banner info */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(0, 212, 255, 0.06)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Shield size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              <span>
                Perubahan data perkara akan tersimpan langsung di database Supabase dan otomatis tersinkronisasi pada pembuatan dokumen mindik berikutnya.
              </span>
            </div>

            {/* SECTION 1: DATA LAPORAN POLISI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.5px' }}>
                1. IDENTITAS DASAR LAPORAN POLISI
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
                    placeholder="Contoh: Pasal 363 KUHP tentang Pencurian"
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

            {/* SECTION 2: PEJABAT & TIM PENYIDIK */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    2. PEJABAT & TIM PENYIDIK PENANDATANGAN MINDIK
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Kolom tabel cases: <code>kasat_*</code> & <code>penyidik_1..5_*</code>
                </span>
              </div>

              {/* A. Data Kasat Reskrim */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(0, 212, 255, 0.04)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(0, 212, 255, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <label className="form-label" style={{ margin: 0, color: '#FFF', fontWeight: 700, fontSize: '12px' }}>
                    A. Data Kasat Reskrim (Atasan Penyidik / Yang Memberi Perintah)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pilih dari Personel:</span>
                    <select
                      onChange={(e) => handleQuickFillKasat(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '11px', padding: '3px 8px', width: 'auto', minWidth: '170px' }}
                      defaultValue=""
                    >
                      <option value="">-- Isi Otomatis --</option>
                      {activePersonnel.map((p) => (
                        <option key={p.id || p.nrp} value={p.id}>
                          {p.pangkat} {p.nama} ({p.jabatan || p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Nama Kasat Reskrim <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="kasat_nama"
                      value={formData.kasat_nama}
                      onChange={handleChange}
                      placeholder="Nama lengkap & gelar Kasat..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Pangkat Kasat <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="kasat_pangkat"
                      value={formData.kasat_pangkat}
                      onChange={handleChange}
                      placeholder="Contoh: IPTU / AKP"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      NRP Kasat <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="kasat_nrp"
                      value={formData.kasat_nrp}
                      onChange={handleChange}
                      placeholder="NRP Kasat..."
                      className="form-input mono"
                      required
                    />
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Info size={12} color="var(--accent-cyan)" />
                  <span>
                    Teks jabatan <em>"KASAT RESKRIM"</em> sudah tercetak permanen di template surat kedinasan.
                  </span>
                </div>
              </div>

              {/* B. Data Tim Penyidik (Penyidik 1 s.d. 5) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0, color: '#FFF', fontWeight: 700, fontSize: '12px' }}>
                    B. Data Tim Penyidik (Personel 1 s.d. 5)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Penyidik 1 (Kanit / Utama - Wajib) &bull; Penyidik 2-5 (Pembantu - Opsional)
                  </span>
                </div>

                {[1, 2, 3, 4, 5].map((slotIndex) => {
                  const isRequired = slotIndex === 1;
                  const isPenanganChecked = Number(formData.penyidik_penangan_index) === slotIndex;
                  const isVisible = slotIndex <= activeSlotsCount || isPenanganChecked;

                  if (!isVisible && !formData[`penyidik_${slotIndex}_nama`]) {
                    return null;
                  }

                  const slotTitle =
                    slotIndex === 1
                      ? 'Penyidik 1 / Kanit (Penyidik Utama / Penerima Perintah - Wajib)'
                      : `Penyidik ${slotIndex} (Penyidik Pembantu - Opsional)`;

                  return (
                    <div
                      key={slotIndex}
                      style={{
                        padding: '12px 14px',
                        background: slotIndex === 1 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: slotIndex === 1 ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            className={slotIndex === 1 ? 'badge badge-blue' : 'badge badge-gray'}
                            style={{ fontSize: '10px' }}
                          >
                            Slot {slotIndex}
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: slotIndex === 1 ? '#93C5FD' : 'var(--text-primary)' }}>
                            {slotTitle}
                          </span>

                          {/* Selector Penyidik Penangan Perkara (Radio Button) */}
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isPenanganChecked ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                              border: isPenanganChecked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                              fontSize: '10.5px',
                              color: isPenanganChecked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              fontWeight: isPenanganChecked ? 700 : 400,
                              userSelect: 'none',
                              transition: 'all 0.15s ease'
                            }}
                            title="Tandai personel ini sebagai Penyidik Penangan Perkara (bagian Yang Menyerahkan pada bukti penyerahan surat)"
                          >
                            <input
                              type="radio"
                              name="edit_penyidik_penangan_radio"
                              value={slotIndex}
                              checked={isPenanganChecked}
                              onChange={() => setFormData((prev) => ({ ...prev, penyidik_penangan_index: slotIndex }))}
                              style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                            />
                            <span>Penyidik Penangan</span>
                          </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            onChange={(e) => handleQuickFillPenyidik(slotIndex, e.target.value)}
                            className="form-select"
                            style={{ fontSize: '11px', padding: '2px 8px', width: 'auto', minWidth: '150px' }}
                            defaultValue=""
                          >
                            <option value="">-- Pilih Personel --</option>
                            {activePersonnel.map((p) => (
                              <option key={p.id || p.nrp} value={p.id}>
                                {p.pangkat} {p.nama} ({p.jabatan || p.role})
                              </option>
                            ))}
                          </select>
                          {slotIndex > 1 && formData[`penyidik_${slotIndex}_nama`] && (
                            <button
                              type="button"
                              onClick={() => handleResetSlot(slotIndex)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '10px' }}
                              title="Kosongkan slot penyidik ini"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.4fr', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '10.5px' }}>
                            Nama Lengkap {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            name={`penyidik_${slotIndex}_nama`}
                            value={formData[`penyidik_${slotIndex}_nama`]}
                            onChange={handleChange}
                            placeholder={isRequired ? 'Nama Kanit...' : `Nama Penyidik ${slotIndex}...`}
                            className="form-input"
                            required={isRequired}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '10.5px' }}>
                            Pangkat {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            name={`penyidik_${slotIndex}_pangkat`}
                            value={formData[`penyidik_${slotIndex}_pangkat`]}
                            onChange={handleChange}
                            placeholder="AIPTU / AIPDA"
                            className="form-input"
                            required={isRequired}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '10.5px' }}>
                            NRP {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            name={`penyidik_${slotIndex}_nrp`}
                            value={formData[`penyidik_${slotIndex}_nrp`]}
                            onChange={handleChange}
                            placeholder="NRP..."
                            className="form-input mono"
                            required={isRequired}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '10.5px' }}>
                            Jabatan Kedinasan {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            name={`penyidik_${slotIndex}_jabatan`}
                            value={formData[`penyidik_${slotIndex}_jabatan`]}
                            onChange={handleChange}
                            placeholder={isRequired ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU'}
                            className="form-input"
                            required={isRequired}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Tombol Tambah Slot Penyidik Tambahan */}
                {activeSlotsCount < 5 && (
                  <button
                    type="button"
                    onClick={() => setActiveSlotsCount((prev) => Math.min(prev + 1, 5))}
                    className="btn btn-secondary btn-sm"
                    style={{
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      marginTop: '4px',
                      border: '1px dashed var(--border-glass)',
                    }}
                  >
                    <Plus size={13} color="var(--accent-cyan)" />
                    <span>+ Tampilkan Slot Penyidik {activeSlotsCount + 1} (Opsional)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={isSubmitting}
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-sm"
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Perkara'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
