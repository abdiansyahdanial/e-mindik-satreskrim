import React from 'react';
import { X, Printer } from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';
import OfficialDocPreview from './OfficialDocPreview';

export default function DocPreviewModal({ docItem, cases = [], onClose }) {
  if (!docItem) return null;

  const relatedCase = cases.find(c => c.id === docItem.case_id);
  const template = mockTemplates.find(t => t.id === docItem.template_id || t.code === docItem.template_code) || mockTemplates[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '880px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="badge badge-blue mono" style={{ fontSize: '10px' }}>
              {docItem.template_code}
            </span>
            <h3 style={{ fontSize: '16px', margin: '4px 0 0' }}>
              {docItem.doc_title}
            </h3>
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

        <div className="modal-body" style={{ background: '#080E1E' }}>
          {(() => {
            // 1. Pengamanan mutlak ekstrak metadata: Cegah JSON String yang merusak struktur
            const rawMeta = docItem.metadata || docItem.meta_values || {};
            let safeMetadata = {};
            try {
              safeMetadata = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
            } catch (e) {
              console.warn('Gagal mem-parsing metadata arsip:', e);
            }

            // 2. Render komponen dengan data yang sudah bersih dan utuh
            return (
              <OfficialDocPreview
                selectedCase={relatedCase || {
                  id: docItem.case_id,
                  ...(docItem.case_data || {})
                }}
                template={template || docItem.template || {}}
                formValues={{
                  NOMOR_SURAT: docItem.document_number || docItem.doc_number || docItem.nomor_surat || '-',
                  NO_SURAT: docItem.document_number || docItem.doc_number || docItem.nomor_surat || '-',
                  TANGGAL_SURAT: docItem.doc_date || docItem.document_date || docItem.tanggal_surat || docItem.created_at || '-',
                  ...safeMetadata
                }}
                isSaved={true}
              />
            );
          })()}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Tutup
          </button>
          <button onClick={() => window.print()} className="btn btn-primary btn-sm">
            <Printer size={14} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
