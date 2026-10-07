import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Smartphone, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { uploadFileToR2, formatR2PublicUrl } from '../../../lib/r2Client';
import { HudCorners } from '../../command/hud';

export default function BuktiDigitalSection({
  daftarBukti = [],
  evidenceList,
  onAddEvidence,
  onRemoveEvidence,
  onOpenQrModal
}) {
  const currentList = Array.isArray(daftarBukti) && daftarBukti.length > 0
    ? daftarBukti
    : (Array.isArray(evidenceList) ? evidenceList : []);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  // Proses upload berkas lokal dari laptop ke R2 dengan deduplikasi ketat
  const processFiles = async (files) => {
    if (!files || !files.length) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = (file.name || '').trim();

        // 1. Pre-Check Deduplikasi: Cegah nama berkas identik diunggah ulang
        const alreadyExistsByName = currentList.some((b) => {
          const existingName = (b.nama_berkas || b.name || b.nama_file || '').trim();
          return fileName && existingName.toLowerCase() === fileName.toLowerCase();
        });

        if (alreadyExistsByName) {
          console.warn('[DEDUP BUKTI] Berkas dengan nama sama sudah ada di daftar bukti, dilewati:', fileName);
          continue;
        }

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

        // 2. Post-Check Deduplikasi Ketat: Cek URL atau Nama Berkas sebelum memicu state update
        const isAlreadyInList = currentList.some((b) => {
          const existingUrl = (b.url || b.fileUrl || b.file_url || '').trim();
          const existingName = (b.nama_berkas || b.name || b.nama_file || '').trim();
          return (finalUrl && existingUrl === finalUrl.trim()) ||
                 (fileName && existingName.toLowerCase() === fileName.toLowerCase());
        });

        if (isAlreadyInList) {
          console.warn('[DEDUP BUKTI] Berkas duplikat (URL atau nama sama) terdeteksi, dilewati:', fileName, finalUrl);
          continue;
        }

        const newItem = {
          id: `evid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          nama_berkas: file.name,
          nama: file.name,
          tipe: mime,
          type: mime,
          ukuran: file.size,
          size: file.size,
          url: finalUrl,
          fileUrl: finalUrl,
          kategori: isPdf ? 'Dokumen Surat' : 'Foto Bukti',
          keterangan: 'Diunggah via Laptop / PC Petugas',
          created_at: new Date().toISOString()
        };

        if (typeof onAddEvidence === 'function') {
          onAddEvidence(newItem);
        }
      }
    } catch (err) {
      console.error('[UPLOAD ERROR]', err);
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
    <div className="relative group/card bg-[#05070a]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.37)] text-zinc-100">
      <HudCorners size="md" />

      {/* Header Bagian */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <h3 className="text-sm sm:text-base font-bold text-white m-0 tracking-wide font-mono">
              05. LAMPIRAN BARANG BUKTI DIGITAL
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1 mb-0">
            Unggah dokumen PDF atau foto barang bukti fisik melalui Laptop atau Kamera HP secara nirkabel.
          </p>
        </div>

        {/* Badge Jumlah Berkas */}
        <div>
          {currentList.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={13} />
              {currentList.length} Berkas Terlampir
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono text-zinc-400 bg-white/5 border border-white/10">
              0 Berkas Terlampir
            </span>
          )}
        </div>
      </div>

      {/* Pembungkus Grid Konsol A & B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Konsol Input A: PC / Laptop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group/card bg-black/40 backdrop-blur-sm border rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all ${
            isDragOver 
              ? 'border-sky-400 bg-sky-950/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]' 
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <HudCorners size="sm" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              <span className="text-[10px] font-mono font-bold text-sky-400 tracking-wider uppercase">
                Konsol Input A • Storage Lokal
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-black/60 border border-white/10 px-2 py-0.5 rounded">
              PC / LAPTOP
            </span>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="w-11 h-11 rounded-lg bg-sky-950/30 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-white">
                {isUploading ? 'Sedang Mengunggah Berkas...' : 'Pilih Berkas dari Komputer'}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Klik telusuri atau seret berkas langsung ke area ini
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-400 text-xs font-mono font-semibold cursor-pointer hover:bg-sky-900/60 transition-all"
            >
              Telusuri
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-400">
            <span>Dukungan:</span>
            <span className="text-sky-400 bg-black/60 border border-white/10 px-1 py-0.5 rounded">PDF</span>
            <span className="text-rose-400 bg-black/60 border border-white/10 px-1 py-0.5 rounded">JPG</span>
            <span className="text-emerald-400 bg-black/60 border border-white/10 px-1 py-0.5 rounded">PNG</span>
            <span className="ml-auto text-zinc-400">Maks 25 MB</span>
          </div>
        </div>

        {/* Konsol Input B: Live QR Bridge Kamera HP */}
        <div
          onClick={onOpenQrModal}
          className="relative group/card bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all"
        >
          <HudCorners size="sm" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-[10px] font-mono font-bold text-red-400 tracking-wider uppercase">
                Konsol Input B • Live QR Bridge
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-black/60 border border-white/10 px-2 py-0.5 rounded">
              KAMERA HP
            </span>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="w-11 h-11 rounded-lg bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-white">
                Pindai Bukti via Kamera HP
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Foto barang bukti via ponsel &amp; sinkron otomatis
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-mono font-semibold cursor-pointer hover:bg-red-900/60 transition-all"
            >
              Buka QR
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Live Sync R2 Aktif
            </span>
            <span className="text-zinc-400">Nirkabel / Tanpa Kabel Data</span>
          </div>
        </div>
      </div>

      {/* Header Daftar Bukti */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider">
          Daftar Lampiran Bukti ({currentList.length})
        </span>
      </div>

      {/* Grid Kartu Berkas Terunggah */}
      {currentList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {currentList.map((item, idx) => {
            const url = item.url || item.fileUrl || '';
            const isPdf = item.tipe?.includes('pdf') || url.toLowerCase().endsWith('.pdf');
            const sizeKb = Math.round((item.ukuran || item.size || 0) / 1024);

            return (
              <div
                key={item.id || `evidence-${idx}`}
                className="relative group/card bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <HudCorners size="sm" />

                {/* Media Preview Box */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative w-full h-44 bg-black/70 flex items-center justify-center cursor-pointer overflow-hidden border-b border-white/5"
                  title="Klik untuk memperbesar pratinjau"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center gap-2 text-rose-400">
                      <FileText size={36} />
                      <span className="text-xs font-mono text-zinc-400">DOKUMEN PDF</span>
                    </div>
                  ) : url ? (
                    <>
                      <img
                        src={url}
                        alt={item.nama_berkas || 'Barang Bukti'}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="hidden flex-col items-center justify-center text-zinc-500 text-xs gap-1">
                        <ImageIcon size={30} />
                        <span>Gagal memuat pratinjau</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-500">
                      <ImageIcon size={30} />
                      <span className="text-xs">Tidak ada URL</span>
                    </div>
                  )}
                </div>

                {/* Card Content & Metadata */}
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span 
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isPdf 
                          ? 'bg-rose-950/40 border-rose-500/30 text-rose-400' 
                          : 'bg-sky-950/40 border-sky-500/30 text-sky-400'
                      }`}
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
                    <div className="text-[11px] text-zinc-400 truncate">
                      {item.keterangan}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 no-underline font-medium"
                    >
                      <ExternalLink size={12} /> Buka Asli
                    </a>

                    <button
                      type="button"
                      onClick={() => onRemoveEvidence(item)}
                      className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-transparent border-none cursor-pointer p-1 rounded"
                      title="Hapus berkas bukti ini"
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2 bg-black/20 mt-3">
          <UploadCloud size={28} className="text-zinc-500" />
          <span>Belum ada barang bukti yang diunggah.</span>
          <span className="text-[11px] text-zinc-500">
            Gunakan Konsol A untuk upload dari komputer atau Konsol B untuk memindai via kamera HP.
          </span>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="relative group/card bg-[#05070a]/90 backdrop-blur-2xl border border-white/10 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <HudCorners size="md" />
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-200 font-bold truncate">
                {previewItem.nama_berkas || 'Pratinjau Berkas'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="bg-transparent border-none text-zinc-400 hover:text-white cursor-pointer p-1 flex items-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
              {previewItem.tipe?.includes('pdf') || (previewItem.url || '').toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <FileText size={48} className="text-rose-400" />
                  <span className="text-xs text-zinc-300">Pratinjau dokumen PDF</span>
                  <a
                    href={previewItem.url || previewItem.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold no-underline flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30"
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
