import React, { useState } from 'react';
import { X, FolderPlus, Check, Shield, Award, Users, Plus, Trash2, Info, UserCheck } from 'lucide-react';
import { mockPersonnel } from '../data/mockPersonnel';

export default function CaseCreateModal({ onClose, onAddCase, personnel = [] }) {
  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;
  const todayStr = new Date().toISOString().split('T')[0];

  // Cari default Kasat & Kanit dari daftar personel
  const defaultKasat = activePersonnel.find(
    (p) => p.role === 'Kasat' || (p.jabatan || '').toUpperCase().includes('KASAT')
  ) || activePersonnel[0];

  const defaultKanit = activePersonnel.find(
    (p) => p.role === 'Kanit' || (p.jabatan || '').toUpperCase().includes('KANIT')
  ) || activePersonnel[1] || activePersonnel[0];

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

    // Bagian A: Data Kasat Reskrim (Atasan Penyidik / Pemberi Perintah)
    kasat_nama: defaultKasat?.nama || 'IPTU Wahyu Hidayat, S.H.',
    kasat_pangkat: defaultKasat?.pangkat || 'IPTU',
    kasat_nrp: defaultKasat?.nrp || '78120567',

    // Bagian B: Data Tim Penyidik (Penyidik 1 s.d. 5)
    penyidik_penangan_index: 1, // Default ke Penyidik 1 jika tidak diubah

    // Penyidik 1 / Kanit (Penyidik Utama / Yang Menerima Perintah - Wajib)
    penyidik_1_nama: defaultKanit?.nama || '',
    penyidik_1_pangkat: defaultKanit?.pangkat || '',
    penyidik_1_nrp: defaultKanit?.nrp || '',
    penyidik_1_jabatan: defaultKanit?.jabatan || 'KANIT IDIK',

    // Penyidik 2 (Penyidik Pembantu - Opsional)
    penyidik_2_nama: '',
    penyidik_2_pangkat: '',
    penyidik_2_nrp: '',
    penyidik_2_jabatan: 'PENYIDIK PEMBANTU',

    // Penyidik 3 (Penyidik Pembantu - Opsional)
    penyidik_3_nama: '',
    penyidik_3_pangkat: '',
    penyidik_3_nrp: '',
    penyidik_3_jabatan: 'PENYIDIK PEMBANTU',

    // Penyidik 4 (Penyidik Pembantu - Opsional)
    penyidik_4_nama: '',
    penyidik_4_pangkat: '',
    penyidik_4_nrp: '',
    penyidik_4_jabatan: 'PENYIDIK PEMBANTU',

    // Penyidik 5 (Penyidik Pembantu - Opsional)
    penyidik_5_nama: '',
    penyidik_5_pangkat: '',
    penyidik_5_nrp: '',
    penyidik_5_jabatan: 'PENYIDIK PEMBANTU',
  });

  // Kontrol tampilan slot penyidik opsional (slot 1 selalu tampil; slot 2-5 dapat dibuka)
  const [selectedPenangan, setSelectedPenangan] = useState(1);
  const [activeSlotsCount, setActiveSlotsCount] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState('terlapor');

  // Helper kalkulasi umur otomatis dari tanggal lahir
  const computeAgeFromDob = (dobStr) => {
    if (!dobStr) return '';
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 && age < 130 ? String(age) : '';
  };

  const createEmptySubject = (prefix, defaultName = '') => ({
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nama: defaultName,
    alias: '',
    nik: '',
    tempat_lahir: 'Kolaka Timur',
    tanggal_lahir: '',
    tgl_lahir: '',
    ttl: '',
    umur: '',
    jenis_kelamin: 'Laki-laki',
    kewarganegaraan: 'Indonesia',
    agama: 'Islam',
    pekerjaan: '',
    pendidikan: 'SMA',
    alamat: formData.locus || 'Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
    no_hp: '',
    kontak: '',
  });

  // 1. State Daftar Pelapor / Korban
  const [victims, setVictims] = useState([]);

  const handleAddVictim = () => {
    setVictims((prev) => [
      ...prev,
      createEmptySubject('vic', prev.length === 0 && formData.nama_pelapor ? formData.nama_pelapor : ''),
    ]);
  };

  const handleUpdateVictim = (index, prop, value) => {
    setVictims((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const updated = { ...v, [prop]: value };
        if (prop === 'tanggal_lahir' || prop === 'tgl_lahir') {
          updated.tanggal_lahir = value;
          updated.tgl_lahir = value;
          const autoAge = computeAgeFromDob(value);
          if (autoAge) updated.umur = autoAge;
          if (updated.tempat_lahir && value) updated.ttl = `${updated.tempat_lahir}, ${value}`;
        }
        if (prop === 'tempat_lahir' && (updated.tanggal_lahir || updated.tgl_lahir)) {
          updated.ttl = `${value}, ${updated.tanggal_lahir || updated.tgl_lahir}`;
        }
        if (prop === 'no_hp' || prop === 'kontak') {
          updated.no_hp = value;
          updated.kontak = value;
        }
        return updated;
      })
    );
  };

  const handleRemoveVictim = (index) => {
    setVictims((prev) => prev.filter((_, i) => i !== index));
  };

  // 2. State Daftar Saksi-Saksi
  const [saksiList, setSaksiList] = useState([]);

  const handleAddSaksi = () => {
    setSaksiList((prev) => [...prev, createEmptySubject('saksi', '')]);
  };

  const handleUpdateSaksi = (index, prop, value) => {
    setSaksiList((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, [prop]: value };
        if (prop === 'tanggal_lahir' || prop === 'tgl_lahir') {
          updated.tanggal_lahir = value;
          updated.tgl_lahir = value;
          const autoAge = computeAgeFromDob(value);
          if (autoAge) updated.umur = autoAge;
          if (updated.tempat_lahir && value) updated.ttl = `${updated.tempat_lahir}, ${value}`;
        }
        if (prop === 'tempat_lahir' && (updated.tanggal_lahir || updated.tgl_lahir)) {
          updated.ttl = `${value}, ${updated.tanggal_lahir || updated.tgl_lahir}`;
        }
        if (prop === 'no_hp' || prop === 'kontak') {
          updated.no_hp = value;
          updated.kontak = value;
        }
        return updated;
      })
    );
  };

  const handleRemoveSaksi = (index) => {
    setSaksiList((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. State Daftar Terlapor (Calon Tersangka)
  const [terlaporList, setTerlaporList] = useState([
    {
      id: `ter-${Date.now()}-1`,
      nama: '',
      alias: '',
      nik: '',
      tempat_lahir: 'Kolaka Timur',
      tanggal_lahir: '1990-01-01',
      tgl_lahir: '1990-01-01',
      ttl: 'Kolaka Timur, 1990-01-01',
      umur: '36',
      jenis_kelamin: 'Laki-laki',
      kewarganegaraan: 'Indonesia',
      pekerjaan: 'Wiraswasta',
      pendidikan: 'SMA',
      agama: 'Islam',
      alamat: 'Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
      no_hp: '',
      kontak: '',
    },
  ]);

  const handleAddTerlapor = () => {
    setTerlaporList((prev) => [...prev, createEmptySubject('ter', '')]);
  };

  const handleUpdateTerlapor = (index, prop, value) => {
    setTerlaporList((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const updated = { ...t, [prop]: value };
        if (prop === 'tanggal_lahir' || prop === 'tgl_lahir') {
          updated.tanggal_lahir = value;
          updated.tgl_lahir = value;
          const autoAge = computeAgeFromDob(value);
          if (autoAge) updated.umur = autoAge;
          if (updated.tempat_lahir && value) updated.ttl = `${updated.tempat_lahir}, ${value}`;
        }
        if (prop === 'tempat_lahir' && (updated.tanggal_lahir || updated.tgl_lahir)) {
          updated.ttl = `${value}, ${updated.tanggal_lahir || updated.tgl_lahir}`;
        }
        if (prop === 'no_hp' || prop === 'kontak') {
          updated.no_hp = value;
          updated.kontak = value;
        }
        return updated;
      })
    );
  };

  const handleRemoveTerlapor = (index) => {
    if (terlaporList.length <= 1) {
      alert('Minimal harus ada 1 pihak terlapor pada berkas perkara.');
      return;
    }
    setTerlaporList((prev) => prev.filter((_, i) => i !== index));
  };

  // 4. State Daftar Tersangka
  const [tersangkaList, setTersangkaList] = useState([]);

  const handleAddTersangka = () => {
    setTersangkaList((prev) => [...prev, { ...createEmptySubject('tsk', ''), status: 'tersangka' }]);
  };

  const handleUpdateTersangka = (index, prop, value) => {
    setTersangkaList((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        const updated = { ...t, [prop]: value };
        if (prop === 'tanggal_lahir' || prop === 'tgl_lahir') {
          updated.tanggal_lahir = value;
          updated.tgl_lahir = value;
          const autoAge = computeAgeFromDob(value);
          if (autoAge) updated.umur = autoAge;
          if (updated.tempat_lahir && value) updated.ttl = `${updated.tempat_lahir}, ${value}`;
        }
        if (prop === 'tempat_lahir' && (updated.tanggal_lahir || updated.tgl_lahir)) {
          updated.ttl = `${value}, ${updated.tanggal_lahir || updated.tgl_lahir}`;
        }
        if (prop === 'no_hp' || prop === 'kontak') {
          updated.no_hp = value;
          updated.kontak = value;
        }
        return updated;
      })
    );
  };

  const handleRemoveTersangka = (index) => {
    setTersangkaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick-Action: Tetapkan Terlapor menjadi Tersangka tanpa mengetik ulang
  const handlePromoteTerlaporToTersangka = (terlaporItem) => {
    if (!terlaporItem || !terlaporItem.nama?.trim()) {
      alert('Mohon isi Nama Lengkap Terlapor terlebih dahulu sebelum menetapkan sebagai Tersangka.');
      return;
    }
    const alreadyExists = tersangkaList.some(
      (tsk) => tsk.nama?.trim().toLowerCase() === terlaporItem.nama.trim().toLowerCase()
    );
    if (alreadyExists) {
      alert(`Subjek "${terlaporItem.nama}" sudah terdaftar di Daftar Tersangka.`);
      setActiveSubjectTab('tersangka');
      return;
    }
    const promoted = {
      ...terlaporItem,
      id: `tsk-${Date.now()}-${tersangkaList.length + 1}`,
      status: 'tersangka',
    };
    setTersangkaList((prev) => [...prev, promoted]);
    setActiveSubjectTab('tersangka');
  };

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

  // Helper Quick-Fill Kasat dari daftar personel
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

  // Helper Quick-Fill Penyidik slot 1 s.d. 5 dari daftar personel
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

    // Validasi Kolom Wajib
    if (!formData.nomor_lp || !formData.tindak_pidana || !formData.nama_pelapor) {
      alert('Mohon lengkapi data perkara wajib: Nomor LP, Tindak Pidana, dan Nama Pelapor.');
      return;
    }

    if (!formData.kasat_nama.trim() || !formData.kasat_pangkat.trim() || !formData.kasat_nrp.trim()) {
      alert('Mohon lengkapi data Kasat Reskrim: Nama, Pangkat, dan NRP.');
      return;
    }

    if (
      !formData.penyidik_1_nama.trim() ||
      !formData.penyidik_1_pangkat.trim() ||
      !formData.penyidik_1_nrp.trim() ||
      !formData.penyidik_1_jabatan.trim()
    ) {
      alert('Mohon lengkapi data Penyidik 1 / Kanit (Penyidik Utama / Yang Menerima Perintah).');
      return;
    }

    setIsSubmitting(true);

    const penanganIdx = Number(selectedPenangan || formData.penyidik_penangan_index) || 1;
    const penanganNama = formData[`penyidik_${penanganIdx}_nama`]?.trim() || formData.penyidik_1_nama.trim();
    const penanganPangkat = formData[`penyidik_${penanganIdx}_pangkat`]?.trim() || formData.penyidik_1_pangkat.trim();
    const penanganNrp = formData[`penyidik_${penanganIdx}_nrp`]?.trim() || formData.penyidik_1_nrp.trim();
    const penanganJabatan = formData[`penyidik_${penanganIdx}_jabatan`]?.trim() || (penanganIdx === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU');

    // Susun array investigators untuk kompatibilitas tampilan lama
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

    const cleanSubject = (s, idx, defaultName, roleStatus) => ({
      ...s,
      nama: s.nama?.trim() || defaultName,
      alias: s.alias?.trim() || '',
      nik: s.nik?.trim() || '-',
      tempat_lahir: s.tempat_lahir?.trim() || 'Kolaka Timur',
      tanggal_lahir: s.tanggal_lahir || s.tgl_lahir || null,
      tgl_lahir: s.tanggal_lahir || s.tgl_lahir || null,
      ttl: s.ttl || ((s.tempat_lahir && (s.tanggal_lahir || s.tgl_lahir)) ? `${s.tempat_lahir}, ${s.tanggal_lahir || s.tgl_lahir}` : ''),
      umur: s.umur ? String(s.umur).trim() : null,
      jenis_kelamin: s.jenis_kelamin || 'Laki-laki',
      kewarganegaraan: s.kewarganegaraan?.trim() || 'Indonesia',
      pekerjaan: s.pekerjaan?.trim() || 'Wiraswasta',
      pendidikan: s.pendidikan?.trim() || 'SMA',
      agama: s.agama || 'Islam',
      alamat: s.alamat?.trim() || formData.locus.trim(),
      no_hp: s.no_hp?.trim() || s.kontak?.trim() || '',
      kontak: s.no_hp?.trim() || s.kontak?.trim() || '',
      status: roleStatus,
      nomor_sp_tap: s.nomor_sp_tap || null,
      no_sp_tap_tsk: s.no_sp_tap_tsk || null,
      tanggal_sp_tap: s.tanggal_sp_tap || null,
      tgl_sp_tap_tsk: s.tgl_sp_tap_tsk || null,
    });

    const cleanedTerlaporList = terlaporList.map((t, idx) =>
      cleanSubject(t, idx, idx === 0 ? 'Dalam Penyelidikan' : `Terlapor ${idx + 1}`, 'terlapor')
    );
    const cleanedSaksiList = saksiList
      .filter((s) => s && s.nama?.trim())
      .map((s, idx) => cleanSubject(s, idx, `Saksi ${idx + 1}`, 'saksi'));
    const cleanedTersangkaList = tersangkaList
      .filter((s) => s && s.nama?.trim())
      .map((s, idx) => cleanSubject(s, idx, `Tersangka ${idx + 1}`, 'tersangka'));
    const cleanedVictimsList = victims
      .filter((v) => v && v.nama?.trim())
      .map((v, idx) => cleanSubject(v, idx, formData.nama_pelapor.trim(), 'pelapor'));

    const namaTerlaporJoined = cleanedTerlaporList.map((t) => t.nama).filter(Boolean).join(', ') || 'Dalam Penyelidikan';

    const newCase = {
      id: `case-${Date.now().toString().slice(-6)}`,
      // Standar kolom Laporan Polisi
      nomor_lp: formData.nomor_lp.trim(),
      tanggal_lp: formData.tanggal_lp,
      nama_pelapor: formData.nama_pelapor.trim(),
      nama_terlapor: namaTerlaporJoined,
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

      // Data Penyidik Penangan Perkara Terpilih (Dedicated Columns di Supabase)
      penyidik_penangan_index: penanganIdx,
      penyidik_penangan_nama: penanganNama,
      penyidik_penangan_pangkat: penanganPangkat,
      penyidik_penangan_nrp: penanganNrp,
      penyidik_penangan_jabatan: penanganJabatan,

      investigators: investigatorsList,

      // Rantai rujukan nomor surat turunan
      no_sprin_sidik: null,
      no_spdp: null,
      no_p21_kn: null,
      // Kompatibilitas skema lama
      no_lp: formData.nomor_lp.trim(),
      pelapor_name: formData.nama_pelapor.trim(),
      terlapor_name: namaTerlaporJoined,
      pasal_uu: formData.dasar_pasal_uu.trim(),
      sprin_val_date: '30 (tiga puluh) hari',
      sprin_loc: 'Tirawuta',
      sprin_date: formData.tanggal_lp,
      status: 'active',
      created_at: new Date().toISOString(),
      person: {
        nama: cleanedTerlaporList[0]?.nama || 'Dalam Penyelidikan',
        nik: cleanedTerlaporList[0]?.nik || '-',
        gender: cleanedTerlaporList[0]?.jenis_kelamin || 'Laki-laki',
        alamat: cleanedTerlaporList[0]?.alamat || formData.locus.trim(),
        pob_dob: `${cleanedTerlaporList[0]?.tempat_lahir || 'Kolaka Timur'}, ${cleanedTerlaporList[0]?.tgl_lahir || ''}`,
        pekerjaan: cleanedTerlaporList[0]?.pekerjaan || 'Wiraswasta',
        agama: cleanedTerlaporList[0]?.agama || 'Islam',
      },
      // 4 Kategori Subjek Hukum Terpadu
      terlapor_list: cleanedTerlaporList,
      saksi_list: cleanedSaksiList,
      tersangka_list: cleanedTersangkaList,
      victims: cleanedVictimsList,
      pelapor_list: cleanedVictimsList,
      references: {
        no_sprin_sidik: '',
        no_spdp: '',
        no_p21_kn: '',
        victims: cleanedVictimsList,
        pelapor_list: cleanedVictimsList,
        saksi_list: cleanedSaksiList,
        terlapor_list: cleanedTerlaporList,
        tersangka_list: cleanedTersangkaList,
        penyidik_penangan_index: penanganIdx,
        penyidik_penangan: {
          index: penanganIdx,
          nama: penanganNama,
          pangkat: penanganPangkat,
          nrp: penanganNrp,
          jabatan: penanganJabatan,
        },
      },
    };

    try {
      if (onAddCase) {
        await onAddCase(newCase);
      }
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan perkara:', err);
      alert(`Gagal menyimpan berkas perkara: ${err.message}`);
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
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(255, 42, 42, 0.12)',
                border: '1px solid rgba(255, 42, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderPlus size={20} color="#FF2A2A" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>
                Pendaftaran Perkara Baru (Laporan Polisi)
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Formulir data dasar LP dan penetapan Tim Penandatangan Mindik
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
            {/* Info Box Standarisasi */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: '#93C5FD',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Shield size={16} color="#FF3B3B" style={{ flexShrink: 0 }} />
              <span>
                Data Kasat Reskrim dan Tim Penyidik akan diotomatisasi ke seluruh template dokumen kedinasan (Surat Perintah, Surat Biasa, Berita Acara) tanpa perlu pengetikan ulang.
              </span>
            </div>

            {/* SECTION 1: DATA LAPORAN POLISI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FF3B3B', letterSpacing: '0.5px' }}>
                  1. IDENTITAS DASAR LAPORAN POLISI
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Model LP:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        nomor_lp: /^LP[\s/._:-]*A\b/i.test(prev.nomor_lp || '')
                          ? String(prev.nomor_lp).replace(/^LP([\s/._:-]*)A\b/i, 'LP$1B')
                          : (prev.nomor_lp || 'LP/B/1/IX/2026/SPKT/POLRES KOLAKA TIMUR')
                      }))
                    }
                    className={`btn btn-sm ${!/^LP[\s/._:-]*A\b/i.test(formData.nomor_lp || '') ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                  >
                    LP Model B (Masyarakat)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        nomor_lp: /^LP[\s/._:-]*B\b/i.test(prev.nomor_lp || '')
                          ? String(prev.nomor_lp).replace(/^LP([\s/._:-]*)B\b/i, 'LP$1A')
                          : (/^LP[\s/._:-]*A\b/i.test(prev.nomor_lp || '')
                              ? prev.nomor_lp
                              : 'LP/A/2/IX/2026/SPKT/POLRES KOLAKA TIMUR')
                      }))
                    }
                    className={`btn btn-sm ${/^LP[\s/._:-]*A\b/i.test(formData.nomor_lp || '') ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                  >
                    LP Model A (Petugas Polri)
                  </button>
                </div>
              </div>

              {/* Baris 1: Nomor LP & Tanggal LP */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nomor Laporan Polisi (LP Model A / LP Model B) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nomor_lp"
                    value={formData.nomor_lp}
                    onChange={handleChange}
                    placeholder="Contoh: LP/A/2/... atau LP/B/24/VIII/2026/SPKT/POLRES KOLAKA TIMUR"
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

              {/* Baris 2: Pelapor */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nama Pelapor / Saksi Pelapor <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="nama_pelapor"
                  value={formData.nama_pelapor}
                  onChange={handleChange}
                  placeholder="Nama lengkap pelapor sesuai kartu identitas..."
                  className="form-input"
                  required
                />
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
                  <label className="form-label">Rumusan Pasal Disangkakan</label>
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
            </div>

            {/* SECTION 2: MANAJEMEN SUBJEK HUKUM TERPADU (4 KATEGORI KUHAP LENGKAP) */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 42, 42, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#FF2A2A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    2. MANAJEMEN SUBJEK HUKUM TERPADU (PELAPOR, SAKSI, TERLAPOR, TERSANGKA)
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(255, 42, 42, 0.14)',
                      color: '#CBD5E1',
                      border: '1px solid rgba(255, 42, 42, 0.35)',
                      fontWeight: 600,
                    }}
                  >
                    13 Atribut Biodata KUHAP
                  </span>
                </div>
              </div>

              {/* 4 Tab Kategori Subjek Hukum */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { key: 'pelapor', label: '1. Pelapor / Korban', count: victims.length },
                  { key: 'saksi', label: '2. Saksi-Saksi', count: saksiList.length },
                  { key: 'terlapor', label: '3. Terlapor (Calon Tsk)', count: terlaporList.length },
                  { key: 'tersangka', label: '4. Tersangka', count: tersangkaList.length },
                ].map((tab) => {
                  const isActive = activeSubjectTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveSubjectTab(tab.key)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: isActive ? 700 : 600,
                        background: isActive ? 'rgba(255, 42, 42, 0.2)' : '#131924',
                        color: isActive ? '#FFFFFF' : '#94A3B8',
                        border: isActive ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.18)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          padding: '1px 7px',
                          borderRadius: '999px',
                          fontSize: '10.5px',
                          background: isActive ? '#FF2A2A' : 'rgba(148, 163, 184, 0.15)',
                          color: '#FFFFFF',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Render Konten Tab Aktif */}
              {(() => {
                const tabConfig = {
                  pelapor: {
                    title: 'Pelapor / Saksi Korban',
                    list: victims,
                    onAdd: handleAddVictim,
                    onUpdate: handleUpdateVictim,
                    onRemove: handleRemoveVictim,
                    emptyText: 'Belum ada biodata Pelapor/Korban detail. Generator otomatis merujuk ke Nama Pelapor di atas jika kosong. Klik "+ Tambah Pelapor / Korban" untuk mengisi biodata KUHAP lengkap.',
                    addLabel: '+ Tambah Pelapor / Korban',
                    canPromote: false,
                  },
                  saksi: {
                    title: 'Saksi',
                    list: saksiList,
                    onAdd: handleAddSaksi,
                    onUpdate: handleUpdateSaksi,
                    onRemove: handleRemoveSaksi,
                    emptyText: 'Belum ada Saksi yang didaftarkan pada berkas perkara ini. Klik "+ Tambah Saksi" untuk menambahkan biodata saksi pemeriksaan.',
                    addLabel: '+ Tambah Saksi',
                    canPromote: false,
                  },
                  terlapor: {
                    title: 'Terlapor (Calon Tersangka)',
                    list: terlaporList,
                    onAdd: handleAddTerlapor,
                    onUpdate: handleUpdateTerlapor,
                    onRemove: handleRemoveTerlapor,
                    emptyText: 'Belum ada Terlapor.',
                    addLabel: '+ Tambah Terlapor',
                    canPromote: true,
                  },
                  tersangka: {
                    title: 'Tersangka',
                    list: tersangkaList,
                    onAdd: handleAddTersangka,
                    onUpdate: handleUpdateTersangka,
                    onRemove: handleRemoveTersangka,
                    emptyText: 'Belum ada Tersangka resmi. Anda dapat menetapkan Terlapor menjadi Tersangka dengan tombol "Tetapkan Jadi Tersangka" pada tab Terlapor atau otomatis saat menerbitkan SP.Tap Tersangka.',
                    addLabel: '+ Tambah Tersangka Baru',
                    canPromote: false,
                  },
                }[activeSubjectTab];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                        Daftar {tabConfig.title} ({tabConfig.list.length})
                      </span>
                      <button
                        type="button"
                        onClick={tabConfig.onAdd}
                        className="btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: 'rgba(255, 42, 42, 0.18)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 42, 42, 0.45)',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} />
                        <span>{tabConfig.addLabel}</span>
                      </button>
                    </div>

                    {tabConfig.list.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          background: 'rgba(255, 42, 42, 0.05)',
                          border: '1px dashed rgba(255, 42, 42, 0.35)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          color: '#CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <Info size={16} color="#FF2A2A" style={{ flexShrink: 0 }} />
                        <span>{tabConfig.emptyText}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {tabConfig.list.map((subj, idx) => (
                          <div
                            key={subj.id || idx}
                            style={{
                              padding: '14px',
                              background: '#131924',
                              border: '1px solid rgba(148, 163, 184, 0.22)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                                  {tabConfig.title} #{idx + 1}
                                </span>
                                {idx === 0 && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '1px 7px',
                                      borderRadius: '999px',
                                      background: 'rgba(255, 42, 42, 0.16)',
                                      color: '#FF3B3B',
                                      border: '1px solid rgba(255, 42, 42, 0.4)',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Utama
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {tabConfig.canPromote && (
                                  <button
                                    type="button"
                                    onClick={() => handlePromoteTerlaporToTersangka(subj)}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      borderRadius: '999px',
                                      background: 'rgba(255, 42, 42, 0.18)',
                                      color: '#FFFFFF',
                                      border: '1px solid #FF2A2A',
                                      cursor: 'pointer',
                                    }}
                                    title="Salin seluruh biodata Terlapor ini ke Daftar Tersangka tanpa mengetik ulang"
                                  >
                                    <UserCheck size={13} color="#FF2A2A" />
                                    <span>Tetapkan Jadi Tersangka</span>
                                  </button>
                                )}
                                {(activeSubjectTab !== 'terlapor' || tabConfig.list.length > 1) && (
                                  <button
                                    type="button"
                                    onClick={() => tabConfig.onRemove(idx)}
                                    className="btn-danger-ghost"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                      color: '#FF2A2A',
                                      background: 'transparent',
                                      border: 'none',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Hapus</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Baris 1: Nama Lengkap, Alias, NIK */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr', gap: '10px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>
                                  1. Nama Lengkap <span style={{ color: 'var(--accent-red)' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  value={subj.nama || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'nama', e.target.value)}
                                  placeholder={`Nama lengkap ${tabConfig.title.toLowerCase()}...`}
                                  className="form-input"
                                  required={activeSubjectTab === 'terlapor' && idx === 0}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>2. Alias / Panggilan</label>
                                <input
                                  type="text"
                                  value={subj.alias || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'alias', e.target.value)}
                                  placeholder="Alias (opsional)..."
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>3. NIK / No. Identitas</label>
                                <input
                                  type="text"
                                  value={subj.nik || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'nik', e.target.value)}
                                  placeholder="16 digit NIK..."
                                  className="form-input mono"
                                />
                              </div>
                            </div>

                            {/* Baris 2: Tempat Lahir, Tanggal Lahir, Umur (Otomatis), Jenis Kelamin */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.7fr 0.9fr', gap: '10px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>4. Tempat Lahir</label>
                                <input
                                  type="text"
                                  value={subj.tempat_lahir || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'tempat_lahir', e.target.value)}
                                  placeholder="Kolaka Timur"
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>5. Tanggal Lahir</label>
                                <input
                                  type="date"
                                  value={subj.tanggal_lahir || subj.tgl_lahir || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'tanggal_lahir', e.target.value)}
                                  className="form-input mono"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>6. Umur (Thn)</label>
                                <input
                                  type="text"
                                  value={subj.umur || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'umur', e.target.value)}
                                  placeholder="Otomatis"
                                  className="form-input mono"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>7. Jenis Kelamin</label>
                                <select
                                  value={subj.jenis_kelamin || 'Laki-laki'}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'jenis_kelamin', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="Laki-laki">Laki-laki</option>
                                  <option value="Perempuan">Perempuan</option>
                                </select>
                              </div>
                            </div>

                            {/* Baris 3: Kewarganegaraan, Agama, Pekerjaan, Pendidikan */}
                            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1fr 1.1fr 0.9fr', gap: '10px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>8. Kewarganegaraan</label>
                                <input
                                  type="text"
                                  value={subj.kewarganegaraan || 'Indonesia'}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'kewarganegaraan', e.target.value)}
                                  placeholder="Indonesia"
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>9. Agama</label>
                                <select
                                  value={subj.agama || 'Islam'}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'agama', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="Islam">Islam</option>
                                  <option value="Kristen Protestan">Kristen Protestan</option>
                                  <option value="Katolik">Katolik</option>
                                  <option value="Hindu">Hindu</option>
                                  <option value="Buddha">Buddha</option>
                                  <option value="Konghucu">Konghucu</option>
                                </select>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>10. Pekerjaan</label>
                                <input
                                  type="text"
                                  value={subj.pekerjaan || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'pekerjaan', e.target.value)}
                                  placeholder="Wiraswasta / Petani / PNS..."
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>11. Pendidikan</label>
                                <input
                                  type="text"
                                  value={subj.pendidikan || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'pendidikan', e.target.value)}
                                  placeholder="SMA / S-1..."
                                  className="form-input"
                                />
                              </div>
                            </div>

                            {/* Baris 4: Alamat Lengkap & No. HP */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '10px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>12. Alamat Tempat Tinggal Lengkap</label>
                                <input
                                  type="text"
                                  value={subj.alamat || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'alamat', e.target.value)}
                                  placeholder="Alamat domisili lengkap..."
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>13. No. HP / Kontak</label>
                                <input
                                  type="text"
                                  value={subj.no_hp || subj.kontak || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'no_hp', e.target.value)}
                                  placeholder="0812..."
                                  className="form-input mono"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SECTION 3: PEJABAT & TIM PENYIDIK */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(17, 22, 31, 0.80)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#FF2A2A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    4. PEJABAT & TIM PENYIDIK PENANDATANGAN MINDIK
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Tersimpan di tabel cases: <code>kasat_*</code> & <code>penyidik_1..5_*</code>
                </span>
              </div>

              {/* A. Data Kasat Reskrim */}
              <div
                style={{
                  padding: '14px',
                  background: '#131924',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
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
                  <Info size={12} color="#FF3B3B" />
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
                  const isVisible = slotIndex <= activeSlotsCount;

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
                            className={slotIndex === 1 ? 'badge badge-amber' : 'badge badge-gray'}
                            style={{ fontSize: '10px' }}
                          >
                            Slot {slotIndex}
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: slotIndex === 1 ? '#CBD5E1' : 'var(--text-primary)' }}>
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
                              background: Number(selectedPenangan) === slotIndex ? 'rgba(255, 42, 42, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                              border: Number(selectedPenangan) === slotIndex ? '1px solid #FF2A2A' : '1px solid var(--border-glass)',
                              fontSize: '10.5px',
                              color: Number(selectedPenangan) === slotIndex ? '#FF3B3B' : 'var(--text-secondary)',
                              fontWeight: Number(selectedPenangan) === slotIndex ? 700 : 400,
                              userSelect: 'none',
                              transition: 'all 0.15s ease'
                            }}
                            title="Tandai personel ini sebagai Penyidik Penangan Perkara (bagian Yang Menyerahkan pada bukti penyerahan surat)"
                          >
                            <input
                              type="radio"
                              name="create_penyidik_penangan_radio"
                              value={slotIndex}
                              checked={Number(selectedPenangan) === slotIndex}
                              onChange={() => {
                                setSelectedPenangan(slotIndex);
                                setFormData((prev) => ({ ...prev, penyidik_penangan_index: slotIndex }));
                              }}
                              style={{ accentColor: '#FF2A2A', cursor: 'pointer' }}
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
                    <Plus size={13} color="#FF3B3B" />
                    <span>+ Tampilkan Slot Penyidik {activeSlotsCount + 1} (Opsional)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
