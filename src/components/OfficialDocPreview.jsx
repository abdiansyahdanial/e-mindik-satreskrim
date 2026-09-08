import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  FileText, 
  Table, 
  Sparkles, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { 
  generatePdfBlob, 
  generateAndDownloadDocx, 
  buildDocxDataMap 
} from '../services/mindikGenerator';

export default function OfficialDocPreview({ 
  pdfBlobUrl: externalPdfBlobUrl, 
  isLoading: externalIsLoading,
  selectedCase, 
  template, 
  formValues = {}, 
  personnel = [],
  onSaveArchive,
  isSaved = false 
}) {
  // State isConverting (loading indicator saat sistem merender lembar PDF baru)
  const [internalPdfBlobUrl, setInternalPdfBlobUrl] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);

  // Debounce timer ref (1 detik auto-trigger setelah pengguna selesai mengetik)
  const debounceTimerRef = useRef(null);

  // Reference for active object URL to guarantee strict memory cleanup
  const activeBlobUrlRef = useRef(null);

  // Dynamic variable map from active case & form values
  const currentDataMap = selectedCase ? buildDocxDataMap({ 
    caseData: selectedCase, 
    formValues, 
    personnelList: personnel 
  }) : {};

  // Clean up object URL helper
  const cleanupActiveBlobUrl = useCallback(() => {
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (err) {
        console.warn('Revoke object URL warning:', err);
      }
      activeBlobUrlRef.current = null;
    }
  }, []);

  // Core conversion execution: DOCX -> PDF -> PDF Viewer
  const executeConversion = useCallback(async () => {
    if (!template || !selectedCase) {
      cleanupActiveBlobUrl();
      setInternalPdfBlobUrl(null);
      return;
    }

    if (!template.file_path) {
      setHasPhysicalFile(false);
      cleanupActiveBlobUrl();
      setInternalPdfBlobUrl(null);
      setErrorMessage(null);
      return;
    }

    setHasPhysicalFile(true);
    setIsConverting(true);
    setErrorMessage(null);

    try {
      const res = await generatePdfBlob({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      if (!res.hasPhysicalFile || !res.pdfBlobUrl) {
        setHasPhysicalFile(false);
        cleanupActiveBlobUrl();
        setInternalPdfBlobUrl(null);
        return;
      }

      // Bersihkan URL objek lama sebelum memasang URL objek yang baru
      cleanupActiveBlobUrl();
      activeBlobUrlRef.current = res.pdfBlobUrl;
      setInternalPdfBlobUrl(res.pdfBlobUrl);
    } catch (err) {
      console.error('PDF Conversion error:', err);
      setErrorMessage(`Gagal mengonversi dokumen ke PDF: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  }, [template, selectedCase, formValues, personnel, cleanupActiveBlobUrl]);

  // Auto-trigger debounce 1 second after user finishes editing
  useEffect(() => {
    if (externalPdfBlobUrl !== undefined) return;

    if (!template || !selectedCase) {
      cleanupActiveBlobUrl();
      setInternalPdfBlobUrl(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeConversion();
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [template?.id, template?.file_path, selectedCase?.id, JSON.stringify(formValues), externalPdfBlobUrl, executeConversion, cleanupActiveBlobUrl]);

  // Clean-up object URL saat komponen unmount atau saat perkara/template berganti
  useEffect(() => {
    return () => {
      cleanupActiveBlobUrl();
    };
  }, [cleanupActiveBlobUrl]);

  useEffect(() => {
    cleanupActiveBlobUrl();
    setInternalPdfBlobUrl(null);
  }, [selectedCase?.id, template?.id, cleanupActiveBlobUrl]);

  // Determine active state
  const activeLoading = externalIsLoading !== undefined ? externalIsLoading : isConverting;
  const activePdfUrl = externalPdfBlobUrl !== undefined ? externalPdfBlobUrl : internalPdfBlobUrl;

  // Handle direct DOCX download
  const handleDownloadDocx = async () => {
    if (!template || !selectedCase) return;
    setIsDownloadingDocx(true);
    setDownloadSuccessNotice(null);
    try {
      const res = await generateAndDownloadDocx({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });
      setDownloadSuccessNotice(`Berhasil membuat file '${res.filename}'!`);
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Docx download error:', err);
      alert(`Gagal mengunduh .docx: ${err.message}`);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Handle direct PDF download
  const handleDownloadPdf = () => {
    if (!activePdfUrl) return;
    const cleanTitle = (template?.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanNoLp = (selectedCase?.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const a = document.createElement('a');
    a.href = activePdfUrl;
    a.download = `${cleanTitle}_${cleanNoLp}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Action Toolbar */}
      <div className="no-print toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#0F172A',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} />
            <span>PDF VIEWER PRESISI (F4 FOLIO)</span>
          </span>
          {template?.file_path ? (
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} />
              <span>DOKUMEN ASLI .DOCX (SUPABASE)</span>
            </span>
          ) : (
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
              BELUM ADA MASTER FILE .DOCX
            </span>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh button with isConverting spinner */}
          {template?.file_path && (
            <button
              type="button"
              onClick={executeConversion}
              disabled={activeLoading}
              className="btn btn-secondary btn-sm"
              title="Segarkan dan render ulang dokumen PDF"
            >
              <RefreshCw size={13} className={activeLoading ? 'animate-spin' : ''} />
              <span>{activeLoading ? 'Sedang Merender PDF...' : 'Segarkan Pratinjau'}</span>
            </button>
          )}

          {/* Toggle Variable Map */}
          {selectedCase && (
            <button
              type="button"
              onClick={() => setShowVariableMap(!showVariableMap)}
              className="btn btn-secondary btn-sm"
              title="Cek daftar pemetaan variabel dinamis perkara"
            >
              <Table size={13} />
              <span>{showVariableMap ? 'Tutup Variabel' : 'Cek Variabel'}</span>
            </button>
          )}

          {/* Download PDF */}
          {activePdfUrl && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="btn btn-secondary btn-sm"
              title="Unduh file PDF resmi hasil konversi"
            >
              <Download size={13} />
              <span>Unduh .pdf</span>
            </button>
          )}

          {/* Download DOCX */}
          {template?.file_path && (
            <button 
              type="button"
              disabled={isDownloadingDocx}
              onClick={handleDownloadDocx}
              className="btn btn-primary btn-sm"
              style={{
                boxShadow: 'var(--glow-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Generate dan unduh file Word (.docx) murni dari Supabase Storage"
            >
              {isDownloadingDocx ? (
                <>
                  <RefreshCw size={13} className="animate-pulse" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Unduh .docx</span>
                </>
              )}
            </button>
          )}

          {onSaveArchive && (
            <button 
              type="button"
              onClick={onSaveArchive}
              className="btn btn-secondary btn-sm"
            >
              <CheckCircle2 size={13} color={isSaved ? 'var(--accent-green)' : 'currentColor'} />
              <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notice */}
      {downloadSuccessNotice && (
        <div className="no-print" style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid var(--accent-green)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '12.5px',
          animation: 'slideInRight 200ms ease-out',
        }}>
          <CheckCircle2 size={16} color="var(--accent-green)" />
          <span>{downloadSuccessNotice}</span>
        </div>
      )}

      {/* Render Error Alert */}
      {errorMessage && (
        <div className="no-print" style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid var(--accent-red)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '12px',
        }}>
          <AlertCircle size={16} color="var(--accent-red)" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Variable Map Inspector */}
      {showVariableMap && currentDataMap && (
        <div className="no-print glass" style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--accent-cyan)',
          maxHeight: '260px',
          overflowY: 'auto',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
              VARIABEL DINAMIS DOKUMEN SUPABASE (TOTAL: {Object.keys(currentDataMap).length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Nilai null/undefined otomatis diganti string kosong atau strip (-)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px' }}>
            {Object.entries(currentDataMap).map(([key, val]) => (
              <div key={key} style={{
                padding: '6px 10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{`{${key}}`}:</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word' }}>
                  {val !== null && val !== undefined && val !== '' ? String(val).slice(0, 32) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main PDF Viewer Display Area */}
      <div 
        style={{
          width: '100%',
          minHeight: '85vh',
          height: '85vh',
          background: '#0F172A',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid #334155',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {activeLoading ? (
          <div 
            className="flex flex-col items-center justify-center h-full min-h-[600px] text-slate-400"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '600px',
              color: '#94A3B8',
              gap: '12px'
            }}
          >
            <div 
              className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #3B82F6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '12px'
              }}
            />
            <p className="text-sm font-medium" style={{ fontSize: '14px', fontWeight: 500, color: '#E2E8F0' }}>
              Sedang memproses dokumen kedinasan (100% presisi)...
            </p>
            <p style={{ fontSize: '12px', color: '#64748B' }}>
              Injeksi variabel perkara &rarr; Konversi ke format PDF F4 standar Polri
            </p>
          </div>
        ) : !hasPhysicalFile && template && !template.file_path ? (
          <div style={{
            margin: 'auto',
            padding: '40px 24px',
            textAlign: 'center',
            maxWidth: '520px',
            color: '#94A3B8'
          }}>
            <FileText size={48} style={{ color: '#F59E0B', margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#FFFFFF', marginBottom: '8px' }}>
              Master Template Word (.docx) Belum Tersedia
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px' }}>
              Template <strong>"{template.title}"</strong> belum ditautkan dengan file fisik <code>.docx</code> di Supabase Storage.
            </p>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Unggah file master template melalui menu <strong>Template Studio</strong> agar sistem dapat menginjeksi variabel perkara dan menghasilkan pratinjau PDF kedinasan.
            </div>
          </div>
        ) : !activePdfUrl ? (
          <div 
            className="flex items-center justify-center h-full min-h-[600px] text-slate-500 text-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '600px',
              color: '#64748B',
              fontSize: '14px'
            }}
          >
            Pilih berkas perkara dan format template untuk menampilkan pratinjau.
          </div>
        ) : (
          <iframe
            src={`${activePdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
            title="Pratinjau Dokumen Kedinasan"
            className="w-full h-full min-h-[85vh] border-none"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '85vh',
              border: 'none',
              flex: 1
            }}
          />
        )}
      </div>
    </div>
  );
}
