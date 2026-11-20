import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, Shield, AlertCircle, Award, Users, Plus, Trash2, Info, UserCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { mockPersonnel } from '../data/mockPersonnel';

export default function CaseEditModal({ isOpen, caseItem, onClose, onSaveSuccess, personnel = [] }) {
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

  const [selectedPenangan, setSelectedPenangan] = useState(1);
  const [activeSlotsCount, setActiveSlotsCount] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState('terlapor');

  // 4 Kategori Subjek Hukum (13 Field KUHAP Lengkap)
  const [victims, setVictims] = useState([]);
  const [saksiList, setSaksiList] = useState([]);
  const [terlaporList, setTerlaporList] = useState([]);
  const [tersangkaList, setTersangkaList] = useState([]);

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

  const normalizeLoadedSubject = (s = {}, idx = 0, prefix = 'sub') => {
    let tempat_lahir = s.tempat_lahir || '';
    let tanggal_lahir = s.tanggal_lahir || s.tgl_lahir || '';
    if (!tempat_lahir && !tanggal_lahir && s.ttl) {
      const parts = String(s.ttl).split(',');
      tempat_lahir = (parts[0] || '').trim();
      tanggal_lahir = parts.slice(1).join(',').trim();
    }
    return {
      ...s,
      id: s.id || `${prefix}-${idx + 1}`,
      nama: s.nama || '',
      alias: s.alias || '',
      nik: s.nik || '',
      tempat_lahir: tempat_lahir || 'Kolaka Timur',
      tanggal_lahir,
      tgl_lahir: tanggal_lahir,
      ttl: s.ttl || (tempat_lahir && tanggal_lahir ? `${tempat_lahir}, ${tanggal_lahir}` : ''),
      umur: s.umur ? String(s.umur).replace(/\s*tahun\s*/i, '').trim() : computeAgeFromDob(tanggal_lahir),
      jenis_kelamin: s.jenis_kelamin || s.jk || 'Laki-laki',
      kewarganegaraan: s.kewarganegaraan || 'Indonesia',
      agama: s.agama || 'Islam',
      pekerjaan: s.pekerjaan || '',
      pendidikan: s.pendidikan || 'SMA',
      alamat: s.alamat || '',
      no_hp: s.no_hp || s.kontak || s.phone || '',
      kontak: s.no_hp || s.kontak || s.phone || '',
    };
  };

  useEffect(() => {
    if (caseItem) {
      const activeCase = caseItem;

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

      // 1. Ekstrak index penyidik penangan dari data kasus (Hydration)
      const penanganIdx = activeCase?.penyidik_penangan_index 
        ?? (activeCase?.references?.penyidik_penangan_index)
        ?? (activeCase?.references?.penyidik_penangan?.index)
        ?? (activeCase?.penyidik_penangan?.index)
        ?? (Array.isArray(activeCase?.investigators) && activeCase.investigators.findIndex(i => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1) !== -1 
            ? (Number(activeCase.investigators.find(i => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1)?.role_order) || (activeCase.investigators.findIndex(i => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1) + 1))
            : 1);

      const resolvedPenanganIdx = Number(penanganIdx) || 1;
      setSelectedPenangan(resolvedPenanganIdx);

      // 2. Hitung slot aktif awal agar slot terpilih (misal Slot 4) selalu tampil di UI
      let maxActiveSlot = Math.max(2, resolvedPenanganIdx);
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
        penyidik_penangan_index: resolvedPenanganIdx,
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

      const refs = activeCase.references || {};

      // 1. Hydrate Pelapor / Korban
      const initialVictims = (Array.isArray(activeCase.victims) && activeCase.victims.length > 0
        ? activeCase.victims
        : (Array.isArray(refs.victims) ? refs.victims : (Array.isArray(refs.pelapor_list) ? refs.pelapor_list : []))
      ).map((v, i) => normalizeLoadedSubject(v, i, 'vic'));
      setVictims(initialVictims);

      // 2. Hydrate Saksi-Saksi
      const initialSaksi = (Array.isArray(activeCase.saksi_list) && activeCase.saksi_list.length > 0
        ? activeCase.saksi_list
        : (Array.isArray(refs.saksi_list) ? refs.saksi_list : [])
      ).map((s, i) => normalizeLoadedSubject(s, i, 'saksi'));
      setSaksiList(initialSaksi);

      // 3. Hydrate Terlapor & Tersangka (dari case object + sinkronisasi tabel case_suspects)
      const localTerlapor = (Array.isArray(activeCase.terlapor_list) && activeCase.terlapor_list.length > 0
        ? activeCase.terlapor_list
        : (Array.isArray(refs.terlapor_list) ? refs.terlapor_list : [])
      ).map((t, i) => normalizeLoadedSubject(t, i, 'ter'));

      const localTersangka = (Array.isArray(activeCase.tersangka_list) && activeCase.tersangka_list.length > 0
        ? activeCase.tersangka_list
        : (Array.isArray(refs.tersangka_list) ? refs.tersangka_list : [])
      ).map((t, i) => normalizeLoadedSubject(t, i, 'tsk'));

      setTerlaporList(
        localTerlapor.length > 0
          ? localTerlapor
          : (activeCase.nama_terlapor || activeCase.terlapor_name
              ? [normalizeLoadedSubject({ nama: activeCase.nama_terlapor || activeCase.terlapor_name, alamat: activeCase.locus || '' }, 0, 'ter')]
              : [])
      );
      setTersangkaList(localTersangka);

      // Ambil juga data dari tabel case_suspects di Supabase agar sinkron
      if (activeCase.id) {
        supabase
          .from('case_suspects')
          .select('*')
          .eq('case_id', activeCase.id)
          .then(({ data }) => {
            if (Array.isArray(data) && data.length > 0) {
              const dbTerlapor = data
                .filter((row) => row.status === 'terlapor')
                .map((row, idx) => normalizeLoadedSubject(row, idx, 'ter'));
              const dbTersangka = data
                .filter((row) => row.status === 'tersangka' || !row.status)
                .map((row, idx) => normalizeLoadedSubject(row, idx, 'tsk'));

              if (dbTerlapor.length > 0 && localTerlapor.length === 0) {
                setTerlaporList(dbTerlapor);
              }
              if (dbTersangka.length > 0 && localTersangka.length === 0) {
                setTersangkaList(dbTersangka);
              }
            }
          })
          .catch(() => {});
      }

      setErrorMessage(null);
    }
  }, [caseItem]);

  if (!isOpen || !caseItem) return null;

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
    alamat: formData.locus || '',
    no_hp: '',
    kontak: '',
  });

  const updateSubjectInState = (setter, index, prop, value) => {
    setter((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [prop]: value };
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

  // 1. Handlers Pelapor / Korban
  const handleAddVictim = () => {
    setVictims((prev) => [
      ...prev,
      createEmptySubject('vic', prev.length === 0 && formData.nama_pelapor ? formData.nama_pelapor : ''),
    ]);
  };
  const handleUpdateVictim = (idx, prop, val) => updateSubjectInState(setVictims, idx, prop, val);
  const handleRemoveVictim = (idx) => setVictims((prev) => prev.filter((_, i) => i !== idx));

  // 2. Handlers Saksi
  const handleAddSaksi = () => setSaksiList((prev) => [...prev, createEmptySubject('saksi', '')]);
  const handleUpdateSaksi = (idx, prop, val) => updateSubjectInState(setSaksiList, idx, prop, val);
  const handleRemoveSaksi = (idx) => setSaksiList((prev) => prev.filter((_, i) => i !== idx));

  // 3. Handlers Terlapor (Calon Tersangka)
  const handleAddTerlapor = () => setTerlaporList((prev) => [...prev, createEmptySubject('ter', '')]);
  const handleUpdateTerlapor = (idx, prop, val) => updateSubjectInState(setTerlaporList, idx, prop, val);
  const handleRemoveTerlapor = (idx) => setTerlaporList((prev) => prev.filter((_, i) => i !== idx));

  // 4. Handlers Tersangka
  const handleAddTersangka = () => setTersangkaList((prev) => [...prev, { ...createEmptySubject('tsk', ''), status: 'tersangka' }]);
  const handleUpdateTersangka = (idx, prop, val) => updateSubjectInState(setTersangkaList, idx, prop, val);
  const handleRemoveTersangka = (idx) => setTersangkaList((prev) => prev.filter((_, i) => i !== idx));

  // Quick-Action: Tetapkan Terlapor menjadi Tersangka tanpa mengetik ulang
  const handlePromoteTerlaporToTersangka = (terlaporItem) => {
    if (!terlaporItem || !terlaporItem.nama?.trim()) {
      setErrorMessage('Mohon isi Nama Lengkap Terlapor terlebih dahulu sebelum menetapkan sebagai Tersangka.');
      return;
    }
    const alreadyExists = tersangkaList.some(
      (tsk) => tsk.nama?.trim().toLowerCase() === terlaporItem.nama.trim().toLowerCase()
    );
    if (alreadyExists) {
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

    const penanganIdx = Number(selectedPenangan || formData.penyidik_penangan_index) || 1;
    const selectedPenyidik = {
      nama: formData[`penyidik_${penanganIdx}_nama`]?.trim() || formData.penyidik_1_nama.trim(),
      pangkat: formData[`penyidik_${penanganIdx}_pangkat`]?.trim() || formData.penyidik_1_pangkat.trim(),
      nrp: formData[`penyidik_${penanganIdx}_nrp`]?.trim() || formData.penyidik_1_nrp.trim(),
      jabatan: formData[`penyidik_${penanganIdx}_jabatan`]?.trim() || (penanganIdx === 1 ? 'KANIT IDIK' : 'PENYIDIK PEMBANTU'),
    };

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
      nomor_sp_tap: s.nomor_sp_tap || s.no_sp_tap_tsk || null,
      no_sp_tap_tsk: s.no_sp_tap_tsk || s.nomor_sp_tap || null,
      tanggal_sp_tap: s.tanggal_sp_tap || s.tgl_sp_tap_tsk || null,
      tgl_sp_tap_tsk: s.tgl_sp_tap_tsk || s.tanggal_sp_tap || null,
    });

    const cleanedVictims = victims
      .filter((v) => v && v.nama?.trim())
      .map((v, idx) => cleanSubject(v, idx, formData.nama_pelapor.trim(), 'pelapor'));
    const cleanedSaksi = saksiList
      .filter((s) => s && s.nama?.trim())
      .map((s, idx) => cleanSubject(s, idx, `Saksi ${idx + 1}`, 'saksi'));
    const cleanedTerlapor = terlaporList
      .filter((t) => t && t.nama?.trim())
      .map((t, idx) => cleanSubject(t, idx, `Terlapor ${idx + 1}`, 'terlapor'));
    const cleanedTersangka = tersangkaList
      .filter((t) => t && t.nama?.trim())
      .map((t, idx) => cleanSubject(t, idx, `Tersangka ${idx + 1}`, 'tersangka'));

    const namaTerlaporJoined =
      cleanedTerlapor.map((t) => t.nama).filter(Boolean).join(', ') ||
      formData.nama_terlapor.trim() ||
      'Dalam Penyelidikan';

    // Simpan ke references JSONB yang terbukti aman di Supabase
    const existingReferences = (caseItem.references && typeof caseItem.references === 'object') ? caseItem.references : {};
    const updatedReferences = {
      ...existingReferences,
      victims: cleanedVictims,
      pelapor_list: cleanedVictims,
      saksi_list: cleanedSaksi,
      terlapor_list: cleanedTerlapor,
      tersangka_list: cleanedTersangka,
      penyidik_penangan_index: penanganIdx,
      penyidik_penangan: {
        index: penanganIdx,
        nama: selectedPenyidik.nama,
        pangkat: selectedPenyidik.pangkat,
        nrp: selectedPenyidik.nrp,
        jabatan: selectedPenyidik.jabatan,
      },
    };

    const payloadUpdate = {
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

      // C. Penyidik Penangan Terpilih (Sesuai kolom tabel Supabase)
      penyidik_penangan_index: Number(selectedPenangan),
      penyidik_penangan_nama: selectedPenyidik.nama,
      penyidik_penangan_pangkat: selectedPenyidik.pangkat,
      penyidik_penangan_nrp: selectedPenyidik.nrp,
      penyidik_penangan_jabatan: selectedPenyidik.jabatan,

      investigators: investigatorsList,
      references: updatedReferences,

      // Kompatibilitas skema lama
      no_lp: formData.nomor_lp.trim(),
      pelapor_name: formData.nama_pelapor.trim(),
      terlapor_name: namaTerlaporJoined,
      pasal_uu: formData.dasar_pasal_uu.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('cases')
        .update(payloadUpdate)
        .eq('id', caseItem.id);

      if (error) throw error;

      // Sinkronkan juga daftar Terlapor dan Tersangka ke tabel case_suspects
      try {
        await supabase.from('case_suspects').delete().eq('case_id', caseItem.id);
        const allCaseSuspects = [...cleanedTerlapor, ...cleanedTersangka];
        if (allCaseSuspects.length > 0) {
          const suspectsRows = allCaseSuspects.map((s) => ({
            case_id: caseItem.id,
            nama: s.nama,
            nik: s.nik || '-',
            jenis_kelamin: s.jenis_kelamin || 'Laki-laki',
            tempat_lahir: s.tempat_lahir || 'Kolaka Timur',
            tgl_lahir: s.tanggal_lahir || s.tgl_lahir || null,
            umur: s.umur ? String(s.umur) : null,
            agama: s.agama || 'Islam',
            pekerjaan: s.pekerjaan || 'Wiraswasta',
            kewarganegaraan: s.kewarganegaraan || 'Indonesia',
            pendidikan: s.pendidikan || 'SMA',
            status_pernikahan: s.status_pernikahan || 'Kawin',
            alamat: s.alamat || formData.locus.trim() || '',
            status: s.status === 'tersangka' ? 'tersangka' : 'terlapor',
            no_sp_tap_tsk: s.no_sp_tap_tsk || s.nomor_sp_tap || null,
            nomor_sp_tap: s.nomor_sp_tap || s.no_sp_tap_tsk || null,
            tanggal_sp_tap: s.tanggal_sp_tap || s.tgl_sp_tap_tsk || null,
            tgl_sp_tap_tsk: s.tgl_sp_tap_tsk || s.tanggal_sp_tap || null,
            created_at: new Date().toISOString(),
          }));
          await supabase.from('case_suspects').insert(suspectsRows);
        }
      } catch (syncErr) {
        console.warn('Notice sinkronisasi case_suspects saat edit perkara:', syncErr);
      }

      const mergedCase = {
        ...caseItem,
        ...payloadUpdate,
        victims: cleanedVictims,
        pelapor_list: cleanedVictims,
        saksi_list: cleanedSaksi,
        terlapor_list: cleanedTerlapor,
        tersangka_list: cleanedTersangka,
        penyidik_penangan: {
          index: Number(selectedPenangan),
          nama: selectedPenyidik.nama,
          pangkat: selectedPenyidik.pangkat,
          nrp: selectedPenyidik.nrp,
          jabatan: selectedPenyidik.jabatan,
        },
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
        style={{ maxWidth: '850px', width: '95%', background: '#11161F', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: '18px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ background: '#131924', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 42, 42, 0.14)',
                border: '1px solid #FF2A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={20} color="#FF2A2A" />
            </div>
            <div>
              <h3 className="heading-font" style={{ fontSize: '15px', margin: 0, fontWeight: 700, color: '#FFFFFF' }}>Edit Data Berkas Perkara</h3>
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
              background: '#11161F',
            }}
          >
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 42, 42, 0.16)',
                  border: '1px solid #FF2A2A',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} color="#FF2A2A" style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Banner info */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 42, 42, 0.1)',
                border: '1px solid rgba(255, 42, 42, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: '#FF2A2A',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Shield size={16} color="#FF2A2A" style={{ flexShrink: 0 }} />
              <span style={{ color: '#CBD5E1' }}>
                Perubahan data perkara akan tersimpan langsung di database Supabase dan otomatis tersinkronisasi pada pembuatan dokumen mindik berikutnya.
              </span>
            </div>

            {/* SECTION 1: DATA LAPORAN POLISI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FF2A2A', letterSpacing: '0.5px' }}>
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

            {/* SECTION 2: MANAJEMEN SUBJEK HUKUM TERPADU (4 KATEGORI KUHAP LENGKAP) */}
            <div
              style={{
                padding: '16px',
                background: '#131924',
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
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(255, 42, 42, 0.15)',
                      color: '#CBD5E1',
                      border: '1px solid rgba(255, 42, 42, 0.4)',
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
                        background: isActive ? 'rgba(255, 42, 42, 0.2)' : '#11161F',
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

              {(() => {
                const tabConfig = {
                  pelapor: {
                    title: 'Pelapor / Saksi Korban',
                    list: victims,
                    onAdd: handleAddVictim,
                    onUpdate: handleUpdateVictim,
                    onRemove: handleRemoveVictim,
                    emptyText: 'Belum ada data Pelapor/Korban detail. Generator otomatis merujuk ke Nama Pelapor di atas jika kosong. Klik "+ Tambah Pelapor / Korban" untuk mengisi 13 field KUHAP.',
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
                    emptyText: 'Belum ada Terlapor terdaftar. Klik "+ Tambah Terlapor" untuk menambahkan calon tersangka.',
                    addLabel: '+ Tambah Terlapor',
                    canPromote: true,
                  },
                  tersangka: {
                    title: 'Tersangka',
                    list: tersangkaList,
                    onAdd: handleAddTersangka,
                    onUpdate: handleUpdateTersangka,
                    onRemove: handleRemoveTersangka,
                    emptyText: 'Belum ada Tersangka resmi. Klik tombol "Tetapkan Jadi Tersangka" pada kartu Terlapor atau otomatis saat menerbitkan SP.Tap Tersangka.',
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
                          fontSize: '12px',
                          fontWeight: 600,
                          background: 'rgba(255, 42, 42, 0.18)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 42, 42, 0.45)',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>{tabConfig.addLabel}</span>
                      </button>
                    </div>

                    {tabConfig.list.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          background: '#11161F',
                          border: '1px dashed rgba(255, 42, 42, 0.38)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
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
                              background: '#11161F',
                              border: '1px solid rgba(148, 163, 184, 0.16)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                                  {tabConfig.title} #{idx + 1}
                                </span>
                                {idx === 0 && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255, 42, 42, 0.15)',
                                      color: '#FF3B3B',
                                      border: '1px solid rgba(255, 42, 42, 0.35)',
                                    }}
                                  >
                                    Utama / Terpilih
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
                                    background: 'transparent',
                                    color: '#FF2A2A',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  title="Hapus Subjek Ini"
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus</span>
                                </button>
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
                                  required
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
                                <label className="form-label" style={{ fontSize: '11px' }}>3. NIK (Nomor KTP/Identitas)</label>
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
                                <label className="form-label" style={{ fontSize: '11px' }}>12. Tempat Tinggal / Kediaman Lengkap</label>
                                <input
                                  type="text"
                                  value={subj.alamat || ''}
                                  onChange={(e) => tabConfig.onUpdate(idx, 'alamat', e.target.value)}
                                  placeholder="Alamat lengkap tempat tinggal..."
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
                background: '#131924',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(148, 163, 184, 0.14)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#FF2A2A" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF2A2A' }}>
                    3. PEJABAT & TIM PENYIDIK PENANDATANGAN MINDIK
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
                  background: '#11161F',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
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
                  <Info size={12} color="#FF2A2A" />
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
                  const isPenanganChecked = Number(selectedPenangan) === slotIndex;
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
                        background: slotIndex === 1 ? 'rgba(255, 42, 42, 0.08)' : '#11161F',
                        border: slotIndex === 1 ? '1px solid rgba(255, 42, 42, 0.42)' : '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '10px',
                              background: slotIndex === 1 ? '#FFFFFF' : 'rgba(148, 163, 184, 0.1)',
                              color: slotIndex === 1 ? '#0B0E14' : '#CBD5E1',
                              border: slotIndex === 1 ? '1px solid #FFFFFF' : '1px solid rgba(148, 163, 184, 0.2)',
                            }}
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
                              borderRadius: '9999px',
                              background: isPenanganChecked ? 'rgba(255, 42, 42, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                              border: isPenanganChecked ? '1px solid #FF2A2A' : '1px solid var(--border-glass)',
                              fontSize: '10.5px',
                              color: isPenanganChecked ? '#FF2A2A' : 'var(--text-secondary)',
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
                      border: '1px dashed rgba(255, 42, 42, 0.45)',
                    }}
                  >
                    <Plus size={13} color="#FF2A2A" />
                    <span>+ Tampilkan Slot Penyidik {activeSlotsCount + 1} (Opsional)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#131924', borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}>
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
