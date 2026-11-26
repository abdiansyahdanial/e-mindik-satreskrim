import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSignature,
  FileText,
  Lock,
  Unlock,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Save,
  RefreshCw,
  Calendar,
  Users,
  Shield,
  Search,
  Layers,
  Info,
  Eye,
  X,
  UserCheck,
  ChevronRight,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import OfficialDocPreview from '../../components/OfficialDocPreview';
import { checkPrerequisite } from './mindikPrerequisites';
import {
  generateAndDownloadDocx,
  formatTanggalIndonesia,
  formatPangkatSingkat,
  addDaysToIsoDate,
  parseDateParts,
  formatJamPolri,
  normalizeSubjectRecord,
  deduplicateSubjectRecords,
  populateSubjectPrefixVariables,
  populateIndexedSubjectGroup,
  resolveChainedMindikContext,
  mergeChainedWithForm,
  extractArchivedDocNumberAndDate,
  toIsoDateString
} from '../../services/mindikGenerator';
import {
  MINDIK_PRESETS,
  MINDIK_CATEGORY_TABS,
  MINDIK_CODE_TO_CATEGORY
} from '../../constants/mindikPresets';
import {
  toCanonicalMindikCode,
  isValidOfficialDocNumber,
  resolveLatestArchiveDoc,
  getSubjectModeForTemplate
} from '../../constants/mindikChainRegistry';

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

  // --- STATE FORM GENERATOR & MODAL UI ---
  const [formValues, setFormValues] = useState({});
  const [noUrutInput, setNoUrutInput] = useState('');
  const [showOptionalSubjectPicker, setShowOptionalSubjectPicker] = useState(false);
  const [isCaseDetailModalOpen, setIsCaseDetailModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Refs anti race-condition & deduplikasi pemanggilan buildUniversalCaseContext
  const caseFetchSeqRef = useRef(0);
  const docsLoadedCaseIdRef = useRef('');
  const lastTemplateKeyRef = useRef('');
  const prevAutoTemplateKeyRef = useRef('');
  const lastAutoSelectTplKeyRef = useRef('');
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
    lastAutoSelectTplKeyRef.current = '';
    prevAutoTemplateKeyRef.current = '';
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
      KASAT_PANGKAT: formatPangkatSingkat(currentCase.kasat_pangkat || ''),
      KASAT_NRP: currentCase.kasat_nrp || '',
      KASAT_JABATAN: currentCase.kasat_jabatan || 'Kasat Reskrim',
      ATASAN_NAMA: currentCase.kasat_nama || '',
      ATASAN_PANGKAT: formatPangkatSingkat(currentCase.kasat_pangkat || ''),
      ATASAN_NRP: currentCase.kasat_nrp || '',
      ATASAN_JABATAN: currentCase.kasat_jabatan || 'Kasat Reskrim',
      PENYIDIK_NAMA: currentCase.penyidik_1_nama || '',
      PENYIDIK_PANGKAT: formatPangkatSingkat(currentCase.penyidik_1_pangkat || ''),
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
    const normKey = (item) => {
      const nik = String(item?.nik || item?.no_identitas || '').trim();
      const name = String(item?.nama || item?.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return {
        nik: nik && nik !== '-' ? nik.toLowerCase() : '',
        name
      };
    };

    const decorateCategory = (dedupedList, catKey, catLabel) =>
      dedupedList.map((norm, idx) => ({
        ...norm,
        _uid: `${catKey}:${norm.id || idx}:${norm.nama}`,
        _category: catKey,
        _categoryLabel: catLabel
      }));

    // 1. Pelapor / Korban
    const rawPelapor = [
      ...(Array.isArray(currentCase.pelapor_list) ? currentCase.pelapor_list : []),
      ...(Array.isArray(refs.pelapor_list) ? refs.pelapor_list : []),
      ...(Array.isArray(currentCase.victims) ? currentCase.victims : []),
      ...(Array.isArray(refs.victims) ? refs.victims : [])
    ];
    if (currentCase.nama_pelapor || currentCase.pelapor_name || currentCase.pelapor) {
      rawPelapor.push({
        nama: currentCase.nama_pelapor || currentCase.pelapor_name || currentCase.pelapor,
        alamat: currentCase.locus || ''
      });
    }

    // 2. Saksi
    const rawSaksi = [
      ...caseSuspects.filter(s => s && s.status === 'saksi'),
      ...(Array.isArray(currentCase.saksi_list) ? currentCase.saksi_list : []),
      ...(Array.isArray(refs.saksi_list) ? refs.saksi_list : []),
      ...(Array.isArray(currentCase.saksi) ? currentCase.saksi : [])
    ];

    // 3. Tersangka (prioritaskan record lengkap dari public.case_suspects)
    const rawTersangka = [
      ...caseSuspects.filter(s => s && (s.status === 'tersangka' || !s.status)),
      ...(Array.isArray(currentCase.tersangka_list) ? currentCase.tersangka_list : []),
      ...(Array.isArray(refs.tersangka_list) ? refs.tersangka_list : [])
    ];

    // 4. Terlapor (Calon Tersangka) — prioritaskan case_suspects + terlapor_list;
    //    gunakan legacy currentCase.person / terlapor_name HANYA jika data terstruktur kosong
    const structuredSuspectsForTerlapor = caseSuspects.filter(
      s => s && (s.nama || s.name) && s.status !== 'saksi' && s.status !== 'pelapor'
    );
    const rawTerlapor = [
      ...caseSuspects.filter(s => s && s.status === 'terlapor'),
      ...(Array.isArray(currentCase.terlapor_list) ? currentCase.terlapor_list : []),
      ...(Array.isArray(refs.terlapor_list) ? refs.terlapor_list : [])
    ];
    if (structuredSuspectsForTerlapor.length === 0 && rawTerlapor.length === 0) {
      if (currentCase.person && currentCase.person.nama && currentCase.person.status !== 'saksi' && currentCase.person.status !== 'pelapor') {
        rawTerlapor.push(currentCase.person);
      }
      const terlaporSingleName = currentCase.nama_terlapor || currentCase.terlapor_name || currentCase.terlapor || '';
      if (terlaporSingleName && terlaporSingleName !== '-') {
        rawTerlapor.push({
          nama: terlaporSingleName,
          alamat: currentCase.locus || '',
          status: 'terlapor'
        });
      }
    }

    // Jika orang yang sama ada di terlapor dan sudah ditetapkan sebagai tersangka di case_suspects,
    // gabungkan data non-kosongnya ke record tersangka dan hapus duplikatnya dari daftar terlapor.
    const mergedTersangkaWithTerlapor = deduplicateSubjectRecords(
      [
        ...rawTersangka,
        ...rawTerlapor.filter((tl) => {
          const tk = normKey(tl);
          return rawTersangka.some((ts) => {
            const sk = normKey(ts);
            return (tk.nik && sk.nik && tk.nik === sk.nik) || (tk.name && sk.name && tk.name === sk.name);
          });
        })
      ],
      'Tersangka'
    );

    const tskKeys = mergedTersangkaWithTerlapor.map(normKey);
    const filteredRawTerlaporOnly = rawTerlapor.filter((tl) => {
      const tk = normKey(tl);
      return !tskKeys.some((sk) =>
        (tk.nik && sk.nik && tk.nik === sk.nik) || (tk.name && sk.name && tk.name === sk.name)
      );
    });

    const pelapor = decorateCategory(deduplicateSubjectRecords(rawPelapor, 'Pelapor / Korban'), 'PELAPOR', 'Pelapor / Korban');
    const saksi = decorateCategory(deduplicateSubjectRecords(rawSaksi, 'Saksi'), 'SAKSI', 'Saksi');
    const terlapor = decorateCategory(deduplicateSubjectRecords(filteredRawTerlaporOnly, 'Terlapor (Calon Tsk)'), 'TERLAPOR', 'Terlapor (Calon Tsk)');
    const tersangka = decorateCategory(mergedTersangkaWithTerlapor, 'TERSANGKA', 'Tersangka');

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
    const selectedList = Array.isArray(nextSubjects) ? nextSubjects : [];
    const pool = [
      ...(Array.isArray(caseSuspects) ? caseSuspects : []),
      ...(Array.isArray(currentCase?.terlapor_list) ? currentCase.terlapor_list : []),
      ...(Array.isArray(currentCase?.references?.terlapor_list) ? currentCase.references.terlapor_list : []),
      ...(Array.isArray(currentCase?.tersangka_list) ? currentCase.tersangka_list : []),
      ...(Array.isArray(currentCase?.references?.tersangka_list) ? currentCase.references.tersangka_list : []),
      ...(currentCase?.person ? [currentCase.person] : [])
    ];

    const enrichSubj = (item) => {
      if (!item || typeof item !== 'object') return item;
      const itemId = item.id ? String(item.id).trim() : '';
      const itemName = String(item.nama || item.name || '').trim().toLowerCase();
      const matched = pool.find((cand) => {
        if (!cand || typeof cand !== 'object') return false;
        if (itemId && cand.id && String(cand.id).trim() === itemId) return true;
        const cName = String(cand.nama || cand.name || '').trim().toLowerCase();
        return Boolean(itemName && cName && cName === itemName);
      });
      if (!matched) return item;
      const merged = { ...matched };
      Object.keys(item).forEach((k) => {
        const v = item[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-') {
          merged[k] = v;
        }
      });
      return merged;
    };

    if (selectedList.length === 0) {
      setFormValues(prev => {
        const next = { ...prev };
        delete next.__SELECTED_SUBJECTS__;
        return next;
      });
      setIsSaved(false);
      return;
    }

    const enrichedRaw = selectedList.map(enrichSubj);
    const enrichedSubjects = deduplicateSubjectRecords(enrichedRaw, enrichedRaw[0]?._categoryLabel || 'Subjek')
      .map((norm, i) => ({
        ...enrichedRaw[i],
        ...norm
      }));
    if (enrichedSubjects.length === 0) return;
    const primary = enrichedSubjects[0];

    // Jika subjek punya id di caseSuspects, sinkronkan juga selectedSuspectId
    if (primary.id && caseSuspects.some(cs => String(cs.id) === String(primary.id))) {
      setSelectedSuspectId(primary.id);
    }

    const activeTplTitleUpper = String(currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    const isTerlaporTemplate = activeCanonicalCode.includes('TERLAPOR') || activeTplTitleUpper.includes('TERLAPOR');

    setFormValues(prev => {
      const next = { ...prev };
      next.__SELECTED_SUBJECTS__ = enrichedSubjects;

      // Isi penuh TERLAPOR_1..5_*, SUBJEK_1..5_*, dan array loop {#TERLAPOR} / {#SUBJEK}
      populateSubjectPrefixVariables(next, 'SUBJEK', enrichedSubjects, primary);
      populateSubjectPrefixVariables(next, primary._category || 'TERLAPOR', enrichedSubjects, primary);
      populateIndexedSubjectGroup(next, enrichedSubjects, ['TERLAPOR', 'SUBJEK'], pool);

      if (isTerlaporTemplate) {
        populateIndexedSubjectGroup(next, enrichedSubjects, ['TSK', 'TERSANGKA'], pool);
      }

      // Untuk surat penetapan tersangka / upaya paksa / SPDP yang memakai tag datar TERSANGKA_* atau NAMA_TERSANGKA..ALAMAT:
      if (isTerlaporTemplate || primary._category === 'TERLAPOR' || primary._category === 'TERSANGKA') {
        const normPrimary = normalizeSubjectRecord(primary, 0, primary._category || 'Terlapor') || primary;
        populateSubjectPrefixVariables(next, 'TERSANGKA', enrichedSubjects, normPrimary);
        populateSubjectPrefixVariables(next, 'TERLAPOR', enrichedSubjects, normPrimary);
        next.NAMA_TERSANGKA = normPrimary.nama || '';
        next.nama_tersangka = normPrimary.nama || '';
        next.NIK = normPrimary.nik || '-';
        next.nik = normPrimary.nik || '-';
        next.TEMPAT_LAHIR = normPrimary.tempat_lahir || '';
        next.tempat_lahir = normPrimary.tempat_lahir || '';
        next.TGL_LAHIR = normPrimary.tgl_lahir || '';
        next.tgl_lahir = normPrimary.tgl_lahir || '';
        next.TTL = normPrimary.ttl || '';
        next.ttl = normPrimary.ttl || '';
        next.UMUR = normPrimary.umur || '';
        next.umur = normPrimary.umur || '';
        next.JENIS_KELAMIN = normPrimary.jenis_kelamin || 'Laki-laki';
        next.jenis_kelamin = normPrimary.jenis_kelamin || 'Laki-laki';
        next.KEWARGANEGARAAN = normPrimary.kewarganegaraan || 'Indonesia';
        next.kewarganegaraan = normPrimary.kewarganegaraan || 'Indonesia';
        next.AGAMA = normPrimary.agama || 'Islam';
        next.agama = normPrimary.agama || 'Islam';
        next.PEKERJAAN = normPrimary.pekerjaan || '';
        next.pekerjaan = normPrimary.pekerjaan || '';
        next.PENDIDIKAN = normPrimary.pendidikan || '';
        next.pendidikan = normPrimary.pendidikan || '';
        next.STATUS_KAWIN = normPrimary.status_pernikahan || '';
        next.status_kawin = normPrimary.status_pernikahan || '';
        next.STATUS_PERNIKAHAN = normPrimary.status_pernikahan || '';
        next.status_pernikahan = normPrimary.status_pernikahan || '';
        next.ALAMAT = normPrimary.alamat || '';
        next.alamat = normPrimary.alamat || '';
        next.NO_HP = normPrimary.no_hp || '';
        next.no_hp = normPrimary.no_hp || '';
        if (normPrimary.nomor_sp_tap) next.NO_SP_TAP_TSK = normPrimary.nomor_sp_tap;
        if (normPrimary.tanggal_sp_tap) next.TGL_SP_TAP_TSK = normPrimary.tanggal_sp_tap;
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

  // Daftar Tim Penyidik Terwarisi untuk Modal "Tim Penyidik (N)"
  const inheritedTeamMembers = useMemo(() => {
    if (!currentCase) return [];
    const list = [];
    for (let i = 1; i <= 10; i++) {
      const nama = currentCase[`penyidik_${i}_nama`];
      if (nama) {
        list.push({
          no: i,
          nama,
          pangkat: currentCase[`penyidik_${i}_pangkat`] || '',
          nrp: currentCase[`penyidik_${i}_nrp`] || '',
          jabatan: currentCase[`penyidik_${i}_jabatan`] || (i === 1 ? 'Kanit' : 'Penyidik Pembantu')
        });
      }
    }
    if (list.length === 0 && Array.isArray(currentCase.investigators)) {
      currentCase.investigators.forEach((inv, idx) => {
        if (inv && inv.nama) {
          list.push({
            no: idx + 1,
            nama: inv.nama,
            pangkat: inv.pangkat || '',
            nrp: inv.nrp || '',
            jabatan: inv.jabatan || (idx === 0 ? 'Kanit' : 'Penyidik Pembantu')
          });
        }
      });
    }
    return list;
  }, [currentCase]);

  // Jumlah dokumen sah (nomor surat resmi valid tanpa placeholder '....')
  const validDocsCount = useMemo(() => {
    return (activeCaseDocs || []).filter((d) => isValidOfficialDocNumber(d?.doc_number)).length;
  }, [activeCaseDocs]);

  // Daftar Perkara tersaring oleh pencarian cepat di Command Strip
  const filteredCases = useMemo(() => {
    const q = (caseSearchQuery || '').trim().toLowerCase();
    if (!q) return cases;
    const matched = cases.filter((c) => {
      const lp = String(c.nomor_lp || c.no_lp || '').toLowerCase();
      const pel = String(c.pelapor || c.nama_pelapor || c.pelapor_name || '').toLowerCase();
      const tsk = String(c.tindak_pidana || c.crime_category || c.kasus || '').toLowerCase();
      return lp.includes(q) || pel.includes(q) || tsk.includes(q);
    });
    if (currentCase && !matched.some(c => c.id === currentCase.id)) {
      return [currentCase, ...matched];
    }
    return matched;
  }, [cases, caseSearchQuery, currentCase]);

  // Update nilai profil tersangka ke formValues jika suspect berganti (kecuali bila sudah ada pilihan subjek aktif)
  useEffect(() => {
    if (!activeSuspect) return;
    if (selectedTargetSubjectKeys.some(k => k !== '__NONE__')) return;
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
      // Hapus key generik surat aktif & tag biodata subjek dari konteks rantai agar tidak membocorkan data lama antar-template
      const cleanScalarChained = { ...(scalarChained || {}) };
      delete cleanScalarChained.NOMOR_SURAT;
      delete cleanScalarChained.nomor_surat;
      delete cleanScalarChained.NO_SURAT;
      delete cleanScalarChained.no_surat;
      delete cleanScalarChained.DOC_NO;
      delete cleanScalarChained.doc_no;
      delete cleanScalarChained.NOMOR_SURAT_HEADER;
      delete cleanScalarChained.nomor_surat_header;
      Object.keys(cleanScalarChained).forEach((ck) => {
        if (/^(TERLAPOR|TERSANGKA|TSK|SUBJEK)(_?\d+)?_|_(TERLAPOR|TERSANGKA|TSK|SUBJEK)(_?\d+)?$/i.test(ck)) {
          delete cleanScalarChained[ck];
        }
      });

      setFormValues(prev => {
        const isNewTplState = prev._activeTemplateKey !== tplCaseKey || isTplOrCaseChanged;
        // Gabungkan chainedCtx sebagai basis lalu pertahankan input non-empty dari prev
        // Tanpa mengonversi tanggal ISO menjadi teks Indonesia di state form UI
        const nextValues = mergeChainedWithForm(cleanScalarChained, prev, { formatDatesForDocx: false });
        nextValues._activeTemplateKey = tplCaseKey;
        if (isNewTplState && selectedTargetSubjectKeys.length === 0) {
          delete nextValues.__SELECTED_SUBJECTS__;
        }

        // Pastikan TANGGAL_SURAT selalu valid format ISO YYYY-MM-DD dan bersihkan stale header keys
        const existingArchivedDate = existingAnyDoc ? toIsoDateString(existingAnyDoc.tgl_surat) : '';
        const currentIsoDate = toIsoDateString(nextValues.TANGGAL_SURAT);
        const finalIsoDate = (isNewTplState && existingArchivedDate)
          ? existingArchivedDate
          : (currentIsoDate || existingArchivedDate || todayStr);

        nextValues.TANGGAL_SURAT = finalIsoDate;
        nextValues.tanggal_surat = finalIsoDate;
        nextValues.DOC_DATE = finalIsoDate;
        nextValues.doc_date = finalIsoDate;
        nextValues.TGL_SURAT = finalIsoDate;
        nextValues.tgl_surat = finalIsoDate;
        delete nextValues.TANGGAL_SURAT_HEADER;
        delete nextValues.tanggal_surat_header;
        delete nextValues.TANGGAL_NASKAH;
        delete nextValues.tanggal_naskah;
        delete nextValues.TANGGAL_DOKUMEN;
        delete nextValues.tanggal_dokumen;

        const isSprinKapTpl =
          canonicalCode === 'SPRIN_KAP' ||
          canonicalCode === 'SPRIN_KAP_DAN_BA' ||
          rawUpperCode === 'SPRIN_KAP' ||
          rawUpperCode === 'SPRIN_KAP_DAN_BA';
        const isBaKapTpl =
          isSprinKapTpl ||
          canonicalCode === 'BA_KAP' ||
          rawUpperCode === 'BA_KAP';

        if (isSprinKapTpl && finalIsoDate) {
          const autoMasaIso = addDaysToIsoDate(finalIsoDate, 1) || finalIsoDate;
          nextValues.MASA_BERLAKU = autoMasaIso;
          nextValues.masa_berlaku = autoMasaIso;
          nextValues.MASA_BERLAKU_KAP = autoMasaIso;
          nextValues.SPRIN_MASA_BERLAKU = autoMasaIso;
          nextValues.SPRIN_MASA_BERLAKU_KAP = autoMasaIso;
          nextValues.TANGGAL_BERLAKU = autoMasaIso;
        }

        if (isBaKapTpl) {
          if (isNewTplState || !toIsoDateString(nextValues.TANGGAL_BA_KAP)) {
            nextValues.TANGGAL_BA_KAP = finalIsoDate;
          }
          if (isNewTplState || !nextValues.JAM_BA_KAP_TIME) {
            nextValues.JAM_BA_KAP_TIME = '09:00';
          }
          if (isNewTplState || !toIsoDateString(nextValues.TANGGAL_PENANGKAPAN)) {
            nextValues.TANGGAL_PENANGKAPAN = finalIsoDate;
          }
          if (isNewTplState || !nextValues.JAM_PENANGKAPAN_TIME) {
            nextValues.JAM_PENANGKAPAN_TIME = '08:00';
          }
          if (!nextValues.TEMPAT_KAP || /^(\.{2,}|\u2026+)$/.test(String(nextValues.TEMPAT_KAP).trim())) {
            nextValues.TEMPAT_KAP = currentCase?.locus || 'Kab. Kolaka Timur';
          }
        }

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

  // Sinkronisasi No. Urut & Subjek Hukum Kontekstual saat template aktif berubah
  const activeCanonicalCode = useMemo(() => {
    if (!currentTemplate) return toCanonicalMindikCode(selectedTemplateCode);
    return toCanonicalMindikCode(
      currentTemplate.code || currentTemplate.template_code || selectedTemplateCode,
      currentTemplate.title || currentTemplate.name || ''
    );
  }, [currentTemplate, selectedTemplateCode]);

  const currentSubjectMode = useMemo(() => {
    return getSubjectModeForTemplate(activeCanonicalCode, currentTemplate?.title || currentTemplate?.name || '');
  }, [activeCanonicalCode, currentTemplate]);

  const isTerlaporTemplateActive = useMemo(() => {
    const rawCode = String(currentTemplate?.code || currentTemplate?.template_code || selectedTemplateCode || '').toUpperCase();
    const rawTitle = String(currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return (
      currentSubjectMode === 'terlapor' ||
      activeCanonicalCode === 'SPDP_TERLAPOR' ||
      rawCode.includes('TERLAPOR') ||
      rawTitle.includes('TERLAPOR')
    );
  }, [currentSubjectMode, activeCanonicalCode, currentTemplate, selectedTemplateCode]);

  const activeAutoSelectKey = `${currentCase?.id || ''}::${currentTemplate?.id || currentTemplate?.code || activeCanonicalCode}`;

  const ROMAN_MONTH_PATTERN = /^(.*\/)([^/]+)(\/(?:XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)(?:\/|$).*)$/i;

  const extractNoUrutFromDocNo = (docNo) => {
    const str = String(docNo || '').trim();
    if (!str) return '';
    const romanMatch = str.match(ROMAN_MONTH_PATTERN);
    if (romanMatch) {
      const seg = romanMatch[2].trim();
      if (/^(\.{3,}|\u2026+|\s*)$/.test(seg)) return '';
      if (/^\d+[A-Za-z0-9.-]*$/.test(seg)) return seg;
    }
    const shortSegMatch = str.match(/^(.*?\/)(\d{1,3}[A-Za-z]?)(\/.*)$/);
    if (shortSegMatch) {
      return shortSegMatch[2];
    }
    return '';
  };

  const replaceNoUrutInDocNo = (baseStr, nextSeq) => {
    const str = String(baseStr || '').trim();
    const seq = String(nextSeq || '').trim();
    if (!str) return seq;

    if (/\.{3,}|\u2026+/.test(str)) {
      return seq ? str.replace(/\.{3,}|\u2026+/, seq) : str;
    }
    if (/\/\s+\//.test(str)) {
      return seq ? str.replace(/\/\s+\//, `/${seq}/`) : str;
    }
    const romanMatch = str.match(ROMAN_MONTH_PATTERN);
    if (romanMatch) {
      return `${romanMatch[1]}${seq || '....'}${romanMatch[3]}`;
    }
    const shortSegMatch = str.match(/^(.*?\/)(\d{1,3}[A-Za-z]?)(\/.*)$/);
    if (shortSegMatch) {
      return `${shortSegMatch[1]}${seq || '....'}${shortSegMatch[3]}`;
    }
    return str;
  };

  // Pola default Nomor Surat untuk Smart Input "No. Urut"
  const activeNumberPattern = useMemo(() => {
    const preset = MINDIK_PRESETS[activeCanonicalCode] || [];
    return preset.find(f => f.tag === 'NOMOR_SURAT')?.default || '';
  }, [activeCanonicalCode]);

  const supportsNoUrutHelper = useMemo(() => {
    const currentNo = String(formValues.NOMOR_SURAT || '');
    return (
      /(\.{3,}|\u2026+|\/\s+\/)/.test(activeNumberPattern) ||
      /(\.{3,}|\u2026+|\/\s+\/)/.test(currentNo) ||
      ROMAN_MONTH_PATTERN.test(currentNo) ||
      /^(.*?\/)\d{1,3}[A-Za-z]?\/.*$/.test(currentNo)
    );
  }, [activeNumberPattern, formValues.NOMOR_SURAT]);

  // Reset & sinkronkan No. Urut + filter kategori + auto-select subjek relevan saat template/perkara aktif berubah
  useEffect(() => {
    const isTplOrCaseChanged = prevAutoTemplateKeyRef.current !== activeAutoSelectKey;
    if (isTplOrCaseChanged) {
      prevAutoTemplateKeyRef.current = activeAutoSelectKey;
      lastAutoSelectTplKeyRef.current = '';
      setNoUrutInput(extractNoUrutFromDocNo(formValues.NOMOR_SURAT));
      setShowOptionalSubjectPicker(false);
      if (isTerlaporTemplateActive || currentSubjectMode === 'terlapor_to_tersangka') {
        setSelectedSubjectCategory('TERLAPOR');
      } else if (currentSubjectMode === 'tersangka') {
        setSelectedSubjectCategory('TERSANGKA');
      } else if (currentSubjectMode === 'saksi') {
        setSelectedSubjectCategory('SAKSI');
      } else if (currentSubjectMode === 'pelapor_korban') {
        setSelectedSubjectCategory('PELAPOR');
      } else {
        setSelectedSubjectCategory('ALL');
      }
    }

    if (!currentCase || !currentTemplate) return;

    const shouldAutoSelect =
      lastAutoSelectTplKeyRef.current !== activeAutoSelectKey &&
      (isTplOrCaseChanged || selectedTargetSubjectKeys.length === 0);

    if (!shouldAutoSelect) return;

    let poolTargets = [];
    if (isTerlaporTemplateActive || currentSubjectMode === 'terlapor') {
      poolTargets = allCaseSubjects.terlapor.length > 0 ? allCaseSubjects.terlapor : allCaseSubjects.tersangka;
    } else if (currentSubjectMode === 'terlapor_to_tersangka') {
      poolTargets = allCaseSubjects.terlapor.length > 0 ? allCaseSubjects.terlapor : allCaseSubjects.tersangka;
    } else if (currentSubjectMode === 'tersangka') {
      poolTargets = allCaseSubjects.tersangka.length > 0 ? allCaseSubjects.tersangka : allCaseSubjects.terlapor;
    } else if (currentSubjectMode === 'saksi') {
      poolTargets = allCaseSubjects.saksi;
    } else if (currentSubjectMode === 'pelapor_korban') {
      poolTargets = allCaseSubjects.pelapor;
    }

    if (poolTargets.length > 0) {
      const tplText = `${currentTemplate?.code || currentTemplate?.template_code || ''} ${currentTemplate?.title || currentTemplate?.name || ''}`;
      const isMultiSubjectTpl = /MORE_1|LEBIH_1|LEBIH_DARI_1|KOLEKTIF/i.test(tplText);
      const chosenTargets = isMultiSubjectTpl ? poolTargets : poolTargets.slice(0, 1);

      lastAutoSelectTplKeyRef.current = activeAutoSelectKey;
      setSelectedTargetSubjectKeys(chosenTargets.map(s => s._uid));
      applyUniversalSelectedSubjects(chosenTargets);
    } else if (isTplOrCaseChanged && selectedTargetSubjectKeys.length > 0) {
      setSelectedTargetSubjectKeys([]);
      applyUniversalSelectedSubjects([]);
    }
  }, [activeAutoSelectKey, currentCase, currentTemplate, currentSubjectMode, isTerlaporTemplateActive, allCaseSubjects, selectedTargetSubjectKeys.length]);

  // Sinkronkan No. Urut saat NOMOR_SURAT berubah dari load arsip / ganti template
  useEffect(() => {
    const extracted = extractNoUrutFromDocNo(formValues.NOMOR_SURAT);
    setNoUrutInput((prev) => (prev === extracted ? prev : extracted));
  }, [formValues.NOMOR_SURAT]);

  // Sisipkan No. Urut secara real-time menggantikan placeholder '....' atau segmen nomor urut eksisting di Nomor Surat
  const handleNoUrutChange = (rawSeq) => {
    setNoUrutInput(rawSeq);
    const currentNo = String(formValues.NOMOR_SURAT || '').trim();
    const baseStr = currentNo || activeNumberPattern;
    if (!baseStr) return;

    const cleanTrimmed = String(rawSeq || '').trim();
    if (!cleanTrimmed && /(\.{3,}|\u2026+|\/\s+\/)/.test(activeNumberPattern) && currentNo === replaceNoUrutInDocNo(activeNumberPattern, noUrutInput)) {
      handleInputChange('NOMOR_SURAT', activeNumberPattern, { skipNoUrutSync: true });
      return;
    }

    const updated = replaceNoUrutInDocNo(baseStr, cleanTrimmed);
    handleInputChange('NOMOR_SURAT', updated, { skipNoUrutSync: true });
  };

  // Jalur 7 Tahap Interactive Mindik Pipeline Stepper
  const pipelineSteps = useMemo(() => {
    const hasValidLp = Boolean(currentCase && (currentCase.nomor_lp || currentCase.no_lp));
    const sprinSidikDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPRIN_SIDIK', 'SPRIN_SIDIK_MORE_5'], false);
    const spGasDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPGAS_SIDIK', 'SPGAS_SIDIK_MORE_5'], false);
    const spdpDoc = resolveLatestArchiveDoc(activeCaseDocs, ['SPDP_TSK', 'SPDP_MORE_1_TSK', 'SPDP_TERLAPOR', 'SPDP_LIDIK_ANON', 'SPDP_KORPORASI', 'PENGIRIMAN_KEMBALI_SPDP_P20'], false);
    const tapTskDoc = resolveLatestArchiveDoc(activeCaseDocs, ['TAP_TSK'], false);
    const upayaPaksaDoc = resolveLatestArchiveDoc(activeCaseDocs, [
      'SPRIN_KAP_DAN_BA', 'SPGAS_KAP', 'SPRIN_BAWA_LEWAT_KAP', 'BA_HAK_TSK', 'SPRIN_LEPAS_KAP_DAN_BA',
      'SPRIN_HAN_DAN_BA', 'MINTA_PANJANG_HAN_40_KN', 'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
      'MINTA_PANJANG_HAN_30_KPN1', 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
      'MINTA_PANJANG_HAN_30_KPN2', 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA'
    ], false);
    const berkasDoc = resolveLatestArchiveDoc(activeCaseDocs, [
      'SAMPUL_BERKAS_PERKARA', 'PENGANTAR_BP_TAHAP1', 'TANDA_TERIMA_TAHAP1',
      'PENGANTAR_BP_KEMBALI_P19', 'TANDA_TERIMA_KEMBALI_P19', 'PENGANTAR_TAHAP2'
    ], false);

    const hasSprinSidik = Boolean(sprinSidikDoc && isValidOfficialDocNumber(sprinSidikDoc.doc_number));
    const hasSpGas = Boolean(spGasDoc && isValidOfficialDocNumber(spGasDoc.doc_number));
    const hasSpdp = Boolean(spdpDoc && isValidOfficialDocNumber(spdpDoc.doc_number));
    const hasTapTsk = Boolean(tapTskDoc && isValidOfficialDocNumber(tapTskDoc.doc_number));
    const hasUpayaPaksa = Boolean(upayaPaksaDoc && isValidOfficialDocNumber(upayaPaksaDoc.doc_number));
    const hasBerkas = Boolean(berkasDoc && isValidOfficialDocNumber(berkasDoc.doc_number));

    const activeCat = MINDIK_CODE_TO_CATEGORY[activeCanonicalCode] || '';

    return [
      {
        num: 1,
        label: '1. LP',
        targetCategory: 'ALL',
        done: hasValidLp,
        unlocked: Boolean(currentCase),
        active: false,
        docNumber: currentCase?.nomor_lp || currentCase?.no_lp || '',
        docDate: currentCase?.tanggal_lp || currentCase?.sprin_date || ''
      },
      {
        num: 2,
        label: '2. Sprin Sidik',
        targetCategory: 'SP_SIDIK',
        done: hasSprinSidik,
        unlocked: hasValidLp,
        active: activeCanonicalCode.startsWith('SPRIN_SIDIK'),
        docNumber: sprinSidikDoc?.doc_number || '',
        docDate: sprinSidikDoc?.tgl_surat || ''
      },
      {
        num: 3,
        label: '3. SP Gas',
        targetCategory: 'SP_SIDIK',
        done: hasSpGas,
        unlocked: hasSprinSidik,
        active: activeCanonicalCode.startsWith('SPGAS_SIDIK'),
        docNumber: spGasDoc?.doc_number || '',
        docDate: spGasDoc?.tgl_surat || ''
      },
      {
        num: 4,
        label: '4. SPDP',
        targetCategory: 'SPDP',
        done: hasSpdp,
        unlocked: hasSprinSidik,
        active: activeCat === 'SPDP',
        docNumber: spdpDoc?.doc_number || '',
        docDate: spdpDoc?.tgl_surat || ''
      },
      {
        num: 5,
        label: '5. Tap Tsk',
        targetCategory: 'TERSANGKA',
        done: hasTapTsk,
        unlocked: hasSprinSidik,
        active: activeCanonicalCode === 'TAP_TSK' || activeCat === 'TERSANGKA',
        docNumber: tapTskDoc?.doc_number || '',
        docDate: tapTskDoc?.tgl_surat || ''
      },
      {
        num: 6,
        label: '6. Upaya Paksa',
        targetCategory: 'PENAHANAN',
        done: hasUpayaPaksa,
        unlocked: hasSprinSidik && hasTapTsk,
        active: activeCat === 'PENAHANAN',
        docNumber: upayaPaksaDoc?.doc_number || '',
        docDate: upayaPaksaDoc?.tgl_surat || ''
      },
      {
        num: 7,
        label: '7. Berkas',
        targetCategory: 'BERKAS_PERKARA',
        done: hasBerkas,
        unlocked: hasSprinSidik && hasSpdp && hasTapTsk,
        active: activeCat === 'BERKAS_PERKARA',
        docNumber: berkasDoc?.doc_number || '',
        docDate: berkasDoc?.tgl_surat || ''
      }
    ];
  }, [currentCase, activeCaseDocs, activeCanonicalCode]);

  // Listener tombol Esc untuk menutup modal preview & modal info
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isPreviewModalOpen) setIsPreviewModalOpen(false);
        if (isCaseDetailModalOpen) setIsCaseDetailModalOpen(false);
        if (isTeamModalOpen) setIsTeamModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewModalOpen, isCaseDetailModalOpen, isTeamModalOpen]);

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
  const handleInputChange = (key, value, opts = {}) => {
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
      if (['TANGGAL_SURAT', 'DOC_DATE', 'TGL_SURAT', 'tanggal_surat', 'doc_date', 'tgl_surat'].includes(key)) {
        const syncedDate = toIsoDateString(value) || value || '';
        const prevDate = prev.TANGGAL_SURAT;
        next.TANGGAL_SURAT = syncedDate;
        next.tanggal_surat = syncedDate;
        next.DOC_DATE = syncedDate;
        next.doc_date = syncedDate;
        next.TGL_SURAT = syncedDate;
        next.tgl_surat = syncedDate;
        delete next.TANGGAL_SURAT_HEADER;
        delete next.tanggal_surat_header;
        delete next.TANGGAL_NASKAH;
        delete next.tanggal_naskah;
        delete next.TANGGAL_DOKUMEN;
        delete next.tanggal_dokumen;

        const rawCodeNow = (currentTemplate?.code || currentTemplate?.template_code || '').toUpperCase().trim();
        const isSprinKapNow =
          activeCanonicalCode === 'SPRIN_KAP' ||
          activeCanonicalCode === 'SPRIN_KAP_DAN_BA' ||
          rawCodeNow === 'SPRIN_KAP' ||
          rawCodeNow === 'SPRIN_KAP_DAN_BA';
        const isBaKapNow = isSprinKapNow || activeCanonicalCode === 'BA_KAP' || rawCodeNow === 'BA_KAP';

        if (isSprinKapNow && syncedDate) {
          const autoMasaIso = addDaysToIsoDate(syncedDate, 1) || syncedDate;
          next.MASA_BERLAKU = autoMasaIso;
          next.masa_berlaku = autoMasaIso;
          next.MASA_BERLAKU_KAP = autoMasaIso;
          next.SPRIN_MASA_BERLAKU = autoMasaIso;
          next.SPRIN_MASA_BERLAKU_KAP = autoMasaIso;
          next.TANGGAL_BERLAKU = autoMasaIso;
        }
        if (isBaKapNow && syncedDate) {
          if (!next.TANGGAL_BA_KAP || next.TANGGAL_BA_KAP === prevDate) {
            next.TANGGAL_BA_KAP = syncedDate;
          }
          if (!next.TANGGAL_PENANGKAPAN || next.TANGGAL_PENANGKAPAN === prevDate) {
            next.TANGGAL_PENANGKAPAN = syncedDate;
          }
        }
      }
      return next;
    });
    if (key === 'NOMOR_SURAT' && !opts?.skipNoUrutSync) {
      setNoUrutInput(extractNoUrutFromDocNo(value));
    }
    setIsSaved(false);
  };

  // Simpan Arsip Dokumen ke Supabase `documents`
  const handleSaveArchive = async () => {
    if (!currentCase || !currentTemplate) return false;
    const docNoCandidate = formValues.NOMOR_SURAT || formValues.doc_no || formValues.NO_SURAT || '';
    if (!isValidOfficialDocNumber(docNoCandidate)) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Nomor Surat Resmi belum valid atau masih mengandung placeholder "....". Isi No. Urut / Nomor Surat sebelum menyimpan ke arsip.'
      });
      return false;
    }

    setIsSaving(true);
    setFeedbackNotice(null);

    try {
      const docNo = docNoCandidate;
      const rawDocDate = formValues.TANGGAL_SURAT || formValues.doc_date || new Date().toISOString().split('T')[0];
      const docDate = toIsoDateString(rawDocDate) || new Date().toISOString().split('T')[0];
      const tplCode = currentTemplate.code || currentTemplate.template_code || 'MINDIK';
      const tplTitle = currentTemplate.title || currentTemplate.name || 'Dokumen Mindik';
      const canonicalCode = toCanonicalMindikCode(tplCode, tplTitle);

      // =========================================================
      // AUTO-PROMOTE & RESOLUSI SUBJEK TARGET PER-DOKUMEN (INDIVIDUAL)
      // =========================================================
      const isTapTsk = canonicalCode === 'TAP_TSK';
      const isSprinKapDoc = canonicalCode === 'SPRIN_KAP_DAN_BA' || canonicalCode === 'SPRIN_KAP' || canonicalCode === 'SP_KAP';
      const isSprinHanDoc = canonicalCode === 'SPRIN_HAN_DAN_BA' || canonicalCode === 'SPRIN_HAN' || canonicalCode === 'SP_HAN';
      const isIndividualSuspectDoc =
        isTapTsk ||
        isSprinKapDoc ||
        isSprinHanDoc ||
        canonicalCode.startsWith('PEMBERITAHUAN_TAP_TSK') ||
        canonicalCode.startsWith('SPGL_TSK') ||
        canonicalCode.includes('KAP') ||
        canonicalCode.includes('HAN') ||
        canonicalCode.includes('BAWA_TSK') ||
        requiresSuspectTarget;

      const selectedTargetsForDoc = selectedTargetSubjects.length > 0
        ? selectedTargetSubjects
        : (activeSuspect ? [activeSuspect] : []);

      const resolvedTargetSuspectIds = [];
      const resolvedTargetSuspectNames = [];
      let promotedOrUpdatedTargets = [];

      if (isTapTsk) {
        try {
          const cleanDate = docDate;
          const targetSubjectsToPromote = selectedTargetsForDoc;

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
              resolvedTargetSuspectIds.push(existingRow.id);
              resolvedTargetSuspectNames.push(existingRow.nama || subj.nama);
              promotedOrUpdatedTargets.push({ ...existingRow, nama: existingRow.nama || subj.nama });
            } else {
              // Promosikan Terlapor (Calon Tersangka) baru ke tabel case_suspects dengan status 'tersangka'
              const { data: insertedRows } = await supabase.from('case_suspects').insert([{
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
              }]).select();
              const inserted = Array.isArray(insertedRows) && insertedRows[0] ? insertedRows[0] : subj;
              if (inserted?.id) resolvedTargetSuspectIds.push(inserted.id);
              resolvedTargetSuspectNames.push(inserted?.nama || subj.nama);
              promotedOrUpdatedTargets.push(inserted);
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

          // Sinkronkan hanya entry tersangka yang dipromosikan di currentCase.references.tersangka_list
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
      } else if (isIndividualSuspectDoc) {
        // Sinkronisasi kolom per-tersangka (HANYA baris tersangka terpilih pada surat upaya paksa / panggilan)
        for (const subj of selectedTargetsForDoc) {
          if (!subj || !subj.nama) continue;
          const existingRow = caseSuspects.find(
            (cs) => (subj.id && String(cs.id) === String(subj.id)) ||
              (cs.nama && cs.nama.trim().toLowerCase() === subj.nama.trim().toLowerCase())
          );
          if (existingRow?.id) {
            resolvedTargetSuspectIds.push(existingRow.id);
            resolvedTargetSuspectNames.push(existingRow.nama || subj.nama);
            promotedOrUpdatedTargets.push({ ...existingRow, nama: existingRow.nama || subj.nama });
            if (isSprinKapDoc && docNo !== '-') {
              await supabase
                .from('case_suspects')
                .update({ no_sprin_kap: docNo })
                .eq('id', existingRow.id);
            } else if (isSprinHanDoc && docNo !== '-') {
              await supabase
                .from('case_suspects')
                .update({ no_sprin_han: docNo })
                .eq('id', existingRow.id);
            }
          } else {
            if (subj.id) resolvedTargetSuspectIds.push(subj.id);
            resolvedTargetSuspectNames.push(subj.nama);
            promotedOrUpdatedTargets.push(subj);
          }
        }
        if ((isSprinKapDoc || isSprinHanDoc) && resolvedTargetSuspectIds.length > 0) {
          const { data: refreshedSuspects } = await supabase
            .from('case_suspects')
            .select('*')
            .eq('case_id', currentCase.id)
            .order('created_at', { ascending: true });
          if (Array.isArray(refreshedSuspects)) {
            setCaseSuspects(refreshedSuspects);
          }
        }
      }
      // =========================================================

      const chainSnapshot = {};
      (chainOverviewStatus?.badges || []).forEach((b) => {
        if (b.ready && b.value) {
          chainSnapshot[b.key] = b.value;
        }
      });

      const primaryTargetObj = promotedOrUpdatedTargets[0] || selectedTargetsForDoc[0] || activeSuspect || null;
      const targetSuspectIdFinal = resolvedTargetSuspectIds[0] || primaryTargetObj?.id || null;
      const targetSuspectNameFinal =
        resolvedTargetSuspectNames[0] ||
        primaryTargetObj?.nama ||
        formValues.TERSANGKA_NAMA ||
        formValues.SUBJEK_NAMA ||
        formValues.NAMA_TERSANGKA ||
        '';
      const targetSuspectIdsFinal = resolvedTargetSuspectIds.length > 0
        ? resolvedTargetSuspectIds
        : (targetSuspectIdFinal ? [targetSuspectIdFinal] : []);

      const suspectSnapshot = isIndividualSuspectDoc
        ? (promotedOrUpdatedTargets.length > 0 ? promotedOrUpdatedTargets : (primaryTargetObj ? [primaryTargetObj] : null))
        : ((caseSuspects && caseSuspects.length > 0)
            ? caseSuspects
            : (activeSuspect ? [activeSuspect] : null));

      const {
        _activeTemplateKey: _omitTplKey,
        __SELECTED_SUBJECTS__: _omitSelSubj,
        TANGGAL_SURAT_HEADER: _omitHdr1,
        tanggal_surat_header: _omitHdr2,
        ...cleanFormValuesForMeta
      } = formValues;

      const dbDocumentPayload = {
        id: crypto.randomUUID(),
        case_id: String(currentCase.id),
        template_id: currentTemplate.id ? String(currentTemplate.id) : null,
        template_code: canonicalCode,
        doc_title: tplTitle,
        doc_number: docNo,
        meta_values: {
          ...cleanFormValuesForMeta,
          NOMOR_SURAT: docNo,
          TANGGAL_SURAT: docDate,
          tanggal_surat: docDate,
          DOC_DATE: docDate,
          doc_date: docDate,
          TGL_SURAT: docDate,
          tgl_surat: docDate,
          nomor_lp: currentCase.nomor_lp || currentCase.no_lp || '',
          canonical_code: canonicalCode,
          original_template_code: tplCode,
          ...(isIndividualSuspectDoc ? {
            target_suspect_id: targetSuspectIdFinal,
            target_suspect_name: targetSuspectNameFinal,
            target_suspect_ids: targetSuspectIdsFinal
          } : {}),
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
      return true;
    } catch (err) {
      console.error('[MindikGeneratorView] Gagal menyimpan arsip:', err);
      setFeedbackNotice({
        type: 'error',
        message: `Gagal menyimpan dokumen: ${err.message || 'Terjadi kesalahan sistem.'}`
      });
      return false;
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
    if (!isValidOfficialDocNumber(formValues.NOMOR_SURAT) || !formValues.TANGGAL_SURAT) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Lengkapi Nomor Surat resmi (tanpa placeholder "....") dan Tanggal Surat sebelum menyimpan atau mengunduh .docx.'
      });
      return;
    }

    setIsGenerating(true);
    setFeedbackNotice(null);

    try {
      // 1. Pastikan arsip tersimpan bila belum disimpan (tidak pernah menimpa arsip dengan nomor '....')
      if (!isSaved) {
        const savedOk = await handleSaveArchive();
        if (!savedOk) return;
      }

      // 2. Generate dan Unduh (kirim docDate eksplisit dari formValues.TANGGAL_SURAT terbaru)
      const activeDocDate = toIsoDateString(formValues.TANGGAL_SURAT || formValues.DOC_DATE || formValues.TGL_SURAT)
        || formValues.TANGGAL_SURAT
        || '';
      await generateAndDownloadDocx({
        template: currentTemplate,
        activeCase: currentCase,
        activeSuspect,
        suspectsList: caseSuspects,
        formValues: {
          ...formValues,
          TANGGAL_SURAT: activeDocDate,
          tanggal_surat: activeDocDate,
          DOC_DATE: activeDocDate,
          doc_date: activeDocDate,
          TGL_SURAT: activeDocDate,
          tgl_surat: activeDocDate
        },
        docDate: activeDocDate,
        personnelList: personnel
      });

      setFeedbackNotice({
        type: 'success',
        message: `Arsip berhasil disimpan & berkas .docx terunduh.`
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

  const hasValidDocNo = isValidOfficialDocNumber(formValues.NOMOR_SURAT);
  const hasValidDocDate = Boolean(formValues.TANGGAL_SURAT);
  const canSaveOrDownload = Boolean(activeChainStatus.allowed && hasValidDocNo && hasValidDocDate);
  const actionDisabledTooltip = !activeChainStatus.allowed
    ? (activeChainStatus.reason || 'Syarat formil KUHAP belum terpenuhi.')
    : !hasValidDocNo
      ? 'Lengkapi Nomor Surat resmi (tidak boleh mengandung ....).'
      : !hasValidDocDate
        ? 'Pilih Tanggal Surat terlebih dahulu.'
        : '';

  return (
    <div
      className="mindik-generator-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minHeight: '100%',
        padding: '18px 22px 28px',
        background: '#0B0E14',
        color: '#FFFFFF'
      }}
    >
      {/* --- HEADER KOMPAK & AKSES ADMIN --- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #161D2A 0%, #11161F 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        borderLeft: '3px solid #FF2A2A'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: '#FF2A2A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255, 42, 42, 0.35)',
            flexShrink: 0
          }}>
            <FileSignature size={20} color="#FFFFFF" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="heading-font" style={{ fontSize: '15.5px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                GENERATOR MINDIK PRO-JUSTITIA
              </h2>
              <span style={{
                background: 'rgba(255, 42, 42, 0.14)',
                color: '#FF3B3B',
                border: '1px solid rgba(255, 42, 42, 0.45)',
                padding: '1px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.05em'
              }}>
                ISOLASI LP AKTIF
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
              Administrasi Penyidikan terisolasi per Laporan Polisi dengan mesin rantai formil KUHAP.
            </p>
          </div>
        </div>

        {isSuperAdmin && onOpenTemplateStudio && (
          <button
            type="button"
            onClick={onOpenTemplateStudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#11161F',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Layers size={14} color="#FF2A2A" />
            <span>Kelola Template Studio</span>
          </button>
        )}
      </div>

      {/* --- FEEDBACK NOTICE BANNER --- */}
      {feedbackNotice && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '9px',
          fontSize: '12.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: feedbackNotice.type === 'success'
            ? 'rgba(16, 185, 129, 0.12)'
            : (feedbackNotice.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 42, 42, 0.16)'),
          border: `1px solid ${feedbackNotice.type === 'success'
            ? 'rgba(16, 185, 129, 0.45)'
            : (feedbackNotice.type === 'warning' ? 'rgba(245, 158, 11, 0.45)' : '#FF2A2A')}`,
          color: feedbackNotice.type === 'success'
            ? '#FFFFFF'
            : (feedbackNotice.type === 'warning' ? '#FDE68A' : '#FCA5A5')
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedbackNotice.type === 'success' && <CheckCircle2 size={16} color="#10B981" />}
            {feedbackNotice.type === 'warning' && <AlertTriangle size={16} color="#F59E0B" />}
            {feedbackNotice.type === 'error' && <AlertCircle size={16} color="#FF2A2A" />}
            <span>{feedbackNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* --- 1. COMMAND STRIP BARIS ATAS (1 BARIS PADAT) --- */}
      <div style={{
        background: '#11161F',
        borderRadius: '11px',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        padding: '10px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Kiri: Quick Search + Dropdown Pilih LP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 360px', minWidth: 0 }}>
          <div style={{ position: 'relative', width: '165px', flexShrink: 0 }}>
            <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari LP / Pelapor..."
              value={caseSearchQuery ?? ''}
              onChange={(e) => setCaseSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '28px',
                paddingRight: '8px',
                fontSize: '12px',
                background: '#0B0E14',
                borderColor: 'rgba(148, 163, 184, 0.22)',
                color: '#FFFFFF'
              }}
            />
          </div>

          <select
            value={selectedCaseId ?? ''}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="form-select"
            style={{
              flex: 1,
              minWidth: '200px',
              height: '34px',
              background: '#0B0E14',
              borderColor: 'rgba(148, 163, 184, 0.24)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12.5px',
              padding: '0 10px'
            }}
          >
            {filteredCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomor_lp || c.no_lp || `Perkara #${String(c.id).substring(0, 8)}`} — {c.crime_category || c.kasus || 'Tindak Pidana'}
              </option>
            ))}
          </select>
        </div>

        {/* Tengah: Ringkasan 1 Baris */}
        {currentCase && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            fontSize: '11.5px',
            color: '#CBD5E1',
            padding: '5px 12px',
            borderRadius: '8px',
            background: '#0B0E14',
            border: '1px solid rgba(148, 163, 184, 0.14)'
          }}>
            <span>
              <strong style={{ color: '#94A3B8', fontWeight: 600 }}>Pelapor:</strong>{' '}
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                {currentCase.pelapor || currentCase.nama_pelapor || currentCase.pelapor_name || '-'}
              </span>
            </span>
            <span style={{ color: 'rgba(148, 163, 184, 0.3)' }}>|</span>
            <span>
              <strong style={{ color: '#94A3B8', fontWeight: 600 }}>Tgl LP:</strong>{' '}
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                {formatTanggalIndonesia(currentCase.tanggal_lp || currentCase.sprin_date) || '-'}
              </span>
            </span>
            <span style={{ color: 'rgba(148, 163, 184, 0.3)' }}>|</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: validDocsCount > 0 ? '#10B981' : '#94A3B8',
              fontWeight: 700
            }}>
              <CheckCircle2 size={13} color={validDocsCount > 0 ? '#10B981' : '#64748B'} />
              {isLoadingDocs ? 'Memuat...' : `${validDocsCount} Dokumen Sah`}
            </span>
          </div>
        )}

        {/* Kanan: 2 Tombol Popup Detail Perkara & Tim Penyidik */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIsCaseDetailModalOpen(true)}
            disabled={!currentCase}
            style={{
              height: '34px',
              padding: '0 11px',
              borderRadius: '8px',
              background: '#161D2A',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: currentCase ? 'pointer' : 'not-allowed'
            }}
          >
            <Briefcase size={13} color="#FF2A2A" />
            <span>Detail Perkara</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            disabled={!currentCase}
            style={{
              height: '34px',
              padding: '0 11px',
              borderRadius: '8px',
              background: '#161D2A',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: currentCase ? 'pointer' : 'not-allowed'
            }}
          >
            <Users size={13} color="#FF2A2A" />
            <span>Tim Penyidik ({inheritedTeamMembers.length})</span>
          </button>
        </div>
      </div>

      {/* --- 2. INTERACTIVE MINDIK PIPELINE STEPPER --- */}
      <div style={{
        background: '#11161F',
        borderRadius: '11px',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Shield size={14} color="#FF2A2A" />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#CBD5E1', textTransform: 'uppercase' }}>
              Alur Rantai Formil Mindik (KUHAP)
            </span>
          </div>
          <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
            Klik tahap untuk menyaring daftar template di kolom kiri
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {pipelineSteps.map((step, idx) => {
            const tooltipText = step.done
              ? `${step.label}: ${step.docNumber}${step.docDate ? ` (${formatTanggalIndonesia(step.docDate)})` : ''}`
              : step.unlocked
                ? `${step.label} — Prasyarat terpenuhi, siap diterbitkan`
                : `${step.label} — Terkunci (dokumen prasyarat belum terarsip sah)`;

            const borderColor = step.active
              ? '#FF2A2A'
              : step.done
                ? 'rgba(16, 185, 129, 0.48)'
                : step.unlocked
                  ? 'rgba(148, 163, 184, 0.28)'
                  : 'rgba(148, 163, 184, 0.12)';

            const bgColor = step.active
              ? 'rgba(255, 42, 42, 0.16)'
              : step.done
                ? 'rgba(16, 185, 129, 0.10)'
                : step.unlocked
                  ? '#161D2A'
                  : 'rgba(11, 14, 20, 0.7)';

            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  title={tooltipText}
                  onClick={() => setSelectedCategory(step.targetCategory)}
                  style={{
                    flex: '1 0 auto',
                    minWidth: '116px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: step.active || step.done || step.unlocked ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 150ms ease, background 150ms ease'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {step.label}
                    </div>
                    <div className="mono" style={{
                      fontSize: '9.5px',
                      color: step.done ? '#10B981' : (step.active ? '#FCA5A5' : '#94A3B8'),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '110px'
                    }}>
                      {step.done ? (step.docNumber || 'Sah') : (step.unlocked ? 'Siap' : 'Terkunci')}
                    </div>
                  </div>

                  {step.done ? (
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={11} color="#10B981" />
                    </span>
                  ) : !step.unlocked ? (
                    <Lock size={12} color="#64748B" style={{ flexShrink: 0 }} />
                  ) : (
                    <Unlock size={12} color={step.active ? '#FF2A2A' : '#CBD5E1'} style={{ flexShrink: 0 }} />
                  )}
                </button>

                {idx < pipelineSteps.length - 1 && (
                  <ChevronRight size={14} color="rgba(148, 163, 184, 0.4)" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* --- 3. WORKSPACE 2 KOLOM (KIRI ~35% KATALOG, KANAN ~65% FORM AKTIF + STICKY FOOTER) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* KOLOM KIRI (lg:col-span-4): KATALOG FORMAT MINDIK */}
        <div
          className="lg:col-span-4"
          style={{
            background: '#11161F',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <FileText size={15} color="#FF2A2A" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                KATALOG MINDIK
              </span>
            </div>
            <span className="mono" style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#CBD5E1',
              background: '#161D2A',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.16)'
            }}>
              {filteredTemplates.length} Format
            </span>
          </div>

          {/* Filter Kategori Dropdown + Pencarian */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedCategory ?? 'ALL'}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                height: '36px',
                background: '#0B0E14',
                borderColor: 'rgba(148, 163, 184, 0.24)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                padding: '0 10px'
              }}
            >
              {MINDIK_CATEGORY_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  Kategori: {tab.label}
                </option>
              ))}
            </select>

            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari kode atau judul format..."
                value={templateSearch ?? ''}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  height: '35px',
                  paddingLeft: '32px',
                  fontSize: '12px',
                  background: '#0B0E14',
                  borderColor: 'rgba(148, 163, 184, 0.22)',
                  color: '#FFFFFF'
                }}
              />
            </div>
          </div>

          {/* Daftar Template Scrollable Tinggi Penuh */}
          <div style={{
            maxHeight: '640px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingRight: '3px'
          }}>
            {isLoadingTemplates ? (
              <div style={{ textAlign: 'center', padding: '28px 10px', color: '#94A3B8', fontSize: '12px' }}>
                Memuat daftar format template...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 10px', color: '#94A3B8', fontSize: '12px' }}>
                Tidak ada format dokumen yang cocok.
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const tplCode = tpl.code || tpl.template_code || '';
                const tplTitle = tpl.title || tpl.name || tplCode;
                const canonCode = toCanonicalMindikCode(tplCode, tplTitle);
                const evalRes = checkPrerequisite(tplCode, selectedCase, activeCaseDocs);
                const isSelected = (selectedTemplateCode || '').toUpperCase().trim() === tplCode.toUpperCase().trim();
                const isLocked = !evalRes.allowed;
                const archivedDoc = resolveLatestArchiveDoc(activeCaseDocs, [canonCode, tplCode], true);
                const hasValidArchive = Boolean(archivedDoc && isValidOfficialDocNumber(archivedDoc.doc_number));

                return (
                  <button
                    key={tpl.id || tplCode}
                    type="button"
                    onClick={() => setSelectedTemplateCode(tplCode)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 11px',
                      borderRadius: '9px',
                      background: isSelected
                        ? 'rgba(255, 42, 42, 0.16)'
                        : (isLocked ? 'rgba(11, 14, 20, 0.72)' : '#161D2A'),
                      border: isSelected
                        ? '1.5px solid #FF2A2A'
                        : (isLocked ? '1px solid rgba(148, 163, 184, 0.10)' : '1px solid rgba(148, 163, 184, 0.18)'),
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      opacity: isLocked && !isSelected ? 0.68 : 1,
                      transition: 'all 140ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                      {isLocked ? (
                        <Lock size={13} color="#FF2A2A" style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : hasValidArchive ? (
                        <CheckCircle2 size={13} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <Unlock size={13} color="#CBD5E1" style={{ flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          lineHeight: 1.3
                        }}>
                          {tplTitle}
                        </div>
                        <div className="mono" style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                          {canonCode}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      {hasValidArchive && (
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.16)',
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          color: '#10B981',
                          whiteSpace: 'nowrap'
                        }}>
                          Tersimpan
                        </span>
                      )}
                      {isLocked && evalRes.badge && (
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(255, 42, 42, 0.14)',
                          border: '1px solid rgba(255, 42, 42, 0.35)',
                          color: '#FF3B3B',
                          whiteSpace: 'nowrap'
                        }}>
                          {evalRes.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN (lg:col-span-8): FORM AKTIF DOKUMEN MINDIK */}
        <div
          className="lg:col-span-8"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{
            background: '#11161F',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header Form Dokumen Terpilih */}
            <div style={{
              borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
              paddingBottom: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em' }}>
                    FORMULIR PENERBITAN NASKAH DINAS
                  </span>
                  {activeCanonicalCode && (
                    <span className="mono" style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '5px',
                      background: '#161D2A',
                      color: '#CBD5E1',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      {activeCanonicalCode}
                    </span>
                  )}
                </div>
                <h3 className="heading-font" style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
                  {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode || 'Pilih Format Dokumen'}
                </h3>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 11px',
                borderRadius: '999px',
                background: activeChainStatus.allowed ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 42, 42, 0.16)',
                border: activeChainStatus.allowed ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 42, 42, 0.5)',
                color: activeChainStatus.allowed ? '#10B981' : '#FF3B3B',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {activeChainStatus.allowed ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                <span>{activeChainStatus.allowed ? 'Rantai Formil Terpenuhi' : 'Terkunci (Syarat Belum Lengkap)'}</span>
              </span>
            </div>

            {/* Banner Prasyarat Terkunci / Info Rantai */}
            {!activeChainStatus.allowed ? (
              <div style={{
                padding: '11px 14px',
                borderRadius: '9px',
                background: 'rgba(255, 42, 42, 0.12)',
                border: '1px solid rgba(255, 42, 42, 0.42)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '12px',
                color: '#CBD5E1'
              }}>
                <AlertCircle size={16} color="#FF2A2A" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#FFFFFF' }}>Akses Penerbitan Terkunci:</strong>
                  <div style={{ marginTop: '2px', lineHeight: 1.45 }}>{activeChainStatus.reason}</div>
                </div>
              </div>
            ) : activeChainStatus.infoNotice ? (
              <div style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.32)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                color: '#FDE68A'
              }}>
                <Info size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span>{activeChainStatus.infoNotice}</span>
              </div>
            ) : null}

            {/* Input Utama: Smart Nomor Surat (No. Urut + Full Number) & Tanggal Surat */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" style={{
              padding: '14px',
              borderRadius: '10px',
              background: '#161D2A',
              border: '1px solid rgba(148, 163, 184, 0.16)'
            }}>
              <div className="md:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  {supportsNoUrutHelper && (
                    <div style={{ width: '105px', flexShrink: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                        No. Urut:
                      </label>
                      <input
                        type="text"
                        placeholder="01"
                        value={noUrutInput ?? ''}
                        onChange={(e) => handleNoUrutChange(e.target.value)}
                        className="form-input mono"
                        style={{
                          width: '100%',
                          fontSize: '13px',
                          fontWeight: 700,
                          background: '#0B0E14',
                          borderColor: 'rgba(255, 42, 42, 0.45)',
                          color: '#FFFFFF',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                      Nomor Surat Resmi:
                    </label>
                    <input
                      type="text"
                      placeholder="SP.Sidik/01/XI/RES.1.24/2026"
                      value={formValues.NOMOR_SURAT ?? ''}
                      onChange={(e) => handleInputChange('NOMOR_SURAT', e.target.value)}
                      className="form-input mono"
                      style={{
                        width: '100%',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        background: '#0B0E14',
                        borderColor: hasValidDocNo ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.55)',
                        color: '#FFFFFF'
                      }}
                    />
                  </div>
                </div>

                {!hasValidDocNo && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#F59E0B',
                    marginTop: '2px'
                  }}>
                    <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                    <span>
                      Nomor surat masih mengandung placeholder (<span className="mono">....</span>) atau kosong. Isi <strong>No. Urut</strong> atau lengkapi Nomor Surat sebelum menyimpan arsip.
                    </span>
                  </div>
                )}
              </div>

              <div className="md:col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={12} color="#FF2A2A" />
                  <span>Tanggal Surat:</span>
                </label>
                <input
                  type="date"
                  value={formValues.TANGGAL_SURAT ?? ''}
                  onChange={(e) => handleInputChange('TANGGAL_SURAT', e.target.value)}
                  className="form-input mono"
                  style={{
                    width: '100%',
                    fontSize: '12.5px',
                    background: '#0B0E14',
                    borderColor: hasValidDocDate ? 'rgba(148, 163, 184, 0.25)' : 'rgba(255, 42, 42, 0.5)',
                    color: '#FFFFFF'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                  Tercetak di surat:{' '}
                  <strong style={{ color: '#FFFFFF' }}>
                    {formValues.TANGGAL_SURAT ? formatTanggalIndonesia(formValues.TANGGAL_SURAT) : '-'}
                  </strong>
                </div>
                {(() => {
                  const rawCodeNow = (currentTemplate?.code || currentTemplate?.template_code || '').toUpperCase().trim();
                  const isSprinKapActive =
                    activeCanonicalCode === 'SPRIN_KAP' ||
                    activeCanonicalCode === 'SPRIN_KAP_DAN_BA' ||
                    rawCodeNow === 'SPRIN_KAP' ||
                    rawCodeNow === 'SPRIN_KAP_DAN_BA';
                  if (!isSprinKapActive) return null;
                  const masaIso = formValues.TANGGAL_SURAT ? addDaysToIsoDate(formValues.TANGGAL_SURAT, 1) : '';
                  const masaText = masaIso ? formatTanggalIndonesia(masaIso) : '-';
                  return (
                    <div style={{
                      marginTop: '3px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      fontSize: '10.5px',
                      color: '#6EE7B7',
                      fontWeight: 600
                    }}>
                      Masa berlaku 1x24 jam otomatis s.d. <strong style={{ color: '#FFFFFF' }}>{masaText}</strong>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Pemilih Subjek Hukum Kontekstual */}
            {currentSubjectMode === 'none' && !showOptionalSubjectPicker ? (
              <div style={{
                padding: '9px 13px',
                borderRadius: '9px',
                background: '#0B0E14',
                border: '1px solid rgba(148, 163, 184, 0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: '#94A3B8' }}>
                  <UserCheck size={14} color="#94A3B8" />
                  <span>Format ini otomatis mewarisi data perkara &amp; tim penyidik (pemilih subjek opsional).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOptionalSubjectPicker(true)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    background: '#161D2A',
                    border: '1px solid rgba(148, 163, 184, 0.26)',
                    color: '#CBD5E1',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Tampilkan Pemilih Subjek
                </button>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#161D2A',
                border: '1px solid rgba(255, 42, 42, 0.30)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Users size={14} color="#FF2A2A" />
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em' }}>
                      PEMILIH SUBJEK HUKUM TARGET SURAT
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      Otomatis mengisi biodata KUHAP pada dokumen
                    </span>
                    {currentSubjectMode === 'none' && (
                      <button
                        type="button"
                        onClick={() => setShowOptionalSubjectPicker(false)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#0B0E14',
                          border: '1px solid rgba(148, 163, 184, 0.24)',
                          color: '#CBD5E1',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Sembunyikan
                      </button>
                    )}
                  </div>
                </div>

                {currentSubjectMode === 'terlapor_to_tersangka' && (
                  <div style={{
                    padding: '7px 10px',
                    borderRadius: '7px',
                    background: 'rgba(255, 42, 42, 0.12)',
                    border: '1px solid rgba(255, 42, 42, 0.35)',
                    fontSize: '11px',
                    color: '#FCA5A5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px'
                  }}>
                    <Sparkles size={13} color="#FF2A2A" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Mode Penetapan Tersangka:</strong> Subjek terlapor yang dipilih akan otomatis ditetapkan sebagai <strong>Tersangka</strong> pada berkas perkara saat arsip disimpan.
                    </span>
                  </div>
                )}

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
                          background: isCatActive ? '#FF2A2A' : '#0B0E14',
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
                    : (selectedSubjectCategory === 'TERLAPOR' && isTerlaporTemplateActive && allCaseSubjects.terlapor.length === 0 && allCaseSubjects.tersangka.length > 0
                        ? allCaseSubjects.tersangka
                        : allCaseSubjects.all.filter(s => s._category === selectedSubjectCategory));

                  if (visibleSubjects.length === 0) {
                    return (
                      <div style={{ fontSize: '11.5px', color: '#94A3B8', padding: '4px 2px' }}>
                        Belum ada subjek pada kategori ini di Berkas Perkara.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', maxHeight: '140px', overflowY: 'auto' }}>
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
                              padding: '5px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              background: isChecked ? 'rgba(255, 42, 42, 0.18)' : '#0B0E14',
                              border: isChecked ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.2)',
                              color: '#FFFFFF',
                              userSelect: 'none'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const effectiveBaseKeys = selectedTargetSubjectKeys.length > 0
                                  ? selectedTargetSubjectKeys.filter(k => k !== '__NONE__')
                                  : allCaseSubjects.all
                                      .filter(s => activeSuspect && s.nama === activeSuspect.nama)
                                      .map(s => s._uid);
                                let nextKeys;
                                if (e.target.checked) {
                                  nextKeys = [...new Set([...effectiveBaseKeys, subj._uid])];
                                } else {
                                  nextKeys = effectiveBaseKeys.filter(k => k !== subj._uid);
                                }
                                setSelectedTargetSubjectKeys(nextKeys.length > 0 ? nextKeys : ['__NONE__']);
                                const nextSelectedObjs = allCaseSubjects.all.filter(s => nextKeys.includes(s._uid));
                                applyUniversalSelectedSubjects(nextSelectedObjs);
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
            )}

            {/* Dynamic Fields dari Template Studio (Grid 2 Kolom, variabel rujukan otomatis tetap disembunyikan) */}
            {(() => {
              const rawCodeNow = (currentTemplate?.code || currentTemplate?.template_code || '').toUpperCase().trim();
              const isSprinKapActive =
                activeCanonicalCode === 'SPRIN_KAP' ||
                activeCanonicalCode === 'SPRIN_KAP_DAN_BA' ||
                rawCodeNow === 'SPRIN_KAP' ||
                rawCodeNow === 'SPRIN_KAP_DAN_BA';
              const isBaKapActive =
                activeCanonicalCode === 'SPRIN_KAP_DAN_BA' ||
                activeCanonicalCode === 'BA_KAP' ||
                rawCodeNow === 'SPRIN_KAP_DAN_BA' ||
                rawCodeNow === 'BA_KAP';

              // Filter keluar seluruh variabel rujukan dokumen pendahulu & arsip yang sudah terinjeksi otomatis di latar belakang
              const isAutoChainedReferenceField = (rawKey) => {
                const k = String(rawKey || '').toUpperCase().trim();
                if (!k) return true;
                // 1. Field Nomor & Tanggal Surat utama yang sudah punya input khusus di atas
                if (['NOMOR_SURAT', 'NO_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE', 'TGL_SURAT', 'NOMOR_SURAT_HEADER', 'TANGGAL_SURAT_HEADER'].includes(k)) {
                  return true;
                }
                // 1b. Sembunyikan MASA_BERLAKU / SPRIN_MASA_BERLAKU_KAP saat SPRIN_KAP / SPRIN_KAP_DAN_BA aktif (dihitung otomatis H+1)
                if (isSprinKapActive && ['MASA_BERLAKU', 'MASA_BERLAKU_KAP', 'SPRIN_MASA_BERLAKU', 'SPRIN_MASA_BERLAKU_KAP', 'TANGGAL_BERLAKU'].includes(k)) {
                  return true;
                }
                // 1c. Sembunyikan seluruh input terpecah BA KAP dari Field Tambahan umum karena dirakit melalui 2 Sub-Blok khusus di bawah
                if (isBaKapActive && [
                  'HARI_KAP', 'TANGGAL_KAP', 'TGL_KAP', 'BULAN_KAP', 'TAHUN_KAP',
                  'TERBILANG_TAHUN_KAP', 'TERBILANG_TAHUN_BA_KAP', 'TAHUN_KAP_TERBILANG',
                  'JAM_KAP', 'WAKTU_KAP', 'TEMPAT_KAP',
                  'TANGGAL_BA_KAP', 'JAM_BA_KAP_TIME', 'TANGGAL_PENANGKAPAN', 'JAM_PENANGKAPAN_TIME'
                ].includes(k)) {
                  return true;
                }
                // 1d. Sembunyikan seluruh TERBILANG_TAHUN_* dari input manual
                if (k === 'TERBILANG_TAHUN' || k.startsWith('TERBILANG_TAHUN_') || k.endsWith('_TERBILANG')) {
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
                  'TANGGAL_HAN',
                  'TANGGAL_BA',
                  'TANGGAL_BA_BAWA'
                ]);
                if (allowedOperatorInputKeys.has(k)) {
                  return false;
                }
                // 3. Seluruh pola rujukan dokumen arsip pendahulu, tanggal terurai rantai, & data induk LP
                if (
                  k.startsWith('NOMOR_') ||
                  k.startsWith('NO_') ||
                  k.startsWith('TANGGAL_') ||
                  k.startsWith('TGL_') ||
                  k.startsWith('DASAR_') ||
                  k.startsWith('TGL_ANGKA_') ||
                  k.startsWith('TANGGAL_ANGKA_') ||
                  k.startsWith('TERBILANG_TAHUN_') ||
                  k.startsWith('TANGGAL_TERURAI_') ||
                  k.endsWith('_NOMOR') ||
                  k.endsWith('_NO') ||
                  k.endsWith('_TANGGAL') ||
                  k.endsWith('_TGL')
                ) {
                  return true;
                }
                // 3b. Tanggal terurai (HARI_*, BULAN_*, TAHUN_*) milik surat aktif & rantai arsip KUHAP
                const archivedCodes = activeCaseDocs.map(d => (d.template_code || '').toUpperCase().trim()).filter(Boolean);
                const chainDatePrefixes = new Set([
                  'SURAT', 'DOC', 'LP',
                  'SPRIN_SIDIK', 'SP_SIDIK', 'SIDIK', 'SURAT_PERINTAH_PENYIDIKAN',
                  'SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'GAS_SIDIK',
                  'SPDP', 'SPDP_TSK', 'SPDP_TERLAPOR',
                  'TAP_TSK', 'SP_TAP_TSK', 'SP_TAP', 'S_TAP_TSK', 'PENETAPAN_TERSANGKA',
                  'SPRIN_KAP', 'SP_KAP', 'SPRIN_KAP_DAN_BA',
                  'SPRIN_HAN', 'SP_HAN', 'SPRIN_HAN_DAN_BA',
                  'SPRIN_LIDIK', 'SP_LIDIK', 'SPGAS_LIDIK', 'LHP', 'LI',
                  ...archivedCodes
                ]);
                for (const prefixMatch of ['HARI_', 'BULAN_', 'TAHUN_']) {
                  if (k.startsWith(prefixMatch)) {
                    const suffix = k.slice(prefixMatch.length);
                    if (chainDatePrefixes.has(suffix)) return true;
                  }
                }
                // 4. Kunci kode arsip dinamis yang sudah tersimpan di activeCaseDocs
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

              const effectiveTglBaKap = toIsoDateString(formValues.TANGGAL_BA_KAP) || toIsoDateString(formValues.TANGGAL_SURAT) || '';
              const effectiveJamBaKap = formValues.JAM_BA_KAP_TIME || '09:00';
              const effectiveTglPenangkapan = toIsoDateString(formValues.TANGGAL_PENANGKAPAN) || toIsoDateString(formValues.TANGGAL_SURAT) || '';
              const effectiveJamPenangkapan = formValues.JAM_PENANGKAPAN_TIME || '08:00';
              const parsedPenangkapanPreview = parseDateParts(effectiveTglPenangkapan);
              const hariPenangkapanPreview = parsedPenangkapanPreview.hari || '-';
              const tglPenangkapanPreview = effectiveTglPenangkapan ? formatTanggalIndonesia(effectiveTglPenangkapan) : '-';
              const jamPenangkapanPreview = formatJamPolri(effectiveJamPenangkapan) || '08.00';

              if (!isBaKapActive && operatorDynamicFields.length === 0) return null;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {isBaKapActive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Sub-Blok 1: Waktu BA Penangkapan & Tempat Penangkapan */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#161D2A',
                        border: '1px solid rgba(255, 42, 42, 0.30)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                          1. Waktu BA Penangkapan &amp; Tempat Penangkapan
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                              Tanggal BA KAP
                            </label>
                            <input
                              type="date"
                              value={effectiveTglBaKap ?? ''}
                              onChange={(e) => handleInputChange('TANGGAL_BA_KAP', e.target.value)}
                              className="form-input mono"
                              style={{
                                width: '100%',
                                fontSize: '12px',
                                background: '#0B0E14',
                                borderColor: 'rgba(148, 163, 184, 0.24)',
                                color: '#FFFFFF'
                              }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                              Jam BA KAP (WITA)
                            </label>
                            <input
                              type="time"
                              value={effectiveJamBaKap ?? '09:00'}
                              onChange={(e) => handleInputChange('JAM_BA_KAP_TIME', e.target.value)}
                              className="form-input mono"
                              style={{
                                width: '100%',
                                fontSize: '12px',
                                background: '#0B0E14',
                                borderColor: 'rgba(148, 163, 184, 0.24)',
                                color: '#FFFFFF'
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                            Tempat Penangkapan
                          </label>
                          <input
                            type="text"
                            value={formValues.TEMPAT_KAP ?? ''}
                            onChange={(e) => handleInputChange('TEMPAT_KAP', e.target.value)}
                            placeholder="Contoh: Desa Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
                            className="form-input"
                            style={{
                              width: '100%',
                              fontSize: '12px',
                              background: '#0B0E14',
                              borderColor: 'rgba(148, 163, 184, 0.24)',
                              color: '#FFFFFF'
                            }}
                          />
                        </div>
                      </div>

                      {/* Sub-Blok 2: Waktu Penangkapan (Saat Tersangka Ditangkap) */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#161D2A',
                        border: '1px solid rgba(255, 42, 42, 0.30)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                            2. Waktu Penangkapan (Saat Tersangka Ditangkap)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                                Tanggal Penangkapan
                              </label>
                              <input
                                type="date"
                                value={effectiveTglPenangkapan ?? ''}
                                onChange={(e) => handleInputChange('TANGGAL_PENANGKAPAN', e.target.value)}
                                className="form-input mono"
                                style={{
                                  width: '100%',
                                  fontSize: '12px',
                                  background: '#0B0E14',
                                  borderColor: 'rgba(148, 163, 184, 0.24)',
                                  color: '#FFFFFF'
                                }}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                                Jam Penangkapan (WITA)
                              </label>
                              <input
                                type="time"
                                value={effectiveJamPenangkapan ?? '08:00'}
                                onChange={(e) => handleInputChange('JAM_PENANGKAPAN_TIME', e.target.value)}
                                className="form-input mono"
                                style={{
                                  width: '100%',
                                  fontSize: '12px',
                                  background: '#0B0E14',
                                  borderColor: 'rgba(148, 163, 184, 0.24)',
                                  color: '#FFFFFF'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: '#0B0E14',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          fontSize: '11px',
                          color: '#94A3B8',
                          lineHeight: 1.45
                        }}>
                          Tercetak di BA:{' '}
                          <strong style={{ color: '#FFFFFF' }}>
                            Pada Hari {hariPenangkapanPreview} tanggal {tglPenangkapanPreview}, sekitar Pukul {jamPenangkapanPreview} WITA
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {operatorDynamicFields.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#CBD5E1', letterSpacing: '0.04em' }}>
                          FIELD TAMBAHAN FORMAT INI ({operatorDynamicFields.length})
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                          Rujukan dokumen pendahulu disuntikkan otomatis
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {operatorDynamicFields.map((f, idx) => {
                          const key = f.field_key || f.key || `field_${idx}`;
                          const label = f.label || f.field_label || key;
                          const isDateField = f.field_type === 'date' || key === 'MASA_BERLAKU';
                          const inputValue = isDateField ? (toIsoDateString(formValues[key]) || '') : (formValues[key] ?? '');

                          return (
                            <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', marginBottom: '4px', display: 'block' }}>
                                {label}
                              </label>
                              <input
                                type={isDateField ? 'date' : 'text'}
                                value={inputValue ?? ''}
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                className={`form-input ${isDateField ? 'mono' : ''}`}
                                placeholder={f.placeholder || ''}
                                style={{
                                  width: '100%',
                                  fontSize: '12px',
                                  background: '#0B0E14',
                                  borderColor: 'rgba(148, 163, 184, 0.22)',
                                  color: '#FFFFFF'
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* STICKY ACTION FOOTER BERURUTAN (1. Pratinjau -> 2. Simpan ke Arsip -> 3. Unduh .docx) */}
          <div style={{
            position: 'sticky',
            bottom: '12px',
            zIndex: 20,
            background: 'rgba(17, 22, 31, 0.96)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)',
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ minWidth: '180px', flex: '1 1 200px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ringkasan Siap Terbit
              </div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: hasValidDocNo ? '#FFFFFF' : '#F59E0B', marginTop: '2px' }}>
                {formValues.NOMOR_SURAT || 'Nomor belum diisi'}
                <span style={{ color: '#94A3B8', fontWeight: 500 }}>
                  {' '}• {formValues.TANGGAL_SURAT ? formatTanggalIndonesia(formValues.TANGGAL_SURAT) : 'Tanggal belum dipilih'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                disabled={!activeChainStatus.allowed}
                title={!activeChainStatus.allowed ? activeChainStatus.reason : 'Pratinjau naskah dinas melalui Microsoft Office Online Viewer'}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#161D2A',
                  border: '1px solid rgba(148, 163, 184, 0.30)',
                  color: activeChainStatus.allowed ? '#FFFFFF' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: activeChainStatus.allowed ? 'pointer' : 'not-allowed',
                  opacity: activeChainStatus.allowed ? 1 : 0.55
                }}
              >
                <Eye size={14} />
                <span>1. Pratinjau Dokumen</span>
              </button>

              <button
                type="button"
                disabled={isSaving || !canSaveOrDownload}
                onClick={handleSaveArchive}
                title={actionDisabledTooltip || 'Simpan metadata & nomor resmi dokumen ke Arsip Perkara'}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: isSaved ? 'rgba(16, 185, 129, 0.16)' : '#161D2A',
                  border: isSaved ? '1px solid #10B981' : '1px solid rgba(255, 42, 42, 0.55)',
                  color: !canSaveOrDownload ? '#64748B' : (isSaved ? '#10B981' : '#FFFFFF'),
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: !isSaving && canSaveOrDownload ? 'pointer' : 'not-allowed',
                  opacity: canSaveOrDownload ? 1 : 0.55
                }}
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : (isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />)}
                <span>{isSaving ? 'Menyimpan...' : (isSaved ? '2. Tersimpan di Arsip' : '2. Simpan ke Arsip')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isGenerating || !canSaveOrDownload}
                title={actionDisabledTooltip || 'Unduh dokumen .docx resmi (otomatis menyimpan arsip jika belum tersimpan)'}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: canSaveOrDownload ? '#FF2A2A' : '#161D2A',
                  border: canSaveOrDownload ? '1px solid #FF2A2A' : '1px solid rgba(148, 163, 184, 0.2)',
                  color: canSaveOrDownload ? '#FFFFFF' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: !isGenerating && canSaveOrDownload ? 'pointer' : 'not-allowed',
                  boxShadow: canSaveOrDownload ? '0 4px 16px rgba(255, 42, 42, 0.35)' : 'none',
                  opacity: canSaveOrDownload ? 1 : 0.55
                }}
              >
                {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>{isGenerating ? 'Memproses...' : '3. Unduh .docx'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL DETAIL PERKARA --- */}
      {isCaseDetailModalOpen && currentCase && (
        <div
          onClick={() => setIsCaseDetailModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85vh',
              background: '#11161F',
              borderRadius: '14px',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)'
            }}
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#161D2A'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Briefcase size={16} color="#FF2A2A" />
                <span className="heading-font" style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Detail Perkara: {currentCase.nomor_lp || currentCase.no_lp || '-'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCaseDetailModalOpen(false)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  background: '#0B0E14',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  color: '#CBD5E1',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
                <span>Tutup</span>
              </button>
            </div>

            <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{
                padding: '12px',
                borderRadius: '10px',
                background: '#0B0E14',
                border: '1px solid rgba(148, 163, 184, 0.14)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Nomor LP</div>
                  <div className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                    {currentCase.nomor_lp || currentCase.no_lp || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Tanggal LP</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                    {formatTanggalIndonesia(currentCase.tanggal_lp || currentCase.sprin_date) || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Tindak Pidana / Perkara</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                    {currentCase.tindak_pidana || currentCase.crime_category || currentCase.kasus || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Pasal Disangkakan</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#CBD5E1' }}>
                    {currentCase.pasal_uu || currentCase.pasal || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Locus Delicti</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>{currentCase.locus || currentCase.tkp || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Tempus Delicti</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>{currentCase.tempus || currentCase.waktu_kejadian || '-'}</div>
                </div>
              </div>

              {[
                { label: 'Pelapor / Korban', items: allCaseSubjects.pelapor },
                { label: 'Terlapor (Calon Tersangka)', items: allCaseSubjects.terlapor },
                { label: 'Tersangka Ditetapkan', items: allCaseSubjects.tersangka },
                { label: 'Saksi-saksi', items: allCaseSubjects.saksi }
              ].map((grp) => (
                <div key={grp.label} style={{
                  padding: '10px 12px',
                  borderRadius: '9px',
                  background: '#0B0E14',
                  border: '1px solid rgba(148, 163, 184, 0.14)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#CBD5E1', marginBottom: '6px' }}>
                    {grp.label} ({grp.items.length})
                  </div>
                  {grp.items.length === 0 ? (
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>Belum tercatat pada berkas perkara.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {grp.items.map((item, idx) => (
                        <div key={item._uid || idx} style={{ fontSize: '12px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                          <span style={{ fontWeight: 700 }}>{idx + 1}. {item.nama_lengkap || item.nama}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{item.nik ? `NIK: ${item.nik}` : (item.pekerjaan || '-')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL TIM PENYIDIK TERWARISI --- */}
      {isTeamModalOpen && currentCase && (
        <div
          onClick={() => setIsTeamModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '80vh',
              background: '#11161F',
              borderRadius: '14px',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)'
            }}
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#161D2A'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Users size={16} color="#FF2A2A" />
                <span className="heading-font" style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                  Tim Penyidik Terwarisi ({inheritedTeamMembers.length} Personel)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  background: '#0B0E14',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  color: '#CBD5E1',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
                <span>Tutup</span>
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inheritedTeamMembers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                  Belum ada personel penyidik tercantum pada berkas perkara ini.
                </div>
              ) : (
                inheritedTeamMembers.map((member) => (
                  <div
                    key={`${member.no}_${member.nama}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '9px',
                      background: '#0B0E14',
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                        {member.no}. {member.pangkat ? `${member.pangkat} ` : ''}{member.nama}
                      </div>
                      <div className="mono" style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        NRP: {member.nrp || '-'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      background: 'rgba(255, 42, 42, 0.14)',
                      border: '1px solid rgba(255, 42, 42, 0.35)',
                      color: '#CBD5E1'
                    }}>
                      {member.jabatan}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
                docDate={formValues.TANGGAL_SURAT || formValues.DOC_DATE || ''}
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
