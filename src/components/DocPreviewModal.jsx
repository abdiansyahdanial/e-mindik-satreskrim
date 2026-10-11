import React, { useState, useEffect } from 'react';
import { X, Printer, RefreshCw } from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';
import OfficialDocPreview from './OfficialDocPreview';
import { supabase } from '../supabaseClient';

export default function DocPreviewModal({ docItem, cases = [], onClose }) {
  const [previewProps, setPreviewProps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchArchiveData() {
      if (!docItem) return;
      setIsLoading(true);

      // 1. Ekstrak Metadata Form
      const rawMeta = docItem.metadata || docItem.meta_values || {};
      let safeMetadata = {};
      try {
        safeMetadata = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
      } catch (e) {}

      // 2. Ekstrak Case Data Base
      let safeCase = null;
      try {
        safeCase = typeof docItem.case_data === 'string' ? JSON.parse(docItem.case_data) : docItem.case_data;
      } catch (e) {}
      
      let relatedCase = cases.find(c => c.id === docItem.case_id) || safeCase || { 
        nomor_lp: safeMetadata.NOMOR_LP || safeMetadata.nomor_lp || '-' 
      };

      // 3. PERUBAHAN POLA: DATA TERSANGKA (Sinkronisasi dengan Generator)
      let suspectsList = [];
      let safeSuspectData = null;
      try {
        safeSuspectData = typeof docItem.suspect_data === 'string' ? JSON.parse(docItem.suspect_data) : docItem.suspect_data;
      } catch (e) {}

      if (Array.isArray(safeSuspectData) && safeSuspectData.length > 0) {
        suspectsList = safeSuspectData;
      } else if (safeSuspectData && typeof safeSuspectData === 'object' && Object.keys(safeSuspectData).length > 0) {
        suspectsList = [safeSuspectData];
      }

      // === THE GAME CHANGER: AUTO-FETCH DARI DATABASE ===
      // Jika suspect_data kosong/cuma 1 (arsip lama), kita TARIK LANGSUNG dari tabel case_suspects!
      const targetCaseId = docItem.case_id || relatedCase?.id;
      if (targetCaseId && suspectsList.length <= 1) {
        try {
          const { data: dbSuspects, error } = await supabase
            .from('case_suspects') 
            .select('*')
            .eq('case_id', targetCaseId)
            .order('created_at', { ascending: true }); // Mengurutkan TSK 1, 2, 3..

          if (!error && dbSuspects && dbSuspects.length > 0) {
            // Berhasil mengambil data fresh, overwrite suspectsList!
            suspectsList = dbSuspects;
            // Tempelkan juga ke relatedCase agar terbaca oleh mindikGenerator
            relatedCase.suspects = dbSuspects;
            relatedCase.suspectsList = dbSuspects;
          }
        } catch (err) {
          console.warn("Gagal auto-sync data tersangka dari database:", err);
        }
      }

      // Fallback ke relatedCase jika dbSuspects kosong
      if (suspectsList.length <= 1 && relatedCase) {
        if (Array.isArray(relatedCase.suspectsList) && relatedCase.suspectsList.length > 1) {
          suspectsList = relatedCase.suspectsList;
        } else if (Array.isArray(relatedCase.suspects) && relatedCase.suspects.length > 1) {
          suspectsList = relatedCase.suspects;
        }
      }

      // Fallback terakhir jika kasus ini memang belum punya data tersangka di database
      if (suspectsList.length === 0) {
        suspectsList = [{ 
           nama: safeMetadata.NAMA_TERSANGKA || safeMetadata.nama_tersangka || '-',
           nik: safeMetadata.NIK_TERSANGKA || safeMetadata.NIK || ''
        }];
      }

      const activeSuspect = suspectsList[0] || {};

      // 4. Konstruksi Final Payload
      const finalFormValues = {
        DOC_NO: docItem.doc_number || docItem.document_number || docItem.nomor_surat,
        DOC_DATE: docItem.created_at || docItem.doc_date || docItem.tanggal_surat,
        ...safeMetadata
      };

      // 5. Ambil Template Asli dari Supabase document_templates (Cegah 400 Bad Request)
      let fetchedTemplate = null;
      try {
        if (docItem.template_id) {
          const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('id', docItem.template_id)
            .single();
            
          if (!error && data) {
            fetchedTemplate = data;
          }
        }

        if (!fetchedTemplate && docItem.template_code) {
          const { data, error } = await supabase
            .from('document_templates')
            .select('*')
            .eq('code', docItem.template_code)
            .limit(1);
            
          if (!error && data && data.length > 0) {
            fetchedTemplate = data[0];
          }
        }
      } catch (err) {
        console.error('Gagal mengambil template dari Supabase:', err);
      }

      const template = fetchedTemplate || 
                       mockTemplates.find(t => t.id === docItem.template_id || t.code === docItem.template_code) || 
                       { code: docItem.template_code, title: docItem.doc_title, file_path: docItem.file_path || `${docItem.template_code}.docx` };

      if (isMounted) {
        setPreviewProps({
          template,
          formValues: finalFormValues,
          selectedCase: relatedCase,
          activeSuspect,
          suspectsList,
          personnelList: [] 
        });
        setIsLoading(false);
      }
    }

    fetchArchiveData();

    return () => { isMounted = false; };
  }, [docItem?.id]);

  if (!docItem) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
         {/* Header */}
         <div className="modal-header">
            <div>
               <span className="badge badge-blue mono" style={{ fontSize: '10px' }}>{docItem.template_code}</span>
               <h3 style={{ fontSize: '16px', margin: '4px 0 0' }}>{docItem.doc_title}</h3>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}>
               <X size={20} />
            </button>
         </div>

         {/* Body */}
         <div className="modal-body" style={{ background: '#080E1E', position: 'relative' }}>
            {isLoading ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#f1f5f9' }}>
                  <RefreshCw className="animate-spin" size={32} color="#3b82f6" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Sinkronisasi Data Master Perkara...</div>
               </div>
            ) : previewProps ? (
               <OfficialDocPreview 
                 activeSuspect={previewProps.activeSuspect} 
                 formValues={previewProps.formValues} 
                 isSaved={true} 
                 personnelList={previewProps.personnelList} 
                 selectedCase={previewProps.selectedCase} 
                 suspectsList={previewProps.suspectsList} 
                 template={previewProps.template}
               />
            ) : null}
         </div>

         {/* Footer */}
         <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary btn-sm">Tutup</button>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm" disabled={isLoading || !previewProps}>
               <Printer size={14} />
               <span>Cetak Dokumen</span>
            </button>
         </div>
      </div>
    </div>
  );
}
