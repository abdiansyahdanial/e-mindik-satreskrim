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
  ExternalLink
} from 'lucide-react';
import { 
  generatePdfBlob, 
  generateAndDownloadDocx, 
  buildMindikVariables,
  buildMindikPayload,
  formatTanggalIndonesia
} from '../utils/mindikGenerator';

export default function OfficialDocPreview({ 
  selectedCase, 
  template, 
  formValues = {}, 
  personnel = [],
  activeSuspect = null,
  suspectsList = [],
  activeVictim = null,
  victimsList = [],
  onSaveArchive,
  isSaved = false 
}) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);

  // References for memory management and debouncing
  const prevPdfUrlRef = useRef(null);
  const lastRenderedKeyRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const nomorSurat = formValues?.NOMOR_SURAT || formValues?.nomor_surat || '';
  const tanggalSurat = formValues?.TANGGAL_SURAT || formValues?.tanggal_surat || '';

  // Dynamic variable map from active case & form values
  const currentDataMap = selectedCase ? buildMindikVariables(
    selectedCase, 
    formValues, 
    template?.dynamic_fields, 
    personnel,
    { activeSuspect, suspectsList, activeVictim, victimsList, template }
  ) : {};

  // Core update function: True file-to-file conversion with memory cache & instant fallback
  const updatePreview = useCallback(async (isManual = false) => {
    if (!template || !selectedCase) return;

    if (!template.file_path) {
      setHasPhysicalFile(false);
      setErrorMessage(null);
      return;
    }

    // Optimization: If variables and template haven't changed, skip conversion
    const currentKey = `${template.id || template.file_path}_${activeSuspect?.id || 'all'}_${activeSuspect?.nama || ''}_${activeVictim?.id || activeVictim?.nama || 'vic'}_${nomorSurat}_${tanggalSurat}_${JSON.stringify(formValues)}`;
    if (!isManual && lastRenderedKeyRef.current === currentKey && prevPdfUrlRef.current) {
      return;
    }

    setHasPhysicalFile(true);
    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const res = await generatePdfBlob({
        template,
        caseData: selectedCase,
        activeCase: selectedCase,
        activeSuspect,
        suspectsList,
        activeVictim,
        victimsList,
        formValues,
        personnelList: personnel
      });

      if (!res.hasPhysicalFile || !res.pdfBlobUrl) {
        setHasPhysicalFile(false);
        return;
      }

      // Seamless transition: Revoke old Object URL only after new PDF is ready
      if (prevPdfUrlRef.current && prevPdfUrlRef.current !== res.pdfBlobUrl) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
      }

      prevPdfUrlRef.current = res.pdfBlobUrl;
      lastRenderedKeyRef.current = currentKey;
      setPdfUrl(res.pdfBlobUrl);
    } catch (err) {
      console.error('PDF conversion error:', err);
      setErrorMessage(`Gagal mengonversi berkas dokumen asli ke PDF: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  }, [template, selectedCase, activeSuspect, suspectsList, activeVictim, victimsList, formValues, personnel, nomorSurat, tanggalSurat]);

  // Live synchronization: triggers instantly when selectedSuspect, nomorSurat, or tanggalSurat changes
  useEffect(() => {
    if (!template || !selectedCase) {
      if (prevPdfUrlRef.current) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
        prevPdfUrlRef.current = null;
      }
      setPdfUrl(null);
      lastRenderedKeyRef.current = null;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updatePreview(false);
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    template?.id, 
    template?.file_path, 
    selectedCase?.id, 
    activeSuspect, 
    activeSuspect?.id, 
    activeSuspect?.nama,
    activeSuspect?.nik,
    activeSuspect?.nomor_sp_tap, 
    activeSuspect?.tanggal_sp_tap, 
    nomorSurat, 
    tanggalSurat, 
    JSON.stringify(formValues), 
    updatePreview
  ]);

  // Clean-up Object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (prevPdfUrlRef.current) {
        URL.revokeObjectURL(prevPdfUrlRef.current);
      }
    };
  }, []);

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
        activeCase: selectedCase,
        activeSuspect,
        suspectsList,
        activeVictim,
        victimsList,
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
        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} />
            <span>DOKUMEN ASLI FISIK (PDF F4 POLRI)</span>
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
          {currentDataMap?.TANGGAL_SURAT && (
            <span className="badge badge-blue" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} title="Tanggal resmi surat">
              <span>{currentDataMap.TEMPAT_SURAT || 'Tirawuta'}, {currentDataMap.TANGGAL_SURAT}</span>
            </span>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh button */}
          {template?.file_path && (
            <button
              type="button"
              onClick={() => updatePreview(true)}
              disabled={isUpdating}
              className="btn btn-secondary btn-sm"
              title="Paksa pembaruan pratinjau PDF seketika tanpa menunggu debounce"
            >
              <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
              <span>{isUpdating ? 'Memperbarui...' : 'Segarkan Pratinjau'}</span>
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

          {pdfUrl && (
            <button 
              type="button"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="btn btn-secondary btn-sm"
              title="Buka lembar PDF penuh di tab baru untuk dicetak"
            >
              <Printer size={13} />
              <span>Cetak / PDF</span>
            </button>
          )}
        </div>

        {/* Chain of Reference Strip */}
        {selectedCase && (currentDataMap?.NOMOR_LP || currentDataMap?.NO_SPRIN_SIDIK) && (
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '8px',
            marginTop: '2px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>RANTAI RUJUKAN:</span>
            {currentDataMap.NOMOR_LP && (
              <span>LP: <strong style={{ color: '#fff' }}>{currentDataMap.NOMOR_LP}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TANGGAL_LP || '-'}</span>)</span>
            )}
            {currentDataMap.NO_SPRIN_SIDIK && (
              <span>SP.Sidik: <strong style={{ color: '#fff' }}>{currentDataMap.NO_SPRIN_SIDIK}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_SPRIN_SIDIK || '-'}</span>)</span>
            )}
            {currentDataMap.NO_SPRIN_GAS_SIDIK && currentDataMap.NO_SPRIN_GAS_SIDIK !== '-' && (
              <span>SP.Gas.Sidik: <strong style={{ color: '#fff' }}>{currentDataMap.NO_SPRIN_GAS_SIDIK}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_SPRIN_GAS_SIDIK || '-'}</span>)</span>
            )}
            {currentDataMap.NO_SPDP && (
              <span>SPDP: <strong style={{ color: '#fff' }}>{currentDataMap.NO_SPDP}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_SPDP || '-'}</span>)</span>
            )}
            {currentDataMap.NO_SP_TAP_TSK && (
              <span>SP.Tap.Tsk: <strong style={{ color: '#fff' }}>{currentDataMap.NO_SP_TAP_TSK}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_SP_TAP_TSK || '-'}</span>)</span>
            )}
            {currentDataMap.NO_SPRIN_HAN && (
              <span>SP.Han: <strong style={{ color: '#fff' }}>{currentDataMap.NO_SPRIN_HAN}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_SPRIN_HAN || '-'}</span>)</span>
            )}
            {currentDataMap.NO_P21_KN && (
              <span>P-21: <strong style={{ color: '#fff' }}>{currentDataMap.NO_P21_KN}</strong> (tgl: <span style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.TGL_P21_KN || '-'}</span>)</span>
            )}
          </div>
        )}

        {/* Pejabat & Penandatangan Strip */}
        {selectedCase && (currentDataMap?.ATASAN_NAMA || currentDataMap?.PENYIDIK_1_NAMA) && (
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
            paddingTop: '6px',
            marginTop: '2px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#93C5FD', fontWeight: 700 }}>PENANDATANGAN OTOMATIS:</span>
            {currentDataMap.ATASAN_NAMA && (
              <span>Kasat: <strong style={{ color: '#fff' }}>{currentDataMap.ATASAN_PANGKAT} {currentDataMap.ATASAN_NAMA}</strong> {currentDataMap.ATASAN_NRP ? `(NRP: ${currentDataMap.ATASAN_NRP})` : ''}</span>
            )}
            {currentDataMap.PENYIDIK_1_NAMA && (
              <span>Kanit/P1: <strong style={{ color: '#fff' }}>{currentDataMap.PENYIDIK_1_PANGKAT} {currentDataMap.PENYIDIK_1_NAMA}</strong> {currentDataMap.PENYIDIK_1_NRP ? `(NRP: ${currentDataMap.PENYIDIK_1_NRP})` : ''}</span>
            )}
            {currentDataMap.PENYIDIK_2_NAMA && (
              <span>P2: <strong style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.PENYIDIK_2_NAMA}</strong></span>
            )}
            {currentDataMap.PENYIDIK_3_NAMA && (
              <span>P3: <strong style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.PENYIDIK_3_NAMA}</strong></span>
            )}
            {currentDataMap.PENYIDIK_4_NAMA && (
              <span>P4: <strong style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.PENYIDIK_4_NAMA}</strong></span>
            )}
            {currentDataMap.PENYIDIK_5_NAMA && (
              <span>P5: <strong style={{ color: 'var(--accent-cyan)' }}>{currentDataMap.PENYIDIK_5_NAMA}</strong></span>
            )}
          </div>
        )}
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
              Diinjeksikan langsung ke tag kurung kurawal template Word master asli
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

      {/* Main Document Display Canvas */}
      {!hasPhysicalFile && template && !template.file_path ? (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          background: '#0F172A',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #334155',
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
            Unggah file master template melalui menu <strong>Template Studio</strong> agar lembar dokumen dapat dikonversi ke PDF fisik kedinasan.
          </div>
        </div>
      ) : !pdfUrl ? (
        <div 
          className="relative w-full h-full min-h-[85vh] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl"
          style={{
            position: 'relative',
            width: '100%',
            height: '85vh',
            minHeight: '85vh',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            gap: '12px'
          }}
        >
          <div 
            className="animate-spin"
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%'
            }}
          />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
            Memuat Dokumen Fisik Asli...
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Menginjeksi variabel perkara &rarr; Konversi ke format PDF F4 standar Polri
          </div>
        </div>
      ) : (
        /* Native PDF Iframe Display with Smooth Loading Overlay */
        <div 
          className="relative w-full h-full min-h-[85vh] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl"
          style={{
            position: 'relative',
            width: '100%',
            height: '85vh',
            minHeight: '85vh',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}
        >
          {isUpdating && (
            <div 
              className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-800/90 text-blue-400 text-xs px-3 py-1.5 rounded-full border border-blue-500/30 shadow-lg backdrop-blur"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                color: '#60a5fa',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(4px)'
              }}
            >
              <span 
                className="w-2 h-2 rounded-full bg-blue-400 animate-ping"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#60a5fa'
                }}
              />
              Memperbarui pratinjau...
            </div>
          )}
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            title="Live Preview Mindik Asli"
            className="w-full h-full min-h-[85vh] border-0 bg-slate-800"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '85vh',
              border: 'none',
              backgroundColor: '#1e293b'
            }}
          />
        </div>
      )}
    </div>
  );
}
