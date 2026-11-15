import React, { useState, useRef } from 'react';
import { 
  Camera, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Shield, 
  X, 
  ScanLine,
  UploadCloud,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Plus,
  Layers,
  Clock
} from 'lucide-react';
import { scanSuratPengaduan } from '../../lib/geminiOcrService';
import { HudCard, HudCorners } from '../command/hud';

export default function DumasModeSelectModal({
  isOpen = true,
  onClose,
  onSelectMode
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('Inisialisasi citra berkas...');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [ocrError, setOcrError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Timer hitung mundur saat terkena rate limit 429
  React.useEffect(() => {
    let timer;
    if (retryCountdown > 0) {
      timer = setTimeout(() => {
        setRetryCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handler menambahkan berkas gambar ke daftar lembar
  const handleFilesAdded = (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const validExtensions = /\.(jpe?g|png|webp|pdf)$/i;
    const rawList = Array.from(incomingFiles);
    
    const validFiles = rawList.filter(file => {
      const isImgOrPdf = file.type?.startsWith('image/') || file.type === 'application/pdf' || validExtensions.test(file.name);
      return isImgOrPdf;
    });

    if (validFiles.length === 0) {
      setOcrError('Format berkas tidak didukung. Harap pilih file gambar (JPG, PNG, WEBP) atau PDF.');
      return;
    }

    setOcrError(null);

    const newItems = validFiles.map((file, idx) => ({
      id: `page-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      name: file.name,
      size: file.size,
      formattedSize: `${(file.size / 1024).toFixed(0)} KB`,
      previewUrl: file.type?.startsWith('image/') && typeof URL !== 'undefined' ? URL.createObjectURL(file) : null,
    }));

    setSelectedFiles(prev => {
      // Hindari duplikasi berkas dengan nama & ukuran persis
      const existingKeys = new Set(prev.map(p => `${p.name}-${p.size}`));
      const uniqueNew = newItems.filter(p => !existingKeys.has(`${p.name}-${p.size}`));
      return [...prev, ...uniqueNew];
    });
  };

  const handleRemoveFile = (idToRemove) => {
    setSelectedFiles(prev => {
      const filtered = prev.filter(f => f.id !== idToRemove);
      const target = prev.find(f => f.id === idToRemove);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return filtered;
    });
  };

  const handleClearAllFiles = () => {
    selectedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
  };

  // Eksekusi pemindaian AI Vision untuk seluruh berkas terpilih
  const handleExecuteScan = async () => {
    if (selectedFiles.length === 0) {
      triggerFileInput();
      return;
    }

    setOcrError(null);
    setIsScanning(true);
    const totalPages = selectedFiles.length;
    setScanStep(`Mempersiapkan ${totalPages} lembar berkas fisik...`);

    const t1 = setTimeout(() => setScanStep(`Mengirimkan ${totalPages} lembar citra ke Smart OCR Engine...`), 1000);
    const t2 = setTimeout(() => setScanStep('Mengekstrak Pelapor, Saksi (termasuk klausul/kronologi), Terlapor, & Perkara...'), 2400);
    const t3 = setTimeout(() => setScanStep('Memetakan skema formulir kedinasan Reskrim...'), 3800);

    try {
      const filesToProcess = selectedFiles.map(item => item.file);
      const result = await scanSuratPengaduan(filesToProcess);

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (result.success && result.mappedForm) {
        setScanStep('Pemindaian Selesai! Mengalihkan ke formulir...');
        setTimeout(() => {
          setIsScanning(false);
          if (onSelectMode) {
            onSelectMode('ocr', filesToProcess, result.mappedForm);
          }
        }, 600);
      } else {
        setIsScanning(false);
        setOcrError({
          isRateLimit: false,
          message: result.error || 'Gagal mengekstrak data dari dokumen. Pastikan gambar jelas dan teks terbaca.'
        });
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsScanning(false);

      const isRateLimit = err?.isRateLimit ||
        err?.status === 429 ||
        String(err?.message || '').includes('429') ||
        String(err?.message || '').toLowerCase().includes('rate limit') ||
        String(err?.message || '').toLowerCase().includes('kuota') ||
        String(err?.message || '').toLowerCase().includes('token') ||
        String(err?.message || '').toLowerCase().includes('tokens per minute');

      if (isRateLimit) {
        setRetryCountdown(30);
        setOcrError({
          isRateLimit: true,
          message: 'Batas kuota request pemindaian AI (Rate Limit 429) tercapai. Sistem sedang membatasi volume request per menit. Silakan tunggu sekitar 30 detik untuk mencoba kembali, atau lanjutkan pengisian administrasi sekarang dengan opsi Input Manual.'
        });
      } else {
        setOcrError({
          isRateLimit: false,
          message: err.message || 'Terjadi kesalahan sistem saat pemindaian dokumen.'
        });
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className="dumas-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={(e) => {
        if (!isScanning && e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {/* Hidden Multi-File Input */}
      <input 
        id="dumas_ocr_multi_file_input"
        name="dumas_ocr_multi_file_input"
        type="file" 
        ref={fileInputRef}
        multiple
        accept="image/*,application/pdf" 
        aria-label="Pilih berkas surat pengaduan fisik untuk scan OCR AI"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesAdded(e.target.files);
          }
        }}
      />

      {/* OVERLAY STATUS LOADING TACTICAL HUD */}
      {isScanning && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(7, 9, 13, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '24px',
          }}
        >
          {/* Laser Scanline Effect */}
          <div className="hud-scanner-line"></div>

          <div 
            className="hud-tactical-border"
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#0E1118',
              border: '1px solid rgba(229, 46, 46, 0.5)',
              borderRadius: '16px',
              padding: '36px 32px',
              textAlign: 'center',
              boxShadow: '0 0 50px rgba(229, 46, 46, 0.25), inset 0 0 30px rgba(0, 0, 0, 0.8)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top HUD Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 42, 42, 0.16)',
              border: '1px solid rgba(255, 42, 42, 0.45)',
              color: '#FF3B3B',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginBottom: '20px'
            }}>
              <Cpu size={14} className="hud-radar-pulse" />
              <span>SAT RESKRIM // SMART OCR RESKRIM (MULTI-PAGE)</span>
            </div>

            {/* Tactical Radar / Scanner Icon */}
            <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 24px auto' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed rgba(255, 42, 42, 0.45)',
                animation: 'hudSpin 8s linear infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 42, 42, 0.75)',
                animation: 'hudSpin 3s linear infinite reverse'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF2A2A'
              }}>
                <ScanLine size={36} className="hud-radar-pulse" />
              </div>
            </div>

            {/* Main HUD Status */}
            <h3 className="heading-font" style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              margin: '0 0 8px 0',
              textTransform: 'uppercase'
            }}>
              Memindai {selectedFiles.length > 1 ? `${selectedFiles.length} Lembar Dokumen` : 'Dokumen'} via Smart OCR Presisi...
            </h3>

            {/* Sub-step indicator */}
            <p style={{
              color: '#FF3B3B',
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
              margin: '0 0 20px 0',
              fontWeight: 600,
              minHeight: '20px'
            }}>
              {scanStep}
            </p>

            {/* List of files processed badge */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              justifyContent: 'center',
              maxHeight: '70px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {selectedFiles.map((f, i) => (
                <span key={f.id} style={{
                  backgroundColor: '#161D2A',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  color: '#CBD5E1',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Hal {i + 1}: {f.name}
                </span>
              ))}
            </div>

            {/* Progress Track */}
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#161D2A',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '70%',
                background: 'linear-gradient(90deg, #B91C1C 0%, #FF2A2A 50%, #FFFFFF 100%)',
                borderRadius: '9999px',
                boxShadow: '0 0 12px #FF2A2A',
                animation: 'hudPulse 1.5s ease-in-out infinite'
              }}></div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '10px',
              fontSize: '10px',
              color: 'rgba(203, 213, 225, 0.58)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <span>MULTIMODAL PARALLEL INLINE DATA</span>
              <span>SATRESKRIM POLRES KOLTIM</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTAINER UTAMA */}
      <div 
        className="dumas-modal-container relative group/card bg-[#11161F]/95 backdrop-blur-2xl border border-[#94A3B8]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.6)] rounded-xl w-full max-w-[920px] max-h-[90vh] overflow-y-auto"
        style={{
          animation: 'dumasFadeIn 0.2s ease-out',
        }}
      >
        <HudCorners size="lg" />
        {/* Top Header Decorator Bar */}
        <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #B91C1C 0%, #FF2A2A 50%, #991B1B 100%)' }}></div>

        {/* Modal Close Button */}
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px',
              borderRadius: '8px',
              color: '#CBD5E1',
              backgroundColor: '#161D2A',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        )}

        <div style={{ padding: '32px' }}>
          {/* Header Section */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 42, 42, 0.14)',
              border: '1px solid rgba(255, 42, 42, 0.35)',
              color: '#FF3B3B',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: '12px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF2A2A' }}></span>
              STANDAR ADMINISTRASI PENYIDIKAN PRESISI
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontFamily: 'JetBrains Mono, monospace',
              margin: 0
            }}>
              REGISTRASI LAPORAN BARU
            </h2>
            <p style={{ color: 'rgba(203, 213, 225, 0.72)', fontSize: '13px', marginTop: '8px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', fontFamily: 'Inter, sans-serif' }}>
              Pilih metode input administrasi sesuai ketersediaan berkas perkara. Dukungan Smart Scan Multi-Halaman memungkinkan pemindaian lembar formulir pengaduan berseri secara terpadu.
            </p>
          </div>

          {/* Alert Error Box jika OCR gagal */}
          {ocrError && (
            <div style={{
              marginBottom: '20px',
              backgroundColor: ocrError.isRateLimit ? 'rgba(255, 42, 42, 0.14)' : 'rgba(255, 42, 42, 0.12)',
              border: ocrError.isRateLimit ? '1px solid rgba(255, 42, 42, 0.5)' : '1px solid rgba(255, 42, 42, 0.45)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: ocrError.isRateLimit ? '0 0 20px rgba(255, 42, 42, 0.18)' : 'none'
            }}>
              {ocrError.isRateLimit ? (
                <Clock size={22} color="#FF3B3B" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={20} color="#FF2A2A" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <h4 style={{
                  margin: '0 0 6px 0',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: ocrError.isRateLimit ? '#CBD5E1' : '#FF3B3B',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {ocrError.isRateLimit ? 'BATAS KUOTA AI TERCAPAI (RATE LIMIT 429)' : 'PEMINDAIAN DOKUMEN BELUM BERHASIL'}
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#F8FAFC', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                  {typeof ocrError === 'string' ? ocrError : ocrError.message}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {ocrError.isRateLimit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setOcrError(null);
                          if (onSelectMode) onSelectMode('manual');
                        }}
                        style={{
                          background: 'linear-gradient(90deg, #E61919 0%, #FF2A2A 100%)',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 12px rgba(255, 42, 42, 0.45)'
                        }}
                      >
                        <span>Lanjutkan Input Manual</span>
                        <ArrowRight size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={retryCountdown > 0}
                        onClick={handleExecuteScan}
                        style={{
                          background: retryCountdown > 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 42, 42, 0.2)',
                          border: retryCountdown > 0 ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #FF2A2A',
                          color: retryCountdown > 0 ? 'rgba(203, 213, 225, 0.5)' : '#CBD5E1',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 600,
                          cursor: retryCountdown > 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={12} className={retryCountdown > 0 ? '' : 'spin-on-hover'} />
                        <span>
                          {retryCountdown > 0 ? `Coba Pindai Lagi (${retryCountdown}s)` : 'Coba Pindai Ulang'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        style={{
                          background: 'rgba(255, 42, 42, 0.2)',
                          border: '1px solid #FF2A2A',
                          color: '#FF3B3B',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={12} />
                        Pilih Berkas Lain
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOcrError(null);
                          if (onSelectMode) onSelectMode('manual');
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid #475569',
                          color: '#CBD5E1',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          cursor: 'pointer'
                        }}
                      >
                        Lanjutkan Input Manual
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOcrError(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 2-Column Action Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            
            {/* OPSI A: SMART SCAN OCR FISIK MULTI-PAGE */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative group/card bg-[#11161F]/90 backdrop-blur-xl border ${
                dragActive ? 'border-[#FF2A2A] bg-[#FF2A2A]/15' : 'border-[#FF2A2A]/40 hover:border-[#FF3B3B]/75'
              } shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.55)] rounded-xl p-6 flex flex-col justify-between transition-all duration-300`}
            >
              <HudCorners size="md" />

              {/* Category Badge */}
              <div style={{ position: 'absolute', top: '-14px', left: '20px', zIndex: 10 }}>
                <span style={{
                  background: 'linear-gradient(90deg, #E61919 0%, #FF2A2A 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  boxShadow: '0 0 12px rgba(255, 42, 42, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Sparkles size={11} />
                  SMART SCAN DOKUMEN • MULTI-HALAMAN
                </span>
              </div>

              <div>
                {/* Header Card Opsi A */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 42, 42, 0.16)',
                    border: '1px solid rgba(255, 42, 42, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF2A2A'
                  }}>
                    <ScanLine size={26} />
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#FF3B3B',
                    backgroundColor: 'rgba(255, 42, 42, 0.16)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 42, 42, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Layers size={12} />
                    SMART OCR RESKRIM
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="heading-font" style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>
                  OPSI A: PINDAI BERKAS FISIK (MULTI-PAGE)
                </h3>
                <p style={{ color: 'rgba(203, 213, 225, 0.78)', fontSize: '12px', lineHeight: 1.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Unggah atau seret satu atau beberapa lembar berkas pengaduan (Halaman 1, Halaman 2, dst). AI akan mengekstrak otomatis Pelapor, Saksi (klausul &amp; kronologis), Terlapor, dan Pasal.
                </p>

                {/* Feature Bullet Points */}
                <div style={{
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'rgba(11, 14, 20, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.16)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF2A2A" />
                    <span>Dukungan multi-lembar sekaligus (multi-page)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF2A2A" />
                    <span>Pembersih tanda strip (-) otomatis pada kolom NIK/TTL</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF2A2A" />
                    <span>Ekstraksi saksi &amp; terlapor dari narasi kronologis</span>
                  </div>
                </div>

                {/* AREA PRATINJAU THUMBNAIL BERKAS TERPILIH */}
                {selectedFiles.length > 0 ? (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        color: '#FF3B3B'
                      }}>
                        LEMBAR BERKAS TERPILIH ({selectedFiles.length}):
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllFiles}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#CBD5E1',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'JetBrains Mono, monospace',
                          textDecoration: 'underline'
                        }}
                      >
                        Hapus Semua
                      </button>
                    </div>

                    {/* Thumbnail Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '10px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      padding: '4px',
                      backgroundColor: '#0B0E14',
                      borderRadius: '10px',
                      border: '1px solid rgba(148, 163, 184, 0.16)'
                    }}>
                      {selectedFiles.map((item, index) => (
                        <div 
                          key={item.id}
                          style={{
                            position: 'relative',
                            backgroundColor: '#11161F',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            borderRadius: '8px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center'
                          }}
                        >
                          {/* Page Badge */}
                          <span style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: '#FF2A2A',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            zIndex: 2
                          }}>
                            #{index + 1}
                          </span>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item.id)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              backgroundColor: 'rgba(11, 14, 20, 0.82)',
                              border: 'none',
                              color: '#FF3B3B',
                              borderRadius: '4px',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 2
                            }}
                            title="Hapus lembar ini"
                          >
                            <X size={12} />
                          </button>

                          {/* Image preview thumbnail */}
                          <div style={{
                            width: '100%',
                            height: '70px',
                            backgroundColor: '#0B0E14',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '6px'
                          }}>
                            {item.previewUrl ? (
                              <img 
                                src={item.previewUrl} 
                                alt={`Lembar ${index + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              <FileText size={28} color="#94A3B8" />
                            )}
                          </div>

                          <div style={{
                            fontSize: '10px',
                            color: '#E2E8F0',
                            fontFamily: 'JetBrains Mono, monospace',
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                            {item.formattedSize}
                          </div>
                        </div>
                      ))}

                      {/* Add more button tile */}
                      <div 
                        onClick={triggerFileInput}
                        style={{
                          height: '115px',
                          border: '1px dashed #475569',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backgroundColor: 'rgba(17, 22, 31, 0.78)',
                          color: '#CBD5E1',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Plus size={20} color="#FF2A2A" />
                        <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
                          + Lembar
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dropzone visual hint saat belum ada berkas terpilih */
                  <div 
                    onClick={triggerFileInput}
                    style={{
                      marginTop: '14px',
                      border: '1px dashed rgba(148, 163, 184, 0.24)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(11, 14, 20, 0.6)',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <UploadCloud size={24} color="#FF2A2A" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: '2px' }}>
                      Klik untuk Pilih Berkas (Bisa Multi-Lembar)
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.65)', fontFamily: 'Inter, sans-serif' }}>
                      atau seret foto berkas lembar 1, lembar 2, dst ke sini
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button OPSI A */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
                <button 
                  type="button"
                  disabled={isScanning}
                  onClick={handleExecuteScan}
                  style={{
                    width: '100%',
                    background: '#FF2A2A',
                    color: '#FFFFFF',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 0 18px rgba(255, 42, 42, 0.45)',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={15} />
                  <span>
                    {selectedFiles.length > 0 
                      ? `[ Mulai Pindai (${selectedFiles.length} Lembar Berkas) ]` 
                      : '[ Mulai Pindai Berkas Fisik ]'}
                  </span>
                </button>
              </div>
            </div>

            {/* OPSI B: INPUT MANUAL LANGSUNG */}
            <div 
              className="relative group/card bg-[#11161F]/90 backdrop-blur-xl border border-[#94A3B8]/20 hover:border-[#FF2A2A]/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.55)] rounded-xl p-6 flex flex-col justify-between transition-all duration-300"
            >
              <HudCorners size="md" />

              {/* Category Badge */}
              <div style={{ position: 'absolute', top: '-14px', left: '20px', zIndex: 10 }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#CBD5E1' }}></span>
                  FORMULIR TERSTRUKTUR • BERKAS BARU
                </span>
              </div>

              <div>
                {/* Header Card Opsi B */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#CBD5E1'
                  }}>
                    <FileText size={26} />
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#CBD5E1',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(148, 163, 184, 0.18)'
                  }}>
                    STANDAR INPUT SPKT
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="heading-font" style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>
                  OPSI B: INPUT MANUAL LANGSUNG
                </h3>
                <p style={{ color: 'rgba(203, 213, 225, 0.72)', fontSize: '12px', lineHeight: 1.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Ketikkan secara manual identitas pelapor, multi-saksi, terlapor, pasal, dan uraian kejadian menggunakan formulir 3 kolom presisi standar Satreskrim.
                </p>

                {/* Feature Bullet Points */}
                <div style={{
                  marginTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: 'rgba(11, 14, 20, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.16)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(203, 213, 225, 0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
                    <Shield size={13} color="#FF2A2A" />
                    <span>Input bertahap 3 kolom (Pelapor, Saksi/Terlapor, Perkara)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(203, 213, 225, 0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
                    <Shield size={13} color="#FF2A2A" />
                    <span>Dukungan multi-saksi &amp; multi-terlapor dinamis</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(203, 213, 225, 0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
                    <Shield size={13} color="#FF2A2A" />
                    <span>Otomatisasi nomor LP &amp; registrasi SPKT resmi</span>
                  </div>
                </div>
              </div>

              {/* Action Button OPSI B */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
                <button 
                  type="button"
                  onClick={() => onSelectMode && onSelectMode('manual')}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#F8FAFC',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <span>[ Buka Formulir Manual ]</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
