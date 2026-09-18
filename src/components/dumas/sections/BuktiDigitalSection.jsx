import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Smartphone, 
  Trash2, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { uploadFileToR2, formatR2PublicUrl } from '../../../lib/r2Client';

export default function BuktiDigitalSection({
  daftarBukti = [],
  onAddEvidence,
  onRemoveEvidence,
  onOpenQrModal
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  // Proses upload berkas lokal dari laptop ke R2
  const processFiles = async (files) => {
    if (!files || !files.length) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
        const mime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

        let finalUrl = '';
        try {
          const r2Res = await uploadFileToR2(file, `dumas_laptop_${Date.now()}_${file.name}`, mime);
          if (r2Res?.success && r2Res?.url) {
            finalUrl = formatR2PublicUrl(r2Res.url);
          }
        } catch (err) {
          console.warn('[R2 UPLOAD] Upload ke R2 gagal, menggunakan fallback:', err);
        }

        // Fallback base64 agar bukti tetap tersimpan lokal
        if (!finalUrl) {
          try {
            finalUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });
          } catch {}
        }

        if (!finalUrl && typeof URL !== 'undefined' && URL.createObjectURL) {
          finalUrl = URL.createObjectURL(file);
        }

        if (!finalUrl) {
          console.warn('[UPLOAD] File tidak memiliki URL valid, dilewati:', file.name);
          continue;
        }

        const newItem = {
          id: `bb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          nama_berkas: file.name,
          url: finalUrl.trim(),
          fileUrl: finalUrl.trim(),
          tipe: mime,
          ukuran: file.size,
          keterangan: isPdf 
            ? 'Dokumen surat bukti perkara' 
            : 'Foto barang bukti fisik (Upload Laptop Cloudflare R2)',
          created_at: new Date().toISOString()
        };

        if (typeof onAddEvidence === 'function') {
          onAddEvidence(newItem);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  return (
    <div 
      style={{ 
        backgroundColor: '#111622', 
        border: '1px solid #1E293B', 
        borderRadius: '0.75rem', 
        padding: '1.25rem',
        color: '#F1F5F9'
      }}
    >
      {/* Header Bagian */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.75rem', 
          borderBottom: '1px solid #1E293B', 
          paddingBottom: '1rem' 
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '0.025em' }}>
              05. LAMPIRAN BARANG BUKTI DIGITAL
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.25rem 0 0 0' }}>
            Unggah dokumen PDF atau foto barang bukti fisik melalui Laptop atau Kamera HP secara nirkabel.
          </p>
        </div>

        {/* Badge Jumlah Berkas */}
        <div>
          {daftarBukti.length > 0 ? (
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34D399'
              }}
            >
              <CheckCircle2 size={13} />
              {daftarBukti.length} Berkas Terlampir
            </span>
          ) : (
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#94A3B8',
                backgroundColor: '#1B2230',
                border: '1px solid #263347'
              }}
            >
              0 Berkas Terlampir
            </span>
          )}
        </div>
      </div>

      {/* Pembungkus Grid Konsol A & B */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem', 
          marginTop: '1rem', 
          marginBottom: '1.5rem' 
        }}
      >
        {/* Konsol Input A: PC / Laptop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.08)' : '#141C2B', 
            border: isDragOver ? '1px solid #38BDF8' : '1px solid #263347', 
            borderRadius: '0.75rem', 
            padding: '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: isDragOver ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#38BDF8', display: 'inline-block' }} />
              <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Konsol Input A • Storage Lokal
              </span>
            </div>
            <span 
              style={{ 
                fontSize: '0.625rem', 
                fontFamily: 'monospace', 
                color: '#94A3B8', 
                backgroundColor: '#0B0F17', 
                border: '1px solid #263347', 
                padding: '0.125rem 0.375rem', 
                borderRadius: '0.25rem' 
              }}
            >
              PC / LAPTOP
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
            <div 
              style={{ 
                width: '2.75rem', 
                height: '2.75rem', 
                borderRadius: '0.5rem', 
                backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#38BDF8',
                flexShrink: 0
              }}
            >
              {isUploading ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={22} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9' }}>
                {isUploading ? 'Sedang Mengunggah Berkas...' : 'Pilih Berkas dari Komputer'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Klik telusuri atau seret berkas langsung ke area ini
              </div>
            </div>
            <button
              type="button"
              style={{ 
                padding: '0.375rem 0.75rem', 
                borderRadius: '0.375rem', 
                backgroundColor: 'rgba(56, 189, 248, 0.1)', 
                border: '1px solid rgba(56, 189, 248, 0.3)', 
                color: '#38bdf8', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Telusuri
            </button>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem', 
              paddingTop: '0.5rem', 
              borderTop: '1px solid #1E293B', 
              fontSize: '0.625rem', 
              fontFamily: 'monospace', 
              color: '#64748B' 
            }}
          >
            <span>Dukungan:</span>
            <span style={{ color: '#38BDF8', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '0.0625rem 0.25rem', borderRadius: '0.125rem' }}>PDF</span>
            <span style={{ color: '#F43F5E', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '0.0625rem 0.25rem', borderRadius: '0.125rem' }}>JPG</span>
            <span style={{ color: '#34D399', backgroundColor: '#0B0F17', border: '1px solid #263347', padding: '0.0625rem 0.25rem', borderRadius: '0.125rem' }}>PNG</span>
            <span style={{ marginLeft: 'auto', color: '#94A3B8' }}>Maks 25 MB</span>
          </div>
        </div>

        {/* Konsol Input B: Live QR Bridge Kamera HP */}
        <div
          onClick={onOpenQrModal}
          style={{ 
            backgroundColor: '#141C2B', 
            border: '1px solid #263347', 
            borderRadius: '0.75rem', 
            padding: '1rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
              <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700, color: '#F87171', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Konsol Input B • Live QR Bridge
              </span>
            </div>
            <span 
              style={{ 
                fontSize: '0.625rem', 
                fontFamily: 'monospace', 
                color: '#F59E0B', 
                backgroundColor: '#0B0F17', 
                border: '1px solid #263347', 
                padding: '0.125rem 0.375rem', 
                borderRadius: '0.25rem' 
              }}
            >
              KAMERA HP
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
            <div 
              style={{ 
                width: '2.75rem', 
                height: '2.75rem', 
                borderRadius: '0.5rem', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#EF4444',
                flexShrink: 0
              }}
            >
              <Smartphone size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9' }}>
                Pindai Bukti via Kamera HP
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Foto barang bukti via ponsel & sinkron otomatis
              </div>
            </div>
            <button
              type="button"
              style={{ 
                padding: '0.375rem 0.75rem', 
                borderRadius: '0.375rem', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                color: '#ef4444', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Buka QR
            </button>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              paddingTop: '0.5rem', 
              borderTop: '1px solid #1E293B', 
              fontSize: '0.625rem', 
              fontFamily: 'monospace' 
            }}
          >
            <span style={{ color: '#34D399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', backgroundColor: '#34D399', display: 'inline-block' }} />
              Live Sync R2 Aktif
            </span>
            <span style={{ color: '#64748B' }}>Nirkabel / Tanpa Kabel Data</span>
          </div>
        </div>
      </div>

      {/* Header Daftar Bukti */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>
          Daftar Lampiran Bukti ({daftarBukti.length})
        </span>
      </div>

      {/* Grid Daftar Bukti di Bawah */}
      {daftarBukti.length > 0 ? (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
            gap: '1rem', 
            marginTop: '0.75rem' 
          }}
        >
          {daftarBukti.map((item, idx) => {
            const url = item.url || item.fileUrl || '';
            const isPdf = item.tipe?.includes('pdf') || url.toLowerCase().endsWith('.pdf');
            const sizeKb = Math.round((item.ukuran || item.size || 0) / 1024);

            return (
              <div
                key={item.id || `evidence-${idx}`}
                style={{ 
                  backgroundColor: '#141C2B', 
                  border: '1px solid #263347', 
                  borderRadius: '0.75rem', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between' 
                }}
              >
                {/* Media Preview Box */}
                <div
                  onClick={() => setPreviewItem(item)}
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '11rem', 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer', 
                    overflow: 'hidden', 
                    borderBottom: '1px solid #1E293B' 
                  }}
                  title="Klik untuk memperbesar pratinjau"
                >
                  {isPdf ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#FB7185' }}>
                      <FileText size={40} />
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94A3B8' }}>DOKUMEN PDF</span>
                    </div>
                  ) : url ? (
                    <>
                      <img
                        src={url}
                        alt={item.nama_berkas || 'Barang Bukti'}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <ImageIcon size={32} />
                        <span>Gagal memuat pratinjau</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: '#64748B' }}>
                      <ImageIcon size={32} />
                      <span style={{ fontSize: '0.75rem' }}>Tidak ada URL</span>
                    </div>
                  )}
                </div>

                {/* Card Content & Metadata */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                    <span 
                      style={{
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        backgroundColor: isPdf ? 'rgba(244, 63, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                        border: isPdf ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                        color: isPdf ? '#FB7185' : '#38BDF8'
                      }}
                    >
                      {isPdf ? 'PDF' : 'FOTO_R2'}
                    </span>
                    <span style={{ color: '#64748B' }}>
                      {sizeKb > 0 ? `${sizeKb} KB` : 'N/A'}
                    </span>
                  </div>

                  <div 
                    style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={item.nama_berkas || item.nama || 'Berkas Bukti'}
                  >
                    {item.nama_berkas || item.nama || 'Berkas Bukti'}
                  </div>

                  {item.keterangan && (
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.keterangan}
                    </div>
                  )}

                  {/* Actions */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      paddingTop: '0.5rem', 
                      borderTop: '1px solid #1E293B' 
                    }}
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.6875rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 500 }}
                    >
                      <ExternalLink size={12} /> Buka Asli
                    </a>

                    <button
                      type="button"
                      onClick={() => onRemoveEvidence(item.id || url)}
                      style={{ 
                        fontSize: '0.6875rem', 
                        color: '#F87171', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontWeight: 500, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '0.25rem' 
                      }}
                      title="Hapus berkas bukti ini"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div 
          style={{ 
            border: '1px dashed #263347', 
            borderRadius: '0.75rem', 
            padding: '2rem', 
            textAlign: 'center', 
            color: '#64748B', 
            fontSize: '0.75rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '0.5rem',
            backgroundColor: 'rgba(20, 28, 43, 0.4)',
            marginTop: '0.75rem'
          }}
        >
          <UploadCloud size={28} style={{ color: '#475569' }} />
          <span>Belum ada barang bukti yang diunggah.</span>
          <span style={{ fontSize: '0.6875rem', color: '#475569' }}>
            Gunakan Konsol A untuk upload dari komputer atau Konsol B untuk memindai via kamera HP.
          </span>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewItem && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 50, 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem' 
          }}
          onClick={() => setPreviewItem(null)}
        >
          <div 
            style={{ 
              backgroundColor: '#141C2B', 
              border: '1px solid #263347', 
              borderRadius: '0.75rem', 
              maxWidth: '48rem', 
              width: '100%', 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{ 
                padding: '0.75rem', 
                borderBottom: '1px solid #1E293B', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#CBD5E1', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewItem.nama_berkas || 'Pratinjau Berkas'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', minHeight: '300px' }}>
              {previewItem.tipe?.includes('pdf') || (previewItem.url || '').toLowerCase().endsWith('.pdf') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center' }}>
                  <FileText size={48} style={{ color: '#FB7185' }} />
                  <span style={{ fontSize: '0.875rem', color: '#CBD5E1' }}>Pratinjau dokumen PDF</span>
                  <a
                    href={previewItem.url || previewItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <ExternalLink size={14} /> Buka Dokumen PDF di Tab Baru
                  </a>
                </div>
              ) : (
                <img
                  src={previewItem.url || previewItem.fileUrl}
                  alt={previewItem.nama_berkas}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '0.25rem' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
