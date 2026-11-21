import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
import { supabase } from '../supabaseClient.js';
import { toCanonicalMindikCode, isValidOfficialDocNumber } from '../constants/mindikChainRegistry.js';

/**
 * Hitung umur otomatis dari tanggal lahir (ISO YYYY-MM-DD atau teks tanggal).
 */
export function calculateAgeFromDob(dobStr) {
  if (!dobStr) return '';
  let birthYear = null;
  let birthMonth = 0;
  let birthDay = 1;

  const str = String(dobStr).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    birthYear = parseInt(isoMatch[1], 10);
    birthMonth = parseInt(isoMatch[2], 10) - 1;
    birthDay = parseInt(isoMatch[3], 10);
  } else {
    const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      birthYear = parseInt(yearMatch[1], 10);
    }
  }

  if (!birthYear || isNaN(birthYear)) return '';
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  if (isoMatch) {
    const mDiff = now.getMonth() - birthMonth;
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < birthDay)) {
      age--;
    }
  }
  return age >= 0 && age < 130 ? String(age) : '';
}

/**
 * Format biodata subjek hukum (Pelapor, Saksi, Terlapor, Tersangka) menjadi blok teks KUHAP lengkap.
 */
export function formatSubjectBiodataBlock(subject = {}) {
  if (!subject || !subject.nama) return '';
  const namaStr = subject.alias ? `${subject.nama} Als. ${subject.alias}` : subject.nama;
  const rawDob = subject.tanggal_lahir || subject.tgl_lahir || '';
  const formattedDob = rawDob ? formatTanggalIndonesia(rawDob) : '';
  const ttlStr = (subject.tempat_lahir && formattedDob)
    ? `${subject.tempat_lahir}, ${formattedDob}`
    : (subject.ttl || subject.tempat_lahir || formattedDob || '-');
  const rawUmur = subject.umur || calculateAgeFromDob(rawDob) || '';
  const umurStr = rawUmur ? (String(rawUmur).toLowerCase().includes('tahun') ? String(rawUmur) : `${rawUmur} Tahun`) : '-';
  const jkStr = subject.jenis_kelamin || subject.jk || 'Laki-laki';
  const wargaStr = subject.kewarganegaraan || 'Indonesia';
  const agamaStr = subject.agama || '-';
  const kerjaStr = subject.pekerjaan || '-';
  const didikStr = subject.pendidikan || '-';
  const nikStr = subject.nik || '-';
  const alamatStr = subject.alamat || '-';
  const hpStr = subject.no_hp || subject.kontak || subject.phone || '';

  const lines = [
    `Nama             : ${namaStr}`,
    `NIK              : ${nikStr}`,
    `Tempat/Tgl Lahir : ${ttlStr}`,
    `Umur             : ${umurStr}`,
    `Jenis Kelamin    : ${jkStr}`,
    `Kewarganegaraan  : ${wargaStr}`,
    `Agama            : ${agamaStr}`,
    `Pekerjaan        : ${kerjaStr}`,
    `Pendidikan       : ${didikStr}`,
    `Alamat           : ${alamatStr}`
  ];
  if (hpStr) {
    lines.push(`No. HP / Kontak  : ${hpStr}`);
  }
  return lines.join('\n');
}

/**
 * Normalisasi 1 objek Subjek Hukum sesuai 13 field standar KUHAP.
 */
export function normalizeSubjectRecord(s = {}, idx = 0, roleLabel = 'Subjek') {
  if (!s) return null;
  const nama = (s.nama || s.name || '').trim();
  const alias = (s.alias || '').trim();
  const nik = (s.nik || s.no_identitas || '').trim();
  let tempat_lahir = (s.tempat_lahir || '').trim();
  let tanggal_lahir = (s.tanggal_lahir || s.tgl_lahir || '').trim();

  if (!tempat_lahir && !tanggal_lahir && s.ttl) {
    const parts = String(s.ttl).split(',');
    if (parts.length >= 2) {
      tempat_lahir = parts[0].trim();
      tanggal_lahir = parts.slice(1).join(',').trim();
    } else {
      tempat_lahir = String(s.ttl).trim();
    }
  }

  const formattedDob = tanggal_lahir ? formatTanggalIndonesia(tanggal_lahir) : '';
  const ttl = (tempat_lahir && formattedDob)
    ? `${tempat_lahir}, ${formattedDob}`
    : (s.ttl || tempat_lahir || formattedDob || '');
  const autoAge = calculateAgeFromDob(tanggal_lahir);
  const rawUmur = s.umur || autoAge || '';
  const umurClean = String(rawUmur).replace(/\s*tahun\s*/i, '').trim();
  const umurFormatted = umurClean ? `${umurClean} Tahun` : '';
  const jenis_kelamin = s.jenis_kelamin || s.jk || 'Laki-laki';
  const kewarganegaraan = s.kewarganegaraan || 'Indonesia';
  const agama = s.agama || 'Islam';
  const pekerjaan = s.pekerjaan || '';
  const pendidikan = s.pendidikan || '';
  const alamat = s.alamat || '';
  const no_hp = s.no_hp || s.kontak || s.phone || '';
  const nomor_sp_tap = s.nomor_sp_tap || s.no_sp_tap_tsk || s.no_sp_tap || '';
  const tanggal_sp_tap = s.tanggal_sp_tap || s.tgl_sp_tap_tsk || s.tgl_sp_tap || '';

  const normalized = {
    ...s,
    no: idx + 1,
    id: s.id || `${roleLabel.toLowerCase()}_${idx + 1}`,
    nama,
    alias,
    nama_lengkap: alias ? `${nama} Als. ${alias}` : nama,
    nik,
    tempat_lahir,
    tanggal_lahir,
    tgl_lahir: formattedDob || tanggal_lahir,
    ttl,
    umur: umurFormatted || umurClean,
    umur_angka: umurClean,
    jenis_kelamin,
    jk: jenis_kelamin,
    kewarganegaraan,
    agama,
    pekerjaan,
    pendidikan,
    alamat,
    no_hp,
    kontak: no_hp,
    nomor_sp_tap,
    tanggal_sp_tap: tanggal_sp_tap ? formatTanggalIndonesia(tanggal_sp_tap) : '',
    role_category: s.role_category || roleLabel
  };
  normalized.biodata_lengkap = formatSubjectBiodataBlock(normalized);
  return normalized;
}

/**
 * Helper untuk mengisi seluruh tag prefix Subjek Hukum (TERSANGKA_*, TERLAPOR_*, SAKSI_*, PELAPOR_*, SUBJEK_*)
 */
export function populateSubjectPrefixVariables(targetMap, prefix, subjectList = [], primarySubject = null) {
  const validList = (Array.isArray(subjectList) ? subjectList : [])
    .filter(item => item && item.nama)
    .map((item, i) => normalizeSubjectRecord(item, i, prefix));
  const primary = primarySubject && primarySubject.nama
    ? normalizeSubjectRecord(primarySubject, 0, prefix)
    : (validList[0] || null);

  const upper = prefix.toUpperCase();
  const lower = prefix.toLowerCase();

  // Loop Array (e.g. {#TERSANGKA}, {#TERLAPOR}, {#SAKSI}, {#PELAPOR})
  targetMap[upper] = validList;
  targetMap[lower] = validList;
  targetMap[`${upper}_LIST`] = validList;
  targetMap[`${lower}_list`] = validList;
  targetMap[`DAFTAR_${upper}`] = validList;
  targetMap[`daftar_${lower}`] = validList;

  // Biodata Lengkap Gabungan atau Tunggal
  const biodataBlock = validList.length > 1
    ? validList.map((item, i) => `${i + 1}. ${item.biodata_lengkap}`).join('\n\n')
    : (primary ? primary.biodata_lengkap : '');

  targetMap[`BIODATA_${upper}_LENGKAP`] = biodataBlock;
  targetMap[`biodata_${lower}_lengkap`] = biodataBlock;

  if (primary) {
    const fields = {
      NAMA: primary.nama,
      ALIAS: primary.alias,
      NAMA_ALIAS: primary.nama_lengkap,
      NIK: primary.nik,
      TEMPAT_LAHIR: primary.tempat_lahir,
      TANGGAL_LAHIR: primary.tgl_lahir,
      TGL_LAHIR: primary.tgl_lahir,
      TTL: primary.ttl,
      UMUR: primary.umur,
      JENIS_KELAMIN: primary.jenis_kelamin,
      JK: primary.jenis_kelamin,
      KEWARGANEGARAAN: primary.kewarganegaraan,
      AGAMA: primary.agama,
      PEKERJAAN: primary.pekerjaan,
      PENDIDIKAN: primary.pendidikan,
      ALAMAT: primary.alamat,
      NO_HP: primary.no_hp,
      KONTAK: primary.no_hp
    };

    Object.entries(fields).forEach(([fKey, fVal]) => {
      // Format PREFIX_FIELD (contoh: TERSANGKA_NAMA, SAKSI_NIK)
      targetMap[`${upper}_${fKey}`] = fVal || '';
      targetMap[`${lower}_${fKey.toLowerCase()}`] = fVal || '';
      // Format FIELD_PREFIX (contoh: NAMA_TERSANGKA, NIK_TERSANGKA)
      targetMap[`${fKey}_${upper}`] = fVal || '';
      targetMap[`${fKey.toLowerCase()}_${lower}`] = fVal || '';
    });
  }

  // Indexed slots 1..5 (e.g. SAKSI_1_NAMA, TERLAPOR_1_NAMA, PELAPOR_1_NAMA, TERSANGKA_1_NAMA)
  for (let i = 1; i <= 5; i++) {
    const item = validList[i - 1] || {};
    const slotFields = {
      NAMA: item.nama || '',
      ALIAS: item.alias || '',
      NIK: item.nik || '',
      TEMPAT_LAHIR: item.tempat_lahir || '',
      TANGGAL_LAHIR: item.tgl_lahir || '',
      TGL_LAHIR: item.tgl_lahir || '',
      TTL: item.ttl || '',
      UMUR: item.umur || '',
      JENIS_KELAMIN: item.jenis_kelamin || '',
      JK: item.jenis_kelamin || '',
      KEWARGANEGARAAN: item.kewarganegaraan || (item.nama ? 'Indonesia' : ''),
      AGAMA: item.agama || '',
      PEKERJAAN: item.pekerjaan || '',
      PENDIDIKAN: item.pendidikan || '',
      ALAMAT: item.alamat || '',
      NO_HP: item.no_hp || '',
      KONTAK: item.no_hp || ''
    };
    Object.entries(slotFields).forEach(([fKey, fVal]) => {
      targetMap[`${upper}_${i}_${fKey}`] = fVal;
      targetMap[`${lower}_${i}_${fKey.toLowerCase()}`] = fVal;
    });
  }
}

/**
 * Normalisasi kode template mindik secara tunggal melalui toCanonicalMindikCode
 * agar seragam dengan MINDIK_PRESETS & CHAIN_RULES.
 */
export function normalizeTemplateCode(rawCode = '', rawTitle = '') {
  return toCanonicalMindikCode(rawCode, rawTitle);
}

/**
 * Ekstraksi berlapis Nomor Surat & Tanggal Surat dari baris dokumen arsip
 * (memeriksa kolom utama tabel DAN objek/string JSON meta_values / metadata / form_values).
 */
export function extractArchivedDocNumberAndDate(doc = {}) {
  if (!doc || typeof doc !== 'object') return { docNo: '', rawDocDate: '', formattedDocDate: '' };

  const parseMetaObj = (m) => {
    if (!m) return {};
    if (typeof m === 'object') return m;
    if (typeof m === 'string') {
      try {
        return JSON.parse(m) || {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const mv = {
    ...parseMetaObj(doc.form_values),
    ...parseMetaObj(doc.metadata),
    ...parseMetaObj(doc.meta_values)
  };

  const candidateNos = [
    doc.doc_number,
    doc.nomor_surat,
    doc.document_number,
    doc.doc_no,
    doc.no_surat,
    mv.NOMOR_SURAT,
    mv.nomor_surat,
    mv.NO_SURAT,
    mv.no_surat,
    mv.DOC_NO,
    mv.doc_no,
    mv.NO_SPRIN_SIDIK,
    mv.NOMOR_SPRIN_SIDIK
  ];

  let docNo = '';
  for (const cand of candidateNos) {
    if (cand !== undefined && cand !== null) {
      const s = String(cand).trim();
      if (s !== '' && s !== '-' && s !== 'null' && s !== 'undefined') {
        docNo = s;
        break;
      }
    }
  }

  const candidateDates = [
    doc.tgl_surat,
    doc.tanggal_surat,
    doc.doc_date,
    doc.document_date,
    mv.TANGGAL_SURAT,
    mv.tanggal_surat,
    mv.TGL_SURAT,
    mv.tgl_surat,
    mv.DOC_DATE,
    mv.doc_date,
    doc.created_at
  ];

  let rawDocDate = '';
  for (const cand of candidateDates) {
    if (cand !== undefined && cand !== null) {
      const s = String(cand).trim();
      if (s !== '' && s !== '-' && s !== 'null' && s !== 'undefined') {
        rawDocDate = s;
        break;
      }
    }
  }

  const formattedDocDate = rawDocDate ? formatTanggalIndonesia(rawDocDate) : '';
  return { docNo, rawDocDate, formattedDocDate, metaObj: mv };
}

/**
 * Konversi tanggal apa pun (ISO YYYY-MM-DD, timestamp ISO, DD-MM-YYYY, Date,
 * atau teks Indonesia seperti "21 November 2026") menjadi string ISO 'YYYY-MM-DD'
 * untuk kontrol HTML <input type="date">. Mengembalikan '' bila placeholder/kosong.
 */
export function toIsoDateString(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (!str || str === '-' || /\.{3,}|\u2026/.test(str)) return '';

  // 1. ISO YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Teks Indonesia: "21 November 2026"
  const bulanIndo = [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ];
  const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const dNum = parseInt(textMatch[1], 10);
    const mIdx = bulanIndo.indexOf(textMatch[2].toLowerCase());
    const yNum = textMatch[3];
    if (mIdx >= 0 && dNum >= 1 && dNum <= 31) {
      return `${yNum}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Penggabungan aman (Safe Merge) antara chainedContext dan formValues.
 * Nilai dari formValues HANYA menimpa chainedContext jika benar-benar terisi
 * (bukan undefined, null, atau string kosong "").
 *
 * Opsi `formatDatesForDocx` (default false):
 * - false: menjaga tanggal tetap dalam format ISO YYYY-MM-DD untuk state UI form (<input type="date">).
 * - true: mengonversi tanggal ISO menjadi teks Indonesia ("21 November 2026") khusus payload .docx.
 */
export function mergeChainedWithForm(chainedContext = {}, formValues = {}, options = {}) {
  const { formatDatesForDocx = false } = options || {};
  const merged = { ...(chainedContext || {}) };

  Object.keys(formValues || {}).forEach((rawKey) => {
    const cleanKey = rawKey.replace(/[{}]/g, '').trim();
    if (!cleanKey) return;
    const value = formValues[rawKey];

    // HANYA timpa jika value benar-benar terisi (bukan string kosong, null, atau undefined)
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const strTrim = typeof value === 'string' ? value.trim() : value;
      const formattedVal = (formatDatesForDocx && typeof strTrim === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(strTrim))
        ? formatTanggalIndonesia(strTrim)
        : value;

      merged[cleanKey] = formattedVal;
      merged[cleanKey.toUpperCase()] = formattedVal;
      merged[cleanKey.toLowerCase()] = formattedVal;
    }
  });

  return merged;
}

/**
 * ============================================================================
 * UNIVERSAL CHAINED MINDIK ENGINE — SINGLE SOURCE OF TRUTH
 * ============================================================================
 * Membangun konteks global perkara + seluruh rantai dokumen mindik yang sudah
 * tersimpan di Arsip (baik kode mindik yang ada sekarang maupun template baru
 * di masa depan), pewarisan Tim Penyidik, Barang Bukti, dan 4 Kategori Subjek Hukum.
 *
 * @param {string|object} caseIdOrCase - ID perkara atau objek perkara
 * @param {object} activeFormValues - Nilai input manual pada Generator Mindik (prioritas tertinggi)
 * @param {object} options - Opsi tambahan (archivedDocs, suspectsList, personnelList, selectedSubjects, dll)
 */
export async function buildUniversalCaseContext(caseIdOrCase, activeFormValues = {}, options = {}) {
  let activeCase = typeof caseIdOrCase === 'object' && caseIdOrCase !== null
    ? { ...caseIdOrCase }
    : {};
  const caseId = typeof caseIdOrCase === 'string'
    ? caseIdOrCase
    : (activeCase.id || options.caseId || null);

  let arsipDocs = Array.isArray(options.archivedDocs) ? [...options.archivedDocs] : [];
  let dbSuspects = Array.isArray(options.suspectsList) ? [...options.suspectsList] : [];
  let dbEvidence = [];

  if (caseId) {
    try {
      const safeCaseIdStr = String(caseId).trim();
      const queries = [];
      // 1. Jika hanya diberikan caseId string, ambil data perkara dari tabel cases
      if (!activeCase.id) {
        queries.push(
          supabase.from('cases').select('*').eq('id', safeCaseIdStr).maybeSingle()
            .then(({ data }) => { if (data) activeCase = { ...data, ...activeCase }; })
        );
      }
      // 2. Ambil seluruh dokumen arsip perkara ini (dengan fallback perbandingan string case_id dan nomor_lp)
      if (arsipDocs.length === 0) {
        queries.push(
          supabase.from('documents').select('*').eq('case_id', safeCaseIdStr).order('created_at', { ascending: true })
            .then(async ({ data }) => {
              if (Array.isArray(data) && data.length > 0) {
                arsipDocs = data;
              } else {
                // Fallback jika case_id berbeda tipe atau tersimpan via nomor_lp
                const lpCandidate = activeCase.nomor_lp || activeCase.no_lp;
                if (lpCandidate) {
                  const { data: byLp } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('nomor_lp', lpCandidate)
                    .order('created_at', { ascending: true });
                  if (Array.isArray(byLp) && byLp.length > 0) {
                    arsipDocs = byLp;
                  }
                }
              }
            })
        );
      }
      // 3. Ambil daftar subjek di tabel case_suspects jika belum tersedia
      if (dbSuspects.length === 0) {
        queries.push(
          supabase.from('case_suspects').select('*').eq('case_id', safeCaseIdStr)
            .then(({ data }) => { if (Array.isArray(data)) dbSuspects = data; })
        );
      }
      await Promise.all(queries);

      // 3b. Fallback offline / localStorage cache jika arsipDocs masih kosong
      if (arsipDocs.length === 0 && typeof window !== 'undefined') {
        try {
          const localDocs = JSON.parse(localStorage.getItem('emindik_archive_documents') || '[]');
          const lpCand = activeCase.nomor_lp || activeCase.no_lp;
          arsipDocs = localDocs.filter(d =>
            d && (String(d.case_id) === safeCaseIdStr || (lpCand && (d.nomor_lp === lpCand || d.no_lp === lpCand)))
          );
        } catch {}
      }

      // 4. Ambil lampiran barang bukti dari Dumas jika perkara terhubung ke dumas_id bertipe UUID valid
      // (kolom laporan_id di public.lampiran_barang_bukti bertipe UUID — jangan kirim 'case-xxx')
      const dumasId = activeCase.dumas_id || activeCase.references?.dumas_id;
      const isValidUuid = typeof dumasId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dumasId.trim());
      if (isValidUuid && !Array.isArray(activeCase.lampiran_barang_bukti)) {
        const { data: evData, error: evError } = await supabase
          .from('lampiran_barang_bukti')
          .select('*')
          .eq('laporan_id', dumasId.trim());
        if (!evError && Array.isArray(evData)) {
          dbEvidence = evData;
        }
      }
    } catch (err) {
      console.warn('[buildUniversalCaseContext] Non-fatal query warning:', err);
    }
  }

  // Pastikan arsipDocs terurut deterministik berdasarkan created_at ascending (terlama -> terbaru)
  arsipDocs.sort((a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime());

  const context = {};
  const setBothCase = (key, val) => {
    if (val === undefined || val === null) return;
    context[key.toUpperCase()] = val;
    context[key.toLowerCase()] = val;
  };

  // ---------------------------------------------------------------------------
  // A. DATA INDUK PERKARA & DUMAS / LP
  // ---------------------------------------------------------------------------
  const nomorLp = activeCase.nomor_lp || activeCase.no_lp || '';
  const rawTglLp = activeCase.tanggal_lp || activeCase.tgl_lp || activeCase.sprin_date || '';
  const tanggalLp = formatTanggalIndonesia(rawTglLp);
  const tindakPidana = activeCase.tindak_pidana || '';
  const pasal = activeCase.pasal || '';
  const dasarPasalUu = activeCase.dasar_pasal_uu || activeCase.pasal_uu || pasal || '';
  const tempatKejadian = activeCase.locus || activeCase.tempat_kejadian || activeCase.tkp || '';
  const waktuKejadian = activeCase.tempus || activeCase.waktu_kejadian || '';
  const kronologi = activeCase.uraian_kejadian || activeCase.kronologi || activeCase.uraian_singkat || '';
  const uraianSingkat = activeCase.uraian_singkat || activeCase.uraian_kejadian || kronologi || '';
  const unitPenangan = activeCase.unit || activeCase.unit_penangan || 'Satreskrim Polres Kolaka Timur';
  const tempatSurat = activeCase.tempat_surat || 'Tirawuta';

  setBothCase('NOMOR_LP', nomorLp);
  setBothCase('NO_LP', nomorLp);
  setBothCase('TANGGAL_LP', tanggalLp);
  setBothCase('TGL_LP', tanggalLp);
  setBothCase('TINDAK_PIDANA', tindakPidana);
  setBothCase('PASAL', pasal);
  setBothCase('DASAR_PASAL_UU', dasarPasalUu);
  setBothCase('TEMPAT_KEJADIAN', tempatKejadian);
  setBothCase('LOCUS_DELICTI', tempatKejadian);
  setBothCase('TKP', tempatKejadian);
  setBothCase('WAKTU_KEJADIAN', waktuKejadian);
  setBothCase('TEMPUS_DELICTI', waktuKejadian);
  setBothCase('KRONOLOGI', kronologi);
  setBothCase('KRONOLOGIS', kronologi);
  setBothCase('URAIAN_KEJADIAN', kronologi);
  setBothCase('URAIAN_SINGKAT', uraianSingkat);
  setBothCase('URAIAN_PERKARA', uraianSingkat);
  setBothCase('UNIT_PENANGAN', unitPenangan);
  setBothCase('TEMPAT_SURAT', tempatSurat);

  // Pejabat Penandatangan / Atasan (Kasat Reskrim)
  const atasanNama = activeCase.kasat_nama || activeCase.atasan_nama || '';
  const atasanPangkat = toPangkatSingkat(activeCase.kasat_pangkat || activeCase.atasan_pangkat || '');
  const atasanNrp = activeCase.kasat_nrp || activeCase.atasan_nrp || '';
  const atasanJabatan = activeCase.kasat_jabatan || activeCase.atasan_jabatan || 'Kasat Reskrim';

  setBothCase('ATASAN_NAMA', atasanNama);
  setBothCase('ATASAN_PANGKAT', atasanPangkat);
  setBothCase('ATASAN_NRP', atasanNrp);
  setBothCase('ATASAN_JABATAN', atasanJabatan);
  setBothCase('ATASAN_PANGKAT_NRP', atasanPangkat && atasanNrp ? `${atasanPangkat} / ${atasanNrp}` : (atasanPangkat || atasanNrp));

  // ---------------------------------------------------------------------------
  // B. RESOLUSI RANTAI DOKUMEN OTOMATIS (DYNAMIC DOCUMENT CHAIN)
  // ---------------------------------------------------------------------------
  const daftarDasarSurat = [];
  if (nomorLp) {
    daftarDasarSurat.push({
      no: 1,
      huruf: 'a',
      kode: 'LP',
      judul: 'Laporan Polisi',
      nomor: nomorLp,
      tanggal: tanggalLp,
      dasar: `Laporan Polisi Nomor: ${nomorLp}${tanggalLp ? `, tanggal ${tanggalLp}` : ''}`,
      uraian: `Laporan Polisi Nomor: ${nomorLp}${tanggalLp ? `, tanggal ${tanggalLp}` : ''}`
    });
  }

  let archivedInvestigators = [];

  // Helper untuk memetakan SELURUH pola alias placeholder untuk suatu kelompok kode surat
  // KETENTUAN MUTLAK: Konteks rantai dilarang mengisi key generik surat aktif
  // (NOMOR_SURAT, NO_SURAT, DOC_NO, NOMOR_SURAT_HEADER) agar nomor surat arsip tidak bocor.
  const FORBIDDEN_GENERIC_ACTIVE_KEYS = new Set([
    'SURAT',
    'SURAT_HEADER',
    'DOC'
  ]);
  const assignDocumentAliases = (aliasCodes = [], docNo = '', docDateFormatted = '', dasarKalimat = '') => {
    aliasCodes.forEach((aliasCode) => {
      const code = String(aliasCode || '').toUpperCase().trim();
      if (!code || FORBIDDEN_GENERIC_ACTIVE_KEYS.has(code)) return;
      if (docNo) {
        setBothCase(`NOMOR_${code}`, docNo);
        setBothCase(`NO_${code}`, docNo);
        setBothCase(`${code}_NOMOR`, docNo);
        setBothCase(`${code}_NO`, docNo);
      }
      if (docDateFormatted) {
        setBothCase(`TANGGAL_${code}`, docDateFormatted);
        setBothCase(`TGL_${code}`, docDateFormatted);
        setBothCase(`${code}_TANGGAL`, docDateFormatted);
        setBothCase(`${code}_TGL`, docDateFormatted);
      }
      if (dasarKalimat) {
        setBothCase(`DASAR_${code}`, dasarKalimat);
      }
    });
  };

  // Resolusi deterministik per kode kanonik: dokumen sah terbaru (created_at terbesar)
  // selalu menang. Dokumen placeholder ('....') diabaikan bila sudah ada dokumen sah lain.
  const latestDocByCanonical = new Map();
  arsipDocs.forEach((doc) => {
    if (!doc) return;
    const rawOriginalCode = (doc.template_code || doc.code || doc.document_type || '')
      .toUpperCase()
      .trim()
      .replace(/[.\-\s/]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const docTitle = (doc.doc_title || doc.title || doc.document_name || rawOriginalCode || 'MINDIK').trim();
    const canonicalCode = toCanonicalMindikCode(rawOriginalCode, docTitle);
    if (!canonicalCode) return;

    const extracted = extractArchivedDocNumberAndDate(doc);
    const hasValidNo = isValidOfficialDocNumber(extracted.docNo);
    const prevEntry = latestDocByCanonical.get(canonicalCode);

    // Jika sudah ada dokumen bernomor sah dan kandidat saat ini hanya placeholder ('....'), jangan timpa
    if (prevEntry && prevEntry.hasValidNo && !hasValidNo) {
      return;
    }

    latestDocByCanonical.set(canonicalCode, {
      doc,
      rawOriginalCode,
      canonicalCode,
      docTitle,
      hasValidNo,
      ...extracted
    });
  });

  latestDocByCanonical.forEach((entry) => {
    const { rawOriginalCode, canonicalCode: rawCode, docTitle, docNo, rawDocDate, formattedDocDate: docDateFormatted, metaObj: mv } = entry;
    const dasarKalimat = docNo
      ? `${docTitle} Nomor: ${docNo}${docDateFormatted ? `, tanggal ${docDateFormatted}` : ''}`
      : docTitle;

    // 1. Pola Generik Universal untuk SETIAP template (saat ini & masa depan):
    // NOMOR_<KODE>, NO_<KODE>, <KODE>_NOMOR, <KODE>_NO, TANGGAL_<KODE>, TGL_<KODE>, <KODE>_TANGGAL, <KODE>_TGL, DASAR_<KODE>
    const baseCodesToMap = new Set([rawCode]);
    if (rawOriginalCode) baseCodesToMap.add(rawOriginalCode);
    assignDocumentAliases(Array.from(baseCodesToMap), docNo, docDateFormatted, dasarKalimat);

    // Tambahkan ke loop array {#DAFTAR_DASAR_SURAT} hanya bila nomor surat valid/sah
    if (docNo && entry.hasValidNo) {
      const nextIdx = daftarDasarSurat.length;
      const huruf = String.fromCharCode(97 + (nextIdx % 26));
      daftarDasarSurat.push({
        no: nextIdx + 1,
        huruf,
        kode: rawCode,
        judul: docTitle,
        nomor: docNo,
        tanggal: docDateFormatted,
        dasar: dasarKalimat,
        uraian: dasarKalimat
      });
    }

    // 2. Ekstrak Tim Penyidik dari meta_values SPRIN_SIDIK / SPRIN_LIDIK / SPGAS_SIDIK jika ada
    if ((rawCode.includes('SPRIN_SIDIK') || rawCode.includes('SPRIN_LIDIK') || rawCode.includes('GAS_SIDIK')) && mv) {
      const extracted = [];
      for (let i = 1; i <= 10; i++) {
        const pNama = mv[`PENYIDIK_${i}_NAMA`] || mv[`penyidik_${i}_nama`];
        if (pNama) {
          extracted.push({
            no: i,
            nama: pNama,
            pangkat: toPangkatSingkat(mv[`PENYIDIK_${i}_PANGKAT`] || mv[`penyidik_${i}_pangkat`] || ''),
            nrp: mv[`PENYIDIK_${i}_NRP`] || mv[`penyidik_${i}_nrp`] || '',
            jabatan: mv[`PENYIDIK_${i}_JABATAN`] || mv[`penyidik_${i}_jabatan`] || (i === 1 ? 'Kanit' : 'Penyidik Pembantu')
          });
        }
      }
      if (extracted.length > archivedInvestigators.length) {
        archivedInvestigators = extracted;
      }
    }

    // 3. Pemetaan Alias Standar Polri Lintas Tahap (membangkitkan semua sinonim versi kode)
    if (rawCode === 'SPRIN_LIDIK' || (rawCode.includes('LIDIK') && !rawCode.includes('GAS'))) {
      assignDocumentAliases(
        ['SPRIN_LIDIK', 'SP_LIDIK', 'SURAT_PERINTAH_PENYELIDIKAN'],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
    }
    if (rawCode === 'SPGAS_LIDIK' || rawCode.includes('GAS_LIDIK')) {
      assignDocumentAliases(
        ['SPGAS_LIDIK', 'SPRIN_GAS_LIDIK', 'SP_GAS_SIDIK', 'SP_GAS_LIDIK', 'SURAT_PERINTAH_TUGAS_PENYELIDIKAN'],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
    }
    if (rawCode === 'LI' || rawCode === 'LAPORAN_INFORMASI') {
      assignDocumentAliases(['LI', 'LAPORAN_INFORMASI'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'LHP' || rawCode.includes('HASIL_PENYELIDIKAN')) {
      assignDocumentAliases(['LHP', 'LAPORAN_HASIL_PENYELIDIKAN'], docNo, docDateFormatted, dasarKalimat);
    }

    // - Tahap Sidik: SPRIN_SIDIK & SPGAS_SIDIK (terbaru di arsip menang atas kolom lama di cases)
    if (rawCode === 'SPRIN_SIDIK' || rawCode === 'SPRIN_SIDIK_MORE_5') {
      assignDocumentAliases(
        ['SPRIN_SIDIK', 'SP_SIDIK', 'SURAT_PERINTAH_PENYIDIKAN', rawCode],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
      if (docNo && entry.hasValidNo) activeCase.no_sprin_sidik = docNo;
      if (rawDocDate) activeCase.tgl_sprin_sidik = rawDocDate;
    }
    if (rawCode === 'SPGAS_SIDIK' || rawCode === 'SPGAS_SIDIK_MORE_5') {
      assignDocumentAliases(
        ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'SPRIN_TUGAS_PENYIDIKAN', 'SURAT_PERINTAH_TUGAS_PENYIDIKAN', rawCode],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
      if (docNo && entry.hasValidNo) activeCase.no_sprin_gas_sidik = docNo;
      if (rawDocDate) activeCase.tgl_sprin_gas_sidik = rawDocDate;
    }

    // - Tahap SPDP & Penetapan Tersangka
    if (rawCode.startsWith('SPDP') || rawCode === 'PENGIRIMAN_KEMBALI_SPDP_P20') {
      assignDocumentAliases(
        [rawCode, 'SPDP', 'SPDP_TSK', 'SPDP_TERLAPOR', 'SURAT_PEMBERITAHUAN_DIMULAINYA_PENYIDIKAN'],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
      if (docNo && entry.hasValidNo) activeCase.no_spdp = docNo;
      if (rawDocDate) activeCase.tgl_spdp = rawDocDate;
    }
    if (rawCode === 'TAP_TSK') {
      assignDocumentAliases(
        ['TAP_TSK', 'SP_TAP_TSK', 'SP_TAP', 'S_TAP_TSK', 'PENETAPAN_TERSANGKA'],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
      if (docDateFormatted) setBothCase('TANGGAL_PENETAPAN', docDateFormatted);
    }
    if (rawCode === 'PEMBERITAHUAN_TAP_TSK' || rawCode === 'PEMBERITAHUAN_TAP_TSK_JPU') {
      assignDocumentAliases(
        rawCode === 'PEMBERITAHUAN_TAP_TSK'
          ? ['PEMBERITAHUAN_TAP_TSK', 'PEMBERITAHUAN_TAP_TSK_KE_TSK']
          : ['PEMBERITAHUAN_TAP_TSK_JPU', 'PEMBERITAHUAN_TAP_TSK_KE_JPU'],
        docNo,
        docDateFormatted,
        dasarKalimat
      );
    }

    // - Tahap Upaya Paksa & Panggilan
    if (rawCode.includes('PANGGIL') || rawCode.startsWith('SPGL')) {
      assignDocumentAliases([rawCode, 'PANGGILAN', 'SPGL', 'SURAT_PANGGILAN'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'SPRIN_KAP_DAN_BA' || (rawCode.includes('KAP') && !rawCode.includes('UNGKAP'))) {
      assignDocumentAliases([rawCode, 'SPRIN_KAP_DAN_BA', 'SP_KAP', 'SPRIN_KAP', 'BA_KAP', 'SURAT_PERINTAH_PENANGKAPAN'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'SPRIN_HAN_DAN_BA' || rawCode.includes('HAN')) {
      assignDocumentAliases([rawCode, 'SPRIN_HAN_DAN_BA', 'SP_HAN', 'SPRIN_HAN', 'BA_HAN', 'SURAT_PERINTAH_PENAHANAN'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode.includes('SITA')) {
      assignDocumentAliases([rawCode, 'SP_SITA', 'SPRIN_SITA', 'SPRIN_SITA_UMUM', 'SURAT_PERINTAH_PENYITAAN'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode.includes('GELEDAH')) {
      assignDocumentAliases([rawCode, 'SP_GELEDAH', 'SPRIN_GELEDAH', 'SURAT_PERINTAH_PENGGELEDAHAN'], docNo, docDateFormatted, dasarKalimat);
    }

    // - Berkas Perkara (Tahap 1, P-19, Tahap 2)
    if (rawCode === 'SAMPUL_BERKAS_PERKARA') {
      assignDocumentAliases(['SAMPUL_BERKAS_PERKARA', 'SAMPUL_BP', 'BERKAS_PERKARA'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'PENGANTAR_BP_TAHAP1') {
      assignDocumentAliases(['PENGANTAR_BP_TAHAP1', 'PENGANTAR_TAHAP_1', 'PENGANTAR_TAHAP1', 'PENGANTAR_BP_TAHAP_1'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'PENGANTAR_BP_KEMBALI_P19') {
      assignDocumentAliases(['PENGANTAR_BP_KEMBALI_P19', 'PENGANTAR_P19', 'PENGANTAR_KEMBALI_P19'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode === 'PENGANTAR_TAHAP2') {
      assignDocumentAliases(['PENGANTAR_TAHAP2', 'PENGANTAR_TAHAP_2', 'PENGANTAR_KIRIM_TSK_BB_TAHAP_2'], docNo, docDateFormatted, dasarKalimat);
    }

    // - Tahap Pemberkasan: SP2HP & RESUME
    if (rawCode.includes('SP2HP')) {
      assignDocumentAliases([rawCode, 'SP2HP'], docNo, docDateFormatted, dasarKalimat);
    }
    if (rawCode.includes('RESUME')) {
      assignDocumentAliases([rawCode, 'RESUME'], docNo, docDateFormatted, dasarKalimat);
    }
  });

  // Fallback rantai dari kolom langsung di activeCase / activeCase.references bila belum ada di tabel documents
  const fallbackSprinSidikNo = activeCase.no_sprin_sidik || activeCase.sprin_sidik || activeCase.references?.no_sprin_sidik || '';
  const fallbackSprinSidikTgl = formatTanggalIndonesia(activeCase.tgl_sprin_sidik || activeCase.references?.tgl_sprin_sidik || '');
  if (fallbackSprinSidikNo && isValidOfficialDocNumber(fallbackSprinSidikNo) && !isValidOfficialDocNumber(context.NOMOR_SPRIN_SIDIK)) {
    assignDocumentAliases(
      ['SPRIN_SIDIK', 'SP_SIDIK', 'SURAT_PERINTAH_PENYIDIKAN'],
      fallbackSprinSidikNo,
      fallbackSprinSidikTgl,
      `Surat Perintah Penyidikan Nomor: ${fallbackSprinSidikNo}${fallbackSprinSidikTgl ? `, tanggal ${fallbackSprinSidikTgl}` : ''}`
    );
  }

  const fallbackGasSidikNo = activeCase.no_sprin_gas_sidik || activeCase.no_sp_gas_sidik || activeCase.references?.no_spgas_sidik || activeCase.references?.no_sprin_gas_sidik || '';
  const fallbackGasSidikTgl = formatTanggalIndonesia(activeCase.tgl_sprin_gas_sidik || activeCase.tgl_sp_gas_sidik || activeCase.references?.tgl_sprin_gas_sidik || '');
  if (fallbackGasSidikNo && isValidOfficialDocNumber(fallbackGasSidikNo) && !isValidOfficialDocNumber(context.NOMOR_SPGAS_SIDIK)) {
    assignDocumentAliases(
      ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'SPRIN_TUGAS_PENYIDIKAN'],
      fallbackGasSidikNo,
      fallbackGasSidikTgl,
      `Surat Perintah Tugas Penyidikan Nomor: ${fallbackGasSidikNo}${fallbackGasSidikTgl ? `, tanggal ${fallbackGasSidikTgl}` : ''}`
    );
  }

  // Loop Array {#DAFTAR_DASAR_SURAT}
  context.DAFTAR_DASAR_SURAT = daftarDasarSurat;
  context.daftar_dasar_surat = daftarDasarSurat;

  // ---------------------------------------------------------------------------
  // C. PEWARISAN TIM PENYIDIK GLOBAL (PENYIDIK_1..10 & {#PENYIDIK})
  // ---------------------------------------------------------------------------
  const teamList = [];
  const rawInvList = Array.isArray(activeCase.investigators) && activeCase.investigators.length > 0
    ? activeCase.investigators
    : (Array.isArray(activeCase.references?.investigators) && activeCase.references.investigators.length > 0
        ? activeCase.references.investigators
        : archivedInvestigators);

  for (let i = 1; i <= 10; i++) {
    const fromCasePropNama = activeCase[`penyidik_${i}_nama`];
    const fromArr = rawInvList[i - 1] || {};
    const pNama = (fromCasePropNama || fromArr.nama || '').trim();
    const pPangkatRaw = activeCase[`penyidik_${i}_pangkat`] || fromArr.pangkat || '';
    const pPangkat = toPangkatSingkat(pPangkatRaw);
    const pNrp = (activeCase[`penyidik_${i}_nrp`] || fromArr.nrp || '').trim();
    const pJabatan = (activeCase[`penyidik_${i}_jabatan`] || fromArr.jabatan || (pNama ? (i === 1 ? 'Kanit' : 'Penyidik Pembantu') : '')).trim();
    const pPangkatNrp = pPangkat && pNrp ? `${pPangkat} / ${pNrp}` : (pPangkat || pNrp || '');

    setBothCase(`PENYIDIK_${i}_NAMA`, pNama);
    setBothCase(`PENYIDIK_${i}_PANGKAT`, pPangkat);
    setBothCase(`PENYIDIK_${i}_NRP`, pNrp);
    setBothCase(`PENYIDIK_${i}_JABATAN`, pJabatan);
    setBothCase(`PENYIDIK_${i}_PANGKAT_NRP`, pPangkatNrp);

    if (pNama) {
      teamList.push({
        no: teamList.length + 1,
        nama: pNama,
        pangkat: pPangkat,
        pangkat_singkat: pPangkat,
        pangkat_lengkap: toPangkatLengkap(pPangkatRaw),
        nrp: pNrp,
        jabatan: pJabatan,
        pangkat_nrp: pPangkatNrp
      });
    }
  }

  context.PENYIDIK = teamList;
  context.penyidik = teamList;
  context.TIM_PENYIDIK = teamList;
  context.tim_penyidik = teamList;
  context.PENYIDIK_LIST = teamList;
  context.penyidik_list = teamList;

  // ---------------------------------------------------------------------------
  // D. PEWARISAN DAFTAR BARANG BUKTI ({DAFTAR_BARANG_BUKTI} & {#BARANG_BUKTI})
  // ---------------------------------------------------------------------------
  const rawEvidenceSources = [
    ...(Array.isArray(activeCase.lampiran_barang_bukti) ? activeCase.lampiran_barang_bukti : []),
    ...(Array.isArray(activeCase.barang_bukti) ? activeCase.barang_bukti : []),
    ...(Array.isArray(activeCase.references?.barang_bukti) ? activeCase.references.barang_bukti : []),
    ...dbEvidence
  ];

  const seenEv = new Set();
  const barangBuktiArray = [];
  rawEvidenceSources.forEach((ev) => {
    if (!ev) return;
    const namaBb = typeof ev === 'string'
      ? ev.trim()
      : (ev.nama_barang || ev.nama || ev.uraian || ev.jenis_barang || ev.file_name || '').trim();
    if (!namaBb) return;
    const jumlahBb = typeof ev === 'object' ? (ev.jumlah || ev.kuantitas || '1 (satu) buah') : '';
    const ketBb = typeof ev === 'object' ? (ev.keterangan || ev.deskripsi || '') : '';
    const key = `${namaBb.toLowerCase()}|${jumlahBb}`;
    if (seenEv.has(key)) return;
    seenEv.add(key);

    const no = barangBuktiArray.length + 1;
    const uraianLengkap = jumlahBb && !namaBb.toLowerCase().includes(String(jumlahBb).toLowerCase())
      ? `${jumlahBb} ${namaBb}${ketBb ? ` (${ketBb})` : ''}`
      : `${namaBb}${ketBb ? ` (${ketBb})` : ''}`;
    barangBuktiArray.push({
      no,
      nama: namaBb,
      nama_barang: namaBb,
      jumlah: jumlahBb || '1',
      keterangan: ketBb,
      uraian: uraianLengkap
    });
  });

  const daftarBarangBuktiStr = barangBuktiArray.length > 0
    ? barangBuktiArray.map((b) => `${b.no}. ${b.uraian}`).join('\n')
    : (typeof activeCase.barang_bukti === 'string' ? activeCase.barang_bukti : '');

  setBothCase('DAFTAR_BARANG_BUKTI', daftarBarangBuktiStr);
  context.BARANG_BUKTI = barangBuktiArray;
  context.barang_bukti = barangBuktiArray;
  context.BARANG_BUKTI_LIST = barangBuktiArray;
  context.barang_bukti_list = barangBuktiArray;

  // ---------------------------------------------------------------------------
  // E. 4 KATEGORI SUBJEK HUKUM TERPADU (PELAPOR, SAKSI, TERLAPOR, TERSANGKA)
  // ---------------------------------------------------------------------------
  const refs = activeCase.references || {};

  // 1. Pelapor / Korban
  const rawPelaporList = [
    ...(Array.isArray(activeCase.pelapor_list) ? activeCase.pelapor_list : []),
    ...(Array.isArray(refs.pelapor_list) ? refs.pelapor_list : []),
    ...(Array.isArray(activeCase.victims) ? activeCase.victims : []),
    ...(Array.isArray(refs.victims) ? refs.victims : [])
  ];
  if (rawPelaporList.length === 0 && (activeCase.nama_pelapor || activeCase.pelapor_name)) {
    rawPelaporList.push({
      nama: activeCase.nama_pelapor || activeCase.pelapor_name,
      nik: activeCase.pelapor_nik || refs.pelapor_nik || '',
      tempat_lahir: activeCase.pelapor_tempat_lahir || refs.pelapor_tempat_lahir || '',
      tanggal_lahir: activeCase.pelapor_tanggal_lahir || refs.pelapor_tanggal_lahir || '',
      ttl: activeCase.pelapor_ttl || refs.pelapor_ttl || '',
      umur: activeCase.pelapor_umur || refs.pelapor_umur || '',
      jenis_kelamin: activeCase.pelapor_jk || refs.pelapor_jk || 'Laki-laki',
      pekerjaan: activeCase.pelapor_pekerjaan || refs.pelapor_pekerjaan || '',
      agama: activeCase.pelapor_agama || refs.pelapor_agama || 'Islam',
      alamat: activeCase.pelapor_alamat || refs.pelapor_alamat || '',
      no_hp: activeCase.pelapor_kontak || refs.pelapor_kontak || ''
    });
  }

  // 2. Saksi-Saksi
  const rawSaksiList = [
    ...(Array.isArray(activeCase.saksi_list) ? activeCase.saksi_list : []),
    ...(Array.isArray(refs.saksi_list) ? refs.saksi_list : []),
    ...(Array.isArray(activeCase.saksi) ? activeCase.saksi : []),
    ...(Array.isArray(refs.saksi) ? refs.saksi : []),
    ...dbSuspects.filter(s => s && s.status === 'saksi')
  ];

  // 3. Terlapor / Calon Tersangka
  const rawTerlaporList = [
    ...dbSuspects.filter(s => s && s.status === 'terlapor'),
    ...(Array.isArray(activeCase.terlapor_list) ? activeCase.terlapor_list : []),
    ...(Array.isArray(refs.terlapor_list) ? refs.terlapor_list : [])
  ];
  if (rawTerlaporList.length === 0 && (activeCase.nama_terlapor || activeCase.terlapor)) {
    rawTerlaporList.push({
      nama: activeCase.nama_terlapor || activeCase.terlapor,
      status: 'terlapor'
    });
  }

  // 4. Tersangka
  const rawTersangkaList = [
    ...dbSuspects.filter(s => s && (s.status === 'tersangka' || !s.status)),
    ...(Array.isArray(activeCase.tersangka_list) ? activeCase.tersangka_list : []),
    ...(Array.isArray(refs.tersangka_list) ? refs.tersangka_list : [])
  ];

  const dedupeSubjects = (arr) => {
    const seen = new Set();
    return arr.filter((item) => {
      if (!item || !item.nama) return false;
      const k = `${String(item.nama).trim().toLowerCase()}|${String(item.nik || '').trim()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const pelaporClean = dedupeSubjects(rawPelaporList);
  const saksiClean = dedupeSubjects(rawSaksiList);
  const terlaporClean = dedupeSubjects(rawTerlaporList);
  const tersangkaClean = dedupeSubjects(rawTersangkaList);

  populateSubjectPrefixVariables(context, 'PELAPOR', pelaporClean);
  populateSubjectPrefixVariables(context, 'KORBAN', pelaporClean);
  populateSubjectPrefixVariables(context, 'SAKSI', saksiClean);
  populateSubjectPrefixVariables(context, 'TERLAPOR', terlaporClean);
  populateSubjectPrefixVariables(context, 'TERSANGKA', tersangkaClean);

  // Target Subjek Universal (Jika dipilih dari Pemilih Subjek di Generator Mindik)
  const targetSubjects = Array.isArray(options.selectedSubjects) && options.selectedSubjects.length > 0
    ? options.selectedSubjects
    : (options.activeSubject ? [options.activeSubject] : []);
  if (targetSubjects.length > 0) {
    populateSubjectPrefixVariables(context, 'SUBJEK', targetSubjects);
  } else {
    const defaultSubjek = tersangkaClean.length > 0
      ? tersangkaClean
      : (terlaporClean.length > 0 ? terlaporClean : (saksiClean.length > 0 ? saksiClean : pelaporClean));
    populateSubjectPrefixVariables(context, 'SUBJEK', defaultSubjek);
  }

  // ---------------------------------------------------------------------------
  // F. PRIORITAS INPUT MANUAL (activeFormValues SELALU MENANG ATAS DEFAULT ARSIP)
  //    Menggunakan mergeChainedWithForm agar string kosong ("") tidak menimpa rantai arsip
  // ---------------------------------------------------------------------------
  // Pastikan context rantai murni TIDAK PERNAH membawa key generik surat aktif
  // (baik nomor maupun tanggal surat aktif) agar tidak membocorkan tanggal hari ini atau arsip lama.
  [
    'NOMOR_SURAT', 'nomor_surat',
    'NO_SURAT', 'no_surat',
    'DOC_NO', 'doc_no',
    'NOMOR_SURAT_HEADER', 'nomor_surat_header',
    'TANGGAL_SURAT', 'tanggal_surat',
    'TANGGAL_SURAT_HEADER', 'tanggal_surat_header',
    'DOC_DATE', 'doc_date',
    'TGL_SURAT', 'tgl_surat',
    'TANGGAL_NASKAH', 'tanggal_naskah',
    'TANGGAL_DOKUMEN', 'tanggal_dokumen',
    'HARI_SURAT', 'hari_surat',
    'BULAN_SURAT', 'bulan_surat',
    'TAHUN_SURAT', 'tahun_surat'
  ].forEach((gKey) => {
    delete context[gKey];
  });

  const mergedContext = mergeChainedWithForm(context, activeFormValues, {
    formatDatesForDocx: !options.forFormUi
  });

  // Debug log wajib untuk verifikasi di Console browser
  const resolvedKeys = Object.keys(mergedContext).filter((k) => {
    const u = k.toUpperCase();
    return (
      u.startsWith('NOMOR_') ||
      u.startsWith('NO_') ||
      u.startsWith('TANGGAL_') ||
      u.startsWith('TGL_') ||
      u.startsWith('DASAR_') ||
      u.endsWith('_NOMOR') ||
      u.endsWith('_NO') ||
      u.endsWith('_TANGGAL') ||
      u.endsWith('_TGL')
    ) && mergedContext[k] !== '' && mergedContext[k] !== '-';
  });
  console.log('[CHAINED-MINDIK-DEBUG]', {
    caseId,
    foundArchivesCount: arsipDocs.length,
    resolvedKeys
  });

  // Lampirkan metadata non-enumerable untuk inspeksi UI bila diperlukan
  Object.defineProperty(mergedContext, '_meta', {
    value: {
      activeCase,
      arsipDocs,
      daftarDasarSurat,
      teamList,
      barangBuktiArray,
      subjects: {
        pelapor: pelaporClean.map((s, i) => normalizeSubjectRecord(s, i, 'Pelapor')),
        saksi: saksiClean.map((s, i) => normalizeSubjectRecord(s, i, 'Saksi')),
        terlapor: terlaporClean.map((s, i) => normalizeSubjectRecord(s, i, 'Terlapor')),
        tersangka: tersangkaClean.map((s, i) => normalizeSubjectRecord(s, i, 'Tersangka'))
      }
    },
    enumerable: false
  });

  return mergedContext;
}

/**
 * Alias resmi resolveChainedMindikContext untuk buildUniversalCaseContext
 */
export const resolveChainedMindikContext = buildUniversalCaseContext;

async function syncDataFromArchive(currentCase, suspectsList, formValues = {}) {
  if (!currentCase || !currentCase.id) return;
  try {
    const safeCaseIdStr = String(currentCase.id).trim();
    const { data: arsip } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', safeCaseIdStr)
      .order('created_at', { ascending: true });
    if (!arsip || arsip.length === 0) return;

    // 1. INJEKSI PAKSA SPRIN SIDIK
    const sprinSidik = arsip.find(d =>
      normalizeTemplateCode(d.template_code || d.code, d.doc_title || d.title) === 'SPRIN_SIDIK'
    );
    if (sprinSidik) {
      const { docNo: no, rawDocDate: tgl, formattedDocDate: tglFormatted } = extractArchivedDocNumberAndDate(sprinSidik);
      if (no) {
        formValues.NO_SPRIN_SIDIK = (formValues.NO_SPRIN_SIDIK && String(formValues.NO_SPRIN_SIDIK).trim()) || no;
        formValues.NOMOR_SPRIN_SIDIK = (formValues.NOMOR_SPRIN_SIDIK && String(formValues.NOMOR_SPRIN_SIDIK).trim()) || no;
        formValues.NO_SP_SIDIK = (formValues.NO_SP_SIDIK && String(formValues.NO_SP_SIDIK).trim()) || no;
        formValues.NOMOR_SP_SIDIK = (formValues.NOMOR_SP_SIDIK && String(formValues.NOMOR_SP_SIDIK).trim()) || no;
        currentCase.no_sprin_sidik = no;
      }
      if (tgl || tglFormatted) {
        formValues.TGL_SPRIN_SIDIK = (formValues.TGL_SPRIN_SIDIK && String(formValues.TGL_SPRIN_SIDIK).trim()) || tglFormatted || tgl;
        formValues.TANGGAL_SPRIN_SIDIK = (formValues.TANGGAL_SPRIN_SIDIK && String(formValues.TANGGAL_SPRIN_SIDIK).trim()) || tglFormatted || tgl;
        formValues.TGL_SP_SIDIK = (formValues.TGL_SP_SIDIK && String(formValues.TGL_SP_SIDIK).trim()) || tglFormatted || tgl;
        formValues.TANGGAL_SP_SIDIK = (formValues.TANGGAL_SP_SIDIK && String(formValues.TANGGAL_SP_SIDIK).trim()) || tglFormatted || tgl;
        currentCase.tgl_sprin_sidik = tgl;
      }
    }

    // 2. INJEKSI PAKSA SPRIN GAS SIDIK
    const gasSidik = arsip.find(d =>
      normalizeTemplateCode(d.template_code || d.code, d.doc_title || d.title) === 'SPGAS_SIDIK'
    );
    if (gasSidik) {
      const { docNo: no, rawDocDate: tgl, formattedDocDate: tglFormatted } = extractArchivedDocNumberAndDate(gasSidik);
      if (no) {
        formValues.NO_SPRIN_GAS_SIDIK = (formValues.NO_SPRIN_GAS_SIDIK && String(formValues.NO_SPRIN_GAS_SIDIK).trim()) || no;
        formValues.NOMOR_SPGAS_SIDIK = (formValues.NOMOR_SPGAS_SIDIK && String(formValues.NOMOR_SPGAS_SIDIK).trim()) || no;
        formValues.NO_SPGAS_SIDIK = (formValues.NO_SPGAS_SIDIK && String(formValues.NO_SPGAS_SIDIK).trim()) || no;
        currentCase.no_sprin_gas_sidik = no;
      }
      if (tgl || tglFormatted) {
        formValues.TGL_SPRIN_GAS_SIDIK = (formValues.TGL_SPRIN_GAS_SIDIK && String(formValues.TGL_SPRIN_GAS_SIDIK).trim()) || tglFormatted || tgl;
        formValues.TANGGAL_SPGAS_SIDIK = (formValues.TANGGAL_SPGAS_SIDIK && String(formValues.TANGGAL_SPGAS_SIDIK).trim()) || tglFormatted || tgl;
        currentCase.tgl_sprin_gas_sidik = tgl;
      }
    }

    // 3. DEEP SCAN UNTUK S.TAP TERSANGKA
    if (Array.isArray(suspectsList)) {
      const semuaTap = arsip.filter(d =>
        toCanonicalMindikCode(d.template_code || d.code, d.doc_title || d.title) === 'TAP_TSK'
      );

      suspectsList.forEach(s => {
        if (!s || !s.nama) return;
        const tap = semuaTap.find(d => {
          const metaStr = JSON.stringify(d.meta_values || d.metadata || {}).toLowerCase();
          const titleStr = (d.doc_title || '').toLowerCase();
          return metaStr.includes(s.nama.toLowerCase()) || titleStr.includes(s.nama.toLowerCase());
        }) || semuaTap[0];

        if (tap) {
          const { docNo: no, rawDocDate: tgl } = extractArchivedDocNumberAndDate(tap);
          s.nomor_sp_tap = no || s.nomor_sp_tap;
          s.tanggal_sp_tap = tgl || s.tanggal_sp_tap;
        }
      });
    }
  } catch (e) {
    console.error('Universal Tracker Error:', e);
  }
}

// In-memory cache biner template untuk download instan (0 ms)
const templateArrayBufferCache = new Map();

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

export const NAMA_HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Helper Terbilang Angka / Tahun (Pure Function)
 */
export function terbilangAngka(n) {
  const angka = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  n = Math.floor(n);
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'nol';
  if (n < 12) return angka[n];
  if (n < 20) return terbilangAngka(n - 10) + ' belas';
  if (n < 100) return terbilangAngka(Math.floor(n / 10)) + ' puluh' + (n % 10 !== 0 ? ' ' + angka[n % 10] : '');
  if (n < 200) return 'seratus' + (n - 100 !== 0 ? ' ' + terbilangAngka(n - 100) : '');
  if (n < 1000) return terbilangAngka(Math.floor(n / 100)) + ' ratus' + (n % 100 !== 0 ? ' ' + terbilangAngka(n % 100) : '');
  if (n < 2000) return 'seribu' + (n - 1000 !== 0 ? ' ' + terbilangAngka(n - 1000) : '');
  if (n < 1000000) return terbilangAngka(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + terbilangAngka(n % 1000) : '');
  return n.toString();
}

export const terbilang = terbilangAngka;

/**
 * Mengonversi angka tahun (contoh: 2024 -> "dua ribu dua puluh empat", 2026 -> "dua ribu dua puluh enam").
 */
export function terbilangTahun(tahunInput) {
  if (!tahunInput) return '';
  const num = parseInt(String(tahunInput).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return terbilangAngka(num).toLowerCase().trim();
}

/**
 * Ekstraksi nama hari bahasa Indonesia (Senin s.d. Minggu).
 */
export function getNamaHariIndonesia(dateInput) {
  if (!dateInput) return '';
  const parts = parseDateParts(dateInput);
  return parts.hari || '';
}

/**
 * Parser bagian tanggal (Hari, Angka Tanggal, Bulan Indo, Tahun 4 Digit, Terbilang Tahun).
 * Menerima format ISO YYYY-MM-DD, teks "DD Bulan YYYY", atau Date object.
 */
export function parseDateParts(dateInput) {
  if (!dateInput) {
    return { hari: '', tanggal: '', bulan: '', tahun: '', terbilangTahun: '', tanggalLengkap: '' };
  }

  let d = null;
  let year = '';
  let monthIndex = -1;
  let day = '';

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    d = dateInput;
    year = String(d.getFullYear());
    monthIndex = d.getMonth();
    day = String(d.getDate());
  } else if (typeof dateInput === 'string') {
    const str = dateInput.trim();
    // 1. Format ISO YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      year = isoMatch[1];
      monthIndex = parseInt(isoMatch[2], 10) - 1;
      day = String(parseInt(isoMatch[3], 10));
      d = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
    } else {
      // 2. Format Teks DD Bulan YYYY (misal '12 September 2026')
      const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
      if (textMatch) {
        day = String(parseInt(textMatch[1], 10));
        const monthName = textMatch[2].toLowerCase();
        monthIndex = NAMA_BULAN_INDONESIA.findIndex(b => b.toLowerCase() === monthName);
        year = textMatch[3];
        if (monthIndex >= 0) {
          d = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
        }
      } else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          d = parsed;
          year = String(d.getFullYear());
          monthIndex = d.getMonth();
          day = String(d.getDate());
        }
      }
    }
  }

  if (!d || isNaN(d.getTime()) || monthIndex < 0 || monthIndex > 11) {
    return {
      hari: '',
      tanggal: day || '',
      bulan: (monthIndex >= 0 && monthIndex <= 11) ? NAMA_BULAN_INDONESIA[monthIndex] : '',
      tahun: year || '',
      terbilangTahun: year ? terbilangTahun(year) : '',
      tanggalLengkap: dateInput
    };
  }

  const hari = NAMA_HARI_INDONESIA[d.getDay()];
  const bulan = NAMA_BULAN_INDONESIA[monthIndex];
  const terbilangThn = terbilangTahun(year);

  return {
    hari,
    tanggal: day,
    bulan,
    tahun: year,
    terbilangTahun: terbilangThn,
    tanggalLengkap: `${day} ${bulan} ${year}`
  };
}

/**
 * Kalkulasi otomatis tanggal berakhir masa penahanan (KUHAP: 20 hari).
 * Menambahkan durasiHari - 1 (19 hari) dari tanggal mulai karena hari pertama dihitung mulai.
 * Mengembalikan format ISO YYYY-MM-DD untuk integrasi date picker.
 */
export function hitungTanggalAkhirPenahanan(tanggalMulaiStr, durasiHari = 20) {
  if (!tanggalMulaiStr) return '';
  let y, m, d;
  const isoMatch = String(tanggalMulaiStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    y = parseInt(isoMatch[1], 10);
    m = parseInt(isoMatch[2], 10) - 1;
    d = parseInt(isoMatch[3], 10);
  } else {
    const dt = new Date(tanggalMulaiStr);
    if (isNaN(dt.getTime())) return '';
    y = dt.getFullYear();
    m = dt.getMonth();
    d = dt.getDate();
  }
  
  const startDate = new Date(y, m, d);
  const daysToAdd = Math.max(1, durasiHari) - 1;
  startDate.setDate(startDate.getDate() + daysToAdd);

  const endYear = startDate.getFullYear();
  const endMonth = String(startDate.getMonth() + 1).padStart(2, '0');
  const endDay = String(startDate.getDate()).padStart(2, '0');
  return `${endYear}-${endMonth}-${endDay}`;
}

/**
 * Normalisasi format string jam/waktu naskah dinas.
 */
export function formatWaktuJam(timeInput) {
  if (!timeInput) return '';
  const str = String(timeInput).trim();
  // Tangani format ISO datetime misal 2026-09-12T14:30:00
  if (/^\d{4}-\d{2}-\d{2}T/i.test(str)) {
    const timePart = str.split(/T/i)[1]?.split('.')[0] || '';
    if (timePart) {
      return timePart.substring(0, 5).replace(':', '.');
    }
  }
  return str;
}


/**
 * Helper untuk meringkas dan mengkapitalkan nomor surat di header halaman ke-2 dst.
 * Format naskah dinas kepolisian: memotong string sebelum '/Polres' atau '/POLRES' jika ditemukan,
 * dan mengembalikan huruf kapital seluruhnya (contoh: 'SP.GAS/10/IX/RES.1.24/2026/SATRESKRIM').
 * Fallback Safety: Jika tidak ada '/Polres', mengembalikan nomor surat utuh dalam format huruf kapital (.toUpperCase()).
 * Jika string kosong/null/undefined, kembalikan string kosong ''.
 */
export const formatNomorSuratHeader = (nomorLengkap) => {
  if (!nomorLengkap) return '';
  const ringkas = String(nomorLengkap).split(/\/polres/i)[0].trim();
  return ringkas.toUpperCase();
};

/**
 * Helper untuk memastikan teks tanggal pada header menjadi kapital seluruhnya (contoh: '11 SEPTEMBER 2026').
 * Jika string kosong/null/undefined, kembalikan string kosong ''.
 */
export const formatTanggalSuratHeader = (teksTanggal) => {
  if (!teksTanggal) return '';
  return String(teksTanggal).toUpperCase();
};

/**
 * Kamus Pangkat Lengkap Polri:
 * Digunakan untuk ekspansi singkatan pangkat menjadi nama pangkat resmi tanpa singkatan
 * pada kolom tanda tangan Atasan (Kasat Reskrim) dan bukti penyerahan surat (Penyidik Penangan).
 */
export const MAP_PANGKAT_LENGKAP = {
  // Perwira Tinggi (Pati)
  'JENDERAL POLISI': 'JENDERAL POLISI',
  'JENDERAL': 'JENDERAL POLISI',
  'KOMJEN POL': 'KOMISARIS JENDERAL POLISI',
  'KOMJEN': 'KOMISARIS JENDERAL POLISI',
  'IRJEN POL': 'INSPEKTUR JENDERAL POLISI',
  'IRJEN': 'INSPEKTUR JENDERAL POLISI',
  'BRIGJEN POL': 'BRIGADIR JENDERAL POLISI',
  'BRIGJEN': 'BRIGADIR JENDERAL POLISI',

  // Perwira Menengah (Pamen)
  'KOMBES POL': 'KOMISARIS BESAR POLISI',
  'KOMBES': 'KOMISARIS BESAR POLISI',
  'AKBP': 'AJUN KOMISARIS BESAR POLISI',
  'KOMPOL': 'KOMISARIS POLISI',

  // Perwira Pertama (Pama)
  'AKP': 'AJUN KOMISARIS POLISI',
  'IPTU': 'INSPEKTUR POLISI SATU',
  'IPDA': 'INSPEKTUR POLISI DUA',

  // Bintara Tinggi & Bintara
  'AIPTU': 'AJUN INSPEKTUR POLISI SATU',
  'AIPDA': 'AJUN INSPEKTUR POLISI DUA',
  'BRIPKA': 'BRIGADIR POLISI KEPALA',
  'BRIGADIR': 'BRIGADIR POLISI',
  'BRIGPOL': 'BRIGADIR POLISI',
  'BRIPTU': 'BRIGADIR POLISI SATU',
  'BRIPDA': 'BRIGADIR POLISI DUA',

  // Tamtama
  'ABRIP': 'AJUN BRIGADIR POLISI',
  'ABRIPDA': 'AJUN BRIGADIR POLISI DUA',
  'ABRIPTU': 'AJUN BRIGADIR POLISI SATU',
  'BHARAKA': 'BHAYANGKARA KEPALA',
  'BHARATU': 'BHAYANGKARA SATU',
  'BHARADA': 'BHAYANGKARA DUA'
};

/**
 * Helper konversi singkatan pangkat Polri ke format teks pangkat lengkap/resmi.
 * Menangani variasi tanda baca (titik) atau sinonim umum Polri.
 */
export const formatPangkatLengkap = (pangkat) => {
  if (!pangkat) return '';
  let str = String(pangkat).trim().toUpperCase();
  // Hilangkan tanda baca titik (contoh: "A.K.P." -> "AKP", "IPDA." -> "IPDA")
  let cleanKey = str.replace(/\./g, '').trim();

  // 1. Pencocokan langsung dengan kamus pangkat resmi
  if (MAP_PANGKAT_LENGKAP[cleanKey]) {
    return MAP_PANGKAT_LENGKAP[cleanKey];
  }

  // 2. Jika sudah berformat nama lengkap resmi
  const allFullValues = Object.values(MAP_PANGKAT_LENGKAP);
  if (allFullValues.includes(str) || allFullValues.includes(cleanKey)) {
    return str;
  }

  // 3. Pencocokan jika terdapat kata tambahan atau awalan singkatan (misal: "IPDA POL", "AKP RESKRIM")
  for (const [abbr, full] of Object.entries(MAP_PANGKAT_LENGKAP)) {
    if (cleanKey.startsWith(abbr + ' ') || cleanKey.startsWith(abbr + '/')) {
      return full;
    }
  }

  return cleanKey || str;
};

/**
 * Alias helper resmi toPangkatLengkap sesuai naskah dinas
 */
export const toPangkatLengkap = formatPangkatLengkap;

/**
 * Helper konversi nama pangkat ke format singkatan resmi naskah dinas
 * (khusus untuk batang tubuh / tabel tugas personel tim penyidik).
 */
export const toPangkatSingkat = (pangkat) => {
  if (!pangkat) return '';
  const str = String(pangkat).trim().toUpperCase();
  const cleanKey = str.replace(/\./g, '').trim();

  // 1. Jika sudah merupakan singkatan resmi di kamus
  if (MAP_PANGKAT_LENGKAP[cleanKey]) {
    return cleanKey;
  }

  // 2. Jika merupakan nama pangkat lengkap, cari singkatannya
  for (const [abbr, full] of Object.entries(MAP_PANGKAT_LENGKAP)) {
    if (full === cleanKey || full === str) {
      return abbr;
    }
  }

  return cleanKey || str;
};

export const formatPangkatSingkat = toPangkatSingkat;

/**
 * Helper untuk mendeteksi personel yang ditunjuk sebagai Penyidik Penangan Perkara.
 * Mendukung objek penyidik_penangan, properti spesifik perkara, indeks slot tim penyidik (1..5),
 * flag is_penangan pada array investigators, dengan fallback default ke Penyidik 1.
 */
export const getPenyidikPenangan = (activeCase = {}) => {
  if (!activeCase) return null;

  // 1. Prioritas Utama: Cari elemen di array investigators yang memiliki flag is_penangan: true
  if (Array.isArray(activeCase.investigators) && activeCase.investigators.length > 0) {
    const found = activeCase.investigators.find(inv => inv.is_penangan === true || inv.is_penangan === 'true' || inv.is_penangan === 1);
    if (found && found.nama) return found;
  }

  // 2. Ditentukan berdasarkan index slot (1 s.d. 5)
  const idx = Number(
    activeCase.penyidik_penangan_index || 
    activeCase.penyidik_penangan_slot || 
    activeCase.references?.penyidik_penangan_index ||
    activeCase.references?.penyidik_penangan?.index
  );
  if (idx) {
    if (activeCase[`penyidik_${idx}_nama`]) {
      return {
        nama: activeCase[`penyidik_${idx}_nama`],
        pangkat: activeCase[`penyidik_${idx}_pangkat`] || '',
        nrp: activeCase[`penyidik_${idx}_nrp`] || '',
        jabatan: activeCase[`penyidik_${idx}_jabatan`] || (idx === 1 ? 'Kanit' : 'Penyidik Pembantu')
      };
    }
    if (Array.isArray(activeCase.investigators)) {
      const byOrder = activeCase.investigators.find(inv => Number(inv.role_order) === idx);
      if (byOrder && byOrder.nama) return byOrder;
    }
  }

  // 3. Objek penyidik_penangan langsung
  if (activeCase.penyidik_penangan && activeCase.penyidik_penangan.nama) {
    return activeCase.penyidik_penangan;
  }

  // 4. Dari references.penyidik_penangan
  if (activeCase.references?.penyidik_penangan?.nama) {
    return activeCase.references.penyidik_penangan;
  }

  // 5. Direct properties di tabel case
  if (activeCase.penyidik_penangan_nama) {
    return {
      nama: activeCase.penyidik_penangan_nama,
      pangkat: activeCase.penyidik_penangan_pangkat || '',
      nrp: activeCase.penyidik_penangan_nrp || '',
      jabatan: activeCase.penyidik_penangan_jabatan || ''
    };
  }

  // 6. Default Fallback: Penyidik 1 / Kanit
  if (activeCase.penyidik_1_nama) {
    return {
      nama: activeCase.penyidik_1_nama,
      pangkat: activeCase.penyidik_1_pangkat || '',
      nrp: activeCase.penyidik_1_nrp || '',
      jabatan: activeCase.penyidik_1_jabatan || ''
    };
  }

  if (Array.isArray(activeCase.investigators) && activeCase.investigators[0]?.nama) {
    return activeCase.investigators[0];
  }

  return null;
};

// Alias kompatibilitas
const templateBufferCache = templateArrayBufferCache;

/**
 * Clear in-memory template buffer cache if templates are modified in Template Studio
 */
export function clearTemplateBufferCache() {
  templateArrayBufferCache.clear();
}

/**
 * Fetch physical .docx file from Supabase Storage.
 * Supports memory cache (templateArrayBufferCache), 'templates' and 'docx-templates' buckets, as well as subfolders.
 */
export async function fetchDocxArrayBuffer(filePath) {
  if (!filePath) {
    throw new Error('Path template file di Supabase Storage tidak valid.');
  }

  const key = String(filePath).trim();

  // 1. Check in-memory cache first (Instant 0 ms response tanpa request jaringan)
  if (templateArrayBufferCache.has(key)) {
    return templateArrayBufferCache.get(key).slice(0);
  }

  // If filePath is a direct HTTP/HTTPS URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      const res = await fetch(filePath);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        templateArrayBufferCache.set(key, ab);
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
          templateArrayBufferCache.set(key, ab);
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
            templateArrayBufferCache.set(key, ab);
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
      templateArrayBufferCache.set(key, ab);
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
export function buildMindikPayload(arg1 = {}, maybeSuspect = null, maybeInput = {}, maybeSuspectsList = [], maybeVictim = null, maybeVictimsList = []) {
  let activeCase = {};
  let activeSuspect = null;
  let suspectsList = [];
  let formValues = {};
  let activeVictim = null;
  let victimsList = [];

  // Deteksi fleksibel parameter object vs positional
  if (arg1 && (arg1.activeCase !== undefined || arg1.formValues !== undefined || arg1.activeSuspect !== undefined || arg1.suspectsList !== undefined || arg1.activeVictim !== undefined || arg1.victimsList !== undefined || arg1.selectedVictim !== undefined)) {
    activeCase = arg1.activeCase || {};
    activeSuspect = arg1.activeSuspect || null;
    suspectsList = arg1.suspectsList || [];
    activeVictim = arg1.activeVictim || arg1.selectedVictim || null;
    victimsList = Array.isArray(arg1.victimsList) ? arg1.victimsList : (Array.isArray(arg1.victims) ? arg1.victims : []);
    formValues = arg1.formValues || {};
  } else {
    activeCase = arg1 || {};
    activeSuspect = maybeSuspect || null;
    formValues = maybeInput || {};
    suspectsList = Array.isArray(maybeSuspectsList) && maybeSuspectsList.length > 0
      ? maybeSuspectsList
      : (activeSuspect ? [activeSuspect] : (activeCase.suspectsList || []));
    activeVictim = maybeVictim || null;
    victimsList = Array.isArray(maybeVictimsList) ? maybeVictimsList : [];
  }

  // Bersihkan tanda kurung kurawal jika ada user yang mengetik { } di form
  const cleanInput = {};
  Object.keys(formValues || {}).forEach((k) => {
    const cleanKey = k.replace(/[{}]/g, '').trim();
    cleanInput[cleanKey] = formValues[k];
  });

  // A. SURAT AKTIF & LOGIKA EFEKTIF FORMAT SP TAP TERSANGKA
  const selectedTemplate = (arg1 && (arg1.template || arg1.selectedTemplate)) || activeCase?.template || null;
  const tplCode = (
    selectedTemplate?.code || 
    selectedTemplate?.kode || 
    selectedTemplate?.kode_dokumen || 
    selectedTemplate?.document_code || 
    cleanInput.TEMPLATE_CODE || 
    cleanInput.template_code || 
    cleanInput.KODE || 
    cleanInput.kode || 
    ''
  ).toUpperCase();

  const tplName = (
    selectedTemplate?.name || 
    selectedTemplate?.nama || 
    selectedTemplate?.title || 
    selectedTemplate?.judul || 
    cleanInput.TEMPLATE_TITLE || 
    cleanInput.template_title || 
    ''
  ).toLowerCase();

  const canonicalTplCode = toCanonicalMindikCode(tplCode, tplName);
  const isSpTap = canonicalTplCode === 'TAP_TSK' ||
                  selectedTemplate?.code === 'SP_TAP_TSK' ||
                  tplCode.includes('TAP_TSK') ||
                  tplName.includes('penetapan tersangka');

  const isKapDoc = tplCode === 'BA_KAP' || tplCode === 'SPRIN_KAP_DAN_BA' || tplCode.includes('KAP');
  const isHanDoc = tplCode === 'SPRIN_HAN' || tplCode === 'BA_HAN' || tplCode === 'SPRIN_HAN_DAN_BA' || tplCode.includes('HAN');

  const pickNonEmpty = (...candidates) => {
    for (const c of candidates) {
      if (c !== undefined && c !== null) {
        const s = String(c).trim();
        if (s !== '' && s !== '-' && s !== 'null' && s !== 'undefined') return s;
      }
    }
    return '';
  };

  const rawNomorSurat = cleanInput.NOMOR_SURAT 
    || cleanInput.nomor_surat 
    || cleanInput.NO_SURAT 
    || cleanInput.no_surat 
    || cleanInput.DOC_NO 
    || cleanInput.doc_no 
    || (isSpTap ? (cleanInput.nomor_sp_tap_tsk || cleanInput.no_sp_tap_tsk || cleanInput.nomor_sp_tap || '') : '')
    || '';
  const rawTanggalSurat = pickNonEmpty(
    arg1?.docDate,
    cleanInput.TANGGAL_SURAT,
    cleanInput.DOC_DATE,
    cleanInput.TGL_SURAT,
    cleanInput.TANGGAL_NASKAH,
    cleanInput.TANGGAL_DOKUMEN
  ) || pickNonEmpty(
    cleanInput.tanggal_surat,
    cleanInput.doc_date,
    cleanInput.tgl_surat,
    cleanInput.tanggal_naskah,
    cleanInput.tanggal_dokumen
  );

  const suspectNomorSpTap = isSpTap ? (activeSuspect?.nomor_sp_tap || activeSuspect?.no_sp_tap_tsk || '') : '';
  const suspectTanggalSpTap = isSpTap ? (activeSuspect?.tanggal_sp_tap || activeSuspect?.tgl_sp_tap_tsk || '') : '';

  // Kop Nomor Surat paling atas (Nomor : ...): gunakan murni exact string dari form input yang sedang aktif.
  // Khusus format SP_TAP_TSK: utamakan input mentah (raw exact string) dari pengguna di form, fallback ke suspectNomorSpTap
  const effectiveNomorSurat = isSpTap 
    ? (rawNomorSurat || suspectNomorSpTap)
    : rawNomorSurat;
  const nomorSurat = effectiveNomorSurat;

  const activeRawDate = rawTanggalSurat
    || (isSpTap ? pickNonEmpty(cleanInput.tanggal_sp_tap, cleanInput.tgl_sp_tap_tsk, suspectTanggalSpTap) : '')
    || (isKapDoc ? pickNonEmpty(cleanInput.TANGGAL_KAP, cleanInput.tanggal_kap) : '')
    || (isHanDoc ? pickNonEmpty(cleanInput.TANGGAL_MULAI_HAN, cleanInput.tanggal_mulai_han) : '')
    || new Date().toISOString().split('T')[0];

  const effectiveTanggalSurat = activeRawDate;
  const formattedActiveDate = formatTanggalIndonesia(activeRawDate);
  const parsedActiveDate = parseDateParts(activeRawDate);
  const tanggalSurat = formattedActiveDate;
  const tempatSurat = cleanInput.TEMPAT_SURAT || cleanInput.tempat_surat || cleanInput.DOC_LOCATION || 
    (isKapDoc && cleanInput.TEMPAT_KAP ? cleanInput.TEMPAT_KAP : (isHanDoc && cleanInput.TEMPAT_HAN ? cleanInput.TEMPAT_HAN : 'Tirawuta'));
  const tujuanSurat = cleanInput.TUJUAN_SURAT || cleanInput.tujuan_surat || cleanInput.DOC_TARGET || '';
  const alamatTujuan = cleanInput.ALAMAT_TUJUAN || cleanInput.alamat_tujuan || cleanInput.DOC_TARGET_ADDR || '';
  const rawMasaBerlaku = cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || '';
  const masaBerlaku = formatTanggalIndonesia(rawMasaBerlaku);

  // B. RUJUKAN TINGKAT PERKARA (dari activeCase / input form)
  const nomorLp = cleanInput.NOMOR_LP || cleanInput.nomor_lp || activeCase?.nomor_lp || activeCase?.no_lp || '';
  const rawTanggalLp = cleanInput.TANGGAL_LP || cleanInput.tanggal_lp || cleanInput.TGL_LP || cleanInput.tgl_lp || activeCase?.tanggal_lp || activeCase?.sprin_date || '';
  const tanggalLp = formatTanggalIndonesia(rawTanggalLp);

  // Universal Auto-Sync Dokumen Induk (Scalable & Modular — Anti Empty-String Overwrite)
  const isSprinSidikDoc = tplCode === 'SPRIN_SIDIK' || 
    (tplCode.includes('SIDIK') && !tplCode.includes('GAS') && !tplCode.includes('TUGAS') && !tplCode.includes('TAMBAHAN') && !tplCode.includes('LANJUTAN'));
  const isSprinGasSidikDoc = tplCode === 'SPRIN_GAS_SIDIK' || tplCode === 'SPGAS_SIDIK' || tplCode === 'SPRIN_TUGAS_PENYIDIKAN' || 
    (tplCode.includes('GAS_SIDIK') && !tplCode.includes('TAMBAHAN') && !tplCode.includes('LANJUTAN'));

  const inputSprinSidik = pickNonEmpty(
    cleanInput.NO_SPRIN_SIDIK,
    cleanInput.no_sprin_sidik,
    cleanInput.NOMOR_SPRIN_SIDIK,
    cleanInput.nomor_sprin_sidik,
    cleanInput.NOMOR_SP_SIDIK,
    cleanInput.nomor_sp_sidik,
    cleanInput.NO_SP_SIDIK,
    cleanInput.no_sp_sidik,
    cleanInput.SPRIN_SIDIK_NOMOR,
    cleanInput.SPRIN_SIDIK_NO,
    cleanInput.NOMOR_SURAT_PERINTAH_PENYIDIKAN
  );

  const noSprinSidik = (isSprinSidikDoc && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (inputSprinSidik || pickNonEmpty(activeCase?.no_sprin_sidik, activeCase?.sprin_sidik, activeCase?.references?.no_sprin_sidik));

  const rawTglSprinSidik = (isSprinSidikDoc && effectiveTanggalSurat)
    ? effectiveTanggalSurat
    : pickNonEmpty(
        cleanInput.TGL_SPRIN_SIDIK,
        cleanInput.tgl_sprin_sidik,
        cleanInput.TANGGAL_SPRIN_SIDIK,
        cleanInput.tanggal_sprin_sidik,
        cleanInput.TGL_SP_SIDIK,
        cleanInput.TANGGAL_SP_SIDIK,
        cleanInput.SPRIN_SIDIK_TANGGAL,
        cleanInput.SPRIN_SIDIK_TGL,
        cleanInput.TANGGAL_SURAT_PERINTAH_PENYIDIKAN,
        activeCase?.tgl_sprin_sidik,
        activeCase?.references?.tgl_sprin_sidik,
        activeCase?.sprin_date
      );
  const tglSprinSidik = formatTanggalIndonesia(rawTglSprinSidik);

  const noSprinGasSidik = (isSprinGasSidikDoc && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (pickNonEmpty(
        cleanInput.NO_SPRIN_GAS_SIDIK,
        cleanInput.no_sprin_gas_sidik,
        cleanInput.NOMOR_SPRIN_GAS_SIDIK,
        cleanInput.nomor_sprin_gas_sidik,
        cleanInput.NOMOR_SPGAS_SIDIK,
        cleanInput.NO_SPGAS_SIDIK,
        activeCase?.no_sprin_gas_sidik,
        activeCase?.nomor_sprin_gas_sidik,
        activeCase?.no_sp_gas_sidik,
        activeCase?.references?.no_spgas_sidik,
        activeCase?.references?.no_sprin_gas_sidik
      ) || '-');
  const rawTglSprinGasSidik = (isSprinGasSidikDoc && effectiveTanggalSurat)
    ? effectiveTanggalSurat
    : pickNonEmpty(
        cleanInput.TGL_SPRIN_GAS_SIDIK,
        cleanInput.tgl_sprin_gas_sidik,
        cleanInput.TANGGAL_SPRIN_GAS_SIDIK,
        cleanInput.tanggal_sprin_gas_sidik,
        cleanInput.TANGGAL_SPGAS_SIDIK,
        cleanInput.TGL_SPGAS_SIDIK,
        activeCase?.tgl_sprin_gas_sidik,
        activeCase?.tanggal_sprin_gas_sidik,
        activeCase?.tgl_sp_gas_sidik,
        activeCase?.references?.tgl_sprin_gas_sidik
      );
  const formattedTglSprinGasSidik = formatTanggalIndonesia(rawTglSprinGasSidik);
  const tglSprinGasSidik = formattedTglSprinGasSidik || '-';

  const noSpdp = cleanInput.NO_SPDP || cleanInput.no_spdp || activeCase?.no_spdp || '';
  const rawTglSpdp = cleanInput.TGL_SPDP || cleanInput.tgl_spdp || cleanInput.TANGGAL_SPDP || cleanInput.tanggal_spdp || activeCase?.tgl_spdp || '';
  const tglSpdp = formatTanggalIndonesia(rawTglSpdp);

  const noP21Kn = cleanInput.NO_P21_KN || cleanInput.no_p21_kn || activeCase?.no_p21_kn || '';
  const rawTglP21Kn = cleanInput.TGL_P21_KN || cleanInput.tgl_p21_kn || activeCase?.tgl_p21_kn || '';
  const tglP21Kn = formatTanggalIndonesia(rawTglP21Kn);

  // C. RUJUKAN TINGKAT TERSANGKA (dari activeSuspect / input form)
  // Rujukan SP TAP TSK di dalam isi surat rujukan huruf f: gunakan {NO_SP_TAP_TSK} atau {selectedSuspect?.nomor_sp_tap || '-'}
  const noSpTapTsk = isSpTap 
    ? (effectiveNomorSurat || suspectNomorSpTap || '-')
    : (cleanInput.NO_SP_TAP_TSK || cleanInput.no_sp_tap_tsk || cleanInput.NOMOR_SP_TAP || cleanInput.nomor_sp_tap || cleanInput.NOMOR_SP_TAP_TSK || cleanInput.nomor_sp_tap_tsk || suspectNomorSpTap || '-');
  const rawTglSpTapTsk = isSpTap 
    ? (effectiveTanggalSurat || suspectTanggalSpTap || '')
    : (cleanInput.TGL_SP_TAP_TSK || cleanInput.tgl_sp_tap_tsk || cleanInput.TANGGAL_SP_TAP_TSK || cleanInput.tanggal_sp_tap_tsk || cleanInput.TANGGAL_SP_TAP || cleanInput.tanggal_sp_tap || suspectTanggalSpTap || activeCase?.tgl_sp_tap_tsk || activeCase?.tanggal_penetapan || '');
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

  // C.1. DATA KHUSUS PENANGKAPAN (BA_KAP & SPRIN_KAP_DAN_BA)
  const isKapTemplate = tplCode.includes('KAP');
  const rawTglKap = cleanInput.TANGGAL_KAP || cleanInput.tanggal_kap || cleanInput.TGL_KAP || cleanInput.tgl_kap || activeSuspect?.tgl_sprin_kap || (isKapTemplate ? rawTanggalSurat : '');
  const parsedKap = parseDateParts(rawTglKap);
  const hariKap = parsedKap.hari || '';
  const tglKap = parsedKap.tanggal || '';
  const bulanKap = parsedKap.bulan || '';
  const tahunKap = parsedKap.tahun || '';
  const terbilangTahunKap = parsedKap.terbilangTahun || '';
  const tglLengkapKap = parsedKap.tanggalLengkap || (rawTglKap ? formatTanggalIndonesia(rawTglKap) : '');
  const rawJamKap = cleanInput.JAM_KAP || cleanInput.jam_kap || cleanInput.WAKTU_KAP || cleanInput.waktu_kap || (isKapTemplate ? '10.00 WITA' : '');
  const jamKap = formatWaktuJam(rawJamKap);
  const tempatKap = cleanInput.TEMPAT_KAP || cleanInput.tempat_kap || (isKapTemplate ? 'Kab. Kolaka Timur' : '');

  // C.2. DATA KHUSUS SPRIN & BA PENAHANAN (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA)
  const isHanTemplate = tplCode.includes('HAN');
  const rawTglMulaiHan = cleanInput.TANGGAL_MULAI_HAN || cleanInput.tanggal_mulai_han || cleanInput.TGL_MULAI_HAN || cleanInput.tgl_mulai_han || activeSuspect?.tgl_sprin_han || (isHanTemplate ? rawTanggalSurat : '');
  const rawTglAkhirHan = cleanInput.TANGGAL_AKHIR_HAN || cleanInput.tanggal_akhir_han || cleanInput.TGL_AKHIR_HAN || cleanInput.tgl_akhir_han || (rawTglMulaiHan ? hitungTanggalAkhirPenahanan(rawTglMulaiHan, 20) : '');
  const tglMulaiHanFormatted = rawTglMulaiHan ? formatTanggalIndonesia(rawTglMulaiHan) : '';
  const tglAkhirHanFormatted = rawTglAkhirHan ? formatTanggalIndonesia(rawTglAkhirHan) : '';
  const tempatHan = cleanInput.TEMPAT_HAN || cleanInput.tempat_han || cleanInput.TEMPAT_RUTAN_HAN || cleanInput.tempat_rutan_han || (isHanTemplate ? 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur' : '');

  const rawTglHan = cleanInput.TANGGAL_HAN || cleanInput.tanggal_han || cleanInput.TGL_HAN || cleanInput.tgl_han || rawTglMulaiHan || (isHanTemplate ? rawTanggalSurat : '');
  const parsedHan = parseDateParts(rawTglHan);
  const hariHan = parsedHan.hari || '';
  const tglHan = parsedHan.tanggal || '';
  const bulanHan = parsedHan.bulan || '';
  const tahunHan = parsedHan.tahun || '';
  const terbilangTahunHan = parsedHan.terbilangTahun || '';
  const tglLengkapHan = parsedHan.tanggalLengkap || (rawTglHan ? formatTanggalIndonesia(rawTglHan) : '');
  const rawJamHan = cleanInput.JAM_HAN || cleanInput.jam_han || cleanInput.WAKTU_HAN || cleanInput.waktu_han || (isHanTemplate ? '10.00 WITA' : '');
  const jamHan = formatWaktuJam(rawJamHan);

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
  const namaTersangka = cleanInput.NAMA_TERSANGKA || cleanInput.nama_tersangka || activeSuspect?.nama || '';
  const nik = cleanInput.NIK || cleanInput.nik || activeSuspect?.nik || '';
  const jenisKelamin = cleanInput.JENIS_KELAMIN || cleanInput.jenis_kelamin || activeSuspect?.jenis_kelamin || 'Laki-laki';
  const tempatLahir = cleanInput.TEMPAT_LAHIR || cleanInput.tempat_lahir || activeSuspect?.tempat_lahir || '';
  const rawTglLahirSuspect = cleanInput.TGL_LAHIR || cleanInput.tgl_lahir || activeSuspect?.tgl_lahir || activeSuspect?.tanggal_lahir || '';
  const formattedTglLahirSuspect = formatTanggalIndonesia(rawTglLahirSuspect);
  const ttl = cleanInput.TTL || cleanInput.ttl || (
    (tempatLahir && rawTglLahirSuspect)
      ? `${tempatLahir}, ${formattedTglLahirSuspect}`
      : (activeSuspect?.ttl || activeSuspect?.pob_dob || tempatLahir || '')
  );
  const rawUmur = cleanInput.UMUR || cleanInput.umur || activeSuspect?.umur || '';
  const umur = rawUmur
    ? (String(rawUmur).includes('Tahun') ? String(rawUmur) : `${rawUmur} Tahun`)
    : '';
  const agama = cleanInput.AGAMA || cleanInput.agama || activeSuspect?.agama || '';
  const pekerjaan = cleanInput.PEKERJAAN || cleanInput.pekerjaan || activeSuspect?.pekerjaan || '';
  const kewarganegaraan = cleanInput.KEWARGANEGARAAN || cleanInput.kewarganegaraan || activeSuspect?.kewarganegaraan || 'Indonesia';
  const pendidikan = cleanInput.PENDIDIKAN || cleanInput.pendidikan || activeSuspect?.pendidikan || '';
  const statusKawin = cleanInput.STATUS_KAWIN || cleanInput.status_kawin || activeSuspect?.status_pernikahan || activeSuspect?.status_kawin || activeSuspect?.marital_status || '';
  const alamat = cleanInput.ALAMAT || cleanInput.alamat || activeSuspect?.alamat || activeCase?.alamat_tersangka || '';

  // E.1.1 STATUS & URUTAN ADMINISTRASI TERSANGKA
  const rawUrutanTsk = cleanInput.URUTAN_TERSANGKA || cleanInput.urutan_tersangka || activeSuspect?.urutan_tersangka || 1;
  const urutanTersangka = Number(rawUrutanTsk) || 1;
  const romanUrutan = urutanTersangka === 1 ? 'I' : urutanTersangka === 2 ? 'II' : urutanTersangka === 3 ? 'III' : urutanTersangka === 4 ? 'IV' : urutanTersangka === 5 ? 'V' : String(urutanTersangka);
  const statusTersangkaLabel = cleanInput.STATUS_TERSANGKA_LABEL || cleanInput.status_tersangka_label || activeSuspect?.status_tersangka_label || `Tersangka ${romanUrutan}`;
  const kontakTersangka = cleanInput.KONTAK_TERSANGKA || cleanInput.kontak_tersangka || activeSuspect?.kontak || activeSuspect?.phone || activeSuspect?.no_hp || '';

  // E.2. IDENTITAS KORBAN (10 Field Standar Mindik)
  const rawVictimsList = Array.isArray(victimsList) && victimsList.length > 0
    ? victimsList
    : (Array.isArray(activeCase?.victims) && activeCase.victims.length > 0
        ? activeCase.victims
        : (Array.isArray(activeCase?.references?.victims) ? activeCase.references.victims : []));

  const resolvedVictim = activeVictim || rawVictimsList[0] || null;

  const korbanNama = cleanInput.KORBAN_NAMA || cleanInput.korban_nama || resolvedVictim?.nama || activeCase?.nama_pelapor || activeCase?.pelapor_name || '';
  const korbanNik = cleanInput.KORBAN_NIK || cleanInput.korban_nik || resolvedVictim?.nik || '';
  const korbanJk = cleanInput.KORBAN_JK || cleanInput.korban_jk || cleanInput.KORBAN_JENIS_KELAMIN || cleanInput.korban_jenis_kelamin || resolvedVictim?.jenis_kelamin || (resolvedVictim ? 'Laki-laki' : '');
  const korbanTtl = cleanInput.KORBAN_TTL || cleanInput.korban_ttl || resolvedVictim?.ttl || '';
  const rawKorbanUmur = cleanInput.KORBAN_UMUR || cleanInput.korban_umur || resolvedVictim?.umur || '';
  const korbanUmur = rawKorbanUmur
    ? (String(rawKorbanUmur).includes('Tahun') ? String(rawKorbanUmur) : `${rawKorbanUmur} Tahun`)
    : '';
  const korbanKerja = cleanInput.KORBAN_KERJA || cleanInput.korban_kerja || cleanInput.KORBAN_PEKERJAAN || cleanInput.korban_pekerjaan || resolvedVictim?.pekerjaan || '';
  const korbanWarga = cleanInput.KORBAN_WARGA || cleanInput.korban_warga || cleanInput.KORBAN_KEWARGANEGARAAN || cleanInput.korban_kewarganegaraan || resolvedVictim?.kewarganegaraan || (korbanNama ? 'Indonesia' : '');
  const korbanDidik = cleanInput.KORBAN_DIDIK || cleanInput.korban_didik || cleanInput.KORBAN_PENDIDIKAN || cleanInput.korban_pendidikan || resolvedVictim?.pendidikan || '';
  const korbanAgama = cleanInput.KORBAN_AGAMA || cleanInput.korban_agama || resolvedVictim?.agama || '';
  const korbanAlamat = cleanInput.KORBAN_ALAMAT || cleanInput.korban_alamat || resolvedVictim?.alamat || (resolvedVictim ? '' : (activeCase?.locus || ''));

  // F. PENYIDIK & PEJABAT
  // Tanda Tangan Kasat Reskrim (Pemberi Perintah / Penandatangan Utama - Pangkat Singkat Baku)
  const atasanNama = cleanInput.ATASAN_NAMA || cleanInput.atasan_nama || activeCase?.kasat_nama || '';
  const atasanPangkatRaw = cleanInput.ATASAN_PANGKAT || cleanInput.atasan_pangkat || activeCase?.kasat_pangkat || activeCase?.atasan_pangkat || '';
  const atasanPangkat = (toPangkatSingkat(atasanPangkatRaw) || atasanPangkatRaw).trim();
  const atasanNrp = cleanInput.ATASAN_NRP || cleanInput.atasan_nrp || activeCase?.kasat_nrp || '';

  // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA (Pangkat Singkat Baku)
  const penyidikNama = cleanInput.PENYIDIK_NAMA || cleanInput.penyidik_nama || activeCase?.penyidik_1_nama || '';
  const penyidikPangkatRaw = cleanInput.PENYIDIK_PANGKAT || cleanInput.penyidik_pangkat || activeCase?.penyidik_1_pangkat || activeCase?.penyidik_pangkat || '';
  const penyidikPangkat = (toPangkatSingkat(penyidikPangkatRaw) || penyidikPangkatRaw).trim();
  const penyidikNrp = cleanInput.PENYIDIK_NRP || cleanInput.penyidik_nrp || activeCase?.penyidik_1_nrp || activeCase?.penyidik_nrp || '';
  const penyidikJabatan = cleanInput.PENYIDIK_JABATAN || cleanInput.penyidik_jabatan || activeCase?.penyidik_1_jabatan || activeCase?.penyidik_jabatan || '';

  // Penyidik Penangan Perkara (Bukti Penyerahan Surat - Pangkat Singkat Baku)
  const penanganCase = getPenyidikPenangan(activeCase);
  const penanganNama = cleanInput.PENYIDIK_PENANGAN_NAMA || cleanInput.penyidik_penangan_nama || penanganCase?.nama || activeCase?.penyidik_1_nama || penyidikNama || '';
  const penanganPangkatRaw = cleanInput.PENYIDIK_PENANGAN_PANGKAT || cleanInput.penyidik_penangan_pangkat || penanganCase?.pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRaw || penyidikPangkat || '';
  const penanganPangkat = (toPangkatSingkat(penanganPangkatRaw) || penanganPangkatRaw).trim();
  const penanganNrp = cleanInput.PENYIDIK_PENANGAN_NRP || cleanInput.penyidik_penangan_nrp || penanganCase?.nrp || activeCase?.penyidik_1_nrp || penyidikNrp || '';
  const penanganJabatan = cleanInput.PENYIDIK_PENANGAN_JABATAN || cleanInput.penyidik_penangan_jabatan || penanganCase?.jabatan || activeCase?.penyidik_1_jabatan || penyidikJabatan || 'Penyidik';
  const penanganPangkatNrp = penanganPangkat && penanganNrp ? `${penanganPangkat} / ${penanganNrp}` : (penanganPangkat || penanganNrp || '');

  // Daftar Tim Penerima Perintah (Untuk Badan Surat Perintah Personel 1 s.d. 5)
  const penyidik1Nama = cleanInput.PENYIDIK_1_NAMA || cleanInput.penyidik_1_nama || activeCase?.penyidik_1_nama || penyidikNama || '';
  const penyidik1PangkatRaw = cleanInput.PENYIDIK_1_PANGKAT || cleanInput.penyidik_1_pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRaw || '';
  const penyidik1PangkatSingkat = toPangkatSingkat(penyidik1PangkatRaw);
  const penyidik1Pangkat = penyidik1PangkatSingkat; // WAJIB Pangkat Singkat untuk Personel 1 di Batang Tubuh / Bagian "DIPERINTAHKAN Kepada"
  const penyidik1Nrp = cleanInput.PENYIDIK_1_NRP || cleanInput.penyidik_1_nrp || activeCase?.penyidik_1_nrp || penyidikNrp || '';
  const penyidik1Jabatan = cleanInput.PENYIDIK_1_JABATAN || cleanInput.penyidik_1_jabatan || activeCase?.penyidik_1_jabatan || penyidikJabatan || '';

  const penyidik2Nama = cleanInput.PENYIDIK_2_NAMA || cleanInput.penyidik_2_nama || activeCase?.penyidik_2_nama || '';
  const penyidik2PangkatRaw = cleanInput.PENYIDIK_2_PANGKAT || cleanInput.penyidik_2_pangkat || activeCase?.penyidik_2_pangkat || '';
  const penyidik2PangkatSingkat = toPangkatSingkat(penyidik2PangkatRaw);
  const penyidik2Pangkat = penyidik2PangkatSingkat;
  const penyidik2Nrp = cleanInput.PENYIDIK_2_NRP || cleanInput.penyidik_2_nrp || activeCase?.penyidik_2_nrp || '';
  const penyidik2Jabatan = cleanInput.PENYIDIK_2_JABATAN || cleanInput.penyidik_2_jabatan || activeCase?.penyidik_2_jabatan || '';

  const penyidik3Nama = cleanInput.PENYIDIK_3_NAMA || cleanInput.penyidik_3_nama || activeCase?.penyidik_3_nama || '';
  const penyidik3PangkatRaw = cleanInput.PENYIDIK_3_PANGKAT || cleanInput.penyidik_3_pangkat || activeCase?.penyidik_3_pangkat || '';
  const penyidik3PangkatSingkat = toPangkatSingkat(penyidik3PangkatRaw);
  const penyidik3Pangkat = penyidik3PangkatSingkat;
  const penyidik3Nrp = cleanInput.PENYIDIK_3_NRP || cleanInput.penyidik_3_nrp || activeCase?.penyidik_3_nrp || '';
  const penyidik3Jabatan = cleanInput.PENYIDIK_3_JABATAN || cleanInput.penyidik_3_jabatan || activeCase?.penyidik_3_jabatan || '';

  const penyidik4Nama = cleanInput.PENYIDIK_4_NAMA || cleanInput.penyidik_4_nama || activeCase?.penyidik_4_nama || '';
  const penyidik4PangkatRaw = cleanInput.PENYIDIK_4_PANGKAT || cleanInput.penyidik_4_pangkat || activeCase?.penyidik_4_pangkat || '';
  const penyidik4PangkatSingkat = toPangkatSingkat(penyidik4PangkatRaw);
  const penyidik4Pangkat = penyidik4PangkatSingkat;
  const penyidik4Nrp = cleanInput.PENYIDIK_4_NRP || cleanInput.penyidik_4_nrp || activeCase?.penyidik_4_nrp || '';
  const penyidik4Jabatan = cleanInput.PENYIDIK_4_JABATAN || cleanInput.penyidik_4_jabatan || activeCase?.penyidik_4_jabatan || '';

  const penyidik5Nama = cleanInput.PENYIDIK_5_NAMA || cleanInput.penyidik_5_nama || activeCase?.penyidik_5_nama || '';
  const penyidik5PangkatRaw = cleanInput.PENYIDIK_5_PANGKAT || cleanInput.penyidik_5_pangkat || activeCase?.penyidik_5_pangkat || '';
  const penyidik5PangkatSingkat = toPangkatSingkat(penyidik5PangkatRaw);
  const penyidik5Pangkat = penyidik5PangkatSingkat;
  const penyidik5Nrp = cleanInput.PENYIDIK_5_NRP || cleanInput.penyidik_5_nrp || activeCase?.penyidik_5_nrp || '';
  const penyidik5Jabatan = cleanInput.PENYIDIK_5_JABATAN || cleanInput.penyidik_5_jabatan || activeCase?.penyidik_5_jabatan || '';

  const atasanJabatan = cleanInput.ATASAN_JABATAN || cleanInput.atasan_jabatan || activeCase?.kasat_jabatan || 'Kasat Reskrim';

  const atasanPangkatNrp = atasanPangkat && atasanNrp ? `${atasanPangkat} / ${atasanNrp}` : (atasanPangkat || atasanNrp || '');
  const penyidikPangkatNrp = penyidikPangkat && penyidikNrp ? `${penyidikPangkat} / ${penyidikNrp}` : (penyidikPangkat || penyidikNrp || '');
  const penyidik1PangkatNrp = penyidik1PangkatSingkat && penyidik1Nrp ? `${penyidik1PangkatSingkat} / ${penyidik1Nrp}` : (penyidik1PangkatSingkat || penyidik1Nrp || '');
  const penyidik2PangkatNrp = penyidik2PangkatSingkat && penyidik2Nrp ? `${penyidik2PangkatSingkat} / ${penyidik2Nrp}` : (penyidik2PangkatSingkat || penyidik2Nrp || '');
  const penyidik3PangkatNrp = penyidik3PangkatSingkat && penyidik3Nrp ? `${penyidik3PangkatSingkat} / ${penyidik3Nrp}` : (penyidik3PangkatSingkat || penyidik3Nrp || '');
  const penyidik4PangkatNrp = penyidik4PangkatSingkat && penyidik4Nrp ? `${penyidik4PangkatSingkat} / ${penyidik4Nrp}` : (penyidik4PangkatSingkat || penyidik4Nrp || '');
  const penyidik5PangkatNrp = penyidik5PangkatSingkat && penyidik5Nrp ? `${penyidik5PangkatSingkat} / ${penyidik5Nrp}` : (penyidik5PangkatSingkat || penyidik5Nrp || '');

  // Daftar Tim Personel di Batang Tubuh / Tabel Tugas (Loop Array) - Tetap Pangkat Singkat Sesuai Ketentuan Naskah Dinas
  const timPenyidik = [
    { no: 1, nama: penyidik1Nama, pangkat: penyidik1PangkatSingkat, nrp: penyidik1Nrp, jabatan: penyidik1Jabatan, pangkat_nrp: penyidik1Nrp ? `${penyidik1PangkatSingkat} / ${penyidik1Nrp}` : penyidik1PangkatSingkat, pangkat_singkat: penyidik1PangkatSingkat, pangkat_lengkap: toPangkatLengkap(penyidik1PangkatRaw) },
    { no: 2, nama: penyidik2Nama, pangkat: penyidik2PangkatSingkat, nrp: penyidik2Nrp, jabatan: penyidik2Jabatan, pangkat_nrp: penyidik2PangkatNrp, pangkat_singkat: penyidik2PangkatSingkat, pangkat_lengkap: toPangkatLengkap(penyidik2PangkatRaw) },
    { no: 3, nama: penyidik3Nama, pangkat: penyidik3PangkatSingkat, nrp: penyidik3Nrp, jabatan: penyidik3Jabatan, pangkat_nrp: penyidik3PangkatNrp, pangkat_singkat: penyidik3PangkatSingkat, pangkat_lengkap: toPangkatLengkap(penyidik3PangkatRaw) },
    { no: 4, nama: penyidik4Nama, pangkat: penyidik4PangkatSingkat, nrp: penyidik4Nrp, jabatan: penyidik4Jabatan, pangkat_nrp: penyidik4PangkatNrp, pangkat_singkat: penyidik4PangkatSingkat, pangkat_lengkap: toPangkatLengkap(penyidik4PangkatRaw) },
    { no: 5, nama: penyidik5Nama, pangkat: penyidik5PangkatSingkat, nrp: penyidik5Nrp, jabatan: penyidik5Jabatan, pangkat_nrp: penyidik5PangkatNrp, pangkat_singkat: penyidik5PangkatSingkat, pangkat_lengkap: toPangkatLengkap(penyidik5PangkatRaw) },
  ].filter(p => p.nama);

  const baseMap = {
    // A. SURAT AKTIF (Resmi UPPERCASE)
    NOMOR_SURAT: effectiveNomorSurat || nomorSurat || '',
    nomor_surat: effectiveNomorSurat || nomorSurat || '',
    NO_SURAT: effectiveNomorSurat || nomorSurat || '',
    no_surat: effectiveNomorSurat || nomorSurat || '',
    TANGGAL_SURAT: tanggalSurat,
    tanggal_surat: tanggalSurat,
    NOMOR_SURAT_HEADER: formatNomorSuratHeader(effectiveNomorSurat || nomorSurat),
    nomor_surat_header: formatNomorSuratHeader(effectiveNomorSurat || nomorSurat),
    TANGGAL_SURAT_HEADER: formatTanggalSuratHeader(tanggalSurat),
    tanggal_surat_header: formatTanggalSuratHeader(tanggalSurat),
    TEMPAT_SURAT: tempatSurat,
    TUJUAN_SURAT: tujuanSurat,
    ALAMAT_TUJUAN: alamatTujuan,
    MASA_BERLAKU: masaBerlaku,

    // B. RUJUKAN TINGKAT PERKARA (Resmi UPPERCASE)
    NOMOR_LP: nomorLp,
    TANGGAL_LP: tanggalLp,
    NO_SPRIN_SIDIK: noSprinSidik,
    no_sprin_sidik: noSprinSidik,
    NOMOR_SP_SIDIK: noSprinSidik,
    nomor_sp_sidik: noSprinSidik,
    NO_SP_SIDIK: noSprinSidik,
    no_sp_sidik: noSprinSidik,
    TGL_SPRIN_SIDIK: tglSprinSidik,
    tgl_sprin_sidik: tglSprinSidik,
    NO_SPRIN_GAS_SIDIK: noSprinGasSidik,
    TGL_SPRIN_GAS_SIDIK: tglSprinGasSidik,
    TANGGAL_SPRIN_GAS_SIDIK: tglSprinGasSidik,
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

    // C.1. TAG PENANGKAPAN (BA_KAP & SPRIN_KAP_DAN_BA)
    HARI_KAP: hariKap,
    hari_kap: hariKap,
    TANGGAL_KAP: tglKap,
    tanggal_kap: tglKap,
    BULAN_KAP: bulanKap,
    bulan_kap: bulanKap,
    TAHUN_KAP: tahunKap,
    tahun_kap: tahunKap,
    TERBILANG_TAHUN_KAP: terbilangTahunKap,
    terbilang_tahun_kap: terbilangTahunKap,
    JAM_KAP: jamKap,
    jam_kap: jamKap,
    TEMPAT_KAP: tempatKap,
    tempat_kap: tempatKap,
    TGL_KAP: tglKap,
    tgl_kap: tglKap,
    TANGGAL_LENGKAP_KAP: tglLengkapKap,
    tanggal_lengkap_kap: tglLengkapKap,

    // C.2. TAG SPRIN PENAHANAN (SPRIN_HAN & SPRIN_HAN_DAN_BA)
    TANGGAL_MULAI_HAN: tglMulaiHanFormatted,
    tanggal_mulai_han: tglMulaiHanFormatted,
    TANGGAL_AKHIR_HAN: tglAkhirHanFormatted,
    tanggal_akhir_han: tglAkhirHanFormatted,
    TEMPAT_HAN: tempatHan,
    tempat_han: tempatHan,
    TGL_MULAI_HAN: tglMulaiHanFormatted,
    tgl_mulai_han: tglMulaiHanFormatted,
    TGL_AKHIR_HAN: tglAkhirHanFormatted,
    tgl_akhir_han: tglAkhirHanFormatted,

    // C.3. TAG BA PENAHANAN (BA_HAN & SPRIN_HAN_DAN_BA)
    HARI_HAN: hariHan,
    hari_han: hariHan,
    TANGGAL_HAN: tglHan,
    tanggal_han: tglHan,
    BULAN_HAN: bulanHan,
    bulan_han: bulanHan,
    TAHUN_HAN: tahunHan,
    tahun_han: tahunHan,
    TERBILANG_TAHUN_HAN: terbilangTahunHan,
    terbilang_tahun_han: terbilangTahunHan,
    JAM_HAN: jamHan,
    jam_han: jamHan,
    TGL_HAN: tglHan,
    tgl_han: tglHan,
    TANGGAL_LENGKAP_HAN: tglLengkapHan,
    tanggal_lengkap_han: tglLengkapHan,

    // D. UNSUR YURIDIS & PERKARA (Resmi UPPERCASE)
    DASAR_PASAL_UU: dasarPasalUu,
    PASAL: pasal,
    TINDAK_PIDANA: tindakPidana,
    TEMPAT_KEJADIAN: tempatKejadian,
    WAKTU_KEJADIAN: waktuKejadian,
    STATUS_KASUS: statusKasus,

    // E. IDENTITAS PIHAK (Resmi UPPERCASE)
    NAMA_TERSANGKA: namaTersangka,
    NAMA_PELAPOR: namaPelapor,
    NAMA_TERLAPOR: namaTerlapor,
    NIK: nik,
    JENIS_KELAMIN: jenisKelamin,
    TEMPAT_LAHIR: tempatLahir,
    TGL_LAHIR: formattedTglLahirSuspect,
    TTL: ttl,
    UMUR: umur,
    AGAMA: agama,
    PEKERJAAN: pekerjaan,
    KEWARGANEGARAAN: kewarganegaraan,
    PENDIDIKAN: pendidikan,
    STATUS_KAWIN: statusKawin,
    ALAMAT: alamat,

    // E.1. IDENTITAS TERSANGKA LENGKAP & STATUS TERSANGKA
    NIK_TERSANGKA: nik,
    nik_tersangka: nik,
    TTL_TERSANGKA: ttl,
    ttl_tersangka: ttl,
    TEMPAT_LAHIR_TERSANGKA: tempatLahir,
    tempat_lahir_tersangka: tempatLahir,
    TGL_LAHIR_TERSANGKA: formattedTglLahirSuspect,
    tgl_lahir_tersangka: formattedTglLahirSuspect,
    JENIS_KELAMIN_TERSANGKA: jenisKelamin,
    jenis_kelamin_tersangka: jenisKelamin,
    AGAMA_TERSANGKA: agama,
    agama_tersangka: agama,
    PEKERJAAN_TERSANGKA: pekerjaan,
    pekerjaan_tersangka: pekerjaan,
    KEWARGANEGARAAN_TERSANGKA: kewarganegaraan,
    kewarganegaraan_tersangka: kewarganegaraan,
    PENDIDIKAN_TERSANGKA: pendidikan,
    pendidikan_tersangka: pendidikan,
    STATUS_KAWIN_TERSANGKA: statusKawin,
    status_kawin_tersangka: statusKawin,
    ALAMAT_TERSANGKA: alamat,
    alamat_tersangka: alamat,
    KONTAK_TERSANGKA: kontakTersangka,
    kontak_tersangka: kontakTersangka,
    STATUS_TERSANGKA_LABEL: statusTersangkaLabel,
    status_tersangka_label: statusTersangkaLabel,
    URUTAN_TERSANGKA: urutanTersangka,
    urutan_tersangka: urutanTersangka,

    // E.2. IDENTITAS KORBAN (10 Tag Standar Mindik)
    KORBAN_NAMA: korbanNama,
    korban_nama: korbanNama,
    KORBAN_NIK: korbanNik,
    korban_nik: korbanNik,
    KORBAN_JK: korbanJk,
    korban_jk: korbanJk,
    KORBAN_JENIS_KELAMIN: korbanJk,
    korban_jenis_kelamin: korbanJk,
    KORBAN_TTL: korbanTtl,
    korban_ttl: korbanTtl,
    KORBAN_UMUR: korbanUmur,
    korban_umur: korbanUmur,
    KORBAN_KERJA: korbanKerja,
    korban_kerja: korbanKerja,
    KORBAN_PEKERJAAN: korbanKerja,
    korban_pekerjaan: korbanKerja,
    KORBAN_WARGA: korbanWarga,
    korban_warga: korbanWarga,
    KORBAN_KEWARGANEGARAAN: korbanWarga,
    korban_kewarganegaraan: korbanWarga,
    KORBAN_DIDIK: korbanDidik,
    korban_didik: korbanDidik,
    KORBAN_PENDIDIKAN: korbanDidik,
    korban_pendidikan: korbanDidik,
    KORBAN_AGAMA: korbanAgama,
    korban_agama: korbanAgama,
    KORBAN_ALAMAT: korbanAlamat,
    korban_alamat: korbanAlamat,

    // F. PENYIDIK & PEJABAT (Resmi UPPERCASE)
    // Tanda Tangan Kasat Reskrim (Pemberi Perintah / Penandatangan Utama)
    ATASAN_NAMA: atasanNama,
    ATASAN_PANGKAT: atasanPangkat,
    ATASAN_NRP: atasanNrp,
    ATASAN_JABATAN: atasanJabatan,
    ATASAN_PANGKAT_NRP: atasanPangkatNrp,

    // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA (Pangkat Lengkap Resmi)
    PENYIDIK_NAMA: penyidikNama,
    PENYIDIK_PANGKAT: penyidikPangkat,
    PENYIDIK_NRP: penyidikNrp,
    PENYIDIK_JABATAN: penyidikJabatan,
    PENYIDIK_PANGKAT_NRP: penyidikPangkatNrp,

    // Aliases spesifik Yang Menerima Perintah / Kanit / Penerima Perintah
    YANG_MENERIMA_PERINTAH_NAMA: penyidikNama,
    YANG_MENERIMA_PERINTAH_PANGKAT: penyidikPangkat,
    YANG_MENERIMA_PERINTAH_NRP: penyidikNrp,
    YANG_MENERIMA_PERINTAH_JABATAN: penyidikJabatan,
    YANG_MENERIMA_PERINTAH_PANGKAT_NRP: penyidikPangkatNrp,
    PENERIMA_PERINTAH_NAMA: penyidikNama,
    PENERIMA_PERINTAH_PANGKAT: penyidikPangkat,
    PENERIMA_PERINTAH_NRP: penyidikNrp,
    PENERIMA_PERINTAH_JABATAN: penyidikJabatan,
    PENERIMA_PERINTAH_PANGKAT_NRP: penyidikPangkatNrp,
    KANIT_NAMA: penyidikNama,
    KANIT_PANGKAT: penyidikPangkat,
    KANIT_NRP: penyidikNrp,
    KANIT_JABATAN: penyidikJabatan,
    KANIT_PANGKAT_NRP: penyidikPangkatNrp,
    PENYIDIK_PANGKAT_LENGKAP: penyidikPangkat,
    PENYIDIK_1_PANGKAT_LENGKAP: toPangkatLengkap(penyidik1PangkatRaw),

    // Penyidik Penangan Perkara (Bukti Penyerahan Surat - Pangkat Lengkap)
    PENYIDIK_PENANGAN_NAMA: penanganNama,
    PENYIDIK_PENANGAN_PANGKAT: penanganPangkat,
    PENYIDIK_PENANGAN_NRP: penanganNrp,
    PENYIDIK_PENANGAN_JABATAN: penanganJabatan,
    PENYIDIK_PENANGAN_PANGKAT_NRP: penanganPangkatNrp,

    // Daftar Tim Penerima Perintah (Personel 1 s.d. 5) - Pangkat Singkat untuk Batang Tubuh
    PENYIDIK_1_NAMA: penyidik1Nama,
    PENYIDIK_1_PANGKAT: penyidik1PangkatSingkat,
    PENYIDIK_1_NRP: penyidik1Nrp,
    PENYIDIK_1_JABATAN: penyidik1Jabatan,
    PENYIDIK_1_PANGKAT_NRP: penyidik1PangkatNrp,

    PENYIDIK_2_NAMA: penyidik2Nama,
    PENYIDIK_2_PANGKAT: penyidik2Pangkat,
    PENYIDIK_2_NRP: penyidik2Nrp,
    PENYIDIK_2_JABATAN: penyidik2Jabatan,
    PENYIDIK_2_PANGKAT_NRP: penyidik2PangkatNrp,

    PENYIDIK_3_NAMA: penyidik3Nama,
    PENYIDIK_3_PANGKAT: penyidik3Pangkat,
    PENYIDIK_3_NRP: penyidik3Nrp,
    PENYIDIK_3_JABATAN: penyidik3Jabatan,
    PENYIDIK_3_PANGKAT_NRP: penyidik3PangkatNrp,

    PENYIDIK_4_NAMA: penyidik4Nama,
    PENYIDIK_4_PANGKAT: penyidik4Pangkat,
    PENYIDIK_4_NRP: penyidik4Nrp,
    PENYIDIK_4_JABATAN: penyidik4Jabatan,
    PENYIDIK_4_PANGKAT_NRP: penyidik4PangkatNrp,

    PENYIDIK_5_NAMA: penyidik5Nama,
    PENYIDIK_5_PANGKAT: penyidik5Pangkat,
    PENYIDIK_5_NRP: penyidik5Nrp,
    PENYIDIK_5_JABATAN: penyidik5Jabatan,
    PENYIDIK_5_PANGKAT_NRP: penyidik5PangkatNrp,

    // Aliases lowercase & format pendukung untuk kompatibilitas template fleksibel
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
    NOMOR_SPRIN_SIDIK: noSprinSidik,
    nomor_sprin_sidik: noSprinSidik,
    NO_SP_SIDIK: noSprinSidik,
    no_sp_sidik: noSprinSidik,
    TGL_SP_SIDIK: tglSprinSidik,
    tgl_sp_sidik: tglSprinSidik,

    no_sprin_gas_sidik: noSprinGasSidik,
    tgl_sprin_gas_sidik: tglSprinGasSidik,
    TANGGAL_SPRIN_GAS_SIDIK: tglSprinGasSidik,
    tanggal_sprin_gas_sidik: tglSprinGasSidik,
    NOMOR_SPRIN_GAS_SIDIK: noSprinGasSidik,
    nomor_sprin_gas_sidik: noSprinGasSidik,
    NO_SP_GAS_SIDIK: noSprinGasSidik,
    no_sp_gas_sidik: noSprinGasSidik,
    TGL_SP_GAS_SIDIK: tglSprinGasSidik,
    tgl_sp_gas_sidik: tglSprinGasSidik,
    TANGGAL_SP_GAS_SIDIK: tglSprinGasSidik,
    tanggal_sp_gas_sidik: tglSprinGasSidik,

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
    NOMOR_SP_TAP: noSpTapTsk,
    nomor_sp_tap: noSpTapTsk,
    NO_SP_TAP: noSpTapTsk,
    no_sp_tap: noSpTapTsk,
    SP_TAP_TSK: noSpTapTsk,
    sp_tap_tsk: noSpTapTsk,
    NOMOR_SP_TAP_TSK: noSpTapTsk,
    nomor_sp_tap_tsk: noSpTapTsk,

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

    nama_tersangka: namaTersangka,
    nama_pelapor: namaPelapor,
    nama_terlapor: namaTerlapor,
    TERLAPOR_NAMA: namaTerlapor,
    terlapor_nama: namaTerlapor,
    TERLAPOR: namaTerlapor,
    terlapor: namaTerlapor,
    nik: nik,
    jenis_kelamin: jenisKelamin,
    tempat_lahir: tempatLahir,
    tgl_lahir: formattedTglLahirSuspect,
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
    atasan_jabatan: atasanJabatan,
    atasan_pangkat_nrp: atasanPangkatNrp,

    penyidik_nama: penyidikNama,
    penyidik_pangkat: penyidikPangkat,
    penyidik_nrp: penyidikNrp,
    penyidik_jabatan: penyidikJabatan,
    penyidik_pangkat_nrp: penyidikPangkatNrp,

    yang_menerima_perintah_nama: penyidikNama,
    yang_menerima_perintah_pangkat: penyidikPangkat,
    yang_menerima_perintah_nrp: penyidikNrp,
    yang_menerima_perintah_jabatan: penyidikJabatan,
    yang_menerima_perintah_pangkat_nrp: penyidikPangkatNrp,
    penerima_perintah_nama: penyidikNama,
    penerima_perintah_pangkat: penyidikPangkat,
    penerima_perintah_nrp: penyidikNrp,
    penerima_perintah_jabatan: penyidikJabatan,
    penerima_perintah_pangkat_nrp: penyidikPangkatNrp,
    kanit_nama: penyidikNama,
    kanit_pangkat: penyidikPangkat,
    kanit_nrp: penyidikNrp,
    kanit_jabatan: penyidikJabatan,
    kanit_pangkat_nrp: penyidikPangkatNrp,
    penyidik_pangkat_lengkap: penyidikPangkat,
    penyidik_1_pangkat_lengkap: toPangkatLengkap(penyidik1PangkatRaw),

    penyidik_penangan_nama: penanganNama,
    penyidik_penangan_pangkat: penanganPangkat,
    penyidik_penangan_nrp: penanganNrp,
    penyidik_penangan_jabatan: penanganJabatan,
    penyidik_penangan_pangkat_nrp: penanganPangkatNrp,

    penyidik_1_nama: penyidik1Nama,
    penyidik_1_pangkat: penyidik1PangkatSingkat,
    penyidik_1_nrp: penyidik1Nrp,
    penyidik_1_jabatan: penyidik1Jabatan,
    penyidik_1_pangkat_nrp: penyidik1PangkatNrp,

    penyidik_2_nama: penyidik2Nama,
    penyidik_2_pangkat: penyidik2PangkatSingkat,
    penyidik_2_nrp: penyidik2Nrp,
    penyidik_2_jabatan: penyidik2Jabatan,
    penyidik_2_pangkat_nrp: penyidik2PangkatNrp,

    penyidik_3_nama: penyidik3Nama,
    penyidik_3_pangkat: penyidik3PangkatSingkat,
    penyidik_3_nrp: penyidik3Nrp,
    penyidik_3_jabatan: penyidik3Jabatan,
    penyidik_3_pangkat_nrp: penyidik3PangkatNrp,

    penyidik_4_nama: penyidik4Nama,
    penyidik_4_pangkat: penyidik4PangkatSingkat,
    penyidik_4_nrp: penyidik4Nrp,
    penyidik_4_jabatan: penyidik4Jabatan,
    penyidik_4_pangkat_nrp: penyidik4PangkatNrp,

    penyidik_5_nama: penyidik5Nama,
    penyidik_5_pangkat: penyidik5PangkatSingkat,
    penyidik_5_nrp: penyidik5Nrp,
    penyidik_5_jabatan: penyidik5Jabatan,
    penyidik_5_pangkat_nrp: penyidik5PangkatNrp,

    tim_penyidik: timPenyidik,
    TIM_PENYIDIK: timPenyidik,
    petugas_list: timPenyidik,
    PETUGAS_LIST: timPenyidik,
    penyidik_list: timPenyidik,
    PENYIDIK_LIST: timPenyidik,
    investigators_list: timPenyidik,
    INVESTIGATORS_LIST: timPenyidik,

    // Legacy Aliases
    DOC_NO: effectiveNomorSurat || nomorSurat || '',
    doc_no: effectiveNomorSurat || nomorSurat || '',
    DOC_LOCATION: tempatSurat,
    doc_location: tempatSurat,
    DOC_DATE: tanggalSurat,
    doc_date: tanggalSurat,

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
          status_tersangka_label: s.status_tersangka_label || `Tersangka ${idx === 0 ? 'I' : idx === 1 ? 'II' : idx === 2 ? 'III' : idx === 3 ? 'IV' : idx + 1}`,
          urutan_tersangka: s.urutan_tersangka || (idx + 1),
          nomor_sp_tap: s.nomor_sp_tap || s.no_sp_tap_tsk || '',
          nomor_sp_tap_tsk: s.nomor_sp_tap || s.no_sp_tap_tsk || '',
          tanggal_sp_tap: formatTanggalIndonesia(s.tanggal_sp_tap || s.tgl_sp_tap_tsk || ''),
          tgl_sp_tap_tsk: formatTanggalIndonesia(s.tanggal_sp_tap || s.tgl_sp_tap_tsk || '')
        };
      }),

    terlapor_list: (() => {
      const fromSuspects = (Array.isArray(suspectsList) && suspectsList.length > 0 ? suspectsList : [])
        .filter((s) => s.status === 'terlapor');
      const fromCase = Array.isArray(activeCase?.terlapor_list) ? activeCase.terlapor_list : [];
      const combined = fromSuspects.length > 0 ? fromSuspects : fromCase;
      return combined.map((s, idx) => {
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
          kontak: s.kontak || s.phone || s.no_hp || ''
        };
      });
    })(),

    korban_list: (rawVictimsList.length > 0 ? rawVictimsList : (korbanNama ? [{
      nama: korbanNama,
      nik: korbanNik,
      jenis_kelamin: korbanJk,
      ttl: korbanTtl,
      umur: korbanUmur,
      pekerjaan: korbanKerja,
      kewarganegaraan: korbanWarga,
      pendidikan: korbanDidik,
      agama: korbanAgama,
      alamat: korbanAlamat,
    }] : [])).map((v, idx) => ({
      no: idx + 1,
      nama: v.nama || '',
      nik: v.nik || '',
      jenis_kelamin: v.jenis_kelamin || '',
      ttl: v.ttl || '',
      umur: v.umur ? (String(v.umur).includes('Tahun') ? String(v.umur) : `${v.umur} Tahun`) : '',
      pekerjaan: v.pekerjaan || '',
      kewarganegaraan: v.kewarganegaraan || 'Indonesia',
      pendidikan: v.pendidikan || '',
      agama: v.agama || '',
      alamat: v.alamat || ''
    }))
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
    baseMap[`TSK_${i}_STATUS_NIKAH`] = s.status_pernikahan || s.status_kawin || s.marital_status || '';
    baseMap[`tsk_${i}_status_nikah`] = s.status_pernikahan || s.status_kawin || s.marital_status || '';
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

  // Tag Mandiri Korban 1 s/d 5
  for (let i = 1; i <= 5; i++) {
    const v = rawVictimsList[i - 1] || (i === 1 && korbanNama ? {
      nama: korbanNama,
      nik: korbanNik,
      jenis_kelamin: korbanJk,
      ttl: korbanTtl,
      umur: korbanUmur,
      pekerjaan: korbanKerja,
      kewarganegaraan: korbanWarga,
      pendidikan: korbanDidik,
      agama: korbanAgama,
      alamat: korbanAlamat,
    } : {});
    const vUmur = v.umur ? (String(v.umur).includes('Tahun') ? String(v.umur) : `${v.umur} Tahun`) : '';

    baseMap[`KORBAN_${i}_NAMA`] = v.nama || '';
    baseMap[`korban_${i}_nama`] = v.nama || '';
    baseMap[`KORBAN_${i}_NIK`] = v.nik || '';
    baseMap[`korban_${i}_nik`] = v.nik || '';
    baseMap[`KORBAN_${i}_JK`] = v.jenis_kelamin || '';
    baseMap[`korban_${i}_jk`] = v.jenis_kelamin || '';
    baseMap[`KORBAN_${i}_JENIS_KELAMIN`] = v.jenis_kelamin || '';
    baseMap[`korban_${i}_jenis_kelamin`] = v.jenis_kelamin || '';
    baseMap[`KORBAN_${i}_TTL`] = v.ttl || '';
    baseMap[`korban_${i}_ttl`] = v.ttl || '';
    baseMap[`KORBAN_${i}_UMUR`] = vUmur;
    baseMap[`korban_${i}_umur`] = vUmur;
    baseMap[`KORBAN_${i}_KERJA`] = v.pekerjaan || '';
    baseMap[`korban_${i}_kerja`] = v.pekerjaan || '';
    baseMap[`KORBAN_${i}_PEKERJAAN`] = v.pekerjaan || '';
    baseMap[`korban_${i}_pekerjaan`] = v.pekerjaan || '';
    baseMap[`KORBAN_${i}_WARGA`] = v.kewarganegaraan || (v.nama ? 'Indonesia' : '');
    baseMap[`korban_${i}_warga`] = v.kewarganegaraan || (v.nama ? 'Indonesia' : '');
    baseMap[`KORBAN_${i}_KEWARGANEGARAAN`] = v.kewarganegaraan || (v.nama ? 'Indonesia' : '');
    baseMap[`korban_${i}_kewarganegaraan`] = v.kewarganegaraan || (v.nama ? 'Indonesia' : '');
    baseMap[`KORBAN_${i}_DIDIK`] = v.pendidikan || '';
    baseMap[`korban_${i}_didik`] = v.pendidikan || '';
    baseMap[`KORBAN_${i}_PENDIDIKAN`] = v.pendidikan || '';
    baseMap[`korban_${i}_pendidikan`] = v.pendidikan || '';
    baseMap[`KORBAN_${i}_AGAMA`] = v.agama || '';
    baseMap[`korban_${i}_agama`] = v.agama || '';
    baseMap[`KORBAN_${i}_ALAMAT`] = v.alamat || '';
    baseMap[`korban_${i}_alamat`] = v.alamat || '';
  }

  // Timpa dengan custom field manual form dinamis HANYA jika terisi (Anti Empty-String Overwrite via mergeChainedWithForm)
  const finalPayload = mergeChainedWithForm(baseMap, cleanInput, { formatDatesForDocx: true });

  // Pastikan variabel tanggal surat utama aktif tetap terformat teks resmi
  finalPayload.TANGGAL_SURAT = tanggalSurat;
  finalPayload.tanggal_surat = tanggalSurat;
  finalPayload.DOC_DATE = tanggalSurat;
  finalPayload.doc_date = tanggalSurat;

  // Sisipkan tag header baru tanpa menimpa tag yang sudah ada (Universal Header Naskah Dinas)
  if (effectiveNomorSurat) {
    finalPayload.NOMOR_SURAT = effectiveNomorSurat;
    finalPayload.nomor_surat = effectiveNomorSurat;
    finalPayload.DOC_NO = effectiveNomorSurat;
    finalPayload.doc_no = effectiveNomorSurat;
    if (isSpTap) {
      finalPayload.NOMOR_SP_TAP = effectiveNomorSurat;
      finalPayload.nomor_sp_tap = effectiveNomorSurat;
      finalPayload.NO_SP_TAP_TSK = effectiveNomorSurat;
      finalPayload.no_sp_tap_tsk = effectiveNomorSurat;
      finalPayload.NOMOR_SP_TAP_TSK = effectiveNomorSurat;
      finalPayload.nomor_sp_tap_tsk = effectiveNomorSurat;
    }
  }

  const finalNomorSurat = effectiveNomorSurat || finalPayload.NOMOR_SURAT || nomorSurat || '';
  finalPayload.NOMOR_SURAT = finalNomorSurat;
  finalPayload.nomor_surat = finalNomorSurat;
  finalPayload.NO_SURAT = finalNomorSurat;
  finalPayload.no_surat = finalNomorSurat;
  finalPayload.DOC_NO = finalNomorSurat;
  finalPayload.doc_no = finalNomorSurat;
  finalPayload.NOMOR_SURAT_HEADER = formatNomorSuratHeader(finalNomorSurat);
  finalPayload.nomor_surat_header = finalPayload.NOMOR_SURAT_HEADER;

  // Pastikan alias nomor milik dokumen aktif (misal NOMOR_SPGAS_SIDIK / NO_SPRIN_GAS_SIDIK / NOMOR_<K>)
  // ikut mencerminkan nomor surat aktif saat dokumen itu sendiri sedang di-generate
  if (finalNomorSurat && canonicalTplCode && canonicalTplCode !== 'MINDIK') {
    const kLower = canonicalTplCode.toLowerCase();
    finalPayload[`NOMOR_${canonicalTplCode}`] = finalNomorSurat;
    finalPayload[`nomor_${kLower}`] = finalNomorSurat;
    finalPayload[`NO_${canonicalTplCode}`] = finalNomorSurat;
    finalPayload[`no_${kLower}`] = finalNomorSurat;
    if (isSprinGasSidikDoc) {
      finalPayload.NOMOR_SPGAS_SIDIK = finalNomorSurat;
      finalPayload.nomor_spgas_sidik = finalNomorSurat;
      finalPayload.NO_SPGAS_SIDIK = finalNomorSurat;
      finalPayload.no_spgas_sidik = finalNomorSurat;
      finalPayload.NOMOR_SPRIN_GAS_SIDIK = finalNomorSurat;
      finalPayload.nomor_sprin_gas_sidik = finalNomorSurat;
      finalPayload.NO_SPRIN_GAS_SIDIK = finalNomorSurat;
      finalPayload.no_sprin_gas_sidik = finalNomorSurat;
      finalPayload.NO_SP_GAS_SIDIK = finalNomorSurat;
      finalPayload.no_sp_gas_sidik = finalNomorSurat;
    }
  }

  finalPayload.TANGGAL_SURAT_HEADER = formatTanggalSuratHeader(finalPayload.TANGGAL_SURAT || tanggalSurat);
  finalPayload.tanggal_surat_header = finalPayload.TANGGAL_SURAT_HEADER;

  // 1. Pangkat Atasan
  const atasanPangkatRawFinal = activeCase?.atasan_pangkat || activeCase?.kasat_pangkat || finalPayload.ATASAN_PANGKAT || '';
  finalPayload.ATASAN_PANGKAT = atasanPangkatRawFinal.trim();
  finalPayload.atasan_pangkat = finalPayload.ATASAN_PANGKAT;

  // 2. Penyidik Penangan Perkara (Pangkat Singkat Baku untuk Bukti Penyerahan Surat)
  const penanganFinal = getPenyidikPenangan(activeCase) || activeCase?.penyidik_1 || {
    nama: finalPayload.PENYIDIK_1_NAMA || finalPayload.PENYIDIK_NAMA || '',
    pangkat: finalPayload.PENYIDIK_1_PANGKAT || finalPayload.PENYIDIK_PANGKAT || '',
    nrp: finalPayload.PENYIDIK_1_NRP || finalPayload.PENYIDIK_NRP || '',
    jabatan: finalPayload.PENYIDIK_1_JABATAN || finalPayload.PENYIDIK_JABATAN || ''
  };

  finalPayload.PENYIDIK_PENANGAN_NAMA = finalPayload.PENYIDIK_PENANGAN_NAMA || penanganFinal?.nama || '';
  finalPayload.penyidik_penangan_nama = finalPayload.PENYIDIK_PENANGAN_NAMA;

  const penanganPangkatRawFinal = finalPayload.PENYIDIK_PENANGAN_PANGKAT || penanganFinal?.pangkat || '';
  finalPayload.PENYIDIK_PENANGAN_PANGKAT = (toPangkatSingkat(penanganPangkatRawFinal) || penanganPangkatRawFinal).trim();
  finalPayload.penyidik_penangan_pangkat = finalPayload.PENYIDIK_PENANGAN_PANGKAT;

  finalPayload.PENYIDIK_PENANGAN_NRP = finalPayload.PENYIDIK_PENANGAN_NRP || penanganFinal?.nrp || '';
  finalPayload.penyidik_penangan_nrp = finalPayload.PENYIDIK_PENANGAN_NRP;

  finalPayload.PENYIDIK_PENANGAN_JABATAN = finalPayload.PENYIDIK_PENANGAN_JABATAN || penanganFinal?.jabatan || '';
  finalPayload.penyidik_penangan_jabatan = finalPayload.PENYIDIK_PENANGAN_JABATAN;

  const finalPenanganPktNrp = finalPayload.PENYIDIK_PENANGAN_PANGKAT && finalPayload.PENYIDIK_PENANGAN_NRP
    ? `${finalPayload.PENYIDIK_PENANGAN_PANGKAT} / ${finalPayload.PENYIDIK_PENANGAN_NRP}`
    : (finalPayload.PENYIDIK_PENANGAN_PANGKAT || finalPayload.PENYIDIK_PENANGAN_NRP || '');
  finalPayload.PENYIDIK_PENANGAN_PANGKAT_NRP = finalPenanganPktNrp;
  finalPayload.penyidik_penangan_pangkat_nrp = finalPenanganPktNrp;

  // 3. Pangkat Penandatangan Sisi Kiri: Yang Menerima Perintah / Kanit (Pangkat Singkat Baku)
  const penyidikPangkatRawFinal = cleanInput.PENYIDIK_PANGKAT || cleanInput.penyidik_pangkat || activeCase?.penyidik_pangkat || activeCase?.penyidik_1_pangkat || '';
  finalPayload.PENYIDIK_PANGKAT = (toPangkatSingkat(penyidikPangkatRawFinal) || penyidikPangkatRawFinal).trim();
  finalPayload.penyidik_pangkat = finalPayload.PENYIDIK_PANGKAT;

  // JANGAN MEMUTASI PENYIDIK_1_PANGKAT MENJADI LENGKAP!
  // Personel 1 s.d. 5 di bagian daftar tugas "DIPERINTAHKAN Kepada" WAJIB pangkat singkat (AIPDA, BRIPKA, dll.)
  const penyidik1PangkatRawFinal = cleanInput.PENYIDIK_1_PANGKAT || cleanInput.penyidik_1_pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRawFinal || '';
  finalPayload.PENYIDIK_1_PANGKAT = (toPangkatSingkat(penyidik1PangkatRawFinal) || penyidik1PangkatRawFinal).trim();
  finalPayload.penyidik_1_pangkat = finalPayload.PENYIDIK_1_PANGKAT;

  // Pemetaan seragam untuk Penandatangan Sisi Kiri (Yang Menerima Perintah / Kanit / P1)
  finalPayload.YANG_MENERIMA_PERINTAH_NAMA = finalPayload.PENYIDIK_NAMA || finalPayload.PENYIDIK_1_NAMA || '';
  finalPayload.yang_menerima_perintah_nama = finalPayload.YANG_MENERIMA_PERINTAH_NAMA;
  finalPayload.YANG_MENERIMA_PERINTAH_PANGKAT = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.yang_menerima_perintah_pangkat = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.YANG_MENERIMA_PERINTAH_NRP = finalPayload.PENYIDIK_NRP || finalPayload.PENYIDIK_1_NRP || '';
  finalPayload.yang_menerima_perintah_nrp = finalPayload.YANG_MENERIMA_PERINTAH_NRP;
  finalPayload.YANG_MENERIMA_PERINTAH_JABATAN = finalPayload.PENYIDIK_JABATAN || finalPayload.PENYIDIK_1_JABATAN || '';
  finalPayload.yang_menerima_perintah_jabatan = finalPayload.YANG_MENERIMA_PERINTAH_JABATAN;

  finalPayload.PENERIMA_PERINTAH_NAMA = finalPayload.YANG_MENERIMA_PERINTAH_NAMA;
  finalPayload.penerima_perintah_nama = finalPayload.YANG_MENERIMA_PERINTAH_NAMA;
  finalPayload.PENERIMA_PERINTAH_PANGKAT = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.penerima_perintah_pangkat = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.PENERIMA_PERINTAH_NRP = finalPayload.YANG_MENERIMA_PERINTAH_NRP;
  finalPayload.penerima_perintah_nrp = finalPayload.YANG_MENERIMA_PERINTAH_NRP;
  finalPayload.PENERIMA_PERINTAH_JABATAN = finalPayload.YANG_MENERIMA_PERINTAH_JABATAN;
  finalPayload.penerima_perintah_jabatan = finalPayload.YANG_MENERIMA_PERINTAH_JABATAN;

  finalPayload.KANIT_NAMA = finalPayload.YANG_MENERIMA_PERINTAH_NAMA;
  finalPayload.kanit_nama = finalPayload.YANG_MENERIMA_PERINTAH_NAMA;
  finalPayload.KANIT_PANGKAT = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.kanit_pangkat = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.KANIT_NRP = finalPayload.YANG_MENERIMA_PERINTAH_NRP;
  finalPayload.kanit_nrp = finalPayload.YANG_MENERIMA_PERINTAH_NRP;
  finalPayload.KANIT_JABATAN = finalPayload.YANG_MENERIMA_PERINTAH_JABATAN;
  finalPayload.kanit_jabatan = finalPayload.YANG_MENERIMA_PERINTAH_JABATAN;

  finalPayload.PENYIDIK_PANGKAT_LENGKAP = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.penyidik_pangkat_lengkap = finalPayload.PENYIDIK_PANGKAT;
  finalPayload.PENYIDIK_1_PANGKAT_LENGKAP = finalPayload.PENYIDIK_1_PANGKAT;
  finalPayload.penyidik_1_pangkat_lengkap = finalPayload.PENYIDIK_1_PANGKAT;

  // Format Pangkat / NRP untuk Penandatangan Tanda Tangan Bawah
  const finalPenyidikPktNrp = finalPayload.PENYIDIK_PANGKAT && (finalPayload.PENYIDIK_NRP || activeCase?.penyidik_1_nrp)
    ? `${finalPayload.PENYIDIK_PANGKAT} / ${finalPayload.PENYIDIK_NRP || activeCase?.penyidik_1_nrp}`
    : (finalPayload.PENYIDIK_PANGKAT || finalPayload.PENYIDIK_NRP || activeCase?.penyidik_1_nrp || '');
  finalPayload.PENYIDIK_PANGKAT_NRP = finalPenyidikPktNrp;
  finalPayload.penyidik_pangkat_nrp = finalPenyidikPktNrp;
  finalPayload.YANG_MENERIMA_PERINTAH_PANGKAT_NRP = finalPenyidikPktNrp;
  finalPayload.yang_menerima_perintah_pangkat_nrp = finalPenyidikPktNrp;
  finalPayload.PENERIMA_PERINTAH_PANGKAT_NRP = finalPenyidikPktNrp;
  finalPayload.penerima_perintah_pangkat_nrp = finalPenyidikPktNrp;
  finalPayload.KANIT_PANGKAT_NRP = finalPenyidikPktNrp;
  finalPayload.kanit_pangkat_nrp = finalPenyidikPktNrp;

  // Format Pangkat / NRP untuk Personel 1 di Batang Tubuh / "DIPERINTAHKAN Kepada : 1." (PANGKAT SINGKAT!)
  const p1Nrp = finalPayload.PENYIDIK_1_NRP || activeCase?.penyidik_1_nrp || '';
  const finalP1PktNrp = finalPayload.PENYIDIK_1_PANGKAT && p1Nrp
    ? `${finalPayload.PENYIDIK_1_PANGKAT} / ${p1Nrp}`
    : (finalPayload.PENYIDIK_1_PANGKAT || p1Nrp || '');
  finalPayload.PENYIDIK_1_PANGKAT_NRP = finalP1PktNrp;
  finalPayload.penyidik_1_pangkat_nrp = finalP1PktNrp;

  // Format Pangkat / NRP untuk Kasat / Atasan
  const finalAtasanPktNrp = finalPayload.ATASAN_PANGKAT && (finalPayload.ATASAN_NRP || activeCase?.kasat_nrp)
    ? `${finalPayload.ATASAN_PANGKAT} / ${finalPayload.ATASAN_NRP || activeCase?.kasat_nrp}`
    : (finalPayload.ATASAN_PANGKAT || finalPayload.ATASAN_NRP || activeCase?.kasat_nrp || '');
  finalPayload.ATASAN_PANGKAT_NRP = finalAtasanPktNrp;
  finalPayload.atasan_pangkat_nrp = finalAtasanPktNrp;

  // 4. Daftar Personel Tim di Batang Tubuh / Tabel Tugas (Loop Array) - Tetap Pangkat Singkat Sesuai Ketentuan Naskah Dinas
  const normalizeTimArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(p => {
      const pSingkat = toPangkatSingkat(p.pangkat_singkat || p.pangkat || '');
      const pLengkap = toPangkatLengkap(p.pangkat_lengkap || p.pangkat || '');
      return {
        ...p,
        pangkat: pSingkat, // WAJIB Pangkat Singkat untuk perulangan tabel tugas ("Kepada : 1..5")
        pangkat_singkat: pSingkat,
        pangkat_lengkap: pLengkap,
        pangkat_nrp: p.nrp ? `${pSingkat} / ${p.nrp}` : pSingkat
      };
    });
  };

  if (Array.isArray(finalPayload.tim_penyidik)) {
    const normalizedTim = normalizeTimArray(finalPayload.tim_penyidik);
    finalPayload.tim_penyidik = normalizedTim;
    finalPayload.TIM_PENYIDIK = normalizedTim;
    finalPayload.penyidik_list = normalizedTim;
    finalPayload.PENYIDIK_LIST = normalizedTim;
    finalPayload.petugas_list = normalizedTim;
    finalPayload.PETUGAS_LIST = normalizedTim;
    finalPayload.investigators_list = normalizedTim;
    finalPayload.INVESTIGATORS_LIST = normalizedTim;
  }

  // Pastikan rantai rujukan mandiri (Chain of Reference) selalu terformat teks resmi
  finalPayload.TANGGAL_LP = tanggalLp;
  finalPayload.tanggal_lp = tanggalLp;
  finalPayload.TGL_LP = tanggalLp;
  finalPayload.tgl_lp = tanggalLp;

  finalPayload.TGL_SPRIN_SIDIK = tglSprinSidik;
  finalPayload.tgl_sprin_sidik = tglSprinSidik;
  finalPayload.TANGGAL_SPRIN_SIDIK = tglSprinSidik;
  finalPayload.tanggal_sprin_sidik = tglSprinSidik;

  finalPayload.NO_SPRIN_GAS_SIDIK = finalPayload.NO_SPRIN_GAS_SIDIK || noSprinGasSidik;
  finalPayload.no_sprin_gas_sidik = finalPayload.no_sprin_gas_sidik || noSprinGasSidik;
  finalPayload.TGL_SPRIN_GAS_SIDIK = tglSprinGasSidik;
  finalPayload.tgl_sprin_gas_sidik = tglSprinGasSidik;
  finalPayload.TANGGAL_SPRIN_GAS_SIDIK = tglSprinGasSidik;
  finalPayload.tanggal_sprin_gas_sidik = tglSprinGasSidik;

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

  // Penegasan Tag Khusus Penangkapan (Huruf Besar & Kecil)
  finalPayload.HARI_KAP = hariKap;
  finalPayload.hari_kap = hariKap;
  finalPayload.TANGGAL_KAP = tglKap;
  finalPayload.tanggal_kap = tglKap;
  finalPayload.BULAN_KAP = bulanKap;
  finalPayload.bulan_kap = bulanKap;
  finalPayload.TAHUN_KAP = tahunKap;
  finalPayload.tahun_kap = tahunKap;
  finalPayload.TERBILANG_TAHUN_KAP = terbilangTahunKap;
  finalPayload.terbilang_tahun_kap = terbilangTahunKap;
  finalPayload.JAM_KAP = jamKap;
  finalPayload.jam_kap = jamKap;
  finalPayload.TEMPAT_KAP = tempatKap;
  finalPayload.tempat_kap = tempatKap;

  // Penegasan Tag Khusus Sprin Penahanan (Huruf Besar & Kecil)
  finalPayload.TANGGAL_MULAI_HAN = tglMulaiHanFormatted;
  finalPayload.tanggal_mulai_han = tglMulaiHanFormatted;
  finalPayload.TANGGAL_AKHIR_HAN = tglAkhirHanFormatted;
  finalPayload.tanggal_akhir_han = tglAkhirHanFormatted;
  finalPayload.TEMPAT_HAN = tempatHan;
  finalPayload.tempat_han = tempatHan;

  // Penegasan Tag Khusus BA Penahanan (Huruf Besar & Kecil)
  finalPayload.HARI_HAN = hariHan;
  finalPayload.hari_han = hariHan;
  finalPayload.TANGGAL_HAN = tglHan;
  finalPayload.tanggal_han = tglHan;
  finalPayload.BULAN_HAN = bulanHan;
  finalPayload.bulan_han = bulanHan;
  finalPayload.TAHUN_HAN = tahunHan;
  finalPayload.tahun_han = tahunHan;
  finalPayload.TERBILANG_TAHUN_HAN = terbilangTahunHan;
  finalPayload.terbilang_tahun_han = terbilangTahunHan;
  finalPayload.JAM_HAN = jamHan;
  finalPayload.jam_han = jamHan;

  // D. TAG RANTAI BERKAS PERKARA (SAMPUL BP, PENGANTAR TAHAP 1, PENGANTAR KEMBALI P-19, TAHAP 2)
  const isSampulBp = tplCode === 'SAMPUL_BERKAS_PERKARA' || tplCode === 'SAMPUL_BP' || tplName.includes('sampul berkas perkara');
  const isPengantarTahap1 = tplCode === 'PENGANTAR_BP_TAHAP1' || tplCode === 'PENGANTAR_TAHAP_1' || tplCode === 'PENGANTAR_TAHAP1';
  const isPengantarP19 = tplCode === 'PENGANTAR_BP_KEMBALI_P19' || tplCode === 'PENGANTAR_P19' || tplCode === 'PENGANTAR_KEMBALI_P19';
  const isPengantarTahap2 = tplCode === 'PENGANTAR_TAHAP2' || tplCode === 'PENGANTAR_TAHAP_2';

  // 1. Sampul Berkas Perkara -> alias {NOMOR_BERKAS_PERKARA}
  const nomorBerkasPerkara = (isSampulBp && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (cleanInput.NOMOR_BERKAS_PERKARA || cleanInput.nomor_berkas_perkara || cleanInput.NO_BERKAS_PERKARA || cleanInput.no_berkas_perkara || activeCase?.nomor_berkas_perkara || activeCase?.no_berkas_perkara || activeCase?.no_bp || '');

  // 2. Pengantar BP Tahap I -> alias {NOMOR_PENGANTAR_TAHAP_1}
  const nomorPengantarTahap1 = (isPengantarTahap1 && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (cleanInput.NOMOR_PENGANTAR_TAHAP_1 || cleanInput.nomor_pengantar_tahap_1 || cleanInput.NOMOR_PENGANTAR_TAHAP1 || cleanInput.nomor_pengantar_tahap1 || activeCase?.nomor_pengantar_tahap_1 || activeCase?.no_pengantar_tahap_1 || '');

  // 3. Pengantar BP Kembali P-19 -> alias {NOMOR_PENGANTAR_KEMBALI_P19}
  const nomorPengantarKembaliP19 = (isPengantarP19 && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (cleanInput.NOMOR_PENGANTAR_KEMBALI_P19 || cleanInput.nomor_pengantar_kembali_p19 || cleanInput.NOMOR_PENGANTAR_P19 || cleanInput.nomor_pengantar_p19 || activeCase?.nomor_pengantar_kembali_p19 || activeCase?.no_pengantar_kembali_p19 || '');

  // 4. Pengantar Tahap II -> alias {NOMOR_PENGANTAR_TAHAP_2}
  const nomorPengantarTahap2 = (isPengantarTahap2 && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (cleanInput.NOMOR_PENGANTAR_TAHAP_2 || cleanInput.nomor_pengantar_tahap_2 || cleanInput.NOMOR_PENGANTAR_TAHAP2 || cleanInput.nomor_pengantar_tahap2 || activeCase?.nomor_pengantar_tahap_2 || activeCase?.no_pengantar_tahap_2 || '');

  // Registrasi Tag Rantai Berkas Perkara ke Payload
  finalPayload.NOMOR_BERKAS_PERKARA = nomorBerkasPerkara;
  finalPayload.nomor_berkas_perkara = nomorBerkasPerkara;
  finalPayload.NO_BERKAS_PERKARA = nomorBerkasPerkara;
  finalPayload.no_berkas_perkara = nomorBerkasPerkara;

  finalPayload.NOMOR_PENGANTAR_TAHAP_1 = nomorPengantarTahap1;
  finalPayload.nomor_pengantar_tahap_1 = nomorPengantarTahap1;
  finalPayload.NOMOR_PENGANTAR_TAHAP1 = nomorPengantarTahap1;
  finalPayload.nomor_pengantar_tahap1 = nomorPengantarTahap1;

  finalPayload.NOMOR_PENGANTAR_KEMBALI_P19 = nomorPengantarKembaliP19;
  finalPayload.nomor_pengantar_kembali_p19 = nomorPengantarKembaliP19;
  finalPayload.NOMOR_PENGANTAR_P19 = nomorPengantarKembaliP19;
  finalPayload.nomor_pengantar_p19 = nomorPengantarKembaliP19;

  finalPayload.NOMOR_PENGANTAR_TAHAP_2 = nomorPengantarTahap2;
  finalPayload.nomor_pengantar_tahap_2 = nomorPengantarTahap2;
  finalPayload.NOMOR_PENGANTAR_TAHAP2 = nomorPengantarTahap2;
  finalPayload.nomor_pengantar_tahap2 = nomorPengantarTahap2;

  // Uraian Perkara Sampul BP
  if (!finalPayload.URAIAN_PERKARA) {
    finalPayload.URAIAN_PERKARA = cleanInput.URAIAN_PERKARA || activeCase?.uraian_singkat || activeCase?.uraian_kejadian || 'Telah terjadi dugaan Tindak Pidana …........';
    finalPayload.uraian_perkara = finalPayload.URAIAN_PERKARA;
  }

  // E. OTOMATISASI TERBILANG TAHUN UNTUK SEMUA TAG TAHUN ({TERBILANG_TAHUN_*})
  // Mempertahankan helper terbilangAngka(tahun). Misal tahun diisi 2026 -> "dua ribu dua puluh enam"
  Object.keys(finalPayload).forEach((key) => {
    const upperKey = key.toUpperCase();
    if (upperKey === 'TAHUN' || upperKey.startsWith('TAHUN_') || upperKey.endsWith('_TAHUN')) {
      const yearVal = finalPayload[key];
      if (yearVal) {
        const terbilangStr = terbilangTahun(yearVal);
        if (terbilangStr) {
          let terbilangKey = '';
          if (upperKey === 'TAHUN') {
            terbilangKey = 'TERBILANG_TAHUN';
          } else if (upperKey.startsWith('TAHUN_')) {
            terbilangKey = `TERBILANG_${upperKey}`;
          } else if (upperKey.endsWith('_TAHUN')) {
            terbilangKey = `TERBILANG_${upperKey}`;
          }

          if (terbilangKey && !finalPayload[terbilangKey]) {
            finalPayload[terbilangKey] = terbilangStr;
            finalPayload[terbilangKey.toLowerCase()] = terbilangStr;
          }
        }
      }
    }
  });

  // Default umum TERBILANG_TAHUN jika belum diset
  if (!finalPayload.TERBILANG_TAHUN) {
    const yr = finalPayload.TAHUN_SURAT || finalPayload.TAHUN_BA || (tanggalSurat ? parseDateParts(tanggalSurat).tahun : '') || '2026';
    finalPayload.TERBILANG_TAHUN = terbilangTahun(yr) || 'dua ribu dua puluh enam';
    finalPayload.terbilang_tahun = finalPayload.TERBILANG_TAHUN;
  }

  // ==============================================================
  // INJEKSI ABSOLUT: SPDP MULTI-TERSANGKA (Bypass State Frontend)
  // ==============================================================
  const isSpdpMultiDoc = tplCode === 'SPDP_MORE_1_TSK' || (selectedTemplate && (selectedTemplate.title || selectedTemplate.name || '').toUpperCase().includes('LEBIH DARI 1 TERSANGKA'));

  if (isSpdpMultiDoc && Array.isArray(suspectsList) && suspectsList.length > 0) {
    const sahSuspects = suspectsList.filter(s => s && s.nama);

    for (let i = 1; i <= 5; i++) {
      const s = sahSuspects[i - 1];
      if (s) {
        // Tarik semua alias untuk Nomor & Tanggal SP.Tap
        finalPayload[`TSK_${i}_NOMOR_SP_TAP`] = s.nomor_sp_tap || s.no_sp_tap_tsk || s.no_sp_tap || s.nomor_sptap || s.no_sptap_tsk || '-';
        
        const rawTglSpTap = s.tanggal_sp_tap || s.tgl_sp_tap_tsk || s.tgl_sp_tap || s.tanggal_sptap || s.tgl_sptap_tsk;
        finalPayload[`TSK_${i}_TGL_SP_TAP`] = rawTglSpTap ? formatTanggalIndonesia(rawTglSpTap) : '-';

        finalPayload[`TSK_${i}_NAMA`] = s.nama || '-';
        finalPayload[`TSK_${i}_NIK`] = s.nik || s.no_identitas || '-';
        finalPayload[`TSK_${i}_KEWARGANEGARAAN`] = s.kewarganegaraan || 'Indonesia';
        finalPayload[`TSK_${i}_JK`] = s.jenis_kelamin || s.jk || '-';
        finalPayload[`TSK_${i}_TTL`] = (s.tempat_lahir || s.tgl_lahir) ? `${s.tempat_lahir || ''}, ${s.tgl_lahir || ''}` : '-';
        finalPayload[`TSK_${i}_UMUR`] = s.umur ? `${s.umur}` : '-';
        finalPayload[`TSK_${i}_PEKERJAAN`] = s.pekerjaan || '-';
        finalPayload[`TSK_${i}_PENDIDIKAN`] = s.pendidikan || '-';
        finalPayload[`TSK_${i}_AGAMA`] = s.agama || '-';
        finalPayload[`TSK_${i}_STATUS_NIKAH`] = s.status_nikah || s.status_pernikahan || '-';
        finalPayload[`TSK_${i}_ALAMAT`] = s.alamat || '-';
      } else {
        // Kosongkan sisa slot tersangka agar tag di dokumen Word terhapus bersih
        finalPayload[`TSK_${i}_NOMOR_SP_TAP`] = '';
        finalPayload[`TSK_${i}_TGL_SP_TAP`] = '';
        finalPayload[`TSK_${i}_NAMA`] = '';
        finalPayload[`TSK_${i}_NIK`] = '';
        finalPayload[`TSK_${i}_KEWARGANEGARAAN`] = '';
        finalPayload[`TSK_${i}_JK`] = '';
        finalPayload[`TSK_${i}_TTL`] = '';
        finalPayload[`TSK_${i}_UMUR`] = '';
        finalPayload[`TSK_${i}_PEKERJAAN`] = '';
        finalPayload[`TSK_${i}_PENDIDIKAN`] = '';
        finalPayload[`TSK_${i}_AGAMA`] = '';
        finalPayload[`TSK_${i}_STATUS_NIKAH`] = '';
        finalPayload[`TSK_${i}_ALAMAT`] = '';
      }
      
      // Daftarkan format huruf kecil (lowercase) agar mesin docxtemplater aman
      const currentKeys = Object.keys(finalPayload).filter(k => k.startsWith(`TSK_${i}_`));
      currentKeys.forEach(k => { 
        finalPayload[k.toLowerCase()] = finalPayload[k]; 
      });
    }
  }
  // ==============================================================

  // ==============================================================
  // PENEGASAN MUTLAK TANGGAL SURAT AKTIF (SINGLE SOURCE OF TRUTH)
  // Memastikan activeFormValues.TANGGAL_SURAT / docDate menimpa seluruh alias
  // tanggal surat aktif & alias tanggal milik template yang sedang aktif.
  // ==============================================================
  const formattedHeaderDate = formatTanggalSuratHeader(tanggalSurat);
  [
    'TANGGAL_SURAT', 'tanggal_surat',
    'TGL_SURAT', 'tgl_surat',
    'DOC_DATE', 'doc_date',
    'TANGGAL_NASKAH', 'tanggal_naskah',
    'TANGGAL_DOKUMEN', 'tanggal_dokumen'
  ].forEach((k) => {
    finalPayload[k] = tanggalSurat;
  });
  finalPayload.TANGGAL_SURAT_HEADER = formattedHeaderDate;
  finalPayload.tanggal_surat_header = formattedHeaderDate;

  if (parsedActiveDate?.hari) {
    finalPayload.HARI_SURAT = parsedActiveDate.hari;
    finalPayload.hari_surat = parsedActiveDate.hari;
  }
  if (parsedActiveDate?.bulan) {
    finalPayload.BULAN_SURAT = parsedActiveDate.bulan;
    finalPayload.bulan_surat = parsedActiveDate.bulan;
  }
  if (parsedActiveDate?.tahun) {
    finalPayload.TAHUN_SURAT = parsedActiveDate.tahun;
    finalPayload.tahun_surat = parsedActiveDate.tahun;
  }

  // Alias tanggal milik dokumen/template yang sedang aktif (bukan arsip lama)
  if (canonicalTplCode && canonicalTplCode !== 'MINDIK') {
    const kLower = canonicalTplCode.toLowerCase();
    finalPayload[`TANGGAL_${canonicalTplCode}`] = tanggalSurat;
    finalPayload[`tanggal_${kLower}`] = tanggalSurat;
    finalPayload[`TGL_${canonicalTplCode}`] = tanggalSurat;
    finalPayload[`tgl_${kLower}`] = tanggalSurat;
    finalPayload[`${canonicalTplCode}_TANGGAL`] = tanggalSurat;
    finalPayload[`${kLower}_tanggal`] = tanggalSurat;
    finalPayload[`${canonicalTplCode}_TGL`] = tanggalSurat;
    finalPayload[`${kLower}_tgl`] = tanggalSurat;
  }
  if (canonicalTplCode.startsWith('SPDP') || canonicalTplCode === 'PENGIRIMAN_KEMBALI_SPDP_P20') {
    [
      'TANGGAL_SPDP', 'tanggal_spdp',
      'TGL_SPDP', 'tgl_spdp',
      'SPDP_TANGGAL', 'spdp_tanggal',
      'SPDP_TGL', 'spdp_tgl'
    ].forEach((k) => {
      finalPayload[k] = tanggalSurat;
    });
  } else if (isSprinSidikDoc) {
    [
      'TANGGAL_SPRIN_SIDIK', 'tanggal_sprin_sidik',
      'TGL_SPRIN_SIDIK', 'tgl_sprin_sidik',
      'TANGGAL_SP_SIDIK', 'tanggal_sp_sidik',
      'TGL_SP_SIDIK', 'tgl_sp_sidik'
    ].forEach((k) => {
      finalPayload[k] = tanggalSurat;
    });
  } else if (isSprinGasSidikDoc) {
    [
      'TANGGAL_SPRIN_GAS_SIDIK', 'tanggal_sprin_gas_sidik',
      'TGL_SPRIN_GAS_SIDIK', 'tgl_sprin_gas_sidik',
      'TANGGAL_SPGAS_SIDIK', 'tanggal_spgas_sidik',
      'TGL_SPGAS_SIDIK', 'tgl_spgas_sidik',
      'TANGGAL_SP_GAS_SIDIK', 'tanggal_sp_gas_sidik',
      'TGL_SP_GAS_SIDIK', 'tgl_sp_gas_sidik'
    ].forEach((k) => {
      finalPayload[k] = tanggalSurat;
    });
  } else if (isSpTap) {
    [
      'TANGGAL_TAP_TSK', 'tanggal_tap_tsk',
      'TGL_TAP_TSK', 'tgl_tap_tsk',
      'TANGGAL_SP_TAP_TSK', 'tanggal_sp_tap_tsk',
      'TGL_SP_TAP_TSK', 'tgl_sp_tap_tsk',
      'TANGGAL_SP_TAP', 'tanggal_sp_tap',
      'TGL_SP_TAP', 'tgl_sp_tap',
      'TANGGAL_PENETAPAN', 'tanggal_penetapan'
    ].forEach((k) => {
      finalPayload[k] = tanggalSurat;
    });
  }

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
  const template = options.template || options.selectedTemplate || lpData.template || null;
  const activeVictim = options.activeVictim || options.selectedVictim || lpData.activeVictim || lpData.victims?.[0] || lpData.references?.victims?.[0] || null;
  const victimsList = options.victimsList || lpData.victimsList || lpData.victims || lpData.references?.victims || [];
  const docDate = options.docDate || '';

  return buildMindikPayload({
    activeCase,
    activeSuspect,
    suspectsList,
    activeVictim,
    victimsList,
    formValues,
    template,
    docDate
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
  suspectsList = [],
  activeVictim,
  victimsList = [],
  formValues = {},
  docDate = '',
  personnelList = []
}) {
  if (!template) {
    throw new Error('Template dokumen belum dipilih.');
  }
  const currentCase = activeCase || caseData;
  if (!currentCase) {
    throw new Error('Data berkas perkara belum dipilih.');
  }

  const docxRes = await generateDocxBlob({
    template,
    caseData: currentCase,
    activeCase: currentCase,
    activeSuspect,
    suspectsList,
    activeVictim,
    victimsList,
    formValues,
    docDate,
    personnelList
  });

  if (!docxRes.hasPhysicalFile || !docxRes.blob) {
    throw new Error(docxRes.message || `Template '${template.title}' belum memiliki file .docx di Supabase Storage. Silakan upload file fisik di Template Studio.`);
  }

  // 7. Save file to client
  saveAs(docxRes.blob, docxRes.filename);

  return {
    success: true,
    filename: docxRes.filename,
    blob: docxRes.blob,
    dataMap: docxRes.dataMap
  };
}

/**
 * Generate processed .docx Blob directly from Supabase Storage with dynamic data injected.
 * Used by docx-preview to render the document in its native Word layout and for direct .docx download.
 */
export async function generateDocxBlob({
  template,
  caseData,
  activeCase,
  activeSuspect,
  suspectsList = [],
  activeVictim,
  victimsList = [],
  formValues = {},
  docDate = '',
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

  // Normalisasi input tanggal surat aktif agar key lowercase/stale tidak pernah menimpa TANGGAL_SURAT / docDate
  const explicitActiveDocDate = String(
    docDate ||
    formValues?.TANGGAL_SURAT ||
    formValues?.DOC_DATE ||
    formValues?.TGL_SURAT ||
    formValues?.tanggal_surat ||
    formValues?.doc_date ||
    formValues?.tgl_surat ||
    ''
  ).trim();

  const normalizedFormValues = { ...(formValues || {}) };
  if (explicitActiveDocDate) {
    normalizedFormValues.TANGGAL_SURAT = explicitActiveDocDate;
    normalizedFormValues.tanggal_surat = explicitActiveDocDate;
    normalizedFormValues.DOC_DATE = explicitActiveDocDate;
    normalizedFormValues.doc_date = explicitActiveDocDate;
    normalizedFormValues.TGL_SURAT = explicitActiveDocDate;
    normalizedFormValues.tgl_surat = explicitActiveDocDate;
    delete normalizedFormValues.TANGGAL_SURAT_HEADER;
    delete normalizedFormValues.tanggal_surat_header;
    delete normalizedFormValues.TANGGAL_NASKAH;
    delete normalizedFormValues.tanggal_naskah;
    delete normalizedFormValues.TANGGAL_DOKUMEN;
    delete normalizedFormValues.tanggal_dokumen;
  }

  // 2b. Sinkronisasi rujukan dokumen induk dari arsip database
  await syncDataFromArchive(currentCase || caseData, suspectsList, normalizedFormValues);

  // 2c. Bangun konteks rantai universal dari arsip tanpa menimpa key generik surat aktif
  const universalContext = await buildUniversalCaseContext(currentCase || caseData, {}, {
    suspectsList,
    activeSuspect,
    activeVictim,
    victimsList,
    personnelList
  });

  // 2d. Gabungkan universalContext dengan normalizedFormValues menggunakan mergeChainedWithForm
  //     agar buildMindikVariables menerima nilai rantai arsip + input aktif yang sedang diketik
  const effectiveFormValues = mergeChainedWithForm(universalContext, normalizedFormValues, { formatDatesForDocx: true });

  // 3. Build data map & gabungkan dengan universalContext (basePayload + universalContext + manual formValues)
  const baseDataMap = buildMindikVariables(currentCase, effectiveFormValues, template?.dynamic_fields, personnelList, {
    activeSuspect,
    suspectsList,
    activeVictim,
    victimsList,
    template,
    docDate: explicitActiveDocDate
  });
  const dataMap = mergeChainedWithForm(
    {
      ...universalContext,
      ...baseDataMap,
      // Pastikan array rantai dinamis dan tag universal dari buildUniversalCaseContext selalu tersedia
      DAFTAR_DASAR_SURAT: universalContext.DAFTAR_DASAR_SURAT || [],
      daftar_dasar_surat: universalContext.daftar_dasar_surat || [],
      DAFTAR_BARANG_BUKTI: baseDataMap.DAFTAR_BARANG_BUKTI || universalContext.DAFTAR_BARANG_BUKTI || '',
      daftar_barang_bukti: baseDataMap.daftar_barang_bukti || universalContext.daftar_barang_bukti || '',
      BARANG_BUKTI: universalContext.BARANG_BUKTI || [],
      barang_bukti: universalContext.barang_bukti || [],
      PENYIDIK: baseDataMap.TIM_PENYIDIK?.length ? baseDataMap.TIM_PENYIDIK : (universalContext.PENYIDIK || []),
      penyidik: baseDataMap.tim_penyidik?.length ? baseDataMap.tim_penyidik : (universalContext.penyidik || []),
      SAKSI: universalContext.SAKSI || [],
      saksi: universalContext.saksi || [],
      TERLAPOR: universalContext.TERLAPOR || baseDataMap.terlapor_list || [],
      terlapor: universalContext.terlapor || baseDataMap.terlapor_list || [],
      TERSANGKA: universalContext.TERSANGKA || baseDataMap.tersangka_list || [],
      tersangka: universalContext.tersangka || baseDataMap.tersangka_list || [],
      PELAPOR: universalContext.PELAPOR || baseDataMap.korban_list || [],
      pelapor: universalContext.pelapor || baseDataMap.korban_list || [],
    },
    normalizedFormValues,
    { formatDatesForDocx: true }
  );
  // Salin seluruh kunci dinamis NOMOR_<KODE>, NO_<KODE>, TANGGAL_<KODE>, TGL_<KODE>, DASAR_<KODE>, BIODATA_*_LENGKAP, SAKSI_*, SUBJEK_*
  // tanpa menyentuh key generik surat aktif maupun alias nomor/tanggal milik template yang sedang di-generate
  const ACTIVE_SURAT_PROTECTED_KEYS = new Set([
    'NOMOR_SURAT', 'nomor_surat',
    'NO_SURAT', 'no_surat',
    'DOC_NO', 'doc_no',
    'NOMOR_SURAT_HEADER', 'nomor_surat_header',
    'TANGGAL_SURAT', 'tanggal_surat',
    'TGL_SURAT', 'tgl_surat',
    'DOC_DATE', 'doc_date',
    'TANGGAL_SURAT_HEADER', 'tanggal_surat_header',
    'TANGGAL_NASKAH', 'tanggal_naskah',
    'TANGGAL_DOKUMEN', 'tanggal_dokumen',
    'HARI_SURAT', 'hari_surat',
    'BULAN_SURAT', 'bulan_surat',
    'TAHUN_SURAT', 'tahun_surat'
  ]);
  Object.keys(universalContext).forEach((uKey) => {
    if (ACTIVE_SURAT_PROTECTED_KEYS.has(uKey)) return;
    if (dataMap[uKey] === undefined || dataMap[uKey] === '' || dataMap[uKey] === '-') {
      dataMap[uKey] = universalContext[uKey];
    }
  });

  // Kunci akhir tanggal surat aktif agar selalu sama persis dengan TANGGAL_SURAT dari form / docDate
  const ACTIVE_DATE_KEYS_FROM_BASE = [
    'TANGGAL_SURAT', 'tanggal_surat',
    'TGL_SURAT', 'tgl_surat',
    'DOC_DATE', 'doc_date',
    'TANGGAL_NASKAH', 'tanggal_naskah',
    'TANGGAL_DOKUMEN', 'tanggal_dokumen',
    'TANGGAL_SURAT_HEADER', 'tanggal_surat_header',
    'HARI_SURAT', 'hari_surat',
    'BULAN_SURAT', 'bulan_surat',
    'TAHUN_SURAT', 'tahun_surat'
  ];
  ACTIVE_DATE_KEYS_FROM_BASE.forEach((k) => {
    if (baseDataMap[k] !== undefined && baseDataMap[k] !== '') {
      dataMap[k] = baseDataMap[k];
    }
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



