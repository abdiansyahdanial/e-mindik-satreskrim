import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { uploadFileToR2 } from '../lib/r2Client';
import { supabase } from '../supabaseClient';

export default function MobileUploadView() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Extract token from URL search params or hash robustly
  const getUrlToken = () => {
    if (typeof window === 'undefined') return 'SESI-DEMO-KOLTIM';
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('token');
    if (fromSearch) return fromSearch;

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const fromHash = hashParams.get('token');
      if (fromHash) return fromHash;
    }
    return 'SESI-DEMO-KOLTIM';
  };

  const [token] = useState(getUrlToken);

  const handleFileCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsSuccess(false);
    setErrorMsg(null);

    if (file.type.includes('image')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Pilih atau ambil foto barang bukti terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      console.log(`[MOBILE UPLOAD] Memulai upload untuk file: ${selectedFile.name} (${selectedFile.size} bytes)`);
      const fileName = `bukti_hp_${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let finalUrl = '';
      let storageProvider = '';

      // Langkah 1: Coba unggah ke Cloudflare R2 via presigned URL
      try {
        console.log('[MOBILE UPLOAD] Mencoba unggah ke Cloudflare R2...');
        const r2Res = await uploadFileToR2(selectedFile, fileName);
        if (r2Res && r2Res.success && (r2Res.url || r2Res.publicUrl)) {
          finalUrl = r2Res.url || r2Res.publicUrl;
          storageProvider = 'Cloudflare R2';
          console.log('[MOBILE UPLOAD] Sukses terunggah ke Cloudflare R2:', finalUrl);
        } else {
          console.warn('[MOBILE UPLOAD] R2 upload response unsuccess:', r2Res?.error);
        }
      } catch (r2Err) {
        console.warn('[MOBILE UPLOAD] R2 upload gagal:', r2Err.message);
      }

      // Langkah 2: Fallback ke Supabase Storage (bucket dumas/evidence jika ada)
      if (!finalUrl) {
        try {
          console.log('[MOBILE UPLOAD] R2 tidak tersedia. Mencoba fallback ke Supabase Storage...');
          const supabasePath = `bukti_mobile/${fileName}`;
          const { data: spData, error: spErr } = await supabase.storage
            .from('dumas')
            .upload(supabasePath, selectedFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (!spErr && spData) {
            const { data: publicUrlData } = supabase.storage
              .from('dumas')
              .getPublicUrl(supabasePath);
            if (publicUrlData?.publicUrl) {
              finalUrl = publicUrlData.publicUrl;
              storageProvider = 'Supabase Storage';
              console.log('[MOBILE UPLOAD] Sukses fallback ke Supabase Storage:', finalUrl);
            }
          } else {
            console.warn('[MOBILE UPLOAD] Fallback Supabase Storage skipped:', spErr?.message);
          }
        } catch (spCatchErr) {
          console.warn('[MOBILE UPLOAD] Supabase Storage upload error:', spCatchErr.message);
        }
      }

      // Langkah 3: Zero-Broken Fallback - Kompresi gambar menjadi Data URL Base64
      // Memastikan laptop PASTI menerima dan bisa menampilkan foto bukti meskipun serverless/storage offline
      if (!finalUrl) {
        console.log('[MOBILE UPLOAD] Mempersiapkan Zero-Broken Base64 fallback...');
        finalUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              // Resize maksimal 1280px agar payload ringan saat dikirim lewat websocket
              const maxDim = 1280;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              // Kualitas JPEG 0.75 sangat jernih dan ringan (~100-200KB)
              resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
          };
          reader.onerror = () => resolve(previewUrl || '');
          reader.readAsDataURL(selectedFile);
        });
        storageProvider = 'Direct Stream (Zero-Broken Base64)';
      }

      if (!finalUrl) {
        throw new Error('Gagal memproses berkas foto untuk pengiriman.');
      }

      const evidencePayload = {
        token,
        fileName: selectedFile.name,
        name: selectedFile.name,
        nama_file: selectedFile.name,
        fileSize: selectedFile.size,
        size: selectedFile.size,
        file_size_formatted: `${(selectedFile.size / 1024).toFixed(0)} KB`,
        fileUrl: finalUrl,
        file_url: finalUrl,
        previewUrl: finalUrl,
        type: selectedFile.type || 'image/jpeg',
        mime_type: selectedFile.type || 'image/jpeg',
        kategori_bukti: selectedFile.name?.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
        keterangan: `Foto barang bukti fisik diambil via pemindaian HP (${storageProvider})`,
        timestamp: new Date().toISOString()
      };

      console.log(`[MOBILE UPLOAD] Mengirim broadcast ke channel mobile_sync_${token}...`);

      // 1. Cross-Device Real-time Sync via Supabase Broadcast Channel
      try {
        const syncChannel = supabase.channel(`mobile_sync_${token}`, {
          config: { broadcast: { ack: true } }
        });
        
        await new Promise((resolve) => {
          syncChannel.subscribe(async (status) => {
            console.log(`[MOBILE UPLOAD] Status koneksi channel HP: ${status}`);
            if (status === 'SUBSCRIBED') {
              const res = await syncChannel.send({
                type: 'broadcast',
                event: 'evidence_uploaded',
                payload: evidencePayload
              });
              console.log('[MOBILE UPLOAD] Broadcast hasil pengiriman:', res);
              resolve();
            }
          });
          // Timeout pengiriman broadcast 5 detik
          setTimeout(resolve, 5000);
        });
      } catch (err) {
        console.warn('[MOBILE UPLOAD] Supabase realtime sync notice:', err);
      }

      // 2. BroadcastChannel Sync (untuk simulasi / uji coba satu perangkat)
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('polres_mobile_bridge');
          bc.postMessage(evidencePayload);
          bc.close();
        }
      } catch (err) {
        console.warn('BroadcastChannel sync skipped:', err);
      }

      // 3. LocalStorage Sync
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`polres_mobile_evidence_${token}`, JSON.stringify(evidencePayload));
        }
      } catch (_e) {
        // ignore storage quota
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('[MOBILE UPLOAD] Gagal mengunggah foto bukti:', err);
      setErrorMsg(err.message || 'Gagal mengirim foto ke server.');
    } finally {
      setIsUploading(false);
    }
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
            backgroundColor: 'rgba(229, 46, 46, 0.15)',
            border: '1px solid rgba(229, 46, 46, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF352D'
          }}>
            <Smartphone size={22} />
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
            border: '1px solid #1E293B',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
              TOKEN SINKRONISASI AKTIF:
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#38BDF8', wordBreak: 'break-all' }}>
              {token}
            </span>
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
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setIsSuccess(false);
                }}
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
              {/* Capture Card */}
              <label 
                htmlFor="mobile-camera-input"
                style={{
                  border: '2px dashed #334155',
                  backgroundColor: '#0B0D13',
                  borderRadius: '14px',
                  padding: previewUrl ? '12px' : '32px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: 'pointer',
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
                  style={{ display: 'none' }}
                  onChange={handleFileCapture}
                />

                {previewUrl ? (
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
                      backgroundColor: 'rgba(229, 46, 46, 0.15)',
                      border: '1px solid rgba(229, 46, 46, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF352D'
                    }}>
                      <Camera size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF' }}>
                        Buka Kamera HP
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                        Ketuk di sini untuk mengambil foto bukti fisik langsung
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
                disabled={!selectedFile || isUploading}
                onClick={handleUpload}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: !selectedFile || isUploading ? '#1E293B' : '#E52E2E',
                  color: !selectedFile || isUploading ? '#64748B' : '#FFFFFF',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 800,
                  cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: selectedFile && !isUploading ? '0 4px 16px rgba(229, 46, 46, 0.4)' : 'none',
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
