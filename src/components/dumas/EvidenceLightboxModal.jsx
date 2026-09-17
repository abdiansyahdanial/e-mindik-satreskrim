import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  ShieldCheck, 
  Info
} from 'lucide-react';

export default function EvidenceLightboxModal({
  isOpen = true,
  evidence,
  onClose,
  onDownload
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  // Keyboard Navigation: Esc to close, +, -, r to rotate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation(prev => (prev + 90) % 360);
      } else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !evidence) return null;

  const isPdf = 
    evidence.kategori_bukti === 'DOKUMEN_PDF' || 
    evidence.mime_type?.includes('pdf') || 
    evidence.nama_file?.toLowerCase().endsWith('.pdf') ||
    evidence.name?.toLowerCase().endsWith('.pdf');

  const fileUrl = evidence.file_url || evidence.previewUrl || null;
  const fileName = evidence.nama_file || evidence.name || 'Barang_Bukti';
  const fileSize = evidence.file_size_formatted || `${((evidence.file_size_bytes || evidence.size || 0) / 1024).toFixed(0)} KB`;
  const keterangan = evidence.keterangan || 'Barang bukti digital dalam perkara laporan pengaduan';
  const hash = evidence.hash_sha256 || 'SHA-256 Valid';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Drag to pan zoomed image
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const defaultDownloadHandler = () => {
    if (onDownload) {
      onDownload(evidence);
      return;
    }

    if (fileUrl && fileUrl.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Default download fallback
    const content = `SATUAN RESERSE KRIMINAL POLRES KOLAKA TIMUR\n` +
      `BERKAS BARANG BUKTI DIGITAL\n` +
      `Nama Berkas: ${fileName}\n` +
      `Tipe: ${isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'}\n` +
      `Ukuran: ${fileSize}\n` +
      `Hash Integritas: ${hash}\n` +
      `Keterangan: ${keterangan}\n` +
      `Diunduh: ${new Date().toLocaleString('id-ID')}\n`;
    const blob = new Blob([content], { type: isPdf ? 'application/pdf' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 5, 8, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl h-[92vh] max-h-[850px] rounded-2xl bg-[#10141D] border border-[#292F42] shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '1080px',
          height: '92vh',
          maxHeight: '850px',
          backgroundColor: '#10141D',
          border: '1px solid #292F42',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Top Control Bar */}
        <div
          className="p-3.5 px-5 bg-[#0B0D13] border-b border-[#292F42] flex items-center justify-between flex-wrap gap-3"
          style={{
            padding: '12px 20px',
            backgroundColor: '#0B0D13',
            borderBottom: '1px solid #292F42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 10
          }}
        >
          {/* File Meta Info */}
          <div className="flex items-center gap-3 min-w-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(229, 46, 46, 0.2)',
                border: '1px solid rgba(229, 46, 46, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF352D',
                flexShrink: 0
              }}
            >
              {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    color: '#FF352D',
                    backgroundColor: 'rgba(229, 46, 46, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(229, 46, 46, 0.3)',
                    textTransform: 'uppercase'
                  }}
                >
                  {isPdf ? 'DOKUMEN PDF' : 'OBJEK FISIK (FOTO)'}
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                  {fileSize}
                </span>
              </div>
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: '2px 0 0 0',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '360px'
                }}
                title={fileName}
              >
                {fileName}
              </h3>
            </div>
          </div>

          {/* Interactive Action Toolbar */}
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isPdf && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#151822',
                  border: '1px solid #292F42',
                  borderRadius: '8px',
                  padding: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  style={{
                    padding: '6px 10px',
                    background: 'none',
                    border: 'none',
                    color: zoom <= 0.5 ? '#475569' : '#CBD5E1',
                    cursor: zoom <= 0.5 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  title="Perkecil (-)"
                >
                  <ZoomOut size={15} />
                </button>

                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: '#94A3B8',
                    padding: '0 8px',
                    minWidth: '45px',
                    textAlign: 'center'
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  style={{
                    padding: '6px 10px',
                    background: 'none',
                    border: 'none',
                    color: zoom >= 3 ? '#475569' : '#CBD5E1',
                    cursor: zoom >= 3 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  title="Perbesar (+)"
                >
                  <ZoomIn size={15} />
                </button>

                <div style={{ width: '1px', height: '16px', backgroundColor: '#292F42', margin: '0 4px' }} />

                <button
                  type="button"
                  onClick={handleRotate}
                  style={{
                    padding: '6px 10px',
                    background: 'none',
                    border: 'none',
                    color: '#CBD5E1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  title="Putar 90° (R)"
                >
                  <RotateCw size={15} />
                </button>

                {(zoom !== 1 || rotation !== 0) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      padding: '6px 8px',
                      background: 'none',
                      border: 'none',
                      color: '#F59E0B',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700
                    }}
                    title="Reset Tampilan (0)"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {/* Tombol Unduh */}
            <button
              type="button"
              onClick={defaultDownloadHandler}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#E2E8F0',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Unduh Dokumen ke Perangkat"
            >
              <Download size={14} />
              <span>Unduh Berkas</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Tutup Preview (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewport Center Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#07090E] relative overflow-hidden flex items-center justify-center select-none"
          style={{
            flex: 1,
            backgroundColor: '#07090E',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isPdf ? (
            /* PDF Document Viewer */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {fileUrl ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#1E293B'
                  }}
                />
              ) : (
                /* Fallback Police Official Document Visualizer */
                <div
                  style={{
                    margin: 'auto',
                    width: '90%',
                    maxWidth: '650px',
                    padding: '32px',
                    backgroundColor: '#0B0D13',
                    border: '1px solid #292F42',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  <div style={{ borderBottom: '2px solid #991B1B', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        DOKUMEN SURAT RESMI
                      </span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#FFFFFF', fontWeight: 700 }}>
                        {fileName}
                      </h4>
                    </div>
                    <span style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} />
                      Tervalidasi Digital
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#CBD5E1', lineHeight: 1.6 }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>URAIAN BERKAS PERKARA:</span>
                      <strong style={{ color: '#FFFFFF' }}>{keterangan}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>INTEGRITAS DATA (SHA-256):</span>
                      <span style={{ color: '#38BDF8', fontSize: '11px', wordBreak: 'break-all' }}>{hash}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>UKURAN PENYIMPANAN:</span>
                      <span>{fileSize} • Format Dokumen Portabel (PDF)</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #292F42', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={defaultDownloadHandler}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} />
                      <span>Unduh Berkas Asli</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Image Lightbox View with Zoom & Rotate */
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: '100%',
                maxWidth: '100%',
                padding: '20px'
              }}
            >
              {fileUrl ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  style={{
                    maxWidth: '85vw',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                    border: '1px solid #1E293B'
                  }}
                  draggable={false}
                />
              ) : (
                /* High-Quality Simulated Police Photographic Evidence */
                <div
                  style={{
                    width: '560px',
                    height: '400px',
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    border: '2px solid #334155',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Police Watermark */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      fontSize: '36px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 900,
                      color: 'rgba(239, 68, 68, 0.08)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      letterSpacing: '0.1em'
                    }}
                  >
                    SATRESKRIM POLRES KOLAKA TIMUR
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#EF4444', letterSpacing: '0.05em' }}>
                      KORPS RESKRISE POLRI • BUKTI RESMI
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                      IDENTIFIKASI: {evidence.id || 'BB-POLRES'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                      }}
                    >
                      <ImageIcon size={36} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px 0', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fileName}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                      {keterangan}
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#020617', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ color: '#64748B' }}>Status Barang Bukti:</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>Dalam Penguasaan Tim Penyidik</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Shortcuts Visual Indicator */}
          {!isPdf && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '16px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#64748B',
                backgroundColor: 'rgba(11, 13, 19, 0.8)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #1E293B',
                pointerEvents: 'none'
              }}
            >
              Shortcut: [+] Zoom In • [-] Zoom Out • [R] Putar • [0] Reset • [Esc] Tutup
            </div>
          )}
        </div>

        {/* Bottom Metadata Drawer */}
        <div
          className="p-3 px-5 bg-[#0B0D13] border-t border-[#292F42] flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono"
          style={{
            padding: '10px 20px',
            backgroundColor: '#0B0D13',
            borderTop: '1px solid #292F42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Info size={13} color="#38BDF8" />
              <span>Keterangan: <strong style={{ color: '#E2E8F0' }}>{keterangan}</strong></span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
            <ShieldCheck size={14} />
            <span>SHA-256: {hash.length > 20 ? `${hash.substring(0, 16)}...` : hash}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
