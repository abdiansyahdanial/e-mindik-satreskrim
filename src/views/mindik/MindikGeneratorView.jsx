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
import { evaluateMindikChain } from './mindikPrerequisites';
import { 
  generateAndDownloadDocx, 
  formatTanggalIndonesia,
  formatPangkatLengkap
} from '../../services/mindikGenerator';

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
  const [caseDocuments, setCaseDocuments] = useState([]);
  const [caseSuspects, setCaseSuspects] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(initialSuspectId || '');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Ambil data perkara aktif
  const currentCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || cases[0] || null;
  }, [cases, selectedCaseId]);

  // --- STATE TEMPLATE MINDIK ---
  const [allTemplates, setAllTemplates] = useState(Array.isArray(templates) && templates.length > 0 ? templates : []);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? (initialTemplate.code || initialTemplate.template_code) : 'SPRIN_SIDIK'
  );
  const [templateFilter, setTemplateFilter] = useState('ALL'); // 'ALL' | 'UTAMA' | 'TERBUKA' | 'TERKUNCI'
  const [templateSearch, setTemplateSearch] = useState('');

  // --- STATE FORM GENERATOR ---
  const [formValues, setFormValues] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
  // Setiap selectedCaseId berganti:
  // - Kosongkan & set form state awal (tanggal hari ini secara real-time)
  // - Muat arsip dokumen perkara dari Supabase case_documents via query multi-identifier
  // - Muat tersangka perkara
  useEffect(() => {
    if (!currentCase) {
      setCaseDocuments([]);
      setCaseSuspects([]);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Reset Form Values dengan tanggal hari ini & nomor LP aktif
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
      NO_SPRIN_GAS_SIDIK: currentCase.no_sp_gas_sidik || currentCase.no_sprin_gas_sidik || '',
      TGL_SPRIN_GAS_SIDIK: currentCase.tgl_sp_gas_sidik || currentCase.tgl_sprin_gas_sidik || '',
    });

    setIsSaved(false);
    setFeedbackNotice(null);

    // Muat Arsip Dokumen khusus LP ini
    const loadCaseDocuments = async () => {
      setIsLoadingDocs(true);
      try {
        const caseId = currentCase.id;
        const noLp = currentCase.nomor_lp || currentCase.no_lp || '';

        let query = supabase.from('case_documents').select('*');
        if (caseId && noLp) {
          query = query.or(`case_id.eq.${caseId},nomor_lp.eq."${noLp}"`);
        } else if (caseId) {
          query = query.eq('case_id', caseId);
        } else if (noLp) {
          query = query.eq('nomor_lp', noLp);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.warn('[MindikGeneratorView] Tabel case_documents belum ada atau tidak dapat diakses:', error.message);
          setCaseDocuments([]);
          return;
        }
        setCaseDocuments(data || []);
      } catch (err) {
        console.warn('[MindikGeneratorView] Gagal memuat arsip dokumen perkara (fallback empty):', err?.message || err);
        setCaseDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    };

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
        const list = data || [];
        setCaseSuspects(list);
        if (list.length > 0 && !selectedSuspectId) {
          setSelectedSuspectId(list[0].id);
        }
      } catch (err) {
        console.warn('[MindikGeneratorView] Gagal memuat daftar tersangka:', err);
      }
    };

    loadCaseDocuments();
    loadCaseSuspects();
  }, [selectedCaseId, currentCase?.id]);

  // Suspect yang aktif dipilih
  const activeSuspect = useMemo(() => {
    return caseSuspects.find(s => s.id === selectedSuspectId) || caseSuspects[0] || null;
  }, [caseSuspects, selectedSuspectId]);

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

  // Template yang aktif dipilih saat ini
  const currentTemplate = useMemo(() => {
    if (!selectedTemplateCode) return null;
    // Cari di data yang di-fetch dari Supabase
    const found = (allTemplates || []).find(t => 
      (t.code || t.template_code || '').toUpperCase().trim() === selectedTemplateCode.toUpperCase().trim()
    );
    return found || null;
  }, [selectedTemplateCode, allTemplates]);

  // Helper filter dokumen tersangka
  const requiresSuspectTarget = useMemo(() => {
    if (!currentTemplate) return false;
    const code = (currentTemplate.code || currentTemplate.template_code || '').toUpperCase().trim();
    const title = (currentTemplate.title || currentTemplate.name || '').toUpperCase().trim();

    if (code.includes('SPRIN_SIDIK') || code.includes('SP_SIDIK') || code.includes('SPGAS') || code.includes('SP_GAS')) return false;
    if (title.includes('PERINTAH PENYIDIKAN') || title.includes('TUGAS PENYIDIKAN')) return false;

    return (
      code.includes('TAP_TSK') ||
      code.includes('SP_TAP') ||
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

  // Sinkronisasi form saat currentTemplate atau currentCase berganti
  useEffect(() => {
    if (!currentTemplate) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Deteksi format nomor naskah dinas resmi dari template studio
    const standardFormatNo = 
      currentTemplate.format_nomor || 
      currentTemplate.nomor_format || 
      currentTemplate.default_values?.NOMOR_SURAT || 
      currentTemplate.default_nomor ||
      (currentTemplate.code === 'SPRIN_SIDIK' ? 'SP.Sidik/.../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra' : '');

    setFormValues(prev => {
      const nextValues = { ...prev };

      // Pasang tanggal surat hari ini jika belum terisi
      if (!nextValues.TANGGAL_SURAT) nextValues.TANGGAL_SURAT = todayStr;
      if (!nextValues.tanggal_surat) nextValues.tanggal_surat = todayStr;
      if (!nextValues.DOC_DATE) nextValues.DOC_DATE = todayStr;

      // Pasang format nomor surat baku dari template studio
      if (standardFormatNo && (!nextValues.NOMOR_SURAT || nextValues.NOMOR_SURAT.includes('...'))) {
        nextValues.NOMOR_SURAT = standardFormatNo;
        nextValues.DOC_NO = standardFormatNo;
      }

      // Inisialisasi default field dinamis dari template jika ada
      if (Array.isArray(currentTemplate.dynamic_fields)) {
        currentTemplate.dynamic_fields.forEach(f => {
          const k = f.field_key || f.key;
          if (k && nextValues[k] === undefined && f.default_value !== undefined) {
            nextValues[k] = f.default_value;
          }
        });
      }

      return nextValues;
    });
  }, [currentTemplate?.id, currentTemplate?.code, currentCase?.id]);

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
    return evaluateMindikChain(tplCode, currentCase, caseDocuments);
  }, [currentTemplate, currentCase, caseDocuments]);

  // Saring Daftar Template Berdasarkan Filter & Pencarian
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
      const title = (t.title || t.name || '').toLowerCase();
      const code = (t.code || t.template_code || '').toLowerCase();
      const query = templateSearch.toLowerCase();
      const matchesSearch = title.includes(query) || code.includes(query);
      if (!matchesSearch) return false;

      const evalResult = evaluateMindikChain(t.code || t.template_code, currentCase, caseDocuments);

      if (templateFilter === 'UTAMA') {
        const c = (t.code || t.template_code || '').toUpperCase();
        return c.includes('SIDIK') || c.includes('SPDP') || c.includes('TAP_TSK');
      }
      if (templateFilter === 'TERBUKA') {
        return evalResult.allowed;
      }
      if (templateFilter === 'TERKUNCI') {
        return !evalResult.allowed;
      }
      return true;
    });
  }, [allTemplates, templateSearch, templateFilter, currentCase, caseDocuments]);

  // Handle Input Perubahan Field Form
  const handleInputChange = (key, value) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
    setIsSaved(false);
  };

  // Simpan Arsip Dokumen ke Supabase `case_documents`
  const handleSaveArchive = async () => {
    if (!currentCase || !currentTemplate) return;
    setIsSaving(true);
    setFeedbackNotice(null);

    try {
      const docNo = formValues.NOMOR_SURAT || formValues.doc_no || formValues.NO_SURAT || '-';
      const docDate = formValues.TANGGAL_SURAT || formValues.doc_date || new Date().toISOString().split('T')[0];
      const tplCode = currentTemplate.code || currentTemplate.template_code || 'MINDIK';
      const tplTitle = currentTemplate.title || currentTemplate.name || 'Dokumen Mindik';

      const payload = {
        case_id: currentCase.id,
        nomor_lp: currentCase.nomor_lp || currentCase.no_lp || '',
        template_code: tplCode,
        document_type: currentTemplate.category || 'SURAT PERINTAH',
        document_name: tplTitle,
        title: tplTitle,
        document_number: docNo,
        doc_number: docNo,
        document_date: docDate,
        doc_date: docDate,
        metadata: formValues,
        created_at: new Date().toISOString()
      };

      let savedDoc = null;
      try {
        const { data, error } = await supabase.from('case_documents').insert([payload]).select();
        if (error) {
          console.warn('[MindikGeneratorView] Gagal simpan ke case_documents:', error.message);
        } else if (data && data[0]) {
          savedDoc = data[0];
          setCaseDocuments(prev => [savedDoc, ...prev]);
        }
      } catch (errCaseDoc) {
        console.warn('[MindikGeneratorView] Exception saat simpan ke case_documents:', errCaseDoc?.message || errCaseDoc);
      }

      // Update Rujukan Nomor Induk Perkara jika Dokumen adalah Gerbang Utama
      const upperCode = tplCode.toUpperCase();
      if (upperCode === 'SPRIN_SIDIK' || upperCode === 'SP_SIDIK') {
        await supabase.from('cases').update({
          no_sprin_sidik: docNo,
          tgl_sprin_sidik: docDate
        }).eq('id', currentCase.id);
        if (currentCase) {
          currentCase.no_sprin_sidik = docNo;
          currentCase.tgl_sprin_sidik = docDate;
        }
      } else if (upperCode === 'SPGAS_SIDIK' || upperCode === 'SP_GAS_SIDIK') {
        await supabase.from('cases').update({
          no_sp_gas_sidik: docNo,
          tgl_sp_gas_sidik: docDate
        }).eq('id', currentCase.id);
        if (currentCase) {
          currentCase.no_sp_gas_sidik = docNo;
          currentCase.tgl_sp_gas_sidik = docDate;
        }
      }

      setIsSaved(true);
      setFeedbackNotice({
        type: 'success',
        message: `Arsip '${tplTitle}' berhasil disimpan ke riwayat perkara.`
      });

      if (onSaveDocument && savedDoc) {
        onSaveDocument(savedDoc);
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
        message: `Dokumen Word (.docx) berhasil dibuat dan diunduh.`
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
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ff352d, #b91c1c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255, 53, 45, 0.4)'
          }}>
            <FileSignature size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.4px' }}>
                GENERATOR MINDIK PRO-JUSTITIA
              </h2>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ISOLASI LP AKTIF
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
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
          background: feedbackNotice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : (feedbackNotice.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
          border: `1px solid ${feedbackNotice.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : (feedbackNotice.type === 'warning' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)')}`,
          color: feedbackNotice.type === 'success' ? '#4ADE80' : (feedbackNotice.type === 'warning' ? '#FCD34D' : '#FCA5A5'),
          animation: 'fadeIn 200ms ease-out'
        }}>
          {feedbackNotice.type === 'success' && <CheckCircle2 size={18} />}
          {feedbackNotice.type === 'warning' && <AlertTriangle size={18} />}
          {feedbackNotice.type === 'error' && <AlertCircle size={18} />}
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* --- SECTION 1: PEMILIH PERKARA / LP AKTIF --- */}
      <div style={{
        background: '#0d1526',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#38BDF8" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '0.4px' }}>
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
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                background: '#141d2e',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#FFFFFF',
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
              background: '#111a2e',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Pelapor</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>{currentCase.pelapor || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Tanggal LP</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>
                  {formatTanggalIndonesia(currentCase.tanggal_lp || currentCase.sprin_date) || '-'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Penyidik Penangan</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>{currentCase.penyidik_1_nama || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Arsip Naskah Dinas</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>
                  {isLoadingDocs ? 'Memuat...' : `${caseDocuments.length} Dokumen Sah`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: WORKSPACE DUA PANEL (KIRI: FORMAT & FORM, KANAN: PREVIEW DOKUMEN) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 480px) 1fr', gap: '22px', alignItems: 'start' }}>
        
        {/* PANEL KIRI: KATALOG TEMPLATE & INPUT FIELD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Card 1: Pilihan Format Dokumen Mindik */}
          <div style={{
            background: '#0d1526',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={17} color="#F59E0B" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9' }}>
                  FORMAT MINDIK TERSEDIA
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                {filteredTemplates.length} Format
              </span>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Cari kode / judul format..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '30px', fontSize: '12px', height: '36px' }}
                />
              </div>

              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="form-select"
                style={{ fontSize: '11.5px', height: '36px', width: '120px' }}
              >
                <option value="ALL">Semua</option>
                <option value="UTAMA">Fase Utama</option>
                <option value="TERBUKA">Terbuka (Sah)</option>
                <option value="TERKUNCI">Terkunci</option>
              </select>
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
                  const evalRes = evaluateMindikChain(tplCode, currentCase, caseDocuments);
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
                          ? 'rgba(255, 53, 45, 0.18)' 
                          : (isLocked ? 'rgba(15, 23, 42, 0.5)' : '#141d2e'),
                        border: isSelected 
                          ? '1.5px solid #ff352d' 
                          : (isLocked ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.08)'),
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
                          <Lock size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                        ) : (
                          <Unlock size={14} color="#22C55E" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isSelected ? '#FFFFFF' : '#E2E8F0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {tplTitle}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>
                            Kode: <span className="mono">{tplCode}</span>
                          </div>
                        </div>
                      </div>

                      {evalRes.badge && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          background: evalRes.isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: evalRes.isLocked ? '#FCA5A5' : '#86EFAC'
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
            background: '#0d1526',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header Form Dokumen Terpilih */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8' }}>DOKUMEN TERPILIH</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeChainStatus.allowed ? '#4ADE80' : '#F87171'
                }}>
                  {activeChainStatus.allowed ? '✓ Rantai Formil Terpenuhi' : '✕ Syarat Belum Lengkap'}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
                {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode}
              </h3>
            </div>

            {/* Warning jika Prasyarat Belum Terpenuhi */}
            {!activeChainStatus.allowed && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                fontSize: '12px',
                color: '#FCA5A5'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Akses Dokumen Terkunci:</strong>
                  <div style={{ marginTop: '2px', lineHeight: 1.4 }}>{activeChainStatus.reason}</div>
                </div>
              </div>
            )}

            {/* Input Tersangka (hanya jika dokumen memang menyasar tersangka) */}
            {requiresSuspectTarget && caseSuspects.length > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>
                  Tersangka / Terlapor Sasaran Surat:
                </label>
                <select
                  value={selectedSuspectId || ''}
                  onChange={(e) => setSelectedSuspectId(e.target.value)}
                  className="form-select"
                  style={{ fontSize: '12px' }}
                >
                  {caseSuspects.map((s, idx) => (
                    <option key={s.id || idx} value={s.id}>
                      {s.nama_lengkap || s.nama || `Tersangka #${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form Fields Baku: Nomor Surat & Tanggal Surat */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>
                  Nomor Surat Resmi:
                </label>
                <input
                  type="text"
                  placeholder="SP.Sidik/.../.../RES.1.24/2026"
                  value={formValues.NOMOR_SURAT || ''}
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
                  value={formValues.TANGGAL_SURAT || ''}
                  onChange={(e) => {
                    handleInputChange('TANGGAL_SURAT', e.target.value);
                    handleInputChange('DOC_DATE', e.target.value);
                  }}
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Dynamic Fields dari Template Studio */}
            {Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.length > 0 && (
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
                {currentTemplate.dynamic_fields
                  ?.filter(f => {
                    const k = (f.field_key || f.key || '').toUpperCase().trim();
                    return !['NOMOR_SURAT', 'NO_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE', 'TGL_SURAT'].includes(k);
                  })
                  .map((f, idx) => {
                    const key = f.field_key || f.key || `field_${idx}`;
                    const label = f.label || f.field_label || key;
                    return (
                      <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {label}
                        </label>
                        <input
                          type={f.field_type === 'date' ? 'date' : 'text'}
                          value={formValues[key] || ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          className="form-input"
                          placeholder={f.placeholder || ''}
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    );
                })}
              </div>
            )}

            {/* Tombol Aksi: Generate File .docx & Simpan Arsip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={isGenerating || !activeChainStatus.allowed}
                onClick={handleDownloadDocx}
                className="btn btn-primary"
                style={{
                  padding: '11px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!activeChainStatus.allowed || isGenerating) ? 0.6 : 1,
                  cursor: (!activeChainStatus.allowed || isGenerating) ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{isGenerating ? 'Memproses...' : 'Unduh .docx'}</span>
              </button>

              <button
                type="button"
                disabled={isSaving || !activeChainStatus.allowed}
                onClick={handleSaveArchive}
                className="btn btn-secondary"
                style={{
                  padding: '11px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderColor: isSaved ? '#22C55E' : undefined,
                  color: isSaved ? '#4ADE80' : undefined
                }}
              >
                {isSaving ? <RefreshCw size={15} className="animate-spin" /> : (isSaved ? <CheckCircle2 size={15} /> : <Save size={15} />)}
                <span>{isSaving ? 'Menyimpan...' : (isSaved ? 'Tersimpan' : 'Simpan Arsip')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: DASHBOARD STATUS NASKAH DINAS SIAP TERBIT */}
        <div style={{
          flex: 1,
          minWidth: '450px',
          background: '#0e1726',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Naskah Dinas Siap Terbit
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0' }}>
                {currentTemplate?.title || currentTemplate?.name || selectedTemplateCode}
              </h2>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              background: activeChainStatus.allowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: activeChainStatus.allowed ? '#34d399' : '#f87171'
            }}>
              {activeChainStatus.allowed ? '✓ Rantai Formil Sah' : '✕ Belum Memenuhi Syarat'}
            </span>
          </div>

          {/* Ringkasan Parameter */}
          <div style={{
            background: '#141d2e',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Nomor Naskah:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>
                {formValues.NOMOR_SURAT || '-'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Tanggal Surat:</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0' }}>
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
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#38BDF8' }}>
                  {activeSuspect?.nama || activeSuspect?.nama_lengkap || '-'}
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
            <button
              type="button"
              onClick={handleSaveArchive}
              disabled={!activeChainStatus.allowed || isSaving}
              className="btn btn-secondary"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: isSaved ? '#22C55E' : undefined,
                color: isSaved ? '#4ADE80' : undefined
              }}
              title="Simpan ke Arsip Perkara"
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : (isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />)}
              <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
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
            background: '#0d131f',
            borderRadius: '16px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0e1726'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye color="#f97316" size={18} />
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
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
