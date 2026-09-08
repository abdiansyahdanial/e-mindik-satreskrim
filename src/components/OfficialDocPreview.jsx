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
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck
} from 'lucide-react';
import { getPersonnelById } from '../data/mockPersonnel';
import { 
  generateAndDownloadDocx, 
  buildDocxDataMap, 
  renderDocxToHtml,
  replaceDynamicVariables
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
  const [isRenderingHtml, setIsRenderingHtml] = useState(false);
  const [renderedDocxHtml, setRenderedDocxHtml] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);

  // Zoom & auto-fit state for F4 sheet
  const containerRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Helper to resolve personnel
  const findPerson = useCallback((id) => {
    return personnel.find(p => p.id === id || p.nrp === id) || getPersonnelById(id);
  }, [personnel]);

  // Calculate Auto-Fit Scale (F4 physical width = 215mm = ~812.6px at 96 DPI)
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    // 215mm in px is ~812.6px. Provide 48px padding buffer.
    const f4WidthPx = 812.6;
    const availableWidth = Math.max(300, containerWidth - 48);
    const fit = availableWidth / f4WidthPx;
    // Clamp between 0.4 and 1.05 for ideal legibility
    return Math.min(1.0, Math.max(0.42, parseFloat(fit.toFixed(2))));
  }, []);

  // Update scale on resize if auto-fit is active
  useEffect(() => {
    const handleResize = () => {
      if (isAutoFit) {
        setZoomScale(calculateFitScale());
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      if (isAutoFit) {
        handleResize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isAutoFit, calculateFitScale]);

  // Dynamic Live Preview: Render actual .docx from Supabase Storage via Mammoth or html_template
  const loadDynamicPreview = async () => {
    if (!template || !selectedCase) return;

    // Priority 1: If template has explicit html_template or content directly stored in Supabase
    if (template.html_template || template.content) {
      setRenderedDocxHtml(null);
      setRenderError(null);
      return;
    }

    // Priority 2: If template has file_path (.docx in Supabase Storage)
    if (!template.file_path) {
      setRenderedDocxHtml(null);
      setRenderError(null);
      return;
    }

    setIsRenderingHtml(true);
    setRenderError(null);

    try {
      const res = await renderDocxToHtml({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      if (res.hasPhysicalFile && res.html) {
        setRenderedDocxHtml(res.html);
      } else {
        setRenderedDocxHtml(null);
      }
    } catch (err) {
      console.warn('Mammoth preview render notice:', err);
      setRenderError(`Gagal membaca susunan dokumen .docx dari Supabase Storage: ${err.message}`);
      setRenderedDocxHtml(null);
    } finally {
      setIsRenderingHtml(false);
    }
  };

  useEffect(() => {
    loadDynamicPreview();
  }, [template?.id, template?.code, template?.file_path, template?.html_template, template?.content, selectedCase?.id, JSON.stringify(formValues)]);

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

  // Build complete dynamic data map from actual record
  const currentDataMap = buildDocxDataMap({ 
    caseData: selectedCase, 
    formValues, 
    personnelList: personnel 
  });

  // Safe variable resolver (guarantees no null/undefined is ever displayed)
  const safeVal = (key, fallback = '-') => {
    const val = currentDataMap[key] || currentDataMap[key.toLowerCase()] || currentDataMap[key.toUpperCase()];
    if (val === null || val === undefined || val === '') return fallback;
    return String(val);
  };

  const signerKasat = formValues.DOC_SIGNER_ATASAN_NAME 
    ? findPerson(formValues.DOC_SIGNER_ATASAN_NAME) 
    : findPerson('usr-001');

  const pjOfficer = formValues.DOC_PJ_NAME 
    ? findPerson(formValues.DOC_PJ_NAME) 
    : (selectedCase.investigators?.[0] ? findPerson(selectedCase.investigators[0].user_id) : null);

  const docNo = safeVal('DOC_NO', safeVal('doc_no', '[NOMOR SURAT BELUM DIISI]'));
  const docDate = safeVal('DOC_DATE', safeVal('doc_date', new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())));
  const docLocation = safeVal('DOC_LOCATION', safeVal('doc_location', 'Tirawuta'));
  const validity = safeVal('DOC_VALIDITY', safeVal('sprin_val_date', '30 (tiga puluh) hari'));

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

  // Zoom control helpers
  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoomScale(prev => Math.min(1.3, parseFloat((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoomScale(prev => Math.max(0.4, parseFloat((prev - 0.1).toFixed(2))));
  };

  const handleSetPresetZoom = (scale) => {
    setIsAutoFit(false);
    setZoomScale(scale);
  };

  const handleResetAutoFit = () => {
    setIsAutoFit(true);
    setZoomScale(calculateFitScale());
  };

  // Direct HTML from template column (if exists in Supabase)
  const templateRawHtml = template.html_template || template.content;
  const renderedTemplateHtml = templateRawHtml 
    ? replaceDynamicVariables(templateRawHtml, currentDataMap) 
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Action & Zoom Toolbar */}
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
        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} />
            <span>F4 FOLIO (215 × 330 mm)</span>
          </span>
          {templateRawHtml ? (
            <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} />
              <span>KONTEN SUPABASE DB</span>
            </span>
          ) : template.file_path ? (
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} />
              <span>TEMPLATE .DOCX (STORAGE)</span>
            </span>
          ) : (
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              STANDAR KEDINASAN POLRI
            </span>
          )}
        </div>

        {/* Zoom & Scale Controls */}
        <div className="zoom-controls" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={handleZoomOut}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 7px', height: '28px', minWidth: 'auto' }}
            title="Perkecil Tampilan"
          >
            <ZoomOut size={13} />
          </button>

          <span style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            minWidth: '42px', 
            textAlign: 'center',
            color: isAutoFit ? 'var(--accent-cyan)' : '#FFFFFF'
          }}>
            {Math.round(zoomScale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 7px', height: '28px', minWidth: 'auto' }}
            title="Perbesar Tampilan"
          >
            <ZoomIn size={13} />
          </button>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={handleResetAutoFit}
            className={`btn btn-sm ${isAutoFit ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', height: '28px', fontSize: '11px', gap: '4px' }}
            title="Sesuaikan otomatis dengan lebar layar pengguna"
          >
            <Maximize2 size={11} />
            <span>Fit Lebar</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetPresetZoom(1.0)}
            className={`btn btn-sm ${zoomScale === 1.0 && !isAutoFit ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 7px', height: '28px', fontSize: '11px' }}
            title="Skala Asli 100% Ukuran Fisik F4"
          >
            100%
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Refresh Preview */}
          {template.file_path && (
            <button
              type="button"
              onClick={loadDynamicPreview}
              disabled={isRenderingHtml}
              className="btn btn-secondary btn-sm"
              title="Perbarui Pratinjau Dokumen Asli"
            >
              <RefreshCw size={13} className={isRenderingHtml ? 'animate-spin' : ''} />
              <span>{isRenderingHtml ? 'Memproses...' : 'Segarkan'}</span>
            </button>
          )}

          {/* Toggle Variable Map */}
          <button
            type="button"
            onClick={() => setShowVariableMap(!showVariableMap)}
            className="btn btn-secondary btn-sm"
            title="Lihat pemetaan variabel {nomor_lp}, {pelapor_name}, {locus}, dll."
          >
            <Table size={13} />
            <span>{showVariableMap ? 'Tutup Variabel' : 'Cek Variabel'}</span>
          </button>

          {/* Download Real .docx from Supabase */}
          <button 
            type="button"
            disabled={isGeneratingDocx}
            onClick={handleGenerateDocx}
            className="btn btn-primary btn-sm"
            style={{
              boxShadow: 'var(--glow-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Generate dan unduh file Word (.docx) murni dari template Supabase Storage"
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
            title="Cetak langsung layout F4 atau Simpan ke PDF"
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

      {/* Canvas Kertas F4 (Folio Polri 215 × 330 mm) dengan Background Abu-Abu Gelap Netral */}
      <div 
        className="mindik-paper-container" 
        ref={containerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          minHeight: '720px'
        }}
      >
        {/* Scale Wrapper for Responsive Zoom-to-fit without clipping */}
        <div 
          className="mindik-paper-scale-wrapper"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            marginBottom: zoomScale < 1 ? `calc((330mm * ${zoomScale}) - 330mm)` : 0
          }}
        >
          {/* Paper Sheet F4 Pure Dimensions */}
          <div 
            className="mindik-paper-sheet mindik-paper-content" 
            id="printable-police-document"
          >
            {isRenderingHtml ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: '#1F2937' }}>
                <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 14px', color: '#0284C7' }} />
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Mengonversi File Asli .docx dari Supabase...</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                  Menyusun tata letak kertas fisik F4 standar kedinasan dengan data perkara aktual
                </div>
              </div>
            ) : renderedTemplateHtml ? (
              /* Prioritas 1: Konten HTML/template asli yang tersimpan di database Supabase */
              <div 
                className="supabase-db-template-content"
                dangerouslySetInnerHTML={{ __html: renderedTemplateHtml }}
              />
            ) : renderedDocxHtml ? (
              /* Prioritas 2: File .docx asli dari Supabase Storage yang diurai dengan Mammoth */
              <div 
                className="docx-mammoth-content"
                dangerouslySetInnerHTML={{ __html: renderedDocxHtml }}
              />
            ) : (
              /* Prioritas 3: Format Standar Kedinasan Polri yang Rapi Layaknya Microsoft Word */
              <div>
                {!template.file_path && (
                  <div className="no-print" style={{
                    marginBottom: '16px',
                    padding: '8px 12px',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: '4px',
                    color: '#92400E',
                    fontSize: '10.5pt',
                    textAlign: 'center',
                  }}>
                    Pratinjau Format Kedinasan Satreskrim Standar Polri (Kertas F4)
                  </div>
                )}

                {/* KOP SURAT POLRI SIMETRIS DENGAN GARIS GANDA */}
                <div className="kop-surat-header">
                  <div className="kop-instansi">KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
                  <div className="kop-sub">DAERAH SULAWESI TENGGARA</div>
                  <div className="kop-sub">RESOR KOLAKA TIMUR</div>
                  <div className="kop-sub" style={{ textDecoration: 'underline' }}>SATUAN RESERSE KRIMINAL</div>
                  <div className="kop-address">Jl. Poros Kolaka - Kendari Km. 50, Tirawuta, Kolaka Timur 93572</div>
                </div>

                {/* PRO JUSTITIA */}
                <div className="pro-justitia">"PRO JUSTITIA"</div>

                {/* JUDUL DOKUMEN */}
                <div className="doc-title-box">
                  <h2 className="doc-title">{safeVal('DOC_TITLE', template.title)}</h2>
                  <div className="doc-number">Nomor : {docNo}</div>
                </div>

                {/* KONTEN DOKUMEN: SPRIN (SURAT PERINTAH) */}
                {template.code.startsWith('SPRIN') && (
                  <div>
                    <table className="data-table-aligned">
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '135px' }}>Pertimbangan</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">
                            Bahwa untuk kepentingan penyidikan tindak pidana, dipandang perlu untuk mengeluarkan Surat Perintah ini demi terwujudnya kepastian hukum yang berkeadilan.
                          </td>
                        </tr>
                        <tr>
                          <td className="col-label" style={{ width: '135px', paddingTop: '8px' }}>Dasar</td>
                          <td className="col-colon" style={{ paddingTop: '8px' }}>:</td>
                          <td className="col-value" style={{ paddingTop: '8px' }}>
                            <ol style={{ margin: 0, paddingLeft: '22px' }}>
                              <li>Pasal 1 angka 2, Pasal 5, Pasal 7, Pasal 106, 108, 109 KUHAP;</li>
                              <li>Undang-Undang Republik Indonesia Nomor 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia;</li>
                              <li>Laporan Polisi Nomor : <strong>{safeVal('nomor_lp', safeVal('no_lp', '-'))}</strong>, tanggal {safeVal('tempus', '-')};</li>
                              {selectedCase.references?.no_sprin_sidik && template.code !== 'SPRIN_SIDIK' && (
                                <li>Surat Perintah Penyidikan Nomor : <strong>{selectedCase.references.no_sprin_sidik}</strong>;</li>
                              )}
                            </ol>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ 
                      textAlign: 'center', 
                      fontWeight: 700, 
                      margin: '16px 0', 
                      letterSpacing: '0.12em',
                      fontSize: '12pt' 
                    }}>
                      DIPERINTAHKAN
                    </div>

                    <table className="data-table-aligned">
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '135px' }}>Kepada</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">
                            <ol style={{ margin: 0, paddingLeft: '22px' }}>
                              {selectedCase.investigators && selectedCase.investigators.length > 0 ? (
                                selectedCase.investigators.map((inv, idx) => {
                                  const p = findPerson(inv.user_id || inv.nrp) || inv;
                                  return (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                      <strong>{p ? p.nama : safeVal(`penyidik_${idx + 1}`, 'Penyidik')}</strong> / Pangkat: {p ? p.pangkat : '-'} / NRP: {p ? p.nrp : '-'} / Jabatan: {p ? p.jabatan : '-'}
                                    </li>
                                  );
                                })
                              ) : (
                                <li>
                                  <strong>{safeVal('penyidik_1', 'Penyidik Satreskrim')}</strong> / NRP: {safeVal('penyidik_1_nrp', '-')} / Jabatan: Penyidik
                                </li>
                              )}
                            </ol>
                          </td>
                        </tr>
                        <tr>
                          <td className="col-label" style={{ width: '135px', paddingTop: '10px' }}>Untuk</td>
                          <td className="col-colon" style={{ paddingTop: '10px' }}>:</td>
                          <td className="col-value" style={{ paddingTop: '10px' }}>
                            <ol style={{ margin: 0, paddingLeft: '22px' }}>
                              <li>
                                Melaksanakan {template.title.toLowerCase()} terkait dugaan tindak pidana <strong>{safeVal('tindak_pidana', '-')}</strong> sebagaimana dimaksud dalam <strong>{safeVal('pasal_uu', '-')}</strong>, yang terjadi di {safeVal('locus', '-')} pada waktu {safeVal('tempus', '-')}.
                              </li>
                              <li>
                                Atas nama Terlapor / Tersangka : <strong>{safeVal('terlapor_name', safeVal('tersangka_name', '-'))}</strong>.
                              </li>
                              <li>
                                Surat Perintah ini berlaku selama <strong>{validity}</strong> terhitung sejak tanggal dikeluarkan.
                              </li>
                              <li>
                                Melaporkan hasil pelaksanaan tugas kepada atasan penyidik secara berkala.
                              </li>
                            </ol>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* KONTEN DOKUMEN: SPDP (SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN) */}
                {template.code.startsWith('SPDP') && (
                  <div>
                    <table className="data-table-aligned" style={{ marginBottom: '16px' }}>
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '110px' }}>Klasifikasi</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>BIASA</strong></td>
                          <td style={{ textAlign: 'right', width: '220px', verticalAlign: 'top' }}>
                            {docLocation}, {docDate}
                          </td>
                        </tr>
                        <tr>
                          <td className="col-label">Lampiran</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">-</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td className="col-label">Perihal</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">
                            <strong><u>Pemberitahuan Dimulainya Penyidikan</u></strong>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                            Kepada Yth.<br />
                            <strong>{safeVal('DOC_TARGET', 'KEPALA KEJAKSAAN NEGERI KOLAKA')}</strong><br />
                            di -<br />
                            <u>{safeVal('DOC_TARGET_ADDR', 'Tempat')}</u>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="indent" style={{ marginTop: '14px' }}>
                      Dengan ini diberitahukan bahwa pada hari ini telah dimulai penyidikan perkara dugaan tindak pidana <strong>{safeVal('tindak_pidana', '-')}</strong> sebagaimana dimaksud dalam ketentuan <strong>{safeVal('pasal_uu', '-')}</strong>, berdasarkan Laporan Polisi Nomor : <strong>{safeVal('nomor_lp', safeVal('no_lp', '-'))}</strong>, tanggal {safeVal('tempus', '-')}.
                    </p>

                    <div style={{ margin: '14px 0 6px', fontWeight: 700 }}>Identitas Terlapor / Tersangka :</div>
                    <table className="data-table-aligned" style={{ marginLeft: '16px', width: 'calc(100% - 16px)' }}>
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '160px' }}>Nama Lengkap</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{safeVal('terlapor_name', safeVal('tersangka_name', '-'))}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">Tempat / Tgl Lahir</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('terlapor_pob_dob', selectedCase.person?.pob_dob || '-')} ({safeVal('terlapor_umur', selectedCase.person?.umur || '-')})</td>
                        </tr>
                        <tr>
                          <td className="col-label">Jenis Kelamin</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('terlapor_gender', selectedCase.person?.gender || '-')}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Agama / Pekerjaan</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('terlapor_agama', selectedCase.person?.agama || '-')} / {safeVal('terlapor_pekerjaan', selectedCase.person?.pekerjaan || '-')}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Alamat Tempat Tinggal</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('terlapor_alamat', selectedCase.person?.alamat || safeVal('locus', '-'))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* KONTEN DOKUMEN: BAP (BERITA ACARA PEMERIKSAAN) */}
                {(template.code.startsWith('BAP') || template.category === 'BERITA ACARA') && !template.code.startsWith('SPDP') && !template.code.startsWith('SPRIN') && (
                  <div>
                    <p className="indent">
                      Pada hari ini, tanggal <strong>{docDate}</strong>, pukul 10.00 WITA, saya :
                    </p>

                    <table className="data-table-aligned" style={{ marginLeft: '16px', width: 'calc(100% - 16px)' }}>
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '160px' }}>Nama</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{pjOfficer ? pjOfficer.nama : safeVal('penyidik_1', 'Penyidik Satreskrim')}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">Pangkat / NRP</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{pjOfficer ? `${pjOfficer.pangkat} / ${pjOfficer.nrp}` : `${safeVal('penyidik_1_pangkat', '-')} / ${safeVal('penyidik_1_nrp', '-')}`}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Jabatan</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{pjOfficer ? pjOfficer.jabatan : 'Penyidik Pembantu'} pada Satreskrim Polres Kolaka Timur</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="indent" style={{ marginTop: '14px' }}>
                      Telah melakukan pemeriksaan terhadap seorang yang mengaku bernama :
                    </p>

                    <table className="data-table-aligned" style={{ marginLeft: '16px', width: 'calc(100% - 16px)' }}>
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '160px' }}>Nama Lengkap</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{template.code === 'BAP_TSK' ? safeVal('terlapor_name', '-') : safeVal('pelapor_name', '-')}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">NIK</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{template.code === 'BAP_TSK' ? safeVal('terlapor_nik', selectedCase.person?.nik || '-') : safeVal('pelapor_nik', '7405021204850002')}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Tempat / Tgl Lahir</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{template.code === 'BAP_TSK' ? safeVal('terlapor_pob_dob', selectedCase.person?.pob_dob || '-') : 'Kolaka, 12-04-1985'}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Alamat</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{template.code === 'BAP_TSK' ? safeVal('terlapor_alamat', safeVal('locus', '-')) : safeVal('pelapor_alamat', 'Kec. Tirawuta, Kab. Kolaka Timur')}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="indent" style={{ marginTop: '14px' }}>
                      Ia diperiksa dan didengar keterangannya sehubungan dengan peristiwa dugaan tindak pidana <strong>{safeVal('tindak_pidana', '-')}</strong> sebagaimana diatur dalam pasal <strong>{safeVal('pasal_uu', '-')}</strong>, berdasarkan Laporan Polisi Nomor : <strong>{safeVal('nomor_lp', safeVal('no_lp', '-'))}</strong>, yang terjadi di {safeVal('locus', '-')} pada waktu {safeVal('tempus', '-')}.
                    </p>
                  </div>
                )}

                {/* KONTEN DOKUMEN: FORMAT UMUM / LAINNYA */}
                {!template.code.startsWith('SPRIN') && !template.code.startsWith('SPDP') && !template.code.startsWith('BAP') && template.category !== 'BERITA ACARA' && (
                  <div>
                    <p className="indent">
                      Sehubungan dengan rujukan Laporan Polisi Nomor: <strong>{safeVal('nomor_lp', safeVal('no_lp', '-'))}</strong> tentang dugaan tindak pidana <strong>{safeVal('tindak_pidana', '-')}</strong> sebagaimana dimaksud dalam rumusan <strong>{safeVal('pasal_uu', '-')}</strong> yang terjadi pada waktu <strong>{safeVal('tempus', '-')}</strong> bertempat di <strong>{safeVal('locus', '-')}</strong>.
                    </p>

                    <div style={{ margin: '14px 0 6px', fontWeight: 700 }}>Data Rincian Perkara :</div>
                    <table className="data-table-aligned" style={{ marginLeft: '16px', width: 'calc(100% - 16px)' }}>
                      <tbody>
                        <tr>
                          <td className="col-label" style={{ width: '160px' }}>Nama Pelapor</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{safeVal('pelapor_name', '-')}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">Nama Terlapor</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{safeVal('terlapor_name', safeVal('tersangka_name', '-'))}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">Penyidik Utama</td>
                          <td className="col-colon">:</td>
                          <td className="col-value"><strong>{pjOfficer ? pjOfficer.nama : safeVal('penyidik_1', '-')}</strong></td>
                        </tr>
                        <tr>
                          <td className="col-label">Tempat Kejadian (Locus)</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('locus', '-')}</td>
                        </tr>
                        <tr>
                          <td className="col-label">Waktu Kejadian (Tempus)</td>
                          <td className="col-colon">:</td>
                          <td className="col-value">{safeVal('tempus', '-')}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="indent" style={{ marginTop: '14px' }}>
                      Demikian dokumen ini diterbitkan untuk dipergunakan sebagaimana mestinya dalam proses penyidikan perkara demi tegaknya hukum dan keadilan.
                    </p>
                  </div>
                )}

                {/* TANDA TANGAN RESMI KEDINASAN POLRI */}
                <div className="signature-section">
                  <div className="signature-box">
                    <div>Dikeluarkan di : {docLocation}</div>
                    <div style={{ marginBottom: '8px' }}>Pada tanggal : {docDate}</div>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5pt' }}>
                      KEPALA SATUAN RESERSE KRIMINAL<br />SELAKU PENYIDIK
                    </div>
                    
                    <div className="signature-space">
                      <span style={{ fontSize: '9pt', color: '#9CA3AF', fontStyle: 'italic' }}>
                        [Tanda Tangan & Cap Dinas]
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: '11pt' }}>
                      {signerKasat ? signerKasat.nama : safeVal('kasat_nama', 'AKP AHMAD FATONI, S.H.')}
                    </div>
                    <div style={{ fontSize: '10pt' }}>
                      {signerKasat ? signerKasat.pangkat : 'AKP'} NRP {signerKasat ? signerKasat.nrp : '78120567'}
                    </div>
                  </div>
                </div>

                {/* TEMBUSAN KEDINASAN */}
                <div style={{ marginTop: '40px', clear: 'both', fontSize: '10pt' }}>
                  <div style={{ fontWeight: 700 }}><u>Tembusan :</u></div>
                  <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>
                    <li>Kapolres Kolaka Timur (sebagai laporan)</li>
                    <li>Wakapolres Kolaka Timur</li>
                    <li>Kasi Propam Polres Kolaka Timur</li>
                    <li>Arsip Satreskrim</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
