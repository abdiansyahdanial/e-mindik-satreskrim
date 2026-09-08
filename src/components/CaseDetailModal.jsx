import React from 'react';
import { 
  X, 
  ShieldAlert, 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  FileSignature
} from 'lucide-react';
import { getPersonnelById } from '../data/mockPersonnel';

export default function CaseDetailModal({ 
  caseItem, 
  onClose, 
  onGenerateDocForCase, 
  caseDocuments = [] 
}) {
  if (!caseItem) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '860px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan">{caseItem.status.toUpperCase()}</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {caseItem.no_lp}
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>
                {caseItem.tindak_pidana} ({caseItem.pasal_uu})
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Locus & Tempus Info Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={16} color="var(--accent-cyan)" style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Tempat Kejadian (Locus Delicti)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {caseItem.locus}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Calendar size={16} color="var(--accent-cyan)" style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Waktu Kejadian (Tempus Delicti)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {caseItem.tempus}
                </div>
              </div>
            </div>
          </div>

          {/* Parties Involved: Pelapor & Terlapor */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Pelapor */}
            <div style={{
              padding: '16px',
              background: 'rgba(19, 29, 53, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={16} color="#60A5FA" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                  Pelapor / Korban
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                {caseItem.pelapor_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Status: Saksi Pelapor Utama
              </div>
            </div>

            {/* Terlapor / Tersangka */}
            <div style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldAlert size={16} color="#F87171" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#F87171', textTransform: 'uppercase' }}>
                  Terlapor / Tersangka
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                {caseItem.person?.nama || caseItem.terlapor_name}
              </div>
              {caseItem.person && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>NIK: <span className="mono">{caseItem.person.nik}</span></div>
                  <div>TTL: {caseItem.person.pob_dob} ({caseItem.person.umur})</div>
                  <div>Alamat: {caseItem.person.alamat}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tim Penyidik Ditugaskan */}
          <div style={{
            padding: '16px',
            background: 'rgba(19, 29, 53, 0.4)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={16} color="var(--accent-green)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase' }}>
                Penyidik Penanggung Jawab
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {caseItem.investigators?.map((inv, idx) => {
                const person = getPersonnelById(inv.user_id);
                if (!person) return null;
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span className="badge badge-green" style={{ fontSize: '10px' }}>
                      Penyidik {inv.role_order}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {person.nama}
                    </span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({person.pangkat})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat Dokumen Mindik Terkait */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Dokumen Administrasi Penyidikan ({caseDocuments.length})
              </div>
              <button
                onClick={() => {
                  onClose();
                  onGenerateDocForCase(caseItem);
                }}
                className="btn btn-primary btn-sm"
              >
                <FileSignature size={14} />
                <span>+ Buat Dokumen untuk Perkara Ini</span>
              </button>
            </div>

            {caseDocuments.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}>
                Belum ada dokumen yang digenerate untuk perkara ini.
              </div>
            ) : (
              <div className="table-container">
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama Dokumen</th>
                      <th>Nomor Surat</th>
                      <th>Tanggal Dikeluarkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <span className="badge badge-cyan mono">{doc.template_code}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{doc.doc_title}</td>
                        <td className="mono">{doc.doc_number || '-'}</td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {doc.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Tutup
          </button>
          <button 
            onClick={() => {
              onClose();
              onGenerateDocForCase(caseItem);
            }} 
            className="btn btn-primary btn-sm"
          >
            <FileSignature size={14} />
            <span>Generate Mindik Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
