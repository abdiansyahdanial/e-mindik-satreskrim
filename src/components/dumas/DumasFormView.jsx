import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Image as ImageIcon, 
  Save, 
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Smartphone,
  UploadCloud,
  Eye,
  X
} from 'lucide-react';
import { 
  generateDumasNumber, 
  loadDumasDraft, 
  saveDumasDraft, 
  clearDumasDraft,
  safeGetLocalStorage,
  sanitizeEvidenceList
} from '../../services/dumasService';
import EvidenceQrSyncModal from './EvidenceQrSyncModal.jsx';
import EvidenceLightboxModal from './EvidenceLightboxModal.jsx';
import { supabase } from '../../supabaseClient';
import { formatR2PublicUrl, uploadFileToR2 } from '../../lib/r2Client';

const defaultPelapor = {
  nama: '',
  nik: '',
  ttl: '',
  pekerjaan: '',
  agama: 'Islam',
  alamat: '',
  kontak: '',
};

const defaultSaksi = [
  {
    id: 'saksi-1',
    nama: '',
    nik: '',
    ttl: '',
    pekerjaan: '',
    agama: 'Islam',
    alamat: '',
    kontak: '',
    role_label: 'Saksi Fakta',
  }
];

const defaultTerlapor = [
  {
    id: 'terlapor-1',
    nama: '',
    nik: '',
    ttl: '',
    pekerjaan: '',
    agama: 'Islam',
    alamat: '',
    kontak: '',
    role_label: 'Terlapor Utama',
  }
];

const defaultCaseInfo = {
  tindak_pidana: '',
  dugaan_tindak_pidana: '',
  pasal: '',
  dugaan_pasal: '',
  pasal_disangkakan: '',
  tempus_delicti: '',
  waktu_kejadian: '',
  locus_delicti: '',
  tempat_kejadian: '',
  uraian_kejadian: '',
  ringkasan_posisi_kasus: '',
  kronologis: '',
};

// Kunci Penyimpanan Draf Standar Satreskrim
const ACTIVE_DRAFT_KEY = 'emindik_active_dumas_form_draft';
const DRAFT_KEY_FORM = 'emindik_draft_form_perkara_v1';
const LEGACY_DRAFT_KEY_BB = 'emindik_draft_daftar_bb_v1';
const LEGACY_STORAGE_KEY = 'emindik_temp_draft_bb';
const LEGACY_DRAFT_STORAGE_KEY = 'emindik_dumas_evidence_v2';
// Kunci stabil khusus persistensi daftar bukti (tidak bergantung STORAGE_KEY dinamis)
const EVIDENCE_STORAGE_KEY = 'emindik_active_dumas_bb';
// Kunci backup agresif — hanya tulis jika ada isi, dibaca paling prioritas
const PERSISTENT_KEY = 'emindik_dumas_bb_persistent_v1';

// LANGKAH 1: Standar Struktur Objek Bukti (Sanitasi Mutlak)
const sanitizeEvidenceItem = (item, index = 0) => {
  if (!item || typeof item !== 'object') return null;
  const rawUrl = item.fileUrl || item.url || '';
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  return {
    id: String(item.id || `bb_${Date.now()}_${index}`),
    nama_berkas: String(item.nama_berkas || item.nama || item.name || item.nama_file || 'Dokumen Bukti'),
    url: rawUrl,
    fileUrl: rawUrl,
    tipe: String(item.tipe || item.type || item.mime_type || (rawUrl.includes('.pdf') ? 'application/pdf' : 'image/jpeg')),
    ukuran: Number(item.ukuran || item.size || item.file_size_bytes || 0),
    keterangan: String(item.keterangan || 'Foto barang bukti fisik diambil via pemindaian HP (Cloudflare R2)'),
    uploaded_at: String(item.uploaded_at || item.created_at || new Date().toISOString())
  };
};

// LANGKAH 5: Isolasi Error Boundary Khusus Kartu Barang Bukti
class EvidenceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[EVIDENCE ERROR BOUNDARY] Gagal me-render daftar barang bukti:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(DRAFT_KEY_BB);
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-xl text-center flex flex-col items-center gap-3 my-3">
          <div className="text-red-400 font-semibold text-sm font-mono">
            ⚠️ Terjadi kesalahan saat memuat kartu barang bukti.
          </div>
          <p className="text-zinc-400 text-xs max-w-md">
            Struktur data bukti lokal mengalami inkonsistensi. Anda dapat mereset daftar barang bukti untuk memulihkan tampilan secara aman.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 text-xs rounded-lg transition-colors font-mono font-medium"
          >
            Reset Form / Hapus Draft Bukti
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Emergency Console Draft Reset Helper
if (typeof window !== 'undefined') {
  window.resetEminikDraft = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('[EMERGENCY RESET] Seluruh draft lokal berhasil dibersihkan.');
    window.location.reload();
  };
}

export default function DumasFormView({
  mode = 'manual', // 'manual' | 'ocr'
  _initialOcrFile = null,
  _initialOcrFiles = null,
  initialOcrData = null,
  onBack,
  onSubmitDumas,
  currentUserProfile,
  perkaraId: propPerkaraId = null,
  nomorRegisterResmi: propNomorRegisterResmi = null
}) {
  const perkaraId = propPerkaraId || initialOcrData?.id || initialOcrData?.perkara_id || null;
  const [nomorRegisterResmi, setNomorRegisterResmi] = useState(() => {
    return (
      propNomorRegisterResmi ||
      initialOcrData?.nomor_register ||
      initialOcrData?.nomor_lp ||
      initialOcrData?.no_lp ||
      (typeof window !== 'undefined' ? (sessionStorage.getItem('emindik_active_nomor_register') || localStorage.getItem('emindik_active_nomor_register')) : null) ||
      ''
    );
  });

  useEffect(() => {
    if (propNomorRegisterResmi && propNomorRegisterResmi !== nomorRegisterResmi) {
      setNomorRegisterResmi(propNomorRegisterResmi);
    }
  }, [propNomorRegisterResmi]);

  useEffect(() => {
    if (nomorRegisterResmi && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('emindik_active_nomor_register', nomorRegisterResmi);
        localStorage.setItem('emindik_active_nomor_register', nomorRegisterResmi);
      } catch {}
    }
  }, [nomorRegisterResmi]);

  // 0. Sesi Draft Unik & Kunci Penyimpanan Terisolasi (Mencegah Kebocoran State Antar Laporan)
  const [draftSessionId, setDraftSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem('emindik_current_draft_session_id');
      if (existing) return existing;
      const genId = `sesi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('emindik_current_draft_session_id', genId);
      return genId;
    }
    return `sesi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  // Kunci penyimpanan dinamis: Terikat pada nomor register resmi jika ada, atau ID sesi draf unik
  const STORAGE_KEY = nomorRegisterResmi ? `bb_${nomorRegisterResmi}` : `bb_draft_${draftSessionId}`;
  const DRAFT_STORAGE_KEY = STORAGE_KEY;

  // 0. Safe Hydration Draf Formulir Tersimpan dari LocalStorage (Pola Lazy Initializer & Safe Parsing)
  const [savedDraft] = useState(() => {
    if (initialOcrData) return null;
    const fromActiveKey = safeGetLocalStorage(ACTIVE_DRAFT_KEY, null);
    if (fromActiveKey && typeof fromActiveKey === 'object') {
      console.log('[RECOVERY] Berhasil memuat ulang draft dari ACTIVE_DRAFT_KEY:', fromActiveKey);
      return fromActiveKey;
    }
    const fromFormKey = safeGetLocalStorage(DRAFT_KEY_FORM, null);
    if (fromFormKey && typeof fromFormKey === 'object') {
      console.log('[RECOVERY] Berhasil memuat ulang draft form perkara dari localStorage:', fromFormKey);
      return fromFormKey;
    }
    const serviceDraft = loadDumasDraft(currentUserProfile?.id) || loadDumasDraft(null);
    if (serviceDraft && typeof serviceDraft === 'object') {
      console.log('[RECOVERY] Berhasil memuat ulang draft dari dumasService:', serviceDraft);
      return serviceDraft;
    }
    return null;
  });

  // Data form aktif dari draf yang tersimpan
  const activeFormData = savedDraft?.formData || savedDraft;

  const [isDraftRestored, setIsDraftRestored] = useState(() => !!savedDraft);
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    if (savedDraft?.savedAt) {
      return new Date(savedDraft.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  });
  const [saveStatus, setSaveStatus] = useState(() => (savedDraft ? 'saved' : 'idle'));

  // State 01: Identitas Pelapor (Diisi dari initialOcrData atau Draf tersimpan jika ada)
  const [pelapor, setPelapor] = useState(() => {
    if (initialOcrData) {
      return {
        nama: initialOcrData?.pelapor?.nama || initialOcrData?.pelapor_nama || initialOcrData?.pelapor?.nama_lengkap || '',
        nik: initialOcrData?.pelapor?.nik || initialOcrData?.pelapor_nik || '',
        ttl: initialOcrData?.pelapor?.ttl || initialOcrData?.pelapor_ttl || '',
        pekerjaan: initialOcrData?.pelapor?.pekerjaan || initialOcrData?.pelapor_pekerjaan || '',
        agama: initialOcrData?.pelapor?.agama || initialOcrData?.pelapor_agama || 'Islam',
        alamat: initialOcrData?.pelapor?.alamat || initialOcrData?.pelapor_alamat || '',
        kontak: initialOcrData?.pelapor?.kontak || initialOcrData?.pelapor_kontak || initialOcrData?.pelapor?.no_hp || '',
      };
    }
    if (activeFormData?.pelapor) {
      return { ...defaultPelapor, ...activeFormData.pelapor };
    }
    if (savedDraft?.pelapor) {
      return { ...defaultPelapor, ...savedDraft.pelapor };
    }
    if (mode === 'ocr') {
      return {
        nama: 'AHMAD SUBARI',
        nik: '7411081905890001',
        ttl: 'Kolaka, 19 Mei 1989',
        pekerjaan: 'Wiraswasta / Pengawas BUMDes',
        agama: 'Islam',
        alamat: 'Desa Loea, Kec. Loea, Kab. Kolaka Timur',
        kontak: '081244556677',
      };
    }
    return defaultPelapor;
  });

  // State 02: Array Saksi-Saksi Dinamis (Mendukung Multi-Saksi dari OCR & Draf)
  const [saksiList, setSaksiList] = useState(() => {
    if (initialOcrData?.saksiList && initialOcrData.saksiList.length > 0) {
      return initialOcrData.saksiList;
    }
    if (initialOcrData?.saksi_list && initialOcrData.saksi_list.length > 0) {
      return initialOcrData.saksi_list.map((s, idx) => ({
        id: `saksi-ocr-${idx + 1}-${Date.now()}`,
        nama: s.nama || '',
        nik: s.nik || '',
        ttl: s.ttl || '',
        pekerjaan: s.pekerjaan || '',
        agama: s.agama || 'Islam',
        alamat: s.alamat || '',
        kontak: s.kontak || s.no_hp || '',
        role_label: idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`,
      }));
    }
    if (activeFormData?.saksiList && Array.isArray(activeFormData.saksiList) && activeFormData.saksiList.length > 0) {
      return activeFormData.saksiList;
    }
    if (savedDraft?.saksiList && Array.isArray(savedDraft.saksiList) && savedDraft.saksiList.length > 0) {
      return savedDraft.saksiList;
    }
    if (mode === 'ocr') {
      return [
        {
          id: 'saksi-1',
          nama: 'HARIS MUNANDAR, S.P.',
          nik: '7411081503850002',
          ttl: 'Tirawuta, 15 Maret 1985',
          pekerjaan: 'Perangkat Desa / Bendahara BUMDes',
          agama: 'Islam',
          alamat: 'Kel. Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
          kontak: '082198765432',
          role_label: 'Saksi Fakta',
        },
        {
          id: 'saksi-2',
          nama: 'NURHAYATI',
          nik: '7411084209900003',
          ttl: 'Kolaka, 22 September 1990',
          pekerjaan: 'Staf Administrasi',
          agama: 'Islam',
          alamat: 'Desa Loea, Kec. Loea, Kab. Kolaka Timur',
          kontak: '085211223344',
          role_label: 'Saksi Terkait',
        }
      ];
    }
    return defaultSaksi;
  });

  // State 03: Array Terlapor Dinamis (Mendukung Multi-Terlapor dari OCR & Draf)
  const [terlaporList, setTerlaporList] = useState(() => {
    if (initialOcrData?.terlaporList && initialOcrData.terlaporList.length > 0) {
      return initialOcrData.terlaporList;
    }
    if (initialOcrData?.terlapor_list && initialOcrData.terlapor_list.length > 0) {
      return initialOcrData.terlapor_list.map((t, idx) => ({
        id: `terlapor-ocr-${idx + 1}-${Date.now()}`,
        nama: t.nama || '',
        nik: t.nik || '',
        ttl: t.ttl || '',
        pekerjaan: t.pekerjaan || '',
        agama: t.agama || 'Islam',
        alamat: t.alamat || '',
        kontak: t.kontak || t.no_hp || '',
        role_label: idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`,
      }));
    }
    if (activeFormData?.terlaporList && Array.isArray(activeFormData.terlaporList) && activeFormData.terlaporList.length > 0) {
      return activeFormData.terlaporList;
    }
    if (savedDraft?.terlaporList && Array.isArray(savedDraft.terlaporList) && savedDraft.terlaporList.length > 0) {
      return savedDraft.terlaporList;
    }
    if (mode === 'ocr') {
      return [
        {
          id: 'terlapor-1',
          nama: 'SAMSUL BAHRI',
          nik: '7411080407880004',
          ttl: 'Rate-Rate, 4 Juli 1988',
          pekerjaan: 'Wiraswasta / Mantan Direktur BUMDes',
          agama: 'Islam',
          alamat: 'Kelurahan Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
          kontak: '085298987711',
          role_label: 'Terlapor Utama',
        }
      ];
    }
    return defaultTerlapor;
  });

  // State 04: Peristiwa, Delik, & Dugaan Pasal
  const [caseInfo, setCaseInfo] = useState(() => {
    if (initialOcrData) {
      const src = initialOcrData?.caseInfo || initialOcrData?.peristiwa || initialOcrData?.perkara || initialOcrData;
      const dugaanTindakPidana = src.pidana || src.tindak_pidana || src.dugaan_tindak_pidana || src.peristiwa?.pidana || src.peristiwa?.tindak_pidana || initialOcrData.pidana || initialOcrData.tindak_pidana || initialOcrData.dugaan_tindak_pidana || initialOcrData.peristiwa?.pidana || initialOcrData.peristiwa?.tindak_pidana || '';
      const dugaanPasal = src.pasal || src.dugaan_pasal || src.pasal_disangkakan || src.peristiwa?.pasal || initialOcrData.pasal || initialOcrData.dugaan_pasal || initialOcrData.pasal_disangkakan || initialOcrData.peristiwa?.pasal || '';
      const tempusDelicti = src.waktu || src.tempus_delicti || src.waktu_kejadian || src.peristiwa?.waktu || src.peristiwa?.tempus_delicti || initialOcrData.waktu || initialOcrData.tempus_delicti || initialOcrData.waktu_kejadian || initialOcrData.peristiwa?.waktu || initialOcrData.peristiwa?.tempus_delicti || '';
      const locusDelicti = src.tkp || src.locus_delicti || src.tempat_kejadian || src.peristiwa?.tkp || src.peristiwa?.locus_delicti || initialOcrData.tkp || initialOcrData.locus_delicti || initialOcrData.tempat_kejadian || initialOcrData.peristiwa?.tkp || initialOcrData.peristiwa?.locus_delicti || '';
      const uraianKejadian = src.uraian || src.uraian_kejadian || src.ringkasan_kasus || src.kronologis || src.peristiwa?.uraian || src.peristiwa?.uraian_kejadian || initialOcrData.uraian || initialOcrData.uraian_kejadian || initialOcrData.ringkasan_posisi_kasus || initialOcrData.ringkasan_kasus || initialOcrData.kronologis || initialOcrData.peristiwa?.uraian || initialOcrData.peristiwa?.uraian_kejadian || '';

      return {
        pidana: dugaanTindakPidana,
        tindak_pidana: dugaanTindakPidana,
        dugaan_tindak_pidana: dugaanTindakPidana,
        pasal: dugaanPasal,
        dugaan_pasal: dugaanPasal,
        pasal_disangkakan: dugaanPasal,
        waktu: tempusDelicti,
        tempus_delicti: tempusDelicti,
        waktu_kejadian: tempusDelicti,
        tkp: locusDelicti,
        locus_delicti: locusDelicti,
        tempat_kejadian: locusDelicti,
        uraian: uraianKejadian,
        uraian_kejadian: uraianKejadian,
        ringkasan_posisi_kasus: uraianKejadian,
        kronologis: uraianKejadian,
      };
    }
    if (activeFormData?.caseInfo) {
      return { ...defaultCaseInfo, ...activeFormData.caseInfo };
    }
    if (savedDraft?.caseInfo) {
      return { ...defaultCaseInfo, ...savedDraft.caseInfo };
    }
    if (mode === 'ocr') {
      return {
        pidana: 'Penipuan & Penggelapan Dana Anggaran',
        tindak_pidana: 'Penipuan & Penggelapan Dana Anggaran',
        dugaan_tindak_pidana: 'Penipuan & Penggelapan Dana Anggaran',
        pasal: 'Pasal 378 KUHP dan/atau Pasal 372 KUHP',
        dugaan_pasal: 'Pasal 378 KUHP dan/atau Pasal 372 KUHP',
        pasal_disangkakan: 'Pasal 378 KUHP dan/atau Pasal 372 KUHP',
        waktu: 'Senin, 14 September 2026 - Pukul 10.30 WITA',
        tempus_delicti: 'Senin, 14 September 2026 - Pukul 10.30 WITA',
        waktu_kejadian: 'Senin, 14 September 2026 - Pukul 10.30 WITA',
        tkp: 'Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
        locus_delicti: 'Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
        tempat_kejadian: 'Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
        uraian: 'Bahwa pada hari Senin tanggal 14 September 2026 sekitar pukul 10.30 WITA, Terlapor Sdr. SAMSUL BAHRI diduga tanpa hak atau izin telah menggelapkan dana kas Bumdes sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah).',
        uraian_kejadian: 'Bahwa pada hari Senin tanggal 14 September 2026 sekitar pukul 10.30 WITA, Terlapor Sdr. SAMSUL BAHRI diduga tanpa hak atau izin telah menggelapkan dana kas Bumdes sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah).',
        ringkasan_posisi_kasus: 'Bahwa pada hari Senin tanggal 14 September 2026 sekitar pukul 10.30 WITA, Terlapor Sdr. SAMSUL BAHRI diduga tanpa hak atau izin telah menggelapkan dana kas Bumdes sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah).',
        kronologis: 'Bahwa pada hari Senin tanggal 14 September 2026 sekitar pukul 10.30 WITA, Terlapor Sdr. SAMSUL BAHRI diduga tanpa hak atau izin telah menggelapkan dana kas Bumdes sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah).',
      };
    }
    return defaultCaseInfo;
  });

  // Sinkronisasi otomatis ke state caseInfo saat data hasil scan OCR diterima
  useEffect(() => {
    if (initialOcrData) {
      const src = initialOcrData?.caseInfo || initialOcrData?.peristiwa || initialOcrData?.perkara || initialOcrData;
      setCaseInfo(prev => {
        const dugaanTindakPidana = src.pidana || src.tindak_pidana || src.dugaan_tindak_pidana || src.peristiwa?.pidana || src.peristiwa?.tindak_pidana || initialOcrData.pidana || initialOcrData.tindak_pidana || initialOcrData.dugaan_tindak_pidana || initialOcrData.peristiwa?.pidana || initialOcrData.peristiwa?.tindak_pidana || prev.dugaan_tindak_pidana || prev.tindak_pidana || '';
        const dugaanPasal = src.pasal || src.dugaan_pasal || src.pasal_disangkakan || src.peristiwa?.pasal || initialOcrData.pasal || initialOcrData.dugaan_pasal || initialOcrData.pasal_disangkakan || initialOcrData.peristiwa?.pasal || prev.dugaan_pasal || prev.pasal_disangkakan || '';
        const tempusDelicti = src.waktu || src.tempus_delicti || src.waktu_kejadian || src.peristiwa?.waktu || src.peristiwa?.tempus_delicti || initialOcrData.waktu || initialOcrData.tempus_delicti || initialOcrData.waktu_kejadian || initialOcrData.peristiwa?.waktu || initialOcrData.peristiwa?.tempus_delicti || prev.tempus_delicti || prev.waktu_kejadian || '';
        const locusDelicti = src.tkp || src.locus_delicti || src.tempat_kejadian || src.peristiwa?.tkp || src.peristiwa?.locus_delicti || initialOcrData.tkp || initialOcrData.locus_delicti || initialOcrData.tempat_kejadian || initialOcrData.peristiwa?.tkp || initialOcrData.peristiwa?.locus_delicti || prev.locus_delicti || prev.tempat_kejadian || '';
        const uraianKejadian = src.uraian || src.uraian_kejadian || src.ringkasan_kasus || src.kronologis || src.peristiwa?.uraian || src.peristiwa?.uraian_kejadian || initialOcrData.uraian || initialOcrData.uraian_kejadian || initialOcrData.ringkasan_posisi_kasus || initialOcrData.ringkasan_kasus || initialOcrData.kronologis || initialOcrData.peristiwa?.uraian || initialOcrData.peristiwa?.uraian_kejadian || prev.uraian_kejadian || prev.ringkasan_posisi_kasus || '';

        return {
          ...prev,
          pidana: dugaanTindakPidana,
          tindak_pidana: dugaanTindakPidana,
          dugaan_tindak_pidana: dugaanTindakPidana,
          pasal: dugaanPasal,
          dugaan_pasal: dugaanPasal,
          pasal_disangkakan: dugaanPasal,
          waktu: tempusDelicti,
          tempus_delicti: tempusDelicti,
          waktu_kejadian: tempusDelicti,
          tkp: locusDelicti,
          locus_delicti: locusDelicti,
          tempat_kejadian: locusDelicti,
          uraian: uraianKejadian,
          uraian_kejadian: uraianKejadian,
          ringkasan_posisi_kasus: uraianKejadian,
          kronologis: uraianKejadian,
        };
      });
    }
  }, [initialOcrData]);

  // Pelacak URL bukti yang sudah masuk untuk mencegah duplikasi (Strict Deduplication Ref)
  const processedEvidenceUrlsRef = useRef(new Set());

  // LANGKAH 2: Inisialisasi State Bebas Crash & Anti-Hilang Saat Refresh
  // Prioritas baca: (0) PERSISTENT_KEY → (1) EVIDENCE_STORAGE_KEY stabil → (2) ACTIVE_DRAFT_KEY → (3) savedDraft
  const [daftarBukti, setDaftarBukti] = useState(() => {
    try {
      // Prioritas 0: Key backup agresif — hanya ada isinya jika pernah upload
      const persistentRaw = localStorage.getItem(PERSISTENT_KEY);
      if (persistentRaw) {
        const parsed = JSON.parse(persistentRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(sanitizeEvidenceItem).filter(Boolean);
          if (cleaned.length > 0) {
            console.log('[HYDRATION] Bukti dipulihkan dari PERSISTENT_KEY:', cleaned.length, 'berkas');
            return cleaned;
          }
        }
      }
    } catch {}
    try {
      // Prioritas 1: Baca dari key stabil dedikasi bukti (paling reliabel saat refresh)
      const evidenceRaw = localStorage.getItem(EVIDENCE_STORAGE_KEY);
      if (evidenceRaw) {
        const parsed = JSON.parse(evidenceRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(sanitizeEvidenceItem).filter(Boolean);
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {}
    try {
      // Prioritas 2: Baca dari ACTIVE_DRAFT_KEY (gabungan form + bukti)
      const activeRaw = safeGetLocalStorage(ACTIVE_DRAFT_KEY, null);
      if (activeRaw && Array.isArray(activeRaw.daftarBukti) && activeRaw.daftarBukti.length > 0) {
        return activeRaw.daftarBukti.map(sanitizeEvidenceItem).filter(Boolean);
      }
      if (savedDraft?.daftarBukti && Array.isArray(savedDraft.daftarBukti) && savedDraft.daftarBukti.length > 0) {
        return savedDraft.daftarBukti.map(sanitizeEvidenceItem).filter(Boolean);
      }
    } catch {}
    return [];
  });
  const [isStorageReady, setIsStorageReady] = useState(false);
  // Backward-compatible alias
  const evidenceFiles = daftarBukti;
  const setEvidenceFiles = setDaftarBukti;

  // 3. Rehidrasi Draft Otomatis Saat Komponen Dimuat (Anti-Hilang Saat Refresh)
  useEffect(() => {
    try {
      const savedDraftRaw = localStorage.getItem(ACTIVE_DRAFT_KEY);
      if (savedDraftRaw) {
        const parsed = JSON.parse(savedDraftRaw);
        if (parsed.formData && Object.keys(parsed.formData).length > 0) {
          if (parsed.formData.pelapor) {
            setPelapor(prev => ({ ...prev, ...parsed.formData.pelapor }));
          }
          if (Array.isArray(parsed.formData.saksiList) && parsed.formData.saksiList.length > 0) {
            setSaksiList(parsed.formData.saksiList);
          }
          if (Array.isArray(parsed.formData.terlaporList) && parsed.formData.terlaporList.length > 0) {
            setTerlaporList(parsed.formData.terlaporList);
          }
          if (parsed.formData.caseInfo) {
            setCaseInfo(prev => ({ ...prev, ...parsed.formData.caseInfo }));
          }
        }
        if (Array.isArray(parsed.daftarBukti) && parsed.daftarBukti.length > 0) {
          const cleaned = parsed.daftarBukti.map(sanitizeEvidenceItem).filter(Boolean);
          setDaftarBukti(cleaned);
          cleaned.forEach(item => {
            const u = (item.url || item.fileUrl || '').trim();
            if (u) processedEvidenceUrlsRef.current.add(u);
          });
        }
        setIsDraftRestored(true);
        if (parsed.savedAt) {
          setLastSavedTime(new Date(parsed.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        }
        console.log('[DRAFT RESTORED] Data form & bukti berhasil dipulihkan setelah reload.');
      } else if (nomorRegisterResmi) {
        const regDraft = localStorage.getItem(`draft_bb_${nomorRegisterResmi}`);
        if (regDraft) {
          const parsedReg = JSON.parse(regDraft);
          if (Array.isArray(parsedReg)) {
            setDaftarBukti(parsedReg.map(sanitizeEvidenceItem).filter(Boolean));
          }
        }
      }
    } catch (err) {
      console.error('[RESTORE ERROR]:', err);
    } finally {
      setIsStorageReady(true);
    }
  }, [nomorRegisterResmi]);

  // Sinkronkan ke localStorage terisolasi per sesi / nomor register
  useEffect(() => {
    if (!isStorageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(daftarBukti));
      if (nomorRegisterResmi) {
        localStorage.setItem(`draft_bb_${nomorRegisterResmi}`, JSON.stringify(daftarBukti));
      }
    } catch (err) {
      console.error('[STORAGE SAVE] Gagal menyimpan ke localStorage:', err);
    }
  }, [daftarBukti, isStorageReady, STORAGE_KEY, nomorRegisterResmi]);

  // Auto-save daftarBukti ke kunci STABIL (EVIDENCE_STORAGE_KEY) — anti-hilang saat refresh
  // Terpisah dari STORAGE_KEY yang dinamis, dipicu setiap kali daftarBukti berubah
  useEffect(() => {
    try {
      localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(daftarBukti));
    } catch (e) {
      console.error('[AUTO-SAVE BUKTI] Gagal auto-save bukti ke EVIDENCE_STORAGE_KEY:', e);
    }
  }, [daftarBukti]);

  // Auto-save ke PERSISTENT_KEY (backup agresif — hanya tulis saat ada isi)
  useEffect(() => {
    try {
      if (daftarBukti.length > 0) {
        localStorage.setItem(PERSISTENT_KEY, JSON.stringify(daftarBukti));
      }
    } catch (e) {
      console.error('[AUTO-SAVE BUKTI] Gagal auto-save bukti ke PERSISTENT_KEY:', e);
    }
  }, [daftarBukti]);

  // State Dokumen / Riwayat Berkas (Safe 404/PGRST204 Fallback Resilience)
  const [documents, setDocuments] = useState([]);
  const [arsipDokumen, setArsipDokumen] = useState([]);

  // Safe Fetch Dokumen & Arsip Dokumen Supabase dengan Penanganan Error 404/PGRST204
  useEffect(() => {
    const fetchDokumenRiwayat = async () => {
      // 1. Ambil dokumen dari tabel 'documents'
      try {
        let query = supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (perkaraId) {
          query = query.eq('case_id', perkaraId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('[SUPABASE WARNING] Tabel documents belum ada atau tidak dapat diakses:', error.message);
          setDocuments([]);
          // Fallback periksa jika data tersimpan di tabel arsip_dokumen
          try {
            let arsipQuery = supabase
              .from('arsip_dokumen')
              .select('*')
              .order('created_at', { ascending: false });

            if (perkaraId) {
              arsipQuery = arsipQuery.eq('case_id', perkaraId);
            }

            const { data: arsipData, error: arsipError } = await arsipQuery;

            if (arsipError) {
              console.warn('[SUPABASE WARNING] Tabel arsip_dokumen belum ada atau tidak dapat diakses:', arsipError.message);
              setArsipDokumen([]);
              return;
            }
            setArsipDokumen(arsipData || []);
            setDocuments(arsipData || []);
          } catch (errArsip) {
            console.error('[FETCH ERROR ARSIP]:', errArsip);
            setArsipDokumen([]);
          }
          return;
        }
        setDocuments(data || []);
      } catch (err) {
        console.error('[FETCH ERROR]:', err);
        setDocuments([]);
      }

      // 2. Ambil dokumen dari tabel 'arsip_dokumen' jika query pertama sukses
      try {
        let query = supabase
          .from('arsip_dokumen')
          .select('*')
          .order('created_at', { ascending: false });

        if (perkaraId) {
          query = query.eq('case_id', perkaraId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('[SUPABASE WARNING] Tabel arsip_dokumen belum ada atau tidak dapat diakses:', error.message);
          setArsipDokumen([]);
          return;
        }
        setArsipDokumen(data || []);
      } catch (err) {
        console.error('[FETCH ERROR]:', err);
        setArsipDokumen([]);
      }
    };

    fetchDokumenRiwayat();
  }, [perkaraId]);

  // Log status bukti saat render/refresh untuk pemantauan realtime
  console.log('[STATUS BUKTI SAAT RENDER]:', daftarBukti);

  const [toastEvidence, setToastEvidence] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Token Sesi Sinkronisasi Kamera HP (Disimpan di sessionStorage agar stabil saat browser direfresh)
  const [activeToken, setActiveToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedToken = sessionStorage.getItem('temp_dumas_token');
      if (savedToken) return savedToken;
    }
    const newToken = `POLRES-KOLTIM-BB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('temp_dumas_token', newToken);
    }
    return newToken;
  });

  const tokenSesi = activeToken;

  const handleTokenChange = (newToken) => {
    setActiveToken(newToken);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('temp_dumas_token', newToken);
    }
  };

  // Ref pelacak URL yang sudah disimpan ke DB untuk mencegah insert duplikat saat broadcast berulang
  const insertedUrlsRef = useRef(new Set());

  // 1. Simpan Data Bukti ke Database Supabase Saat Broadcast Diterima
  const simpanBuktiKeDatabase = useCallback(async (payload) => {
    if (!payload) return;
    const targetUrl = payload.url || payload.fileUrl || payload.file_url;
    if (!targetUrl) return;

    if (insertedUrlsRef.current.has(targetUrl)) {
      console.log('[DB PERSIST] Bukti sudah pernah tersimpan ke database, lewati:', targetUrl);
      return;
    }
    insertedUrlsRef.current.add(targetUrl);

    console.log('[DB PERSIST] Menyimpan bukti ke Supabase...', payload);

    const bbPayload = {
      nomor_register: nomorRegisterResmi || null,
      id_perkara: perkaraId || null, // hubungkan jika ID perkara sudah ada
      token_sesi: tokenSesi,
      nama_berkas: payload.nama_berkas || payload.nama_file || payload.fileName || payload.name || 'Foto_Bukti_HP.jpg',
      file_url: targetUrl,
      tipe_berkas: payload.tipe || payload.type || payload.mime_type || 'image/jpeg',
      ukuran_berkas: payload.ukuran || payload.fileSize || payload.size || 0,
      storage_provider: 'cloudflare_r2',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('barang_bukti')
        .insert([bbPayload])
        .select();

      if (error) {
        console.warn("Gagal persistensi BB ke tabel barang_bukti, mencoba tabel lampiran_barang_bukti:", error.message);
        // Fallback ke tabel lampiran_barang_bukti jika tabel barang_bukti belum dimigrasi di database
        const fallbackPayload = {
          laporan_id: perkaraId || null,
          file_path: tokenSesi || payload.key || '',
          nama_file: bbPayload.nama_berkas,
          file_url: targetUrl,
          mime_type: bbPayload.tipe_berkas,
          file_size_bytes: bbPayload.ukuran_berkas,
          kategori_bukti: payload.kategori_bukti || (bbPayload.nama_berkas.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'),
          keterangan: payload.keterangan || `Foto bukti via HP R2 [token:${tokenSesi}]`,
          created_at: new Date().toISOString()
        };

        const { data: fbData, error: fbError } = await supabase
          .from('lampiran_barang_bukti')
          .insert([fallbackPayload])
          .select();

        if (fbError) {
          console.error("Gagal persistensi BB ke Supabase:", fbError);
        } else {
          console.log("BB berhasil disimpan permanen ke lampiran_barang_bukti:", fbData);
        }
      } else {
        console.log("BB berhasil disimpan permanen:", data);
      }
    } catch (dbErr) {
      console.error("Kesalahan jaringan saat menyimpan bukti ke Supabase:", dbErr);
    }
  }, [perkaraId, tokenSesi, nomorRegisterResmi]);

  // 1. Simpan Langsung ke Database Saat Bukti Baru Masuk (Instruksi Utama)
  const handleBuktiBaruDiterima = useCallback(async (itemBukti, skipStateUpdate = false) => {
    if (!itemBukti) return;
    const rawUrl = itemBukti.url || itemBukti.fileUrl || itemBukti.file_url;
    if (!rawUrl) return;
    const resolvedUrl = formatR2PublicUrl(rawUrl).trim();

    const sanitized = sanitizeEvidenceItem({
      ...itemBukti,
      url: resolvedUrl,
      fileUrl: resolvedUrl
    });
    if (!sanitized) return;

    // A. Update state lokal segera (hanya jika caller belum melakukan update state)
    if (!skipStateUpdate) {
      setDaftarBukti((prev) => {
        const isDuplicate = prev.some((b) => {
          const itemUrl = (b.url || b.fileUrl || b.file_url || '').trim();
          return itemUrl === resolvedUrl || (b.id && sanitized.id && b.id === sanitized.id);
        });
        if (isDuplicate) {
          console.warn('[DEDUP] Mengabaikan duplikat state untuk URL:', resolvedUrl);
          return prev;
        }
        return [...prev, sanitized];
      });
    }

    // Catat ke ref memori agar tidak diproses berulang
    processedEvidenceUrlsRef.current.add(resolvedUrl);

    // B. Jika sudah ada nomor register resmi, simpan langsung ke Supabase
    if (nomorRegisterResmi) {
      try {
        // Simpan ke tabel relasi barang_bukti
        const { error: insErr } = await supabase.from('barang_bukti').insert([{
          nomor_register: nomorRegisterResmi,
          id_perkara: perkaraId || null,
          nama_berkas: sanitized.nama_berkas || sanitized.name || sanitized.nama_file || 'Berkas Bukti',
          file_url: sanitized.url || sanitized.fileUrl,
          tipe_berkas: sanitized.tipe || sanitized.type || 'image/jpeg',
          ukuran_berkas: sanitized.ukuran || sanitized.size || 0,
          keterangan: sanitized.keterangan || 'Barang bukti digital',
          storage_provider: 'cloudflare_r2',
          created_at: new Date().toISOString()
        }]);
        if (!insErr) {
          console.log('[PERSISTENCE] Bukti berhasil disimpan ke database untuk register:', nomorRegisterResmi);
        } else {
          console.warn('[PERSISTENCE WARNING]:', insErr.message);
        }
      } catch (err) {
        console.error('[PERSISTENCE ERROR]:', err);
      }
    }

    // Tetap sinkronkan ke fallback database berbasis token sesi
    await simpanBuktiKeDatabase(sanitized);
  }, [nomorRegisterResmi, perkaraId, simpanBuktiKeDatabase]);

  // 2. Muat Ulang Bukti Saat Halaman Dimuat / Direfresh (Hydration Query berdasarkan nomor register resmi)
  useEffect(() => {
    const loadBuktiByRegister = async () => {
      if (!nomorRegisterResmi) return;

      console.log('[HYDRATION] Memuat ulang bukti untuk register:', nomorRegisterResmi);

      try {
        // 1. Coba ambil dari tabel barang_bukti
        const { data, error } = await supabase
          .from('barang_bukti')
          .select('*')
          .eq('nomor_register', nomorRegisterResmi)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const formatted = data.map((b) => ({
            id: b.id,
            nama_berkas: b.nama_berkas,
            nama_file: b.nama_berkas,
            name: b.nama_berkas,
            url: b.file_url,
            fileUrl: b.file_url,
            tipe: b.tipe_berkas,
            tipe_berkas: b.tipe_berkas,
            mime_type: b.tipe_berkas,
            ukuran: b.ukuran_berkas,
            ukuran_berkas: b.ukuran_berkas,
            file_size_bytes: b.ukuran_berkas,
            file_size_formatted: `${(Number(b.ukuran_berkas || 0) / 1024).toFixed(0)} KB`,
            kategori_bukti: b.nama_berkas?.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
            keterangan: b.keterangan || 'Barang bukti digital',
            storage_provider: b.storage_provider || 'cloudflare_r2',
            uploaded_at: b.created_at,
            diunggah_pada: b.created_at,
            created_at: b.created_at
          }));
          setDaftarBukti(formatted);
          console.log('[RELOAD] Bukti berhasil dimuat dari database:', formatted.length, 'berkas untuk register:', nomorRegisterResmi);
          return;
        }

        // 2. Fallback: jika form masih draft belum teregister, ambil dari localStorage
        const draftLocal = localStorage.getItem(`draft_bb_${nomorRegisterResmi}`);
        if (draftLocal) {
          try {
            const parsedLocal = JSON.parse(draftLocal);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              setDaftarBukti(parsedLocal);
              console.log('[RELOAD] Bukti berhasil dimuat dari draft lokal:', parsedLocal.length, 'berkas');
            }
          } catch {}
        }
      } catch (err) {
        console.error('[FETCH BUKTI ERROR]:', err);
      }
    };

    loadBuktiByRegister();
  }, [nomorRegisterResmi]);

  // 3. Muat Ulang Data Tambahan (Fetch on Mount via PerkaraId / TokenSesi)
  useEffect(() => {
    const fetchBuktiTersimpan = async () => {
      if (!perkaraId && !tokenSesi) return;

      console.log(`[DB FETCH] Mengambil data bukti tersimpan (perkaraId: ${perkaraId}, tokenSesi: ${tokenSesi})...`);

      try {
        let query = supabase.from('barang_bukti').select('*');
        if (perkaraId) {
          query = query.eq('id_perkara', perkaraId);
        } else if (tokenSesi) {
          query = query.eq('token_sesi', tokenSesi);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          console.log('[DB FETCH] Data bukti ditemukan di tabel barang_bukti:', data);
          setDaftarBukti((prev) => {
            const existingUrls = new Set(prev.map(p => p.url || p.fileUrl || p.file_url));
            const newItems = data
              .filter(item => !existingUrls.has(item.file_url))
              .map(item => ({
                id: item.id,
                nama: item.nama_berkas,
                nama_berkas: item.nama_berkas,
                nama_file: item.nama_berkas,
                name: item.nama_berkas,
                url: item.file_url,
                fileUrl: item.file_url,
                file_url: item.file_url,
                previewUrl: item.file_url,
                tipe: item.tipe_berkas,
                type: item.tipe_berkas,
                mime_type: item.tipe_berkas,
                ukuran: item.ukuran_berkas,
                size: item.ukuran_berkas,
                fileSize: item.ukuran_berkas,
                file_size_formatted: `${(item.ukuran_berkas / 1024).toFixed(0)} KB`,
                kategori_bukti: item.nama_berkas?.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
                storage_provider: item.storage_provider || 'cloudflare_r2',
                created_at: item.created_at
              }));
            return [...prev, ...newItems];
          });
          return;
        }

        // Fallback: cek ke lampiran_barang_bukti jika barang_bukti kosong/belum dibuat
        let fbQuery = supabase.from('lampiran_barang_bukti').select('*');
        if (perkaraId) {
          fbQuery = fbQuery.eq('laporan_id', perkaraId);
        } else if (tokenSesi) {
          fbQuery = fbQuery.eq('file_path', tokenSesi);
        }

        const { data: fbData, error: fbError } = await fbQuery;
        if (!fbError && fbData && fbData.length > 0) {
          console.log('[DB FETCH] Data bukti ditemukan di tabel lampiran_barang_bukti:', fbData);
          setDaftarBukti((prev) => {
            const existingUrls = new Set(prev.map(p => p.url || p.fileUrl || p.file_url));
            const newItems = fbData
              .filter(item => !existingUrls.has(item.file_url))
              .map(item => ({
                id: item.id,
                nama: item.nama_file,
                nama_berkas: item.nama_file,
                nama_file: item.nama_file,
                name: item.nama_file,
                url: item.file_url,
                fileUrl: item.file_url,
                file_url: item.file_url,
                previewUrl: item.file_url,
                tipe: item.mime_type,
                type: item.mime_type,
                mime_type: item.mime_type,
                ukuran: item.file_size_bytes,
                size: item.file_size_bytes,
                fileSize: item.file_size_bytes,
                file_size_formatted: `${(item.file_size_bytes / 1024).toFixed(0)} KB`,
                kategori_bukti: item.kategori_bukti || (item.nama_file?.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'),
                keterangan: item.keterangan,
                created_at: item.created_at
              }));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.warn('[DB FETCH] Pengecekan Supabase awal selesai (offline/pending):', err);
      }
    };

    fetchBuktiTersimpan();
  }, [perkaraId, tokenSesi]);


  // 1. Stand-by Realtime Listener di Channel mobile_sync_${activeToken}
  // PENTING: Listener ini DINONAKTIFKAN saat QR Modal terbuka karena EvidenceQrSyncModal
  // memiliki listener sendiri pada channel YANG SAMA — jika keduanya aktif, setiap event
  // broadcast akan diproses DUA KALI (double dispatch = duplikasi bukti).
  useEffect(() => {
    if (!activeToken) return;
    // Guard utama: jika QR modal terbuka, modal sudah subscribe ke channel ini
    // DumasFormView tidak perlu mendaftarkan listener kedua pada channel yang sama
    if (isQrModalOpen) {
      console.log(`[LAPTOP] QR Modal aktif — listener DumasFormView di channel mobile_sync_${activeToken} ditangguhkan untuk mencegah duplikasi.`);
      return;
    }

    console.log(`[LAPTOP] Mendaftarkan listener channel mobile_sync_${activeToken}...`);
    const channel = supabase.channel(`mobile_sync_${activeToken}`)
      .on('broadcast', { event: 'evidence_uploaded' }, async ({ payload }) => {
        if (!payload || (!payload.url && !payload.fileUrl)) return;
        console.log('[LAPTOP] Menerima berkas bukti baru:', payload);

        const rawUrl = payload.url || payload.fileUrl || payload.file_url;
        const targetUrl = formatR2PublicUrl(rawUrl).trim();

        // Cek apakah URL sudah pernah diproses di sesi aktif
        if (processedEvidenceUrlsRef.current.has(targetUrl)) {
          console.warn('[DEDUP] Mengabaikan event duplikat untuk URL:', targetUrl);
          return;
        }

        const resolvedName = payload.nama_berkas || payload.fileName || payload.name || payload.nama_file || 'Foto_Bukti_HP.jpg';
        const resolvedSize = payload.ukuran || payload.fileSize || payload.size || 0;
        const resolvedType = payload.tipe || payload.type || payload.mime_type || (resolvedName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

        const sanitized = sanitizeEvidenceItem({
          id: payload.id || `bb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          nama_berkas: resolvedName,
          url: targetUrl,
          fileUrl: targetUrl,
          ukuran: resolvedSize,
          tipe: resolvedType,
          keterangan: payload.keterangan || 'Foto barang bukti fisik diambil via pemindaian HP (Cloudflare R2)',
          uploaded_at: payload.uploaded_at || new Date().toISOString(),
        });

        if (!sanitized) return;

        let wasAdded = false;
        setDaftarBukti((prev) => {
          // Cek apakah URL bukti sudah pernah masuk
          const isDuplicate = prev.some(item => {
            const itemUrl = (item.url || item.fileUrl || item.file_url || '').trim();
            return itemUrl === targetUrl || (item.id && sanitized.id && item.id === sanitized.id);
          });
          if (isDuplicate) {
            console.warn('[DEDUP] Mengabaikan event duplikat untuk URL:', targetUrl);
            return prev;
          }
          wasAdded = true;
          return [...prev, sanitized];
        });

        if (wasAdded) {
          processedEvidenceUrlsRef.current.add(targetUrl);
          // Simpan langsung ke database jika nomor register resmi sudah aktif (skipStateUpdate = true)
          await handleBuktiBaruDiterima(sanitized, true);

          // Notifikasi toast visual:
          setToastEvidence(sanitized);
          setTimeout(() => setToastEvidence(null), 6000);
        }
      })
      .subscribe((status) => {
        console.log(`[LAPTOP] Status listener mobile_sync_${activeToken}:`, status);
      });

    // Cross-tab broadcast & localStorage fallback untuk uji coba di laptop
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('polres_mobile_bridge');
        bc.onmessage = async (event) => {
          if (event.data && (event.data.url || event.data.fileUrl)) {
            const targetUrl = formatR2PublicUrl(event.data.url || event.data.fileUrl).trim();
            if (processedEvidenceUrlsRef.current.has(targetUrl)) return;

            const sanitized = sanitizeEvidenceItem({
              ...event.data,
              url: targetUrl,
              fileUrl: targetUrl
            });
            if (sanitized) {
              let wasAdded = false;
              setDaftarBukti((prev) => {
                const isDuplicate = prev.some(item => (item.url || item.fileUrl || '').trim() === targetUrl);
                if (isDuplicate) return prev;
                wasAdded = true;
                return [...prev, sanitized];
              });
              if (wasAdded) {
                processedEvidenceUrlsRef.current.add(targetUrl);
                await handleBuktiBaruDiterima(sanitized, true);
                setToastEvidence(sanitized);
                setTimeout(() => setToastEvidence(null), 6000);
              }
            }
          }
        };
      } catch {}
    }

    const handleStorage = async (e) => {
      if (e.key === `polres_mobile_evidence_${activeToken}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && (parsed.url || parsed.fileUrl)) {
            const targetUrl = formatR2PublicUrl(parsed.url || parsed.fileUrl).trim();
            if (processedEvidenceUrlsRef.current.has(targetUrl)) return;

            const sanitized = sanitizeEvidenceItem({
              ...parsed,
              url: targetUrl,
              fileUrl: targetUrl
            });
            if (sanitized) {
              let wasAdded = false;
              setDaftarBukti((prev) => {
                const isDuplicate = prev.some(item => (item.url || item.fileUrl || '').trim() === targetUrl);
                if (isDuplicate) return prev;
                wasAdded = true;
                return [...prev, sanitized];
              });
              if (wasAdded) {
                processedEvidenceUrlsRef.current.add(targetUrl);
                await handleBuktiBaruDiterima(sanitized, true);
                setToastEvidence(sanitized);
                setTimeout(() => setToastEvidence(null), 6000);
              }
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      // WAJIB: Hapus subscription agar tidak terjadi listener ganda
      console.log(`[LAPTOP] Membersihkan subscription channel mobile_sync_${activeToken}...`);
      supabase.removeChannel(channel);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeToken, isQrModalOpen, handleBuktiBaruDiterima]);

  // 2. Terapkan Auto-Save Form Lengkap (Form Inputs + Daftar Bukti) debounced 500ms
  useEffect(() => {
    if (isSubmitting) return;

    const hasAnyContent = 
      Boolean(pelapor.nama?.trim()) ||
      Boolean(pelapor.nik?.trim()) ||
      Boolean(pelapor.alamat?.trim()) ||
      Boolean(pelapor.kontak?.trim()) ||
      saksiList.some(s => Boolean(s.nama?.trim()) || Boolean(s.nik?.trim())) ||
      terlaporList.some(t => Boolean(t.nama?.trim()) || Boolean(t.nik?.trim())) ||
      Boolean(caseInfo.pidana?.trim()) ||
      Boolean(caseInfo.tindak_pidana?.trim()) ||
      Boolean(caseInfo.uraian?.trim()) ||
      Boolean(caseInfo.uraian_kejadian?.trim()) ||
      daftarBukti.length > 0;

    if (!hasAnyContent) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const sanitizedEvidence = sanitizeEvidenceList(daftarBukti);
        const draftPayload = {
          formData: {
            pelapor,
            saksiList,
            terlaporList,
            caseInfo,
            mode
          },
          daftarBukti: sanitizedEvidence,
          savedAt: new Date().toISOString()
        };

        localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftPayload));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedEvidence));
        if (nomorRegisterResmi) {
          localStorage.setItem(`draft_bb_${nomorRegisterResmi}`, JSON.stringify(sanitizedEvidence));
        }
        saveDumasDraft(draftPayload, currentUserProfile?.id);
        saveDumasDraft(draftPayload, null);

        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus('saved');
        setIsDraftRestored(true);
        console.log('[AUTO-SAVE] Data form & bukti tersimpan di', ACTIVE_DRAFT_KEY);
      } catch (err) {
        console.error('[AUTO-SAVE ERROR] Gagal menyimpan draft form:', err);
        setSaveStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pelapor, saksiList, terlaporList, caseInfo, daftarBukti, mode, currentUserProfile?.id, isSubmitting, STORAGE_KEY, nomorRegisterResmi]);

  // Handler Mulai Formulir Kosong Baru & Pembersihan Draft Secara Sadar
  const handleMulaiFormulirBaru = useCallback(() => {
    // 1. Kosongkan state di memori
    setDaftarBukti([]);
    setPelapor(defaultPelapor);
    setSaksiList(defaultSaksi);
    setTerlaporList(defaultTerlapor);
    setCaseInfo(defaultCaseInfo);
    setLastSavedTime(null);
    setSaveStatus('idle');
    setIsDraftRestored(false);
    setFormError(null);
    processedEvidenceUrlsRef.current.clear();

    // 2. Buat ID sesi baru untuk form yang bersih
    const newSessionId = `sesi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setDraftSessionId(newSessionId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('emindik_current_draft_session_id', newSessionId);
      sessionStorage.removeItem('temp_dumas_token');
    }

    // 3. Bersihkan draft di localStorage secara sadar
    try {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
      localStorage.removeItem(DRAFT_KEY_FORM);
      localStorage.removeItem('emindik_dumas_evidence_v2');
      localStorage.removeItem('emindik_draft_daftar_bb_v1');
      localStorage.removeItem('emindik_temp_draft_bb');
      localStorage.removeItem('temp_dumas_bb');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`bb_draft_${draftSessionId}`);
    } catch {}

    clearDumasDraft(currentUserProfile?.id);
    clearDumasDraft(null);
    console.log('[DUMAS] Formulir kosong baru dimulai, draft dibersihkan.');
  }, [STORAGE_KEY, draftSessionId, currentUserProfile?.id]);

  const handleInputLaporanBaru = handleMulaiFormulirBaru;
  const handleResetDraft = handleMulaiFormulirBaru;

  // Handlers Saksi
  const handleAddSaksi = () => {
    const nextNum = saksiList.length + 1;
    const role = nextNum === 1 ? 'Saksi Fakta' : nextNum === 2 ? 'Saksi Terkait' : `Saksi ${nextNum}`;
    setSaksiList([
      ...saksiList,
      {
        id: `saksi-${Date.now()}`,
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: '',
        alamat: '',
        kontak: '',
        role_label: role,
      }
    ]);
  };

  const handleRemoveSaksi = (indexToRemove) => {
    if (saksiList.length <= 1) {
      alert('Minimal terdapat 1 baris saksi.');
      return;
    }
    const updated = saksiList.filter((_, idx) => idx !== indexToRemove).map((s, idx) => ({
      ...s,
      role_label: idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`
    }));
    setSaksiList(updated);
  };

  const handleSaksiChange = (index, field, value) => {
    const updated = [...saksiList];
    updated[index][field] = value;
    setSaksiList(updated);
  };

  // Handlers Terlapor
  const handleAddTerlapor = () => {
    const nextNum = terlaporList.length + 1;
    setTerlaporList([
      ...terlaporList,
      {
        id: `terlapor-${Date.now()}`,
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: '',
        alamat: '',
        kontak: '',
        role_label: nextNum === 1 ? 'Terlapor Utama' : `Terlapor Tambahan ${nextNum - 1}`,
      }
    ]);
  };

  const handleRemoveTerlapor = (indexToRemove) => {
    if (terlaporList.length <= 1) {
      alert('Minimal terdapat 1 pihak terlapor.');
      return;
    }
    const updated = terlaporList.filter((_, idx) => idx !== indexToRemove).map((t, idx) => ({
      ...t,
      role_label: idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`
    }));
    setTerlaporList(updated);
  };

  const handleTerlaporChange = (index, field, value) => {
    const updated = [...terlaporList];
    updated[index][field] = value;
    setTerlaporList(updated);
  };

  // Handlers Upload Bukti (Laptop & QR Code HP)
  const processRawFiles = async (files) => {
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
      const mime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

      let finalUrl = '';
      try {
        const r2Res = await uploadFileToR2(file, `dumas_laptop_${Date.now()}_${file.name}`, mime);
        if (r2Res?.success && r2Res?.url) {
          finalUrl = formatR2PublicUrl(r2Res.url);
        }
      } catch (err) {
        console.warn('[R2 UPLOAD] Upload ke R2 gagal:', err);
      }

      // Fallback base64 agar data foto tetap ada dan bertahan setelah refresh localStorage
      if (!finalUrl) {
        try {
          finalUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        } catch {}
      }

      if (!finalUrl && typeof URL !== 'undefined' && URL.createObjectURL) {
        finalUrl = URL.createObjectURL(file);
      }

      if (!finalUrl) {
        console.warn('[UPLOAD] File tidak memiliki URL valid, dilewati:', file.name);
        continue;
      }

      // [DEDUP FIX] Cek processedEvidenceUrlsRef SEBELUM sanitasi & insert
      // Mencegah duplikasi saat file input trigger onchange lebih dari sekali
      const normalizedUrl = finalUrl.trim();
      if (processedEvidenceUrlsRef.current.has(normalizedUrl)) {
        console.warn('[DEDUP UPLOAD] File sudah pernah diproses, lewati duplikat:', file.name, normalizedUrl);
        continue;
      }

      const rawItem = {
        id: `bb_${Date.now()}_${i}`,
        nama_berkas: file.name,
        url: normalizedUrl,
        fileUrl: normalizedUrl,
        tipe: mime,
        ukuran: file.size,
        keterangan: isPdf ? 'Dokumen surat bukti perkara' : 'Foto barang bukti fisik (Upload Laptop Cloudflare R2)',
        uploaded_at: new Date().toISOString()
      };

      const sanitized = sanitizeEvidenceItem(rawItem, i);
      if (sanitized) {
        // Tandai URL sudah diproses sebelum memanggil handler (hindari race condition)
        processedEvidenceUrlsRef.current.add(normalizedUrl);
        await handleBuktiBaruDiterima(sanitized);
      }
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    processRawFiles(files);
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    processRawFiles(files);
  };

  const handleEvidenceFromQr = async (evidenceItem) => {
    if (!evidenceItem) return;
    const rawUrl = evidenceItem.url || evidenceItem.fileUrl;
    const resolvedUrl = formatR2PublicUrl(rawUrl).trim();
    if (resolvedUrl && processedEvidenceUrlsRef.current.has(resolvedUrl)) {
      console.warn('[DEDUP QR] Mengabaikan URL bukti QR yang sudah diproses:', resolvedUrl);
      return;
    }

    const sanitized = sanitizeEvidenceItem({
      ...evidenceItem,
      url: resolvedUrl,
      fileUrl: resolvedUrl
    });
    if (sanitized) {
      let wasAdded = false;
      setDaftarBukti((prev) => {
        const isDuplicate = prev.some(item => (item.url || item.fileUrl || '').trim() === resolvedUrl);
        if (isDuplicate) return prev;
        wasAdded = true;
        return [...prev, sanitized];
      });

      if (wasAdded) {
        if (resolvedUrl) processedEvidenceUrlsRef.current.add(resolvedUrl);
        await handleBuktiBaruDiterima(sanitized, true);
        setToastEvidence(sanitized);
        setTimeout(() => setToastEvidence(null), 6000);
      }
    }
  };

  // Penanganan Tombol Hapus Bukti
  const handleHapusBukti = (idHapus) => {
    setDaftarBukti((prev) => {
      const removed = prev.find((item, idx) => item.id === idHapus || item.url === idHapus || `evidence-${idx}` === idHapus);
      if (removed) {
        const u = (removed.url || removed.fileUrl || removed.file_url || '').trim();
        if (u) processedEvidenceUrlsRef.current.delete(u);
        if (removed.id) processedEvidenceUrlsRef.current.delete(removed.id);
      }
      const updated = prev.filter((item, idx) => item.id !== idHapus && item.url !== idHapus && `evidence-${idx}` !== idHapus);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Gagal menyimpan draft BB ke localStorage setelah hapus:", err);
      }
      return updated;
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!pelapor.nama?.trim()) {
      setFormError('Nama lengkap pelapor wajib diisi.');
      return;
    }
    if (!pelapor.nik?.trim()) {
      setFormError('NIK pelapor wajib diisi.');
      return;
    }
    if (!terlaporList[0]?.nama?.trim()) {
      setFormError('Nama pihak terlapor utama wajib diisi.');
      return;
    }
    if (!caseInfo.tindak_pidana?.trim()) {
      setFormError('Dugaan tindak pidana wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryTerlapor = terlaporList[0] || {};
      const generatedNo = generateDumasNumber(Date.now().toString().slice(-2));

      // Saring entitas saksi yang memiliki nama terisi
      const cleanedSaksiList = (saksiList || [])
        .filter((s) => s && s.nama && s.nama.trim() !== '')
        .map((s, idx) => ({
          id: s.id || `saksi-${idx + 1}-${Date.now()}`,
          nama: s.nama.trim(),
          nik: (s.nik || '').trim(),
          ttl: (s.ttl || '').trim(),
          pekerjaan: (s.pekerjaan || '').trim(),
          agama: (s.agama || 'Islam').trim(),
          alamat: (s.alamat || '').trim(),
          kontak: (s.kontak || '').trim(),
          role_label: s.role_label || (idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`),
        }));

      // Saring entitas terlapor
      const cleanedTerlaporList = (terlaporList || [])
        .filter((t) => t && t.nama && t.nama.trim() !== '')
        .map((t, idx) => ({
          id: t.id || `terlapor-${idx + 1}-${Date.now()}`,
          nama: t.nama.trim(),
          nik: (t.nik || '').trim(),
          ttl: (t.ttl || '').trim(),
          pekerjaan: (t.pekerjaan || '').trim(),
          agama: (t.agama || 'Islam').trim(),
          alamat: (t.alamat || '').trim(),
          kontak: (t.kontak || '').trim(),
          role_label: t.role_label || (idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`),
        }));

      console.log("[Dumas Form] Data saksi yang disiapkan:", cleanedSaksiList);

      const newDumasData = {
        nomor_lp: generatedNo,
        tanggal_lapor: new Date().toISOString(),
        penyidik_id: currentUserProfile?.id || 'penyidik-spkt',
        penyidik_nama: currentUserProfile?.nama || 'Penyidik Penerima SPKT',
        penyidik_nrp: currentUserProfile?.nrp || '-',
        status_berkas: 'Tahap Penyelidikan (Sp.Lidik)',
        
        pelapor_nama: pelapor.nama,
        pelapor_nik: pelapor.nik,
        pelapor_ttl: pelapor.ttl,
        pelapor_pekerjaan: pelapor.pekerjaan,
        pelapor_agama: pelapor.agama,
        pelapor_kontak: pelapor.kontak,
        pelapor_alamat: pelapor.alamat,
        
        saksi_list: cleanedSaksiList,
        saksi: cleanedSaksiList,
        terlapor_list: cleanedTerlaporList.length > 0 ? cleanedTerlaporList : terlaporList,
        terlapor: cleanedTerlaporList.length > 0 ? cleanedTerlaporList : terlaporList,

        terlapor_nama: primaryTerlapor.nama,
        terlapor_nik: primaryTerlapor.nik,
        terlapor_ttl: primaryTerlapor.ttl,
        terlapor_pekerjaan: primaryTerlapor.pekerjaan,
        terlapor_agama: primaryTerlapor.agama,
        terlapor_domisili: primaryTerlapor.alamat,
        terlapor_kontak: primaryTerlapor.kontak,
        terlapor_status: primaryTerlapor.role_label || 'Terlapor Utama',

        tindak_pidana: caseInfo.pidana || caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || '',
        dugaan_tindak_pidana: caseInfo.pidana || caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || '',
        pasal_disangkakan: caseInfo.pasal || caseInfo.pasal_disangkakan || caseInfo.dugaan_pasal || '',
        pasal: caseInfo.pasal || caseInfo.pasal_disangkakan || caseInfo.dugaan_pasal || '',
        dugaan_pasal: caseInfo.pasal || caseInfo.pasal_disangkakan || caseInfo.dugaan_pasal || '',
        tempus_delicti: caseInfo.waktu || caseInfo.tempus_delicti || caseInfo.waktu_kejadian || '',
        waktu_kejadian: caseInfo.waktu || caseInfo.tempus_delicti || caseInfo.waktu_kejadian || '',
        locus_delicti: caseInfo.tkp || caseInfo.locus_delicti || caseInfo.tempat_kejadian || '',
        tempat_kejadian: caseInfo.tkp || caseInfo.locus_delicti || caseInfo.tempat_kejadian || '',
        uraian_kejadian: caseInfo.uraian || caseInfo.uraian_kejadian || caseInfo.ringkasan_posisi_kasus || caseInfo.ringkasan_kasus || caseInfo.kronologis || '',
        barang_bukti: daftarBukti,
        lampiran_barang_bukti: daftarBukti,
      };

      const result = await onSubmitDumas(newDumasData, evidenceFiles);
      // HANYA bersihkan draf jika penyimpanan ke Supabase berhasil
      if (result && result.success !== false) {
        const finalNo = result?.record?.nomor_lp || generatedNo || nomorRegisterResmi;
        const laporanId = result?.record?.id || result?.id || null;

        // Persistensi langsung ke tabel barang_bukti dengan nomor_register resmi
        if (evidenceFiles.length > 0) {
          try {
            const bbRows = evidenceFiles.map((item) => ({
              nomor_register: finalNo,
              id_perkara: laporanId,
              nama_berkas: item.nama_berkas || item.name || item.nama_file || 'Barang Bukti',
              file_url: item.url || item.fileUrl || item.file_url,
              tipe_berkas: item.tipe || item.type || item.mime_type || 'image/jpeg',
              ukuran_berkas: item.ukuran || item.size || item.file_size_bytes || 0,
              keterangan: item.keterangan || 'Barang bukti digital',
              storage_provider: 'cloudflare_r2',
              hash_sha256: item.hash_sha256 || item.hash || null,
              created_at: new Date().toISOString()
            }));
            await supabase.from('barang_bukti').insert(bbRows);
            console.log('[PERSISTENCE] Bukti berhasil disimpan ke database untuk register:', finalNo);
          } catch (errBb) {
            console.warn('[PERSISTENCE ERROR]:', errBb);
          }
          try {
            const lampiranRows = evidenceFiles.map((item) => ({
              laporan_id: laporanId,
              nama_file: item.nama_berkas || item.name || item.nama_file || 'Barang Bukti',
              file_url: item.url || item.fileUrl || item.file_url,
              file_path: item.key || item.file_path || activeToken || '',
              kategori_bukti: (item.tipe || item.type)?.includes('pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
              file_size_bytes: item.ukuran || item.size || item.file_size_bytes || 0,
              mime_type: item.tipe || item.type || item.mime_type || 'image/jpeg',
              hash_sha256: item.hash_sha256 || item.hash || null,
              keterangan: item.keterangan || 'Lampiran bukti digital R2'
            }));
            await supabase.from('lampiran_barang_bukti').insert(lampiranRows);
          } catch {}
        }

        handleMulaiFormulirBaru();
        clearDumasDraft(currentUserProfile?.id);
        clearDumasDraft(null);
        try {
          localStorage.removeItem(ACTIVE_DRAFT_KEY);
          localStorage.removeItem(DRAFT_KEY_FORM);
          // Hapus EVIDENCE_STORAGE_KEY stabil setelah submit resmi berhasil
          localStorage.removeItem(EVIDENCE_STORAGE_KEY);
          // Hapus PERSISTENT_KEY setelah submit resmi berhasil
          localStorage.removeItem(PERSISTENT_KEY);
          sessionStorage.removeItem('emindik_dumas_subview');
        } catch {}
        setIsDraftRestored(false);
        setLastSavedTime(null);
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Error saat menyimpan dumas:', err);
      setFormError('Terjadi kesalahan sistem saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dumas-container" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#080B10' }}>
      
      {/* ======================================================= */}
      {/* FORM HEADER RIBBON */}
      {/* ======================================================= */}
      <div style={{
        height: '48px',
        padding: '0 24px',
        backgroundColor: '#121721',
        borderBottom: '1px solid #292F42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
          <span style={{ fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            FORMULIR STRUKTUR DATA PERKARA ADUAN MASYARAKAT (DUMAS)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Auto-Save Persistence */}
          {saveStatus === 'saving' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontWeight: 500
            }}>
              <Clock size={12} className="animate-spin" />
              Menyimpan draf...
            </span>
          )}
          {saveStatus === 'saved' && lastSavedTime && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 500
            }} title="Data form tersimpan otomatis di browser lokal">
              <CheckCircle2 size={12} />
              Draf tersimpan ({lastSavedTime})
            </span>
          )}

          {/* Tombol Mulai Formulir Kosong Baru di Header */}
          <button
            type="button"
            onClick={() => {
              const hasData = pelapor.nama?.trim() || terlaporList[0]?.nama?.trim() || daftarBukti.length > 0;
              if (hasData) {
                const confirmed = window.confirm(
                  'Apakah Anda yakin ingin memulai formulir kosong baru? Seluruh isian data draf dan lampiran bukti yang belum terbit nomor registrasinya akan dihapus secara permanen.'
                );
                if (!confirmed) return;
              }
              handleMulaiFormulirBaru();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#F87171',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            className="hover:bg-red-500/20"
            title="Mulai Formulir Kosong Baru (Hapus Draf)"
          >
            <RotateCcw size={12} />
            <span>Mulai Formulir Kosong Baru</span>
          </button>

          {mode === 'ocr' ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#FF352D',
              backgroundColor: 'rgba(229, 46, 46, 0.1)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(229, 46, 46, 0.3)',
              fontWeight: 600
            }}>
              <Sparkles size={12} />
              AI OCR Hasil Pindai Berkas
            </span>
          ) : (
            <span style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8',
              backgroundColor: '#1B1F2C',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #292F42',
              fontWeight: 600
            }}>
              Mode Input Manual Terstruktur (3 Kolom)
            </span>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* FORM BODY CONTAINER */}
      {/* ======================================================= */}
      <form onSubmit={handleSubmit} style={{ padding: '24px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {formError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(127, 29, 29, 0.8)',
            border: '1px solid #991B1B',
            borderRadius: '8px',
            color: '#FEE2E2',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Banner Draf Dipulihkan */}
        {isDraftRestored && !initialOcrData && (
          <div style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ color: '#E2E8F0', fontSize: '12px', fontWeight: 600 }}>
                  Draf Formulir Berhasil Dipulihkan
                </span>
                <p style={{ color: '#94A3B8', fontSize: '11px', margin: '2px 0 0 0', fontFamily: 'Inter, sans-serif' }}>
                  Data isian sebelumnya telah dimuat kembali secara otomatis dari penyimpanan lokal browser Anda.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetDraft}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#EF4444',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
              title="Hapus draf tersimpan dan mulai form kosong"
            >
              <RotateCcw size={12} />
              Reset Draf
            </button>
          </div>
        )}

        {/* Banner Konfirmasi Smart Scan Gemini OCR */}
        {(initialOcrData || mode === 'ocr') && (
          <div style={{
            padding: '14px 20px',
            backgroundColor: 'rgba(229, 46, 46, 0.08)',
            border: '1px solid rgba(229, 46, 46, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: '#CBD5E1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#FF352D" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#FF352D' }}>
                  HASIL SMART OCR RESKRIM AKTIF
                  {initialOcrFiles && initialOcrFiles.length > 1 ? ` (${initialOcrFiles.length} LEMBAR BERKAS): ` : ': '}
                </strong>
                <span>Entitas Pelapor, Saksi, Terlapor, &amp; Perkara telah diekstrak secara otomatis. Harap verifikasi keakuratan data dengan berkas fisik sebelum menyimpan.</span>
              </div>
            </div>
            <span style={{
              fontSize: '10px',
              color: '#FF6B6B',
              backgroundColor: '#151822',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(229, 46, 46, 0.4)',
              whiteSpace: 'nowrap',
              fontWeight: 700
            }}>
              TEREKSTRAKSI AI
            </span>
          </div>
        )}

        {/* ======================================================= */}
        {/* ROW 1: 3-COLUMN GRID (PELAPOR, SAKSI, TERLAPOR) */}
        {/* ======================================================= */}
        <div className="dumas-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          
          {/* ---------------------------------------------------- */}
          {/* KOLOM 01: IDENTITAS PELAPOR / KORBAN */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card" style={{
            backgroundColor: '#151822',
            border: '1px solid #292F42',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.15)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    01
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    IDENTITAS PELAPOR / KORBAN
                  </h3>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', backgroundColor: '#0B0D13', padding: '2px 8px', borderRadius: '4px', border: '1px solid #292F42' }}>
                  Pihak Pelapor
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor="dumas_nama_pelapor" className="dumas-form-label">
                    NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    id="dumas_nama_pelapor"
                    name="nama_pelapor"
                    type="text"
                    required
                    autoComplete="name"
                    value={pelapor.nama}
                    onChange={(e) => setPelapor({ ...pelapor, nama: e.target.value })}
                    placeholder="Nama lengkap beserta gelar"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="dumas_nik" className="dumas-form-label">
                    NIK (NOMOR INDUK KEPENDUDUKAN) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    id="dumas_nik"
                    name="nik_pelapor"
                    type="text"
                    required
                    maxLength={16}
                    autoComplete="off"
                    value={pelapor.nik}
                    onChange={(e) => setPelapor({ ...pelapor, nik: e.target.value })}
                    placeholder="74**************"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="dumas_ttl_pelapor" className="dumas-form-label">
                    TEMPAT, TANGGAL LAHIR
                  </label>
                  <input 
                    id="dumas_ttl_pelapor"
                    name="ttl_pelapor"
                    type="text"
                    autoComplete="off"
                    value={pelapor.ttl}
                    onChange={(e) => setPelapor({ ...pelapor, ttl: e.target.value })}
                    placeholder="Contoh: Kolaka, 19 Mei 1989"
                    className="dumas-form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label htmlFor="dumas_pekerjaan_pelapor" className="dumas-form-label">
                      PEKERJAAN
                    </label>
                    <input 
                      id="dumas_pekerjaan_pelapor"
                      name="pekerjaan_pelapor"
                      type="text"
                      autoComplete="off"
                      value={pelapor.pekerjaan}
                      onChange={(e) => setPelapor({ ...pelapor, pekerjaan: e.target.value })}
                      placeholder="Wiraswasta / PNS"
                      className="dumas-form-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="dumas_agama_pelapor" className="dumas-form-label">
                      AGAMA
                    </label>
                    <select
                      id="dumas_agama_pelapor"
                      name="agama_pelapor"
                      value={pelapor.agama}
                      onChange={(e) => setPelapor({ ...pelapor, agama: e.target.value })}
                      className="dumas-form-select"
                    >
                      <option value="">Pilih Agama</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="dumas_alamat" className="dumas-form-label">
                    ALAMAT DOMISILI KTP
                  </label>
                  <textarea 
                    id="dumas_alamat"
                    name="alamat_pelapor"
                    rows={3}
                    autoComplete="street-address"
                    value={pelapor.alamat}
                    onChange={(e) => setPelapor({ ...pelapor, alamat: e.target.value })}
                    placeholder="Alamat lengkap domisili KTP"
                    className="dumas-form-textarea"
                  />
                </div>

                <div>
                  <label htmlFor="dumas_no_kontak" className="dumas-form-label">
                    NOMOR HP / WHATSAPP
                  </label>
                  <input 
                    id="dumas_no_kontak"
                    name="kontak_pelapor"
                    type="text"
                    autoComplete="tel"
                    value={pelapor.kontak}
                    onChange={(e) => setPelapor({ ...pelapor, kontak: e.target.value })}
                    placeholder="08************"
                    className="dumas-form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* KOLOM 02: DATA SAKSI-SAKSI (ARRAY DINAMIS) */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card" style={{
            backgroundColor: '#151822',
            border: '1px solid #292F42',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.15)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    02
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    DATA SAKSI-SAKSI
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={handleAddSaksi}
                  className="dumas-btn-add"
                >
                  <Plus size={12} />
                  <span>Tambah Saksi</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                {saksiList.map((saksi, idx) => (
                  <div key={saksi.id || idx} className="dumas-subcard">
                    <div className="dumas-subcard-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF352D' }}></span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '10px', textTransform: 'uppercase' }}>
                          SAKSI {idx + 1}
                        </span>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#0B0D13', color: '#94A3B8', border: '1px solid #292F42' }}>
                          {saksi.role_label}
                        </span>
                      </div>
                      {saksiList.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveSaksi(idx)}
                          className="dumas-btn-delete-sub"
                          title="Hapus Saksi"
                        >
                          <Trash2 size={11} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label htmlFor={`dumas_saksi_nama_${idx}`} className="dumas-form-label">NAMA LENGKAP</label>
                        <input 
                          id={`dumas_saksi_nama_${idx}`}
                          name={`saksi_nama_${idx}`}
                          type="text"
                          autoComplete="name"
                          value={saksi.nama}
                          onChange={(e) => handleSaksiChange(idx, 'nama', e.target.value)}
                          placeholder="Nama lengkap saksi"
                          className="dumas-form-input"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label htmlFor={`dumas_saksi_nik_${idx}`} className="dumas-form-label">NIK</label>
                          <input 
                            id={`dumas_saksi_nik_${idx}`}
                            name={`saksi_nik_${idx}`}
                            type="text"
                            maxLength={16}
                            autoComplete="off"
                            value={saksi.nik}
                            onChange={(e) => handleSaksiChange(idx, 'nik', e.target.value)}
                            placeholder="74********"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label htmlFor={`dumas_saksi_ttl_${idx}`} className="dumas-form-label">TTL</label>
                          <input 
                            id={`dumas_saksi_ttl_${idx}`}
                            name={`saksi_ttl_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={saksi.ttl}
                            onChange={(e) => handleSaksiChange(idx, 'ttl', e.target.value)}
                            placeholder="Tempat, Tgl Lahir"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label htmlFor={`dumas_saksi_pekerjaan_${idx}`} className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            id={`dumas_saksi_pekerjaan_${idx}`}
                            name={`saksi_pekerjaan_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={saksi.pekerjaan}
                            onChange={(e) => handleSaksiChange(idx, 'pekerjaan', e.target.value)}
                            placeholder="Pekerjaan"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label htmlFor={`dumas_saksi_agama_${idx}`} className="dumas-form-label">AGAMA</label>
                          <input 
                            id={`dumas_saksi_agama_${idx}`}
                            name={`saksi_agama_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={saksi.agama}
                            onChange={(e) => handleSaksiChange(idx, 'agama', e.target.value)}
                            placeholder="Agama"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`dumas_saksi_alamat_${idx}`} className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          id={`dumas_saksi_alamat_${idx}`}
                          name={`saksi_alamat_${idx}`}
                          type="text"
                          autoComplete="street-address"
                          value={saksi.alamat}
                          onChange={(e) => handleSaksiChange(idx, 'alamat', e.target.value)}
                          placeholder="Alamat domisili KTP"
                          className="dumas-form-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`dumas_saksi_kontak_${idx}`} className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          id={`dumas_saksi_kontak_${idx}`}
                          name={`saksi_kontak_${idx}`}
                          type="text"
                          autoComplete="tel"
                          value={saksi.kontak}
                          onChange={(e) => handleSaksiChange(idx, 'kontak', e.target.value)}
                          placeholder="08********"
                          className="dumas-form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* KOLOM 03: PIHAK TERLAPOR (ARRAY DINAMIS) */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card card-terlapor" style={{
            backgroundColor: '#151822',
            border: '1px solid rgba(229, 46, 46, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.2)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    03
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    PIHAK TERLAPOR
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={handleAddTerlapor}
                  className="dumas-btn-add"
                >
                  <Plus size={12} />
                  <span>Tambah Terlapor</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                {terlaporList.map((terlapor, idx) => (
                  <div key={terlapor.id || idx} className="dumas-subcard subcard-terlapor">
                    <div className="dumas-subcard-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '10px', textTransform: 'uppercase' }}>
                          TERLAPOR {idx + 1}
                        </span>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'rgba(229, 46, 46, 0.2)', color: '#FF352D', border: '1px solid rgba(229, 46, 46, 0.4)', fontWeight: 600 }}>
                          {terlapor.role_label}
                        </span>
                      </div>
                      {terlaporList.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveTerlapor(idx)}
                          className="dumas-btn-delete-sub"
                          title="Hapus Terlapor"
                        >
                          <Trash2 size={11} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label htmlFor={`dumas_terlapor_nama_${idx}`} className="dumas-form-label">
                          NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input 
                          id={`dumas_terlapor_nama_${idx}`}
                          name={`terlapor_nama_${idx}`}
                          type="text"
                          required
                          autoComplete="name"
                          value={terlapor.nama}
                          onChange={(e) => handleTerlaporChange(idx, 'nama', e.target.value)}
                          placeholder="Nama lengkap pihak terlapor"
                          className="dumas-form-input"
                          style={{ borderColor: 'rgba(229, 46, 46, 0.5)', fontWeight: 600 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label htmlFor={`dumas_terlapor_nik_${idx}`} className="dumas-form-label">NIK</label>
                          <input 
                            id={`dumas_terlapor_nik_${idx}`}
                            name={`terlapor_nik_${idx}`}
                            type="text"
                            maxLength={16}
                            autoComplete="off"
                            value={terlapor.nik}
                            onChange={(e) => handleTerlaporChange(idx, 'nik', e.target.value)}
                            placeholder="74********"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label htmlFor={`dumas_terlapor_ttl_${idx}`} className="dumas-form-label">TTL</label>
                          <input 
                            id={`dumas_terlapor_ttl_${idx}`}
                            name={`terlapor_ttl_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={terlapor.ttl}
                            onChange={(e) => handleTerlaporChange(idx, 'ttl', e.target.value)}
                            placeholder="Tempat, Tgl Lahir"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label htmlFor={`dumas_terlapor_pekerjaan_${idx}`} className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            id={`dumas_terlapor_pekerjaan_${idx}`}
                            name={`terlapor_pekerjaan_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={terlapor.pekerjaan}
                            onChange={(e) => handleTerlaporChange(idx, 'pekerjaan', e.target.value)}
                            placeholder="Pekerjaan"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label htmlFor={`dumas_terlapor_agama_${idx}`} className="dumas-form-label">AGAMA</label>
                          <input 
                            id={`dumas_terlapor_agama_${idx}`}
                            name={`terlapor_agama_${idx}`}
                            type="text"
                            autoComplete="off"
                            value={terlapor.agama}
                            onChange={(e) => handleTerlaporChange(idx, 'agama', e.target.value)}
                            placeholder="Agama"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`dumas_terlapor_alamat_${idx}`} className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          id={`dumas_terlapor_alamat_${idx}`}
                          name={`terlapor_alamat_${idx}`}
                          type="text"
                          autoComplete="street-address"
                          value={terlapor.alamat}
                          onChange={(e) => handleTerlaporChange(idx, 'alamat', e.target.value)}
                          placeholder="Alamat domisili terlapor"
                          className="dumas-form-input"
                        />
                      </div>

                      <div>
                        <label htmlFor={`dumas_terlapor_kontak_${idx}`} className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          id={`dumas_terlapor_kontak_${idx}`}
                          name={`terlapor_kontak_${idx}`}
                          type="text"
                          autoComplete="tel"
                          value={terlapor.kontak}
                          onChange={(e) => handleTerlaporChange(idx, 'kontak', e.target.value)}
                          placeholder="08********"
                          className="dumas-form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================= */}
        {/* ROW 2: PERISTIWA & DUGAAN PASAL PIDANA (CARD 04) */}
        {/* ======================================================= */}
        <div style={{
          backgroundColor: '#151822',
          border: '1px solid #292F42',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #292F42'
          }}>
            <div className="dumas-badge-col" style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: 'rgba(229, 46, 46, 0.15)',
              color: '#FF352D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              fontSize: '11px'
            }}>
              04
            </div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
              PERISTIWA &amp; DUGAAN PASAL PIDANA
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="dumas_tindak_pidana" className="dumas-form-label">
                DUGAAN TINDAK PIDANA <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                id="dumas_tindak_pidana"
                name="tindak_pidana"
                type="text"
                required
                autoComplete="off"
                value={caseInfo.pidana || caseInfo.dugaan_tindak_pidana || caseInfo.tindak_pidana || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, pidana: e.target.value, tindak_pidana: e.target.value, dugaan_tindak_pidana: e.target.value })}
                placeholder="Contoh: Penggelapan Dana Kas / Penipuan"
                className="dumas-form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label htmlFor="dumas_pasal_disangkakan" className="dumas-form-label">
                DUGAAN PASAL YANG DISANGKAKAN
              </label>
              <input 
                id="dumas_pasal_disangkakan"
                name="pasal_disangkakan"
                type="text"
                autoComplete="off"
                value={caseInfo.pasal || caseInfo.dugaan_pasal || caseInfo.pasal_disangkakan || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, pasal: e.target.value, pasal_disangkakan: e.target.value, dugaan_pasal: e.target.value })}
                placeholder="Contoh: Pasal 372 KUHP dan/atau Pasal 378 KUHP"
                className="dumas-form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label htmlFor="dumas_waktu_kejadian" className="dumas-form-label">
                WAKTU KEJADIAN (TEMPUS DELICTI)
              </label>
              <input 
                id="dumas_waktu_kejadian"
                name="waktu_kejadian"
                type="text"
                autoComplete="off"
                value={caseInfo.waktu || caseInfo.tempus_delicti || caseInfo.waktu_kejadian || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, waktu: e.target.value, tempus_delicti: e.target.value, waktu_kejadian: e.target.value })}
                placeholder="Contoh: Senin, 14 September 2026 - Pukul 10.30 WITA"
                className="dumas-form-input"
              />
            </div>

            <div>
              <label htmlFor="dumas_tkp" className="dumas-form-label">
                TEMPAT KEJADIAN (LOCUS DELICTI)
              </label>
              <input 
                id="dumas_tkp"
                name="tkp"
                type="text"
                autoComplete="off"
                value={caseInfo.tkp || caseInfo.locus_delicti || caseInfo.tempat_kejadian || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, tkp: e.target.value, locus_delicti: e.target.value, tempat_kejadian: e.target.value })}
                placeholder="Contoh: Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
                className="dumas-form-input"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="dumas_uraian_kejadian" className="dumas-form-label">
                RINGKASAN POSISI KASUS / URAIAN SINGKAT KEJADIAN
              </label>
              <textarea 
                id="dumas_uraian_kejadian"
                name="uraian_kejadian"
                rows={4}
                autoComplete="off"
                value={caseInfo.uraian || caseInfo.uraian_kejadian || caseInfo.ringkasan_posisi_kasus || caseInfo.ringkasan_kasus || caseInfo.kronologis || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, uraian: e.target.value, uraian_kejadian: e.target.value, ringkasan_posisi_kasus: e.target.value, ringkasan_kasus: e.target.value, kronologis: e.target.value })}
                placeholder="Jelaskan secara kronologis duduk perkara aduan masyarakat..."
                className="dumas-form-textarea"
              />
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* ROW 3: UNGGAH DOKUMEN & BUKTI DIGITAL (CARD 05) */}
        {/* ======================================================= */}
        <div style={{
          backgroundColor: '#151822',
          border: '1px solid #292F42',
          borderRadius: '12px',
          padding: '22px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {/* Header Card 05 dengan Counter Badge Dinamis */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #292F42',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dumas-badge-col" style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(229, 46, 46, 0.15)',
                border: '1px solid rgba(229, 46, 46, 0.35)',
                color: '#FF352D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 800,
                fontSize: '11px'
              }}>
                05
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                  DOKUMEN &amp; BARANG BUKTI DIGITAL (PDF, JPG, PNG)
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                  Lampirkan dokumen bukti pendukung atau dokumentasi fisik yang diserahkan oleh pelapor
                </span>
              </div>
            </div>

            {/* Upload Status Indicator */}
            {evidenceFiles.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 8px #10B981',
                    display: 'inline-block'
                  }} />
                  {evidenceFiles.length} Berkas Siap Disimpan
                </span>
              </div>
            ) : (
              <span style={{
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#64748B',
                backgroundColor: '#0B0D13',
                border: '1px solid #292F42',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                0 Berkas Terlampir
              </span>
            )}
          </div>

          {/* 2 Opsi Input Berdampingan: Konsol Hardware Modern (Dual Upload Console) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            
            {/* Opsi A: Konsol Upload Komputer / Laptop */}
            <label 
              htmlFor="dumas_input_bukti_laptop" 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? '1.5px dashed #38BDF8' : '1px solid #263347',
                backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.08)' : '#141C2B',
                padding: '18px 20px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isDragOver ? '0 0 16px rgba(56, 189, 248, 0.2)' : '0 1px 4px rgba(0,0,0,0.3)',
                position: 'relative'
              }}
              className="hover:border-sky-500 hover:bg-[#182234] focus-within:ring-2 focus-within:ring-sky-500/40"
            >
              <input 
                id="dumas_input_bukti_laptop"
                name="dumas_input_bukti_laptop"
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                aria-label="Pilih Berkas dari Komputer (PDF, JPG, PNG)"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              {/* Console Header Opsi A */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38BDF8', display: 'inline-block' }} />
                  <span style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: '#38BDF8',
                    letterSpacing: '0.06em'
                  }}>
                    KONSOL INPUT A • STORAGE LOKAL
                  </span>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: '#94A3B8',
                  background: '#0B0F17',
                  border: '1px solid #263347',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  PC / LAPTOP
                </span>
              </div>

              {/* Console Body Opsi A */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38BDF8',
                  flexShrink: 0
                }}>
                  <UploadCloud size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.01em' }}>
                    Pilih Berkas dari Komputer
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Klik telusuri atau geser berkas ke area ini
                  </div>
                </div>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: '#38BDF8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  Telusuri
                </span>
              </div>

              {/* Format Footer Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#64748B' }}>Dukungan:</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#38BDF8', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '1px 5px', borderRadius: '3px' }}>PDF</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#F87171', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '1px 5px', borderRadius: '3px' }}>JPG</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#34D399', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '1px 5px', borderRadius: '3px' }}>PNG</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#64748B', marginLeft: 'auto' }}>Maks 25 MB</span>
              </div>
            </label>

            {/* Opsi B: Konsol Pindai Kamera HP (QR Code Bridge) */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setIsQrModalOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsQrModalOpen(true); }}
              style={{
                border: '1px solid #263347',
                backgroundColor: '#141C2B',
                padding: '18px 20px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                position: 'relative'
              }}
              className="hover:border-red-500 hover:bg-[#182234] focus-within:ring-2 focus-within:ring-red-500/40"
            >
              {/* Console Header Opsi B */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
                  <span style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: '#F87171',
                    letterSpacing: '0.06em'
                  }}>
                    KONSOL INPUT B • LIVE QR BRIDGE
                  </span>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: '#F59E0B',
                  background: '#0B0F17',
                  border: '1px solid #263347',
                  padding: '1px 6px',
                  borderRadius: '3px'
                }}>
                  KAMERA HP
                </span>
              </div>

              {/* Console Body Opsi B */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: 'rgba(220, 38, 38, 0.12)',
                  border: '1px solid rgba(220, 38, 38, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F87171',
                  flexShrink: 0
                }}>
                  <Smartphone size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.01em' }}>
                    Pindai Bukti via Kamera HP
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Buka kamera ponsel &amp; sinkron nirkabel
                  </div>
                </div>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: '#F87171',
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  Buka QR
                </span>
              </div>

              {/* Status Info Opsi B */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #1E293B', fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                  Live Sync R2 Aktif
                </span>
                <span style={{ color: '#94A3B8' }}>
                  Channel: {activeToken ? activeToken.slice(0, 18) + '...' : 'Stand-by'}
                </span>
              </div>
            </div>
          </div>

          {/* Notifikasi Toast Visual saat Berkas Bukti R2 Diterima secara Live dari HP */}
          {toastEvidence && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)',
              border: '1.5px solid #10B981',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#34D399', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓ FOTO BARANG BUKTI R2 DITERIMA LIVE DARI PONSEL</span>
                    <span style={{ fontSize: '9px', backgroundColor: '#10B981', color: '#000', padding: '1px 6px', borderRadius: '3px', fontWeight: 800 }}>LIVE SYNC</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px' }}>
                    Berkas <strong style={{ color: '#FFFFFF' }}>{toastEvidence.nama_berkas || toastEvidence.name}</strong> ({toastEvidence.file_size_formatted || `${((toastEvidence.ukuran || toastEvidence.size || 0)/1024).toFixed(0)} KB`}) otomatis terlampir di Bagian 05 tanpa refresh.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToastEvidence(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                className="hover:text-white"
                title="Tutup notifikasi"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* LANGKAH 3: TAMPILAN DEFENSIVE RENDERING PADA DAFTAR BUKTI DIGITAL */}
          <EvidenceErrorBoundary onReset={() => setDaftarBukti([])}>
            {Array.isArray(daftarBukti) && daftarBukti.length > 0 ? (
              <div className="space-y-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Daftar Lampiran Bukti yang Akan Disimpan ({daftarBukti.filter(f => f && f.url).length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        'Apakah Anda yakin ingin mengosongkan berkas bukti dan mereset form draf ini?'
                      );
                      if (!confirmed) return;
                      handleMulaiFormulirBaru();
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      transition: 'all 0.15s'
                    }}
                    className="hover:bg-red-500/20"
                    title="Kosongkan daftar berkas bukti dan bersihkan cache penyimpanan lokal"
                  >
                    Kosongkan Bukti / Reset Form
                  </button>
                </div>

                {daftarBukti.map((bukti, index) => {
                  if (!bukti || !bukti.url) return null;
                  return (
                    <div 
                      key={bukti.id || `evidence-${index}`}
                      className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col gap-3 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-red-400 uppercase tracking-wide">
                          {bukti.tipe?.includes('pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {Math.round((bukti.ukuran || 0) / 1024)} KB
                        </span>
                      </div>

                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {bukti.nama_berkas}
                      </div>

                      {/* Pratinjau Gambar R2 */}
                      <div 
                        className="relative w-full h-52 bg-black/80 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center cursor-pointer"
                        onClick={() => setPreviewEvidence(bukti)}
                        title="Klik untuk memperbesar pratinjau"
                      >
                        <img
                          src={bukti.url}
                          alt={bukti.nama_berkas}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center text-zinc-500 text-xs gap-1">
                          <span>⚠️ Gagal memuat pratinjau gambar</span>
                          <a href={bukti.url} target="_blank" rel="noreferrer" className="text-red-400 underline" onClick={(e) => e.stopPropagation()}>
                            Buka tautan langsung R2
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                        <span>{bukti.keterangan}</span>
                        <button
                          type="button"
                          onClick={() => setDaftarBukti(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-300 font-medium transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                Belum ada barang bukti yang diunggah. Silakan pindai QR dengan HP atau unggah dari laptop.
              </div>
            )}
          </EvidenceErrorBoundary>
        </div>

        {/* ======================================================= */}
        {/* STICKY ACTION FOOTER BAR */}
        {/* ======================================================= */}
        <div className="dumas-sticky-footer" style={{
          position: 'sticky',
          bottom: 0,
          background: 'rgba(14, 17, 24, 0.96)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #292F42',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
          borderRadius: '12px',
          marginTop: '16px'
        }}>
          <button 
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#CBD5E1',
              backgroundColor: '#1B1F2C',
              border: '1px solid #292F42',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Pilihan Mode</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleResetDraft}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#F87171',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Hapus draf lokal dan kosongkan formulir"
            >
              <RotateCcw size={13} />
              <span>Reset Form / Buat Baru</span>
            </button>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="dumas-btn-submit"
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <span>Menerbitkan Nomor Dumas...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Simpan &amp; Lanjutkan Ambil Register</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>

      {/* Modal Sinkronisasi QR Code HP */}
      {/* PENTING: setDaftarBukti TIDAK diteruskan ke modal — agar tidak terjadi double dispatch.
          Semua penerimaan bukti dari HP harus melalui onEvidenceReceived → handleEvidenceFromQr
          yang sudah memiliki guard deduplication via processedEvidenceUrlsRef */}
      <EvidenceQrSyncModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onEvidenceReceived={handleEvidenceFromQr}
        activeToken={activeToken}
        syncToken={activeToken}
        onTokenChange={handleTokenChange}
        dumasNo={caseInfo?.nomor_lp || 'DUMAS-BARU'}
      />

      {/* Modal Lightbox Preview Resolusi Penuh */}
      <EvidenceLightboxModal
        isOpen={Boolean(previewEvidence)}
        evidence={previewEvidence}
        onClose={() => setPreviewEvidence(null)}
      />
    </div>
  );
}

export { DumasFormView };

