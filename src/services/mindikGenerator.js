import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
import mammoth from 'mammoth';
import { supabase } from '../supabaseClient.js';

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
 * Fetch physical .docx file from Supabase Storage.
 * Supports both 'templates' and 'docx-templates' buckets, as well as subfolders.
 */
export async function fetchDocxArrayBuffer(filePath) {
  if (!filePath) {
    throw new Error('Path template file di Supabase Storage tidak valid.');
  }

  // Buckets to try in order of priority
  const bucketsToTry = ['templates', 'docx-templates'];
  
  // Clean path candidates
  const cleanPath = filePath.replace(/^\/+/, '');
  const pathWithoutTemplatesPrefix = cleanPath.startsWith('templates/') ? cleanPath.replace(/^templates\//, '') : cleanPath;
  const pathWithTemplatesPrefix = cleanPath.startsWith('templates/') ? cleanPath : `templates/${cleanPath}`;

  const pathsToTry = [cleanPath, pathWithoutTemplatesPrefix, pathWithTemplatesPrefix];

  for (const bucket of bucketsToTry) {
    for (const testPath of pathsToTry) {
      try {
        const { data, error } = await supabase.storage.from(bucket).download(testPath);
        if (!error && data) {
          return await data.arrayBuffer();
        }
      } catch (e) {
        // Continue trying
      }
    }
  }

  // Fallback: Try Public URL
  for (const bucket of bucketsToTry) {
    for (const testPath of pathsToTry) {
      try {
        const { data } = supabase.storage.from(bucket).getPublicUrl(testPath);
        if (data?.publicUrl) {
          const res = await fetch(data.publicUrl);
          if (res.ok) {
            return await res.arrayBuffer();
          }
        }
      } catch (e) {
        // Continue trying
      }
    }
  }

  // If filePath is a full HTTP URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const res = await fetch(filePath);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  }

  throw new Error(`Gagal mengunduh file template .docx '${filePath}' dari Supabase Storage. Pastikan file tersimpan di bucket 'templates' atau 'docx-templates'.`);
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

  // 4. Aliases in snake_case & lowercase for flexible template compatibility
  data['nomor_lp'] = data['CASE_NO_LP'];
  data['no_lp'] = data['CASE_NO_LP'];
  data['tindak_pidana'] = data['CASE_TINDAK_PIDANA'];
  data['pasal_uu'] = data['CASE_PASAL_UU'];
  data['pasal'] = data['CASE_PASAL'];
  data['locus'] = data['CASE_LOCUS'];
  data['tempus'] = data['CASE_TEMPUS'];
  data['pelapor_name'] = data['CASE_PELAPOR_NAME'];
  data['pelapor'] = data['CASE_PELAPOR_NAME'];
  data['terlapor_name'] = data['CASE_TERLAPOR_NAME'];
  data['tersangka'] = data['CASE_PERSON_NAMA'];
  data['nama_tersangka'] = data['CASE_PERSON_NAMA'];
  data['nik_tersangka'] = data['CASE_PERSON_NIK'];
  data['umur_tersangka'] = data['CASE_PERSON_UMUR'];
  data['agama_tersangka'] = data['CASE_PERSON_AGAMA'];
  data['pekerjaan_tersangka'] = data['CASE_PERSON_PEKERJAAN'];
  data['alamat_tersangka'] = data['CASE_PERSON_ALAMAT'];
  data['jenis_kelamin_tersangka'] = data['CASE_PERSON_GENDER'];
  data['ttl_tersangka'] = data['CASE_PERSON_POB_DOB'];

  data['penyidik_1'] = data['PENYIDIK_1_NAMA'] || '-';
  data['penyidik_1_nama'] = data['PENYIDIK_1_NAMA'] || '-';
  data['penyidik_1_pangkat'] = data['PENYIDIK_1_PANGKAT'] || '-';
  data['penyidik_1_nrp'] = data['PENYIDIK_1_NRP'] || '-';
  data['penyidik_1_jabatan'] = data['PENYIDIK_1_JABATAN'] || '-';

  data['penyidik_2'] = data['PENYIDIK_2_NAMA'] || '-';
  data['penyidik_2_nama'] = data['PENYIDIK_2_NAMA'] || '-';
  data['penyidik_2_pangkat'] = data['PENYIDIK_2_PANGKAT'] || '-';
  data['penyidik_2_nrp'] = data['PENYIDIK_2_NRP'] || '-';

  data['penyidik_3'] = data['PENYIDIK_3_NAMA'] || '-';
  data['penyidik_4'] = data['PENYIDIK_4_NAMA'] || '-';
  data['penyidik_5'] = data['PENYIDIK_5_NAMA'] || '-';

  data['kasat_nama'] = data['ATASAN_NAMA'];
  data['kasat_pangkat'] = data['ATASAN_PANGKAT'];
  data['kasat_nrp'] = data['ATASAN_NRP'];
  data['kasat_jabatan'] = data['ATASAN_JABATAN'];
  data['atasan_nama'] = data['ATASAN_NAMA'];
  data['atasan_pangkat'] = data['ATASAN_PANGKAT'];
  data['atasan_nrp'] = data['ATASAN_NRP'];
  data['atasan_jabatan'] = data['ATASAN_JABATAN'];

  data['kanit_nama'] = data['KANIT_NAMA'];
  data['kanit_pangkat'] = data['KANIT_PANGKAT'];
  data['kanit_nrp'] = data['KANIT_NRP'];
  data['kanit_jabatan'] = data['KANIT_JABATAN'];

  data['nomor_surat'] = data['DOC_NO'];
  data['doc_no'] = data['DOC_NO'];
  data['tanggal_surat'] = data['DOC_DATE'];
  data['doc_date'] = data['DOC_DATE'];
  data['tempat_surat'] = data['DOC_LOCATION'];
  data['doc_location'] = data['DOC_LOCATION'];
  data['masa_berlaku'] = data['DOC_VALIDITY'];
  data['doc_validity'] = data['DOC_VALIDITY'];
  data['doc_target'] = data['DOC_TARGET'];
  data['kepada_yth'] = data['DOC_TARGET'];
  data['doc_target_addr'] = data['DOC_TARGET_ADDR'];
  data['alamat_tujuan'] = data['DOC_TARGET_ADDR'];

  // Clean all values: replace undefined, null, or string "null"/"undefined" with "" or "-"
  Object.keys(data).forEach((k) => {
    if (data[k] === null || data[k] === undefined || data[k] === 'null' || data[k] === 'undefined') {
      data[k] = '';
    }
  });

  return data;
}

/**
 * Replace placeholders like {nomor_lp}, {CASE_NO_LP}, {{pelapor_name}}, etc. in an HTML or text template string.
 * Strictly avoids rendering literal 'null' or 'undefined'.
 */
export function replaceDynamicVariables(content = '', dataMap = {}) {
  if (!content || typeof content !== 'string') return '';

  return content.replace(/\{\{?\s*([a-zA-Z0-9_ -]+)\s*\}?\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    if (!key) return '';

    // 1. Direct match
    if (dataMap[key] !== undefined && dataMap[key] !== null) {
      const val = String(dataMap[key]);
      return (val === 'null' || val === 'undefined') ? '' : val;
    }

    // 2. Uppercase match
    const upperKey = key.toUpperCase().replace(/\s+/g, '_');
    if (dataMap[upperKey] !== undefined && dataMap[upperKey] !== null) {
      const val = String(dataMap[upperKey]);
      return (val === 'null' || val === 'undefined') ? '' : val;
    }

    // 3. Lowercase match
    const lowerKey = key.toLowerCase().replace(/\s+/g, '_');
    if (dataMap[lowerKey] !== undefined && dataMap[lowerKey] !== null) {
      const val = String(dataMap[lowerKey]);
      return (val === 'null' || val === 'undefined') ? '' : val;
    }

    // 4. Case-insensitive key match in dataMap
    const foundKey = Object.keys(dataMap).find(k => k.toLowerCase() === lowerKey);
    if (foundKey && dataMap[foundKey] !== undefined && dataMap[foundKey] !== null) {
      const val = String(dataMap[foundKey]);
      return (val === 'null' || val === 'undefined') ? '' : val;
    }

    // Not found / empty -> return empty or strip, never 'null' or 'undefined'
    return '-';
  });
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

/**
 * Render physical .docx from Supabase Storage with dynamic case data,
 * and parse the output directly to HTML using Mammoth for live preview.
 */
export async function renderDocxToHtml({
  template,
  caseData,
  formValues = {},
  personnelList = []
}) {
  if (!template) {
    throw new Error('Template dokumen belum dipilih.');
  }

  // If no physical file on Supabase Storage
  if (!template.file_path) {
    return {
      hasPhysicalFile: false,
      html: null,
      message: 'Template ini belum memiliki file master .docx di Supabase Storage.'
    };
  }

  // 1. Fetch .docx ArrayBuffer
  const arrayBuffer = await fetchDocxArrayBuffer(template.file_path);

  // 2. Load into PizZip & clean delimiters
  const zip = new PizZip(arrayBuffer);
  normalizeDocxXml(zip);

  // 3. Build data map
  const dataMap = buildDocxDataMap({ caseData, formValues, personnelList });

  // 4. Render placeholders
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ''
  });

  doc.render(dataMap);

  // 5. Generate rendered ArrayBuffer
  const renderedBuffer = doc.getZip().generate({
    type: 'arraybuffer'
  });

  // 6. Convert to HTML using Mammoth
  const mammothOptions = {
    styleMap: [
      "p[style-name='Title'] => h1.police-doc-title:fresh",
      "p[style-name='Subtitle'] => h2.police-doc-subtitle:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "table => table.mammoth-doc-table:fresh"
    ]
  };

  const mammothInput = {
    arrayBuffer: renderedBuffer,
    buffer: typeof Buffer !== 'undefined' ? Buffer.from(renderedBuffer) : renderedBuffer
  };

  const result = await mammoth.convertToHtml(mammothInput, mammothOptions);

  const cleanTitle = (template.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanNoLp = (caseData?.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${cleanNoLp}.docx`;

  return {
    hasPhysicalFile: true,
    html: result.value,
    messages: result.messages,
    filename,
    dataMap
  };
}

/**
 * Generate processed .docx Blob directly from Supabase Storage with dynamic data injected.
 * Used by docx-preview to render the document in its native Word layout.
 */
export async function generateDocxBlob({
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

  // If no physical file on Supabase Storage
  if (!template.file_path) {
    return {
      hasPhysicalFile: false,
      blob: null,
      message: 'Template ini belum memiliki file master .docx di Supabase Storage.'
    };
  }

  // 1. Fetch .docx ArrayBuffer
  const arrayBuffer = await fetchDocxArrayBuffer(template.file_path);

  // 2. Load into PizZip & clean delimiters
  const zip = new PizZip(arrayBuffer);
  normalizeDocxXml(zip);

  // 3. Build data map
  const dataMap = buildDocxDataMap({ caseData, formValues, personnelList });

  // 4. Render placeholders
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ''
  });

  doc.render(dataMap);

  // 5. Generate output Blob
  const outputBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const cleanTitle = (template.title || 'Dokumen_Mindik').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanNoLp = (caseData?.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${cleanNoLp}.docx`;

  return {
    hasPhysicalFile: true,
    blob: outputBlob,
    filename,
    dataMap
  };
}

/**
 * Send DOCX blob to conversion endpoint /api/convert-docx-to-pdf and return PDF Blob.
 */
export async function convertDocxToPdf(docxBlob) {
  if (!docxBlob) throw new Error('Blob .docx tidak valid.');

  const arrayBuffer = await docxBlob.arrayBuffer();
  // Safe base64 conversion for binary buffer
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64String = btoa(binary);

  const response = await fetch('/api/convert-docx-to-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ docxBase64: base64String })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Gagal mengonversi ke PDF (status: ${response.status})`);
  }

  return await response.blob();
}

/**
 * High level workflow: Injeksi template .docx -> Konversi ke PDF -> Return PDF blob & blob URL
 */
export async function generatePdfBlob({
  template,
  caseData,
  formValues = {},
  personnelList = []
}) {
  const docxRes = await generateDocxBlob({
    template,
    caseData,
    formValues,
    personnelList
  });

  if (!docxRes.hasPhysicalFile || !docxRes.blob) {
    return {
      hasPhysicalFile: false,
      pdfBlob: null,
      pdfBlobUrl: null,
      docxBlob: null,
      filename: null
    };
  }

  const pdfBlob = await convertDocxToPdf(docxRes.blob);
  const pdfBlobUrl = URL.createObjectURL(pdfBlob);

  return {
    hasPhysicalFile: true,
    pdfBlob,
    pdfBlobUrl,
    docxBlob: docxRes.blob,
    filename: docxRes.filename.replace(/\.docx$/i, '.pdf'),
    dataMap: docxRes.dataMap
  };
}

