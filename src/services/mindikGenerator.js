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

  // If filePath is a direct HTTP/HTTPS URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      const res = await fetch(filePath);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        templateBufferCache.set(filePath, ab);
        return ab.slice(0);
      }
    } catch (e) {
      console.warn('Fetch from direct URL failed, continuing with storage paths:', e);
    }
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
 * STANDAR KAMUS PEMETAAN VARIABEL MINDIK RESMI SAT RESKRIM POLRES KOLAKA TIMUR
 * 
 * Memetakan SELURUH tag standar resmi secara konsisten (A. Surat Aktif, B. Rujukan Perkara,
 * C. Rujukan Tersangka, D. Unsur Yuridis & Perkara, E. Identitas Pihak, F. Penyidik & Pejabat).
 * 
 * Mendukung pemanggilan fleksibel:
 * - Positional: buildMindikPayload(activeCase, activeSuspect, cleanInput, suspectsList)
 * - Object: buildMindikPayload({ activeCase, activeSuspect, suspectsList, formValues })
 */
export function buildMindikPayload(arg1 = {}, maybeSuspect = null, maybeInput = {}, maybeSuspectsList = []) {
  let activeCase = {};
  let activeSuspect = null;
  let suspectsList = [];
  let formValues = {};

  // Deteksi fleksibel parameter object vs positional
  if (arg1 && (arg1.activeCase !== undefined || arg1.formValues !== undefined || arg1.activeSuspect !== undefined || arg1.suspectsList !== undefined)) {
    activeCase = arg1.activeCase || {};
    activeSuspect = arg1.activeSuspect || null;
    suspectsList = arg1.suspectsList || [];
    formValues = arg1.formValues || {};
  } else {
    activeCase = arg1 || {};
    activeSuspect = maybeSuspect || null;
    formValues = maybeInput || {};
    suspectsList = Array.isArray(maybeSuspectsList) && maybeSuspectsList.length > 0
      ? maybeSuspectsList
      : (activeSuspect ? [activeSuspect] : (activeCase.suspectsList || []));
  }

  // Bersihkan tanda kurung kurawal jika ada user yang mengetik { } di form
  const cleanInput = {};
  Object.keys(formValues || {}).forEach((k) => {
    const cleanKey = k.replace(/[{}]/g, '').trim();
    cleanInput[cleanKey] = formValues[k];
  });

  // A. SURAT AKTIF
  const nomorSurat = cleanInput.NOMOR_SURAT || cleanInput.doc_no || cleanInput.DOC_NO || cleanInput.nomor_surat || '';
  const rawTanggalSurat = cleanInput.TANGGAL_SURAT || cleanInput.DOC_DATE || cleanInput.tanggal_surat || cleanInput.doc_date || new Date().toISOString().split('T')[0];
  const tanggalSurat = formatTanggalIndonesia(rawTanggalSurat);
  const tempatSurat = cleanInput.TEMPAT_SURAT || cleanInput.tempat_surat || cleanInput.DOC_LOCATION || 'Tirawuta';
  const tujuanSurat = cleanInput.TUJUAN_SURAT || cleanInput.tujuan_surat || cleanInput.DOC_TARGET || '';
  const alamatTujuan = cleanInput.ALAMAT_TUJUAN || cleanInput.alamat_tujuan || cleanInput.DOC_TARGET_ADDR || '';
  const masaBerlaku = cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || '';

  // B. RUJUKAN TINGKAT PERKARA (dari activeCase / input form)
  const nomorLp = cleanInput.NOMOR_LP || cleanInput.nomor_lp || activeCase?.nomor_lp || activeCase?.no_lp || '';
  const rawTanggalLp = cleanInput.TANGGAL_LP || cleanInput.tanggal_lp || cleanInput.TGL_LP || cleanInput.tgl_lp || activeCase?.tanggal_lp || activeCase?.sprin_date || '';
  const tanggalLp = formatTanggalIndonesia(rawTanggalLp);

  const noSprinSidik = cleanInput.NO_SPRIN_SIDIK || cleanInput.no_sprin_sidik || activeCase?.no_sprin_sidik || '';
  const rawTglSprinSidik = cleanInput.TGL_SPRIN_SIDIK || cleanInput.tgl_sprin_sidik || cleanInput.TANGGAL_SPRIN_SIDIK || cleanInput.tanggal_sprin_sidik || activeCase?.tgl_sprin_sidik || activeCase?.sprin_date || '';
  const tglSprinSidik = formatTanggalIndonesia(rawTglSprinSidik);

  const noSpdp = cleanInput.NO_SPDP || cleanInput.no_spdp || activeCase?.no_spdp || '';
  const rawTglSpdp = cleanInput.TGL_SPDP || cleanInput.tgl_spdp || cleanInput.TANGGAL_SPDP || cleanInput.tanggal_spdp || activeCase?.tgl_spdp || '';
  const tglSpdp = formatTanggalIndonesia(rawTglSpdp);

  const noP21Kn = cleanInput.NO_P21_KN || cleanInput.no_p21_kn || activeCase?.no_p21_kn || '';
  const rawTglP21Kn = cleanInput.TGL_P21_KN || cleanInput.tgl_p21_kn || activeCase?.tgl_p21_kn || '';
  const tglP21Kn = formatTanggalIndonesia(rawTglP21Kn);

  // C. RUJUKAN TINGKAT TERSANGKA (dari activeSuspect / input form)
  const noSpTapTsk = cleanInput.NO_SP_TAP_TSK || cleanInput.no_sp_tap_tsk || activeSuspect?.no_sp_tap_tsk || '';
  const rawTglSpTapTsk = cleanInput.TGL_SP_TAP_TSK || cleanInput.tgl_sp_tap_tsk || cleanInput.TANGGAL_SP_TAP_TSK || cleanInput.tanggal_sp_tap_tsk || activeSuspect?.tgl_sp_tap_tsk || activeCase?.tgl_sp_tap_tsk || activeCase?.tanggal_penetapan || '';
  const tglSpTapTsk = formatTanggalIndonesia(rawTglSpTapTsk);

  const noSprinKap = cleanInput.NO_SPRIN_KAP || cleanInput.no_sprin_kap || activeSuspect?.no_sprin_kap || '';
  const rawTglSprinKap = cleanInput.TGL_SPRIN_KAP || cleanInput.tgl_sprin_kap || cleanInput.TANGGAL_SPRIN_KAP || cleanInput.tanggal_sprin_kap || activeSuspect?.tgl_sprin_kap || '';
  const tglSprinKap = formatTanggalIndonesia(rawTglSprinKap);

  const noSprinHan = cleanInput.NO_SPRIN_HAN || cleanInput.no_sprin_han || activeSuspect?.no_sprin_han || '';
  const rawTglSprinHan = cleanInput.TGL_SPRIN_HAN || cleanInput.tgl_sprin_han || cleanInput.TANGGAL_SPRIN_HAN || cleanInput.tanggal_sprin_han || activeSuspect?.tgl_sprin_han || '';
  const tglSprinHan = formatTanggalIndonesia(rawTglSprinHan);

  const noPanjangHanKn = cleanInput.NO_PANJANG_HAN_KN || cleanInput.no_panjang_han_kn || activeSuspect?.no_panjang_han_kn || '';
  const rawTglPanjangHanKn = cleanInput.TGL_PANJANG_HAN_KN || cleanInput.tgl_panjang_han_kn || activeSuspect?.tgl_panjang_han_kn || '';
  const tglPanjangHanKn = formatTanggalIndonesia(rawTglPanjangHanKn);

  const noSprinHanKn = cleanInput.NO_SPRIN_HAN_KN || cleanInput.no_sprin_han_kn || activeSuspect?.no_sprin_han_kn || '';
  const rawTglSprinHanKn = cleanInput.TGL_SPRIN_HAN_KN || cleanInput.tgl_sprin_han_kn || activeSuspect?.tgl_sprin_han_kn || '';
  const tglSprinHanKn = formatTanggalIndonesia(rawTglSprinHanKn);

  const noTapHanPn1 = cleanInput.NO_TAP_HAN_PN_1 || cleanInput.no_tap_han_pn_1 || activeSuspect?.no_tap_han_pn_1 || '';
  const rawTglTapHanPn1 = cleanInput.TGL_TAP_HAN_PN_1 || cleanInput.tgl_tap_han_pn_1 || activeSuspect?.tgl_tap_han_pn_1 || '';
  const tglTapHanPn1 = formatTanggalIndonesia(rawTglTapHanPn1);

  const noTapHanPn2 = cleanInput.NO_TAP_HAN_PN_2 || cleanInput.no_tap_han_pn_2 || activeSuspect?.no_tap_han_pn_2 || '';
  const rawTglTapHanPn2 = cleanInput.TGL_TAP_HAN_PN_2 || cleanInput.tgl_tap_han_pn_2 || activeSuspect?.tgl_tap_han_pn_2 || '';
  const tglTapHanPn2 = formatTanggalIndonesia(rawTglTapHanPn2);

  // D. UNSUR YURIDIS & PERKARA
  const dasarPasalUu = cleanInput.DASAR_PASAL_UU || cleanInput.dasar_pasal_uu || activeCase?.dasar_pasal_uu || activeCase?.pasal_uu || '';
  const pasal = cleanInput.PASAL || cleanInput.pasal || activeCase?.pasal || '';
  const tindakPidana = cleanInput.TINDAK_PIDANA || cleanInput.tindak_pidana || activeCase?.tindak_pidana || '';
  const tempatKejadian = cleanInput.TEMPAT_KEJADIAN || cleanInput.tempat_kejadian || activeCase?.locus || '';
  const waktuKejadian = cleanInput.WAKTU_KEJADIAN || cleanInput.waktu_kejadian || activeCase?.tempus || '';
  const statusKasus = cleanInput.STATUS_KASUS || cleanInput.status_kasus || activeCase?.status_kasus || activeCase?.status || 'PENYIDIKAN';

  // E. IDENTITAS PIHAK
  const namaPelapor = cleanInput.NAMA_PELAPOR || cleanInput.nama_pelapor || activeCase?.nama_pelapor || activeCase?.pelapor_name || '';
  // NAMA_TERLAPOR murni mengambil dari Laporan Polisi (LP), tidak tertukar dengan nama tersangka
  const namaTerlapor = cleanInput.NAMA_TERLAPOR || cleanInput.nama_terlapor || activeCase?.nama_terlapor || activeCase?.terlapor_name || activeCase?.terlapor || '';
  const nik = cleanInput.NIK || cleanInput.nik || activeSuspect?.nik || '';
  const jenisKelamin = cleanInput.JENIS_KELAMIN || cleanInput.jenis_kelamin || activeSuspect?.jenis_kelamin || '';
  const rawTglLahirSuspect = activeSuspect?.tgl_lahir || activeSuspect?.tanggal_lahir || '';
  const formattedTglLahirSuspect = formatTanggalIndonesia(rawTglLahirSuspect);
  const ttl = cleanInput.TTL || cleanInput.ttl || (
    (activeSuspect?.tempat_lahir && rawTglLahirSuspect)
      ? `${activeSuspect.tempat_lahir}, ${formattedTglLahirSuspect}`
      : (activeSuspect?.ttl || activeSuspect?.pob_dob || '')
  );
  const umur = cleanInput.UMUR || cleanInput.umur || (
    activeSuspect?.umur
      ? (String(activeSuspect.umur).includes('Tahun') ? String(activeSuspect.umur) : `${activeSuspect.umur} Tahun`)
      : ''
  );
  const agama = cleanInput.AGAMA || cleanInput.agama || activeSuspect?.agama || '';
  const pekerjaan = cleanInput.PEKERJAAN || cleanInput.pekerjaan || activeSuspect?.pekerjaan || '';
  const kewarganegaraan = cleanInput.KEWARGANEGARAAN || cleanInput.kewarganegaraan || activeSuspect?.kewarganegaraan || 'Indonesia';
  const pendidikan = cleanInput.PENDIDIKAN || cleanInput.pendidikan || activeSuspect?.pendidikan || '';
  const statusKawin = cleanInput.STATUS_KAWIN || cleanInput.status_kawin || activeSuspect?.status_pernikahan || activeSuspect?.marital_status || '';
  const alamat = cleanInput.ALAMAT || cleanInput.alamat || activeSuspect?.alamat || activeCase?.alamat_tersangka || '';

  // F. PENYIDIK & PEJABAT
  // Tanda Tangan Kasat Reskrim (Pemberi Perintah / Penandatangan Utama)
  const atasanNama = cleanInput.ATASAN_NAMA || cleanInput.atasan_nama || activeCase?.kasat_nama || '';
  const atasanPangkat = cleanInput.ATASAN_PANGKAT || cleanInput.atasan_pangkat || activeCase?.kasat_pangkat || '';
  const atasanNrp = cleanInput.ATASAN_NRP || cleanInput.atasan_nrp || activeCase?.kasat_nrp || '';

  // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA (Penyidik 1)
  const penyidikNama = cleanInput.PENYIDIK_NAMA || cleanInput.penyidik_nama || activeCase?.penyidik_1_nama || '';
  const penyidikPangkat = cleanInput.PENYIDIK_PANGKAT || cleanInput.penyidik_pangkat || activeCase?.penyidik_1_pangkat || '';
  const penyidikNrp = cleanInput.PENYIDIK_NRP || cleanInput.penyidik_nrp || activeCase?.penyidik_1_nrp || '';
  const penyidikJabatan = cleanInput.PENYIDIK_JABATAN || cleanInput.penyidik_jabatan || activeCase?.penyidik_1_jabatan || '';

  // Daftar Tim Penerima Perintah (Untuk Badan Surat Perintah Personel 1 s.d. 5)
  const penyidik1Nama = cleanInput.PENYIDIK_1_NAMA || cleanInput.penyidik_1_nama || activeCase?.penyidik_1_nama || penyidikNama || '';
  const penyidik1Pangkat = cleanInput.PENYIDIK_1_PANGKAT || cleanInput.penyidik_1_pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkat || '';
  const penyidik1Nrp = cleanInput.PENYIDIK_1_NRP || cleanInput.penyidik_1_nrp || activeCase?.penyidik_1_nrp || penyidikNrp || '';
  const penyidik1Jabatan = cleanInput.PENYIDIK_1_JABATAN || cleanInput.penyidik_1_jabatan || activeCase?.penyidik_1_jabatan || penyidikJabatan || '';

  const penyidik2Nama = cleanInput.PENYIDIK_2_NAMA || cleanInput.penyidik_2_nama || activeCase?.penyidik_2_nama || '';
  const penyidik2Pangkat = cleanInput.PENYIDIK_2_PANGKAT || cleanInput.penyidik_2_pangkat || activeCase?.penyidik_2_pangkat || '';
  const penyidik2Nrp = cleanInput.PENYIDIK_2_NRP || cleanInput.penyidik_2_nrp || activeCase?.penyidik_2_nrp || '';
  const penyidik2Jabatan = cleanInput.PENYIDIK_2_JABATAN || cleanInput.penyidik_2_jabatan || activeCase?.penyidik_2_jabatan || '';

  const penyidik3Nama = cleanInput.PENYIDIK_3_NAMA || cleanInput.penyidik_3_nama || activeCase?.penyidik_3_nama || '';
  const penyidik3Pangkat = cleanInput.PENYIDIK_3_PANGKAT || cleanInput.penyidik_3_pangkat || activeCase?.penyidik_3_pangkat || '';
  const penyidik3Nrp = cleanInput.PENYIDIK_3_NRP || cleanInput.penyidik_3_nrp || activeCase?.penyidik_3_nrp || '';
  const penyidik3Jabatan = cleanInput.PENYIDIK_3_JABATAN || cleanInput.penyidik_3_jabatan || activeCase?.penyidik_3_jabatan || '';

  const penyidik4Nama = cleanInput.PENYIDIK_4_NAMA || cleanInput.penyidik_4_nama || activeCase?.penyidik_4_nama || '';
  const penyidik4Pangkat = cleanInput.PENYIDIK_4_PANGKAT || cleanInput.penyidik_4_pangkat || activeCase?.penyidik_4_pangkat || '';
  const penyidik4Nrp = cleanInput.PENYIDIK_4_NRP || cleanInput.penyidik_4_nrp || activeCase?.penyidik_4_nrp || '';
  const penyidik4Jabatan = cleanInput.PENYIDIK_4_JABATAN || cleanInput.penyidik_4_jabatan || activeCase?.penyidik_4_jabatan || '';

  const penyidik5Nama = cleanInput.PENYIDIK_5_NAMA || cleanInput.penyidik_5_nama || activeCase?.penyidik_5_nama || '';
  const penyidik5Pangkat = cleanInput.PENYIDIK_5_PANGKAT || cleanInput.penyidik_5_pangkat || activeCase?.penyidik_5_pangkat || '';
  const penyidik5Nrp = cleanInput.PENYIDIK_5_NRP || cleanInput.penyidik_5_nrp || activeCase?.penyidik_5_nrp || '';
  const penyidik5Jabatan = cleanInput.PENYIDIK_5_JABATAN || cleanInput.penyidik_5_jabatan || activeCase?.penyidik_5_jabatan || '';

  const baseMap = {
    // A. SURAT AKTIF (Resmi UPPERCASE)
    NOMOR_SURAT: nomorSurat,
    TANGGAL_SURAT: tanggalSurat,
    TEMPAT_SURAT: tempatSurat,
    TUJUAN_SURAT: tujuanSurat,
    ALAMAT_TUJUAN: alamatTujuan,
    MASA_BERLAKU: masaBerlaku,

    // B. RUJUKAN TINGKAT PERKARA (Resmi UPPERCASE)
    NOMOR_LP: nomorLp,
    TANGGAL_LP: tanggalLp,
    NO_SPRIN_SIDIK: noSprinSidik,
    TGL_SPRIN_SIDIK: tglSprinSidik,
    NO_SPDP: noSpdp,
    TGL_SPDP: tglSpdp,
    NO_P21_KN: noP21Kn,
    TGL_P21_KN: tglP21Kn,

    // C. RUJUKAN TINGKAT TERSANGKA (Resmi UPPERCASE)
    NO_SP_TAP_TSK: noSpTapTsk,
    TGL_SP_TAP_TSK: tglSpTapTsk,
    NO_SPRIN_KAP: noSprinKap,
    TGL_SPRIN_KAP: tglSprinKap,
    NO_SPRIN_HAN: noSprinHan,
    TGL_SPRIN_HAN: tglSprinHan,
    NO_PANJANG_HAN_KN: noPanjangHanKn,
    TGL_PANJANG_HAN_KN: tglPanjangHanKn,
    NO_SPRIN_HAN_KN: noSprinHanKn,
    TGL_SPRIN_HAN_KN: tglSprinHanKn,
    NO_TAP_HAN_PN_1: noTapHanPn1,
    TGL_TAP_HAN_PN_1: tglTapHanPn1,
    NO_TAP_HAN_PN_2: noTapHanPn2,
    TGL_TAP_HAN_PN_2: tglTapHanPn2,

    // D. UNSUR YURIDIS & PERKARA (Resmi UPPERCASE)
    DASAR_PASAL_UU: dasarPasalUu,
    PASAL: pasal,
    TINDAK_PIDANA: tindakPidana,
    TEMPAT_KEJADIAN: tempatKejadian,
    WAKTU_KEJADIAN: waktuKejadian,
    STATUS_KASUS: statusKasus,

    // E. IDENTITAS PIHAK (Resmi UPPERCASE)
    NAMA_PELAPOR: namaPelapor,
    NAMA_TERLAPOR: namaTerlapor,
    NIK: nik,
    JENIS_KELAMIN: jenisKelamin,
    TTL: ttl,
    UMUR: umur,
    AGAMA: agama,
    PEKERJAAN: pekerjaan,
    KEWARGANEGARAAN: kewarganegaraan,
    PENDIDIKAN: pendidikan,
    STATUS_KAWIN: statusKawin,
    ALAMAT: alamat,

    // F. PENYIDIK & PEJABAT (Resmi UPPERCASE)
    // Tanda Tangan Kasat Reskrim (Pemberi Perintah / Penandatangan Utama)
    ATASAN_NAMA: atasanNama,
    ATASAN_PANGKAT: atasanPangkat,
    ATASAN_NRP: atasanNrp,

    // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA
    PENYIDIK_NAMA: penyidikNama,
    PENYIDIK_PANGKAT: penyidikPangkat,
    PENYIDIK_NRP: penyidikNrp,
    PENYIDIK_JABATAN: penyidikJabatan,

    // Daftar Tim Penerima Perintah (Personel 1 s.d. 5)
    PENYIDIK_1_NAMA: penyidik1Nama,
    PENYIDIK_1_PANGKAT: penyidik1Pangkat,
    PENYIDIK_1_NRP: penyidik1Nrp,
    PENYIDIK_1_JABATAN: penyidik1Jabatan,

    PENYIDIK_2_NAMA: penyidik2Nama,
    PENYIDIK_2_PANGKAT: penyidik2Pangkat,
    PENYIDIK_2_NRP: penyidik2Nrp,
    PENYIDIK_2_JABATAN: penyidik2Jabatan,

    PENYIDIK_3_NAMA: penyidik3Nama,
    PENYIDIK_3_PANGKAT: penyidik3Pangkat,
    PENYIDIK_3_NRP: penyidik3Nrp,
    PENYIDIK_3_JABATAN: penyidik3Jabatan,

    PENYIDIK_4_NAMA: penyidik4Nama,
    PENYIDIK_4_PANGKAT: penyidik4Pangkat,
    PENYIDIK_4_NRP: penyidik4Nrp,
    PENYIDIK_4_JABATAN: penyidik4Jabatan,

    PENYIDIK_5_NAMA: penyidik5Nama,
    PENYIDIK_5_PANGKAT: penyidik5Pangkat,
    PENYIDIK_5_NRP: penyidik5Nrp,
    PENYIDIK_5_JABATAN: penyidik5Jabatan,

    // Aliases lowercase & format pendukung untuk kompatibilitas template fleksibel
    nomor_surat: nomorSurat,
    tanggal_surat: tanggalSurat,
    tempat_surat: tempatSurat,
    tujuan_surat: tujuanSurat,
    alamat_tujuan: alamatTujuan,
    masa_berlaku: masaBerlaku,

    nomor_lp: nomorLp,
    tanggal_lp: tanggalLp,
    TGL_LP: tanggalLp,
    tgl_lp: tanggalLp,

    no_sprin_sidik: noSprinSidik,
    tgl_sprin_sidik: tglSprinSidik,
    TANGGAL_SPRIN_SIDIK: tglSprinSidik,
    tanggal_sprin_sidik: tglSprinSidik,

    no_spdp: noSpdp,
    tgl_spdp: tglSpdp,
    TANGGAL_SPDP: tglSpdp,
    tanggal_spdp: tglSpdp,

    no_p21_kn: noP21Kn,
    tgl_p21_kn: tglP21Kn,

    no_sp_tap_tsk: noSpTapTsk,
    tgl_sp_tap_tsk: tglSpTapTsk,
    TANGGAL_SP_TAP_TSK: tglSpTapTsk,
    tanggal_sp_tap_tsk: tglSpTapTsk,
    TANGGAL_PENETAPAN: tglSpTapTsk,
    tanggal_penetapan: tglSpTapTsk,

    no_sprin_kap: noSprinKap,
    tgl_sprin_kap: tglSprinKap,
    TANGGAL_SPRIN_KAP: tglSprinKap,
    tanggal_sprin_kap: tglSprinKap,

    no_sprin_han: noSprinHan,
    tgl_sprin_han: tglSprinHan,
    TANGGAL_SPRIN_HAN: tglSprinHan,
    tanggal_sprin_han: tglSprinHan,

    no_panjang_han_kn: noPanjangHanKn,
    tgl_panjang_han_kn: tglPanjangHanKn,
    no_sprin_han_kn: noSprinHanKn,
    tgl_sprin_han_kn: tglSprinHanKn,
    no_tap_han_pn_1: noTapHanPn1,
    tgl_tap_han_pn_1: tglTapHanPn1,
    no_tap_han_pn_2: noTapHanPn2,
    tgl_tap_han_pn_2: tglTapHanPn2,

    dasar_pasal_uu: dasarPasalUu,
    pasal: pasal,
    tindak_pidana: tindakPidana,
    tempat_kejadian: tempatKejadian,
    waktu_kejadian: waktuKejadian,
    status_kasus: statusKasus,

    nama_pelapor: namaPelapor,
    nama_terlapor: namaTerlapor,
    nik: nik,
    jenis_kelamin: jenisKelamin,
    ttl: ttl,
    umur: umur,
    agama: agama,
    pekerjaan: pekerjaan,
    kewarganegaraan: kewarganegaraan,
    pendidikan: pendidikan,
    status_kawin: statusKawin,
    alamat: alamat,

    // Lowercase Aliases
    atasan_nama: atasanNama,
    atasan_pangkat: atasanPangkat,
    atasan_nrp: atasanNrp,

    penyidik_nama: penyidikNama,
    penyidik_pangkat: penyidikPangkat,
    penyidik_nrp: penyidikNrp,
    penyidik_jabatan: penyidikJabatan,

    penyidik_1_nama: penyidik1Nama,
    penyidik_1_pangkat: penyidik1Pangkat,
    penyidik_1_nrp: penyidik1Nrp,
    penyidik_1_jabatan: penyidik1Jabatan,

    penyidik_2_nama: penyidik2Nama,
    penyidik_2_pangkat: penyidik2Pangkat,
    penyidik_2_nrp: penyidik2Nrp,
    penyidik_2_jabatan: penyidik2Jabatan,

    penyidik_3_nama: penyidik3Nama,
    penyidik_3_pangkat: penyidik3Pangkat,
    penyidik_3_nrp: penyidik3Nrp,
    penyidik_3_jabatan: penyidik3Jabatan,

    penyidik_4_nama: penyidik4Nama,
    penyidik_4_pangkat: penyidik4Pangkat,
    penyidik_4_nrp: penyidik4Nrp,
    penyidik_4_jabatan: penyidik4Jabatan,

    penyidik_5_nama: penyidik5Nama,
    penyidik_5_pangkat: penyidik5Pangkat,
    penyidik_5_nrp: penyidik5Nrp,
    penyidik_5_jabatan: penyidik5Jabatan,

    // Legacy Aliases
    DOC_NO: nomorSurat,
    doc_no: nomorSurat,
    DOC_LOCATION: tempatSurat,
    doc_location: tempatSurat,
    DOC_DATE: tanggalSurat,
    doc_date: tanggalSurat,
    TEMPAT_LAHIR: activeSuspect?.tempat_lahir || '',
    tempat_lahir: activeSuspect?.tempat_lahir || '',
    TGL_LAHIR: formattedTglLahirSuspect,
    tgl_lahir: formattedTglLahirSuspect,

    // Dukungan Multi-Tersangka & Terlapor (Array Perulangan Dokumen Kolektif, misal SPDP)
    tersangka_list: (Array.isArray(suspectsList) && suspectsList.length > 0 ? suspectsList : (activeSuspect ? [activeSuspect] : []))
      .filter((s) => s.status === 'tersangka' || !s.status)
      .map((s, idx) => {
        const sTglLahir = s.tgl_lahir || s.tanggal_lahir || '';
        const formattedSTglLahir = formatTanggalIndonesia(sTglLahir);
        return {
          no: idx + 1,
          nama: s.nama || '',
          nik: s.nik || '',
          jenis_kelamin: s.jenis_kelamin || '',
          ttl: (s.tempat_lahir && sTglLahir) ? `${s.tempat_lahir}, ${formattedSTglLahir}` : (s.ttl || s.pob_dob || s.tempat_lahir || ''),
          tempat_lahir: s.tempat_lahir || '',
          tgl_lahir: formattedSTglLahir,
          umur: s.umur ? (String(s.umur).includes('Tahun') ? String(s.umur) : `${s.umur} Tahun`) : '',
          agama: s.agama || '',
          pekerjaan: s.pekerjaan || '',
          pendidikan: s.pendidikan || '',
          kewarganegaraan: s.kewarganegaraan || 'Indonesia',
          status_kawin: s.status_pernikahan || s.marital_status || '',
          alamat: s.alamat || '',
          nomor_sp_tap: s.nomor_sp_tap || s.no_sp_tap_tsk || '',
          tanggal_sp_tap: formatTanggalIndonesia(s.tanggal_sp_tap || s.tgl_sp_tap_tsk || '')
        };
      }),

    terlapor_list: (Array.isArray(suspectsList) && suspectsList.length > 0 ? suspectsList : [])
      .filter((s) => s.status === 'terlapor')
      .map((s, idx) => {
        const sTglLahir = s.tgl_lahir || s.tanggal_lahir || '';
        const formattedSTglLahir = formatTanggalIndonesia(sTglLahir);
        return {
          no: idx + 1,
          nama: s.nama || '',
          nik: s.nik || '',
          jenis_kelamin: s.jenis_kelamin || '',
          ttl: (s.tempat_lahir && sTglLahir) ? `${s.tempat_lahir}, ${formattedSTglLahir}` : (s.ttl || s.pob_dob || s.tempat_lahir || ''),
          tempat_lahir: s.tempat_lahir || '',
          tgl_lahir: formattedSTglLahir,
          umur: s.umur ? (String(s.umur).includes('Tahun') ? String(s.umur) : `${s.umur} Tahun`) : '',
          agama: s.agama || '',
          pekerjaan: s.pekerjaan || '',
          pendidikan: s.pendidikan || '',
          kewarganegaraan: s.kewarganegaraan || 'Indonesia',
          status_kawin: s.status_pernikahan || s.marital_status || '',
          alamat: s.alamat || ''
        };
      })
  };

  // PISAHKAN DAFTAR SUBJEK UNTUK TAG INDIVIDUAL TSK_1..5 DAN TERLAPOR_1..5
  const allSubjek = Array.isArray(suspectsList) && suspectsList.length > 0 
    ? suspectsList 
    : (activeSuspect ? [activeSuspect] : []);

  const tersangkaList = allSubjek.filter((s) => s.status === 'tersangka' || !s.status);
  const terlaporList = allSubjek.filter((s) => s.status === 'terlapor');

  // Jika belum ada terlapor terdaftar di case_suspects tapi ada di LP
  if (terlaporList.length === 0 && namaTerlapor) {
    terlaporList.push({ nama: namaTerlapor });
  }

  // Tag Mandiri Tersangka 1 s/d 5
  for (let i = 1; i <= 5; i++) {
    const s = tersangkaList[i - 1] || {};
    const sTglLahir = s.tgl_lahir || s.tanggal_lahir || '';
    const formattedSTglLahir = formatTanggalIndonesia(sTglLahir);
    const sTtl = (s.tempat_lahir && sTglLahir) 
      ? `${s.tempat_lahir}, ${formattedSTglLahir}` 
      : (s.ttl || s.pob_dob || s.tempat_lahir || '');
    const sUmur = s.umur ? (String(s.umur).includes('Tahun') ? String(s.umur) : `${s.umur} Tahun`) : '';
    const sNomorSpTap = s.nomor_sp_tap || s.no_sp_tap_tsk || '';
    const sTglSpTap = formatTanggalIndonesia(s.tanggal_sp_tap || s.tgl_sp_tap_tsk || '');

    baseMap[`TSK_${i}_NAMA`] = s.nama || '';
    baseMap[`tsk_${i}_nama`] = s.nama || '';
    baseMap[`TSK_${i}_NIK`] = s.nik || '';
    baseMap[`tsk_${i}_nik`] = s.nik || '';
    baseMap[`TSK_${i}_JK`] = s.jenis_kelamin || '';
    baseMap[`tsk_${i}_jk`] = s.jenis_kelamin || '';
    baseMap[`TSK_${i}_TEMPAT_LAHIR`] = s.tempat_lahir || '';
    baseMap[`tsk_${i}_tempat_lahir`] = s.tempat_lahir || '';
    baseMap[`TSK_${i}_TGL_LAHIR`] = formattedSTglLahir;
    baseMap[`tsk_${i}_tgl_lahir`] = formattedSTglLahir;
    baseMap[`TSK_${i}_TTL`] = sTtl;
    baseMap[`tsk_${i}_ttl`] = sTtl;
    baseMap[`TSK_${i}_UMUR`] = sUmur;
    baseMap[`tsk_${i}_umur`] = sUmur;
    baseMap[`TSK_${i}_PEKERJAAN`] = s.pekerjaan || '';
    baseMap[`tsk_${i}_pekerjaan`] = s.pekerjaan || '';
    baseMap[`TSK_${i}_KEWARGANEGARAAN`] = s.kewarganegaraan || (s.nama ? 'Indonesia' : '');
    baseMap[`tsk_${i}_kewarganegaraan`] = s.kewarganegaraan || (s.nama ? 'Indonesia' : '');
    baseMap[`TSK_${i}_PENDIDIKAN`] = s.pendidikan || '';
    baseMap[`tsk_${i}_pendidikan`] = s.pendidikan || '';
    baseMap[`TSK_${i}_AGAMA`] = s.agama || '';
    baseMap[`tsk_${i}_agama`] = s.agama || '';
    baseMap[`TSK_${i}_STATUS_NIKAH`] = s.status_pernikahan || s.marital_status || '';
    baseMap[`tsk_${i}_status_nikah`] = s.status_pernikahan || s.marital_status || '';
    baseMap[`TSK_${i}_ALAMAT`] = s.alamat || '';
    baseMap[`tsk_${i}_alamat`] = s.alamat || '';
    baseMap[`TSK_${i}_NOMOR_SP_TAP`] = sNomorSpTap;
    baseMap[`tsk_${i}_nomor_sp_tap`] = sNomorSpTap;
    baseMap[`TSK_${i}_NO_SP_TAP`] = sNomorSpTap;
    baseMap[`tsk_${i}_no_sp_tap`] = sNomorSpTap;
    baseMap[`TSK_${i}_TGL_SP_TAP`] = sTglSpTap;
    baseMap[`tsk_${i}_tgl_sp_tap`] = sTglSpTap;
  }

  // Tag Mandiri Terlapor 1 s/d 5
  for (let i = 1; i <= 5; i++) {
    const t = terlaporList[i - 1] || {};
    const tTglLahir = t.tgl_lahir || t.tanggal_lahir || '';
    const formattedTTglLahir = formatTanggalIndonesia(tTglLahir);
    const tTtl = (t.tempat_lahir && tTglLahir) 
      ? `${t.tempat_lahir}, ${formattedTTglLahir}` 
      : (t.ttl || t.pob_dob || t.tempat_lahir || '');
    const tUmur = t.umur ? (String(t.umur).includes('Tahun') ? String(t.umur) : `${t.umur} Tahun`) : '';

    baseMap[`TERLAPOR_${i}_NAMA`] = t.nama || '';
    baseMap[`terlapor_${i}_nama`] = t.nama || '';
    baseMap[`TERLAPOR_${i}_NIK`] = t.nik || '';
    baseMap[`terlapor_${i}_nik`] = t.nik || '';
    baseMap[`TERLAPOR_${i}_JK`] = t.jenis_kelamin || '';
    baseMap[`terlapor_${i}_jk`] = t.jenis_kelamin || '';
    baseMap[`TERLAPOR_${i}_TEMPAT_LAHIR`] = t.tempat_lahir || '';
    baseMap[`terlapor_${i}_tempat_lahir`] = t.tempat_lahir || '';
    baseMap[`TERLAPOR_${i}_TGL_LAHIR`] = formattedTTglLahir;
    baseMap[`terlapor_${i}_tgl_lahir`] = formattedTTglLahir;
    baseMap[`TERLAPOR_${i}_TTL`] = tTtl;
    baseMap[`terlapor_${i}_ttl`] = tTtl;
    baseMap[`TERLAPOR_${i}_UMUR`] = tUmur;
    baseMap[`terlapor_${i}_umur`] = tUmur;
    baseMap[`TERLAPOR_${i}_PEKERJAAN`] = t.pekerjaan || '';
    baseMap[`terlapor_${i}_pekerjaan`] = t.pekerjaan || '';
    baseMap[`TERLAPOR_${i}_KEWARGANEGARAAN`] = t.kewarganegaraan || (t.nama ? 'Indonesia' : '');
    baseMap[`terlapor_${i}_kewarganegaraan`] = t.kewarganegaraan || (t.nama ? 'Indonesia' : '');
    baseMap[`TERLAPOR_${i}_PENDIDIKAN`] = t.pendidikan || '';
    baseMap[`terlapor_${i}_pendidikan`] = t.pendidikan || '';
    baseMap[`TERLAPOR_${i}_AGAMA`] = t.agama || '';
    baseMap[`terlapor_${i}_agama`] = t.agama || '';
    baseMap[`TERLAPOR_${i}_STATUS_NIKAH`] = t.status_pernikahan || t.marital_status || '';
    baseMap[`terlapor_${i}_status_nikah`] = t.status_pernikahan || t.marital_status || '';
    baseMap[`TERLAPOR_${i}_ALAMAT`] = t.alamat || '';
    baseMap[`terlapor_${i}_alamat`] = t.alamat || '';
  }

  // Timpa dengan custom field manual form dinamis jika ada
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

  // Pastikan variabel tanggal surat utama aktif tetap terformat teks resmi
  finalPayload.TANGGAL_SURAT = tanggalSurat;
  finalPayload.tanggal_surat = tanggalSurat;
  finalPayload.DOC_DATE = tanggalSurat;
  finalPayload.doc_date = tanggalSurat;

  // Pastikan rantai rujukan mandiri (Chain of Reference) selalu terformat teks resmi
  finalPayload.TANGGAL_LP = tanggalLp;
  finalPayload.tanggal_lp = tanggalLp;
  finalPayload.TGL_LP = tanggalLp;
  finalPayload.tgl_lp = tanggalLp;

  finalPayload.TGL_SPRIN_SIDIK = tglSprinSidik;
  finalPayload.tgl_sprin_sidik = tglSprinSidik;
  finalPayload.TANGGAL_SPRIN_SIDIK = tglSprinSidik;
  finalPayload.tanggal_sprin_sidik = tglSprinSidik;

  finalPayload.TGL_SPDP = tglSpdp;
  finalPayload.tgl_spdp = tglSpdp;
  finalPayload.TANGGAL_SPDP = tglSpdp;
  finalPayload.tanggal_spdp = tglSpdp;

  finalPayload.TGL_P21_KN = tglP21Kn;
  finalPayload.tgl_p21_kn = tglP21Kn;

  finalPayload.TGL_SP_TAP_TSK = tglSpTapTsk;
  finalPayload.tgl_sp_tap_tsk = tglSpTapTsk;
  finalPayload.TANGGAL_SP_TAP_TSK = tglSpTapTsk;
  finalPayload.tanggal_sp_tap_tsk = tglSpTapTsk;

  finalPayload.TGL_SPRIN_KAP = tglSprinKap;
  finalPayload.tgl_sprin_kap = tglSprinKap;
  finalPayload.TANGGAL_SPRIN_KAP = tglSprinKap;
  finalPayload.tanggal_sprin_kap = tglSprinKap;

  finalPayload.TGL_SPRIN_HAN = tglSprinHan;
  finalPayload.tgl_sprin_han = tglSprinHan;
  finalPayload.TANGGAL_SPRIN_HAN = tglSprinHan;
  finalPayload.tanggal_sprin_han = tglSprinHan;

  finalPayload.TGL_PANJANG_HAN_KN = tglPanjangHanKn;
  finalPayload.tgl_panjang_han_kn = tglPanjangHanKn;

  finalPayload.TGL_SPRIN_HAN_KN = tglSprinHanKn;
  finalPayload.tgl_sprin_han_kn = tglSprinHanKn;

  finalPayload.TGL_TAP_HAN_PN_1 = tglTapHanPn1;
  finalPayload.tgl_tap_han_pn_1 = tglTapHanPn1;

  finalPayload.TGL_TAP_HAN_PN_2 = tglTapHanPn2;
  finalPayload.tgl_tap_han_pn_2 = tglTapHanPn2;

  // Bersihkan nilai null / undefined agar tidak merender teks 'null' atau 'undefined' di dokumen Word
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

  // Sync investigator fields 1-5 if not directly present on activeCase
  for (let i = 1; i <= 5; i++) {
    const keyNama = `penyidik_${i}_nama`;
    const keyPangkat = `penyidik_${i}_pangkat`;
    const keyNrp = `penyidik_${i}_nrp`;
    const keyJabatan = `penyidik_${i}_jabatan`;

    if (!activeCase[keyNama] && Array.isArray(lpData.investigators) && lpData.investigators[i - 1]) {
      const inv = lpData.investigators[i - 1];
      const found = (personnelList || []).find(p => p.id === inv.user_id || p.nrp === inv.nrp) || inv;
      activeCase[keyNama] = found.nama || inv.nama || '';
      activeCase[keyPangkat] = found.pangkat || inv.pangkat || '';
      activeCase[keyNrp] = found.nrp || inv.nrp || '';
      activeCase[keyJabatan] = found.jabatan || inv.jabatan || (i === 1 ? 'Kanit' : 'Penyidik Pembantu');
    }
  }

  // Sync Kasat Reskrim if not present
  if (!activeCase.kasat_nama) {
    const kasat = (personnelList || []).find(p => p.role === 'Kasat' || (p.jabatan || '').toUpperCase().includes('KASAT')) || (personnelList || [])[0];
    if (kasat) {
      activeCase.kasat_nama = kasat.nama || '';
      activeCase.kasat_pangkat = kasat.pangkat || '';
      activeCase.kasat_nrp = kasat.nrp || '';
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


