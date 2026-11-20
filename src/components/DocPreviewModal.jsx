import React, { useState, useEffect } from 'react';
import { X, Printer, RefreshCw } from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';
import OfficialDocPreview from './OfficialDocPreview';
import { supabase } from '../supabaseClient';

function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function DocPreviewModal({ docItem, cases = [], onClose }) {
  const [previewProps, setPreviewProps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchArchiveData() {
      if (!docItem) return;
      setIsLoading(true);

      // 1. Ekstrak Metadata Form secara aman (mendukung objek maupun string JSON dari metadata / meta_values / form_values)
      const metaFromMetadata = safeParseJson(docItem.metadata, {});
      const metaFromMetaValues = safeParseJson(docItem.meta_values, {});
      const metaFromFormValues = safeParseJson(docItem.form_values, {});
      const safeMetadata = {
        ...metaFromFormValues,
        ...metaFromMetaValues,
        ...metaFromMetadata
      };

      // 2. Ekstrak Case Data Base dengan fallback lengkap
      const safeCase = safeParseJson(docItem.case_data, null);
      const foundCase = cases.find(c => String(c.id) === String(docItem.case_id));
      let relatedCase = foundCase
        ? { ...foundCase }
        : (safeCase && Object.keys(safeCase).length > 0
            ? { ...safeCase }
            : {
                id: docItem.case_id || 'archive-case',
                nomor_lp: safeMetadata.NOMOR_LP || safeMetadata.nomor_lp || docItem.nomor_lp || '-',
                tanggal_lp: safeMetadata.TANGGAL_LP || safeMetadata.tanggal_lp || safeMetadata.TGL_LP || '',
                tindak_pidana: safeMetadata.TINDAK_PIDANA || safeMetadata.tindak_pidana || docItem.tindak_pidana || '',
                pasal: safeMetadata.PASAL || safeMetadata.pasal || '',
                locus: safeMetadata.TEMPAT_KEJADIAN || safeMetadata.locus || '',
                tempus: safeMetadata.WAKTU_KEJADIAN || safeMetadata.tempus || '',
                no_sprin_sidik: safeMetadata.NO_SPRIN_SIDIK || safeMetadata.no_sprin_sidik || '',
                tgl_sprin_sidik: safeMetadata.TGL_SPRIN_SIDIK || safeMetadata.tgl_sprin_sidik || '',
                no_sprin_gas_sidik: safeMetadata.NO_SPRIN_GAS_SIDIK || safeMetadata.no_sprin_gas_sidik || '',
                tgl_sprin_gas_sidik: safeMetadata.TGL_SPRIN_GAS_SIDIK || safeMetadata.tgl_sprin_gas_sidik || ''
              });

      // 3. Sinkronisasi Data Tersangka dengan Fallback
      let suspectsList = [];
      const safeSuspectData = safeParseJson(docItem.suspect_data, null);

      if (Array.isArray(safeSuspectData) && safeSuspectData.length > 0) {
        suspectsList = safeSuspectData;
      } else if (safeSuspectData && typeof safeSuspectData === 'object' && Object.keys(safeSuspectData).length > 0) {
        suspectsList = [safeSuspectData];
      }

      // Auto-fetch dari tabel case_suspects jika arsip hanya menyimpan 0/1 tersangka
      const targetCaseId = docItem.case_id || relatedCase?.id;
      if (targetCaseId && targetCaseId !== 'archive-case' && suspectsList.length <= 1) {
        try {
          const { data: dbSuspects, error } = await supabase
            .from('case_suspects')
            .select('*')
            .eq('case_id', targetCaseId)
            .order('created_at', { ascending: true });

          if (!error && Array.isArray(dbSuspects) && dbSuspects.length > 0) {
            suspectsList = dbSuspects;
            relatedCase.suspects = dbSuspects;
            relatedCase.suspectsList = dbSuspects;
          }
        } catch (err) {
          console.warn('Gagal auto-sync data tersangka dari database:', err);
        }
      }

      // Fallback ke relatedCase jika dbSuspects kosong
      if (suspectsList.length <= 1 && relatedCase) {
        if (Array.isArray(relatedCase.suspectsList) && relatedCase.suspectsList.length > 0) {
          suspectsList = relatedCase.suspectsList;
        } else if (Array.isArray(relatedCase.suspects) && relatedCase.suspects.length > 0) {
          suspectsList = relatedCase.suspects;
        }
      }

      // Fallback terakhir dari metadata form
      if (suspectsList.length === 0) {
        suspectsList = [{
          nama: safeMetadata.NAMA_TERSANGKA || safeMetadata.nama_tersangka || safeMetadata.TERLAPOR_NAMA || '-',
          nik: safeMetadata.NIK_TERSANGKA || safeMetadata.NIK || '',
          jenis_kelamin: safeMetadata.JK_TERSANGKA || safeMetadata.jenis_kelamin || '',
          tempat_lahir: safeMetadata.TEMPAT_LAHIR_TERSANGKA || '',
          tgl_lahir: safeMetadata.TGL_LAHIR_TERSANGKA || '',
          umur: safeMetadata.UMUR_TERSANGKA || '',
          pekerjaan: safeMetadata.PEKERJAAN_TERSANGKA || '',
          agama: safeMetadata.AGAMA_TERSANGKA || '',
          alamat: safeMetadata.ALAMAT_TERSANGKA || '',
          nomor_sp_tap: safeMetadata.NO_SP_TAP_TSK || safeMetadata.nomor_sp_tap || '',
          tanggal_sp_tap: safeMetadata.TGL_SP_TAP_TSK || safeMetadata.tanggal_sp_tap || ''
        }];
      }

      const activeSuspect = suspectsList[0] || {};

      // 4. Konstruksi Final Payload Form Values
      const docNo = docItem.doc_number || docItem.document_number || docItem.nomor_surat || safeMetadata.NOMOR_SURAT || safeMetadata.DOC_NO || '';
      const docDate = docItem.tgl_surat || docItem.doc_date || docItem.tanggal_surat || docItem.created_at || safeMetadata.TANGGAL_SURAT || safeMetadata.DOC_DATE || '';
      const finalFormValues = {
        ...safeMetadata,
        DOC_NO: docNo,
        NOMOR_SURAT: safeMetadata.NOMOR_SURAT || docNo,
        DOC_DATE: docDate,
        TANGGAL_SURAT: safeMetadata.TANGGAL_SURAT || docDate
      };

      // 5. Ambil Template Asli dari Supabase document_templates
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
        {
          code: docItem.template_code || 'MINDIK',
          title: docItem.doc_title || docItem.template_code || 'Dokumen Mindik',
          file_path: docItem.file_path || `${docItem.template_code}.docx`
        };

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

    return () => {
      isMounted = false;
    };
  }, [docItem?.id]);

  if (!docItem) return null;

  const handlePrintModal = () => {
    document.body.classList.add('printing-mindik-docx');
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '960px', width: '95%', background: '#11161F', border: '1px solid rgba(148, 163, 184, 0.22)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header no-print" style={{ background: '#10151E', borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <div>
            <span
              className="badge mono"
              style={{
                fontSize: '10px',
                background: '#FFFFFF',
                color: '#0B0E14',
                border: '1px solid #FFFFFF',
                borderRadius: '9999px',
                fontWeight: 800,
              }}
            >
              {docItem.template_code}
            </span>
            <h3 className="heading-font" style={{ fontSize: '16px', margin: '6px 0 0' }}>{docItem.doc_title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ background: '#0B0E14', position: 'relative', padding: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#FFFFFF' }}>
              <RefreshCw className="animate-spin" size={32} color="#FF2A2A" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#CBD5E1' }}>Sinkronisasi Data Master Perkara...</div>
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
        <div className="modal-footer no-print" style={{ background: '#10151E', borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Tutup</button>
          <button onClick={handlePrintModal} className="btn btn-primary btn-sm" disabled={isLoading || !previewProps}>
            <Printer size={14} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
