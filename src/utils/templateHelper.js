import { supabase } from '../supabaseClient';

const DELETED_KEY = 'emindik_deleted_template_codes';

export const getDeletedTemplateCodes = () => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markTemplateAsDeleted = (template) => {
  if (!template) return;
  try {
    const deleted = getDeletedTemplateCodes();
    const toAdd = [];
    if (template.code && !deleted.includes(template.code)) toAdd.push(template.code);
    if (template.id && !deleted.includes(String(template.id))) toAdd.push(String(template.id));
    if (toAdd.length > 0) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted, ...toAdd]));
    }
  } catch (e) {
    console.warn('Failed to mark template as deleted in storage:', e);
  }
};

/**
 * Ekstrak path storage dari file_path atau file_url Supabase.
 * Contoh:
 * - "https://.../storage/v1/object/public/templates/mindik/tpl_123.docx" -> "mindik/tpl_123.docx"
 * - "mindik/tpl_123.docx" -> "mindik/tpl_123.docx"
 * - "/templates/mindik/tpl_123.docx" -> "mindik/tpl_123.docx"
 */
export const extractStoragePath = (filePathOrUrl) => {
  if (!filePathOrUrl) return null;
  let str = String(filePathOrUrl).trim();
  
  if (str.includes('/templates/')) {
    str = str.split('/templates/').pop();
  } else if (str.includes('/docx-templates/')) {
    str = str.split('/docx-templates/').pop();
  }
  
  // Bersihkan query string dan leading slash serta decode URI
  str = str.split('?')[0].replace(/^\/+/, '');
  try {
    str = decodeURIComponent(str);
  } catch (e) {}
  return str || null;
};

/**
 * Menghapus fisik file di Supabase Storage bucket 'templates' secara aman.
 */
export const removeStorageFileSafely = async (filePathOrUrl) => {
  const storagePath = extractStoragePath(filePathOrUrl);
  if (!storagePath) return false;

  try {
    const { error } = await supabase.storage.from('templates').remove([storagePath]);
    if (error) {
      console.warn(`Gagal menghapus file dari storage (${storagePath}):`, error.message);
    }
    return true;
  } catch (err) {
    console.warn('Error saat remove file storage (diabaikan agar proses tetap lanjut):', err);
    return false;
  }
};

/**
 * Menghapus template secara menyeluruh:
 * 1. Ambil URL/path dan hapus fisik file di Supabase Storage bucket 'templates'.
 * 2. Hapus baris di tabel 'document_templates' (by id and by code).
 * 3. Tetap melanjutkan proses database meskipun file di storage sudah tidak ada.
 */
export const deleteTemplateFromSupabase = async (template) => {
  if (!template) return;

  // 1. Ambil path storage dari file_url atau file_path
  const targetPath = template.file_url || template.file_path;
  if (targetPath) {
    await removeStorageFileSafely(targetPath);
  }
  // Cek juga file_path jika berbeda dari file_url
  if (template.file_path && template.file_path !== targetPath) {
    await removeStorageFileSafely(template.file_path);
  }

  // 2. Remove row from document_templates if numeric ID
  const isNumericId = typeof template.id === 'number' || /^\d+$/.test(String(template.id));
  if (isNumericId) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', template.id);

    if (error) {
      console.warn('Supabase delete by ID notice:', error.message);
    }
  }

  // Delete by code as well to guarantee removal in Supabase table
  if (template.code) {
    try {
      await supabase
        .from('document_templates')
        .delete()
        .eq('code', template.code);
    } catch (codeErr) {
      console.warn('Supabase delete by code notice:', codeErr);
    }
  }

  // 3. Mark as deleted so mock data does not re-inject
  markTemplateAsDeleted(template);
};

/**
 * DAFTAR LENGKAP 24 KODE TEMPLATE PERORANGAN (WAJIB DROPDOWN TERSANGKA)
 */
export const INDIVIDUAL_TSK_DOCS = [
  'SPRIN_BAWA_TSK_DAN_BA',
  'SP_TAP_TSK',
  'PEMBERITAHUAN_TAP_TSK_KE_TSK',
  'PEMBERITAHUAN_TAP_TSK_KE_JPU',
  'SPDP_TSK',
  'SPRIN_KAP_DAN_BA',
  'SPRIN_GAS_KAP',
  'SPRIN_BAWA_TSK_LEWAT_MASA_KAP',
  'BA_BERITAHU_HAK_TSK',
  'SPRIN_LEPAS_KAP_DAN_BA',
  'SPRIN_HAN_DAN_BA',
  'SURAT_MINTA_PERPANJANG_HAN_40_HARI_KN',
  'SPRIN_PERPANJANG_HAN_40_HARI_KN_DAN_BA',
  'SURAT_MINTA_PERPANJANG_HAN_30_HARI_1_KPN',
  'SPRIN_PERPANJANG_HAN_30_HARI_1_KPN_DAN_BA',
  'SURAT_MINTA_PERPANJANG_HAN_30_HARI_2_KPN',
  'SPRIN_PERPANJANG_HAN_30_HARI_2_KPN_DAN_BA',
  'SPRIN_KELUAR_HAN_DAN_BA',
  'PENGANTAR_BP_TAHAP_1',
  'TANDA_TERIMA_BP_TAHAP_1',
  'PENGANTAR_BP_KEMBALI_P19',
  'TANDA_TERIMA_KEMBALI_BP_P19',
  'PENGANTAR_KIRIM_TSK_BB_TAHAP_2',
  'BA_KIRIM_TSK_BB_TAHAP_2'
];

/**
 * Evaluasi apakah template termasuk dalam whitelist 24 dokumen perorangan
 */
export const isIndividualSuspectDoc = (template) => {
  if (!template) return false;
  const code = (typeof template === 'string' ? template : (template.code || '')).toUpperCase().trim();
  return INDIVIDUAL_TSK_DOCS.includes(code);
};
