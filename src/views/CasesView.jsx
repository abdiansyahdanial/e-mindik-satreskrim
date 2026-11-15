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
      return (
        <span className="badge-delta badge-lidik" style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0B0E14', fontWeight: 700, borderRadius: '9999px' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF2A2A' }}></span>
          TAHAP LIDIK
        </span>
      );
    }
    if (s === 'active' || s.includes('sidik')) {
      return (
        <span className="badge-delta badge-sidik" style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0B0E14', fontWeight: 700, borderRadius: '9999px' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF2A2A' }}></span>
          SIDIK AKTIF
        </span>
      );
    }
    if (s === 'completed' || s.includes('p21') || s.includes('p-21') || s.includes('selesai')) {
      return (
        <span className="badge-delta badge-p21" style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0B0E14', fontWeight: 700, borderRadius: '9999px' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF2A2A' }}></span>
          P-21 SELESAI
        </span>
      );
    }
    if (s.includes('sp3') || s.includes('henti')) {
      return (
        <span className="badge-delta badge-sp3" style={{ background: 'rgba(148, 163, 184, 0.14)', border: '1px solid rgba(148, 163, 184, 0.28)', color: '#CBD5E1', borderRadius: '9999px' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF2A2A' }}></span>
          SP3
        </span>
      );
    }
    return (
      <span className="badge-delta badge-sidik" style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0B0E14', fontWeight: 700, borderRadius: '9999px' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF2A2A' }}></span>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="heading-font text-xl font-bold tracking-[0.04em] text-white flex items-center gap-2.5 m-0">
            <FolderLock className="w-5 h-5 text-[#FF2A2A]" />
            <span>Manajemen Berkas Perkara Pidana</span>
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Daftar Laporan Polisi (LP), tersangka, dan administrasi penyidikan Satreskrim terhubung Supabase.
          </p>
        </div>

        <button 
          onClick={onNewCase} 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[linear-gradient(135deg,#E61919_0%,#FF2A2A_100%)] hover:bg-none hover:bg-white text-white hover:text-[#0B0E14] border border-[#FF5252] hover:border-white shadow-[0_4px_20px_rgba(255,42,42,0.40)] transition-all cursor-pointer font-mono tracking-wide"
        >
          <PlusCircle size={15} />
          <span>+ Input Perkara Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 md:px-5 flex items-center justify-between flex-wrap gap-3.5 bg-[rgba(17,22,31,0.80)] backdrop-blur-[18px] border border-[rgba(148,163,184,0.14)] rounded-[18px] shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-3 text-[#94A3B8] pointer-events-none" />
          <input
            type="text"
            placeholder="Cari No. LP, Terlapor, Pelapor, atau Tindak Pidana..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131924] border border-[rgba(148,163,184,0.20)] text-white placeholder-[#94A3B8]/65 rounded-full pl-9 pr-4 py-2 text-xs focus:border-[#FF2A2A] outline-none transition-all font-mono"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#94A3B8]">Status:</span>
          {['all', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-[#0B0E14] border border-white font-bold'
                  : 'bg-[#131924] hover:bg-[#171E2B] text-[#CBD5E1] border border-[rgba(148,163,184,0.22)]'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'active' ? 'Dalam Proses' : 'P21 / Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div className="cyber-card bg-[rgba(17,22,31,0.80)] backdrop-blur-[18px] border border-[rgba(148,163,184,0.14)] rounded-[18px] shadow-[0_14px_36px_rgba(0,0,0,0.5)] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0D1117]/90 text-[#64748B] font-mono text-[11px] uppercase border-b border-[rgba(148,163,184,0.12)]">
              <th className="p-3.5 font-semibold tracking-wider">Nomor LP & Tanggal</th>
              <th className="p-3.5 font-semibold tracking-wider">Tindak Pidana & Pasal</th>
              <th className="p-3.5 font-semibold tracking-wider">Terlapor / Tersangka</th>
              <th className="p-3.5 font-semibold tracking-wider">Pelapor / Korban</th>
              <th className="p-3.5 font-semibold tracking-wider">Penyidik Utama</th>
              <th className="p-3.5 font-semibold tracking-wider">Status</th>
              <th className="p-3.5 font-semibold tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 px-4 text-[#94A3B8] border-b border-[rgba(148,163,184,0.10)] font-mono">
                  Tidak ada perkara yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => {
                const leadInvRef = item.investigators?.[0];
                const leadInv = leadInvRef ? findPerson(leadInvRef.user_id || leadInvRef.nrp) || leadInvRef : null;

                return (
                  <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.03)] border-b border-[rgba(148,163,184,0.08)] text-white transition-colors">
                    <td className="p-3.5 align-middle">
                      <div className="font-mono text-xs font-semibold text-[#FF3B3B] tracking-wide">
                        {item.no_lp}
                      </div>
                      <div className="font-mono text-[11px] text-[#94A3B8] mt-0.5">
                        Tgl LP: {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-semibold text-white">
                        {item.tindak_pidana}
                      </div>
                      <div className="text-[11px] text-[#FF3B3B] font-medium mt-0.5">
                        {item.pasal_uu}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-semibold text-[#CBD5E1]">
                        {item.person?.nama || item.terlapor_name}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">
                        {item.person?.umur ? `${item.person.umur} • ` : ''}
                        {item.person?.alamat ? `${item.person.alamat.slice(0, 26)}...` : item.locus}
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      <div className="font-medium text-white">
                        {item.pelapor_name}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Saksi Pelapor
                      </div>
                    </td>

                    <td className="p-3.5 align-middle">
                      {leadInv ? (
                        <div>
                          <div className="font-medium text-xs text-[#CBD5E1]">
                            {leadInv.nama}
                          </div>
                          <div className="font-mono text-[10px] text-[#94A3B8] mt-0.5">
                            {leadInv.pangkat} • {leadInv.nrp}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#64748B] text-xs font-mono">-</span>
                      )}
                    </td>

                    <td className="p-3.5 align-middle">
                      {renderCaseStatusBadge(item.status)}
                    </td>

                    <td className="p-3.5 align-middle text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectCase(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#131924] hover:bg-white text-[#CBD5E1] hover:text-[#0B0E14] border border-[rgba(148,163,184,0.22)] hover:border-white transition-all cursor-pointer font-mono"
                          title="Lihat Dossier Lengkap"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>

                        <button
                          onClick={() => setCaseToEdit(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#131924] hover:bg-white text-[#CBD5E1] hover:text-[#0B0E14] border border-[rgba(148,163,184,0.22)] hover:border-white transition-all cursor-pointer font-mono"
                          title="Edit Data Berkas Perkara"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onGenerateDocForCase(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#131924] hover:bg-white text-white hover:text-[#0B0E14] border border-[#FF2A2A]/50 hover:border-white transition-all cursor-pointer font-mono"
                          title="Buat Dokumen Mindik"
                        >
                          <FileSignature size={12} />
                          <span>Mindik</span>
                        </button>

                        {/* HANYA BISA DILAKUKAN OLEH SUPER ADMIN & ADMIN */}
                        {canDeleteCase && (
                          <button
                            onClick={() => setCaseToDelete(item)}
                            className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full text-xs font-medium bg-[#131924] hover:bg-[#FF2A2A] text-[#FF3B3B] hover:text-white border border-[rgba(255,42,42,0.40)] hover:border-[#FF2A2A] transition-all cursor-pointer"
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
            className="w-full max-w-md bg-[#11161F] border border-[rgba(148,163,184,0.20)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between bg-[#131924]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[rgba(255,42,42,0.16)] border border-[#FF2A2A]/40 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-[#FF2A2A]" />
                </div>
                <div>
                  <h3 className="heading-font text-sm font-bold font-mono text-white m-0">
                    Hapus Berkas Perkara Pidana
                  </h3>
                  <div className="text-[11px] text-[#94A3B8]">
                    Otoritas Super Admin & Admin Satreskrim
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setCaseToDelete(null)}
                className="bg-transparent border-none text-[#94A3B8] hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs leading-relaxed text-[#CBD5E1]/85">
              <p className="m-0">
                Apakah Anda yakin ingin menghapus berkas perkara ini secara permanen dari database Supabase?
              </p>

              <div className="p-3 bg-[#131924] border border-[rgba(148,163,184,0.18)] rounded-xl">
                <div className="font-mono font-bold text-[#FF3B3B] text-xs">
                  {caseToDelete.no_lp}
                </div>
                <div className="font-semibold text-white mt-1">
                  {caseToDelete.tindak_pidana}
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  Terlapor: {caseToDelete.person?.nama || caseToDelete.terlapor_name} • Pelapor: {caseToDelete.pelapor_name}
                </div>
              </div>

              <p className="text-[11px] text-[#FF3B3B] mt-2 mb-0">
                * Perhatian: Seluruh histori dokumen administrasi penyidikan terkait perkara ini juga akan dibersihkan.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-[#0B0E14] border-t border-[rgba(148,163,184,0.14)] flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setCaseToDelete(null)} 
                className="px-4 py-2 rounded-full text-xs font-medium bg-transparent hover:bg-white/10 text-[#CBD5E1] border border-[rgba(148,163,184,0.25)] transition-all cursor-pointer font-mono"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isDeleting}
                onClick={confirmDeleteCase}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#FF2A2A] hover:bg-white text-white hover:text-[#0B0E14] border border-[#FF5252] hover:border-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 font-mono"
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
