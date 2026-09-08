import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { supabase } from '../supabaseClient';

/**
 * Format date into Indonesian locale string: '08 September 2026'
 */
export function formatIndonesianDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

/**
 * Fetch physical .docx file from Supabase Storage bucket 'docx-templates'
 * or directly via URL, and return an ArrayBuffer.
 */
export async function fetchDocxArrayBuffer(filePath) {
  if (!filePath) {
    throw new Error('Path template file di Supabase Storage tidak valid.');
  }

  // 1. Try download via Supabase storage client
  try {
    const { data, error } = await supabase.storage
      .from('docx-templates')
      .download(filePath);

    if (!error && data) {
      return await data.arrayBuffer();
    }
  } catch (err) {
    console.warn('Direct storage download warning, trying public URL fallback:', err);
  }

  // 2. Fallback via Public URL fetch
  const { data: publicUrlData } = supabase.storage
    .from('docx-templates')
    .getPublicUrl(filePath);

  const targetUrl = publicUrlData?.publicUrl || filePath;
  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Gagal mengunduh file template .docx dari Supabase (${res.status} ${res.statusText})`);
  }
  return await res.arrayBuffer();
}

/**
 * Clean & normalize XML templates in PizZip to remove duplicate bracket errors
 * (e.g. {{TAG}} -> {TAG}) common in Word editor formatting.
 */
function normalizeDocxXml(zip) {
  Object.keys(zip.files).forEach((fileName) => {
    if (fileName.endsWith('.xml') || fileName.endsWith('.xml.rels')) {
      try {
        let content = zip.file(fileName).asText();
        // Replace 2 or more curly braces with single curly brace
        const cleaned = content.replace(/\{\{+/g, '{').replace(/\}\}+/g, '}');
        zip.file(fileName, cleaned);
      } catch {
        // Skip binary or non-text xml if any
      }
    }
  });
}

/**
 * Map case, personnel, and dynamic input values into a unified dictionary of placeholders.
 */
export function buildDocxDataMap({ caseData = {}, formValues = {}, personnelList = [] }) {
  const data = {};

  // 1. Helper to find personnel by ID
  const findPerson = (id) => personnelList.find(p => p.id === id || p.nrp === id);

  // 2. Case Variables ({CASE_*})
  data['CASE_NO_LP'] = caseData.no_lp || '';
  data['CASE_TINDAK_PIDANA'] = caseData.tindak_pidana || '';
  data['CASE_PASAL_UU'] = caseData.pasal_uu || '';
  data['CASE_PASAL'] = caseData.pasal || `${caseData.pasal_uu || ''} tentang ${caseData.tindak_pidana || ''}`;
  data['CASE_LOCUS'] = caseData.locus || '';
  data['CASE_TEMPUS'] = caseData.tempus || '';
  data['CASE_PELAPOR_NAME'] = caseData.pelapor_name || '';
  data['CASE_TERLAPOR_NAME'] = caseData.terlapor_name || caseData.person?.nama || 'Dalam Lidik';
  data['CASE_STATUS'] = caseData.status === 'active' ? 'DALAM PROSES PENYIDIKAN' : 'P21 / SELESAI';
  data['CASE_CREATED_AT'] = formatIndonesianDate(caseData.created_at);

  // Person / Suspect detail
  const person = caseData.person || {};
  data['CASE_PERSON_NAMA'] = person.nama || caseData.terlapor_name || 'Dalam Lidik';
  data['CASE_PERSON_NIK'] = person.nik || '-';
  data['CASE_PERSON_GENDER'] = person.gender || 'Laki-laki';
  data['CASE_PERSON_POB_DOB'] = person.pob_dob || '-';
  data['CASE_PERSON_UMUR'] = person.umur || '-';
  data['CASE_PERSON_PEKERJAAN'] = person.pekerjaan || 'Swasta';
  data['CASE_PERSON_AGAMA'] = person.agama || 'Islam';
  data['CASE_PERSON_ALAMAT'] = person.alamat || caseData.locus || '-';
  data['CASE_PERSON_PENDIDIKAN'] = person.pendidikan || 'SMA';
  data['CASE_PERSON_WARGANEGARA'] = person.kewarganegaraan || 'Indonesia';

  // References ({REF_*})
  const refs = caseData.references || {};
  data['REF_NO_SPRIN_SIDIK'] = refs.no_sprin_sidik || '';
  data['REF_NO_SP_TAP_TSK'] = refs.no_sp_tap_tsk || '';
  data['REF_NO_SPRIN_KAP'] = refs.no_sprin_kap || '';
  data['REF_NO_SPRIN_HAN'] = refs.no_sprin_han || '';
  data['REF_NO_SPDP'] = refs.no_spdp || '';
  data['REF_NO_SPRIN_GAS'] = refs.no_sprin_gas || '';

  // Slot Penyidik 1 s/d 5 ({PENYIDIK_1_*} ... {PENYIDIK_5_*})
  const assignedInv = Array.isArray(caseData.investigators) ? caseData.investigators : [];
  for (let i = 1; i <= 5; i++) {
    const invRef = assignedInv[i - 1];
    let invObj = null;
    if (invRef) {
      invObj = findPerson(invRef.user_id) || invRef;
    }
    data[`PENYIDIK_${i}_NAMA`] = invObj?.nama || '';
    data[`PENYIDIK_${i}_PANGKAT`] = invObj?.pangkat || '';
    data[`PENYIDIK_${i}_NRP`] = invObj?.nrp || '';
    data[`PENYIDIK_${i}_JABATAN`] = invObj?.jabatan || '';
  }

  // Signer Kasat & Kanit
  const atasanId = formValues.DOC_SIGNER_ATASAN_NAME;
  const kasat = atasanId ? findPerson(atasanId) : personnelList.find(p => p.role === 'Kasat') || personnelList[0];
  data['ATASAN_NAMA'] = kasat?.nama || 'AKP AHMAD FATONI, S.H.';
  data['ATASAN_PANGKAT'] = kasat?.pangkat || 'AKP';
  data['ATASAN_NRP'] = kasat?.nrp || '78120567';
  data['ATASAN_JABATAN'] = kasat?.jabatan || 'Kepala Satuan Reserse Kriminal';

  const kanitId = formValues.DOC_SIGNER_KANIT_NAME;
  const kanit = kanitId ? findPerson(kanitId) : personnelList.find(p => p.role === 'Kanit') || kasat;
  data['KANIT_NAMA'] = kanit?.nama || '';
  data['KANIT_PANGKAT'] = kanit?.pangkat || '';
  data['KANIT_NRP'] = kanit?.nrp || '';
  data['KANIT_JABATAN'] = kanit?.jabatan || '';

  // 3. Dynamic Form inputs ({DOC_*})
  Object.keys(formValues).forEach((key) => {
    const cleanKey = key.trim().replace(/\s+/g, '_');
    data[cleanKey] = formValues[key];
    // If date key, also provide localized string
    if (key.includes('DATE') && formValues[key]) {
      data[`${cleanKey}_INDO`] = formatIndonesianDate(formValues[key]);
    }
  });

  // Standard DOC defaults if not provided in formValues
  data['DOC_NO'] = formValues.DOC_NO || formValues['DOC_NO 1'] || 'B/___/IX/2026/Reskrim';
  data['DOC_LOCATION'] = formValues.DOC_LOCATION || 'Tirawuta';
  data['DOC_DATE'] = formValues.DOC_DATE ? formatIndonesianDate(formValues.DOC_DATE) : formatIndonesianDate(new Date());
  data['DOC_VALIDITY'] = formValues.DOC_VALIDITY || '30 (tiga puluh) hari';
  data['DOC_TARGET'] = formValues.DOC_TARGET || 'Kepala Kejaksaan Negeri Kolaka';
  data['DOC_TARGET_ADDR'] = formValues.DOC_TARGET_ADDR || 'Jl. Dr. Sutomo No. 5, Kolaka';

  return data;
}

/**
 * Main function: Generate real .docx file from Supabase Storage template,
 * fill placeholders, and trigger browser download.
 */
export async function generateAndDownloadDocx({
  template,
  caseData,
  formValues = {},
  personnelList = []
}) {
  if (!template) {
    throw new Error('Template dokumen belum dipilih.');
  }
  if (!caseData) {
    throw new Error('Data berkas perkara belum dipilih.');
  }

  // 1. Fetch .docx from Supabase Storage
  let arrayBuffer;
  if (template.file_path) {
    arrayBuffer = await fetchDocxArrayBuffer(template.file_path);
  } else {
    throw new Error(`Template '${template.title}' belum memiliki file .docx di Supabase Storage. Silakan upload file fisik di Template Studio.`);
  }

  // 2. Load into PizZip & normalize delimiters
  const zip = new PizZip(arrayBuffer);
  normalizeDocxXml(zip);

  // 3. Prepare data map
  const dataMap = buildDocxDataMap({ caseData, formValues, personnelList });

  // 4. Compile with Docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ''
  });

  doc.render(dataMap);

  // 5. Generate output blob
  const outputBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  // 6. Filename
  const cleanTitle = (template.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanNoLp = (caseData.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${cleanNoLp}.docx`;

  // 7. Save file to client
  saveAs(outputBlob, filename);

  return {
    success: true,
    filename,
    blob: outputBlob,
    dataMap
  };
}
