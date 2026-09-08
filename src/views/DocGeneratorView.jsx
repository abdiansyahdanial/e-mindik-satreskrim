import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  ChevronRight, 
  Cloud, 
  Download, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  AlertTriangle,
  Upload
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
  userRole = 'anggota'
}) {
  const isSuperAdmin = userRole === 'super_admin';

  const [allTemplates, setAllTemplates] = useState(mockTemplates);
  const [selectedCaseId, setSelectedCaseId] = useState(initialCase ? initialCase.id : (cases[0]?.id || ''));
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? initialTemplate.code : 'SPRIN_SIDIK'
  );
  const [formValues, setFormValues] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorNotice, setGeneratorNotice] = useState(null);

  // Template Management Modal States (Khusus Super Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);

  // Add Template Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('SURAT PERINTAH');
  const [newDescription, setNewDescription] = useState('');
  const [newDocxFile, setNewDocxFile] = useState(null);

  // Edit Template Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('SURAT PERINTAH');
  const [editDescription, setEditDescription] = useState('');

  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;

  // 1. Fetch templates real-time from Supabase
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
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

    const defaultDocFields = [
      { field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true },
      { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
      { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
      { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
      { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
      { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false },
      { field_key: 'PENYIDIK_NAMA', field_label: 'Nama Penyidik', field_type: 'text', default_value: '', is_required: false },
      { field_key: 'ATASAN_NAMA', field_label: 'Nama Atasan / Kasat', field_type: 'text', default_value: '', is_required: false }
    ];

    const fields = Array.isArray(currentTemplate.dynamic_fields) && currentTemplate.dynamic_fields.length > 0 
      ? currentTemplate.dynamic_fields 
      : defaultDocFields;

    fields.forEach((field) => {
      const rawKey = field.field_key || field.key || '';
      const cleanKey = rawKey.replace(/[{}]/g, '').trim();
      if (!cleanKey) return;

      const upperKey = cleanKey.toUpperCase();
      const defVal = field.default_value !== undefined ? field.default_value : (field.placeholder || '');

      // Determine default value based on standardized dictionary
      if (upperKey === 'TANGGAL_SURAT' || upperKey === 'DOC_DATE') {
        initial[cleanKey] = todayStr;
      } else if (upperKey === 'TEMPAT_SURAT' || upperKey === 'DOC_LOCATION') {
        initial[cleanKey] = defVal || 'Tirawuta';
      } else if (upperKey === 'MASA_BERLAKU' || upperKey === 'DOC_VALIDITY') {
        initial[cleanKey] = defVal || '30 (tiga puluh) hari';
      } else if (upperKey === 'TUJUAN_SURAT' || upperKey === 'DOC_TARGET') {
        initial[cleanKey] = defVal || 'Kepala Kejaksaan Negeri Kolaka';
      } else if (upperKey === 'ALAMAT_TUJUAN' || upperKey === 'DOC_TARGET_ADDR') {
        initial[cleanKey] = defVal || 'Jl. Dr. Sutomo No. 5, Kolaka';
      } else if (upperKey === 'PENYIDIK_NAMA') {
        initial[cleanKey] = currentCase.penyidik_1_nama || defVal || '';
      } else if (upperKey === 'ATASAN_NAMA') {
        initial[cleanKey] = currentCase.kasat_nama || defVal || '';
      } else if (field.field_type === 'select_personnel' || field.type === 'select_personnel') {
        const filter = field.role_filter;
        const matched = activePersonnel.find(p => !filter || p.role === filter);
        initial[cleanKey] = matched ? matched.id : '';
      } else {
        initial[cleanKey] = defVal || '';
      }
    });

    setFormValues(prev => {
      // Keep any user-typed inputs for matching keys
      const merged = { ...initial };
      Object.keys(prev || {}).forEach(k => {
        const cleanK = k.replace(/[{}]/g, '').trim();
        if (prev[k] !== undefined && prev[k] !== '') {
          merged[cleanK] = prev[k];
        }
      });
      return merged;
    });
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

  // --- TEMPLATE MANAGEMENT ACTIONS (KHUSUS SUPER ADMIN) ---

  // 1. Tambah Format Template Baru
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      alert('Judul dan Kode Template wajib diisi!');
      return;
    }
    if (!newDocxFile) {
      alert('Silakan pilih file fisik .docx untuk template ini!');
      return;
    }

    setIsProcessingTemplate(true);
    try {
      const cleanFileName = newDocxFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${cleanFileName}`;
      const storageFilePath = `templates/${uniqueFileName}`;

      // Upload to Supabase Storage: try 'templates', fallback to 'docx-templates'
      let uploadSuccess = false;
      let finalFilePath = storageFilePath;

      const { data: uploadData1, error: uploadErr1 } = await supabase.storage
        .from('templates')
        .upload(storageFilePath, newDocxFile, { upsert: true });

      if (!uploadErr1 && uploadData1) {
        uploadSuccess = true;
        finalFilePath = uploadData1.path || storageFilePath;
      } else {
        // Try fallback to 'docx-templates'
        const { data: uploadData2, error: uploadErr2 } = await supabase.storage
          .from('docx-templates')
          .upload(storageFilePath, newDocxFile, { upsert: true });

        if (!uploadErr2 && uploadData2) {
          uploadSuccess = true;
          finalFilePath = uploadData2.path || storageFilePath;
        } else {
          throw new Error(uploadErr2?.message || uploadErr1?.message || 'Gagal mengunggah file ke Supabase Storage');
        }
      }

      // Default dynamic fields (Standard Indonesian)
      const defaultFields = [
        { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true },
        { id: 2, field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
        { id: 3, field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
        { id: 4, field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
        { id: 5, field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
        { id: 6, field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
      ];

      // Save metadata to document_templates with UPSERT to prevent unique constraint conflicts
      const payload = {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        category: newCategory,
        description: newDescription.trim(),
        file_path: finalFilePath,
        dynamic_fields: defaultFields,
        created_at: new Date().toISOString()
      };

      const { data: dbData, error: dbErr } = await supabase
        .from('document_templates')
        .upsert([payload], { onConflict: 'code' })
        .select();

      if (dbErr) throw dbErr;

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${newTitle}' berhasil ditambahkan ke Supabase!`
      });

      // Reset form
      setNewTitle('');
      setNewCode('');
      setNewDescription('');
      setNewDocxFile(null);
      setIsAddModalOpen(false);

      // Refresh list & select newly created template
      await fetchTemplates();
      setSelectedTemplateCode(payload.code);
    } catch (err) {
      console.error('Add template error:', err);
      alert(`Gagal menambah template format: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 2. Edit/Perubahan Format Template
  const handleOpenEdit = (t, e) => {
    e.stopPropagation();
    setTemplateToEdit(t);
    setEditTitle(t.title);
    setEditCategory(t.category || 'SURAT PERINTAH');
    setEditDescription(t.description || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!templateToEdit || !editTitle.trim()) return;

    setIsProcessingTemplate(true);
    try {
      if (templateToEdit.id) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim(),
          })
          .eq('id', templateToEdit.id);

        if (error) throw error;
      }

      // Update in local state
      setAllTemplates(prev => prev.map(t => {
        if (t.code === templateToEdit.code) {
          return {
            ...t,
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim()
          };
        }
        return t;
      }));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${editTitle}' berhasil diperbarui!`
      });

      setTemplateToEdit(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Edit template error:', err);
      alert(`Gagal memperbarui template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 3. Hapus Format Template
  const handleOpenDelete = (t, e) => {
    e.stopPropagation();
    setTemplateToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setIsProcessingTemplate(true);
    try {
      // Remove file from storage if present
      if (templateToDelete.file_path) {
        await supabase.storage.from('templates').remove([templateToDelete.file_path]).catch(() => {});
        await supabase.storage.from('docx-templates').remove([templateToDelete.file_path]).catch(() => {});
      }

      // Remove row from document_templates if in DB
      if (templateToDelete.id) {
        const { error } = await supabase
          .from('document_templates')
          .delete()
          .eq('id', templateToDelete.id);

        if (error) throw error;
      }

      setAllTemplates(prev => prev.filter(t => t.code !== templateToDelete.code));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${templateToDelete.title}' berhasil dihapus dari Supabase!`
      });

      // If the deleted template was selected, fallback to first available
      if (selectedTemplateCode === templateToDelete.code) {
        const remaining = allTemplates.filter(t => t.code !== templateToDelete.code);
        if (remaining.length > 0) {
          setSelectedTemplateCode(remaining[0].code);
        }
      }

      setTemplateToDelete(null);
    } catch (err) {
      console.error('Delete template error:', err);
      alert(`Gagal menghapus format template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
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
            <span>Refresh Template</span>
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

          {/* Step 2: Select Template & Format Management (Khusus Super Admin) */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 5px' }}>2</span>
                <span>PILIH FORMAT DOKUMEN MINDIK</span>
              </label>

              {/* KHUSUS SUPER ADMIN: Tombol Tambah Format */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                  title="Tambah format template baru ke Supabase Storage (Khusus Super Admin)"
                >
                  <Plus size={13} />
                  <span>Tambah Format</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
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
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`badge ${t.category === 'SURAT PERINTAH' ? 'badge-red' : t.category === 'SURAT' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '9px' }}>
                          {t.code}
                        </span>
                        {isCloud && (
                          <span className="badge badge-purple" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Cloud size={10} />
                            <span>SUPABASE .DOCX</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#FFF' : 'var(--text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* KHUSUS SUPER ADMIN: Tombol Edit & Hapus Format */}
                      {isSuperAdmin && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(t, e)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 6px', fontSize: '10px' }}
                            title="Edit judul, kategori, atau deskripsi format template"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(t, e)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '3px 6px', fontSize: '10px' }}
                            title="Hapus format template ini dari Supabase"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      {isSelected && <ChevronRight size={16} color="var(--accent-cyan)" />}
                    </div>
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
              {(Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.length > 0 ? currentTemplate.dynamic_fields : [
                { field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true },
                { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
                { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
                { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
                { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
                { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false },
              ]).map((field, idx) => {
                const fieldKey = (field.field_key || field.key || `FIELD_${idx}`).replace(/[{}]/g, '').trim();
                const fieldLabel = field.field_label || field.label || fieldKey;
                const fieldType = field.field_type || field.type || 'text';
                const isRequired = field.is_required !== undefined ? field.is_required : !!field.required;
                const placeholder = field.default_value !== undefined ? field.default_value : (field.placeholder || '');
                const currentVal = formValues[fieldKey] !== undefined 
                  ? formValues[fieldKey] 
                  : (formValues[fieldKey.toUpperCase()] !== undefined 
                      ? formValues[fieldKey.toUpperCase()] 
                      : (formValues[fieldKey.toLowerCase()] || ''));

                return (
                  <div key={field.id || fieldKey || idx} className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: 0 }}>
                        {fieldLabel} {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                      </label>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
                        {`{${fieldKey}}`}
                      </span>
                    </div>

                    {fieldType === 'select_personnel' ? (
                      <select
                        value={currentVal}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        className="form-select"
                      >
                        <option value="">-- Pilih Personel --</option>
                        {activePersonnel
                          .filter(p => !field.role_filter || p.role === field.role_filter)
                          .map((p) => (
                            <option key={p.id || p.nrp} value={p.nama || p.id}>
                              {p.pangkat} {p.nama} ({p.jabatan || p.role})
                            </option>
                          ))}
                      </select>
                    ) : fieldType === 'select' && Array.isArray(field.options) ? (
                      <select
                        value={currentVal}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        className="form-select"
                      >
                        <option value="">-- Pilih Pilihan --</option>
                        {field.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : fieldType === 'date' ? (
                      <input
                        type="date"
                        value={currentVal}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        className="form-input mono"
                      />
                    ) : fieldType === 'textarea' ? (
                      <textarea
                        value={currentVal}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        className="form-textarea"
                        placeholder={placeholder}
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        className="form-input mono"
                        placeholder={placeholder}
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

      {/* --- MODAL 1: TAMBAH FORMAT TEMPLATE (.DOCX) (KHUSUS SUPER ADMIN) --- */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(0, 212, 255, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Upload size={18} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Tambah Format Template .docx</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Upload file template fisik ke Supabase Storage (bucket templates)
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTemplate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Judul Format */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Judul Format Dokumen <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Surat Perintah Penyitaan"
                    className="form-input"
                    required
                  />
                </div>

                {/* Kode Template & Kategori */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Kode Unik <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: SPRIN_SITA"
                      className="form-input mono"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="form-select"
                    >
                      <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                      <option value="SURAT">SURAT</option>
                      <option value="BERITA ACARA">BERITA ACARA</option>
                      <option value="PENETAPAN">PENETAPAN</option>
                      <option value="LAINNYA">LAINNYA</option>
                    </select>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi Template</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Deskripsi singkat peruntukan format dokumen..."
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>

                {/* File Upload Area */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Pilih File Master Word (.docx) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div 
                    style={{
                      border: '2px dashed var(--border-glass-hover)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                      textAlign: 'center',
                      background: newDocxFile ? 'rgba(0, 212, 255, 0.08)' : 'rgba(13, 21, 38, 0.4)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('new-docx-input').click()}
                  >
                    <input
                      id="new-docx-input"
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewDocxFile(e.target.files[0]);
                        }
                      }}
                    />

                    <FileText size={28} color={newDocxFile ? 'var(--accent-cyan)' : 'var(--text-secondary)'} style={{ margin: '0 auto 6px' }} />
                    {newDocxFile ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFF', fontSize: '12.5px' }}>{newDocxFile.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{(newDocxFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Klik di sini untuk memilih file .docx dari komputer Anda
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <Upload size={14} />
                  <span>{isProcessingTemplate ? 'Mengunggah...' : 'Unggah & Simpan Format'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT FORMAT TEMPLATE (KHUSUS SUPER ADMIN) --- */}
      {templateToEdit && (
        <div className="modal-backdrop" onClick={() => setTemplateToEdit(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '16px', margin: 0 }}>Edit Format Template</h3>
              </div>
              <button 
                onClick={() => setTemplateToEdit(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kode Template (Permanen)</label>
                  <input
                    type="text"
                    value={templateToEdit.code}
                    disabled
                    className="form-input mono"
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Judul Format</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                    <option value="SURAT">SURAT</option>
                    <option value="BERITA ACARA">BERITA ACARA</option>
                    <option value="PENETAPAN">PENETAPAN</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setTemplateToEdit(null)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <span>{isProcessingTemplate ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: KONFIRMASI HAPUS FORMAT (KHUSUS SUPER ADMIN) --- */}
      {templateToDelete && (
        <div className="modal-backdrop" onClick={() => setTemplateToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px', borderColor: 'var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="var(--accent-red)" />
                <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--accent-red)' }}>
                  Hapus Format Template
                </h3>
              </div>
              <button 
                onClick={() => setTemplateToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menghapus format template ini dari Supabase Storage dan database?
              </p>
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontWeight: 700, color: '#FFF' }}>{templateToDelete.title}</div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  Kode: {templateToDelete.code} • Kategori: {templateToDelete.category}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setTemplateToDelete(null)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isProcessingTemplate}
                onClick={handleConfirmDelete}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
                <span>{isProcessingTemplate ? 'Menghapus...' : 'Ya, Hapus Format'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
