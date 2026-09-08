import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  ChevronRight, 
  Cloud, 
  Download, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { mockTemplates } from '../data/mockTemplates';
import { mockPersonnel } from '../data/mockPersonnel';
import { supabase } from '../supabaseClient';
import OfficialDocPreview from '../components/OfficialDocPreview';
import { generateAndDownloadDocx } from '../services/mindikGenerator';

export default function DocGeneratorView({ 
  cases = [], 
  personnel = [],
  initialCase = null, 
  initialTemplate = null,
  onSaveDocument,
  onOpenTemplateStudio,
  userRole = 'admin'
}) {
  const [allTemplates, setAllTemplates] = useState(mockTemplates);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCase ? initialCase.id : (cases[0]?.id || ''));
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? initialTemplate.code : 'SPRIN_SIDIK'
  );
  const [formValues, setFormValues] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorNotice, setGeneratorNotice] = useState(null);

  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;

  // 1. Fetch templates real-time from Supabase
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Merge Supabase templates with mockTemplates (preferring Supabase ones)
        const merged = [...data];
        mockTemplates.forEach(mt => {
          if (!merged.some(st => st.code === mt.code)) {
            merged.push(mt);
          }
        });
        setAllTemplates(merged);
      }
    } catch (err) {
      console.warn('Could not fetch supabase templates:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const currentCase = cases.find(c => c.id === selectedCaseId) || cases[0];
  const currentTemplate = allTemplates.find(t => t.code === selectedTemplateCode) || allTemplates[0] || mockTemplates[0];

  // Initialize or re-fill form defaults when case or template changes
  useEffect(() => {
    if (!currentTemplate || !currentCase) return;

    const initial = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const romanMonth = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
    const year = new Date().getFullYear();
    const randomNo = Math.floor(Math.random() * 80 + 10);

    const fields = Array.isArray(currentTemplate.dynamic_fields) ? currentTemplate.dynamic_fields : [];

    fields.forEach((field) => {
      const cleanKey = field.key.trim();
      if (cleanKey === 'DOC_DATE') {
        initial[field.key] = todayStr;
      } else if (cleanKey === 'DOC_LOCATION') {
        initial[field.key] = 'Tirawuta';
      } else if (cleanKey === 'DOC_VALIDITY') {
        initial[field.key] = currentTemplate.code === 'SPRIN_HAN' ? '20 (dua puluh) hari' : '30 (tiga puluh) hari';
      } else if (cleanKey === 'DOC_SIGNER_ATASAN_NAME') {
        initial[field.key] = activePersonnel.find(p => p.role === 'Kasat')?.id || 'usr-001';
      } else if (cleanKey === 'DOC_SIGNER_KANIT_NAME') {
        initial[field.key] = activePersonnel.find(p => p.role === 'Kanit')?.id || 'usr-003';
      } else if (cleanKey === 'DOC_PJ_NAME') {
        initial[field.key] = currentCase.investigators?.[0]?.user_id || 'usr-005';
      } else if (cleanKey === 'DOC_PJ_PHONE') {
        initial[field.key] = '081234567894';
      } else if (cleanKey === 'DOC_TARGET') {
        initial[field.key] = 'Kepala Kejaksaan Negeri Kolaka';
      } else if (cleanKey === 'DOC_TARGET_ADDR') {
        initial[field.key] = 'Jl. Dr. Sutomo No. 5, Kolaka';
      } else if (cleanKey === 'DOC_NO' || cleanKey === 'DOC_NO 1') {
        if (currentTemplate.code === 'SPRIN_SIDIK') {
          initial[field.key] = `Sp.Sidik/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code.includes('SPDP')) {
          initial[field.key] = `B/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code === 'SPRIN_KAP') {
          initial[field.key] = `Sp.Kap/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code === 'SPRIN_HAN') {
          initial[field.key] = `Sp.Han/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code.startsWith('BAP')) {
          initial[field.key] = `BAP/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code === 'SP_TAP_TSK') {
          initial[field.key] = `S.Tap/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else if (currentTemplate.code === 'BA_SITA') {
          initial[field.key] = `BA.Sita/${randomNo}/${romanMonth}/${year}/Reskrim`;
        } else {
          initial[field.key] = `DOC/${randomNo}/${romanMonth}/${year}/Reskrim`;
        }
      } else {
        initial[field.key] = field.placeholder || '';
      }
    });

    setFormValues(initial);
    setIsSaved(false);
  }, [selectedCaseId, selectedTemplateCode, currentTemplate]);

  const handleInputChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  // Main Generator action (Pizzip + Docxtemplater + Supabase Storage)
  const handleTriggerGenerate = async () => {
    if (!currentCase || !currentTemplate) return;

    setIsGenerating(true);
    setGeneratorNotice(null);

    try {
      const res = await generateAndDownloadDocx({
        template: currentTemplate,
        caseData: currentCase,
        formValues,
        personnelList: activePersonnel
      });

      // Save record in archive
      handleSave();

      setGeneratorNotice({
        type: 'success',
        message: `File '${res.filename}' berhasil di-render dari Supabase Storage dan diunduh ke komputer Anda!`
      });
    } catch (err) {
      console.error('Generation error:', err);
      setGeneratorNotice({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses file dari Supabase.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!currentCase || !currentTemplate) return;

    const newDoc = {
      id: `doc-${Date.now().toString().slice(-6)}`,
      case_id: currentCase.id,
      template_id: currentTemplate.id,
      template_code: currentTemplate.code,
      doc_title: currentTemplate.title,
      doc_number: formValues.DOC_NO || formValues['DOC_NO 1'] || 'Sp.Doc/01/IX/2026/Reskrim',
      meta_values: { ...formValues },
      created_at: formValues.DOC_DATE || new Date().toISOString().split('T')[0],
    };

    if (onSaveDocument) {
      onSaveDocument(newDoc);
    }
    setIsSaved(true);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSignature size={22} color="var(--accent-cyan)" />
            <span>Studio Generator Administrasi Penyidikan (E-Mindik)</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Render dokumen otomatis dari master fisik Microsoft Word (.docx) di Supabase Storage dengan injeksi data perkara presisi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchTemplates}
            className="btn btn-secondary btn-sm"
            title="Muat ulang template dari Supabase"
          >
            <RefreshCw size={13} />
            <span>Refresh Template Supabase</span>
          </button>
        </div>
      </div>

      {/* Generator Notice */}
      {generatorNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: generatorNotice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${generatorNotice.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '13px',
          animation: 'slideInRight 200ms ease-out',
        }}>
          {generatorNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={18} color="var(--accent-red)" />
          )}
          <span>{generatorNotice.message}</span>
        </div>
      )}

      {/* Split Screen Studio: Form Editor (Left) & Live Preview (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 440px) 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left: Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Select Case */}
          <div className="glass" style={{ padding: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 5px' }}>1</span>
              <span>PILIH BERKAS PERKARA (LP)</span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="form-select"
              style={{ marginTop: '8px' }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.no_lp} — {c.tindak_pidana} ({c.terlapor_name})
                </option>
              ))}
            </select>

            {currentCase && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div><strong>Pasal:</strong> {currentCase.pasal_uu}</div>
                <div><strong>Pelapor:</strong> {currentCase.pelapor_name}</div>
                <div><strong>Terlapor:</strong> {currentCase.person?.nama || currentCase.terlapor_name}</div>
                <div><strong>Locus:</strong> {currentCase.locus}</div>
              </div>
            )}
          </div>

          {/* Step 2: Select Template */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 5px' }}>2</span>
                <span>PILIH FORMAT DOKUMEN MINDIK</span>
              </label>
              {onOpenTemplateStudio && userRole === 'super_admin' && (
                <button
                  type="button"
                  onClick={onOpenTemplateStudio}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                  title="Buka Admin Template Studio untuk upload .docx baru ke Supabase Storage"
                >
                  + Upload .docx
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '2px' }}>
              {allTemplates.map((t) => {
                const isSelected = selectedTemplateCode === t.code;
                const isCloud = Boolean(t.file_path);
                return (
                  <div
                    key={t.id || t.code}
                    onClick={() => setSelectedTemplateCode(t.code)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(0, 212, 255, 0.14)' : 'var(--bg-secondary)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`badge ${t.category === 'SURAT PERINTAH' ? 'badge-red' : t.category === 'SURAT' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '9px' }}>
                          {t.code}
                        </span>
                        {isCloud && (
                          <span className="badge badge-purple" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Cloud size={10} />
                            <span>SUPABASE STORAGE</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#FFF' : 'var(--text-primary)', marginTop: '4px' }}>
                        {t.title}
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={16} color="var(--accent-cyan)" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Dynamic Variables Form */}
          <div className="glass" style={{ padding: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 5px' }}>3</span>
              <span>PARAMETER & VARIABEL DOKUMEN</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(Array.isArray(currentTemplate?.dynamic_fields) ? currentTemplate.dynamic_fields : []).map((field) => {
                return (
                  <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      {field.label || field.key} {field.required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                    </label>

                    {field.type === 'select_personnel' ? (
                      <select
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="form-select"
                      >
                        {activePersonnel
                          .filter(p => !field.role_filter || p.role === field.role_filter)
                          .map((p) => (
                            <option key={p.id || p.nrp} value={p.id}>
                              {p.pangkat} {p.nama} ({p.jabatan})
                            </option>
                          ))}
                      </select>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="form-input mono"
                      />
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="form-textarea"
                        placeholder={field.placeholder || ''}
                      />
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="form-input mono"
                        placeholder={field.placeholder || ''}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Primary Action Button to Generate Real .docx */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleTriggerGenerate}
              className="btn btn-primary"
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: 'var(--glow-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-pulse" />
                  <span>Mengambil Template & Merender File .docx...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Generate Dokumen Resmi (.docx) dari Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Live Interactive Document Sheet */}
        <div>
          <OfficialDocPreview
            selectedCase={currentCase}
            template={currentTemplate}
            formValues={formValues}
            personnel={activePersonnel}
            onSaveArchive={handleSave}
            isSaved={isSaved}
          />
        </div>
      </div>
    </div>
  );
}
