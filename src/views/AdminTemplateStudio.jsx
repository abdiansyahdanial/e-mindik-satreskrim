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
  Sparkles
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { mockTemplates } from '../data/mockTemplates';

export default function AdminTemplateStudio({ onTemplateSaved, onSelectTemplateForGenerator }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('SURAT PERINTAH');
  const [description, setDescription] = useState('');
  const [docxFile, setDocxFile] = useState(null);
  const [dynamicFields, setDynamicFields] = useState([
    { key: 'DOC_NO', label: 'Nomor Surat', type: 'text', placeholder: 'Sp.Sidik/___/___/2026/Reskrim', required: true },
    { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', placeholder: '', required: true },
    { key: 'DOC_LOCATION', label: 'Tempat Dikeluarkan', type: 'text', placeholder: 'Tirawuta', required: true },
    { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true }
  ]);

  // Load existing templates from Supabase
  const fetchSupabaseTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching document_templates:', error);
        setStatusNotice({
          type: 'warning',
          message: `Gagal membaca tabel 'document_templates': ${error.message}. Menampilkan template bawaan.`
        });
      } else {
        setTemplates(data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseTemplates();
  }, []);

  // Handle dynamic field modifications
  const addDynamicField = () => {
    setDynamicFields(prev => [
      ...prev,
      { key: `FIELD_${prev.length + 1}`, label: 'Label Field Baru', type: 'text', placeholder: '', required: false }
    ]);
  };

  const updateDynamicField = (index, key, value) => {
    setDynamicFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const removeDynamicField = (index) => {
    setDynamicFields(prev => prev.filter((_, i) => i !== index));
  };

  // Preset loaders for convenience
  const loadPreset = (presetCode) => {
    const found = mockTemplates.find(t => t.code === presetCode);
    if (found) {
      setTitle(found.title);
      setCode(found.code);
      setCategory(found.category);
      setDescription(found.description);
      setDynamicFields([...found.dynamic_fields]);
      setStatusNotice({
        type: 'info',
        message: `Form diisi dengan template standar ${found.code}. Silakan pilih file .docx Anda.`
      });
    }
  };

  // Main handler: Upload .docx to storage & Save metadata to document_templates
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !code.trim()) {
      setStatusNotice({ type: 'error', message: 'Judul dan Kode Template wajib diisi.' });
      return;
    }

    if (!docxFile) {
      setStatusNotice({ type: 'error', message: 'Silakan pilih file template .docx yang akan diunggah.' });
      return;
    }

    setIsUploading(true);
    setStatusNotice({ type: 'info', message: 'Mengunggah file .docx ke Supabase Storage...' });

    try {
      // 1. Upload .docx file to Supabase Storage bucket 'docx-templates'
      const cleanFileName = docxFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${cleanFileName}`;
      const storageFilePath = `templates/${uniqueFileName}`;

      const { data: storageUpload, error: storageError } = await supabase.storage
        .from('docx-templates')
        .upload(storageFilePath, docxFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (storageError) {
        console.error('Supabase Storage Error:', storageError);
        throw new Error(`Gagal upload ke bucket 'docx-templates': ${storageError.message}. Pastikan bucket 'docx-templates' telah dibuat di Supabase Storage.`);
      }

      const finalFilePath = storageUpload?.path || storageFilePath;

      // 2. Insert metadata into 'document_templates' table
      const payload = {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        category,
        description: description.trim(),
        file_path: finalFilePath,
        dynamic_fields: dynamicFields,
        created_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('document_templates')
        .insert([payload])
        .select();

      if (dbError) {
        console.error('Supabase DB Error:', dbError);
        throw new Error(`Gagal menyimpan ke tabel 'document_templates': ${dbError.message}`);
      }

      setStatusNotice({
        type: 'success',
        message: `Berhasil! File .docx '${docxFile.name}' tersimpan di Storage dan metadata template '${title}' tersimpan di Supabase.`
      });

      // Reset form
      setTitle('');
      setCode('');
      setDescription('');
      setDocxFile(null);
      
      // Refresh list
      fetchSupabaseTemplates();

      if (onTemplateSaved) {
        onTemplateSaved(dbData?.[0] || payload);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setStatusNotice({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan ke Supabase.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Download template .docx file from Supabase Storage
  const handleDownloadDocx = async (filePath, templateTitle) => {
    try {
      const { data, error } = await supabase.storage
        .from('docx-templates')
        .download(filePath);

      if (error) {
        alert(`Gagal mengunduh file dari Supabase Storage: ${error.message}`);
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateTitle.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Terjadi kesalahan saat mengunduh file.');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id, filePath) => {
    if (!window.confirm('Hapus template ini dari Supabase?')) return;

    try {
      if (filePath) {
        await supabase.storage.from('docx-templates').remove([filePath]);
      }
      const { error } = await supabase.from('document_templates').delete().eq('id', id);
      if (error) throw error;

      setStatusNotice({ type: 'success', message: 'Template berhasil dihapus dari Supabase.' });
      fetchSupabaseTemplates();
    } catch (err) {
      alert(`Gagal menghapus: ${err.message}`);
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
            Unggah file master Microsoft Word (.docx) ke Supabase Storage dan daftarkan variabel dinamis (dynamic fields) untuk otomatisasi berkas penyidikan.
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
        gridTemplateColumns: 'minmax(380px, 540px) 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left Column: Form Upload & Variable Editor */}
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudUpload size={18} color="var(--accent-cyan)" />
              <span>Upload Template Baru</span>
            </h3>

            {/* Quick Presets */}
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
                onClick={() => loadPreset('SPDP')}
                className="btn btn-secondary btn-sm" 
                style={{ fontSize: '11px', padding: '3px 8px' }}
                title="Isi form dengan preset SPDP"
              >
                Preset SPDP
              </button>
            </div>
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
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
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
                style={{ minHeight: '60px' }}
              />
            </div>

            {/* File .docx Upload Area */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                File Master Word (.docx) <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              
              <div 
                style={{
                  border: '2px dashed var(--border-glass-hover)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
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

                <FileText size={32} color={docxFile ? 'var(--accent-cyan)' : 'var(--text-secondary)'} style={{ margin: '0 auto 8px' }} />
                
                {docxFile ? (
                  <div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '13px' }}>
                      {docxFile.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {(docxFile.size / 1024).toFixed(1)} KB • Siap diupload ke bucket 'docx-templates'
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>
                      Klik untuk memilih file template .docx
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Format dokumen resmi Microsoft Word (.docx)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Fields Builder */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent-cyan)" />
                  <span>Dynamic Fields ({dynamicFields.length})</span>
                </label>
                <button
                  type="button"
                  onClick={addDynamicField}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  <Plus size={12} />
                  <span>Tambah Field</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {dynamicFields.map((field, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateDynamicField(idx, 'key', e.target.value.toUpperCase())}
                        placeholder="KEY (e.g. DOC_NO)"
                        className="form-input mono"
                        style={{ padding: '6px 8px', fontSize: '12px', flex: '1 1 120px' }}
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateDynamicField(idx, 'label', e.target.value)}
                        placeholder="Label Field"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px', flex: '1 1 140px' }}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateDynamicField(idx, 'type', e.target.value)}
                        className="form-select"
                        style={{ padding: '6px 8px', fontSize: '12px', width: '110px' }}
                      >
                        <option value="text">Teks</option>
                        <option value="date">Tanggal</option>
                        <option value="textarea">Textarea</option>
                        <option value="select_personnel">Personel</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDynamicField(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-red)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Hapus Field"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateDynamicField(idx, 'placeholder', e.target.value)}
                        placeholder="Placeholder / Contoh isi..."
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '11px', flex: 1, marginRight: '10px' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateDynamicField(idx, 'required', e.target.checked)}
                        />
                        <span>Wajib</span>
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
              style={{ marginTop: '8px', padding: '12px' }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={16} className="animate-pulse" />
                  <span>Mengunggah & Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <Database size={16} />
                  <span>Simpan Template & Unggah ke Supabase</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Supabase Templates List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--accent-green)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Template Tersimpan di Supabase
                </h3>
              </div>
              <span className="badge badge-green">
                {templates.length} Template Cloud
              </span>
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
                  Gunakan form di sebelah kiri untuk mengunggah file master .docx pertama Anda ke bucket 'docx-templates'.
                </p>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Catatan: 8 template bawaan sistem tetap tersedia di Generator Mindik.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-cyan mono">{tpl.code}</span>
                        <span className="badge badge-blue">{tpl.category}</span>
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>
                        {tpl.title}
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
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <span className="mono">Storage: {tpl.file_path ? tpl.file_path.split('/').pop() : 'No file'}</span>
                        <span>•</span>
                        <span>{Array.isArray(tpl.dynamic_fields) ? tpl.dynamic_fields.length : 0} Variabel Dinamis</span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {tpl.file_path && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocx(tpl.file_path, tpl.title)}
                            className="btn btn-secondary btn-sm"
                            title="Unduh file .docx dari Supabase Storage"
                          >
                            <Download size={13} />
                            <span>Unduh .docx</span>
                          </button>
                        )}

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

                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.file_path)}
                          className="btn btn-danger btn-sm"
                          title="Hapus dari Supabase"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
