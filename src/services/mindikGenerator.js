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

// In-memory cache for master .docx buffers from Supabase Storage
const templateBufferCache = new Map();

/**
 * Clear in-memory template buffer cache if templates are modified in Template Studio
 */
export function clearTemplateBufferCache() {
  templateBufferCache.clear();
}

/**
 * Fetch physical .docx file from Supabase Storage.
 * Supports memory cache, 'templates' and 'docx-templates' buckets, as well as subfolders.
 */
export async function fetchDocxArrayBuffer(filePath) {
  if (!filePath) {
    throw new Error('Path template file di Supabase Storage tidak valid.');
  }

  // 1. Check in-memory cache first (Instant < 1ms response)
  if (templateBufferCache.has(filePath)) {
    const cached = templateBufferCache.get(filePath);
    return cached.slice(0); // cloned buffer
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
          const ab = await data.arrayBuffer();
          templateBufferCache.set(filePath, ab);
          return ab.slice(0);
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
            const ab = await res.arrayBuffer();
            templateBufferCache.set(filePath, ab);
            return ab.slice(0);
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
      const ab = await res.arrayBuffer();
      templateBufferCache.set(filePath, ab);
      return ab.slice(0);
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
 * STANDARISASI DATA VARIABEL (KAMUS RESMI MINDIK)
 * Menghilangkan prefix CASE_, person, validity, dan string hardcoded.
 * Mendukung format huruf besar (UPPERCASE) dan huruf kecil (lowercase).
 */
export function buildMindikVariables(lpData = {}, formValues = {}, dynamicConfig = [], personnelList = []) {
  // A. Bersihkan kurung kurawal jika ada user yang mengetik tanda { } di form
  const cleanInput = {};
  Object.keys(formValues || {}).forEach((k) => {
    const cleanKey = k.replace(/[{}]/g, '').trim();
    cleanInput[cleanKey] = formValues[k];
  });

  // B. Nilai Prioritas Form Input
  const nomorSurat = cleanInput.NOMOR_SURAT || cleanInput.nomor_surat || cleanInput.DOC_NO || cleanInput.doc_no || '';
  const tempatSurat = cleanInput.TEMPAT_SURAT || cleanInput.tempat_surat || cleanInput.DOC_LOCATION || cleanInput.doc_location || 'Tirawuta';
  const tanggalSurat = cleanInput.TANGGAL_SURAT || cleanInput.tanggal_surat || cleanInput.DOC_DATE || cleanInput.doc_date || '';
  const tujuanSurat = cleanInput.TUJUAN_SURAT || cleanInput.tujuan_surat || cleanInput.DOC_TARGET || cleanInput.doc_target || 'Kepala Kejaksaan Negeri Kolaka';
  const alamatTujuan = cleanInput.ALAMAT_TUJUAN || cleanInput.alamat_tujuan || cleanInput.DOC_TARGET_ADDR || cleanInput.doc_target_addr || 'Jl. Dr. Sutomo No. 5, Kolaka';
  const masaBerlaku = cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || cleanInput.DOC_VALIDITY || cleanInput.doc_validity || '30 (tiga puluh) hari';

  // Helper untuk pelapor & terlapor / tersangka
  const person = lpData.person || {};
  const pelaporName = lpData.pelapor_name || lpData.pelapor || '';
  const terlaporName = lpData.tersangka || lpData.nama_tersangka || person.nama || lpData.terlapor_name || '';
  const nik = lpData.nik_tersangka || lpData.nik || person.nik || '-';
  const gender = lpData.jenis_kelamin_tersangka || lpData.jenis_kelamin || person.gender || 'Laki-laki';
  const ttl = lpData.ttl_tersangka || lpData.ttl || person.pob_dob || '-';
  const rawUmur = lpData.umur_tersangka || lpData.umur || person.umur;
  const umur = rawUmur ? (String(rawUmur).includes('Tahun') ? rawUmur : `${rawUmur} Tahun`) : '-';
  const agama = lpData.agama_tersangka || lpData.agama || person.agama || 'Islam';
  const pekerjaan = lpData.pekerjaan_tersangka || lpData.pekerjaan || person.pekerjaan || 'Swasta';
  const alamat = lpData.alamat_tersangka || lpData.alamat || person.alamat || lpData.locus || '';
  const pendidikan = lpData.pendidikan_tersangka || lpData.pendidikan || person.pendidikan || 'SMA';
  const kewarganegaraan = lpData.kewarganegaraan || person.kewarganegaraan || 'Indonesia';

  // Helper untuk penyidik & kasat dari personnelList jika tersedia
  const findPerson = (id) => (personnelList || []).find(p => p.id === id || p.nrp === id);
  const assignedInv = Array.isArray(lpData.investigators) ? lpData.investigators : [];
  let p1Obj = null;
  if (assignedInv[0]) {
    p1Obj = findPerson(assignedInv[0].user_id) || assignedInv[0];
  }
  const penyidik1Nama = lpData.penyidik_1_nama || p1Obj?.nama || cleanInput.PENYIDIK_NAMA || cleanInput.penyidik_nama || '';
  const penyidik1Pangkat = lpData.penyidik_1_pangkat || p1Obj?.pangkat || '';
  const penyidik1Nrp = lpData.penyidik_1_nrp || p1Obj?.nrp || '';
  const penyidik1Jabatan = lpData.penyidik_1_jabatan || p1Obj?.jabatan || 'PENYIDIK PEMBANTU';

  let p2Obj = null;
  if (assignedInv[1]) {
    p2Obj = findPerson(assignedInv[1].user_id) || assignedInv[1];
  }
  const penyidik2Nama = lpData.penyidik_2_nama || p2Obj?.nama || cleanInput.PENYIDIK_2_NAMA || cleanInput.penyidik_2_nama || '';

  const atasanId = cleanInput.DOC_SIGNER_ATASAN_NAME;
  const kasat = atasanId ? findPerson(atasanId) : ((personnelList || []).find(p => p.role === 'Kasat') || (personnelList || [])[0]);
  const atasanNama = lpData.kasat_nama || cleanInput.ATASAN_NAMA || cleanInput.atasan_nama || kasat?.nama || '';
  const atasanPangkat = lpData.kasat_pangkat || kasat?.pangkat || '';
  const atasanNrp = lpData.kasat_nrp || kasat?.nrp || '';
  const atasanJabatan = lpData.kasat_jabatan || kasat?.jabatan || 'KASAT RESKRIM';

  // C. Kamus Standar Dokumen Mindik (Support Uppercase & Lowercase)
  const baseMap = {
    // Administrasi & Kop
    NOMOR_SURAT: nomorSurat,
    nomor_surat: nomorSurat,
    TEMPAT_SURAT: tempatSurat,
    tempat_surat: tempatSurat,
    TANGGAL_SURAT: tanggalSurat,
    tanggal_surat: tanggalSurat,
    TUJUAN_SURAT: tujuanSurat,
    tujuan_surat: tujuanSurat,
    ALAMAT_TUJUAN: alamatTujuan,
    alamat_tujuan: alamatTujuan,
    MASA_BERLAKU: masaBerlaku,
    masa_berlaku: masaBerlaku,

    // Berkas Perkara & Rumusan Tindak Pidana
    NOMOR_LP: lpData.no_lp || lpData.nomor_lp || '',
    nomor_lp: lpData.no_lp || lpData.nomor_lp || '',
    DASAR_PASAL_UU: lpData.pasal_uu || lpData.dasar_pasal_uu || lpData.pasal || '',
    dasar_pasal_uu: lpData.pasal_uu || lpData.dasar_pasal_uu || lpData.pasal || '',
    PASAL: lpData.pasal || lpData.pasal_uu || '',
    pasal: lpData.pasal || lpData.pasal_uu || '',
    TINDAK_PIDANA: lpData.tindak_pidana || '',
    tindak_pidana: lpData.tindak_pidana || '',
    TEMPAT_KEJADIAN: lpData.locus || '',
    tempat_kejadian: lpData.locus || '',
    WAKTU_KEJADIAN: lpData.tempus || '',
    waktu_kejadian: lpData.tempus || '',
    STATUS_KASUS: lpData.status || 'DALAM PROSES PENYIDIKAN',
    status_kasus: lpData.status || 'DALAM PROSES PENYIDIKAN',

    // Pelapor & Terlapor / Tersangka
    NAMA_PELAPOR: pelaporName,
    nama_pelapor: pelaporName,
    NAMA_TERLAPOR: terlaporName,
    nama_terlapor: terlaporName,
    NIK: nik,
    nik: nik,
    JENIS_KELAMIN: gender,
    jenis_kelamin: gender,
    TTL: ttl,
    ttl: ttl,
    UMUR: umur,
    umur: umur,
    AGAMA: agama,
    agama: agama,
    PEKERJAAN: pekerjaan,
    pekerjaan: pekerjaan,
    ALAMAT: alamat,
    alamat: alamat,
    PENDIDIKAN: pendidikan,
    pendidikan: pendidikan,
    KEWARGANEGARAAN: kewarganegaraan,
    kewarganegaraan: kewarganegaraan,

    // Penyidik
    PENYIDIK_NAMA: penyidik1Nama,
    penyidik_nama: penyidik1Nama,
    PENYIDIK_PANGKAT: penyidik1Pangkat,
    penyidik_pangkat: penyidik1Pangkat,
    PENYIDIK_NRP: penyidik1Nrp,
    penyidik_nrp: penyidik1Nrp,
    PENYIDIK_JABATAN: penyidik1Jabatan,
    penyidik_jabatan: penyidik1Jabatan,
    PENYIDIK_2_NAMA: penyidik2Nama,
    penyidik_2_nama: penyidik2Nama,

    // Atasan / Kasat
    ATASAN_NAMA: atasanNama,
    atasan_nama: atasanNama,
    ATASAN_PANGKAT: atasanPangkat,
    atasan_pangkat: atasanPangkat,
    ATASAN_NRP: atasanNrp,
    atasan_nrp: atasanNrp,
    ATASAN_JABATAN: atasanJabatan,
    atasan_jabatan: atasanJabatan,

    // Kompatibilitas mundur (Legacy Aliases)
    DOC_NO: nomorSurat,
    doc_no: nomorSurat,
    nomor_spdp: nomorSurat,
    DOC_LOCATION: tempatSurat,
    doc_location: tempatSurat,
    DOC_DATE: tanggalSurat,
    doc_date: tanggalSurat,
  };

  // D. Terapkan nilai default dari dynamicConfig jika belum diisi user
  if (Array.isArray(dynamicConfig)) {
    dynamicConfig.forEach((cfg) => {
      const k = (cfg.field_key || cfg.key || '').replace(/[{}]/g, '').trim();
      if (k && !(k in cleanInput) && !(k.toUpperCase() in cleanInput) && !(k.toLowerCase() in cleanInput)) {
        const def = cfg.default_value !== undefined ? cfg.default_value : (cfg.placeholder || '');
        if (def) {
          baseMap[k] = def;
          baseMap[k.toUpperCase()] = def;
          baseMap[k.toLowerCase()] = def;
        }
      }
    });
  }

  // E. Gabungkan seluruh custom dynamic field yang diisi user (prioritas tertinggi)
  const finalMap = { ...baseMap };
  Object.keys(cleanInput).forEach((key) => {
    finalMap[key] = cleanInput[key];
    finalMap[key.toUpperCase()] = cleanInput[key];
    finalMap[key.toLowerCase()] = cleanInput[key];
  });

  // Bersihkan nilai null / undefined agar tidak merender teks 'null' atau 'undefined'
  Object.keys(finalMap).forEach((k) => {
    if (finalMap[k] === null || finalMap[k] === undefined || finalMap[k] === 'null' || finalMap[k] === 'undefined') {
      finalMap[k] = '';
    }
  });

  return finalMap;
}

/**
 * Adapter fungsi kompatibilitas mundur
 */
export function buildDocxDataMap({ caseData = {}, formValues = {}, personnelList = [], dynamicConfig = [] }) {
  return buildMindikVariables(caseData, formValues, dynamicConfig, personnelList);
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
  const dataMap = buildMindikVariables(caseData, formValues, template?.dynamic_fields, personnelList);

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
  const dataMap = buildMindikVariables(caseData, formValues, template?.dynamic_fields, personnelList);

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
  const dataMap = buildMindikVariables(caseData, formValues, template?.dynamic_fields, personnelList);

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
 * Uses binary FormData with fallback to Supabase Storage path to prevent 413 Payload Too Large.
 */
export async function convertDocxToPdf(docxBlob, options = {}) {
  if (!docxBlob && !options.storagePath && !options.fileUrl) {
    throw new Error('Blob .docx atau storagePath tidak valid.');
  }

  let response;

  // 1. If storagePath or fileUrl provided, send via direct path
  if (options.storagePath || options.fileUrl) {
    response = await fetch('/api/convert-docx-to-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storagePath: options.storagePath,
        fileUrl: options.fileUrl
      })
    });
  } else {
    // 2. Send via FormData multipart binary
    const formData = new FormData();
    formData.append('file', docxBlob, 'document.docx');

    response = await fetch('/api/convert-docx-to-pdf', {
      method: 'POST',
      body: formData
    });

    // 3. Fallback if hit 413 (Payload Too Large) and Supabase storagePath is available
    if (response.status === 413 && options.fallbackStoragePath) {
      console.warn('FormData payload terkena batas 413, beralih ke jalur Supabase Storage path:', options.fallbackStoragePath);
      response = await fetch('/api/convert-docx-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storagePath: options.fallbackStoragePath
        })
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Gagal mengonversi ke PDF (status: ${response.status})`);
  }

  return await response.blob();
}

/**
 * In-memory cache for rendered PDFs: (templateId_variablesHash) => Blob
 */
const pdfRenderCache = new Map();

/**
 * Clear rendered PDF cache if needed
 */
export function clearPdfRenderCache() {
  pdfRenderCache.clear();
}

/**
 * High level workflow: Injeksi template .docx master -> Konversi ke PDF -> Return PDF blob & blob URL
 * Includes instant render cache if variable values have not changed.
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
      filename: null,
      isCached: false
    };
  }

  // Check cache: key by template ID / path + JSON of variables
  const cacheKey = `${template.id || template.file_path}_${JSON.stringify(docxRes.dataMap)}`;
  let pdfBlob = pdfRenderCache.get(cacheKey);
  let isCached = false;

  if (pdfBlob) {
    isCached = true;
  } else {
    // Perform true file-to-file conversion
    pdfBlob = await convertDocxToPdf(docxRes.blob, {
      fallbackStoragePath: template?.file_path
    });

    // Save in cache (keep last 20 generated PDFs)
    if (pdfRenderCache.size > 20) {
      const firstKey = pdfRenderCache.keys().next().value;
      pdfRenderCache.delete(firstKey);
    }
    pdfRenderCache.set(cacheKey, pdfBlob);
  }

  const pdfBlobUrl = URL.createObjectURL(pdfBlob);

  return {
    hasPhysicalFile: true,
    pdfBlob,
    pdfBlobUrl,
    docxBlob: docxRes.blob,
    filename: docxRes.filename.replace(/\.docx$/i, '.pdf'),
    dataMap: docxRes.dataMap,
    isCached
  };
}


