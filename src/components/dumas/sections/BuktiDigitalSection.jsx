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
      className="border rounded-xl p-5 space-y-6 text-zinc-100 shadow-sm"
      style={{ backgroundColor: '#111622', borderColor: '#1E293B' }}
    >
      {/* Header Bagian */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
        style={{ borderColor: '#1E293B' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              05. LAMPIRAN BARANG BUKTI DIGITAL
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Unggah dokumen PDF atau foto barang bukti fisik melalui Laptop atau Kamera HP secara nirkabel.
          </p>
        </div>

        {/* Badge Jumlah Berkas */}
        <div>
          {daftarBukti.length > 0 ? (
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
                color: '#34D399'
              }}
            >
              <CheckCircle2 size={13} />
              {daftarBukti.length} Berkas Terlampir
            </span>
          ) : (
            <span 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono text-zinc-400 border"
              style={{
                backgroundColor: '#1B2230',
                borderColor: '#263347'
              }}
            >
              0 Berkas Terlampir
            </span>
          )}
        </div>
      </div>

      {/* Dual Upload Console (Konsol A & B) */}
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1rem' 
        }}
      >
        {/* Konsol Input A: PC / Laptop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative border rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200"
          style={{ 
            backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.08)' : '#141C2B', 
            borderColor: isDragOver ? '#38BDF8' : '#263347',
            boxShadow: isDragOver ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            style={{ display: 'none' }}
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-[10px] font-mono font-bold text-sky-400 tracking-wider uppercase">
                Konsol Input A • Storage Lokal
              </span>
            </div>
            <span 
              className="text-[10px] font-mono text-zinc-400 border px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#0B0F17', borderColor: '#263347' }}
            >
              PC / LAPTOP
            </span>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div 
              className="w-11 h-11 rounded-lg border flex items-center justify-center text-sky-400 shrink-0"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
            >
              {isUploading ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-zinc-100">
                {isUploading ? 'Sedang Mengunggah Berkas...' : 'Pilih Berkas dari Komputer'}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Klik telusuri atau seret berkas langsung ke area ini
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border text-xs font-semibold hover:bg-sky-500/30 transition-colors"
              style={{ 
                backgroundColor: 'rgba(56, 189, 248, 0.15)', 
                borderColor: 'rgba(56, 189, 248, 0.35)', 
                color: '#38BDF8' 
              }}
            >
              Telusuri
            </button>
          </div>

          <div 
            className="flex items-center gap-1.5 pt-2 border-t text-[10px] font-mono text-zinc-500"
            style={{ borderColor: '#1E293B' }}
          >
            <span>Dukungan:</span>
            <span className="text-sky-400 border px-1 rounded" style={{ backgroundColor: '#0B0F17', borderColor: '#263347' }}>PDF</span>
            <span className="text-rose-400 border px-1 rounded" style={{ backgroundColor: '#0B0F17', borderColor: '#263347' }}>JPG</span>
            <span className="text-emerald-400 border px-1 rounded" style={{ backgroundColor: '#0B0F17', borderColor: '#263347' }}>PNG</span>
            <span className="ml-auto text-zinc-400">Maks 25 MB</span>
          </div>
        </div>

        {/* Konsol Input B: Live QR Bridge Kamera HP */}
        <div
          onClick={onOpenQrModal}
          className="border rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200"
          style={{ backgroundColor: '#141C2B', borderColor: '#263347' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-mono font-bold text-red-400 tracking-wider uppercase">
                Konsol Input B • Live QR Bridge
              </span>
            </div>
            <span 
              className="text-[10px] font-mono text-amber-400 border px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#0B0F17', borderColor: '#263347' }}
            >
              KAMERA HP
            </span>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div 
              className="w-11 h-11 rounded-lg border flex items-center justify-center text-red-400 shrink-0"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <Smartphone size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-zinc-100">
                Pindai Bukti via Kamera HP
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Foto barang bukti via ponsel & sinkron otomatis
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border text-xs font-semibold hover:bg-rose-500/30 transition-colors"
              style={{ 
                backgroundColor: 'rgba(244, 63, 94, 0.15)', 
                borderColor: 'rgba(244, 63, 94, 0.35)', 
                color: '#F43F5E' 
              }}
            >
              Buka QR
            </button>
          </div>

          <div 
            className="flex items-center justify-between pt-2 border-t text-[10px] font-mono"
            style={{ borderColor: '#1E293B' }}
          >
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Live Sync R2 Aktif
            </span>
            <span className="text-zinc-500">Nirkabel / Tanpa Kabel Data</span>
          </div>
        </div>
      </div>

      {/* Grid Kartu Bukti Digital */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider">
            Daftar Lampiran Bukti ({daftarBukti.length})
          </span>
        </div>

        {daftarBukti.length > 0 ? (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
              gap: '1rem' 
            }}
          >
            {daftarBukti.map((item, idx) => {
              const url = item.url || item.fileUrl || '';
              const isPdf = item.tipe?.includes('pdf') || url.toLowerCase().endsWith('.pdf');
              const sizeKb = Math.round((item.ukuran || item.size || 0) / 1024);

              return (
                <div
                  key={item.id || `evidence-${idx}`}
                  className="border rounded-xl overflow-hidden flex flex-col justify-between transition-all"
                  style={{ backgroundColor: '#141C2B', borderColor: '#263347' }}
                >
                  {/* Media Preview Box */}
                  <div
                    onClick={() => setPreviewItem(item)}
                    className="relative w-full h-44 bg-black/70 flex items-center justify-center cursor-pointer group overflow-hidden border-b"
                    style={{ borderColor: '#1E293B' }}
                    title="Klik untuk memperbesar pratinjau"
                  >
                    {isPdf ? (
                      <div className="flex flex-col items-center gap-2 text-rose-400">
                        <FileText size={40} />
                        <span className="text-xs font-mono text-zinc-400">DOKUMEN PDF</span>
                      </div>
                    ) : url ? (
                      <>
                        <img
                          src={url}
                          alt={item.nama_berkas || 'Barang Bukti'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center text-zinc-500 text-xs gap-1">
                          <ImageIcon size={32} />
                          <span>Gagal memuat pratinjau</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-500">
                        <ImageIcon size={32} />
                        <span className="text-xs">Tidak ada URL</span>
                      </div>
                    )}

                    {/* Hover Overlay Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium">
                      <Eye size={16} /> Pratinjau
                    </div>
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor: isPdf ? 'rgba(244, 63, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                          borderColor: isPdf ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.3)',
                          color: isPdf ? '#FB7185' : '#38BDF8'
                        }}
                      >
                        {isPdf ? 'PDF' : 'FOTO_R2'}
                      </span>
                      <span className="text-zinc-500">
                        {sizeKb > 0 ? `${sizeKb} KB` : 'N/A'}
                      </span>
                    </div>

                    <div 
                      className="text-xs font-semibold text-zinc-200 truncate"
                      title={item.nama_berkas || item.nama || 'Berkas Bukti'}
                    >
                      {item.nama_berkas || item.nama || 'Berkas Bukti'}
                    </div>

                    {item.keterangan && (
                      <div className="text-[11px] text-zinc-400 line-clamp-1">
                        {item.keterangan}
                      </div>
                    )}

                    {/* Actions */}
                    <div 
                      className="flex items-center justify-between pt-2 border-t"
                      style={{ borderColor: '#1E293B' }}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                      >
                        <ExternalLink size={12} /> Buka Asli
                      </a>

                      <button
                        type="button"
                        onClick={() => onRemoveEvidence(item.id || url)}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
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
            className="border border-dashed rounded-xl p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2"
            style={{ backgroundColor: 'rgba(20, 28, 43, 0.4)', borderColor: '#263347' }}
          >
            <UploadCloud size={28} className="text-zinc-600" />
            <span>Belum ada barang bukti yang diunggah.</span>
            <span className="text-[11px] text-zinc-600">
              Gunakan Konsol A untuk upload dari komputer atau Konsol B untuk memindai via kamera HP.
            </span>
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="border rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            style={{ backgroundColor: '#141C2B', borderColor: '#263347' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="p-3 border-b flex items-center justify-between"
              style={{ borderColor: '#1E293B' }}
            >
              <span className="text-xs font-mono text-zinc-300 font-bold truncate">
                {previewItem.nama_berkas || 'Pratinjau Berkas'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
              {previewItem.tipe?.includes('pdf') || (previewItem.url || '').toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <FileText size={48} className="text-rose-400" />
                  <span className="text-sm text-zinc-300">Pratinjau dokumen PDF</span>
                  <a
                    href={previewItem.url || previewItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition-all flex items-center gap-2"
                  >
                    <ExternalLink size={14} /> Buka Dokumen PDF di Tab Baru
                  </a>
                </div>
              ) : (
                <img
                  src={previewItem.url || previewItem.fileUrl}
                  alt={previewItem.nama_berkas}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
