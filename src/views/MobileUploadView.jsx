import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Smartphone,
  RefreshCw,
  Lock,
  Clock,
  ShieldAlert,
  Trash2,
  Plus,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { compressImageClient, convertImagesToSinglePdf } from '../utils/evidenceDocHelper.js';

// Extract token & expiry from URL search params or hash robustly
const getSessionParams = () => {
  if (typeof window === 'undefined') {
    const now = Date.now();
    return { token: 'SESI-DEMO-KOLTIM', targetExp: now + 120000 };
  }

  const searchParams = new URLSearchParams(window.location.search);
  let token = searchParams.get('token');
  let expParam = searchParams.get('expiresAt') || searchParams.get('exp');
  let createdParam = searchParams.get('createdAt') || searchParams.get('created_at');

  if (!token && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    token = hashParams.get('token');
    if (!expParam) expParam = hashParams.get('expiresAt') || hashParams.get('exp');
    if (!createdParam) createdParam = hashParams.get('createdAt') || hashParams.get('created_at');
  }

  token = token || 'SESI-DEMO-KOLTIM';
  const now = Date.now();
  let targetExp;
  if (expParam && !isNaN(Number(expParam))) {
    targetExp = Number(expParam);
  } else if (createdParam && !isNaN(Number(createdParam))) {
    targetExp = Number(createdParam) + 120 * 1000;
  } else {
    targetExp = now + 120 * 1000;
  }

  return { token, targetExp };
};

export default function MobileUploadView() {
  const syncChannelRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Mode: 'single' (Objek Fisik Tunggal) atau 'doc' (Dokumen Multi-Halaman)
  const [captureMode, setCaptureMode] = useState('single');
  const [docPages, setDocPages] = useState([]); // Array of File/Blob terkompresi
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [sessionParams] = useState(getSessionParams);
  const token = sessionParams.token;
  const targetExp = sessionParams.targetExp;

  const getInitialRemaining = () => {
    const diff = Math.floor((targetExp - Date.now()) / 1000);
    return Math.max(0, Math.min(120, diff));
  };

  const [remainingSeconds, setRemainingSeconds] = useState(getInitialRemaining);
  const [isExpired, setIsExpired] = useState(() => getInitialRemaining() <= 0);

  // Countdown timer 2 menit (120 detik) di HP
  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      const diff = Math.floor((targetExp - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setRemainingSeconds(Math.min(120, diff));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, targetExp]);

  // Pre-subscribe channel WebSocket Supabase dengan referensi tunggal yang tetap aktif
  useEffect(() => {
    if (!token || isExpired) return;
    console.log(`[MOBILE SYNC] Pre-subscribing channel tunggal mobile_sync_${token}...`);
    
    if (!syncChannelRef.current) {
      const ch = supabase.channel(`mobile_sync_${token}`, {
        config: {
          broadcast: { ack: true }
        }
      });
      ch.subscribe((status) => {
        console.log(`[MOBILE SYNC] Status koneksi channel HP (${token}):`, status);
      });
      syncChannelRef.current = ch;
    }

    return () => {
      console.log(`[MOBILE SYNC] Memutus listener channel mobile_sync_${token} (Sesi berakhir/Unmount)...`);
      if (syncChannelRef.current) {
        supabase.removeChannel(syncChannelRef.current);
        syncChannelRef.current = null;
      }
    };
  }, [token, isExpired]);

  // Fungsi pengiriman broadcast yang menjamin channel aktif dan mendukung multi-upload berulang
  const sendEvidenceBroadcast = async (evidencePayload) => {
    if (!syncChannelRef.current) {
      syncChannelRef.current = supabase.channel(`mobile_sync_${token}`);
      await syncChannelRef.current.subscribe();
    }

    const ch = syncChannelRef.current;

    try {
      const res = await ch.send({
        type: 'broadcast',
        event: 'evidence_uploaded',
        payload: evidencePayload
      });
      console.log('[HP] Broadcast terkirim untuk berkas:', evidencePayload.nama_berkas, res);
    } catch (sendErr) {
      console.warn('[HP] Broadcast send warning:', sendErr);
      try {
        await ch.subscribe();
        await ch.send({
          type: 'broadcast',
          event: 'evidence_uploaded',
          payload: evidencePayload
        });
      } catch (retryErr) {
        console.warn('[HP] Retry broadcast failed:', retryErr);
      }
    }

    // BroadcastChannel & LocalStorage fallback (untuk simulasi / uji coba tab perangkat yang sama)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('polres_mobile_bridge');
        bc.postMessage(evidencePayload);
        bc.close();
      }
    } catch (bcErr) {
      console.warn('BroadcastChannel notice:', bcErr);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`polres_mobile_evidence_${token}`, JSON.stringify(evidencePayload));
        localStorage.setItem(`polres_mobile_evidence_ping`, String(Date.now()));
      }
    } catch {}
  };

  const handleFileCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value agar dapat memotret foto baru berturut-turut
    e.target.value = '';

    try {
      setErrorMsg(null);
      if (captureMode === 'single') {
        // Mode Objek Fisik: Kompresi gambar tunggal
        let processed = file;
        if (file.type.startsWith('image/')) {
          processed = await compressImageClient(file, 1800, 0.75);
        }
        setSelectedFile(processed);
        setIsSuccess(false);
        setPreviewUrl(URL.createObjectURL(processed));
      } else {
        // Mode Dokumen Multi-Halaman: Kompresi lembar lalu tambahkan ke antrean halaman
        setIsProcessingDoc(true);
        let compressed = file;
        if (file.type.startsWith('image/')) {
          compressed = await compressImageClient(file, 1800, 0.75);
        }
        const updatedPages = [...docPages, compressed];
        setDocPages(updatedPages);

        // Langsung generate preview / bundle PDF sementara
        const generatedPdf = await convertImagesToSinglePdf(
          updatedPages,
          `Dokumen_Bukti_${Date.now()}.pdf`
        );
        setSelectedFile(generatedPdf);
        setIsSuccess(false);
      }
    } catch (err) {
      console.error('Gagal memproses foto di HP:', err);
      setErrorMsg('Gagal memproses gambar. Silakan coba kembali.');
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleRemovePage = useCallback(async (indexToRemove) => {
    const remaining = docPages.filter((_, idx) => idx !== indexToRemove);
    setDocPages(remaining);
    if (remaining.length === 0) {
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      const generatedPdf = await convertImagesToSinglePdf(
        remaining,
        `Dokumen_Bukti_${Date.now()}.pdf`
      );
      setSelectedFile(generatedPdf);
    }
  }, [docPages]);

  const handleResetCapture = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDocPages([]);
    setIsSuccess(false);
  };

  const handleUpload = async () => {
    if (isExpired) {
      setErrorMsg('Sesi telah kedaluwarsa. Silakan scan QR code baru di monitor penyidik.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Pilih atau ambil foto barang bukti terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      console.log(`[MOBILE UPLOAD] Memulai upload untuk file: ${selectedFile.name} (${selectedFile.size} bytes)`);
      const targetName = selectedFile.name || `evidence_${Date.now()}.jpg`;
      const mimeType = selectedFile.type || 'image/jpeg';

      // 1. Minta Presigned PUT URL & Presigned GET Read URL dari Serverless Function /api/r2-presign
      console.log('[MOBILE UPLOAD] Meminta presigned URL ke /api/r2-presign...');
      const presignRes = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: targetName,
          contentType: mimeType,
          folder: 'barang-bukti',
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Gagal memperoleh presigned upload URL (HTTP ${presignRes.status}).`);
      }

      const presignData = await presignRes.json();
      const { uploadUrl, fileUrl, presignedGetUrl, readUrl, key } = presignData;

      if (!uploadUrl) {
        throw new Error('Server tidak mengembalikan uploadUrl yang valid.');
      }

      // 2. Eksekusi PUT Request biner langsung ke Cloudflare R2
      console.log('[MOBILE UPLOAD] Mengunggah biner langsung ke Cloudflare R2...');
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error(`Gagal mengunggah biner berkas ke Cloudflare R2 (HTTP ${uploadRes.status} ${uploadRes.statusText}).`);
      }

      // Prioritaskan readUrl / presignedGetUrl agar gambar dapat langsung dibuka browser laptop tanpa 403 Forbidden
      const finalUrl = readUrl || presignedGetUrl || fileUrl;
      console.log('[MOBILE UPLOAD] Sukses terunggah ke Cloudflare R2 dengan read URL:', finalUrl);

      // 3. Siapkan payload data foto resmi & reaktif
      const evidenceData = {
        id: `bb_${Date.now()}`,
        senderId: 'MOBILE_HP',         // Identifier pengirim — dipakai listener untuk filter self-echo
        nama_berkas: targetName,
        nama_file: targetName,
        name: targetName,
        fileName: targetName,
        url: finalUrl,
        fileUrl: finalUrl,
        file_url: finalUrl,
        previewUrl: finalUrl,
        tipe: mimeType,
        type: mimeType,
        mime_type: mimeType,
        ukuran: selectedFile.size,
        size: selectedFile.size,
        fileSize: selectedFile.size,
        file_size_formatted: `${(selectedFile.size / 1024).toFixed(0)} KB`,
        kategori_bukti: selectedFile.name?.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
        keterangan: 'Foto barang bukti fisik diambil via pemindaian HP (Cloudflare R2)',
        uploaded_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        token: token,
        key: key
      };

      console.log(`[MOBILE] Mengirim broadcast ke channel mobile_sync_${token}...`, evidenceData);
      // Kirim via referensi channel persisten Supabase Realtime
      await sendEvidenceBroadcast(evidenceData);

      setIsSuccess(true);
    } catch (err) {
      console.error('[MOBILE UPLOAD] Gagal mengunggah foto bukti:', err);
      // Beritahu penyidik via pesan UI jika gagal, tidak menyamarkan kegagalan
      setErrorMsg(`Unggah Bukti Gagal: ${err.message || 'Koneksi ke Cloudflare R2 terputus. Silakan coba kembali.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatMinutesSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080B10',
      color: '#FFFFFF',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 16px'
    }}>
      {/* Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#121721',
        border: '1px solid #292F42',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0B0D13',
          borderBottom: '1px solid #292F42',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(229, 46, 46, 0.15)',
            border: isExpired ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(229, 46, 46, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpired ? '#EF4444' : '#FF352D'
          }}>
            {isExpired ? <Lock size={20} /> : <Smartphone size={22} />}
          </div>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#FF352D', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SATRESKRIM POLRES KOLAKA TIMUR
            </span>
            <h1 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              Live Mobile Upload Bridge
            </h1>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Token Info Pill */}
          <div style={{
            backgroundColor: '#0B0D13',
            border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #1E293B',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
              TOKEN SINKRONISASI AKTIF:
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isExpired ? '#EF4444' : '#38BDF8', wordBreak: 'break-all' }}>
              {token}
            </span>
          </div>

          {/* BAGIAN 3: TAMPILAN SESI BERAKHIR (POLICE DARK MODE EXPIRED SCREEN) */}
          {isExpired ? (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '30px 18px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 30px rgba(239, 68, 68, 0.12)'
            }}>
              {/* Ikon Gembok Terkunci Merah/Amber */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                boxShadow: '0 0 24px rgba(239, 68, 68, 0.3)'
              }}>
                <Lock size={32} />
              </div>

              <div>
                <span style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#EF4444',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  AKSES PENGUNGGAHAN DITUTUP
                </span>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '0 0 10px 0',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  Sesi Ini Telah Berakhir
                </h2>
                <p style={{
                  fontSize: '12px',
                  color: '#CBD5E1',
                  margin: 0,
                  lineHeight: 1.6
                }}>
                  Batas waktu pengunggahan mandiri (2 menit) telah habis demi keamanan data penyidikan. Silakan scan kembali barcode terbaru pada website monitor penyidik.
                </p>
              </div>

              <div style={{
                width: '100%',
                backgroundColor: '#0B0D13',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#64748B'
              }}>
                <ShieldAlert size={15} color="#EF4444" />
                <span>Protokol Keamanan Siber Satreskrim Polri</span>
              </div>
            </div>
          ) : (
            <>
              {/* Active Countdown Timer Bar (120 Detik / 2 Menit Akses HP) */}
              <div style={{
                backgroundColor: '#0B0D13',
                border: remainingSeconds <= 30 ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid #1E293B',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'border-color 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: remainingSeconds <= 30 ? '#F87171' : '#CBD5E1' }}>
                    <Clock size={13} color={remainingSeconds <= 30 ? '#EF4444' : '#F59E0B'} />
                    <span>Sisa Waktu Unggah HP:</span>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    color: remainingSeconds <= 30 ? '#EF4444' : '#F59E0B'
                  }}>
                    {formatMinutesSeconds(remainingSeconds)}
                  </span>
                </div>

                {/* Progress Bar 120s */}
                <div style={{ width: '100%', height: '4px', backgroundColor: '#1E293B', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (remainingSeconds / 120) * 100))}%`,
                      backgroundColor: remainingSeconds <= 30 ? '#EF4444' : (remainingSeconds <= 60 ? '#F59E0B' : '#10B981'),
                      transition: 'width 1s linear, background-color 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Success Notification */}
              {isSuccess ? (
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle2 size={36} color="#10B981" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Foto Bukti Berhasil Terkirim!
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                    Berkas telah terkirim ke monitor penyidik. Anda dapat mengambil foto bukti lainnya jika diperlukan.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetCapture}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Ambil Foto Lainnya
                  </button>
                </div>
              ) : (
                <>
                  {/* Pilihan Mode Pengambilan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setCaptureMode('single'); handleResetCapture(); }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: captureMode === 'single' ? '1px solid #3B82F6' : '1px solid #334155',
                        backgroundColor: captureMode === 'single' ? 'rgba(59, 130, 246, 0.15)' : '#0B0D13',
                        color: captureMode === 'single' ? '#60A5FA' : '#94A3B8',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ImageIcon size={14} /> Objek Fisik (1 Foto)
                    </button>

                    <button
                      type="button"
                      onClick={() => { setCaptureMode('doc'); handleResetCapture(); }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: captureMode === 'doc' ? '1px solid #10B981' : '1px solid #334155',
                        backgroundColor: captureMode === 'doc' ? 'rgba(16, 185, 129, 0.15)' : '#0B0D13',
                        color: captureMode === 'doc' ? '#34D399' : '#94A3B8',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={14} /> Dokumen (Multi-Lembar)
                    </button>
                  </div>

                  {/* Daftar Thumbnail Halaman jika dalam Mode Dokumen */}
                  {captureMode === 'doc' && docPages.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                          Lembar Terkumpul ({docPages.length} Halaman)
                        </span>
                        <button
                          type="button"
                          onClick={handleResetCapture}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Reset Semua
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                        {docPages.map((pageFile, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              width: '70px',
                              height: '90px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #334155',
                              flexShrink: 0,
                              backgroundColor: '#0B0D13'
                            }}
                          >
                            <img
                              src={URL.createObjectURL(pageFile)}
                              alt={`Hal ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 2,
                                left: 2,
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                color: '#FFF',
                                fontSize: '9px',
                                padding: '1px 4px',
                                borderRadius: '3px'
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePage(idx)}
                              style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                                border: 'none',
                                borderRadius: '3px',
                                color: '#FFF',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex'
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capture Card */}
                  <label 
                    htmlFor="mobile-camera-input"
                    style={{
                      border: '2px dashed #334155',
                      backgroundColor: '#0B0D13',
                      borderRadius: '14px',
                      padding: previewUrl && captureMode === 'single' ? '12px' : '32px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      cursor: isProcessingDoc ? 'wait' : 'pointer',
                      textAlign: 'center',
                      minHeight: '180px'
                    }}
                  >
                    <input 
                      id="mobile-camera-input"
                      name="mobile-camera-input"
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      disabled={isExpired || isProcessingDoc}
                      style={{ display: 'none' }}
                      onChange={handleFileCapture}
                    />

                    {isProcessingDoc ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <RefreshCw size={28} color="#10B981" className="animate-spin" />
                        <div>
                          <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#10B981' }}>
                            Mengompres &amp; Menata Lembar...
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                            Sedang menyatukan dokumen ke format PDF
                          </div>
                        </div>
                      </div>
                    ) : captureMode === 'doc' && docPages.length > 0 ? (
                      <>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10B981'
                        }}>
                          <Plus size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF' }}>
                            + Foto Lembar Berikutnya
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                            Ketuk untuk memotret halaman ke-{docPages.length + 1}
                          </div>
                        </div>
                      </>
                    ) : previewUrl && captureMode === 'single' ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                        <span style={{ fontSize: '10px', color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>
                          Ketuk untuk mengganti foto
                        </span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          backgroundColor: captureMode === 'doc' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(229, 46, 46, 0.15)',
                          border: captureMode === 'doc' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(229, 46, 46, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: captureMode === 'doc' ? '#10B981' : '#FF352D'
                        }}>
                          <Camera size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF' }}>
                            {captureMode === 'doc' ? 'Buka Kamera HP (Lembar #1)' : 'Buka Kamera HP'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                            {captureMode === 'doc' 
                              ? 'Ketuk di sini untuk mengambil foto lembar pertama dokumen'
                              : 'Ketuk di sini untuk mengambil foto bukti fisik langsung'}
                          </div>
                        </div>
                      </>
                    )}
                  </label>

                  {/* Selected file summary */}
                  {selectedFile && (
                    <div style={{
                      backgroundColor: '#0B0D13',
                      border: '1px solid #292F42',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      <span style={{ color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {errorMsg && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid #EF4444',
                      color: '#F87171',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={!selectedFile || isUploading || isExpired}
                    onClick={handleUpload}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '10px',
                      backgroundColor: !selectedFile || isUploading || isExpired ? '#1E293B' : '#E52E2E',
                      color: !selectedFile || isUploading || isExpired ? '#64748B' : '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 800,
                      cursor: !selectedFile || isUploading || isExpired ? 'not-allowed' : 'pointer',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: selectedFile && !isUploading && !isExpired ? '0 4px 16px rgba(229, 46, 46, 0.4)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Mengunggah Foto Bukti...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        <span>Kirim Foto ke Monitor Penyidik</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#0B0D13',
          borderTop: '1px solid #292F42',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          fontFamily: 'JetBrains Mono, monospace',
          color: '#64748B'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981' }}>
            <ShieldCheck size={12} />
            Koneksi Resmi POLRI
          </span>
          <span>E-Mindik Kolaka Timur</span>
        </div>
      </div>
    </div>
  );
}
