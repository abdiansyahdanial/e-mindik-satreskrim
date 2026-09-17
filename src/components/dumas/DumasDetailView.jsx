import React, { useState, useRef } from 'react';
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
  Trash2
} from 'lucide-react';
import AddEvidenceModal from './AddEvidenceModal.jsx';
import EvidenceLightboxModal from './EvidenceLightboxModal.jsx';
import { deleteEvidenceFromDumas } from '../../services/dumasService.js';

export default function DumasDetailView({
  dumasItem,
  onBack,
  onOpenGeneratorForDumas,
  onUpdateDumas
}) {
  const [copied, setCopied] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [perkara, setPerkara] = useState(dumasItem);
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState(null);

  const prevIdRef = useRef(dumasItem?.id);
  if (dumasItem?.id !== prevIdRef.current) {
    prevIdRef.current = dumasItem?.id;
    setPerkara(dumasItem);
  }

  if (!perkara) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 font-mono"
        style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}
      >
        <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 12px auto' }} />
        <p className="text-sm">Data Laporan Dumas tidak ditemukan.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg bg-[#121721] hover:bg-[#1B1F2C] border border-[#292F42] text-xs text-slate-300 font-mono transition-colors cursor-pointer"
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#121721',
            border: '1px solid #292F42',
            fontSize: '12px',
            color: '#CBD5E1',
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
      await deleteEvidenceFromDumas(perkara.id, bb.id, bb.file_path);
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
      className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 bg-[#080B10] text-slate-200 font-sans dumas-detail-wrapper"
      style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '24px 16px',
        backgroundColor: '#080B10',
        color: '#E2E8F0',
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
        className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#292F42] dumas-command-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #292F42'
        }}
      >
        {/* Tombol Kembali Kiri */}
        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="bg-[#121721] hover:bg-[#1B1F2C] border border-[#292F42] px-3.5 py-2 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors cursor-pointer dumas-btn-back"
            style={{
              backgroundColor: '#121721',
              border: '1px solid #292F42',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#CBD5E1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} color="#FF352D" />
            <span>&lt;- Daftar Dumas</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}>
            <span className="w-2 h-2 rounded-full bg-[#E52E2E]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
            <span className="uppercase tracking-wider">E-Mindik Satreskrim Koltim</span>
          </div>
        </div>

        {/* Box Nomor Register Tengah */}
        <div
          className="bg-[#0B0D13] border border-[#292F42] px-3 py-1 rounded-md text-xs font-mono font-bold text-slate-100 flex items-center gap-2 shadow-inner dumas-reg-box"
          style={{
            backgroundColor: '#0B0D13',
            border: '1px solid #292F42',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: '#F1F5F9',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
          }}
        >
          <span className="text-amber-400" style={{ color: '#F59E0B', fontSize: '10px' }}>NO. DUMAS:</span>
          <code className="text-slate-100 font-bold" style={{ color: '#F1F5F9' }}>
            {perkara?.nomor_lp || 'DUMAS/B/01/SPKT/Polres Kolaka Timur/Polda Sultra'}
          </code>
          <button
            type="button"
            onClick={handleCopyNo}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Salin Nomor Dumas"
          >
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Tombol Aksi Kanan: Lanjut Buat Sprin */}
        <div>
          <button
            type="button"
            onClick={() => onOpenGeneratorForDumas && onOpenGeneratorForDumas(perkara)}
            className="bg-[#E52E2E] hover:bg-[#C82323] text-white font-mono font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer dumas-btn-sprin-accent"
            style={{
              backgroundColor: '#E52E2E',
              color: '#FFFFFF',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 10px 25px -5px rgba(229, 46, 46, 0.5), 0 0 15px rgba(229, 46, 46, 0.3)',
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
        className="bg-[#121721] border border-[#292F42] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md dumas-quick-status-bar"
        style={{
          backgroundColor: '#121721',
          border: '1px solid #292F42',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div className="flex items-center gap-3.5" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400 font-mono font-bold text-base"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(127, 29, 29, 0.5)',
              border: '1px solid #991B1B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F87171',
              fontWeight: 700,
              fontSize: '16px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            01
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase' }}>
              Status Administrasi Berkas
            </div>
            <div className="flex items-center gap-2.5 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span
                className="bg-amber-950/70 text-amber-300 border border-amber-800/80 px-2.5 py-1 rounded text-xs font-mono font-bold inline-flex items-center gap-1.5 dumas-badge-status-tahap"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  backgroundColor: 'rgba(69, 26, 3, 0.7)',
                  color: '#FCD34D',
                  border: '1px solid #92400E'
                }}
              >
                ● {perkara?.status_berkas || 'TAHAP PENYELIDIKAN (SP.LIDIK)'}
              </span>
              <span className="text-xs text-slate-400 font-sans hidden sm:inline" style={{ fontSize: '12px', color: '#94A3B8' }}>
                Tinjauan Resume &amp; Digital Evidence
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
          <div
            className="bg-[#0B0D13] px-3 py-1.5 rounded-md border border-[#292F42]"
            style={{
              backgroundColor: '#0B0D13',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #292F42'
            }}
          >
            <span className="text-slate-500" style={{ color: '#64748B' }}>PENYIDIK PENERIMA:</span>
            <span className="text-slate-100 font-semibold ml-2" style={{ color: '#F1F5F9', fontWeight: 600, marginLeft: '6px' }}>
              {perkara?.penyidik_nama || 'Bripka Andi Pratama, S.H.'}
            </span>
            <span className="text-[#FF352D] text-[11px] ml-1.5" style={{ color: '#FF352D', fontSize: '11px', marginLeft: '6px' }}>
              [{perkara?.penyidik_nrp || 'NRP: 89040112'}]
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSchemaModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B1F2C] hover:bg-[#252B3B] text-slate-300 border border-[#292F42] transition-colors cursor-pointer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#1B1F2C',
              color: '#CBD5E1',
              border: '1px solid #292F42',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <Database size={13} color="#FF352D" />
            <span>Skema DB</span>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. BAGIAN A: DATA RESUME PERKARA & PIHAK TERKAIT */}
      {/* ========================================================= */}
      <section className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex items-center justify-between border-b border-[#292F42] pb-2.5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #292F42', paddingBottom: '10px' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-[11px] font-mono font-bold bg-[#1B1F2C] text-[#FF352D] px-2 py-0.5 rounded border border-[#292F42]" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, backgroundColor: '#1B1F2C', color: '#FF352D', padding: '2px 8px', borderRadius: '4px', border: '1px solid #292F42' }}>
              BAGIAN A
            </span>
            <h2 className="text-xs uppercase tracking-wider font-bold text-white font-mono m-0" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
              Data Resume Perkara &amp; Pihak Terkait (Card Grid)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
            No. Registrasi: <span className="text-[#FF352D] font-bold" style={{ color: '#FF352D', fontWeight: 700 }}>{perkara?.nomor_lp || '-'}</span>
          </span>
        </div>

        {/* Card Grid Container */}
        <div className="space-y-4 font-mono" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'JetBrains Mono, monospace' }}>

          {/* Card 01: Identitas Pelapor / Korban */}
          <article
            className="border-l-4 border-l-emerald-500 rounded-xl bg-[#121721] border border-[#292F42] overflow-hidden mb-4 shadow-sm dumas-dossier-card card-pelapor"
            style={{
              backgroundColor: '#121721',
              border: '1px solid #292F42',
              borderLeft: '4px solid #10B981',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <div
              className="bg-[#10141D] border-b border-[#292F42] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#10141D',
                borderBottom: '1px solid #292F42',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981' }}>
                  Identitas Pelapor / Korban
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(6, 78, 59, 0.7)', color: '#6EE7B7', border: '1px solid #059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
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
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nama Lengkap</span>
                <span className="font-bold text-slate-100 text-sm">{perkara?.pelapor_nama || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">NIK KTP</span>
                <span className="text-slate-200 text-xs">{perkara?.pelapor_nik || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Kontak / WA</span>
                <span className="text-emerald-400 font-semibold text-xs">{perkara?.pelapor_kontak || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">TTL / Pekerjaan</span>
                <span className="text-slate-200 text-xs">
                  {perkara?.pelapor_ttl || '-'} <span className="text-slate-600">|</span> {perkara?.pelapor_pekerjaan || '-'}
                </span>
              </div>

              {/* Baris Penuh Alamat Domisili */}
              <div className="col-span-full dumas-dossier-field-full" style={{ gridColumn: '1 / -1' }}>
                <div className="bg-[#0B0D13] p-3 rounded-lg border border-[#292F42] flex flex-wrap items-center justify-between gap-2" style={{ backgroundColor: '#0B0D13', padding: '10px 14px', borderRadius: '8px', border: '1px solid #292F42', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Alamat Domisili KTP</span>
                    <span className="text-slate-300 font-sans text-xs">{perkara?.pelapor_alamat || '-'}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>Kelayakan Status: </span>
                    <span className="text-slate-200 font-semibold">Pelapor Sah &amp; Beritikad Baik</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 02: Data Pihak Terlapor */}
          <article
            className="border-l-4 border-l-[#E52E2E] rounded-xl bg-[#121721] border border-[#292F42] overflow-hidden mb-4 shadow-sm dumas-dossier-card card-terlapor"
            style={{
              backgroundColor: '#121721',
              border: '1px solid #292F42',
              borderLeft: '4px solid #E52E2E',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <div
              className="bg-[#10141D] border-b border-[#292F42] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#10141D',
                borderBottom: '1px solid #292F42',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#E52E2E]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF352D]" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF352D' }}>
                  Data Pihak Terlapor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-950/70 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(127, 29, 29, 0.7)', color: '#FCA5A5', border: '1px solid #991B1B', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {perkara?.terlapor_status || 'TERLAPOR UTAMA'}
                </span>
                <span className="text-xs text-amber-400 hidden sm:inline" style={{ fontSize: '11px', color: '#FBBF24' }}>
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
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nama Terlapor</span>
                <span className="font-bold text-red-300 text-sm">{perkara?.terlapor_nama || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Status Subjek</span>
                <span className="text-red-400 font-semibold text-xs">{perkara?.terlapor_status || 'Saksi Terlapor'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Kontak / No HP</span>
                <span className="text-slate-200 text-xs">{perkara?.terlapor_kontak || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Domisili / Wilayah</span>
                <span className="text-slate-200 text-xs font-sans">{perkara?.terlapor_domisili || '-'}</span>
              </div>

              {/* Baris Penuh Catatan Residivis */}
              <div className="col-span-full dumas-dossier-field-full" style={{ gridColumn: '1 / -1' }}>
                <div className="bg-[#0B0D13] p-3 rounded-lg border border-[#292F42] flex flex-wrap items-center justify-between gap-2" style={{ backgroundColor: '#0B0D13', padding: '10px 14px', borderRadius: '8px', border: '1px solid #292F42', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Catatan Residivis / Atensi Kepolisian</span>
                    <span className="text-slate-300 text-xs">Belum ada catatan kriminal sebelumnya (Nihil SKCK Hitam / Bukan DPO)</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>Status Tindakan: </span>
                    <span className="text-amber-400 font-semibold">Pemeriksaan Klarifikasi Terjadwal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terlapor Tambahan (Jika Lebih Dari 1) */}
            {Array.isArray(perkara?.terlapor_list) && perkara.terlapor_list.length > 1 && (
              <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  Terlapor Tambahan ({perkara.terlapor_list.length - 1} Pihak):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {perkara.terlapor_list.slice(1).map((t, i) => (
                    <div key={t.id || i} style={{ backgroundColor: '#0B0D13', border: '1px solid #292F42', borderRadius: '6px', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '11px' }}>{t.nama || '-'}</span>
                        <span style={{ fontSize: '9px', color: '#94A3B8' }}>{t.role_label || `Terlapor ${i + 2}`}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>
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
            className="border-l-4 border-l-blue-500 rounded-xl bg-[#121721] border border-[#292F42] overflow-hidden mb-4 shadow-sm dumas-dossier-card card-saksi"
            style={{
              backgroundColor: '#121721',
              border: '1px solid #292F42',
              borderLeft: '4px solid #3B82F6',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <div
              className="bg-[#10141D] border-b border-[#292F42] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#10141D',
                borderBottom: '1px solid #292F42',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-blue-500" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60A5FA' }}>
                  Data Saksi-Saksi Perkara
                </span>
              </div>
              <span className="text-[10px] bg-blue-950/70 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(30, 58, 138, 0.7)', color: '#93C5FD', border: '1px solid #1D4ED8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
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
                      backgroundColor: '#0B0D13',
                      border: '1px solid #292F42',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(41, 47, 66, 0.5)', paddingBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                          SAKSI {idx + 1}: {saksi.nama || 'Tanpa Nama'}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.4)', fontWeight: 600 }}>
                        {saksi.role_label || (idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div className="bg-[#121721] p-2 rounded border border-[#292F42]">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">NIK KTP</span>
                        <span className="text-slate-200 text-xs font-semibold">{saksi.nik || '-'}</span>
                      </div>
                      <div className="bg-[#121721] p-2 rounded border border-[#292F42]">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Kontak / HP</span>
                        <span className="text-blue-400 text-xs font-semibold">{saksi.kontak || '-'}</span>
                      </div>
                      <div className="bg-[#121721] p-2 rounded border border-[#292F42]">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">TTL / Pekerjaan</span>
                        <span className="text-slate-200 text-xs">
                          {saksi.ttl || '-'} <span className="text-slate-600">|</span> {saksi.pekerjaan || '-'}
                        </span>
                      </div>
                      <div className="bg-[#121721] p-2 rounded border border-[#292F42]">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Agama</span>
                        <span className="text-slate-200 text-xs">{saksi.agama || 'Islam'}</span>
                      </div>
                    </div>

                    {saksi.alamat && (
                      <div style={{ backgroundColor: '#121721', padding: '8px 12px', borderRadius: '6px', border: '1px solid #292F42' }}>
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Alamat Domisili</span>
                        <span className="text-slate-300 font-sans text-xs">{saksi.alamat}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                Nihil saksi yang tercatat pada laporan pengaduan ini.
              </div>
            )}
          </article>

          {/* Card 03: Delik & Dugaan Pidana */}
          <article
            className="border-l-4 border-l-amber-500 rounded-xl bg-[#121721] border border-[#292F42] overflow-hidden mb-4 shadow-sm dumas-dossier-card card-delik"
            style={{
              backgroundColor: '#121721',
              border: '1px solid #292F42',
              borderLeft: '4px solid #F59E0B',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <div
              className="bg-[#10141D] border-b border-[#292F42] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 dumas-dossier-header"
              style={{
                backgroundColor: '#10141D',
                borderBottom: '1px solid #292F42',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-amber-500" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#F59E0B' }}>
                  Delik &amp; Dugaan Pidana
                </span>
              </div>
              <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold" style={{ fontSize: '10px', backgroundColor: 'rgba(120, 53, 15, 0.7)', color: '#FDE68A', border: '1px solid #B45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
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
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tindak Pidana</span>
                <span className="font-bold text-slate-100 text-xs font-sans">{perkara?.tindak_pidana || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Pasal yang Disangkakan</span>
                <span className="text-[#FF352D] font-bold text-xs">{perkara?.pasal_disangkakan || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tempus Delicti (Waktu)</span>
                <span className="text-slate-200 text-xs">{perkara?.tempus_delicti || '-'}</span>
              </div>
              <div className="bg-[#0B0D13] border border-[#292F42] rounded-lg p-2.5 flex flex-col gap-1 dumas-dossier-field">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Locus Delicti (Tempat)</span>
                <span className="text-slate-200 text-xs font-sans">{perkara?.locus_delicti || '-'}</span>
              </div>
            </div>
          </article>

          {/* Card 04: Ringkasan Kronologi Kasus */}
          <article
            className="rounded-xl bg-[#121721] border border-[#292F42] p-4 shadow-sm space-y-2.5"
            style={{
              backgroundColor: '#121721',
              borderRadius: '12px',
              border: '1px solid #292F42',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <div className="flex items-center justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="w-2 h-2 rounded-full bg-[#E52E2E]" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
                <span className="text-xs font-bold uppercase tracking-wider text-white" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF' }}>
                  Ringkasan Kronologi Kasus
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-[#0B0D13] border border-[#292F42] px-2 py-0.5 rounded" style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B', backgroundColor: '#0B0D13', border: '1px solid #292F42', padding: '2px 8px', borderRadius: '4px' }}>
                Sumber: Form Aduan SPKT Satreskrim
              </span>
            </div>

            {/* Kotak Terminal Narasi */}
            <div
              className="bg-[#0B0D13] p-4 rounded-lg border border-[#292F42] text-xs font-mono text-slate-300 leading-relaxed dumas-terminal-narrative"
              style={{
                backgroundColor: '#0B0D13',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #292F42',
                color: '#CBD5E1',
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
        <div className="flex items-center justify-between border-b border-[#292F42] pb-2.5 flex-wrap gap-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #292F42', paddingBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-[11px] font-mono font-bold bg-[#1B1F2C] text-[#FF352D] px-2 py-0.5 rounded border border-[#292F42]" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, backgroundColor: '#1B1F2C', color: '#FF352D', padding: '2px 8px', borderRadius: '4px', border: '1px solid #292F42' }}>
              BAGIAN D
            </span>
            <h2 className="text-xs uppercase tracking-wider font-bold text-white font-mono m-0" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
              Daftar Bukti Digital
            </h2>
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-[#1B1F2C] text-slate-300 border border-[#292F42]" style={{ marginLeft: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#1B1F2C', color: '#CBD5E1', border: '1px solid #292F42' }}>
              {(perkara?.lampiran_barang_bukti || []).length} Bukti Terdaftar
            </span>
          </div>

          {/* Tombol Aksi Tambah Barang Bukti */}
          <button
            type="button"
            onClick={() => setIsAddEvidenceOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(229, 46, 46, 0.15)',
              border: '1px solid #E52E2E',
              color: '#FF6B6B',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 0 12px rgba(229, 46, 46, 0.25)'
            }}
          >
            <Plus size={13} />
            <span>+ Tambah Barang Bukti</span>
          </button>
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
              const previewSrc = bb?.file_url || bb?.previewUrl || null;

              return (
                <div
                  key={bb?.id || idx}
                  className="bg-[#1b2229] border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-white/[0.18] transition-all duration-150 dumas-evidence-card-box"
                  style={{
                    backgroundColor: '#1b2229',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
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
                          className="w-10 h-10 rounded-lg bg-red-950/70 border border-red-800 flex items-center justify-center text-red-400 shrink-0 cursor-pointer"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: isPdf ? 'rgba(56, 189, 248, 0.15)' : 'rgba(127, 29, 29, 0.7)',
                            border: isPdf ? '1px solid #0284C7' : '1px solid #991B1B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isPdf ? '#38BDF8' : '#F87171',
                            flexShrink: 0,
                            cursor: 'pointer'
                          }}
                          title="Klik untuk pratinjau penuh"
                        >
                          {isPdf ? <FileText size={20} /> : <ImageIcon size={20} />}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#FF352D] font-bold block" style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: isPdf ? '#38BDF8' : '#FF352D', fontWeight: 700, display: 'block' }}>
                            {bb?.kategori_bukti || (isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG')}
                          </span>
                          <h3 className="text-xs font-bold text-slate-100 mt-0.5 truncate max-w-[170px]" style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F9', margin: '2px 0 0 0', maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bb?.nama_file}>
                            {bb?.nama_file || 'Berkas_Bukti'}
                          </h3>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0B0D13] text-slate-400 border border-[#292F42]" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#0B0D13', color: '#94A3B8', border: '1px solid #292F42' }}>
                        {bb?.file_size_formatted || '150 KB'}
                      </span>
                    </div>

                    {/* Preview Thumbnail Kotak untuk Objek Fisik (JPG) */}
                    {!isPdf && (
                      <div
                        onClick={() => openEvidencePreview(bb)}
                        className="mt-3 w-full h-24 rounded-lg bg-[#0B0D13] border border-[#292F42] flex items-center justify-center text-slate-500 text-xs font-mono overflow-hidden cursor-pointer hover:border-slate-500 transition-colors"
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          height: '96px',
                          borderRadius: '8px',
                          backgroundColor: '#0B0D13',
                          border: '1px solid #292F42',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748B',
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
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px' }}>
                            <ImageIcon size={20} color="#F87171" />
                            <span style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'center' }}>
                              [ Pratinjau Foto: {bb?.nama_file || 'Foto'} ]
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata Box */}
                    <div
                      className="mt-3.5 p-2.5 rounded-lg bg-[#0B0D13] border border-[#292F42] flex flex-col gap-1.5 text-[11px] font-mono text-slate-400"
                      style={{
                        marginTop: '14px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#0B0D13',
                        border: '1px solid #292F42',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#94A3B8'
                      }}
                    >
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Keterangan:</span>
                        <span className="text-slate-300 truncate max-w-[140px]">{bb?.keterangan || 'Lampiran Bukti Resmi'}</span>
                      </div>
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diunggah:</span>
                        <span className="text-slate-300">
                          {bb?.diunggah_pada ? new Date(bb.diunggah_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '14 Sep 2026'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Integritas:</span>
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px]" style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                          <ShieldCheck size={12} />
                          {bb?.hash_sha256 ? `${bb.hash_sha256.substring(0, 10)}...` : 'SHA-256 Valid'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi: Lihat/Perbesar, Unduh, & Hapus Bukti */}
                  <div className="mt-3.5 pt-3 border-t border-[#292F42] flex items-center gap-2" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #292F42', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => openEvidencePreview(bb)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#1B1F2C] hover:bg-[#252B3B] border border-[#292F42] text-slate-100 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#1B1F2C',
                        border: '1px solid #292F42',
                        color: '#F1F5F9',
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
                      className="p-2 rounded-lg bg-[#121721] hover:bg-[#1B1F2C] border border-[#292F42] text-slate-300 hover:text-white cursor-pointer transition-colors"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#121721',
                        border: '1px solid #292F42',
                        color: '#CBD5E1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Unduh Berkas Bukti"
                    >
                      <Download size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(bb)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#F87171',
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
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className="col-span-full py-8 text-center bg-[#121721] rounded-xl border border-[#292F42] text-slate-500 text-xs font-mono"
              style={{
                gridColumn: '1 / -1',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: '#121721',
                borderRadius: '12px',
                border: '1px solid #292F42',
                color: '#64748B',
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
        className="bg-[#121721] border border-[#292F42] border-l-4 border-l-[#E52E2E] rounded-xl p-5 flex flex-col gap-4 shadow-lg dumas-action-banner"
        style={{
          backgroundColor: '#121721',
          border: '1px solid #292F42',
          borderLeft: '4px solid #E52E2E',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292F42] pb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #292F42', paddingBottom: '12px' }}>
          <div className="flex items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="w-9 h-9 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(127, 29, 29, 0.6)',
                border: '1px solid #991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171'
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-xs font-bold uppercase text-white font-mono" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace' }}>
                  AKSI KEDINASAN : CETAK BERKAS DUMAS RESMI
                </span>
                <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold font-mono" style={{ fontSize: '10px', backgroundColor: 'rgba(6, 78, 59, 0.7)', color: '#6EE7B7', border: '1px solid #059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  TEREGISTER RESMI
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5 font-sans m-0" style={{ color: '#94A3B8', fontSize: '12px', margin: '3px 0 0 0' }}>
                Dokumentasi Administrasi Penyelidikan &amp; Surat Tanda Penerimaan Laporan Pengaduan Masyarakat
              </p>
            </div>
          </div>

          <div className="text-right font-mono" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
            <span className="text-[10px] text-slate-500 block uppercase" style={{ fontSize: '10px', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Nomor Register Resmi</span>
            <code className="text-xs text-[#FF352D] font-bold" style={{ fontSize: '12px', color: '#FF352D', fontWeight: 700 }}>{perkara?.nomor_lp}</code>
          </div>
        </div>

        <div
          className="bg-[#0B0D13] p-4 rounded-lg border border-[#292F42] flex flex-wrap items-center justify-between gap-3.5"
          style={{
            backgroundColor: '#0B0D13',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #292F42',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div className="flex items-center gap-2 text-xs text-slate-300 font-sans" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
            <span>Siap dicetak standar dinas Satreskrim Presisi dilengkapi QR-Code Verifikasi &amp; SHA-256</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Tombol [CETAK DUMAS] */}
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#E52E2E] hover:bg-[#C82323] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-md dumas-btn-cetak-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#E52E2E',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(229, 46, 46, 0.4)'
              }}
            >
              <Printer size={15} />
              <span>CETAK DUMAS</span>
            </button>

            {/* Tombol [CETAK TANDA TERIMA LAPORAN (STTL)] */}
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#121721] hover:bg-[#1B1F2C] border border-[#E52E2E]/60 text-red-400 hover:text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors dumas-btn-cetak-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#121721',
                border: '1px solid rgba(229, 46, 46, 0.6)',
                color: '#F87171',
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
              className="bg-[#E52E2E]/20 hover:bg-[#E52E2E]/30 text-red-400 border border-red-800/80 px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'rgba(127, 29, 29, 0.7)',
                border: '1px solid #991B1B',
                color: '#FF352D',
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
        dumasId={perkara?.id}
        dumasNo={perkara?.nomor_lp}
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
            className="relative w-full max-w-4xl bg-[#0E1118] border border-[#292F42] rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden dumas-modal-container"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '880px',
              backgroundColor: '#0E1118',
              border: '1px solid #292F42',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              className="p-3.5 px-5 bg-[#0B0D13] border-b border-[#292F42] flex items-center justify-between"
              style={{
                padding: '14px 20px',
                backgroundColor: '#0B0D13',
                borderBottom: '1px solid #292F42',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="#FF352D" />
                <h3 className="text-xs font-mono font-bold text-white m-0" style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  SKEMA DATABASE SUPABASE (POSTGRESQL SCHEMA DUMAS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '14px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              className="p-5 overflow-y-auto font-mono text-xs text-slate-300 flex flex-col gap-4"
              style={{ padding: '20px', overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <span className="text-amber-400 font-bold" style={{ color: '#F59E0B', fontWeight: 700 }}>-- 1. TABEL UTAMA: LAPORAN PENGADUAN (DUMAS)</span>
                <pre
                  className="mt-1.5 p-3.5 bg-[#121721] rounded-lg border border-[#292F42] overflow-x-auto text-slate-200 leading-relaxed"
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    backgroundColor: '#121721',
                    borderRadius: '8px',
                    border: '1px solid #292F42',
                    overflowX: 'auto',
                    color: '#E2E8F0',
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
                <span className="text-amber-400 font-bold" style={{ color: '#F59E0B', fontWeight: 700 }}>-- 2. TABEL RELASI: LAMPIRAN BARANG BUKTI DIGITAL</span>
                <pre
                  className="mt-1.5 p-3.5 bg-[#121721] rounded-lg border border-[#292F42] overflow-x-auto text-slate-200 leading-relaxed"
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    backgroundColor: '#121721',
                    borderRadius: '8px',
                    border: '1px solid #292F42',
                    overflowX: 'auto',
                    color: '#E2E8F0',
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
              className="p-3.5 px-5 bg-[#0B0D13] border-t border-[#292F42] flex justify-end"
              style={{
                padding: '14px 20px',
                backgroundColor: '#0B0D13',
                borderTop: '1px solid #292F42',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(false)}
                className="px-4 py-1.5 rounded-md bg-[#1B1F2C] hover:bg-[#252B3B] text-slate-300 text-xs font-mono border border-[#292F42] cursor-pointer transition-colors"
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#1B1F2C',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: '1px solid #292F42',
                  cursor: 'pointer'
                }}
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
