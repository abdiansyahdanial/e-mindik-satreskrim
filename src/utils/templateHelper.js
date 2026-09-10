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

export const deleteTemplateFromSupabase = async (template) => {
  if (!template) return;

  // 1. Remove files from storage if present
  if (template.file_path) {
    try {
      await supabase.storage.from('docx-templates').remove([template.file_path]);
      await supabase.storage.from('templates').remove([template.file_path]);
    } catch (storageErr) {
      console.warn('Storage file remove notice:', storageErr);
    }
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

  // 3. Mark as deleted permanently so mock data does not re-inject on refresh
  markTemplateAsDeleted(template);
};
