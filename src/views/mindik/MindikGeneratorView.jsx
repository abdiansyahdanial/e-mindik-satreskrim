import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSignature, 
  FileText, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Download, 
  Save, 
  RefreshCw, 
  Calendar, 
  User, 
  Users,
  Shield, 
  ChevronRight, 
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Eye,
  X
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import OfficialDocPreview from '../../components/OfficialDocPreview';
import { checkPrerequisite } from './mindikPrerequisites';
import { 
  generateAndDownloadDocx, 
  formatTanggalIndonesia,
  formatPangkatLengkap,
  normalizeSubjectRecord,
  populateSubjectPrefixVariables,
  buildUniversalCaseContext,
  resolveChainedMindikContext,
  mergeChainedWithForm,
  normalizeTemplateCode,
  extractArchivedDocNumberAndDate
} from '../../services/mindikGenerator';
import { 
  MINDIK_PRESETS, 
  MINDIK_CATEGORY_TABS, 
  MINDIK_CODE_TO_CATEGORY 
} from '../../constants/mindikPresets';
import {
  toCanonicalMindikCode,
  isValidOfficialDocNumber,
  resolveLatestArchiveDoc
} from '../../constants/mindikChainRegistry';
import { toIsoDateString } from '../../services/mindikGenerator';

export default function MindikGeneratorView({
  cases = [],
  personnel = [],
  userRole = 'anggota',
  initialCase = null,
  initialTemplate = null,
  initialSuspectId = null,
  onSaveDocument,
  onOpenTemplateStudio,
  templates = []
}) {
  const isSuperAdmin = userRole === 'super_admin';

  // --- STATE PERKARA (KASUS BERBASIS LP) ---
  const [selectedCaseId, setSelectedCaseId] = useState(
    initialCase ? initialCase.id : (cases[0]?.id || '')
  );
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [activeCaseDocs, setActiveCaseDocs] = useState([]);
  const [caseSuspects, setCaseSuspects] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(initialSuspectId || '');
  const [selectedSubjectCategory, setSelectedSubjectCategory] = useState('ALL');
  const [selectedTargetSubjectKeys, setSelectedTargetSubjectKeys] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Ambil data perkara aktif
  const currentCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || cases[0] || null;
  }, [cases, selectedCaseId]);
  const selectedCase = currentCase;

  // --- STATE TEMPLATE MINDIK ---
  const [allTemplates, setAllTemplates] = useState(Array.isArray(templates) && templates.length > 0 ? templates : []);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? (initialTemplate.code || initialTemplate.template_code) : 'SPRIN_SIDIK'
  );
  const [templateFilter, setTemplateFilter] = useState('ALL'); // 'ALL' | 'UTAMA' | 'TERBUKA' | 'TERKUNCI'
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // --- STATE FORM GENERATOR ---
  const [formValues, setFormValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Refs anti race-condition & deduplikasi pemanggilan buildUniversalCaseContext
  const caseFetchSeqRef = useRef(0);
  const docsLoadedCaseIdRef = useRef('');
  const lastTemplateKeyRef = useRef('');
  const chainedContextCacheRef = useRef({ key: '', scalar: null });

  // 1. Muat Template dari Supabase `document_templates`
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setAllTemplates(data);
      } else if (Array.isArray(templates) && templates.length > 0) {
        setAllTemplates(templates);
      }
    } catch (err) {
      console.error('[MindikGeneratorView] Gagal mengambil template:', err);
      if (Array.isArray(templates) && templates.length > 0) {
        setAllTemplates(templates);
      }
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 2. ISOLASI TOTAL BERBASIS LP:
  // Setiap selectedCaseId / currentCase berganti:
  // - Reset seluruh state terkait perkara sebelumnya secara sinkron (anti stale state)
  // - Batalkan hasil async perkara lama menggunakan caseFetchSeqRef
  // - Muat arsip dokumen perkara murni dari tabel resmi Supabase `public.documents`
  // - Muat tersangka perkara
  useEffect(() => {
    const fetchSeq = ++caseFetchSeqRef.current;
    docsLoadedCaseIdRef.current = '';
    chainedContextCacheRef.current = { key: '', scalar: null };

    // Reset sinkron agar state perkara lama tidak pernah bocor ke perkara baru
    setActiveCaseDocs([]);
    setCaseSuspects([]);
    setSelectedSuspectId('');
    setSelectedTargetSubjectKeys([]);
    setIsSaved(false);
    setFeedbackNotice(null);

    if (!currentCase) {
      setFormValues({});
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Reset Form Values dengan tanggal ISO hari ini & nomor LP aktif
    setFormValues({
      TANGGAL_SURAT: todayStr,
      tanggal_surat: todayStr,
      DOC_DATE: todayStr,
      doc_date: todayStr,
      NOMOR_LP: currentCase.nomor_lp || currentCase.no_lp || '',
      nomor_lp: currentCase.nomor_lp || currentCase.no_lp || '',
      TANGGAL_LP: currentCase.tanggal_lp || currentCase.sprin_date || todayStr,
      tanggal_lp: currentCase.tanggal_lp || currentCase.sprin_date || todayStr,
      KASAT_NAMA: currentCase.kasat_nama || '',
      KASAT_PANGKAT: formatPangkatLengkap(currentCase.kasat_pangkat || ''),
      KASAT_NRP: currentCase.kasat_nrp || '',
      KASAT_JABATAN: currentCase.kasat_jabatan || 'Kasat Reskrim',
      ATASAN_NAMA: currentCase.kasat_nama || '',
      ATASAN_PANGKAT: formatPangkatLengkap(currentCase.kasat_pangkat || ''),
      ATASAN_NRP: currentCase.kasat_nrp || '',
      ATASAN_JABATAN: currentCase.kasat_jabatan || 'Kasat Reskrim',
      PENYIDIK_NAMA: currentCase.penyidik_1_nama || '',
      PENYIDIK_PANGKAT: formatPangkatLengkap(currentCase.penyidik_1_pangkat || ''),
      PENYIDIK_NRP: currentCase.penyidik_1_nrp || '',
      PENYIDIK_JABATAN: currentCase.penyidik_1_jabatan || '',
      NO_SPRIN_SIDIK: currentCase.no_sprin_sidik || '',
      TGL_SPRIN_SIDIK: currentCase.tgl_sprin_sidik || '',
      NO_SPRIN_GAS_SIDIK: currentCase.no_sp_gas_sidik || currentCase.no_sprin_gas_sidik || currentCase.references?.no_spgas_sidik || '',
      TGL_SPRIN_GAS_SIDIK: currentCase.tgl_sp_gas_sidik || currentCase.tgl_sprin_gas_sidik || currentCase.references?.tgl_spgas_sidik || '',
      MASA_BERLAKU: todayStr,
    });

    // Muat Arsip Dokumen murni dari tabel resmi public.documents (diurutkan created_at ASC)
    const fetchActiveCaseDocs = async (caseId) => {
      if (!caseId) {
        if (caseFetchSeqRef.current === fetchSeq) setActiveCaseDocs([]);
        return;
      }
      setIsLoadingDocs(true);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('case_id', String(caseId).trim())
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (caseFetchSeqRef.current !== fetchSeq) return;

        const normalizedDocs = (Array.isArray(data) ? data : []).map((doc) => {
          const rawCode = doc.template_code || doc.code || '';
          const rawTitle = doc.doc_title || doc.title || '';
          const canonicalCode = toCanonicalMindikCode(rawCode, rawTitle);
          const { docNo, rawDocDate, formattedDocDate } = extractArchivedDocNumberAndDate(doc);
          const isoTgl = toIsoDateString(rawDocDate) || rawDocDate || '';
          return {
            ...doc,
            template_code: canonicalCode,
            canonical_code: canonicalCode,
            original_template_code: rawCode,
            doc_number: docNo,
            tgl_surat: isoTgl || doc.created_at,
            formatted_date: formattedDocDate
          };
        });

        docsLoadedCaseIdRef.current = String(caseId).trim();
        setActiveCaseDocs(normalizedDocs);
      } catch (err) {
        if (caseFetchSeqRef.current === fetchSeq) {
          console.warn('[MindikGeneratorView] Gagal memuat arsip dokumen:', err?.message || err);
          docsLoadedCaseIdRef.current = String(caseId).trim();
          setActiveCaseDocs([]);
        }
      } finally {
        if (caseFetchSeqRef.current === fetchSeq) {
          setIsLoadingDocs(false);
        }
      }
    };

    fetchActiveCaseDocs(currentCase?.id);

    // Muat Tersangka Perkara
    const loadCaseSuspects = async () => {
      try {
        if (!currentCase.id) return;
        const { data, error } = await supabase
          .from('case_suspects')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (caseFetchSeqRef.current !== fetchSeq) return;
        const list = data || [];
        setCaseSuspects(list);
        setSelectedSuspectId(list.length > 0 ? list[0].id : '');
      } catch (err) {
        if (caseFetchSeqRef.current === fetchSeq) {
          console.warn('[MindikGeneratorView] Gagal memuat daftar tersangka:', err);
        }
      }
    };

    loadCaseSuspects();
  }, [selectedCaseId, currentCase?.id]);

  // Suspect yang aktif dipilih
  const activeSuspect = useMemo(() => {
    return caseSuspects.find(s => s.id === selectedSuspectId) || caseSuspects[0] || null;
  }, [caseSuspects, selectedSuspectId]);

  // --- KATALOG SUBJEK HUKUM UNIVERSAL (4 KATEGORI: PELAPOR, SAKSI, TERLAPOR, TERSANGKA) ---
  const allCaseSubjects = useMemo(() => {
    if (!currentCase) {
      return { pelapor: [], saksi: [], terlapor: [], tersangka: [], all: [] };
    }
    const refs = currentCase.references || {};
    const dedupe = (list, catKey, catLabel) => {
      const seen = new Set();
      const result = [];
      (Array.isArray(list) ? list : []).forEach((item, idx) => {
        if (!item || !item.nama) return;
        const norm = normalizeSubjectRecord(item, idx, catLabel);
        if (!norm || !norm.nama) return;
        const sig = `${norm.nama.toLowerCase()}|${(norm.nik || '').toLowerCase()}`;
        if (seen.has(sig)) return;
        seen.add(sig);
        result.push({
          ...norm,
          _uid: `${catKey}:${item.id || idx}:${norm.nama}`,
          _category: catKey,
          _categoryLabel: catLabel
        });
      });
      return result;
    };

    // 1. Pelapor / Korban
    const rawPelapor = [
      ...(Array.isArray(currentCase.pelapor_list) ? currentCase.pelapor_list : []),
      ...(Array.isArray(refs.pelapor_list) ? refs.pelapor_list : []),
      ...(Array.isArray(currentCase.victims) ? currentCase.victims : []),
      ...(Array.isArray(refs.victims) ? refs.victims : [])
    ];
    if (rawPelapor.length === 0 && (currentCase.nama_pelapor || currentCase.pelapor_name || currentCase.pelapor)) {
      rawPelapor.push({
        nama: currentCase.nama_pelapor || currentCase.pelapor_name || currentCase.pelapor,
        alamat: currentCase.locus || ''
      });
    }

    // 2. Saksi
    const rawSaksi = [
      ...(Array.isArray(currentCase.saksi_list) ? currentCase.saksi_list : []),
      ...(Array.isArray(refs.saksi_list) ? refs.saksi_list : []),
      ...(Array.isArray(currentCase.saksi) ? currentCase.saksi : []),
      ...caseSuspects.filter(s => s && s.status === 'saksi')
    ];

    // 3. Terlapor (Calon Tersangka)
    const rawTerlapor = [
      ...caseSuspects.filter(s => s && s.status === 'terlapor'),
      ...(Array.isArray(currentCase.terlapor_list) ? currentCase.terlapor_list : []),
      ...(Array.isArray(refs.terlapor_list) ? refs.terlapor_list : [])
    ];
    if (rawTerlapor.length === 0 && (currentCase.nama_terlapor || currentCase.terlapor_name)) {
      rawTerlapor.push({
        nama: currentCase.nama_terlapor || currentCase.terlapor_name,
        alamat: currentCase.locus || '',
        status: 'terlapor'
      });
    }

    // 4. Tersangka
    const rawTersangka = [
      ...caseSuspects.filter(s => s && (s.status === 'tersangka' || !s.status)),
      ...(Array.isArray(currentCase.tersangka_list) ? currentCase.tersangka_list : []),
      ...(Array.isArray(refs.tersangka_list) ? refs.tersangka_list : [])
    ];

    const pelapor = dedupe(rawPelapor, 'PELAPOR', 'Pelapor / Korban');
    const saksi = dedupe(rawSaksi, 'SAKSI', 'Saksi');
    const terlapor = dedupe(rawTerlapor, 'TERLAPOR', 'Terlapor (Calon Tsk)');
    const tersangka = dedupe(rawTersangka, 'TERSANGKA', 'Tersangka');

    return {
      pelapor,
      saksi,
      terlapor,
      tersangka,
      all: [...tersangka, ...terlapor, ...saksi, ...pelapor]
    };
  }, [currentCase, caseSuspects]);

  // Daftar subjek yang sedang dipilih pada Pemilih Subjek Universal
  const selectedTargetSubjects = useMemo(() => {
    if (selectedTargetSubjectKeys.length === 0) return [];
    return allCaseSubjects.all.filter(s => selectedTargetSubjectKeys.includes(s._uid));
  }, [allCaseSubjects, selectedTargetSubjectKeys]);

  // Fungsi injeksi penuh ketika subjek dipilih di Pemilih Subjek Universal
  const applyUniversalSelectedSubjects = (nextSubjects) => {
    if (!Array.isArray(nextSubjects) || nextSubjects.length === 0) return;
    const primary = nextSubjects[0];

    // Jika subjek punya id di caseSuspects, sinkronkan juga selectedSuspectId
    if (primary.id && caseSuspects.some(cs => String(cs.id) === String(primary.id))) {
      setSelectedSuspectId(primary.id);
    }

    setFormValues(prev => {
      const next = { ...prev };
      // Isi penuh SUBJEK_* serta prefix kategori masing-masing (TERSANGKA_*, TERLAPOR_*, SAKSI_*, PELAPOR_*)
      populateSubjectPrefixVariables(next, 'SUBJEK', nextSubjects, primary);
      populateSubjectPrefixVariables(next, primary._category || 'TERSANGKA', nextSubjects, primary);

      // Untuk surat penetapan tersangka / upaya paksa yang memakai tag TERSANGKA_* walaupun yang dipilih masih berstatus Terlapor (Calon Tersangka):
      if (primary._category === 'TERLAPOR' || primary._category === 'TERSANGKA') {
        populateSubjectPrefixVariables(next, 'TERSANGKA', nextSubjects, primary);
        populateSubjectPrefixVariables(next, 'TERLAPOR', nextSubjects, primary);
        next.NAMA_TERSANGKA = primary.nama || '';
        next.nama_tersangka = primary.nama || '';
        next.NIK = primary.nik || '-';
        next.nik = primary.nik || '-';
        next.TEMPAT_LAHIR = primary.tempat_lahir || '';
        next.tempat_lahir = primary.tempat_lahir || '';
        next.TGL_LAHIR = primary.tgl_lahir || '';
        next.tgl_lahir = primary.tgl_lahir || '';
        next.TTL = primary.ttl || '';
        next.ttl = primary.ttl || '';
        next.UMUR = primary.umur || '';
        next.umur = primary.umur || '';
        next.JENIS_KELAMIN = primary.jenis_kelamin || 'Laki-laki';
        next.jenis_kelamin = primary.jenis_kelamin || 'Laki-laki';
        next.KEWARGANEGARAAN = primary.kewarganegaraan || 'Indonesia';
        next.kewarganegaraan = primary.kewarganegaraan || 'Indonesia';
        next.AGAMA = primary.agama || 'Islam';
        next.agama = primary.agama || 'Islam';
        next.PEKERJAAN = primary.pekerjaan || '';
        next.pekerjaan = primary.pekerjaan || '';
        next.PENDIDIKAN = primary.pendidikan || '';
        next.pendidikan = primary.pendidikan || '';
        next.ALAMAT = primary.alamat || '';
        next.alamat = primary.alamat || '';
        next.NO_HP = primary.no_hp || '';
        next.no_hp = primary.no_hp || '';
        if (primary.nomor_sp_tap) next.NO_SP_TAP_TSK = primary.nomor_sp_tap;
        if (primary.tanggal_sp_tap) next.TGL_SP_TAP_TSK = primary.tanggal_sp_tap;
      }
      return next;
    });
    setIsSaved(false);
  };

  // Ringkasan Panel Status Rantai Mindik (Deteksi Dokumen Pendahulu Sah di Arsip + Tim Penyidik Terwarisi)
  const chainOverviewStatus = useMemo(() => {
    if (!currentCase) return { badges: [], teamCount: 0, customDocs: [] };

    const lpNo = currentCase.nomor_lp || currentCase.no_lp || '';
    const sprinLidikDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPRIN_LIDIK'], true);
    const spgasLidikDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPGAS_LIDIK'], true);
    const sprinSidikDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPRIN_SIDIK', 'SPRIN_SIDIK_MORE_5'], false)
      || resolveLatestArchiveDoc(activeCaseDocs, ['SPRIN_SIDIK', 'SPRIN_SIDIK_MORE_5'], true);
    const spgasSidikDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPGAS_SIDIK', 'SPGAS_SIDIK_MORE_5'], false)
      || resolveLatestArchiveDoc(activeCaseDocs, ['SPGAS_SIDIK', 'SPGAS_SIDIK_MORE_5'], true);
    const spdpDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPDP_TSK', 'SPDP_MORE_1_TSK', 'SPDP_TERLAPOR', 'SPDP_LIDIK_ANON', 'SPDP_KORPORASI', 'PENGIRIMAN_KEMBALI_SPDP_P20'], false)
      || resolveLatestArchiveDoc(activeCaseDocs, ['SPDP_TSK', 'SPDP_MORE_1_TSK', 'SPDP_TERLAPOR', 'SPDP_LIDIK_ANON', 'SPDP_KORPORASI', 'PENGIRIMAN_KEMBALI_SPDP_P20'], true);
    const tapTskDoc = resolveLatestArchiveDoc(activeCaseDocs, ['TAP_TSK'], false)
      || resolveLatestArchiveDoc(activeCaseDocs, ['TAP_TSK'], true);

    const noSprinSidik = sprinSidikDoc?.doc_number || currentCase.no_sprin_sidik || currentCase.references?.no_sprin_sidik || '';
    const noSpgasSidik = spgasSidikDoc?.doc_number || currentCase.no_sprin_gas_sidik || currentCase.references?.no_spgas_sidik || '';
    const noSpdp = spdpDoc?.doc_number || currentCase.no_spdp || currentCase.references?.no_spdp || '';
    const noTapTsk = tapTskDoc?.doc_number || caseSuspects.find(s => s.nomor_sp_tap)?.nomor_sp_tap || '';

    // Hitung jumlah personel penyidik terwarisi
    let teamCount = 0;
    for (let i = 1; i <= 10; i++) {
      if (currentCase[`penyidik_${i}_nama`]) teamCount++;
    }
    if (teamCount === 0 && Array.isArray(currentCase.investigators)) {
      teamCount = currentCase.investigators.filter(p => p && p.nama).length;
    }

    const badges = [
      { key: 'LP', label: 'LP Terdaftar', value: lpNo, ready: Boolean(lpNo), required: true },
      ...(sprinLidikDoc ? [{ key: 'SPRIN_LIDIK', label: 'SPRIN_LIDIK', value: sprinLidikDoc.doc_number, ready: isValidOfficialDocNumber(sprinLidikDoc.doc_number) }] : []),
      ...(spgasLidikDoc ? [{ key: 'SPGAS_LIDIK', label: 'SPGAS_LIDIK', value: spgasLidikDoc.doc_number, ready: isValidOfficialDocNumber(spgasLidikDoc.doc_number) }] : []),
      { key: 'SPRIN_SIDIK', label: 'SPRIN_SIDIK', value: noSprinSidik, ready: isValidOfficialDocNumber(noSprinSidik) },
      { key: 'SPGAS_SIDIK', label: 'SPGAS_SIDIK', value: noSpgasSidik, ready: isValidOfficialDocNumber(noSpgasSidik) },
      { key: 'SPDP', label: 'SPDP', value: noSpdp, ready: isValidOfficialDocNumber(noSpdp) },
      { key: 'TAP_TSK', label: 'TAP_TSK', value: noTapTsk, ready: isValidOfficialDocNumber(noTapTsk) },
    ];

    const coreKeys = new Set([
      'SPRIN_LIDIK', 'SPGAS_LIDIK',
      'SPRIN_SIDIK', 'SPRIN_SIDIK_MORE_5',
      'SPGAS_SIDIK', 'SPGAS_SIDIK_MORE_5',
      'SPDP_TSK', 'SPDP_MORE_1_TSK', 'SPDP_TERLAPOR', 'SPDP_LIDIK_ANON', 'SPDP_KORPORASI', 'PENGIRIMAN_KEMBALI_SPDP_P20',
      'TAP_TSK'
    ]);
    const customDocsMap = new Map();
    activeCaseDocs.forEach((d) => {
      const cCode = toCanonicalMindikCode(d.template_code || d.code, d.doc_title);
      if (!coreKeys.has(cCode)) {
        customDocsMap.set(cCode, { ...d, template_code: cCode });
      }
    });

    return { badges, teamCount, customDocs: Array.from(customDocsMap.values()) };
  }, [currentCase, activeCaseDocs, caseSuspects]);

  // Update nilai profil tersangka ke formValues jika suspect berganti
  useEffect(() => {
    if (!activeSuspect) return;
    setFormValues(prev => ({
      ...prev,
      NAMA_TERSANGKA: activeSuspect.nama || '',
      nama_tersangka: activeSuspect.nama || '',
      NIK: activeSuspect.nik || '-',
      nik: activeSuspect.nik || '-',
      TEMPAT_LAHIR: activeSuspect.tempat_lahir || '',
      tempat_lahir: activeSuspect.tempat_lahir || '',
      TGL_LAHIR: activeSuspect.tgl_lahir ? formatTanggalIndonesia(activeSuspect.tgl_lahir) : '',
      tgl_lahir: activeSuspect.tgl_lahir ? formatTanggalIndonesia(activeSuspect.tgl_lahir) : '',
      UMUR: activeSuspect.umur ? `${activeSuspect.umur} Tahun` : '',
      umur: activeSuspect.umur ? `${activeSuspect.umur} Tahun` : '',
      JENIS_KELAMIN: activeSuspect.jenis_kelamin || 'Laki-laki',
      jenis_kelamin: activeSuspect.jenis_kelamin || 'Laki-laki',
      PEKERJAAN: activeSuspect.pekerjaan || '',
      pekerjaan: activeSuspect.pekerjaan || '',
      AGAMA: activeSuspect.agama || '',
      agama: activeSuspect.agama || '',
      ALAMAT: activeSuspect.alamat || '',
      alamat: activeSuspect.alamat || '',
      NO_SP_TAP_TSK: activeSuspect.nomor_sp_tap || activeSuspect.no_sp_tap_tsk || '',
      TGL_SP_TAP_TSK: activeSuspect.tanggal_sp_tap || activeSuspect.tgl_sp_tap_tsk || ''
    }));
  }, [activeSuspect]);

  // Template yang aktif dipilih saat ini (pencocokan persis lalu fallback kode kanonik)
  const currentTemplate = useMemo(() => {
    if (!selectedTemplateCode) return null;
    const rawUpper = selectedTemplateCode.toUpperCase().trim();
    const targetCanonical = toCanonicalMindikCode(rawUpper);
    const exact = (allTemplates || []).find(t =>
      (t.code || t.template_code || '').toUpperCase().trim() === rawUpper
    );
    if (exact) return exact;
    return (allTemplates || []).find(t =>
      toCanonicalMindikCode(t.code || t.template_code || '', t.title || t.name || '') === targetCanonical
    ) || null;
  }, [selectedTemplateCode, allTemplates]);

  // Sidik jari deterministik arsip perkara aktif agar efek sinkronisasi tidak bergantung pada .length saja
  const activeCaseDocsSignature = useMemo(() => {
    return (activeCaseDocs || [])
      .map(d => `${d.id || ''}:${toCanonicalMindikCode(d.template_code || d.code, d.doc_title)}:${d.doc_number || ''}`)
      .join('|');
  }, [activeCaseDocs]);

  // Helper filter dokumen tersangka
  const requiresSuspectTarget = useMemo(() => {
    if (!currentTemplate) return false;
    const rawCode = (currentTemplate.code || currentTemplate.template_code || '').toUpperCase().trim();
    const code = toCanonicalMindikCode(rawCode, currentTemplate.title || currentTemplate.name || '');
    const title = (currentTemplate.title || currentTemplate.name || '').toUpperCase().trim();

    if (code.startsWith('SPRIN_SIDIK') || code.startsWith('SPGAS_SIDIK')) return false;
    if (title.includes('PERINTAH PENYIDIKAN') || title.includes('TUGAS PENYIDIKAN')) return false;

    return (
      code === 'TAP_TSK' ||
      code.includes('TAP_TSK') ||
      code.startsWith('SPDP') ||
      code.includes('KAP') ||
      code.includes('HAN') ||
      code.includes('TAHAP') ||
      code.includes('PANJANG') ||
      title.includes('TERSANGKA') ||
      title.includes('PENANGKAPAN') ||
      title.includes('PENAHANAN')
    );
  }, [currentTemplate]);

  // Sinkronisasi form saat currentTemplate, currentCase, atau activeCaseDocsSignature berganti
  // sekaligus menyuntikkan langsung hasil chainedContext ke state formValues UI dengan menjaga tanggal ISO
  useEffect(() => {
    if (!currentTemplate || !currentCase) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const rawUpperCode = (currentTemplate.code || currentTemplate.template_code || '').toUpperCase().trim();
    const canonicalCode = toCanonicalMindikCode(
      rawUpperCode,
      currentTemplate.title || currentTemplate.name || ''
    );
    const tplCaseKey = `${currentCase.id}::${canonicalCode}::${currentTemplate.id || rawUpperCode}`;
    const isTplOrCaseChanged = lastTemplateKeyRef.current !== tplCaseKey;
    lastTemplateKeyRef.current = tplCaseKey;

    // Cari arsip sah terbaru untuk template tujuan di activeCaseDocs (berdasarkan toCanonicalMindikCode)
    const existingValidDoc = resolveLatestArchiveDoc(activeCaseDocs, [canonicalCode, rawUpperCode], false);
    const existingAnyDoc = existingValidDoc || resolveLatestArchiveDoc(activeCaseDocs, [canonicalCode, rawUpperCode], true);
    const preset = MINDIK_PRESETS[canonicalCode] || MINDIK_PRESETS[rawUpperCode] || [];
    const presetDefaultNo = preset.find(f => f.tag === 'NOMOR_SURAT')?.default || '';

    const targetNumber = (existingValidDoc && existingValidDoc.doc_number)
      ? existingValidDoc.doc_number
      : ((existingAnyDoc && existingAnyDoc.doc_number && isValidOfficialDocNumber(existingAnyDoc.doc_number))
          ? existingAnyDoc.doc_number
          : (presetDefaultNo || (existingAnyDoc?.doc_number || '')));

    const cacheKey = `${currentCase.id}::${activeCaseDocsSignature}`;
    let isCancelled = false;

    const applyChainedToForm = (scalarChained) => {
      // Hapus key generik surat aktif dari konteks rantai agar tidak pernah menimpa NOMOR_SURAT template tujuan
      const cleanScalarChained = { ...(scalarChained || {}) };
      delete cleanScalarChained.NOMOR_SURAT;
      delete cleanScalarChained.nomor_surat;
      delete cleanScalarChained.NO_SURAT;
      delete cleanScalarChained.no_surat;
      delete cleanScalarChained.DOC_NO;
      delete cleanScalarChained.doc_no;
      delete cleanScalarChained.NOMOR_SURAT_HEADER;
      delete cleanScalarChained.nomor_surat_header;

      setFormValues(prev => {
        const isNewTplState = prev._activeTemplateKey !== tplCaseKey || isTplOrCaseChanged;
        // Gabungkan chainedCtx sebagai basis lalu pertahankan input non-empty dari prev
        // Tanpa mengonversi tanggal ISO menjadi teks Indonesia di state form UI
        const nextValues = mergeChainedWithForm(cleanScalarChained, prev, { formatDatesForDocx: false });
        nextValues._activeTemplateKey = tplCaseKey;

        // Pastikan TANGGAL_SURAT selalu valid format ISO YYYY-MM-DD
        const existingArchivedDate = existingAnyDoc ? toIsoDateString(existingAnyDoc.tgl_surat) : '';
        const currentIsoDate = toIsoDateString(nextValues.TANGGAL_SURAT);
        const finalIsoDate = (isNewTplState && existingArchivedDate)
          ? existingArchivedDate
          : (currentIsoDate || existingArchivedDate || todayStr);

        nextValues.TANGGAL_SURAT = finalIsoDate;
        nextValues.tanggal_surat = finalIsoDate;
        nextValues.DOC_DATE = finalIsoDate;
        nextValues.doc_date = finalIsoDate;

        // Reset terkontrol NOMOR_SURAT saat template/perkara berganti,
        // atau perbarui jika arsip sah baru dimuat & input saat ini masih kosong/placeholder.
        if (
          isNewTplState ||
          (!isValidOfficialDocNumber(prev.NOMOR_SURAT) && isValidOfficialDocNumber(targetNumber))
        ) {
          nextValues.NOMOR_SURAT = targetNumber;
          nextValues.nomor_surat = targetNumber;
          nextValues.DOC_NO = targetNumber;
          nextValues.doc_no = targetNumber;
          nextValues.NO_SURAT = targetNumber;
          nextValues.no_surat = targetNumber;
        }

        // Inisialisasi default field dinamis dari template jika belum terisi dari chainedCtx
        if (Array.isArray(currentTemplate.dynamic_fields)) {
          currentTemplate.dynamic_fields.forEach(f => {
            const k = f.field_key || f.key;
            if (k && !['NOMOR_SURAT', 'DOC_NO', 'NO_SURAT'].includes(k)) {
              if ((nextValues[k] === undefined || nextValues[k] === '') && f.default_value !== undefined && String(f.default_value).trim() !== '') {
                nextValues[k] = f.field_type === 'date' ? toIsoDateString(f.default_value) : f.default_value;
              } else if (f.field_type === 'date' && nextValues[k]) {
                const converted = toIsoDateString(nextValues[k]);
                if (converted) nextValues[k] = converted;
              }
            }
          });
        }

        return nextValues;
      });
    };

    // Tunggu arsip dokumen perkara aktif selesai dimuat sebelum memanggil buildUniversalCaseContext
    // agar tidak terjadi pemanggilan ganda saat inisialisasi awal.
    if (docsLoadedCaseIdRef.current !== String(currentCase.id).trim()) {
      applyChainedToForm({});
      return;
    }

    // Jika cache untuk (caseId + activeCaseDocsSignature) sudah tersedia, gunakan langsung tanpa query ulang
    if (chainedContextCacheRef.current.key === cacheKey && chainedContextCacheRef.current.scalar) {
      applyChainedToForm(chainedContextCacheRef.current.scalar);
      return;
    }

    resolveChainedMindikContext(currentCase, {}, {
      archivedDocs: activeCaseDocs,
      suspectsList: caseSuspects,
      personnelList: personnel,
      forFormUi: true
    }).then((chainedCtx) => {
      if (isCancelled) return;
      const scalarChained = {};
      Object.keys(chainedCtx || {}).forEach(k => {
        const val = chainedCtx[k];
        if (typeof val === 'string' || typeof val === 'number') {
          scalarChained[k] = val;
        }
      });
      chainedContextCacheRef.current = { key: cacheKey, scalar: scalarChained };
      applyChainedToForm(scalarChained);
    }).catch((err) => {
      console.warn('[MindikGeneratorView] Gagal menyuntikkan chainedContext saat ganti template:', err);
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTemplate?.id, currentTemplate?.code, currentCase?.id, activeCaseDocsSignature]);

  // Listener tombol Esc untuk menutup modal preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPreviewModalOpen) {
        setIsPreviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewModalOpen]);

  // Evaluasi Rantai Formil KUHAP untuk Template Aktif
  const activeChainStatus = useMemo(() => {
    if (!currentTemplate || !currentCase) {
      return { allowed: false, unlocked: false, reason: 'Pilih template dokumen terlebih dahulu.', isLocked: true };
    }
    const tplCode = currentTemplate.code || currentTemplate.template_code || '';
    return checkPrerequisite(tplCode, selectedCase, activeCaseDocs);
  }, [currentTemplate, selectedCase, activeCaseDocs]);

  // Saring Daftar Template Berdasarkan Filter & Pencarian
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((template) => {
      const rawTplCode = (template.code || template.template_code || template.id || '').toUpperCase();
      const canonicalCode = toCanonicalMindikCode(rawTplCode, template.title || template.name || '');
      const mappedCategory = MINDIK_CODE_TO_CATEGORY[canonicalCode] || MINDIK_CODE_TO_CATEGORY[rawTplCode] || template.category;

      // 1. Cek Kategori
      const matchesCategory = selectedCategory === 'ALL' || mappedCategory === selectedCategory;

      // 2. Cek Pencarian
      const query = templateSearch.toLowerCase();
      const title = (template.title || template.name || '').toLowerCase();
      const matchesSearch = !query ||
        title.includes(query) ||
        rawTplCode.toLowerCase().includes(query) ||
        canonicalCode.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [allTemplates, templateSearch, selectedCategory]);

  // Handle Input Perubahan Field Form
  const handleInputChange = (key, value) => {
    setFormValues(prev => {
      const next = {
        ...prev,
        [key]: value
      };
      if (key === 'NOMOR_SURAT') {
        next.nomor_surat = value;
        next.DOC_NO = value;
        next.doc_no = value;
        next.NO_SURAT = value;
        next.no_surat = value;
      }
      return next;
    });
    setIsSaved(false);
  };

  // Simpan Arsip Dokumen ke Supabase `documents`
  const handleSaveArchive = async () => {
    if (!currentCase || !currentTemplate) return;
    setIsSaving(true);
    setFeedbackNotice(null);

    try {
      const docNo = formValues.NOMOR_SURAT || formValues.doc_no || formValues.NO_SURAT || '-';
      const rawDocDate = formValues.TANGGAL_SURAT || formValues.doc_date || new Date().toISOString().split('T')[0];
      const docDate = toIsoDateString(rawDocDate) || new Date().toISOString().split('T')[0];
      const tplCode = currentTemplate.code || currentTemplate.template_code || 'MINDIK';
      const tplTitle = currentTemplate.title || currentTemplate.name || 'Dokumen Mindik';
      const canonicalCode = toCanonicalMindikCode(tplCode, tplTitle);

      // =========================================================
      // AUTO-PROMOTE & AUTO-UPDATE DATABASE TERSANGKA (TAP_TSK)
      // =========================================================
      const isTapTsk = canonicalCode === 'TAP_TSK';

      if (isTapTsk) {
        try {
          const cleanDate = docDate;

          const targetSubjectsToPromote = selectedTargetSubjects.length > 0
            ? selectedTargetSubjects
            : (activeSuspect ? [activeSuspect] : []);

          for (const subj of targetSubjectsToPromote) {
            if (!subj || !subj.nama) continue;

            // 1. Cek apakah sudah ada baris di tabel case_suspects
            const existingRow = caseSuspects.find(
              (cs) => (subj.id && String(cs.id) === String(subj.id)) ||
                (cs.nama && cs.nama.trim().toLowerCase() === subj.nama.trim().toLowerCase())
            );

            if (existingRow?.id) {
              await supabase
                .from('case_suspects')
                .update({
                  status: 'tersangka',
                  nomor_sp_tap: docNo !== '-' ? docNo : null,
                  no_sp_tap_tsk: docNo !== '-' ? docNo : null,
                  tanggal_sp_tap: cleanDate,
                  tgl_sp_tap_tsk: cleanDate
                })
                .eq('id', existingRow.id);
            } else {
              // Promosikan Terlapor (Calon Tersangka) baru ke tabel case_suspects dengan status 'tersangka'
              await supabase.from('case_suspects').insert([{
                case_id: currentCase.id,
                nama: subj.nama,
                nik: subj.nik || '-',
                jenis_kelamin: subj.jenis_kelamin || 'Laki-laki',
                tempat_lahir: subj.tempat_lahir || 'Kolaka Timur',
                tgl_lahir: subj.tanggal_lahir || subj.tgl_lahir || null,
                umur: subj.umur_angka || subj.umur || null,
                agama: subj.agama || 'Islam',
                pekerjaan: subj.pekerjaan || 'Wiraswasta',
                kewarganegaraan: subj.kewarganegaraan || 'Indonesia',
                pendidikan: subj.pendidikan || 'SMA',
                alamat: subj.alamat || currentCase.locus || '',
                status: 'tersangka',
                nomor_sp_tap: docNo !== '-' ? docNo : null,
                no_sp_tap_tsk: docNo !== '-' ? docNo : null,
                tanggal_sp_tap: cleanDate,
                tgl_sp_tap_tsk: cleanDate,
                created_at: new Date().toISOString()
              }]);
            }
          }

          // Muat ulang case_suspects agar status Tersangka langsung aktif di UI
          const { data: refreshedSuspects } = await supabase
            .from('case_suspects')
            .select('*')
            .eq('case_id', currentCase.id)
            .order('created_at', { ascending: true });
          if (Array.isArray(refreshedSuspects)) {
            setCaseSuspects(refreshedSuspects);
          }

          // Sinkronkan juga ke currentCase.references.tersangka_list
          const prevTskList = Array.isArray(currentCase.references?.tersangka_list)
            ? [...currentCase.references.tersangka_list]
            : [];
          targetSubjectsToPromote.forEach((subj) => {
            if (!subj || !subj.nama) return;
            const idx = prevTskList.findIndex(t => t.nama?.trim().toLowerCase() === subj.nama.trim().toLowerCase());
            const promotedEntry = {
              ...subj,
              status: 'tersangka',
              nomor_sp_tap: docNo !== '-' ? docNo : null,
              no_sp_tap_tsk: docNo !== '-' ? docNo : null,
              tanggal_sp_tap: cleanDate,
              tgl_sp_tap_tsk: cleanDate
            };
            if (idx >= 0) prevTskList[idx] = promotedEntry;
            else prevTskList.push(promotedEntry);
          });
          currentCase.tersangka_list = prevTskList;
          currentCase.references = {
            ...(currentCase.references || {}),
            tersangka_list: prevTskList,
            no_sp_tap_tsk: docNo !== '-' ? docNo : (currentCase.references?.no_sp_tap_tsk || null),
            tanggal_sp_tap: cleanDate
          };
        } catch (err) {
          console.error('[Auto-Promote Tersangka Error]', err);
        }
      }
      // =========================================================

      const chainSnapshot = {};
      (chainOverviewStatus?.badges || []).forEach((b) => {
        if (b.ready && b.value) {
          chainSnapshot[b.key] = b.value;
        }
      });

      const suspectSnapshot = (caseSuspects && caseSuspects.length > 0)
        ? caseSuspects
        : (activeSuspect ? [activeSuspect] : null);

      const dbDocumentPayload = {
        id: crypto.randomUUID(),
        case_id: String(currentCase.id),
        template_id: currentTemplate.id ? String(currentTemplate.id) : null,
        template_code: canonicalCode,
        doc_title: tplTitle,
        doc_number: docNo,
        meta_values: {
          ...formValues,
          NOMOR_SURAT: docNo,
          TANGGAL_SURAT: docDate,
          tgl_surat: docDate,
          nomor_lp: currentCase.nomor_lp || currentCase.no_lp || '',
          canonical_code: canonicalCode,
          original_template_code: tplCode,
          chain_snapshot: chainSnapshot,
          suspect_data: suspectSnapshot
        },
        file_url: null,
        storage_path: null,
        created_at: new Date().toISOString()
      };

      const hydratedDocForUi = {
        ...dbDocumentPayload,
        tgl_surat: docDate,
        nomor_lp: currentCase.nomor_lp || currentCase.no_lp || ''
      };

      let savedDoc = null;
      try {
        const { data, error } = await supabase.from('documents').insert([dbDocumentPayload]).select();
        if (error) {
          console.warn('[MindikGeneratorView] Gagal simpan ke documents:', error.message);
        } else if (data && data[0]) {
          savedDoc = {
            ...data[0],
            template_code: toCanonicalMindikCode(data[0].template_code, data[0].doc_title),
            tgl_surat: data[0].meta_values?.tgl_surat || docDate,
            nomor_lp: data[0].meta_values?.nomor_lp || currentCase.nomor_lp || currentCase.no_lp || ''
          };
          setActiveCaseDocs(prev => [...prev, savedDoc]);
        }
      } catch (errCaseDoc) {
        console.warn('[MindikGeneratorView] Exception saat simpan ke documents:', errCaseDoc?.message || errCaseDoc);
      }

      // Fallback UI state jika insert Supabase mengalami kendala koneksi
      if (!savedDoc) {
        setActiveCaseDocs(prev => [...prev, hydratedDocForUi]);
      }

      // Update Rujukan di kolom JSONB `references` & kolom resmi DDL `public.cases`
      const existingRefs = (currentCase.references && typeof currentCase.references === 'object') ? currentCase.references : {};
      const updatedRefs = {
        ...existingRefs,
        [`no_${canonicalCode.toLowerCase()}`]: docNo,
        [`tgl_${canonicalCode.toLowerCase()}`]: docDate
      };

      if (canonicalCode === 'SPRIN_SIDIK' || canonicalCode === 'SPRIN_SIDIK_MORE_5') {
        updatedRefs.no_sprin_sidik = docNo;
        updatedRefs.tgl_sprin_sidik = docDate;
      } else if (canonicalCode === 'SPGAS_SIDIK' || canonicalCode === 'SPGAS_SIDIK_MORE_5') {
        updatedRefs.spgas_sidik = docNo;
        updatedRefs.no_spgas_sidik = docNo;
        updatedRefs.no_sp_gas_sidik = docNo;
        updatedRefs.no_sprin_gas_sidik = docNo;
        updatedRefs.tgl_sprin_gas_sidik = docDate;
      } else if (canonicalCode === 'TAP_TSK') {
        updatedRefs.tap_tsk = docNo;
        updatedRefs.no_sp_tap_tsk = docNo;
        updatedRefs.tanggal_sp_tap = docDate;
      } else if (canonicalCode.startsWith('SPDP')) {
        updatedRefs.no_spdp = docNo;
        updatedRefs.tgl_spdp = docDate;
      } else if (canonicalCode === 'SPRIN_KAP_DAN_BA') {
        updatedRefs.sprin_kap = docNo;
        updatedRefs.no_sprin_kap = docNo;
      } else if (canonicalCode === 'SPRIN_HAN_DAN_BA') {
        updatedRefs.sprin_han = docNo;
        updatedRefs.no_sprin_han = docNo;
      }

      // Kirim HANYA kolom asli sesuai DDL tabel public.cases
      const caseUpdatePayload = {
        references: updatedRefs,
        updated_at: new Date().toISOString()
      };
      if (canonicalCode === 'SPRIN_SIDIK' || canonicalCode === 'SPRIN_SIDIK_MORE_5') {
        caseUpdatePayload.no_sprin_sidik = docNo;
      } else if (canonicalCode.startsWith('SPDP')) {
        caseUpdatePayload.no_spdp = docNo;
      } else if (canonicalCode === 'P21_KN') {
        caseUpdatePayload.no_p21_kn = docNo;
      }

      const { error: caseErr } = await supabase
        .from('cases')
        .update(caseUpdatePayload)
        .eq('id', currentCase.id);

      if (caseErr) {
        console.error('[Mindik] Gagal update cases:', caseErr.message);
      }

      // Perbarui state lokal currentCase
      if (currentCase) {
        if (caseUpdatePayload.no_sprin_sidik) currentCase.no_sprin_sidik = caseUpdatePayload.no_sprin_sidik;
        if (caseUpdatePayload.no_spdp) currentCase.no_spdp = caseUpdatePayload.no_spdp;
        if (caseUpdatePayload.no_p21_kn) currentCase.no_p21_kn = caseUpdatePayload.no_p21_kn;
        if (canonicalCode === 'SPGAS_SIDIK' || canonicalCode === 'SPGAS_SIDIK_MORE_5') {
          currentCase.no_sprin_gas_sidik = docNo;
        }
        currentCase.references = updatedRefs;
      }

      setIsSaved(true);
      setFeedbackNotice({
        type: 'success',
        message: `Arsip '${tplTitle}' berhasil disimpan ke riwayat perkara.`
      });

      if (onSaveDocument) {
        onSaveDocument(savedDoc ? { ...savedDoc, _skipDbUpsert: true } : hydratedDocForUi);
      }
    } catch (err) {
      console.error('[MindikGeneratorView] Gagal menyimpan arsip:', err);
      setFeedbackNotice({
        type: 'error',
        message: `Gagal menyimpan dokumen: ${err.message || 'Terjadi kesalahan sistem.'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Unduh Berkas Fisik .docx ke Komputer Pengguna
  const handleDownloadDocx = async () => {
    if (!currentCase || !currentTemplate) return;
    if (!activeChainStatus.allowed) {
      setFeedbackNotice({
        type: 'warning',
        message: `Dokumen terkunci: ${activeChainStatus.reason}`
      });
      return;
    }

    setIsGenerating(true);
    setFeedbackNotice(null);

    try {
      // 1. Eksekusi Auto-Save sebelum mengunduh
      await handleSaveArchive();

      // 2. Generate dan Unduh
      await generateAndDownloadDocx({
        template: currentTemplate,
        activeCase: currentCase,
        activeSuspect,
        suspectsList: caseSuspects,
        formValues,
        personnelList: personnel
      });

      setFeedbackNotice({
        type: 'success',
        message: `Arsip berhasil disimpan & dokumen terunduh.`
      });
    } catch (err) {
      console.error('[MindikGeneratorView] Gagal membuat file docx:', err);
      setFeedbackNotice({
        type: 'error',
        message: `Gagal men-generate file: ${err.message || 'Periksa kelengkapan template fisik di Template Studio.'}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mindik-generator-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', padding: '24px' }}>
      
      {/* --- TOP HEADER & BAR IDENTITAS SISTEM --- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #161D2A 0%, #11161F 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#FF2A2A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(255, 42, 42, 0.35)'
          }}>
            <FileSignature size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="heading-font" style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                GENERATOR MINDIK PRO-JUSTITIA
              </h2>
              <span style={{
                background: '#FFFFFF',
                color: '#0B0E14',
                border: '1px solid #FFFFFF',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '10.5px',
                fontWeight: 700
              }}>
                ISOLASI LP AKTIF
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#CBD5E1' }}>
              Administrasi Penyidikan terisolasi per Laporan Polisi dengan mesin rantai formil KUHAP.
            </p>
          </div>
        </div>

        {isSuperAdmin && onOpenTemplateStudio && (
          <button
            type="button"
            onClick={onOpenTemplateStudio}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          >
            <Layers size={15} />
            <span>Kelola Template Studio</span>
          </button>
        )}
      </div>

      {/* --- FEEDBACK NOTICE BANNER --- */}
      {feedbackNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: feedbackNotice.type === 'success' ? 'rgba(255, 42, 42, 0.14)' : (feedbackNotice.type === 'warning' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(255, 42, 42, 0.18)'),
          border: `1px solid ${feedbackNotice.type === 'success' ? 'rgba(255, 42, 42, 0.5)' : (feedbackNotice.type === 'warning' ? 'rgba(148, 163, 184, 0.35)' : '#FF2A2A')}`,
          color: feedbackNotice.type === 'success' ? '#FFFFFF' : (feedbackNotice.type === 'warning' ? '#CBD5E1' : '#FF3B3B'),
          animation: 'fadeIn 200ms ease-out'
        }}>
          {feedbackNotice.type === 'success' && <CheckCircle2 size={18} color="#FF2A2A" />}
          {feedbackNotice.type === 'warning' && <AlertTriangle size={18} color="#CBD5E1" />}
          {feedbackNotice.type === 'error' && <AlertCircle size={18} color="#FF2A2A" />}
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* --- SECTION 1: PEMILIH PERKARA / LP AKTIF --- */}
      <div style={{
        background: 'rgba(17, 22, 31, 0.80)',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#FF2A2A" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.4px' }}>
              BERKAS PERKARA AKTIF (LAPORAN POLISI)
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
            Total Terdaftar: <strong>{cases.length} Perkara</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', display: 'block' }}>
              PILIH NOMOR LP:
            </label>
            <select
              value={selectedCaseId ?? ''}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-glass)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px 14px'
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomor_lp || c.no_lp || `Perkara #${c.id.substring(0, 8)}`} — {c.crime_category || c.kasus || 'Tindak Pidana'}
                </option>
              ))}
            </select>
          </div>

          {currentCase && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              padding: '10px 16px',
              background: '#11161F',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 184, 0.14)'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(203, 213, 225, 0.6)', display: 'block' }}>Pelapor</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{currentCase.pelapor || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(203, 213, 225, 0.6)', display: 'block' }}>Tanggal LP</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                  {formatTanggalIndonesia(currentCase.tanggal_lp || currentCase.sprin_date) || '-'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(203, 213, 225, 0.6)', display: 'block' }}>Penyidik Penangan</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{currentCase.penyidik_1_nama || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(203, 213, 225, 0.6)', display: 'block' }}>Arsip Naskah Dinas</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1' }}>
                  {isLoadingDocs ? 'Memuat...' : `${activeCaseDocs.length} Dokumen Sah`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: WORKSPACE DUA PANEL (KIRI: FORMAT & FORM, KANAN: PREVIEW DOKUMEN) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* PANEL KIRI: KATALOG TEMPLATE & INPUT FIELD */}
        <div className="lg:col-span-7 flex flex-col gap-[18px]">
          
          {/* Card 1: Pilihan Format Dokumen Mindik */}
          <div style={{
            background: 'rgba(17, 22, 31, 0.80)',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={17} color="#FF2A2A" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                  FORMAT MINDIK TERSEDIA
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#CBD5E1' }}>
                {filteredTemplates.length} Format
              </span>
            </div>

            {/* Tab Kategori */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {MINDIK_CATEGORY_TABS.map(tab => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    type="button"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      border: isActive ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.16)',
                      background: isActive ? '#FF2A2A' : '#11161F',
                      color: isActive ? '#FFFFFF' : '#CBD5E1',
                      cursor: 'pointer',
                      transition: 'all 150ms ease'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Cari kode / judul format..."
                  value={templateSearch ?? ''}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="form-input w-full"
                  style={{ paddingLeft: '30px', fontSize: '12px', height: '36px' }}
                />
              </div>
            </div>

            {/* Daftar Pilihan Template dengan Validasi Rantai Formil KUHAP */}
            <div style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px'
            }}>
              {filteredTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748B', fontSize: '12px' }}>
                  Tidak ada format dokumen yang cocok dengan filter pencarian.
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const tplCode = tpl.code || tpl.template_code || '';
                  const tplTitle = tpl.title || tpl.name || tplCode;
                  const evalRes = checkPrerequisite(tplCode, selectedCase, activeCaseDocs);
                  const isSelected = (selectedTemplateCode || '').toUpperCase() === tplCode.toUpperCase();
                  const isLocked = !evalRes.allowed;

                  return (
                    <div
                      key={tpl.id || tplCode}
                      onClick={() => {
                        if (!isLocked) {
                          setSelectedTemplateCode(tplCode);
                        }
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: isSelected 
                          ? 'rgba(255, 42, 42, 0.16)' 
                          : (isLocked ? 'rgba(11, 14, 20, 0.65)' : '#11161F'),
                        border: isSelected 
                          ? '1.5px solid #FF2A2A' 
                          : (isLocked ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(148, 163, 184, 0.16)'),
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        opacity: isLocked ? 0.6 : 1,
                        transition: 'all 150ms ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {isLocked ? (
                          <Lock size={14} color="#FF2A2A" style={{ flexShrink: 0 }} />
                        ) : (
                          <Unlock size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isSelected ? '#FFFFFF' : '#F8FAFC',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {tplTitle}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(203, 213, 225, 0.55)' }}>
                            Kode: <span className="mono">{tplCode}</span>
                          </div>
                        </div>
                      </div>

                      {evalRes.badge && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 9px',
                          borderRadius: '9999px',
                          whiteSpace: 'nowrap',
                          background: evalRes.isLocked ? 'rgba(255, 42, 42, 0.15)' : '#FFFFFF',
                          border: evalRes.isLocked ? '1px solid rgba(255, 42, 42, 0.4)' : '1px solid #FFFFFF',
                          color: evalRes.isLocked ? '#FF2A2A' : '#0B0E14'
                        }}>
                          {evalRes.badge}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Status Prasyarat & Form Input Aktif */}
          <div style={{
            background: 'rgba(17, 22, 31, 0.80)',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header Form Dokumen Terpilih */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.65)' }}>DOKUMEN TERPILIH</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeChainStatus.allowed ? '#CBD5E1' : '#FF2A2A'
                }}>
                  {activeChainStatus.allowed ? '✓ Rantai Formil Terpenuhi' : '✕ Syarat Belum Lengkap'}
                </span>
              </div>
              <h3 className="heading-font" style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
                {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode}
              </h3>
            </div>

            {/* Warning jika Prasyarat Belum Terpenuhi */}
            {!activeChainStatus.allowed && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 42, 42, 0.12)',
                border: '1px solid rgba(255, 42, 42, 0.4)',
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                fontSize: '12px',
                color: '#CBD5E1'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Akses Dokumen Terkunci:</strong>
                  <div style={{ marginTop: '2px', lineHeight: 1.4 }}>{activeChainStatus.reason}</div>
                </div>
              </div>
            )}

            {/* 1. PANEL STATUS RANTAI MINDIK (CHAIN RESOLUTION OVERVIEW) */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#11161F',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#FF2A2A" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em' }}>
                    PANEL STATUS RANTAI MINDIK & PEWARISAN DATA ARSIP
                  </span>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(255, 42, 42, 0.15)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 42, 42, 0.35)'
                }}>
                  Tim Penyidik: {chainOverviewStatus.teamCount} Personel Terwarisi
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {chainOverviewStatus.badges.map((b) => (
                  <div
                    key={b.key}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: b.ready ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 42, 42, 0.08)',
                      border: b.ready ? '1px solid rgba(203, 213, 225, 0.25)' : '1px dashed rgba(255, 42, 42, 0.35)',
                      color: b.ready ? '#FFFFFF' : '#94A3B8'
                    }}
                    title={b.ready ? `${b.label}: ${b.value}` : `${b.label} belum diterbitkan di Arsip`}
                  >
                    {b.ready ? (
                      <CheckCircle2 size={12} color="#FF2A2A" />
                    ) : (
                      <AlertTriangle size={12} color="#94A3B8" />
                    )}
                    <span>{b.label}:</span>
                    <span className="mono" style={{ color: b.ready ? '#CBD5E1' : '#64748B', fontWeight: 700 }}>
                      {b.ready ? b.value : 'Belum Ada'}
                    </span>
                  </div>
                ))}

                {chainOverviewStatus.customDocs.map((cd, cIdx) => (
                  <div
                    key={cd.id || cIdx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(203, 213, 225, 0.25)',
                      color: '#FFFFFF'
                    }}
                  >
                    <CheckCircle2 size={12} color="#FF2A2A" />
                    <span>{cd.template_code}:</span>
                    <span className="mono" style={{ color: '#CBD5E1', fontWeight: 700 }}>
                      {cd.doc_number || 'Tersimpan'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. PEMILIH SUBJEK HUKUM UNIVERSAL (TARGET SURAT: PELAPOR, SAKSI, TERLAPOR, TERSANGKA) */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#11161F',
              border: '1px solid rgba(255, 42, 42, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} color="#FF2A2A" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em' }}>
                    PEMILIH SUBJEK HUKUM UNIVERSAL (TARGET SURAT)
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#CBD5E1' }}>
                  Pilih 1 atau lebih subjek untuk mengisi otomatis biodata KUHAP pada surat
                </span>
              </div>

              {/* Filter Kategori Subjek */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { id: 'ALL', label: `Semua (${allCaseSubjects.all.length})` },
                  { id: 'PELAPOR', label: `Pelapor/Korban (${allCaseSubjects.pelapor.length})` },
                  { id: 'SAKSI', label: `Saksi (${allCaseSubjects.saksi.length})` },
                  { id: 'TERLAPOR', label: `Terlapor/Calon Tsk (${allCaseSubjects.terlapor.length})` },
                  { id: 'TERSANGKA', label: `Tersangka (${allCaseSubjects.tersangka.length})` },
                ].map((cat) => {
                  const isCatActive = selectedSubjectCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSubjectCategory(cat.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isCatActive ? '#FF2A2A' : '#131924',
                        color: isCatActive ? '#FFFFFF' : '#CBD5E1',
                        border: isCatActive ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.2)'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Daftar Chip / Checkbox Subjek Hukum */}
              {(() => {
                const visibleSubjects = selectedSubjectCategory === 'ALL'
                  ? allCaseSubjects.all
                  : allCaseSubjects.all.filter(s => s._category === selectedSubjectCategory);

                if (visibleSubjects.length === 0) {
                  return (
                    <div style={{ fontSize: '11.5px', color: '#94A3B8', padding: '6px 2px' }}>
                      Belum ada subjek pada kategori ini di Berkas Perkara. Anda dapat menambahkannya lewat tombol Edit Berkas Perkara.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                    {visibleSubjects.map((subj) => {
                      const isChecked = Boolean(
                        selectedTargetSubjectKeys.includes(subj._uid) ||
                        (selectedTargetSubjectKeys.length === 0 && activeSuspect && subj.nama === activeSuspect.nama)
                      );
                      return (
                        <label
                          key={subj._uid}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '6px 11px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            background: isChecked ? 'rgba(255, 42, 42, 0.18)' : '#131924',
                            border: isChecked ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.2)',
                            color: '#FFFFFF',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let nextKeys;
                              if (e.target.checked) {
                                nextKeys = [...new Set([...selectedTargetSubjectKeys, subj._uid])];
                              } else {
                                nextKeys = selectedTargetSubjectKeys.filter(k => k !== subj._uid);
                              }
                              setSelectedTargetSubjectKeys(nextKeys);
                              const nextSelectedObjs = allCaseSubjects.all.filter(s => nextKeys.includes(s._uid));
                              if (nextSelectedObjs.length > 0) {
                                applyUniversalSelectedSubjects(nextSelectedObjs);
                              }
                            }}
                            style={{ accentColor: '#FF2A2A', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 700 }}>{subj.nama_lengkap || subj.nama}</span>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#CBD5E1'
                          }}>
                            {subj._categoryLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Form Fields Baku: Nomor Surat & Tanggal Surat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>
                  Nomor Surat Resmi:
                </label>
                <input
                  type="text"
                  placeholder="SP.Sidik/.../.../RES.1.24/2026"
                  value={formValues.NOMOR_SURAT ?? ''}
                  onChange={(e) => handleInputChange('NOMOR_SURAT', e.target.value)}
                  className="form-input mono"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>
                  Tanggal Surat:
                </label>
                <input
                  type="date"
                  value={formValues.TANGGAL_SURAT ?? ''}
                  onChange={(e) => {
                    handleInputChange('TANGGAL_SURAT', e.target.value);
                    handleInputChange('DOC_DATE', e.target.value);
                  }}
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Dynamic Fields dari Template Studio (Hanya variabel non-rujukan yang perlu diisi operator) */}
            {(() => {
              // Filter keluar seluruh variabel rujukan dokumen pendahulu & arsip yang sudah terinjeksi otomatis di latar belakang
              const isAutoChainedReferenceField = (rawKey) => {
                const k = String(rawKey || '').toUpperCase().trim();
                if (!k) return true;
                // 1. Field Nomor & Tanggal Surat utama yang sudah punya input khusus di atas
                if (['NOMOR_SURAT', 'NO_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE', 'TGL_SURAT', 'NOMOR_SURAT_HEADER', 'TANGGAL_SURAT_HEADER'].includes(k)) {
                  return true;
                }
                // 2. Field yang tetap BOLEH diinput operator pada template tertentu (tanggal jadwal panggilan, mulai/akhir penahanan, gelar perkara)
                const allowedOperatorInputKeys = new Set([
                  'TANGGAL_PANGGILAN',
                  'HARI_PANGGILAN',
                  'JAM_PANGGILAN',
                  'TEMPAT_PANGGILAN',
                  'TANGGAL_GELAR_PERKARA',
                  'TGL_MULAI_HAN',
                  'TANGGAL_MULAI_HAN',
                  'TGL_AKHIR_HAN',
                  'TANGGAL_AKHIR_HAN',
                  'TGL_AKHIR_HAN_PENYIDIK',
                  'TGL_MULAI_JANG_HAN_PU',
                  'TGL_AKHIR_HAN_PU',
                  'TGL_MULAI_JANG_HAN_PN1',
                  'TGL_AKHIR_HAN_PN1',
                  'TGL_MULAI_JANG_HAN_PN2',
                  'TGL_AKHIR_HAN_PN2',
                  'TANGGAL_KAP',
                  'TANGGAL_HAN',
                  'TANGGAL_BA',
                  'TANGGAL_BA_BAWA'
                ]);
                if (allowedOperatorInputKeys.has(k)) {
                  return false;
                }
                // 3. Seluruh pola rujukan dokumen arsip pendahulu & data induk LP (NOMOR_<KODE>, NO_<KODE>, TANGGAL_<KODE>, TGL_<KODE>, DASAR_<KODE>, <KODE>_NOMOR, <KODE>_TANGGAL)
                if (
                  k.startsWith('NOMOR_') ||
                  k.startsWith('NO_') ||
                  k.startsWith('TANGGAL_') ||
                  k.startsWith('TGL_') ||
                  k.startsWith('DASAR_') ||
                  k.endsWith('_NOMOR') ||
                  k.endsWith('_NO') ||
                  k.endsWith('_TANGGAL') ||
                  k.endsWith('_TGL')
                ) {
                  return true;
                }
                // 4. Kunci kode arsip dinamis yang sudah tersimpan di activeCaseDocs
                const archivedCodes = activeCaseDocs.map(d => (d.template_code || '').toUpperCase().trim()).filter(Boolean);
                for (const code of archivedCodes) {
                  if (
                    k === code ||
                    k === `NOMOR_${code}` ||
                    k === `NO_${code}` ||
                    k === `TANGGAL_${code}` ||
                    k === `TGL_${code}` ||
                    k === `DASAR_${code}`
                  ) {
                    return true;
                  }
                }
                return false;
              };

              const operatorDynamicFields = (Array.isArray(currentTemplate?.dynamic_fields) ? currentTemplate.dynamic_fields : [])
                .filter(f => !isAutoChainedReferenceField(f.field_key || f.key));

              if (operatorDynamicFields.length === 0) return null;

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '4px',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8' }}>
                    FIELD TAMBAHAN FORMAT INI:
                  </span>
                  {operatorDynamicFields.map((f, idx) => {
                    const key = f.field_key || f.key || `field_${idx}`;
                    const label = f.label || f.field_label || key;
                    const isDateField = f.field_type === 'date' || key === 'MASA_BERLAKU';
                    
                    const getValidDateValue = (val) => {
                      if (!val) return '';
                      return toIsoDateString(val) || '';
                    };
                    const inputValue = isDateField ? getValidDateValue(formValues[key]) : (formValues[key] ?? '');

                    return (
                      <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {label}
                        </label>
                        <input
                          type={isDateField ? 'date' : 'text'}
                          value={inputValue ?? ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className={`form-input ${isDateField ? 'mono' : ''}`}
                          placeholder={f.placeholder || ''}
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Tombol Aksi: Simpan Arsip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={isSaving || !activeChainStatus.allowed}
                onClick={handleSaveArchive}
                className="btn btn-primary"
                style={{
                  padding: '11px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSaving ? <RefreshCw size={15} className="animate-spin" /> : (isSaved ? <CheckCircle2 size={15} /> : <Save size={15} />)}
                <span>{isSaving ? 'Menyimpan...' : (isSaved ? 'Tersimpan' : 'Simpan Arsip')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: DASHBOARD STATUS NASKAH DINAS SIAP TERBIT */}
        <div className="lg:col-span-5" style={{
          background: 'rgba(17, 22, 31, 0.80)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Naskah Dinas Siap Terbit
              </span>
              <h2 className="heading-font" style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
                {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode}
              </h2>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              background: activeChainStatus.allowed ? '#FFFFFF' : 'rgba(255, 42, 42, 0.15)',
              border: activeChainStatus.allowed ? '1px solid #FFFFFF' : '1px solid rgba(255, 42, 42, 0.45)',
              color: activeChainStatus.allowed ? '#0B0E14' : '#FF2A2A'
            }}>
              {activeChainStatus.allowed ? '✓ Rantai Formil Sah' : '✕ Belum Memenuhi Syarat'}
            </span>
          </div>

          {/* Ringkasan Parameter */}
          <div style={{
            background: '#11161F',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.55)' }}>Nomor Naskah:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF', wordBreak: 'break-all' }}>
                {formValues.NOMOR_SURAT || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.55)' }}>Tanggal Surat:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                {formValues.TANGGAL_SURAT ? formatTanggalIndonesia(formValues.TANGGAL_SURAT) : '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Rujukan Laporan Polisi:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0' }}>
                {currentCase?.nomor_lp || currentCase?.no_lp || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Penyidik Penugasan:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0' }}>
                {currentCase?.penyidik_1_nama || currentCase?.penyidik_nama || '-'}
              </div>
            </div>
            {requiresSuspectTarget && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Subjek Tersangka:</div>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>
                  {((currentTemplate?.code === 'SPDP_MORE_1_TSK') || ((currentTemplate?.title || '').toUpperCase().includes('LEBIH DARI 1 TERSANGKA')))
                    ? 'OTOMATIS (MULTI-TERSANGKA)'
                    : (activeSuspect?.nama || activeSuspect?.nama_lengkap || '-')}
                </div>
              </div>
            )}
          </div>

          {/* Tombol Aksi Utama */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              disabled={!activeChainStatus.allowed}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
            >
              <Eye size={16} />
              <span>Pratinjau Hasil Dokumen</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={!activeChainStatus.allowed || isGenerating}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
            >
              {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isGenerating ? 'Memproses...' : 'Unduh .docx'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL POP-UP PRATINJAU DOKUMEN (OFFICIAL DOC PREVIEW ISOLASI) */}
      {isPreviewModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            width: '95vw',
            maxWidth: '1200px',
            height: '90vh',
            background: '#0B0E14',
            borderRadius: '18px',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#11161F'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye color="#FF2A2A" size={18} />
                <span className="heading-font" style={{ fontWeight: 800, fontSize: '14px', color: '#FFFFFF' }}>
                  Pratinjau Resmi: {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <X size={15} />
                <span>Tutup (Esc)</span>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <OfficialDocPreview
                key={`${currentCase?.id || 'case'}_${currentTemplate?.id || currentTemplate?.code || 'tpl'}_${selectedSuspectId || 'none'}`}
                selectedCase={currentCase}
                caseData={currentCase}
                template={currentTemplate}
                formValues={formValues}
                personnel={personnel}
                personnelList={personnel}
                activeSuspect={
                  requiresSuspectTarget
                    ? (caseSuspects.find(s => String(s.id) === String(selectedSuspectId)) || caseSuspects[0] || null)
                    : null
                }
                suspectsList={caseSuspects || []}
                onSaveArchive={handleSaveArchive}
                isSaved={isSaved}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
