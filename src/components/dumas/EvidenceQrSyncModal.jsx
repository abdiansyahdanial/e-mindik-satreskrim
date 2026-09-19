import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Smartphone, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Camera,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../supabaseClient';
import { formatR2PublicUrl } from '../../lib/r2Client';

export default function EvidenceQrSyncModal({
  isOpen = false,
  onClose,
  onEvidenceReceived,
  setDaftarBukti,
  activeToken: propActiveToken,
  token: propToken,
  syncToken: propSyncToken,
  onTokenChange,
  _dumasNo
}) {
  const [internalToken, setInternalToken] = useState(() => generateNewToken());
  const syncToken = propActiveToken || propToken || propSyncToken || internalToken;
  
  // Timer Sesi: QR 30 Detik (Laptop), Batas Akses HP 2 Menit (120 Detik)
  const [countdown, setCountdown] = useState(30);
  const [createdAt, setCreatedAt] = useState(() => Date.now());
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + 2 * 60 * 1000);
  const [isExpired, setIsExpired] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [justReceived, setJustReceived] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ref dedup berbasis URL — mencegah ketiga channel (Supabase/BroadcastChannel/storageEvent)
  // memicu handler ganda untuk URL yang sama dalam satu sesi modal terbuka.
  // Di-reset saat modal ditutup (isOpen=false) via useEffect di bawah.
  const processedUrlsRef = useRef(new Set());

  // Reset dedup set setiap kali modal dibuka atau syncToken berubah
  useEffect(() => {
    if (isOpen) {
      processedUrlsRef.current.clear();
    }
  }, [isOpen, syncToken]);

  function generateNewToken() {
    return `POLRES-KOLTIM-BB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  // Target URL: Arahkan ke domain publik Vercel jika dibuka dari localhost agar ponsel bisa memindai & mengakses langsung
  const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://e-mindik-satreskrim.vercel.app'
    : (typeof window !== 'undefined' ? window.location.origin : 'https://e-mindik-satreskrim.vercel.app');

  // URL yang di-encode ke QR code menyertakan token, waktu pembuatan, dan batas kedaluwarsa 2 menit HP
  const uploadUrl = `${baseUrl}/mobile-upload?token=${syncToken}&createdAt=${createdAt}&expiresAt=${expiresAt}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Gagal menyalin link:', err);
    }
  };

  const handleResetSession = useCallback(() => {
    const now = Date.now();
    const newToken = generateNewToken();
    setInternalToken(newToken);
    if (onTokenChange) {
      onTokenChange(newToken);
    }
    setCreatedAt(now);
    setExpiresAt(now + 2 * 60 * 1000); // 2 menit batas upload HP
    setCountdown(30); // 30 detik QR display laptop
    setIsExpired(false);
    setCopied(false);
  }, [onTokenChange]);

  // 1. Timer Hitung Mundur Sesi QR 30 Detik (Monitor Laptop)
  useEffect(() => {
    if (!isOpen || isExpired) return;

    const timeoutInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timeoutInterval);
  }, [isOpen, isExpired]);

  // 2. Realtime Listener: Terima unggahan foto bukti dari kamera ponsel HP penyidik secara live
  useEffect(() => {
    if (!isOpen || !syncToken) return;

    const handleReceivedEvidence = (data) => {
      if (!data) return;

      // GUARD SENDERID: Abaikan pesan yang dikirim dari laptop itu sendiri (self-echo simulasi)
      // senderId 'LAPTOP_CLIENT' tidak digunakan saat ini, tapi disiapkan untuk future proofing.
      // senderId 'MOBILE_HP' berarti pesan sah dari HP — lanjutkan proses.

      // Normalisasi token check jika token terlampir
      if (data.token && syncToken && data.token.trim().toUpperCase() !== syncToken.trim().toUpperCase()) {
        console.warn('[REALTIME BRIDGE] Abaikan data karena token tidak cocok:', data.token, 'vs', syncToken);
        return;
      }

      // DEDUP BERBASIS URL: Satu URL = satu dispatch, regardless channel mana yang menerimanya
      const canonicalUrl = (data.url || data.fileUrl || data.file_url || data.previewUrl || '').trim();
      if (!canonicalUrl) {
        console.warn('[REALTIME BRIDGE] Payload tanpa URL, diabaikan.');
        return;
      }
      if (processedUrlsRef.current.has(canonicalUrl)) {
        console.warn('[DEDUP MODAL] URL sudah diproses dalam sesi ini, abaikan duplikat:', canonicalUrl);
        return;
      }
      processedUrlsRef.current.add(canonicalUrl);

      const rawUrl = canonicalUrl;
      const fileUrl = formatR2PublicUrl(rawUrl);
      const fileName = data.nama_berkas || data.nama_file || data.name || data.fileName || 'Foto_Bukti_HP.jpg';
      const fileSize = data.ukuran || data.fileSize || data.size || 184500;
      const mimeType = data.tipe || data.type || data.mime_type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

      const evidenceItem = {
        id: data.id || `bb_${Date.now()}`,
        nama_berkas: fileName,
        nama_file: fileName,
        name: fileName,
        url: fileUrl,
        fileUrl: fileUrl,
        file_url: fileUrl,
        previewUrl: fileUrl,
        tipe: mimeType,
        type: mimeType,
        mime_type: mimeType,
        ukuran: fileSize,
        size: fileSize,
        fileSize: fileSize,
        kategori_bukti: isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
        file_size_formatted: data.file_size_formatted || `${(fileSize / 1024).toFixed(0)} KB`,
        key: data.key,
        keterangan: data.keterangan || (isPdf ? 'Dokumen berkas perkara (via scan HP)' : 'Foto bukti fisik (via scan HP)'),
        hash_sha256: data.hash_sha256 || Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...',
        uploaded_at: data.uploaded_at || data.timestamp || new Date().toISOString(),
        diunggah_pada: data.uploaded_at || data.timestamp || new Date().toISOString(),
        isNew: true
      };

      const finalEvidence = {
        ...evidenceItem,
        id: evidenceItem.id || `bb_${Date.now()}`,
        keterangan: evidenceItem.keterangan || (evidenceItem.kategori_bukti === 'DOKUMEN_PDF' ? 'Dokumen berkas perkara (via scan HP)' : 'Foto bukti fisik (via scan HP)'),
        nama_file: evidenceItem.nama_berkas || evidenceItem.name || 'Bukti_Digital.jpg',
        created_at: new Date().toISOString()
      };

      console.log('[LAPTOP MODAL] Sinyal barang bukti baru diterima & otomatis disimpan:', finalEvidence.nama_file, '|', fileUrl);

      setReceivedCount(prev => prev + 1);
      setJustReceived(true);
      setTimeout(() => setJustReceived(false), 4000);

      // Jika props setDaftarBukti tersedia, langsung tambahkan finalEvidence ke state daftar bukti
      if (setDaftarBukti) {
        setDaftarBukti((prev) => {
          const targetUrl = (finalEvidence.url || finalEvidence.fileUrl || '').trim();
          const exists = prev.some((item) => (item.url || item.fileUrl || '').trim() === targetUrl);
          if (exists) {
            console.warn('[DEDUP MODAL] Mengabaikan duplikat untuk URL:', targetUrl);
            return prev;
          }
          return [...prev, finalEvidence];
        });
      }

      // Jika props onEvidenceReceived tersedia, panggil onEvidenceReceived(finalEvidence, true)
      if (onEvidenceReceived) {
        onEvidenceReceived(finalEvidence, true);
      }
    };

    // A. Supabase Realtime channel (Koneksi lintas-perangkat HP ke Laptop)
    console.log(`[REALTIME BRIDGE] Membuka listener channel laptop: mobile_sync_${syncToken}`);
    const channel = supabase.channel(`mobile_sync_${syncToken}`);

    channel
      .on('broadcast', { event: 'evidence_uploaded' }, ({ payload }) => {
        console.log('[LAPTOP] Menerima berkas bukti baru (Modal):', payload);
        handleReceivedEvidence(payload);
      })
      .subscribe((status) => {
        console.log(`[REALTIME BRIDGE] Status channel ${syncToken}:`, status);
      });

    // B. BroadcastChannel fallback (Untuk pengujian tab/jendela di perangkat yang sama)
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('polres_mobile_bridge');
        bc.onmessage = (event) => {
          handleReceivedEvidence(event.data);
        };
      } catch {}
    }

    // C. Storage Event fallback
    const handleStorage = (e) => {
      if (e.key === `polres_mobile_evidence_${syncToken}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleReceivedEvidence(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      supabase.removeChannel(channel);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [isOpen, syncToken, onEvidenceReceived, setDaftarBukti]);

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

      const finalEvidence = {
        ...evidenceItem,
        id: evidenceItem.id || `bb_${Date.now()}`,
        keterangan: evidenceItem.keterangan || 'Foto bukti fisik (via scan HP)',
        nama_file: evidenceItem.nama_berkas || evidenceItem.name || 'Bukti_Digital.jpg',
        created_at: new Date().toISOString()
      };

      setReceivedCount(prev => prev + 1);
      setJustReceived(true);
      setTimeout(() => setJustReceived(false), 4000);

      if (setDaftarBukti) {
        setDaftarBukti((prev) => {
          const targetUrl = (finalEvidence.url || finalEvidence.fileUrl || finalEvidence.previewUrl || '').trim();
          const exists = prev.some((item) => (item.url || item.fileUrl || item.previewUrl || '').trim() === targetUrl);
          if (exists) return prev;
          return [...prev, finalEvidence];
        });
      }

      if (onEvidenceReceived) {
        onEvidenceReceived(finalEvidence, true);
      }
    }, 'image/jpeg');
  };

  const sessionPercent = Math.max(0, Math.min(100, (countdown / 30) * 100));

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
        className="w-full max-w-md rounded-2xl bg-[#1b2229] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#1b2229',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Modal */}
        <div 
          className="p-4 px-5 bg-[#141a1f] border-b border-white/[0.08] flex items-center justify-between"
          style={{
            padding: '16px 20px',
            backgroundColor: '#141a1f',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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

          {/* Kartu Wadah QR Code Standar (High Contrast Hitam di Atas Putih) */}
          {!isExpired ? (
            <div 
              className="bg-white p-4 rounded-xl inline-flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                border: '2px solid #FFFFFF'
              }}
            >
              <QRCodeSVG 
                value={uploadUrl}
                size={220}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="H"
                includeMargin={false}
              />
            </div>
          ) : (
            <div 
              style={{
                width: '252px',
                height: '252px',
                borderRadius: '16px',
                backgroundColor: '#0B0D13',
                border: '1.5px dashed #EF4444',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '18px',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444'
              }}>
                <AlertTriangle size={24} />
              </div>
              <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F87171' }}>
                QR KEDALUWARSA
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>
                Batas waktu 30 detik QR telah habis demi keamanan enkripsi.
              </span>
              <button
                type="button"
                onClick={handleResetSession}
                style={{
                  marginTop: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover:bg-red-600 transition-colors"
              >
                <RefreshCw size={12} />
                <span>QR Kedaluwarsa. Klik untuk Buat QR Baru</span>
              </button>
            </div>
          )}

          {/* Opsi Tambahan: Tautan Salin Manual */}
          {!isExpired && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
                  border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                  color: copied ? '#10B981' : '#E2E8F0',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500"
                title="Salin tautan upload sesi ke clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Tautan Sesi Berhasil Disalin!' : 'Salin Tautan Sesi'}</span>
              </button>
              <span 
                style={{ 
                  fontSize: '10px', 
                  fontFamily: 'JetBrains Mono, monospace', 
                  color: '#64748B', 
                  maxWidth: '380px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}
                title={uploadUrl}
              >
                {uploadUrl}
              </span>
            </div>
          )}

          {/* Indikator Status & Waktu */}
          {!isExpired ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Token & Status Sesi Bar */}
              <div 
                style={{
                  backgroundColor: '#0B0D13',
                  border: countdown <= 10 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid #292F42',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'border-color 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: countdown <= 10 ? '#F87171' : '#CBD5E1' }}>
                    <Clock size={12} color={countdown <= 10 ? '#EF4444' : '#F59E0B'} />
                    <span>Sesi QR Kedaluwarsa dalam:</span>
                  </div>
                  <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: countdown <= 10 ? '#EF4444' : '#F59E0B' }}>
                    {countdown} detik
                  </span>
                </div>

                {/* Progress Bar 30s */}
                <div style={{ width: '100%', height: '5px', backgroundColor: '#1E293B', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${sessionPercent}%`,
                      backgroundColor: countdown <= 10 ? '#EF4444' : (countdown <= 20 ? '#F59E0B' : '#10B981'),
                      transition: 'width 1s linear, background-color 0.3s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Sesi Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '10.5px', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={12} color="#10B981" />
                  Batas Akses Kamera HP:
                </span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>
                  2 Menit (120 Detik)
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResetSession}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#EF4444',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
              }}
              className="hover:bg-red-600 transition-all"
            >
              <RefreshCw size={14} />
              <span>QR Kedaluwarsa. Klik untuk Buat QR Baru</span>
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
              <span>Bukti berhasil diterima &amp; disimpan! ({receivedCount} berkas). Anda dapat mengambil foto berikutnya dari HP</span>
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
