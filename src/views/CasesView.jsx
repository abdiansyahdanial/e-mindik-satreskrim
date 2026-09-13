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

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderLock size={22} color="var(--accent-cyan)" />
            <span>Manajemen Berkas Perkara Pidana</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Daftar Laporan Polisi (LP), tersangka, dan administrasi penyidikan Satreskrim terhubung Supabase.
          </p>
        </div>

        <button onClick={onNewCase} className="btn btn-primary">
          <PlusCircle size={16} />
          <span>+ Input Perkara Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Cari No. LP, Terlapor, Pelapor, atau Tindak Pidana..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status:</span>
          {['all', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {status === 'all' ? 'Semua' : status === 'active' ? 'Dalam Proses' : 'P21 / Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div className="table-container">
        <table className="tactical-table">
          <thead>
            <tr>
              <th>Nomor LP & Tanggal</th>
              <th>Tindak Pidana & Pasal</th>
              <th>Terlapor / Tersangka</th>
              <th>Pelapor / Korban</th>
              <th>Penyidik Utama</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  Tidak ada perkara yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredCases.map((item) => {
                const leadInvRef = item.investigators?.[0];
                const leadInv = leadInvRef ? findPerson(leadInvRef.user_id || leadInvRef.nrp) || leadInvRef : null;

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {item.no_lp}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Tgl LP: {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.tindak_pidana}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.pasal_uu}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {item.person?.nama || item.terlapor_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.person?.umur ? `${item.person.umur} • ` : ''}
                        {item.person?.alamat ? `${item.person.alamat.slice(0, 26)}...` : item.locus}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {item.pelapor_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Saksi Pelapor
                      </div>
                    </td>

                    <td>
                      {leadInv ? (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '12px' }}>
                            {leadInv.nama}
                          </div>
                          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {leadInv.pangkat} • {leadInv.nrp}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${item.status === 'active' ? 'badge-green' : 'badge-cyan'}`}>
                        {item.status === 'active' ? 'SIDIK AKTIF' : 'SELESAI'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => onSelectCase(item)}
                          className="btn btn-secondary btn-sm"
                          title="Lihat Dossier Lengkap"
                        >
                          <Eye size={13} />
                          <span>Detail</span>
                        </button>

                        <button
                          onClick={() => setCaseToEdit(item)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Data Berkas Perkara"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onGenerateDocForCase(item)}
                          className="btn btn-primary btn-sm"
                          title="Buat Dokumen Mindik"
                        >
                          <FileSignature size={13} />
                          <span>Mindik</span>
                        </button>

                        {/* HANYA BISA DILAKUKAN OLEH SUPER ADMIN & ADMIN */}
                        {canDeleteCase && (
                          <button
                            onClick={() => setCaseToDelete(item)}
                            className="btn btn-danger btn-sm"
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
        <div className="modal-backdrop" onClick={() => setCaseToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '480px', borderColor: 'var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertTriangle size={18} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--accent-red)' }}>
                    Hapus Berkas Perkara Pidana
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Otoritas Super Admin & Admin Satreskrim
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setCaseToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menghapus berkas perkara ini secara permanen dari database Supabase?
              </p>

              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '12.5px' }}>
                  {caseToDelete.no_lp}
                </div>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>
                  {caseToDelete.tindak_pidana}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Terlapor: {caseToDelete.person?.nama || caseToDelete.terlapor_name} • Pelapor: {caseToDelete.pelapor_name}
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--accent-red)', marginTop: '10px', marginBottom: 0 }}>
                * Perhatian: Seluruh histori dokumen administrasi penyidikan terkait perkara ini juga akan dibersihkan.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setCaseToDelete(null)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isDeleting}
                onClick={confirmDeleteCase}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
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
