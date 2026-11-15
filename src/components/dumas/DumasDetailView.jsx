import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Printer,
  ChevronRight,
  Database,
  Image as ImageIcon,
  FileSignature,
  ShieldCheck,
  AlertCircle,
  Eye,
  Download,
  Plus,
  Trash2,
  Lock,
  Send
} from 'lucide-react';
import AddEvidenceModal from './AddEvidenceModal.jsx';
import EvidenceLightboxModal from './EvidenceLightboxModal.jsx';
import ModalSelectPamapta from './ModalSelectPamapta.jsx';
import ModalHandoverSpkt from './ModalHandoverSpkt.jsx';
import { deleteEvidenceFromDumas, submitHandoverSpktToReskrim } from '../../services/dumasService.js';
import { formatR2PublicUrl } from '../../lib/r2Client.js';
import { supabase } from '../../supabaseClient';
import { printSuratPengaduan, printTandaTerimaDumas } from '../../utils/dumasPrintGenerator.js';

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));

const formatTanggalSerahTerima = (isoString) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WITA';
  } catch {
    return isoString;
  }
};

export default function DumasDetailView({
  dumasItem,
  onBack,
  onOpenGeneratorForDumas,
  onUpdateDumas,
  onEditDumas
}) {
  const [copied, setCopied] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isPamaptaModalOpen, setIsPamaptaModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [perkara, setPerkara] = useState(dumasItem);
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState(null);

  const prevIdRef = useRef(dumasItem?.id);
  if (dumasItem?.id !== prevIdRef.current) {
    prevIdRef.current = dumasItem?.id;
    setPerkara(dumasItem);
  }

  const fetchedLpRef = useRef(null);

  // Hydration Query: Muat ulang bukti digital dari tabel resmi lampiran_barang_bukti berdasarkan laporan_id
  useEffect(() => {
    const idPerkara = perkara?.id || dumasItem?.id;

    // Lewati jika belum ada UUID laporan atau sudah pernah di-fetch
    if (!idPerkara || !isUUID(idPerkara)) return;
    if (fetchedLpRef.current === idPerkara) return;

    const fetchBuktiForDetail = async () => {
      try {
        const { data: bbData, error: bbErr } = await supabase
          .from('lampiran_barang_bukti')
          .select('*')
          .eq('laporan_id', idPerkara)
          .order('diunggah_pada', { ascending: true });

        if (!bbErr && Array.isArray(bbData)) {
          fetchedLpRef.current = idPerkara; // Tandai sudah diambil agar tidak loop

          const formatted = bbData.map((row) => ({
            id: row.id,
            laporan_id: row.laporan_id,
            nama_file: row.nama_file || row.nama_berkas || 'Berkas Bukti',
            file_path: row.file_path || null,
            file_url: row.file_url || row.url,
            url: row.file_url || row.url,
            kategori_bukti: row.kategori_bukti || (row.mime_type?.includes('pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'),
            mime_type: row.mime_type,
            file_size_bytes: row.file_size_bytes,
            keterangan: row.keterangan,
            hash_sha256: row.hash_sha256,
            diunggah_pada: row.diunggah_pada
          }));

          setPerkara((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              lampiran_barang_bukti: formatted,
            };
          });
        }
      } catch (err) {
        console.warn('Gagal memuat barang bukti untuk detail:', err);
      }
    };

    fetchBuktiForDetail();
  }, [perkara?.nomor_lp, dumasItem?.nomor_lp, perkara?.id, dumasItem?.id]);

  if (!perkara) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 py-12 text-center text-[#FBDBAF]/65 font-mono"
        style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(251, 219, 175, 0.65)', fontFamily: 'JetBrains Mono, monospace' }}
      >
        <AlertCircle size={36} color="#FF5A1F" style={{ margin: '0 auto 12px auto' }} />
        <p className="text-sm">Data Laporan Dumas tidak ditemukan.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-[#161310] hover:bg-[#221C17] border border-[#FBDBAF]/15 text-xs text-[#FAF6F0] font-mono transition-colors cursor-pointer"
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#161310',
            border: '1px solid rgba(251, 219, 175, 0.16)',
            fontSize: '12px',
            color: '#FAF6F0',
            cursor: 'pointer'
          }}
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const handleCopyNo = () => {
    if (perkara?.nomor_lp) {
      navigator.clipboard.writeText(perkara.nomor_lp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openEvidencePreview = (bb) => {
    setPreviewEvidence(bb);
  };

  const handleEvidenceAdded = (newEvidence) => {
    const currentList = Array.isArray(perkara?.lampiran_barang_bukti) ? perkara.lampiran_barang_bukti : [];
    const updated = {
      ...perkara,
      lampiran_barang_bukti: [...currentList, newEvidence]
    };
    setPerkara(updated);
    if (onUpdateDumas) {
      onUpdateDumas(updated);
    }
  };

  const handleDeleteEvidence = async (bb) => {
    if (perkara?.is_locked_spkt) {
      alert('Berkas telah diserahkan dan berstatus terkunci. Barang bukti tidak dapat dihapus demi integritas chain of custody.');
      return;
    }

    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus barang bukti "${bb.nama_file || 'Berkas'}" secara permanen?\n\nTindakan ini akan menghapus record dari database dan file dari Cloudflare R2.`
    );
    if (!confirmDelete) return;

    const currentList = Array.isArray(perkara?.lampiran_barang_bukti) ? perkara.lampiran_barang_bukti : [];
    const updatedList = currentList.filter(item => item.id !== bb.id);
    const updated = {
      ...perkara,
      lampiran_barang_bukti: updatedList
    };
    setPerkara(updated);
    if (onUpdateDumas) {
      onUpdateDumas(updated);
    }

    try {
      await deleteEvidenceFromDumas(
        perkara.id,
        bb.id,
        bb.file_path || null,
        bb.file_url || bb.url || null
      );
    } catch (err) {
      console.warn('Gagal menghapus barang bukti dari backend:', err);
    }
  };

  const handleDownloadEvidence = (bb) => {
    const fileName = bb?.nama_file || 'Barang_Bukti_Dumas.bin';
    if (bb?.file_url && bb.file_url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = bb.file_url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const content = `BERKAS RESMI SATRESKRIM POLRES KOLAKA TIMUR\nFile: ${fileName}\nNomor LP: ${perkara?.nomor_lp || '-'}\nHash: ${bb?.hash_sha256 || 'SHA-256 Valid'}\nDiunggah: ${bb?.diunggah_pada || new Date().toISOString()}`;
    const blob = new Blob([content], { type: bb?.mime_type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 bg-[#0E0C0A] text-[#FAF6F0] font-sans dumas-detail-wrapper"
      style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '24px 16px',
        backgroundColor: '#0E0C0A',
        color: '#FAF6F0',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >

      {/* ========================================================= */}
      {/* 1. COMMAND BAR ATAS */}
      {/* ========================================================= */}
      <header
        className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#FBDBAF]/15 dumas-command-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(251, 219, 175, 0.15)'
        }}
      >
        {/* Tombol Kembali Kiri */}
        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="bg-[#161310] hover:bg-[#221C17] border border-[#FBDBAF]/15 px-3.5 py-2 rounded-lg text-xs font-mono text-[#FAF6F0] flex items-center gap-2 transition-colors cursor-pointer dumas-btn-back"
            style={{
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#FAF6F0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} color="#FF5A1F" />
            <span>&lt;- Daftar Dumas</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#FBDBAF]/65" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(251, 219, 175, 0.65)' }}>
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5A1F' }}></span>
            <span className="uppercase tracking-wider">E-Mindik Satreskrim Koltim</span>
          </div>
        </div>

        {/* Box Nomor Register Tengah */}
        <div
          className="bg-[#181411] border border-[#FBDBAF]/15 px-3 py-1 rounded-md text-xs font-mono font-bold text-white flex items-center gap-2 shadow-inner dumas-reg-box"
          style={{
            backgroundColor: '#181411',
            border: '1px solid rgba(251, 219, 175, 0.16)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          <span className="text-[#FF7A33]" style={{ color: '#FF7A33', fontSize: '10px' }}>NO. DUMAS:</span>
          <code className="text-white font-bold" style={{ color: '#FFFFFF' }}>
            {perkara?.nomor_lp || 'DUMAS/B/01/SPKT/Polres Kolaka Timur/Polda Sultra'}
          </code>
          <button
            type="button"
            onClick={handleCopyNo}
            className="p-1 text-[#FBDBAF]/65 hover:text-white cursor-pointer"
            style={{ background: 'none', border: 'none', color: 'rgba(251, 219, 175, 0.65)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Salin Nomor Dumas"
          >
            {copied ? <Check size={14} color="#FF7A33" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Tombol Aksi Kanan: Edit Pengaduan & Lanjut Buat Sprin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onEditDumas && (
            <button
              type="button"
              onClick={() => {
                if (!perkara?.is_locked_spkt) {
                  onEditDumas(perkara);
                }
              }}
              disabled={Boolean(perkara?.is_locked_spkt)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                backgroundColor: perkara?.is_locked_spkt ? '#181411' : '#161310',
                border: `1px solid ${perkara?.is_locked_spkt ? 'rgba(251, 219, 175, 0.12)' : 'rgba(251, 219, 175, 0.22)'}`,
                color: perkara?.is_locked_spkt ? 'rgba(251, 219, 175, 0.45)' : '#FAF6F0',
                cursor: perkara?.is_locked_spkt ? 'not-allowed' : 'pointer',
                opacity: perkara?.is_locked_spkt ? 0.6 : 1
              }}
              title={perkara?.is_locked_spkt ? "Berkas telah diserahkan ke Satreskrim dan terkunci demi integritas chain of custody." : "Edit Data Dumas"}
            >
              {perkara?.is_locked_spkt ? <Lock size={13} /> : <FileText size={13} />}
              <span>{perkara?.is_locked_spkt ? 'Data Terkunci' : 'Edit Pengaduan'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenGeneratorForDumas && onOpenGeneratorForDumas(perkara)}
            className="bg-[#E07020] hover:bg-[#FF5A1F] text-white font-mono font-bold px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer dumas-btn-sprin-accent"
            style={{
              backgroundColor: '#E07020',
              color: '#FFFFFF',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 8px 24px -5px rgba(224, 112, 32, 0.5)',
              cursor: 'pointer'
            }}
          >
            <FileSignature size={15} />
            <span>Lanjut Buat Sprin</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. BANNER STATUS BERKAS (QUICK STATUS BAR) */}
      {/* ========================================================= */}
      <section
        className="bg-[#161310] border border-[#FBDBAF]/15 rounded-xl p-4 flex flex-col gap-3 shadow-md dumas-quick-status-bar"
        style={{
          backgroundColor: '#161310',
          border: '1px solid rgba(251, 219, 175, 0.16)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div className="flex items-center gap-3.5" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="w-10 h-10 rounded-lg border flex items-center justify-center font-mono font-bold text-base"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: perkara?.is_locked_spkt ? 'rgba(224, 112, 32, 0.18)' : 'rgba(255, 90, 31, 0.16)',
                border: perkara?.is_locked_spkt ? '1px solid rgba(224, 112, 32, 0.45)' : '1px solid rgba(255, 90, 31, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF7A33',
                fontWeight: 700,
                fontSize: '16px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {perkara?.is_locked_spkt ? <Lock size={18} /> : '01'}
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-wider text-[#FBDBAF]/60 uppercase" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: 'rgba(251, 219, 175, 0.6)', textTransform: 'uppercase' }}>
                Status Administrasi Berkas
              </div>
              <div className="flex items-center gap-2.5 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                {perkara?.is_locked_spkt ? (
                  <span
                    className="bg-[#E07020]/15 text-[#FAF6F0] border border-[#E07020]/40 px-2.5 py-1 rounded text-xs font-mono font-bold inline-flex items-center gap-1.5"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      backgroundColor: 'rgba(224, 112, 32, 0.18)',
                      color: '#FAF6F0',
                      border: '1px solid rgba(224, 112, 32, 0.45)'
                    }}
                  >
                    <Lock size={12} color="#FF7A33" />
                    <span>🔒 BERKAS TELAH DISERAHKAN KE SATRESKRIM</span>
                  </span>
                ) : (
                  <span
                    className="bg-[#E07020]/15 text-[#FF7A33] border border-[#E07020]/40 px-2.5 py-1 rounded text-xs font-mono font-bold inline-flex items-center gap-1.5 dumas-badge-status-tahap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      backgroundColor: 'rgba(224, 112, 32, 0.15)',
                      color: '#FF7A33',
                      border: '1px solid rgba(224, 112, 32, 0.4)'
                    }}
                  >
                    ● {perkara?.status_berkas || 'TAHAP PENYELIDIKAN (SP.LIDIK)'}
                  </span>
                )}

                <span className="text-xs text-[#FBDBAF]/65 font-sans hidden sm:inline" style={{ fontSize: '12px', color: 'rgba(251, 219, 175, 0.65)' }}>
                  {perkara?.is_locked_spkt ? 'Data Terkunci (Chain-of-Custody Terjaga)' : 'Tinjauan Resume & Digital Evidence'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap' }}>
            {!perkara?.is_locked_spkt && (
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(true)}
                className="bg-[#E07020] hover:bg-[#FF5A1F] text-white font-mono font-bold px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#E07020',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(224, 112, 32, 0.4)'
                }}
                title="Serahkan berkas fisik dan digital dari SPKT ke Satreskrim"
              >
                <Send size={13} />
                <span>Serahkan Berkas ke Satreskrim</span>
              </button>
            )}

            <div
              className="bg-[#181411] px-3 py-1.5 rounded-md border border-[#FBDBAF]/15"
              style={{
                backgroundColor: '#181411',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(251, 219, 175, 0.16)'
              }}
            >
              <span className="text-[#FBDBAF]/55" style={{ color: 'rgba(251, 219, 175, 0.55)' }}>PENYIDIK PENERIMA:</span>
              <span className="text-white font-semibold ml-2" style={{ color: '#FFFFFF', fontWeight: 600, marginLeft: '6px' }}>
                {perkara?.penyidik_nama || 'Bripka Andi Pratama, S.H.'}
              </span>
              <span className="text-[#FF7A33] text-[11px] ml-1.5" style={{ color: '#FF7A33', fontSize: '11px', marginLeft: '6px' }}>
                [{perkara?.penyidik_nrp || 'NRP: 89040112'}]
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSchemaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181411] hover:bg-[#221C17] text-[#FAF6F0] border border-[#FBDBAF]/15 transition-colors cursor-pointer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#181411',
                color: '#FAF6F0',
                border: '1px solid rgba(251, 219, 175, 0.16)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              <Database size={13} color="#FF5A1F" />
              <span>Skema DB</span>
            </button>
          </div>
        </div>

        {/* Informasi Ringkas Serah Terima Jika Berkas Telah Diserahkan */}
        {perkara?.is_locked_spkt && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#181411',
              border: '1px solid rgba(224, 112, 32, 0.35)',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)' }}>TANGGAL SERAH TERIMA: </span>
              <span style={{ color: '#FF7A33', fontWeight: 700 }}>
                {formatTanggalSerahTerima(perkara?.tanggal_serah_terima)}
              </span>
            </div>

            <span style={{ color: 'rgba(251, 219, 175, 0.25)' }}>|</span>

            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)' }}>PENYERAH (SPKT): </span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                {perkara?.penyerah_nama || '-'}
              </span>
              {perkara?.penyerah_pangkat_nrp && (
                <span style={{ color: 'rgba(251, 219, 175, 0.65)', marginLeft: '4px' }}>({perkara.penyerah_pangkat_nrp})</span>
              )}
            </div>

            <span style={{ color: 'rgba(251, 219, 175, 0.25)' }}>|</span>

            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)' }}>PENERIMA (SATRESKRIM): </span>
              <span style={{ color: '#FBDBAF', fontWeight: 600 }}>
                {perkara?.penerima_nama || perkara?.penyidik_nama || '-'}
              </span>
              {perkara?.penerima_pangkat_nrp && (
                <span style={{ color: 'rgba(251, 219, 175, 0.65)', marginLeft: '4px' }}>({perkara.penerima_pangkat_nrp})</span>
              )}
            </div>

            {perkara?.catatan_ekspedisi && (
              <>
                <span style={{ color: 'rgba(251, 219, 175, 0.25)' }}>|</span>
                <div style={{ flex: '1 1 100%', marginTop: '2px', color: 'rgba(251, 219, 175, 0.65)' }}>
                  <span style={{ color: 'rgba(251, 219, 175, 0.55)' }}>CATATAN EKSPEDISI: </span>
                  <span style={{ color: '#FAF6F0' }}>{perkara.catatan_ekspedisi}</span>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. BAGIAN A: DATA RESUME PERKARA & PIHAK TERKAIT */}
      {/* ========================================================= */}
      <section className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex items-center justify-between border-b border-[#FBDBAF]/15 pb-2.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(251, 219, 175, 0.15)', paddingBottom: '10px' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-[11px] font-mono font-bold bg-[#181411] text-[#FF7A33] px-2 py-0.5 rounded border border-[#E07020]/35" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, backgroundColor: '#181411', color: '#FF7A33', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(224, 112, 32, 0.35)' }}>
              BAGIAN A
            </span>
            <h2 className="heading-font text-xs uppercase tracking-wider font-bold text-white m-0" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Data Resume Perkara &amp; Pihak Terkait (Card Grid)
            </h2>
          </div>
          <span className="text-xs font-mono text-[#FBDBAF]/55" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(251, 219, 175, 0.55)' }}>
            No. Registrasi: <span className="text-[#FF7A33] font-bold" style={{ color: '#FF7A33', fontWeight: 700 }}>{perkara?.nomor_lp || '-'}</span>
          </span>
        </div>

        {/* Card Grid Container */}
        <div className="space-y-4 font-mono" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'JetBrains Mono, monospace' }}>

          {/* Card 01: Identitas Pelapor / Korban */}
          <article
            className="border-l-4 border-l-[#FBDBAF] rounded-xl bg-[#161310] border border-[#FBDBAF]/15 overflow-hidden mb-4 shadow-sm dumas-dossier-card card-pelapor"
            style={{
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              borderLeft: '4px solid #FBDBAF',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            <div
              className="bg-[#181411] border-b border-[#FBDBAF]/12 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#181411',
                borderBottom: '1px solid rgba(251, 219, 175, 0.12)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#FBDBAF]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FBDBAF' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FAF6F0]" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FAF6F0' }}>
                  Identitas Pelapor / Korban
                </span>
              </div>
              <span className="text-[10px] bg-[#E07020]/15 text-[#FBDBAF] border border-[#E07020]/35 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(224, 112, 32, 0.15)', color: '#FBDBAF', border: '1px solid rgba(224, 112, 32, 0.35)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                PELAPOR RESMI
              </span>
            </div>

            {/* Grid 4 Kolom Pelapor + Full Row Alamat */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 dumas-grid-4cols"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '16px'
              }}
            >
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Nama Lengkap</span>
                <span className="font-bold text-white text-sm">{perkara?.pelapor_nama || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">NIK KTP</span>
                <span className="text-[#FAF6F0] text-xs">{perkara?.pelapor_nik || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Kontak / WA</span>
                <span className="text-[#FF7A33] font-semibold text-xs">{perkara?.pelapor_kontak || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">TTL / Pekerjaan</span>
                <span className="text-[#FAF6F0] text-xs">
                  {perkara?.pelapor_ttl || '-'} <span className="text-[#FBDBAF]/35">|</span> {perkara?.pelapor_pekerjaan || '-'}
                </span>
              </div>

              {/* Baris Penuh Alamat Domisili */}
              <div className="col-span-full dumas-dossier-field-full" style={{ gridColumn: '1 / -1' }}>
                <div className="bg-[#0E0C0A] p-3 rounded-lg border border-[#FBDBAF]/12 flex flex-wrap items-center justify-between gap-2" style={{ backgroundColor: '#0E0C0A', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(251, 219, 175, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="text-[10px] text-[#FBDBAF]/55 block uppercase tracking-wider">Alamat Domisili KTP</span>
                    <span className="text-[#FAF6F0] font-sans text-xs">{perkara?.pelapor_alamat || '-'}</span>
                  </div>
                  <div className="text-xs text-[#FBDBAF]/55">
                    <span>Kelayakan Status: </span>
                    <span className="text-white font-semibold">Pelapor Sah &amp; Beritikad Baik</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 02: Data Pihak Terlapor */}
          <article
            className="border-l-4 border-l-[#FF5A1F] rounded-xl bg-[#161310] border border-[#FBDBAF]/15 overflow-hidden mb-4 shadow-sm dumas-dossier-card card-terlapor"
            style={{
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              borderLeft: '4px solid #FF5A1F',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            <div
              className="bg-[#181411] border-b border-[#FBDBAF]/12 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#181411',
                borderBottom: '1px solid rgba(251, 219, 175, 0.12)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5A1F' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A33]" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF7A33' }}>
                  Data Pihak Terlapor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#E07020]/15 text-[#FF7A33] border border-[#E07020]/40 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(224, 112, 32, 0.16)', color: '#FF7A33', border: '1px solid rgba(224, 112, 32, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {perkara?.terlapor_status || 'TERLAPOR UTAMA'}
                </span>
                <span className="text-xs text-[#FBDBAF] hidden sm:inline" style={{ fontSize: '11px', color: '#FBDBAF' }}>
                  Draft Klarifikasi / Panggilan #1
                </span>
              </div>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 dumas-grid-4cols"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '16px'
              }}
            >
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Nama Terlapor</span>
                <span className="font-bold text-white text-sm">{perkara?.terlapor_nama || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Status Subjek</span>
                <span className="text-[#FF7A33] font-semibold text-xs">{perkara?.terlapor_status || 'Saksi Terlapor'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Kontak / No HP</span>
                <span className="text-[#FAF6F0] text-xs">{perkara?.terlapor_kontak || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Domisili / Wilayah</span>
                <span className="text-[#FAF6F0] text-xs font-sans">{perkara?.terlapor_domisili || '-'}</span>
              </div>

              {/* Baris Penuh Catatan Residivis */}
              <div className="col-span-full dumas-dossier-field-full" style={{ gridColumn: '1 / -1' }}>
                <div className="bg-[#0E0C0A] p-3 rounded-lg border border-[#FBDBAF]/12 flex flex-wrap items-center justify-between gap-2" style={{ backgroundColor: '#0E0C0A', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(251, 219, 175, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="text-[10px] text-[#FBDBAF]/55 block uppercase tracking-wider">Catatan Residivis / Atensi Kepolisian</span>
                    <span className="text-[#FAF6F0] text-xs">Belum ada catatan kriminal sebelumnya (Nihil SKCK Hitam / Bukan DPO)</span>
                  </div>
                  <div className="text-xs text-[#FBDBAF]/55">
                    <span>Status Tindakan: </span>
                    <span className="text-[#FF7A33] font-semibold">Pemeriksaan Klarifikasi Terjadwal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terlapor Tambahan (Jika Lebih Dari 1) */}
            {Array.isArray(perkara?.terlapor_list) && perkara.terlapor_list.length > 1 && (
              <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(251, 219, 175, 0.65)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  Terlapor Tambahan ({perkara.terlapor_list.length - 1} Pihak):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {perkara.terlapor_list.slice(1).map((t, i) => (
                    <div key={t.id || i} style={{ backgroundColor: '#0E0C0A', border: '1px solid rgba(251, 219, 175, 0.14)', borderRadius: '6px', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#FF7A33', fontWeight: 700, fontSize: '11px' }}>{t.nama || '-'}</span>
                        <span style={{ fontSize: '9px', color: 'rgba(251, 219, 175, 0.6)' }}>{t.role_label || `Terlapor ${i + 2}`}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(251, 219, 175, 0.55)' }}>
                        {t.pekerjaan ? `${t.pekerjaan} | ` : ''}{t.alamat || t.kontak || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Card Saksi: Data Saksi-Saksi (Daftar Saksi Terkait) */}
          <article
            className="border-l-4 border-l-[#E07020] rounded-xl bg-[#161310] border border-[#FBDBAF]/15 overflow-hidden mb-4 shadow-sm dumas-dossier-card card-saksi"
            style={{
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              borderLeft: '4px solid #E07020',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            <div
              className="bg-[#181411] border-b border-[#FBDBAF]/12 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#181411',
                borderBottom: '1px solid rgba(251, 219, 175, 0.12)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#E07020]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E07020' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A33]" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF7A33' }}>
                  Data Saksi-Saksi Perkara
                </span>
              </div>
              <span className="text-[10px] bg-[#E07020]/15 text-[#FBDBAF] border border-[#E07020]/35 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(224, 112, 32, 0.15)', color: '#FBDBAF', border: '1px solid rgba(224, 112, 32, 0.35)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {Array.isArray(perkara?.saksi_list) && perkara.saksi_list.length > 0 
                  ? `${perkara.saksi_list.length} SAKSI TERDAFTAR` 
                  : 'BELUM ADA SAKSI'}
              </span>
            </div>

            {Array.isArray(perkara?.saksi_list) && perkara.saksi_list.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                {perkara.saksi_list.map((saksi, idx) => (
                  <div 
                    key={saksi.id || idx}
                    style={{
                      backgroundColor: '#0E0C0A',
                      border: '1px solid rgba(251, 219, 175, 0.14)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(251, 219, 175, 0.1)', paddingBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF7A33' }}></span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                          SAKSI {idx + 1}: {saksi.nama || 'Tanpa Nama'}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(224, 112, 32, 0.15)', color: '#FBDBAF', border: '1px solid rgba(224, 112, 32, 0.35)', fontWeight: 600 }}>
                        {saksi.role_label || (idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div className="bg-[#161310] p-2 rounded border border-[#FBDBAF]/12">
                        <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider block">NIK KTP</span>
                        <span className="text-[#FAF6F0] text-xs font-semibold">{saksi.nik || '-'}</span>
                      </div>
                      <div className="bg-[#161310] p-2 rounded border border-[#FBDBAF]/12">
                        <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider block">Kontak / HP</span>
                        <span className="text-[#FF7A33] text-xs font-semibold">{saksi.kontak || '-'}</span>
                      </div>
                      <div className="bg-[#161310] p-2 rounded border border-[#FBDBAF]/12">
                        <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider block">TTL / Pekerjaan</span>
                        <span className="text-[#FAF6F0] text-xs">
                          {saksi.ttl || '-'} <span className="text-[#FBDBAF]/35">|</span> {saksi.pekerjaan || '-'}
                        </span>
                      </div>
                      <div className="bg-[#161310] p-2 rounded border border-[#FBDBAF]/12">
                        <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider block">Agama</span>
                        <span className="text-[#FAF6F0] text-xs">{saksi.agama || 'Islam'}</span>
                      </div>
                    </div>

                    {saksi.alamat && (
                      <div style={{ backgroundColor: '#161310', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(251, 219, 175, 0.12)' }}>
                        <span className="text-[10px] text-[#FBDBAF]/55 block uppercase tracking-wider">Alamat Domisili</span>
                        <span className="text-[#FAF6F0] font-sans text-xs">{saksi.alamat}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(251, 219, 175, 0.5)', fontSize: '12px' }}>
                Nihil saksi yang tercatat pada laporan pengaduan ini.
              </div>
            )}
          </article>

          {/* Card 03: Delik & Dugaan Pidana */}
          <article
            className="border-l-4 border-l-[#E07020] rounded-xl bg-[#161310] border border-[#FBDBAF]/15 overflow-hidden mb-4 shadow-sm dumas-dossier-card card-delik"
            style={{
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              borderLeft: '4px solid #E07020',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            <div
              className="bg-[#181411] border-b border-[#FBDBAF]/12 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#181411',
                borderBottom: '1px solid rgba(251, 219, 175, 0.12)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5A1F' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A33]" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF7A33' }}>
                  Delik &amp; Dugaan Pidana
                </span>
              </div>
              <span className="text-[10px] bg-[#E07020]/15 text-[#FBDBAF] border border-[#E07020]/35 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(224, 112, 32, 0.15)', color: '#FBDBAF', border: '1px solid rgba(224, 112, 32, 0.35)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                SATRESKRIM POLRES KOLAKA TIMUR
              </span>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 dumas-grid-4cols"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '16px'
              }}
            >
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Tindak Pidana</span>
                <span className="font-bold text-white text-xs font-sans">{perkara?.tindak_pidana || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Pasal yang Disangkakan</span>
                <span className="text-[#FF7A33] font-bold text-xs">{perkara?.pasal_disangkakan || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Tempus Delicti (Waktu)</span>
                <span className="text-[#FAF6F0] text-xs">{perkara?.tempus_delicti || '-'}</span>
              </div>
              <div className="bg-[#0E0C0A] border border-[#FBDBAF]/12 rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-[#FBDBAF]/55 uppercase tracking-wider">Locus Delicti (Tempat)</span>
                <span className="text-[#FAF6F0] text-xs font-sans">{perkara?.locus_delicti || '-'}</span>
              </div>
            </div>
          </article>

          {/* Card 04: Ringkasan Kronologi Kasus */}
          <article
            className="rounded-xl bg-[#161310] border border-[#FBDBAF]/15 p-4 shadow-sm space-y-2.5"
            style={{
              backgroundColor: '#161310',
              borderRadius: '12px',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5A1F' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-white" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF' }}>
                  Ringkasan Kronologi Kasus
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#FBDBAF]/60 bg-[#0E0C0A] border border-[#FBDBAF]/12 px-2 py-0.5 rounded" style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(251, 219, 175, 0.6)', backgroundColor: '#0E0C0A', border: '1px solid rgba(251, 219, 175, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                Sumber: Form Aduan SPKT Satreskrim
              </span>
            </div>

            {/* Kotak Terminal Narasi */}
            <div
              className="bg-[#0E0C0A] p-4 rounded-lg border border-[#FBDBAF]/12 text-xs font-mono text-[#FAF6F0] leading-relaxed dumas-terminal-narrative"
              style={{
                backgroundColor: '#0E0C0A',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(251, 219, 175, 0.12)',
                color: '#FAF6F0',
                fontSize: '12px',
                lineHeight: 1.625,
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              "{perkara?.uraian_kejadian || 'Tidak ada uraian kronologis.'}"
            </div>
          </article>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. BAGIAN D: DAFTAR BUKTI DIGITAL (GRID KARTU PDF & JPG) */}
      {/* ========================================================= */}
      <section className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex items-center justify-between border-b border-[#FBDBAF]/15 pb-2.5 flex-wrap gap-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(251, 219, 175, 0.15)', paddingBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-[11px] font-mono font-bold bg-[#181411] text-[#FF7A33] px-2 py-0.5 rounded border border-[#E07020]/35" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, backgroundColor: '#181411', color: '#FF7A33', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(224, 112, 32, 0.35)' }}>
              BAGIAN D
            </span>
            <h2 className="heading-font text-xs uppercase tracking-wider font-bold text-white m-0" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Daftar Bukti Digital
            </h2>
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-[#181411] text-[#FBDBAF] border border-[#FBDBAF]/15" style={{ marginLeft: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#181411', color: '#FBDBAF', border: '1px solid rgba(251, 219, 175, 0.16)' }}>
              {(perkara?.lampiran_barang_bukti || []).length} Bukti Terdaftar
            </span>
          </div>

          {/* Tombol Aksi Tambah Barang Bukti */}
          {!perkara?.is_locked_spkt ? (
            <button
              type="button"
              onClick={() => setIsAddEvidenceOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(224, 112, 32, 0.16)',
                border: '1px solid #FF5A1F',
                color: '#FF7A33',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 0 12px rgba(224, 112, 32, 0.28)'
              }}
            >
              <Plus size={13} />
              <span>+ Tambah Barang Bukti</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E07020]/15 border border-[#E07020]/40 text-[#FF7A33] text-xs font-mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(224, 112, 32, 0.15)',
                border: '1px solid rgba(224, 112, 32, 0.4)',
                color: '#FF7A33',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600
              }}
            >
              <Lock size={13} />
              <span>Bukti Terkunci (Chain-of-Custody)</span>
            </div>
          )}
        </div>

        {/* Grid Kartu Responsif 3 Kolom */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 dumas-evidence-responsive-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}
        >
          {(perkara?.lampiran_barang_bukti && perkara.lampiran_barang_bukti.length > 0) ? (
            perkara.lampiran_barang_bukti.map((bb, idx) => {
              const isPdf = bb?.kategori_bukti === 'DOKUMEN_PDF' || bb?.nama_file?.toLowerCase().endsWith('.pdf');
              const rawSrc = bb?.url || bb?.fileUrl || bb?.file_url || bb?.previewUrl || null;
              const previewSrc = formatR2PublicUrl(rawSrc);

              return (
                <div
                  key={bb?.id || idx}
                  className="bg-[#161310] border border-[#FBDBAF]/15 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#E07020]/45 transition-all duration-150 dumas-evidence-card-box"
                  style={{
                    backgroundColor: '#161310',
                    border: '1px solid rgba(251, 219, 175, 0.16)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    {/* Header Item Bukti */}
                    <div className="flex items-start justify-between gap-2" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          onClick={() => openEvidencePreview(bb)}
                          className="w-10 h-10 rounded-lg bg-[#E07020]/15 border border-[#E07020]/40 flex items-center justify-center text-[#FF7A33] shrink-0 cursor-pointer"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: isPdf ? 'rgba(251, 219, 175, 0.12)' : 'rgba(224, 112, 32, 0.18)',
                            border: isPdf ? '1px solid rgba(251, 219, 175, 0.35)' : '1px solid rgba(255, 90, 31, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isPdf ? '#FBDBAF' : '#FF7A33',
                            flexShrink: 0,
                            cursor: 'pointer'
                          }}
                          title="Klik untuk pratinjau penuh"
                        >
                          {isPdf ? <FileText size={20} /> : <ImageIcon size={20} />}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#FF7A33] font-bold block" style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: isPdf ? '#FBDBAF' : '#FF7A33', fontWeight: 700, display: 'block' }}>
                            {bb?.kategori_bukti || (isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG')}
                          </span>
                          <h3 className="text-xs font-bold text-white mt-0.5 truncate max-w-[170px]" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', margin: '2px 0 0 0', maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bb?.nama_file}>
                            {bb?.nama_file || 'Berkas_Bukti'}
                          </h3>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0E0C0A] text-[#FBDBAF]/70 border border-[#FBDBAF]/15" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#0E0C0A', color: 'rgba(251, 219, 175, 0.7)', border: '1px solid rgba(251, 219, 175, 0.16)' }}>
                        {bb?.file_size_formatted || '150 KB'}
                      </span>
                    </div>

                    {/* Preview Thumbnail Kotak untuk Objek Fisik (JPG) */}
                    {!isPdf && (
                      <div
                        onClick={() => openEvidencePreview(bb)}
                        className="mt-3 w-full h-24 rounded-lg bg-[#0E0C0A] border border-[#FBDBAF]/15 flex items-center justify-center text-[#FBDBAF]/50 text-xs font-mono overflow-hidden cursor-pointer hover:border-[#E07020]/50 transition-colors"
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          height: '96px',
                          borderRadius: '8px',
                          backgroundColor: '#0E0C0A',
                          border: '1px solid rgba(251, 219, 175, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(251, 219, 175, 0.5)',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        title="Klik untuk perbesar foto"
                      >
                        {previewSrc ? (
                          <img 
                            src={previewSrc} 
                            alt={bb?.nama_file || 'Barang Bukti'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            className="w-full max-h-64 object-contain bg-[#0E0C0A] rounded border border-[#FBDBAF]/15"
                            onLoad={() => {
                              console.log("Rendering Bukti URL:", bb?.url || previewSrc);
                            }}
                            onError={(e) => {
                              console.error("Gagal memuat gambar bukti dari R2 di Detail:", previewSrc);
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px' }}>
                            <ImageIcon size={20} color="#FF7A33" />
                            <span style={{ fontSize: '10px', color: 'rgba(251, 219, 175, 0.65)', textAlign: 'center' }}>
                              [ Pratinjau Foto: {bb?.nama_file || 'Foto'} ]
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata Box */}
                    <div
                      className="mt-3.5 p-2.5 rounded-lg bg-[#0E0C0A] border border-[#FBDBAF]/12 flex flex-col gap-1.5 text-[11px] font-mono text-[#FBDBAF]/65"
                      style={{
                        marginTop: '14px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#0E0C0A',
                        border: '1px solid rgba(251, 219, 175, 0.14)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'rgba(251, 219, 175, 0.65)'
                      }}
                    >
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Keterangan:</span>
                        <span className="text-[#FAF6F0] truncate max-w-[140px]">{bb?.keterangan || 'Lampiran Bukti Resmi'}</span>
                      </div>
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diunggah:</span>
                        <span className="text-[#FAF6F0]">
                          {bb?.diunggah_pada ? new Date(bb.diunggah_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '14 Sep 2026'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Integritas:</span>
                        <span className="text-[#FF7A33] flex items-center gap-1 text-[10px]" style={{ color: '#FF7A33', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                          <ShieldCheck size={12} />
                          {bb?.hash_sha256 ? `${bb.hash_sha256.substring(0, 10)}...` : 'SHA-256 Valid'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi: Lihat/Perbesar, Unduh, & Hapus Bukti */}
                  <div className="mt-3.5 pt-3 border-t border-[#FBDBAF]/12 flex items-center gap-2" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(251, 219, 175, 0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => openEvidencePreview(bb)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#181411] hover:bg-[#221C17] border border-[#FBDBAF]/15 text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#181411',
                        border: '1px solid rgba(251, 219, 175, 0.16)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={13} />
                      <span>{isPdf ? 'Lihat PDF' : 'Perbesar Foto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadEvidence(bb)}
                      className="p-2 rounded-lg bg-[#161310] hover:bg-[#221C17] border border-[#FBDBAF]/15 text-[#FAF6F0] hover:text-white cursor-pointer transition-colors"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#161310',
                        border: '1px solid rgba(251, 219, 175, 0.16)',
                        color: '#FAF6F0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Unduh Berkas Bukti"
                    >
                      <Download size={13} />
                    </button>

                    {!perkara?.is_locked_spkt && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(bb)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(224, 112, 32, 0.14)',
                          border: '1px solid rgba(255, 90, 31, 0.4)',
                          color: '#FF7A33',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 600
                        }}
                        title="Hapus Barang Bukti ini secara permanen"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className="col-span-full py-8 text-center bg-[#161310] rounded-xl border border-[#FBDBAF]/15 text-[#FBDBAF]/55 text-xs font-mono"
              style={{
                gridColumn: '1 / -1',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: '#161310',
                borderRadius: '12px',
                border: '1px solid rgba(251, 219, 175, 0.16)',
                color: 'rgba(251, 219, 175, 0.55)',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              Belum ada berkas barang bukti digital yang dilampirkan pada laporan ini.
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. BAGIAN C: AKSI KEDINASAN (CETAK BERKAS) */}
      {/* ========================================================= */}
      <section
        className="bg-[#161310] border border-[#FBDBAF]/15 border-l-4 border-l-[#FF5A1F] rounded-xl p-5 flex flex-col gap-4 shadow-lg dumas-action-banner"
        style={{
          backgroundColor: '#161310',
          border: '1px solid rgba(251, 219, 175, 0.16)',
          borderLeft: '4px solid #FF5A1F',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FBDBAF]/12 pb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(251, 219, 175, 0.12)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="w-9 h-9 rounded-lg bg-[#E07020]/15 border border-[#E07020]/40 flex items-center justify-center text-[#FF7A33]"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(224, 112, 32, 0.18)',
                border: '1px solid rgba(255, 90, 31, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF7A33'
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="heading-font text-xs font-bold uppercase text-white" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#FFFFFF' }}>
                  AKSI KEDINASAN : CETAK BERKAS DUMAS RESMI
                </span>
                <span className="text-[10px] bg-[#E07020]/15 text-[#FBDBAF] border border-[#E07020]/40 px-2 py-0.5 rounded font-bold font-mono" style={{ fontSize: '10px', backgroundColor: 'rgba(224, 112, 32, 0.16)', color: '#FBDBAF', border: '1px solid rgba(224, 112, 32, 0.4)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  TEREGISTER RESMI
                </span>
              </div>
              <p className="text-[#FBDBAF]/65 text-xs mt-0.5 font-sans m-0" style={{ color: 'rgba(251, 219, 175, 0.65)', fontSize: '12px', margin: '3px 0 0 0' }}>
                Dokumentasi Administrasi Penyelidikan &amp; Surat Tanda Penerimaan Laporan Pengaduan Masyarakat
              </p>
            </div>
          </div>

          <div className="text-right font-mono" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
            <span className="text-[10px] text-[#FBDBAF]/55 block uppercase" style={{ fontSize: '10px', color: 'rgba(251, 219, 175, 0.55)', display: 'block', textTransform: 'uppercase' }}>Nomor Register Resmi</span>
            <code className="text-xs text-[#FF7A33] font-bold" style={{ fontSize: '12px', color: '#FF7A33', fontWeight: 700 }}>{perkara?.nomor_lp}</code>
          </div>
        </div>

        <div
          className="bg-[#0E0C0A] p-4 rounded-lg border border-[#FBDBAF]/12 flex flex-wrap items-center justify-between gap-3.5"
          style={{
            backgroundColor: '#0E0C0A',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(251, 219, 175, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div className="flex items-center gap-2 text-xs text-[#FAF6F0] font-sans" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#FAF6F0' }}>
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5A1F' }}></span>
            <span>Siap dicetak standar dinas Satreskrim Presisi dilengkapi QR-Code Verifikasi &amp; SHA-256</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Tombol [CETAK DUMAS] */}
            <button
              type="button"
              onClick={() => printSuratPengaduan(perkara || dumasItem)}
              className="bg-[#E07020] hover:bg-[#FF5A1F] text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-2 cursor-pointer transition-colors shadow-md dumas-btn-cetak-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: '#E07020',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(224, 112, 32, 0.4)'
              }}
            >
              <Printer size={15} />
              <span>CETAK DUMAS</span>
            </button>

            {/* Tombol [CETAK TANDA TERIMA LAPORAN (STTL)] */}
            <button
              type="button"
              onClick={() => setIsPamaptaModalOpen(true)}
              className="bg-[#181411] hover:bg-[#221C17] border border-[#E07020]/55 text-[#FF7A33] hover:text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-2 cursor-pointer transition-colors dumas-btn-cetak-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: '#181411',
                border: '1px solid rgba(224, 112, 32, 0.55)',
                color: '#FF7A33',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileText size={15} />
              <span>CETAK TANDA TERIMA LAPORAN (STTL)</span>
            </button>

            {/* Tombol Lanjut Buat Sprin */}
            <button
              type="button"
              onClick={() => onOpenGeneratorForDumas && onOpenGeneratorForDumas(perkara)}
              className="bg-[#E07020]/20 hover:bg-[#E07020]/30 text-[#FF7A33] border border-[#FF5A1F]/45 px-4 py-2.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(224, 112, 32, 0.18)',
                border: '1px solid rgba(255, 90, 31, 0.45)',
                color: '#FF7A33',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileSignature size={15} />
              <span>LANJUT BUAT SPRIN</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MODAL TAMBAH & LIGHTBOX PRATINJAU BUKTI DIGITAL */}
      {/* ========================================================= */}
      <AddEvidenceModal
        isOpen={isAddEvidenceOpen}
        dumasId={perkara?.id || dumasItem?.id}
        dumasNo={perkara?.nomor_lp || dumasItem?.nomor_lp}
        onClose={() => setIsAddEvidenceOpen(false)}
        onSuccess={handleEvidenceAdded}
      />

      <EvidenceLightboxModal
        isOpen={Boolean(previewEvidence)}
        evidence={previewEvidence}
        onClose={() => setPreviewEvidence(null)}
        onDownload={handleDownloadEvidence}
      />

      {/* ========================================================= */}
      {/* MODAL SKEMA DATABASE SUPABASE (CENTERED OVERLAY) */}
      {/* ========================================================= */}
      {isSchemaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 dumas-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSchemaModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-4xl bg-[#161310] border border-[#FBDBAF]/15 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden dumas-modal-container"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '880px',
              backgroundColor: '#161310',
              border: '1px solid rgba(251, 219, 175, 0.16)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              className="p-3.5 px-5 bg-[#0E0C0A] border-b border-[#FBDBAF]/15 flex items-center justify-between"
              style={{
                padding: '14px 20px',
                backgroundColor: '#0E0C0A',
                borderBottom: '1px solid rgba(251, 219, 175, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="#FF5A1F" />
                <h3 className="heading-font text-xs font-bold text-white m-0" style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  SKEMA DATABASE SUPABASE (POSTGRESQL SCHEMA DUMAS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(false)}
                className="text-[#FBDBAF]/65 hover:text-white cursor-pointer bg-transparent border-0"
                style={{ background: 'none', border: 'none', color: 'rgba(251, 219, 175, 0.65)', fontSize: '14px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              className="p-5 overflow-y-auto font-mono text-xs text-[#FAF6F0] flex flex-col gap-4"
              style={{ padding: '20px', overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#FAF6F0', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <span className="text-[#FF7A33] font-bold" style={{ color: '#FF7A33', fontWeight: 700 }}>-- 1. TABEL UTAMA: LAPORAN PENGADUAN (DUMAS)</span>
                <pre
                  className="mt-1.5 p-3.5 bg-[#0E0C0A] rounded-lg border border-[#FBDBAF]/15 overflow-x-auto text-[#FAF6F0] leading-relaxed"
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    backgroundColor: '#0E0C0A',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 219, 175, 0.15)',
                    overflowX: 'auto',
                    color: '#FAF6F0',
                    lineHeight: 1.5
                  }}
                >
                  {`CREATE TABLE IF NOT EXISTS public.laporan_pengaduan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_lp VARCHAR(120) UNIQUE NOT NULL,
    tanggal_lapor TIMESTAMPTZ DEFAULT NOW(),
    penyidik_id VARCHAR(100),
    penyidik_nama VARCHAR(150),
    
    pelapor_nama VARCHAR(150) NOT NULL,
    pelapor_nik VARCHAR(20) NOT NULL,
    pelapor_ttl VARCHAR(120),
    pelapor_pekerjaan VARCHAR(100),
    pelapor_agama VARCHAR(50),
    pelapor_kontak VARCHAR(40),
    pelapor_alamat TEXT,
    
    saksi_list JSONB DEFAULT '[]'::jsonb,
    terlapor_list JSONB DEFAULT '[]'::jsonb,
    
    terlapor_nama VARCHAR(150) NOT NULL,
    terlapor_nik VARCHAR(20),
    terlapor_ttl VARCHAR(120),
    terlapor_pekerjaan VARCHAR(100),
    terlapor_agama VARCHAR(50),
    terlapor_status VARCHAR(60) DEFAULT 'Terlapor Utama',
    terlapor_domisili TEXT,
    terlapor_kontak VARCHAR(40),
    
    tindak_pidana VARCHAR(255) NOT NULL,
    pasal_disangkakan VARCHAR(200),
    tempus_delicti TEXT,
    locus_delicti TEXT,
    uraian_kejadian TEXT,
    status_berkas VARCHAR(60) DEFAULT 'Tahap Penyelidikan (Sp.Lidik)'
);`}
                </pre>
              </div>

              <div>
                <span className="text-[#FF7A33] font-bold" style={{ color: '#FF7A33', fontWeight: 700 }}>-- 2. TABEL RELASI: LAMPIRAN BARANG BUKTI DIGITAL</span>
                <pre
                  className="mt-1.5 p-3.5 bg-[#0E0C0A] rounded-lg border border-[#FBDBAF]/15 overflow-x-auto text-[#FAF6F0] leading-relaxed"
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    backgroundColor: '#0E0C0A',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 219, 175, 0.15)',
                    overflowX: 'auto',
                    color: '#FAF6F0',
                    lineHeight: 1.5
                  }}
                >
                  {`CREATE TABLE IF NOT EXISTS public.lampiran_barang_bukti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laporan_id UUID REFERENCES public.laporan_pengaduan(id) ON DELETE CASCADE,
    kategori_bukti VARCHAR(60), -- 'DOKUMEN_PDF' | 'OBJEK_FISIK_JPG'
    nama_file VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(60),
    hash_sha256 VARCHAR(64),
    diunggah_pada TIMESTAMPTZ DEFAULT NOW()
);`}
                </pre>
              </div>
            </div>

            <div
              className="p-3.5 px-5 bg-[#0E0C0A] border-t border-[#FBDBAF]/15 flex justify-end"
              style={{
                padding: '14px 20px',
                backgroundColor: '#0E0C0A',
                borderTop: '1px solid rgba(251, 219, 175, 0.15)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-[#181411] hover:bg-[#221C17] text-[#FAF6F0] text-xs font-mono border border-[#FBDBAF]/20 cursor-pointer transition-colors"
                style={{
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  backgroundColor: '#181411',
                  color: '#FAF6F0',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: '1px solid rgba(251, 219, 175, 0.2)',
                  cursor: 'pointer'
                }}
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilihan Pejabat PAMAPTA untuk Cetak STTL */}
      {isPamaptaModalOpen && (
        <ModalSelectPamapta
          isOpen={isPamaptaModalOpen}
          onClose={() => setIsPamaptaModalOpen(false)}
          onConfirmPrint={(officer) => {
            setIsPamaptaModalOpen(false);
            printTandaTerimaDumas(perkara || dumasItem, officer);
          }}
        />
      )}

      {/* Modal Serah Terima Berkas SPKT ke Satreskrim */}
      {isHandoverModalOpen && (
        <ModalHandoverSpkt
          isOpen={isHandoverModalOpen}
          dumasItem={perkara || dumasItem}
          onClose={() => setIsHandoverModalOpen(false)}
          onSuccess={(updatedData) => {
            setIsHandoverModalOpen(false);
            const fresh = {
              ...(perkara || dumasItem),
              ...updatedData,
              is_locked_spkt: true,
              status_tahap: 'SERAH_TERIMA_SATRESKRIM',
              status_berkas: 'Diserahkan ke Satreskrim (Menunggu Telaah)'
            };
            setPerkara(fresh);
            if (onUpdateDumas) {
              onUpdateDumas(fresh);
            }
          }}
        />
      )}

    </div>
  );
}
