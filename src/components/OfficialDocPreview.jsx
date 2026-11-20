import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, 
  Printer, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  AlertCircle
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { generateDocxBlob } from '../services/mindikGenerator';
import { supabase } from '../supabaseClient';

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

export default function OfficialDocPreview({
  selectedCase,
  caseData,
  template,
  formValues = EMPTY_OBJECT,
  personnel = EMPTY_ARRAY,
  personnelList = EMPTY_ARRAY,
  activeSuspect = null,
  suspectsList = EMPTY_ARRAY,
  activeVictim = null,
  victimsList = EMPTY_ARRAY,
  onSaveArchive,
  isSaved = false
}) {
  const [generatedDocxBlob, setGeneratedDocxBlob] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [viewerUrl, setViewerUrl] = useState(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendered, setIsRendered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const previewContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const lastUploadedKeyRef = useRef(null);
  const isProcessingRef = useRef(false);
  const activeTempPathRef = useRef(null);

  const currentCase = selectedCase || caseData;
  const effectivePersonnelList = (Array.isArray(personnelList) && personnelList.length > 0)
    ? personnelList
    : (Array.isArray(personnel) ? personnel : EMPTY_ARRAY);

  // Kunci dependensi primitif berbasis string JSON untuk mencegah infinite upload/render loop
  const renderKey = useMemo(() => JSON.stringify({
    templateId: template?.id || template?.code || template?.file_path || '',
    caseId: currentCase?.id || currentCase?.nomor_lp || currentCase?.no_lp || '',
    activeSuspectId: activeSuspect?.id || activeSuspect?.nama || '',
    activeVictimId: activeVictim?.id || activeVictim?.nama || '',
    formValues,
    personnelList: effectivePersonnelList,
    suspectsList
  }), [
    template?.id,
    template?.code,
    template?.file_path,
    currentCase?.id,
    currentCase?.nomor_lp,
    currentCase?.no_lp,
    activeSuspect?.id,
    activeSuspect?.nama,
    activeVictim?.id,
    activeVictim?.nama,
    formValues,
    effectivePersonnelList,
    suspectsList
  ]);

  // Helper hapus file sementara di bucket 'templates'
  const removeTempPreviewFile = (tempPath) => {
    if (!tempPath) return;
    supabase.storage
      .from('templates')
      .remove([tempPath])
      .catch((err) => {
        console.warn('Auto-cleanup temp preview notice:', err?.message || err);
      });
  };

  // Auto-cleanup file sementara saat modal pratinjau ditutup / komponen unmount
  useEffect(() => {
    return () => {
      if (activeTempPathRef.current) {
        const pathToCleanup = activeTempPathRef.current;
        activeTempPathRef.current = null;
        removeTempPreviewFile(pathToCleanup);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-mindik-docx');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-mindik-docx');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-mindik-docx');
    };
  }, []);

  const renderLocalDocxFallback = async (docxBlob) => {
    if (!previewContainerRef.current || !docxBlob) return;
    previewContainerRef.current.innerHTML = '';
    await renderAsync(docxBlob, previewContainerRef.current, null, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true
    });
  };

  useEffect(() => {
    if (!template || !currentCase) {
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = '';
      }
      setGeneratedDocxBlob(null);
      setViewerUrl(null);
      setUseLocalFallback(false);
      setIsRendered(false);
      setIsLoading(false);
      return;
    }

    // Cegah infinite upload loop: hanya jalankan 1 kali untuk setiap renderKey
    if (lastUploadedKeyRef.current === renderKey || isProcessingRef.current === true) {
      return;
    }

    let isMounted = true;
    isProcessingRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);

    async function processAndUploadPreview() {
      try {
        // 1. Injeksi variabel perkara ke template .docx asli dari Supabase Storage
        const res = await generateDocxBlob({
          template,
          caseData: currentCase,
          activeCase: currentCase,
          activeSuspect,
          suspectsList,
          activeVictim,
          victimsList,
          formValues,
          personnelList: effectivePersonnelList
        });

        if (!isMounted) return;

        if (!res?.hasPhysicalFile || !res?.blob) {
          throw new Error(
            res?.message ||
            `Template '${template.title || template.code || 'Dokumen'}' belum memiliki file master .docx di Supabase Storage.`
          );
        }

        const docxFilename = (res.filename || `${template.title || template.code || 'Dokumen'}.docx`).replace(/\.pdf$/i, '.docx');
        setGeneratedDocxBlob(res.blob);
        setGeneratedFilename(docxFilename);

        // Siapkan juga render lokal di background untuk cetak langsung & fallback instan
        try {
          await renderLocalDocxFallback(res.blob);
        } catch (localRenderErr) {
          console.warn('Local docx-preview preparation notice:', localRenderErr);
        }

        if (!isMounted) return;

        // 2. Unggah Blob .docx ke folder sementara di bucket 'templates' untuk Microsoft Office Online Viewer
        let officeEmbedSuccess = false;
        try {
          const tempPath = `temp-previews/preview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.docx`;
          const { error: uploadError } = await supabase.storage
            .from('templates')
            .upload(tempPath, res.blob, {
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          if (!isMounted) {
            removeTempPreviewFile(tempPath);
            return;
          }

          // Bersihkan file sementara sebelumnya jika ada
          if (activeTempPathRef.current && activeTempPathRef.current !== tempPath) {
            removeTempPreviewFile(activeTempPathRef.current);
          }
          activeTempPathRef.current = tempPath;

          // Ambil Signed URL (600 detik) atau Public URL dari bucket 'templates'
          let fileUrl = null;
          const { data: signedData, error: signedErr } = await supabase.storage
            .from('templates')
            .createSignedUrl(tempPath, 600);

          if (!signedErr && signedData?.signedUrl) {
            fileUrl = signedData.signedUrl;
          } else {
            const { data: publicData } = supabase.storage
              .from('templates')
              .getPublicUrl(tempPath);
            fileUrl = publicData?.publicUrl || null;
          }

          if (fileUrl) {
            const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
            setViewerUrl(officeViewerUrl);
            setUseLocalFallback(false);
            officeEmbedSuccess = true;
          }
        } catch (uploadOrUrlErr) {
          console.warn('Upload pratinjau sementara ke bucket templates gagal, beralih ke fallback docx-preview lokal:', uploadOrUrlErr);
        }

        if (!isMounted) return;

        // 3. Fallback otomatis ke docx-preview lokal jika upload atau koneksi gagal
        if (!officeEmbedSuccess) {
          setViewerUrl(null);
          setUseLocalFallback(true);
        }

        lastUploadedKeyRef.current = renderKey;
        setIsRendered(true);
      } catch (err) {
        if (!isMounted) return;
        console.error('Official .docx preview error:', err);
        setIsRendered(false);
        setErrorMsg(err.message || 'Gagal memuat pratinjau dokumen .docx asli dari Supabase Storage.');
      } finally {
        isProcessingRef.current = false;
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    processAndUploadPreview();

    return () => {
      isMounted = false;
      isProcessingRef.current = false;
    };
  }, [renderKey]);

  const handleDownloadDocx = () => {
    if (!generatedDocxBlob) return;
    setIsDownloading(true);
    try {
      const targetName = (generatedFilename || `${template?.title || 'Dokumen'}.docx`).replace(/\.pdf$/i, '.docx');
      saveAs(generatedDocxBlob, targetName);
      setDownloadNotice(`Berkas '${targetName}' berhasil diunduh!`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      alert('Gagal mengunduh: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-mindik-docx');
    window.print();
  };

  return (
    <div
      className="official-doc-preview-root"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b1120', color: '#f8fafc' }}
    >
      {/* Action Header */}
      <div
        className="official-doc-toolbar no-print"
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1e293b',
          background: '#0f172a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: '4px' }}>
            {template?.code || 'MINDIK'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
            {template?.title || template?.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isLoading || !generatedDocxBlob}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '6px 14px' }}
          >
            {isDownloading ? <RefreshCw className="animate-spin" size={13} /> : <Download size={13} />}
            <span>Unduh .docx</span>
          </button>

          {onSaveArchive && (
            <button
              type="button"
              onClick={onSaveArchive}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
            >
              <CheckCircle2 color={isSaved ? '#FF2A2A' : 'currentColor'} size={13} />
              <span>{isSaved ? 'Tersimpan' : 'Simpan Arsip'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoading || !isRendered}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
          >
            <Printer size={13} />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div
          className="no-print"
          style={{ padding: '8px 16px', background: 'rgba(255, 42, 42, 0.14)', borderBottom: '1px solid rgba(255, 42, 42, 0.35)', color: '#CBD5E1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <CheckCircle2 size={14} color="#FF2A2A" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div
          className="no-print"
          style={{ padding: '12px 16px', background: 'rgba(255, 42, 42, 0.16)', borderBottom: '1px solid rgba(255, 42, 42, 0.45)', color: '#CBD5E1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <AlertCircle size={16} color="#FF2A2A" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Body Viewer */}
      <div
        className="official-doc-preview-body"
        style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#1e293b', minHeight: '480px' }}
      >
        {isLoading === true ? (
          <div
            className="no-print"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px'
            }}
          >
            <RefreshCw size={32} className="animate-spin" style={{ color: '#FF2A2A', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Memproses Template .docx Baku dari Supabase Storage...</div>
            <div style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.6)', marginTop: '4px' }}>Menginjeksi variabel perkara &amp; menyiapkan Microsoft Office Online Viewer</div>
          </div>
        ) : null}

        {/* Microsoft Office Online Viewer Iframe */}
        {!isLoading && viewerUrl && !useLocalFallback && (
          <div className="no-print" style={{ padding: '16px', width: '100%' }}>
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              title="Microsoft Office Online Viewer"
              onError={() => setUseLocalFallback(true)}
              style={{
                width: '100%',
                height: '78vh',
                border: 'none',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            />
          </div>
        )}

        {/* Fallback Otomatis & Kontainer Cetak: Native docx-preview */}
        <div
          ref={previewContainerRef}
          className="docx-preview-container"
          style={{
            backgroundColor: '#1e293b',
            display: (!isLoading && (useLocalFallback || !viewerUrl) && isRendered) ? 'flex' : 'none'
          }}
        />

        {!isLoading && !isRendered && errorMsg && (
          <div
            className="no-print"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '450px', padding: '30px', textAlign: 'center' }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'rgba(255, 42, 42, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <FileText color="#FF2A2A" size={32} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
              Gagal Memuat Pratinjau Dokumen
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '460px', margin: '0 0 20px', lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            {generatedDocxBlob && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
                >
                  <Download size={15} />
                  <span>Buka / Unduh File Asli (.docx)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
