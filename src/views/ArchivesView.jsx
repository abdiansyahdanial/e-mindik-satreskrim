import React, { useState } from 'react';
import { 
  Archive, 
  Search, 
  Eye
} from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';

export default function ArchivesView({ documents = [], cases = [], onPreviewDoc }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredDocs = documents.filter((doc) => {
    const template = mockTemplates.find(t => t.id === doc.template_id || t.code === doc.template_code);
    const relatedCase = cases.find(c => c.id === doc.case_id);

    const matchesSearch = 
      doc.doc_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.doc_number && doc.doc_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (relatedCase && relatedCase.no_lp.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (relatedCase && relatedCase.terlapor_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = 
      categoryFilter === 'all' || 
      (template && template.category === categoryFilter);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Archive size={22} color="var(--accent-cyan)" />
            <span>Arsip Digital Berkas Administrasi Penyidikan</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Repositori dokumen resmi kepolisian yang telah diterbitkan dan tersimpan dalam sistem.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
      }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Cari Judul Dokumen, Nomor Surat, atau No. LP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kategori:</span>
          {['all', 'SURAT PERINTAH', 'SURAT', 'BERITA ACARA'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
            >
              {cat === 'all' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="tactical-table">
          <thead>
            <tr>
              <th>Kode & Kategori</th>
              <th>Judul Dokumen</th>
              <th>Nomor Surat</th>
              <th>Perkara Terkait (LP)</th>
              <th>Tanggal Terbit</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  Tidak ada arsip dokumen yang sesuai.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const relatedCase = cases.find(c => c.id === doc.case_id);
                return (
                  <tr key={doc.id}>
                    <td>
                      <span className="badge badge-cyan mono">{doc.template_code}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{doc.doc_title}</div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                        {doc.doc_number || '-'}
                      </span>
                    </td>
                    <td>
                      {relatedCase ? (
                        <div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                            {relatedCase.no_lp}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {relatedCase.tindak_pidana} ({relatedCase.person?.nama || relatedCase.terlapor_name})
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {doc.created_at}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onPreviewDoc(doc)}
                        className="btn btn-secondary btn-sm"
                        title="Buka Pratinjau Dokumen"
                      >
                        <Eye size={14} />
                        <span>Lihat Dokumen</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
