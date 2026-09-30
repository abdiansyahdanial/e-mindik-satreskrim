import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Printer, 
  CheckCircle2, 
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
  onSaveArchive,
  isSaved = false
}) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [generatedDocxBlob, setGeneratedDocxBlob] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const iframeRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOfficialDoc() {
      if (!template || !selectedCase) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await generatePdfBlob({
          template,
          caseData: selectedCase,
          activeCase: selectedCase,
          activeSuspect,
          suspectsList,
          formValues,
          personnelList: personnelList.length > 0 ? personnelList : personnel
        });

        if (!isMounted) return;

        if (res?.docxBlob) {
          setGeneratedDocxBlob(res.docxBlob);
          setGeneratedFilename(res.filename || `${template.title || 'Dokumen'}.docx`);
        }

        if (res?.pdfBlobUrl) {
          setPdfBlobUrl(res.pdfBlobUrl);
        } else {
          setPdfBlobUrl(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Doc preview preparation error:', err);
        setErrorMsg(err.message || 'Gagal memproses master dokumen dari Supabase.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadOfficialDoc();

    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [template, selectedCase?.id, activeSuspect?.id, formValues]);

  const handleDownloadDocx = () => {
    if (!generatedDocxBlob) return;
    setIsDownloading(true);
    try {
      saveAs(generatedDocxBlob, generatedFilename.replace(/\.pdf$/i, '.docx'));
      setDownloadNotice(`Berkas '${generatedFilename.replace(/\.pdf$/i, '.docx')}' berhasil diunduh!`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      alert('Gagal mengunduh: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (pdfBlobUrl && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        window.open(pdfBlobUrl, '_blank');
        return;
      }
    }
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b1120', color: '#f8fafc' }}>
      {/* Action Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1e293b',
        background: '#0f172a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
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
              <CheckCircle2 color={isSaved ? '#10b981' : 'currentColor'} size={13} />
              <span>{isSaved ? 'Tersimpan' : 'Simpan Arsip'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
          >
            <Printer size={13} />
            <span>{pdfBlobUrl ? 'Cetak / Simpan PDF' : 'Cetak Dokumen'}</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.15)', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Body Viewer */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#090d16' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: '#ff352d', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>Memproses Template Asli dari Supabase...</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Menginjeksi variabel perkara ke master berkas</div>
          </div>
        ) : pdfBlobUrl ? (
          <iframe
            ref={iframeRef}
            src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title="Pratinjau Dokumen Master Asli"
            style={{ width: '100%', height: '85vh', border: 'none' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '450px', padding: '30px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <FileText color="#60a5fa" size={32} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
              Naskah Dinas Asli Siap Digunakan
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '460px', margin: '0 0 20px', lineHeight: 1.6 }}>
              Seluruh variabel perkara untuk <strong>{selectedCase?.nomor_lp || selectedCase?.no_lp || '-'}</strong> telah terinjeksi ke template asli Supabase Storage.
            </p>
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
          </div>
        )}
      </div>
    </div>
  );
}
