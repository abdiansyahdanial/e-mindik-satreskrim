import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Search, 
  Eye, 
  FileText, 
  FolderOpen, 
  Trash2, 
  AlertTriangle,
  ArrowLeft,
  Download,
  Plus,
  Calendar,
  User,
  Shield,
  FileCheck,
  ChevronRight,
  Clock,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
import { supabase } from '../supabaseClient';
import { formatTanggalIndonesia, generateAndDownloadDocx } from '../services/mindikGenerator';

export default function ArchivesView({ 
  documents = [], 
  cases = [], 
  onPreviewDoc, 
  onDeleteDoc,
  onOpenGenerator 
}) {
  // State Navigasi Hirarki 2 Tingkat:
  // selectedCaseForArchive === null  => Tingkat 1 (Daftar LP)
  // selectedCaseForArchive !== null  => Tingkat 2 (Daftar Dokumen dalam LP Terpilih)
  const [selectedCaseForArchive, setSelectedCaseForArchive] = useState(null);

  // Filter & Search States
  const [lpSearchTerm, setLpSearchTerm] = useState('');
  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [lpFilterStatus, setLpFilterStatus] = useState('all'); // 'all' | 'has_docs' | 'no_docs'

  // Modal State
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const safeDocs = Array.isArray(documents) ? documents : [];
  const safeCases = Array.isArray(cases) ? cases : [];

  // Helper: Ambil seluruh dokumen yang terikat ke suatu perkara (berdasarkan case_id atau nomor_lp)
  const getDocsForCase = (caseItem) => {
    if (!caseItem) return [];
    return safeDocs.filter((d) => {
      if (!d) return false;
      const matchId = d.case_id && String(d.case_id) === String(caseItem.id);
      const matchLp = Boolean(
        (caseItem.nomor_lp && (d.nomor_lp === caseItem.nomor_lp || d.no_lp === caseItem.nomor_lp)) ||
        (caseItem.no_lp && (d.nomor_lp === caseItem.no_lp || d.no_lp === caseItem.no_lp))
      );
      return matchId || matchLp;
    });
  };

  // --- TINGKAT 1: Filter Daftar LP ---
  const filteredCases = useMemo(() => {
    return safeCases.filter((c) => {
      if (!c) return false;
      const q = (lpSearchTerm || '').trim().toLowerCase();
      const noLp = String(c.nomor_lp || c.no_lp || '').toLowerCase();
      const pelapor = String(c.nama_pelapor || c.pelapor_name || '').toLowerCase();
      const terlapor = String(c.nama_terlapor || c.terlapor_name || c.person?.nama || '').toLowerCase();
      const pidana = String(c.tindak_pidana || c.perkara || '').toLowerCase();
      const locus = String(c.locus || '').toLowerCase();

      const matchesSearch = !q || 
        noLp.includes(q) || 
        pelapor.includes(q) || 
        terlapor.includes(q) || 
        pidana.includes(q) ||
        locus.includes(q);

      const caseDocs = getDocsForCase(c);
      if (lpFilterStatus === 'has_docs') {
        return matchesSearch && caseDocs.length > 0;
      }
      if (lpFilterStatus === 'no_docs') {
        return matchesSearch && caseDocs.length === 0;
      }

      return matchesSearch;
    });
  }, [safeCases, safeDocs, lpSearchTerm, lpFilterStatus]);

  // --- TINGKAT 2: Dokumen Khusus LP Terpilih ---
  const selectedCaseDocs = useMemo(() => {
    if (!selectedCaseForArchive) return [];
    const allForThisCase = getDocsForCase(selectedCaseForArchive);

    return allForThisCase.filter((d) => {
      const q = (docSearchTerm || '').trim().toLowerCase();
      const title = String(d.doc_title || d.title || d.nama_dokumen || '').toLowerCase();
      const code = String(d.template_code || d.code || '').toLowerCase();
      const num = String(d.doc_number || d.nomor_surat || '').toLowerCase();

      const matchesSearch = !q || title.includes(q) || code.includes(q) || num.includes(q);

      const cat = (d.category || d.kategori || '').toUpperCase();
      if (docCategoryFilter === 'all') return matchesSearch;
      if (docCategoryFilter === 'SURAT PERINTAH') return matchesSearch && (cat.includes('PERINTAH') || code.includes('SPRIN') || code.includes('SP_'));
      if (docCategoryFilter === 'SURAT') return matchesSearch && (cat.includes('SURAT') && !cat.includes('PERINTAH'));
      if (docCategoryFilter === 'BERITA ACARA') return matchesSearch && (cat.includes('BERITA ACARA') || code.includes('BA_'));

      return matchesSearch;
    });
  }, [selectedCaseForArchive, safeDocs, docSearchTerm, docCategoryFilter]);

  // Handler Unduh .docx Fisik
  const handleDownloadDocx = async (doc) => {
    setIsDownloading(true);
    try {
      // 1. Direct file URL jika tersedia
      if (doc?.file_url || doc?.docx_url || doc?.download_url) {
        const url = doc.file_url || doc.docx_url || doc.download_url;
        const res = await fetch(url);
        const blob = await res.blob();
        const fname = doc.filename || `${(doc.doc_title || doc.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
        saveAs(blob, fname);
        return;
      }

      // 2. Storage path di Supabase Storage
      if (doc?.storage_path || doc?.file_path) {
        const path = doc.storage_path || doc.file_path;
        const bucket = doc.storage_bucket || 'documents';
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (!dlErr && blob) {
          const fname = doc.filename || `${(doc.doc_title || doc.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
          saveAs(blob, fname);
          return;
        }
      }

      // 3. Fallback: Generate ulang dokumen .docx secara dinamis
      const targetCase = selectedCaseForArchive || safeCases.find(c => String(c.id) === String(doc?.case_id)) || {
        nomor_lp: doc?.nomor_lp || doc?.no_lp || 'LP',
        nama_pelapor: doc?.meta_values?.NAMA_PELAPOR || '-',
        nama_terlapor: doc?.meta_values?.NAMA_TERLAPOR || '-'
      };

      const tplCode = doc?.template_code || doc?.code || 'SPRIN_SIDIK';
      const { data: tpls } = await supabase.from('document_templates').select('*');
      const matchedTpl = (tpls || []).find(t => (t.code || '').toUpperCase() === (tplCode || '').toUpperCase()) 
        || { code: tplCode, title: doc.doc_title || doc.title || 'Dokumen Mindik' };

      await generateAndDownloadDocx({
        template: matchedTpl,
        caseData: targetCase,
        activeCase: targetCase,
        formValues: doc.meta_values || doc.metadata || {
          NOMOR_SURAT: doc.doc_number || doc.nomor_surat,
          TANGGAL_SURAT: doc.tgl_surat || doc.tanggal_surat || doc.created_at
        }
      });
    } catch (err) {
      console.error('Download error:', err);
      alert(`Gagal mengunduh dokumen .docx: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ============================================================== */}
      {/* TINGKAT 1: DAFTAR LAPORAN POLISI (LP)                          */}
      {/* ============================================================== */}
      {!selectedCaseForArchive ? (
        <>
          {/* Header & Title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Archive size={22} color="#ff352d" />
                <span>Arsip Mindik Berbasis Laporan Polisi (LP)</span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Pilih salah satu Laporan Polisi di bawah untuk membuka arsip berkas administrasi penyidikan yang telah diterbitkan.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Briefcase size={14} color="var(--accent-red)" />
                <span>Total Perkara: <strong>{safeCases.length}</strong></span>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
                <FileCheck size={14} color="var(--accent-cyan)" />
                <span>Total Arsip: <strong>{safeDocs.length}</strong> Dokumen</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass" style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '480px' }}>
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Cari No. LP, Nama Pelapor, Terlapor, atau Tindak Pidana..."
                value={lpSearchTerm}
                onChange={(e) => setLpSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status Arsip:</span>
              <button
                type="button"
                onClick={() => setLpFilterStatus('all')}
                className={`btn btn-sm ${lpFilterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={lpFilterStatus !== 'all' ? { background: '#1e262e', borderColor: 'rgba(255, 255, 255, 0.1)' } : {}}
              >
                Semua LP ({safeCases.length})
              </button>
              <button
                type="button"
                onClick={() => setLpFilterStatus('has_docs')}
                className={`btn btn-sm ${lpFilterStatus === 'has_docs' ? 'btn-primary' : 'btn-secondary'}`}
                style={lpFilterStatus !== 'has_docs' ? { background: '#1e262e', borderColor: 'rgba(255, 255, 255, 0.1)' } : {}}
              >
                Memiliki Arsip
              </button>
              <button
                type="button"
                onClick={() => setLpFilterStatus('no_docs')}
                className={`btn btn-sm ${lpFilterStatus === 'no_docs' ? 'btn-primary' : 'btn-secondary'}`}
                style={lpFilterStatus !== 'no_docs' ? { background: '#1e262e', borderColor: 'rgba(255, 255, 255, 0.1)' } : {}}
              >
                Belum Ada Mindik
              </button>
            </div>
          </div>

          {/* Grid / Kartu Berkas Perkara (LP) */}
          {filteredCases.length === 0 ? (
            <div className="glass" style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-secondary)' }}>
              <FolderOpen size={44} color="#ff352d" style={{ opacity: 0.6, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF', marginBottom: '6px' }}>
                Tidak Ada Laporan Polisi Ditemukan
              </div>
              <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>
                {lpSearchTerm ? `Tidak ada perkara yang cocok dengan kata kunci "${lpSearchTerm}".` : 'Belum ada data Laporan Polisi di dalam sistem.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '16px'
            }}>
              {filteredCases.map((c) => {
                const caseDocs = getDocsForCase(c);
                const hasDocs = caseDocs.length > 0;
                const formattedDate = formatTanggalIndonesia(c.tanggal_lp || c.sprin_date || c.created_at) || '-';

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseForArchive(c);
                      setDocSearchTerm('');
                      setDocCategoryFilter('all');
                    }}
                    className="glass"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: hasDocs ? '1px solid rgba(255, 53, 45, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: '#111827'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-red)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = hasDocs ? 'rgba(255, 53, 45, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Header Baris LP & Badge Dokumen */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#ff352d', fontWeight: 800 }}>
                          BERKAS LAPORAN POLISI
                        </span>
                        <div className="mono" style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF' }}>
                          {c.nomor_lp || c.no_lp || '-'}
                        </div>
                      </div>

                      {/* Badge Jumlah Dokumen Mindik */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        background: hasDocs ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                        border: hasDocs ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(148, 163, 184, 0.25)',
                        color: hasDocs ? 'var(--accent-green)' : '#94A3B8',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {hasDocs ? <FileCheck size={13} /> : <FileText size={13} />}
                        <span>{caseDocs.length} Dokumen</span>
                      </div>
                    </div>

                    {/* Tindak Pidana */}
                    <div style={{
                      fontSize: '12.5px',
                      color: '#E2E8F0',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--accent-red)'
                    }}>
                      {c.tindak_pidana || c.perkara || 'Tindak Pidana Umum'}
                    </div>

                    {/* Rincian Pelapor, Terlapor & Tanggal */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)'
                    }}>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: '10.5px' }}>Pelapor:</span>
                        <strong style={{ color: '#FFFFFF' }}>{c.nama_pelapor || c.pelapor_name || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: '10.5px' }}>Terlapor:</span>
                        <strong style={{ color: '#FFFFFF' }}>{c.nama_terlapor || c.terlapor_name || c.person?.nama || '-'}</strong>
                      </div>
                    </div>

                    {/* Footer Info: Tanggal & Tombol Aksi Masuk */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '10px',
                      marginTop: '4px',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A3B8' }}>
                        <Calendar size={12} />
                        <span>{formattedDate}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ff352d', fontWeight: 700 }}>
                        <span>Buka Arsip LP</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ============================================================== */
        /* TINGKAT 2: DAFTAR DOKUMEN DALAM LP TERPILIH                    */
        /* ============================================================== */
        <>
          {/* Tombol Kembali ke Daftar LP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedCaseForArchive(null)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '6px 12px'
              }}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Daftar LP</span>
            </button>

            {onOpenGenerator && (
              <button
                type="button"
                onClick={() => onOpenGenerator(selectedCaseForArchive)}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '6px 14px'
                }}
              >
                <Plus size={15} />
                <span>Buat Mindik Baru untuk LP Ini</span>
              </button>
            )}
          </div>

          {/* Dossier Banner LP Terpilih */}
          <div className="glass" style={{
            padding: '18px 22px',
            borderRadius: '12px',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 53, 45, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ff352d', fontWeight: 800 }}>
                  ARSIP DOKUMEN LAPORAN POLISI AKTIF
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 0' }}>
                  {selectedCaseForArchive.nomor_lp || selectedCaseForArchive.no_lp || '-'}
                </h3>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '6px 12px',
                borderRadius: '8px'
              }}>
                <FileCheck size={16} color="var(--accent-green)" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                  {getDocsForCase(selectedCaseForArchive).length} Dokumen Diterbitkan
                </span>
              </div>
            </div>

            {/* Rincian Kasus */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '12px 14px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>Tindak Pidana / Pasal:</span>
                <strong style={{ color: '#FFFFFF' }}>
                  {selectedCaseForArchive.tindak_pidana || '-'} {selectedCaseForArchive.pasal_uu ? `(${selectedCaseForArchive.pasal_uu})` : ''}
                </strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>Pelapor:</span>
                <strong style={{ color: '#FFFFFF' }}>{selectedCaseForArchive.nama_pelapor || selectedCaseForArchive.pelapor_name || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>Terlapor:</span>
                <strong style={{ color: '#FFFFFF' }}>{selectedCaseForArchive.nama_terlapor || selectedCaseForArchive.terlapor_name || selectedCaseForArchive.person?.nama || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8', fontSize: '11px', display: 'block' }}>Tanggal Laporan:</span>
                <strong style={{ color: '#FFFFFF' }}>
                  {formatTanggalIndonesia(selectedCaseForArchive.tanggal_lp || selectedCaseForArchive.sprin_date || selectedCaseForArchive.created_at) || '-'}
                </strong>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar Dokumen LP */}
          <div className="glass" style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
              <Search size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Cari Judul Dokumen, Kode, atau Nomor Surat..."
                value={docSearchTerm}
                onChange={(e) => setDocSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '34px', fontSize: '12.5px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kategori:</span>
              {['all', 'SURAT PERINTAH', 'SURAT', 'BERITA ACARA'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDocCategoryFilter(cat)}
                  className={`btn btn-sm ${docCategoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    ...(docCategoryFilter !== cat ? { background: '#1e262e', borderColor: 'rgba(255, 255, 255, 0.1)' } : {})
                  }}
                >
                  {cat === 'all' ? 'Semua' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Dokumen LP Terpilih */}
          <div className="table-container">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Kode Dokumen</th>
                  <th>Judul Administrasi Penyidikan</th>
                  <th style={{ width: '220px' }}>Nomor Surat</th>
                  <th style={{ width: '140px' }}>Tanggal Terbit</th>
                  <th style={{ textAlign: 'right', width: '280px' }}>Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {selectedCaseDocs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <FolderOpen size={44} color="#ff352d" style={{ opacity: 0.6 }} />
                        <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#FFFFFF' }}>
                          Belum ada dokumen Mindik yang diterbitkan untuk Laporan Polisi ini.
                        </div>
                        <p style={{ fontSize: '12px', margin: 0, maxWidth: '420px', lineHeight: 1.5, color: '#94A3B8' }}>
                          Seluruh dokumen administrasi penyidikan (SP.Sidik, SPDP, SP.Tap TSK, SP.Han, dll.) yang di-generate untuk LP ini akan otomatis tersimpan di sini.
                        </p>
                        {onOpenGenerator && (
                          <button
                            type="button"
                            onClick={() => onOpenGenerator(selectedCaseForArchive)}
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '8px', gap: '6px' }}
                          >
                            <Plus size={14} />
                            <span>Buat Mindik Baru</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  selectedCaseDocs.map((doc, idx) => {
                    const displayDate = (doc?.tgl_surat ? formatTanggalIndonesia(doc.tgl_surat) : null)
                      || (doc?.tanggal_surat ? formatTanggalIndonesia(doc.tanggal_surat) : null)
                      || (doc?.created_at ? formatTanggalIndonesia(doc.created_at) : '-');

                    const docNum = doc?.doc_number || doc?.nomor_surat || '-';
                    const docCode = doc?.template_code || doc?.code || 'MINDIK';

                    return (
                      <tr key={doc?.id || `case-doc-${idx}`}>
                        <td>
                          <span className="badge mono" style={{
                            background: '#1E293B',
                            color: '#38BDF8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            fontSize: '10.5px'
                          }}>
                            {docCode}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13px' }}>
                            {doc?.doc_title || doc?.title || doc?.nama_dokumen || 'Dokumen Administrasi Penyidikan'}
                          </div>
                          {doc?.metadata?.NAMA_TERSANGKA && (
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                              Tersangka: <strong style={{ color: '#E2E8F0' }}>{doc.metadata.NAMA_TERSANGKA}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 600 }}>
                            {docNum}
                          </span>
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                            {displayDate}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Tombol 1: Buka / Pratinjau */}
                            <button
                              type="button"
                              onClick={() => onPreviewDoc && onPreviewDoc(doc)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                              title="Buka / Pratinjau Dokumen Naskah Dinas Resmi"
                            >
                              <Eye size={13} />
                              <span>Buka / Pratinjau</span>
                            </button>

                            {/* Tombol 2: Unduh .docx */}
                            <button
                              type="button"
                              onClick={() => handleDownloadDocx(doc)}
                              disabled={isDownloading}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                gap: '4px',
                                color: 'var(--accent-cyan)',
                                borderColor: 'rgba(56, 189, 248, 0.3)'
                              }}
                              title="Unduh File Master Microsoft Word (.docx)"
                            >
                              <Download size={13} />
                              <span>Unduh .docx</span>
                            </button>

                            {/* Tombol 3: Hapus Arsip */}
                            {onDeleteDoc && (
                              <button
                                type="button"
                                onClick={() => setDocToDelete(doc)}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  gap: '4px',
                                  color: 'var(--accent-red)',
                                  borderColor: 'rgba(239, 68, 68, 0.3)'
                                }}
                                title="Hapus Dokumen dari Arsip Perkara"
                              >
                                <Trash2 size={13} />
                                <span>Hapus Arsip</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Konfirmasi Hapus Dokumen Arsip */}
      {docToDelete && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1200 }} 
          onClick={() => !isDeleting && setDocToDelete(null)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '480px', border: '1px solid var(--accent-red)' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertTriangle size={18} color="var(--accent-red)" />
                </div>
                <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: 'var(--accent-red)' }}>
                  Konfirmasi Hapus Arsip Mindik
                </h3>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus arsip dokumen mindik berikut dari perkara ini?
              </p>
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ fontWeight: 700, color: '#FFF' }}>
                  {docToDelete.doc_title || docToDelete.title || 'Dokumen Administrasi Penyidikan'}
                </div>
                <div className="mono" style={{ fontSize: '11.5px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  No: {docToDelete.doc_number || docToDelete.nomor_surat || '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                  LP: {docToDelete.nomor_lp || docToDelete.no_lp || selectedCaseForArchive?.nomor_lp || '-'}
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                Tindakan ini akan menghapus catatan arsip dari database Supabase dan tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setDocToDelete(null)} 
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  if (!onDeleteDoc) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteDoc(docToDelete);
                    setDocToDelete(null);
                  } catch (err) {
                    console.error('Error deleting doc:', err);
                    alert(`Gagal menghapus dokumen: ${err.message}`);
                  } finally {
                    setIsDeleting(false);
                  }
                }} 
                disabled={isDeleting}
                className="btn btn-primary btn-sm" 
                style={{ background: 'var(--accent-red)' }}
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Dokumen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
