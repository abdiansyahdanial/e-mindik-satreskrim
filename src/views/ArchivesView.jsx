import React, { useState } from 'react';
import { 
  Archive, 
  Search, 
  Eye,
  FileText,
  FolderOpen
} from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';

export default function ArchivesView({ documents = [], cases = [], onPreviewDoc }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const safeDocs = Array.isArray(documents) ? documents : [];
  const safeCases = Array.isArray(cases) ? cases : [];

  const filteredDocs = safeDocs.filter((doc) => {
    if (!doc) return false;
    try {
      const template = mockTemplates.find(
        (t) => t.id === doc.template_id || t.code === (doc.template_code || doc.code)
      );
      const relatedCase = safeCases.find((c) => c.id === doc.case_id);

      const docTitle = String(doc.doc_title || doc.title || '').toLowerCase();
      const docNumber = String(doc.doc_number || doc.nomor_surat || '').toLowerCase();
      const caseNo = String(relatedCase?.nomor_lp || relatedCase?.no_lp || '').toLowerCase();
      const caseTsk = String(
        relatedCase?.nama_terlapor || 
        relatedCase?.terlapor_name || 
        relatedCase?.person?.nama || 
        ''
      ).toLowerCase();
      const query = (searchTerm || '').trim().toLowerCase();

      const matchesSearch = !query || 
        docTitle.includes(query) || 
        docNumber.includes(query) || 
        caseNo.includes(query) || 
        caseTsk.includes(query);

      const docCat = template?.category || doc.category;
      const matchesCategory = categoryFilter === 'all' || docCat === categoryFilter;

      return matchesSearch && matchesCategory;
    } catch (err) {
      console.warn('Filter archive document error:', err);
      return false;
    }
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Title */}
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

      {/* Documents Table */}
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
                <td colSpan="6" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <FolderOpen size={40} color="var(--accent-cyan)" style={{ opacity: 0.6 }} />
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      Belum Ada Arsip Dokumen
                    </div>
                    <p style={{ fontSize: '12px', margin: 0, maxWidth: '380px', lineHeight: 1.4 }}>
                      Dokumen administrasi penyidikan yang digenerate akan otomatis tercatat dan tersimpan di sini.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc, idx) => {
                const relatedCase = safeCases.find((c) => c.id === doc?.case_id);
                const displayDate = doc?.created_at
                  ? (String(doc.created_at).includes('T')
                      ? new Date(doc.created_at).toLocaleDateString('id-ID')
                      : doc.created_at)
                  : '-';

                return (
                  <tr key={doc?.id || `doc-${idx}`}>
                    <td>
                      <span className="badge badge-cyan mono">
                        {doc?.template_code || doc?.code || 'MINDIK'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {doc?.doc_title || doc?.title || 'Dokumen Administrasi Penyidikan'}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                        {doc?.doc_number || doc?.nomor_surat || '-'}
                      </span>
                    </td>
                    <td>
                      {relatedCase ? (
                        <div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                            {relatedCase.nomor_lp || relatedCase.no_lp || '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {relatedCase.tindak_pidana || '-'} ({relatedCase.nama_terlapor || relatedCase.terlapor_name || relatedCase.person?.nama || '-'})
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {displayDate}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onPreviewDoc && onPreviewDoc(doc)}
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
