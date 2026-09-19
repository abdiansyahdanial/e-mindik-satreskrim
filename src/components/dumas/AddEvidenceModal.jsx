import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Smartphone, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import EvidenceQrSyncModal from './EvidenceQrSyncModal.jsx';
import { addEvidenceToDumas } from '../../services/dumasService.js';
import { compressImageClient, convertImagesToSinglePdf } from '../../utils/evidenceDocHelper.js';

export default function AddEvidenceModal({
  isOpen = true,
  dumasId,
  dumasNo,
  onClose,
  onSuccess,
  onSaveSuccess
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [keterangan, setKeterangan] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [autoSaveMsg, setAutoSaveMsg] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setErrorMsg(null);
      let finalFile = null;

      if (files.length === 1) {
        const file = files[0];
        const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          finalFile = file;
        } else if (file.type.startsWith('image/')) {
          // Kompresi otomatis gambar tunggal
          finalFile = await compressImageClient(file, 1800, 0.75);
        } else {
          finalFile = file;
        }
      } else {
        // Jika petugas memilih atau memotret beberapa halaman sekaligus
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const compressedList = [];
          for (const img of imageFiles) {
            const cImg = await compressImageClient(img, 1800, 0.75);
            compressedList.push(cImg);
          }
          const generatedName = `Dokumen_Bukti_${Date.now()}.pdf`;
          finalFile = await convertImagesToSinglePdf(compressedList, generatedName);
        } else {
          finalFile = files[0];
        }
      }

      if (!finalFile) return;

      const isPdf = finalFile.type.includes('pdf') || finalFile.name.toLowerCase().endsWith('.pdf');
      const category = isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG';
      const mime = isPdf ? 'application/pdf' : (finalFile.type || 'image/jpeg');

      setSelectedFile({
        name: finalFile.name,
        nama_file: finalFile.name,
        size: finalFile.size,
        file_size_formatted: `${(finalFile.size / 1024).toFixed(0)} KB`,
        type: mime,
        mime_type: mime,
        kategori_bukti: category,
        previewUrl: URL.createObjectURL(finalFile),
        file: finalFile,
        rawFile: finalFile,
      });
    } catch (err) {
      console.error('Gagal memproses berkas bukti:', err);
      setErrorMsg('Gagal memproses gambar/dokumen. Silakan coba lagi.');
    }
  };

  const handleQrEvidenceReceived = async (evidenceItem) => {
    try {
      // 1. Jika ada dumasId dan fungsi addEvidenceToDumas tersedia, langsung simpan secara otomatis ke database
      if (dumasId && typeof addEvidenceToDumas === 'function') {
        const payload = {
          ...evidenceItem,
          keterangan: evidenceItem.keterangan || (evidenceItem.kategori_bukti === 'DOKUMEN_PDF' ? 'Dokumen berkas perkara (via HP)' : 'Foto bukti fisik (via HP)')
        };
        const res = await addEvidenceToDumas(dumasId, payload, dumasNo);
        const saveCallback = onSaveSuccess || onSuccess;
        if (res?.success && res?.evidence && saveCallback) {
          saveCallback(res.evidence);
        }
      } else {
        // Fallback jika mode form baru (belum ada ID dumas), teruskan ke parent callback
        const saveCallback = onSaveSuccess || onSuccess;
        if (saveCallback) {
          saveCallback(evidenceItem);
        }
      }

      // Kosongkan input formulir sementara agar bersih dan siap menerima foto berikutnya
      setSelectedFile(null);
      setKeterangan('');
      setErrorMsg(null);
      setAutoSaveMsg('Bukti baru berhasil disimpan otomatis! Siap menerima foto/dokumen berikutnya dari HP.');
      setTimeout(() => setAutoSaveMsg(null), 6000);

      // PENTING: JANGAN jalankan setIsQrModalOpen(false). 
      // Biarkan modal QR tetap standby/terbuka agar channel realtime tetap standby menerima foto ke-2, ke-3, dst.
    } catch (err) {
      console.error('Gagal memproses bukti realtime dari HP:', err);
      setErrorMsg('Gagal memproses bukti dari HP: ' + (err.message || 'Error'));
    }
  };

  const handleSaveEvidence = async () => {
    if (!selectedFile) {
      setErrorMsg('Pilih berkas dari komputer atau pindai melalui HP terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...selectedFile,
        keterangan: keterangan.trim() || selectedFile.keterangan || 'Lampiran bukti digital perkara pengaduan'
      };

      const result = await addEvidenceToDumas(dumasId, payload, dumasNo);
      if (result.success && result.evidence) {
        if (onSuccess) {
          onSuccess(result.evidence);
        }
        onClose();
      } else {
        throw new Error(result.error || 'Gagal menyimpan barang bukti ke database.');
      }
    } catch (err) {
      console.error('Error add evidence:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah bukti.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
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
          zIndex: 9998,
          padding: '16px'
        }}
      >
        <div 
          className="w-full max-w-lg rounded-2xl bg-[#121721] border border-[#292F42] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#1b2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
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
            <div>
              <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: '#ff352d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ADMINISTRASI BUKTI PERKARA
              </span>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                + Tambah Barang Bukti Digital
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px'
              }}
              title="Tutup (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-4" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 2 Pilihan Berdampingan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* Opsi 1: Dari Komputer */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1px dashed rgba(255, 255, 255, 0.16)',
                  borderRadius: '10px',
                  backgroundColor: '#222b34',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  color: '#E2E8F0'
                }}
              >
                <div 
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8'
                  }}
                >
                  <UploadCloud size={20} />
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textAlign: 'center' }}>
                  Upload dari Laptop
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
                  PDF, JPG, PNG lokal
                </span>
              </button>

              {/* Opsi 2: Dari HP QR Code */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                style={{
                  border: '1px dashed rgba(255, 53, 45, 0.45)',
                  borderRadius: '10px',
                  backgroundColor: '#222b34',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-out',
                  color: '#E2E8F0'
                }}
              >
                <div 
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 53, 45, 0.15)',
                    border: '1px solid rgba(255, 53, 45, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ff352d'
                  }}
                >
                  <Smartphone size={20} />
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textAlign: 'center' }}>
                  Pindai via QR HP
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
                  Rotasi 30s &amp; Timeout 60s
                </span>
              </button>
            </div>

            {/* Hidden Native File Input */}
            <input 
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Preview Berkas Terpilih */}
            {selectedFile ? (
              <div 
                style={{
                  backgroundColor: '#0B0D13',
                  border: '1px solid #292F42',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div 
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(229, 46, 46, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FF352D',
                        flexShrink: 0
                      }}
                    >
                      {selectedFile.kategori_bukti === 'DOKUMEN_PDF' ? <FileText size={18} /> : <ImageIcon size={18} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedFile.name || selectedFile.nama_file}
                      </p>
                      <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                        {selectedFile.kategori_bukti} • {selectedFile.file_size_formatted}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    Ganti
                  </button>
                </div>

                {/* Keterangan Input */}
                <div>
                  <label htmlFor="bukti_keterangan_input" style={{ display: 'block', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Keterangan Singkat Bukti (Opsional)
                  </label>
                  <input
                    id="bukti_keterangan_input"
                    type="text"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Contoh: Kuitansi pembayaran tunai bermeterai / Foto kendaraan terlapor"
                    style={{
                      width: '100%',
                      backgroundColor: '#151822',
                      border: '1px solid #292F42',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#0B0D13', borderRadius: '8px', border: '1px dashed #292F42', color: '#64748B', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                Belum ada berkas bukti yang dipilih. Silakan pilih salah satu opsi di atas.
              </div>
            )}

            {/* Auto-save notification badge */}
            {autoSaveMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#34D399', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                <CheckCircle2 size={16} />
                <span>{autoSaveMsg}</span>
              </div>
            )}

            {/* Error banner */}
            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

          </div>

          {/* Footer */}
          <div 
            className="p-3.5 px-5 bg-[#0B0D13] border-t border-[#292F42] flex items-center justify-end gap-2"
            style={{
              padding: '12px 20px',
              backgroundColor: '#0B0D13',
              borderTop: '1px solid #292F42',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#CBD5E1',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSaveEvidence}
              disabled={!selectedFile || isUploading}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: !selectedFile || isUploading ? '#334155' : '#E52E2E',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: !selectedFile || isUploading ? 'none' : '0 0 12px rgba(229, 46, 46, 0.4)'
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Mengunggah &amp; Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Simpan ke Berkas Perkara</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal QR Code Sync */}
      <EvidenceQrSyncModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onEvidenceReceived={handleQrEvidenceReceived}
        dumasNo={dumasNo}
      />
    </>
  );
}
