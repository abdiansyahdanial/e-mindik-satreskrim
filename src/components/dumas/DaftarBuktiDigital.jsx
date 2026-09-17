import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Eye
} from 'lucide-react';
import { formatR2PublicUrl } from '../../lib/r2Client';

/**
 * Komponen Pratinjau Daftar Bukti Digital
 * Merender daftar berkas bukti secara reaktif dengan URL publik Cloudflare R2
 * Menangani fallback onError dan logging console URL untuk memudahkan inspeksi
 */
class DaftarBuktiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DAFTAR BUKTI ERROR]:', error, errorInfo);
  }

  handleClearCorruptedCache = () => {
    try {
      localStorage.removeItem('emindik_draft_daftar_bb_v1');
      localStorage.removeItem('emindik_temp_draft_bb');
      localStorage.removeItem('temp_dumas_bb');
    } catch (e) {
      console.warn('Gagal bersihkan cache bukti:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px 20px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '10px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          color: '#FCA5A5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            [PERINGATAN] Terdeteksi Data Bukti Korup / Non-Serializable di Cache Lokal
          </span>
          <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, maxWidth: '520px' }}>
            Beberapa berkas dalam draf tersimpan tidak valid atau tidak memiliki URL aktif. Anda dapat membersihkan cache barang bukti ini untuk melanjutkan input dumas secara lancar.
          </p>
          <button
            type="button"
            onClick={this.handleClearCorruptedCache}
            style={{
              padding: '6px 14px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700
            }}
          >
            Bersihkan Cache Bukti & Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Komponen Pratinjau Daftar Bukti Digital
 * Merender daftar berkas bukti secara reaktif dengan URL publik Cloudflare R2
 * Menangani fallback onError dan logging console URL untuk memudahkan inspeksi
 */
function DaftarBuktiDigitalContent({
  daftarBukti = [],
  evidenceFiles,
  onRemove,
  onPreview,
  className = ''
}) {
  const items = evidenceFiles || daftarBukti || [];

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px'
      }}>
        {Array.isArray(items) && items.map((bukti, idx) => {
          if (!bukti || typeof bukti !== 'object' || (!bukti.url && !bukti.fileUrl && !bukti.previewUrl && !bukti.file_url)) {
            return null;
          }

          const rawUrl = bukti?.url || bukti?.fileUrl || bukti?.previewUrl || bukti?.file_url || '';
          const publicUrl = formatR2PublicUrl(rawUrl);
          const fileName = bukti?.nama_berkas || bukti?.nama || bukti?.name || bukti?.nama_file || 'Barang Bukti';
          const isPdf = bukti?.kategori_bukti === 'DOKUMEN_PDF' || (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf'));
          const fileSizeFormatted = bukti?.file_size_formatted || 
            (typeof bukti?.ukuran === 'number' ? `${(bukti.ukuran / 1024).toFixed(0)} KB` : (typeof bukti?.size === 'number' ? `${(bukti.size / 1024).toFixed(0)} KB` : '180 KB'));
          const uniqueKey = bukti?.id || `bb-${idx}`;

          if (!isPdf && publicUrl) {
            console.log("Rendering Bukti URL:", bukti?.url || publicUrl);
          }

          return (
            <div
              key={uniqueKey}
              style={{
                backgroundColor: '#0B0D13',
                border: bukti?.isNew ? '1.5px solid #10B981' : '1px solid #292F42',
                boxShadow: bukti?.isNew ? '0 0 16px rgba(16, 185, 129, 0.25)' : '0 2px 8px rgba(0,0,0,0.2)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'all 0.25s ease',
                position: 'relative'
              }}
              className={bukti?.isNew ? 'ring-1 ring-emerald-500/40' : 'hover:border-sky-500/50'}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {/* Thumbnail Pratinjau Gambar / Dokumen */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onPreview && onPreview({ ...bukti, url: publicUrl })}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && onPreview) {
                      onPreview({ ...bukti, url: publicUrl });
                    }
                  }}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    backgroundColor: isPdf ? 'rgba(56, 189, 248, 0.15)' : '#1E293B',
                    border: bukti?.isNew ? '1px solid #10B981' : '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="Klik untuk melihat preview resolusi penuh dari R2"
                >
                  {!isPdf && publicUrl ? (
                    <img
                      src={publicUrl}
                      alt={fileName || 'Barang Bukti'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      className="w-full max-h-64 object-contain bg-zinc-950 rounded border border-zinc-800"
                      onLoad={() => {
                        console.log("Rendering Bukti URL:", bukti?.url || publicUrl);
                      }}
                      onError={(e) => {
                        console.error('Gagal memuat gambar bukti dari R2:', publicUrl);
                        e.target.style.display = 'none';
                        if (e.target.parentElement) {
                          const fallback = document.createElement('div');
                          fallback.style.display = 'flex';
                          fallback.style.alignItems = 'center';
                          fallback.style.justifyContent = 'center';
                          fallback.style.width = '100%';
                          fallback.style.height = '100%';
                          fallback.innerHTML = '<span style="font-size:10px;color:#EF4444;font-family:monospace;">R2 Err</span>';
                          e.target.parentElement.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    isPdf ? <FileText size={24} color="#38BDF8" /> : <ImageIcon size={24} color="#F87171" />
                  )}
                </div>

                {/* Metadata Berkas */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={fileName}
                  >
                    {fileName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '9px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: isPdf ? '#38BDF8' : '#F87171',
                      backgroundColor: isPdf ? 'rgba(56, 189, 248, 0.1)' : 'rgba(229, 46, 46, 0.15)',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      {isPdf ? 'PDF' : 'JPG/PNG'}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}>
                      {fileSizeFormatted}
                    </span>
                    {bukti?.isNew && (
                      <span style={{
                        fontSize: '8.5px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 800,
                        color: '#064E3B',
                        backgroundColor: '#34D399',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        letterSpacing: '0.04em'
                      }}>
                        BARU DARI HP
                      </span>
                    )}
                  </div>
                  {bukti?.keterangan && (
                    <p style={{ fontSize: '10px', color: '#64748B', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bukti.keterangan}
                    </p>
                  )}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #1E293B' }}>
                <button
                  type="button"
                  onClick={() => onPreview && onPreview({ ...bukti, url: publicUrl })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  className="hover:bg-sky-500/10"
                >
                  <Eye size={12} />
                  <span>Perbesar</span>
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(bukti?.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    className="hover:bg-red-500/20"
                    title="Hapus Item Bukti"
                  >
                    <Trash2 size={12} />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DaftarBuktiDigital(props) {
  return (
    <DaftarBuktiErrorBoundary>
      <DaftarBuktiDigitalContent {...props} />
    </DaftarBuktiErrorBoundary>
  );
}
