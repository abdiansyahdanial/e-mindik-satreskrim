import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSignature, 
  ChevronRight, 
  Cloud, 
  Download, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  AlertTriangle,
  Upload,
  Shield,
  Clock,
  Calendar,
  MapPin
} from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';
import { mockPersonnel } from '../data/mockPersonnel';
import { supabase } from '../supabaseClient';
import { 
  deleteTemplateFromSupabase, 
  getDeletedTemplateCodes, 
  INDIVIDUAL_TSK_DOCS, 
  isIndividualSuspectDoc,
  PARENT_CASE_DOCS,
  getParentDocConfig
} from '../utils/templateHelper';
import OfficialDocPreview from '../components/OfficialDocPreview';
import { 
  generateAndDownloadDocx, 
  formatTanggalIndonesia, 
  getPenyidikPenangan, 
  formatPangkatLengkap,
  parseDateParts,
  hitungTanggalAkhirPenahanan,
  formatWaktuJam,
  terbilangTahun,
  getNamaHariIndonesia
} from '../services/mindikGenerator';
import { 
  MINDIK_PRESETS, 
  getMindikPreset, 
  getPresetTitle 
} from '../constants/mindikPresets';

export default function DocGeneratorView({ 
  cases = [], 
  personnel = [],
  initialCase = null, 
  initialTemplate = null,
  initialSuspectId = null,
  onSaveDocument,
  onOpenTemplateStudio,
  userRole = 'anggota'
}) {
  const isSuperAdmin = userRole === 'super_admin';

  const [allTemplates, setAllTemplates] = useState(() => {
    const deleted = getDeletedTemplateCodes();
    return mockTemplates.filter(t => !deleted.includes(t.code) && !deleted.includes(String(t.id)));
  });
  const [selectedCaseId, setSelectedCaseId] = useState(initialCase ? initialCase.id : (cases[0]?.id || ''));
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? initialTemplate.code : 'SPRIN_SIDIK'
  );
  const [formValues, setFormValues] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorNotice, setGeneratorNotice] = useState(null);

  // Multi-Tersangka & Penetapan Tersangka States
  const [caseSuspects, setCaseSuspects] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(initialSuspectId || '');
  const [urutanTersangka, setUrutanTersangka] = useState(1);

  // Helper konversi angka ke Romawi untuk label status tersangka (I, II, III, IV, dst.)
  const getRomanUrutan = (num) => {
    const n = parseInt(num, 10) || 1;
    const map = [
      { v: 10, s: 'X' },
      { v: 9, s: 'IX' },
      { v: 5, s: 'V' },
      { v: 4, s: 'IV' },
      { v: 1, s: 'I' }
    ];
    let res = '';
    let rem = n;
    for (const item of map) {
      while (rem >= item.v) {
        res += item.s;
        rem -= item.v;
      }
    }
    return res || 'I';
  };

  // Sync selectedSuspectId if initialSuspectId changes from props
  useEffect(() => {
    if (initialSuspectId) {
      setSelectedSuspectId(initialSuspectId);
    }
  }, [initialSuspectId]);

  // Multi-Korban States
  const [selectedVictimId, setSelectedVictimId] = useState('');

  // Template Management Modal States (Khusus Super Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);

  // Add Template Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('SURAT PERINTAH');
  const [newDescription, setNewDescription] = useState('');
  const [newDocxFile, setNewDocxFile] = useState(null);

  // Edit Template Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('SURAT PERINTAH');
  const [editDescription, setEditDescription] = useState('');

  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // 1. Fetch templates real-time from Supabase
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      const supabaseData = data || [];
      const merged = [...supabaseData];

      const deleted = getDeletedTemplateCodes();
      mockTemplates.forEach(mt => {
        if (!deleted.includes(mt.code) && !deleted.includes(String(mt.id)) && !merged.some(st => st.code === mt.code)) {
          merged.push(mt);
        }
      });
      setAllTemplates(merged);
    } catch (err) {
      console.warn('Could not fetch supabase templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const currentCase = cases.find(c => c.id === selectedCaseId) || cases[0];
  const currentTemplate = allTemplates.find(t => t.code === selectedTemplateCode) || allTemplates[0] || mockTemplates[0];

  // Data Korban dari perkara (mendukung array victims di root perkara atau references.victims)
  const registeredVictims = (() => {
    if (!currentCase) return [];
    if (Array.isArray(currentCase.victims) && currentCase.victims.length > 0) return currentCase.victims;
    if (Array.isArray(currentCase.references?.victims) && currentCase.references.victims.length > 0) return currentCase.references.victims;
    return [];
  })();

  const selectedVictim = registeredVictims.find(v => (v.id || v.nama) === selectedVictimId) || registeredVictims[0] || null;

  // Helper identifikasi dokumen perorangan (1 surat untuk 1 tersangka) dari whitelist 24 dokumen resmi
  const isIndividualDoc = isIndividualSuspectDoc(currentTemplate);

  // Helper identifikasi dokumen Penetapan Tersangka (SP.Tap TSK)
  const isSpTapDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c === 'SP_TAP_TSK' || c.includes('TAP_TSK') || t.includes('PENETAPAN TERSANGKA') || t.includes('SP.TAP');
  })();

  // Helper sinkronisasi nilai profil tersangka ke variabel tunggal template mindik
  const syncSuspectValues = (suspect, isSpTap = false) => {
    if (!suspect) return {};
    const spTapNum = suspect.nomor_sp_tap || suspect.no_sp_tap_tsk || '';
    const spTapDate = suspect.tanggal_sp_tap || suspect.tgl_sp_tap_tsk || '';
    const rawTglLahir = suspect.tgl_lahir || suspect.tanggal_lahir || '';
    const formattedTglLahir = formatTanggalIndonesia(rawTglLahir);
    const tempatLahir = suspect.tempat_lahir || '';
    const ttl = (tempatLahir && formattedTglLahir)
      ? `${tempatLahir}, ${formattedTglLahir}`
      : (suspect.ttl || suspect.pob_dob || tempatLahir || '');

    const rawUmur = suspect.umur || '';
    const umur = rawUmur
      ? (String(rawUmur).includes('Tahun') ? String(rawUmur) : `${rawUmur} Tahun`)
      : '';

    const rawUrutan = suspect.urutan_tersangka || urutanTersangka || 1;
    const roman = getRomanUrutan(rawUrutan);
    const labelTsk = suspect.status_tersangka_label || `Tersangka ${roman}`;

    const values = {
      NAMA_TERSANGKA: suspect.nama || '',
      nama_tersangka: suspect.nama || '',
      NIK: suspect.nik || '-',
      nik: suspect.nik || '-',
      TEMPAT_LAHIR: tempatLahir,
      tempat_lahir: tempatLahir,
      TGL_LAHIR: formattedTglLahir,
      tgl_lahir: formattedTglLahir,
      TTL: ttl,
      ttl: ttl,
      UMUR: umur,
      umur: umur,
      JENIS_KELAMIN: suspect.jenis_kelamin || 'Laki-laki',
      jenis_kelamin: suspect.jenis_kelamin || 'Laki-laki',
      AGAMA: suspect.agama || '',
      agama: suspect.agama || '',
      PEKERJAAN: suspect.pekerjaan || '',
      pekerjaan: suspect.pekerjaan || '',
      KEWARGANEGARAAN: suspect.kewarganegaraan || 'Indonesia',
      kewarganegaraan: suspect.kewarganegaraan || 'Indonesia',
      PENDIDIKAN: suspect.pendidikan || '',
      pendidikan: suspect.pendidikan || '',
      STATUS_KAWIN: suspect.status_pernikahan || suspect.status_kawin || suspect.marital_status || '',
      status_kawin: suspect.status_pernikahan || suspect.status_kawin || suspect.marital_status || '',
      ALAMAT: suspect.alamat || '',
      alamat: suspect.alamat || '',
      KONTAK: suspect.kontak || suspect.phone || suspect.no_hp || '',
      kontak: suspect.kontak || suspect.phone || suspect.no_hp || '',
      KONTAK_TERSANGKA: suspect.kontak || suspect.phone || suspect.no_hp || '',
      kontak_tersangka: suspect.kontak || suspect.phone || suspect.no_hp || '',

      // Status & Urutan Administrasi Tersangka
      URUTAN_TERSANGKA: rawUrutan,
      urutan_tersangka: rawUrutan,
      STATUS_TERSANGKA_LABEL: labelTsk,
      status_tersangka_label: labelTsk,

      // Rujukan tingkat tersangka
      NO_SP_TAP_TSK: spTapNum,
      no_sp_tap_tsk: spTapNum,
      TGL_SP_TAP_TSK: spTapDate,
      tgl_sp_tap_tsk: spTapDate,
      NO_SPRIN_KAP: suspect.no_sprin_kap || '',
      no_sprin_kap: suspect.no_sprin_kap || '',
      NO_SPRIN_HAN: suspect.no_sprin_han || '',
      no_sprin_han: suspect.no_sprin_han || '',
      NO_PANJANG_HAN_KN: suspect.no_panjang_han_kn || '',
      no_panjang_han_kn: suspect.no_panjang_han_kn || '',
    };

    // Khusus SP_TAP_TSK, sinkronkan nomor dan tanggal surat dari selectedSuspect
    // Jika belum ada, berikan format standar baku S.Tap.Tsk/...
    if (isSpTap) {
      const defaultSpTap = spTapNum || 'S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra';
      const defaultSpTapDate = spTapDate || new Date().toISOString().split('T')[0];
      values.NOMOR_SURAT = defaultSpTap;
      values.nomor_surat = defaultSpTap;
      values.DOC_NO = defaultSpTap;
      values.doc_no = defaultSpTap;
      values.nomor_sp_tap = defaultSpTap;
      values.no_sp_tap_tsk = defaultSpTap;
      values.nomor_sp_tap_tsk = defaultSpTap;
      values.NOMOR_SP_TAP = defaultSpTap;
      values.NO_SP_TAP_TSK = defaultSpTap;
      values.NOMOR_SP_TAP_TSK = defaultSpTap;
      values.TANGGAL_SURAT = defaultSpTapDate;
      values.tanggal_surat = defaultSpTapDate;
      values.DOC_DATE = defaultSpTapDate;
      values.doc_date = defaultSpTapDate;
      values.tanggal_sp_tap = defaultSpTapDate;
      values.tgl_sp_tap_tsk = defaultSpTapDate;
      values.TANGGAL_SP_TAP = defaultSpTapDate;
      values.TGL_SP_TAP_TSK = defaultSpTapDate;
    }

    return values;
  };

  // Helper sinkronisasi nilai profil korban ke variabel template mindik
  const syncVictimValues = (victim) => {
    const defaultNama = currentCase?.nama_pelapor || currentCase?.pelapor_name || '';
    const vNama = victim?.nama || defaultNama;
    const vNik = victim?.nik || '';
    const vJk = victim?.jenis_kelamin || (victim ? 'Laki-laki' : '');
    const vTtl = victim?.ttl || '';
    const rawUmur = victim?.umur || '';
    const vUmur = rawUmur
      ? (String(rawUmur).includes('Tahun') ? String(rawUmur) : `${rawUmur} Tahun`)
      : '';
    const vKerja = victim?.pekerjaan || '';
    const vWarga = victim?.kewarganegaraan || (vNama ? 'Indonesia' : '');
    const vDidik = victim?.pendidikan || '';
    const vAgama = victim?.agama || '';
    const vAlamat = victim?.alamat || (victim ? '' : (currentCase?.locus || ''));

    return {
      KORBAN_NAMA: vNama,
      korban_nama: vNama,
      KORBAN_NIK: vNik,
      korban_nik: vNik,
      KORBAN_JK: vJk,
      korban_jk: vJk,
      KORBAN_JENIS_KELAMIN: vJk,
      korban_jenis_kelamin: vJk,
      KORBAN_TTL: vTtl,
      korban_ttl: vTtl,
      KORBAN_UMUR: vUmur,
      korban_umur: vUmur,
      KORBAN_KERJA: vKerja,
      korban_kerja: vKerja,
      KORBAN_PEKERJAAN: vKerja,
      korban_pekerjaan: vKerja,
      KORBAN_WARGA: vWarga,
      korban_warga: vWarga,
      KORBAN_KEWARGANEGARAAN: vWarga,
      korban_kewarganegaraan: vWarga,
      KORBAN_DIDIK: vDidik,
      korban_didik: vDidik,
      KORBAN_PENDIDIKAN: vDidik,
      korban_pendidikan: vDidik,
      KORBAN_AGAMA: vAgama,
      korban_agama: vAgama,
      KORBAN_ALAMAT: vAlamat,
      korban_alamat: vAlamat,
    };
  };

  // Helper identifikasi apakah template membutuhkan identitas korban
  const isVictimDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c.includes('VER') || 
           c.includes('KORBAN') || 
           c.includes('HAK_KORBAN') || 
           t.includes('KORBAN') || 
           t.includes('VISUM') ||
           (Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.some(f => (f.field_key || f.key || '').toUpperCase().includes('KORBAN')));
  })();

  // Helper identifikasi dokumen Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)
  const isSprinGasSidik = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c === 'SPRIN_GAS_SIDIK' || 
           c === 'SPRIN_TUGAS_PENYIDIKAN' || 
           c.includes('GAS_SIDIK') || 
           t.includes('TUGAS PENYIDIKAN');
  })();

  // Helper identifikasi dokumen SP.Sidik Induk
  const isSprinSidik = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (isSprinGasSidik) return false;
    return c === 'SPRIN_SIDIK' || c === 'SP_SIDIK' || 
           (c.includes('SIDIK') && !c.includes('GAS')) || 
           (t.includes('PENYIDIKAN') && !t.includes('TUGAS'));
  })();

  const isSidikDoc = isSprinSidik;

  // Helper identifikasi dokumen BA Penangkapan (BA_KAP / SPRIN_KAP_DAN_BA)
  const isBaKapDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (c === 'BA_KAP' || c === 'SPRIN_KAP_DAN_BA' || c === 'SPRIN_KAP') return true;
    if (c.includes('BA_KAP')) return true;
    if (t.includes('PENANGKAPAN') && (t.includes('BERITA ACARA') || t.includes('DAN BA') || t.includes('SURAT PERINTAH'))) return true;
    return false;
  })();

  // Helper identifikasi dokumen Sprin & BA Penahanan (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA)
  const isHanDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (c === 'SPRIN_HAN' || c === 'BA_HAN' || c === 'SPRIN_HAN_DAN_BA') return true;
    if (c.includes('SPRIN_HAN') || c.includes('BA_HAN')) return true;
    if (t.includes('PENAHANAN') && !t.includes('PERPANJANGAN') && !t.includes('PENGELUARAN') && !t.includes('PENGALIHAN')) return true;
    return false;
  })();

  // Evaluasi Konfigurasi Dokumen Induk (Universal Auto-Sync)
  const activeParentConfig = getParentDocConfig(currentTemplate);
  const isCurrentParentDoc = Boolean(activeParentConfig);

  // 2. Fetch Suspects for currentCase from Supabase (BAGIAN 3 & 4)
  const [isLoadingSuspects, setIsLoadingSuspects] = useState(false);

  useEffect(() => {
    if (!currentCase?.id) return;
    const loadSuspects = async () => {
      setIsLoadingSuspects(true);
      try {
        const { data, error } = await supabase
          .from('case_suspects')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          setCaseSuspects(data);
          setSelectedSuspectId(prev => {
            if (initialSuspectId && data.some(s => s.id === initialSuspectId)) return initialSuspectId;
            if (prev && data.some(s => s.id === prev)) return prev;
            return data[0].id;
          });
        } else {
          // Fallback ke daftar terlapor_list di currentCase atau person legacy
          let fallbacks = [];
          if (Array.isArray(currentCase?.terlapor_list) && currentCase.terlapor_list.length > 0) {
            fallbacks = currentCase.terlapor_list.map((t, idx) => ({
              id: t.id || `terlapor-${idx}`,
              case_id: currentCase?.id,
              nama: t.nama,
              nik: t.nik || '-',
              jenis_kelamin: t.jenis_kelamin || 'Laki-laki',
              tempat_lahir: t.tempat_lahir || '',
              tgl_lahir: t.tgl_lahir || '',
              umur: t.umur || '',
              agama: t.agama || '',
              pekerjaan: t.pekerjaan || '',
              kewarganegaraan: t.kewarganegaraan || 'Indonesia',
              pendidikan: t.pendidikan || '',
              status_pernikahan: t.status_pernikahan || '',
              alamat: t.alamat || '',
              kontak: t.kontak || '',
              status: t.status || 'terlapor',
              no_sp_tap_tsk: t.no_sp_tap_tsk || '',
              nomor_sp_tap: t.no_sp_tap_tsk || '',
              tanggal_sp_tap: t.tgl_sp_tap_tsk || '',
              tgl_sp_tap_tsk: t.tgl_sp_tap_tsk || '',
              urutan_tersangka: t.urutan_tersangka || (idx + 1),
              status_tersangka_label: t.status_tersangka_label || ''
            }));
          } else if (currentCase?.person?.nama && currentCase?.person?.nama !== 'Dalam Penyelidikan') {
            const fallback = {
              id: 'legacy-suspect-1',
              case_id: currentCase?.id,
              nama: currentCase?.person?.nama,
              nik: currentCase?.person?.nik || '-',
              jenis_kelamin: currentCase?.person?.gender || 'Laki-laki',
              tempat_lahir: (currentCase?.person?.pob_dob || '').split(',')[0] || 'Kolaka Timur',
              tgl_lahir: (currentCase?.person?.pob_dob || '').split(',')[1]?.trim() || '',
              umur: currentCase?.person?.umur || '30',
              agama: currentCase?.person?.agama || 'Islam',
              pekerjaan: currentCase?.person?.pekerjaan || 'Swasta',
              kewarganegaraan: currentCase?.person?.kewarganegaraan || 'Indonesia',
              pendidikan: currentCase?.person?.pendidikan || 'SMA',
              status_pernikahan: currentCase?.person?.marital_status || 'Kawin',
              alamat: currentCase?.person?.alamat || currentCase?.locus || '',
              kontak: currentCase?.person?.kontak || '',
              status: currentCase?.references?.no_sp_tap_tsk ? 'tersangka' : 'terlapor',
              no_sp_tap_tsk: currentCase?.references?.no_sp_tap_tsk || '',
              nomor_sp_tap: currentCase?.references?.no_sp_tap_tsk || '',
              tanggal_sp_tap: currentCase?.references?.tgl_sp_tap_tsk || '',
              tgl_sp_tap_tsk: currentCase?.references?.tgl_sp_tap_tsk || '',
              no_sprin_kap: currentCase?.references?.no_sprin_kap || '',
              no_sprin_han: currentCase?.references?.no_sprin_han || '',
            };
            fallbacks = [fallback];
          }

          setCaseSuspects(fallbacks);
          setSelectedSuspectId(prev => {
            if (initialSuspectId && fallbacks.some(s => s.id === initialSuspectId)) return initialSuspectId;
            return fallbacks[0]?.id || '';
          });
        }
      } catch (e) {
        console.warn('Error loading case suspects:', e);
      } finally {
        setIsLoadingSuspects(false);
      }
    };

    loadSuspects();
  }, [currentCase?.id, initialSuspectId]);

  const suspectList = caseSuspects || [];
  const selectedSuspect = suspectList.find(s => s.id === selectedSuspectId) || suspectList[0] || null;
  const selectedTemplate = currentTemplate;
  const activeCase = currentCase;
  const prevTemplateIdRef = useRef(currentTemplate?.id || selectedTemplateCode);

  const setNomorSurat = (val) => {
    setFormValues(prev => ({
      ...prev,
      NOMOR_SURAT: val,
      nomor_surat: val,
      DOC_NO: val,
      doc_no: val,
      nomor_sp_tap: val,
      no_sp_tap_tsk: val,
      nomor_sp_tap_tsk: val,
      NOMOR_SP_TAP: val,
      NO_SP_TAP_TSK: val,
      NOMOR_SP_TAP_TSK: val,
    }));
  };

  const setTanggalSurat = (val) => {
    setFormValues(prev => ({
      ...prev,
      TANGGAL_SURAT: val,
      tanggal_surat: val,
      DOC_DATE: val,
      doc_date: val,
      tanggal_sp_tap: val,
      tgl_sp_tap_tsk: val,
      TANGGAL_SP_TAP: val,
      TGL_SP_TAP_TSK: val,
    }));
  };

  // Handler perubahan input penomoran SP.Tap TSK (Two-way binding ke preview & variabel template)
  const handleNomorSpTapChange = (val) => {
    setFormValues((prev) => ({
      ...prev,
      NOMOR_SURAT: val,
      nomor_surat: val,
      DOC_NO: val,
      doc_no: val,
      nomor_sp_tap: val,
      no_sp_tap_tsk: val,
      nomor_sp_tap_tsk: val,
      NOMOR_SP_TAP: val,
      NO_SP_TAP_TSK: val,
      NOMOR_SP_TAP_TSK: val,
    }));
    setIsSaved(false);
  };

  // Handler perubahan input tanggal penetapan tersangka
  const handleTanggalSpTapChange = (val) => {
    setFormValues((prev) => ({
      ...prev,
      TANGGAL_SURAT: val,
      tanggal_surat: val,
      DOC_DATE: val,
      doc_date: val,
      tanggal_sp_tap: val,
      tgl_sp_tap_tsk: val,
      TANGGAL_SP_TAP: val,
      TGL_SP_TAP_TSK: val,
    }));
    setIsSaved(false);
  };

  // Pastikan jika dokumen perorangan aktif dan belum ada tersangka terpilih, tetapkan tersangka pertama (suspects[0])
  useEffect(() => {
    if (isIndividualDoc && caseSuspects.length > 0) {
      if (!selectedSuspectId || !caseSuspects.some(s => s.id === selectedSuspectId)) {
        setSelectedSuspectId(caseSuspects[0].id);
      }
    }
  }, [isIndividualDoc, caseSuspects, selectedSuspectId]);

  // 1. Reset / Muat Ulang Format Nomor Sesuai Template Aktif:
  // Pastikan saat terjadi pergantian dokumen (selectedTemplate berubah), sistem membaca format nomor spesifik template tersebut atau mengosongkannya jika bukan SP_TAP_TSK
  useEffect(() => {
    if (!selectedTemplate) return;

    const code = (selectedTemplate.code || '').toUpperCase().trim();
    const isSpTap = code === 'SP_TAP_TSK' || (selectedTemplate.name || '').toUpperCase().includes('TAP') || (selectedTemplate.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    if (isSpTap) {
      // Khusus SP TAP TSK: sinkronkan dari data penetapan tersangka jika tersedia atau berikan format standar baku
      const existingNo = selectedSuspect?.nomor_sp_tap || selectedSuspect?.no_sp_tap_tsk;
      const existingDate = selectedSuspect?.tanggal_sp_tap || selectedSuspect?.tgl_sp_tap_tsk;
      setNomorSurat(existingNo || 'S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra');
      setTanggalSurat(existingDate || new Date().toISOString().split('T')[0]);
    } else {
      // DOKUMEN LAIN (SPDP, SPRINT, BA, dll.):
      // Ambil format/nomor default dari master template aktif atau preset Mindik
      const templateDefaultNo = selectedTemplate.default_number_format || selectedTemplate.nomor_surat_format || '';
      const presetFields = getMindikPreset(code);
      const presetNomorSurat = presetFields?.find(f => (f.tag || '').toUpperCase() === 'NOMOR_SURAT')?.default;
      const presetTanggalSurat = presetFields?.find(f => (f.tag || '').toUpperCase() === 'TANGGAL_SURAT')?.default;
      
      if (templateDefaultNo) {
        setNomorSurat(templateDefaultNo);
      } else if (presetNomorSurat) {
        setNomorSurat(presetNomorSurat);
      } else if (code === 'SPRIN_GAS_SIDIK' || code === 'SPGAS_SIDIK' || code === 'SPRIN_TUGAS_PENYIDIKAN' || code.includes('GAS_SIDIK') || (selectedTemplate.title || '').toUpperCase().includes('TUGAS PENYIDIKAN')) {
        setNomorSurat('SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra');
      } else if (code.includes('SPDP')) {
        // Gunakan format SPDP perkara jika ada, atau kembalikan ke default input penomoran SPDP
        setNomorSurat(activeCase?.no_spdp || 'B/SPDP/….../I/RES.0.0./2026/Satreskrim');
      } else {
        setNomorSurat('');
      }
      
      // Kembalikan tanggal surat ke tanggal preset atau hari ini
      setTanggalSurat(presetTanggalSurat || new Date().toISOString().split('T')[0]);
    }
  }, [selectedTemplate?.id, selectedTemplate?.code]); // Trigger saat ID atau kode template berganti

  // Sinkronisasi Profil Tersangka saat Tersangka Berubah
  useEffect(() => {
    if (!selectedSuspect) return;

    if (selectedSuspect.urutan_tersangka) {
      setUrutanTersangka(Number(selectedSuspect.urutan_tersangka) || 1);
    } else if (isSpTapDoc) {
      const establishedCount = caseSuspects.filter(s => s.status === 'tersangka' || s.no_sp_tap_tsk).length;
      setUrutanTersangka(establishedCount + 1);
    }

    if (isIndividualDoc || isSpTapDoc) {
      const suspectFields = syncSuspectValues(selectedSuspect, isSpTapDoc);
      setFormValues(prev => ({
        ...prev,
        ...suspectFields,
        ALAMAT: selectedSuspect.alamat || prev.ALAMAT || prev.alamat || '',
        alamat: selectedSuspect.alamat || prev.ALAMAT || prev.alamat || '',
        NAMA_TERLAPOR: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.NAMA_TERLAPOR || '',
        nama_terlapor: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.nama_terlapor || '',
      }));
    }
  }, [selectedSuspect, isIndividualDoc, isSpTapDoc]);

  // Handler ganti tersangka pilihan
  const handleSuspectChange = (suspectId) => {
    setSelectedSuspectId(suspectId);
    const found = caseSuspects.find(s => s.id === suspectId);
    if (found) {
      let nextUrutan = found.urutan_tersangka;
      if (!nextUrutan) {
        if (isSpTapDoc) {
          const establishedCount = caseSuspects.filter(s => (s.status === 'tersangka' || s.no_sp_tap_tsk) && s.id !== suspectId).length;
          nextUrutan = establishedCount + 1;
        } else {
          nextUrutan = 1;
        }
      }
      const numUrutan = Number(nextUrutan) || 1;
      setUrutanTersangka(numUrutan);

      const suspectFields = syncSuspectValues(found, isSpTapDoc);

      setFormValues(prev => {
        const next = {
          ...prev,
          ...suspectFields,
          URUTAN_TERSANGKA: numUrutan,
          urutan_tersangka: numUrutan,
          STATUS_TERSANGKA_LABEL: `Tersangka ${getRomanUrutan(numUrutan)}`,
          status_tersangka_label: `Tersangka ${getRomanUrutan(numUrutan)}`,
          ALAMAT: found.alamat || prev.ALAMAT || prev.alamat || '',
          alamat: found.alamat || prev.ALAMAT || prev.alamat || '',
          // NAMA_TERLAPOR tetap murni dari data Laporan Polisi (LP) awal
          NAMA_TERLAPOR: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.NAMA_TERLAPOR || '',
          nama_terlapor: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.nama_terlapor || '',
        };

        if (isSpTapDoc) {
          const sNo = found.nomor_sp_tap || found.no_sp_tap_tsk || 'S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra';
          const sDate = found.tanggal_sp_tap || found.tgl_sp_tap_tsk || new Date().toISOString().split('T')[0];
          next.NOMOR_SURAT = sNo;
          next.nomor_surat = sNo;
          next.DOC_NO = sNo;
          next.doc_no = sNo;
          next.nomor_sp_tap = sNo;
          next.no_sp_tap_tsk = sNo;
          next.nomor_sp_tap_tsk = sNo;
          next.NOMOR_SP_TAP = sNo;
          next.NO_SP_TAP_TSK = sNo;
          next.NOMOR_SP_TAP_TSK = sNo;
          next.TANGGAL_SURAT = sDate;
          next.tanggal_surat = sDate;
          next.DOC_DATE = sDate;
          next.doc_date = sDate;
          next.tanggal_sp_tap = sDate;
          next.tgl_sp_tap_tsk = sDate;
          next.TANGGAL_SP_TAP = sDate;
          next.TGL_SP_TAP_TSK = sDate;
        }

        return next;
      });
    }
  };

  // Sinkronisasi Profil Korban Terpilih
  useEffect(() => {
    if (registeredVictims.length > 0) {
      if (!selectedVictimId || !registeredVictims.some(v => (v.id || v.nama) === selectedVictimId)) {
        setSelectedVictimId(registeredVictims[0].id || registeredVictims[0].nama || 'vic-0');
      }
    } else {
      setSelectedVictimId('');
    }
  }, [currentCase?.id, registeredVictims.length]);

  // Handler ganti korban pilihan
  const handleVictimChange = (victimId) => {
    setSelectedVictimId(victimId);
    const found = registeredVictims.find(v => (v.id || v.nama) === victimId) || registeredVictims[0];
    const victimFields = syncVictimValues(found);
    setFormValues(prev => ({
      ...prev,
      ...victimFields
    }));
  };

  // 3. Initialize or re-fill form defaults when case or template changes
  useEffect(() => {
    if (!currentTemplate || !currentCase) return;

    const initial = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const isTapTskDoc = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    // Inisialisasi Default Nilai Korban (VER, HAK_KORBAN, dll.)
    const victimFields = syncVictimValues(selectedVictim);
    Object.keys(victimFields).forEach(vk => {
      initial[vk] = victimFields[vk];
    });

    // Rantai Rujukan Baku dari Perkara (Chain of Reference)
    initial['NOMOR_LP'] = currentCase?.nomor_lp || currentCase?.no_lp || '';
    initial['TANGGAL_LP'] = currentCase?.tanggal_lp || currentCase?.sprin_date || '';
    initial['TGL_LP'] = initial['TANGGAL_LP'];

    initial['NO_SPRIN_SIDIK'] = currentCase?.no_sprin_sidik || '';
    initial['TGL_SPRIN_SIDIK'] = currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || (isSprinSidik ? todayStr : '');
    initial['TANGGAL_SPRIN_SIDIK'] = initial['TGL_SPRIN_SIDIK'];

    initial['NO_SPRIN_GAS_SIDIK'] = currentCase?.no_sprin_gas_sidik || '';
    initial['TGL_SPRIN_GAS_SIDIK'] = currentCase?.tgl_sprin_gas_sidik || (isSprinGasSidik ? todayStr : '');
    initial['TANGGAL_SPRIN_GAS_SIDIK'] = initial['TGL_SPRIN_GAS_SIDIK'];

    // Universal Auto-Sync Dokumen Induk (Parent Case Document)
    if (isCurrentParentDoc && activeParentConfig) {
      const parentDate = currentCase?.[activeParentConfig.targetTglCol] || todayStr;
      (activeParentConfig.tglTags || []).forEach(tag => {
        initial[tag] = parentDate;
        initial[tag.toLowerCase()] = parentDate;
      });
      const parentNo = currentCase?.[activeParentConfig.targetNoCol] || '';
      (activeParentConfig.noTags || []).forEach(tag => {
        initial[tag] = parentNo;
        initial[tag.toLowerCase()] = parentNo;
      });
    }

    initial['NO_SPDP'] = currentCase?.no_spdp || '';
    initial['TGL_SPDP'] = currentCase?.tgl_spdp || '';
    initial['TANGGAL_SPDP'] = initial['TGL_SPDP'];

    if (selectedSuspect) {
      const suspectFields = syncSuspectValues(selectedSuspect, isTapTskDoc);
      Object.assign(initial, suspectFields);
    }

    // Otomatisasi Penandatangan Mindik dari Data Perkara Aktif
    initial['ATASAN_NAMA'] = currentCase?.kasat_nama || '';
    initial['ATASAN_PANGKAT'] = formatPangkatLengkap(currentCase?.kasat_pangkat || '');
    initial['ATASAN_NRP'] = currentCase?.kasat_nrp || '';
    initial['ATASAN_JABATAN'] = currentCase?.kasat_jabatan || 'Kasat Reskrim';

    initial['PENYIDIK_NAMA'] = currentCase?.penyidik_1_nama || '';
    initial['PENYIDIK_PANGKAT'] = formatPangkatLengkap(currentCase?.penyidik_1_pangkat || '');
    initial['PENYIDIK_NRP'] = currentCase?.penyidik_1_nrp || '';
    initial['PENYIDIK_JABATAN'] = currentCase?.penyidik_1_jabatan || '';

    // Data Penyidik Penangan Perkara
    const penanganDocCase = getPenyidikPenangan(currentCase);
    initial['PENYIDIK_PENANGAN_NAMA'] = penanganDocCase?.nama || currentCase?.penyidik_1_nama || '';
    initial['PENYIDIK_PENANGAN_PANGKAT'] = formatPangkatLengkap(penanganDocCase?.pangkat || currentCase?.penyidik_1_pangkat || '');
    initial['PENYIDIK_PENANGAN_NRP'] = penanganDocCase?.nrp || currentCase?.penyidik_1_nrp || '';
    initial['PENYIDIK_PENANGAN_JABATAN'] = penanganDocCase?.jabatan || currentCase?.penyidik_1_jabatan || '';

    for (let i = 1; i <= 5; i++) {
      initial[`PENYIDIK_${i}_NAMA`] = currentCase?.[`penyidik_${i}_nama`] || '';
      initial[`PENYIDIK_${i}_PANGKAT`] = currentCase?.[`penyidik_${i}_pangkat`] || '';
      initial[`PENYIDIK_${i}_NRP`] = currentCase?.[`penyidik_${i}_nrp`] || '';
      initial[`PENYIDIK_${i}_JABATAN`] = currentCase?.[`penyidik_${i}_jabatan`] || '';
    }

    // Inisialisasi Default Nilai Penangkapan (BA_KAP / SPRIN_KAP_DAN_BA)
    if (isBaKapDoc) {
      const tglKap = selectedSuspect?.tgl_sprin_kap || todayStr;
      const tempatKap = 'Kab. Kolaka Timur';
      initial['TANGGAL_KAP'] = tglKap;
      initial['JAM_KAP'] = '10.00 WITA';
      initial['TEMPAT_KAP'] = tempatKap;
      // Auto-mirror ke tanggal surat & lokasi dokumen naskah dinas
      initial['TANGGAL_SURAT'] = tglKap;
      initial['DOC_DATE'] = tglKap;
      initial['TEMPAT_SURAT'] = tempatKap;
      initial['DOC_LOCATION'] = tempatKap;
    }

    // Inisialisasi Default Nilai Penahanan (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA)
    if (isHanDoc) {
      const tglMulai = selectedSuspect?.tgl_sprin_han || todayStr;
      const tempatHan = 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur';
      initial['TANGGAL_MULAI_HAN'] = tglMulai;
      initial['TANGGAL_AKHIR_HAN'] = hitungTanggalAkhirPenahanan(tglMulai, 20);
      initial['TEMPAT_HAN'] = tempatHan;
      initial['TANGGAL_HAN'] = tglMulai;
      initial['JAM_HAN'] = '10.00 WITA';
      // Auto-mirror ke tanggal surat & lokasi dokumen naskah dinas
      initial['TANGGAL_SURAT'] = tglMulai;
      initial['DOC_DATE'] = tglMulai;
      initial['TEMPAT_SURAT'] = tempatHan;
      initial['DOC_LOCATION'] = tempatHan;
    }

    const defaultDocFields = [
      { 
        field_key: 'NOMOR_SURAT', 
        field_label: 'Nomor Surat', 
        field_type: 'text', 
        default_value: isSprinGasSidik ? 'SP.Gas.Sidik/___/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra' : '', 
        is_required: true 
      },
      { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: todayStr, is_required: true },
      ...(isSprinSidik ? [
        { field_key: 'TGL_SPRIN_SIDIK', field_label: 'Tanggal Penetapan SP.Sidik', field_type: 'date', default_value: currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || todayStr, is_required: true }
      ] : []),
      { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
      { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
      { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
      { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
    ];

    const presetForTemplate = getMindikPreset(currentTemplate?.code);

    let fields = Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate?.dynamic_fields.length > 0 
      ? [...currentTemplate.dynamic_fields] 
      : (presetForTemplate && presetForTemplate.length > 0
          ? presetForTemplate.map(p => ({
              field_key: p.tag,
              field_label: p.label,
              field_type: p.type,
              default_value: p.default,
              is_required: p.required
            }))
          : defaultDocFields);

    // Hapus referensi ATASAN_JABATAN karena jabatan Kasat tercetak permanen di template
    fields = fields.filter(f => (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase() !== 'ATASAN_JABATAN');

    // Hapus input manual rujukan dokumen induk jika dokumen yang dibuka adalah dokumen induk itu sendiri
    if (isCurrentParentDoc && activeParentConfig) {
      const redundantKeys = [
        ...(activeParentConfig.noTags || []),
        ...(activeParentConfig.tglTags || []),
        activeParentConfig.targetNoCol?.toUpperCase(),
        activeParentConfig.targetTglCol?.toUpperCase()
      ].filter(Boolean);

      fields = fields.filter(f => {
        const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
        return !redundantKeys.includes(k);
      });
    }

    fields.forEach((field) => {
      const rawKey = field.field_key || field.key || '';
      const cleanKey = rawKey.replace(/[{}]/g, '').trim();
      if (!cleanKey) return;

      const upperKey = cleanKey.toUpperCase();
      const presetFieldMatch = presetForTemplate?.find(p => (p.tag || '').toUpperCase() === upperKey);
      const defVal = (field.default_value !== undefined && field.default_value !== '')
        ? field.default_value
        : (presetFieldMatch?.default !== undefined
            ? presetFieldMatch.default
            : (field.placeholder || ''));

      // Tentukan nilai default sesuai kamus standar (tanpa string fallback bentrok)
      if (upperKey === 'TANGGAL_SURAT' || upperKey === 'DOC_DATE') {
        if (isTapTskDoc && (selectedSuspect?.tanggal_sp_tap || selectedSuspect?.tgl_sp_tap_tsk)) {
          initial[cleanKey] = selectedSuspect?.tanggal_sp_tap || selectedSuspect?.tgl_sp_tap_tsk;
        } else if (isCurrentParentDoc && activeParentConfig && currentCase?.[activeParentConfig.targetTglCol]) {
          initial[cleanKey] = currentCase[activeParentConfig.targetTglCol];
        } else {
          initial[cleanKey] = defVal || todayStr;
        }
      } else if (upperKey === 'NOMOR_SURAT' || upperKey === 'DOC_NO') {
        const tplCode = (currentTemplate?.code || '').toUpperCase().trim();
        const templateDefaultNo = currentTemplate?.default_number_format || currentTemplate?.nomor_surat_format || '';
        if (isTapTskDoc && (selectedSuspect?.nomor_sp_tap || selectedSuspect?.no_sp_tap_tsk)) {
          initial[cleanKey] = selectedSuspect?.nomor_sp_tap || selectedSuspect?.no_sp_tap_tsk;
        } else if (isCurrentParentDoc && activeParentConfig && currentCase?.[activeParentConfig.targetNoCol]) {
          initial[cleanKey] = currentCase[activeParentConfig.targetNoCol];
        } else if (templateDefaultNo) {
          initial[cleanKey] = templateDefaultNo;
        } else if (defVal) {
          initial[cleanKey] = defVal;
        } else if (isSprinGasSidik || tplCode === 'SPRIN_GAS_SIDIK' || tplCode === 'SPGAS_SIDIK' || tplCode.includes('GAS_SIDIK')) {
          initial[cleanKey] = 'SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra';
        } else if (tplCode.includes('SPDP')) {
          initial[cleanKey] = currentCase?.no_spdp || 'B/SPDP/….../I/RES.0.0./2026/Satreskrim';
        } else {
          initial[cleanKey] = '';
        }
      } else if (upperKey === 'TGL_SPRIN_SIDIK' || upperKey === 'TANGGAL_SPRIN_SIDIK') {
        initial[cleanKey] = currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || (isSprinSidik ? todayStr : '');
      } else if (upperKey === 'NO_SPRIN_GAS_SIDIK') {
        initial[cleanKey] = currentCase?.no_sprin_gas_sidik || '';
      } else if (upperKey === 'TGL_SPRIN_GAS_SIDIK' || upperKey === 'TANGGAL_SPRIN_GAS_SIDIK') {
        initial[cleanKey] = currentCase?.tgl_sprin_gas_sidik || (isSprinGasSidik ? todayStr : '');
      } else if (upperKey === 'NO_SPRIN_SIDIK') {
        initial[cleanKey] = currentCase?.no_sprin_sidik || '';
      } else if (upperKey === 'NOMOR_LP' || upperKey === 'NO_LP') {
        initial[cleanKey] = currentCase?.nomor_lp || currentCase?.no_lp || '';
      } else if (upperKey === 'TANGGAL_LP' || upperKey === 'TGL_LP') {
        initial[cleanKey] = currentCase?.tanggal_lp || currentCase?.sprin_date || '';
      } else if (upperKey === 'NO_SPDP') {
        initial[cleanKey] = currentCase?.no_spdp || '';
      } else if (upperKey === 'TGL_SPDP' || upperKey === 'TANGGAL_SPDP') {
        initial[cleanKey] = currentCase?.tgl_spdp || '';
      } else if (upperKey === 'TEMPAT_SURAT' || upperKey === 'DOC_LOCATION') {
        initial[cleanKey] = defVal || 'Tirawuta';
      } else if (upperKey === 'MASA_BERLAKU' || upperKey === 'DOC_VALIDITY') {
        initial[cleanKey] = defVal || '30 (tiga puluh) hari';
      } else if (upperKey === 'TUJUAN_SURAT' || upperKey === 'DOC_TARGET') {
        initial[cleanKey] = defVal || 'Kepala Kejaksaan Negeri Kolaka';
      } else if (upperKey === 'ALAMAT_TUJUAN' || upperKey === 'DOC_TARGET_ADDR') {
        initial[cleanKey] = defVal || 'Jl. Dr. Sutomo No. 5, Kolaka';
      } else if (upperKey === 'PENYIDIK_NAMA') {
        initial[cleanKey] = currentCase?.penyidik_1_nama || defVal || '';
      } else if (upperKey === 'PENYIDIK_PANGKAT') {
        initial[cleanKey] = formatPangkatLengkap(currentCase?.penyidik_1_pangkat || defVal || '');
      } else if (upperKey === 'PENYIDIK_NRP') {
        initial[cleanKey] = currentCase?.penyidik_1_nrp || defVal || '';
      } else if (upperKey === 'PENYIDIK_JABATAN') {
        initial[cleanKey] = currentCase?.penyidik_1_jabatan || defVal || '';
      } else if (upperKey === 'ATASAN_NAMA') {
        initial[cleanKey] = currentCase?.kasat_nama || defVal || '';
      } else if (upperKey === 'ATASAN_PANGKAT') {
        initial[cleanKey] = formatPangkatLengkap(currentCase?.kasat_pangkat || defVal || '');
      } else if (upperKey === 'ATASAN_NRP') {
        initial[cleanKey] = currentCase?.kasat_nrp || defVal || '';
      } else if (upperKey.startsWith('PENYIDIK_')) {
        // Otomatis sinkronkan slot PENYIDIK_1..5
        const slotMatch = upperKey.match(/^PENYIDIK_([1-5])_(NAMA|PANGKAT|NRP|JABATAN)$/);
        if (slotMatch) {
          const sNum = slotMatch[1];
          const sProp = slotMatch[2].toLowerCase();
          initial[cleanKey] = currentCase?.[`penyidik_${sNum}_${sProp}`] || defVal || '';
        } else {
          initial[cleanKey] = defVal || '';
        }
      } else if (upperKey === 'NO_SP_TAP_TSK' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sp_tap_tsk || '';
      } else if (upperKey === 'TGL_SP_TAP_TSK' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.tgl_sp_tap_tsk || '';
      } else if (upperKey === 'NO_SPRIN_KAP' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sprin_kap || '';
      } else if (upperKey === 'NO_SPRIN_HAN' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sprin_han || '';
      } else if (upperKey === 'TGL_SPRIN_HAN' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.tgl_sprin_han || '';
      } else if (upperKey.startsWith('KORBAN_') || upperKey.startsWith('korban_')) {
        initial[cleanKey] = victimFields[upperKey] !== undefined ? victimFields[upperKey] : (defVal || '');
      } else if (field.field_type === 'select_personnel' || field.type === 'select_personnel') {
        const filter = field.role_filter;
        const matched = activePersonnel.find(p => !filter || p.role === filter);
        initial[cleanKey] = matched ? matched.id : '';
      } else {
        initial[cleanKey] = defVal || '';
      }
    });

    setFormValues(prev => {
      const isTemplateChanged = prevTemplateIdRef.current !== (currentTemplate?.id || selectedTemplateCode);
      prevTemplateIdRef.current = currentTemplate?.id || selectedTemplateCode;

      // Pertahankan input pengguna yang sudah diketik
      const merged = { ...initial };
      Object.keys(prev || {}).forEach(k => {
        const cleanK = k.replace(/[{}]/g, '').trim();
        const upperK = cleanK.toUpperCase();
        const isDocNumberOrDateField = ['NOMOR_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE'].includes(upperK);

        // Jika template berganti, jangan biarkan nomor surat atau tanggal surat dari template sebelumnya terbawa!
        if (isTemplateChanged && isDocNumberOrDateField) {
          return;
        }

        if (prev[k] !== undefined && prev[k] !== '') {
          merged[cleanK] = prev[k];
        }
      });

      // Jika dokumen adalah SP TAP TSK dan tersangka memiliki nomor/tanggal SP TAP, utamakan data tersangka
      if (isTapTskDoc && selectedSuspect) {
        const spTapNum = selectedSuspect.nomor_sp_tap || selectedSuspect.no_sp_tap_tsk;
        const spTapDate = selectedSuspect.tanggal_sp_tap || selectedSuspect.tgl_sp_tap_tsk;
        if (spTapNum) {
          merged['NOMOR_SURAT'] = spTapNum;
          merged['nomor_surat'] = spTapNum;
          merged['DOC_NO'] = spTapNum;
          merged['doc_no'] = spTapNum;
          merged['nomor_sp_tap'] = spTapNum;
          merged['no_sp_tap_tsk'] = spTapNum;
          merged['nomor_sp_tap_tsk'] = spTapNum;
          merged['NOMOR_SP_TAP'] = spTapNum;
          merged['NO_SP_TAP_TSK'] = spTapNum;
          merged['NOMOR_SP_TAP_TSK'] = spTapNum;
        }
        if (spTapDate) {
          merged['TANGGAL_SURAT'] = spTapDate;
          merged['tanggal_surat'] = spTapDate;
          merged['DOC_DATE'] = spTapDate;
          merged['doc_date'] = spTapDate;
          merged['tanggal_sp_tap'] = spTapDate;
          merged['tgl_sp_tap_tsk'] = spTapDate;
          merged['TANGGAL_SP_TAP'] = spTapDate;
          merged['TGL_SP_TAP_TSK'] = spTapDate;
        }
      }
      return merged;
    });
    setIsSaved(false);
  }, [selectedCaseId, selectedTemplateCode, currentTemplate, selectedSuspectId, selectedSuspect, isSidikDoc]);

  const handleInputChange = (key, value) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value };

      // Auto-Sync khusus nomor dan tanggal surat jika dokumen SP.Tap TSK aktif
      if (isSpTapDoc) {
        const upperKey = (key || '').replace(/[{}]/g, '').trim().toUpperCase();
        if (['NOMOR_SURAT', 'DOC_NO', 'NOMOR_SP_TAP', 'NO_SP_TAP_TSK', 'NOMOR_SP_TAP_TSK'].includes(upperKey)) {
          next.NOMOR_SURAT = value;
          next.nomor_surat = value;
          next.DOC_NO = value;
          next.doc_no = value;
          next.nomor_sp_tap = value;
          next.no_sp_tap_tsk = value;
          next.nomor_sp_tap_tsk = value;
          next.NOMOR_SP_TAP = value;
          next.NO_SP_TAP_TSK = value;
          next.NOMOR_SP_TAP_TSK = value;
        }
        if (['TANGGAL_SURAT', 'DOC_DATE', 'TANGGAL_SP_TAP', 'TGL_SP_TAP_TSK'].includes(upperKey)) {
          next.TANGGAL_SURAT = value;
          next.tanggal_surat = value;
          next.DOC_DATE = value;
          next.doc_date = value;
          next.tanggal_sp_tap = value;
          next.tgl_sp_tap_tsk = value;
          next.TANGGAL_SP_TAP = value;
          next.TGL_SP_TAP_TSK = value;
        }
      }
      
      // Universal Auto-Sync Dokumen Induk (Scalable & Modular)
      if (isCurrentParentDoc && activeParentConfig) {
        if (key === 'NOMOR_SURAT' || key === 'nomor_surat' || key === 'DOC_NO' || key === 'doc_no') {
          (activeParentConfig.noTags || []).forEach(tag => {
            next[tag] = value;
            next[tag.toLowerCase()] = value;
          });
          if (activeParentConfig.targetNoCol && currentCase) {
            currentCase[activeParentConfig.targetNoCol] = value;
          }
        }
        if (key === 'TANGGAL_SURAT' || key === 'tanggal_surat' || key === 'DOC_DATE' || key === 'doc_date') {
          (activeParentConfig.tglTags || []).forEach(tag => {
            next[tag] = value;
            next[tag.toLowerCase()] = value;
          });
          if (activeParentConfig.targetTglCol && currentCase) {
            currentCase[activeParentConfig.targetTglCol] = value;
            if (activeParentConfig.targetTglCol === 'tgl_sprin_sidik') {
              currentCase.sprin_date = value;
            }
          }
        }
      }

      // Auto-Mirroring Tanggal & Tempat Penangkapan ke Tag Dokumen Surat
      if (key === 'TANGGAL_KAP' || key === 'tanggal_kap') {
        next.TANGGAL_SURAT = value;
        next.tanggal_surat = value;
        next.DOC_DATE = value;
        next.doc_date = value;
      }

      if (key === 'TEMPAT_KAP' || key === 'tempat_kap') {
        next.TEMPAT_SURAT = value;
        next.tempat_surat = value;
        next.DOC_LOCATION = value;
        next.doc_location = value;
      }

      // Auto-Kalkulasi Tanggal Akhir Penahanan (+19 hari / KUHAP 20 hari) & Auto-Mirroring
      if (key === 'TANGGAL_MULAI_HAN' || key === 'tanggal_mulai_han') {
        const calculatedAkhir = hitungTanggalAkhirPenahanan(value, 20);
        next.TANGGAL_AKHIR_HAN = calculatedAkhir;
        next.tanggal_akhir_han = calculatedAkhir;
        next.TANGGAL_SURAT = value;
        next.tanggal_surat = value;
        next.DOC_DATE = value;
        next.doc_date = value;
        if (!prev.TANGGAL_HAN || prev.TANGGAL_HAN === prev.TANGGAL_MULAI_HAN) {
          next.TANGGAL_HAN = value;
          next.tanggal_han = value;
        }
      }

      if (key === 'TEMPAT_HAN' || key === 'tempat_han') {
        next.TEMPAT_SURAT = value;
        next.tempat_surat = value;
        next.DOC_LOCATION = value;
        next.doc_location = value;
      }

      return next;
    });
    setIsSaved(false);
  };

  // Jalankan sinkronisasi update ke Supabase saat dokumen SP.Tap TSK digenerate
  const syncPenetapanTersangka = async ({
    suspectId,
    nomorSpTap,
    tanggalSpTap,
    urutanTersangka: uTsk,
    statusLabel
  }) => {
    if (!currentCase) return null;
    const sId = suspectId || selectedSuspect?.id;
    const targetUrutan = uTsk || urutanTersangka || 1;
    const targetLabel = statusLabel || `Tersangka ${getRomanUrutan(targetUrutan)}`;
    const targetName = selectedSuspect?.nama || '';
    const cleanNo = nomorSpTap?.trim() || '';
    const cleanDate = tanggalSpTap?.trim() || new Date().toISOString().split('T')[0];

    const isUuid = typeof sId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId);

    // Payload update ke tabel case_suspects
    let updatePayload = {
      nomor_sp_tap: cleanNo,
      no_sp_tap_tsk: cleanNo,
      tanggal_sp_tap: cleanDate,
      tgl_sp_tap_tsk: cleanDate,
      status: 'tersangka',
      status_subjek: 'Tersangka',
      urutan_tersangka: targetUrutan,
      status_label: targetLabel,
      status_tersangka_label: targetLabel,
      updated_at: new Date().toISOString()
    };

    const runUpdate = async (filterCol, filterVal) => {
      let payloadToTry = { ...updatePayload };
      let res = await supabase
        .from('case_suspects')
        .update(payloadToTry)
        .eq(filterCol, filterVal)
        .select();

      // Retry adaptif jika ada kolom yang tidak dikenali di skema
      while (res.error && res.error.message && res.error.message.includes("Could not find the '")) {
        const match = res.error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          console.warn(`[syncPenetapanTersangka] Kolom '${match[1]}' tidak ada di skema, mencoba ulang tanpa kolom tersebut...`);
          delete payloadToTry[match[1]];
          res = await supabase
            .from('case_suspects')
            .update(payloadToTry)
            .eq(filterCol, filterVal)
            .select();
        } else {
          break;
        }
      }

      // Jika check constraint status gagal
      if (res.error && res.error.message && res.error.message.includes("status_check")) {
        payloadToTry.status = 'tersangka';
        res = await supabase
          .from('case_suspects')
          .update(payloadToTry)
          .eq(filterCol, filterVal)
          .select();
      }

      return res;
    };

    let resultData = null;

    if (isUuid) {
      const res = await runUpdate('id', sId);
      if (res.data && res.data.length > 0) {
        resultData = res.data;
      }
    }

    // Jika ID bukan UUID atau belum ada baris terupdate di DB, cari berdasarkan case_id & nama
    if ((!resultData || resultData.length === 0) && currentCase?.id && targetName) {
      const byName = await supabase
        .from('case_suspects')
        .update({
          nomor_sp_tap: cleanNo,
          no_sp_tap_tsk: cleanNo,
          tanggal_sp_tap: cleanDate,
          tgl_sp_tap_tsk: cleanDate,
          status: 'tersangka',
          urutan_tersangka: targetUrutan
        })
        .eq('case_id', currentCase.id)
        .ilike('nama', targetName)
        .select();

      if (byName.data && byName.data.length > 0) {
        resultData = byName.data;
      }
    }

    // Jika tetap belum ada di case_suspects, lakukan insert baru
    if ((!resultData || resultData.length === 0) && currentCase?.id && targetName) {
      const insertObj = {
        case_id: currentCase.id,
        nama: targetName,
        nik: selectedSuspect?.nik || '-',
        jenis_kelamin: selectedSuspect?.jenis_kelamin || 'Laki-laki',
        tempat_lahir: selectedSuspect?.tempat_lahir || null,
        tgl_lahir: selectedSuspect?.tgl_lahir || null,
        umur: selectedSuspect?.umur ? String(selectedSuspect.umur) : null,
        agama: selectedSuspect?.agama || 'Islam',
        pekerjaan: selectedSuspect?.pekerjaan || 'Swasta',
        kewarganegaraan: selectedSuspect?.kewarganegaraan || 'Indonesia',
        pendidikan: selectedSuspect?.pendidikan || 'SMA',
        status_pernikahan: selectedSuspect?.status_pernikahan || 'Kawin',
        alamat: selectedSuspect?.alamat || currentCase.locus || null,
        nomor_sp_tap: cleanNo,
        no_sp_tap_tsk: cleanNo,
        tanggal_sp_tap: cleanDate,
        tgl_sp_tap_tsk: cleanDate,
        status: 'tersangka',
        urutan_tersangka: targetUrutan,
        created_at: new Date().toISOString()
      };
      const insRes = await supabase.from('case_suspects').insert([insertObj]).select();
      if (insRes.data && insRes.data.length > 0) {
        resultData = insRes.data;
      }
    }

    // Update state caseSuspects & selectedSuspect
    const mergedUpdates = {
      nomor_sp_tap: cleanNo,
      no_sp_tap_tsk: cleanNo,
      tanggal_sp_tap: cleanDate,
      tgl_sp_tap_tsk: cleanDate,
      status: 'tersangka',
      urutan_tersangka: targetUrutan,
      status_label: targetLabel,
      status_tersangka_label: targetLabel
    };

    setCaseSuspects(prev => prev.map(s => {
      const match = (isUuid && s.id === sId) || (s.nama && s.nama.toLowerCase() === targetName.toLowerCase());
      return match ? { ...s, ...mergedUpdates } : s;
    }));

    if (selectedSuspect) {
      Object.assign(selectedSuspect, mergedUpdates);
    }

    // Sinkronisasi ke tabel cases (references & terlapor_list)
    if (currentCase?.id) {
      const updatedRef = {
        ...(currentCase.references || {}),
        no_sp_tap_tsk: cleanNo,
        nomor_sp_tap: cleanNo,
        tgl_sp_tap_tsk: cleanDate,
        tanggal_sp_tap: cleanDate
      };
      currentCase.references = updatedRef;

      let updatedTerlaporList = null;
      if (Array.isArray(currentCase.terlapor_list)) {
        updatedTerlaporList = currentCase.terlapor_list.map(t => {
          const match = (isUuid && t.id === sId) || (t.nama && t.nama.toLowerCase() === targetName.toLowerCase());
          if (match) {
            return {
              ...t,
              ...mergedUpdates
            };
          }
          return t;
        });
        currentCase.terlapor_list = updatedTerlaporList;
      }

      try {
        const caseUpdates = { references: updatedRef };
        if (updatedTerlaporList) caseUpdates.terlapor_list = updatedTerlaporList;
        await supabase.from('cases').update(caseUpdates).eq('id', currentCase.id);
      } catch (cErr) {
        console.warn('Sync cases notice:', cErr);
      }
    }

    return resultData;
  };

  // BAGIAN 4.2: Penyimpanan Balik Nomor Otomatis & Rantai Rujukan Tanggal
  const saveReferenceNumbers = async (enteredNo, enteredDate) => {
    if (!currentCase) return;
    const tplCode = (currentTemplate?.code || '').toUpperCase();
    const docDate = enteredDate || formValues.TANGGAL_SURAT || formValues.DOC_DATE;

    // 1. Dokumen Induk Perkara (Universal Auto-Sync ke Supabase cases)
    if (isCurrentParentDoc && activeParentConfig) {
      const updateObj = {};
      if (enteredNo && activeParentConfig.targetNoCol) {
        currentCase[activeParentConfig.targetNoCol] = enteredNo;
        updateObj[activeParentConfig.targetNoCol] = enteredNo;
      }
      if (docDate && activeParentConfig.targetTglCol) {
        currentCase[activeParentConfig.targetTglCol] = docDate;
        updateObj[activeParentConfig.targetTglCol] = docDate;
        if (activeParentConfig.targetTglCol === 'tgl_sprin_sidik') {
          currentCase.sprin_date = docDate;
          updateObj.sprin_date = docDate;
        }
      }

      if (Object.keys(updateObj).length > 0) {
        try {
          await supabase.from('cases').update(updateObj).eq('id', currentCase.id);
        } catch (e) {
          console.warn(`Auto-save ${activeParentConfig.label} reference error:`, e);
        }
      }
    } else if (tplCode.includes('SPDP')) {
      const spdpDate = formValues.TGL_SPDP || formValues.TANGGAL_SURAT || formValues.DOC_DATE;
      if (enteredNo) currentCase.no_spdp = enteredNo;
      if (spdpDate) currentCase.tgl_spdp = spdpDate;
      try {
        const updateObj = {};
        if (enteredNo) updateObj.no_spdp = enteredNo;
        if (spdpDate) updateObj.tgl_spdp = spdpDate;
        await supabase.from('cases').update(updateObj).eq('id', currentCase.id);
      } catch (e) {
        console.warn('Auto-save no_spdp error:', e);
      }
    } else if (tplCode.includes('P21')) {
      if (enteredNo) currentCase.no_p21_kn = enteredNo;
      try {
        await supabase.from('cases').update({ no_p21_kn: enteredNo }).eq('id', currentCase.id);
      } catch (e) {
        console.warn('Auto-save no_p21_kn error:', e);
      }
    }

    // 2. Dokumen Tingkat Perorangan (Tersangka Terpilih)
    if (selectedSuspect?.id) {
      let targetColNo = null;
      let targetColDate = null;
      const isSpTapTskTpl = tplCode.includes('TAP_TSK') || tplCode.includes('PENETAPAN TERSANGKA') || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

      if (isSpTapTskTpl) {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: enteredNo,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: `Tersangka ${getRomanUrutan(urutanTersangka)}`
        });
        return;
      } else if (tplCode.includes('KAP')) {
        targetColNo = 'no_sprin_kap';
        targetColDate = 'tgl_sprin_kap';
      } else if (tplCode.includes('HAN') && !tplCode.includes('PANJANG') && !tplCode.includes('KN') && !tplCode.includes('PN')) {
        targetColNo = 'no_sprin_han';
        targetColDate = 'tgl_sprin_han';
      } else if (tplCode.includes('PANJANG_HAN_KN') || (tplCode.includes('PANJANG') && tplCode.includes('KN'))) {
        targetColNo = 'no_panjang_han_kn';
      } else if (tplCode.includes('SPRIN_HAN_KN')) {
        targetColNo = 'no_sprin_han_kn';
      } else if (tplCode.includes('TAP_HAN_PN_1')) {
        targetColNo = 'no_tap_han_pn_1';
      } else if (tplCode.includes('SPRIN_HAN_PN_1')) {
        targetColNo = 'no_sprin_han_pn_1';
      }

      const suspectUpdates = {};

      if (targetColNo && enteredNo) {
        selectedSuspect[targetColNo] = enteredNo;
        suspectUpdates[targetColNo] = enteredNo;
      }
      if (targetColDate && docDate) {
        selectedSuspect[targetColDate] = docDate;
        suspectUpdates[targetColDate] = docDate;
      }

      if (Object.keys(suspectUpdates).length > 0) {
        setCaseSuspects(prev => prev.map(s => s.id === selectedSuspect.id ? { ...s, ...suspectUpdates } : s));
        try {
          await supabase.from('case_suspects').update(suspectUpdates).eq('id', selectedSuspect.id);
        } catch (e) {
          console.warn(`Auto-save case_suspects error:`, e);
        }
      }
    }
  };

  // Main Generator action (Pizzip + Docxtemplater + Supabase Storage)
  const handleTriggerGenerate = async () => {
    if (!currentCase || !currentTemplate) return;

    setIsGenerating(true);
    setGeneratorNotice(null);

    const isTapTsk = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') 
      || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    const docNumber = formValues.NOMOR_SURAT 
      || formValues.nomor_surat 
      || formValues.DOC_NO 
      || formValues.doc_no 
      || formValues.NO_SP_TAP_TSK 
      || formValues.no_sp_tap_tsk 
      || formValues.NOMOR_SP_TAP 
      || formValues.nomor_sp_tap 
      || selectedSuspect?.no_sp_tap_tsk 
      || selectedSuspect?.nomor_sp_tap 
      || '';

    const docDate = formValues.TANGGAL_SURAT 
      || formValues.tanggal_surat 
      || formValues.DOC_DATE 
      || formValues.doc_date 
      || formValues.TGL_SP_TAP_TSK 
      || formValues.tgl_sp_tap_tsk 
      || formValues.TANGGAL_SP_TAP 
      || formValues.tanggal_sp_tap 
      || formValues.TGL_SPRIN_SIDIK 
      || selectedSuspect?.tanggal_sp_tap 
      || selectedSuspect?.tgl_sp_tap_tsk 
      || '';

    const romanLabel = `Tersangka ${getRomanUrutan(urutanTersangka)}`;

    // Sinkronisasi otomatis nomor SP.Tap TSK ke database case_suspects & cases
    if (isTapTsk && selectedSuspect) {
      try {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: docNumber,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: romanLabel
        });
      } catch (syncErr) {
        console.warn('Gagal sinkronisasi penetapan tersangka:', syncErr);
      }
    } else if (docNumber || docDate) {
      await saveReferenceNumbers(docNumber, docDate);
    }

    try {
      const formattedDocDate = formatTanggalIndonesia(docDate) || docDate;

      const enrichedFormValues = {
        ...formValues,
        URUTAN_TERSANGKA: urutanTersangka,
        urutan_tersangka: urutanTersangka,
        STATUS_LABEL: romanLabel,
        status_label: romanLabel,
        STATUS_TERSANGKA_LABEL: romanLabel,
        status_tersangka_label: romanLabel,
        NOMOR_SP_TAP_TSK: docNumber,
        nomor_sp_tap_tsk: docNumber,
        NO_SP_TAP_TSK: docNumber,
        no_sp_tap_tsk: docNumber,
        NOMOR_SP_TAP: docNumber,
        nomor_sp_tap: docNumber,
        TGL_SP_TAP_TSK: formattedDocDate,
        tgl_sp_tap_tsk: formattedDocDate,
        TANGGAL_SP_TAP: formattedDocDate,
        tanggal_sp_tap: formattedDocDate,
        NAMA_TERSANGKA: selectedSuspect?.nama || '',
        nama_tersangka: selectedSuspect?.nama || '',
      };

      const res = await generateAndDownloadDocx({
        template: currentTemplate,
        caseData: currentCase,
        activeCase: currentCase,
        activeSuspect: selectedSuspect ? {
          ...selectedSuspect,
          nama: selectedSuspect.nama,
          nama_tersangka: selectedSuspect.nama,
          urutan_tersangka: urutanTersangka,
          status_label: romanLabel,
          status_tersangka_label: romanLabel,
          no_sp_tap_tsk: docNumber || selectedSuspect.no_sp_tap_tsk,
          nomor_sp_tap: docNumber || selectedSuspect.nomor_sp_tap,
          tanggal_sp_tap: docDate || selectedSuspect.tanggal_sp_tap,
          tgl_sp_tap_tsk: docDate || selectedSuspect.tgl_sp_tap_tsk,
        } : null,
        suspectsList: caseSuspects,
        activeVictim: selectedVictim,
        victimsList: registeredVictims,
        formValues: enrichedFormValues,
        personnelList: activePersonnel
      });

      // Save record in archive
      handleSave();

      setGeneratorNotice({
        type: 'success',
        message: `File '${res.filename}' berhasil di-render dari Supabase Storage dan diunduh ke komputer Anda!`
      });
    } catch (err) {
      console.error('Generation error:', err);
      setGeneratorNotice({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses file dari Supabase.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentCase || !currentTemplate) return;

    const isTapTsk = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') 
      || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    const docNumber = formValues.NOMOR_SURAT 
      || formValues.nomor_surat 
      || formValues.DOC_NO 
      || formValues.doc_no 
      || formValues.NO_SP_TAP_TSK 
      || formValues.no_sp_tap_tsk 
      || formValues.NOMOR_SP_TAP 
      || formValues.nomor_sp_tap 
      || selectedSuspect?.no_sp_tap_tsk 
      || selectedSuspect?.nomor_sp_tap 
      || '';

    const docDate = formValues.TANGGAL_SURAT 
      || formValues.tanggal_surat 
      || formValues.DOC_DATE 
      || formValues.doc_date 
      || formValues.TGL_SP_TAP_TSK 
      || formValues.tgl_sp_tap_tsk 
      || formValues.TANGGAL_SP_TAP 
      || formValues.tanggal_sp_tap 
      || formValues.TGL_SPRIN_SIDIK 
      || selectedSuspect?.tanggal_sp_tap 
      || selectedSuspect?.tgl_sp_tap_tsk 
      || '';

    const romanLabel = `Tersangka ${getRomanUrutan(urutanTersangka)}`;

    if (isTapTsk && selectedSuspect) {
      try {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: docNumber,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: romanLabel
        });
      } catch (syncErr) {
        console.warn('Sync penetapan on save notice:', syncErr);
      }
    } else if (docNumber || docDate) {
      await saveReferenceNumbers(docNumber, docDate);
    }

    const newDoc = {
      id: `doc-${Date.now().toString().slice(-6)}`,
      case_id: currentCase.id,
      template_id: currentTemplate.id,
      template_code: currentTemplate.code,
      doc_title: currentTemplate.title,
      doc_number: docNumber || '-',
      meta_values: { ...formValues },
      created_at: formValues.TANGGAL_SURAT || formValues.tanggal_surat || formValues.DOC_DATE || new Date().toISOString().split('T')[0],
    };

    if (onSaveDocument) {
      onSaveDocument(newDoc);
    }
    setIsSaved(true);
  };

  // --- TEMPLATE MANAGEMENT ACTIONS (KHUSUS SUPER ADMIN) ---

  // 1. Tambah Format Template Baru
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      alert('Judul dan Kode Template wajib diisi!');
      return;
    }
    if (!newDocxFile) {
      alert('Silakan pilih file fisik .docx untuk template ini!');
      return;
    }

    setIsProcessingTemplate(true);
    try {
      const templateCode = (newCode || 'TEMPLATE').trim().replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
      const cleanFileName = `${templateCode}_${Date.now()}.docx`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(cleanFileName, newDocxFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: newDocxFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) {
        console.error('Detail Error Upload Supabase:', uploadError);
        throw new Error(uploadError.message || 'Gagal mengunggah file ke Storage');
      }

      const { data: publicUrlData } = supabase.storage
        .from('templates')
        .getPublicUrl(cleanFileName);

      const fileUrl = publicUrlData?.publicUrl;
      const finalFilePath = uploadData?.path || cleanFileName;

      // Default dynamic fields (Standard Indonesian)
      const defaultFields = [
        { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true },
        { id: 2, field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
        { id: 3, field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
        { id: 4, field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
        { id: 5, field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
        { id: 6, field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
      ];

      // Save metadata to document_templates with UPSERT to prevent unique constraint conflicts
      const payload = {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        category: newCategory,
        description: newDescription.trim(),
        file_path: finalFilePath,
        file_url: fileUrl || '',
        dynamic_fields: defaultFields,
        created_at: new Date().toISOString()
      };

      let { data: dbData, error: dbErr } = await supabase
        .from('document_templates')
        .upsert([payload], { onConflict: 'code' })
        .select();

      if (dbErr && dbErr.message && dbErr.message.includes('file_url')) {
        console.warn('Kolom file_url belum ada di Supabase, menyimpan tanpa file_url...');
        delete payload.file_url;
        const resRetry = await supabase
          .from('document_templates')
          .upsert([payload], { onConflict: 'code' })
          .select();
        dbData = resRetry.data;
        dbErr = resRetry.error;
      }

      if (dbErr) throw dbErr;

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${newTitle}' berhasil ditambahkan ke Supabase!`
      });

      // Reset form
      setNewTitle('');
      setNewCode('');
      setNewDescription('');
      setNewDocxFile(null);
      setIsAddModalOpen(false);

      // Refresh list & select newly created template
      await fetchTemplates();
      setSelectedTemplateCode(payload.code);
    } catch (err) {
      console.error('Add template error:', err);
      let errorMsg = err?.message || 'Terjadi kesalahan saat menyimpan ke Supabase.';
      if (errorMsg === 'Failed to fetch' || err?.name === 'TypeError') {
        errorMsg = 'Koneksi ke Supabase Storage gagal (Failed to fetch). Pastikan jaringan internet stabil, bucket "templates" sudah dibuat di Supabase Storage dan memiliki izin upload.';
      }
      alert(`Gagal menambah template format: ${errorMsg}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 2. Edit/Perubahan Format Template
  const handleOpenEdit = (t, e) => {
    e.stopPropagation();
    setTemplateToEdit(t);
    setEditTitle(t.title);
    setEditCategory(t.category || 'SURAT PERINTAH');
    setEditDescription(t.description || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!templateToEdit || !editTitle.trim()) return;

    setIsProcessingTemplate(true);
    try {
      if (templateToEdit.id) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim(),
          })
          .eq('id', templateToEdit.id);

        if (error) throw error;
      }

      // Update in local state
      setAllTemplates(prev => prev.map(t => {
        if (t.code === templateToEdit.code) {
          return {
            ...t,
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim()
          };
        }
        return t;
      }));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${editTitle}' berhasil diperbarui!`
      });

      setTemplateToEdit(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Edit template error:', err);
      alert(`Gagal memperbarui template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 3. Hapus Format Template
  const handleOpenDelete = (t, e) => {
    e.stopPropagation();
    setTemplateToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setIsProcessingTemplate(true);
    try {
      await deleteTemplateFromSupabase(templateToDelete);

      setAllTemplates(prev => prev.filter(t => t.code !== templateToDelete.code && t.id !== templateToDelete.id));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${templateToDelete.title}' berhasil dihapus secara permanen!`
      });

      // If the deleted template was selected, fallback to first available
      if (selectedTemplateCode === templateToDelete.code) {
        const remaining = allTemplates.filter(t => t.code !== templateToDelete.code && t.id !== templateToDelete.id);
        if (remaining.length > 0) {
          setSelectedTemplateCode(remaining[0].code);
        }
      }

      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
      alert(`Gagal menghapus format template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSignature size={22} color="#ff352d" />
            <span>Studio Generator Administrasi Penyidikan (E-Mindik)</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Render dokumen otomatis dari master fisik Microsoft Word (.docx) di Supabase Storage dengan injeksi data perkara presisi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchTemplates}
            className="btn btn-secondary btn-sm"
            title="Muat ulang template dari Supabase"
          >
            <RefreshCw size={13} />
            <span>Refresh Template</span>
          </button>
        </div>
      </div>

      {/* Generator Notice */}
      {generatorNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: generatorNotice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${generatorNotice.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '13px',
          animation: 'slideInRight 200ms ease-out',
        }}>
          {generatorNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={18} color="var(--accent-red)" />
          )}
          <span>{generatorNotice.message}</span>
        </div>
      )}

      {/* Split Screen Studio: Form Editor (Left) & Live Preview (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 440px) 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left: Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Select Case */}
          <div className="glass" style={{ padding: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
              <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>1</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>PILIH BERKAS PERKARA (LP)</span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="form-select"
              style={{ marginTop: '8px' }}
            >
              {(cases || []).map((c) => (
                <option key={c?.id} value={c?.id}>
                  {c?.no_lp || '-'} — {c?.tindak_pidana || '-'} ({c?.person?.nama || c?.terlapor_name || '-'})
                </option>
              ))}
            </select>

            {currentCase && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div><strong>Pasal:</strong> {currentCase?.pasal_uu || '-'}</div>
                <div><strong>Pelapor:</strong> {currentCase?.nama_pelapor || currentCase?.pelapor_name || '-'}</div>
                <div><strong>Terlapor:</strong> {currentCase?.person?.nama || currentCase?.terlapor_name || '-'}</div>
                <div><strong>Locus:</strong> {currentCase?.locus || '-'}</div>
              </div>
            )}
          </div>

          {/* Step 2: Select Template & Format Management (Khusus Super Admin) */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: '#ffffff' }}>
                <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>2</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>PILIH FORMAT DOKUMEN MINDIK</span>
              </label>

              {/* KHUSUS SUPER ADMIN: Tombol Tambah, Edit & Hapus Format */}
              {isSuperAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {currentTemplate && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(currentTemplate, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        title="Edit judul, kategori, atau deskripsi format template"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(currentTemplate, e)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        title="Hapus format template ini dari Supabase"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    title="Tambah format template baru ke Supabase Storage (Khusus Super Admin)"
                  >
                    <Plus size={13} />
                    <span>Tambah Format</span>
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <select
                value={selectedTemplateCode}
                onChange={(e) => setSelectedTemplateCode(e.target.value)}
                className="form-select"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#1b2229',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {(allTemplates || []).map((t) => (
                  <option key={t.id || t.code} value={t.code} style={{ backgroundColor: '#14181d', color: '#fff' }}>
                    {t.title || t.name || t.code} {t.category ? `(${t.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Dynamic Variables Form */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: '#ffffff' }}>
                <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>3</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>PARAMETER & VARIABEL DOKUMEN</span>
              </label>
              {isIndividualDoc ? (
                <span className="badge badge-red" style={{ fontSize: '9px' }}>DOKUMEN PERORANGAN</span>
              ) : (
                <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>DOKUMEN KOLEKTIF</span>
              )}
            </div>

            {/* PANEL KHUSUS SP.TAP TSK: PENETAPAN TERSANGKA RESMI */}
            {isSpTapDoc && (
              <div style={{
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="var(--accent-amber)" />
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>
                      PENETAPAN TERSANGKA (SP.TAP TSK)
                    </span>
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
                    ALUR FORMIL PENYIDIKAN
                  </span>
                </div>

                {/* Dropdown: Pilih Terlapor yang Ditetapkan */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                    Pilih Terlapor yang Ditetapkan (dataPerkara.terlapor_list) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  {caseSuspects.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#FCA5A5', padding: '6px 0' }}>
                      Belum ada terlapor terdaftar pada perkara ini. Tambahkan data Terlapor di Detail Perkara.
                    </div>
                  ) : (
                    <select
                      value={selectedSuspectId}
                      onChange={(e) => handleSuspectChange(e.target.value)}
                      className="form-select"
                      style={{ borderColor: 'var(--accent-amber)', fontWeight: 600 }}
                    >
                      {(caseSuspects || []).map((s, idx) => {
                        const isEst = s.status === 'tersangka' || s.no_sp_tap_tsk;
                        return (
                          <option key={s.id || idx} value={s.id}>
                            {idx + 1}. {s.nama} (NIK: {s.nik || '-'}) — {isEst ? `[Sudah Ditetapkan Tersangka - No: ${s.no_sp_tap_tsk || s.nomor_sp_tap || '-'}]` : '[Status: Terlapor (Belum Ditetapkan)]'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Selector Urutan Administrasi Tersangka */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      Urutan Administrasi Tersangka <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <select
                      value={urutanTersangka}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setUrutanTersangka(val);
                        const roman = getRomanUrutan(val);
                        const lbl = `Tersangka ${roman}`;
                        setFormValues(prev => ({
                          ...prev,
                          URUTAN_TERSANGKA: val,
                          urutan_tersangka: val,
                          STATUS_TERSANGKA_LABEL: lbl,
                          status_tersangka_label: lbl
                        }));
                      }}
                      className="form-select"
                      style={{ borderColor: 'rgba(245, 158, 11, 0.5)', fontWeight: 600 }}
                    >
                      <option value="1">Tersangka I (Pertama)</option>
                      <option value="2">Tersangka II (Kedua)</option>
                      <option value="3">Tersangka III (Ketiga)</option>
                      <option value="4">Tersangka IV (Keempat)</option>
                      <option value="5">Tersangka V (Kelima)</option>
                      <option value="6">Tersangka VI (Keenam)</option>
                      <option value="7">Tersangka VII (Ketujuh)</option>
                      <option value="8">Tersangka VIII (Kedelapan)</option>
                    </select>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Mengisi tag <code>{'{status_tersangka_label}'}</code> & <code>{'{urutan_tersangka}'}</code>
                    </span>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      Status Formil Terkini
                    </label>
                    <div style={{
                      padding: '8px 10px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '38px'
                    }}>
                      {selectedSuspect?.status === 'tersangka' || selectedSuspect?.no_sp_tap_tsk ? (
                        <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                          ● {selectedSuspect.status_tersangka_label || `Tersangka ${getRomanUrutan(urutanTersangka)}`} (Ditetapkan)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                          ● Terlapor (Siap Ditetapkan)
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Label Dokumen: <strong style={{ color: '#fff' }}>Tersangka {getRomanUrutan(urutanTersangka)}</strong>
                    </span>
                  </div>
                </div>

                {/* Profil Terlapor Terpilih */}
                {selectedSuspect && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderLeft: '3px solid var(--accent-amber)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Nama: <strong style={{ color: '#fff' }}>{selectedSuspect.nama}</strong></span>
                      <span>NIK: <strong style={{ color: '#fff' }}>{selectedSuspect.nik || '-'}</strong></span>
                      <span>JK: <strong style={{ color: '#fff' }}>{selectedSuspect.jenis_kelamin || 'Laki-laki'}</strong></span>
                    </div>
                    <div>TTL / Umur: <strong style={{ color: '#fff' }}>{selectedSuspect.tempat_lahir || '-'}, {selectedSuspect.tgl_lahir || '-'} ({selectedSuspect.umur ? `${selectedSuspect.umur} Thn` : '-'})</strong></div>
                    <div>Pekerjaan: <strong style={{ color: '#fff' }}>{selectedSuspect.pekerjaan || '-'}</strong> | Agama: <strong style={{ color: '#fff' }}>{selectedSuspect.agama || '-'}</strong></div>
                    <div>Alamat: <strong style={{ color: '#fff' }}>{selectedSuspect.alamat || '-'}</strong></div>
                    {selectedSuspect.no_sp_tap_tsk && (
                      <div style={{ color: 'var(--accent-amber)', marginTop: '2px', fontWeight: 600 }}>
                        Nomor SP.Tap saat ini: {selectedSuspect.no_sp_tap_tsk} ({selectedSuspect.tgl_sp_tap_tsk || selectedSuspect.tanggal_sp_tap || '-'})
                      </div>
                    )}
                  </div>
                )}

                {/* Input Langsung Format Baku Nomor SP.Tap TSK & Tanggal Penetapan (Two-Way Binding) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      NOMOR SP.TAP TSK <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.NOMOR_SURAT !== undefined ? formValues.NOMOR_SURAT : (formValues.nomor_surat || formValues.no_sp_tap_tsk || formValues.nomor_sp_tap || '')}
                      onChange={(e) => handleNomorSpTapChange(e.target.value)}
                      className="form-input mono"
                      placeholder="S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra"
                      style={{
                        backgroundColor: '#0f172a',
                        borderColor: 'var(--accent-amber)',
                        color: '#f8fafc',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                      required
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Format baku penomoran surat (terikat dua arah ke preview judul & database multi-tersangka)
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      TANGGAL PENETAPAN TERSANGKA <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type={(/^\d{4}-\d{2}-\d{2}$/.test(formValues.TANGGAL_SURAT || formValues.tanggal_surat) || !(formValues.TANGGAL_SURAT || formValues.tanggal_surat)) ? "date" : "text"}
                      value={formValues.TANGGAL_SURAT !== undefined ? formValues.TANGGAL_SURAT : (formValues.tanggal_surat || formValues.tanggal_sp_tap || formValues.DOC_DATE || '')}
                      onChange={(e) => handleTanggalSpTapChange(e.target.value)}
                      className="form-input mono"
                      style={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(245, 158, 11, 0.5)',
                        color: '#f8fafc'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                  ℹ️ <em>Saat tombol <strong>Render & Download Naskah</strong> atau <strong>Simpan Pembaruan Rujukan</strong> ditekan, Terlapor ini otomatis berstatus <strong>Tersangka</strong> dengan nomor SP.Tap yang ter-mirroring ke seluruh dokumen turunan.</em>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedSuspect) {
                        alert('Pilih terlapor terlebih dahulu');
                        return;
                      }
                      const docNo = (formValues.NOMOR_SURAT || formValues.nomor_surat || formValues.DOC_NO || formValues.NO_SP_TAP_TSK || formValues.no_sp_tap_tsk || selectedSuspect?.no_sp_tap_tsk || '').trim();
                      const docDt = formValues.TANGGAL_SURAT || formValues.tanggal_surat || formValues.DOC_DATE || formValues.TGL_SP_TAP_TSK || formValues.tgl_sp_tap_tsk || selectedSuspect?.tanggal_sp_tap || '';
                      const roman = `Tersangka ${getRomanUrutan(urutanTersangka)}`;
                      await syncPenetapanTersangka({
                        suspectId: selectedSuspect?.id,
                        nomorSpTap: docNo,
                        tanggalSpTap: docDt,
                        urutanTersangka,
                        statusLabel: roman
                      });
                      setGeneratorNotice({
                        type: 'success',
                        message: `Berhasil! Nomor SP.Tap TSK '${docNo || '-'}' untuk ${selectedSuspect?.nama} (${roman}) berhasil disinkronkan ke database.`
                      });
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{
                      borderColor: 'var(--accent-amber)',
                      color: 'var(--accent-amber)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      padding: '5px 10px'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Simpan Pembaruan Rujukan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selector Tersangka untuk Dokumen Turunan Perorangan (Surat Panggilan, SPDP, Penahanan, dll) */}
            {isIndividualDoc && !isSpTapDoc && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, color: 'var(--accent-red)', fontWeight: 700, fontSize: '11.5px' }}>
                    PILIH TERSANGKA (WAJIB) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    1 Surat untuk 1 Tersangka
                  </span>
                </div>

                {/* Banner Peringatan jika belum ada tersangka yang ditetapkan */}
                {!caseSuspects.some(s => s.status === 'tersangka' || s.no_sp_tap_tsk || s.nomor_sp_tap) && (
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px',
                    fontSize: '11px',
                    color: '#FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <span>⚠️ Perhatian: Belum ada Tersangka yang ditetapkan dengan SP.Tap TSK pada perkara ini. Disarankan menerbitkan SP.Tap TSK terlebih dahulu.</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateCode('SP_TAP_TSK')}
                      className="btn btn-sm"
                      style={{ background: 'var(--accent-amber)', color: '#000', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '10px', padding: '3px 8px' }}
                    >
                      Buat SP.Tap TSK
                    </button>
                  </div>
                )}

                {caseSuspects.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#FCA5A5', padding: '6px 0' }}>
                    Belum ada subjek tersangka terdaftar pada perkara ini.
                  </div>
                ) : (
                  <select
                    value={selectedSuspectId}
                    onChange={(e) => handleSuspectChange(e.target.value)}
                    className="form-select"
                    style={{ borderColor: 'var(--accent-red)', fontWeight: 600 }}
                  >
                    {(caseSuspects || []).map((s) => {
                      const isEst = s.status === 'tersangka' || s.no_sp_tap_tsk;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.status_tersangka_label || (isEst ? 'Tersangka' : 'Terlapor')} {s.no_sp_tap_tsk ? `• SP.Tap: ${s.no_sp_tap_tsk}` : '• Belum ada SP.Tap'})
                        </option>
                      );
                    })}
                  </select>
                )}

                {selectedSuspect && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    borderTop: '1px dashed rgba(239, 68, 68, 0.2)',
                    paddingTop: '6px'
                  }}>
                    <div>Nama: <strong style={{ color: '#FFF' }}>{selectedSuspect.nama}</strong> | NIK: <strong style={{ color: '#FFF' }}>{selectedSuspect.nik || '-'}</strong> | Status: <strong style={{ color: selectedSuspect.no_sp_tap_tsk ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{selectedSuspect.status_tersangka_label || (selectedSuspect.no_sp_tap_tsk ? 'Tersangka' : 'Terlapor')}</strong></div>
                    <div>TTL: <strong style={{ color: '#FFF' }}>{selectedSuspect.tempat_lahir || '-'}, {selectedSuspect.tgl_lahir || '-'}</strong></div>
                    {selectedSuspect.no_sp_tap_tsk ? (
                      <div style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                        Rujukan SP.TAP.TSK: <strong>{selectedSuspect.no_sp_tap_tsk}</strong> (Otomatis mengisi tag)
                      </div>
                    ) : (
                      <div style={{ color: 'var(--accent-amber)', fontSize: '10.5px' }}>
                        ⚠️ Belum memiliki rujukan SP.Tap TSK resmi.
                      </div>
                    )}
                    {selectedSuspect.no_sprin_kap && (
                      <div style={{ color: 'var(--accent-amber)' }}>
                        Rujukan SP.KAP: <strong>{selectedSuspect.no_sprin_kap}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selector Korban / Saksi Korban */}
            {isVictimDoc && (
              <div style={{
                padding: '12px',
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, color: '#C084FC', fontWeight: 700, fontSize: '11.5px' }}>
                    SUBJEK KORBAN / SAKSI KORBAN
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {registeredVictims.length > 0 ? `${registeredVictims.length} Korban Terdaftar` : 'Default: Pelapor'}
                  </span>
                </div>

                {registeredVictims.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                    Belum ada korban spesifik; otomatis merujuk ke data Pelapor (<strong>{currentCase?.nama_pelapor || currentCase?.pelapor_name || '-'}</strong>). Tambahkan rincian 10 data identitas korban di menu Berkas Perkara jika diperlukan.
                  </div>
                ) : (
                  <select
                    value={selectedVictimId}
                    onChange={(e) => handleVictimChange(e.target.value)}
                    className="form-select"
                    style={{ borderColor: '#C084FC', fontWeight: 600 }}
                  >
                    {(registeredVictims || []).map((v, vIdx) => (
                      <option key={v.id || vIdx} value={v.id || v.nama || `vic-${vIdx}`}>
                        {vIdx + 1}. {v.nama || 'Tanpa Nama'} {v.nik ? `(NIK: ${v.nik})` : ''} - {v.jenis_kelamin || 'Laki-laki'} {vIdx === 0 ? '(Utama)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {selectedVictim && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    borderTop: '1px dashed rgba(168, 85, 247, 0.25)',
                    paddingTop: '6px'
                  }}>
                    <div>Nama: <strong style={{ color: '#FFF' }}>{selectedVictim.nama}</strong> | NIK: <strong style={{ color: '#FFF' }}>{selectedVictim.nik || '-'}</strong> | JK: <strong style={{ color: '#FFF' }}>{selectedVictim.jenis_kelamin || 'Laki-laki'}</strong></div>
                    <div>TTL/Umur: <strong style={{ color: '#FFF' }}>{selectedVictim.ttl || '-'} ({selectedVictim.umur ? `${selectedVictim.umur} Thn` : '-'})</strong></div>
                    {selectedVictim.pekerjaan && <div>Pekerjaan: <strong style={{ color: '#FFF' }}>{selectedVictim.pekerjaan}</strong> | Agama: <strong style={{ color: '#FFF' }}>{selectedVictim.agama || '-'}</strong></div>}
                  </div>
                )}
              </div>
            )}

            {/* Info Dokumen Kolektif */}
            {!isIndividualDoc && caseSuspects.length > 0 && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(0, 212, 255, 0.05)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '2px' }}>
                  Multi-Tersangka Terhubung ({caseSuspects.length} orang):
                </div>
                <div>
                  Format Word dapat merender loop tabel otomatis dengan <code className="mono">{'{#tersangka_list}...{/tersangka_list}'}</code> serta tag tunggal <code className="mono">{'{NAMA_TERLAPOR}'}</code>.
                </div>
              </div>
            )}

            {/* Tim Penyidik Otomatis untuk Dokumen Penugasan / Kolektif Perkara (SPRIN SIDIK / SPRIN GAS SIDIK) */}
            {false && (isSprinSidik || isSprinGasSidik) && currentCase && (
              <div style={{
                padding: '12px',
                background: '#1e262e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={13} color="#ff352d" />
                    <span style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.3px' }}>
                      TIM PENYIDIK OTOMATIS (PENUGASAN TIM)
                    </span>
                  </div>
                  <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>
                    Kasat, Kanit, P1 s.d. P5
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px', color: 'var(--text-secondary)' }}>
                  {/* Kasat */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 600 }}>Pemberi Perintah (Kasat Reskrim):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {currentCase?.kasat_nama || formValues.ATASAN_NAMA || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                      {currentCase?.kasat_pangkat || formValues.ATASAN_PANGKAT || '-'} {currentCase?.kasat_nrp ? `NRP ${currentCase.kasat_nrp}` : ''}
                    </div>
                  </div>

                  {/* Kanit / P1 */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 600 }}>Kanit / Penyidik 1 (P1):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {currentCase?.penyidik_1_nama || formValues.PENYIDIK_1_NAMA || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                      {formatPangkatLengkap(currentCase?.penyidik_1_pangkat || formValues.PENYIDIK_1_PANGKAT || '') || '-'} {currentCase?.penyidik_1_nrp ? `NRP ${currentCase.penyidik_1_nrp}` : ''} • {currentCase?.penyidik_1_jabatan || formValues.PENYIDIK_1_JABATAN || 'Kanit'}
                    </div>
                  </div>

                  {/* Penyidik Penangan */}
                  <div style={{ background: 'rgba(255, 53, 45, 0.06)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255, 53, 45, 0.3)' }}>
                    <div style={{ color: '#ff352d', fontSize: '10px', fontWeight: 700 }}>Penyidik Penangan Perkara:</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {getPenyidikPenangan(currentCase)?.nama || currentCase?.penyidik_penangan_nama || formValues.PENYIDIK_PENANGAN_NAMA || currentCase?.penyidik_1_nama || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      {formatPangkatLengkap(getPenyidikPenangan(currentCase)?.pangkat || currentCase?.penyidik_penangan_pangkat || formValues.PENYIDIK_PENANGAN_PANGKAT || currentCase?.penyidik_1_pangkat || '')} {getPenyidikPenangan(currentCase)?.nrp || currentCase?.penyidik_penangan_nrp || currentCase?.penyidik_1_nrp ? `NRP ${getPenyidikPenangan(currentCase)?.nrp || currentCase?.penyidik_penangan_nrp || currentCase?.penyidik_1_nrp}` : ''}
                    </div>
                  </div>
                </div>

                {/* Anggota Tim Penyidik 2 s.d. 5 */}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '6px 8px', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  borderRadius: '4px', 
                  border: '1px dashed rgba(255,255,255,0.08)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '6px'
                }}>
                  {[2, 3, 4, 5].map((idx) => {
                    const pNama = currentCase?.[`penyidik_${idx}_nama`] || formValues[`PENYIDIK_${idx}_NAMA`];
                    const pPangkat = currentCase?.[`penyidik_${idx}_pangkat`] || formValues[`PENYIDIK_${idx}_PANGKAT`];
                    const pNrp = currentCase?.[`penyidik_${idx}_nrp`] || formValues[`PENYIDIK_${idx}_NRP`];
                    return (
                      <div key={idx} style={{ fontSize: '10.5px' }}>
                        <div style={{ color: '#94A3B8', fontSize: '9.5px' }}>Penyidik {idx}:</div>
                        <div style={{ color: pNama ? '#F1F5F9' : '#64748B', fontWeight: pNama ? 600 : 400 }}>
                          {pNama || '-'}
                        </div>
                        {pNama && (
                          <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>
                            {pPangkat} {pNrp ? `(${pNrp})` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px' }}>
                  Tag otomatis: <code className="mono">{'{ATASAN_NAMA}'}</code>, <code className="mono">{'{PENYIDIK_1_NAMA}'}</code> s.d. <code className="mono">{'{PENYIDIK_5_NAMA}'}</code> beserta Pangkat, NRP, dan Jabatan.
                </div>
              </div>
            )}

            {/* Rantai Rujukan Perkara (Chain of Reference) */}
            {false && currentCase && (
              <div style={{
                padding: '10px 12px',
                background: '#1e262e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: '#ff352d', fontWeight: 700, letterSpacing: '0.3px' }}>
                    RANTAI RUJUKAN PERKARA (CHAIN OF REFERENCE)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Tag Terisolasi Mandiri
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', color: 'var(--text-secondary)' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan LP (Tag: <span style={{ color: '#ff352d' }}>{'{NOMOR_LP}'}</span>):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.nomor_lp || currentCase?.no_lp || '-'}</div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      Tgl (<span style={{ color: '#ff352d' }}>{'{TANGGAL_LP}'}</span>): {formatTanggalIndonesia(currentCase?.tanggal_lp || currentCase?.sprin_date) || '-'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SP.Sidik (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPRIN_SIDIK}'}</span>):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_sprin_sidik || (isSprinSidik ? '(Sedang dibuat)' : '-')}</div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPRIN_SIDIK}'}</span>): {formatTanggalIndonesia(formValues.TGL_SPRIN_SIDIK || currentCase?.tgl_sprin_sidik || currentCase?.sprin_date) || '-'}
                    </div>
                  </div>
                  {(currentCase?.no_sprin_gas_sidik || isSprinGasSidik) && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SP.Gas.Sidik (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPRIN_GAS_SIDIK}'}</span>):</div>
                      <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_sprin_gas_sidik || (isSprinGasSidik ? '(Sedang dibuat)' : '-')}</div>
                      <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                        Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPRIN_GAS_SIDIK}'}</span>): {formatTanggalIndonesia(formValues.TGL_SPRIN_GAS_SIDIK || currentCase?.tgl_sprin_gas_sidik) || '-'}
                      </div>
                    </div>
                  )}
                  {currentCase?.no_spdp && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SPDP (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPDP}'}</span>):</div>
                      <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_spdp}</div>
                      <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                        Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPDP}'}</span>): {formatTanggalIndonesia(currentCase?.tgl_spdp) || '-'}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                  {isCurrentParentDoc && activeParentConfig ? (
                    <span>Dokumen ini adalah <strong>{activeParentConfig.label}</strong> (Dokumen Induk). Input <strong>Nomor Surat</strong> dan <strong>Tanggal Surat</strong> di form di bawah otomatis disinkronkan ke rujukan perkara tanpa perlu input ganda.</span>
                  ) : isSprinGasSidik ? (
                    <span>Dokumen ini adalah <strong>Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)</strong>. Otomatis merujuk ke SP.Sidik induk (<code>{'{NO_SPRIN_SIDIK}'}</code>) dan menugaskan Tim Penyidik tanpa menimpa nomor induk perkara.</span>
                  ) : (
                    <span>Dokumen turunan ini otomatis membaca nomor & tanggal SP.Sidik dari perkara tanpa menimpa <code>{'{TANGGAL_SURAT}'}</code> aktif.</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* BAGIAN KHUSUS 1: PARAMETER BA PENANGKAPAN (BA_KAP / SPRIN_KAP_DAN_BA) */}
              {isBaKapDoc && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="var(--accent-amber)" />
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.3px' }}>
                        PARAMETER KHUSUS PENANGKAPAN (BA KAP)
                      </span>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                      Injeksi Tag Berita Acara
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal Penangkapan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_KAP || ''}
                        onChange={(e) => handleInputChange('TANGGAL_KAP', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Waktu / Jam Penangkapan
                      </label>
                      <input
                        type="text"
                        value={formValues.JAM_KAP || ''}
                        onChange={(e) => handleInputChange('JAM_KAP', e.target.value)}
                        className="form-input mono"
                        placeholder="Contoh: 14.00 WITA"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                      Tempat Penangkapan <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.TEMPAT_KAP !== undefined ? formValues.TEMPAT_KAP : 'Kab. Kolaka Timur'}
                      onChange={(e) => handleInputChange('TEMPAT_KAP', e.target.value)}
                      className="form-input"
                      placeholder="Kab. Kolaka Timur"
                    />
                  </div>

                  {/* Live Preview Tag Penangkapan */}
                  {(() => {
                    const parsed = parseDateParts(formValues.TANGGAL_KAP || formValues.TANGGAL_SURAT);
                    return (
                      <div style={{
                        padding: '8px 10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        lineHeight: '1.5',
                        color: '#CBD5E1',
                        border: '1px dashed rgba(245, 158, 11, 0.25)'
                      }}>
                        <div style={{ color: 'var(--accent-amber)', fontWeight: 600, marginBottom: '2px' }}>
                          Preview Injeksi Tag Word (docxtemplater):
                        </div>
                        <div>• <code>{'{HARI_KAP}'}</code>: <strong>{parsed.hari || '-'}</strong> | <code>{'{TANGGAL_KAP}'}</code>: <strong>{parsed.tanggal || '-'}</strong> | <code>{'{BULAN_KAP}'}</code>: <strong>{parsed.bulan || '-'}</strong> | <code>{'{TAHUN_KAP}'}</code>: <strong>{parsed.tahun || '-'}</strong></div>
                        <div>• <code>{'{TERBILANG_TAHUN_KAP}'}</code>: <em>"{parsed.terbilangTahun || '-'}"</em></div>
                        <div>• <code>{'{JAM_KAP}'}</code>: <strong>{formValues.JAM_KAP || '-'}</strong> | <code>{'{TEMPAT_KAP}'}</code>: <strong>{formValues.TEMPAT_KAP || 'Kab. Kolaka Timur'}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* BAGIAN KHUSUS 2: PARAMETER SPRIN & BA PENAHANAN (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA) */}
              {isHanDoc && (
                <div style={{
                  padding: '14px',
                  background: '#1e262e',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={15} color="#ff352d" />
                      <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.3px' }}>
                        PARAMETER KHUSUS PENAHANAN (SPRIN & BA HAN)
                      </span>
                    </div>
                    <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>
                      KUHAP 20 Hari & BA Han
                    </span>
                  </div>

                  {/* Tanggal Mulai & Tanggal Akhir Penahanan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal Mulai Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_MULAI_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_MULAI_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: 0 }}>
                          Tanggal Akhir (+19 Hari) <span style={{ color: 'var(--accent-red)' }}>*</span>
                        </label>
                        <span style={{ fontSize: '9px', color: '#cbd5e1' }}>Auto-fill 20 hari</span>
                      </div>
                      <input
                        type="date"
                        value={formValues.TANGGAL_AKHIR_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_AKHIR_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Tempat / Rutan Penahanan */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                      Tempat / Rutan Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.TEMPAT_HAN !== undefined ? formValues.TEMPAT_HAN : 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur'}
                      onChange={(e) => handleInputChange('TEMPAT_HAN', e.target.value)}
                      className="form-input"
                      placeholder="Rumah Tahanan Negara (Rutan) Polres Kolaka Timur"
                    />
                  </div>

                  {/* Tanggal & Waktu Pembuatan BA Penahanan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal BA Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Waktu / Jam BA Penahanan
                      </label>
                      <input
                        type="text"
                        value={formValues.JAM_HAN || ''}
                        onChange={(e) => handleInputChange('JAM_HAN', e.target.value)}
                        className="form-input mono"
                        placeholder="Contoh: 10.00 WITA"
                      />
                    </div>
                  </div>

                  {/* Live Preview Tag Penahanan */}
                  {(() => {
                    const parsedHan = parseDateParts(formValues.TANGGAL_HAN || formValues.TANGGAL_MULAI_HAN || formValues.TANGGAL_SURAT);
                    return (
                      <div style={{
                        padding: '8px 10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        lineHeight: '1.5',
                        color: '#CBD5E1',
                        border: '1px dashed rgba(59, 130, 246, 0.25)'
                      }}>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '2px' }}>
                          Preview Injeksi Tag Word (docxtemplater):
                        </div>
                        <div>• Sprin Han: <code>{'{TANGGAL_MULAI_HAN}'}</code>: <strong>{formatTanggalIndonesia(formValues.TANGGAL_MULAI_HAN) || '-'}</strong> s.d. <code>{'{TANGGAL_AKHIR_HAN}'}</code>: <strong>{formatTanggalIndonesia(formValues.TANGGAL_AKHIR_HAN) || '-'}</strong></div>
                        <div>• Rutan: <code>{'{TEMPAT_HAN}'}</code>: <strong>{formValues.TEMPAT_HAN || 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur'}</strong></div>
                        <div>• BA Han: <code>{'{HARI_HAN}'}</code>: <strong>{parsedHan.hari || '-'}</strong>, <code>{'{TANGGAL_HAN}'}</code>: <strong>{parsedHan.tanggal || '-'}</strong>, <code>{'{BULAN_HAN}'}</code>: <strong>{parsedHan.bulan || '-'}</strong>, <code>{'{TAHUN_HAN}'}</code>: <strong>{parsedHan.tahun || '-'}</strong> (<code>{'{TERBILANG_TAHUN_HAN}'}</code>: <em>"{parsedHan.terbilangTahun || '-'}"</em>) pukul <code>{'{JAM_HAN}'}</code>: <strong>{formValues.JAM_HAN || '-'}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {(() => {
                const presetForDoc = getMindikPreset(currentTemplate?.code);
                let dynamicList = Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.length > 0 
                  ? [...currentTemplate.dynamic_fields] 
                  : (presetForDoc && presetForDoc.length > 0
                      ? presetForDoc.map(p => ({
                          field_key: p.tag,
                          field_label: p.label,
                          field_type: p.type,
                          default_value: p.default,
                          is_required: p.required
                        }))
                      : [
                        { 
                          field_key: 'NOMOR_SURAT', 
                          field_label: 'Nomor Surat', 
                          field_type: 'text', 
                          default_value: isSprinGasSidik ? 'SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra' : '', 
                          is_required: true 
                        },
                        { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
                        { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
                        { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
                        { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
                        { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false },
                      ]);

                // Universal Auto-Sync: Sembunyikan input manual rujukan dokumen induk pada dokumen induk itu sendiri
                if (isCurrentParentDoc && activeParentConfig) {
                  const redundantKeys = [
                    ...(activeParentConfig.noTags || []),
                    ...(activeParentConfig.tglTags || []),
                    activeParentConfig.targetNoCol?.toUpperCase(),
                    activeParentConfig.targetTglCol?.toUpperCase()
                  ].filter(Boolean);

                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantKeys.includes(k);
                  });
                }
                dynamicList = dynamicList.filter(f => (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase() !== 'ATASAN_JABATAN');

                // Saring field agar form ringkas dan bebas dobel input saat Penangkapan atau Penahanan aktif
                if (isBaKapDoc) {
                  const redundantKapKeys = [
                    'TANGGAL_KAP', 'JAM_KAP', 'TEMPAT_KAP',
                    'TANGGAL_SURAT', 'DOC_DATE',
                    'TEMPAT_SURAT', 'DOC_LOCATION',
                    'TUJUAN_SURAT', 'DOC_TARGET',
                    'ALAMAT_TUJUAN', 'DOC_TARGET_ADDR',
                    'MASA_BERLAKU', 'DOC_VALIDITY'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantKapKeys.includes(k);
                  });
                } else if (isHanDoc) {
                  const redundantHanKeys = [
                    'TANGGAL_MULAI_HAN', 'TANGGAL_AKHIR_HAN', 'TEMPAT_HAN',
                    'TANGGAL_HAN', 'JAM_HAN',
                    'TANGGAL_SURAT', 'DOC_DATE',
                    'TEMPAT_SURAT', 'DOC_LOCATION',
                    'TUJUAN_SURAT', 'DOC_TARGET',
                    'ALAMAT_TUJUAN', 'DOC_TARGET_ADDR',
                    'MASA_BERLAKU', 'DOC_VALIDITY'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantHanKeys.includes(k);
                  });
                } else if (isSpTapDoc) {
                  const redundantSpTapKeys = [
                    'NOMOR_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE',
                    'NOMOR_SP_TAP', 'NO_SP_TAP_TSK', 'NOMOR_SP_TAP_TSK',
                    'URUTAN_TERSANGKA', 'STATUS_TERSANGKA_LABEL'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantSpTapKeys.includes(k);
                  });
                }

                if (!Array.isArray(dynamicList) || dynamicList.length === 0) {
                  return null;
                }

                return (dynamicList || []).map((field, idx) => {
                  if (!field) return null;
                  const fieldKey = (field.field_key || field.key || `FIELD_${idx}`).replace(/[{}]/g, '').trim();
                  const upperFieldKey = fieldKey.toUpperCase();
                  let fieldLabel = field.field_label || field.label || fieldKey;
                  let placeholder = field.default_value !== undefined ? field.default_value : (field.placeholder || '');
                  const fieldType = field.field_type || field.type || 'text';
                  const isRequired = field.is_required !== undefined 
                    ? Boolean(field.is_required) 
                    : (field.isRequired !== undefined ? Boolean(field.isRequired) : Boolean(field.required));

                  if (isSpTapDoc) {
                    if (upperFieldKey === 'NOMOR_SURAT' || upperFieldKey === 'DOC_NO') {
                      fieldLabel = 'Nomor SP.Tap TSK';
                      placeholder = `SP.Tap/  /  /${new Date().getFullYear()}/Reskrim`;
                    } else if (upperFieldKey === 'TANGGAL_SURAT' || upperFieldKey === 'DOC_DATE') {
                      fieldLabel = 'Tanggal Penetapan Tersangka';
                    }
                  }
                  const currentVal = formValues[fieldKey] !== undefined 
                    ? formValues[fieldKey] 
                    : (formValues[fieldKey.toUpperCase()] !== undefined 
                        ? formValues[fieldKey.toUpperCase()] 
                        : (formValues[fieldKey.toLowerCase()] || ''));

                  return (
                    <div key={field.id || fieldKey || idx} className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: 0 }}>
                          {fieldLabel} {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                        </label>
                        <span className="mono" style={{ fontSize: '10px', color: '#cbd5e1' }}>
                          {`{${fieldKey}}`}
                        </span>
                      </div>

                      {fieldType === 'select_personnel' ? (
                        <select
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Pilih Personel --</option>
                          {(activePersonnel || [])
                            .filter(p => p && (!field.role_filter || p.role === field.role_filter))
                            .map((p) => (
                              <option key={p?.id || p?.nrp || p?.nama} value={p?.nama || p?.id}>
                                {p?.pangkat} {p?.nama} ({p?.jabatan || p?.role || '-'})
                              </option>
                            ))}
                        </select>
                      ) : fieldType === 'select' && Array.isArray(field.options) ? (
                        <select
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Pilih Pilihan --</option>
                          {(field.options || []).map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : fieldType === 'date' ? (
                        <input
                          type={(/^\d{4}-\d{2}-\d{2}$/.test(currentVal) || !currentVal) ? "date" : "text"}
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-input mono"
                          placeholder={placeholder || '... Januari 2026'}
                        />
                      ) : fieldType === 'textarea' ? (
                        <textarea
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-textarea"
                          placeholder={placeholder}
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-input mono"
                          placeholder={placeholder}
                        />
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Primary Action Button to Generate Real .docx */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleTriggerGenerate}
              className="btn btn-primary"
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(255, 53, 45, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-pulse" />
                  <span>Mengambil Template & Merender File .docx...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Generate Dokumen Resmi (.docx) dari Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Live Interactive Document Sheet */}
        <div>
          <OfficialDocPreview
            selectedCase={currentCase}
            template={currentTemplate}
            formValues={formValues}
            personnel={activePersonnel}
            activeSuspect={selectedSuspect}
            suspectsList={caseSuspects}
            activeVictim={selectedVictim}
            victimsList={registeredVictims}
            onSaveArchive={handleSave}
            isSaved={isSaved}
          />
        </div>
      </div>

      {/* --- MODAL 1: TAMBAH FORMAT TEMPLATE (.DOCX) (KHUSUS SUPER ADMIN) --- */}
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
                  background: 'rgba(255, 53, 45, 0.12)',
                  border: '1px solid rgba(255, 53, 45, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Upload size={18} color="#ff352d" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Tambah Format Template .docx</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Upload file template fisik ke Supabase Storage (bucket templates)
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

            <form onSubmit={handleAddTemplate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Judul Format */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Judul Format Dokumen <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Surat Perintah Penyitaan"
                    className="form-input"
                    required
                  />
                </div>

                {/* Kode Template & Kategori */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Kode Unik <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: SPRIN_SITA"
                      className="form-input mono"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="form-select"
                    >
                      <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                      <option value="SURAT">SURAT</option>
                      <option value="BERITA ACARA">BERITA ACARA</option>
                      <option value="PENETAPAN">PENETAPAN</option>
                      <option value="LAINNYA">LAINNYA</option>
                    </select>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi Template</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Deskripsi singkat peruntukan format dokumen..."
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>

                {/* File Upload Area */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Pilih File Master Word (.docx) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div 
                    style={{
                      border: '2px dashed var(--border-glass-hover)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                      textAlign: 'center',
                      background: newDocxFile ? 'rgba(255, 53, 45, 0.08)' : 'rgba(13, 21, 38, 0.4)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('new-docx-input').click()}
                  >
                    <input
                      id="new-docx-input"
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewDocxFile(e.target.files[0]);
                        }
                      }}
                    />

                    <FileText size={28} color={newDocxFile ? '#ff352d' : 'var(--text-secondary)'} style={{ margin: '0 auto 6px' }} />
                    {newDocxFile ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFF', fontSize: '12.5px' }}>{newDocxFile.name}</div>
                        <div style={{ fontSize: '11px', color: '#ff352d' }}>{(newDocxFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Klik di sini untuk memilih file .docx dari komputer Anda
                      </div>
                    )}
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
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <Upload size={14} />
                  <span>{isProcessingTemplate ? 'Mengunggah...' : 'Unggah & Simpan Format'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT FORMAT TEMPLATE (KHUSUS SUPER ADMIN) --- */}
      {templateToEdit && (
        <div className="modal-backdrop" onClick={() => setTemplateToEdit(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#ff352d" />
                <h3 style={{ fontSize: '16px', margin: 0 }}>Edit Format Template</h3>
              </div>
              <button 
                onClick={() => setTemplateToEdit(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kode Template (Permanen)</label>
                  <input
                    type="text"
                    value={templateToEdit.code}
                    disabled
                    className="form-input mono"
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Judul Format</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                    <option value="SURAT">SURAT</option>
                    <option value="BERITA ACARA">BERITA ACARA</option>
                    <option value="PENETAPAN">PENETAPAN</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setTemplateToEdit(null)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <span>{isProcessingTemplate ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: KONFIRMASI HAPUS FORMAT (KHUSUS SUPER ADMIN) --- */}
      {templateToDelete && (
        <div className="modal-backdrop" onClick={() => setTemplateToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px', borderColor: 'var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="var(--accent-red)" />
                <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--accent-red)' }}>
                  Hapus Format Template
                </h3>
              </div>
              <button 
                onClick={() => setTemplateToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menghapus format template ini dari Supabase Storage dan database?
              </p>
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontWeight: 700, color: '#FFF' }}>{templateToDelete.title}</div>
                <div className="mono" style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '2px' }}>
                  Kode: {templateToDelete.code} • Kategori: {templateToDelete.category}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setTemplateToDelete(null)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isProcessingTemplate}
                onClick={handleConfirmDelete}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
                <span>{isProcessingTemplate ? 'Menghapus...' : 'Ya, Hapus Format'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
