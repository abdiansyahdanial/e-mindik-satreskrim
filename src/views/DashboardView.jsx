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

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Greeting Banner */}
      <div style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 11, 24, 0.8) 100%)',
        border: '1px solid var(--border-glass-hover)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--glow-cyan)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-cyan">SISTEM INFORMASI E-MINDIK RESKRIM</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Wilayah Hukum Polres Kolaka Timur</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
            Pusat Komando Administrasi Penyidikan Perkara
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Otomatisasi penyusunan dokumen Sprin Sidik, SPDP, Sprin Kap, Sprin Han, dan BAP sesuai standar Presisi Polri.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNewCase} className="btn btn-secondary">
            <PlusCircle size={16} />
            <span>+ Registrasi LP Baru</span>
          </button>
          <button onClick={() => onOpenGenerator(null)} className="btn btn-primary">
            <FileSignature size={16} />
            <span>⚡ Mulai Buat Dokumen</span>
          </button>
        </div>
      </div>

      {/* Cyber Tactical Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
      }}>
        {/* Card 1: Active Cases */}
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Perkara Aktif
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-cyan-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FolderLock size={18} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {activeCasesCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--accent-green)' }}>+1 perkara baru</span> minggu ini
          </div>
        </div>

        {/* Card 2: Generated Documents */}
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Dokumen Diterbitkan
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-blue-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={18} color="#60A5FA" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#60A5FA' }}>
            {docsCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Surat Perintah & Berita Acara
          </div>
        </div>

        {/* Card 3: Detained Suspects */}
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tahanan Rutan
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-red-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={18} color="#F87171" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F87171' }}>
            {detainedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Sprin Han Aktif di Rutan Polres
          </div>
        </div>

        {/* Card 4: Investigators Ready */}
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Personel Siaga
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-green-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={18} color="var(--accent-green)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-green)' }}>
            12
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Penyidik & Penyidik Pembantu
          </div>
        </div>
      </div>

      {/* Grid: Berkas Perkara Terkini & Dokumen Terbaru */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '20px',
      }}>
        {/* Left: Recent Cases */}
        <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderLock size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Berkas Perkara Terbaru
              </h3>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
              {cases.length} Perkara
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cases.slice(0, 4).map((c) => {
              const leadInv = c.investigators?.[0] ? getPersonnelById(c.investigators[0].user_id) : null;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {c.no_lp.split('/')[2] ? `LP/B/${c.no_lp.split('/')[2]}` : c.no_lp}
                      </span>
                      <span className="badge badge-green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.tindak_pidana} • {c.person?.nama || c.terlapor_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Penyidik: {leadInv ? `${leadInv.pangkat} ${leadInv.nama.split(' ')[0]}` : 'Belum Ditunjuk'}
                    </div>
                  </div>

                  <ArrowUpRight size={16} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recent Generated Documents */}
        <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#60A5FA" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Dokumen Mindik Terakhir
              </h3>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '11px' }}>
              {documents.length} Berkas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.slice(0, 4).map((doc) => {
              const relatedCase = cases.find(c => c.id === doc.case_id);
              return (
                <div
                  key={doc.id}
                  onClick={() => onViewDoc(doc)}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#60A5FA';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span className="badge badge-blue mono" style={{ fontSize: '10px' }}>
                        {doc.template_code}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {doc.created_at}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {doc.doc_title}
                    </div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                      {doc.doc_number || 'Tanpa Nomor'}
                    </div>
                  </div>

                  <ArrowUpRight size={16} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
