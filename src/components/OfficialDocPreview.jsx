import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { generatePdfBlob, generateDocxBlob } from '../services/mindikGenerator';

export default function OfficialDocPreview({ 
  selectedCase, 
  template, 
  formValues = {}, 
  personnel = [],
  personnelList = [],
  activeSuspect = null,
  suspectsList = [],
  activeVictim = null,
  victimsList = [],
  onSaveArchive,
  isSaved = false 
}) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState(true);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState(null);

  // Debounce formValues (350ms) agar pengetikan tidak membebani proses konversi
  const [debouncedFormValues, setDebouncedFormValues] = useState(formValues);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFormValues(formValues);
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [formValues]);

  const iframeRef = useRef(null);
  const currentBlobUrlRef = useRef(null);

  // Sync ref with pdfBlobUrl
  useEffect(() => {
    currentBlobUrlRef.current = pdfBlobUrl;
  }, [pdfBlobUrl]);

  // Normalize personnel list
  const effectivePersonnel = useMemo(() => {
    return personnelList && personnelList.length > 0 ? personnelList : (personnel || []);
  }, [personnelList, personnel]);

  // Check physical file availability from template metadata
  const isTemplateInStudio = Boolean(
    (template?.file_path && String(template.file_path).trim()) || 
    (template?.file_url && String(template.file_url).trim())
  );

  // Generate PDF preview saat template, selectedCase, atau debouncedFormValues berubah
  useEffect(() => {
    if (!template || !selectedCase) {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
      setIsLoadingPdf(false);
      return;
    }

    if (!isTemplateInStudio) {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      setHasPhysicalFile(false);
      setPdfBlobUrl(null);
      setIsLoadingPdf(false);
      return;
    }

    let isMounted = true;

    setIsLoadingPdf(true);
    setErrorMsg(null);

    const generatePreview = async () => {
      try {
        const res = await generatePdfBlob({
          template,
          caseData: selectedCase,
          activeCase: selectedCase,
          activeSuspect,
          suspectsList,
          activeVictim,
          victimsList,
          formValues: debouncedFormValues,
          personnelList: effectivePersonnel,
          bypassCache: true
        });

        if (!isMounted) {
          if (res?.pdfBlobUrl) {
            URL.revokeObjectURL(res.pdfBlobUrl);
          }
          return;
        }

        if (!res?.hasPhysicalFile) {
          setHasPhysicalFile(false);
          if (currentBlobUrlRef.current) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
            currentBlobUrlRef.current = null;
          }
          setPdfBlobUrl(null);
          return;
        }

        setHasPhysicalFile(true);

        if (res?.pdfBlobUrl) {
          // Bersihkan blob URL lama sebelum memasang URL pratinjau yang baru
          if (currentBlobUrlRef.current && currentBlobUrlRef.current !== res.pdfBlobUrl) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
          }
          currentBlobUrlRef.current = res.pdfBlobUrl;
          setPdfBlobUrl(res.pdfBlobUrl);
        }
      } catch (err) {
        console.error('Gagal memuat pratinjau PDF:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Gagal memproses konversi dokumen ke PDF.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingPdf(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [
    template, 
    selectedCase, 
    debouncedFormValues, 
    effectivePersonnel, 
    activeSuspect, 
    suspectsList, 
    activeVictim, 
    victimsList, 
    isTemplateInStudio
  ]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  // Tombol Unduh .docx via generateDocxBlob
  const handleDownloadDocx = async () => {
    if (!template || !selectedCase || !isTemplateInStudio) return;
    setIsDownloadingDocx(true);
    setDownloadNotice(null);
    try {
      const res = await generateDocxBlob({
        template,
        caseData: selectedCase,
        activeCase: selectedCase,
        activeSuspect,
        suspectsList,
        activeVictim,
        victimsList,
        formValues,
        personnelList: effectivePersonnel
      });

      if (!res.hasPhysicalFile || !res.blob) {
        alert('Template ini belum memiliki file master fisik .docx di Template Studio.');
        return;
      }

      saveAs(res.blob, res.filename || `${template.title || 'Dokumen'}.docx`);
      setDownloadNotice(`Berhasil mengunduh '${res.filename}'!`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      console.error('Docx download error:', err);
      alert(`Gagal mengunduh file .docx: ${err.message}`);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Tombol Cetak / Simpan PDF
  const handlePrintPdf = () => {
    if (!pdfBlobUrl) return;
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print failed, opening in new tab:', err);
        window.open(pdfBlobUrl, '_blank');
      }
    } else {
      window.open(pdfBlobUrl, '_blank');
    }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Toolbar */}
      <div className="no-print toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-glass)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-glass)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-primary mono" style={{ fontSize: '11px', fontWeight: 600 }}>
            {template.code || 'DOC'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {template.title || template.name}
          </span>
          {pdfBlobUrl && !isLoadingPdf && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              PDF Master Asli
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tombol Unduh .docx */}
          <button 
            type="button"
            disabled={isDownloadingDocx || !isTemplateInStudio}
            onClick={handleDownloadDocx}
            className="btn btn-primary btn-sm"
            style={{
              boxShadow: isTemplateInStudio ? '0 4px 14px rgba(255, 53, 45, 0.35)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isTemplateInStudio ? 1 : 0.5,
              cursor: isTemplateInStudio ? 'pointer' : 'not-allowed'
            }}
            title={isTemplateInStudio ? "Generate dan unduh file Word (.docx) murni dari template Supabase Storage" : "Master dokumen .docx belum diunggah di Template Studio"}
          >
            {isDownloadingDocx ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Unduh .docx</span>
              </>
            )}
          </button>

          {/* Tombol Simpan Dokumen (Arsip) */}
          {onSaveArchive && (
            <button 
              type="button"
              disabled={!isTemplateInStudio}
              onClick={onSaveArchive}
              className="btn btn-secondary btn-sm"
              style={{
                opacity: isTemplateInStudio ? 1 : 0.5,
                cursor: isTemplateInStudio ? 'pointer' : 'not-allowed'
              }}
              title={isTemplateInStudio ? "Simpan arsip dokumen ke database" : "Master dokumen belum tersedia"}
            >
              <CheckCircle2 size={13} color={isSaved ? 'var(--accent-green)' : 'currentColor'} />
              <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          )}

          {/* Tombol Cetak / Simpan PDF */}
          <button 
            type="button"
            disabled={!pdfBlobUrl || isLoadingPdf || !isTemplateInStudio}
            onClick={handlePrintPdf}
            className="btn btn-secondary btn-sm"
            style={{
              opacity: (pdfBlobUrl && !isLoadingPdf) ? 1 : 0.5,
              cursor: (pdfBlobUrl && !isLoadingPdf) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Cetak langsung atau simpan sebagai PDF"
          >
            <Printer size={13} />
            <span>Cetak / Simpan PDF</span>
          </button>

          {/* Buka di Tab Baru jika PDF tersedia */}
          {pdfBlobUrl && (
            <button
              type="button"
              onClick={() => window.open(pdfBlobUrl, '_blank')}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 8px' }}
              title="Buka PDF di tab browser baru"
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Download notice */}
      {downloadNotice && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#34d399',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={14} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preview Body */}
      <div style={{ width: '100%', minHeight: '85vh', position: 'relative' }}>
        {/* State 1: Belum ada file fisik di Supabase */}
        {!hasPhysicalFile || !isTemplateInStudio ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            background: 'var(--bg-glass)',
            borderRadius: '8px',
            border: '1px dashed var(--border-glass)',
            padding: '32px',
            textAlign: 'center',
            gap: '12px'
          }}>
            <FileText size={48} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Template ini belum memiliki file master fisik .docx di Template Studio.
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '500px', margin: 0 }}>
              Silakan unggah berkas template .docx asli ke menu <strong>Template Studio</strong> agar sistem dapat menginjeksi variabel dan menampilkan pratinjau dokumen PDF resmi Polri.
            </p>
          </div>
        ) : isLoadingPdf ? (
          /* State 2: Loading PDF */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '85vh',
            background: '#1a1d24',
            borderRadius: '8px',
            gap: '14px',
            color: '#cbd5e1'
          }}>
            <RefreshCw size={36} className="animate-spin" style={{ color: '#ff352d' }} />
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              Memuat Dokumen Master Asli dari Supabase...
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Menginjeksi variabel perkara dan menyusun pratinjau PDF
            </span>
          </div>
        ) : pdfBlobUrl ? (
          /* State 3: Render Iframe PDF viewer */
          <iframe
            ref={iframeRef}
            src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title="Pratinjau Dokumen Master Asli"
            style={{
              width: '100%',
              height: '85vh',
              border: 'none',
              borderRadius: '8px',
              background: '#525659'
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            background: 'var(--bg-glass)',
            borderRadius: '8px',
            border: '1px dashed var(--border-glass)',
            padding: '32px',
            textAlign: 'center',
            gap: '12px',
            color: 'var(--text-secondary)'
          }}>
            <FileText size={40} opacity={0.4} />
            <span>Dokumen belum siap dipratinjau. Pastikan perkara dan template dipilih dengan benar.</span>
          </div>
        )}
      </div>
    </div>
  );
}
