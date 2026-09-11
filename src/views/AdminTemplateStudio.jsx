import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  CloudUpload, 
  Database, 
  Layers, 
  RefreshCw,
  Sparkles,
  Edit3,
  XCircle,
  X,
  AlertTriangle,
  Search
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { mockTemplates } from '../data/mockTemplates';
import { 
  deleteTemplateFromSupabase, 
  getDeletedTemplateCodes,
  extractStoragePath,
  removeStorageFileSafely
} from '../utils/templateHelper';

export default function AdminTemplateStudio({ 
  onTemplateSaved, 
  onSelectTemplateForGenerator,
  userRole = 'super_admin'
}) {
  const isSuperAdmin = userRole === 'super_admin';
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Edit mode states
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [existingFilePath, setExistingFilePath] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('SURAT PERINTAH');
  const [description, setDescription] = useState('');
  const [docxFile, setDocxFile] = useState(null);

  // Standard Kamus Mindik Dynamic Fields
  const [dynamicFields, setDynamicFields] = useState([
    { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: 'B/01/IX/2026/Reskrim', is_required: true },
    { id: 2, field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
    { id: 3, field_key: 'TEMPAT_SURAT', field_label: 'Tempat Dikeluarkan', field_type: 'text', default_value: 'Tirawuta', is_required: true },
    { id: 4, field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
    { id: 5, field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
  ]);

  // Load existing templates directly from Supabase
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Simpan langsung data Supabase ke state murni
      setTemplates(data || []);
    } catch (err) {
      console.error('Gagal fetch templates:', err);
      setStatusNotice({
        type: 'warning',
        message: `Gagal membaca tabel 'document_templates': ${err.message || err}.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Alias untuk fungsi sinkronisasi manual
  const fetchSupabaseTemplates = fetchTemplates;

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filter logika tampilan
  const filteredTemplates = templates.filter((tpl) => {
    // 1. Pastikan jika kategori yang dipilih adalah "Semua" / kosong, tampilkan seluruh item tanpa terkecuali
    const matchesCategory =
      !selectedCategory || selectedCategory === 'Semua' || tpl.category === selectedCategory;

    // 2. Pastikan pengecekan pencarian (searchQuery) aman dari nilai null/undefined (gunakan optional chaining: tpl.title?.toLowerCase())
    const q = searchQuery.trim().toLowerCase();
    const itemTitle = (tpl.title || tpl.name || '').toLowerCase();
    const itemCode = (tpl.code || '').toLowerCase();
    const itemDesc = (tpl.description || '').toLowerCase();
    const matchesSearch =
      !q ||
      tpl.title?.toLowerCase().includes(q) ||
      tpl.name?.toLowerCase().includes(q) ||
      itemTitle.includes(q) ||
      itemCode.includes(q) ||
      itemDesc.includes(q);

    // 3. Jangan menyembunyikan template yang baru diunggah jika kolom opsional seperti is_active bernilai null/true
    const matchesActive =
      tpl.is_active === undefined || tpl.is_active === null || tpl.is_active === true;

    return matchesCategory && matchesSearch && matchesActive;
  });

  // Standard + Tambah Field
  const handleAddField = () => {
    setDynamicFields((prev) => [
      ...prev,
      {
        id: Date.now(),
        field_key: '',
        field_label: '',
        field_type: 'text',
        default_value: '',
        is_required: false,
      }
    ]);
  };

  // Standard Update Field
  const updateDynamicField = (id, prop, value) => {
    setDynamicFields((prev) => prev.map(f => {
      if (f.id === id) {
        return { ...f, [prop]: value };
      }
      return f;
    }));
  };

  // Key Placeholder filter: Otomatis buang { } dan spasi, paksa UPPERCASE
  const handleKeyChange = (id, rawValue) => {
    const cleanKey = (rawValue || '')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
    updateDynamicField(id, 'field_key', cleanKey);
  };

  // Hapus baris berdasarkan id
  const handleRemoveField = (id) => {
    setDynamicFields((prev) => prev.filter(f => f.id !== id));
  };

  // Preset loaders for convenience
  const loadPreset = (presetCode) => {
    const found = mockTemplates.find(t => t.code === presetCode);
    if (found) {
      setTitle(found.title);
      setCode(found.code);
      setCategory(found.category);
      setDescription(found.description);
      
      const convertedFields = (found.dynamic_fields || []).map((f, i) => ({
        id: Date.now() + i,
        field_key: (f.field_key || f.key || '').replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase(),
        field_label: f.field_label || f.label || '',
        field_type: f.field_type || f.type || 'text',
        default_value: f.default_value !== undefined ? f.default_value : (f.placeholder || ''),
        is_required: Boolean(f.is_required !== undefined ? f.is_required : f.required)
      }));
      setDynamicFields(convertedFields);

      setStatusNotice({
        type: 'info',
        message: `Form diisi dengan preset standar ${found.code}. Silakan pilih file .docx Anda.`
      });
    }
  };

  // Start edit template mode
  const handleEditTemplate = (tpl) => {
    setEditingTemplateId(tpl.id);
    setTitle(tpl.title || '');
    setCode(tpl.code || '');
    setCategory(tpl.category || 'SURAT PERINTAH');
    setDescription(tpl.description || '');
    setExistingFilePath(tpl.file_path || '');
    setExistingFileUrl(tpl.file_url || '');
    setDocxFile(null);

    const normFields = (Array.isArray(tpl.dynamic_fields) ? tpl.dynamic_fields : []).map((f, i) => ({
      id: f.id || Date.now() + i,
      field_key: (f.field_key || f.key || '').replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase(),
      field_label: f.field_label || f.label || '',
      field_type: f.field_type || f.type || 'text',
      default_value: f.default_value !== undefined ? f.default_value : (f.placeholder || ''),
      is_required: Boolean(f.is_required !== undefined ? f.is_required : f.required)
    }));

    setDynamicFields(normFields.length > 0 ? normFields : [
      { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true }
    ]);

    setStatusNotice({
      type: 'info',
      message: `Mode Edit aktif untuk template '${tpl.title}'. Klik Simpan untuk memperbarui tanpa duplikasi data.`
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setExistingFilePath(null);
    setExistingFileUrl(null);
    setTitle('');
    setCode('');
    setCategory('SURAT PERINTAH');
    setDescription('');
    setDocxFile(null);
    setDynamicFields([
      { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: 'B/01/IX/2026/Reskrim', is_required: true },
      { id: 2, field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
      { id: 3, field_key: 'TEMPAT_SURAT', field_label: 'Tempat Dikeluarkan', field_type: 'text', default_value: 'Tirawuta', is_required: true }
    ]);
  };

  // Main handler: Upload .docx to storage & Upsert metadata to document_templates
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !code.trim()) {
      setStatusNotice({ type: 'error', message: 'Judul dan Kode Template wajib diisi.' });
      return;
    }

    if (!editingTemplateId && !docxFile) {
      setStatusNotice({ type: 'error', message: 'Silakan pilih file template .docx yang akan diunggah.' });
      return;
    }

    setIsUploading(true);
    setStatusNotice({ type: 'info', message: 'Menyimpan konfigurasi template ke Supabase...' });

    try {
      let finalFilePath = existingFilePath || '';
      let finalFileUrl = existingFileUrl || '';

      // 1. Upload .docx file jika ada file fisik baru dipilih
      if (docxFile) {
        // Jika sedang edit dan mengganti file fisik, hapus file lama di storage terlebih dahulu
        if (editingTemplateId && (existingFilePath || existingFileUrl)) {
          await removeStorageFileSafely(existingFilePath || existingFileUrl);
        }

        const templateCode = (code || 'TEMPLATE').trim().replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
        const cleanFileName = `${templateCode}_${Date.now()}.docx`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('templates')
          .upload(cleanFileName, docxFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: docxFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });

        if (uploadError) {
          console.error('Detail Error Upload Supabase:', uploadError);
          throw new Error(uploadError.message || 'Gagal mengunggah file ke Storage');
        }

        const { data: publicUrlData } = supabase.storage
          .from('templates')
          .getPublicUrl(cleanFileName);

        const fileUrl = publicUrlData?.publicUrl;

        finalFilePath = uploadData?.path || cleanFileName;
        finalFileUrl = fileUrl || '';
      }

      // 2. Normalisasi Dynamic Fields ke format baku
      const cleanDynamicFields = dynamicFields.map((f) => ({
        id: f.id || Date.now(),
        field_key: (f.field_key || '').replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase(),
        field_label: f.field_label || '',
        field_type: f.field_type || 'text',
        default_value: f.default_value !== undefined ? f.default_value : '',
        is_required: Boolean(f.is_required)
      }));

      // 3. Upsert into 'document_templates' table berbasis ID (JANGAN menyisipkan updated_at karena tidak ada di skema tabel)
      const cleanCode = code.trim().replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase();
      const payload = {
        title: title.trim(),
        code: cleanCode,
        category,
        description: description.trim(),
        file_path: finalFilePath,
        file_url: finalFileUrl,
        dynamic_fields: cleanDynamicFields
      };

      if (editingTemplateId) {
        payload.id = editingTemplateId;
      }

      let dbData, dbError;
      const executeUpsert = async (dataPayload) => {
        if (editingTemplateId) {
          // Mode edit: lakukan upsert berbasis id
          return await supabase
            .from('document_templates')
            .upsert([dataPayload], { onConflict: 'id' })
            .select();
        } else {
          // Mode tambah baru: periksa apakah template dengan code tersebut sudah ada
          const { data: existing } = await supabase
            .from('document_templates')
            .select('id')
            .eq('code', cleanCode)
            .maybeSingle();

          if (existing?.id) {
            dataPayload.id = existing.id;
            return await supabase
              .from('document_templates')
              .upsert([dataPayload], { onConflict: 'id' })
              .select();
          } else {
            dataPayload.created_at = new Date().toISOString();
            return await supabase
              .from('document_templates')
              .insert([dataPayload])
              .select();
          }
        }
      };

      const res = await executeUpsert(payload);
      dbData = res.data;
      dbError = res.error;

      // Fallback jika tabel document_templates belum memiliki kolom file_url
      if (dbError && dbError.message && dbError.message.includes('file_url')) {
        console.warn('Kolom file_url belum ada di Supabase, mencoba simpan tanpa kolom file_url...');
        delete payload.file_url;
        const retryRes = await executeUpsert(payload);
        dbData = retryRes.data;
        dbError = retryRes.error;
      }

      if (dbError) {
        console.error('Supabase DB Error:', dbError);
        throw new Error(`Gagal menyimpan ke tabel 'document_templates': ${dbError.message}`);
      }

      setStatusNotice({
        type: 'success',
        message: `Berhasil! Template '${title}' berhasil ${editingTemplateId ? 'diperbarui' : 'disimpan'} di Supabase.`
      });

      // Reset form
      handleCancelEdit();
      
      // Refresh list & state update otomatis dari database Supabase
      await fetchTemplates();

      if (onTemplateSaved) {
        onTemplateSaved(dbData?.[0] || payload);
      }
    } catch (err) {
      console.error('Submit error detail:', err);
      let detailMsg = err?.message || 'Terjadi kesalahan saat menyimpan ke Supabase.';
      if (detailMsg === 'Failed to fetch' || err?.name === 'TypeError') {
        detailMsg = 'Koneksi ke Supabase Storage gagal (Failed to fetch). Pastikan jaringan internet stabil, bucket "templates" sudah tersedia dan bersifat Public, serta RLS Storage mengizinkan upload file .docx.';
      }
      setStatusNotice({
        type: 'error',
        message: `Upload gagal: ${detailMsg}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Download template .docx file from Supabase Storage
  const handleDownloadDocx = async (filePath, templateTitle) => {
    try {
      let bucket = 'templates';
      let cleanPath = filePath.replace(/^\/+/, '');
      
      let { data, error } = await supabase.storage.from(bucket).download(cleanPath);
      if (error) {
        bucket = 'docx-templates';
        const res2 = await supabase.storage.from(bucket).download(cleanPath);
        data = res2.data;
        error = res2.error;
      }

      if (error || !data) {
        alert(`Gagal mengunduh file dari Supabase Storage: ${error?.message || 'File tidak ditemukan'}`);
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(templateTitle || 'Template').replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Terjadi kesalahan saat mengunduh file.');
    }
  };

  // Trigger modal konfirmasi hapus template (khusus Super Admin)
  const handleDeleteTemplate = (tpl) => {
    if (!isSuperAdmin) {
      alert('Akses Ditolak: Hanya Super Admin yang berhak menghapus template dokumen!');
      return;
    }
    setTemplateToDelete(tpl);
  };

  // Konfirmasi & Penghapusan permanen dari Supabase
  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeletingTemplate(true);

    try {
      // 1. Ekstrak dan hapus file fisik di storage terlebih dahulu secara aman
      if (templateToDelete.file_url) {
        const urlParts = templateToDelete.file_url.split('/templates/');
        if (urlParts.length > 1) {
          const storagePath = decodeURIComponent(urlParts[1].split('?')[0]);
          try {
            await supabase.storage.from('templates').remove([storagePath]);
          } catch (storageErr) {
            console.warn('Gagal menghapus file storage (diabaikan agar proses database tetap lanjut):', storageErr);
          }
        }
      } else if (templateToDelete.file_path) {
        const storagePath = extractStoragePath(templateToDelete.file_path);
        if (storagePath) {
          try {
            await supabase.storage.from('templates').remove([storagePath]);
          } catch (storageErr) {
            console.warn('Gagal menghapus file storage (diabaikan agar proses database tetap lanjut):', storageErr);
          }
        }
      }

      // 2. Hapus baris dari tabel database document_templates
      await deleteTemplateFromSupabase(templateToDelete);

      setStatusNotice({
        type: 'success',
        message: `Template '${templateToDelete.title || templateToDelete.name}' berhasil dihapus secara permanen!`
      });
      setTemplateToDelete(null);

      // 3. Panggil await fetchTemplates() agar daftar di layar web langsung terbarui
      await fetchTemplates();
    } catch (err) {
      console.error('Gagal menghapus template:', err);
      alert(`Terjadi kesalahan saat menghapus template: ${err.message}`);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(6, 11, 24, 0.8) 100%)',
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
            <span className="badge badge-cyan">ADMIN TEMPLATE STUDIO</span>
            <span className="badge badge-green">SUPABASE CONNECTED</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
            Manajemen Template Dokumen Mindik (.docx)
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Unggah file master Microsoft Word (.docx) ke Supabase Storage dan kelola skema variabel dinamis (dynamic fields) untuk otomatisasi berkas penyidikan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={fetchSupabaseTemplates} 
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-pulse' : ''} />
            <span>Sinkronkan Supabase</span>
          </button>
        </div>
      </div>

      {/* Alert / Notice Banner */}
      {statusNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: statusNotice.type === 'success' 
            ? 'rgba(34, 197, 94, 0.15)' 
            : statusNotice.type === 'error' 
            ? 'rgba(239, 68, 68, 0.15)' 
            : 'rgba(0, 212, 255, 0.1)',
          border: `1px solid ${
            statusNotice.type === 'success' ? 'var(--accent-green)' : statusNotice.type === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)'
          }`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#FFF',
        }}>
          {statusNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={18} color={statusNotice.type === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)'} />
          )}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Main Grid: Form Builder (Left) & Existing Templates (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 580px) 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left Column: Form Upload & Variable Editor */}
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingTemplateId ? (
                <>
                  <Edit3 size={18} color="var(--accent-cyan)" />
                  <span>Edit Template: {code || title}</span>
                </>
              ) : (
                <>
                  <CloudUpload size={18} color="var(--accent-cyan)" />
                  <span>Upload Template Baru</span>
                </>
              )}
            </h3>

            {editingTemplateId ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', gap: '4px' }}
              >
                <XCircle size={13} />
                <span>Batal Edit</span>
              </button>
            ) : (
              /* Quick Presets */
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => loadPreset('SPRIN_SIDIK')}
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title="Isi form dengan preset SPRIN SIDIK"
                >
                  Preset Sidik
                </button>
                <button 
                  type="button" 
                  onClick={() => loadPreset('SPRIN_GAS_SIDIK')}
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title="Isi form dengan preset SPRIN GAS SIDIK"
                >
                  Preset Gas Sidik
                </button>
                <button 
                  type="button" 
                  onClick={() => loadPreset('SPDP')}
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title="Isi form dengan preset SPDP"
                >
                  Preset SPDP
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Template Title */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Judul Template <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Surat Perintah Penyidikan"
                className="form-input"
                required
              />
            </div>

            {/* Code & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Kode Template (Unik) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase())}
                  placeholder="Contoh: SPRIN_SIDIK"
                  className="form-input mono"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deskripsi / Keterangan</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat fungsi dan peruntukan template dokumen ini..."
                className="form-textarea"
                style={{ minHeight: '50px' }}
              />
            </div>

            {/* File .docx Upload Area */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                File Master Word (.docx) {!editingTemplateId && <span style={{ color: 'var(--accent-red)' }}>*</span>}
              </label>
              
              <div 
                style={{
                  border: '2px dashed var(--border-glass-hover)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  textAlign: 'center',
                  background: docxFile ? 'rgba(0, 212, 255, 0.06)' : 'rgba(13, 21, 38, 0.4)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onClick={() => document.getElementById('docx-file-input').click()}
              >
                <input
                  id="docx-file-input"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocxFile(e.target.files[0]);
                    }
                  }}
                />

                <FileText size={28} color={docxFile ? 'var(--accent-cyan)' : 'var(--text-secondary)'} style={{ margin: '0 auto 6px' }} />
                
                {docxFile ? (
                  <div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '13px' }}>
                      {docxFile.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {(docxFile.size / 1024).toFixed(1)} KB • File siap diunggah ke Storage
                    </div>
                  </div>
                ) : editingTemplateId && existingFilePath ? (
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '12px', color: '#60a5fa' }}>
                      File saat ini: {existingFilePath.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Klik untuk mengganti dengan file .docx baru (opsional)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>
                      Klik untuk memilih file template .docx
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Format dokumen resmi Microsoft Word (.docx)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Fields Builder */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent-cyan)" />
                  <span>Dynamic Fields ({dynamicFields.length})</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
                >
                  <Plus size={13} />
                  <span>+ Tambah Field</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {dynamicFields.map((field) => (
                  <div 
                    key={field.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Baris Atas: Key Placeholder (Kiri), Label Field (Tengah), Tipe Data (Kanan), Hapus */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Key Placeholder */}
                      <input
                        type="text"
                        value={field.field_key || ''}
                        onChange={(e) => handleKeyChange(field.id, e.target.value)}
                        placeholder="KEY (e.g. NOMOR_SURAT)"
                        className="form-input mono"
                        style={{ padding: '6px 8px', fontSize: '11.5px', flex: '1 1 130px', fontWeight: 600, color: 'var(--accent-cyan)' }}
                        title="Key placeholder kurung kurawal pada template Word (otomatis uppercase tanpa kurung)"
                      />

                      {/* Label Field */}
                      <input
                        type="text"
                        value={field.field_label || ''}
                        onChange={(e) => updateDynamicField(field.id, 'field_label', e.target.value)}
                        placeholder="Label Field (misal: Nomor Surat)"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px', flex: '1 1 140px' }}
                      />

                      {/* Tipe Data */}
                      <select
                        value={field.field_type || 'text'}
                        onChange={(e) => updateDynamicField(field.id, 'field_type', e.target.value)}
                        className="form-select"
                        style={{ padding: '6px 8px', fontSize: '11.5px', width: '125px' }}
                      >
                        <option value="text">Teks</option>
                        <option value="date">Tanggal</option>
                        <option value="select">Pilihan (Dropdown)</option>
                        <option value="textarea">Textarea</option>
                      </select>

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-red)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Hapus baris field ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Baris Bawah: Placeholder / Default (Kiri) & Checkbox Wajib (Kanan) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <input
                        type="text"
                        value={field.default_value || ''}
                        onChange={(e) => updateDynamicField(field.id, 'default_value', e.target.value)}
                        placeholder="Contoh isi / default (misal: B/01/I/2026/Reskrim)..."
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '11px', flex: 1 }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(field.is_required)}
                          onChange={(e) => updateDynamicField(field.id, 'is_required', e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>Wajib diisi</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="btn btn-primary"
              style={{ marginTop: '6px', padding: '12px', fontWeight: 700 }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={16} className="animate-pulse" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : editingTemplateId ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Perbarui Template di Supabase</span>
                </>
              ) : (
                <>
                  <Database size={16} />
                  <span>Simpan Template Baru ke Supabase</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Supabase Templates List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--accent-green)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Template Tersimpan di Supabase
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {searchQuery || (selectedCategory && selectedCategory !== 'Semua') ? (
                  <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                    {filteredTemplates.length} dari {templates.length} Template
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: '11px' }}>
                    {templates.length} Template Cloud
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar Pencarian & Filter Kategori */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              {/* Search Bar Input */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, nama, kode, atau deskripsi template..."
                  className="form-input"
                  style={{ paddingLeft: '34px', fontSize: '12.5px', height: '36px' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Hapus pencarian"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['Semua', 'SURAT PERINTAH', 'SURAT', 'BERITA ACARA', 'PENETAPAN', 'LAINNYA'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: selectedCategory === cat ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Memuat data dari Supabase...
              </div>
            ) : templates.length === 0 ? (
              <div style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-glass)',
                color: 'var(--text-secondary)',
              }}>
                <CloudUpload size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 10px', opacity: 0.7 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                  Belum Ada Template di Supabase Cloud
                </div>
                <p style={{ fontSize: '12px', margin: '4px 0 12px', maxWidth: '360px', marginInline: 'auto' }}>
                  Gunakan form di sebelah kiri untuk mengunggah file master .docx pertama Anda.
                </p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{
                padding: '28px 16px',
                textAlign: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-glass)',
                color: 'var(--text-secondary)',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                  Tidak ada template yang cocok
                </div>
                <p style={{ fontSize: '12px', margin: '4px 0 12px', color: 'var(--text-secondary)' }}>
                  Tidak ditemukan template dengan kategori &ldquo;{selectedCategory}&rdquo; {searchQuery ? `atau pencarian "${searchQuery}"` : ''}.
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedCategory('Semua'); setSearchQuery(''); }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', margin: '0 auto' }}
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTemplates.map((tpl) => {
                  const displayTitle = tpl.title || tpl.name || 'Tanpa Judul';
                  const displayCategory = tpl.category || 'SURAT PERINTAH';
                  return (
                    <div
                      key={tpl.id || tpl.code}
                      style={{
                        padding: '16px',
                        background: editingTemplateId === tpl.id ? 'rgba(0, 212, 255, 0.08)' : 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: editingTemplateId === tpl.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-cyan mono">{tpl.code || '-'}</span>
                          <span className="badge badge-blue">{displayCategory}</span>
                          {editingTemplateId === tpl.id && (
                            <span className="badge badge-purple">SEDANG DIEDIT</span>
                          )}
                        </div>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>
                          {displayTitle}
                        </div>
                        {tpl.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                            {tpl.description}
                          </p>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                          <span className="mono">Storage: {tpl.file_path ? tpl.file_path.split('/').pop() : (tpl.file_url ? 'Direct URL' : 'No file')}</span>
                          <span>•</span>
                          <span>{Array.isArray(tpl.dynamic_fields) ? tpl.dynamic_fields.length : 0} Variabel Dinamis</span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(tpl)}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '4px', fontSize: '11.5px' }}
                            title="Muat template ini ke form untuk diedit"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Download DOCX */}
                          {(tpl.file_path || tpl.file_url) && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDocx(tpl.file_path || tpl.file_url, displayTitle)}
                              className="btn btn-secondary btn-sm"
                              title="Unduh file .docx dari Supabase Storage"
                            >
                              <Download size={13} />
                              <span>Unduh</span>
                            </button>
                          )}

                          {/* Gunakan di Generator */}
                          {onSelectTemplateForGenerator && (
                            <button
                              type="button"
                              onClick={() => onSelectTemplateForGenerator(tpl)}
                              className="btn btn-primary btn-sm"
                              title="Gunakan template ini di Generator Dokumen"
                            >
                              <Sparkles size={13} />
                              <span>Gunakan</span>
                            </button>
                          )}

                          {/* Tombol Hapus: Khusus Super Admin */}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl)}
                              className="btn btn-danger btn-sm"
                              style={{ gap: '4px', fontSize: '11.5px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              title="Hapus Template secara Permanen (Khusus Super Admin)"
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Template Permanen */}
      {templateToDelete && (
        <div className="modal-backdrop" onClick={() => !isDeletingTemplate && setTemplateToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '460px' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={20} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Hapus Template Permanen</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Konfirmasi Hak Akses Super Admin
                  </div>
                </div>
              </div>

              <button 
                type="button"
                disabled={isDeletingTemplate}
                onClick={() => setTemplateToDelete(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                Apakah Anda yakin ingin menghapus template ini secara permanen?
              </p>

              <div style={{
                padding: '12px 14px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13.5px' }}>
                  {templateToDelete.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="badge badge-cyan mono">{templateToDelete.code}</span>
                  <span className="badge badge-blue">{templateToDelete.category}</span>
                </div>
                {templateToDelete.file_path && (
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    File: {templateToDelete.file_path.split('/').pop()}
                  </div>
                )}
              </div>

              <div style={{
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '11.5px',
                color: '#FCA5A5'
              }}>
                <AlertTriangle size={15} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Tindakan ini tidak dapat dibatalkan. Baris template pada tabel Supabase <code>document_templates</code> beserta file master Word akan dihapus permanen.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="btn btn-secondary btn-sm"
                disabled={isDeletingTemplate}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="btn btn-danger btn-sm"
                disabled={isDeletingTemplate}
                style={{ gap: '6px' }}
              >
                {isDeletingTemplate ? (
                  <>
                    <RefreshCw size={14} className="animate-pulse" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
