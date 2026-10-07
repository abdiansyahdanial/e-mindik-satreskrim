import React, { useState } from 'react';
import { 
  FolderLock, 
  Search, 
  PlusCircle, 
  FileSignature, 
  Eye,
  Trash2,
  AlertTriangle,
  X,
  Edit3
} from 'lucide-react';
import { getPersonnelById } from '../data/mockPersonnel';
import CaseEditModal from '../components/CaseEditModal';

export default function CasesView({ 
  cases = [], 
  onSelectCase, 
  onNewCase, 
  onGenerateDocForCase,
  onDeleteCase,
  onUpdateCase,
  userRole = 'admin',
  personnel = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [caseToEdit, setCaseToEdit] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDeleteCase = userRole === 'super_admin' || userRole === 'admin';

  const findPerson = (userId) => {
    return personnel.find(p => p.id === userId || p.nrp === userId) || getPersonnelById(userId);
  };

  const filteredCases = cases.filter((item) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.no_lp || item.nomor_lp || '').toLowerCase().includes(s) ||
      (item.tindak_pidana || '').toLowerCase().includes(s) ||
      (item.pelapor_name || item.nama_pelapor || '').toLowerCase().includes(s) ||
      (item.terlapor_name || item.nama_terlapor || '').toLowerCase().includes(s) ||
      (Array.isArray(item.victims) && item.victims.some(v => (v.nama || '').toLowerCase().includes(s))) ||
      (Array.isArray(item.references?.victims) && item.references.victims.some(v => (v.nama || '').toLowerCase().includes(s))) ||
      (item.person?.nama && item.person.nama.toLowerCase().includes(s));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteCase) {
        await onDeleteCase(caseToDelete.id);
      }
      setCaseToDelete(null);
    } catch (err) {
      alert(`Gagal menghapus perkara: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCaseStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('lidik')) {
      return <span className="badge-delta badge-lidik">TAHAP LIDIK</span>;
    }
    if (s === 'active' || s.includes('sidik')) {
      return <span className="badge-delta badge-sidik">SIDIK AKTIF</span>;
    }
    if (s === 'completed' || s.includes('p21') || s.includes('p-21') || s.includes('selesai')) {
      return <span className="badge-delta badge-p21">P-21 SELESAI</span>;
    }
    if (s.includes('sp3') || s.includes('henti')) {
      return <span className="badge-delta badge-sp3">SP3</span>;
    }
    return <span className="badge-delta badge-sidik">{status.toUpperCase()}</span>;
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2.5 m-0">
            <FolderLock className="w-5 h-5 text-red-500" />
            <span>Manajemen Berkas Perkara Pidana</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Daftar Laporan Polisi (LP), tersangka, dan administrasi penyidikan Satreskrim terhubung Supabase.
          </p>
        </div>

        <button 
          onClick={onNewCase} 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30 transition-all cursor-pointer font-mono tracking-wide"
        >
          <PlusCircle size={15} />
          <span>+ Input Perkara Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 md:px-5 flex items-center justify-between flex-wrap gap-3.5 bg-[#07090e]/80 backdrop-blur-md border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari No. LP, Terlapor, Pelapor, atau Tindak Pidana..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/10 text-white placeholder-zinc-500 rounded-lg pl-9 pr-3.5 py-2 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-mono"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">Status:</span>
          {['all', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30 font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'active' ? 'Dalam Proses' : 'P21 / Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-[#07090e]/80 backdrop-blur-md border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-zinc-400 font-mono text-xs uppercase border-b border-white/10">
              <th className="p-3.5 font-medium tracking-wider">Nomor LP & Tanggal</th>
              <th className="p-3.5 font-medium tracking-wider">Tindak Pidana & Pasal</th>
              <th className="p-3.5 font-medium tracking-wider">Terlapor / Tersangka</th>
              <th className="p-3.5 font-medium tracking-wider">Pelapor / Korban</th>
              <th className="p-3.5 font-medium tracking-wider">Penyidik Utama</th>
              <th className="p-3.5 font-medium tracking-wider">Status</th>
              <th className="p-3.5 font-medium tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 px-4 text-zinc-400 border-b border-white/5 font-mono">
                  Tidak ada perkara yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => {
                const leadInvRef = item.investigators?.[0];
                const leadInv = leadInvRef ? findPerson(leadInvRef.user_id || leadInvRef.nrp) || leadInvRef : null;

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] border-b border-white/5 text-zinc-200 transition-colors">
                    <td className="p-3.5 align-middle">
                      <div className="font-mono text-xs font-semibold text-red-400 tracking-wide">
                        {item.no_lp}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
                        Tgl LP: {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-semibold text-white">
                        {item.tindak_pidana}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {item.pasal_uu}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-semibold text-zinc-200">
                        {item.person?.nama || item.terlapor_name}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {item.person?.umur ? `${item.person.umur} • ` : ''}
                        {item.person?.alamat ? `${item.person.alamat.slice(0, 26)}...` : item.locus}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-medium text-zinc-200">
                        {item.pelapor_name}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Saksi Pelapor
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      {leadInv ? (
                        <div>
                          <div className="font-medium text-xs text-zinc-200">
                            {leadInv.nama}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400 mt-0.5">
                            {leadInv.pangkat} • {leadInv.nrp}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs font-mono">-</span>
                      )}
                    </td>

                    <td className="p-3.5 align-middle">
                      {renderCaseStatusBadge(item.status)}
                    </td>

                    <td className="p-3.5 align-middle text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectCase(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer font-mono"
                          title="Lihat Dossier Lengkap"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>

                        <button
                          onClick={() => setCaseToEdit(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer font-mono"
                          title="Edit Data Berkas Perkara"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onGenerateDocForCase(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30 transition-all cursor-pointer font-mono"
                          title="Buat Dokumen Mindik"
                        >
                          <FileSignature size={12} />
                          <span>Mindik</span>
                        </button>

                        {/* HANYA BISA DILAKUKAN OLEH SUPER ADMIN & ADMIN */}
                        {canDeleteCase && (
                          <button
                            onClick={() => setCaseToDelete(item)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-500/30 transition-all cursor-pointer"
                            title="Hapus Berkas Perkara dari Supabase (Super Admin & Admin)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Konfirmasi Hapus Berkas Perkara (Super Admin & Admin) */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setCaseToDelete(null)}>
          <div 
            className="w-full max-w-md bg-[#07090e] border border-red-500/30 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_20px_25px_-5px_rgba(0,0,0,0.5)] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-red-500/20 flex items-center justify-between bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-red-400 m-0">
                    Hapus Berkas Perkara Pidana
                  </h3>
                  <div className="text-[11px] text-zinc-400">
                    Otoritas Super Admin & Admin Satreskrim
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setCaseToDelete(null)}
                className="bg-transparent border-none text-zinc-400 hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs leading-relaxed text-zinc-300">
              <p className="m-0">
                Apakah Anda yakin ingin menghapus berkas perkara ini secara permanen dari database Supabase?
              </p>

              <div className="p-3 bg-black/60 border border-red-500/20 rounded-lg">
                <div className="font-mono font-bold text-red-400 text-xs">
                  {caseToDelete.no_lp}
                </div>
                <div className="font-semibold text-white mt-1">
                  {caseToDelete.tindak_pidana}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Terlapor: {caseToDelete.person?.nama || caseToDelete.terlapor_name} • Pelapor: {caseToDelete.pelapor_name}
                </div>
              </div>

              <p className="text-[11px] text-red-400 mt-2 mb-0">
                * Perhatian: Seluruh histori dokumen administrasi penyidikan terkait perkara ini juga akan dibersihkan.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setCaseToDelete(null)} 
                className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer font-mono"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isDeleting}
                onClick={confirmDeleteCase}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 font-mono"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Perkara'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Case Modal */}
      {caseToEdit && (
        <CaseEditModal
          isOpen={Boolean(caseToEdit)}
          caseItem={caseToEdit}
          personnel={personnel}
          onClose={() => setCaseToEdit(null)}
          onSaveSuccess={(updated) => {
            if (onUpdateCase) onUpdateCase(updated);
            setCaseToEdit(null);
          }}
        />
      )}
    </div>
  );
}
