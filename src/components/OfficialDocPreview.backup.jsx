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
import { generatePdfBlob, generateDocxBlob, formatTanggalIndonesia } from '../services/mindikGenerator';

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
  const [generatedDocxBlob, setGeneratedDocxBlob] = useState(null);
  const [injectedDataMap, setInjectedDataMap] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState(null);

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
          setGeneratedDocxBlob(null);
          return;
        }

        setHasPhysicalFile(true);

        if (res?.docxBlob) {
          setGeneratedDocxBlob(res.docxBlob);
          setInjectedDataMap(res.dataMap || null);
          setGeneratedFilename(res.filename || null);
        }

        if (res?.pdfBlobUrl) {
          // Bersihkan blob URL lama sebelum memasang URL pratinjau yang baru
          if (currentBlobUrlRef.current && currentBlobUrlRef.current !== res.pdfBlobUrl) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
          }
          currentBlobUrlRef.current = res.pdfBlobUrl;
          setPdfBlobUrl(res.pdfBlobUrl);
        } else {
          if (currentBlobUrlRef.current) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
            currentBlobUrlRef.current = null;
          }
          setPdfBlobUrl(null);
        }
      } catch (err) {
        console.error('Gagal memuat pratinjau PDF:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Gagal memproses dokumen.');
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
      if (generatedDocxBlob) {
        const outName = (generatedFilename || template.title || 'Dokumen').replace(/\.pdf$/i, '.docx');
        saveAs(generatedDocxBlob, outName.endsWith('.docx') ? outName : `${outName}.docx`);
        setDownloadNotice(`Berhasil mengunduh dokumen Word .docx!`);
        setTimeout(() => setDownloadNotice(null), 4000);
        return;
      }

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
  const handlePrint = () => {
    if (pdfBlobUrl) {
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
    } else {
      window.print();
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
            disabled={(!pdfBlobUrl && !generatedDocxBlob) || isLoadingPdf || !isTemplateInStudio}
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{
              opacity: ((pdfBlobUrl || generatedDocxBlob) && !isLoadingPdf) ? 1 : 0.5,
              cursor: ((pdfBlobUrl || generatedDocxBlob) && !isLoadingPdf) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={pdfBlobUrl ? "Cetak langsung atau simpan sebagai PDF" : "Cetak lembar pratinjau naskah dinas via browser"}
          >
            <Printer size={13} />
            <span>{pdfBlobUrl ? "Cetak / Simpan PDF" : "Cetak Dokumen"}</span>
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
        ) : generatedDocxBlob ? (
          /* State 4: Fallback Lembar Pratinjau Dokumen Siap Cetak (saat backend PDF offline) */
          <div className="printable-doc-sheet" style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            padding: '40px 48px',
            minHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            fontFamily: 'Times New Roman, serif'
          }}>
            {/* Header Naskah Dinas Polri */}
            <div style={{ borderBottom: '2px solid #000000', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center', maxWidth: '320px', lineHeight: 1.25 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>DAERAH SULAWESI TENGGARA</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline' }}>RESOR KOLAKA TIMUR</div>
                <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>Jl. Poros Kolaka - Kendari Km 50 Tirawuta</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                <div>PRO JUSTITIA</div>
                <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#475569', marginTop: '4px' }}>
                  Format Resmi Siap Terbit
                </div>
              </div>
            </div>

            {/* Judul & Nomor Surat */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '1px' }}>
                {template.title || template.name || 'NASKAH DINAS PENYIDIKAN'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px', fontFamily: 'monospace' }}>
                Nomor: {formValues.NOMOR_SURAT || formValues.doc_no || '-'}
              </div>
            </div>

            {/* Banner info konversi */}
            <div className="no-print" style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '11.5px',
              color: '#334155',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span><strong>File Word (.docx) Berhasil Diinjeksi</strong> — Seluruh tag dan variabel form berhasil digabungkan dengan template master.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={12} />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                >
                  Unduh .docx
                </button>
              </div>
            </div>

            {/* Lembar Data Terinjeksi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: 1.6 }}>
              <div>
                <strong>A. DASAR & RUJUKAN:</strong>
                <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
                  <li>Laporan Polisi: <strong>{selectedCase.nomor_lp || selectedCase.no_lp || '-'}</strong> (Tanggal: {selectedCase.tanggal_lp || '-'})</li>
                  {selectedCase.crime_category && <li>Perkara / Tindak Pidana: {selectedCase.crime_category}</li>}
                  {selectedCase.pelapor && <li>Pelapor: {selectedCase.pelapor}</li>}
                </ul>
              </div>

              {activeSuspect && (
                <div>
                  <strong>B. IDENTITAS TERSANGKA / TERLAPOR:</strong>
                  <div style={{ marginLeft: '12px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '4px 8px', marginTop: '4px' }}>
                    <span>Nama Lengkap</span><span>: <strong>{activeSuspect.nama || activeSuspect.nama_lengkap || '-'}</strong></span>
                    <span>Tempat / Tgl Lahir</span><span>: {activeSuspect.tempat_lahir || '-'}, {activeSuspect.tgl_lahir || '-'}</span>
                    <span>Jenis Kelamin / Agama</span><span>: {activeSuspect.jenis_kelamin || '-'} / {activeSuspect.agama || '-'}</span>
                    <span>Pekerjaan</span><span>: {activeSuspect.pekerjaan || '-'}</span>
                    <span>Alamat</span><span>: {activeSuspect.alamat || '-'}</span>
                  </div>
                </div>
              )}

              {/* Variabel Tambahan Form */}
              {injectedDataMap && Object.keys(injectedDataMap).length > 0 && (
                <div>
                  <strong>C. VARIABEL FORMULIR TERINJEKSI KE DOKUMEN:</strong>
                  <div style={{
                    marginTop: '6px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '8px',
                    background: '#f1f5f9',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    {Object.entries(injectedDataMap)
                      .filter(([k, v]) => typeof v === 'string' && v.trim() && !k.startsWith('LOOP_') && v.length < 150)
                      .slice(0, 30)
                      .map(([k, v]) => (
                        <div key={k} style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '9.5px' }}>{k}</span>
                          <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tanda Tangan Pejabat */}
              <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div>Kolaka Timur, {formValues.TANGGAL_SURAT ? formatTanggalIndonesia(formValues.TANGGAL_SURAT) : '....'}</div>
                  <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
                    {formValues.KASAT_JABATAN || 'KEPALA SATUAN RESERSE KRIMINAL'}
                  </div>
                  <div style={{ height: '60px' }}></div>
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                    {formValues.KASAT_NAMA || selectedCase.kasat_nama || '................................'}
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    {formValues.KASAT_PANGKAT || ''} NRP {formValues.KASAT_NRP || selectedCase.kasat_nrp || ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
