import { supabase } from '../supabaseClient';
import {
  toCanonicalMindikCode,
  normalizeLpNumber,
  isSameLpNumber,
  isDocumentLinkedToCase
} from '../constants/mindikChainRegistry';
import { convertDumasToCase, DUMAS_LOCAL_STORAGE_KEY } from './dumasService';

export const CASES_LOCAL_STORAGE_KEY = 'emindik_cases_records_v1';
export const DOCUMENTS_LOCAL_STORAGE_KEY = 'emindik_archive_documents';

const KNOWN_CASE_STORAGE_KEYS = [
  CASES_LOCAL_STORAGE_KEY,
  'emindik_cases',
  'cases',
  'emindik_active_cases'
];

const KNOWN_DUMAS_STORAGE_KEYS = [
  DUMAS_LOCAL_STORAGE_KEY,
  'emindik_dumas',
  'dumas',
  'laporan_pengaduan'
];

const KNOWN_DOC_STORAGE_KEYS = [
  DOCUMENTS_LOCAL_STORAGE_KEY,
  'emindik_documents',
  'emindik_mindik_archives',
  'mindik_archives',
  'documents',
  'arsip_dokumen'
];

/**
 * Kolom dasar yang pasti ada di DDL public.cases (supabase_schema.sql baris 92-111)
 */
const CORE_CASES_COLUMNS = [
  'id',
  'no_lp',
  'tindak_pidana',
  'pasal_uu',
  'pasal',
  'locus',
  'tempus',
  'pelapor_name',
  'terlapor_name',
  'sprin_val_date',
  'sprin_loc',
  'sprin_date',
  'status',
  'investigators',
  'person',
  'references',
  'created_at',
  'updated_at'
];

/**
 * Kolom tambahan hasil migrasi public.cases (supabase_schema.sql baris 321-336)
 */
const EXTENDED_CASES_COLUMNS = [
  ...CORE_CASES_COLUMNS,
  'nomor_lp',
  'tanggal_lp',
  'nama_pelapor',
  'nama_terlapor',
  'dasar_pasal_uu',
  'no_sprin_sidik',
  'no_spdp',
  'no_p21_kn',
  'terlapor_list',
  'penyidik_penangan_index',
  'penyidik_penangan_nama',
  'penyidik_penangan_pangkat',
  'penyidik_penangan_nrp',
  'penyidik_penangan_jabatan'
];

/**
 * Sanitasi objek perkara agar 100% aman di-insert/upsert ke public.cases
 * tanpa gagal karena kolom UI opsional atau constraint status.
 */
export function buildSanitizedCasePayloads(rawCase = {}) {
  const nomorLp = String(rawCase.nomor_lp || rawCase.no_lp || '').trim();
  const caseId = String(rawCase.id || `case-${normalizeLpNumber(nomorLp) || Date.now()}`).trim();
  const todayIso = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const rawStatus = String(rawCase.status || 'active').toLowerCase();
  const validStatus = ['active', 'completed', 'archived'].includes(rawStatus)
    ? rawStatus
    : 'active';

  const existingRefs = (rawCase.references && typeof rawCase.references === 'object') ? rawCase.references : {};

  // Simpan juga seluruh properti kaya (kasat_*, penyidik_1..5_*, pelapor_list, saksi_list, tersangka_list, barang_bukti, dumas_id)
  // di dalam JSONB `references` agar tidak ada satu pun informasi yang hilang walaupun tabel database hanya punya kolom dasar
  const enrichedReferences = {
    ...existingRefs,
    ...(rawCase.dumas_id ? { dumas_id: rawCase.dumas_id } : {}),
    ...(rawCase.kasat_nama ? { kasat_nama: rawCase.kasat_nama } : {}),
    ...(rawCase.kasat_pangkat ? { kasat_pangkat: rawCase.kasat_pangkat } : {}),
    ...(rawCase.kasat_nrp ? { kasat_nrp: rawCase.kasat_nrp } : {}),
    ...(rawCase.penyidik_1_nama ? { penyidik_1_nama: rawCase.penyidik_1_nama } : {}),
    ...(rawCase.penyidik_1_pangkat ? { penyidik_1_pangkat: rawCase.penyidik_1_pangkat } : {}),
    ...(rawCase.penyidik_1_nrp ? { penyidik_1_nrp: rawCase.penyidik_1_nrp } : {}),
    ...(rawCase.penyidik_1_jabatan ? { penyidik_1_jabatan: rawCase.penyidik_1_jabatan } : {}),
    ...(Array.isArray(rawCase.pelapor_list) && rawCase.pelapor_list.length > 0 ? { pelapor_list: rawCase.pelapor_list } : {}),
    ...(Array.isArray(rawCase.victims) && rawCase.victims.length > 0 ? { victims: rawCase.victims } : {}),
    ...(Array.isArray(rawCase.saksi_list) && rawCase.saksi_list.length > 0 ? { saksi_list: rawCase.saksi_list } : {}),
    ...(Array.isArray(rawCase.terlapor_list) && rawCase.terlapor_list.length > 0 ? { terlapor_list: rawCase.terlapor_list } : {}),
    ...(Array.isArray(rawCase.tersangka_list) && rawCase.tersangka_list.length > 0 ? { tersangka_list: rawCase.tersangka_list } : {}),
    ...(Array.isArray(rawCase.lampiran_barang_bukti) && rawCase.lampiran_barang_bukti.length > 0
      ? { barang_bukti: rawCase.lampiran_barang_bukti }
      : {})
  };

  const fullCandidate = {
    id: caseId,
    no_lp: nomorLp || `LP/SATRESKRIM/${caseId}`,
    nomor_lp: nomorLp || `LP/SATRESKRIM/${caseId}`,
    tanggal_lp: rawCase.tanggal_lp || rawCase.sprin_date || todayIso,
    tindak_pidana: String(rawCase.tindak_pidana || rawCase.perkara || 'Tindak Pidana Umum').trim(),
    pasal_uu: String(rawCase.pasal_uu || rawCase.dasar_pasal_uu || rawCase.pasal || '-').trim(),
    dasar_pasal_uu: String(rawCase.dasar_pasal_uu || rawCase.pasal_uu || rawCase.pasal || '-').trim(),
    pasal: String(rawCase.pasal || rawCase.pasal_uu || rawCase.dasar_pasal_uu || '-').trim(),
    locus: String(rawCase.locus || rawCase.locus_delicti || 'Wilayah Hukum Polres Kolaka Timur').trim(),
    tempus: String(rawCase.tempus || rawCase.tempus_delicti || todayIso).trim(),
    pelapor_name: String(rawCase.pelapor_name || rawCase.nama_pelapor || 'Pelapor').trim(),
    nama_pelapor: String(rawCase.nama_pelapor || rawCase.pelapor_name || 'Pelapor').trim(),
    terlapor_name: String(rawCase.terlapor_name || rawCase.nama_terlapor || rawCase.person?.nama || 'Dalam Penyelidikan').trim(),
    nama_terlapor: String(rawCase.nama_terlapor || rawCase.terlapor_name || rawCase.person?.nama || 'Dalam Penyelidikan').trim(),
    sprin_val_date: String(rawCase.sprin_val_date || '30 (tiga puluh) hari'),
    sprin_loc: String(rawCase.sprin_loc || 'Tirawuta'),
    sprin_date: String(rawCase.sprin_date || rawCase.tanggal_lp || todayIso),
    status: validStatus,
    investigators: Array.isArray(rawCase.investigators) ? rawCase.investigators : [],
    person: (rawCase.person && typeof rawCase.person === 'object') ? rawCase.person : {},
    references: enrichedReferences,
    terlapor_list: Array.isArray(rawCase.terlapor_list) ? rawCase.terlapor_list : [],
    no_sprin_sidik: rawCase.no_sprin_sidik || null,
    no_spdp: rawCase.no_spdp || null,
    no_p21_kn: rawCase.no_p21_kn || null,
    penyidik_penangan_index: Number(rawCase.penyidik_penangan_index) || 1,
    penyidik_penangan_nama: rawCase.penyidik_penangan_nama || rawCase.penyidik_1_nama || null,
    penyidik_penangan_pangkat: rawCase.penyidik_penangan_pangkat || rawCase.penyidik_1_pangkat || null,
    penyidik_penangan_nrp: rawCase.penyidik_penangan_nrp || rawCase.penyidik_1_nrp || null,
    penyidik_penangan_jabatan: rawCase.penyidik_penangan_jabatan || rawCase.penyidik_1_jabatan || null,
    created_at: rawCase.created_at || nowIso,
    updated_at: nowIso
  };

  const extendedPayload = {};
  EXTENDED_CASES_COLUMNS.forEach((col) => {
    if (fullCandidate[col] !== undefined) extendedPayload[col] = fullCandidate[col];
  });

  const corePayload = {};
  CORE_CASES_COLUMNS.forEach((col) => {
    if (fullCandidate[col] !== undefined) corePayload[col] = fullCandidate[col];
  });

  return { extendedPayload, corePayload, hydratedCase: { ...rawCase, ...fullCandidate } };
}

/**
 * Insert / Upsert satu perkara ke public.cases di Supabase dengan fallback otomatis
 * dari skema migrasi (extended) ke skema dasar (core) bila kolom opsional belum ada.
 * Tidak pernah menghapus data.
 */
export async function upsertCaseToSupabaseSafe(rawCase) {
  const { extendedPayload, corePayload, hydratedCase } = buildSanitizedCasePayloads(rawCase);

  // 1. Cek apakah sudah ada baris di public.cases dengan id atau no_lp yang sama
  try {
    const { data: existingRows } = await supabase
      .from('cases')
      .select('id, no_lp')
      .or(`id.eq.${extendedPayload.id},no_lp.eq.${extendedPayload.no_lp}`);

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      return { success: true, alreadyExists: true, id: existingId, data: { ...hydratedCase, id: existingId } };
    }
  } catch {}

  // 2. Coba insert dengan extendedPayload terlebih dahulu
  let { data, error } = await supabase
    .from('cases')
    .upsert([extendedPayload], { onConflict: 'id' })
    .select();

  // 3. Jika gagal karena kolom migrasi belum ada di schema cache (PGRST204 / column does not exist),
  //    coba ulang dengan corePayload (hanya kolom dasar DDL)
  if (error) {
    const retry = await supabase
      .from('cases')
      .upsert([corePayload], { onConflict: 'id' })
      .select();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { success: false, error, data: hydratedCase };
  }

  const savedRow = Array.isArray(data) && data[0] ? data[0] : extendedPayload;
  return {
    success: true,
    alreadyExists: false,
    id: savedRow.id,
    data: { ...hydratedCase, ...savedRow, nomor_lp: hydratedCase.nomor_lp, no_lp: hydratedCase.no_lp }
  };
}

/**
 * Insert / Upsert satu dokumen arsip ke public.documents di Supabase dengan penanganan
 * Foreign Key case_id yang aman (jika case_id belum terdaftar di public.cases, daftarkan induknya
 * atau simpan case_id asli di meta_values.original_case_id agar insert tidak pernah ditolak).
 */
export async function upsertDocumentToSupabaseSafe(rawDoc, activeCase = null) {
  if (!rawDoc) return { success: false, error: new Error('Dokumen kosong') };

  const existingMeta = (rawDoc.meta_values && typeof rawDoc.meta_values === 'object')
    ? rawDoc.meta_values
    : ((rawDoc.metadata && typeof rawDoc.metadata === 'object') ? rawDoc.metadata : {});

  const canonicalCode = toCanonicalMindikCode(
    rawDoc.template_code || rawDoc.code || existingMeta.canonical_code || 'MINDIK',
    rawDoc.doc_title || rawDoc.title || ''
  );

  const tglSuratVal =
    rawDoc.tgl_surat ||
    rawDoc.tanggal_surat ||
    existingMeta.tgl_surat ||
    existingMeta.TANGGAL_SURAT ||
    rawDoc.created_at ||
    new Date().toISOString().split('T')[0];

  const nomorLpVal =
    rawDoc.nomor_lp ||
    rawDoc.no_lp ||
    existingMeta.nomor_lp ||
    existingMeta.NOMOR_LP ||
    activeCase?.nomor_lp ||
    activeCase?.no_lp ||
    '';

  const originalCaseId = rawDoc.case_id || existingMeta.original_case_id || activeCase?.id || null;

  const mergedMetaValues = {
    ...existingMeta,
    ...(tglSuratVal ? { tgl_surat: tglSuratVal, TANGGAL_SURAT: tglSuratVal } : {}),
    ...(nomorLpVal ? { nomor_lp: nomorLpVal, NOMOR_LP: nomorLpVal } : {}),
    ...(originalCaseId ? { original_case_id: String(originalCaseId) } : {}),
    canonical_code: canonicalCode
  };

  const docId = String(rawDoc.id || crypto.randomUUID());

  const basePayload = {
    id: docId,
    case_id: originalCaseId ? String(originalCaseId) : null,
    template_id: rawDoc.template_id ? String(rawDoc.template_id) : null,
    template_code: canonicalCode,
    doc_title: rawDoc.doc_title || rawDoc.title || 'Dokumen Mindik',
    doc_number: rawDoc.doc_number || rawDoc.nomor_surat || '-',
    meta_values: mergedMetaValues,
    file_url: rawDoc.file_url || null,
    storage_path: rawDoc.storage_path || null,
    created_at: rawDoc.created_at || new Date().toISOString()
  };

  // Jika ada activeCase dan case_id diisi, pastikan induk perkara ada di public.cases terlebih dahulu
  // agar Foreign Key case_id REFERENCES public.cases(id) tidak menolak penyimpanan dokumen
  if (activeCase && basePayload.case_id) {
    try {
      await upsertCaseToSupabaseSafe(activeCase);
    } catch {}
  }

  let { data, error } = await supabase
    .from('documents')
    .upsert([basePayload], { onConflict: 'id' })
    .select();

  // Jika masih terjadi Foreign Key constraint error pada case_id (23503),
  // simpan dengan case_id: null sementara original_case_id & nomor_lp tetap tersimpan utuh di meta_values!
  if (error && (error.code === '23503' || String(error.message || '').toLowerCase().includes('foreign key'))) {
    const fallbackPayload = {
      ...basePayload,
      case_id: null
    };
    const retry = await supabase
      .from('documents')
      .upsert([fallbackPayload], { onConflict: 'id' })
      .select();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { success: false, error, data: { ...basePayload, tgl_surat: tglSuratVal, nomor_lp: nomorLpVal } };
  }

  const savedRow = Array.isArray(data) && data[0] ? data[0] : basePayload;
  return {
    success: true,
    data: {
      ...savedRow,
      case_id: savedRow.case_id || originalCaseId,
      template_code: canonicalCode,
      tgl_surat: tglSuratVal,
      nomor_lp: nomorLpVal
    }
  };
}

/**
 * Memindai seluruh localStorage browser untuk mengekstrak item Perkara, Dumas, dan Dokumen Arsip
 * tanpa menghapus atau memodifikasi isi localStorage.
 */
export function scanAllLocalStorageData() {
  const localCases = [];
  const localDumas = [];
  const localDocs = [];

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { localCases, localDumas, localDocs, scannedKeys: [] };
  }

  const scannedKeys = [];

  const isMockOrDummy = (item) => {
    if (!item || typeof item !== 'object') return true;
    const rawStr = JSON.stringify(item);
    if (
      item.id === 'dum-2026-001' ||
      String(item.id || '').startsWith('dum-mock-') ||
      rawStr.includes('Sp.Sidik/88') ||
      rawStr.includes('SPDP B/45')
    ) {
      return true;
    }
    return false;
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    let parsed = null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw || (!raw.startsWith('[') && !raw.startsWith('{'))) continue;
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
    if (items.length === 0) continue;

    // 1. Apakah key dikenal sebagai dokumen arsip atau item memiliki struktur dokumen mindik?
    const isDocKey = KNOWN_DOC_STORAGE_KEYS.includes(key) || /archive|document|mindik_doc/i.test(key);
    // 2. Apakah key dikenal sebagai dumas?
    const isDumasKey = KNOWN_DUMAS_STORAGE_KEYS.includes(key) || /dumas_records/i.test(key);
    // 3. Apakah key dikenal sebagai cases?
    const isCaseKey = KNOWN_CASE_STORAGE_KEYS.includes(key) || /cases_records/i.test(key);

    items.forEach((item) => {
      if (!item || typeof item !== 'object' || isMockOrDummy(item)) return;

      const hasDocShape = Boolean(
        item.doc_title ||
        item.template_code ||
        item.doc_number ||
        (item.meta_values && typeof item.meta_values === 'object')
      );
      const hasDumasShape = Boolean(
        item.nomor_lp &&
        (item.pelapor_nama !== undefined || item.terlapor_nama !== undefined || item.locus_delicti !== undefined)
      );
      const hasCaseShape = Boolean(
        (item.no_lp || item.nomor_lp) &&
        (item.tindak_pidana !== undefined || item.pelapor_name !== undefined || item.nama_pelapor !== undefined) &&
        !hasDocShape
      );

      if (isDocKey || hasDocShape) {
        if (!scannedKeys.includes(key)) scannedKeys.push(key);
        localDocs.push(item);
      } else if (isDumasKey || hasDumasShape) {
        if (!scannedKeys.includes(key)) scannedKeys.push(key);
        localDumas.push(item);
      } else if (isCaseKey || hasCaseShape) {
        if (!scannedKeys.includes(key)) scannedKeys.push(key);
        localCases.push(item);
      }
    });
  }

  return { localCases, localDumas, localDocs, scannedKeys };
}

/**
 * SINKRONISASI OTOMATIS & MANUAL: localStorage + Tabel Dumas -> Supabase (`cases` & `documents`)
 * Bersifat READ / MERGE / UPSERT ONLY (Tidak pernah menghapus data apa pun di Supabase maupun localStorage).
 */
export async function syncLocalDataToSupabase({
  existingServerCases = [],
  existingServerDumas = [],
  existingServerDocs = []
} = {}) {
  const { localCases, localDumas, localDocs, scannedKeys } = scanAllLocalStorageData();

  let syncedCasesCount = 0;
  let syncedDocsCount = 0;
  const syncedCasesList = [...(Array.isArray(existingServerCases) ? existingServerCases : [])];
  const syncedDocsList = [...(Array.isArray(existingServerDocs) ? existingServerDocs : [])];
  const allDumasPool = [...(Array.isArray(existingServerDumas) ? existingServerDumas : [])];

  // Gabungkan localDumas ke allDumasPool
  localDumas.forEach((ld) => {
    const exists = allDumasPool.some(
      (d) =>
        (d.id && ld.id && String(d.id) === String(ld.id)) ||
        (d.nomor_lp && ld.nomor_lp && isSameLpNumber(d.nomor_lp, ld.nomor_lp))
    );
    if (!exists) allDumasPool.push(ld);
  });

  // Kumpulkan kandidat LP (baik LP Model A maupun LP Model B) yang perlu dipastikan ada di public.cases:
  // A. Semua localCases
  // B. Semua record dari dumas (baik dari server `laporan_pengaduan` maupun `localStorage`) yang bernomor LP (`LP/A`, `LP A`, `LP/B`, `LP B`)
  //    atau yang memiliki dokumen arsip terkait
  // C. Rekonstruksi LP dari dokumen arsip (misal `LP A 2`) jika belum ada di public.cases
  const candidateCasesToSync = [...localCases];

  allDumasPool.forEach((dItem) => {
    if (!dItem) return;
    const rawNo = String(dItem.nomor_lp || dItem.no_lp || '').trim();
    const isPoliceReport = /^LP[\s/._:-]*(?:[AB]|\d)/i.test(rawNo);
    const allKnownDocs = [...syncedDocsList, ...localDocs];
    const hasLinkedDocs = allKnownDocs.some((doc) => {
      if (!doc) return false;
      const docCaseId = String(doc.case_id || doc.meta_values?.original_case_id || '').trim();
      if (docCaseId && (docCaseId === String(dItem.id) || docCaseId === `case-dumas-${dItem.id}`)) return true;
      const docLp = doc.nomor_lp || doc.no_lp || doc.meta_values?.nomor_lp || doc.meta_values?.NOMOR_LP || '';
      return Boolean(rawNo && docLp && isSameLpNumber(docLp, rawNo));
    });

    if (isPoliceReport || hasLinkedDocs) {
      const converted = convertDumasToCase(dItem);
      candidateCasesToSync.push(converted);
    }
  });

  // Cek juga apakah di antara dokumen (lokal maupun server) ada Nomor LP (seperti "LP A 2") yang belum punya induk perkara
  const allCombinedDocs = [...syncedDocsList, ...localDocs];
  allCombinedDocs.forEach((doc) => {
    if (!doc) return;
    const mv = (doc.meta_values && typeof doc.meta_values === 'object') ? doc.meta_values : {};
    const docLp = String(doc.nomor_lp || doc.no_lp || mv.nomor_lp || mv.NOMOR_LP || '').trim();
    if (!docLp || docLp === '-') return;

    const alreadyInServerOrCandidates =
      syncedCasesList.some((c) => isSameLpNumber(c.nomor_lp || c.no_lp, docLp) || isDocumentLinkedToCase(doc, c)) ||
      candidateCasesToSync.some((c) => isSameLpNumber(c.nomor_lp || c.no_lp, docLp) || isDocumentLinkedToCase(doc, c));

    if (!alreadyInServerOrCandidates) {
      const isLpA = /^LP[\s/._:-]*A\b/i.test(docLp);
      const caseId = String(doc.case_id || mv.original_case_id || `case-${normalizeLpNumber(docLp)}`);
      candidateCasesToSync.push({
        id: caseId,
        nomor_lp: docLp,
        no_lp: docLp,
        tanggal_lp: mv.TANGGAL_LP || mv.tanggal_lp || (doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        nama_pelapor: mv.NAMA_PELAPOR || mv.PELAPOR_NAMA || (isLpA ? 'Petugas Polri (LP Model A)' : 'Pelapor'),
        pelapor_name: mv.NAMA_PELAPOR || mv.PELAPOR_NAMA || (isLpA ? 'Petugas Polri (LP Model A)' : 'Pelapor'),
        nama_terlapor: mv.NAMA_TERSANGKA || mv.TERSANGKA_NAMA || mv.NAMA_TERLAPOR || mv.target_suspect_name || 'Dalam Penyidikan',
        terlapor_name: mv.NAMA_TERSANGKA || mv.TERSANGKA_NAMA || mv.NAMA_TERLAPOR || mv.target_suspect_name || 'Dalam Penyidikan',
        tindak_pidana: mv.TINDAK_PIDANA || mv.PERKARA || 'Tindak Pidana Umum',
        pasal_uu: mv.PASAL || mv.PASAL_UU || '-',
        pasal: mv.PASAL || mv.PASAL_UU || '-',
        locus: mv.TEMPAT_KEJADIAN || mv.LOCUS || 'Wilayah Hukum Polres Kolaka Timur',
        tempus: mv.WAKTU_KEJADIAN || mv.TEMPUS || '-',
        status: 'active',
        created_at: doc.created_at || new Date().toISOString()
      });
    }
  });

  // 1. Upsert setiap perkara kandidat yang belum ada di public.cases Supabase
  for (const candidate of candidateCasesToSync) {
    if (!candidate) continue;
    const candLp = candidate.nomor_lp || candidate.no_lp || '';
    const existsInServer = syncedCasesList.some(
      (srv) =>
        String(srv.id) === String(candidate.id) ||
        (candLp && isSameLpNumber(srv.nomor_lp || srv.no_lp, candLp))
    );

    if (!existsInServer) {
      const res = await upsertCaseToSupabaseSafe(candidate);
      if (res.success && res.data) {
        if (!res.alreadyExists) {
          syncedCasesCount++;
        }
        syncedCasesList.push(res.data);
      }
    }
  }

  // 2. Upsert setiap dokumen arsip lokal yang belum ada di public.documents Supabase
  for (const lDoc of localDocs) {
    if (!lDoc) continue;
    const existsInServer = syncedDocsList.some(
      (sDoc) =>
        (sDoc.id && lDoc.id && String(sDoc.id) === String(lDoc.id)) ||
        (sDoc.doc_number &&
          lDoc.doc_number &&
          sDoc.doc_number !== '-' &&
          String(sDoc.doc_number).trim() === String(lDoc.doc_number).trim() &&
          String(sDoc.template_code || '') === String(lDoc.template_code || ''))
    );

    if (!existsInServer) {
      // Cari induk perkara yang cocok agar case_id tertaut rapi
      const matchedParentCase = syncedCasesList.find((c) => isDocumentLinkedToCase(lDoc, c)) || null;
      const docToSync = matchedParentCase
        ? {
            ...lDoc,
            case_id: matchedParentCase.id,
            nomor_lp: lDoc.nomor_lp || matchedParentCase.nomor_lp || matchedParentCase.no_lp
          }
        : lDoc;

      const res = await upsertDocumentToSupabaseSafe(docToSync, matchedParentCase);
      if (res.success && res.data) {
        syncedDocsCount++;
        syncedDocsList.push(res.data);
      }
    }
  }

  return {
    syncedCasesCount,
    syncedDocsCount,
    totalSynced: syncedCasesCount + syncedDocsCount,
    scannedKeys,
    syncedCasesList,
    syncedDocsList
  };
}
