import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { 
  generateDumasNumber, 
  loadDumasDraft, 
  saveDumasDraft, 
  clearDumasDraft 
} from '../../services/dumasService';
import EvidenceQrSyncModal from './EvidenceQrSyncModal.jsx';
import EvidenceLightboxModal from './EvidenceLightboxModal.jsx';
import { supabase } from '../../supabaseClient';

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

export default function DumasFormView({
  mode = 'manual', // 'manual' | 'ocr'
  _initialOcrFile = null,
  _initialOcrFiles = null,
  initialOcrData = null,
  onBack,
  onSubmitDumas,
  currentUserProfile
}) {
  // 0. Safe Hydration Draf Tersimpan dari LocalStorage
  const [savedDraft] = useState(() => {
    // Jika ada data OCR baru yang dipassing dari modal, utamakan data OCR baru
    if (initialOcrData) return null;
    return loadDumasDraft(currentUserProfile?.id);
  });

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

  // State 05: Lampiran Barang Bukti (Pemisahan: scan OCR awal murni hanya untuk ekstraksi form, BUKAN barang bukti)
  const [evidenceFiles, setEvidenceFiles] = useState(() => {
    if (savedDraft?.evidenceFiles && Array.isArray(savedDraft.evidenceFiles) && savedDraft.evidenceFiles.length > 0) {
      return savedDraft.evidenceFiles;
    }
    return [];
  });
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Token Sesi Sinkronisasi Kamera HP (Stand-by Listener Bagian 05)
  const [mobileSyncToken, setMobileSyncToken] = useState(() => 
    `POLRES-KOLTIM-BB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  );

  // Stand-by Realtime Listener di Channel mobile_sync_${mobileSyncToken}
  useEffect(() => {
    if (!mobileSyncToken) return;

    const handleIncomingEvidence = (payload) => {
      if (!payload) return;
      if (payload.token && payload.token !== mobileSyncToken) return;

      const fileUrl = payload.fileUrl || payload.file_url || payload.previewUrl;
      const fileName = payload.fileName || payload.name || payload.nama_file || 'Foto_Bukti_HP.jpg';
      const fileSize = payload.fileSize || payload.size || 0;
      const mimeType = payload.type || payload.mime_type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

      const newEvidence = {
        id: `bb-r2-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: fileName,
        nama_file: fileName,
        size: fileSize,
        file_size_formatted: payload.file_size_formatted || `${(fileSize / 1024).toFixed(0)} KB`,
        type: mimeType,
        mime_type: mimeType,
        kategori_bukti: isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
        fileUrl: fileUrl,
        file_url: fileUrl,
        previewUrl: fileUrl,
        key: payload.key,
        keterangan: payload.keterangan || 'Foto barang bukti fisik diambil via pemindaian HP (Cloudflare R2)',
        hash_sha256: payload.hash_sha256 || Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...',
        diunggah_pada: payload.timestamp || new Date().toISOString()
      };

      setEvidenceFiles(prev => {
        // Cegah duplikasi jika bukti dengan URL atau key yang sama sudah ada
        if (prev.some(item => (item.fileUrl && item.fileUrl === fileUrl) || (payload.key && item.key === payload.key))) {
          return prev;
        }
        return [...prev, newEvidence];
      });
    };

    console.log(`[DUMAS REALTIME] Stand-by di channel mobile_sync_${mobileSyncToken}...`);
    const channel = supabase.channel(`mobile_sync_${mobileSyncToken}`, {
      config: { broadcast: { ack: true } }
    });

    channel
      .on('broadcast', { event: 'evidence_uploaded' }, ({ payload }) => {
        console.log('[DUMAS REALTIME] Bukti diterima dari HP:', payload);
        handleIncomingEvidence(payload);
      })
      .subscribe((status) => {
        console.log(`[DUMAS REALTIME] Status channel ${mobileSyncToken}:`, status);
      });

    // Cross-tab broadcast & localStorage fallback untuk uji coba di laptop
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('polres_mobile_bridge');
        bc.onmessage = (event) => {
          handleIncomingEvidence(event.data);
        };
      } catch (_e) {}
    }

    const handleStorage = (e) => {
      if (e.key === `polres_mobile_evidence_${mobileSyncToken}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingEvidence(parsed);
        } catch (_err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      supabase.removeChannel(channel);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [mobileSyncToken]);

  // Auto-Save Draft Sinkronisasi Otomatis dengan Debouncing (400ms)
  useEffect(() => {
    if (isSubmitting) return;

    const hasAnyContent = 
      Boolean(pelapor.nama?.trim()) ||
      Boolean(pelapor.nik?.trim()) ||
      Boolean(pelapor.alamat?.trim()) ||
      Boolean(pelapor.kontak?.trim()) ||
      saksiList.some(s => Boolean(s.nama?.trim()) || Boolean(s.nik?.trim())) ||
      terlaporList.some(t => Boolean(t.nama?.trim()) || Boolean(t.nik?.trim())) ||
      Boolean(caseInfo.tindak_pidana?.trim()) ||
      Boolean(caseInfo.uraian_kejadian?.trim()) ||
      evidenceFiles.length > 0;

    if (!hasAnyContent) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const sanitizedEvidence = (evidenceFiles || []).map(f => ({
          id: f.id,
          name: f.name || f.nama_file || 'Berkas',
          nama_file: f.nama_file || f.name || 'Berkas',
          size: f.size || 0,
          type: f.type || 'application/pdf',
          mime_type: f.mime_type || f.type || 'application/pdf',
          kategori_bukti: f.kategori_bukti || 'DOKUMEN_PDF',
          file_size_formatted: f.file_size_formatted || '0 KB',
          keterangan: f.keterangan || '',
          hash_sha256: f.hash_sha256 || '',
          file_url: f.file_url || ''
        }));

        const draftPayload = {
          mode,
          pelapor,
          saksiList,
          terlaporList,
          caseInfo,
          evidenceFiles: sanitizedEvidence,
          savedAt: new Date().toISOString(),
        };

        saveDumasDraft(draftPayload, currentUserProfile?.id);
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus('saved');
      } catch (err) {
        console.warn('Gagal menyimpan auto-save draf dumas:', err);
        setSaveStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pelapor, saksiList, terlaporList, caseInfo, evidenceFiles, mode, currentUserProfile?.id, isSubmitting]);

  // Handler Reset Draf Manual
  const handleResetDraft = () => {
    const confirmReset = window.confirm(
      'Apakah Anda yakin ingin mengosongkan seluruh formulir dan menghapus draf tersimpan? Seluruh isian data yang belum disubmit akan hilang.'
    );
    if (!confirmReset) return;

    clearDumasDraft(currentUserProfile?.id);
    setPelapor(defaultPelapor);
    setSaksiList(defaultSaksi);
    setTerlaporList(defaultTerlapor);
    setCaseInfo(defaultCaseInfo);
    setEvidenceFiles([]);
    setLastSavedTime(null);
    setSaveStatus('idle');
    setIsDraftRestored(false);
    setFormError(null);
  };

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
  const processRawFiles = (files) => {
    if (!files || !files.length) return;

    const newEvidence = files.map(file => {
      const isPdf = file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
      const category = isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG';
      const mime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
      
      return {
        id: `bb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        nama_file: file.name,
        size: file.size,
        type: mime,
        mime_type: mime,
        kategori_bukti: category,
        file_size_formatted: `${(file.size / 1024).toFixed(0)} KB`,
        previewUrl: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '',
        file: file,
        rawFile: file,
        keterangan: isPdf ? 'Dokumen surat bukti perkara' : 'Dokumentasi objek fisik barang bukti',
        hash_sha256: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...',
        diunggah_pada: new Date().toISOString()
      };
    });

    setEvidenceFiles(prev => [...prev, ...newEvidence]);
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

  const handleEvidenceFromQr = (evidenceItem) => {
    if (!evidenceItem) return;
    setEvidenceFiles(prev => {
      if (prev.some(item => (item.fileUrl && item.fileUrl === evidenceItem.fileUrl) || (evidenceItem.key && item.key === evidenceItem.key))) {
        return prev;
      }
      return [...prev, evidenceItem];
    });
  };

  const handleRemoveEvidence = (idToRemove) => {
    setEvidenceFiles(prev => prev.filter(f => f.id !== idToRemove));
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
      };

      const result = await onSubmitDumas(newDumasData, evidenceFiles);
      // HANYA bersihkan draf jika penyimpanan ke Supabase berhasil
      if (result && result.success !== false) {
        clearDumasDraft(currentUserProfile?.id);
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
                  <label htmlFor="nama_pelapor" className="dumas-form-label">
                    NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    id="nama_pelapor"
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
                  <label htmlFor="nik_pelapor" className="dumas-form-label">
                    NIK (NOMOR INDUK KEPENDUDUKAN) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    id="nik_pelapor"
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
                  <label htmlFor="ttl_pelapor" className="dumas-form-label">
                    TEMPAT, TANGGAL LAHIR
                  </label>
                  <input 
                    id="ttl_pelapor"
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
                    <label htmlFor="pekerjaan_pelapor" className="dumas-form-label">
                      PEKERJAAN
                    </label>
                    <input 
                      id="pekerjaan_pelapor"
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
                    <label htmlFor="agama_pelapor" className="dumas-form-label">
                      AGAMA
                    </label>
                    <select
                      id="agama_pelapor"
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
                  <label htmlFor="alamat_pelapor" className="dumas-form-label">
                    ALAMAT DOMISILI KTP
                  </label>
                  <input 
                    id="alamat_pelapor"
                    name="alamat_pelapor"
                    type="text"
                    autoComplete="street-address"
                    value={pelapor.alamat}
                    onChange={(e) => setPelapor({ ...pelapor, alamat: e.target.value })}
                    placeholder="Alamat lengkap domisili KTP"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="kontak_pelapor" className="dumas-form-label">
                    NOMOR HP / WHATSAPP
                  </label>
                  <input 
                    id="kontak_pelapor"
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
                        <label htmlFor={`saksi_nama_${idx}`} className="dumas-form-label">NAMA LENGKAP</label>
                        <input 
                          id={`saksi_nama_${idx}`}
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
                          <label htmlFor={`saksi_nik_${idx}`} className="dumas-form-label">NIK</label>
                          <input 
                            id={`saksi_nik_${idx}`}
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
                          <label htmlFor={`saksi_ttl_${idx}`} className="dumas-form-label">TTL</label>
                          <input 
                            id={`saksi_ttl_${idx}`}
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
                          <label htmlFor={`saksi_pekerjaan_${idx}`} className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            id={`saksi_pekerjaan_${idx}`}
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
                          <label htmlFor={`saksi_agama_${idx}`} className="dumas-form-label">AGAMA</label>
                          <input 
                            id={`saksi_agama_${idx}`}
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
                        <label htmlFor={`saksi_alamat_${idx}`} className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          id={`saksi_alamat_${idx}`}
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
                        <label htmlFor={`saksi_kontak_${idx}`} className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          id={`saksi_kontak_${idx}`}
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
                        <label htmlFor={`terlapor_nama_${idx}`} className="dumas-form-label">
                          NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input 
                          id={`terlapor_nama_${idx}`}
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
                          <label htmlFor={`terlapor_nik_${idx}`} className="dumas-form-label">NIK</label>
                          <input 
                            id={`terlapor_nik_${idx}`}
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
                          <label htmlFor={`terlapor_ttl_${idx}`} className="dumas-form-label">TTL</label>
                          <input 
                            id={`terlapor_ttl_${idx}`}
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
                          <label htmlFor={`terlapor_pekerjaan_${idx}`} className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            id={`terlapor_pekerjaan_${idx}`}
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
                          <label htmlFor={`terlapor_agama_${idx}`} className="dumas-form-label">AGAMA</label>
                          <input 
                            id={`terlapor_agama_${idx}`}
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
                        <label htmlFor={`terlapor_alamat_${idx}`} className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          id={`terlapor_alamat_${idx}`}
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
                        <label htmlFor={`terlapor_kontak_${idx}`} className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          id={`terlapor_kontak_${idx}`}
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
              <label htmlFor="tindak_pidana" className="dumas-form-label">
                DUGAAN TINDAK PIDANA <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                id="tindak_pidana"
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
              <label htmlFor="pasal_disangkakan" className="dumas-form-label">
                DUGAAN PASAL YANG DISANGKAKAN
              </label>
              <input 
                id="pasal_disangkakan"
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
              <label htmlFor="tempus_delicti" className="dumas-form-label">
                WAKTU KEJADIAN (TEMPUS DELICTI)
              </label>
              <input 
                id="tempus_delicti"
                name="tempus_delicti"
                type="text"
                autoComplete="off"
                value={caseInfo.waktu || caseInfo.tempus_delicti || caseInfo.waktu_kejadian || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, waktu: e.target.value, tempus_delicti: e.target.value, waktu_kejadian: e.target.value })}
                placeholder="Contoh: Senin, 14 September 2026 - Pukul 10.30 WITA"
                className="dumas-form-input"
              />
            </div>

            <div>
              <label htmlFor="locus_delicti" className="dumas-form-label">
                TEMPAT KEJADIAN (LOCUS DELICTI)
              </label>
              <input 
                id="locus_delicti"
                name="locus_delicti"
                type="text"
                autoComplete="off"
                value={caseInfo.tkp || caseInfo.locus_delicti || caseInfo.tempat_kejadian || ''}
                onChange={(e) => setCaseInfo({ ...caseInfo, tkp: e.target.value, locus_delicti: e.target.value, tempat_kejadian: e.target.value })}
                placeholder="Contoh: Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
                className="dumas-form-input"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="uraian_kejadian" className="dumas-form-label">
                RINGKASAN POSISI KASUS / URAIAN SINGKAT KEJADIAN
              </label>
              <textarea 
                id="uraian_kejadian"
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
              htmlFor="upload_bukti_komputer" 
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
                id="upload_bukti_komputer"
                name="upload_bukti_komputer"
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
                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  Rotasi Token 30s
                </span>
                <span style={{ color: '#94A3B8' }}>
                  Enkripsi Sesi Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Kartu Daftar Barang Bukti Terpilih (Card-Grid Responsif) */}
          {evidenceFiles.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Daftar Lampiran Bukti yang Akan Disimpan ({evidenceFiles.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setEvidenceFiles([])}
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
                >
                  Kosongkan Semua
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px'
              }}>
                {evidenceFiles.map((file, idx) => {
                  const isPdf = file.kategori_bukti === 'DOKUMEN_PDF' || file.name?.toLowerCase().endsWith('.pdf');
                  return (
                    <div 
                      key={file.id || idx} 
                      style={{
                        backgroundColor: '#0B0D13',
                        border: '1px solid #292F42',
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                      className="hover:border-sky-500/50"
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {/* Thumbnail / Icon */}
                        <div 
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewEvidence(file)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPreviewEvidence(file); }}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            backgroundColor: isPdf ? 'rgba(56, 189, 248, 0.15)' : '#1E293B',
                            border: '1px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Klik untuk melihat preview resolusi penuh"
                        >
                          {!isPdf && (file.previewUrl || file.fileUrl || file.file_url) ? (
                            <img 
                              src={file.previewUrl || file.fileUrl || file.file_url} 
                              alt={file.name || file.nama_file || 'Barang Bukti'} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            isPdf ? <FileText size={22} color="#38BDF8" /> : <ImageIcon size={22} color="#F87171" />
                          )}
                        </div>

                        {/* File Details */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p 
                            style={{ 
                              fontSize: '12px', 
                              fontFamily: 'JetBrains Mono, monospace', 
                              fontWeight: 700, 
                              color: '#FFFFFF', 
                              margin: 0, 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }} 
                            title={file.name || file.nama_file}
                          >
                            {file.name || file.nama_file}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ 
                              fontSize: '9px', 
                              fontFamily: 'JetBrains Mono, monospace', 
                              fontWeight: 700,
                              color: isPdf ? '#38BDF8' : '#F87171',
                              backgroundColor: isPdf ? 'rgba(56, 189, 248, 0.1)' : 'rgba(229, 46, 46, 0.15)',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              {isPdf ? 'PDF' : 'JPG/PNG'}
                            </span>
                            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                              {file.file_size_formatted || `${((file.size || 0)/1024).toFixed(0)} KB`}
                            </span>
                          </div>
                          {file.keterangan && (
                            <p style={{ fontSize: '10px', color: '#94A3B8', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {file.keterangan}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewEvidence(file)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38BDF8',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono, monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                          className="hover:bg-sky-500/10"
                        >
                          <Eye size={12} />
                          <span>Perbesar</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => handleRemoveEvidence(file.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#F87171',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontFamily: 'JetBrains Mono, monospace',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover:bg-red-500/20"
                          title="Batalkan / Hapus Item Bukti"
                        >
                          <Trash2 size={12} />
                          <span>Batalkan</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#0B0D13',
              borderRadius: '10px',
              border: '1px dashed #292F42',
              color: '#64748B',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <FileText size={20} color="#475569" />
              <span>Belum ada berkas barang bukti yang dilampirkan.</span>
              <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'Inter, sans-serif' }}>
                Pilih opsi di atas jika pelapor menyerahkan barang bukti fisik atau dokumen pendukung.
              </span>
            </div>
          )}
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
              <span>Reset Draf</span>
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
      <EvidenceQrSyncModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onEvidenceReceived={handleEvidenceFromQr}
        syncToken={mobileSyncToken}
        onTokenChange={setMobileSyncToken}
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
