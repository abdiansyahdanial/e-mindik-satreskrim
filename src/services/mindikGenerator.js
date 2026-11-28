import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
import { supabase } from '../supabaseClient.js';
import { toCanonicalMindikCode, normalizeCanonicalTemplateCode, isValidOfficialDocNumber } from '../constants/mindikChainRegistry.js';
export { normalizeCanonicalTemplateCode };

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
  const nik = (s.nik || s.no_identitas || s.nomor_identitas || s.no_ktp || s.nomor_ktp || s.identitas || '').trim();
  let tempat_lahir = (s.tempat_lahir || '').trim();
  let tanggal_lahir = (s.tanggal_lahir || s.tgl_lahir || '').trim();

  if (!tempat_lahir && !tanggal_lahir && (s.ttl || s.tempat_tanggal_lahir || s.tempat_tgl_lahir)) {
    const rawTtlSrc = String(s.ttl || s.tempat_tanggal_lahir || s.tempat_tgl_lahir);
    const parts = rawTtlSrc.split(',');
    if (parts.length >= 2) {
      tempat_lahir = parts[0].trim();
      tanggal_lahir = parts.slice(1).join(',').trim();
    } else {
      tempat_lahir = rawTtlSrc.trim();
    }
  }

  const formattedDob = tanggal_lahir ? formatTanggalIndonesia(tanggal_lahir) : '';
  const ttl = (tempat_lahir && formattedDob)
    ? `${tempat_lahir}, ${formattedDob}`
    : (s.ttl || s.tempat_tanggal_lahir || s.tempat_tgl_lahir || tempat_lahir || formattedDob || '');
  const autoAge = calculateAgeFromDob(tanggal_lahir);
  const rawUmur = s.umur || s.usia || autoAge || '';
  const umurClean = String(rawUmur).replace(/\s*tahun\s*/i, '').trim();
  const umurFormatted = umurClean ? `${umurClean} Tahun` : '';
  const jenis_kelamin = s.jenis_kelamin || s.jk || s.kelamin || 'Laki-laki';
  const kewarganegaraan = s.kewarganegaraan || s.warga_negara || s.wn || 'Indonesia';
  const agama = s.agama || 'Islam';
  const pekerjaan = s.pekerjaan || s.kerja || '';
  const pendidikan = s.pendidikan || s.pendidikan_terakhir || '';
  const status_pernikahan = (s.status_pernikahan || s.status_kawin || s.status_nikah || s.marital_status || s.perkawinan || '').trim();
  const alamat = (s.alamat || s.tempat_tinggal || s.kediaman || s.alamat_tinggal || s.domisili || '').trim();
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
    no_identitas: nik,
    nomor_identitas: nik,
    tempat_lahir,
    tanggal_lahir,
    tgl_lahir: formattedDob || tanggal_lahir,
    ttl,
    tempat_tanggal_lahir: ttl,
    tempat_tgl_lahir: ttl,
    umur: umurFormatted || umurClean,
    usia: umurFormatted || umurClean,
    umur_angka: umurClean,
    jenis_kelamin,
    jk: jenis_kelamin,
    kelamin: jenis_kelamin,
    kewarganegaraan,
    warga_negara: kewarganegaraan,
    wn: kewarganegaraan,
    agama,
    pekerjaan,
    kerja: pekerjaan,
    pendidikan,
    pendidikan_terakhir: pendidikan,
    status_pernikahan,
    status_kawin: status_pernikahan,
    status_nikah: status_pernikahan,
    perkawinan: status_pernikahan,
    alamat,
    tempat_tinggal: alamat,
    kediaman: alamat,
    alamat_tinggal: alamat,
    domisili: alamat,
    no_hp,
    kontak: no_hp,
    nomor_sp_tap,
    tanggal_sp_tap: tanggal_sp_tap ? formatTanggalIndonesia(tanggal_sp_tap) : '',
    role_category: s.role_category || roleLabel
  };
  normalized.biodata_lengkap = formatSubjectBiodataBlock(normalized);
  return normalized;
}

function enrichSubjectWithPool(subj = {}, pool = []) {
  if (!subj || typeof subj !== 'object') return subj;
  const sId = subj.id ? String(subj.id).trim() : '';
  const sNik = String(subj.nik || subj.no_identitas || '').trim().toLowerCase();
  const sName = String(subj.nama || subj.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const matched = (Array.isArray(pool) ? pool : []).find((cand) => {
    if (!cand || typeof cand !== 'object') return false;
    if (sId && cand.id && String(cand.id).trim() === sId) return true;
    const cNik = String(cand.nik || cand.no_identitas || '').trim().toLowerCase();
    if (sNik && sNik !== '-' && cNik && cNik === sNik) return true;
    const cName = String(cand.nama || cand.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return Boolean(sName && sName !== '-' && cName && cName === sName);
  });
  if (!matched) return subj;

  const merged = { ...matched };
  Object.keys(subj).forEach((k) => {
    const v = subj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-') {
      merged[k] = v;
    }
  });
  return merged;
}

/**
 * Deduplikasi subjek hukum tunggal lintas sumber (case_suspects, terlapor_list, terlapor_name, person).
 * - Identitas unik per orang berdasarkan `nik` (jika valid bukan `-`) ATAU `nama` ternormalisasi.
 * - Menggabungkan seluruh field non-kosong menjadi 1 objek tunggal tanpa saling menimpa dgn kosong.
 * - Mempertahankan status tertinggi ('tersangka' menang atas 'terlapor').
 */
export function deduplicateSubjectRecords(records = [], roleLabel = 'Subjek') {
  if (!Array.isArray(records) || records.length === 0) return [];

  const normNameKey = (val) => String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normNikKey = (val) => {
    const s = String(val || '').trim();
    return (!s || s === '-' || s === 'null' || s === 'undefined') ? '' : s.toLowerCase();
  };
  const isValPresent = (val) => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') {
      const t = val.trim();
      return t !== '' && t !== '-' && t !== 'null' && t !== 'undefined';
    }
    return true;
  };
  const isSyntheticId = (idVal) => !idVal || /^(subjek|terlapor|tersangka|saksi|pelapor|korban)_\d+$/i.test(String(idVal));

  const rawMergedList = [];
  const byNik = new Map();
  const byName = new Map();

  records.forEach((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return;
    const rawName = String(rawItem.nama || rawItem.name || '').trim();
    if (!rawName || rawName === '-') return;

    const cleanRaw = {};
    Object.keys(rawItem).forEach((k) => {
      if (isValPresent(rawItem[k])) {
        cleanRaw[k] = rawItem[k];
      }
    });
    if (!cleanRaw.nama && cleanRaw.name) {
      cleanRaw.nama = cleanRaw.name;
    }

    const nameKey = normNameKey(cleanRaw.nama);
    if (!nameKey || nameKey === '-') return;
    const nikKey = normNikKey(cleanRaw.nik || cleanRaw.no_identitas || cleanRaw.nomor_identitas || cleanRaw.no_ktp);

    let existingIdx = -1;
    if (nikKey && byNik.has(nikKey)) {
      existingIdx = byNik.get(nikKey);
    } else if (byName.has(nameKey)) {
      existingIdx = byName.get(nameKey);
    }

    if (existingIdx >= 0) {
      const target = rawMergedList[existingIdx];
      Object.keys(cleanRaw).forEach((k) => {
        if (k === 'status' || k === 'id' || k === 'no' || k === 'biodata_lengkap' || k === 'role_category') return;
        if (!isValPresent(target[k])) {
          target[k] = cleanRaw[k];
        }
      });

      // Pertahankan ID riil database (misal UUID dari public.case_suspects)
      if (isSyntheticId(target.id) && !isSyntheticId(cleanRaw.id)) {
        target.id = cleanRaw.id;
      }

      // Pertahankan status tertinggi ('tersangka' menang atas 'terlapor')
      const prevStatus = String(target.status || '').toLowerCase().trim();
      const nextStatus = String(cleanRaw.status || '').toLowerCase().trim();
      if (prevStatus === 'tersangka' || nextStatus === 'tersangka') {
        target.status = 'tersangka';
      } else if (!prevStatus && nextStatus) {
        target.status = nextStatus;
      }

      if (nikKey) byNik.set(nikKey, existingIdx);
      if (nameKey) byName.set(nameKey, existingIdx);
      const mergedNik = normNikKey(target.nik || target.no_identitas);
      if (mergedNik) byNik.set(mergedNik, existingIdx);
    } else {
      const targetIdx = rawMergedList.length;
      rawMergedList.push(cleanRaw);
      if (nikKey) byNik.set(nikKey, targetIdx);
      byName.set(nameKey, targetIdx);
    }
  });

  return rawMergedList
    .map((mergedRaw, idx) => normalizeSubjectRecord(mergedRaw, idx, roleLabel))
    .filter(Boolean);
}

/**
 * Resolusi fallback Terlapor yang aman dari data terstruktur perkara:
 * 1. case_suspects dengan status 'terlapor' + activeCase.terlapor_list + references.terlapor_list
 * 2. Jika filter 'terlapor' murni kosong, gunakan subjek case_suspects (termasuk 'tersangka'
 *    karena tersangka pada tahap penyidikan berasal dari terlapor)
 * 3. Fallback legacy (activeCase.person & terlapor_name) HANYA dipakai bila sumber terstruktur kosong
 *    agar nilai usang di kolom cases.terlapor_name / cases.person tidak menimpa case_suspects.
 * Dilarang keras mengambil data terlapor dari pelapor_name, nama_pelapor, investigators, atau dummy statis.
 */
function resolveCaseTerlaporFallback(suspectsArr = [], activeCase = {}, refsObj = {}) {
  const safeSuspects = Array.isArray(suspectsArr) ? suspectsArr : [];
  const pureTerlapor = safeSuspects.filter((s) => s && s.status === 'terlapor');
  const structuredTerlapor = [
    ...pureTerlapor,
    ...(Array.isArray(activeCase?.terlapor_list) ? activeCase.terlapor_list : []),
    ...(Array.isArray(refsObj?.terlapor_list) ? refsObj.terlapor_list : [])
  ].filter((s) => s && (s.nama || s.name));

  const structuredPool = structuredTerlapor.length > 0
    ? structuredTerlapor
    : safeSuspects.filter((s) => s && (s.nama || s.name) && s.status !== 'saksi' && s.status !== 'pelapor');

  if (structuredPool.length > 0) {
    return deduplicateSubjectRecords(structuredPool, 'Terlapor');
  }

  const legacyList = [];
  if (
    activeCase?.person &&
    activeCase.person.nama &&
    activeCase.person.status !== 'saksi' &&
    activeCase.person.status !== 'pelapor'
  ) {
    legacyList.push(activeCase.person);
  }
  const legacyName = String(activeCase?.nama_terlapor || activeCase?.terlapor_name || activeCase?.terlapor || '').trim();
  if (legacyName && legacyName !== '-') {
    legacyList.push({ nama: legacyName, status: 'terlapor' });
  }
  return deduplicateSubjectRecords(legacyList, 'Terlapor');
}

/**
 * Mengisi 11 field biodata KUHAP beserta seluruh permutasi tag indeks (i = 1..5) dan array loop
 * untuk setiap group prefix (misal TERLAPOR, SUBJEK, TSK, TERSANGKA):
 * - ${P}_${i}_${F}, ${F}_${P}_${i}, ${P}${i}_${F}, ${F}_${P}${i} (UPPERCASE & lowercase)
 * - Array loop {#TERLAPOR}, {#SUBJEK}, dst.
 */
export function populateIndexedSubjectGroup(
  targetObj,
  subjectList = [],
  groupPrefixes = ['TERLAPOR', 'SUBJEK'],
  enrichmentPool = []
) {
  if (!targetObj || typeof targetObj !== 'object') return [];
  const enrichedRaw = (Array.isArray(subjectList) ? subjectList : [])
    .filter(item => item && (item.nama || item.name))
    .map(item => enrichSubjectWithPool(item, enrichmentPool));
  const primaryGroupLabel = groupPrefixes[0] || 'Subjek';
  const normalizedList = deduplicateSubjectRecords(enrichedRaw, primaryGroupLabel);

  const buildFieldMapForItem = (item) => {
    const exists = Boolean(item && item.nama);
    if (!exists) {
      return {
        NAMA: '', NAMA_LENGKAP: '', NAMA_ALIAS: '', ALIAS: '',
        NIK: '', NO_IDENTITAS: '', NOMOR_IDENTITAS: '', NO_KTP: '', NOMOR_KTP: '', IDENTITAS: '',
        KEWARGANEGARAAN: '', WARGA_NEGARA: '', WN: '',
        JENIS_KELAMIN: '', JK: '', KELAMIN: '',
        TTL: '', TEMPAT_TANGGAL_LAHIR: '', TEMPAT_TGL_LAHIR: '', TEMPAT_LAHIR: '', TANGGAL_LAHIR: '', TGL_LAHIR: '',
        UMUR: '', USIA: '',
        PEKERJAAN: '', KERJA: '',
        PENDIDIKAN: '', PENDIDIKAN_TERAKHIR: '',
        AGAMA: '',
        STATUS_PERNIKAHAN: '', STATUS_KAWIN: '', STATUS_NIKAH: '', PERKAWINAN: '',
        ALAMAT: '', TEMPAT_TINGGAL: '', KEDIAMAN: '', ALAMAT_TINGGAL: '', DOMISILI: '',
        NO_HP: '', KONTAK: '', BIODATA_LENGKAP: ''
      };
    }
    return {
      NAMA: item.nama || '',
      NAMA_LENGKAP: item.nama_lengkap || item.nama || '',
      NAMA_ALIAS: item.nama_lengkap || item.nama || '',
      ALIAS: item.alias || '',
      NIK: item.nik || '',
      NO_IDENTITAS: item.nik || '',
      NOMOR_IDENTITAS: item.nik || '',
      NO_KTP: item.nik || '',
      NOMOR_KTP: item.nik || '',
      IDENTITAS: item.nik || '',
      KEWARGANEGARAAN: item.kewarganegaraan || 'Indonesia',
      WARGA_NEGARA: item.kewarganegaraan || 'Indonesia',
      WN: item.kewarganegaraan || 'Indonesia',
      JENIS_KELAMIN: item.jenis_kelamin || '',
      JK: item.jenis_kelamin || '',
      KELAMIN: item.jenis_kelamin || '',
      TTL: item.ttl || '',
      TEMPAT_TANGGAL_LAHIR: item.ttl || '',
      TEMPAT_TGL_LAHIR: item.ttl || '',
      TEMPAT_LAHIR: item.tempat_lahir || '',
      TANGGAL_LAHIR: item.tgl_lahir || '',
      TGL_LAHIR: item.tgl_lahir || '',
      UMUR: item.umur || '',
      USIA: item.umur || '',
      PEKERJAAN: item.pekerjaan || '',
      KERJA: item.pekerjaan || '',
      PENDIDIKAN: item.pendidikan || '',
      PENDIDIKAN_TERAKHIR: item.pendidikan || '',
      AGAMA: item.agama || '',
      STATUS_PERNIKAHAN: item.status_pernikahan || '',
      STATUS_KAWIN: item.status_pernikahan || '',
      STATUS_NIKAH: item.status_pernikahan || '',
      PERKAWINAN: item.status_pernikahan || '',
      ALAMAT: item.alamat || '',
      TEMPAT_TINGGAL: item.alamat || '',
      KEDIAMAN: item.alamat || '',
      ALAMAT_TINGGAL: item.alamat || '',
      DOMISILI: item.alamat || '',
      NO_HP: item.no_hp || '',
      KONTAK: item.no_hp || '',
      BIODATA_LENGKAP: item.biodata_lengkap || ''
    };
  };

  groupPrefixes.forEach((rawPrefix) => {
    const P = String(rawPrefix || '').toUpperCase().trim();
    const p = P.toLowerCase();
    if (!P) return;

    // 1. Array Loop {#TERLAPOR}, {#SUBJEK}, {#TERSANGKA}, dll dengan properti UPPERCASE & lowercase lengkap
    const loopItems = normalizedList.map((item, idx) => {
      const noStr = String(idx + 1);
      const hurufStr = String.fromCharCode(97 + (idx % 26));
      const hurufKapStr = hurufStr.toUpperCase();
      const namaVal = item.nama || '';
      const nikVal = item.nik || '';
      const wnVal = item.kewarganegaraan || 'Indonesia';
      const jkVal = item.jenis_kelamin || '';
      const ttlVal = item.ttl || '';
      const umurVal = item.umur || '';
      const kerjaVal = item.pekerjaan || '';
      const didikVal = item.pendidikan || '';
      const agamaVal = item.agama || '';
      const kawinVal = item.status_pernikahan || '';
      const alamatVal = item.alamat || '';
      const tapNoVal = item.nomor_sp_tap || item.no_sp_tap_tsk || '';
      const tapTglVal = item.tanggal_sp_tap || item.tgl_sp_tap_tsk || '';
      return {
        ...item,
        no: noStr,
        NO: noStr,
        urut: noStr,
        URUT: noStr,
        huruf: hurufStr,
        HURUF: hurufStr,
        huruf_kapital: hurufKapStr,
        HURUF_KAPITAL: hurufKapStr,
        nama: namaVal,
        NAMA: namaVal,
        nama_tersangka: namaVal,
        NAMA_TERSANGKA: namaVal,
        nama_tsk: namaVal,
        NAMA_TSK: namaVal,
        nama_terlapor: namaVal,
        NAMA_TERLAPOR: namaVal,
        terlapor_nama: namaVal,
        TERLAPOR_NAMA: namaVal,
        nik: nikVal,
        NIK: nikVal,
        identitas: nikVal,
        IDENTITAS: nikVal,
        no_identitas: nikVal,
        NO_IDENTITAS: nikVal,
        nomor_identitas: nikVal,
        NOMOR_IDENTITAS: nikVal,
        no_ktp: nikVal,
        NO_KTP: nikVal,
        nomor_ktp: nikVal,
        NOMOR_KTP: nikVal,
        kewarganegaraan: wnVal,
        KEWARGANEGARAAN: wnVal,
        warga_negara: wnVal,
        WARGA_NEGARA: wnVal,
        wn: wnVal,
        WN: wnVal,
        jenis_kelamin: jkVal,
        JENIS_KELAMIN: jkVal,
        jk: jkVal,
        JK: jkVal,
        kelamin: jkVal,
        KELAMIN: jkVal,
        ttl: ttlVal,
        TTL: ttlVal,
        tempat_tanggal_lahir: ttlVal,
        TEMPAT_TANGGAL_LAHIR: ttlVal,
        tempat_tgl_lahir: ttlVal,
        TEMPAT_TGL_LAHIR: ttlVal,
        tempat_lahir: item.tempat_lahir || '',
        TEMPAT_LAHIR: item.tempat_lahir || '',
        tgl_lahir: item.tgl_lahir || '',
        TGL_LAHIR: item.tgl_lahir || '',
        tanggal_lahir: item.tgl_lahir || '',
        TANGGAL_LAHIR: item.tgl_lahir || '',
        umur: umurVal,
        UMUR: umurVal,
        usia: umurVal,
        USIA: umurVal,
        pekerjaan: kerjaVal,
        PEKERJAAN: kerjaVal,
        kerja: kerjaVal,
        KERJA: kerjaVal,
        kerja_tsk: kerjaVal,
        KERJA_TSK: kerjaVal,
        pekerjaan_tsk: kerjaVal,
        PEKERJAAN_TSK: kerjaVal,
        kerja_terlapor: kerjaVal,
        KERJA_TERLAPOR: kerjaVal,
        pekerjaan_terlapor: kerjaVal,
        PEKERJAAN_TERLAPOR: kerjaVal,
        pendidikan: didikVal,
        PENDIDIKAN: didikVal,
        pendidikan_terakhir: didikVal,
        PENDIDIKAN_TERAKHIR: didikVal,
        agama: agamaVal,
        AGAMA: agamaVal,
        status_pernikahan: kawinVal,
        STATUS_PERNIKAHAN: kawinVal,
        status_kawin: kawinVal,
        STATUS_KAWIN: kawinVal,
        status_nikah: kawinVal,
        STATUS_NIKAH: kawinVal,
        perkawinan: kawinVal,
        PERKAWINAN: kawinVal,
        alamat: alamatVal,
        ALAMAT: alamatVal,
        alamat_tsk: alamatVal,
        ALAMAT_TSK: alamatVal,
        alamat_terlapor: alamatVal,
        ALAMAT_TERLAPOR: alamatVal,
        tempat_tinggal: alamatVal,
        TEMPAT_TINGGAL: alamatVal,
        kediaman: alamatVal,
        KEDIAMAN: alamatVal,
        alamat_tinggal: alamatVal,
        ALAMAT_TINGGAL: alamatVal,
        domisili: alamatVal,
        DOMISILI: alamatVal,
        no_sp_tap_tsk: tapNoVal,
        NO_SP_TAP_TSK: tapNoVal,
        nomor_sp_tap: tapNoVal,
        NOMOR_SP_TAP: tapNoVal,
        nomor_sp_tap_tsk: tapNoVal,
        NOMOR_SP_TAP_TSK: tapNoVal,
        tgl_sp_tap_tsk: tapTglVal,
        TGL_SP_TAP_TSK: tapTglVal,
        tanggal_sp_tap: tapTglVal,
        TANGGAL_SP_TAP: tapTglVal,
        tanggal_sp_tap_tsk: tapTglVal,
        TANGGAL_SP_TAP_TSK: tapTglVal
      };
    });
    targetObj[P] = loopItems;
    targetObj[p] = loopItems;
    targetObj[`${P}_LIST`] = loopItems;
    targetObj[`${p}_list`] = loopItems;
    targetObj[`DAFTAR_${P}`] = loopItems;
    targetObj[`daftar_${p}`] = loopItems;

    if (P === 'TERLAPOR') {
      const jumlahTl = loopItems.length;
      const sebutanTl = jumlahTl > 1 ? 'para Terlapor' : 'Terlapor';
      const sebutanTlKap = jumlahTl > 1 ? 'Para Terlapor' : 'Terlapor';
      targetObj.JUMLAH_TERLAPOR = String(jumlahTl);
      targetObj.jumlah_terlapor = String(jumlahTl);
      targetObj.SEBUTAN_TERLAPOR = sebutanTl;
      targetObj.sebutan_terlapor = sebutanTl;
      targetObj.SEBUTAN_TERLAPOR_KAPITAL = sebutanTlKap;
      targetObj.sebutan_terlapor_kapital = sebutanTlKap;
    }

    // 2. Indexed slots i = 1..6 dengan seluruh 4 pola permutasi penulisan tag (slot di atas jumlah subjek otomatis dikosongkan '')
    for (let i = 1; i <= 6; i++) {
      const item = normalizedList[i - 1] || null;
      const fieldMap = buildFieldMapForItem(item);
      Object.entries(fieldMap).forEach(([F, val]) => {
        const f = F.toLowerCase();
        // Pola 1: PREFIX_i_FIELD (contoh: TERLAPOR_1_NAMA)
        targetObj[`${P}_${i}_${F}`] = val;
        targetObj[`${p}_${i}_${f}`] = val;
        // Pola 2: FIELD_PREFIX_i (contoh: NAMA_TERLAPOR_1)
        targetObj[`${F}_${P}_${i}`] = val;
        targetObj[`${f}_${p}_${i}`] = val;
        // Pola 3: PREFIXi_FIELD (contoh: TERLAPOR1_NAMA)
        targetObj[`${P}${i}_${F}`] = val;
        targetObj[`${p}${i}_${f}`] = val;
        // Pola 4: FIELD_PREFIXi (contoh: NAMA_TERLAPOR1)
        targetObj[`${F}_${P}${i}`] = val;
        targetObj[`${f}_${p}${i}`] = val;
      });
    }
  });

  return normalizedList;
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
      NAMA_LENGKAP: primary.nama_lengkap,
      NIK: primary.nik,
      NO_IDENTITAS: primary.nik,
      NOMOR_IDENTITAS: primary.nik,
      NO_KTP: primary.nik,
      NOMOR_KTP: primary.nik,
      IDENTITAS: primary.nik,
      TEMPAT_LAHIR: primary.tempat_lahir,
      TANGGAL_LAHIR: primary.tgl_lahir,
      TGL_LAHIR: primary.tgl_lahir,
      TTL: primary.ttl,
      TEMPAT_TANGGAL_LAHIR: primary.ttl,
      TEMPAT_TGL_LAHIR: primary.ttl,
      UMUR: primary.umur,
      USIA: primary.umur,
      JENIS_KELAMIN: primary.jenis_kelamin,
      JK: primary.jenis_kelamin,
      KELAMIN: primary.jenis_kelamin,
      KEWARGANEGARAAN: primary.kewarganegaraan,
      WARGA_NEGARA: primary.kewarganegaraan,
      WN: primary.kewarganegaraan,
      AGAMA: primary.agama,
      PEKERJAAN: primary.pekerjaan,
      KERJA: primary.pekerjaan,
      PENDIDIKAN: primary.pendidikan,
      PENDIDIKAN_TERAKHIR: primary.pendidikan,
      STATUS_PERNIKAHAN: primary.status_pernikahan,
      STATUS_KAWIN: primary.status_pernikahan,
      STATUS_NIKAH: primary.status_pernikahan,
      PERKAWINAN: primary.status_pernikahan,
      ALAMAT: primary.alamat,
      TEMPAT_TINGGAL: primary.alamat,
      KEDIAMAN: primary.alamat,
      ALAMAT_TINGGAL: primary.alamat,
      DOMISILI: primary.alamat,
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

  // Indexed slots 1..5 & array loop lengkap untuk semua 11 field dan permutasi tag
  populateIndexedSubjectGroup(targetMap, validList, [upper]);
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
 * Membangkitkan variabel tanggal terurai universal (HARI_*, TGL_ANGKA_*, TANGGAL_ANGKA_*,
 * BULAN_*, TAHUN_*, TERBILANG_TAHUN_*, TANGGAL_TERURAI_*) untuk setiap prefix tanpa menimpa TANGGAL_<PREFIX>.
 */
export function assignDecomposedDateTags(targetObj, rawDateValue, prefixes = []) {
  if (!targetObj || typeof targetObj !== 'object' || !rawDateValue || !Array.isArray(prefixes) || prefixes.length === 0) {
    return;
  }
  const trimmed = String(rawDateValue).trim();
  if (!trimmed || trimmed === '-' || /\.{3,}|\u2026/.test(trimmed)) return;

  const iso = toIsoDateString(trimmed);
  const parts = parseDateParts(iso || trimmed);
  if (!parts || (!parts.hari && !parts.tanggal && !parts.bulan && !parts.tahun)) return;

  const hari = parts.hari || '';
  const tglAngka = parts.tanggal ? String(parseInt(parts.tanggal, 10) || parts.tanggal) : '';
  const bulan = parts.bulan || '';
  const tahun = parts.tahun || '';
  const terbilangThn = parts.terbilangTahun || (tahun ? terbilangTahun(tahun) : '');
  const terurai = (hari && tglAngka && bulan && tahun)
    ? `hari ${hari} tanggal ${tglAngka} bulan ${bulan} tahun ${tahun}`
    : (parts.tanggalLengkap || '');

  prefixes.forEach((rawPrefix) => {
    const pUpper = String(rawPrefix || '')
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (!pUpper) return;

    const setTag = (upperKey, val) => {
      if (!val) return;
      targetObj[upperKey] = val;
      targetObj[upperKey.toLowerCase()] = val;
    };

    setTag(`HARI_${pUpper}`, hari);
    setTag(`TGL_ANGKA_${pUpper}`, tglAngka);
    setTag(`TANGGAL_ANGKA_${pUpper}`, tglAngka);
    setTag(`BULAN_${pUpper}`, bulan);
    setTag(`TAHUN_${pUpper}`, tahun);
    setTag(`TERBILANG_TAHUN_${pUpper}`, terbilangThn);
    setTag(`TANGGAL_TERURAI_${pUpper}`, terurai);
  });
}

function extractDocTargetSuspectInfo(metaObj = {}) {
  const mv = metaObj && typeof metaObj === 'object' ? metaObj : {};
  const ids = [];
  const names = [];

  const pushId = (val) => {
    if (val === undefined || val === null) return;
    const s = String(val).trim();
    if (s && s !== 'null' && s !== 'undefined' && !ids.includes(s)) ids.push(s);
  };
  const pushName = (val) => {
    if (val === undefined || val === null) return;
    const s = String(val).trim().toLowerCase();
    if (s && s !== '-' && s !== 'null' && s !== 'undefined' && !names.includes(s)) names.push(s);
  };

  pushId(mv.target_suspect_id);
  pushId(mv.target_subject_id);
  pushId(mv.target_subject);
  if (Array.isArray(mv.target_suspect_ids)) {
    mv.target_suspect_ids.forEach(pushId);
  }
  if (Array.isArray(mv.target_subject_ids)) {
    mv.target_subject_ids.forEach(pushId);
  }
  pushName(mv.target_suspect_name);
  pushName(mv.target_subject_name);
  pushName(mv.target_subject);
  pushName(mv.TERSANGKA_NAMA);
  pushName(mv.tersangka_nama);
  pushName(mv.SUBJEK_NAMA);
  pushName(mv.subjek_nama);
  pushName(mv.NAMA_TERSANGKA);
  pushName(mv.nama_tersangka);
  pushName(mv.NAMA_TSK);
  pushName(mv.nama_tsk);
  pushName(mv.NAMA_SAKSI);
  pushName(mv.nama_saksi);
  pushName(mv.SAKSI_NAMA);
  pushName(mv.saksi_nama);
  pushName(mv.NAMA_DIPANGGIL);
  pushName(mv.nama_dipanggil);

  if (mv.suspect_data && !Array.isArray(mv.suspect_data) && typeof mv.suspect_data === 'object') {
    pushId(mv.suspect_data.id);
    pushName(mv.suspect_data.nama_lengkap || mv.suspect_data.nama);
  } else if (Array.isArray(mv.suspect_data) && mv.suspect_data.length === 1 && mv.suspect_data[0]) {
    pushId(mv.suspect_data[0].id);
    pushName(mv.suspect_data[0].nama_lengkap || mv.suspect_data[0].nama);
  }

  return { ids, names };
}

/**
 * Resolver Per-Subjek Dokumen Arsip Surat Panggilan Ke-1 (SPGL_SAKSI_1 atau SPGL_TSK_1).
 * Prioritas #1: Dokumen arsip bernomor sah yang memiliki targetSubject / meta_values nama/ID
 *               yang cocok (case-insensitive, trimmed) dengan Saksi/Tersangka terpilih.
 * Prioritas #2: Dokumen arsip Panggilan Ke-1 terbaru pada perkara tersebut.
 *
 * @param {Array} archivedDocs - Daftar arsip dokumen perkara aktif (public.documents)
 * @param {'SAKSI'|'TSK'} category - Kategori panggilan ('SAKSI' atau 'TSK')
 * @param {object|string|null} targetSubject - Objek subjek terpilih atau nama subjek
 */
export function resolveFirstSummonsDocForSubject(archivedDocs = [], category = 'SAKSI', targetSubject = null) {
  const isSaksiCat = String(category || '').toUpperCase().includes('SAKSI');
  const targetId = (targetSubject && typeof targetSubject === 'object' && targetSubject.id)
    ? String(targetSubject.id).trim()
    : '';
  const rawTargetName = typeof targetSubject === 'string'
    ? targetSubject
    : (targetSubject?.nama || targetSubject?.nama_lengkap || targetSubject?.name || '');
  const targetName = String(rawTargetName || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const normalizeNameStr = (val) => String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const isFirstCallArchive = (doc) => {
    if (!doc || typeof doc !== 'object') return false;
    const rawCode = String(doc.template_code || doc.code || doc.document_type || doc.original_template_code || '').toUpperCase().trim();
    const rawTitle = String(doc.doc_title || doc.title || doc.document_name || '').toUpperCase().trim();
    const canon = toCanonicalMindikCode(rawCode, rawTitle);

    const isExplicitSecond =
      canon === 'SPGL_SAKSI_2' ||
      canon === 'SPGL_TSK_2' ||
      /(?:^|_)2$/.test(rawCode) ||
      /\b(KE[-\s]?2|KEDUA|II)\b/.test(rawTitle);
    if (isExplicitSecond) return false;

    if (isSaksiCat) {
      if (canon === 'SPGL_SAKSI_1' || rawCode === 'SPGL_SAKSI_1' || rawCode === 'SPGL_SAKSI' || rawCode === 'SURAT_PANGGILAN_SAKSI_1' || rawCode === 'PANGGILAN_SAKSI_1') {
        return true;
      }
      if (rawTitle.includes('PANGGILAN') && rawTitle.includes('SAKSI')) {
        return true;
      }
      return false;
    } else {
      if (canon === 'SPGL_TSK_1' || rawCode === 'SPGL_TSK_1' || rawCode === 'SPGL_TSK' || rawCode === 'SURAT_PANGGILAN_TERSANGKA_1' || rawCode === 'PANGGILAN_TSK_1') {
        return true;
      }
      if (rawTitle.includes('PANGGILAN') && (rawTitle.includes('TERSANGKA') || rawTitle.includes('TSK'))) {
        return true;
      }
      return false;
    }
  };

  const candidates = (Array.isArray(archivedDocs) ? archivedDocs : [])
    .filter(isFirstCallArchive)
    .map((doc) => {
      const ext = extractArchivedDocNumberAndDate(doc);
      const mv = ext.metaObj || {};
      const targetInfo = extractDocTargetSuspectInfo(mv);
      const docSubjectNames = new Set(targetInfo.names.map(normalizeNameStr).filter(Boolean));
      [
        doc.target_subject,
        doc.target_suspect_name,
        mv.target_subject,
        mv.target_subject_name,
        mv.target_suspect_name,
        mv.NAMA_SAKSI,
        mv.nama_saksi,
        mv.SAKSI_NAMA,
        mv.saksi_nama,
        mv.NAMA_TERSANGKA,
        mv.nama_tersangka,
        mv.TERSANGKA_NAMA,
        mv.tersangka_nama,
        mv.NAMA_TSK,
        mv.nama_tsk,
        mv.NAMA_DIPANGGIL,
        mv.nama_dipanggil,
        mv.SUBJEK_NAMA,
        mv.subjek_nama
      ].forEach((n) => {
        const cleanN = normalizeNameStr(n);
        if (cleanN && cleanN !== '-' && cleanN !== 'null' && cleanN !== 'undefined') {
          docSubjectNames.add(cleanN);
        }
      });

      const primaryDocSubjectName =
        mv.target_subject_name ||
        mv.target_suspect_name ||
        (isSaksiCat ? (mv.NAMA_SAKSI || mv.SAKSI_NAMA) : (mv.NAMA_TERSANGKA || mv.NAMA_TSK || mv.TERSANGKA_NAMA)) ||
        mv.NAMA_DIPANGGIL ||
        mv.target_subject ||
        '';

      return {
        doc,
        docNo: ext.docNo,
        rawDocDate: ext.rawDocDate,
        formattedDocDate: ext.formattedDocDate || (ext.rawDocDate ? formatTanggalIndonesia(ext.rawDocDate) : ''),
        targetIds: targetInfo.ids,
        subjectNames: Array.from(docSubjectNames),
        subjectDisplayName: String(primaryDocSubjectName || '').trim()
      };
    })
    .filter((entry) => isValidOfficialDocNumber(entry.docNo))
    .sort((a, b) => new Date(a.doc?.created_at || 0).getTime() - new Date(b.doc?.created_at || 0).getTime());

  if (candidates.length === 0) {
    return {
      found: false,
      matchedBySubject: false,
      doc: null,
      docNo: '',
      rawDocDate: '',
      formattedDocDate: '',
      subjectName: rawTargetName || ''
    };
  }

  // Prioritas 1: Cocok ID subjek
  if (targetId) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].targetIds.includes(targetId)) {
        return {
          found: true,
          matchedBySubject: true,
          doc: candidates[i].doc,
          docNo: candidates[i].docNo,
          rawDocDate: candidates[i].rawDocDate,
          formattedDocDate: candidates[i].formattedDocDate,
          subjectName: candidates[i].subjectDisplayName || rawTargetName || ''
        };
      }
    }
  }

  // Prioritas 2: Cocok nama subjek (case-insensitive, trimmed)
  if (targetName) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (candidates[i].subjectNames.includes(targetName)) {
        return {
          found: true,
          matchedBySubject: true,
          doc: candidates[i].doc,
          docNo: candidates[i].docNo,
          rawDocDate: candidates[i].rawDocDate,
          formattedDocDate: candidates[i].formattedDocDate,
          subjectName: candidates[i].subjectDisplayName || rawTargetName || ''
        };
      }
    }
  }

  // Prioritas 3 (Fallback): Jika belum ada match spesifik nama, ambil arsip Panggilan Ke-1 terbaru pada perkara tersebut
  const latest = candidates[candidates.length - 1];
  return {
    found: true,
    matchedBySubject: !targetName && !targetId,
    doc: latest.doc,
    docNo: latest.docNo,
    rawDocDate: latest.rawDocDate,
    formattedDocDate: latest.formattedDocDate,
    subjectName: latest.subjectDisplayName || rawTargetName || ''
  };
}

/**
 * Menyuntikkan seluruh variasi ejaan tag Nomor & Tanggal Panggilan Ke-1 (Saksi maupun Tersangka)
 * ke objek target (baik context maupun finalPayload).
 */
export function assignFirstSummonsReferenceTags(targetObj, category = 'SAKSI', docNo = '', formattedDate = '', rawDocDate = '', forFormUi = false) {
  if (!targetObj || typeof targetObj !== 'object') return;
  const isSaksiCat = String(category || '').toUpperCase().includes('SAKSI');
  const cleanNo = isValidOfficialDocNumber(docNo) ? String(docNo).trim() : '';
  const cleanFormattedDate = formattedDate || (rawDocDate ? formatTanggalIndonesia(rawDocDate) : '');
  const dateValueToSet = forFormUi ? (cleanFormattedDate || rawDocDate || '') : cleanFormattedDate;

  const setKeyBoth = (upperKey, val) => {
    if (!val) return;
    targetObj[upperKey] = val;
    targetObj[upperKey.toLowerCase()] = val;
  };

  if (isSaksiCat) {
    const noAliasesSaksi1 = [
      'NO_SPGIL_SAKSI_1',
      'NO_SPGL_SAKSI_1',
      'NOMOR_SPGIL_SAKSI_1',
      'NOMOR_SPGL_SAKSI_1',
      'NOMOR_PANGGILAN_SAKSI_1',
      'NO_PANGGILAN_SAKSI_1',
      'NO_SURAT_PANGGILAN_SAKSI_1',
      'NOMOR_SURAT_PANGGILAN_SAKSI_1'
    ];
    const tglAliasesSaksi1 = [
      'TGL_SPGIL_SAKSI_1',
      'TGL_SPGL_SAKSI_1',
      'TANGGAL_SPGIL_SAKSI_1',
      'TANGGAL_SPGL_SAKSI_1',
      'TANGGAL_PANGGILAN_SAKSI_1',
      'TGL_PANGGILAN_SAKSI_1',
      'TGL_SURAT_PANGGILAN_SAKSI_1',
      'TANGGAL_SURAT_PANGGILAN_SAKSI_1'
    ];
    if (cleanNo) noAliasesSaksi1.forEach((k) => setKeyBoth(k, cleanNo));
    if (dateValueToSet) tglAliasesSaksi1.forEach((k) => setKeyBoth(k, dateValueToSet));
    if (rawDocDate || cleanFormattedDate) {
      assignDecomposedDateTags(targetObj, rawDocDate || cleanFormattedDate, ['SPGIL_SAKSI_1', 'SPGL_SAKSI_1', 'PANGGILAN_SAKSI_1']);
    }
  } else {
    const noAliasesTsk1 = [
      'NO_SPGIL_TSK_1',
      'NO_SPGL_TSK_1',
      'NOMOR_SPGIL_TSK_1',
      'NOMOR_SPGL_TSK_1',
      'NOMOR_PANGGILAN_TSK_1',
      'NO_PANGGILAN_TSK_1',
      'NO_SURAT_PANGGILAN_TSK_1',
      'NOMOR_SURAT_PANGGILAN_TSK_1',
      'NOMOR_PANGGILAN_TERSANGKA_1',
      'NO_PANGGILAN_TERSANGKA_1'
    ];
    const tglAliasesTsk1 = [
      'TGL_SPGIL_TSK_1',
      'TGL_SPGL_TSK_1',
      'TANGGAL_SPGIL_TSK_1',
      'TANGGAL_SPGL_TSK_1',
      'TANGGAL_PANGGILAN_TSK_1',
      'TGL_PANGGILAN_TSK_1',
      'TGL_SURAT_PANGGILAN_TSK_1',
      'TANGGAL_SURAT_PANGGILAN_TSK_1',
      'TANGGAL_PANGGILAN_TERSANGKA_1',
      'TGL_PANGGILAN_TERSANGKA_1'
    ];
    if (cleanNo) noAliasesTsk1.forEach((k) => setKeyBoth(k, cleanNo));
    if (dateValueToSet) tglAliasesTsk1.forEach((k) => setKeyBoth(k, dateValueToSet));
    if (rawDocDate || cleanFormattedDate) {
      assignDecomposedDateTags(targetObj, rawDocDate || cleanFormattedDate, ['SPGIL_TSK_1', 'SPGL_TSK_1', 'PANGGILAN_TSK_1']);
    }
  }
}

/**
 * Resolver 4-Lapis Dokumen Arsip Per-Tersangka (TAP_TSK, SPRIN_KAP, SPRIN_HAN).
 * Memastikan tersangka ke-1..ke-5 tidak pernah tertukar/mewarisi nomor milik tersangka lain.
 */
export function resolvePerSuspectDocuments(suspectList = [], archivedDocs = [], docCategory = 'TAP_TSK') {
  const validSuspects = Array.isArray(suspectList) ? suspectList : [];
  if (validSuspects.length === 0) return [];

  const pickVal = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s !== '' && s !== '-' && s !== 'null' && s !== 'undefined') return s;
      }
    }
    return '';
  };

  const matchingDocs = (Array.isArray(archivedDocs) ? archivedDocs : [])
    .filter((doc) => {
      if (!doc) return false;
      const rawUp = String(doc.template_code || doc.code || doc.document_type || '').toUpperCase().trim();
      const canon = toCanonicalMindikCode(rawUp, doc.doc_title || doc.title || doc.document_name || '');
      if (docCategory === 'TAP_TSK') return canon === 'TAP_TSK';
      if (docCategory === 'SPRIN_KAP') return canon === 'SPRIN_KAP_DAN_BA' || rawUp === 'SPRIN_KAP' || rawUp === 'SP_KAP';
      if (docCategory === 'SPRIN_HAN') return canon === 'SPRIN_HAN_DAN_BA' || rawUp === 'SPRIN_HAN' || rawUp === 'SP_HAN';
      if (docCategory === 'PERPANJANGAN_PU') {
        return canon === 'SPRIN_PANJANG_HAN_40_KN_DAN_BA' || canon === 'MINTA_PANJANG_HAN_40_KN' || rawUp.includes('PANJANG_HAN_40') || rawUp.includes('PERPANJANGAN_HAN_PU');
      }
      if (docCategory === 'PERPANJANGAN_PN1') {
        return canon === 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA' || canon === 'MINTA_PANJANG_HAN_30_KPN1' || rawUp.includes('KPN1') || rawUp.includes('PN_1') || rawUp.includes('PN1');
      }
      if (docCategory === 'PERPANJANGAN_PN2') {
        return canon === 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA' || canon === 'MINTA_PANJANG_HAN_30_KPN2' || rawUp.includes('KPN2') || rawUp.includes('PN_2') || rawUp.includes('PN2');
      }
      return false;
    })
    .map((doc) => {
      const ext = extractArchivedDocNumberAndDate(doc);
      const mv = ext.metaObj || {};
      return {
        doc,
        docNo: ext.docNo,
        rawDocDate: ext.rawDocDate,
        formattedDocDate: ext.formattedDocDate,
        metaObj: mv,
        target: extractDocTargetSuspectInfo(mv)
      };
    })
    .filter((entry) => isValidOfficialDocNumber(entry.docNo))
    .sort((a, b) => new Date(a.doc?.created_at || 0).getTime() - new Date(b.doc?.created_at || 0).getTime());

  const results = new Array(validSuspects.length).fill(null);
  const claimedDocIndices = new Set();

  // Pass 1: Prioritas Lapis 1 (ID di meta_values) -> Lapis 2 (Nama di meta_values) -> Lapis 3 (Kolom row tersangka)
  validSuspects.forEach((s, idx) => {
    if (!s || typeof s !== 'object') {
      results[idx] = { docNo: '', rawDocDate: '', formattedDocDate: '', metaObj: {} };
      return;
    }
    const sId = s.id ? String(s.id).trim() : '';
    const sName = String(s.nama || s.nama_lengkap || '').trim().toLowerCase();

    // Lapis 1: Cocok target_suspect_id / suspect_data.id
    if (sId) {
      for (let k = matchingDocs.length - 1; k >= 0; k--) {
        if (matchingDocs[k].target.ids.includes(sId)) {
          claimedDocIndices.add(k);
          results[idx] = {
            docNo: matchingDocs[k].docNo,
            rawDocDate: matchingDocs[k].rawDocDate,
            formattedDocDate: matchingDocs[k].formattedDocDate,
            metaObj: matchingDocs[k].metaObj || {}
          };
          return;
        }
      }
    }

    // Lapis 2: Cocok target_suspect_name / TERSANGKA_NAMA / SUBJEK_NAMA
    if (sName) {
      for (let k = matchingDocs.length - 1; k >= 0; k--) {
        if (matchingDocs[k].target.names.includes(sName)) {
          claimedDocIndices.add(k);
          results[idx] = {
            docNo: matchingDocs[k].docNo,
            rawDocDate: matchingDocs[k].rawDocDate,
            formattedDocDate: matchingDocs[k].formattedDocDate,
            metaObj: matchingDocs[k].metaObj || {}
          };
          return;
        }
      }
    }

    // Lapis 3: Kolom langsung milik baris public.case_suspects tersangka ini
    let rowNo = '';
    let rowDate = '';
    if (docCategory === 'TAP_TSK') {
      rowNo = pickVal(s.nomor_sp_tap, s.no_sp_tap_tsk, s.no_sp_tap, s.nomor_sptap, s.no_sptap_tsk);
      rowDate = pickVal(s.tanggal_sp_tap, s.tgl_sp_tap_tsk, s.tgl_sp_tap, s.tanggal_sptap, s.tgl_sptap_tsk);
    } else if (docCategory === 'SPRIN_KAP') {
      rowNo = pickVal(s.no_sprin_kap, s.nomor_sprin_kap);
      rowDate = pickVal(s.tgl_sprin_kap, s.tanggal_sprin_kap);
    } else if (docCategory === 'SPRIN_HAN') {
      rowNo = pickVal(s.no_sprin_han, s.nomor_sprin_han);
      rowDate = pickVal(s.tgl_sprin_han, s.tanggal_sprin_han);
    } else if (docCategory === 'PERPANJANGAN_PU') {
      rowNo = pickVal(s.no_perpanjangan_pu, s.no_panjang_han_kn, s.no_sprin_han_kn);
      rowDate = pickVal(s.tgl_perpanjangan_pu, s.tgl_panjang_han_kn, s.tgl_sprin_han_kn);
    } else if (docCategory === 'PERPANJANGAN_PN1') {
      rowNo = pickVal(s.no_perpanjangan_pn_1, s.no_sprin_han_pn_1, s.no_tap_han_pn_1);
      rowDate = pickVal(s.tgl_perpanjangan_pn_1, s.tgl_sprin_han_pn_1, s.tgl_tap_han_pn_1);
    } else if (docCategory === 'PERPANJANGAN_PN2') {
      rowNo = pickVal(s.no_perpanjangan_pn_2, s.no_sprin_han_pn_2, s.no_tap_han_pn_2);
      rowDate = pickVal(s.tgl_perpanjangan_pn_2, s.tgl_sprin_han_pn_2, s.tgl_tap_han_pn_2);
    }
    if (rowNo && isValidOfficialDocNumber(rowNo)) {
      matchingDocs.forEach((m, k) => {
        if (m.docNo === rowNo) claimedDocIndices.add(k);
      });
      const matchedByNo = matchingDocs.find(m => m.docNo === rowNo);
      const effDate = rowDate || matchedByNo?.rawDocDate || '';
      results[idx] = {
        docNo: rowNo,
        rawDocDate: effDate,
        formattedDocDate: effDate ? formatTanggalIndonesia(effDate) : '',
        metaObj: matchedByNo?.metaObj || {}
      };
    }
  });

  // Pass 2 (Lapis 4): Fallback arsip lama berurutan kronologis (HANYA dokumen tanpa klaim target lain)
  validSuspects.forEach((s, idx) => {
    if (results[idx] !== null) return;
    const candidate = matchingDocs[idx];
    const isUnclaimedLegacy = candidate &&
      !claimedDocIndices.has(idx) &&
      candidate.target.ids.length === 0 &&
      candidate.target.names.length === 0;

    if (isUnclaimedLegacy) {
      claimedDocIndices.add(idx);
      results[idx] = {
        docNo: candidate.docNo,
        rawDocDate: candidate.rawDocDate,
        formattedDocDate: candidate.formattedDocDate,
        metaObj: candidate.metaObj || {}
      };
    } else {
      results[idx] = { docNo: '', rawDocDate: '', formattedDocDate: '', metaObj: {} };
    }
  });

  return results;
}

/**
 * Mengisi tag terindeks TSK_1..6 / TERSANGKA_1..6 / NOMOR_TAP_TSK_1..6 serta SPRIN_KAP & SPRIN_HAN per tersangka,
 * sekaligus membangun objek loop {#TERSANGKA} & {#DASAR_TAP_TSK} lengkap beserta tata bahasa tunggal/jamak.
 */
export function buildEnrichedSuspectLoopEntry(s, idx = 0) {
  const norm = normalizeSubjectRecord(s, idx, 'Tersangka') || s || {};
  const noStr = String(idx + 1);
  const hurufStr = String.fromCharCode(97 + (idx % 26));
  const hurufKapStr = hurufStr.toUpperCase();
  const romanOrder = idx === 0 ? 'I' : idx === 1 ? 'II' : idx === 2 ? 'III' : idx === 3 ? 'IV' : idx === 4 ? 'V' : idx === 5 ? 'VI' : noStr;
  const namaVal = norm.nama || s?.nama || '';
  const nikVal = norm.nik || s?.nik || '';
  const wnVal = norm.kewarganegaraan || s?.kewarganegaraan || 'Indonesia';
  const jkVal = norm.jenis_kelamin || s?.jenis_kelamin || 'Laki-laki';
  const sTglLahirRaw = s?.tgl_lahir || s?.tanggal_lahir || norm.tgl_lahir || '';
  const formattedTglLahir = formatTanggalIndonesia(sTglLahirRaw) || norm.tgl_lahir || '';
  const tempatLahirVal = norm.tempat_lahir || s?.tempat_lahir || '';
  const ttlVal = norm.ttl || ((tempatLahirVal && formattedTglLahir) ? `${tempatLahirVal}, ${formattedTglLahir}` : (s?.ttl || s?.pob_dob || tempatLahirVal || ''));
  const rawUmurVal = norm.umur || s?.umur || '';
  const umurVal = rawUmurVal ? (String(rawUmurVal).includes('Tahun') ? String(rawUmurVal) : `${rawUmurVal} Tahun`) : '';
  const kerjaVal = norm.pekerjaan || s?.pekerjaan || '';
  const didikVal = norm.pendidikan || s?.pendidikan || '';
  const agamaVal = norm.agama || s?.agama || '';
  const kawinVal = norm.status_pernikahan || s?.status_pernikahan || s?.status_kawin || s?.marital_status || '';
  const alamatVal = norm.alamat || s?.alamat || '';

  const tapNo = s?.nomor_sp_tap || s?.no_sp_tap_tsk || norm.nomor_sp_tap || '';
  const tapTgl = s?.tanggal_sp_tap || s?.tgl_sp_tap_tsk || norm.tanggal_sp_tap || '';
  const kapNo = s?.no_sprin_kap || s?.no_sp_kap || norm.no_sprin_kap || '';
  const kapTgl = s?.tgl_sprin_kap || s?.tgl_sp_kap || norm.tgl_sprin_kap || '';
  const hanNo = s?.no_sprin_han || norm.no_sprin_han || '';
  const hanTgl = s?.tgl_sprin_han || norm.tgl_sprin_han || '';
  const mulaiDitahanVal = s?.mulai_ditahan || s?.MULAI_DITAHAN || hanTgl || '';
  const akhirDitahanVal = s?.akhir_ditahan || s?.AKHIR_DITAHAN || s?.tanggal_akhir_han_penyidik || '';
  const tglAkhirHanPenyidikVal = s?.tanggal_akhir_han_penyidik || s?.tgl_akhir_han_penyidik || akhirDitahanVal || '';
  const puNo = s?.no_perpanjangan_pu || s?.no_sprin_han_kn || s?.no_panjang_han_kn || '';
  const puTgl = s?.tgl_perpanjangan_pu || s?.tgl_sprin_han_kn || s?.tgl_panjang_han_kn || '';
  const pn1No = s?.no_perpanjangan_pn_1 || s?.no_sprin_han_pn_1 || s?.no_tap_han_pn_1 || '';
  const pn1Tgl = s?.tgl_perpanjangan_pn_1 || s?.tgl_sprin_han_pn_1 || s?.tgl_tap_han_pn_1 || '';
  const pn2No = s?.no_perpanjangan_pn_2 || s?.no_sprin_han_pn_2 || s?.no_tap_han_pn_2 || '';
  const pn2Tgl = s?.tgl_perpanjangan_pn_2 || s?.tgl_sprin_han_pn_2 || s?.tgl_tap_han_pn_2 || '';
  const tglMulaiJangHanPuVal = s?.tgl_mulai_jang_han_pu || s?.TGL_MULAI_JANG_HAN_PU || '';
  const tglAkhirHanPuVal = s?.tgl_akhir_han_pu || s?.TGL_AKHIR_HAN_PU || '';
  const tglMulaiJangHanPn1Val = s?.tgl_mulai_jang_han_pn1 || s?.TGL_MULAI_JANG_HAN_PN1 || '';
  const tglAkhirHanPn1Val = s?.tgl_akhir_han_pn1 || s?.TGL_AKHIR_HAN_PN1 || '';
  const tglMulaiJangHanPn2Val = s?.tgl_mulai_jang_han_pn2 || s?.TGL_MULAI_JANG_HAN_PN2 || '';
  const tglAkhirHanPn2Val = s?.tgl_akhir_han_pn2 || s?.TGL_AKHIR_HAN_PN2 || '';
  const panjangHanKnVal = s?.panjang_han_kn || s?.PANJANG_HAN_KN || s?.no_panjang_han_kn || puNo || '';
  const tapHanPn1Val = s?.tap_han_pn_1 || s?.TAP_HAN_PN_1 || s?.no_tap_han_pn_1 || pn1No || '';
  const tapHanPn2Val = s?.tap_han_pn_2 || s?.TAP_HAN_PN_2 || s?.no_tap_han_pn_2 || pn2No || '';
  const tempatHanVal = s?.tempat_penahanan || s?.TEMPAT_PENAHANAN || s?.tempat_han || s?.TEMPAT_HAN || 'Rumah Tahanan Negara Polres Kolaka Timur';

  return {
    ...s,
    ...norm,
    no: noStr,
    NO: noStr,
    urut: noStr,
    URUT: noStr,
    huruf: hurufStr,
    HURUF: hurufStr,
    huruf_kapital: hurufKapStr,
    HURUF_KAPITAL: hurufKapStr,
    urutan_tersangka: idx + 1,
    URUTAN_TERSANGKA: idx + 1,
    status_tersangka_label: s?.status_tersangka_label || `Tersangka ${romanOrder}`,
    STATUS_TERSANGKA_LABEL: s?.status_tersangka_label || `Tersangka ${romanOrder}`,
    nama: namaVal,
    NAMA: namaVal,
    nama_tersangka: namaVal,
    NAMA_TERSANGKA: namaVal,
    nama_tsk: namaVal,
    NAMA_TSK: namaVal,
    nik: nikVal,
    NIK: nikVal,
    kewarganegaraan: wnVal,
    KEWARGANEGARAAN: wnVal,
    warga_negara: wnVal,
    WARGA_NEGARA: wnVal,
    jenis_kelamin: jkVal,
    JENIS_KELAMIN: jkVal,
    jk: jkVal,
    JK: jkVal,
    tempat_lahir: tempatLahirVal,
    TEMPAT_LAHIR: tempatLahirVal,
    tgl_lahir: formattedTglLahir,
    TGL_LAHIR: formattedTglLahir,
    tanggal_lahir: formattedTglLahir,
    TANGGAL_LAHIR: formattedTglLahir,
    ttl: ttlVal,
    TTL: ttlVal,
    tempat_tanggal_lahir: ttlVal,
    TEMPAT_TANGGAL_LAHIR: ttlVal,
    umur: umurVal,
    UMUR: umurVal,
    usia: umurVal,
    USIA: umurVal,
    pekerjaan: kerjaVal,
    PEKERJAAN: kerjaVal,
    kerja: kerjaVal,
    KERJA: kerjaVal,
    kerja_tsk: kerjaVal,
    KERJA_TSK: kerjaVal,
    pekerjaan_tsk: kerjaVal,
    PEKERJAAN_TSK: kerjaVal,
    pendidikan: didikVal,
    PENDIDIKAN: didikVal,
    pendidikan_terakhir: didikVal,
    PENDIDIKAN_TERAKHIR: didikVal,
    agama: agamaVal,
    AGAMA: agamaVal,
    status_kawin: kawinVal,
    STATUS_KAWIN: kawinVal,
    status_nikah: kawinVal,
    STATUS_NIKAH: kawinVal,
    status_pernikahan: kawinVal,
    STATUS_PERNIKAHAN: kawinVal,
    alamat: alamatVal,
    ALAMAT: alamatVal,
    alamat_tsk: alamatVal,
    ALAMAT_TSK: alamatVal,
    tempat_tinggal: alamatVal,
    TEMPAT_TINGGAL: alamatVal,
    no_sp_tap_tsk: tapNo,
    NO_SP_TAP_TSK: tapNo,
    nomor_sp_tap: tapNo,
    NOMOR_SP_TAP: tapNo,
    nomor_sp_tap_tsk: tapNo,
    NOMOR_SP_TAP_TSK: tapNo,
    no_sp_tap: tapNo,
    NO_SP_TAP: tapNo,
    tgl_sp_tap_tsk: tapTgl,
    TGL_SP_TAP_TSK: tapTgl,
    tanggal_sp_tap: tapTgl,
    TANGGAL_SP_TAP: tapTgl,
    tanggal_sp_tap_tsk: tapTgl,
    TANGGAL_SP_TAP_TSK: tapTgl,
    tgl_sp_tap: tapTgl,
    TGL_SP_TAP: tapTgl,
    no_sprin_kap: kapNo,
    NO_SPRIN_KAP: kapNo,
    no_sp_kap: kapNo,
    NO_SP_KAP: kapNo,
    tgl_sprin_kap: kapTgl,
    TGL_SPRIN_KAP: kapTgl,
    tgl_sp_kap: kapTgl,
    TGL_SP_KAP: kapTgl,
    no_sprin_han: hanNo,
    NO_SPRIN_HAN: hanNo,
    tgl_sprin_han: hanTgl,
    TGL_SPRIN_HAN: hanTgl,
    mulai_ditahan: mulaiDitahanVal,
    MULAI_DITAHAN: mulaiDitahanVal,
    akhir_ditahan: akhirDitahanVal,
    AKHIR_DITAHAN: akhirDitahanVal,
    tanggal_akhir_han_penyidik: tglAkhirHanPenyidikVal,
    TANGGAL_AKHIR_HAN_PENYIDIK: tglAkhirHanPenyidikVal,
    tgl_akhir_han_penyidik: tglAkhirHanPenyidikVal,
    TGL_AKHIR_HAN_PENYIDIK: tglAkhirHanPenyidikVal,
    no_perpanjangan_pu: puNo,
    NO_PERPANJANGAN_PU: puNo,
    no_sprin_han_kn: puNo,
    NO_SPRIN_HAN_KN: puNo,
    no_panjang_han_kn: puNo,
    NO_PANJANG_HAN_KN: puNo,
    tgl_perpanjangan_pu: puTgl,
    TGL_PERPANJANGAN_PU: puTgl,
    tgl_sprin_han_kn: puTgl,
    TGL_SPRIN_HAN_KN: puTgl,
    tanggal_sprin_han_kn: puTgl,
    TANGGAL_SPRIN_HAN_KN: puTgl,
    tgl_panjang_han_kn: puTgl,
    TGL_PANJANG_HAN_KN: puTgl,
    no_perpanjangan_pn_1: pn1No,
    NO_PERPANJANGAN_PN_1: pn1No,
    no_sprin_han_pn_1: pn1No,
    NO_SPRIN_HAN_PN_1: pn1No,
    no_sprin_han_pn1: pn1No,
    NO_SPRIN_HAN_PN1: pn1No,
    no_tap_han_pn_1: tapHanPn1Val,
    NO_TAP_HAN_PN_1: tapHanPn1Val,
    tgl_perpanjangan_pn_1: pn1Tgl,
    TGL_PERPANJANGAN_PN_1: pn1Tgl,
    tgl_sprin_han_pn_1: pn1Tgl,
    TGL_SPRIN_HAN_PN_1: pn1Tgl,
    tanggal_sprin_han_pn_1: pn1Tgl,
    TANGGAL_SPRIN_HAN_PN_1: pn1Tgl,
    tgl_sprin_han_pn1: pn1Tgl,
    TGL_SPRIN_HAN_PN1: pn1Tgl,
    tgl_tap_han_pn_1: pn1Tgl,
    TGL_TAP_HAN_PN_1: pn1Tgl,
    no_perpanjangan_pn_2: pn2No,
    NO_PERPANJANGAN_PN_2: pn2No,
    no_sprin_han_pn_2: pn2No,
    NO_SPRIN_HAN_PN_2: pn2No,
    no_sprin_han_pn2: pn2No,
    NO_SPRIN_HAN_PN2: pn2No,
    no_tap_han_pn_2: tapHanPn2Val,
    NO_TAP_HAN_PN_2: tapHanPn2Val,
    tgl_perpanjangan_pn_2: pn2Tgl,
    TGL_PERPANJANGAN_PN_2: pn2Tgl,
    tgl_sprin_han_pn_2: pn2Tgl,
    TGL_SPRIN_HAN_PN_2: pn2Tgl,
    tanggal_sprin_han_pn_2: pn2Tgl,
    TANGGAL_SPRIN_HAN_PN_2: pn2Tgl,
    tgl_sprin_han_pn2: pn2Tgl,
    TGL_SPRIN_HAN_PN2: pn2Tgl,
    tgl_tap_han_pn_2: pn2Tgl,
    TGL_TAP_HAN_PN_2: pn2Tgl,
    tgl_mulai_jang_han_pu: tglMulaiJangHanPuVal,
    TGL_MULAI_JANG_HAN_PU: tglMulaiJangHanPuVal,
    tanggal_mulai_jang_han_pu: tglMulaiJangHanPuVal,
    TANGGAL_MULAI_JANG_HAN_PU: tglMulaiJangHanPuVal,
    tgl_akhir_han_pu: tglAkhirHanPuVal,
    TGL_AKHIR_HAN_PU: tglAkhirHanPuVal,
    tgl_akhir_jang_han_pu: tglAkhirHanPuVal,
    TGL_AKHIR_JANG_HAN_PU: tglAkhirHanPuVal,
    tanggal_akhir_han_pu: tglAkhirHanPuVal,
    TANGGAL_AKHIR_HAN_PU: tglAkhirHanPuVal,
    tgl_mulai_jang_han_pn1: tglMulaiJangHanPn1Val,
    TGL_MULAI_JANG_HAN_PN1: tglMulaiJangHanPn1Val,
    tgl_mulai_jang_han_pn_1: tglMulaiJangHanPn1Val,
    TGL_MULAI_JANG_HAN_PN_1: tglMulaiJangHanPn1Val,
    tanggal_mulai_jang_han_pn1: tglMulaiJangHanPn1Val,
    TANGGAL_MULAI_JANG_HAN_PN1: tglMulaiJangHanPn1Val,
    tgl_akhir_han_pn1: tglAkhirHanPn1Val,
    TGL_AKHIR_HAN_PN1: tglAkhirHanPn1Val,
    tgl_akhir_han_pn_1: tglAkhirHanPn1Val,
    TGL_AKHIR_HAN_PN_1: tglAkhirHanPn1Val,
    tgl_akhir_jang_han_pn1: tglAkhirHanPn1Val,
    TGL_AKHIR_JANG_HAN_PN1: tglAkhirHanPn1Val,
    tanggal_akhir_han_pn1: tglAkhirHanPn1Val,
    TANGGAL_AKHIR_HAN_PN1: tglAkhirHanPn1Val,
    tgl_mulai_jang_han_pn2: tglMulaiJangHanPn2Val,
    TGL_MULAI_JANG_HAN_PN2: tglMulaiJangHanPn2Val,
    tgl_mulai_jang_han_pn_2: tglMulaiJangHanPn2Val,
    TGL_MULAI_JANG_HAN_PN_2: tglMulaiJangHanPn2Val,
    tanggal_mulai_jang_han_pn2: tglMulaiJangHanPn2Val,
    TANGGAL_MULAI_JANG_HAN_PN2: tglMulaiJangHanPn2Val,
    tgl_akhir_han_pn2: tglAkhirHanPn2Val,
    TGL_AKHIR_HAN_PN2: tglAkhirHanPn2Val,
    tgl_akhir_han_pn_2: tglAkhirHanPn2Val,
    TGL_AKHIR_HAN_PN_2: tglAkhirHanPn2Val,
    tgl_akhir_jang_han_pn2: tglAkhirHanPn2Val,
    TGL_AKHIR_JANG_HAN_PN2: tglAkhirHanPn2Val,
    tanggal_akhir_han_pn2: tglAkhirHanPn2Val,
    TANGGAL_AKHIR_HAN_PN2: tglAkhirHanPn2Val,
    panjang_han_kn: panjangHanKnVal,
    PANJANG_HAN_KN: panjangHanKnVal,
    tap_han_pn_1: tapHanPn1Val,
    TAP_HAN_PN_1: tapHanPn1Val,
    tap_han_pn_2: tapHanPn2Val,
    TAP_HAN_PN_2: tapHanPn2Val,
    tempat_penahanan: tempatHanVal,
    TEMPAT_PENAHANAN: tempatHanVal,
    tempat_han: tempatHanVal,
    TEMPAT_HAN: tempatHanVal,
    tempat_rutan_han: tempatHanVal,
    TEMPAT_RUTAN_HAN: tempatHanVal
  };
}

export function applyPerSuspectDocTags(targetObj, suspectList = [], archivedDocs = []) {
  if (!targetObj || typeof targetObj !== 'object') return [];
  const validSuspects = (Array.isArray(suspectList) ? suspectList : []).filter(s => s && s.nama);

  const tapResolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'TAP_TSK');
  const kapResolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'SPRIN_KAP');
  const hanResolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'SPRIN_HAN');
  const puResolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'PERPANJANGAN_PU');
  const pn1Resolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'PERPANJANGAN_PN1');
  const pn2Resolved = resolvePerSuspectDocuments(validSuspects, archivedDocs, 'PERPANJANGAN_PN2');

  const setIndexedAlias = (key, val) => {
    targetObj[key] = val;
    targetObj[key.toLowerCase()] = val;
  };

  for (let i = 1; i <= 6; i++) {
    const idx = i - 1;
    const tap = tapResolved[idx] || { docNo: '', rawDocDate: '', formattedDocDate: '' };
    const kap = kapResolved[idx] || { docNo: '', rawDocDate: '', formattedDocDate: '' };
    const han = hanResolved[idx] || { docNo: '', rawDocDate: '', formattedDocDate: '' };

    const tapNo = tap.docNo || '';
    const tapTgl = tap.formattedDocDate || '';
    const kapNo = kap.docNo || '';
    const kapTgl = kap.formattedDocDate || '';
    const hanNo = han.docNo || '';
    const hanTgl = han.formattedDocDate || '';

    // Alias SP Tap Tersangka per-tersangka (1..6, slot di atas jumlahTsk otomatis '')
    setIndexedAlias(`TSK_${i}_NOMOR_SP_TAP`, tapNo);
    setIndexedAlias(`TSK_${i}_NO_SP_TAP`, tapNo);
    setIndexedAlias(`TSK_${i}_NO_SP_TAP_TSK`, tapNo);
    setIndexedAlias(`TSK_${i}_NOMOR_SP_TAP_TSK`, tapNo);
    setIndexedAlias(`TSK_${i}_NOMOR_TAP_TSK`, tapNo);
    setIndexedAlias(`TSK_${i}_NO_TAP_TSK`, tapNo);
    setIndexedAlias(`TERSANGKA_${i}_NOMOR_SP_TAP`, tapNo);
    setIndexedAlias(`TERSANGKA_${i}_NO_SP_TAP`, tapNo);
    setIndexedAlias(`TERSANGKA_${i}_NO_SP_TAP_TSK`, tapNo);
    setIndexedAlias(`NOMOR_TAP_TSK_${i}`, tapNo);
    setIndexedAlias(`NO_SP_TAP_TSK_${i}`, tapNo);

    setIndexedAlias(`TSK_${i}_TGL_SP_TAP`, tapTgl);
    setIndexedAlias(`TSK_${i}_TANGGAL_SP_TAP`, tapTgl);
    setIndexedAlias(`TSK_${i}_TGL_SP_TAP_TSK`, tapTgl);
    setIndexedAlias(`TSK_${i}_TANGGAL_SP_TAP_TSK`, tapTgl);
    setIndexedAlias(`TSK_${i}_TANGGAL_TAP_TSK`, tapTgl);
    setIndexedAlias(`TSK_${i}_TGL_TAP_TSK`, tapTgl);
    setIndexedAlias(`TERSANGKA_${i}_TGL_SP_TAP`, tapTgl);
    setIndexedAlias(`TERSANGKA_${i}_TANGGAL_SP_TAP`, tapTgl);
    setIndexedAlias(`TANGGAL_TAP_TSK_${i}`, tapTgl);
    setIndexedAlias(`TGL_SP_TAP_TSK_${i}`, tapTgl);

    // Alias Sprin Kap per-tersangka
    setIndexedAlias(`TSK_${i}_NOMOR_SPRIN_KAP`, kapNo);
    setIndexedAlias(`TSK_${i}_NO_SPRIN_KAP`, kapNo);
    setIndexedAlias(`TERSANGKA_${i}_NO_SPRIN_KAP`, kapNo);
    setIndexedAlias(`NOMOR_SPRIN_KAP_${i}`, kapNo);
    setIndexedAlias(`TSK_${i}_TGL_SPRIN_KAP`, kapTgl);
    setIndexedAlias(`TSK_${i}_TANGGAL_SPRIN_KAP`, kapTgl);
    setIndexedAlias(`TERSANGKA_${i}_TGL_SPRIN_KAP`, kapTgl);
    setIndexedAlias(`TANGGAL_SPRIN_KAP_${i}`, kapTgl);

    // Alias Sprin Han per-tersangka
    setIndexedAlias(`TSK_${i}_NOMOR_SPRIN_HAN`, hanNo);
    setIndexedAlias(`TSK_${i}_NO_SPRIN_HAN`, hanNo);
    setIndexedAlias(`TERSANGKA_${i}_NO_SPRIN_HAN`, hanNo);
    setIndexedAlias(`NOMOR_SPRIN_HAN_${i}`, hanNo);
    setIndexedAlias(`TSK_${i}_TGL_SPRIN_HAN`, hanTgl);
    setIndexedAlias(`TSK_${i}_TANGGAL_SPRIN_HAN`, hanTgl);
    setIndexedAlias(`TERSANGKA_${i}_TGL_SPRIN_HAN`, hanTgl);
    setIndexedAlias(`TANGGAL_SPRIN_HAN_${i}`, hanTgl);
  }

  const enrichedList = validSuspects.map((s, idx) => {
    const tap = tapResolved[idx] || {};
    const kap = kapResolved[idx] || {};
    const han = hanResolved[idx] || {};
    const pu = puResolved[idx] || {};
    const pn1 = pn1Resolved[idx] || {};
    const pn2 = pn2Resolved[idx] || {};

    const hanMeta = han.metaObj || {};
    const puMeta = pu.metaObj || {};
    const pn1Meta = pn1.metaObj || {};
    const pn2Meta = pn2.metaObj || {};

    const hanStartIso =
      toIsoDateString(hanMeta.MULAI_DITAHAN_ISO || hanMeta.MULAI_DITAHAN || hanMeta.TGL_MULAI_HAN) ||
      toIsoDateString(han.rawDocDate || s.tgl_sprin_han || s.mulai_ditahan) ||
      '';
    const hanEndIso =
      toIsoDateString(hanMeta.AKHIR_DITAHAN_ISO || hanMeta.AKHIR_DITAHAN || hanMeta.TGL_AKHIR_HAN || hanMeta.TGL_AKHIR_HAN_PENYIDIK || hanMeta.TANGGAL_AKHIR_HAN_PENYIDIK) ||
      (hanStartIso ? addDaysToIsoDate(hanStartIso, 19) : '') ||
      toIsoDateString(s.akhir_ditahan || s.tanggal_akhir_han_penyidik || s.tgl_akhir_han_penyidik);

    const puStartIso =
      toIsoDateString(puMeta.MULAI_DITAHAN_ISO || puMeta.TGL_MULAI_JANG_HAN_PU || puMeta.MULAI_PERPANJANGAN || puMeta.MULAI_DITAHAN) ||
      (hanEndIso ? addDaysToIsoDate(hanEndIso, 1) : '') ||
      toIsoDateString(pu.rawDocDate || s.tgl_mulai_jang_han_pu);
    const puEndIso =
      toIsoDateString(puMeta.AKHIR_DITAHAN_ISO || puMeta.TGL_AKHIR_HAN_PU || puMeta.AKHIR_PERPANJANGAN || puMeta.AKHIR_DITAHAN) ||
      (puStartIso ? addDaysToIsoDate(puStartIso, 39) : '') ||
      toIsoDateString(s.tgl_akhir_han_pu);

    const pn1StartIso =
      toIsoDateString(pn1Meta.MULAI_DITAHAN_ISO || pn1Meta.TGL_MULAI_JANG_HAN_PN1 || pn1Meta.MULAI_PERPANJANGAN || pn1Meta.MULAI_DITAHAN) ||
      (puEndIso ? addDaysToIsoDate(puEndIso, 1) : '') ||
      toIsoDateString(pn1.rawDocDate || s.tgl_mulai_jang_han_pn1);
    const pn1EndIso =
      toIsoDateString(pn1Meta.AKHIR_DITAHAN_ISO || pn1Meta.TGL_AKHIR_HAN_PN1 || pn1Meta.AKHIR_PERPANJANGAN || pn1Meta.AKHIR_DITAHAN) ||
      (pn1StartIso ? addDaysToIsoDate(pn1StartIso, 29) : '') ||
      toIsoDateString(s.tgl_akhir_han_pn1);

    const pn2StartIso =
      toIsoDateString(pn2Meta.MULAI_DITAHAN_ISO || pn2Meta.TGL_MULAI_JANG_HAN_PN2 || pn2Meta.MULAI_PERPANJANGAN || pn2Meta.MULAI_DITAHAN) ||
      (pn1EndIso ? addDaysToIsoDate(pn1EndIso, 1) : '') ||
      toIsoDateString(pn2.rawDocDate || s.tgl_mulai_jang_han_pn2);
    const pn2EndIso =
      toIsoDateString(pn2Meta.AKHIR_DITAHAN_ISO || pn2Meta.TGL_AKHIR_HAN_PN2 || pn2Meta.AKHIR_PERPANJANGAN || pn2Meta.AKHIR_DITAHAN) ||
      (pn2StartIso ? addDaysToIsoDate(pn2StartIso, 29) : '') ||
      toIsoDateString(s.tgl_akhir_han_pn2);

    const hanStartFormatted = han.formattedDocDate || (hanStartIso ? formatTanggalIndonesia(hanStartIso) : '');
    const hanEndFormatted = hanEndIso ? formatTanggalIndonesia(hanEndIso) : (s.akhir_ditahan || s.tanggal_akhir_han_penyidik || '');
    const puStartFormatted = puStartIso ? formatTanggalIndonesia(puStartIso) : (s.tgl_mulai_jang_han_pu || '');
    const puEndFormatted = puEndIso ? formatTanggalIndonesia(puEndIso) : (s.tgl_akhir_han_pu || '');
    const pn1StartFormatted = pn1StartIso ? formatTanggalIndonesia(pn1StartIso) : (s.tgl_mulai_jang_han_pn1 || '');
    const pn1EndFormatted = pn1EndIso ? formatTanggalIndonesia(pn1EndIso) : (s.tgl_akhir_han_pn1 || '');
    const pn2StartFormatted = pn2StartIso ? formatTanggalIndonesia(pn2StartIso) : (s.tgl_mulai_jang_han_pn2 || '');
    const pn2EndFormatted = pn2EndIso ? formatTanggalIndonesia(pn2EndIso) : (s.tgl_akhir_han_pn2 || '');

    const resolvedPuNo = pu.docNo || s.no_perpanjangan_pu || s.no_sprin_han_kn || s.no_panjang_han_kn || '';
    const resolvedPuTgl = pu.formattedDocDate || (s.tgl_perpanjangan_pu ? formatTanggalIndonesia(s.tgl_perpanjangan_pu) : '') || (s.tgl_sprin_han_kn ? formatTanggalIndonesia(s.tgl_sprin_han_kn) : '');
    const resolvedPn1No = pn1.docNo || s.no_perpanjangan_pn_1 || s.no_sprin_han_pn_1 || s.no_tap_han_pn_1 || '';
    const resolvedPn1Tgl = pn1.formattedDocDate || (s.tgl_perpanjangan_pn_1 ? formatTanggalIndonesia(s.tgl_perpanjangan_pn_1) : '') || (s.tgl_sprin_han_pn_1 ? formatTanggalIndonesia(s.tgl_sprin_han_pn_1) : '');
    const resolvedPn2No = pn2.docNo || s.no_perpanjangan_pn_2 || s.no_sprin_han_pn_2 || s.no_tap_han_pn_2 || '';
    const resolvedPn2Tgl = pn2.formattedDocDate || (s.tgl_perpanjangan_pn_2 ? formatTanggalIndonesia(s.tgl_perpanjangan_pn_2) : '') || (s.tgl_sprin_han_pn_2 ? formatTanggalIndonesia(s.tgl_sprin_han_pn_2) : '');

    const resolvedPanjangHanKn =
      puMeta.PANJANG_HAN_KN ||
      puMeta.NO_PANJANG_HAN_KN ||
      s.panjang_han_kn ||
      s.no_panjang_han_kn ||
      resolvedPuNo ||
      '';
    const resolvedTapHanPn1 =
      pn1Meta.TAP_HAN_PN_1 ||
      pn1Meta.NO_TAP_HAN_PN_1 ||
      s.tap_han_pn_1 ||
      s.no_tap_han_pn_1 ||
      resolvedPn1No ||
      '';
    const resolvedTapHanPn2 =
      pn2Meta.TAP_HAN_PN_2 ||
      pn2Meta.NO_TAP_HAN_PN_2 ||
      s.tap_han_pn_2 ||
      s.no_tap_han_pn_2 ||
      resolvedPn2No ||
      '';
    const resolvedTempatHan =
      s.tempat_penahanan ||
      s.tempat_han ||
      hanMeta.TEMPAT_PENAHANAN ||
      hanMeta.TEMPAT_HAN ||
      puMeta.TEMPAT_PENAHANAN ||
      puMeta.TEMPAT_HAN ||
      pn1Meta.TEMPAT_PENAHANAN ||
      pn1Meta.TEMPAT_HAN ||
      pn2Meta.TEMPAT_PENAHANAN ||
      pn2Meta.TEMPAT_HAN ||
      targetObj.TEMPAT_PENAHANAN ||
      targetObj.TEMPAT_HAN ||
      'Rumah Tahanan Negara Polres Kolaka Timur';

    const withDocs = {
      ...s,
      nomor_sp_tap: tap.docNo || s.nomor_sp_tap || s.no_sp_tap_tsk || '',
      no_sp_tap_tsk: tap.docNo || s.no_sp_tap_tsk || s.nomor_sp_tap || '',
      tanggal_sp_tap: tap.formattedDocDate || (s.tanggal_sp_tap ? formatTanggalIndonesia(s.tanggal_sp_tap) : ''),
      tgl_sp_tap_tsk: tap.formattedDocDate || (s.tgl_sp_tap_tsk ? formatTanggalIndonesia(s.tgl_sp_tap_tsk) : ''),
      no_sprin_kap: kap.docNo || s.no_sprin_kap || '',
      tgl_sprin_kap: kap.formattedDocDate || (s.tgl_sprin_kap ? formatTanggalIndonesia(s.tgl_sprin_kap) : ''),
      no_sprin_han: han.docNo || s.no_sprin_han || '',
      tgl_sprin_han: hanStartFormatted,
      mulai_ditahan: s.mulai_ditahan || hanStartFormatted || '',
      akhir_ditahan: s.akhir_ditahan || hanEndFormatted || '',
      tanggal_akhir_han_penyidik: hanEndFormatted,
      tgl_akhir_han_penyidik: hanEndFormatted,
      no_perpanjangan_pu: resolvedPuNo,
      no_sprin_han_kn: resolvedPuNo,
      no_panjang_han_kn: resolvedPanjangHanKn,
      tgl_perpanjangan_pu: resolvedPuTgl,
      tgl_sprin_han_kn: resolvedPuTgl,
      tgl_panjang_han_kn: resolvedPuTgl,
      no_perpanjangan_pn_1: resolvedPn1No,
      no_sprin_han_pn_1: resolvedPn1No,
      no_tap_han_pn_1: resolvedTapHanPn1,
      tgl_perpanjangan_pn_1: resolvedPn1Tgl,
      tgl_sprin_han_pn_1: resolvedPn1Tgl,
      tgl_tap_han_pn_1: resolvedPn1Tgl,
      no_perpanjangan_pn_2: resolvedPn2No,
      no_sprin_han_pn_2: resolvedPn2No,
      no_tap_han_pn_2: resolvedTapHanPn2,
      tgl_perpanjangan_pn_2: resolvedPn2Tgl,
      tgl_sprin_han_pn_2: resolvedPn2Tgl,
      tgl_tap_han_pn_2: resolvedPn2Tgl,
      tgl_mulai_jang_han_pu: puStartFormatted,
      tgl_akhir_han_pu: puEndFormatted,
      tgl_mulai_jang_han_pn1: pn1StartFormatted,
      tgl_akhir_han_pn1: pn1EndFormatted,
      tgl_mulai_jang_han_pn2: pn2StartFormatted,
      tgl_akhir_han_pn2: pn2EndFormatted,
      panjang_han_kn: resolvedPanjangHanKn,
      tap_han_pn_1: resolvedTapHanPn1,
      tap_han_pn_2: resolvedTapHanPn2,
      tempat_penahanan: resolvedTempatHan,
      tempat_han: resolvedTempatHan
    };
    return buildEnrichedSuspectLoopEntry(withDocs, idx);
  });

  // Variabel bantuan tata bahasa tunggal/jamak, NAMA_TERSANGKA_DKK, & loop {#DASAR_TAP_TSK}
  const jumlahTsk = enrichedList.length;
  const firstPureSuspectName = String(enrichedList[0]?.NAMA || '').replace(/\s+dkk\.?$/i, '').trim();
  const namaTersangkaDkkVal = (jumlahTsk > 1 && firstPureSuspectName) ? `${firstPureSuspectName} Dkk` : firstPureSuspectName;
  const sebutanTsk = jumlahTsk > 1 ? 'para Tersangka' : 'Tersangka';
  const sebutanTskKapital = jumlahTsk > 1 ? 'Para Tersangka' : 'Tersangka';
  setIndexedAlias('JUMLAH_TERSANGKA', String(jumlahTsk));
  setIndexedAlias('SEBUTAN_TERSANGKA', sebutanTsk);
  setIndexedAlias('SEBUTAN_TERSANGKA_KAPITAL', sebutanTskKapital);
  setIndexedAlias('NAMA_TERSANGKA_DKK', namaTersangkaDkkVal);
  setIndexedAlias('NAMA_TERSANGKA_PERIHAL', namaTersangkaDkkVal);
  enrichedList.forEach((item) => {
    if (item && typeof item === 'object') {
      item.NAMA_TERSANGKA_DKK = namaTersangkaDkkVal;
      item.nama_tersangka_dkk = namaTersangkaDkkVal;
    }
  });

  const dasarTapTskLoop = enrichedList
    .filter((item) => Boolean(item.NO_SP_TAP_TSK))
    .map((item, idx) => {
      const noStr = String(idx + 1);
      const hurufStr = String.fromCharCode(97 + (idx % 26));
      const kalimat = `Surat Ketetapan Penetapan Tersangka Nomor: ${item.NO_SP_TAP_TSK}${item.TGL_SP_TAP_TSK ? `, tanggal ${item.TGL_SP_TAP_TSK}` : ''}, atas nama tersangka ${item.NAMA}`;
      return {
        ...item,
        no: noStr,
        NO: noStr,
        urut: noStr,
        URUT: noStr,
        huruf: hurufStr,
        HURUF: hurufStr,
        NOMOR: item.NO_SP_TAP_TSK,
        nomor: item.NO_SP_TAP_TSK,
        TANGGAL: item.TGL_SP_TAP_TSK,
        tanggal: item.TGL_SP_TAP_TSK,
        DASAR: kalimat,
        dasar: kalimat,
        URAIAN: kalimat,
        uraian: kalimat
      };
    });
  targetObj.DASAR_TAP_TSK = dasarTapTskLoop;
  targetObj.dasar_tap_tsk = dasarTapTskLoop;

  return enrichedList;
}

/**
 * Daftar kode kanonik dokumen individual per-tersangka yang wajib dikunci per-subjek
 * setelah arsip surat tersebut diterbitkan untuk tersangka yang bersangkutan.
 */
export const INDIVIDUAL_SUSPECT_TEMPLATES = new Set([
  'TAP_TSK',
  'SP_TAP_TSK',
  'PEMBERITAHUAN_TAP_TSK',
  'PEMBERITAHUAN_TAP_TSK_JPU',
  'SPGL_TSK_1',
  'SPGL_TSK',
  'SPGL_TSK_2',
  'SPRIN_BAWA_TSK_DAN_BA',
  'SPRIN_KAP',
  'SPRIN_KAP_DAN_BA',
  'SPGAS_KAP',
  'SPRIN_BAWA_LEWAT_KAP',
  'BA_HAK_TSK',
  'SPRIN_LEPAS_KAP_DAN_BA',
  'SPRIN_HAN',
  'SPRIN_HAN_DAN_BA',
  'PERPANJANGAN_HAN',
  'PERPANJANGAN_HAN_PU',
  'MINTA_PANJANG_HAN_40_KN',
  'SPRIN_PANJANG_HAN_40_KN_DAN_BA',
  'PERPANJANGAN_HAN_PN_1',
  'PERPANJANGAN_PN_1',
  'MINTA_PANJANG_HAN_30_KPN1',
  'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA',
  'PERPANJANGAN_HAN_PN_2',
  'PERPANJANGAN_PN_2',
  'MINTA_PANJANG_HAN_30_KPN2',
  'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA'
]);

/**
 * Mengecek apakah sebuah kode template termasuk kategori surat individual per-tersangka.
 */
export function isIndividualSuspectTemplate(templateCode = '', templateTitle = '') {
  const rawUpper = String(templateCode || '').toUpperCase().trim();
  const canon = toCanonicalMindikCode(rawUpper, templateTitle);
  return INDIVIDUAL_SUSPECT_TEMPLATES.has(rawUpper) || INDIVIDUAL_SUSPECT_TEMPLATES.has(canon);
}

/**
 * Memeriksa apakah tersangka tertentu sudah memiliki dokumen arsip sah untuk templateCode yang dipilih.
 * Jika dokumen arsip tersebut dihapus dari caseDocuments, fungsi ini otomatis mengembalikan null
 * sehingga kunci per-tersangka langsung terbuka kembali.
 *
 * @param {Array} caseDocuments - Daftar dokumen arsip perkara aktif (public.documents)
 * @param {string} templateCode - Kode template yang sedang aktif
 * @param {object|string} suspectRecord - Objek tersangka atau nama tersangka
 * @param {string} templateTitle - Judul template opsional
 * @returns {object|null} Dokumen arsip yang cocok (lengkap dengan docNo) atau null jika belum terbit/sudah dihapus
 */
export function getIssuedDocumentForSuspect(caseDocuments = [], templateCode = '', suspectRecord = null, templateTitle = '') {
  if (!Array.isArray(caseDocuments) || caseDocuments.length === 0 || !templateCode || !suspectRecord) {
    return null;
  }

  const rawTplUpper = String(templateCode || '').toUpperCase().trim();
  const targetCanon = toCanonicalMindikCode(rawTplUpper, templateTitle);

  const normalizeName = (val) => String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const suspectId = (typeof suspectRecord === 'object' && suspectRecord.id)
    ? String(suspectRecord.id).trim()
    : '';
  const suspectName = normalizeName(
    typeof suspectRecord === 'string'
      ? suspectRecord
      : (suspectRecord.nama || suspectRecord.nama_lengkap || suspectRecord.name || '')
  );

  if (!suspectId && !suspectName) return null;

  const matchingDocs = caseDocuments
    .filter((doc) => {
      if (!doc || typeof doc !== 'object') return false;
      const docRawUpper = String(doc.template_code || doc.code || doc.original_template_code || '').toUpperCase().trim();
      const docTitle = doc.doc_title || doc.title || '';
      const docCanon = toCanonicalMindikCode(docRawUpper, docTitle);
      return docCanon === targetCanon || (rawTplUpper && docRawUpper === rawTplUpper);
    })
    .map((doc) => {
      const ext = extractArchivedDocNumberAndDate(doc);
      const mv = ext.metaObj || {};
      const targetInfo = extractDocTargetSuspectInfo(mv);
      const candidateNames = new Set(targetInfo.names.map(normalizeName).filter(Boolean));
      [
        doc.target_subject,
        doc.target_suspect_name,
        mv.target_subject,
        mv.target_subject_name,
        mv.target_suspect_name,
        mv.NAMA_TERSANGKA,
        mv.nama_tersangka,
        mv.TERSANGKA_NAMA,
        mv.tersangka_nama,
        mv.NAMA_TSK,
        mv.nama_tsk,
        mv.NAMA_DIPANGGIL,
        mv.nama_dipanggil,
        mv.SUBJEK_NAMA,
        mv.subjek_nama
      ].forEach((n) => {
        const cleanN = normalizeName(n);
        if (cleanN && cleanN !== '-' && cleanN !== 'null' && cleanN !== 'undefined') {
          candidateNames.add(cleanN);
        }
      });

      return {
        doc,
        docNo: ext.docNo,
        rawDocDate: ext.rawDocDate,
        formattedDocDate: ext.formattedDocDate,
        ids: targetInfo.ids,
        names: Array.from(candidateNames)
      };
    })
    .filter((entry) => isValidOfficialDocNumber(entry.docNo))
    .sort((a, b) => new Date(a.doc?.created_at || 0).getTime() - new Date(b.doc?.created_at || 0).getTime());

  for (let i = matchingDocs.length - 1; i >= 0; i--) {
    const entry = matchingDocs[i];
    if (suspectId && entry.ids.includes(suspectId)) {
      return {
        ...entry.doc,
        doc_number: entry.docNo,
        nomor_surat: entry.docNo,
        formatted_date: entry.formattedDocDate
      };
    }
    if (suspectName && entry.names.includes(suspectName)) {
      return {
        ...entry.doc,
        doc_number: entry.docNo,
        nomor_surat: entry.docNo,
        formatted_date: entry.formattedDocDate
      };
    }
  }

  return null;
}

/**
 * Daftar dokumen kolektif multi-tersangka yang mendukung auto-routing varian 1_TSK s.d. 6_TSK.
 */
export const COLLECTIVE_MULTI_SUSPECT_TEMPLATES = new Set([
  'SPDP_TSK',
  'SPDP_MORE_1_TSK',
  'SPRIN_SIDIK_LANJUTAN',
  'SPGAS_SIDIK_LANJUTAN',
  'MINTA_PANJANG_HAN_40_KN',
  'MINTA_PANJANG_HAN_30_KPN1',
  'MINTA_PANJANG_HAN_30_KPN2',
  'SAMPUL_BERKAS_PERKARA',
  'PENGANTAR_BP_TAHAP1',
  'PENGANTAR_BP_KEMBALI_P19',
  'PENGANTAR_TAHAP2',
  'IZIN_SITA_PN',
  'IZIN_SITA_PN_LEBIH_1'
]);

/**
 * Hybrid Auto-Routing Template Multi-Tersangka (1_TSK s.d. 6_TSK).
 * Mengecek apakah di daftar `allTemplates` tersedia varian spesifik `_${suspectCount}_TSK`
 * (atau `SPDP_MORE_1_TSK` saat `suspectCount > 1` untuk `SPDP_TSK`).
 * Jika ditemukan di database, mengembalikan template varian tersebut;
 * jika tidak ditemukan, tetap menggunakan `basePreset` (yang merender loop dinamis `{#TERSANGKA}`).
 */
export function resolveMultiSuspectTemplateVariant(basePreset, allTemplates = [], suspectCount = 1) {
  if (!basePreset || typeof basePreset !== 'object') return basePreset;
  const count = Math.max(1, Math.min(6, Number(suspectCount) || 1));
  const rawBaseCode = String(basePreset.code || basePreset.template_code || '').toUpperCase().trim();
  const baseTitle = basePreset.title || basePreset.name || '';
  const canonicalBase = toCanonicalMindikCode(rawBaseCode, baseTitle);

  const isCollectiveCandidate =
    COLLECTIVE_MULTI_SUSPECT_TEMPLATES.has(canonicalBase) ||
    COLLECTIVE_MULTI_SUSPECT_TEMPLATES.has(rawBaseCode);

  if (!isCollectiveCandidate || !Array.isArray(allTemplates) || allTemplates.length === 0) {
    return basePreset;
  }

  // Daftar prefix kandidat untuk dicocokkan dengan akhiran `_${count}_TSK` atau `_${count}_TERSANGKA`
  const baseStem = rawBaseCode
    .replace(/_MORE_1_TSK$/i, '')
    .replace(/_LEBIH_1_TSK$/i, '')
    .replace(/_[1-6]_(?:TSK|TERSANGKA)$/i, '')
    .replace(/_TSK$/i, '');
  const canonicalStem = canonicalBase
    .replace(/_MORE_1_TSK$/i, '')
    .replace(/_LEBIH_1_TSK$/i, '')
    .replace(/_[1-6]_(?:TSK|TERSANGKA)$/i, '')
    .replace(/_TSK$/i, '');

  const candidateVariantCodes = new Set([
    `${rawBaseCode}_${count}_TSK`,
    `${canonicalBase}_${count}_TSK`,
    `${baseStem}_${count}_TSK`,
    `${canonicalStem}_${count}_TSK`,
    `${baseStem}_${count}_TERSANGKA`,
    `${canonicalStem}_${count}_TERSANGKA`
  ]);

  if (canonicalBase === 'PENGANTAR_BP_TAHAP1') {
    candidateVariantCodes.add(`PENGANTAR_TAHAP_1_${count}_TSK`);
    candidateVariantCodes.add(`PENGANTAR_BP_TAHAP_1_${count}_TSK`);
  } else if (canonicalBase === 'PENGANTAR_TAHAP2') {
    candidateVariantCodes.add(`PENGANTAR_TAHAP_2_${count}_TSK`);
  } else if (canonicalBase === 'MINTA_PANJANG_HAN_40_KN') {
    candidateVariantCodes.add(`PERMOHONAN_PERPANJANGAN_HAN_${count}_TSK`);
  }

  // 1. Cek varian spesifik `_${count}_TSK` yang memiliki file template (.docx) di database
  const exactCountVariant = allTemplates.find((t) => {
    if (!t) return false;
    const tCode = String(t.code || t.template_code || '').toUpperCase().trim();
    return candidateVariantCodes.has(tCode);
  });
  if (exactCountVariant) {
    return {
      ...basePreset,
      ...exactCountVariant,
      _routedFromCode: rawBaseCode || canonicalBase,
      _routedVariantCode: exactCountVariant.code || exactCountVariant.template_code,
      _routedSuspectCount: count
    };
  }

  // 2. Fallback khusus SPDP_TSK -> SPDP_MORE_1_TSK bila jumlah tersangka > 1
  if (count > 1 && canonicalBase === 'SPDP_TSK') {
    const more1Variant = allTemplates.find((t) => {
      const tCode = String(t?.code || t?.template_code || '').toUpperCase().trim();
      return tCode === 'SPDP_MORE_1_TSK' || toCanonicalMindikCode(tCode, t?.title || '') === 'SPDP_MORE_1_TSK';
    });
    if (more1Variant && (more1Variant.file_path || more1Variant.file_url || more1Variant.storage_path)) {
      return {
        ...basePreset,
        ...more1Variant,
        _routedFromCode: rawBaseCode || canonicalBase,
        _routedVariantCode: more1Variant.code || more1Variant.template_code,
        _routedSuspectCount: count
      };
    }
  }

  return basePreset;
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
  assignDecomposedDateTags(context, rawTglLp || tanggalLp, ['LP']);
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

  // Pejabat Penandatangan / Atasan (Kasat Reskrim) - Pangkat Singkat Resmi
  const atasanNama = activeCase.kasat_nama || activeCase.atasan_nama || '';
  const atasanPangkat = formatPangkatSingkat(activeCase.kasat_pangkat || activeCase.atasan_pangkat || '');
  const atasanNrp = activeCase.kasat_nrp || activeCase.atasan_nrp || '';
  const atasanJabatan = activeCase.kasat_jabatan || activeCase.atasan_jabatan || 'Kasat Reskrim';
  const kapolresPangkat = formatPangkatSingkat(activeCase.kapolres_pangkat || '');

  setBothCase('ATASAN_NAMA', atasanNama);
  setBothCase('ATASAN_PANGKAT', atasanPangkat);
  setBothCase('ATASAN_NRP', atasanNrp);
  setBothCase('ATASAN_JABATAN', atasanJabatan);
  setBothCase('ATASAN_PANGKAT_NRP', atasanPangkat && atasanNrp ? `${atasanPangkat} / ${atasanNrp}` : (atasanPangkat || atasanNrp));
  setBothCase('KASAT_NAMA', atasanNama);
  setBothCase('KASAT_PANGKAT', atasanPangkat);
  setBothCase('KASAT_NRP', atasanNrp);
  setBothCase('KASAT_JABATAN', atasanJabatan);
  if (kapolresPangkat) {
    setBothCase('KAPOLRES_PANGKAT', kapolresPangkat);
  }

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
  const assignDocumentAliases = (aliasCodes = [], docNo = '', docDateFormatted = '', dasarKalimat = '', rawDocDate = '') => {
    const validAliasCodes = [];
    aliasCodes.forEach((aliasCode) => {
      const code = String(aliasCode || '').toUpperCase().trim();
      if (!code || FORBIDDEN_GENERIC_ACTIVE_KEYS.has(code)) return;
      validAliasCodes.push(code);
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
    if (validAliasCodes.length > 0 && (rawDocDate || docDateFormatted)) {
      assignDecomposedDateTags(context, rawDocDate || docDateFormatted, validAliasCodes);
    }
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
    assignDocumentAliases(Array.from(baseCodesToMap), docNo, docDateFormatted, dasarKalimat, rawDocDate);

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
        dasarKalimat,
        rawDocDate
      );
    }
    if (rawCode === 'SPGAS_LIDIK' || rawCode.includes('GAS_LIDIK')) {
      assignDocumentAliases(
        ['SPGAS_LIDIK', 'SPRIN_GAS_LIDIK', 'SP_GAS_SIDIK', 'SP_GAS_LIDIK', 'SURAT_PERINTAH_TUGAS_PENYELIDIKAN'],
        docNo,
        docDateFormatted,
        dasarKalimat,
        rawDocDate
      );
    }
    if (rawCode === 'LI' || rawCode === 'LAPORAN_INFORMASI') {
      assignDocumentAliases(['LI', 'LAPORAN_INFORMASI'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode === 'LHP' || rawCode.includes('HASIL_PENYELIDIKAN')) {
      assignDocumentAliases(['LHP', 'LAPORAN_HASIL_PENYELIDIKAN'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }

    // - Tahap Sidik: SPRIN_SIDIK & SPGAS_SIDIK (terbaru di arsip menang atas kolom lama di cases)
    if (rawCode === 'SPRIN_SIDIK' || rawCode === 'SPRIN_SIDIK_MORE_5') {
      assignDocumentAliases(
        ['SPRIN_SIDIK', 'SP_SIDIK', 'SIDIK', 'SURAT_PERINTAH_PENYIDIKAN', rawCode],
        docNo,
        docDateFormatted,
        dasarKalimat,
        rawDocDate
      );
      if (docNo && entry.hasValidNo) activeCase.no_sprin_sidik = docNo;
      if (rawDocDate) activeCase.tgl_sprin_sidik = rawDocDate;
    }
    if (rawCode === 'SPGAS_SIDIK' || rawCode === 'SPGAS_SIDIK_MORE_5') {
      assignDocumentAliases(
        ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'GAS_SIDIK', 'SPRIN_TUGAS_PENYIDIKAN', 'SURAT_PERINTAH_TUGAS_PENYIDIKAN', rawCode],
        docNo,
        docDateFormatted,
        dasarKalimat,
        rawDocDate
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
        dasarKalimat,
        rawDocDate
      );
      if (docNo && entry.hasValidNo) activeCase.no_spdp = docNo;
      if (rawDocDate) activeCase.tgl_spdp = rawDocDate;
    }
    if (rawCode === 'TAP_TSK') {
      assignDocumentAliases(
        ['TAP_TSK', 'SP_TAP_TSK', 'SP_TAP', 'S_TAP_TSK', 'PENETAPAN_TERSANGKA'],
        docNo,
        docDateFormatted,
        dasarKalimat,
        rawDocDate
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
        dasarKalimat,
        rawDocDate
      );
    }

    // - Tahap Upaya Paksa & Panggilan
    if (rawCode.includes('PANGGIL') || rawCode.startsWith('SPGL')) {
      const spglAliases = [rawCode, 'PANGGILAN', 'SPGL', 'SURAT_PANGGILAN'];
      if (rawCode.includes('TSK') || rawCode.includes('TERSANGKA')) {
        spglAliases.push('SPGL_TSK', 'SURAT_PANGGILAN_TERSANGKA');
        if (rawCode === 'SPGL_TSK_1' || rawCode === 'SPGL_TSK') {
          spglAliases.push('SPGL_TSK_1', 'SPGIL_TSK_1', 'PANGGILAN_TSK_1', 'PANGGILAN_TERSANGKA_1');
        } else if (rawCode === 'SPGL_TSK_2') {
          spglAliases.push('SPGL_TSK_2', 'SPGIL_TSK_2', 'PANGGILAN_TSK_2', 'PANGGILAN_TERSANGKA_2');
        }
      } else if (rawCode.includes('SAKSI')) {
        spglAliases.push('SPGL_SAKSI', 'SURAT_PANGGILAN_SAKSI');
        if (rawCode === 'SPGL_SAKSI_1' || rawCode === 'SPGL_SAKSI') {
          spglAliases.push('SPGL_SAKSI_1', 'SPGIL_SAKSI_1', 'PANGGILAN_SAKSI_1');
        } else if (rawCode === 'SPGL_SAKSI_2') {
          spglAliases.push('SPGL_SAKSI_2', 'SPGIL_SAKSI_2', 'PANGGILAN_SAKSI_2');
        }
      }
      assignDocumentAliases(spglAliases, docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode === 'SPRIN_KAP_DAN_BA' || (rawCode.includes('KAP') && !rawCode.includes('UNGKAP'))) {
      assignDocumentAliases([rawCode, 'SPRIN_KAP_DAN_BA', 'SP_KAP', 'SPRIN_KAP', 'BA_KAP', 'SURAT_PERINTAH_PENANGKAPAN'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode === 'SPRIN_HAN_DAN_BA' || rawCode.includes('HAN')) {
      const hanStage = getDetentionStageConfig(rawCode, docTitle);
      if (hanStage.stage === 'PU') {
        assignDocumentAliases(
          [rawCode, 'SPRIN_HAN_KN', 'PANJANG_HAN_KN', 'PERPANJANGAN_HAN', 'PERPANJANGAN_HAN_PU', 'SPRIN_PANJANG_HAN_40_KN_DAN_BA', 'MINTA_PANJANG_HAN_40_KN'],
          docNo,
          docDateFormatted,
          dasarKalimat,
          rawDocDate
        );
        setBothCase('PANJANG_HAN_KN', mv?.PANJANG_HAN_KN || mv?.NO_PANJANG_HAN_KN || docNo || '');
      } else if (hanStage.stage === 'PN1') {
        assignDocumentAliases(
          [rawCode, 'SPRIN_HAN_PN_1', 'SPRIN_HAN_PN1', 'TAP_HAN_PN_1', 'TAP_HAN_PN1', 'PERPANJANGAN_HAN_PN_1', 'PERPANJANGAN_PN_1', 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA', 'MINTA_PANJANG_HAN_30_KPN1'],
          docNo,
          docDateFormatted,
          dasarKalimat,
          rawDocDate
        );
        setBothCase('TAP_HAN_PN_1', mv?.TAP_HAN_PN_1 || mv?.NO_TAP_HAN_PN_1 || docNo || '');
      } else if (hanStage.stage === 'PN2') {
        assignDocumentAliases(
          [rawCode, 'SPRIN_HAN_PN_2', 'SPRIN_HAN_PN2', 'TAP_HAN_PN_2', 'TAP_HAN_PN2', 'PERPANJANGAN_HAN_PN_2', 'PERPANJANGAN_PN_2', 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA', 'MINTA_PANJANG_HAN_30_KPN2'],
          docNo,
          docDateFormatted,
          dasarKalimat,
          rawDocDate
        );
        setBothCase('TAP_HAN_PN_2', mv?.TAP_HAN_PN_2 || mv?.NO_TAP_HAN_PN_2 || docNo || '');
      } else {
        assignDocumentAliases(
          [rawCode, 'SPRIN_HAN_DAN_BA', 'SP_HAN', 'SPRIN_HAN', 'BA_HAN', 'SURAT_PERINTAH_PENAHANAN'],
          docNo,
          docDateFormatted,
          dasarKalimat,
          rawDocDate
        );
      }
      if (mv?.TEMPAT_PENAHANAN || mv?.TEMPAT_HAN) {
        const archivedTempat = mv.TEMPAT_PENAHANAN || mv.TEMPAT_HAN;
        setBothCase('TEMPAT_PENAHANAN', archivedTempat);
        setBothCase('TEMPAT_HAN', archivedTempat);
        setBothCase('TEMPAT_RUTAN_HAN', archivedTempat);
      }
    }
    if (rawCode.includes('SITA')) {
      assignDocumentAliases([rawCode, 'SP_SITA', 'SPRIN_SITA', 'SPRIN_SITA_UMUM', 'SURAT_PERINTAH_PENYITAAN'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode.includes('GELEDAH')) {
      assignDocumentAliases([rawCode, 'SP_GELEDAH', 'SPRIN_GELEDAH', 'SURAT_PERINTAH_PENGGELEDAHAN'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }

    // - Berkas Perkara (Tahap 1, P-19, Tahap 2)
    if (rawCode === 'SAMPUL_BERKAS_PERKARA') {
      assignDocumentAliases(['SAMPUL_BERKAS_PERKARA', 'SAMPUL_BP', 'BERKAS_PERKARA'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode === 'PENGANTAR_BP_TAHAP1') {
      assignDocumentAliases(['PENGANTAR_BP_TAHAP1', 'PENGANTAR_TAHAP_1', 'PENGANTAR_TAHAP1', 'PENGANTAR_BP_TAHAP_1'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode === 'PENGANTAR_BP_KEMBALI_P19') {
      assignDocumentAliases(
        [
          'PENGANTAR_BP_KEMBALI_P19',
          'PENGANTAR_KEMBALI_P19',
          'PENGANTAR_TAHAP_1_P19',
          'PENGANTAR_TAHAP1_P19',
          'PENGANTAR_BP_TAHAP_1_P19',
          'PENGANTAR_P19'
        ],
        docNo,
        docDateFormatted,
        dasarKalimat,
        rawDocDate
      );
    }
    if (rawCode === 'PENGANTAR_TAHAP2') {
      assignDocumentAliases(['PENGANTAR_TAHAP2', 'PENGANTAR_TAHAP_2', 'PENGANTAR_KIRIM_TSK_BB_TAHAP_2'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }

    // - Tahap Pemberkasan: SP2HP & RESUME
    if (rawCode.includes('SP2HP')) {
      assignDocumentAliases([rawCode, 'SP2HP'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
    if (rawCode.includes('RESUME')) {
      assignDocumentAliases([rawCode, 'RESUME'], docNo, docDateFormatted, dasarKalimat, rawDocDate);
    }
  });

  // Fallback rantai dari kolom langsung di activeCase / activeCase.references bila belum ada di tabel documents
  const fallbackSprinSidikNo = activeCase.no_sprin_sidik || activeCase.sprin_sidik || activeCase.references?.no_sprin_sidik || '';
  const rawFallbackSprinSidikTgl = activeCase.tgl_sprin_sidik || activeCase.references?.tgl_sprin_sidik || '';
  const fallbackSprinSidikTgl = formatTanggalIndonesia(rawFallbackSprinSidikTgl);
  if (fallbackSprinSidikNo && isValidOfficialDocNumber(fallbackSprinSidikNo) && !isValidOfficialDocNumber(context.NOMOR_SPRIN_SIDIK)) {
    assignDocumentAliases(
      ['SPRIN_SIDIK', 'SP_SIDIK', 'SIDIK', 'SURAT_PERINTAH_PENYIDIKAN'],
      fallbackSprinSidikNo,
      fallbackSprinSidikTgl,
      `Surat Perintah Penyidikan Nomor: ${fallbackSprinSidikNo}${fallbackSprinSidikTgl ? `, tanggal ${fallbackSprinSidikTgl}` : ''}`,
      rawFallbackSprinSidikTgl
    );
  }

  const fallbackGasSidikNo = activeCase.no_sprin_gas_sidik || activeCase.no_sp_gas_sidik || activeCase.references?.no_spgas_sidik || activeCase.references?.no_sprin_gas_sidik || '';
  const rawFallbackGasSidikTgl = activeCase.tgl_sprin_gas_sidik || activeCase.tgl_sp_gas_sidik || activeCase.references?.tgl_sprin_gas_sidik || '';
  const fallbackGasSidikTgl = formatTanggalIndonesia(rawFallbackGasSidikTgl);
  if (fallbackGasSidikNo && isValidOfficialDocNumber(fallbackGasSidikNo) && !isValidOfficialDocNumber(context.NOMOR_SPGAS_SIDIK)) {
    assignDocumentAliases(
      ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'GAS_SIDIK', 'SPRIN_TUGAS_PENYIDIKAN'],
      fallbackGasSidikNo,
      fallbackGasSidikTgl,
      `Surat Perintah Tugas Penyidikan Nomor: ${fallbackGasSidikNo}${fallbackGasSidikTgl ? `, tanggal ${fallbackGasSidikTgl}` : ''}`,
      rawFallbackGasSidikTgl
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
  const personnelPoolCtx = [
    ...(Array.isArray(options.personnelList) ? options.personnelList : []),
    ...(Array.isArray(options.personnel) ? options.personnel : []),
    ...(Array.isArray(activeCase.investigators) ? activeCase.investigators : []),
    ...(Array.isArray(activeCase.references?.investigators) ? activeCase.references.investigators : []),
    ...archivedInvestigators
  ];

  for (let i = 1; i <= 10; i++) {
    const fromCasePropNama = activeCase[`penyidik_${i}_nama`];
    const fromArr = rawInvList[i - 1] || {};
    const pNama = (fromCasePropNama || fromArr.nama || '').trim();
    const matchedDirPerson = pNama
      ? findPersonnelRecordMatch({ nama: pNama, nrp: activeCase[`penyidik_${i}_nrp`] || fromArr.nrp }, personnelPoolCtx)
      : null;
    const pPangkatRaw = activeCase[`penyidik_${i}_pangkat`] || fromArr.pangkat || matchedDirPerson?.pangkat || '';
    const pPangkat = formatPangkatSingkat(pPangkatRaw);
    const pNrp = (activeCase[`penyidik_${i}_nrp`] || fromArr.nrp || matchedDirPerson?.nrp || '').trim();
    const rawFallbackJab = activeCase[`penyidik_${i}_jabatan`] || fromArr.jabatan || matchedDirPerson?.jabatan || (i === 1 ? 'Penyidik' : 'Penyidik Pembantu');
    const jabPair = pNama ? resolveJabatanPenyidikPair(pPangkat || pPangkatRaw, rawFallbackJab) : { titleCase: '', upperCase: '' };
    const pJabatan = jabPair.upperCase;
    const pPangkatNrp = pPangkat && pNrp ? `${pPangkat} / ${pNrp}` : (pPangkat || pNrp || '');
    const pNoHp = pNama ? extractOfficerPhoneNumber({ ...fromArr, nama: pNama, nrp: pNrp }, personnelPoolCtx) : '';

    setBothCase(`PENYIDIK_${i}_NAMA`, pNama);
    setBothCase(`PENYIDIK_${i}_PANGKAT`, pPangkat);
    setBothCase(`PENYIDIK_${i}_NRP`, pNrp);
    setBothCase(`PENYIDIK_${i}_JABATAN`, pJabatan);
    setBothCase(`PENYIDIK_${i}_JABATAN_TITLE`, jabPair.titleCase);
    setBothCase(`PENYIDIK_${i}_PANGKAT_NRP`, pPangkatNrp);
    if (pNoHp) {
      setBothCase(`PENYIDIK_${i}_NO_HP`, pNoHp);
    }

    if (pNama) {
      teamList.push({
        no: teamList.length + 1,
        nama: pNama,
        pangkat: pPangkat,
        pangkat_singkat: pPangkat,
        pangkat_lengkap: pPangkat,
        nrp: pNrp,
        jabatan: jabPair.upperCase,
        jabatan_title: jabPair.titleCase,
        jabatan_upper: jabPair.upperCase,
        pangkat_nrp: pPangkatNrp,
        no_hp: pNoHp,
        phone: pNoHp
      });
    }
  }

  const primaryPenyidik = teamList[0] || {};
  if (primaryPenyidik.nama) {
    const primaryJabPair = resolveJabatanPenyidikPair(primaryPenyidik.pangkat, primaryPenyidik.jabatan);
    setBothCase('PENYIDIK_NAMA', primaryPenyidik.nama);
    setBothCase('PENYIDIK_PANGKAT', formatPangkatSingkat(primaryPenyidik.pangkat));
    setBothCase('PENYIDIK_NRP', primaryPenyidik.nrp);
    setBothCase('PENYIDIK_JABATAN', primaryJabPair.titleCase);
    setBothCase('PENYIDIK_JABATAN_UPPER', primaryJabPair.upperCase);
    setBothCase('PENYIDIK_PANGKAT_NRP', primaryPenyidik.pangkat_nrp);
  }
  const penanganCtx = getPenyidikPenangan(activeCase) || primaryPenyidik;
  if (penanganCtx?.nama) {
    const matchedPenanganDir = findPersonnelRecordMatch(penanganCtx, personnelPoolCtx);
    const penPkt = formatPangkatSingkat(penanganCtx.pangkat || matchedPenanganDir?.pangkat || '');
    const penNrp = (penanganCtx.nrp || matchedPenanganDir?.nrp || '').trim();
    const penJabPair = resolveJabatanPenyidikPair(penPkt, penanganCtx.jabatan || matchedPenanganDir?.jabatan || 'Penyidik');
    const penNoHp = extractOfficerPhoneNumber(penanganCtx, personnelPoolCtx);
    setBothCase('PENYIDIK_PENANGAN_NAMA', penanganCtx.nama);
    setBothCase('PENYIDIK_PENANGAN_PANGKAT', penPkt);
    setBothCase('PENYIDIK_PENANGAN_NRP', penNrp);
    setBothCase('PENYIDIK_PENANGAN_JABATAN', penJabPair.titleCase);
    setBothCase('PENYIDIK_PENANGAN_JABATAN_UPPER', penJabPair.upperCase);
    setBothCase('PENYIDIK_PENANGAN_PANGKAT_NRP', penPkt && penNrp ? `${penPkt} / ${penNrp}` : (penPkt || penNrp));
    if (penNoHp) {
      setBothCase('PENYIDIK_PENANGAN_NO_HP', penNoHp);
      setBothCase('NO_HP_PENYIDIK_PENANGAN', penNoHp);
      setBothCase('PENYIDIK_PENANGAN_HP', penNoHp);
      if (!context.NO_HP) {
        setBothCase('NO_HP', penNoHp);
      }
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
    ...(Array.isArray(activeCase.case_evidence) ? activeCase.case_evidence : []),
    ...(Array.isArray(activeCase.evidenceList) ? activeCase.evidenceList : []),
    ...(Array.isArray(activeCase.references?.barang_bukti) ? activeCase.references.barang_bukti : []),
    ...(Array.isArray(options.evidenceList) ? options.evidenceList : []),
    ...dbEvidence
  ];

  const rawEvidenceTextCtx =
    activeFormValues?.DAFTAR_BARANG_BUKTI ||
    activeFormValues?.BARANG_BUKTI ||
    (typeof activeCase.barang_bukti === 'string' ? activeCase.barang_bukti : '') ||
    (typeof activeCase.daftar_barang_bukti === 'string' ? activeCase.daftar_barang_bukti : '');

  const { list: barangBuktiArray, daftarString: daftarBarangBuktiStr } = buildNormalizedBarangBuktiList(
    rawEvidenceSources,
    rawEvidenceTextCtx
  );

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
  if (activeCase.nama_pelapor || activeCase.pelapor_name) {
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
    ...dbSuspects.filter(s => s && s.status === 'saksi'),
    ...(Array.isArray(activeCase.saksi_list) ? activeCase.saksi_list : []),
    ...(Array.isArray(refs.saksi_list) ? refs.saksi_list : []),
    ...(Array.isArray(activeCase.saksi) ? activeCase.saksi : []),
    ...(Array.isArray(refs.saksi) ? refs.saksi : [])
  ];

  // 3. Terlapor / Calon Tersangka (prioritas: selectedSubjects -> caseSuspects/terlapor_list -> legacy fallback bila kosong)
  const terlaporClean = resolveCaseTerlaporFallback(dbSuspects, activeCase, refs);

  // 4. Tersangka
  const rawTersangkaList = [
    ...dbSuspects.filter(s => s && (s.status === 'tersangka' || !s.status)),
    ...(Array.isArray(activeCase.tersangka_list) ? activeCase.tersangka_list : []),
    ...(Array.isArray(refs.tersangka_list) ? refs.tersangka_list : [])
  ];

  const pelaporClean = deduplicateSubjectRecords(rawPelaporList, 'Pelapor');
  const saksiClean = deduplicateSubjectRecords(rawSaksiList, 'Saksi');
  const tersangkaClean = deduplicateSubjectRecords(rawTersangkaList, 'Tersangka');

  populateSubjectPrefixVariables(context, 'PELAPOR', pelaporClean);
  populateSubjectPrefixVariables(context, 'KORBAN', pelaporClean);
  populateSubjectPrefixVariables(context, 'SAKSI', saksiClean);
  populateSubjectPrefixVariables(context, 'TERLAPOR', terlaporClean);
  populateSubjectPrefixVariables(context, 'TERSANGKA', tersangkaClean);

  // Resolusi Per-Tersangka (TAP_TSK, SPRIN_KAP, SPRIN_HAN) tanpa pernah tertukar antar tersangka
  const enrichedTersangkaClean = applyPerSuspectDocTags(context, tersangkaClean, arsipDocs);
  if (enrichedTersangkaClean.length > 0) {
    context.TERSANGKA = enrichedTersangkaClean;
    context.tersangka = enrichedTersangkaClean;
    context.TERSANGKA_LIST = enrichedTersangkaClean;
    context.tersangka_list = enrichedTersangkaClean;
    context.DAFTAR_TERSANGKA = enrichedTersangkaClean;
    context.daftar_tersangka = enrichedTersangkaClean;
  }

  // Target Subjek Universal (Jika dipilih dari Pemilih Subjek di Generator Mindik)
  const rawTargetSubjects = Array.isArray(options.selectedSubjects) && options.selectedSubjects.length > 0
    ? options.selectedSubjects
    : (options.activeSubject ? [options.activeSubject] : []);
  const targetSubjects = deduplicateSubjectRecords(rawTargetSubjects, 'Subjek');
  if (targetSubjects.length > 0) {
    populateSubjectPrefixVariables(context, 'SUBJEK', targetSubjects);
  } else {
    const defaultSubjek = enrichedTersangkaClean.length > 0
      ? enrichedTersangkaClean
      : (terlaporClean.length > 0 ? terlaporClean : (saksiClean.length > 0 ? saksiClean : pelaporClean));
    populateSubjectPrefixVariables(context, 'SUBJEK', defaultSubjek);
  }

  // Resolusi Per-Subjek Nomor & Tanggal Surat Panggilan Ke-1 (Saksi & Tersangka) dari arsip perkara aktif
  const targetSaksiForSpgl1 =
    targetSubjects.find(s => s && (s._category === 'SAKSI' || s.status === 'saksi')) ||
    targetSubjects[0] ||
    (activeFormValues?.NAMA_SAKSI ? { nama: activeFormValues.NAMA_SAKSI } : null) ||
    saksiClean[0] ||
    null;
  const resolvedSpglSaksi1Ctx = resolveFirstSummonsDocForSubject(arsipDocs, 'SAKSI', targetSaksiForSpgl1);
  if (resolvedSpglSaksi1Ctx.found && resolvedSpglSaksi1Ctx.docNo) {
    assignFirstSummonsReferenceTags(
      context,
      'SAKSI',
      resolvedSpglSaksi1Ctx.docNo,
      resolvedSpglSaksi1Ctx.formattedDocDate,
      resolvedSpglSaksi1Ctx.rawDocDate,
      Boolean(options.forFormUi)
    );
  }

  const targetTskForSpgl1 =
    targetSubjects.find(s => s && (s._category === 'TERSANGKA' || s._category === 'TERLAPOR' || s.status === 'tersangka')) ||
    targetSubjects[0] ||
    (activeFormValues?.NAMA_TERSANGKA || activeFormValues?.NAMA_TSK
      ? { nama: activeFormValues.NAMA_TERSANGKA || activeFormValues.NAMA_TSK }
      : null) ||
    enrichedTersangkaClean[0] ||
    null;
  const resolvedSpglTsk1Ctx = resolveFirstSummonsDocForSubject(arsipDocs, 'TSK', targetTskForSpgl1);
  if (resolvedSpglTsk1Ctx.found && resolvedSpglTsk1Ctx.docNo) {
    assignFirstSummonsReferenceTags(
      context,
      'TSK',
      resolvedSpglTsk1Ctx.docNo,
      resolvedSpglTsk1Ctx.formattedDocDate,
      resolvedSpglTsk1Ctx.rawDocDate,
      Boolean(options.forFormUi)
    );
  }

  // Sinkronisasi alias tempat & nomor/tanggal surat perintah penahanan & perpanjangan (PU, PN1, PN2) pada root context
  const targetTskForDetentionCtx =
    targetSubjects.find(s => s && (s._category === 'TERSANGKA' || s._category === 'TERLAPOR' || s.status === 'tersangka')) ||
    targetSubjects[0] ||
    options.activeSuspect ||
    enrichedTersangkaClean[0] ||
    null;
  const resolvedDetentionCtx = resolveChainedDetentionDates({
    templateCode: options.template?.code || options.template?.template_code || options.templateCode || '',
    templateTitle: options.template?.title || options.template?.name || '',
    tanggalSuratIso: activeFormValues?.TANGGAL_SURAT || options.docDate || '',
    archivedDocs: arsipDocs,
    targetSuspect: targetTskForDetentionCtx
  });
  const formatDetDateCtx = (isoVal) => {
    if (!isoVal) return '';
    return options.forFormUi ? isoVal : formatTanggalIndonesia(isoVal);
  };
  const ctxTempatHan =
    activeFormValues?.TEMPAT_PENAHANAN ||
    activeFormValues?.TEMPAT_HAN ||
    resolvedDetentionCtx.archivedTempatHan ||
    targetTskForDetentionCtx?.tempat_penahanan ||
    targetTskForDetentionCtx?.TEMPAT_PENAHANAN ||
    context.TEMPAT_PENAHANAN ||
    context.TEMPAT_HAN ||
    'Rumah Tahanan Negara Polres Kolaka Timur';
  setBothCase('TEMPAT_PENAHANAN', ctxTempatHan);
  setBothCase('TEMPAT_HAN', ctxTempatHan);
  setBothCase('TEMPAT_RUTAN_HAN', ctxTempatHan);

  const ctxNoSprinHan = targetTskForDetentionCtx?.NO_SPRIN_HAN || resolvedDetentionCtx.spHanDocNo || context.NO_SPRIN_HAN || '';
  const ctxTglSprinHan = targetTskForDetentionCtx?.TGL_SPRIN_HAN || (options.forFormUi ? resolvedDetentionCtx.spHanDocDateRaw : resolvedDetentionCtx.spHanDocDateFormatted) || context.TGL_SPRIN_HAN || '';
  if (ctxNoSprinHan) setBothCase('NO_SPRIN_HAN', ctxNoSprinHan);
  if (ctxTglSprinHan) {
    setBothCase('TGL_SPRIN_HAN', ctxTglSprinHan);
    setBothCase('TANGGAL_SPRIN_HAN', ctxTglSprinHan);
  }

  const ctxNoSprinHanKn = targetTskForDetentionCtx?.NO_SPRIN_HAN_KN || resolvedDetentionCtx.puDocNo || context.NO_SPRIN_HAN_KN || '';
  const ctxTglSprinHanKn = targetTskForDetentionCtx?.TGL_SPRIN_HAN_KN || (options.forFormUi ? resolvedDetentionCtx.puDocDateRaw : resolvedDetentionCtx.puDocDateFormatted) || context.TGL_SPRIN_HAN_KN || '';
  setBothCase('NO_SPRIN_HAN_KN', ctxNoSprinHanKn);
  setBothCase('TGL_SPRIN_HAN_KN', ctxTglSprinHanKn);
  setBothCase('TANGGAL_SPRIN_HAN_KN', ctxTglSprinHanKn);
  setBothCase('NO_PANJANG_HAN_KN', ctxNoSprinHanKn);
  setBothCase('TGL_PANJANG_HAN_KN', ctxTglSprinHanKn);
  setBothCase('PANJANG_HAN_KN', targetTskForDetentionCtx?.PANJANG_HAN_KN || resolvedDetentionCtx.panjangHanKnNo || ctxNoSprinHanKn || '');

  const ctxNoSprinHanPn1 = targetTskForDetentionCtx?.NO_SPRIN_HAN_PN_1 || resolvedDetentionCtx.pn1DocNo || context.NO_SPRIN_HAN_PN_1 || '';
  const ctxTglSprinHanPn1 = targetTskForDetentionCtx?.TGL_SPRIN_HAN_PN_1 || (options.forFormUi ? resolvedDetentionCtx.pn1DocDateRaw : resolvedDetentionCtx.pn1DocDateFormatted) || context.TGL_SPRIN_HAN_PN_1 || '';
  setBothCase('NO_SPRIN_HAN_PN_1', ctxNoSprinHanPn1);
  setBothCase('NO_SPRIN_HAN_PN1', ctxNoSprinHanPn1);
  setBothCase('TGL_SPRIN_HAN_PN_1', ctxTglSprinHanPn1);
  setBothCase('TANGGAL_SPRIN_HAN_PN_1', ctxTglSprinHanPn1);
  setBothCase('TGL_SPRIN_HAN_PN1', ctxTglSprinHanPn1);
  setBothCase('NO_TAP_HAN_PN_1', targetTskForDetentionCtx?.NO_TAP_HAN_PN_1 || resolvedDetentionCtx.tapHanPn1No || ctxNoSprinHanPn1 || '');
  setBothCase('TGL_TAP_HAN_PN_1', ctxTglSprinHanPn1);
  setBothCase('TAP_HAN_PN_1', targetTskForDetentionCtx?.TAP_HAN_PN_1 || resolvedDetentionCtx.tapHanPn1No || ctxNoSprinHanPn1 || '');

  const ctxNoSprinHanPn2 = targetTskForDetentionCtx?.NO_SPRIN_HAN_PN_2 || resolvedDetentionCtx.pn2DocNo || context.NO_SPRIN_HAN_PN_2 || '';
  const ctxTglSprinHanPn2 = targetTskForDetentionCtx?.TGL_SPRIN_HAN_PN_2 || (options.forFormUi ? resolvedDetentionCtx.pn2DocDateRaw : resolvedDetentionCtx.pn2DocDateFormatted) || context.TGL_SPRIN_HAN_PN_2 || '';
  setBothCase('NO_SPRIN_HAN_PN_2', ctxNoSprinHanPn2);
  setBothCase('NO_SPRIN_HAN_PN2', ctxNoSprinHanPn2);
  setBothCase('TGL_SPRIN_HAN_PN_2', ctxTglSprinHanPn2);
  setBothCase('TANGGAL_SPRIN_HAN_PN_2', ctxTglSprinHanPn2);
  setBothCase('TGL_SPRIN_HAN_PN2', ctxTglSprinHanPn2);
  setBothCase('NO_TAP_HAN_PN_2', targetTskForDetentionCtx?.NO_TAP_HAN_PN_2 || resolvedDetentionCtx.tapHanPn2No || ctxNoSprinHanPn2 || '');
  setBothCase('TGL_TAP_HAN_PN_2', ctxTglSprinHanPn2);
  setBothCase('TAP_HAN_PN_2', targetTskForDetentionCtx?.TAP_HAN_PN_2 || resolvedDetentionCtx.tapHanPn2No || ctxNoSprinHanPn2 || '');

  const ctxTglAkhirHanPenyidik = formatDetDateCtx(resolvedDetentionCtx.akhirHanPenyidikIso) || targetTskForDetentionCtx?.TANGGAL_AKHIR_HAN_PENYIDIK || '';
  const ctxTglMulaiPu = formatDetDateCtx(resolvedDetentionCtx.mulaiHanPuIso) || targetTskForDetentionCtx?.TGL_MULAI_JANG_HAN_PU || '';
  const ctxTglAkhirPu = formatDetDateCtx(resolvedDetentionCtx.akhirHanPuIso) || targetTskForDetentionCtx?.TGL_AKHIR_HAN_PU || '';
  const ctxTglMulaiPn1 = formatDetDateCtx(resolvedDetentionCtx.mulaiHanPn1Iso) || targetTskForDetentionCtx?.TGL_MULAI_JANG_HAN_PN1 || '';
  const ctxTglAkhirPn1 = formatDetDateCtx(resolvedDetentionCtx.akhirHanPn1Iso) || targetTskForDetentionCtx?.TGL_AKHIR_HAN_PN1 || '';
  const ctxTglMulaiPn2 = formatDetDateCtx(resolvedDetentionCtx.mulaiHanPn2Iso) || targetTskForDetentionCtx?.TGL_MULAI_JANG_HAN_PN2 || '';
  const ctxTglAkhirPn2 = formatDetDateCtx(resolvedDetentionCtx.akhirHanPn2Iso) || targetTskForDetentionCtx?.TGL_AKHIR_HAN_PN2 || '';

  setBothCase('TANGGAL_AKHIR_HAN_PENYIDIK', ctxTglAkhirHanPenyidik);
  setBothCase('TGL_AKHIR_HAN_PENYIDIK', ctxTglAkhirHanPenyidik);
  setBothCase('TGL_MULAI_JANG_HAN_PU', ctxTglMulaiPu);
  setBothCase('TANGGAL_MULAI_JANG_HAN_PU', ctxTglMulaiPu);
  setBothCase('TGL_AKHIR_HAN_PU', ctxTglAkhirPu);
  setBothCase('TGL_AKHIR_JANG_HAN_PU', ctxTglAkhirPu);
  setBothCase('TANGGAL_AKHIR_HAN_PU', ctxTglAkhirPu);
  setBothCase('TGL_MULAI_JANG_HAN_PN1', ctxTglMulaiPn1);
  setBothCase('TGL_MULAI_JANG_HAN_PN_1', ctxTglMulaiPn1);
  setBothCase('TANGGAL_MULAI_JANG_HAN_PN1', ctxTglMulaiPn1);
  setBothCase('TGL_AKHIR_HAN_PN1', ctxTglAkhirPn1);
  setBothCase('TGL_AKHIR_HAN_PN_1', ctxTglAkhirPn1);
  setBothCase('TGL_AKHIR_JANG_HAN_PN1', ctxTglAkhirPn1);
  setBothCase('TANGGAL_AKHIR_HAN_PN1', ctxTglAkhirPn1);
  setBothCase('TGL_MULAI_JANG_HAN_PN2', ctxTglMulaiPn2);
  setBothCase('TGL_MULAI_JANG_HAN_PN_2', ctxTglMulaiPn2);
  setBothCase('TANGGAL_MULAI_JANG_HAN_PN2', ctxTglMulaiPn2);
  setBothCase('TGL_AKHIR_HAN_PN2', ctxTglAkhirPn2);
  setBothCase('TGL_AKHIR_HAN_PN_2', ctxTglAkhirPn2);
  setBothCase('TGL_AKHIR_JANG_HAN_PN2', ctxTglAkhirPn2);
  setBothCase('TANGGAL_AKHIR_HAN_PN2', ctxTglAkhirPn2);

  // NAMA_TERSANGKA_DKK universal & penanda boolean tunggal vs jamak (IS_SINGLE_TSK, IS_MULTI_TSK, IS_SINGLE_TERLAPOR, IS_MULTI_TERLAPOR)
  const activeSuspectListForDkkCtx = enrichedTersangkaClean.length > 0 ? enrichedTersangkaClean : (targetSubjects.length > 0 ? targetSubjects : terlaporClean);
  const firstSuspectNameCtx = String(activeSuspectListForDkkCtx[0]?.NAMA || activeSuspectListForDkkCtx[0]?.nama || context.NAMA_TERSANGKA || '').replace(/\s+dkk\.?$/i, '').trim();
  const namaTskDkkCtx = (activeSuspectListForDkkCtx.length > 1 && firstSuspectNameCtx) ? `${firstSuspectNameCtx} Dkk` : firstSuspectNameCtx;
  setBothCase('NAMA_TERSANGKA_DKK', namaTskDkkCtx);
  setBothCase('NAMA_TERSANGKA_PERIHAL', namaTskDkkCtx);

  const selectedTskCtx = targetSubjects.filter(s => s && (s._category === 'TERSANGKA' || s.status === 'tersangka'));
  const selectedTerlaporCtx = targetSubjects.filter(s => s && (s._category === 'TERLAPOR' || s.status === 'terlapor'));
  const jumlahTskCtx = (selectedTskCtx.length > 0 ? selectedTskCtx : enrichedTersangkaClean).length;
  const jumlahTerlaporCtx = (selectedTerlaporCtx.length > 0 ? selectedTerlaporCtx : (targetSubjects.length > 0 ? targetSubjects : terlaporClean)).length;
  context.IS_SINGLE_TSK = jumlahTskCtx === 1;
  context.is_single_tsk = jumlahTskCtx === 1;
  context.IS_MULTI_TSK = jumlahTskCtx > 1;
  context.is_multi_tsk = jumlahTskCtx > 1;
  context.IS_SINGLE_TERLAPOR = jumlahTerlaporCtx === 1;
  context.is_single_terlapor = jumlahTerlaporCtx === 1;
  context.IS_MULTI_TERLAPOR = jumlahTerlaporCtx > 1;
  context.is_multi_terlapor = jumlahTerlaporCtx > 1;
  setBothCase('JUMLAH_TERSANGKA_TERBILANG', formatAngkaTerbilang(jumlahTskCtx || 1));
  setBothCase('JUMLAH_TERLAPOR_TERBILANG', formatAngkaTerbilang(jumlahTerlaporCtx || 1));

  // Auto-Fill Rujukan Surat Pengantar Kembali P-19 & Nomor P-21 dari arsip perkara aktif
  const resolvedP19Ctx = resolvePengantarKembaliP19FromArchive(arsipDocs, activeCase);
  if (resolvedP19Ctx.found && resolvedP19Ctx.docNo) {
    const p19DateVal = options.forFormUi ? resolvedP19Ctx.rawDocDate : resolvedP19Ctx.formattedDocDate;
    [
      'NOMOR_PENGANTAR_KEMBALI_P19',
      'NO_PENGANTAR_KEMBALI_P19',
      'NOMOR_PENGANTAR_TAHAP_1_P19',
      'NO_PENGANTAR_TAHAP_1_P19',
      'NOMOR_PENGANTAR_BP_KEMBALI_P19',
      'NO_PENGANTAR_BP_KEMBALI_P19',
      'NOMOR_PENGANTAR_P19',
      'NO_PENGANTAR_P19'
    ].forEach((k) => setBothCase(k, resolvedP19Ctx.docNo));
    if (p19DateVal) {
      [
        'TANGGAL_PENGANTAR_KEMBALI_P19',
        'TGL_PENGANTAR_KEMBALI_P19',
        'TANGGAL_PENGANTAR_TAHAP_1_P19',
        'TGL_PENGANTAR_TAHAP_1_P19',
        'TANGGAL_PENGANTAR_BP_KEMBALI_P19',
        'TGL_PENGANTAR_BP_KEMBALI_P19',
        'TANGGAL_PENGANTAR_P19',
        'TGL_PENGANTAR_P19'
      ].forEach((k) => setBothCase(k, p19DateVal));
    }
  }

  const resolvedP21Ctx = resolveP21FromArchive(arsipDocs, activeCase, activeFormValues);
  if (resolvedP21Ctx.docNo) {
    setBothCase('NO_P21_KN', resolvedP21Ctx.docNo);
    setBothCase('NOMOR_P21_KN', resolvedP21Ctx.docNo);
    setBothCase('SURAT_P21', resolvedP21Ctx.docNo);
    setBothCase('NO_SURAT_P21', resolvedP21Ctx.docNo);
    setBothCase('NOMOR_SURAT_P21', resolvedP21Ctx.docNo);
  }
  if (resolvedP21Ctx.rawDocDate || resolvedP21Ctx.formattedDocDate) {
    const p21DateVal = options.forFormUi ? resolvedP21Ctx.rawDocDate : resolvedP21Ctx.formattedDocDate;
    setBothCase('TGL_P21_KN', p21DateVal);
    setBothCase('TANGGAL_P21_KN', p21DateVal);
    setBothCase('TGL_SURAT_P21', p21DateVal);
    setBothCase('TANGGAL_SURAT_P21', p21DateVal);
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

  // Pastikan rujukan Panggilan Ke-1 dari arsip selalu menimpa nilai kosong / placeholder '......' yang mungkin tersisa di formValues
  if (resolvedSpglSaksi1Ctx.found && resolvedSpglSaksi1Ctx.docNo) {
    assignFirstSummonsReferenceTags(
      mergedContext,
      'SAKSI',
      resolvedSpglSaksi1Ctx.docNo,
      resolvedSpglSaksi1Ctx.formattedDocDate,
      resolvedSpglSaksi1Ctx.rawDocDate,
      Boolean(options.forFormUi)
    );
  }
  if (resolvedSpglTsk1Ctx.found && resolvedSpglTsk1Ctx.docNo) {
    assignFirstSummonsReferenceTags(
      mergedContext,
      'TSK',
      resolvedSpglTsk1Ctx.docNo,
      resolvedSpglTsk1Ctx.formattedDocDate,
      resolvedSpglTsk1Ctx.rawDocDate,
      Boolean(options.forFormUi)
    );
  }

  // Pastikan rujukan Pengantar Kembali P-19 dari arsip selalu menimpa nilai kosong / placeholder '......' di formValues
  if (resolvedP19Ctx.found && resolvedP19Ctx.docNo) {
    const p19DateMerged = options.forFormUi ? resolvedP19Ctx.rawDocDate : resolvedP19Ctx.formattedDocDate;
    [
      'NOMOR_PENGANTAR_KEMBALI_P19',
      'NO_PENGANTAR_KEMBALI_P19',
      'NOMOR_PENGANTAR_TAHAP_1_P19',
      'NO_PENGANTAR_TAHAP_1_P19',
      'NOMOR_PENGANTAR_BP_KEMBALI_P19',
      'NO_PENGANTAR_BP_KEMBALI_P19',
      'NOMOR_PENGANTAR_P19',
      'NO_PENGANTAR_P19'
    ].forEach((k) => {
      if (!isValidOfficialDocNumber(mergedContext[k])) {
        mergedContext[k] = resolvedP19Ctx.docNo;
        mergedContext[k.toLowerCase()] = resolvedP19Ctx.docNo;
      }
    });
    if (p19DateMerged) {
      [
        'TANGGAL_PENGANTAR_KEMBALI_P19',
        'TGL_PENGANTAR_KEMBALI_P19',
        'TANGGAL_PENGANTAR_TAHAP_1_P19',
        'TGL_PENGANTAR_TAHAP_1_P19',
        'TANGGAL_PENGANTAR_BP_KEMBALI_P19',
        'TGL_PENGANTAR_BP_KEMBALI_P19',
        'TANGGAL_PENGANTAR_P19',
        'TGL_PENGANTAR_P19'
      ].forEach((k) => {
        if (!mergedContext[k] || /^(\.{2,}|\u2026+|-)$/.test(String(mergedContext[k]).trim())) {
          mergedContext[k] = p19DateMerged;
          mergedContext[k.toLowerCase()] = p19DateMerged;
        }
      });
    }
  }

  // Otomatisasi Masa Berlaku 1x24 Jam (H+1 dari TANGGAL_SURAT) untuk SPRIN_KAP / SPRIN_KAP_DAN_BA
  const rawOptionTplCode = (
    options.template?.code ||
    options.template?.template_code ||
    options.templateCode ||
    activeFormValues?.TEMPLATE_CODE ||
    activeFormValues?.template_code ||
    ''
  ).toUpperCase().trim();
  const canonicalOptionTplCode = toCanonicalMindikCode(
    rawOptionTplCode,
    options.template?.title || options.template?.name || ''
  );
  const isSprinKapOption =
    canonicalOptionTplCode === 'SPRIN_KAP' ||
    canonicalOptionTplCode === 'SPRIN_KAP_DAN_BA' ||
    rawOptionTplCode === 'SPRIN_KAP' ||
    rawOptionTplCode === 'SPRIN_KAP_DAN_BA';
  const rawActiveDateForKap = activeFormValues?.TANGGAL_SURAT || activeFormValues?.DOC_DATE || activeFormValues?.TGL_SURAT || options.docDate || '';
  if (isSprinKapOption && rawActiveDateForKap) {
    const masaBerlakuIsoCtx = addDaysToIsoDate(rawActiveDateForKap, 1);
    const masaBerlakuValCtx = options.forFormUi ? masaBerlakuIsoCtx : formatTanggalIndonesia(masaBerlakuIsoCtx);
    if (masaBerlakuValCtx) {
      ['MASA_BERLAKU', 'MASA_BERLAKU_KAP', 'SPRIN_MASA_BERLAKU', 'SPRIN_MASA_BERLAKU_KAP', 'TANGGAL_BERLAKU'].forEach((mk) => {
        mergedContext[mk] = masaBerlakuValCtx;
        mergedContext[mk.toLowerCase()] = masaBerlakuValCtx;
      });
    }
  }

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
        tersangka: enrichedTersangkaClean.map((s, i) => normalizeSubjectRecord(s, i, 'Tersangka'))
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

    // 3. RESOLUSI 4-LAPIS PER-TERSANGKA UNTUK TAP_TSK, SPRIN_KAP & SPRIN_HAN
    if (Array.isArray(suspectsList) && suspectsList.length > 0) {
      const tapRes = resolvePerSuspectDocuments(suspectsList, arsip, 'TAP_TSK');
      const kapRes = resolvePerSuspectDocuments(suspectsList, arsip, 'SPRIN_KAP');
      const hanRes = resolvePerSuspectDocuments(suspectsList, arsip, 'SPRIN_HAN');
      suspectsList.forEach((s, idx) => {
        if (!s || typeof s !== 'object') return;
        if (tapRes[idx]?.docNo) {
          s.nomor_sp_tap = tapRes[idx].docNo;
          s.no_sp_tap_tsk = tapRes[idx].docNo;
        }
        if (tapRes[idx]?.rawDocDate) {
          s.tanggal_sp_tap = tapRes[idx].rawDocDate;
          s.tgl_sp_tap_tsk = tapRes[idx].rawDocDate;
        }
        if (kapRes[idx]?.docNo) s.no_sprin_kap = kapRes[idx].docNo;
        if (kapRes[idx]?.rawDocDate) s.tgl_sprin_kap = kapRes[idx].rawDocDate;
        if (hanRes[idx]?.docNo) s.no_sprin_han = hanRes[idx].docNo;
        if (hanRes[idx]?.rawDocDate) s.tgl_sprin_han = hanRes[idx].rawDocDate;
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
export const angkaKeTerbilang = terbilangAngka;

/**
 * Mengonversi angka bilangan menjadi format naskah dinas "N (terbilang)",
 * contoh: formatAngkaTerbilang(1) -> "1 (satu)", formatAngkaTerbilang(2) -> "2 (dua)", formatAngkaTerbilang(12) -> "12 (dua belas)".
 */
export function formatAngkaTerbilang(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '1 (satu)';
  const intVal = Math.trunc(num);
  const words = terbilangAngka(intVal).toLowerCase().trim();
  return words ? `${intVal} (${words})` : String(intVal);
}

/**
 * Mencari dokumen arsip Surat Pengantar BP Tahap I Kembali P-19 terbaru yang sah pada perkara aktif.
 */
export function resolvePengantarKembaliP19FromArchive(archivedDocs = [], activeCase = {}) {
  const docs = Array.isArray(archivedDocs) ? archivedDocs : [];
  const matching = docs
    .filter((doc) => {
      if (!doc || typeof doc !== 'object') return false;
      const rawCode = String(doc.template_code || doc.code || doc.original_template_code || '').toUpperCase().trim();
      const rawTitle = String(doc.doc_title || doc.title || doc.document_name || '').toUpperCase().trim();
      const canon = toCanonicalMindikCode(rawCode, rawTitle);
      if (canon === 'PENGANTAR_BP_KEMBALI_P19') return true;
      if (rawCode.includes('PENGANTAR') && (rawCode.includes('P19') || rawCode.includes('P_19') || rawCode.includes('KEMBALI'))) return true;
      if (
        rawTitle.includes('PENGIRIMAN KEMBALI BERKAS PERKARA') ||
        (rawTitle.includes('PENGANTAR') && (rawTitle.includes('TAHAP I KEMBALI') || rawTitle.includes('TAHAP 1 KEMBALI') || /\bP[-\s]?19\b/.test(rawTitle)))
      ) {
        return true;
      }
      return false;
    })
    .map((doc) => {
      const ext = extractArchivedDocNumberAndDate(doc);
      return {
        doc,
        docNo: ext.docNo,
        rawDocDate: ext.rawDocDate,
        formattedDocDate: ext.formattedDocDate
      };
    })
    .filter((entry) => isValidOfficialDocNumber(entry.docNo))
    .sort((a, b) => new Date(a.doc?.created_at || 0).getTime() - new Date(b.doc?.created_at || 0).getTime());

  if (matching.length > 0) {
    const latest = matching[matching.length - 1];
    return {
      found: true,
      docNo: latest.docNo,
      rawDocDate: latest.rawDocDate,
      formattedDocDate: latest.formattedDocDate
    };
  }

  const refs = activeCase?.references || {};
  const fallbackNo =
    activeCase?.nomor_pengantar_kembali_p19 ||
    activeCase?.no_pengantar_kembali_p19 ||
    refs.no_pengantar_bp_kembali_p19 ||
    refs.nomor_pengantar_kembali_p19 ||
    refs.no_pengantar_kembali_p19 ||
    '';
  const fallbackRawDate =
    activeCase?.tgl_pengantar_kembali_p19 ||
    activeCase?.tanggal_pengantar_kembali_p19 ||
    refs.tgl_pengantar_bp_kembali_p19 ||
    refs.tgl_pengantar_kembali_p19 ||
    '';
  if (isValidOfficialDocNumber(fallbackNo)) {
    return {
      found: true,
      docNo: fallbackNo,
      rawDocDate: fallbackRawDate,
      formattedDocDate: fallbackRawDate ? formatTanggalIndonesia(fallbackRawDate) : ''
    };
  }

  return { found: false, docNo: '', rawDocDate: '', formattedDocDate: '' };
}

/**
 * Mencari dokumen arsip / metadata Surat P-21 (Kejaksaan) terbaru pada perkara aktif.
 */
export function resolveP21FromArchive(archivedDocs = [], activeCase = {}, cleanInput = {}) {
  const docs = Array.isArray(archivedDocs) ? archivedDocs : [];
  let docNo = '';
  let rawDocDate = '';

  for (let i = docs.length - 1; i >= 0; i--) {
    const doc = docs[i];
    if (!doc || typeof doc !== 'object') continue;
    const rawCode = String(doc.template_code || doc.code || '').toUpperCase().trim();
    const rawTitle = String(doc.doc_title || doc.title || '').toUpperCase().trim();
    const canon = toCanonicalMindikCode(rawCode, rawTitle);
    const ext = extractArchivedDocNumberAndDate(doc);
    const mv = ext.metaObj || {};

    if (canon === 'P21_KN' || rawCode.includes('P21') || rawCode.includes('P_21') || /\bP[-\s]?21\b/.test(rawTitle)) {
      if (isValidOfficialDocNumber(ext.docNo)) {
        docNo = ext.docNo;
        rawDocDate = ext.rawDocDate;
        break;
      }
    }
    const metaP21No = mv.NO_P21_KN || mv.no_p21_kn || mv.SURAT_P21 || mv.surat_p21 || mv.NO_SURAT_P21 || mv.no_surat_p21 || mv.NOMOR_P21 || mv.nomor_p21 || '';
    if (isValidOfficialDocNumber(metaP21No)) {
      docNo = String(metaP21No).trim();
      rawDocDate = mv.TGL_P21_KN || mv.tgl_p21_kn || mv.TANGGAL_P21_KN || mv.TGL_SURAT_P21 || mv.TANGGAL_SURAT_P21 || ext.rawDocDate || '';
      break;
    }
  }

  const refs = activeCase?.references || {};
  const finalNo =
    cleanInput?.NO_P21_KN ||
    cleanInput?.no_p21_kn ||
    cleanInput?.SURAT_P21 ||
    cleanInput?.surat_p21 ||
    cleanInput?.NO_SURAT_P21 ||
    cleanInput?.no_surat_p21 ||
    cleanInput?.NOMOR_P21_KN ||
    cleanInput?.NOMOR_SURAT_P21 ||
    docNo ||
    activeCase?.no_p21_kn ||
    activeCase?.surat_p21 ||
    activeCase?.no_surat_p21 ||
    refs.no_p21_kn ||
    refs.surat_p21 ||
    refs.no_surat_p21 ||
    '';
  const finalRawDate =
    cleanInput?.TGL_P21_KN ||
    cleanInput?.tgl_p21_kn ||
    cleanInput?.TANGGAL_P21_KN ||
    cleanInput?.TGL_SURAT_P21 ||
    cleanInput?.TANGGAL_SURAT_P21 ||
    rawDocDate ||
    activeCase?.tgl_p21_kn ||
    refs.tgl_p21_kn ||
    '';

  return {
    docNo: String(finalNo || '').trim(),
    rawDocDate: String(finalRawDate || '').trim(),
    formattedDocDate: finalRawDate ? formatTanggalIndonesia(finalRawDate) : ''
  };
}

/**
 * Membangun array loop {#BARANG_BUKTI} & teks {DAFTAR_BARANG_BUKTI} secara seragam.
 * Jika data barang bukti kosong, menyertakan 1 item fallback bertitik-titik agar loop docxtemplater tidak pernah kosong/error.
 */
export function buildNormalizedBarangBuktiList(rawEvidenceSources = [], rawTextInput = '') {
  const seenEv = new Set();
  const list = [];

  const pushItem = (rawName, rawJumlah = '', rawKet = '') => {
    const cleanName = String(rawName || '')
      .replace(/^\s*(?:\d+|[a-zA-Z])[.)]\s*/, '')
      .trim();
    if (!cleanName || cleanName === '-') return;
    const jumlahStr = String(rawJumlah || '').trim();
    const ketStr = String(rawKet || '').trim();
    const uraianLengkap =
      jumlahStr && !cleanName.toLowerCase().includes(jumlahStr.toLowerCase())
        ? `${jumlahStr} ${cleanName}${ketStr ? ` (${ketStr})` : ''}`
        : `${cleanName}${ketStr ? ` (${ketStr})` : ''}`;
    const dedupKey = uraianLengkap.toLowerCase();
    if (seenEv.has(dedupKey)) return;
    seenEv.add(dedupKey);

    const idx = list.length;
    const noStr = String(idx + 1);
    const hurufStr = String.fromCharCode(97 + (idx % 26));
    list.push({
      no: noStr,
      NO: noStr,
      huruf: hurufStr,
      HURUF: hurufStr,
      nama: uraianLengkap,
      NAMA: uraianLengkap,
      nama_barang: cleanName,
      NAMA_BARANG: cleanName,
      nama_barang_bukti: uraianLengkap,
      NAMA_BARANG_BUKTI: uraianLengkap,
      uraian: uraianLengkap,
      URAIAN: uraianLengkap,
      jumlah: jumlahStr || '1 (satu) buah',
      JUMLAH: jumlahStr || '1 (satu) buah',
      keterangan: ketStr,
      KETERANGAN: ketStr
    });
  };

  (Array.isArray(rawEvidenceSources) ? rawEvidenceSources : []).forEach((ev) => {
    if (!ev) return;
    if (typeof ev === 'string') {
      ev.split(/\r?\n|;/).forEach((line) => pushItem(line));
    } else if (typeof ev === 'object') {
      const namaBb = ev.nama_barang_bukti || ev.NAMA_BARANG_BUKTI || ev.uraian || ev.URAIAN || ev.nama_barang || ev.nama || ev.NAMA || ev.jenis_barang || ev.file_name || '';
      const jumlahBb = ev.jumlah || ev.kuantitas || '';
      const ketBb = ev.keterangan || ev.deskripsi || '';
      pushItem(namaBb, jumlahBb, ketBb);
    }
  });

  if (list.length === 0 && rawTextInput && typeof rawTextInput === 'string') {
    rawTextInput.split(/\r?\n|;/).forEach((line) => pushItem(line));
  }

  const daftarString = list.length > 0
    ? list.map((b) => `${b.NO}. ${b.URAIAN}`).join('\n')
    : '';

  if (list.length === 0) {
    const dots = '........................................';
    list.push({
      no: '1',
      NO: '1',
      huruf: 'a',
      HURUF: 'a',
      nama: dots,
      NAMA: dots,
      nama_barang: dots,
      NAMA_BARANG: dots,
      nama_barang_bukti: dots,
      NAMA_BARANG_BUKTI: dots,
      uraian: dots,
      URAIAN: dots,
      jumlah: '',
      JUMLAH: '',
      keterangan: '',
      KETERANGAN: ''
    });
  }

  return { list, daftarString };
}

/**
 * Mengonversi angka tahun (contoh: 2024 -> "dua ribu dua puluh empat", 2025 -> "dua ribu dua puluh lima", 2026 -> "dua ribu dua puluh enam", 2000 -> "dua ribu").
 */
export function tahunKeTerbilang(tahunInput) {
  if (!tahunInput) return '';
  const str = String(tahunInput).trim();
  const fourDigitMatch = str.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
  const num = fourDigitMatch ? parseInt(fourDigitMatch[1], 10) : parseInt(str.replace(/\D/g, ''), 10);
  if (isNaN(num) || num <= 0) return '';
  return terbilangAngka(num).toLowerCase().trim();
}

export const terbilangTahun = tahunKeTerbilang;

/**
 * Menambahkan `days` hari pada tanggal ISO (atau teks tanggal Indonesia) secara aman tanpa pergeseran zona waktu (UTC).
 * Contoh: addDaysToIsoDate('2026-11-30', 1) -> '2026-12-01', addDaysToIsoDate('2026-12-31', 1) -> '2027-01-01'.
 */
export function addDaysToIsoDate(isoDateStr, days = 1) {
  const cleanIso = toIsoDateString(isoDateStr);
  if (!cleanIso) return '';
  const match = cleanIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const delta = Number.isFinite(Number(days)) ? Math.trunc(Number(days)) : 1;

  const utcDate = new Date(Date.UTC(year, month, day + delta));
  if (isNaN(utcDate.getTime())) return '';

  const outYear = String(utcDate.getUTCFullYear());
  const outMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const outDay = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${outYear}-${outMonth}-${outDay}`;
}

/**
 * Normalisasi format jam naskah dinas Polri (mengubah "09:00" atau "09.00 WITA" menjadi "09.00").
 */
export function formatJamPolri(rawTime) {
  if (!rawTime) return '';
  let str = String(rawTime).trim();
  if (!str || /^(\.{3,}|\u2026+)$/.test(str)) return '';
  if (/^\d{4}-\d{2}-\d{2}T/i.test(str)) {
    str = str.split(/T/i)[1]?.split('.')[0] || str;
  }
  str = str.replace(/\s*(WITA|WIB|WIT)\s*$/i, '').trim();
  const hhmm = str.match(/^(\d{1,2})[:.](\d{2})/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, '0')}.${hhmm[2]}`;
  }
  return str.replace(/:/g, '.');
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
 * Kalkulasi otomatis tanggal berakhir masa penahanan inklusif (tanggal mulai sudah terhitung sebagai hari ke-1).
 * Rumus: akhirIso = addDaysToIsoDate(mulaiIso, durasiHari - 1).
 * Mengembalikan format ISO YYYY-MM-DD tanpa pergeseran zona waktu.
 */
export function hitungTanggalAkhirPenahanan(tanggalMulaiStr, durasiHari = 20) {
  const cleanMulaiIso = toIsoDateString(tanggalMulaiStr);
  if (!cleanMulaiIso) return '';
  const daysToAdd = Math.max(1, Number(durasiHari) || 20) - 1;
  return addDaysToIsoDate(cleanMulaiIso, daysToAdd);
}

/**
 * Klasifikasi tahap penahanan / perpanjangan penahanan berdasarkan kode template & judul.
 * Mengembalikan { isDetentionDoc, stage, durationDays, lamaText, hasBa, isPnStage }
 * - stage: 'SP_HAN' (20 hari), 'PU' (40 hari), 'PN1' (30 hari), 'PN2' (30 hari), atau null
 */
export function getDetentionStageConfig(rawCode = '', title = '') {
  const upCode = String(rawCode || '').toUpperCase().trim();
  const upTitle = String(title || '').toUpperCase().trim();
  const canon = toCanonicalMindikCode(upCode, upTitle);
  const combined = `${upCode} ${canon} ${upTitle}`;

  const isPn2 =
    canon === 'MINTA_PANJANG_HAN_30_KPN2' ||
    canon === 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA' ||
    /\b(PN_?2|KPN_?2|TAHAP_?2_?KPN|30_HARI_2_KPN)\b/.test(combined) ||
    (combined.includes('HAN') && (combined.includes('PN 2') || combined.includes('PN.2') || combined.includes('PN_2') || combined.includes('KPN2') || combined.includes('KPN 2') || combined.includes('KE-2')));

  if (isPn2) {
    const hasBa = canon === 'SPRIN_PANJANG_HAN_30_KPN2_DAN_BA' || upCode.includes('DAN_BA') || upCode.startsWith('SPRIN_') || upCode.startsWith('BA_');
    return {
      isDetentionDoc: true,
      stage: 'PN2',
      durationDays: 30,
      lamaText: '30 (tiga puluh) hari',
      hasBa,
      isPnStage: true
    };
  }

  const isPn1 =
    canon === 'MINTA_PANJANG_HAN_30_KPN1' ||
    canon === 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA' ||
    /\b(PN_?1|KPN_?1|TAHAP_?1_?KPN|30_HARI_1_KPN)\b/.test(combined) ||
    (combined.includes('HAN') && (combined.includes('PN 1') || combined.includes('PN.1') || combined.includes('PN_1') || combined.includes('KPN1') || combined.includes('KPN 1') || combined.includes('PENGADILAN NEGERI')));

  if (isPn1) {
    const hasBa = canon === 'SPRIN_PANJANG_HAN_30_KPN1_DAN_BA' || upCode.includes('DAN_BA') || upCode.startsWith('SPRIN_') || upCode.startsWith('BA_');
    return {
      isDetentionDoc: true,
      stage: 'PN1',
      durationDays: 30,
      lamaText: '30 (tiga puluh) hari',
      hasBa,
      isPnStage: true
    };
  }

  const isPu =
    canon === 'MINTA_PANJANG_HAN_40_KN' ||
    canon === 'SPRIN_PANJANG_HAN_40_KN_DAN_BA' ||
    (combined.includes('HAN') && (
      combined.includes('PANJANG') ||
      combined.includes('PERPANJANG') ||
      combined.includes('40') ||
      combined.includes('_PU') ||
      combined.includes('_KN') ||
      combined.includes('KEJARI') ||
      combined.includes('PENUNTUT UMUM')
    ));

  if (isPu) {
    const hasBa = canon === 'SPRIN_PANJANG_HAN_40_KN_DAN_BA' || upCode.includes('DAN_BA') || upCode.startsWith('SPRIN_') || upCode.startsWith('BA_');
    return {
      isDetentionDoc: true,
      stage: 'PU',
      durationDays: 40,
      lamaText: '40 (empat puluh) hari',
      hasBa,
      isPnStage: false
    };
  }

  const isSpHan =
    canon === 'SPRIN_HAN_DAN_BA' ||
    upCode === 'SPRIN_HAN' ||
    upCode === 'SP_HAN' ||
    upCode === 'BA_HAN' ||
    upCode === 'SPRIN_HAN_DAN_BA' ||
    (combined.includes('PENAHANAN') && !combined.includes('PENGANTAR') && !combined.includes('TAHAP'));

  if (isSpHan) {
    return {
      isDetentionDoc: true,
      stage: 'SP_HAN',
      durationDays: 20,
      lamaText: '20 (dua puluh) hari',
      hasBa: true,
      isPnStage: false
    };
  }

  return {
    isDetentionDoc: false,
    stage: null,
    durationDays: 20,
    lamaText: '20 (dua puluh) hari',
    hasBa: false,
    isPnStage: false
  };
}

/**
 * Mencari dokumen arsip terbaru untuk suatu daftar tahap/kode yang cocok dengan tersangka terpilih
 * (prioritas: cocok ID tersangka -> cocok nama tersangka -> fallback dokumen sah terbaru di arsip).
 */
function findLatestSuspectStageDoc(archivedDocs = [], matcherFn, targetSuspect = null) {
  const safeDocs = (Array.isArray(archivedDocs) ? archivedDocs : [])
    .filter((doc) => {
      if (!doc) return false;
      const rawUp = String(doc.template_code || doc.code || doc.document_type || '').toUpperCase().trim();
      const titleUp = String(doc.doc_title || doc.title || doc.document_name || '').toUpperCase().trim();
      const canon = toCanonicalMindikCode(rawUp, titleUp);
      return matcherFn(canon, rawUp, titleUp, doc);
    })
    .map((doc) => {
      const ext = extractArchivedDocNumberAndDate(doc);
      return {
        doc,
        docNo: ext.docNo,
        rawDocDate: ext.rawDocDate,
        formattedDocDate: ext.formattedDocDate,
        metaObj: ext.metaObj || {},
        target: extractDocTargetSuspectInfo(ext.metaObj || {})
      };
    })
    .filter((entry) => isValidOfficialDocNumber(entry.docNo) || Object.keys(entry.metaObj).length > 0)
    .sort((a, b) => new Date(a.doc?.created_at || 0).getTime() - new Date(b.doc?.created_at || 0).getTime());

  if (safeDocs.length === 0) return null;

  const sId = targetSuspect?.id ? String(targetSuspect.id).trim() : '';
  const sName = String(targetSuspect?.nama || targetSuspect?.nama_lengkap || '').trim().toLowerCase();

  if (sId) {
    for (let i = safeDocs.length - 1; i >= 0; i--) {
      if (safeDocs[i].target.ids.includes(sId)) return safeDocs[i];
    }
  }
  if (sName) {
    for (let i = safeDocs.length - 1; i >= 0; i--) {
      if (safeDocs[i].target.names.includes(sName)) return safeDocs[i];
    }
  }
  // Fallback ke dokumen sah terbaru tanpa target spesifik atau dokumen terakhir
  for (let i = safeDocs.length - 1; i >= 0; i--) {
    if (safeDocs[i].target.ids.length === 0 && safeDocs[i].target.names.length === 0) {
      return safeDocs[i];
    }
  }
  return safeDocs[safeDocs.length - 1];
}

/**
 * Resolusi otomatis tanggal mulai & akhir penahanan inklusif berantai (SP.Han 20 hari -> PU 40 hari -> PN1 30 hari -> PN2 30 hari)
 * untuk tersangka terpilih berdasarkan arsip perkara.
 *
 * Rumus Inklusif (tanggal mulai dihitung hari ke-1):
 * - Akhir tahap = addDaysToIsoDate(mulaiIso, durasiHari - 1)
 * - Mulai tahap berikutnya = addDaysToIsoDate(akhirTahapSebelumnya, 1)
 */
export function resolveChainedDetentionDates({
  templateCode = '',
  templateTitle = '',
  tanggalSuratIso = '',
  archivedDocs = [],
  targetSuspect = null,
  explicitStartIso = '',
  explicitEndIso = ''
} = {}) {
  const stageCfg = getDetentionStageConfig(templateCode, templateTitle);
  const fallbackBaseIso = toIsoDateString(tanggalSuratIso) || new Date().toISOString().split('T')[0];

  const extractStageBounds = (entry, stageDuration, startKeys = [], endKeys = []) => {
    if (!entry) return { startIso: '', endIso: '' };
    const mv = entry.metaObj || {};
    let sIso = '';
    for (const k of [...startKeys, 'MULAI_DITAHAN_ISO', 'MULAI_DITAHAN', 'TANGGAL_MULAI_DITAHAN', 'TGL_MULAI_HAN', 'TANGGAL_MULAI_HAN']) {
      const cand = toIsoDateString(mv[k] || mv[k.toLowerCase()]);
      if (cand) {
        sIso = cand;
        break;
      }
    }
    if (!sIso) {
      sIso = toIsoDateString(entry.rawDocDate);
    }

    let eIso = '';
    for (const k of [...endKeys, 'AKHIR_DITAHAN_ISO', 'AKHIR_DITAHAN', 'TANGGAL_AKHIR_DITAHAN', 'TGL_AKHIR_HAN', 'TANGGAL_AKHIR_HAN']) {
      const cand = toIsoDateString(mv[k] || mv[k.toLowerCase()]);
      if (cand) {
        eIso = cand;
        break;
      }
    }
    if (!eIso && sIso) {
      eIso = addDaysToIsoDate(sIso, stageDuration - 1);
    }
    return { startIso: sIso, endIso: eIso };
  };

  // 1. Cari arsip Tahap 1: SP.Han (20 hari)
  const spHanEntry = findLatestSuspectStageDoc(
    archivedDocs,
    (canon, rawUp) => canon === 'SPRIN_HAN_DAN_BA' || rawUp === 'SPRIN_HAN' || rawUp === 'SP_HAN' || rawUp === 'BA_HAN',
    targetSuspect
  );
  const spHanBounds = extractStageBounds(
    spHanEntry,
    20,
    ['TGL_MULAI_HAN', 'TANGGAL_MULAI_HAN', 'MULAI_DITAHAN'],
    ['TGL_AKHIR_HAN', 'TANGGAL_AKHIR_HAN', 'TGL_AKHIR_HAN_PENYIDIK', 'AKHIR_DITAHAN']
  );
  if (!spHanBounds.startIso && targetSuspect?.tgl_sprin_han) {
    const sCand = toIsoDateString(targetSuspect.tgl_sprin_han);
    if (sCand) {
      spHanBounds.startIso = sCand;
      spHanBounds.endIso = addDaysToIsoDate(sCand, 19);
    }
  }

  // 2. Cari arsip Tahap 2: Perpanjangan PU / Kejari (40 hari)
  const puEntry = findLatestSuspectStageDoc(
    archivedDocs,
    (canon, rawUp, titleUp) => getDetentionStageConfig(rawUp || canon, titleUp).stage === 'PU',
    targetSuspect
  );
  const puBounds = extractStageBounds(
    puEntry,
    40,
    ['TGL_MULAI_JANG_HAN_PU', 'TANGGAL_MULAI_JANG_HAN_PU', 'MULAI_PERPANJANGAN', 'MULAI_DITAHAN'],
    ['TGL_AKHIR_HAN_PU', 'TANGGAL_AKHIR_HAN_PU', 'AKHIR_PERPANJANGAN', 'AKHIR_DITAHAN']
  );
  // Jika arsip PU belum memiliki tanggal akhir namun SP.Han ada, turunkan berantai
  if (!puBounds.startIso && spHanBounds.endIso) {
    puBounds.startIso = addDaysToIsoDate(spHanBounds.endIso, 1);
    puBounds.endIso = addDaysToIsoDate(puBounds.startIso, 39);
  }

  // 3. Cari arsip Tahap 3: Perpanjangan PN 1 (30 hari)
  const pn1Entry = findLatestSuspectStageDoc(
    archivedDocs,
    (canon, rawUp, titleUp) => getDetentionStageConfig(rawUp || canon, titleUp).stage === 'PN1',
    targetSuspect
  );
  const pn1Bounds = extractStageBounds(
    pn1Entry,
    30,
    ['TGL_MULAI_JANG_HAN_PN1', 'TANGGAL_MULAI_JANG_HAN_PN1', 'MULAI_PERPANJANGAN', 'MULAI_DITAHAN'],
    ['TGL_AKHIR_HAN_PN1', 'TANGGAL_AKHIR_HAN_PN1', 'AKHIR_PERPANJANGAN', 'AKHIR_DITAHAN']
  );
  if (!pn1Bounds.startIso && puBounds.endIso) {
    pn1Bounds.startIso = addDaysToIsoDate(puBounds.endIso, 1);
    pn1Bounds.endIso = addDaysToIsoDate(pn1Bounds.startIso, 29);
  }

  // 4. Cari arsip Tahap 4: Perpanjangan PN 2 (30 hari)
  const pn2Entry = findLatestSuspectStageDoc(
    archivedDocs,
    (canon, rawUp, titleUp) => getDetentionStageConfig(rawUp || canon, titleUp).stage === 'PN2',
    targetSuspect
  );
  const pn2Bounds = extractStageBounds(
    pn2Entry,
    30,
    ['TGL_MULAI_JANG_HAN_PN2', 'TANGGAL_MULAI_JANG_HAN_PN2', 'MULAI_PERPANJANGAN', 'MULAI_DITAHAN'],
    ['TGL_AKHIR_HAN_PN2', 'TANGGAL_AKHIR_HAN_PN2', 'AKHIR_PERPANJANGAN', 'AKHIR_DITAHAN']
  );
  if (!pn2Bounds.startIso && pn1Bounds.endIso) {
    pn2Bounds.startIso = addDaysToIsoDate(pn1Bounds.endIso, 1);
    pn2Bounds.endIso = addDaysToIsoDate(pn2Bounds.startIso, 29);
  }

  // Hitung default mulai & akhir untuk tahap aktif
  let defaultStartIso = fallbackBaseIso;
  if (stageCfg.stage === 'SP_HAN') {
    defaultStartIso = fallbackBaseIso;
  } else if (stageCfg.stage === 'PU') {
    defaultStartIso = spHanBounds.endIso ? addDaysToIsoDate(spHanBounds.endIso, 1) : fallbackBaseIso;
  } else if (stageCfg.stage === 'PN1') {
    defaultStartIso = puBounds.endIso ? addDaysToIsoDate(puBounds.endIso, 1) : fallbackBaseIso;
  } else if (stageCfg.stage === 'PN2') {
    defaultStartIso = pn1Bounds.endIso ? addDaysToIsoDate(pn1Bounds.endIso, 1) : fallbackBaseIso;
  }

  const cleanExplicitStart = toIsoDateString(explicitStartIso);
  const cleanExplicitEnd = toIsoDateString(explicitEndIso);

  const mulaiIso = cleanExplicitStart || defaultStartIso;
  const akhirIso = cleanExplicitEnd || (mulaiIso ? addDaysToIsoDate(mulaiIso, stageCfg.durationDays - 1) : '');

  const spHanMv = spHanEntry?.metaObj || {};
  const puMv = puEntry?.metaObj || {};
  const pn1Mv = pn1Entry?.metaObj || {};
  const pn2Mv = pn2Entry?.metaObj || {};

  const resolvedTempatHanFromArchive =
    spHanMv.TEMPAT_PENAHANAN ||
    spHanMv.TEMPAT_HAN ||
    puMv.TEMPAT_PENAHANAN ||
    puMv.TEMPAT_HAN ||
    pn1Mv.TEMPAT_PENAHANAN ||
    pn1Mv.TEMPAT_HAN ||
    pn2Mv.TEMPAT_PENAHANAN ||
    pn2Mv.TEMPAT_HAN ||
    '';

  return {
    ...stageCfg,
    mulaiIso,
    akhirIso,
    defaultStartIso,
    defaultEndIso: defaultStartIso ? addDaysToIsoDate(defaultStartIso, stageCfg.durationDays - 1) : '',
    akhirHanPenyidikIso: stageCfg.stage === 'SP_HAN' ? akhirIso : (spHanBounds.endIso || ''),
    mulaiHanPuIso: stageCfg.stage === 'PU' ? mulaiIso : (puBounds.startIso || ''),
    akhirHanPuIso: stageCfg.stage === 'PU' ? akhirIso : (puBounds.endIso || ''),
    mulaiHanPn1Iso: stageCfg.stage === 'PN1' ? mulaiIso : (pn1Bounds.startIso || ''),
    akhirHanPn1Iso: stageCfg.stage === 'PN1' ? akhirIso : (pn1Bounds.endIso || ''),
    mulaiHanPn2Iso: stageCfg.stage === 'PN2' ? mulaiIso : (pn2Bounds.startIso || ''),
    akhirHanPn2Iso: stageCfg.stage === 'PN2' ? akhirIso : (pn2Bounds.endIso || ''),
    spHanDocNo: spHanEntry?.docNo || '',
    spHanDocDateRaw: spHanEntry?.rawDocDate || '',
    spHanDocDateFormatted: spHanEntry?.formattedDocDate || '',
    puDocNo: puEntry?.docNo || '',
    puDocDateRaw: puEntry?.rawDocDate || '',
    puDocDateFormatted: puEntry?.formattedDocDate || '',
    panjangHanKnNo: puMv.PANJANG_HAN_KN || puMv.NO_PANJANG_HAN_KN || puEntry?.docNo || '',
    pn1DocNo: pn1Entry?.docNo || '',
    pn1DocDateRaw: pn1Entry?.rawDocDate || '',
    pn1DocDateFormatted: pn1Entry?.formattedDocDate || '',
    tapHanPn1No: pn1Mv.TAP_HAN_PN_1 || pn1Mv.NO_TAP_HAN_PN_1 || pn1Entry?.docNo || '',
    pn2DocNo: pn2Entry?.docNo || '',
    pn2DocDateRaw: pn2Entry?.rawDocDate || '',
    pn2DocDateFormatted: pn2Entry?.formattedDocDate || '',
    tapHanPn2No: pn2Mv.TAP_HAN_PN_2 || pn2Mv.NO_TAP_HAN_PN_2 || pn2Entry?.docNo || '',
    archivedTempatHan: resolvedTempatHanFromArchive
  };
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
 * Kamus Pangkat Polri (Pemetaan Nama Lengkap <-> Singkatan Resmi Naskah Dinas Polri).
 */
export const MAP_PANGKAT_LENGKAP = {
  // Perwira Tinggi (Pati)
  'JENDERAL POL': 'JENDERAL POLISI',
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
  'BRIGPOL': 'BRIGADIR POLISI',
  'BRIGADIR': 'BRIGADIR POLISI',
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

export const MAP_PANGKAT_SINGKAT = {
  'BHAYANGKARA DUA': 'BHARADA',
  'BHARADA': 'BHARADA',
  'BHAYANGKARA SATU': 'BHARATU',
  'BHARATU': 'BHARATU',
  'BHAYANGKARA KEPALA': 'BHARAKA',
  'BHARAKA': 'BHARAKA',
  'AJUN BRIGADIR POLISI DUA': 'ABRIPDA',
  'ABRIPDA': 'ABRIPDA',
  'AJUN BRIGADIR POLISI SATU': 'ABRIPTU',
  'ABRIPTU': 'ABRIPTU',
  'AJUN BRIGADIR POLISI': 'ABRIP',
  'ABRIP': 'ABRIP',
  'BRIGADIR POLISI DUA': 'BRIPDA',
  'BRIPDA': 'BRIPDA',
  'BRIGADIR POLISI SATU': 'BRIPTU',
  'BRIPTU': 'BRIPTU',
  'BRIGADIR POLISI': 'BRIGPOL',
  'BRIGPOL': 'BRIGPOL',
  'BRIGADIR': 'BRIGPOL',
  'BRIGADIR POLISI KEPALA': 'BRIPKA',
  'BRIPKA': 'BRIPKA',
  'AJUN INSPEKTUR POLISI DUA': 'AIPDA',
  'AIPDA': 'AIPDA',
  'AJUN INSPEKTUR POLISI SATU': 'AIPTU',
  'AIPTU': 'AIPTU',
  'INSPEKTUR POLISI DUA': 'IPDA',
  'IPDA': 'IPDA',
  'INSPEKTUR POLISI SATU': 'IPTU',
  'IPTU': 'IPTU',
  'AJUN KOMISARIS POLISI': 'AKP',
  'AKP': 'AKP',
  'KOMISARIS POLISI': 'KOMPOL',
  'KOMPOL': 'KOMPOL',
  'AJUN KOMISARIS BESAR POLISI': 'AKBP',
  'AKBP': 'AKBP',
  'KOMISARIS BESAR POLISI': 'KOMBES POL',
  'KOMBES POL': 'KOMBES POL',
  'KOMBES': 'KOMBES POL',
  'BRIGADIR JENDERAL POLISI': 'BRIGJEN POL',
  'BRIGJEN POL': 'BRIGJEN POL',
  'BRIGJEN': 'BRIGJEN POL',
  'INSPEKTUR JENDERAL POLISI': 'IRJEN POL',
  'IRJEN POL': 'IRJEN POL',
  'IRJEN': 'IRJEN POL',
  'KOMISARIS JENDERAL POLISI': 'KOMJEN POL',
  'KOMJEN POL': 'KOMJEN POL',
  'KOMJEN': 'KOMJEN POL',
  'JENDERAL POLISI': 'JENDERAL POL',
  'JENDERAL POL': 'JENDERAL POL',
  'JENDERAL': 'JENDERAL POL'
};

/**
 * Helper konversi semua variasi nama pangkat Polri (panjang maupun singkatan)
 * menjadi singkatan resmi seragam (`IPDA`, `AKP`, `BRIPKA`, `KOMBES POL`, dll.)
 * baik pada batang tubuh maupun blok tanda tangan bawah.
 */
export const formatPangkatSingkat = (rawPangkat) => {
  if (!rawPangkat) return '';
  const str = String(rawPangkat).trim().toUpperCase();
  const cleanKey = str.replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (!cleanKey) return '';

  if (MAP_PANGKAT_SINGKAT[cleanKey]) {
    return MAP_PANGKAT_SINGKAT[cleanKey];
  }

  for (const [fullOrKey, abbr] of Object.entries(MAP_PANGKAT_SINGKAT)) {
    if (cleanKey === fullOrKey) {
      return abbr;
    }
  }

  return cleanKey;
};

export const toPangkatSingkat = formatPangkatSingkat;
export const formatPangkatLengkap = formatPangkatSingkat;
export const toPangkatLengkap = formatPangkatSingkat;

const PERWIRA_RANKS_SET = new Set([
  'IPDA',
  'IPTU',
  'AKP',
  'KOMPOL',
  'AKBP',
  'KOMBES POL',
  'BRIGJEN POL',
  'IRJEN POL',
  'KOMJEN POL',
  'JENDERAL POL'
]);

const BINTARA_TAMTAMA_RANKS_SET = new Set([
  'AIPTU',
  'AIPDA',
  'BRIPKA',
  'BRIGPOL',
  'BRIGADIR',
  'BRIPTU',
  'BRIPDA',
  'ABRIP',
  'ABRIPTU',
  'ABRIPDA',
  'BHARAKA',
  'BHARATU',
  'BHARADA'
]);

/**
 * Menentukan jabatan fungsional KUHAP ('Penyidik' vs 'Penyidik Pembantu') secara otomatis berdasarkan pangkat Polri:
 * - Perwira (IPDA ke atas): 'Penyidik' (Title Case) & 'PENYIDIK' (Upper Case)
 * - Bintara / Tamtama (AIPTU ke bawah): 'Penyidik Pembantu' (Title Case) & 'PENYIDIK PEMBANTU' (Upper Case)
 * - Bila pangkat kosong, gunakan fallbackJabatan (mengandung 'PEMBANTU' -> 'Penyidik Pembantu', selain itu 'Penyidik').
 *
 * Mengembalikan String primitif ('Penyidik' atau 'Penyidik Pembantu') yang juga memiliki properti
 * `.titleCase` dan `.upperCase` agar kompatibel baik dengan perbandingan string `=== "Penyidik"`
 * maupun destrukturisasi `{ titleCase, upperCase }`.
 */
export function resolveJabatanPenyidikByPangkat(rawPangkat = '', fallbackJabatan = '') {
  const pkt = formatPangkatSingkat(rawPangkat);
  let titleCase = 'Penyidik';
  if (pkt) {
    if (PERWIRA_RANKS_SET.has(pkt)) {
      titleCase = 'Penyidik';
    } else if (BINTARA_TAMTAMA_RANKS_SET.has(pkt)) {
      titleCase = 'Penyidik Pembantu';
    } else if (/^(IPDA|IPTU|AKP|KOMPOL|AKBP|KOMBES|BRIGJEN|IRJEN|KOMJEN|JENDERAL)\b/i.test(pkt)) {
      titleCase = 'Penyidik';
    } else if (/^(AIPTU|AIPDA|BRIPKA|BRIGPOL|BRIGADIR|BRIPTU|BRIPDA|ABRIP|BHARA)/i.test(pkt)) {
      titleCase = 'Penyidik Pembantu';
    } else {
      titleCase = /PEMBANTU/i.test(String(fallbackJabatan || '')) ? 'Penyidik Pembantu' : 'Penyidik';
    }
  } else {
    titleCase = /PEMBANTU/i.test(String(fallbackJabatan || '')) ? 'Penyidik Pembantu' : 'Penyidik';
  }
  return titleCase;
}

export function resolveJabatanPenyidikPair(rawPangkat = '', fallbackJabatan = '') {
  const titleCase = resolveJabatanPenyidikByPangkat(rawPangkat, fallbackJabatan);
  return {
    titleCase,
    upperCase: titleCase.toUpperCase()
  };
}

/**
 * Mengekstrak pangkat singkat dari awalan string nama lengkap berformat "[PANGKAT] [NAMA]",
 * contoh: "BRIPKA MUH. ABDIANSYAH DANIAL, S.H." -> "BRIPKA".
 */
export function extractLeadingPangkatFromLabel(rawLabel = '') {
  const str = String(rawLabel || '').trim();
  if (!str) return '';
  const upper = str.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const multiWordRanks = [
    'JENDERAL POLISI', 'JENDERAL POL', 'KOMISARIS JENDERAL POLISI', 'KOMJEN POL',
    'INSPEKTUR JENDERAL POLISI', 'IRJEN POL', 'BRIGADIR JENDERAL POLISI', 'BRIGJEN POL',
    'KOMISARIS BESAR POLISI', 'KOMBES POL', 'AJUN KOMISARIS BESAR POLISI', 'AJUN KOMISARIS POLISI',
    'KOMISARIS POLISI', 'INSPEKTUR POLISI SATU', 'INSPEKTUR POLISI DUA',
    'AJUN INSPEKTUR POLISI SATU', 'AJUN INSPEKTUR POLISI DUA',
    'BRIGADIR POLISI KEPALA', 'BRIGADIR POLISI SATU', 'BRIGADIR POLISI DUA', 'BRIGADIR POLISI'
  ];
  for (const r of multiWordRanks) {
    if (upper === r || upper.startsWith(r + ' ')) {
      return formatPangkatSingkat(r);
    }
  }
  const firstToken = upper.split(' ')[0] || '';
  if (PERWIRA_RANKS_SET.has(firstToken) || BINTARA_TAMTAMA_RANKS_SET.has(firstToken)) {
    return formatPangkatSingkat(firstToken);
  }
  return '';
}

/**
 * Mencari objek personel dari Direktori Personel / daftar penyidik perkara berdasarkan ID, NRP, atau Nama,
 * lalu mengekstrak nomor HP personel tersebut (`no_hp` / `phone` / `no_telepon` / `telepon` / `whatsapp` / `hp`).
 */
export function findPersonnelRecordMatch(targetOfficer = {}, personnelPool = []) {
  if (!targetOfficer || typeof targetOfficer !== 'object') return null;
  const pool = (Array.isArray(personnelPool) ? personnelPool : []).filter(p => p && typeof p === 'object');
  if (pool.length === 0) return null;

  const stripRank = (nm = '') =>
    String(nm || '')
      .replace(/^(JENDERAL POLISI|JENDERAL POL|KOMJEN POL|IRJEN POL|BRIGJEN POL|KOMBES POL|AKBP|KOMPOL|AKP|IPTU|IPDA|AIPTU|AIPDA|BRIPKA|BRIGPOL|BRIGADIR|BRIPTU|BRIPDA|BHARAKA|BHARATU|BHARADA)\s+/i, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const targetId = String(targetOfficer.id || targetOfficer.user_id || '').trim();
  const targetNrp = String(targetOfficer.nrp || '').trim().toLowerCase();
  const targetName = stripRank(targetOfficer.nama || targetOfficer.full_name || targetOfficer.name || '');

  if (targetId && targetId !== '-') {
    const byId = pool.find(p => String(p.id || p.user_id || '').trim() === targetId);
    if (byId) return byId;
  }
  if (targetNrp && targetNrp !== '-') {
    const byNrp = pool.find(p => String(p.nrp || '').trim().toLowerCase() === targetNrp);
    if (byNrp) return byNrp;
  }
  if (targetName && targetName !== '-') {
    const byName = pool.find(p => stripRank(p.nama || p.full_name || p.name || '') === targetName);
    if (byName) return byName;
  }
  return null;
}

export function extractOfficerPhoneNumber(officer = {}, personnelPool = []) {
  const pickHp = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    for (const v of [obj.no_hp, obj.phone, obj.no_telepon, obj.telepon, obj.whatsapp, obj.hp, obj.kontak]) {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s && s !== '-' && s !== 'null' && s !== 'undefined') return s;
      }
    }
    return '';
  };
  const direct = pickHp(officer);
  if (direct) return direct;
  const matched = findPersonnelRecordMatch(officer, personnelPool);
  return pickHp(matched);
}

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
  let archivedDocs = [];
  let selectedSubjectsArg = [];
  let personnelListArg = [];

  // Deteksi fleksibel parameter object vs positional
  if (arg1 && (arg1.activeCase !== undefined || arg1.formValues !== undefined || arg1.activeSuspect !== undefined || arg1.suspectsList !== undefined || arg1.activeVictim !== undefined || arg1.victimsList !== undefined || arg1.selectedVictim !== undefined || arg1.archivedDocs !== undefined || arg1.selectedSubjects !== undefined || arg1.personnelList !== undefined)) {
    activeCase = arg1.activeCase || {};
    activeSuspect = arg1.activeSuspect || null;
    suspectsList = arg1.suspectsList || [];
    activeVictim = arg1.activeVictim || arg1.selectedVictim || null;
    victimsList = Array.isArray(arg1.victimsList) ? arg1.victimsList : (Array.isArray(arg1.victims) ? arg1.victims : []);
    formValues = arg1.formValues || {};
    archivedDocs = Array.isArray(arg1.archivedDocs)
      ? arg1.archivedDocs
      : (Array.isArray(activeCase?.archivedDocs) ? activeCase.archivedDocs : (Array.isArray(activeCase?.documents) ? activeCase.documents : []));
    selectedSubjectsArg = Array.isArray(arg1.selectedSubjects) ? arg1.selectedSubjects : [];
    personnelListArg = Array.isArray(arg1.personnelList)
      ? arg1.personnelList
      : (Array.isArray(arg1.personnel) ? arg1.personnel : (Array.isArray(activeCase?.investigators) ? activeCase.investigators : []));
  } else {
    activeCase = arg1 || {};
    activeSuspect = maybeSuspect || null;
    formValues = maybeInput || {};
    suspectsList = Array.isArray(maybeSuspectsList) && maybeSuspectsList.length > 0
      ? maybeSuspectsList
      : (activeSuspect ? [activeSuspect] : (activeCase.suspectsList || []));
    activeVictim = maybeVictim || null;
    victimsList = Array.isArray(maybeVictimsList) ? maybeVictimsList : [];
    archivedDocs = Array.isArray(activeCase?.archivedDocs) ? activeCase.archivedDocs : (Array.isArray(activeCase?.documents) ? activeCase.documents : []);
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
  const isSprinKapAutoDoc =
    canonicalTplCode === 'SPRIN_KAP' ||
    canonicalTplCode === 'SPRIN_KAP_DAN_BA' ||
    tplCode === 'SPRIN_KAP' ||
    tplCode === 'SPRIN_KAP_DAN_BA';
  const rawMasaBerlaku = isSprinKapAutoDoc
    ? (addDaysToIsoDate(activeRawDate, 1) || cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || '')
    : (cleanInput.MASA_BERLAKU || cleanInput.masa_berlaku || '');
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

  const resolvedP21Payload = resolveP21FromArchive(archivedDocs, activeCase, cleanInput);
  const noP21Kn = resolvedP21Payload.docNo || '';
  const rawTglP21Kn = resolvedP21Payload.rawDocDate || '';
  const tglP21Kn = resolvedP21Payload.formattedDocDate || formatTanggalIndonesia(rawTglP21Kn);

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
  const isKapTemplate = tplCode.includes('KAP') || canonicalTplCode.includes('KAP');
  const isPlaceholderVal = (v) => !v || /^(\.{2,}|\u2026+|-|\s*)$/.test(String(v).trim());
  const rawTglBaKapInput = pickNonEmpty(
    cleanInput.TANGGAL_BA_KAP,
    cleanInput.tanggal_ba_kap,
    !isPlaceholderVal(cleanInput.TANGGAL_KAP) && toIsoDateString(cleanInput.TANGGAL_KAP) ? cleanInput.TANGGAL_KAP : '',
    !isPlaceholderVal(cleanInput.tanggal_kap) && toIsoDateString(cleanInput.tanggal_kap) ? cleanInput.tanggal_kap : '',
    !isPlaceholderVal(cleanInput.TGL_KAP) && toIsoDateString(cleanInput.TGL_KAP) ? cleanInput.TGL_KAP : '',
    !isPlaceholderVal(cleanInput.tgl_kap) && toIsoDateString(cleanInput.tgl_kap) ? cleanInput.tgl_kap : ''
  );
  const rawTglKap = rawTglBaKapInput || activeRawDate || activeSuspect?.tgl_sprin_kap || '';
  const parsedKap = parseDateParts(rawTglKap);
  const hariKap = (!isPlaceholderVal(cleanInput.HARI_KAP) && !rawTglBaKapInput && parsedKap.hari === '')
    ? String(cleanInput.HARI_KAP).trim()
    : (parsedKap.hari || parsedActiveDate.hari || '');
  const tglKap = (!isPlaceholderVal(cleanInput.TANGGAL_KAP) && /^\d{1,2}$/.test(String(cleanInput.TANGGAL_KAP).trim()) && !rawTglBaKapInput)
    ? String(parseInt(cleanInput.TANGGAL_KAP, 10))
    : (parsedKap.tanggal || parsedActiveDate.tanggal || '');
  const bulanKap = (!isPlaceholderVal(cleanInput.BULAN_KAP) && !rawTglBaKapInput && parsedKap.bulan === '')
    ? String(cleanInput.BULAN_KAP).trim()
    : (parsedKap.bulan || parsedActiveDate.bulan || '');
  const tahunKap = parsedKap.tahun || (!isPlaceholderVal(cleanInput.TAHUN_KAP) ? String(cleanInput.TAHUN_KAP).trim() : '') || parsedActiveDate.tahun || String(new Date().getFullYear());
  const terbilangTahunKap = tahunKeTerbilang(Number(tahunKap)) || parsedKap.terbilangTahun || parsedActiveDate.terbilangTahun || '';
  const tglLengkapKap = parsedKap.tanggalLengkap || (rawTglKap ? formatTanggalIndonesia(rawTglKap) : '');
  const rawJamBaKapInput = pickNonEmpty(
    cleanInput.JAM_BA_KAP_TIME,
    cleanInput.jam_ba_kap_time,
    !isPlaceholderVal(cleanInput.JAM_KAP) ? cleanInput.JAM_KAP : '',
    !isPlaceholderVal(cleanInput.jam_kap) ? cleanInput.jam_kap : ''
  ) || (isKapTemplate ? '09:00' : '');
  const jamKap = formatJamPolri(rawJamBaKapInput) || (isKapTemplate ? '09.00' : '');
  const tempatKap = (!isPlaceholderVal(cleanInput.TEMPAT_KAP) ? String(cleanInput.TEMPAT_KAP).trim() : '')
    || (!isPlaceholderVal(cleanInput.tempat_kap) ? String(cleanInput.tempat_kap).trim() : '')
    || (isKapTemplate ? 'Kab. Kolaka Timur' : '');

  // Waktu Penangkapan (Saat Tersangka Ditangkap) -> {WAKTU_KAP}
  const rawTglPenangkapan = pickNonEmpty(
    cleanInput.TANGGAL_PENANGKAPAN,
    cleanInput.tanggal_penangkapan
  ) || activeRawDate;
  const parsedPenangkapan = parseDateParts(rawTglPenangkapan);
  const hariPenangkapan = parsedPenangkapan.hari || parsedActiveDate.hari || hariKap || '';
  const tglPenangkapanFormatted = formatTanggalIndonesia(rawTglPenangkapan) || parsedPenangkapan.tanggalLengkap || tanggalSurat || '';
  const rawJamPenangkapan = pickNonEmpty(
    cleanInput.JAM_PENANGKAPAN_TIME,
    cleanInput.jam_penangkapan_time,
    cleanInput.JAM_PENANGKAPAN,
    cleanInput.jam_penangkapan
  ) || '08:00';
  const jamPenangkapanFormatted = formatJamPolri(rawJamPenangkapan) || '08.00';
  const hasExplicitPenangkapanInputs = Boolean(
    cleanInput.TANGGAL_PENANGKAPAN ||
    cleanInput.tanggal_penangkapan ||
    cleanInput.JAM_PENANGKAPAN_TIME ||
    cleanInput.jam_penangkapan_time
  );
  const customWaktuKapRaw = pickNonEmpty(cleanInput.WAKTU_KAP, cleanInput.waktu_kap);
  const isDefaultPlaceholderWaktuKap = !customWaktuKapRaw || /\.{2,}|\u2026+/.test(customWaktuKapRaw);
  const waktuKap = (!hasExplicitPenangkapanInputs && customWaktuKapRaw && !isDefaultPlaceholderWaktuKap)
    ? customWaktuKapRaw
    : (hariPenangkapan && tglPenangkapanFormatted
        ? `Hari ${hariPenangkapan} tanggal ${tglPenangkapanFormatted}, sekitar Pukul ${jamPenangkapanFormatted} WITA`
        : '');

  // C.2. DATA KHUSUS SPRIN & BA PENAHANAN + PERPANJANGAN PENAHANAN BERANTAI INKLUSIF
  // (SP.Han 20 Hari -> Perpanjangan PU 40 Hari -> Perpanjangan PN 1 30 Hari -> Perpanjangan PN 2 30 Hari)
  const detentionStageCfg = getDetentionStageConfig(tplCode || canonicalTplCode, tplName);
  const isHanTemplate = detentionStageCfg.isDetentionDoc || tplCode.includes('HAN') || canonicalTplCode.includes('HAN');
  const targetSuspectForDetention =
    (Array.isArray(selectedSubjectsArg) && selectedSubjectsArg[0]) ||
    (Array.isArray(cleanInput.__SELECTED_SUBJECTS__) && cleanInput.__SELECTED_SUBJECTS__[0]) ||
    activeSuspect ||
    (Array.isArray(suspectsList) && suspectsList[0]) ||
    null;

  const pickStageStartCandidate = () => {
    if (detentionStageCfg.stage === 'PU') {
      return pickNonEmpty(
        cleanInput.MULAI_DITAHAN,
        cleanInput.mulai_ditahan,
        cleanInput.TANGGAL_MULAI_DITAHAN,
        cleanInput.tanggal_mulai_ditahan,
        cleanInput.TGL_MULAI_JANG_HAN_PU,
        cleanInput.tgl_mulai_jang_han_pu,
        cleanInput.TANGGAL_MULAI_JANG_HAN_PU,
        cleanInput.MULAI_PERPANJANGAN,
        cleanInput.mulai_perpanjangan,
        cleanInput.TANGGAL_MULAI_HAN,
        cleanInput.TGL_MULAI_HAN
      );
    }
    if (detentionStageCfg.stage === 'PN1') {
      return pickNonEmpty(
        cleanInput.MULAI_DITAHAN,
        cleanInput.mulai_ditahan,
        cleanInput.TANGGAL_MULAI_DITAHAN,
        cleanInput.tanggal_mulai_ditahan,
        cleanInput.TGL_MULAI_JANG_HAN_PN1,
        cleanInput.tgl_mulai_jang_han_pn1,
        cleanInput.TANGGAL_MULAI_JANG_HAN_PN1,
        cleanInput.MULAI_PERPANJANGAN,
        cleanInput.mulai_perpanjangan,
        cleanInput.TANGGAL_MULAI_HAN,
        cleanInput.TGL_MULAI_HAN
      );
    }
    if (detentionStageCfg.stage === 'PN2') {
      return pickNonEmpty(
        cleanInput.MULAI_DITAHAN,
        cleanInput.mulai_ditahan,
        cleanInput.TANGGAL_MULAI_DITAHAN,
        cleanInput.tanggal_mulai_ditahan,
        cleanInput.TGL_MULAI_JANG_HAN_PN2,
        cleanInput.tgl_mulai_jang_han_pn2,
        cleanInput.TANGGAL_MULAI_JANG_HAN_PN2,
        cleanInput.MULAI_PERPANJANGAN,
        cleanInput.mulai_perpanjangan,
        cleanInput.TANGGAL_MULAI_HAN,
        cleanInput.TGL_MULAI_HAN
      );
    }
    return pickNonEmpty(
      cleanInput.MULAI_DITAHAN,
      cleanInput.mulai_ditahan,
      cleanInput.TANGGAL_MULAI_DITAHAN,
      cleanInput.tanggal_mulai_ditahan,
      cleanInput.TANGGAL_MULAI_HAN,
      cleanInput.tanggal_mulai_han,
      cleanInput.TGL_MULAI_HAN,
      cleanInput.tgl_mulai_han,
      cleanInput.SPRIN_MULAI_DITAHAN
    );
  };

  const pickStageEndCandidate = () => {
    if (detentionStageCfg.stage === 'PU') {
      return pickNonEmpty(
        cleanInput.AKHIR_DITAHAN,
        cleanInput.akhir_ditahan,
        cleanInput.TANGGAL_AKHIR_DITAHAN,
        cleanInput.tanggal_akhir_ditahan,
        cleanInput.TGL_AKHIR_HAN_PU,
        cleanInput.tgl_akhir_han_pu,
        cleanInput.TANGGAL_AKHIR_HAN_PU,
        cleanInput.AKHIR_PERPANJANGAN,
        cleanInput.akhir_perpanjangan,
        cleanInput.TANGGAL_AKHIR_HAN,
        cleanInput.TGL_AKHIR_HAN
      );
    }
    if (detentionStageCfg.stage === 'PN1') {
      return pickNonEmpty(
        cleanInput.AKHIR_DITAHAN,
        cleanInput.akhir_ditahan,
        cleanInput.TANGGAL_AKHIR_DITAHAN,
        cleanInput.tanggal_akhir_ditahan,
        cleanInput.TGL_AKHIR_HAN_PN1,
        cleanInput.tgl_akhir_han_pn1,
        cleanInput.TANGGAL_AKHIR_HAN_PN1,
        cleanInput.AKHIR_PERPANJANGAN,
        cleanInput.akhir_perpanjangan,
        cleanInput.TANGGAL_AKHIR_HAN,
        cleanInput.TGL_AKHIR_HAN
      );
    }
    if (detentionStageCfg.stage === 'PN2') {
      return pickNonEmpty(
        cleanInput.AKHIR_DITAHAN,
        cleanInput.akhir_ditahan,
        cleanInput.TANGGAL_AKHIR_DITAHAN,
        cleanInput.tanggal_akhir_ditahan,
        cleanInput.TGL_AKHIR_HAN_PN2,
        cleanInput.tgl_akhir_han_pn2,
        cleanInput.TANGGAL_AKHIR_HAN_PN2,
        cleanInput.AKHIR_PERPANJANGAN,
        cleanInput.akhir_perpanjangan,
        cleanInput.TANGGAL_AKHIR_HAN,
        cleanInput.TGL_AKHIR_HAN
      );
    }
    return pickNonEmpty(
      cleanInput.AKHIR_DITAHAN,
      cleanInput.akhir_ditahan,
      cleanInput.TANGGAL_AKHIR_DITAHAN,
      cleanInput.tanggal_akhir_ditahan,
      cleanInput.TANGGAL_AKHIR_HAN,
      cleanInput.tanggal_akhir_han,
      cleanInput.TGL_AKHIR_HAN,
      cleanInput.tgl_akhir_han,
      cleanInput.SPRIN_AKHIR_DITAHAN
    );
  };

  const explicitStartCandidate = pickStageStartCandidate();
  const explicitEndCandidate = pickStageEndCandidate();

  const resolvedDetention = resolveChainedDetentionDates({
    templateCode: tplCode || canonicalTplCode,
    templateTitle: tplName,
    tanggalSuratIso: activeRawDate,
    archivedDocs,
    targetSuspect: targetSuspectForDetention,
    explicitStartIso: !isPlaceholderVal(explicitStartCandidate) ? explicitStartCandidate : '',
    explicitEndIso: !isPlaceholderVal(explicitEndCandidate) ? explicitEndCandidate : ''
  });

  const rawTglMulaiHan = resolvedDetention.mulaiIso || (isHanTemplate ? activeRawDate : '');
  const rawTglAkhirHan = resolvedDetention.akhirIso || (rawTglMulaiHan ? hitungTanggalAkhirPenahanan(rawTglMulaiHan, resolvedDetention.durationDays || 20) : '');
  const tglMulaiHanFormatted = rawTglMulaiHan ? formatTanggalIndonesia(rawTglMulaiHan) : '';
  const tglAkhirHanFormatted = rawTglAkhirHan ? formatTanggalIndonesia(rawTglAkhirHan) : '';
  const lamaPenahananText = pickNonEmpty(cleanInput.LAMA_PENAHANAN, cleanInput.lama_penahanan, cleanInput.MASA_PENAHANAN, cleanInput.masa_penahanan) || resolvedDetention.lamaText || '20 (dua puluh) hari';

  // Tanggal rujukan lintas-tahap penahanan (Penyidik -> PU -> PN 1 -> PN 2)
  const tglAkhirHanPenyidikFormatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TANGGAL_AKHIR_HAN_PENYIDIK) ? cleanInput.TANGGAL_AKHIR_HAN_PENYIDIK : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PENYIDIK) ? cleanInput.TGL_AKHIR_HAN_PENYIDIK : '') ||
    resolvedDetention.akhirHanPenyidikIso ||
    (detentionStageCfg.stage === 'SP_HAN' ? rawTglAkhirHan : '')
  );
  const tglMulaiJangHanPuFormatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_MULAI_JANG_HAN_PU) ? cleanInput.TGL_MULAI_JANG_HAN_PU : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_MULAI_JANG_HAN_PU) ? cleanInput.TANGGAL_MULAI_JANG_HAN_PU : '') ||
    resolvedDetention.mulaiHanPuIso ||
    (detentionStageCfg.stage === 'PU' ? rawTglMulaiHan : '')
  );
  const tglAkhirHanPuFormatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PU) ? cleanInput.TGL_AKHIR_HAN_PU : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_JANG_HAN_PU) ? cleanInput.TGL_AKHIR_JANG_HAN_PU : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_AKHIR_HAN_PU) ? cleanInput.TANGGAL_AKHIR_HAN_PU : '') ||
    resolvedDetention.akhirHanPuIso ||
    (detentionStageCfg.stage === 'PU' ? rawTglAkhirHan : '')
  );
  const tglMulaiJangHanPn1Formatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_MULAI_JANG_HAN_PN1) ? cleanInput.TGL_MULAI_JANG_HAN_PN1 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_MULAI_JANG_HAN_PN_1) ? cleanInput.TGL_MULAI_JANG_HAN_PN_1 : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_MULAI_JANG_HAN_PN1) ? cleanInput.TANGGAL_MULAI_JANG_HAN_PN1 : '') ||
    resolvedDetention.mulaiHanPn1Iso ||
    (detentionStageCfg.stage === 'PN1' ? rawTglMulaiHan : '')
  );
  const tglAkhirHanPn1Formatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PN1) ? cleanInput.TGL_AKHIR_HAN_PN1 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PN_1) ? cleanInput.TGL_AKHIR_HAN_PN_1 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_JANG_HAN_PN1) ? cleanInput.TGL_AKHIR_JANG_HAN_PN1 : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_AKHIR_HAN_PN1) ? cleanInput.TANGGAL_AKHIR_HAN_PN1 : '') ||
    resolvedDetention.akhirHanPn1Iso ||
    (detentionStageCfg.stage === 'PN1' ? rawTglAkhirHan : '')
  );
  const tglMulaiJangHanPn2Formatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_MULAI_JANG_HAN_PN2) ? cleanInput.TGL_MULAI_JANG_HAN_PN2 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_MULAI_JANG_HAN_PN_2) ? cleanInput.TGL_MULAI_JANG_HAN_PN_2 : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_MULAI_JANG_HAN_PN2) ? cleanInput.TANGGAL_MULAI_JANG_HAN_PN2 : '') ||
    resolvedDetention.mulaiHanPn2Iso ||
    (detentionStageCfg.stage === 'PN2' ? rawTglMulaiHan : '')
  );
  const tglAkhirHanPn2Formatted = formatTanggalIndonesia(
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PN2) ? cleanInput.TGL_AKHIR_HAN_PN2 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_HAN_PN_2) ? cleanInput.TGL_AKHIR_HAN_PN_2 : '') ||
    (!isPlaceholderVal(cleanInput.TGL_AKHIR_JANG_HAN_PN2) ? cleanInput.TGL_AKHIR_JANG_HAN_PN2 : '') ||
    (!isPlaceholderVal(cleanInput.TANGGAL_AKHIR_HAN_PN2) ? cleanInput.TANGGAL_AKHIR_HAN_PN2 : '') ||
    resolvedDetention.akhirHanPn2Iso ||
    (detentionStageCfg.stage === 'PN2' ? rawTglAkhirHan : '')
  );

  // Rujukan nomor & tanggal surat perintah penahanan & perpanjangan (PU, PN1, PN2) serta ketetapan Kejari/KPN dari arsip
  const effectiveNoSprinHan = noSprinHan || resolvedDetention.spHanDocNo || '';
  const effectiveTglSprinHan = tglSprinHan || resolvedDetention.spHanDocDateFormatted || '';

  const effectiveNoSprinHanKn = pickNonEmpty(
    noSprinHanKn,
    noPanjangHanKn,
    resolvedDetention.puDocNo
  );
  const effectiveTglSprinHanKn = pickNonEmpty(
    tglSprinHanKn,
    tglPanjangHanKn,
    resolvedDetention.puDocDateFormatted
  );
  const effectivePanjangHanKn = pickNonEmpty(
    !isPlaceholderVal(cleanInput.PANJANG_HAN_KN) ? cleanInput.PANJANG_HAN_KN : '',
    !isPlaceholderVal(cleanInput.panjang_han_kn) ? cleanInput.panjang_han_kn : '',
    noPanjangHanKn,
    resolvedDetention.panjangHanKnNo,
    effectiveNoSprinHanKn
  );

  const effectiveNoSprinHanPn1 = pickNonEmpty(
    !isPlaceholderVal(cleanInput.NO_SPRIN_HAN_PN_1) ? cleanInput.NO_SPRIN_HAN_PN_1 : '',
    !isPlaceholderVal(cleanInput.no_sprin_han_pn_1) ? cleanInput.no_sprin_han_pn_1 : '',
    !isPlaceholderVal(cleanInput.NO_SPRIN_HAN_PN1) ? cleanInput.NO_SPRIN_HAN_PN1 : '',
    noTapHanPn1,
    activeSuspect?.no_perpanjangan_pn_1,
    activeSuspect?.no_sprin_han_pn_1,
    resolvedDetention.pn1DocNo
  );
  const effectiveTglSprinHanPn1 = formatTanggalIndonesia(
    pickNonEmpty(
      !isPlaceholderVal(cleanInput.TGL_SPRIN_HAN_PN_1) ? cleanInput.TGL_SPRIN_HAN_PN_1 : '',
      !isPlaceholderVal(cleanInput.tgl_sprin_han_pn_1) ? cleanInput.tgl_sprin_han_pn_1 : '',
      !isPlaceholderVal(cleanInput.TANGGAL_SPRIN_HAN_PN_1) ? cleanInput.TANGGAL_SPRIN_HAN_PN_1 : '',
      !isPlaceholderVal(cleanInput.TGL_SPRIN_HAN_PN1) ? cleanInput.TGL_SPRIN_HAN_PN1 : '',
      rawTglTapHanPn1,
      activeSuspect?.tgl_perpanjangan_pn_1,
      activeSuspect?.tgl_sprin_han_pn_1,
      resolvedDetention.pn1DocDateRaw
    )
  ) || tglTapHanPn1 || resolvedDetention.pn1DocDateFormatted || '';
  const effectiveTapHanPn1 = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TAP_HAN_PN_1) ? cleanInput.TAP_HAN_PN_1 : '',
    !isPlaceholderVal(cleanInput.tap_han_pn_1) ? cleanInput.tap_han_pn_1 : '',
    noTapHanPn1,
    resolvedDetention.tapHanPn1No,
    effectiveNoSprinHanPn1
  );

  const effectiveNoSprinHanPn2 = pickNonEmpty(
    !isPlaceholderVal(cleanInput.NO_SPRIN_HAN_PN_2) ? cleanInput.NO_SPRIN_HAN_PN_2 : '',
    !isPlaceholderVal(cleanInput.no_sprin_han_pn_2) ? cleanInput.no_sprin_han_pn_2 : '',
    !isPlaceholderVal(cleanInput.NO_SPRIN_HAN_PN2) ? cleanInput.NO_SPRIN_HAN_PN2 : '',
    noTapHanPn2,
    activeSuspect?.no_perpanjangan_pn_2,
    activeSuspect?.no_sprin_han_pn_2,
    resolvedDetention.pn2DocNo
  );
  const effectiveTglSprinHanPn2 = formatTanggalIndonesia(
    pickNonEmpty(
      !isPlaceholderVal(cleanInput.TGL_SPRIN_HAN_PN_2) ? cleanInput.TGL_SPRIN_HAN_PN_2 : '',
      !isPlaceholderVal(cleanInput.tgl_sprin_han_pn_2) ? cleanInput.tgl_sprin_han_pn_2 : '',
      !isPlaceholderVal(cleanInput.TANGGAL_SPRIN_HAN_PN_2) ? cleanInput.TANGGAL_SPRIN_HAN_PN_2 : '',
      !isPlaceholderVal(cleanInput.TGL_SPRIN_HAN_PN2) ? cleanInput.TGL_SPRIN_HAN_PN2 : '',
      rawTglTapHanPn2,
      activeSuspect?.tgl_perpanjangan_pn_2,
      activeSuspect?.tgl_sprin_han_pn_2,
      resolvedDetention.pn2DocDateRaw
    )
  ) || tglTapHanPn2 || resolvedDetention.pn2DocDateFormatted || '';
  const effectiveTapHanPn2 = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TAP_HAN_PN_2) ? cleanInput.TAP_HAN_PN_2 : '',
    !isPlaceholderVal(cleanInput.tap_han_pn_2) ? cleanInput.tap_han_pn_2 : '',
    noTapHanPn2,
    resolvedDetention.tapHanPn2No,
    effectiveNoSprinHanPn2
  );

  // Rujukan Surat Panggilan Tersangka (jika tersangka hadir menghadap penyidik lewat panggilan, bukan SP.Kap)
  const spglTskArchiveEntry = findLatestSuspectStageDoc(
    archivedDocs,
    (canon, rawUp) => canon === 'SPGL_TSK_1' || canon === 'SPGL_TSK_2' || rawUp.startsWith('SPGL_TSK'),
    targetSuspectForDetention
  );
  const noSpglTsk = pickNonEmpty(cleanInput.NO_SPGL_TSK, cleanInput.no_spgl_tsk, cleanInput.NOMOR_SPGL_TSK, spglTskArchiveEntry?.docNo);
  const rawTglSpglTsk = pickNonEmpty(cleanInput.TGL_SPGL_TSK, cleanInput.tgl_spgl_tsk, cleanInput.TANGGAL_SPGL_TSK, spglTskArchiveEntry?.rawDocDate);
  const tglSpglTsk = formatTanggalIndonesia(rawTglSpglTsk);

  const isPlaceholderTempatHan = (v) => !v || /^(\.{2,}|\u2026+|-|\s*)$/.test(String(v).trim()) || /rumah tahanan Negara \.{2,}/i.test(String(v));
  const rawTempatHanCandidate = pickNonEmpty(
    !isPlaceholderTempatHan(cleanInput.TEMPAT_PENAHANAN) ? cleanInput.TEMPAT_PENAHANAN : '',
    !isPlaceholderTempatHan(cleanInput.tempat_penahanan) ? cleanInput.tempat_penahanan : '',
    !isPlaceholderTempatHan(cleanInput.TEMPAT_HAN) ? cleanInput.TEMPAT_HAN : '',
    !isPlaceholderTempatHan(cleanInput.tempat_han) ? cleanInput.tempat_han : '',
    !isPlaceholderTempatHan(cleanInput.TEMPAT_RUTAN_HAN) ? cleanInput.TEMPAT_RUTAN_HAN : '',
    !isPlaceholderTempatHan(cleanInput.tempat_rutan_han) ? cleanInput.tempat_rutan_han : '',
    !isPlaceholderTempatHan(resolvedDetention.archivedTempatHan) ? resolvedDetention.archivedTempatHan : '',
    !isPlaceholderTempatHan(targetSuspectForDetention?.tempat_penahanan) ? targetSuspectForDetention.tempat_penahanan : '',
    !isPlaceholderTempatHan(targetSuspectForDetention?.tempat_han) ? targetSuspectForDetention.tempat_han : ''
  );
  const tempatHan = rawTempatHanCandidate || 'Rumah Tahanan Negara Polres Kolaka Timur';

  // Blok B: Waktu BA Penahanan (HARI_BA_HAN / HARI_HAN, TANGGAL_BA_HAN / TANGGAL_HAN, BULAN_BA_HAN / BULAN_HAN, TAHUN_BA_HAN / TAHUN_HAN, TERBILANG_TAHUN_BA_HAN / TERBILANG_TAHUN_HAN, JAM_BA_HAN / JAM_HAN)
  const rawTglBaHanInput = pickNonEmpty(
    cleanInput.TANGGAL_BA_HAN_DATE,
    cleanInput.tanggal_ba_han_date,
    !isPlaceholderVal(cleanInput.TANGGAL_BA_HAN) && toIsoDateString(cleanInput.TANGGAL_BA_HAN) ? cleanInput.TANGGAL_BA_HAN : '',
    !isPlaceholderVal(cleanInput.TANGGAL_HAN) && toIsoDateString(cleanInput.TANGGAL_HAN) ? cleanInput.TANGGAL_HAN : '',
    !isPlaceholderVal(cleanInput.tanggal_han) && toIsoDateString(cleanInput.tanggal_han) ? cleanInput.tanggal_han : '',
    !isPlaceholderVal(cleanInput.TGL_HAN) && toIsoDateString(cleanInput.TGL_HAN) ? cleanInput.TGL_HAN : ''
  );
  const rawTglHan = rawTglBaHanInput || activeRawDate || rawTglMulaiHan || '';
  const parsedHan = parseDateParts(rawTglHan);
  const hariHan = (!isPlaceholderVal(cleanInput.HARI_BA_HAN) && !rawTglBaHanInput && parsedHan.hari === '')
    ? String(cleanInput.HARI_BA_HAN).trim()
    : ((!isPlaceholderVal(cleanInput.HARI_HAN) && !rawTglBaHanInput && parsedHan.hari === '')
        ? String(cleanInput.HARI_HAN).trim()
        : (parsedHan.hari || parsedActiveDate.hari || ''));
  const tglHan = (!isPlaceholderVal(cleanInput.TANGGAL_BA_HAN) && /^\d{1,2}$/.test(String(cleanInput.TANGGAL_BA_HAN).trim()) && !rawTglBaHanInput)
    ? String(parseInt(cleanInput.TANGGAL_BA_HAN, 10))
    : ((!isPlaceholderVal(cleanInput.TANGGAL_HAN) && /^\d{1,2}$/.test(String(cleanInput.TANGGAL_HAN).trim()) && !rawTglBaHanInput)
        ? String(parseInt(cleanInput.TANGGAL_HAN, 10))
        : (parsedHan.tanggal || parsedActiveDate.tanggal || ''));
  const bulanHan = (!isPlaceholderVal(cleanInput.BULAN_BA_HAN) && !rawTglBaHanInput && parsedHan.bulan === '')
    ? String(cleanInput.BULAN_BA_HAN).trim()
    : ((!isPlaceholderVal(cleanInput.BULAN_HAN) && !rawTglBaHanInput && parsedHan.bulan === '')
        ? String(cleanInput.BULAN_HAN).trim()
        : (parsedHan.bulan || parsedActiveDate.bulan || ''));
  const tahunHan = parsedHan.tahun
    || (!isPlaceholderVal(cleanInput.TAHUN_BA_HAN) ? String(cleanInput.TAHUN_BA_HAN).trim() : '')
    || (!isPlaceholderVal(cleanInput.TAHUN_HAN) ? String(cleanInput.TAHUN_HAN).trim() : '')
    || parsedActiveDate.tahun
    || String(new Date().getFullYear());
  const terbilangTahunHan = tahunKeTerbilang(Number(tahunHan)) || parsedHan.terbilangTahun || parsedActiveDate.terbilangTahun || '';
  const tglLengkapHan = parsedHan.tanggalLengkap || (rawTglHan ? formatTanggalIndonesia(rawTglHan) : '');
  const rawJamBaHanInput = pickNonEmpty(
    cleanInput.JAM_BA_HAN_TIME,
    cleanInput.jam_ba_han_time,
    !isPlaceholderVal(cleanInput.JAM_BA_HAN) ? cleanInput.JAM_BA_HAN : '',
    !isPlaceholderVal(cleanInput.JAM_HAN) ? cleanInput.JAM_HAN : '',
    !isPlaceholderVal(cleanInput.jam_han) ? cleanInput.jam_han : ''
  ) || (isHanTemplate ? '09:00' : '');
  const jamHan = formatJamPolri(rawJamBaHanInput) || (isHanTemplate ? '09.00' : '');

  // Blok C: Waktu Pelaksanaan Penahanan -> {WAKTU_HAN} / {WAKTU_PENAHANAN}
  const rawTglPelaksanaanHan = pickNonEmpty(
    cleanInput.TANGGAL_PELAKSANAAN_HAN,
    cleanInput.tanggal_pelaksanaan_han
  ) || rawTglMulaiHan || activeRawDate;
  const parsedPelaksanaanHan = parseDateParts(rawTglPelaksanaanHan);
  const hariPelaksanaanHan = parsedPelaksanaanHan.hari || hariHan || parsedActiveDate.hari || '';
  const tglPelaksanaanHanFormatted = formatTanggalIndonesia(rawTglPelaksanaanHan) || parsedPelaksanaanHan.tanggalLengkap || tglMulaiHanFormatted || tanggalSurat || '';
  const rawJamPelaksanaanHan = pickNonEmpty(
    cleanInput.JAM_PELAKSANAAN_HAN_TIME,
    cleanInput.jam_pelaksanaan_han_time,
    cleanInput.JAM_PENAHANAN_TIME,
    cleanInput.jam_penahanan_time
  ) || '08:30';
  const jamPelaksanaanHanFormatted = formatJamPolri(rawJamPelaksanaanHan) || '08.30';
  const hasExplicitPelaksanaanHanInputs = Boolean(
    cleanInput.TANGGAL_PELAKSANAAN_HAN ||
    cleanInput.tanggal_pelaksanaan_han ||
    cleanInput.JAM_PELAKSANAAN_HAN_TIME ||
    cleanInput.jam_pelaksanaan_han_time
  );
  const customWaktuHanRaw = pickNonEmpty(cleanInput.WAKTU_HAN, cleanInput.waktu_han, cleanInput.WAKTU_PENAHANAN, cleanInput.waktu_penahanan);
  const isDefaultPlaceholderWaktuHan = !customWaktuHanRaw || /\.{2,}|\u2026+/.test(customWaktuHanRaw);
  const waktuHan = (!hasExplicitPelaksanaanHanInputs && customWaktuHanRaw && !isDefaultPlaceholderWaktuHan)
    ? customWaktuHanRaw
    : (hariPelaksanaanHan && tglPelaksanaanHanFormatted
        ? `Hari ${hariPelaksanaanHan} tanggal ${tglPelaksanaanHanFormatted}, sekitar Pukul ${jamPelaksanaanHanFormatted} WITA`
        : '');

  // C.4. DATA KHUSUS SURAT PANGGILAN TERSANGKA (1 & 2) DAN SURAT PANGGILAN SAKSI (1 & 2)
  const isSpglDoc =
    canonicalTplCode.startsWith('SPGL_') ||
    tplCode.startsWith('SPGL_') ||
    tplCode.includes('PANGGIL') ||
    tplName.includes('panggilan');
  const isSpglSaksiDoc =
    canonicalTplCode.startsWith('SPGL_SAKSI') ||
    tplCode.startsWith('SPGL_SAKSI') ||
    (isSpglDoc && (tplCode.includes('SAKSI') || tplName.includes('saksi')));
  const isSpglTskDoc =
    canonicalTplCode.startsWith('SPGL_TSK') ||
    tplCode.startsWith('SPGL_TSK') ||
    (isSpglDoc && (tplCode.includes('TSK') || tplCode.includes('TERSANGKA') || tplName.includes('tersangka')));

  const rawTglPanggilanSource = pickNonEmpty(
    cleanInput.TANGGAL_PANGGILAN_ISO,
    cleanInput.tanggal_panggilan_iso,
    !isPlaceholderVal(cleanInput.TANGGAL_PANGGILAN) ? cleanInput.TANGGAL_PANGGILAN : '',
    !isPlaceholderVal(cleanInput.tanggal_panggilan) ? cleanInput.tanggal_panggilan : '',
    !isPlaceholderVal(cleanInput.TGL_PANGGILAN) ? cleanInput.TGL_PANGGILAN : '',
    !isPlaceholderVal(cleanInput.tgl_panggilan) ? cleanInput.tgl_panggilan : ''
  ) || (isSpglDoc ? addDaysToIsoDate(activeRawDate, 3) : '');
  const parsedPanggilan = parseDateParts(rawTglPanggilanSource);
  const hariPanggilan = parsedPanggilan.hari
    || (!isPlaceholderVal(cleanInput.HARI_PANGGILAN) ? String(cleanInput.HARI_PANGGILAN).trim() : '')
    || (!isPlaceholderVal(cleanInput.hari_panggilan) ? String(cleanInput.hari_panggilan).trim() : '');
  const tanggalPanggilanFormatted = formatTanggalIndonesia(rawTglPanggilanSource)
    || parsedPanggilan.tanggalLengkap
    || (!isPlaceholderVal(cleanInput.TANGGAL_PANGGILAN) ? String(cleanInput.TANGGAL_PANGGILAN).trim() : '');

  const rawJamPanggilanSource = pickNonEmpty(
    cleanInput.JAM_PANGGILAN_TIME,
    cleanInput.jam_panggilan_time,
    !isPlaceholderVal(cleanInput.JAM_PANGGILAN) ? cleanInput.JAM_PANGGILAN : '',
    !isPlaceholderVal(cleanInput.jam_panggilan) ? cleanInput.jam_panggilan : ''
  ) || (isSpglDoc ? '09:00' : '');
  const cleanJamPolriPgl = formatJamPolri(rawJamPanggilanSource);
  const jamPanggilanFormatted = cleanJamPolriPgl
    ? (/(WITA|WIB|WIT)$/i.test(String(rawJamPanggilanSource).trim())
        ? `${cleanJamPolriPgl} ${String(rawJamPanggilanSource).trim().match(/(WITA|WIB|WIT)$/i)[1].toUpperCase()}`
        : `${cleanJamPolriPgl} WITA`)
    : '';

  const isOldLongRoomDefault = (v) => /ruangan Unit I Pidum Satreskrim Polres Kolaka Timur Jln\./i.test(String(v || ''));
  const tempatPanggilan = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TEMPAT_PANGGILAN) && !isOldLongRoomDefault(cleanInput.TEMPAT_PANGGILAN) ? cleanInput.TEMPAT_PANGGILAN : '',
    !isPlaceholderVal(cleanInput.tempat_panggilan) && !isOldLongRoomDefault(cleanInput.tempat_panggilan) ? cleanInput.tempat_panggilan : ''
  ) || (isSpglDoc ? 'Ruang Unit Idik Satreskrim' : '');

  // Resolusi Penyidik Pemanggil ({MENEMUI_SIAPA}) & Kontak ({NO_HP} / {HP_PENYIDIK}) dari Direktori Personel
  const combinedPersonnelPool = [
    ...(Array.isArray(personnelListArg) ? personnelListArg : []),
    ...(Array.isArray(activeCase?.investigators) ? activeCase.investigators : []),
    ...(Array.isArray(activeCase?.references?.investigators) ? activeCase.references.investigators : [])
  ].filter(p => p && (p.nama || p.full_name));

  const getOfficerPhone = (p) => {
    if (!p || typeof p !== 'object') return '';
    return pickNonEmpty(p.phone, p.no_hp, p.no_telepon, p.telepon, p.whatsapp, p.hp, p.kontak);
  };
  const stripLeadingRankFromName = (rawName = '') => {
    return String(rawName || '')
      .replace(/^(JENDERAL POLISI|JENDERAL POL|KOMJEN POL|IRJEN POL|BRIGJEN POL|KOMBES POL|AKBP|KOMPOL|AKP|IPTU|IPDA|AIPTU|AIPDA|BRIPKA|BRIGPOL|BRIGADIR|BRIPTU|BRIPDA|BHARAKA|BHARATU|BHARADA)\s+/i, '')
      .trim();
  };
  const formatOfficerCallLabel = (p) => {
    if (!p || typeof p !== 'object') return '';
    const pkt = formatPangkatSingkat(p.pangkat || p.rank || '');
    const cleanNm = stripLeadingRankFromName(p.nama || p.full_name || '');
    if (!cleanNm) return '';
    return pkt ? `${pkt} ${cleanNm}` : cleanNm;
  };

  const selectedPemanggilId = pickNonEmpty(cleanInput.SELECTED_PEMANGGIL_ID, cleanInput.selected_pemanggil_id);
  let matchedPemanggilOfficer = null;
  if (selectedPemanggilId) {
    matchedPemanggilOfficer = combinedPersonnelPool.find(p =>
      String(p.id || '') === selectedPemanggilId ||
      String(p.user_id || '') === selectedPemanggilId ||
      String(p.nrp || '') === selectedPemanggilId
    ) || null;
  }
  const rawMenemuiInput = pickNonEmpty(
    !isPlaceholderVal(cleanInput.MENEMUI_SIAPA) ? cleanInput.MENEMUI_SIAPA : '',
    !isPlaceholderVal(cleanInput.menemui_siapa) ? cleanInput.menemui_siapa : ''
  );
  if (!matchedPemanggilOfficer && rawMenemuiInput) {
    const cleanInputNm = stripLeadingRankFromName(rawMenemuiInput).toLowerCase();
    matchedPemanggilOfficer = combinedPersonnelPool.find(p =>
      stripLeadingRankFromName(p.nama || p.full_name || '').toLowerCase() === cleanInputNm
    ) || null;
  }
  if (!matchedPemanggilOfficer && isSpglDoc) {
    const defaultCasePenangan = getPenyidikPenangan(activeCase);
    if (defaultCasePenangan?.nama) {
      const cleanPenNm = stripLeadingRankFromName(defaultCasePenangan.nama).toLowerCase();
      matchedPemanggilOfficer = combinedPersonnelPool.find(p =>
        (defaultCasePenangan.nrp && String(p.nrp) === String(defaultCasePenangan.nrp)) ||
        stripLeadingRankFromName(p.nama || p.full_name || '').toLowerCase() === cleanPenNm
      ) || defaultCasePenangan;
    } else if (combinedPersonnelPool.length > 0) {
      matchedPemanggilOfficer = combinedPersonnelPool[0];
    }
  }

  const normalizeMenemuiText = (rawText) => {
    const str = String(rawText || '').trim();
    if (!str) return '';
    for (const [fullRank, abbrRank] of Object.entries(MAP_PANGKAT_SINGKAT)) {
      if (str.toUpperCase().startsWith(fullRank + ' ')) {
        return `${abbrRank} ${str.slice(fullRank.length).trim()}`;
      }
    }
    return str;
  };

  const menemuiSiapa = matchedPemanggilOfficer
    ? (rawMenemuiInput && !selectedPemanggilId ? normalizeMenemuiText(rawMenemuiInput) : formatOfficerCallLabel(matchedPemanggilOfficer))
    : normalizeMenemuiText(rawMenemuiInput);

  const noHpPenyidikPemanggil = pickNonEmpty(
    !isPlaceholderVal(cleanInput.NO_HP_PENYIDIK) ? cleanInput.NO_HP_PENYIDIK : '',
    !isPlaceholderVal(cleanInput.HP_PENYIDIK) ? cleanInput.HP_PENYIDIK : '',
    !isPlaceholderVal(cleanInput.TELEPON_PENYIDIK) ? cleanInput.TELEPON_PENYIDIK : '',
    !isPlaceholderVal(cleanInput.NO_HP) ? cleanInput.NO_HP : '',
    !isPlaceholderVal(cleanInput.no_hp) ? cleanInput.no_hp : '',
    getOfficerPhone(matchedPemanggilOfficer)
  );

  // D. UNSUR YURIDIS & PERKARA
  const dasarPasalUu = cleanInput.DASAR_PASAL_UU || cleanInput.dasar_pasal_uu || activeCase?.dasar_pasal_uu || activeCase?.pasal_uu || '';
  const pasal = cleanInput.PASAL || cleanInput.pasal || activeCase?.pasal || '';
  const tindakPidana = cleanInput.TINDAK_PIDANA || cleanInput.tindak_pidana || activeCase?.tindak_pidana || '';
  const tempatKejadian = cleanInput.TEMPAT_KEJADIAN || cleanInput.tempat_kejadian || activeCase?.locus || '';
  const waktuKejadian = cleanInput.WAKTU_KEJADIAN || cleanInput.waktu_kejadian || activeCase?.tempus || '';
  const statusKasus = cleanInput.STATUS_KASUS || cleanInput.status_kasus || activeCase?.status_kasus || activeCase?.status || 'PENYIDIKAN';

  // E. IDENTITAS PIHAK
  const namaPelapor = cleanInput.NAMA_PELAPOR || cleanInput.nama_pelapor || activeCase?.nama_pelapor || activeCase?.pelapor_name || '';
  const resolvedFallbackTerlaporInit = resolveCaseTerlaporFallback(
    Array.isArray(suspectsList) && suspectsList.length > 0 ? suspectsList : (activeSuspect ? [activeSuspect] : []),
    activeCase,
    activeCase?.references || {}
  );
  const resolvedSelectedInit = (() => {
    const rawSel = selectedSubjectsArg.length > 0
      ? selectedSubjectsArg
      : (Array.isArray(cleanInput.__SELECTED_SUBJECTS__) && cleanInput.__SELECTED_SUBJECTS__.length > 0
          ? cleanInput.__SELECTED_SUBJECTS__
          : (Array.isArray(formValues?.__SELECTED_SUBJECTS__) ? formValues.__SELECTED_SUBJECTS__ : []));
    return deduplicateSubjectRecords(rawSel, 'Subjek');
  })();
  const initialTerlaporList = resolvedSelectedInit.length > 0 ? resolvedSelectedInit : resolvedFallbackTerlaporInit;
  // NAMA_TERLAPOR bersumber strictly dari selectedSubjects atau daftar terlapor perkara (tidak pernah dari pelapor/penyidik/dummy)
  const namaTerlapor = initialTerlaporList[0]?.nama || '';
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

  // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA (Pangkat Singkat Baku & Jabatan Otomatis Berbasis Pangkat)
  const penyidikNama = cleanInput.PENYIDIK_NAMA || cleanInput.penyidik_nama || activeCase?.penyidik_1_nama || '';
  const matchedPenyidikDir = findPersonnelRecordMatch(
    { nama: penyidikNama, nrp: cleanInput.PENYIDIK_NRP || cleanInput.penyidik_nrp || activeCase?.penyidik_1_nrp },
    combinedPersonnelPool
  );
  const penyidikPangkatRaw = cleanInput.PENYIDIK_PANGKAT || cleanInput.penyidik_pangkat || activeCase?.penyidik_1_pangkat || activeCase?.penyidik_pangkat || matchedPenyidikDir?.pangkat || '';
  const penyidikPangkat = (toPangkatSingkat(penyidikPangkatRaw) || penyidikPangkatRaw).trim();
  const penyidikNrp = cleanInput.PENYIDIK_NRP || cleanInput.penyidik_nrp || activeCase?.penyidik_1_nrp || activeCase?.penyidik_nrp || matchedPenyidikDir?.nrp || '';
  const penyidikJabatanFallback = cleanInput.PENYIDIK_JABATAN || cleanInput.penyidik_jabatan || activeCase?.penyidik_1_jabatan || activeCase?.penyidik_jabatan || matchedPenyidikDir?.jabatan || '';
  const penyidikJabatanPair = resolveJabatanPenyidikPair(penyidikPangkat || penyidikPangkatRaw, penyidikJabatanFallback);
  const penyidikJabatan = penyidikJabatanPair.titleCase;
  const penyidikJabatanUpper = penyidikJabatanPair.upperCase;

  // Penyidik Penangan Perkara (Bukti Penyerahan Surat - Pangkat Singkat Baku, Jabatan Berbasis Pangkat, & Auto-Fill No. HP)
  const penanganCase = getPenyidikPenangan(activeCase);
  const penanganNama = cleanInput.PENYIDIK_PENANGAN_NAMA || cleanInput.penyidik_penangan_nama || penanganCase?.nama || activeCase?.penyidik_1_nama || penyidikNama || '';
  const matchedPenanganDir = findPersonnelRecordMatch(
    {
      id: penanganCase?.id || penanganCase?.user_id,
      nrp: cleanInput.PENYIDIK_PENANGAN_NRP || cleanInput.penyidik_penangan_nrp || penanganCase?.nrp || activeCase?.penyidik_1_nrp || penyidikNrp,
      nama: penanganNama
    },
    combinedPersonnelPool
  );
  const penanganPangkatRaw = cleanInput.PENYIDIK_PENANGAN_PANGKAT || cleanInput.penyidik_penangan_pangkat || penanganCase?.pangkat || matchedPenanganDir?.pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRaw || penyidikPangkat || '';
  const penanganPangkat = (toPangkatSingkat(penanganPangkatRaw) || penanganPangkatRaw).trim();
  const penanganNrp = cleanInput.PENYIDIK_PENANGAN_NRP || cleanInput.penyidik_penangan_nrp || penanganCase?.nrp || matchedPenanganDir?.nrp || activeCase?.penyidik_1_nrp || penyidikNrp || '';
  const penanganJabatanFallback = cleanInput.PENYIDIK_PENANGAN_JABATAN || cleanInput.penyidik_penangan_jabatan || penanganCase?.jabatan || matchedPenanganDir?.jabatan || activeCase?.penyidik_1_jabatan || penyidikJabatanFallback || 'Penyidik';
  const penanganJabatanPair = resolveJabatanPenyidikPair(penanganPangkat || penanganPangkatRaw, penanganJabatanFallback);
  const penanganJabatan = penanganJabatanPair.titleCase;
  const penanganJabatanUpper = penanganJabatanPair.upperCase;
  const penanganPangkatNrp = penanganPangkat && penanganNrp ? `${penanganPangkat} / ${penanganNrp}` : (penanganPangkat || penanganNrp || '');
  const penanganNoHp = pickNonEmpty(
    !isPlaceholderVal(cleanInput.PENYIDIK_PENANGAN_NO_HP) ? cleanInput.PENYIDIK_PENANGAN_NO_HP : '',
    !isPlaceholderVal(cleanInput.NO_HP_PENYIDIK_PENANGAN) ? cleanInput.NO_HP_PENYIDIK_PENANGAN : '',
    !isPlaceholderVal(cleanInput.PENYIDIK_PENANGAN_HP) ? cleanInput.PENYIDIK_PENANGAN_HP : '',
    extractOfficerPhoneNumber(penanganCase, combinedPersonnelPool),
    extractOfficerPhoneNumber(matchedPenanganDir, combinedPersonnelPool),
    extractOfficerPhoneNumber({ nama: penanganNama, nrp: penanganNrp }, combinedPersonnelPool)
  );

  // Jabatan Penyidik Pemanggil pada Surat Panggilan ({JABATAN_PEMANGGIL}, {JABATAN_PEMANGGIL_UPPER}, {MENEMUI_JABATAN})
  const pemanggilRankSource =
    matchedPemanggilOfficer?.pangkat ||
    matchedPemanggilOfficer?.rank ||
    extractLeadingPangkatFromLabel(menemuiSiapa) ||
    penanganPangkat ||
    penyidikPangkat ||
    '';
  const pemanggilJabatanPair = resolveJabatanPenyidikPair(
    pemanggilRankSource,
    matchedPemanggilOfficer?.jabatan || cleanInput.JABATAN_PEMANGGIL || penanganJabatan
  );
  const jabatanPemanggil = pemanggilJabatanPair.titleCase;
  const jabatanPemanggilUpper = pemanggilJabatanPair.upperCase;

  // Fallback {NO_HP} ke nomor HP penyidikPenangan apabila belum terisi dari dropdown pemanggil
  const effectiveNoHpKoordinasi = noHpPenyidikPemanggil || penanganNoHp || '';

  // Daftar Tim Penerima Perintah (Untuk Badan Surat Perintah Personel 1 s.d. 5 — Jabatan Mengikuti Aturan Pangkat UPPERCASE)
  const penyidik1Nama = cleanInput.PENYIDIK_1_NAMA || cleanInput.penyidik_1_nama || activeCase?.penyidik_1_nama || penyidikNama || '';
  const penyidik1PangkatRaw = cleanInput.PENYIDIK_1_PANGKAT || cleanInput.penyidik_1_pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRaw || '';
  const penyidik1PangkatSingkat = toPangkatSingkat(penyidik1PangkatRaw);
  const penyidik1Pangkat = penyidik1PangkatSingkat; // WAJIB Pangkat Singkat untuk Personel 1 di Batang Tubuh / Bagian "DIPERINTAHKAN Kepada"
  const penyidik1Nrp = cleanInput.PENYIDIK_1_NRP || cleanInput.penyidik_1_nrp || activeCase?.penyidik_1_nrp || penyidikNrp || '';
  const penyidik1Jabatan = penyidik1Nama
    ? resolveJabatanPenyidikPair(penyidik1PangkatSingkat, cleanInput.PENYIDIK_1_JABATAN || activeCase?.penyidik_1_jabatan || penyidikJabatanFallback).upperCase
    : '';

  const penyidik2Nama = cleanInput.PENYIDIK_2_NAMA || cleanInput.penyidik_2_nama || activeCase?.penyidik_2_nama || '';
  const penyidik2PangkatRaw = cleanInput.PENYIDIK_2_PANGKAT || cleanInput.penyidik_2_pangkat || activeCase?.penyidik_2_pangkat || '';
  const penyidik2PangkatSingkat = toPangkatSingkat(penyidik2PangkatRaw);
  const penyidik2Pangkat = penyidik2PangkatSingkat;
  const penyidik2Nrp = cleanInput.PENYIDIK_2_NRP || cleanInput.penyidik_2_nrp || activeCase?.penyidik_2_nrp || '';
  const penyidik2Jabatan = penyidik2Nama
    ? resolveJabatanPenyidikPair(penyidik2PangkatSingkat, cleanInput.PENYIDIK_2_JABATAN || activeCase?.penyidik_2_jabatan || 'Penyidik Pembantu').upperCase
    : '';

  const penyidik3Nama = cleanInput.PENYIDIK_3_NAMA || cleanInput.penyidik_3_nama || activeCase?.penyidik_3_nama || '';
  const penyidik3PangkatRaw = cleanInput.PENYIDIK_3_PANGKAT || cleanInput.penyidik_3_pangkat || activeCase?.penyidik_3_pangkat || '';
  const penyidik3PangkatSingkat = toPangkatSingkat(penyidik3PangkatRaw);
  const penyidik3Pangkat = penyidik3PangkatSingkat;
  const penyidik3Nrp = cleanInput.PENYIDIK_3_NRP || cleanInput.penyidik_3_nrp || activeCase?.penyidik_3_nrp || '';
  const penyidik3Jabatan = penyidik3Nama
    ? resolveJabatanPenyidikPair(penyidik3PangkatSingkat, cleanInput.PENYIDIK_3_JABATAN || activeCase?.penyidik_3_jabatan || 'Penyidik Pembantu').upperCase
    : '';

  const penyidik4Nama = cleanInput.PENYIDIK_4_NAMA || cleanInput.penyidik_4_nama || activeCase?.penyidik_4_nama || '';
  const penyidik4PangkatRaw = cleanInput.PENYIDIK_4_PANGKAT || cleanInput.penyidik_4_pangkat || activeCase?.penyidik_4_pangkat || '';
  const penyidik4PangkatSingkat = toPangkatSingkat(penyidik4PangkatRaw);
  const penyidik4Pangkat = penyidik4PangkatSingkat;
  const penyidik4Nrp = cleanInput.PENYIDIK_4_NRP || cleanInput.penyidik_4_nrp || activeCase?.penyidik_4_nrp || '';
  const penyidik4Jabatan = penyidik4Nama
    ? resolveJabatanPenyidikPair(penyidik4PangkatSingkat, cleanInput.PENYIDIK_4_JABATAN || activeCase?.penyidik_4_jabatan || 'Penyidik Pembantu').upperCase
    : '';

  const penyidik5Nama = cleanInput.PENYIDIK_5_NAMA || cleanInput.penyidik_5_nama || activeCase?.penyidik_5_nama || '';
  const penyidik5PangkatRaw = cleanInput.PENYIDIK_5_PANGKAT || cleanInput.penyidik_5_pangkat || activeCase?.penyidik_5_pangkat || '';
  const penyidik5PangkatSingkat = toPangkatSingkat(penyidik5PangkatRaw);
  const penyidik5Pangkat = penyidik5PangkatSingkat;
  const penyidik5Nrp = cleanInput.PENYIDIK_5_NRP || cleanInput.penyidik_5_nrp || activeCase?.penyidik_5_nrp || '';
  const penyidik5Jabatan = penyidik5Nama
    ? resolveJabatanPenyidikPair(penyidik5PangkatSingkat, cleanInput.PENYIDIK_5_JABATAN || activeCase?.penyidik_5_jabatan || 'Penyidik Pembantu').upperCase
    : '';

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
    MASA_BERLAKU_KAP: masaBerlaku,
    masa_berlaku_kap: masaBerlaku,
    SPRIN_MASA_BERLAKU: masaBerlaku,
    sprin_masa_berlaku: masaBerlaku,
    SPRIN_MASA_BERLAKU_KAP: masaBerlaku,
    sprin_masa_berlaku_kap: masaBerlaku,
    TANGGAL_BERLAKU: masaBerlaku,
    tanggal_berlaku: masaBerlaku,

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
    NO_SPRIN_HAN: effectiveNoSprinHan,
    TGL_SPRIN_HAN: effectiveTglSprinHan,
    NO_PANJANG_HAN_KN: effectivePanjangHanKn,
    TGL_PANJANG_HAN_KN: effectiveTglSprinHanKn,
    PANJANG_HAN_KN: effectivePanjangHanKn,
    panjang_han_kn: effectivePanjangHanKn,
    NO_SPRIN_HAN_KN: effectiveNoSprinHanKn,
    no_sprin_han_kn: effectiveNoSprinHanKn,
    TGL_SPRIN_HAN_KN: effectiveTglSprinHanKn,
    tgl_sprin_han_kn: effectiveTglSprinHanKn,
    TANGGAL_SPRIN_HAN_KN: effectiveTglSprinHanKn,
    tanggal_sprin_han_kn: effectiveTglSprinHanKn,
    NO_SPRIN_HAN_PN_1: effectiveNoSprinHanPn1,
    no_sprin_han_pn_1: effectiveNoSprinHanPn1,
    NO_SPRIN_HAN_PN1: effectiveNoSprinHanPn1,
    no_sprin_han_pn1: effectiveNoSprinHanPn1,
    TGL_SPRIN_HAN_PN_1: effectiveTglSprinHanPn1,
    tgl_sprin_han_pn_1: effectiveTglSprinHanPn1,
    TANGGAL_SPRIN_HAN_PN_1: effectiveTglSprinHanPn1,
    tanggal_sprin_han_pn_1: effectiveTglSprinHanPn1,
    TGL_SPRIN_HAN_PN1: effectiveTglSprinHanPn1,
    tgl_sprin_han_pn1: effectiveTglSprinHanPn1,
    NO_TAP_HAN_PN_1: effectiveTapHanPn1,
    TGL_TAP_HAN_PN_1: effectiveTglSprinHanPn1,
    TAP_HAN_PN_1: effectiveTapHanPn1,
    tap_han_pn_1: effectiveTapHanPn1,
    NO_SPRIN_HAN_PN_2: effectiveNoSprinHanPn2,
    no_sprin_han_pn_2: effectiveNoSprinHanPn2,
    NO_SPRIN_HAN_PN2: effectiveNoSprinHanPn2,
    no_sprin_han_pn2: effectiveNoSprinHanPn2,
    TGL_SPRIN_HAN_PN_2: effectiveTglSprinHanPn2,
    tgl_sprin_han_pn_2: effectiveTglSprinHanPn2,
    TANGGAL_SPRIN_HAN_PN_2: effectiveTglSprinHanPn2,
    tanggal_sprin_han_pn_2: effectiveTglSprinHanPn2,
    TGL_SPRIN_HAN_PN2: effectiveTglSprinHanPn2,
    tgl_sprin_han_pn2: effectiveTglSprinHanPn2,
    NO_TAP_HAN_PN_2: effectiveTapHanPn2,
    TGL_TAP_HAN_PN_2: effectiveTglSprinHanPn2,
    TAP_HAN_PN_2: effectiveTapHanPn2,
    tap_han_pn_2: effectiveTapHanPn2,

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
    TERBILANG_TAHUN_BA_KAP: terbilangTahunKap,
    terbilang_tahun_ba_kap: terbilangTahunKap,
    TAHUN_KAP_TERBILANG: terbilangTahunKap,
    tahun_kap_terbilang: terbilangTahunKap,
    JAM_KAP: jamKap,
    jam_kap: jamKap,
    WAKTU_KAP: waktuKap,
    waktu_kap: waktuKap,
    TEMPAT_KAP: tempatKap,
    tempat_kap: tempatKap,
    TGL_KAP: tglKap,
    tgl_kap: tglKap,
    TANGGAL_LENGKAP_KAP: tglLengkapKap,
    tanggal_lengkap_kap: tglLengkapKap,

    // C.2. TAG SPRIN PENAHANAN & PERPANJANGAN PENAHANAN INKLUSIF BERANTAI
    MULAI_DITAHAN: tglMulaiHanFormatted,
    mulai_ditahan: tglMulaiHanFormatted,
    TANGGAL_MULAI_DITAHAN: tglMulaiHanFormatted,
    tanggal_mulai_ditahan: tglMulaiHanFormatted,
    TANGGAL_MULAI_HAN: tglMulaiHanFormatted,
    tanggal_mulai_han: tglMulaiHanFormatted,
    TGL_MULAI_HAN: tglMulaiHanFormatted,
    tgl_mulai_han: tglMulaiHanFormatted,
    SPRIN_MULAI_DITAHAN: tglMulaiHanFormatted,
    sprin_mulai_ditahan: tglMulaiHanFormatted,
    MULAI_PERPANJANGAN: tglMulaiHanFormatted,
    mulai_perpanjangan: tglMulaiHanFormatted,
    AKHIR_DITAHAN: tglAkhirHanFormatted,
    akhir_ditahan: tglAkhirHanFormatted,
    TANGGAL_AKHIR_DITAHAN: tglAkhirHanFormatted,
    tanggal_akhir_ditahan: tglAkhirHanFormatted,
    TANGGAL_AKHIR_HAN: tglAkhirHanFormatted,
    tanggal_akhir_han: tglAkhirHanFormatted,
    TGL_AKHIR_HAN: tglAkhirHanFormatted,
    tgl_akhir_han: tglAkhirHanFormatted,
    SPRIN_AKHIR_DITAHAN: tglAkhirHanFormatted,
    sprin_akhir_ditahan: tglAkhirHanFormatted,
    AKHIR_PERPANJANGAN: tglAkhirHanFormatted,
    akhir_perpanjangan: tglAkhirHanFormatted,
    LAMA_PENAHANAN: lamaPenahananText,
    lama_penahanan: lamaPenahananText,
    MASA_PENAHANAN: lamaPenahananText,
    masa_penahanan: lamaPenahananText,
    TANGGAL_AKHIR_HAN_PENYIDIK: tglAkhirHanPenyidikFormatted || tglAkhirHanFormatted,
    tanggal_akhir_han_penyidik: tglAkhirHanPenyidikFormatted || tglAkhirHanFormatted,
    TGL_AKHIR_HAN_PENYIDIK: tglAkhirHanPenyidikFormatted || tglAkhirHanFormatted,
    tgl_akhir_han_penyidik: tglAkhirHanPenyidikFormatted || tglAkhirHanFormatted,
    TGL_MULAI_JANG_HAN_PU: tglMulaiJangHanPuFormatted || tglMulaiHanFormatted,
    tgl_mulai_jang_han_pu: tglMulaiJangHanPuFormatted || tglMulaiHanFormatted,
    TANGGAL_MULAI_JANG_HAN_PU: tglMulaiJangHanPuFormatted || tglMulaiHanFormatted,
    tanggal_mulai_jang_han_pu: tglMulaiJangHanPuFormatted || tglMulaiHanFormatted,
    TGL_AKHIR_HAN_PU: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    tgl_akhir_han_pu: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    TGL_AKHIR_JANG_HAN_PU: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    tgl_akhir_jang_han_pu: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    TANGGAL_AKHIR_HAN_PU: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    tanggal_akhir_han_pu: tglAkhirHanPuFormatted || tglAkhirHanFormatted,
    TGL_MULAI_JANG_HAN_PN1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    tgl_mulai_jang_han_pn1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    TGL_MULAI_JANG_HAN_PN_1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    tgl_mulai_jang_han_pn_1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    TANGGAL_MULAI_JANG_HAN_PN1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    tanggal_mulai_jang_han_pn1: tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted,
    TGL_AKHIR_HAN_PN1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    tgl_akhir_han_pn1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    TGL_AKHIR_HAN_PN_1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    tgl_akhir_han_pn_1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    TGL_AKHIR_JANG_HAN_PN1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    tgl_akhir_jang_han_pn1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    TANGGAL_AKHIR_HAN_PN1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    tanggal_akhir_han_pn1: tglAkhirHanPn1Formatted || tglAkhirHanFormatted,
    TGL_MULAI_JANG_HAN_PN2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    tgl_mulai_jang_han_pn2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    TGL_MULAI_JANG_HAN_PN_2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    tgl_mulai_jang_han_pn_2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    TANGGAL_MULAI_JANG_HAN_PN2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    tanggal_mulai_jang_han_pn2: tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted,
    TGL_AKHIR_HAN_PN2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    tgl_akhir_han_pn2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    TGL_AKHIR_HAN_PN_2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    tgl_akhir_han_pn_2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    TGL_AKHIR_JANG_HAN_PN2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    tgl_akhir_jang_han_pn2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    TANGGAL_AKHIR_HAN_PN2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    tanggal_akhir_han_pn2: tglAkhirHanPn2Formatted || tglAkhirHanFormatted,
    TEMPAT_HAN: tempatHan,
    tempat_han: tempatHan,
    TEMPAT_PENAHANAN: tempatHan,
    tempat_penahanan: tempatHan,
    TEMPAT_RUTAN_HAN: tempatHan,
    tempat_rutan_han: tempatHan,
    NO_SPGL_TSK: noSpglTsk,
    no_spgl_tsk: noSpglTsk,
    NOMOR_SPGL_TSK: noSpglTsk,
    nomor_spgl_tsk: noSpglTsk,
    TGL_SPGL_TSK: tglSpglTsk,
    tgl_spgl_tsk: tglSpglTsk,
    TANGGAL_SPGL_TSK: tglSpglTsk,
    tanggal_spgl_tsk: tglSpglTsk,

    // C.3. TAG BA PENAHANAN (BA_HAN, SPRIN_HAN_DAN_BA, & SPRIN_PANJANG_HAN_*_DAN_BA)
    HARI_HAN: hariHan,
    hari_han: hariHan,
    HARI_BA_HAN: hariHan,
    hari_ba_han: hariHan,
    TANGGAL_HAN: tglHan,
    tanggal_han: tglHan,
    TANGGAL_BA_HAN: tglHan,
    tanggal_ba_han: tglHan,
    BULAN_HAN: bulanHan,
    bulan_han: bulanHan,
    BULAN_BA_HAN: bulanHan,
    bulan_ba_han: bulanHan,
    TAHUN_HAN: tahunHan,
    tahun_han: tahunHan,
    TAHUN_BA_HAN: tahunHan,
    tahun_ba_han: tahunHan,
    TERBILANG_TAHUN_HAN: terbilangTahunHan,
    terbilang_tahun_han: terbilangTahunHan,
    TERBILANG_TAHUN_BA_HAN: terbilangTahunHan,
    terbilang_tahun_ba_han: terbilangTahunHan,
    TAHUN_HAN_TERBILANG: terbilangTahunHan,
    tahun_han_terbilang: terbilangTahunHan,
    TAHUN_BA_HAN_TERBILANG: terbilangTahunHan,
    tahun_ba_han_terbilang: terbilangTahunHan,
    JAM_HAN: jamHan,
    jam_han: jamHan,
    JAM_BA_HAN: jamHan,
    jam_ba_han: jamHan,
    WAKTU_HAN: waktuHan,
    waktu_han: waktuHan,
    WAKTU_PENAHANAN: waktuHan,
    waktu_penahanan: waktuHan,
    TGL_HAN: tglHan,
    tgl_han: tglHan,
    TANGGAL_LENGKAP_HAN: tglLengkapHan,
    tanggal_lengkap_han: tglLengkapHan,

    // C.4. TAG SURAT PANGGILAN TERSANGKA & SAKSI (SPGL_TSK_1/2 & SPGL_SAKSI_1/2)
    HARI_PANGGILAN: hariPanggilan,
    hari_panggilan: hariPanggilan,
    TANGGAL_PANGGILAN: tanggalPanggilanFormatted,
    tanggal_panggilan: tanggalPanggilanFormatted,
    TGL_PANGGILAN: tanggalPanggilanFormatted,
    tgl_panggilan: tanggalPanggilanFormatted,
    JAM_PANGGILAN: jamPanggilanFormatted,
    jam_panggilan: jamPanggilanFormatted,
    TEMPAT_PANGGILAN: tempatPanggilan,
    tempat_panggilan: tempatPanggilan,
    MENEMUI_SIAPA: menemuiSiapa,
    menemui_siapa: menemuiSiapa,
    JABATAN_PEMANGGIL: jabatanPemanggil,
    jabatan_pemanggil: jabatanPemanggil,
    JABATAN_PEMANGGIL_UPPER: jabatanPemanggilUpper,
    jabatan_pemanggil_upper: jabatanPemanggilUpper,
    MENEMUI_JABATAN: jabatanPemanggil,
    menemui_jabatan: jabatanPemanggil,
    NO_HP_PENYIDIK: effectiveNoHpKoordinasi,
    no_hp_penyidik: effectiveNoHpKoordinasi,
    HP_PENYIDIK: effectiveNoHpKoordinasi,
    hp_penyidik: effectiveNoHpKoordinasi,
    TELEPON_PENYIDIK: effectiveNoHpKoordinasi,
    telepon_penyidik: effectiveNoHpKoordinasi,
    ...(effectiveNoHpKoordinasi ? {
      NO_HP: effectiveNoHpKoordinasi,
      no_hp: effectiveNoHpKoordinasi
    } : {}),

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

    // Tanda Tangan Kanit / Yang Menerima Perintah / Pemeriksa BA (Pangkat Singkat & Jabatan Berbasis Pangkat)
    PENYIDIK_NAMA: penyidikNama,
    PENYIDIK_PANGKAT: penyidikPangkat,
    PENYIDIK_NRP: penyidikNrp,
    PENYIDIK_JABATAN: penyidikJabatan,
    PENYIDIK_JABATAN_UPPER: penyidikJabatanUpper,
    penyidik_jabatan_upper: penyidikJabatanUpper,
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

    // Penyidik Penangan Perkara (Bukti Penyerahan Surat - Pangkat Singkat, Jabatan Berbasis Pangkat, & No. HP)
    PENYIDIK_PENANGAN_NAMA: penanganNama,
    PENYIDIK_PENANGAN_PANGKAT: penanganPangkat,
    PENYIDIK_PENANGAN_NRP: penanganNrp,
    PENYIDIK_PENANGAN_JABATAN: penanganJabatan,
    PENYIDIK_PENANGAN_JABATAN_UPPER: penanganJabatanUpper,
    penyidik_penangan_jabatan_upper: penanganJabatanUpper,
    PENYIDIK_PENANGAN_PANGKAT_NRP: penanganPangkatNrp,
    PENYIDIK_PENANGAN_NO_HP: penanganNoHp,
    penyidik_penangan_no_hp: penanganNoHp,
    NO_HP_PENYIDIK_PENANGAN: penanganNoHp,
    no_hp_penyidik_penangan: penanganNoHp,
    PENYIDIK_PENANGAN_HP: penanganNoHp,
    penyidik_penangan_hp: penanganNoHp,

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
    tersangka_list: (() => {
      const rawTskArr = deduplicateSubjectRecords(
        [
          ...(Array.isArray(suspectsList) && suspectsList.length > 0 ? suspectsList : (activeSuspect ? [activeSuspect] : []))
            .filter((s) => s && (s.status === 'tersangka' || !s.status)),
          ...(Array.isArray(activeCase?.tersangka_list) ? activeCase.tersangka_list : []),
          ...(Array.isArray(activeCase?.references?.tersangka_list) ? activeCase.references.tersangka_list : [])
        ],
        'Tersangka'
      );
      const tapRes = resolvePerSuspectDocuments(rawTskArr, archivedDocs, 'TAP_TSK');
      const kapRes = resolvePerSuspectDocuments(rawTskArr, archivedDocs, 'SPRIN_KAP');
      const hanRes = resolvePerSuspectDocuments(rawTskArr, archivedDocs, 'SPRIN_HAN');
      return rawTskArr.map((s, idx) => {
        const sTglLahir = s.tgl_lahir || s.tanggal_lahir || '';
        const formattedSTglLahir = formatTanggalIndonesia(sTglLahir);
        const sTapNo = tapRes[idx]?.docNo || '';
        const sTapTgl = tapRes[idx]?.formattedDocDate || '';
        const sKapNo = kapRes[idx]?.docNo || '';
        const sKapTgl = kapRes[idx]?.formattedDocDate || '';
        const sHanNo = hanRes[idx]?.docNo || '';
        const sHanTgl = hanRes[idx]?.formattedDocDate || '';
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
          nomor_sp_tap: sTapNo,
          no_sp_tap_tsk: sTapNo,
          nomor_sp_tap_tsk: sTapNo,
          tanggal_sp_tap: sTapTgl,
          tgl_sp_tap: sTapTgl,
          tgl_sp_tap_tsk: sTapTgl,
          no_sprin_kap: sKapNo,
          tgl_sprin_kap: sKapTgl,
          no_sprin_han: sHanNo,
          tgl_sprin_han: sHanTgl
        };
      });
    })(),

    terlapor_list: (() => {
      const combined = resolveCaseTerlaporFallback(suspectsList, activeCase, activeCase?.references || {});
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

  baseMap.TERSANGKA = baseMap.tersangka_list;
  baseMap.tersangka = baseMap.tersangka_list;
  baseMap.TERSANGKA_LIST = baseMap.tersangka_list;

  // PISAHKAN DAFTAR SUBJEK UNTUK TAG INDIVIDUAL TSK_1..5 DAN TERLAPOR_1..5
  const isTerlaporDoc = canonicalTplCode === 'SPDP_TERLAPOR' ||
    tplCode.includes('TERLAPOR') ||
    tplName.includes('terlapor');

  const allSubjek = Array.isArray(suspectsList) && suspectsList.length > 0 
    ? suspectsList 
    : (activeSuspect ? [activeSuspect] : []);

  const allKnownSubjectsPool = [
    ...allSubjek,
    ...(Array.isArray(activeCase?.tersangka_list) ? activeCase.tersangka_list : []),
    ...(Array.isArray(activeCase?.references?.tersangka_list) ? activeCase.references.tersangka_list : []),
    ...(Array.isArray(activeCase?.terlapor_list) ? activeCase.terlapor_list : []),
    ...(Array.isArray(activeCase?.references?.terlapor_list) ? activeCase.references.terlapor_list : []),
    ...(Array.isArray(activeCase?.saksi_list) ? activeCase.saksi_list : []),
    ...(Array.isArray(activeCase?.references?.saksi_list) ? activeCase.references.saksi_list : []),
    ...(Array.isArray(activeCase?.saksi) ? activeCase.saksi : []),
    ...(Array.isArray(activeCase?.pelapor_list) ? activeCase.pelapor_list : []),
    ...(Array.isArray(activeCase?.references?.pelapor_list) ? activeCase.references.pelapor_list : []),
    ...(allSubjek.length === 0 && activeCase?.person ? [activeCase.person] : []),
    ...(allSubjek.length === 0 && namaTerlapor ? [{ nama: namaTerlapor }] : [])
  ];

  const rawSelectedFromForm = selectedSubjectsArg.length > 0
    ? selectedSubjectsArg
    : (Array.isArray(cleanInput.__SELECTED_SUBJECTS__) && cleanInput.__SELECTED_SUBJECTS__.length > 0
        ? cleanInput.__SELECTED_SUBJECTS__
        : (Array.isArray(formValues?.__SELECTED_SUBJECTS__) ? formValues.__SELECTED_SUBJECTS__ : []));

  // Daftar subjek yang dicentang manual di UI (termasuk bila status di DB sudah menjadi 'tersangka')
  const selectedSubjectsClean = deduplicateSubjectRecords(
    rawSelectedFromForm.map(item => enrichSubjectWithPool(item, allKnownSubjectsPool)),
    'Subjek'
  );

  // Fallback gabungan unik Terlapor: hanya dari caseSuspects (termasuk 'tersangka' bila 'terlapor' murni kosong) + terlapor_list + legacy fallback bila kosong
  const fallbackTerlaporClean = resolveCaseTerlaporFallback(allSubjek, activeCase, activeCase?.references || {})
    .map(item => enrichSubjectWithPool(item, allKnownSubjectsPool));
  const fallbackTerlaporDeduped = deduplicateSubjectRecords(fallbackTerlaporClean, 'Terlapor');

  // Prioritas utama: subjek terpilih di UI (__SELECTED_SUBJECTS__ / selectedSubjects), lalu fallback terlapor kasus
  const effectiveTargetTerlapor = selectedSubjectsClean.length > 0
    ? selectedSubjectsClean
    : fallbackTerlaporDeduped;

  const rawTersangkaCombined = [
    ...allSubjek.filter((s) => s && (s.status === 'tersangka' || !s.status)),
    ...(Array.isArray(activeCase?.tersangka_list) ? activeCase.tersangka_list : []),
    ...(Array.isArray(activeCase?.references?.tersangka_list) ? activeCase.references.tersangka_list : [])
  ].map(item => enrichSubjectWithPool(item, allKnownSubjectsPool));

  const tersangkaList = (isTerlaporDoc && effectiveTargetTerlapor.length > 0)
    ? effectiveTargetTerlapor
    : deduplicateSubjectRecords(rawTersangkaCombined, 'Tersangka');
  const terlaporList = effectiveTargetTerlapor;

  // Tag Mandiri Tersangka 1 s/d 6 (11 field lengkap + semua permutasi & resolusi per-tersangka + loop {#TERSANGKA} & {#DASAR_TAP_TSK})
  populateIndexedSubjectGroup(baseMap, tersangkaList, ['TSK', 'TERSANGKA'], allKnownSubjectsPool);
  const enrichedSuspectLoopItems = applyPerSuspectDocTags(baseMap, tersangkaList, archivedDocs);
  baseMap.TERSANGKA = enrichedSuspectLoopItems;
  baseMap.tersangka = enrichedSuspectLoopItems;
  baseMap.TERSANGKA_LIST = enrichedSuspectLoopItems;
  baseMap.tersangka_list = enrichedSuspectLoopItems;
  baseMap.DAFTAR_TERSANGKA = enrichedSuspectLoopItems;
  baseMap.daftar_tersangka = enrichedSuspectLoopItems;

  // Tag Mandiri Terlapor & Subjek: isi seluruh tag tunggal (NAMA_TERLAPOR, TERLAPOR_NAMA, NIK_TERLAPOR, ...)
  // identik dengan TERLAPOR_1_* serta slot berindeks 1..6 dan loop {#TERLAPOR}
  populateSubjectPrefixVariables(baseMap, 'TERLAPOR', terlaporList, terlaporList[0] || null);
  populateIndexedSubjectGroup(baseMap, terlaporList, ['TERLAPOR', 'SUBJEK'], allKnownSubjectsPool);
  baseMap.terlapor_list = baseMap.TERLAPOR || [];
  baseMap.subjek_list = baseMap.SUBJEK || [];

  // Khusus template Terlapor tunggal/jamak yang memakai tag flat TERSANGKA / NAMA_TERSANGKA..ALAMAT:
  if (isTerlaporDoc && terlaporList.length > 0) {
    const primaryTerlapor = normalizeSubjectRecord(enrichSubjectWithPool(terlaporList[0], allKnownSubjectsPool), 0, 'Terlapor');
    if (primaryTerlapor) {
      baseMap.NAMA_TERSANGKA = primaryTerlapor.nama || '';
      baseMap.nama_tersangka = primaryTerlapor.nama || '';
      baseMap.NIK = primaryTerlapor.nik || '';
      baseMap.nik = primaryTerlapor.nik || '';
      baseMap.NO_IDENTITAS = primaryTerlapor.nik || '';
      baseMap.no_identitas = primaryTerlapor.nik || '';
      baseMap.NOMOR_IDENTITAS = primaryTerlapor.nik || '';
      baseMap.nomor_identitas = primaryTerlapor.nik || '';
      baseMap.KEWARGANEGARAAN = primaryTerlapor.kewarganegaraan || 'Indonesia';
      baseMap.kewarganegaraan = primaryTerlapor.kewarganegaraan || 'Indonesia';
      baseMap.JENIS_KELAMIN = primaryTerlapor.jenis_kelamin || '';
      baseMap.jenis_kelamin = primaryTerlapor.jenis_kelamin || '';
      baseMap.JK = primaryTerlapor.jenis_kelamin || '';
      baseMap.jk = primaryTerlapor.jenis_kelamin || '';
      baseMap.TEMPAT_LAHIR = primaryTerlapor.tempat_lahir || '';
      baseMap.tempat_lahir = primaryTerlapor.tempat_lahir || '';
      baseMap.TGL_LAHIR = primaryTerlapor.tgl_lahir || '';
      baseMap.tgl_lahir = primaryTerlapor.tgl_lahir || '';
      baseMap.TTL = primaryTerlapor.ttl || '';
      baseMap.ttl = primaryTerlapor.ttl || '';
      baseMap.TEMPAT_TANGGAL_LAHIR = primaryTerlapor.ttl || '';
      baseMap.tempat_tanggal_lahir = primaryTerlapor.ttl || '';
      baseMap.UMUR = primaryTerlapor.umur || '';
      baseMap.umur = primaryTerlapor.umur || '';
      baseMap.PEKERJAAN = primaryTerlapor.pekerjaan || '';
      baseMap.pekerjaan = primaryTerlapor.pekerjaan || '';
      baseMap.PENDIDIKAN = primaryTerlapor.pendidikan || '';
      baseMap.pendidikan = primaryTerlapor.pendidikan || '';
      baseMap.PENDIDIKAN_TERAKHIR = primaryTerlapor.pendidikan || '';
      baseMap.pendidikan_terakhir = primaryTerlapor.pendidikan || '';
      baseMap.AGAMA = primaryTerlapor.agama || '';
      baseMap.agama = primaryTerlapor.agama || '';
      baseMap.STATUS_KAWIN = primaryTerlapor.status_pernikahan || '';
      baseMap.status_kawin = primaryTerlapor.status_pernikahan || '';
      baseMap.STATUS_PERNIKAHAN = primaryTerlapor.status_pernikahan || '';
      baseMap.status_pernikahan = primaryTerlapor.status_pernikahan || '';
      baseMap.STATUS_NIKAH = primaryTerlapor.status_pernikahan || '';
      baseMap.status_nikah = primaryTerlapor.status_pernikahan || '';
      baseMap.ALAMAT = primaryTerlapor.alamat || '';
      baseMap.alamat = primaryTerlapor.alamat || '';
      baseMap.TEMPAT_TINGGAL = primaryTerlapor.alamat || '';
      baseMap.tempat_tinggal = primaryTerlapor.alamat || '';
    }
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

  // 1. Pangkat Atasan & Kasat / Kapolres (Pangkat Singkat Resmi)
  const atasanPangkatRawFinal = cleanInput.ATASAN_PANGKAT || cleanInput.atasan_pangkat || activeCase?.atasan_pangkat || activeCase?.kasat_pangkat || finalPayload.ATASAN_PANGKAT || '';
  finalPayload.ATASAN_PANGKAT = (formatPangkatSingkat(atasanPangkatRawFinal) || atasanPangkatRawFinal).trim();
  finalPayload.atasan_pangkat = finalPayload.ATASAN_PANGKAT;

  const kasatPangkatRawFinal = cleanInput.KASAT_PANGKAT || cleanInput.kasat_pangkat || activeCase?.kasat_pangkat || finalPayload.KASAT_PANGKAT || finalPayload.ATASAN_PANGKAT || '';
  finalPayload.KASAT_PANGKAT = (formatPangkatSingkat(kasatPangkatRawFinal) || kasatPangkatRawFinal).trim();
  finalPayload.kasat_pangkat = finalPayload.KASAT_PANGKAT;

  if (finalPayload.KAPOLRES_PANGKAT || finalPayload.kapolres_pangkat || activeCase?.kapolres_pangkat) {
    const kapolresRaw = finalPayload.KAPOLRES_PANGKAT || finalPayload.kapolres_pangkat || activeCase?.kapolres_pangkat || '';
    finalPayload.KAPOLRES_PANGKAT = (formatPangkatSingkat(kapolresRaw) || kapolresRaw).trim();
    finalPayload.kapolres_pangkat = finalPayload.KAPOLRES_PANGKAT;
  }

  for (let i = 1; i <= 5; i++) {
    const rawPi = finalPayload[`PENYIDIK_${i}_PANGKAT`] || finalPayload[`penyidik_${i}_pangkat`] || activeCase?.[`penyidik_${i}_pangkat`] || '';
    const pktPi = (formatPangkatSingkat(rawPi) || rawPi).trim();
    finalPayload[`PENYIDIK_${i}_PANGKAT`] = pktPi;
    finalPayload[`penyidik_${i}_pangkat`] = pktPi;
    const nrpPi = finalPayload[`PENYIDIK_${i}_NRP`] || finalPayload[`penyidik_${i}_nrp`] || activeCase?.[`penyidik_${i}_nrp`] || '';
    const pktNrpPi = pktPi && nrpPi ? `${pktPi} / ${nrpPi}` : (pktPi || nrpPi || '');
    finalPayload[`PENYIDIK_${i}_PANGKAT_NRP`] = pktNrpPi;
    finalPayload[`penyidik_${i}_pangkat_nrp`] = pktNrpPi;
    const namaPi = finalPayload[`PENYIDIK_${i}_NAMA`] || finalPayload[`penyidik_${i}_nama`] || activeCase?.[`penyidik_${i}_nama`] || '';
    if (namaPi || pktPi) {
      const jabPiPair = resolveJabatanPenyidikPair(pktPi, finalPayload[`PENYIDIK_${i}_JABATAN`] || (i === 1 ? 'Penyidik' : 'Penyidik Pembantu'));
      finalPayload[`PENYIDIK_${i}_JABATAN`] = jabPiPair.upperCase;
      finalPayload[`penyidik_${i}_jabatan`] = jabPiPair.upperCase;
    }
  }

  // 2. Penyidik Penangan Perkara (Pangkat Singkat Baku, Jabatan Berbasis Pangkat, & Nomor HP untuk Bukti Penyerahan Surat)
  const penanganFinal = getPenyidikPenangan(activeCase) || activeCase?.penyidik_1 || {
    nama: finalPayload.PENYIDIK_1_NAMA || finalPayload.PENYIDIK_NAMA || '',
    pangkat: finalPayload.PENYIDIK_1_PANGKAT || finalPayload.PENYIDIK_PANGKAT || '',
    nrp: finalPayload.PENYIDIK_1_NRP || finalPayload.PENYIDIK_NRP || '',
    jabatan: finalPayload.PENYIDIK_1_JABATAN || finalPayload.PENYIDIK_JABATAN || ''
  };

  finalPayload.PENYIDIK_PENANGAN_NAMA = finalPayload.PENYIDIK_PENANGAN_NAMA || penanganFinal?.nama || '';
  finalPayload.penyidik_penangan_nama = finalPayload.PENYIDIK_PENANGAN_NAMA;

  const matchedPenanganDirFinal = findPersonnelRecordMatch(
    {
      id: penanganFinal?.id || penanganFinal?.user_id,
      nrp: finalPayload.PENYIDIK_PENANGAN_NRP || penanganFinal?.nrp,
      nama: finalPayload.PENYIDIK_PENANGAN_NAMA
    },
    combinedPersonnelPool
  );
  const penanganPangkatRawFinal = finalPayload.PENYIDIK_PENANGAN_PANGKAT || penanganFinal?.pangkat || matchedPenanganDirFinal?.pangkat || '';
  finalPayload.PENYIDIK_PENANGAN_PANGKAT = (toPangkatSingkat(penanganPangkatRawFinal) || penanganPangkatRawFinal).trim();
  finalPayload.penyidik_penangan_pangkat = finalPayload.PENYIDIK_PENANGAN_PANGKAT;

  finalPayload.PENYIDIK_PENANGAN_NRP = finalPayload.PENYIDIK_PENANGAN_NRP || penanganFinal?.nrp || matchedPenanganDirFinal?.nrp || '';
  finalPayload.penyidik_penangan_nrp = finalPayload.PENYIDIK_PENANGAN_NRP;

  const finalPenanganJabPair = resolveJabatanPenyidikPair(
    finalPayload.PENYIDIK_PENANGAN_PANGKAT || penanganPangkatRawFinal,
    finalPayload.PENYIDIK_PENANGAN_JABATAN || penanganFinal?.jabatan || matchedPenanganDirFinal?.jabatan || 'Penyidik'
  );
  finalPayload.PENYIDIK_PENANGAN_JABATAN = finalPenanganJabPair.titleCase;
  finalPayload.penyidik_penangan_jabatan = finalPenanganJabPair.titleCase;
  finalPayload.PENYIDIK_PENANGAN_JABATAN_UPPER = finalPenanganJabPair.upperCase;
  finalPayload.penyidik_penangan_jabatan_upper = finalPenanganJabPair.upperCase;

  const finalPenanganNoHp =
    penanganNoHp ||
    extractOfficerPhoneNumber(penanganFinal, combinedPersonnelPool) ||
    extractOfficerPhoneNumber(matchedPenanganDirFinal, combinedPersonnelPool) ||
    extractOfficerPhoneNumber(
      { nama: finalPayload.PENYIDIK_PENANGAN_NAMA, nrp: finalPayload.PENYIDIK_PENANGAN_NRP },
      combinedPersonnelPool
    ) ||
    '';
  finalPayload.PENYIDIK_PENANGAN_NO_HP = finalPenanganNoHp;
  finalPayload.penyidik_penangan_no_hp = finalPenanganNoHp;
  finalPayload.NO_HP_PENYIDIK_PENANGAN = finalPenanganNoHp;
  finalPayload.no_hp_penyidik_penangan = finalPenanganNoHp;
  finalPayload.PENYIDIK_PENANGAN_HP = finalPenanganNoHp;
  finalPayload.penyidik_penangan_hp = finalPenanganNoHp;

  const finalPenanganPktNrp = finalPayload.PENYIDIK_PENANGAN_PANGKAT && finalPayload.PENYIDIK_PENANGAN_NRP
    ? `${finalPayload.PENYIDIK_PENANGAN_PANGKAT} / ${finalPayload.PENYIDIK_PENANGAN_NRP}`
    : (finalPayload.PENYIDIK_PENANGAN_PANGKAT || finalPayload.PENYIDIK_PENANGAN_NRP || '');
  finalPayload.PENYIDIK_PENANGAN_PANGKAT_NRP = finalPenanganPktNrp;
  finalPayload.penyidik_penangan_pangkat_nrp = finalPenanganPktNrp;

  // 3. Pangkat & Jabatan Penandatangan Sisi Kiri: Yang Menerima Perintah / Pemeriksa / Penangkap / Penahan Utama
  const penyidikPangkatRawFinal = cleanInput.PENYIDIK_PANGKAT || cleanInput.penyidik_pangkat || activeCase?.penyidik_pangkat || activeCase?.penyidik_1_pangkat || finalPayload.PENYIDIK_PANGKAT || '';
  finalPayload.PENYIDIK_PANGKAT = (toPangkatSingkat(penyidikPangkatRawFinal) || penyidikPangkatRawFinal).trim();
  finalPayload.penyidik_pangkat = finalPayload.PENYIDIK_PANGKAT;

  const finalPenyidikJabPair = resolveJabatanPenyidikPair(
    finalPayload.PENYIDIK_PANGKAT || penyidikPangkatRawFinal,
    finalPayload.PENYIDIK_JABATAN || penyidikJabatanFallback
  );
  finalPayload.PENYIDIK_JABATAN = finalPenyidikJabPair.titleCase;
  finalPayload.penyidik_jabatan = finalPenyidikJabPair.titleCase;
  finalPayload.PENYIDIK_JABATAN_UPPER = finalPenyidikJabPair.upperCase;
  finalPayload.penyidik_jabatan_upper = finalPenyidikJabPair.upperCase;

  // JANGAN MEMUTASI PENYIDIK_1_PANGKAT MENJADI LENGKAP!
  // Personel 1 s.d. 5 di bagian daftar tugas "DIPERINTAHKAN Kepada" WAJIB pangkat singkat (AIPDA, BRIPKA, dll.)
  const penyidik1PangkatRawFinal = cleanInput.PENYIDIK_1_PANGKAT || cleanInput.penyidik_1_pangkat || activeCase?.penyidik_1_pangkat || penyidikPangkatRawFinal || '';
  finalPayload.PENYIDIK_1_PANGKAT = (toPangkatSingkat(penyidik1PangkatRawFinal) || penyidik1PangkatRawFinal).trim();
  finalPayload.penyidik_1_pangkat = finalPayload.PENYIDIK_1_PANGKAT;
  if (finalPayload.PENYIDIK_1_NAMA || finalPayload.PENYIDIK_1_PANGKAT) {
    const p1JabPairFinal = resolveJabatanPenyidikPair(finalPayload.PENYIDIK_1_PANGKAT, finalPayload.PENYIDIK_1_JABATAN);
    finalPayload.PENYIDIK_1_JABATAN = p1JabPairFinal.upperCase;
    finalPayload.penyidik_1_jabatan = p1JabPairFinal.upperCase;
  }

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

  // 4. Daftar Personel Tim di Batang Tubuh / Tabel Tugas (Loop Array {#PENYIDIK}) - Pangkat Singkat & Jabatan Mengikuti Aturan Pangkat
  const normalizeTimArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(p => {
      const pSingkat = toPangkatSingkat(p.pangkat_singkat || p.pangkat || '');
      const pLengkap = toPangkatLengkap(p.pangkat_lengkap || p.pangkat || '');
      const jabPair = resolveJabatanPenyidikPair(pSingkat, p.jabatan || 'Penyidik Pembantu');
      const noHpOfficer = extractOfficerPhoneNumber(p, combinedPersonnelPool);
      return {
        ...p,
        pangkat: pSingkat, // WAJIB Pangkat Singkat untuk perulangan tabel tugas ("Kepada : 1..5")
        pangkat_singkat: pSingkat,
        pangkat_lengkap: pLengkap,
        jabatan: jabPair.upperCase,
        JABATAN: jabPair.upperCase,
        jabatan_title: jabPair.titleCase,
        JABATAN_TITLE: jabPair.titleCase,
        jabatan_upper: jabPair.upperCase,
        JABATAN_UPPER: jabPair.upperCase,
        pangkat_nrp: p.nrp ? `${pSingkat} / ${p.nrp}` : pSingkat,
        no_hp: noHpOfficer || p.no_hp || '',
        NO_HP: noHpOfficer || p.no_hp || ''
      };
    });
  };

  if (Array.isArray(finalPayload.tim_penyidik)) {
    const normalizedTim = normalizeTimArray(finalPayload.tim_penyidik);
    finalPayload.tim_penyidik = normalizedTim;
    finalPayload.TIM_PENYIDIK = normalizedTim;
    finalPayload.penyidik = normalizedTim;
    finalPayload.PENYIDIK = normalizedTim;
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

  finalPayload.NO_SPRIN_HAN = finalPayload.NO_SPRIN_HAN || effectiveNoSprinHan;
  finalPayload.no_sprin_han = finalPayload.NO_SPRIN_HAN;
  finalPayload.TGL_SPRIN_HAN = effectiveTglSprinHan;
  finalPayload.tgl_sprin_han = effectiveTglSprinHan;
  finalPayload.TANGGAL_SPRIN_HAN = effectiveTglSprinHan;
  finalPayload.tanggal_sprin_han = effectiveTglSprinHan;

  finalPayload.NO_PANJANG_HAN_KN = finalPayload.NO_PANJANG_HAN_KN || effectivePanjangHanKn;
  finalPayload.no_panjang_han_kn = finalPayload.NO_PANJANG_HAN_KN;
  finalPayload.TGL_PANJANG_HAN_KN = effectiveTglSprinHanKn;
  finalPayload.tgl_panjang_han_kn = effectiveTglSprinHanKn;
  finalPayload.PANJANG_HAN_KN = finalPayload.PANJANG_HAN_KN || effectivePanjangHanKn || '';
  finalPayload.panjang_han_kn = finalPayload.PANJANG_HAN_KN;

  finalPayload.NO_SPRIN_HAN_KN = finalPayload.NO_SPRIN_HAN_KN || effectiveNoSprinHanKn;
  finalPayload.no_sprin_han_kn = finalPayload.NO_SPRIN_HAN_KN;
  finalPayload.TGL_SPRIN_HAN_KN = effectiveTglSprinHanKn;
  finalPayload.tgl_sprin_han_kn = effectiveTglSprinHanKn;
  finalPayload.TANGGAL_SPRIN_HAN_KN = effectiveTglSprinHanKn;
  finalPayload.tanggal_sprin_han_kn = effectiveTglSprinHanKn;

  finalPayload.NO_SPRIN_HAN_PN_1 = finalPayload.NO_SPRIN_HAN_PN_1 || effectiveNoSprinHanPn1;
  finalPayload.no_sprin_han_pn_1 = finalPayload.NO_SPRIN_HAN_PN_1;
  finalPayload.NO_SPRIN_HAN_PN1 = finalPayload.NO_SPRIN_HAN_PN_1;
  finalPayload.no_sprin_han_pn1 = finalPayload.NO_SPRIN_HAN_PN_1;
  finalPayload.TGL_SPRIN_HAN_PN_1 = effectiveTglSprinHanPn1;
  finalPayload.tgl_sprin_han_pn_1 = effectiveTglSprinHanPn1;
  finalPayload.TANGGAL_SPRIN_HAN_PN_1 = effectiveTglSprinHanPn1;
  finalPayload.tanggal_sprin_han_pn_1 = effectiveTglSprinHanPn1;
  finalPayload.TGL_SPRIN_HAN_PN1 = effectiveTglSprinHanPn1;
  finalPayload.tgl_sprin_han_pn1 = effectiveTglSprinHanPn1;
  finalPayload.NO_TAP_HAN_PN_1 = finalPayload.NO_TAP_HAN_PN_1 || effectiveTapHanPn1;
  finalPayload.no_tap_han_pn_1 = finalPayload.NO_TAP_HAN_PN_1;
  finalPayload.TGL_TAP_HAN_PN_1 = effectiveTglSprinHanPn1;
  finalPayload.tgl_tap_han_pn_1 = effectiveTglSprinHanPn1;
  finalPayload.TAP_HAN_PN_1 = finalPayload.TAP_HAN_PN_1 || effectiveTapHanPn1 || '';
  finalPayload.tap_han_pn_1 = finalPayload.TAP_HAN_PN_1;

  finalPayload.NO_SPRIN_HAN_PN_2 = finalPayload.NO_SPRIN_HAN_PN_2 || effectiveNoSprinHanPn2;
  finalPayload.no_sprin_han_pn_2 = finalPayload.NO_SPRIN_HAN_PN_2;
  finalPayload.NO_SPRIN_HAN_PN2 = finalPayload.NO_SPRIN_HAN_PN_2;
  finalPayload.no_sprin_han_pn2 = finalPayload.NO_SPRIN_HAN_PN_2;
  finalPayload.TGL_SPRIN_HAN_PN_2 = effectiveTglSprinHanPn2;
  finalPayload.tgl_sprin_han_pn_2 = effectiveTglSprinHanPn2;
  finalPayload.TANGGAL_SPRIN_HAN_PN_2 = effectiveTglSprinHanPn2;
  finalPayload.tanggal_sprin_han_pn_2 = effectiveTglSprinHanPn2;
  finalPayload.TGL_SPRIN_HAN_PN2 = effectiveTglSprinHanPn2;
  finalPayload.tgl_sprin_han_pn2 = effectiveTglSprinHanPn2;
  finalPayload.NO_TAP_HAN_PN_2 = finalPayload.NO_TAP_HAN_PN_2 || effectiveTapHanPn2;
  finalPayload.no_tap_han_pn_2 = finalPayload.NO_TAP_HAN_PN_2;
  finalPayload.TGL_TAP_HAN_PN_2 = effectiveTglSprinHanPn2;
  finalPayload.tgl_tap_han_pn_2 = effectiveTglSprinHanPn2;
  finalPayload.TAP_HAN_PN_2 = finalPayload.TAP_HAN_PN_2 || effectiveTapHanPn2 || '';
  finalPayload.tap_han_pn_2 = finalPayload.TAP_HAN_PN_2;

  // Penegasan Tag Khusus Penangkapan (Huruf Besar & Kecil)
  finalPayload.HARI_KAP = hariKap;
  finalPayload.hari_kap = hariKap;
  finalPayload.TANGGAL_KAP = tglKap;
  finalPayload.tanggal_kap = tglKap;
  finalPayload.TGL_KAP = tglKap;
  finalPayload.tgl_kap = tglKap;
  finalPayload.BULAN_KAP = bulanKap;
  finalPayload.bulan_kap = bulanKap;
  finalPayload.TAHUN_KAP = tahunKap;
  finalPayload.tahun_kap = tahunKap;
  finalPayload.TERBILANG_TAHUN_KAP = terbilangTahunKap;
  finalPayload.terbilang_tahun_kap = terbilangTahunKap;
  finalPayload.TERBILANG_TAHUN_BA_KAP = terbilangTahunKap;
  finalPayload.terbilang_tahun_ba_kap = terbilangTahunKap;
  finalPayload.TAHUN_KAP_TERBILANG = terbilangTahunKap;
  finalPayload.tahun_kap_terbilang = terbilangTahunKap;
  finalPayload.JAM_KAP = jamKap;
  finalPayload.jam_kap = jamKap;
  if (waktuKap) {
    finalPayload.WAKTU_KAP = waktuKap;
    finalPayload.waktu_kap = waktuKap;
  }
  finalPayload.TEMPAT_KAP = tempatKap;
  finalPayload.tempat_kap = tempatKap;

  // Penegasan Masa Berlaku 1x24 Jam otomatis (H+1) untuk SPRIN_KAP / SPRIN_KAP_DAN_BA
  if (isSprinKapAutoDoc && masaBerlaku) {
    ['MASA_BERLAKU', 'MASA_BERLAKU_KAP', 'SPRIN_MASA_BERLAKU', 'SPRIN_MASA_BERLAKU_KAP', 'TANGGAL_BERLAKU'].forEach((mk) => {
      finalPayload[mk] = masaBerlaku;
      finalPayload[mk.toLowerCase()] = masaBerlaku;
    });
  }

  // Penegasan Tag Khusus Sprin Penahanan & Perpanjangan Penahanan (Huruf Besar & Kecil)
  [
    'MULAI_DITAHAN', 'TANGGAL_MULAI_DITAHAN', 'TANGGAL_MULAI_HAN', 'TGL_MULAI_HAN', 'SPRIN_MULAI_DITAHAN', 'MULAI_PERPANJANGAN'
  ].forEach((k) => {
    finalPayload[k] = tglMulaiHanFormatted;
    finalPayload[k.toLowerCase()] = tglMulaiHanFormatted;
  });
  [
    'AKHIR_DITAHAN', 'TANGGAL_AKHIR_DITAHAN', 'TANGGAL_AKHIR_HAN', 'TGL_AKHIR_HAN', 'SPRIN_AKHIR_DITAHAN', 'AKHIR_PERPANJANGAN'
  ].forEach((k) => {
    finalPayload[k] = tglAkhirHanFormatted;
    finalPayload[k.toLowerCase()] = tglAkhirHanFormatted;
  });
  finalPayload.LAMA_PENAHANAN = lamaPenahananText;
  finalPayload.lama_penahanan = lamaPenahananText;
  finalPayload.MASA_PENAHANAN = lamaPenahananText;
  finalPayload.masa_penahanan = lamaPenahananText;
  finalPayload.TANGGAL_AKHIR_HAN_PENYIDIK = tglAkhirHanPenyidikFormatted || tglAkhirHanFormatted;
  finalPayload.tanggal_akhir_han_penyidik = finalPayload.TANGGAL_AKHIR_HAN_PENYIDIK;
  finalPayload.TGL_AKHIR_HAN_PENYIDIK = finalPayload.TANGGAL_AKHIR_HAN_PENYIDIK;
  finalPayload.tgl_akhir_han_penyidik = finalPayload.TANGGAL_AKHIR_HAN_PENYIDIK;
  finalPayload.TGL_MULAI_JANG_HAN_PU = tglMulaiJangHanPuFormatted || tglMulaiHanFormatted;
  finalPayload.tgl_mulai_jang_han_pu = finalPayload.TGL_MULAI_JANG_HAN_PU;
  finalPayload.TANGGAL_MULAI_JANG_HAN_PU = finalPayload.TGL_MULAI_JANG_HAN_PU;
  finalPayload.tanggal_mulai_jang_han_pu = finalPayload.TGL_MULAI_JANG_HAN_PU;
  finalPayload.TGL_AKHIR_HAN_PU = tglAkhirHanPuFormatted || tglAkhirHanFormatted;
  finalPayload.tgl_akhir_han_pu = finalPayload.TGL_AKHIR_HAN_PU;
  finalPayload.TGL_AKHIR_JANG_HAN_PU = finalPayload.TGL_AKHIR_HAN_PU;
  finalPayload.tgl_akhir_jang_han_pu = finalPayload.TGL_AKHIR_HAN_PU;
  finalPayload.TANGGAL_AKHIR_HAN_PU = finalPayload.TGL_AKHIR_HAN_PU;
  finalPayload.tanggal_akhir_han_pu = finalPayload.TGL_AKHIR_HAN_PU;
  finalPayload.TGL_MULAI_JANG_HAN_PN1 = tglMulaiJangHanPn1Formatted || tglMulaiHanFormatted;
  finalPayload.tgl_mulai_jang_han_pn1 = finalPayload.TGL_MULAI_JANG_HAN_PN1;
  finalPayload.TGL_MULAI_JANG_HAN_PN_1 = finalPayload.TGL_MULAI_JANG_HAN_PN1;
  finalPayload.tgl_mulai_jang_han_pn_1 = finalPayload.TGL_MULAI_JANG_HAN_PN1;
  finalPayload.TANGGAL_MULAI_JANG_HAN_PN1 = finalPayload.TGL_MULAI_JANG_HAN_PN1;
  finalPayload.tanggal_mulai_jang_han_pn1 = finalPayload.TGL_MULAI_JANG_HAN_PN1;
  finalPayload.TGL_AKHIR_HAN_PN1 = tglAkhirHanPn1Formatted || tglAkhirHanFormatted;
  finalPayload.tgl_akhir_han_pn1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.TGL_AKHIR_HAN_PN_1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.tgl_akhir_han_pn_1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.TGL_AKHIR_JANG_HAN_PN1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.tgl_akhir_jang_han_pn1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.TANGGAL_AKHIR_HAN_PN1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.tanggal_akhir_han_pn1 = finalPayload.TGL_AKHIR_HAN_PN1;
  finalPayload.TGL_MULAI_JANG_HAN_PN2 = tglMulaiJangHanPn2Formatted || tglMulaiHanFormatted;
  finalPayload.tgl_mulai_jang_han_pn2 = finalPayload.TGL_MULAI_JANG_HAN_PN2;
  finalPayload.TGL_MULAI_JANG_HAN_PN_2 = finalPayload.TGL_MULAI_JANG_HAN_PN2;
  finalPayload.tgl_mulai_jang_han_pn_2 = finalPayload.TGL_MULAI_JANG_HAN_PN2;
  finalPayload.TANGGAL_MULAI_JANG_HAN_PN2 = finalPayload.TGL_MULAI_JANG_HAN_PN2;
  finalPayload.tanggal_mulai_jang_han_pn2 = finalPayload.TGL_MULAI_JANG_HAN_PN2;
  finalPayload.TGL_AKHIR_HAN_PN2 = tglAkhirHanPn2Formatted || tglAkhirHanFormatted;
  finalPayload.tgl_akhir_han_pn2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.TGL_AKHIR_HAN_PN_2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.tgl_akhir_han_pn_2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.TGL_AKHIR_JANG_HAN_PN2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.tgl_akhir_jang_han_pn2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.TANGGAL_AKHIR_HAN_PN2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.tanggal_akhir_han_pn2 = finalPayload.TGL_AKHIR_HAN_PN2;
  finalPayload.TEMPAT_HAN = tempatHan;
  finalPayload.tempat_han = tempatHan;
  finalPayload.TEMPAT_PENAHANAN = tempatHan;
  finalPayload.tempat_penahanan = tempatHan;
  finalPayload.TEMPAT_RUTAN_HAN = tempatHan;
  finalPayload.tempat_rutan_han = tempatHan;
  if (noSpglTsk) {
    finalPayload.NO_SPGL_TSK = noSpglTsk;
    finalPayload.no_spgl_tsk = noSpglTsk;
    finalPayload.NOMOR_SPGL_TSK = noSpglTsk;
    finalPayload.nomor_spgl_tsk = noSpglTsk;
  }
  if (tglSpglTsk) {
    finalPayload.TGL_SPGL_TSK = tglSpglTsk;
    finalPayload.tgl_spgl_tsk = tglSpglTsk;
    finalPayload.TANGGAL_SPGL_TSK = tglSpglTsk;
    finalPayload.tanggal_spgl_tsk = tglSpglTsk;
  }

  // Penegasan Tag Khusus BA Penahanan (Huruf Besar & Kecil)
  finalPayload.HARI_HAN = hariHan;
  finalPayload.hari_han = hariHan;
  finalPayload.HARI_BA_HAN = hariHan;
  finalPayload.hari_ba_han = hariHan;
  finalPayload.TANGGAL_HAN = tglHan;
  finalPayload.tanggal_han = tglHan;
  finalPayload.TANGGAL_BA_HAN = tglHan;
  finalPayload.tanggal_ba_han = tglHan;
  finalPayload.TGL_HAN = tglHan;
  finalPayload.tgl_han = tglHan;
  finalPayload.BULAN_HAN = bulanHan;
  finalPayload.bulan_han = bulanHan;
  finalPayload.BULAN_BA_HAN = bulanHan;
  finalPayload.bulan_ba_han = bulanHan;
  finalPayload.TAHUN_HAN = tahunHan;
  finalPayload.tahun_han = tahunHan;
  finalPayload.TAHUN_BA_HAN = tahunHan;
  finalPayload.tahun_ba_han = tahunHan;
  finalPayload.TERBILANG_TAHUN_HAN = terbilangTahunHan;
  finalPayload.terbilang_tahun_han = terbilangTahunHan;
  finalPayload.TERBILANG_TAHUN_BA_HAN = terbilangTahunHan;
  finalPayload.terbilang_tahun_ba_han = terbilangTahunHan;
  finalPayload.TAHUN_HAN_TERBILANG = terbilangTahunHan;
  finalPayload.tahun_han_terbilang = terbilangTahunHan;
  finalPayload.TAHUN_BA_HAN_TERBILANG = terbilangTahunHan;
  finalPayload.tahun_ba_han_terbilang = terbilangTahunHan;
  finalPayload.JAM_HAN = jamHan;
  finalPayload.jam_han = jamHan;
  finalPayload.JAM_BA_HAN = jamHan;
  finalPayload.jam_ba_han = jamHan;
  if (waktuHan) {
    finalPayload.WAKTU_HAN = waktuHan;
    finalPayload.waktu_han = waktuHan;
    finalPayload.WAKTU_PENAHANAN = waktuHan;
    finalPayload.waktu_penahanan = waktuHan;
  }

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

  // 3. Pengantar BP Kembali P-19 -> alias {NOMOR_PENGANTAR_KEMBALI_P19}, {TANGGAL_PENGANTAR_KEMBALI_P19}, dll.
  const resolvedP19Archive = resolvePengantarKembaliP19FromArchive(archivedDocs, activeCase);
  const manualNoP19 = pickNonEmpty(
    isValidOfficialDocNumber(cleanInput.NOMOR_PENGANTAR_KEMBALI_P19) ? cleanInput.NOMOR_PENGANTAR_KEMBALI_P19 : '',
    isValidOfficialDocNumber(cleanInput.nomor_pengantar_kembali_p19) ? cleanInput.nomor_pengantar_kembali_p19 : '',
    isValidOfficialDocNumber(cleanInput.NO_PENGANTAR_KEMBALI_P19) ? cleanInput.NO_PENGANTAR_KEMBALI_P19 : '',
    isValidOfficialDocNumber(cleanInput.no_pengantar_kembali_p19) ? cleanInput.no_pengantar_kembali_p19 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_PENGANTAR_TAHAP_1_P19) ? cleanInput.NOMOR_PENGANTAR_TAHAP_1_P19 : '',
    isValidOfficialDocNumber(cleanInput.NO_PENGANTAR_TAHAP_1_P19) ? cleanInput.NO_PENGANTAR_TAHAP_1_P19 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_PENGANTAR_P19) ? cleanInput.NOMOR_PENGANTAR_P19 : '',
    isValidOfficialDocNumber(cleanInput.NO_PENGANTAR_P19) ? cleanInput.NO_PENGANTAR_P19 : ''
  );
  const manualRawTglP19 = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TANGGAL_PENGANTAR_KEMBALI_P19) ? cleanInput.TANGGAL_PENGANTAR_KEMBALI_P19 : '',
    !isPlaceholderVal(cleanInput.tanggal_pengantar_kembali_p19) ? cleanInput.tanggal_pengantar_kembali_p19 : '',
    !isPlaceholderVal(cleanInput.TGL_PENGANTAR_KEMBALI_P19) ? cleanInput.TGL_PENGANTAR_KEMBALI_P19 : '',
    !isPlaceholderVal(cleanInput.tgl_pengantar_kembali_p19) ? cleanInput.tgl_pengantar_kembali_p19 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_PENGANTAR_TAHAP_1_P19) ? cleanInput.TANGGAL_PENGANTAR_TAHAP_1_P19 : '',
    !isPlaceholderVal(cleanInput.TGL_PENGANTAR_TAHAP_1_P19) ? cleanInput.TGL_PENGANTAR_TAHAP_1_P19 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_PENGANTAR_P19) ? cleanInput.TANGGAL_PENGANTAR_P19 : '',
    !isPlaceholderVal(cleanInput.TGL_PENGANTAR_P19) ? cleanInput.TGL_PENGANTAR_P19 : ''
  );
  const nomorPengantarKembaliP19 = (isPengantarP19 && effectiveNomorSurat)
    ? effectiveNomorSurat
    : (resolvedP19Archive.docNo || manualNoP19 || activeCase?.nomor_pengantar_kembali_p19 || activeCase?.no_pengantar_kembali_p19 || '');
  const rawTanggalPengantarKembaliP19 = (isPengantarP19 && effectiveTanggalSurat)
    ? effectiveTanggalSurat
    : (resolvedP19Archive.rawDocDate || manualRawTglP19 || activeCase?.tgl_pengantar_kembali_p19 || '');
  const tanggalPengantarKembaliP19 = resolvedP19Archive.formattedDocDate || formatTanggalIndonesia(rawTanggalPengantarKembaliP19) || '';

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

  [
    'NOMOR_PENGANTAR_KEMBALI_P19',
    'NO_PENGANTAR_KEMBALI_P19',
    'NOMOR_PENGANTAR_TAHAP_1_P19',
    'NO_PENGANTAR_TAHAP_1_P19',
    'NOMOR_PENGANTAR_BP_KEMBALI_P19',
    'NO_PENGANTAR_BP_KEMBALI_P19',
    'NOMOR_PENGANTAR_P19',
    'NO_PENGANTAR_P19'
  ].forEach((k) => {
    finalPayload[k] = nomorPengantarKembaliP19;
    finalPayload[k.toLowerCase()] = nomorPengantarKembaliP19;
  });

  [
    'TANGGAL_PENGANTAR_KEMBALI_P19',
    'TGL_PENGANTAR_KEMBALI_P19',
    'TANGGAL_PENGANTAR_TAHAP_1_P19',
    'TGL_PENGANTAR_TAHAP_1_P19',
    'TANGGAL_PENGANTAR_BP_KEMBALI_P19',
    'TGL_PENGANTAR_BP_KEMBALI_P19',
    'TANGGAL_PENGANTAR_P19',
    'TGL_PENGANTAR_P19'
  ].forEach((k) => {
    finalPayload[k] = tanggalPengantarKembaliP19;
    finalPayload[k.toLowerCase()] = tanggalPengantarKembaliP19;
  });

  finalPayload.NOMOR_PENGANTAR_TAHAP_2 = nomorPengantarTahap2;
  finalPayload.nomor_pengantar_tahap_2 = nomorPengantarTahap2;
  finalPayload.NOMOR_PENGANTAR_TAHAP2 = nomorPengantarTahap2;
  finalPayload.nomor_pengantar_tahap2 = nomorPengantarTahap2;

  finalPayload.NO_P21_KN = finalPayload.NO_P21_KN || noP21Kn;
  finalPayload.no_p21_kn = finalPayload.NO_P21_KN;
  finalPayload.NOMOR_P21_KN = finalPayload.NO_P21_KN;
  finalPayload.nomor_p21_kn = finalPayload.NO_P21_KN;
  finalPayload.SURAT_P21 = finalPayload.SURAT_P21 || finalPayload.NO_P21_KN;
  finalPayload.surat_p21 = finalPayload.SURAT_P21;
  finalPayload.NO_SURAT_P21 = finalPayload.NO_P21_KN;
  finalPayload.no_surat_p21 = finalPayload.NO_P21_KN;
  finalPayload.NOMOR_SURAT_P21 = finalPayload.NO_P21_KN;
  finalPayload.nomor_surat_p21 = finalPayload.NO_P21_KN;
  finalPayload.TGL_P21_KN = finalPayload.TGL_P21_KN || tglP21Kn;
  finalPayload.tgl_p21_kn = finalPayload.TGL_P21_KN;
  finalPayload.TANGGAL_P21_KN = finalPayload.TGL_P21_KN;
  finalPayload.tanggal_p21_kn = finalPayload.TGL_P21_KN;

  // Bangun array loop {#BARANG_BUKTI} & {DAFTAR_BARANG_BUKTI} dengan fallback 1 baris titik-titik bila kosong
  const rawEvidenceSourcesPayload = [
    ...(Array.isArray(arg1?.evidenceList) ? arg1.evidenceList : []),
    ...(Array.isArray(arg1?.case_evidence) ? arg1.case_evidence : []),
    ...(Array.isArray(activeCase?.lampiran_barang_bukti) ? activeCase.lampiran_barang_bukti : []),
    ...(Array.isArray(activeCase?.barang_bukti) ? activeCase.barang_bukti : []),
    ...(Array.isArray(activeCase?.case_evidence) ? activeCase.case_evidence : []),
    ...(Array.isArray(activeCase?.evidenceList) ? activeCase.evidenceList : []),
    ...(Array.isArray(activeCase?.references?.barang_bukti) ? activeCase.references.barang_bukti : []),
    ...(Array.isArray(cleanInput.BARANG_BUKTI) ? cleanInput.BARANG_BUKTI : []),
    ...(Array.isArray(cleanInput.barang_bukti) ? cleanInput.barang_bukti : [])
  ];
  const rawEvidenceTextPayload = pickNonEmpty(
    typeof cleanInput.DAFTAR_BARANG_BUKTI === 'string' ? cleanInput.DAFTAR_BARANG_BUKTI : '',
    typeof cleanInput.daftar_barang_bukti === 'string' ? cleanInput.daftar_barang_bukti : '',
    typeof cleanInput.BARANG_BUKTI === 'string' ? cleanInput.BARANG_BUKTI : '',
    typeof cleanInput.barang_bukti === 'string' ? cleanInput.barang_bukti : '',
    typeof activeCase?.barang_bukti === 'string' ? activeCase.barang_bukti : '',
    typeof activeCase?.daftar_barang_bukti === 'string' ? activeCase.daftar_barang_bukti : ''
  );
  const { list: normalizedBarangBuktiList, daftarString: normalizedDaftarBarangBukti } = buildNormalizedBarangBuktiList(
    rawEvidenceSourcesPayload,
    rawEvidenceTextPayload
  );
  finalPayload.BARANG_BUKTI = normalizedBarangBuktiList;
  finalPayload.barang_bukti = normalizedBarangBuktiList;
  finalPayload.BARANG_BUKTI_LIST = normalizedBarangBuktiList;
  finalPayload.barang_bukti_list = normalizedBarangBuktiList;
  if (!finalPayload.DAFTAR_BARANG_BUKTI || typeof finalPayload.DAFTAR_BARANG_BUKTI !== 'string') {
    finalPayload.DAFTAR_BARANG_BUKTI = normalizedDaftarBarangBukti;
    finalPayload.daftar_barang_bukti = normalizedDaftarBarangBukti;
  }

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
  // INJEKSI ABSOLUT: LOOP DINAMIS {#TERSANGKA}, {#DASAR_TAP_TSK}, & TATA BAHASA TUNGGAL/JAMAK
  // ==============================================================
  const effectiveSuspectsForFinalLoop = (() => {
    const selectedTskOnly = selectedSubjectsClean.filter(
      (s) => s && (s._category === 'TERSANGKA' || s.status === 'tersangka' || !s._category)
    );
    const sourceArr = (selectedTskOnly.length > 0 && !isSpglSaksiDoc && !isTerlaporDoc)
      ? selectedTskOnly
      : tersangkaList;
    return deduplicateSubjectRecords(
      (Array.isArray(sourceArr) ? sourceArr : []).map(item => enrichSubjectWithPool(item, allKnownSubjectsPool)),
      'Tersangka'
    );
  })();

  populateIndexedSubjectGroup(finalPayload, effectiveSuspectsForFinalLoop, ['TSK', 'TERSANGKA'], allKnownSubjectsPool);
  const finalEnrichedSuspectsLoop = applyPerSuspectDocTags(finalPayload, effectiveSuspectsForFinalLoop, archivedDocs);
  finalPayload.TERSANGKA = finalEnrichedSuspectsLoop;
  finalPayload.tersangka = finalEnrichedSuspectsLoop;
  finalPayload.TERSANGKA_LIST = finalEnrichedSuspectsLoop;
  finalPayload.tersangka_list = finalEnrichedSuspectsLoop;
  finalPayload.DAFTAR_TERSANGKA = finalEnrichedSuspectsLoop;
  finalPayload.daftar_tersangka = finalEnrichedSuspectsLoop;
  // ==============================================================

  // ==============================================================
  // TANGGAL TERURAI UNIVERSAL (LP, RANTAI ARSIP, & SURAT AKTIF)
  // ==============================================================
  assignDecomposedDateTags(finalPayload, rawTanggalLp || tanggalLp, ['LP']);
  assignDecomposedDateTags(finalPayload, rawTglSprinSidik || tglSprinSidik, ['SPRIN_SIDIK', 'SP_SIDIK', 'SIDIK']);
  assignDecomposedDateTags(finalPayload, rawTglSprinGasSidik || tglSprinGasSidik, ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'GAS_SIDIK']);
  assignDecomposedDateTags(finalPayload, rawTglSpdp || tglSpdp, ['SPDP', 'SPDP_TSK']);
  assignDecomposedDateTags(finalPayload, rawTglSpTapTsk || tglSpTapTsk, ['TAP_TSK', 'SP_TAP_TSK', 'SP_TAP']);
  assignDecomposedDateTags(finalPayload, rawTglSprinKap || tglSprinKap, ['SPRIN_KAP', 'SP_KAP']);
  assignDecomposedDateTags(finalPayload, rawTglSprinHan || tglSprinHan, ['SPRIN_HAN', 'SP_HAN']);

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

  assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, ['SURAT', 'DOC']);

  // Penegasan Tag Khusus Surat Panggilan Tersangka & Saksi (SPGL_TSK_1/2 & SPGL_SAKSI_1/2)
  finalPayload.HARI_PANGGILAN = hariPanggilan;
  finalPayload.hari_panggilan = hariPanggilan;
  finalPayload.TANGGAL_PANGGILAN = tanggalPanggilanFormatted;
  finalPayload.tanggal_panggilan = tanggalPanggilanFormatted;
  finalPayload.TGL_PANGGILAN = tanggalPanggilanFormatted;
  finalPayload.tgl_panggilan = tanggalPanggilanFormatted;
  finalPayload.JAM_PANGGILAN = jamPanggilanFormatted;
  finalPayload.jam_panggilan = jamPanggilanFormatted;
  finalPayload.TEMPAT_PANGGILAN = tempatPanggilan;
  finalPayload.tempat_panggilan = tempatPanggilan;
  if (menemuiSiapa) {
    finalPayload.MENEMUI_SIAPA = menemuiSiapa;
    finalPayload.menemui_siapa = menemuiSiapa;
  }
  const finalPemanggilRank =
    matchedPemanggilOfficer?.pangkat ||
    matchedPemanggilOfficer?.rank ||
    extractLeadingPangkatFromLabel(finalPayload.MENEMUI_SIAPA || menemuiSiapa) ||
    finalPayload.PENYIDIK_PENANGAN_PANGKAT ||
    finalPayload.PENYIDIK_PANGKAT ||
    '';
  const finalPemanggilJabPair = resolveJabatanPenyidikPair(
    finalPemanggilRank,
    matchedPemanggilOfficer?.jabatan || cleanInput.JABATAN_PEMANGGIL || finalPayload.PENYIDIK_PENANGAN_JABATAN
  );
  finalPayload.JABATAN_PEMANGGIL = finalPemanggilJabPair.titleCase;
  finalPayload.jabatan_pemanggil = finalPemanggilJabPair.titleCase;
  finalPayload.JABATAN_PEMANGGIL_UPPER = finalPemanggilJabPair.upperCase;
  finalPayload.jabatan_pemanggil_upper = finalPemanggilJabPair.upperCase;
  finalPayload.MENEMUI_JABATAN = finalPemanggilJabPair.titleCase;
  finalPayload.menemui_jabatan = finalPemanggilJabPair.titleCase;

  const finalEffectiveNoHp = noHpPenyidikPemanggil || finalPenanganNoHp || '';
  if (finalEffectiveNoHp) {
    finalPayload.NO_HP_PENYIDIK = finalEffectiveNoHp;
    finalPayload.no_hp_penyidik = finalEffectiveNoHp;
    finalPayload.HP_PENYIDIK = finalEffectiveNoHp;
    finalPayload.hp_penyidik = finalEffectiveNoHp;
    finalPayload.TELEPON_PENYIDIK = finalEffectiveNoHp;
    finalPayload.telepon_penyidik = finalEffectiveNoHp;
    finalPayload.NO_HP = finalEffectiveNoHp;
    finalPayload.no_hp = finalEffectiveNoHp;
  }

  // Kunci tanggal terurai surat aktif: {HARI_SURAT}, {TANGGAL_ANGKA_SURAT}, {TGL_ANGKA_SURAT}, {BULAN_SURAT}, {TAHUN_SURAT}
  if (parsedActiveDate?.hari) {
    finalPayload.HARI_SURAT = parsedActiveDate.hari;
    finalPayload.hari_surat = parsedActiveDate.hari;
  }
  if (parsedActiveDate?.tanggal) {
    const tglAngkaStr = String(parseInt(parsedActiveDate.tanggal, 10) || parsedActiveDate.tanggal);
    finalPayload.TANGGAL_ANGKA_SURAT = tglAngkaStr;
    finalPayload.tanggal_angka_surat = tglAngkaStr;
    finalPayload.TGL_ANGKA_SURAT = tglAngkaStr;
    finalPayload.tgl_angka_surat = tglAngkaStr;
  }
  if (parsedActiveDate?.bulan) {
    finalPayload.BULAN_SURAT = parsedActiveDate.bulan;
    finalPayload.bulan_surat = parsedActiveDate.bulan;
  }
  if (parsedActiveDate?.tahun) {
    finalPayload.TAHUN_SURAT = parsedActiveDate.tahun;
    finalPayload.tahun_surat = parsedActiveDate.tahun;
  }

  // Penegasan biodata Subjek Target untuk Surat Panggilan Saksi (SPGL_SAKSI_*) dan Surat Panggilan Tersangka (SPGL_TSK_*)
  const rawSaksiPoolForSpgl = [
    ...allSubjek.filter(s => s && s.status === 'saksi'),
    ...(Array.isArray(activeCase?.saksi_list) ? activeCase.saksi_list : []),
    ...(Array.isArray(activeCase?.references?.saksi_list) ? activeCase.references.saksi_list : []),
    ...(Array.isArray(activeCase?.saksi) ? activeCase.saksi : [])
  ];
  const saksiFallbackClean = deduplicateSubjectRecords(rawSaksiPoolForSpgl, 'Saksi');
  const targetSaksiListForSpgl = selectedSubjectsClean.length > 0 ? selectedSubjectsClean : saksiFallbackClean;

  if (targetSaksiListForSpgl.length > 0 && (isSpglSaksiDoc || (selectedSubjectsClean.length > 0 && selectedSubjectsClean[0]?._category === 'SAKSI'))) {
    const primarySaksi = normalizeSubjectRecord(enrichSubjectWithPool(targetSaksiListForSpgl[0], allKnownSubjectsPool), 0, 'Saksi');
    populateSubjectPrefixVariables(finalPayload, 'SAKSI', targetSaksiListForSpgl, primarySaksi);
    populateIndexedSubjectGroup(finalPayload, targetSaksiListForSpgl, ['SAKSI', 'SUBJEK'], allKnownSubjectsPool);
    if (primarySaksi) {
      finalPayload.NAMA_SAKSI = primarySaksi.nama || '';
      finalPayload.nama_saksi = primarySaksi.nama || '';
      finalPayload.SAKSI_NAMA = primarySaksi.nama || '';
      finalPayload.saksi_nama = primarySaksi.nama || '';
      finalPayload.NAMA_DIPANGGIL = primarySaksi.nama || '';
      finalPayload.nama_dipanggil = primarySaksi.nama || '';
      finalPayload.KERJA_SAKSI = primarySaksi.pekerjaan || '';
      finalPayload.kerja_saksi = primarySaksi.pekerjaan || '';
      finalPayload.PEKERJAAN_SAKSI = primarySaksi.pekerjaan || '';
      finalPayload.pekerjaan_saksi = primarySaksi.pekerjaan || '';
      finalPayload.SAKSI_PEKERJAAN = primarySaksi.pekerjaan || '';
      finalPayload.saksi_pekerjaan = primarySaksi.pekerjaan || '';
      finalPayload.ALAMAT_SAKSI = primarySaksi.alamat || '';
      finalPayload.alamat_saksi = primarySaksi.alamat || '';
      finalPayload.SAKSI_ALAMAT = primarySaksi.alamat || '';
      finalPayload.saksi_alamat = primarySaksi.alamat || '';
      finalPayload.TTL_SAKSI = primarySaksi.ttl || '';
      finalPayload.ttl_saksi = primarySaksi.ttl || '';
      finalPayload.SAKSI_TTL = primarySaksi.ttl || '';
      finalPayload.saksi_ttl = primarySaksi.ttl || '';
      finalPayload.NIK_SAKSI = primarySaksi.nik || '';
      finalPayload.nik_saksi = primarySaksi.nik || '';
      finalPayload.SAKSI_NIK = primarySaksi.nik || '';
      finalPayload.saksi_nik = primarySaksi.nik || '';
    }
  }

  const targetTskListForSpgl = selectedSubjectsClean.length > 0 ? selectedSubjectsClean : tersangkaList;
  if (targetTskListForSpgl.length > 0) {
    const primaryTskSpgl = normalizeSubjectRecord(enrichSubjectWithPool(targetTskListForSpgl[0], allKnownSubjectsPool), 0, 'Tersangka');
    if (primaryTskSpgl) {
      if (isSpglTskDoc || selectedSubjectsClean.length > 0) {
        populateSubjectPrefixVariables(finalPayload, 'TERSANGKA', targetTskListForSpgl, primaryTskSpgl);
        populateSubjectPrefixVariables(finalPayload, 'TSK', targetTskListForSpgl, primaryTskSpgl);
      }
      finalPayload.NAMA_TSK = primaryTskSpgl.nama || finalPayload.NAMA_TSK || '';
      finalPayload.nama_tsk = finalPayload.NAMA_TSK;
      finalPayload.NAMA_TERSANGKA = primaryTskSpgl.nama || finalPayload.NAMA_TERSANGKA || '';
      finalPayload.nama_tersangka = finalPayload.NAMA_TERSANGKA;
      finalPayload.KERJA_TSK = primaryTskSpgl.pekerjaan || finalPayload.KERJA_TSK || '';
      finalPayload.kerja_tsk = finalPayload.KERJA_TSK;
      finalPayload.PEKERJAAN_TSK = primaryTskSpgl.pekerjaan || finalPayload.PEKERJAAN_TSK || '';
      finalPayload.pekerjaan_tsk = finalPayload.PEKERJAAN_TSK;
      finalPayload.PEKERJAAN_TERSANGKA = primaryTskSpgl.pekerjaan || finalPayload.PEKERJAAN_TERSANGKA || '';
      finalPayload.pekerjaan_tersangka = finalPayload.PEKERJAAN_TERSANGKA;
      finalPayload.ALAMAT_TSK = primaryTskSpgl.alamat || finalPayload.ALAMAT_TSK || '';
      finalPayload.alamat_tsk = finalPayload.ALAMAT_TSK;
      finalPayload.ALAMAT_TERSANGKA = primaryTskSpgl.alamat || finalPayload.ALAMAT_TERSANGKA || '';
      finalPayload.alamat_tersangka = finalPayload.ALAMAT_TERSANGKA;
      if (isSpglTskDoc) {
        finalPayload.NAMA_DIPANGGIL = primaryTskSpgl.nama || '';
        finalPayload.nama_dipanggil = primaryTskSpgl.nama || '';
        finalPayload.PEKERJAAN = primaryTskSpgl.pekerjaan || finalPayload.PEKERJAAN || '';
        finalPayload.pekerjaan = finalPayload.PEKERJAAN;
        finalPayload.ALAMAT = primaryTskSpgl.alamat || finalPayload.ALAMAT || '';
        finalPayload.alamat = finalPayload.ALAMAT;
      }
    }
  }
  if (finalEffectiveNoHp) {
    finalPayload.NO_HP = finalEffectiveNoHp;
    finalPayload.no_hp = finalEffectiveNoHp;
  }

  // Resolusi Per-Subjek Rujukan Surat Panggilan Ke-1 -> Surat Panggilan Ke-2 (Saksi & Tersangka)
  // Menimpa otomatis setiap nilai kosong/'' atau placeholder '......' di formValues
  const activeSaksiTargetForSpgl1 =
    (targetSaksiListForSpgl.length > 0 ? targetSaksiListForSpgl[0] : null) ||
    (finalPayload.NAMA_SAKSI ? { nama: finalPayload.NAMA_SAKSI } : null);
  const spglSaksi1Resolved = resolveFirstSummonsDocForSubject(archivedDocs, 'SAKSI', activeSaksiTargetForSpgl1);
  const manualNoSpgilSaksi1 = pickNonEmpty(
    isValidOfficialDocNumber(cleanInput.NO_SPGIL_SAKSI_1) ? cleanInput.NO_SPGIL_SAKSI_1 : '',
    isValidOfficialDocNumber(cleanInput.NO_SPGL_SAKSI_1) ? cleanInput.NO_SPGL_SAKSI_1 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_SPGIL_SAKSI_1) ? cleanInput.NOMOR_SPGIL_SAKSI_1 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_PANGGILAN_SAKSI_1) ? cleanInput.NOMOR_PANGGILAN_SAKSI_1 : ''
  );
  const manualTglSpgilSaksi1Raw = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TGL_SPGIL_SAKSI_1) ? cleanInput.TGL_SPGIL_SAKSI_1 : '',
    !isPlaceholderVal(cleanInput.TGL_SPGL_SAKSI_1) ? cleanInput.TGL_SPGL_SAKSI_1 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_SPGIL_SAKSI_1) ? cleanInput.TANGGAL_SPGIL_SAKSI_1 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_PANGGILAN_SAKSI_1) ? cleanInput.TANGGAL_PANGGILAN_SAKSI_1 : ''
  );
  const finalNoSpgilSaksi1 = spglSaksi1Resolved.docNo || manualNoSpgilSaksi1 || '';
  const finalRawTglSpgilSaksi1 = spglSaksi1Resolved.rawDocDate || manualTglSpgilSaksi1Raw || '';
  const finalFormattedTglSpgilSaksi1 = spglSaksi1Resolved.formattedDocDate || formatTanggalIndonesia(finalRawTglSpgilSaksi1) || '';
  if (finalNoSpgilSaksi1 || finalFormattedTglSpgilSaksi1) {
    assignFirstSummonsReferenceTags(
      finalPayload,
      'SAKSI',
      finalNoSpgilSaksi1,
      finalFormattedTglSpgilSaksi1,
      finalRawTglSpgilSaksi1,
      false
    );
  }

  const activeTskTargetForSpgl1 =
    (targetTskListForSpgl.length > 0 ? targetTskListForSpgl[0] : null) ||
    activeSuspect ||
    (finalPayload.NAMA_TERSANGKA || finalPayload.NAMA_TSK ? { nama: finalPayload.NAMA_TERSANGKA || finalPayload.NAMA_TSK } : null);
  const spglTsk1Resolved = resolveFirstSummonsDocForSubject(archivedDocs, 'TSK', activeTskTargetForSpgl1);
  const manualNoSpgilTsk1 = pickNonEmpty(
    isValidOfficialDocNumber(cleanInput.NO_SPGIL_TSK_1) ? cleanInput.NO_SPGIL_TSK_1 : '',
    isValidOfficialDocNumber(cleanInput.NO_SPGL_TSK_1) ? cleanInput.NO_SPGL_TSK_1 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_SPGIL_TSK_1) ? cleanInput.NOMOR_SPGIL_TSK_1 : '',
    isValidOfficialDocNumber(cleanInput.NOMOR_PANGGILAN_TSK_1) ? cleanInput.NOMOR_PANGGILAN_TSK_1 : ''
  );
  const manualTglSpgilTsk1Raw = pickNonEmpty(
    !isPlaceholderVal(cleanInput.TGL_SPGIL_TSK_1) ? cleanInput.TGL_SPGIL_TSK_1 : '',
    !isPlaceholderVal(cleanInput.TGL_SPGL_TSK_1) ? cleanInput.TGL_SPGL_TSK_1 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_SPGIL_TSK_1) ? cleanInput.TANGGAL_SPGIL_TSK_1 : '',
    !isPlaceholderVal(cleanInput.TANGGAL_PANGGILAN_TSK_1) ? cleanInput.TANGGAL_PANGGILAN_TSK_1 : ''
  );
  const finalNoSpgilTsk1 = spglTsk1Resolved.docNo || manualNoSpgilTsk1 || '';
  const finalRawTglSpgilTsk1 = spglTsk1Resolved.rawDocDate || manualTglSpgilTsk1Raw || '';
  const finalFormattedTglSpgilTsk1 = spglTsk1Resolved.formattedDocDate || formatTanggalIndonesia(finalRawTglSpgilTsk1) || '';
  if (finalNoSpgilTsk1 || finalFormattedTglSpgilTsk1) {
    assignFirstSummonsReferenceTags(
      finalPayload,
      'TSK',
      finalNoSpgilTsk1,
      finalFormattedTglSpgilTsk1,
      finalRawTglSpgilTsk1,
      false
    );
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
    assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, [canonicalTplCode]);
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
    assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, ['SPDP', 'SPDP_TSK']);
  } else if (isSprinSidikDoc) {
    [
      'TANGGAL_SPRIN_SIDIK', 'tanggal_sprin_sidik',
      'TGL_SPRIN_SIDIK', 'tgl_sprin_sidik',
      'TANGGAL_SP_SIDIK', 'tanggal_sp_sidik',
      'TGL_SP_SIDIK', 'tgl_sp_sidik'
    ].forEach((k) => {
      finalPayload[k] = tanggalSurat;
    });
    assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, ['SPRIN_SIDIK', 'SP_SIDIK', 'SIDIK']);
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
    assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, ['SPGAS_SIDIK', 'SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'GAS_SIDIK']);
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
    assignDecomposedDateTags(finalPayload, effectiveTanggalSurat || tanggalSurat, ['TAP_TSK', 'SP_TAP_TSK', 'SP_TAP']);
  }

  // Jaga konsistensi penuh tag subjek terpilih / terlapor (11 field x 4 permutasi x slot 1..5, tag tunggal, & loop array)
  if (effectiveTargetTerlapor.length > 0 && (selectedSubjectsClean.length > 0 || isTerlaporDoc)) {
    const groupsToLock = isTerlaporDoc ? ['TERLAPOR', 'SUBJEK', 'TSK', 'TERSANGKA'] : ['TERLAPOR', 'SUBJEK'];
    populateSubjectPrefixVariables(finalPayload, 'TERLAPOR', effectiveTargetTerlapor, effectiveTargetTerlapor[0]);
    populateSubjectPrefixVariables(finalPayload, 'SUBJEK', effectiveTargetTerlapor, effectiveTargetTerlapor[0]);
    populateIndexedSubjectGroup(finalPayload, effectiveTargetTerlapor, groupsToLock, allKnownSubjectsPool);
    finalPayload.terlapor_list = finalPayload.TERLAPOR || [];
    finalPayload.subjek_list = finalPayload.SUBJEK || [];
    if (isTerlaporDoc) {
      applyPerSuspectDocTags(finalPayload, effectiveTargetTerlapor, archivedDocs);
      populateSubjectPrefixVariables(finalPayload, 'TERSANGKA', effectiveTargetTerlapor, effectiveTargetTerlapor[0]);
      const primaryTerlaporFinal = normalizeSubjectRecord(
        enrichSubjectWithPool(effectiveTargetTerlapor[0], allKnownSubjectsPool),
        0,
        'Terlapor'
      );
      if (primaryTerlaporFinal) {
        finalPayload.NAMA_TERSANGKA = primaryTerlaporFinal.nama || '';
        finalPayload.nama_tersangka = primaryTerlaporFinal.nama || '';
        finalPayload.NIK = primaryTerlaporFinal.nik || '';
        finalPayload.nik = primaryTerlaporFinal.nik || '';
        finalPayload.NO_IDENTITAS = primaryTerlaporFinal.nik || '';
        finalPayload.no_identitas = primaryTerlaporFinal.nik || '';
        finalPayload.NOMOR_IDENTITAS = primaryTerlaporFinal.nik || '';
        finalPayload.nomor_identitas = primaryTerlaporFinal.nik || '';
        finalPayload.KEWARGANEGARAAN = primaryTerlaporFinal.kewarganegaraan || 'Indonesia';
        finalPayload.kewarganegaraan = primaryTerlaporFinal.kewarganegaraan || 'Indonesia';
        finalPayload.JENIS_KELAMIN = primaryTerlaporFinal.jenis_kelamin || '';
        finalPayload.jenis_kelamin = primaryTerlaporFinal.jenis_kelamin || '';
        finalPayload.JK = primaryTerlaporFinal.jenis_kelamin || '';
        finalPayload.jk = primaryTerlaporFinal.jenis_kelamin || '';
        finalPayload.TEMPAT_LAHIR = primaryTerlaporFinal.tempat_lahir || '';
        finalPayload.tempat_lahir = primaryTerlaporFinal.tempat_lahir || '';
        finalPayload.TGL_LAHIR = primaryTerlaporFinal.tgl_lahir || '';
        finalPayload.tgl_lahir = primaryTerlaporFinal.tgl_lahir || '';
        finalPayload.TTL = primaryTerlaporFinal.ttl || '';
        finalPayload.ttl = primaryTerlaporFinal.ttl || '';
        finalPayload.TEMPAT_TANGGAL_LAHIR = primaryTerlaporFinal.ttl || '';
        finalPayload.tempat_tanggal_lahir = primaryTerlaporFinal.ttl || '';
        finalPayload.UMUR = primaryTerlaporFinal.umur || '';
        finalPayload.umur = primaryTerlaporFinal.umur || '';
        finalPayload.PEKERJAAN = primaryTerlaporFinal.pekerjaan || '';
        finalPayload.pekerjaan = primaryTerlaporFinal.pekerjaan || '';
        finalPayload.PENDIDIKAN = primaryTerlaporFinal.pendidikan || '';
        finalPayload.pendidikan = primaryTerlaporFinal.pendidikan || '';
        finalPayload.PENDIDIKAN_TERAKHIR = primaryTerlaporFinal.pendidikan || '';
        finalPayload.pendidikan_terakhir = primaryTerlaporFinal.pendidikan || '';
        finalPayload.AGAMA = primaryTerlaporFinal.agama || '';
        finalPayload.agama = primaryTerlaporFinal.agama || '';
        finalPayload.STATUS_KAWIN = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.status_kawin = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.STATUS_PERNIKAHAN = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.status_pernikahan = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.STATUS_NIKAH = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.status_nikah = primaryTerlaporFinal.status_pernikahan || '';
        finalPayload.ALAMAT = primaryTerlaporFinal.alamat || '';
        finalPayload.alamat = primaryTerlaporFinal.alamat || '';
        finalPayload.TEMPAT_TINGGAL = primaryTerlaporFinal.alamat || '';
        finalPayload.tempat_tinggal = primaryTerlaporFinal.alamat || '';
      }
    }
  }
  // ==============================================================
  // ATURAN KHUSUS AKHIRAN "Dkk" PADA PERIHAL SURAT PENGANTAR:
  // 1. Surat Pengantar BP Tahap I (PENGANTAR_BP_TAHAP1)
  // 2. Surat Pengantar BP Tahap I Kembali P-19 (PENGANTAR_BP_KEMBALI_P19)
  // 3. Surat Pengantar Pengiriman Tsk dan BB Tahap II (PENGANTAR_TAHAP2)
  // Di luar loop {#TERSANGKA}, {NAMA_TERSANGKA} / {TERSANGKA_NAMA} berisi "<Nama Tersangka 1> Dkk" bila jumlahTsk > 1.
  // Di dalam loop {#TERSANGKA}, item.NAMA_TERSANGKA dan item.NAMA tetap murni nama masing-masing tersangka tanpa "Dkk".
  // ==============================================================
  const tplTitleUpperForDkk = String(selectedTemplate?.title || selectedTemplate?.name || tplName || '').toUpperCase();
  const isPengantarTahap2ForDkk =
    canonicalTplCode === 'PENGANTAR_TAHAP2' ||
    tplCode.includes('TAHAP_2') ||
    tplCode.includes('TAHAP2') ||
    tplCode.includes('TSK_BB') ||
    tplCode.includes('TSK_DAN_BB') ||
    /\bTAHAP\s*(?:2|II)\b/.test(tplTitleUpperForDkk);
  const isPengantarTahap1OrP19OrTahap2Doc =
    isPengantarTahap2ForDkk ||
    canonicalTplCode === 'PENGANTAR_BP_TAHAP1' ||
    canonicalTplCode === 'PENGANTAR_BP_KEMBALI_P19' ||
    tplCode.includes('PENGANTAR_TAHAP_1') ||
    tplCode.includes('PENGANTAR_TAHAP1') ||
    tplCode.includes('PENGANTAR_BP_TAHAP') ||
    tplCode.includes('PENGANTAR_P19') ||
    tplCode.includes('PENGANTAR_KEMBALI_P19') ||
    (tplTitleUpperForDkk.includes('PENGANTAR') && (
      /\bTAHAP\s*(?:1|I|2|II)\b/.test(tplTitleUpperForDkk) ||
      /\bP[-\s]?19\b/.test(tplTitleUpperForDkk)
    ));

  const jumlahTskFinal = finalEnrichedSuspectsLoop.length;
  const jumlahTerlaporFinal = Array.isArray(terlaporList) ? terlaporList.length : 0;
  finalPayload.IS_SINGLE_TSK = jumlahTskFinal === 1;
  finalPayload.is_single_tsk = jumlahTskFinal === 1;
  finalPayload.IS_MULTI_TSK = jumlahTskFinal > 1;
  finalPayload.is_multi_tsk = jumlahTskFinal > 1;
  finalPayload.IS_SINGLE_TERLAPOR = jumlahTerlaporFinal === 1;
  finalPayload.is_single_terlapor = jumlahTerlaporFinal === 1;
  finalPayload.IS_MULTI_TERLAPOR = jumlahTerlaporFinal > 1;
  finalPayload.is_multi_terlapor = jumlahTerlaporFinal > 1;
  const jumlahTskTerbilangStr = formatAngkaTerbilang(jumlahTskFinal || 1);
  const jumlahTerlaporTerbilangStr = formatAngkaTerbilang(jumlahTerlaporFinal || 1);
  finalPayload.JUMLAH_TERSANGKA_TERBILANG = jumlahTskTerbilangStr;
  finalPayload.jumlah_tersangka_terbilang = jumlahTskTerbilangStr;
  finalPayload.JUMLAH_TERLAPOR_TERBILANG = jumlahTerlaporTerbilangStr;
  finalPayload.jumlah_terlapor_terbilang = jumlahTerlaporTerbilangStr;

  const firstSuspectPureName = String(
    finalEnrichedSuspectsLoop[0]?.NAMA ||
    finalPayload.TSK_1_NAMA ||
    finalPayload.NAMA_TERSANGKA ||
    ''
  ).replace(/\s+dkk\.?$/i, '').trim();
  const namaTersangkaPerihal = (jumlahTskFinal > 1 && firstSuspectPureName)
    ? `${firstSuspectPureName} Dkk`
    : firstSuspectPureName;

  finalPayload.NAMA_TERSANGKA_DKK = namaTersangkaPerihal;
  finalPayload.nama_tersangka_dkk = namaTersangkaPerihal;
  finalPayload.NAMA_TERSANGKA_PERIHAL = namaTersangkaPerihal;
  finalPayload.nama_tersangka_perihal = namaTersangkaPerihal;

  if (isPengantarTahap1OrP19OrTahap2Doc && firstSuspectPureName) {
    finalPayload.NAMA_TERSANGKA = namaTersangkaPerihal;
    finalPayload.nama_tersangka = namaTersangkaPerihal;
    finalPayload.TERSANGKA_NAMA = namaTersangkaPerihal;
    finalPayload.tersangka_nama = namaTersangkaPerihal;
    finalPayload.NAMA_TSK = namaTersangkaPerihal;
    finalPayload.nama_tsk = namaTersangkaPerihal;

    ['PERIHAL', 'perihal', 'HAL', 'hal'].forEach((pKey) => {
      if (typeof finalPayload[pKey] === 'string' && finalPayload[pKey].trim() && jumlahTskFinal > 1) {
        const curPerihal = finalPayload[pKey];
        if (curPerihal.includes(firstSuspectPureName) && !/\bdkk\.?\b/i.test(curPerihal)) {
          finalPayload[pKey] = curPerihal.replace(firstSuspectPureName, namaTersangkaPerihal);
        }
      }
    });

    // Pastikan setiap elemen di dalam array loop {#TERSANGKA} tetap murni TANPA "Dkk"
    finalEnrichedSuspectsLoop.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const pureNm = String(item.NAMA || item.nama || '').replace(/\s+dkk\.?$/i, '').trim();
      item.nama = pureNm;
      item.NAMA = pureNm;
      item.nama_tersangka = pureNm;
      item.NAMA_TERSANGKA = pureNm;
      item.nama_tsk = pureNm;
      item.NAMA_TSK = pureNm;
    });
  }

  delete finalPayload.__SELECTED_SUBJECTS__;
  delete finalPayload.__selected_subjects__;

  // Bersihkan nilai null / undefined agar tidak merender teks 'null' atau 'undefined' di dokumen Word
  Object.keys(finalPayload).forEach((k) => {
    if (finalPayload[k] === null || finalPayload[k] === undefined || finalPayload[k] === 'null' || finalPayload[k] === 'undefined') {
      finalPayload[k] = '';
    }
  });

  // ==============================================================
  // SAPU JAGAT AKHIR: KUNCI MUTLAK TERBILANG_TAHUN_KAP & SELURUH TERBILANG_TAHUN_*
  // Memastikan nilai kosong "" dari formValues TIDAK PERNAH mengosongkan {TERBILANG_TAHUN_KAP}
  // maupun tag {TERBILANG_TAHUN_<SUFFIX>} lainnya.
  // ==============================================================
  const effectiveTahunKapFinal = String(finalPayload.TAHUN_KAP || finalPayload.tahun_kap || tahunKap || parsedActiveDate?.tahun || new Date().getFullYear()).trim();
  const computedTerbilangKapFinal = tahunKeTerbilang(Number(effectiveTahunKapFinal)) || terbilangTahunKap || tahunKeTerbilang(new Date().getFullYear());
  if (computedTerbilangKapFinal) {
    finalPayload.TERBILANG_TAHUN_KAP = computedTerbilangKapFinal;
    finalPayload.terbilang_tahun_kap = computedTerbilangKapFinal;
    finalPayload.TERBILANG_TAHUN_BA_KAP = computedTerbilangKapFinal;
    finalPayload.terbilang_tahun_ba_kap = computedTerbilangKapFinal;
    finalPayload.TAHUN_KAP_TERBILANG = computedTerbilangKapFinal;
    finalPayload.tahun_kap_terbilang = computedTerbilangKapFinal;
  }

  const effectiveTahunHanFinal = String(finalPayload.TAHUN_BA_HAN || finalPayload.TAHUN_HAN || finalPayload.tahun_han || tahunHan || parsedActiveDate?.tahun || new Date().getFullYear()).trim();
  const computedTerbilangHanFinal = tahunKeTerbilang(Number(effectiveTahunHanFinal)) || terbilangTahunHan || tahunKeTerbilang(new Date().getFullYear());
  if (computedTerbilangHanFinal) {
    finalPayload.TERBILANG_TAHUN_HAN = computedTerbilangHanFinal;
    finalPayload.terbilang_tahun_han = computedTerbilangHanFinal;
    finalPayload.TERBILANG_TAHUN_BA_HAN = computedTerbilangHanFinal;
    finalPayload.terbilang_tahun_ba_han = computedTerbilangHanFinal;
    finalPayload.TAHUN_HAN_TERBILANG = computedTerbilangHanFinal;
    finalPayload.tahun_han_terbilang = computedTerbilangHanFinal;
    finalPayload.TAHUN_BA_HAN_TERBILANG = computedTerbilangHanFinal;
    finalPayload.tahun_ba_han_terbilang = computedTerbilangHanFinal;
  }

  Object.keys(finalPayload).forEach((key) => {
    const upperKey = key.toUpperCase();
    if (upperKey === 'TAHUN' || upperKey.startsWith('TAHUN_') || upperKey.endsWith('_TAHUN')) {
      const yearVal = finalPayload[key];
      const yearMatch = String(yearVal || '').trim().match(/^(19\d{2}|20\d{2}|21\d{2})$/);
      if (yearMatch) {
        const terbilangStr = tahunKeTerbilang(Number(yearMatch[1]));
        if (terbilangStr) {
          const terbilangKey = upperKey === 'TAHUN' ? 'TERBILANG_TAHUN' : `TERBILANG_${upperKey}`;
          if (!finalPayload[terbilangKey] || String(finalPayload[terbilangKey]).trim() === '') {
            finalPayload[terbilangKey] = terbilangStr;
            finalPayload[terbilangKey.toLowerCase()] = terbilangStr;
          }
          if (upperKey.startsWith('TAHUN_')) {
            const altKey = `${upperKey}_TERBILANG`;
            if (!finalPayload[altKey] || String(finalPayload[altKey]).trim() === '') {
              finalPayload[altKey] = terbilangStr;
              finalPayload[altKey.toLowerCase()] = terbilangStr;
            }
          }
        }
      }
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
  const archivedDocs = Array.isArray(options.archivedDocs) ? options.archivedDocs : [];
  const selectedSubjects = Array.isArray(options.selectedSubjects) ? options.selectedSubjects : [];

  return buildMindikPayload({
    activeCase,
    activeSuspect,
    suspectsList,
    activeVictim,
    victimsList,
    formValues,
    template,
    docDate,
    archivedDocs,
    selectedSubjects,
    personnelList
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
  const explicitSelectedSubjects = Array.isArray(normalizedFormValues.__SELECTED_SUBJECTS__)
    ? normalizedFormValues.__SELECTED_SUBJECTS__
    : [];
  const effectiveFormValues = mergeChainedWithForm(universalContext, normalizedFormValues, { formatDatesForDocx: true });

  // 3. Build data map & gabungkan dengan universalContext (basePayload + universalContext + manual formValues)
  const baseDataMap = buildMindikVariables(currentCase, effectiveFormValues, template?.dynamic_fields, personnelList, {
    activeSuspect,
    suspectsList,
    activeVictim,
    victimsList,
    template,
    docDate: explicitActiveDocDate,
    archivedDocs: universalContext?._meta?.arsipDocs || [],
    selectedSubjects: explicitSelectedSubjects
  });
  const resolvedTerlaporList = baseDataMap.terlapor_list?.length
    ? baseDataMap.terlapor_list
    : (universalContext.TERLAPOR || []);
  const resolvedSubjekList = baseDataMap.subjek_list?.length
    ? baseDataMap.subjek_list
    : (universalContext.SUBJEK || []);
  const resolvedTersangkaList = baseDataMap.tersangka_list?.length
    ? baseDataMap.tersangka_list
    : (universalContext.TERSANGKA || []);

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
      TERLAPOR: resolvedTerlaporList,
      terlapor: resolvedTerlaporList,
      TERLAPOR_LIST: resolvedTerlaporList,
      terlapor_list: resolvedTerlaporList,
      SUBJEK: resolvedSubjekList,
      subjek: resolvedSubjekList,
      SUBJEK_LIST: resolvedSubjekList,
      subjek_list: resolvedSubjekList,
      TERSANGKA: resolvedTersangkaList,
      tersangka: resolvedTersangkaList,
      TERSANGKA_LIST: resolvedTersangkaList,
      tersangka_list: resolvedTersangkaList,
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
    'TAHUN_SURAT', 'tahun_surat',
    'TGL_ANGKA_SURAT', 'tgl_angka_surat',
    'TANGGAL_ANGKA_SURAT', 'tanggal_angka_surat',
    'TERBILANG_TAHUN_SURAT', 'terbilang_tahun_surat',
    'TANGGAL_TERURAI_SURAT', 'tanggal_terurai_surat',
    'HARI_DOC', 'hari_doc',
    'TGL_ANGKA_DOC', 'tgl_angka_doc',
    'TANGGAL_ANGKA_DOC', 'tanggal_angka_doc',
    'BULAN_DOC', 'bulan_doc',
    'TAHUN_DOC', 'tahun_doc',
    'TERBILANG_TAHUN_DOC', 'terbilang_tahun_doc',
    'TANGGAL_TERURAI_DOC', 'tanggal_terurai_doc'
  ]);
  Object.keys(universalContext).forEach((uKey) => {
    if (ACTIVE_SURAT_PROTECTED_KEYS.has(uKey)) return;
    if (
      /^(TERLAPOR|SUBJEK|TSK|TERSANGKA)_?\d+_|_(TERLAPOR|SUBJEK|TSK|TERSANGKA)_?\d+$/i.test(uKey) &&
      (explicitSelectedSubjects.length > 0 || Object.prototype.hasOwnProperty.call(baseDataMap, uKey))
    ) {
      return;
    }
    if (dataMap[uKey] === undefined || dataMap[uKey] === '' || dataMap[uKey] === '-') {
      dataMap[uKey] = universalContext[uKey];
    }
  });
  delete dataMap.__SELECTED_SUBJECTS__;
  delete dataMap.__selected_subjects__;

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
    'TAHUN_SURAT', 'tahun_surat',
    'TGL_ANGKA_SURAT', 'tgl_angka_surat',
    'TANGGAL_ANGKA_SURAT', 'tanggal_angka_surat',
    'TERBILANG_TAHUN_SURAT', 'terbilang_tahun_surat',
    'TANGGAL_TERURAI_SURAT', 'tanggal_terurai_surat',
    'HARI_DOC', 'hari_doc',
    'TGL_ANGKA_DOC', 'tgl_angka_doc',
    'TANGGAL_ANGKA_DOC', 'tanggal_angka_doc',
    'BULAN_DOC', 'bulan_doc',
    'TAHUN_DOC', 'tahun_doc',
    'TERBILANG_TAHUN_DOC', 'terbilang_tahun_doc',
    'TANGGAL_TERURAI_DOC', 'tanggal_terurai_doc',
    'HARI_KAP', 'hari_kap',
    'TANGGAL_KAP', 'tanggal_kap',
    'TGL_KAP', 'tgl_kap',
    'BULAN_KAP', 'bulan_kap',
    'TAHUN_KAP', 'tahun_kap',
    'TERBILANG_TAHUN_KAP', 'terbilang_tahun_kap',
    'TERBILANG_TAHUN_BA_KAP', 'terbilang_tahun_ba_kap',
    'TAHUN_KAP_TERBILANG', 'tahun_kap_terbilang',
    'JAM_KAP', 'jam_kap',
    'WAKTU_KAP', 'waktu_kap',
    'TEMPAT_KAP', 'tempat_kap',
    'MASA_BERLAKU', 'masa_berlaku',
    'MASA_BERLAKU_KAP', 'masa_berlaku_kap',
    'SPRIN_MASA_BERLAKU', 'sprin_masa_berlaku',
    'SPRIN_MASA_BERLAKU_KAP', 'sprin_masa_berlaku_kap',
    'TANGGAL_BERLAKU', 'tanggal_berlaku',
    'MULAI_DITAHAN', 'mulai_ditahan',
    'TANGGAL_MULAI_DITAHAN', 'tanggal_mulai_ditahan',
    'TANGGAL_MULAI_HAN', 'tanggal_mulai_han',
    'TGL_MULAI_HAN', 'tgl_mulai_han',
    'SPRIN_MULAI_DITAHAN', 'sprin_mulai_ditahan',
    'MULAI_PERPANJANGAN', 'mulai_perpanjangan',
    'AKHIR_DITAHAN', 'akhir_ditahan',
    'TANGGAL_AKHIR_DITAHAN', 'tanggal_akhir_ditahan',
    'TANGGAL_AKHIR_HAN', 'tanggal_akhir_han',
    'TGL_AKHIR_HAN', 'tgl_akhir_han',
    'SPRIN_AKHIR_DITAHAN', 'sprin_akhir_ditahan',
    'AKHIR_PERPANJANGAN', 'akhir_perpanjangan',
    'LAMA_PENAHANAN', 'lama_penahanan',
    'MASA_PENAHANAN', 'masa_penahanan',
    'TGL_AKHIR_HAN_PENYIDIK', 'tgl_akhir_han_penyidik',
    'TGL_MULAI_JANG_HAN_PU', 'tgl_mulai_jang_han_pu',
    'TGL_AKHIR_HAN_PU', 'tgl_akhir_han_pu',
    'TGL_MULAI_JANG_HAN_PN1', 'tgl_mulai_jang_han_pn1',
    'TGL_AKHIR_HAN_PN1', 'tgl_akhir_han_pn1',
    'TGL_MULAI_JANG_HAN_PN2', 'tgl_mulai_jang_han_pn2',
    'TGL_AKHIR_HAN_PN2', 'tgl_akhir_han_pn2',
    'TEMPAT_HAN', 'tempat_han',
    'TEMPAT_PENAHANAN', 'tempat_penahanan',
    'TEMPAT_RUTAN_HAN', 'tempat_rutan_han',
    'HARI_HAN', 'hari_han',
    'HARI_BA_HAN', 'hari_ba_han',
    'TANGGAL_HAN', 'tanggal_han',
    'TANGGAL_BA_HAN', 'tanggal_ba_han',
    'TGL_HAN', 'tgl_han',
    'BULAN_HAN', 'bulan_han',
    'BULAN_BA_HAN', 'bulan_ba_han',
    'TAHUN_HAN', 'tahun_han',
    'TAHUN_BA_HAN', 'tahun_ba_han',
    'TERBILANG_TAHUN_HAN', 'terbilang_tahun_han',
    'TERBILANG_TAHUN_BA_HAN', 'terbilang_tahun_ba_han',
    'TAHUN_HAN_TERBILANG', 'tahun_han_terbilang',
    'TAHUN_BA_HAN_TERBILANG', 'tahun_ba_han_terbilang',
    'JAM_HAN', 'jam_han',
    'JAM_BA_HAN', 'jam_ba_han',
    'WAKTU_HAN', 'waktu_han',
    'WAKTU_PENAHANAN', 'waktu_penahanan',
    'HARI_PANGGILAN', 'hari_panggilan',
    'TANGGAL_PANGGILAN', 'tanggal_panggilan',
    'TGL_PANGGILAN', 'tgl_panggilan',
    'JAM_PANGGILAN', 'jam_panggilan',
    'TEMPAT_PANGGILAN', 'tempat_panggilan',
    'MENEMUI_SIAPA', 'menemui_siapa',
    'NO_HP_PENYIDIK', 'no_hp_penyidik',
    'HP_PENYIDIK', 'hp_penyidik',
    'TELEPON_PENYIDIK', 'telepon_penyidik',
    'NO_HP', 'no_hp',
    'NAMA_SAKSI', 'nama_saksi',
    'SAKSI_NAMA', 'saksi_nama',
    'KERJA_SAKSI', 'kerja_saksi',
    'PEKERJAAN_SAKSI', 'pekerjaan_saksi',
    'ALAMAT_SAKSI', 'alamat_saksi',
    'TTL_SAKSI', 'ttl_saksi',
    'NIK_SAKSI', 'nik_saksi',
    'NAMA_TSK', 'nama_tsk',
    'KERJA_TSK', 'kerja_tsk',
    'PEKERJAAN_TSK', 'pekerjaan_tsk',
    'ALAMAT_TSK', 'alamat_tsk',
    'NAMA_DIPANGGIL', 'nama_dipanggil',
    'ATASAN_PANGKAT', 'atasan_pangkat',
    'ATASAN_PANGKAT_NRP', 'atasan_pangkat_nrp',
    'KASAT_PANGKAT', 'kasat_pangkat',
    'KAPOLRES_PANGKAT', 'kapolres_pangkat',
    'PENYIDIK_PANGKAT', 'penyidik_pangkat',
    'PENYIDIK_PANGKAT_NRP', 'penyidik_pangkat_nrp',
    'PENYIDIK_PENANGAN_PANGKAT', 'penyidik_penangan_pangkat',
    'PENYIDIK_PENANGAN_PANGKAT_NRP', 'penyidik_penangan_pangkat_nrp'
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



