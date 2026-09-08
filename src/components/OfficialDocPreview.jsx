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
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);

  // Reference to the canvas container for docx-preview
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Dynamic variable map from active case & form values
  const currentDataMap = selectedCase ? buildDocxDataMap({ 
    caseData: selectedCase, 
    formValues, 
    personnelList: personnel 
  }) : {};

  // Instant local rendering flow: Master DOCX -> Injeksi variabel via Docxtemplater -> Render via docx-preview
  const renderDocx = useCallback(async () => {
    if (!template || !selectedCase) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    if (!template.file_path) {
      setHasPhysicalFile(false);
      setRenderError(null);
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    setHasPhysicalFile(true);
    setIsLoading(true);
    setRenderError(null);

    try {
      // 1. Ambil template Word asli dari Supabase Storage & isi variabel {tag}
      const res = await generateDocxBlob({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      if (!res.hasPhysicalFile || !res.blob) {
        setHasPhysicalFile(false);
        if (containerRef.current) containerRef.current.innerHTML = '';
        return;
      }

      // 2. Render instan lembar Word asli via docx-preview ke canvas container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(res.blob, containerRef.current, undefined, {
          className: 'docx-preview-sheet',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true
        });
      }
    } catch (err) {
      console.error('docx-preview render error:', err);
      setRenderError(`Gagal membaca atau merender berkas Word: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [template, selectedCase, formValues, personnel]);

  // Debounce cepat (300ms) saat user mengetik di formulir agar pratinjau terasa instan (< 500ms)
  useEffect(() => {
    if (!template || !selectedCase) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      renderDocx();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [template?.id, template?.file_path, selectedCase?.id, JSON.stringify(formValues), renderDocx]);

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

  // Handle direct DOCX download from Supabase
  const handleDownloadDocx = async () => {
    if (!template || !selectedCase) return;
    setIsDownloading(true);
    setDownloadSuccessNotice(null);
    try {
      const res = await generateAndDownloadDocx({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });
      setDownloadSuccessNotice(`Berhasil generate file '${res.filename}'!`);
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Docx download error:', err);
      alert(`Gagal mengunduh file .docx: ${err.message}`);
    } finally {
      setIsDownloading(false);
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
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} />
            <span>DOKUMEN WORD ASLI (100% PERSIS)</span>
          </span>
          {template?.file_path ? (
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} />
              <span>TEMPLATE .DOCX (SUPABASE)</span>
            </span>
          ) : (
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>
              BELUM ADA MASTER FILE .DOCX
            </span>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh button */}
          {template?.file_path && (
            <button
              type="button"
              onClick={renderDocx}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
              title="Perbarui pratinjau dokumen Word langsung di browser"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Merender...' : 'Segarkan'}</span>
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

          {/* Download DOCX */}
          {template?.file_path && (
            <button 
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadDocx}
              className="btn btn-primary btn-sm"
              style={{
                boxShadow: 'var(--glow-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Generate dan unduh file Word (.docx) murni dari template Supabase Storage"
            >
              {isDownloading ? (
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

          <button 
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
            title="Cetak langsung layout Word asli atau Simpan ke PDF"
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
              Diinjeksikan langsung ke tag kurung kurawal template Word asli
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

      {/* Main Word Canvas Container */}
      <div 
        className="docx-canvas-container"
        style={{
          background: '#0f172a',
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
        {isLoading && (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              Merender Dokumen Word Asli...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Memproses tata letak fisik, kop, logo, dan margin asli dari master file .docx
            </div>
          </div>
        )}

        {/* Empty state when template doesn't have physical .docx file yet */}
        {!hasPhysicalFile && !isLoading && (
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
              Unggah file master template melalui menu <strong>Template Studio</strong> agar lembar dokumen dapat dirender secara presisi menggunakan layout asli Microsoft Word.
            </div>
          </div>
        )}

        {/* Elemen Penampung Kanvas docx-preview */}
        <div 
          id="docx-render-container" 
          ref={containerRef}
          style={{
            width: '100%',
            display: hasPhysicalFile && !isLoading ? 'flex' : 'none',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        />
      </div>
    </div>
  );
}
