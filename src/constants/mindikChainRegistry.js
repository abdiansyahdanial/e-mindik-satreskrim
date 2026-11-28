/**
 * SINGLE SOURCE OF TRUTH: RANTAI MINDIK, KODE KANONIK, & SUBJEK HUKUM KUHAP
 * Digunakan seragam oleh mindikGenerator.js, mindikPresets.js,
 * mindikPrerequisites.js, dan MindikGeneratorView.jsx.
 */

/**
 * Validasi nomor surat dinas resmi.
 * Mengembalikan false jika kosong, hanya spasi, '-', 'null', 'undefined',
 * atau masih mengandung placeholder titik ('...', '....', '…') / garis bawah ('___').
 */
export function isValidOfficialDocNumber(num) {
  if (num === undefined || num === null) return false;
  const str = String(num).trim();
  if (!str) return false;
  const lower = str.toLowerCase();
  if (lower === '-' || lower === 'null' || lower === 'undefined') return false;

  // Deteksi placeholder titik berurutan (... / ....), elipsis Unicode (…), atau garis bawah (___)
  if (/\.{3,}|\u2026|_{3,}/.test(str)) return false;

  // Deteksi segmen nomor kosong di antara garis miring, misal "B/      /I/RES.0.0"
  if (/\/\s+\//.test(str)) return false;

  return true;
}

/**
 * Peta alias kode template -> Kode Kanonik resmi (selaras 100% dengan MINDIK_PRESETS).
 */
const CANONICAL_CODE_ALIASES = {
  // Level 1: SP Sidik
  SP_SIDIK: 'SPRIN_SIDIK',
  SPRIN_SIDIK: 'SPRIN_SIDIK',
  SURAT_PERINTAH_PENYIDIKAN: 'SPRIN_SIDIK',
  SP_PENYIDIKAN: 'SPRIN_SIDIK',
  SPRIN_SIDIK_MORE_5: 'SPRIN_SIDIK_MORE_5',
  SP_SIDIK_MORE_5: 'SPRIN_SIDIK_MORE_5',
  SP_SIDIK_TAMBAHAN: 'SPRIN_SIDIK_TAMBAHAN',
  SPRIN_SIDIK_TAMBAHAN: 'SPRIN_SIDIK_TAMBAHAN',
  SP_SIDIK_LANJUTAN: 'SPRIN_SIDIK_LANJUTAN',
  SPRIN_SIDIK_LANJUTAN: 'SPRIN_SIDIK_LANJUTAN',

  // Lidik
  SP_LIDIK: 'SPRIN_LIDIK',
  SPRIN_LIDIK: 'SPRIN_LIDIK',
  SPRIN_GAS_LIDIK: 'SPGAS_LIDIK',
  SP_GAS_LIDIK: 'SPGAS_LIDIK',
  SPGAS_LIDIK: 'SPGAS_LIDIK',

  // Level 2: SP.Gas.Sidik
  SPRIN_GAS_SIDIK: 'SPGAS_SIDIK',
  SP_GAS_SIDIK: 'SPGAS_SIDIK',
  SPGAS_SIDIK: 'SPGAS_SIDIK',
  SPRIN_TUGAS_PENYIDIKAN: 'SPGAS_SIDIK',
  SURAT_PERINTAH_TUGAS_PENYIDIKAN: 'SPGAS_SIDIK',
  SPRIN_GAS_SIDIK_MORE_5: 'SPGAS_SIDIK_MORE_5',
  SP_GAS_SIDIK_MORE_5: 'SPGAS_SIDIK_MORE_5',
  SPGAS_SIDIK_MORE_5: 'SPGAS_SIDIK_MORE_5',
  SPRIN_GAS_SIDIK_TAMBAHAN: 'SPGAS_SIDIK_TAMBAHAN',
  SP_GAS_SIDIK_TAMBAHAN: 'SPGAS_SIDIK_TAMBAHAN',
  SPGAS_SIDIK_TAMBAHAN: 'SPGAS_SIDIK_TAMBAHAN',
  SPRIN_GAS_SIDIK_LANJUTAN: 'SPGAS_SIDIK_LANJUTAN',
  SP_GAS_SIDIK_LANJUTAN: 'SPGAS_SIDIK_LANJUTAN',
  SPGAS_SIDIK_LANJUTAN: 'SPGAS_SIDIK_LANJUTAN',

  // Level 2: SPDP (seluruh varian SPDP_MORE_1_TSK / SPDP_LEBIH_1_TSK dilebur ke dalam 1 preset dinamis SPDP_TSK)
  SPDP: 'SPDP_TSK',
  SPDP_TSK: 'SPDP_TSK',
  SPDP_TERSANGKA: 'SPDP_TSK',
  SPDP_MORE_1_TSK: 'SPDP_TSK',
  SPDP_MORE_1_TERSANGKA: 'SPDP_TSK',
  SPDP_LEBIH_1_TSK: 'SPDP_TSK',
  SPDP_LEBIH_DARI_1_TSK: 'SPDP_TSK',
  SPDP_TERLAPOR: 'SPDP_TERLAPOR',
  SPDP_DENGAN_TERLAPOR: 'SPDP_TERLAPOR',
  SPDP_MORE_1_TERLAPOR: 'SPDP_TERLAPOR',
  SPDP_LEBIH_1_TERLAPOR: 'SPDP_TERLAPOR',
  SPDP_LEBIH_DARI_1_TERLAPOR: 'SPDP_TERLAPOR',
  SPDP_NO_NAME: 'SPDP_LIDIK_ANON',
  SPDP_TANPA_NAMA: 'SPDP_LIDIK_ANON',
  SPDP_LIDIK_ANON: 'SPDP_LIDIK_ANON',
  SPDP_KORPORASI: 'SPDP_KORPORASI',
  PENGIRIMAN_KEMBALI_SPDP_P20: 'PENGIRIMAN_KEMBALI_SPDP_P20',

  // Level 2 -> Penetapan Tersangka (kanonik: TAP_TSK)
  SP_TAP_TSK: 'TAP_TSK',
  S_TAP_TSK: 'TAP_TSK',
  TAP_TSK: 'TAP_TSK',
  SURAT_KETETAPAN_PENETAPAN_TERSANGKA: 'TAP_TSK',
  PENETAPAN_TERSANGKA: 'TAP_TSK',

  // Level 2 & 3: Pemberitahuan TAP TSK & Panggilan Saksi / Tersangka
  PEMBERITAHUAN_TAP_TSK: 'PEMBERITAHUAN_TAP_TSK',
  PEMBERITAHUAN_TAP_TSK_KE_TSK: 'PEMBERITAHUAN_TAP_TSK',
  PEMBERITAHUAN_TAP_TSK_JPU: 'PEMBERITAHUAN_TAP_TSK_JPU',
  PEMBERITAHUAN_TAP_TSK_KE_JPU: 'PEMBERITAHUAN_TAP_TSK_JPU',
  SPGL_SAKSI: 'SPGL_SAKSI_1',
  SPGL_SAKSI_1: 'SPGL_SAKSI_1',
  SURAT_PANGGILAN_SAKSI: 'SPGL_SAKSI_1',
  SURAT_PANGGILAN_SAKSI_1: 'SPGL_SAKSI_1',
  PANGGILAN_SAKSI_1: 'SPGL_SAKSI_1',
  SPGL_SAKSI_2: 'SPGL_SAKSI_2',
  SURAT_PANGGILAN_SAKSI_2: 'SPGL_SAKSI_2',
  PANGGILAN_SAKSI_2: 'SPGL_SAKSI_2',
  SPGL_TSK: 'SPGL_TSK_1',
  SPGL_TSK_1: 'SPGL_TSK_1',
  SURAT_PANGGILAN_TERSANGKA: 'SPGL_TSK_1',
  SURAT_PANGGILAN_TERSANGKA_1: 'SPGL_TSK_1',
  PANGGILAN_TSK_1: 'SPGL_TSK_1',
  SPGL_TSK_2: 'SPGL_TSK_2',
  SURAT_PANGGILAN_TERSANGKA_2: 'SPGL_TSK_2',
  PANGGILAN_TSK_2: 'SPGL_TSK_2',
  SPRIN_BAWA_TSK_DAN_BA: 'SPRIN_BAWA_TSK_DAN_BA',

  // Level 3: Penangkapan & Penahanan
  SPRIN_KAP: 'SPRIN_KAP_DAN_BA',
  BA_KAP: 'SPRIN_KAP_DAN_BA',
  SPRIN_KAP_DAN_BA: 'SPRIN_KAP_DAN_BA',
  SPRIN_GAS_KAP: 'SPGAS_KAP',
  SP_GAS_KAP: 'SPGAS_KAP',
  SPGAS_KAP: 'SPGAS_KAP',
  SPRIN_BAWA_TSK_LEWAT_MASA_KAP: 'SPRIN_BAWA_LEWAT_KAP',
  SPRIN_BAWA_LEWAT_KAP: 'SPRIN_BAWA_LEWAT_KAP',
  BA_BERITAHU_HAK_TSK: 'BA_HAK_TSK',
  BA_HAK_TSK: 'BA_HAK_TSK',
  SPRIN_LEPAS_KAP_DAN_BA: 'SPRIN_LEPAS_KAP_DAN_BA',
  SPRIN_HAN: 'SPRIN_HAN_DAN_BA',
  SP_HAN: 'SPRIN_HAN_DAN_BA',
  BA_HAN: 'SPRIN_HAN_DAN_BA',
  SPRIN_HAN_DAN_BA: 'SPRIN_HAN_DAN_BA',
  SURAT_PERINTAH_PENAHANAN: 'SPRIN_HAN_DAN_BA',
  SURAT_MINTA_PERPANJANG_HAN_40_HARI_KN: 'MINTA_PANJANG_HAN_40_KN',
  PERMOHONAN_PERPANJANGAN_HAN: 'MINTA_PANJANG_HAN_40_KN',
  PERMOHONAN_PERPANJANGAN_HAN_PU: 'MINTA_PANJANG_HAN_40_KN',
  PERMOHONAN_PERPANJANGAN_HAN_40_KN: 'MINTA_PANJANG_HAN_40_KN',
  MINTA_PANJANG_HAN_40_KN: 'MINTA_PANJANG_HAN_40_KN',
  SPRIN_PERPANJANG_HAN_40_HARI_KN_DAN_BA: 'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
  PERPANJANGAN_HAN: 'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
  PERPANJANGAN_HAN_PU: 'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
  SPRIN_PANJANG_HAN_40_KN_DAN_BA: 'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
  SURAT_MINTA_PERPANJANG_HAN_30_HARI_1_KPN: 'MINTA_PANJANG_HAN_30_KPN1',
  PERMOHONAN_PERPANJANGAN_HAN_PN_1: 'MINTA_PANJANG_HAN_30_KPN1',
  PERMOHONAN_PERPANJANGAN_HAN_PN1: 'MINTA_PANJANG_HAN_30_KPN1',
  MINTA_PANJANG_HAN_30_KPN1: 'MINTA_PANJANG_HAN_30_KPN1',
  SPRIN_PERPANJANG_HAN_30_HARI_1_KPN_DAN_BA: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  PERPANJANGAN_HAN_PN_1: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  PERPANJANGAN_HAN_PN1: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  PERPANJANGAN_PN_1: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  PERPANJANGAN_PN1: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  SPRIN_PANJANG_HAN_30_KPN1_DAN_BA: 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  SURAT_MINTA_PERPANJANG_HAN_30_HARI_2_KPN: 'MINTA_PANJANG_HAN_30_KPN2',
  PERMOHONAN_PERPANJANGAN_HAN_PN_2: 'MINTA_PANJANG_HAN_30_KPN2',
  PERMOHONAN_PERPANJANGAN_HAN_PN2: 'MINTA_PANJANG_HAN_30_KPN2',
  MINTA_PANJANG_HAN_30_KPN2: 'MINTA_PANJANG_HAN_30_KPN2',
  SPRIN_PERPANJANG_HAN_30_HARI_2_KPN_DAN_BA: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',
  PERPANJANGAN_HAN_PN_2: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',
  PERPANJANGAN_HAN_PN2: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',
  PERPANJANGAN_PN_2: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',
  PERPANJANGAN_PN2: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',
  SPRIN_PANJANG_HAN_30_KPN2_DAN_BA: 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA',

  // Level 4: Berkas Perkara & Sita
  IZIN_SITA_PN: 'IZIN_SITA_PN',
  IZIN_SITA_PN_LEBIH_1: 'IZIN_SITA_PN',
  IZIN_SITA_PN_MORE_1: 'IZIN_SITA_PN',
  IZIN_SITA_PN_MORE_1_TSK: 'IZIN_SITA_PN',
  SAMPUL_BP: 'SAMPUL_BERKAS_PERKARA',
  SAMPUL_BERKAS: 'SAMPUL_BERKAS_PERKARA',
  SAMPUL_BERKAS_PERKARA: 'SAMPUL_BERKAS_PERKARA',
  SAMPUL_BERKAS_PERKARA_MORE_1_TSK: 'SAMPUL_BERKAS_PERKARA',
  PENGANTAR_TAHAP_1: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_TAHAP1: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_BP_TAHAP_1: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_BP_TAHAP1: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_TAHAP_1_MORE_1_TSK: 'PENGANTAR_BP_TAHAP1',
  PENGANTAR_BP_TAHAP1_MORE_1_TSK: 'PENGANTAR_BP_TAHAP1',
  TANDA_TERIMA_TAHAP_1: 'TANDA_TERIMA_TAHAP1',
  TANDA_TERIMA_BP_TAHAP_1: 'TANDA_TERIMA_TAHAP1',
  TANDA_TERIMA_TAHAP1: 'TANDA_TERIMA_TAHAP1',
  PENGANTAR_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_TAHAP_1_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_TAHAP_1_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_BP_TAHAP_1_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_BP_TAHAP1_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_BP_KEMBALI_P19: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_P19_MORE_1_TSK: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_BP_KEMBALI_P19_MORE_1_TSK: 'PENGANTAR_BP_KEMBALI_P19',
  PENGANTAR_TAHAP_1_P19_MORE_1_TSK: 'PENGANTAR_BP_KEMBALI_P19',
  TANDA_TERIMA_KEMBALI_BP_P19: 'TANDA_TERIMA_KEMBALI_P19',
  TANDA_TERIMA_KEMBALI_P19: 'TANDA_TERIMA_KEMBALI_P19',
  PENGANTAR_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGANTAR_KIRIM_TSK_BB_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGANTAR_PENGIRIMAN_TSK_DAN_BB_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGANTAR_PENGIRIMAN_TSK_BB_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGIRIMAN_TSK_BB_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGIRIMAN_TSK_DAN_BB_TAHAP_2: 'PENGANTAR_TAHAP2',
  PENGIRIMAN_TSK_BB_TAHAP_2_MORE_1_TSK: 'PENGANTAR_TAHAP2',
  PENGIRIMAN_TSK_DAN_BB_TAHAP_2_MORE_1_TSK: 'PENGANTAR_TAHAP2',
  PENGANTAR_KIRIM_TSK_BB_TAHAP_2_MORE_1_TSK: 'PENGANTAR_TAHAP2',
  PENGANTAR_TAHAP2: 'PENGANTAR_TAHAP2',
  PENGANTAR_TAHAP_2_MORE_1_TSK: 'PENGANTAR_TAHAP2',
  PENGANTAR_TAHAP2_MORE_1_TSK: 'PENGANTAR_TAHAP2'
};

/**
 * Fungsi kanonik tunggal untuk menormalisasi kode template Mindik
 * agar selaras 100% dengan kunci MINDIK_PRESETS.
 */
export function toCanonicalMindikCode(rawCode = '', title = '') {
  const cleanCode = String(rawCode || '')
    .toUpperCase()
    .trim()
    .replace(/[{}]/g, '')
    .replace(/[.\-\s/]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const cleanTitle = String(title || '').toUpperCase().trim();

  if (cleanCode && CANONICAL_CODE_ALIASES[cleanCode]) {
    return CANONICAL_CODE_ALIASES[cleanCode];
  }

  // Normalisasi seluruh varian multi-subjek (_MORE_1_*, _LEBIH_1_*, _LEBIH_DARI_1_*, atau _1_TSK s.d. _6_TSK) ke kode kanonik dasar
  const multiVariantMatch = cleanCode.match(
    /^(.+?)_(?:(?:MORE|LEBIH|LEBIH_DARI)_1(?:_(?:TSK|TERSANGKA|TERLAPOR))?|[1-6]_(?:TSK|TERSANGKA|TERLAPOR))$/
  );
  if (multiVariantMatch) {
    const baseWithoutMulti = multiVariantMatch[1];
    if (CANONICAL_CODE_ALIASES[baseWithoutMulti]) {
      return CANONICAL_CODE_ALIASES[baseWithoutMulti];
    }
    if (baseWithoutMulti === 'SPDP') {
      return cleanCode.includes('TERLAPOR') ? 'SPDP_TERLAPOR' : 'SPDP_TSK';
    }
    if (baseWithoutMulti.includes('P19')) return 'PENGANTAR_BP_KEMBALI_P19';
    if (baseWithoutMulti === 'PENGANTAR_TAHAP_1' || baseWithoutMulti === 'PENGANTAR_BP_TAHAP_1') return 'PENGANTAR_BP_TAHAP1';
    if (
      baseWithoutMulti === 'PENGANTAR_TAHAP_2' ||
      baseWithoutMulti.includes('TAHAP_2') ||
      baseWithoutMulti.includes('TAHAP2') ||
      baseWithoutMulti.includes('TSK_BB') ||
      baseWithoutMulti.includes('TSK_DAN_BB')
    ) {
      return 'PENGANTAR_TAHAP2';
    }
    if (baseWithoutMulti === 'PERMOHONAN_PERPANJANGAN_HAN') return 'MINTA_PANJANG_HAN_40_KN';
    if (baseWithoutMulti === 'IZIN_SITA_PN') return 'IZIN_SITA_PN';
  }

  if (
    cleanCode.includes('TAHAP_2') ||
    cleanCode.includes('TAHAP2') ||
    cleanCode.includes('TSK_DAN_BB') ||
    cleanCode.includes('TSK_BB') ||
    /\bTAHAP\s*(?:2|II)\b/.test(cleanTitle) ||
    (cleanTitle.includes('PENGANTAR') && cleanTitle.includes('TSK') && cleanTitle.includes('BB'))
  ) {
    return 'PENGANTAR_TAHAP2';
  }

  // Deteksi pola fleksibel SP.Gas.Sidik vs SP.Sidik
  const isGasSidik =
    (cleanCode.includes('GAS') && cleanCode.includes('SIDIK')) ||
    (cleanTitle.includes('TUGAS') && cleanTitle.includes('PENYIDIKAN'));
  if (isGasSidik && !cleanCode.includes('TAMBAHAN') && !cleanCode.includes('LANJUTAN') && !cleanCode.includes('MORE')) {
    return 'SPGAS_SIDIK';
  }

  const isSprinSidik =
    ((cleanCode.includes('SPRIN_SIDIK') || cleanCode.includes('SP_SIDIK')) &&
      !cleanCode.includes('GAS') &&
      !cleanCode.includes('TAMBAHAN') &&
      !cleanCode.includes('LANJUTAN') &&
      !cleanCode.includes('MORE')) ||
    (cleanTitle.includes('SURAT PERINTAH PENYIDIKAN') &&
      !cleanTitle.includes('TUGAS') &&
      !cleanTitle.includes('TAMBAHAN') &&
      !cleanTitle.includes('LANJUTAN') &&
      !cleanTitle.includes('LEBIH DARI'));
  if (isSprinSidik) {
    return 'SPRIN_SIDIK';
  }

  // Deteksi Penetapan Tersangka vs Pemberitahuan Penetapan Tersangka
  if (
    cleanCode === 'SP_TAP' ||
    (cleanCode.includes('TAP_TSK') && !cleanCode.includes('PEMBERITAHUAN')) ||
    (cleanTitle.includes('PENETAPAN TERSANGKA') && !cleanTitle.includes('PEMBERITAHUAN'))
  ) {
    return 'TAP_TSK';
  }

  // Deteksi Surat Panggilan Saksi & Tersangka (Ke-1 vs Ke-2) dari judul atau kode fleksibel
  if (cleanCode.includes('PANGGIL') || cleanCode.startsWith('SPGL') || cleanTitle.includes('PANGGILAN')) {
    const isSecondCall =
      /(?:^|_)2$/.test(cleanCode) ||
      cleanCode.includes('KE_2') ||
      cleanCode.includes('KE2') ||
      /\b(KE[-\s]?2|KEDUA|II)\b/.test(cleanTitle);
    const isSaksiCall = cleanCode.includes('SAKSI') || cleanTitle.includes('SAKSI');
    const isTskCall = cleanCode.includes('TSK') || cleanCode.includes('TERSANGKA') || cleanTitle.includes('TERSANGKA');
    if (isSaksiCall) {
      return isSecondCall ? 'SPGL_SAKSI_2' : 'SPGL_SAKSI_1';
    }
    if (isTskCall) {
      return isSecondCall ? 'SPGL_TSK_2' : 'SPGL_TSK_1';
    }
  }

  if (cleanTitle.includes('SURAT PERINTAH PENYELIDIKAN') && !cleanTitle.includes('TUGAS')) {
    return 'SPRIN_LIDIK';
  }
  if (cleanTitle.includes('TUGAS') && cleanTitle.includes('PENYELIDIKAN')) {
    return 'SPGAS_LIDIK';
  }

  return cleanCode || 'MINDIK';
}

/**
 * Alias resmi normalisasi kode template kanonik untuk kompatibilitas mundur arsip lama
 * (mis. SPDP_MORE_1_TSK -> SPDP_TSK, PENGANTAR_TAHAP_1_MORE_1_TSK -> PENGANTAR_BP_TAHAP1,
 * PENGANTAR_P19_MORE_1_TSK -> PENGANTAR_BP_KEMBALI_P19).
 */
export function normalizeCanonicalTemplateCode(rawCode = '', title = '') {
  return toCanonicalMindikCode(rawCode, title);
}

/**
 * Ekstraksi ringan nomor surat dari baris arsip public.documents (termasuk meta_values JSON).
 */
export function getArchiveRowDocNumber(doc = {}) {
  if (!doc || typeof doc !== 'object') return '';
  let mv = doc.meta_values || doc.metadata || {};
  if (typeof mv === 'string') {
    try {
      mv = JSON.parse(mv) || {};
    } catch {
      mv = {};
    }
  }
  const candidates = [
    doc.doc_number,
    doc.nomor_surat,
    doc.document_number,
    doc.doc_no,
    mv.NOMOR_SURAT,
    mv.nomor_surat,
    mv.NO_SURAT,
    mv.no_surat,
    mv.DOC_NO,
    mv.doc_no
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const s = String(c).trim();
      if (s && s !== '-' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') {
        return s;
      }
    }
  }
  return '';
}

/**
 * Mengambil dokumen arsip terbaru yang sah untuk satu atau beberapa kode kanonik.
 * Prioritas #1: dokumen terbaru (created_at terbesar) yang memiliki nomor surat valid.
 * Prioritas #2 (jika fallbackToInvalid = true): dokumen terbaru di DB meski belum bernomor resmi.
 */
export function resolveLatestArchiveDoc(docs = [], canonicalCodes = [], fallbackToInvalid = false) {
  const targetSet = new Set(
    (Array.isArray(canonicalCodes) ? canonicalCodes : [canonicalCodes])
      .map(c => toCanonicalMindikCode(c))
      .filter(Boolean)
  );
  if (targetSet.size === 0 || !Array.isArray(docs) || docs.length === 0) return null;

  const matching = docs
    .filter((d) => {
      if (!d) return false;
      const code = toCanonicalMindikCode(d.template_code || d.code || d.document_type || '', d.doc_title || d.title || d.document_name || '');
      return targetSet.has(code);
    })
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  if (matching.length === 0) return null;

  // Cari dari yang paling baru yang bernomor resmi valid
  for (let i = matching.length - 1; i >= 0; i--) {
    const row = matching[i];
    const num = getArchiveRowDocNumber(row);
    if (isValidOfficialDocNumber(num)) {
      return row;
    }
  }

  return fallbackToInvalid ? matching[matching.length - 1] : null;
}

/**
 * Label ramah untuk dokumen prasyarat pada pesan UI & validasi rantai.
 */
export const PREREQUISITE_LABELS = {
  LP: 'Laporan Polisi (LP) Aktif',
  SPRIN_SIDIK: 'Surat Perintah Penyidikan (SP.Sidik)',
  SPGAS_SIDIK: 'Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)',
  SPDP: 'Surat Pemberitahuan Dimulainya Penyidikan (SPDP)',
  TAP_TSK: 'Surat Ketetapan Penetapan Tersangka (S.Tap.Tsk)',
  SPGL_SAKSI_1: 'Surat Panggilan Saksi Ke-1 (S.Pgl Saksi I)',
  SPGL_TSK_1: 'Surat Panggilan Tersangka Ke-1 (S.Pgl Tersangka I)',
  SPRIN_KAP_DAN_BA: 'Surat Perintah Penangkapan (SP.Kap)',
  SPRIN_HAN_DAN_BA: 'Surat Perintah Penahanan (SP.Han)',
  PENGANTAR_BP_TAHAP1: 'Surat Pengantar Berkas Perkara Tahap I'
};

/**
 * Daftar varian kode yang memenuhi satu simbol prasyarat di CHAIN_RULES.
 */
export const PREREQUISITE_SATISFIERS = {
  SPRIN_SIDIK: ['SPRIN_SIDIK', 'SPRIN_SIDIK_MORE_5'],
  SPGAS_SIDIK: ['SPGAS_SIDIK', 'SPGAS_SIDIK_MORE_5'],
  TAP_TSK: ['TAP_TSK'],
  SPGL_SAKSI_1: ['SPGL_SAKSI_1', 'SPGL_SAKSI'],
  SPGL_TSK_1: ['SPGL_TSK_1', 'SPGL_TSK'],
  SPDP: [
    'SPDP_TSK',
    'SPDP_TERLAPOR',
    'SPDP_LIDIK_ANON',
    'SPDP_KORPORASI',
    'PENGIRIMAN_KEMBALI_SPDP_P20'
  ],
  SPRIN_KAP_DAN_BA: ['SPRIN_KAP_DAN_BA'],
  SPRIN_HAN_DAN_BA: ['SPRIN_HAN_DAN_BA'],
  PENGANTAR_BP_TAHAP1: ['PENGANTAR_BP_TAHAP1', 'PENGANTAR_TAHAP_1', 'PENGANTAR_TAHAP1']
};

/**
 * Aturan rantai formil KUHAP berbasis Level 1 s.d. Level 4 + subjectMode.
 */
export const CHAIN_RULES = {
  // ======================== LEVEL 1 (LP AKTIF) ========================
  SPRIN_SIDIK: { level: 1, required: ['LP'], recommended: [], subjectMode: 'none' },
  SPRIN_SIDIK_MORE_5: { level: 1, required: ['LP'], recommended: [], subjectMode: 'none' },
  SPRIN_SIDIK_TAMBAHAN: { level: 1, required: ['LP'], recommended: ['SPRIN_SIDIK'], subjectMode: 'none' },
  SPRIN_SIDIK_LANJUTAN: { level: 1, required: ['LP'], recommended: ['SPRIN_SIDIK'], subjectMode: 'none' },

  // Lidik (opsional sebelum/bersamaan)
  SPRIN_LIDIK: { level: 1, required: ['LP'], recommended: [], subjectMode: 'none' },
  SPGAS_LIDIK: { level: 1, required: ['LP'], recommended: [], subjectMode: 'none' },

  // ======================== LEVEL 2 (SPRIN_SIDIK SAH) ========================
  SPGAS_SIDIK: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPGAS_SIDIK_MORE_5: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPGAS_SIDIK_TAMBAHAN: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPGAS_SIDIK_LANJUTAN: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },

  // SPDP (1 preset dinamis SPDP_TSK untuk 1 maupun >1 tersangka, dan 1 preset SPDP_TERLAPOR)
  SPDP_TSK: { level: 2, required: ['SPRIN_SIDIK'], recommended: ['TAP_TSK'], subjectMode: 'tersangka' },
  SPDP_TERLAPOR: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'terlapor' },
  SPDP_LIDIK_ANON: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPDP_KORPORASI: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  PENGIRIMAN_KEMBALI_SPDP_P20: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },

  // Saksi & Korban
  SPGL_SAKSI_1: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'saksi' },
  SPGL_SAKSI_2: {
    level: 2,
    required: ['SPRIN_SIDIK'],
    recommended: ['SPGL_SAKSI_1'],
    recommendedNote: 'Surat Panggilan Saksi Ke-1 (SPGL_SAKSI_1) untuk saksi terkait belum ditemukan di arsip perkara ini. Sebaiknya terbitkan Panggilan Saksi Ke-1 terlebih dahulu agar Nomor & Tanggal rujukan Panggilan Ke-1 terhubung otomatis.',
    subjectMode: 'saksi'
  },
  SPRIN_BAWA_SAKSI_DAN_BA: { level: 2, required: ['SPRIN_SIDIK'], recommended: ['SPGL_SAKSI_1'], subjectMode: 'saksi' },
  BA_CARI_SAKSI: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'saksi' },
  HAK_SAKSI: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'saksi' },
  HAK_KORBAN: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'pelapor_korban' },
  HAK_PEREMPUAN: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'pelapor_korban' },
  VER_LUKA: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'pelapor_korban' },
  VER_PSIKIATRI: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'pelapor_korban' },

  // Sita / Geledah (IZIN_SITA_PN_LEBIH_1 dilebur ke dalam IZIN_SITA_PN dinamis)
  SPRIN_SITA_UMUM: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPRIN_BUNGKUS_SEGEL: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  IZIN_SITA_PN: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'tersangka' },
  MOHON_TITIP_RAWAT_BB: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },
  SPRIN_TITIP_RAWAT_BB: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' },

  // Penetapan Tersangka (terlapor -> tersangka)
  TAP_TSK: { level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'terlapor_to_tersangka' },

  // ======================== LEVEL 3 (SPRIN_SIDIK + TAP_TSK SAH) ========================
  PEMBERITAHUAN_TAP_TSK: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  PEMBERITAHUAN_TAP_TSK_JPU: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  SPGL_TSK_1: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  SPGL_TSK_2: {
    level: 3,
    required: ['SPRIN_SIDIK', 'TAP_TSK'],
    recommended: ['SPGL_TSK_1'],
    recommendedNote: 'Surat Panggilan Tersangka Ke-1 (SPGL_TSK_1) untuk tersangka terkait belum ditemukan di arsip perkara ini. Sebaiknya terbitkan Panggilan Tersangka Ke-1 terlebih dahulu agar Nomor & Tanggal rujukan Panggilan Ke-1 terhubung otomatis.',
    subjectMode: 'tersangka'
  },
  SPRIN_BAWA_TSK_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: ['SPGL_TSK_1'], subjectMode: 'tersangka' },

  // Kategori Penahanan & Penangkapan
  SPRIN_KAP_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  SPGAS_KAP: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  SPRIN_BAWA_LEWAT_KAP: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: ['SPRIN_KAP_DAN_BA'], subjectMode: 'tersangka' },
  BA_HAK_TSK: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  SPRIN_LEPAS_KAP_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: ['SPRIN_KAP_DAN_BA'], subjectMode: 'tersangka' },
  SPRIN_HAN_DAN_BA: {
    level: 3,
    required: ['SPRIN_SIDIK', 'TAP_TSK'],
    recommended: ['SPRIN_KAP_DAN_BA'],
    recommendedNote: 'Perhatian Formil KUHAP: SP.Kap belum diterbitkan. Apabila tersangka tidak ditangkap, wajib diterbitkan Surat Panggilan Tersangka terlebih dahulu karena tersangka yang hadir menghadap penyidik harus berdasarkan Surat Perintah Penangkapan atau Surat Panggilan Tersangka.',
    subjectMode: 'tersangka'
  },
  MINTA_PANJANG_HAN_40_KN: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },
  SPRIN_PANJANG_HAN_40_KN_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },
  MINTA_PANJANG_HAN_30_KPN1: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },
  SPRIN_PANJANG_HAN_30_KPN1_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },
  MINTA_PANJANG_HAN_30_KPN2: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },
  SPRIN_PANJANG_HAN_30_KPN2_DAN_BA: { level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' },

  // ======================== LEVEL 4 (SPRIN_SIDIK + SPDP + TAP_TSK SAH) ========================
  SAMPUL_BERKAS_PERKARA: { level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  PENGANTAR_BP_TAHAP1: { level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' },
  TANDA_TERIMA_TAHAP1: { level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: ['PENGANTAR_BP_TAHAP1'], subjectMode: 'tersangka' },
  PENGANTAR_BP_KEMBALI_P19: {
    level: 4,
    required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'],
    recommended: ['PENGANTAR_BP_TAHAP1'],
    recommendedNote: 'Surat Pengantar Berkas Perkara Tahap I sebelumnya belum ditemukan di arsip perkara ini. Sebaiknya terbitkan Pengantar BP Tahap I terlebih dahulu agar Nomor & Tanggal rujukan Tahap I terhubung otomatis pada Pengantar Tahap I Kembali (P-19).',
    subjectMode: 'tersangka'
  },
  TANDA_TERIMA_KEMBALI_P19: { level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: ['PENGANTAR_BP_KEMBALI_P19'], subjectMode: 'tersangka' },
  PENGANTAR_TAHAP2: { level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: ['PENGANTAR_BP_TAHAP1'], subjectMode: 'tersangka' }
};

/**
 * Mengambil konfigurasi aturan rantai untuk kode template apa pun
 * (termasuk template kustom baru di masa depan dari Template Studio).
 */
export function getChainRuleForCode(rawCode = '', title = '') {
  const canonical = toCanonicalMindikCode(rawCode, title);
  if (CHAIN_RULES[canonical]) {
    return { canonicalCode: canonical, ...CHAIN_RULES[canonical] };
  }

  // Aturan heuristik aman untuk template kustom baru
  if (canonical.includes('PANJANG_HAN')) {
    return { canonicalCode: canonical, level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK', 'SPRIN_HAN_DAN_BA'], recommended: [], subjectMode: 'tersangka' };
  }
  if (canonical.includes('KAP') || canonical.includes('HAN') || canonical.includes('TSK')) {
    return { canonicalCode: canonical, level: 3, required: ['SPRIN_SIDIK', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' };
  }
  if (canonical.includes('TAHAP1') || canonical.includes('TAHAP_1') || canonical.includes('TAHAP2') || canonical.includes('TAHAP_2') || canonical.includes('P19')) {
    return { canonicalCode: canonical, level: 4, required: ['SPRIN_SIDIK', 'SPDP', 'TAP_TSK'], recommended: [], subjectMode: 'tersangka' };
  }
  if (canonical.includes('SAKSI')) {
    return { canonicalCode: canonical, level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'saksi' };
  }
  if (canonical.includes('KORBAN') || canonical.includes('VER_')) {
    return { canonicalCode: canonical, level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'pelapor_korban' };
  }
  if (canonical.includes('TERLAPOR')) {
    return { canonicalCode: canonical, level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'terlapor' };
  }

  // Default aman template baru (misal BA_KONFRONTASI, SP_GELAR_PERKARA): terbuka setelah SP.Sidik sah
  return { canonicalCode: canonical, level: 2, required: ['SPRIN_SIDIK'], recommended: [], subjectMode: 'none' };
}

/**
 * Helper mengambil subjectMode kanonik untuk UI / form pemilih subjek hukum.
 */
export function getSubjectModeForTemplate(rawCode = '', title = '') {
  return getChainRuleForCode(rawCode, title).subjectMode || 'none';
}

/**
 * Normalisasi string Nomor Laporan Polisi (LP) menjadi kunci alfanumerik seragam
 * serta ekstraksi komponen Model (A/B) dan Nomor Urut LP untuk pencocokan lintas format
 * (misal: "LP/A/2/...", "LP/A/02/...", "LP A 2", "LP-A-2", "LP/B/3/..." dll.).
 */
export function normalizeLpNumber(raw = '') {
  const str = String(raw || '').trim().toUpperCase();
  if (!str || str === '-' || str === 'NULL' || str === 'UNDEFINED') return '';
  return str.replace(/[^A-Z0-9]/g, '');
}

/**
 * Ekstrak struktur pendek LP: { model: 'A'|'B'|'', seq: '2', hasTail: boolean, alnum: '...' }
 */
export function parseLpIdentity(raw = '') {
  const str = String(raw || '').trim().toUpperCase();
  const alnum = normalizeLpNumber(str);
  if (!alnum) return null;

  // Cocokkan pola: LP / A / 2 ... atau LP A 2 ... atau LP B 03 ... atau LP 2 ...
  const match = str.match(/^LP[\s/._:-]*([AB])?[\s/._:-]*0*(\d+)(?:[\s/._:-]+(.*))?$/i);
  if (!match) {
    return { model: '', seq: '', hasTail: true, alnum, raw: str };
  }
  const model = (match[1] || '').toUpperCase();
  const seq = String(match[2] || '').replace(/^0+/, '') || '0';
  const tail = String(match[3] || '').trim();
  const hasTail = tail.length > 0;
  return { model, seq, hasTail, alnum, raw: str };
}

/**
 * Membandingkan apakah dua string Nomor LP merujuk pada Laporan Polisi yang sama.
 * Mendukung pencocokan persis alfanumerik ("LP/A/2" === "LP A 2") maupun
 * label ringkas ("LP A 2" cocok dengan "LP/A/2/XI/2026/SPKT/...").
 */
export function isSameLpNumber(lpA = '', lpB = '') {
  const normA = normalizeLpNumber(lpA);
  const normB = normalizeLpNumber(lpB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const idA = parseLpIdentity(lpA);
  const idB = parseLpIdentity(lpB);
  if (!idA || !idB) return false;

  // Jika keduanya punya model (A atau B) dan nomor urut (seq) yang sama,
  // dan salah satunya adalah penulisan ringkas tanpa ekor bulan/tahun (misal "LP A 2")
  if (idA.model && idB.model && idA.model === idB.model && idA.seq && idA.seq === idB.seq) {
    if (!idA.hasTail || !idB.hasTail) {
      return true;
    }
  }
  return false;
}

/**
 * Memeriksa apakah sebuah dokumen arsip (dari public.documents) terhubung dengan suatu perkara (caseItem)
 * baik melalui case_id (termasuk variasi prefix case-dumas-) maupun melalui Nomor LP (isSameLpNumber).
 */
export function isDocumentLinkedToCase(doc, caseItem) {
  if (!doc || !caseItem) return false;

  const docCaseId = String(doc.case_id || doc.meta_values?.original_case_id || doc.meta_values?.case_id || '').trim();
  const caseId = String(caseItem.id || '').trim();
  const dumasId = String(caseItem.dumas_id || caseItem.references?.dumas_id || '').trim();

  if (docCaseId && caseId) {
    if (docCaseId === caseId) return true;
    const cleanDocCaseId = docCaseId.replace(/^case-dumas-/, '').replace(/^recovered-case-/, '');
    const cleanCaseId = caseId.replace(/^case-dumas-/, '').replace(/^recovered-case-/, '');
    if (cleanDocCaseId && cleanCaseId && cleanDocCaseId === cleanCaseId) return true;
    if (dumasId && (docCaseId === dumasId || cleanDocCaseId === dumasId)) return true;
  }

  const docLp =
    doc.nomor_lp ||
    doc.no_lp ||
    doc.meta_values?.nomor_lp ||
    doc.meta_values?.NOMOR_LP ||
    doc.metadata?.nomor_lp ||
    doc.metadata?.NOMOR_LP ||
    '';
  const caseLp = caseItem.nomor_lp || caseItem.no_lp || '';

  if (docLp && caseLp && isSameLpNumber(docLp, caseLp)) {
    return true;
  }

  return false;
}

