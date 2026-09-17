import React from 'react';
import { 
  FolderLock, 
  FileText, 
  ShieldAlert, 
  Users, 
  ArrowUpRight, 
  PlusCircle, 
  FileSignature
} from 'lucide-react';
import { getPersonnelById } from '../data/mockPersonnel';

export default function DashboardView({ 
  cases = [], 
  documents = [], 
  onSelectCase, 
  onNewCase, 
  onOpenGenerator, 
  onViewDoc 
}) {
  const activeCasesCount = cases.filter(c => c.status === 'active').length;
  const detainedCount = cases.filter(c => c.references?.no_sprin_han).length || 2;
  const docsCount = documents.length;

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('lidik')) {
      return <span className="badge-delta badge-lidik">LIDIK</span>;
    }
    if (s.includes('sidik')) {
      return <span className="badge-delta badge-sidik">SIDIK</span>;
    }
    if (s.includes('p21') || s.includes('p-21') || s.includes('selesai')) {
      return <span className="badge-delta badge-p21">P-21</span>;
    }
    if (s.includes('sp3') || s.includes('henti')) {
      return <span className="badge-delta badge-sp3">SP3</span>;
    }
    return <span className="badge-delta badge-p21">{status.toUpperCase()}</span>;
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      {/* Header Greeting Banner - Enterprise Command Center (Login DNA Synchronized) */}
      <div className="p-6 bg-[#1b2229] border border-white/[0.08] rounded-xl flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold bg-[#222b34] text-[#ff5740] border border-[#ff352d]/30 px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff352d] inline-block animate-pulse" />
              SISTEM INFORMASI E-MINDIK RESKRIM
            </span>
            <span className="text-xs text-zinc-400 font-mono">Wilayah Hukum Polres Kolaka Timur</span>
          </div>
          <h2 className="text-xl font-bold m-0 text-zinc-100 tracking-tight">
            Pusat Komando Administrasi Penyidikan Perkara
          </h2>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-2xl">
            Otomatisasi penyusunan berkas Sprin Sidik, SPDP, Sprin Kap, Sprin Han, dan BAP sesuai standar Presisi Reskrim Polri.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={onNewCase} className="btn btn-secondary">
            <PlusCircle size={15} />
            <span>+ Registrasi LP Baru</span>
          </button>
          <button onClick={() => onOpenGenerator(null)} className="btn btn-primary">
            <FileSignature size={15} />
            <span>Mulai Buat Dokumen</span>
          </button>
        </div>
      </div>

      {/* 21st.dev felipemenezes098/card-05 Inspired KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Perkara Aktif */}
        <div className="relative w-full rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm transition-all duration-150 hover:border-white/[0.18]">
          <div className="absolute top-5 right-5 bg-[#222b34] border border-white/10 flex size-9 items-center justify-center rounded-lg">
            <FolderLock size={17} className="text-[#ff5740]" />
          </div>
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Perkara Aktif
          </span>
          <div className="text-3xl font-bold tabular-nums font-mono text-zinc-100 leading-none my-2.5">
            {activeCasesCount}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="badge-delta badge-p21">+1 Baru</span>
            <span className="text-zinc-500">minggu ini</span>
          </div>
        </div>

        {/* Card 2: Dokumen Terbit */}
        <div className="relative w-full rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm transition-all duration-150 hover:border-white/[0.18]">
          <div className="absolute top-5 right-5 bg-[#222b34] border border-white/10 flex size-9 items-center justify-center rounded-lg">
            <FileText size={17} className="text-sky-400" />
          </div>
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Dokumen Terbit
          </span>
          <div className="text-3xl font-bold tabular-nums font-mono text-zinc-100 leading-none my-2.5">
            {docsCount}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="badge-delta badge-lidik">Mindik Otomatis</span>
            <span className="text-zinc-500">Sprin &amp; BAP</span>
          </div>
        </div>

        {/* Card 3: Tahanan Rutan */}
        <div className="relative w-full rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm transition-all duration-150 hover:border-white/[0.18]">
          <div className="absolute top-5 right-5 bg-[#222b34] border border-white/10 flex size-9 items-center justify-center rounded-lg">
            <ShieldAlert size={17} className="text-amber-400" />
          </div>
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Tahanan Rutan
          </span>
          <div className="text-3xl font-bold tabular-nums font-mono text-amber-400 leading-none my-2.5">
            {detainedCount}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="badge-delta badge-sidik">Sprin Han</span>
            <span className="text-zinc-500">Rutan Polres</span>
          </div>
        </div>

        {/* Card 4: Personel Siaga */}
        <div className="relative w-full rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm transition-all duration-150 hover:border-white/[0.18]">
          <div className="absolute top-5 right-5 bg-[#222b34] border border-white/10 flex size-9 items-center justify-center rounded-lg">
            <Users size={17} className="text-emerald-400" />
          </div>
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 font-medium">
            Personel Siaga
          </span>
          <div className="text-3xl font-bold tabular-nums font-mono text-emerald-400 leading-none my-2.5">
            12
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="badge-delta badge-p21">Siaga Tugas</span>
            <span className="text-zinc-500">Penyidik &amp; Pembantu</span>
          </div>
        </div>
      </div>

      {/* Grid: Berkas Perkara Terkini & Dokumen Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Recent Cases */}
        <div className="rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FolderLock size={16} className="text-[#ff5740]" />
              <h3 className="text-sm font-bold m-0 text-zinc-100">
                Berkas Perkara Terbaru
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold bg-[#222b34] border border-white/[0.08] text-zinc-400 px-2 py-0.5 rounded">
              {cases.length} Perkara
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {cases.slice(0, 4).map((c) => {
              const leadInv = c.investigators?.[0] ? getPersonnelById(c.investigators[0].user_id) : null;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="p-3 bg-[#222b34] rounded-lg border border-white/[0.08] cursor-pointer transition-all duration-150 flex items-center justify-between hover:border-white/[0.2] hover:bg-[#26313c] hover:translate-x-0.5"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[#ff5740] font-semibold">
                        {c.no_lp.split('/')[2] ? `LP/B/${c.no_lp.split('/')[2]}` : c.no_lp}
                      </span>
                      {renderStatusBadge(c.status)}
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {c.tindak_pidana} • {c.person?.nama || c.terlapor_name}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      Penyidik: {leadInv ? `${leadInv.pangkat} ${leadInv.nama.split(' ')[0]}` : 'Belum Ditunjuk'}
                    </div>
                  </div>

                  <ArrowUpRight size={15} className="text-zinc-500 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recent Generated Documents */}
        <div className="rounded-xl bg-[#1b2229] border border-white/[0.08] p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-sky-400" />
              <h3 className="text-sm font-bold m-0 text-zinc-100">
                Dokumen Mindik Terakhir
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold bg-[#222b34] border border-white/[0.08] text-zinc-400 px-2 py-0.5 rounded">
              {documents.length} Berkas
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {documents.slice(0, 4).map((doc) => {
              return (
                <div
                  key={doc.id}
                  onClick={() => onViewDoc(doc)}
                  className="p-3 bg-[#222b34] rounded-lg border border-white/[0.08] cursor-pointer transition-all duration-150 flex items-center justify-between hover:border-white/[0.2] hover:bg-[#26313c] hover:translate-x-0.5"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold bg-[#1b2229] border border-white/[0.08] text-sky-400 px-1.5 py-0.5 rounded tracking-wide">
                        {doc.template_code}
                      </span>
                      <span className="text-[10.5px] text-zinc-400 font-mono">
                        {doc.created_at}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {doc.doc_title}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400 truncate">
                      {doc.doc_number || 'Tanpa Nomor'}
                    </div>
                  </div>

                  <ArrowUpRight size={15} className="text-zinc-500 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

