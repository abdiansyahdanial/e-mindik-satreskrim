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
 * Konversi string tanggal (misal ISO '2026-09-10') ke format teks bahasa Indonesia resmi: '10 September 2026'.
 * Menangani teks yang sudah terformat agar tidak rusak dan aman untuk input manual maupun date picker HTML.
 */
export function formatTanggalIndonesia(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr !== 'string') {
    try {
      dateStr = String(dateStr);
    } catch {
      return '';
    }
  }
  // Tangani jika format sudah berupa teks (bukan YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;

  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const parts = dateStr.split('T')[0].split('-');
  const tahun = parts[0];
  const bulan = bulanIndo[parseInt(parts[1], 10) - 1];
  const hari = parseInt(parts[2], 10).toString();

  return `${hari} ${bulan} ${tahun}`;
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
 * STANDAR KAMUS VARIABEL MINDIK (BAGIAN 5 STANDARISASI ARSITEKTUR)
 * Pemetaan variabel Docxtemplater baku dengan dukungan huruf besar (UPPERCASE)
 * dan huruf kecil (lowercase), rujukan perkara, rujukan tersangka, dan multi-tersangka.
 */
export function buildMindikPayload({ activeCase = {}, activeSuspect = {}, suspectsList = [], formValues = {} }) {
  // 1. Bersihkan tanda kurung kurawal jika ada user yang mengetik { } di form
  const cleanInput = {};
  Object.keys(formValues || {}).forEach((k) => {
    const cleanKey = k.replace(/[{}]/g, '').trim();
    cleanInput[cleanKey] = formValues[k];
  });

  const nomorSuratBaru = cleanInput.NOMOR_SURAT || cleanInput.nomor_surat || cleanInput.DOC_NO || '';
  const tempatSurat = cleanInput.TEMPAT_SURAT || cleanInput.tempat_surat || cleanInput.DOC_LOCATION || 'Tirawuta';

  // Format tanggal surat resmi
  const rawTanggalSurat = cleanInput.TANGGAL_SURAT || cleanInput.tanggal_surat || cleanInput.DOC_DATE || cleanInput.doc_date || new Date().toISOString().split('T')[0];
  const formattedTanggalSurat = formatTanggalIndonesia(rawTanggalSurat);

  const tujuanSurat = cleanInput.TUJUAN_SURAT || cleanInput.tujuan_surat || cleanInput.DOC_TARGET || 'Kepala Kejaksaan Negeri Kolaka';
  const alamatTujuan = cleanInput.ALAMAT_TUJUAN || cleanInput.alamat_tujuan || cleanInput.DOC_TARGET_ADDR || 'Jl. Dr. Sutomo No. 5, Kolaka';
  const masaBerlaku = cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || '30 (tiga puluh) hari';

  // Format tanggal-tanggal turunan perkara
  const rawTanggalLp = cleanInput.TANGGAL_LP || cleanInput.tanggal_lp || activeCase.tanggal_lp || activeCase.sprin_date || '';
  const formattedTanggalLp = formatTanggalIndonesia(rawTanggalLp);

  const rawTanggalPenetapan = cleanInput.TANGGAL_PENETAPAN || cleanInput.tanggal_penetapan || activeCase.tanggal_penetapan || '';
  const formattedTanggalPenetapan = formatTanggalIndonesia(rawTanggalPenetapan);

  const rawTanggalKejadian = cleanInput.TANGGAL_KEJADIAN || cleanInput.tanggal_kejadian || activeCase.tanggal_kejadian || activeCase.tgl_kejadian || '';
  const formattedTanggalKejadian = formatTanggalIndonesia(rawTanggalKejadian);

  const rawSprinDate = activeCase.sprin_date || '';
  const formattedSprinDate = formatTanggalIndonesia(rawSprinDate);

  const suspect = activeSuspect || {};
  const namaTsk = suspect.nama || activeCase.nama_terlapor || activeCase.terlapor_name || '';
  const rawTglLahirSuspect = suspect.tgl_lahir || suspect.tanggal_lahir || '';
  const formattedTglLahirSuspect = formatTanggalIndonesia(rawTglLahirSuspect);

  const baseMap = {
    // 1. Administrasi & Nomor Dokumen Aktif Hari Ini
    NOMOR_SURAT: nomorSuratBaru,
    nomor_surat: nomorSuratBaru,
    TEMPAT_SURAT: tempatSurat,
    tempat_surat: tempatSurat,
    TANGGAL_SURAT: formattedTanggalSurat,
    tanggal_surat: formattedTanggalSurat,
    DOC_DATE: formattedTanggalSurat,
    doc_date: formattedTanggalSurat,
    TUJUAN_SURAT: tujuanSurat,
    tujuan_surat: tujuanSurat,
    ALAMAT_TUJUAN: alamatTujuan,
    alamat_tujuan: alamatTujuan,
    MASA_BERLAKU: masaBerlaku,
    masa_berlaku: masaBerlaku,

    // 2. Rujukan Surat Tingkat Perkara (Otomatis dari tabel cases)
    NOMOR_LP: activeCase.nomor_lp || activeCase.no_lp || '',
    nomor_lp: activeCase.nomor_lp || activeCase.no_lp || '',
    TANGGAL_LP: formattedTanggalLp,
    tanggal_lp: formattedTanggalLp,
    NO_SPRIN_SIDIK: activeCase.no_sprin_sidik || '',
    no_sprin_sidik: activeCase.no_sprin_sidik || '',
    TANGGAL_SPRIN_SIDIK: formattedSprinDate,
    tanggal_sprin_sidik: formattedSprinDate,
    NO_SPDP: activeCase.no_spdp || '',
    no_spdp: activeCase.no_spdp || '',
    NO_P21_KN: activeCase.no_p21_kn || '',
    no_p21_kn: activeCase.no_p21_kn || '',
    TANGGAL_PENETAPAN: formattedTanggalPenetapan,
    tanggal_penetapan: formattedTanggalPenetapan,

    // 3. Rujukan Surat Tingkat Tersangka / Individu (Otomatis dari tabel case_suspects)
    NO_SP_TAP_TSK: suspect.no_sp_tap_tsk || '',
    no_sp_tap_tsk: suspect.no_sp_tap_tsk || '',
    NO_SPRIN_KAP: suspect.no_sprin_kap || '',
    no_sprin_kap: suspect.no_sprin_kap || '',
    NO_SPRIN_HAN: suspect.no_sprin_han || '',
    no_sprin_han: suspect.no_sprin_han || '',
    NO_PANJANG_HAN_KN: suspect.no_panjang_han_kn || '',
    no_panjang_han_kn: suspect.no_panjang_han_kn || '',
    NO_SPRIN_HAN_KN: suspect.no_sprin_han_kn || '',
    no_sprin_han_kn: suspect.no_sprin_han_kn || '',
    NO_TAP_HAN_PN_1: suspect.no_tap_han_pn_1 || '',
    no_tap_han_pn_1: suspect.no_tap_han_pn_1 || '',
    NO_SPRIN_HAN_PN_1: suspect.no_sprin_han_pn_1 || '',
    no_sprin_han_pn_1: suspect.no_sprin_han_pn_1 || '',
    NO_TAP_HAN_PN_2: suspect.no_tap_han_pn_2 || '',
    no_tap_han_pn_2: suspect.no_tap_han_pn_2 || '',
    NO_SPRIN_HAN_PN_2: suspect.no_sprin_han_pn_2 || '',
    no_sprin_han_pn_2: suspect.no_sprin_han_pn_2 || '',

    // 4. Unsur Yuridis Perkara
    DASAR_PASAL_UU: activeCase.dasar_pasal_uu || activeCase.pasal_uu || '',
    dasar_pasal_uu: activeCase.dasar_pasal_uu || activeCase.pasal_uu || '',
    PASAL: activeCase.pasal || '',
    pasal: activeCase.pasal || '',
    TINDAK_PIDANA: activeCase.tindak_pidana || '',
    tindak_pidana: activeCase.tindak_pidana || '',
    TEMPAT_KEJADIAN: activeCase.locus || '',
    tempat_kejadian: activeCase.locus || '',
    WAKTU_KEJADIAN: activeCase.tempus || '',
    waktu_kejadian: activeCase.tempus || '',
    TANGGAL_KEJADIAN: formattedTanggalKejadian,
    tanggal_kejadian: formattedTanggalKejadian,
    STATUS_KASUS: activeCase.status || 'DALAM PROSES PENYIDIKAN',
    status_kasus: activeCase.status || 'DALAM PROSES PENYIDIKAN',

    // 5. Identitas Pihak Terlibat
    NAMA_PELAPOR: activeCase.nama_pelapor || activeCase.pelapor_name || '',
    nama_pelapor: activeCase.nama_pelapor || activeCase.pelapor_name || '',
    NAMA_TERLAPOR: namaTsk,
    nama_terlapor: namaTsk,
    NIK: suspect.nik || '-',
    nik: suspect.nik || '-',
    JENIS_KELAMIN: suspect.jenis_kelamin || 'Laki-laki',
    jenis_kelamin: suspect.jenis_kelamin || 'Laki-laki',
    TTL: (suspect.tempat_lahir && rawTglLahirSuspect) ? `${suspect.tempat_lahir}, ${formattedTglLahirSuspect}` : (suspect.ttl || suspect.pob_dob || '-'),
    ttl: (suspect.tempat_lahir && rawTglLahirSuspect) ? `${suspect.tempat_lahir}, ${formattedTglLahirSuspect}` : (suspect.ttl || suspect.pob_dob || '-'),
    TEMPAT_LAHIR: suspect.tempat_lahir || '',
    tempat_lahir: suspect.tempat_lahir || '',
    TGL_LAHIR: formattedTglLahirSuspect,
    tgl_lahir: formattedTglLahirSuspect,
    UMUR: suspect.umur ? (String(suspect.umur).includes('Tahun') ? suspect.umur : `${suspect.umur} Tahun`) : '-',
    umur: suspect.umur ? (String(suspect.umur).includes('Tahun') ? suspect.umur : `${suspect.umur} Tahun`) : '-',
    AGAMA: suspect.agama || 'Islam',
    agama: suspect.agama || 'Islam',
    PEKERJAAN: suspect.pekerjaan || 'Swasta',
    pekerjaan: suspect.pekerjaan || 'Swasta',
    KEWARGANEGARAAN: suspect.kewarganegaraan || 'Indonesia',
    kewarganegaraan: suspect.kewarganegaraan || 'Indonesia',
    PENDIDIKAN: suspect.pendidikan || 'SMA',
    pendidikan: suspect.pendidikan || 'SMA',
    STATUS_KAWIN: suspect.status_pernikahan || suspect.marital_status || 'Kawin',
    status_kawin: suspect.status_pernikahan || suspect.marital_status || 'Kawin',
    ALAMAT: suspect.alamat || activeCase.alamat_tersangka || activeCase.locus || '',
    alamat: suspect.alamat || activeCase.alamat_tersangka || activeCase.locus || '',

    // 6. Penyidik & Pejabat
    PENYIDIK_NAMA: activeCase.penyidik_1_nama || cleanInput.PENYIDIK_NAMA || '',
    penyidik_nama: activeCase.penyidik_1_nama || cleanInput.PENYIDIK_NAMA || '',
    PENYIDIK_PANGKAT: activeCase.penyidik_1_pangkat || '',
    penyidik_pangkat: activeCase.penyidik_1_pangkat || '',
    PENYIDIK_NRP: activeCase.penyidik_1_nrp || '',
    penyidik_nrp: activeCase.penyidik_1_nrp || '',
    PENYIDIK_JABATAN: activeCase.penyidik_1_jabatan || 'PENYIDIK PEMBANTU',
    penyidik_jabatan: activeCase.penyidik_1_jabatan || 'PENYIDIK PEMBANTU',
    PENYIDIK_2_NAMA: activeCase.penyidik_2_nama || cleanInput.PENYIDIK_2_NAMA || '',
    penyidik_2_nama: activeCase.penyidik_2_nama || cleanInput.PENYIDIK_2_NAMA || '',
    ATASAN_NAMA: activeCase.kasat_nama || cleanInput.ATASAN_NAMA || '',
    atasan_nama: activeCase.kasat_nama || cleanInput.ATASAN_NAMA || '',
    ATASAN_PANGKAT: activeCase.kasat_pangkat || '',
    atasan_pangkat: activeCase.kasat_pangkat || '',
    ATASAN_NRP: activeCase.kasat_nrp || '',
    atasan_nrp: activeCase.kasat_nrp || '',
    ATASAN_JABATAN: activeCase.kasat_jabatan || 'KASAT RESKRIM',
    atasan_jabatan: activeCase.kasat_jabatan || 'KASAT RESKRIM',

    // 7. Dukungan Multi-Tersangka (Array Perulangan Dokumen Kolektif)
    tersangka_list: (suspectsList || []).map((s, idx) => {
      const sTglLahir = s.tgl_lahir || s.tanggal_lahir || '';
      const formattedSTglLahir = formatTanggalIndonesia(sTglLahir);
      return {
        no: idx + 1,
        nama: s.nama,
        nik: s.nik || '-',
        jenis_kelamin: s.jenis_kelamin || 'Laki-laki',
        ttl: (s.tempat_lahir && sTglLahir) ? `${s.tempat_lahir}, ${formattedSTglLahir}` : (s.ttl || s.pob_dob || '-'),
        tempat_lahir: s.tempat_lahir || '',
        tgl_lahir: formattedSTglLahir,
        umur: s.umur ? (String(s.umur).includes('Tahun') ? s.umur : `${s.umur} Tahun`) : '-',
        agama: s.agama || 'Islam',
        pekerjaan: s.pekerjaan || 'Swasta',
        pendidikan: s.pendidikan || 'SMA',
        kewarganegaraan: s.kewarganegaraan || 'Indonesia',
        status_kawin: s.status_pernikahan || s.marital_status || 'Kawin',
        alamat: s.alamat || '-'
      };
    }),

    // Legacy Aliases
    DOC_NO: nomorSuratBaru,
    doc_no: nomorSuratBaru,
    DOC_LOCATION: tempatSurat,
    doc_location: tempatSurat,
    DOC_DATE: formattedTanggalSurat,
    doc_date: formattedTanggalSurat,
  };

  // 8. Timpa dengan custom field manual form dinamis
  const finalPayload = { ...baseMap };
  Object.keys(cleanInput).forEach((key) => {
    let val = cleanInput[key];
    // Jika nilai input berupa format tanggal ISO YYYY-MM-DD, format ke teks Indonesia resmi
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      val = formatTanggalIndonesia(val);
    }
    finalPayload[key] = val;
    finalPayload[key.toUpperCase()] = val;
    finalPayload[key.toLowerCase()] = val;
  });

  // Pastikan variabel tanggal surat utama selalu terformat teks Indonesia resmi
  finalPayload.TANGGAL_SURAT = formattedTanggalSurat;
  finalPayload.tanggal_surat = formattedTanggalSurat;
  finalPayload.DOC_DATE = formattedTanggalSurat;
  finalPayload.doc_date = formattedTanggalSurat;

  // Bersihkan nilai null / undefined agar tidak merender teks 'null' atau 'undefined'
  Object.keys(finalPayload).forEach((k) => {
    if (finalPayload[k] === null || finalPayload[k] === undefined || finalPayload[k] === 'null' || finalPayload[k] === 'undefined') {
      finalPayload[k] = '';
    }
  });

  return finalPayload;
}

/**
 * Backward-compatible adapter for existing calls to buildMindikVariables
 */
export function buildMindikVariables(lpData = {}, formValues = {}, dynamicConfig = [], personnelList = [], options = {}) {
  const activeCase = { ...lpData };

  // Sync investigator fields if not directly present on activeCase
  if (!activeCase.penyidik_1_nama && Array.isArray(lpData.investigators) && lpData.investigators[0]) {
    const inv1 = lpData.investigators[0];
    const found = (personnelList || []).find(p => p.id === inv1.user_id || p.nrp === inv1.nrp) || inv1;
    activeCase.penyidik_1_nama = found.nama || inv1.nama;
    activeCase.penyidik_1_pangkat = found.pangkat || inv1.pangkat;
    activeCase.penyidik_1_nrp = found.nrp || inv1.nrp;
    activeCase.penyidik_1_jabatan = found.jabatan || inv1.jabatan;
  }
  if (!activeCase.penyidik_2_nama && Array.isArray(lpData.investigators) && lpData.investigators[1]) {
    const inv2 = lpData.investigators[1];
    const found2 = (personnelList || []).find(p => p.id === inv2.user_id || p.nrp === inv2.nrp) || inv2;
    activeCase.penyidik_2_nama = found2.nama || inv2.nama;
  }
  if (!activeCase.kasat_nama) {
    const kasat = (personnelList || []).find(p => p.role === 'Kasat') || (personnelList || [])[0];
    if (kasat) {
      activeCase.kasat_nama = kasat.nama;
      activeCase.kasat_pangkat = kasat.pangkat;
      activeCase.kasat_nrp = kasat.nrp;
      activeCase.kasat_jabatan = kasat.jabatan || 'KASAT RESKRIM';
    }
  }

  const activeSuspect = options.activeSuspect || lpData.activeSuspect || lpData.person || null;
  const suspectsList = options.suspectsList || lpData.suspectsList || (activeSuspect ? [activeSuspect] : []);

  return buildMindikPayload({
    activeCase,
    activeSuspect,
    suspectsList,
    formValues
  });
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
  activeCase,
  activeSuspect,
  suspectsList,
  formValues = {},
  personnelList = []
}) {
  if (!template) {
    throw new Error('Template dokumen belum dipilih.');
  }
  const currentCase = activeCase || caseData;
  if (!currentCase) {
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
  const dataMap = buildMindikVariables(currentCase, formValues, template?.dynamic_fields, personnelList, {
    activeSuspect,
    suspectsList
  });

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
  const cleanNoLp = (currentCase.nomor_lp || currentCase.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
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
  activeCase,
  activeSuspect,
  suspectsList,
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

  const currentCase = activeCase || caseData;

  // 1. Fetch .docx ArrayBuffer
  const arrayBuffer = await fetchDocxArrayBuffer(template.file_path);

  // 2. Load into PizZip & clean delimiters
  const zip = new PizZip(arrayBuffer);
  normalizeDocxXml(zip);

  // 3. Build data map
  const dataMap = buildMindikVariables(currentCase, formValues, template?.dynamic_fields, personnelList, {
    activeSuspect,
    suspectsList
  });

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
  const cleanNoLp = (currentCase?.nomor_lp || currentCase?.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
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
  activeCase,
  activeSuspect,
  suspectsList,
  formValues = {},
  personnelList = []
}) {
  if (!template) {
    throw new Error('Template dokumen belum dipilih.');
  }
  const currentCase = activeCase || caseData;
  if (!currentCase) {
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
  const dataMap = buildMindikVariables(currentCase, formValues, template?.dynamic_fields, personnelList, {
    activeSuspect,
    suspectsList
  });

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
  const cleanNoLp = (currentCase?.nomor_lp || currentCase?.no_lp || 'LP').replace(/[^a-zA-Z0-9_-]/g, '_');
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
  activeCase,
  activeSuspect,
  suspectsList,
  formValues = {},
  personnelList = []
}) {
  const currentCase = activeCase || caseData;
  const docxRes = await generateDocxBlob({
    template,
    caseData: currentCase,
    activeCase: currentCase,
    activeSuspect,
    suspectsList,
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


