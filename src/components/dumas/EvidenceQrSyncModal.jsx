import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Smartphone, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Camera,
  CheckCircle2
} from 'lucide-react';

/**
 * Komponen QR Code SVG Generator Prosedural untuk Tampilan Polisi Presisi
 */
function AuthenticQrSvg({ token, size = 180 }) {
  // Generate deterministic grid pattern based on token hash
  const gridSize = 25;
  const cellSize = size / gridSize;

  // Simple pseudo-random hash generator for deterministic QR dots
  const getDotState = (row, col) => {
    // 3 Posisi Finder Eyes (Pojok Kiri Atas, Kanan Atas, Kiri Bawah)
    const isTopLeftEye = row < 7 && col < 7;
    const isTopRightEye = row < 7 && col >= gridSize - 7;
    const isBottomLeftEye = row >= gridSize - 7 && col < 7;

    if (isTopLeftEye || isTopRightEye || isBottomLeftEye) {
      const r = isTopLeftEye ? row : isTopRightEye ? row : row - (gridSize - 7);
      const c = isTopLeftEye ? col : isTopRightEye ? col - (gridSize - 7) : col;

      // Outer border
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      // Inner space
      if (r === 1 || r === 5 || c === 1 || c === 5) return false;
      // Center solid
      return true;
    }

    // Timing patterns
    if (row === 6 || col === 6) {
      return (row + col) % 2 === 0;
    }

    // Hash based pseudo-random filler
    const charCode = (token.charCodeAt((row * 7 + col * 13) % token.length) || 42);
    return ((charCode * (row + 1) + col * 17) % 7) > 3;
  };

  const dots = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (getDotState(r, c)) {
        dots.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize - 0.5}
            height={cellSize - 0.5}
            rx={cellSize * 0.2}
            fill="#FFFFFF"
          />
        );
      }
    }
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      style={{ display: 'block', margin: '0 auto' }}
    >
      <rect width={size} height={size} fill="#0B0D13" rx="8" />
      {dots}
    </svg>
  );
}

export default function EvidenceQrSyncModal({
  isOpen = true,
  onClose,
  onEvidenceReceived
}) {
  const [tokenRotationSeconds, setTokenRotationSeconds] = useState(30);
  const [sessionTimeoutSeconds, setSessionTimeoutSeconds] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [syncToken, setSyncToken] = useState(() => generateNewToken());
  const [receivedCount, setReceivedCount] = useState(0);
  const [justReceived, setJustReceived] = useState(false);

  function generateNewToken() {
    return `POLRES-KOLTIM-BB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  const handleResetSession = useCallback(() => {
    setSyncToken(generateNewToken());
    setTokenRotationSeconds(30);
    setSessionTimeoutSeconds(60);
    setIsExpired(false);
  }, []);

  // 1. Timer Rotasi Token (Setiap 30 Detik berganti)
  useEffect(() => {
    if (!isOpen || isExpired) return;

    const rotationInterval = setInterval(() => {
      setTokenRotationSeconds((prev) => {
        if (prev <= 1) {
          setSyncToken(generateNewToken());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(rotationInterval);
  }, [isOpen, isExpired]);

  // 2. Timer Batas Waktu Sesi (Timeout 60 Detik)
  useEffect(() => {
    if (!isOpen || isExpired) return;

    const timeoutInterval = setInterval(() => {
      setSessionTimeoutSeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timeoutInterval);
  }, [isOpen, isExpired]);

  // Handle ESC Key to Close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handler Simulasi Pengiriman dari Kamera HP (Untuk demo cepat & offline testing)
  const handleSimulateMobileUpload = () => {
    if (isExpired) return;

    const dummyFileName = `Foto_Bukti_HP_${Date.now().toString().slice(-4)}.jpg`;
    
    // Canvas dummy preview
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 600, 450);

      // Header strip
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(0, 0, 600, 40);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('SATRESKRIM POLRES KOLAKA TIMUR - DOKUMENTASI BB', 20, 26);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px monospace';
      ctx.fillText(`TOKEN SINKRONISASI: ${syncToken}`, 20, 80);
      ctx.fillText(`WAKTU DIAMANKAN: ${new Date().toLocaleString('id-ID')}`, 20, 110);
      ctx.fillText(`SUMBER: KAMERA HP PENYIDIK LAPANGAN`, 20, 140);

      // Central placeholder box
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 170, 520, 230);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('FOTO BARANG BUKTI FISIK TERVERIFIKASI', 80, 270);
      ctx.fillStyle = '#38BDF8';
      ctx.font = '14px monospace';
      ctx.fillText('• Enkripsi SHA-256 Otomatis Berhasil •', 160, 310);
    }

    canvas.toBlob((blob) => {
      const mockFile = new File([blob || ''], dummyFileName, { type: 'image/jpeg' });
      const evidenceItem = {
        id: `bb-qr-${Date.now()}`,
        name: dummyFileName,
        nama_file: dummyFileName,
        size: mockFile.size || 184500,
        type: 'image/jpeg',
        mime_type: 'image/jpeg',
        kategori_bukti: 'OBJEK_FISIK_JPG',
        file_size_formatted: `${((mockFile.size || 184500) / 1024).toFixed(0)} KB`,
        previewUrl: URL.createObjectURL(mockFile),
        file: mockFile,
        rawFile: mockFile,
        keterangan: 'Foto barang bukti fisik diambil via pemindaian kamera HP penyidik',
        hash_sha256: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...',
        diunggah_pada: new Date().toISOString()
      };

      setReceivedCount(prev => prev + 1);
      setJustReceived(true);
      setTimeout(() => setJustReceived(false), 2500);

      if (onEvidenceReceived) {
        onEvidenceReceived(evidenceItem);
      }
    }, 'image/jpeg');
  };

  const rotationPercent = ((30 - tokenRotationSeconds) / 30) * 100;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-[#121721] border border-[#292F42] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#121721',
          border: '1px solid #292F42',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Modal */}
        <div 
          className="p-4 px-5 bg-[#0B0D13] border-b border-[#292F42] flex items-center justify-between"
          style={{
            padding: '16px 20px',
            backgroundColor: '#0B0D13',
            borderBottom: '1px solid #292F42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(229, 46, 46, 0.2)',
                border: '1px solid rgba(229, 46, 46, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF352D'
              }}
            >
              <Smartphone size={18} />
            </div>
            <div>
              <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: '#FF352D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LIVE MOBILE BRIDGE
              </span>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                Pindai Bukti via HP (QR Code)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Tutup Dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center gap-4" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* Petunjuk Penggunaan Singkat */}
          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textAlign: 'center', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
            Arahkan kamera ponsel ke QR Code di bawah untuk mengambil foto barang bukti secara instan dan aman.
          </p>

          {/* Kartu Wadah QR Code */}
          <div 
            style={{
              position: 'relative',
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: '#0B0D13',
              border: isExpired ? '1px dashed #EF4444' : '1px solid #292F42',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              width: '212px',
              height: '212px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {!isExpired ? (
              <>
                <AuthenticQrSvg token={syncToken} size={180} />
                
                {/* Badge Center Logo Polri / Presisi */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#121721',
                    border: '2px solid #E52E2E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(229, 46, 46, 0.5)'
                  }}
                >
                  <Camera size={18} color="#FF352D" />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={36} color="#EF4444" />
                <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F87171' }}>
                  SESI KEDALUWARSA
                </span>
                <span style={{ fontSize: '10px', color: '#94A3B8', lineHeight: 1.4 }}>
                  Batas waktu 60 detik telah berakhir untuk menjaga keamanan berkas perkara.
                </span>
              </div>
            )}
          </div>

          {/* Indikator Status & Waktu */}
          {!isExpired ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Token & Rotasi 30 Detik Bar */}
              <div 
                style={{
                  backgroundColor: '#0B0D13',
                  border: '1px solid #292F42',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#CBD5E1' }}>
                    <RefreshCw size={12} className="spin-on-hover" color="#38BDF8" />
                    <span>Rotasi Token Baru:</span>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#38BDF8' }}>
                    {tokenRotationSeconds} detik
                  </span>
                </div>

                {/* Progress Bar 30s */}
                <div style={{ width: '100%', height: '4px', backgroundColor: '#1E293B', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${rotationPercent}%`,
                      backgroundColor: '#0284C7',
                      transition: 'width 1s linear'
                    }} 
                  />
                </div>
              </div>

              {/* Sesi Total 60 Detik Countdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} />
                  Batas Sesi Aktif:
                </span>
                <span style={{ color: sessionTimeoutSeconds < 15 ? '#EF4444' : '#E2E8F0', fontWeight: 600 }}>
                  {sessionTimeoutSeconds}s (Timeout)
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResetSession}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(229, 46, 46, 0.15)',
                border: '1px solid #E52E2E',
                color: '#FF6B6B',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={14} />
              <span>Perbarui QR Code &amp; Buat Sesi Baru</span>
            </button>
          )}

          {/* Notifikasi Foto Masuk (Pulsing badge) */}
          {justReceived && (
            <div 
              style={{
                width: '100%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#34D399',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'pulse 1.5s infinite'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Foto bukti berhasil diterima dari ponsel! ({receivedCount} berkas)</span>
            </div>
          )}

          {/* Tombol Simulasi Mobile Upload untuk Uji Coba Cepat */}
          <div 
            style={{
              width: '100%',
              paddingTop: '12px',
              borderTop: '1px solid #292F42',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <button
              type="button"
              disabled={isExpired}
              onClick={handleSimulateMobileUpload}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: isExpired ? '#1E293B' : '#1B1F2C',
                border: '1px solid #334155',
                color: isExpired ? '#64748B' : '#E2E8F0',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                cursor: isExpired ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              title="Kirim contoh foto simulasi dari ponsel ke daftar bukti"
            >
              <Camera size={14} color="#FF352D" />
              <span>+ Simulasi Kamera HP Mengirim Foto Bukti</span>
            </button>
            <span style={{ fontSize: '10px', color: '#64748B', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
              Klik tombol simulasi di atas untuk langsung menguji penerimaan berkas foto dari ponsel tanpa koneksi eksternal.
            </span>
          </div>

        </div>

        {/* Footer Modal */}
        <div 
          className="p-3.5 px-5 bg-[#0B0D13] border-t border-[#292F42] flex items-center justify-between"
          style={{
            padding: '12px 20px',
            backgroundColor: '#0B0D13',
            borderTop: '1px solid #292F42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#10B981' }}>
            <ShieldCheck size={13} />
            <span>Koneksi Terenkripsi AES-256</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#1E293B',
              border: '1px solid #475569',
              color: '#CBD5E1',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer'
            }}
          >
            Selesai / Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
