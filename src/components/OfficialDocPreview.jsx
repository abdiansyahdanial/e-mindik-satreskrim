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
  FileCheck,
  Layers
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { 
  generateDocxBlob,
  generateAndDownloadDocx, 
  buildDocxDataMap
} from '../services/mindikGenerator';

export default function OfficialDocPreview({ 
  selectedCase, 
  template, 
  formValues = {}, 
  personnel = [],
  onSaveArchive,
  isSaved = false 
}) {
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);

  // Reference for docx-preview canvas container
  const docContainerRef = useRef(null);

  // Build complete dynamic data map from actual record
  const currentDataMap = selectedCase ? buildDocxDataMap({ 
    caseData: selectedCase, 
    formValues, 
    personnelList: personnel 
  }) : {};

  // Main flow: Fetch binary .docx from Supabase Storage, inject variables via Docxtemplater,
  // then render with docx-preview into docContainerRef
  const loadDocxPreview = useCallback(async () => {
    if (!template || !selectedCase) return;

    // Check if template has physical file in Supabase Storage
    if (!template.file_path) {
      setHasPhysicalFile(false);
      setRenderError(null);
      if (docContainerRef.current) {
        docContainerRef.current.innerHTML = '';
      }
      return;
    }

    setHasPhysicalFile(true);
    setIsLoadingPreview(true);
    setRenderError(null);

    try {
      // 1. Ambil file binary (.docx / blob) dari Supabase Storage & isi variabel dinamis
      const result = await generateDocxBlob({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      if (!result.hasPhysicalFile || !result.blob) {
        setHasPhysicalFile(false);
        if (docContainerRef.current) {
          docContainerRef.current.innerHTML = '';
        }
        return;
      }

      // 2. Gunakan engine docx-preview untuk merender dokumen Word asli
      if (docContainerRef.current) {
        docContainerRef.current.innerHTML = ''; // bersihkan preview lama
        await renderAsync(result.blob, docContainerRef.current, undefined, {
          className: 'mindik-docx-render',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          breakPages: true
        });
      }
    } catch (err) {
      console.error('docx-preview render error:', err);
      setRenderError(`Gagal membaca atau merender file Word .docx: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [template, selectedCase, formValues, personnel]);

  useEffect(() => {
    loadDocxPreview();
  }, [loadDocxPreview]);

  if (!selectedCase || !template) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'var(--bg-glass)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-glass)',
        color: 'var(--text-secondary)'
      }}>
        Pilih Perkara dan Template Dokumen untuk menampilkan pratinjau resmi.
      </div>
    );
  }

  // Trigger real Docx generation from Supabase Storage
  const handleGenerateDocx = async () => {
    setIsGeneratingDocx(true);
    setDownloadSuccessNotice(null);
    try {
      const res = await generateAndDownloadDocx({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      setDownloadSuccessNotice(`Berhasil generate file '${res.filename}' dari Supabase Storage!`);
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Docx generation error:', err);
      alert(`Gagal membuat file .docx: ${err.message}`);
    } finally {
      setIsGeneratingDocx(false);
    }
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
        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} />
            <span>WORD VIEWER (DOCX-PREVIEW)</span>
          </span>
          {template.file_path ? (
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh Preview */}
          {template.file_path && (
            <button
              type="button"
              onClick={loadDocxPreview}
              disabled={isLoadingPreview}
              className="btn btn-secondary btn-sm"
              title="Perbarui Pratinjau Dokumen Asli"
            >
              <RefreshCw size={13} className={isLoadingPreview ? 'animate-spin' : ''} />
              <span>{isLoadingPreview ? 'Merender...' : 'Segarkan'}</span>
            </button>
          )}

          {/* Toggle Variable Map */}
          <button
            type="button"
            onClick={() => setShowVariableMap(!showVariableMap)}
            className="btn btn-secondary btn-sm"
            title="Lihat pemetaan variabel {CASE_*}, {DOC_*}, dll."
          >
            <Table size={13} />
            <span>{showVariableMap ? 'Tutup Variabel' : 'Cek Variabel'}</span>
          </button>

          {/* Download Real .docx from Supabase */}
          <button 
            type="button"
            disabled={isGeneratingDocx || !template.file_path}
            onClick={handleGenerateDocx}
            className="btn btn-primary btn-sm"
            style={{
              boxShadow: 'var(--glow-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Generate dan unduh file Word (.docx) resmi dari Supabase Storage"
          >
            {isGeneratingDocx ? (
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

          <button 
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
            title="Cetak langsung layout Word atau Simpan ke PDF"
          >
            <Printer size={13} />
            <span>Cetak / PDF</span>
          </button>
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
      {renderError && (
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
          <span>{renderError}</span>
        </div>
      )}

      {/* Variable Map Inspector */}
      {showVariableMap && (
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

      {/* Kontainer Luar Pratinjau Dokumen (Mirip Word / Google Docs Viewer) */}
      <div 
        className="mindik-viewer-container"
        style={{
          background: '#1e293b',
          padding: '24px',
          overflowX: 'auto',
          overflowY: 'auto',
          minHeight: '750px',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* Loading Spinner */}
        {isLoadingPreview && (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            <div style={{ fontWeight: 700, fontSize: '15px' }}>
              Merender Dokumen Word Asli via Engine docx-preview...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Memproses ukuran kertas fisik, margin kedinasan, tabel, dan header/footer Word
            </div>
          </div>
        )}

        {/* Empty state when template doesn't have physical .docx file yet */}
        {!hasPhysicalFile && !isLoadingPreview && (
          <div style={{
            margin: 'auto',
            padding: '40px 24px',
            textAlign: 'center',
            maxWidth: '520px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px dashed var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)'
          }}>
            <FileText size={48} style={{ color: '#F59E0B', margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF', marginBottom: '8px' }}>
              Master Template Word (.docx) Belum Tersedia
            </div>
            <p style={{ fontSize: '12.5px', lineHeight: 1.5, margin: '0 0 16px' }}>
              Template <strong>"{template.title}"</strong> belum ditautkan dengan file dokumen fisik <code>.docx</code> di Supabase Storage.
            </p>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Unggah file master template melalui menu <strong>Template Studio</strong> agar lembar dokumen dapat dirender secara presisi menggunakan engine <code>docx-preview</code>.
            </div>
          </div>
        )}

        {/* Elemen Penampung Kanvas docx-preview */}
        <div 
          id="docx-container" 
          ref={docContainerRef}
          style={{
            width: '100%',
            display: hasPhysicalFile && !isLoadingPreview ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        />
      </div>
    </div>
  );
}
