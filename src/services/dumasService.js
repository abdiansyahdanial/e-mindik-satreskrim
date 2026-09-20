import { supabase } from '../supabaseClient.js';
import { uploadFileToR2, deleteR2File } from '../lib/r2Client.js';

export const DUMAS_LOCAL_STORAGE_KEY = 'emindik_dumas_records_v1';
export const DUMAS_DRAFT_KEY = 'emindik_dumas_form_draft_v1';

export const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));

/**
 * Helper pembacaan LocalStorage yang 100% aman (fool-proof)
 * Melindungi dari parsing galat dan korupsi data
 */
export const safeGetLocalStorage = (key, fallback = []) => {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback)
      ? (Array.isArray(parsed) ? parsed : fallback)
      : (parsed && typeof parsed === 'object' ? parsed : fallback);
  } catch (err) {
    console.warn(`[STORAGE WARNING] Corrupted data for ${key}, clearing...`, err);
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
};

/**
 * Normalisasi data bukti agar HANYA tipe data primitif yang disimpan ke localStorage.
 * Menghilangkan instance File/Blob/Event biner yang tersimpan kosong {} dan menyebabkan crash UI.
 */
export const sanitizeEvidenceList = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object' && (item.url || item.fileUrl || item.previewUrl))
    .map((item, index) => {
      const url = typeof item.url === 'string' ? item.url : (typeof item.fileUrl === 'string' ? item.fileUrl : (typeof item.previewUrl === 'string' ? item.previewUrl : ''));
      const fileUrl = typeof item.fileUrl === 'string' ? item.fileUrl : url;
      const previewUrl = typeof item.previewUrl === 'string' ? item.previewUrl : (url || fileUrl);
      const nama = typeof item.nama_berkas === 'string' ? item.nama_berkas : (typeof item.nama === 'string' ? item.nama : (typeof item.name === 'string' ? item.name : (typeof item.nama_file === 'string' ? item.nama_file : 'Berkas Bukti')));
      const tipe = typeof item.tipe === 'string' ? item.tipe : (typeof item.type === 'string' ? item.type : (typeof item.mime_type === 'string' ? item.mime_type : 'image/jpeg'));
      const ukuran = typeof item.ukuran === 'number' ? item.ukuran : (typeof item.size === 'number' ? item.size : 0);
      const uploaded_at = typeof item.uploaded_at === 'string' ? item.uploaded_at : (typeof item.diunggah_pada === 'string' ? item.diunggah_pada : new Date().toISOString());

      return {
        id: typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : `bb_${Date.now()}_${index}`,
        nama_berkas: nama,
        nama: nama,
        name: nama,
        nama_file: nama,
        url: url,
        fileUrl: fileUrl,
        previewUrl: previewUrl,
        tipe: tipe,
        type: tipe,
        mime_type: tipe,
        ukuran: ukuran,
        size: ukuran,
        file_size_formatted: item.file_size_formatted || `${(ukuran / 1024).toFixed(0)} KB`,
        kategori_bukti: item.kategori_bukti || (nama.toLowerCase().endsWith('.pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'),
        keterangan: typeof item.keterangan === 'string' ? item.keterangan : '',
        uploaded_at: uploaded_at,
        diunggah_pada: uploaded_at
      };
    });
};

/**
 * Mendapatkan key storage draf (dengan isolasi ID pengguna jika tersedia)
 */
export function getDumasDraftKey(userId = null) {
  return userId ? `${DUMAS_DRAFT_KEY}_${userId}` : DUMAS_DRAFT_KEY;
}

/**
 * Membaca draf tersimpan secara aman
 */
export function loadDumasDraft(userId = null) {
  const key = getDumasDraftKey(userId);
  return safeGetLocalStorage(key, null);
}

/**
 * Menyimpan draf formulir dumas
 */
export function saveDumasDraft(draftData, userId = null) {
  try {
    const key = getDumasDraftKey(userId);
    if (!draftData) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(draftData));
  } catch (err) {
    console.warn('Gagal menyimpan draf dumas ke storage:', err);
  }
}

/**
 * Menghapus draf formulir dumas
 */
export function clearDumasDraft(userId = null) {
  try {
    const key = getDumasDraftKey(userId);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Gagal menghapus draf dumas dari storage:', err);
  }
}

/**
 * Memeriksa ketersediaan draf tersimpan
 */
export function hasDumasDraft(userId = null) {
  try {
    const key = getDumasDraftKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && typeof parsed === 'object');
  } catch {
    return false;
  }
}

/**
 * Konversi nomor bulan (1-12) ke angka Romawi
 */
export function getBulanRomawi(monthIndex) {
  const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romawi[monthIndex] || 'IX';
}

/**
 * Generator nomor registrasi Dumas otomatis sesuai standar Satreskrim Kolaka Timur:
 * Pola: DUMAS/B/[Urut]/[BulanRomawi]/[Tahun]/SPKT/Polres Kolaka Timur/Polda Sultra
 */
export function generateDumasNumber(sequenceNumber = 1, date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const urut = String(sequenceNumber).padStart(2, '0');
  const bulanRomawi = getBulanRomawi(d.getMonth());
  const tahun = d.getFullYear();
  return `DUMAS/B/${urut}/${bulanRomawi}/${tahun}/SPKT/Polres Kolaka Timur/Polda Sultra`;
}

/**
 * Generator nomor resmi dinas Dumas Satreskrim Polres Kolaka Timur:
 * Format: B/DUMAS/[Urut]/[BulanRomawi]/[Tahun]/SPKT/Polres Koltim/Polda Sultra
 * Query otomatis ke Supabase (tabel laporan_pengaduan) dengan fallback offline aman.
 *
 * @returns {Promise<string>}
 */
export async function generateNomorDumasResmi() {
  const currentYear = new Date().getFullYear();
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const currentMonthRoman = romanMonths[new Date().getMonth()] || 'I';
  const defaultFallback = `B/DUMAS/01/${currentMonthRoman}/${currentYear}/SPKT/Polres Koltim/Polda Sultra`;

  try {
    let dbRecords = [];

    // 1. Query record dumas dari Supabase
    try {
      const { data, error } = await supabase
        .from('laporan_pengaduan')
        .select('nomor_lp, created_at, tanggal_lapor')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbRecords = data;
      }
    } catch (dbErr) {
      console.warn('[generateNomorDumasResmi] Gagal query Supabase:', dbErr);
    }

    // 2. Baca juga dari LocalStorage untuk sinkronisasi draf offline / data terkini
    const localRecords = safeGetLocalStorage(DUMAS_LOCAL_STORAGE_KEY, []);

    // Gabungkan seluruh record untuk pengecekan urutan
    const combinedRecords = [...dbRecords, ...localRecords];

    let maxNumber = 0;
    let yearRecordsCount = 0;

    for (const item of combinedRecords) {
      if (!item) continue;
      const noLp = (item.nomor_lp || item.nomor_register || '').trim();
      const dateStr = item.created_at || item.tanggal_lapor;
      const itemYear = dateStr ? new Date(dateStr).getFullYear() : null;

      // Periksa apakah berkaitan dengan tahun berjalan
      const matchesYear = itemYear === currentYear || noLp.includes(String(currentYear));

      if (matchesYear) {
        yearRecordsCount++;

        if (noLp) {
          // Cari angka urut dari pola: B/DUMAS/01/..., DUMAS/B/01/..., DUMAS/01/..., dll.
          const match = noLp.match(/(?:B\/)?DUMAS\/(?:B\/)?(\d+)\//i) || noLp.match(/DUMAS.*?(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }
    }

    // Nomor berikutnya: jika ada nomor urut tertinggi gunakan + 1, jika belum ada gunakan hitungan count + 1 atau mulai dari 1
    const nextSeq = maxNumber > 0 ? maxNumber + 1 : (yearRecordsCount > 0 ? yearRecordsCount + 1 : 1);
    const paddedNumber = String(nextSeq).padStart(2, '0');

    return `B/DUMAS/${paddedNumber}/${currentMonthRoman}/${currentYear}/SPKT/Polres Koltim/Polda Sultra`;
  } catch (err) {
    console.warn('[generateNomorDumasResmi] Error saat generate nomor dumas:', err);
    return defaultFallback;
  }
}


/**
 * Data awal (seed demo) sesuai spesifikasi Map Berkas Kedinasan
 */
export const initialDumasRecords = [
  {
    id: 'dum-2026-001',
    nomor_lp: 'DUMAS/B/01/IX/2026/SPKT/Polres Kolaka Timur/Polda Sultra',
    tanggal_lapor: '2026-09-12T14:00:00.000Z',
    penyidik_id: 'penyidik-01',
    penyidik_nama: 'Bripka Andi Pratama, S.H.',
    penyidik_nrp: '89040112',
    status_berkas: 'Tahap Penyelidikan (Sp.Lidik)',
    tindak_pidana: 'Penipuan & Penggelapan Dana Anggaran',
    pasal_disangkakan: 'Pasal 378 KUHP dan/atau Pasal 372 KUHP',
    tempus_delicti: '12 September 2026, Sekitar 14:00 WITA',
    locus_delicti: 'Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
    uraian_kejadian: 'Telah terjadi dugaan tindak pidana penggelapan dana kas operasional unit usaha desa sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah) yang diduga dilakukan oleh Terlapor Sdr. SAMSUL BAHRI. Korban Sdr. AHMAD SUBARI selaku pengawas menyerahkan dana operasional pengadaan bibit pertanian melalui transfer dan tunai dengan kwitansi tertanggal 10 Agustus 2026. Hingga batas waktu 10 September 2026, terlapor tidak menyerahkan barang pengadaan dan tidak dapat mempertanggungjawabkan keberadaan saldo kas tersebut.',
    
    // Identitas Pelapor / Korban
    pelapor_nama: 'AHMAD SUBARI',
    pelapor_nik: '7411081905890001',
    pelapor_ttl: 'Kolaka, 19 Mei 1989',
    pelapor_pekerjaan: 'Wiraswasta / Pengawas BUMDes',
    pelapor_agama: 'Islam',
    pelapor_kontak: '0812-4455-6677',
    pelapor_alamat: 'Desa Loea, Kec. Loea, Kab. Kolaka Timur, Sulawesi Tenggara',
    pelapor_status_label: 'Pelapor Sah & Beritikad Baik',

    // Saksi-Saksi (Array Dinamis)
    saksi_list: [
      {
        id: 'saksi-1',
        nama: 'HARIS MUNANDAR, S.P.',
        nik: '7411081503850002',
        ttl: 'Tirawuta, 15 Maret 1985',
        pekerjaan: 'Perangkat Desa / Bendahara BUMDes',
        agama: 'Islam',
        alamat: 'Kel. Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
        kontak: '0821-9876-5432',
        role_label: 'Saksi Fakta',
      },
      {
        id: 'saksi-2',
        nama: 'NURHAYATI',
        nik: '7411084209900003',
        ttl: 'Kolaka, 22 September 1990',
        pekerjaan: 'Staf Administrasi',
        agama: 'Islam',
        alamat: 'Desa Loea, Kec. Loea, Kab. Kolaka Timur',
        kontak: '0852-1122-3344',
        role_label: 'Saksi Terkait',
      }
    ],

    // Terlapor (Array Dinamis)
    terlapor_list: [
      {
        id: 'terlapor-1',
        nama: 'SAMSUL BAHRI',
        nik: '7411080407880004',
        ttl: 'Rate-Rate, 4 Juli 1988',
        pekerjaan: 'Wiraswasta / Mantan Direktur BUMDes',
        agama: 'Islam',
        alamat: 'Kelurahan Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
        kontak: '0852-9898-7711',
        role_label: 'Terlapor Utama',
        status_subjek: 'Saksi Terlapor',
        catatan_atensi: 'Belum ada catatan kriminal sebelumnya (Nihil SKCK Hitam / Bukan DPO)',
      }
    ],

    // Terlapor Utama Snapshot
    terlapor_nama: 'SAMSUL BAHRI',
    terlapor_nik: '7411080407880004',
    terlapor_ttl: 'Rate-Rate, 4 Juli 1988',
    terlapor_pekerjaan: 'Wiraswasta / Mantan Direktur BUMDes',
    terlapor_agama: 'Islam',
    terlapor_kontak: '0852-9898-7711',
    terlapor_domisili: 'Kelurahan Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
    terlapor_status: 'Terlapor Utama',

    // Lampiran Bukti Digital
    lampiran_barang_bukti: [
      {
        id: 'bb-01',
        kategori_bukti: 'DOKUMEN_PDF',
        nama_file: 'Kwitansi_Penyerahan_Uang_Bumdes.pdf',
        file_path: '/dummy/Kwitansi_Penyerahan_Uang_Bumdes.pdf',
        file_size_bytes: 286720,
        file_size_formatted: '280 KB',
        mime_type: 'application/pdf',
        hash_sha256: 'a3f9e2b1c8d4e7f6a5b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
        diunggah_pada: '2026-09-12T14:15:00.000Z',
        keterangan: 'Kuitansi bermeterai tanda terima dana kas dari pelapor kepada terlapor',
      },
      {
        id: 'bb-02',
        kategori_bukti: 'OBJEK_FISIK_JPG',
        nama_file: 'Sepeda_Motor_NMAX_DT4521AT.jpg',
        file_path: '/dummy/Sepeda_Motor_NMAX_DT4521AT.jpg',
        file_size_bytes: 1258291,
        file_size_formatted: '1.2 MB',
        mime_type: 'image/jpeg',
        hash_sha256: '9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a3f9e2b1c8d4e7f6',
        diunggah_pada: '2026-09-12T14:18:00.000Z',
        lokasi_simpan: 'Gudang BB Satreskrim Koltim',
        label_status: 'Penyitaan Sementara',
        keterangan: 'Barang bukti kendaraan operasional terlapor Yamaha NMAX Hitam DT 4521 AT',
      },
      {
        id: 'bb-03',
        kategori_bukti: 'DOKUMEN_PDF',
        nama_file: 'Surat_Perjanjian_Bumdes.pdf',
        file_path: '/dummy/Surat_Perjanjian_Bumdes.pdf',
        file_size_bytes: 860160,
        file_size_formatted: '840 KB',
        mime_type: 'application/pdf',
        hash_sha256: '5d6e7f8a9b0c1d2e3f4a3f9e2b1c8d4e7f6a5b2c3d4e5f6a7b8c9d0e1f2a3b4c',
        diunggah_pada: '2026-09-12T14:22:00.000Z',
        nomor_surat: '04/SPK/BUMD/VIII/26',
        keterangan: 'Surat perjanjian kerjasama operasional pengadaan bibit Bumdes',
      }
    ],
    created_at: '2026-09-12T14:00:00.000Z',
  }
];

/**
 * Mengambil daftar Dumas (Single Source of Truth: Supabase dengan fallback localStorage)
 */
export async function fetchDumasRecords() {
  try {
    // 1. Ambil data pengaduan terbaru langsung dari Supabase
    const { data: dbRecords, error } = await supabase
      .from('laporan_pengaduan')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(dbRecords) && dbRecords.length > 0) {
      // Ambil lampiran barang bukti untuk tiap record secara asinkron
      const enriched = await Promise.all(
        dbRecords.map(async (d) => {
          try {
            let bbQuery = supabase.from('barang_bukti').select('*').order('created_at', { ascending: true });
            if (d.nomor_lp) {
              bbQuery = bbQuery.eq('nomor_register', d.nomor_lp);
            } else if (isUUID(d.id)) {
              bbQuery = bbQuery.eq('id_perkara', d.id);
            } else {
              bbQuery = null;
            }

            const bbRows = bbQuery ? (await bbQuery).data : [];

            return {
              ...d,
              lampiran_barang_bukti: bbRows || [],
              barang_bukti: bbRows || []
            };
          } catch {
            return d;
          }
        })
      );

      // Sinkronkan ke cache lokal sebagai fallback offline
      try {
        localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(enriched));
      } catch {}

      return { success: true, data: enriched };
    }
  } catch (err) {
    console.warn('Gagal fetch dari Supabase, beralih ke cache lokal:', err);
  }

  // 2. Fallback: baca dari local storage jika offline/network error
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { success: true, data: parsed };
      }
    }
  } catch {}

  return { success: true, data: [] };
}

/**
 * Menyimpan data Dumas baru ke Supabase & Local Cache
 */
export async function saveDumasRecord(newRecord, evidenceFiles = []) {
  // 1. Simpan ke local storage terlebih dahulu (Optimistic UI)
  let currentList = [];
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) currentList = JSON.parse(raw);
  } catch {}

  // 1. Unggah berkas fisik bukti ke Cloudflare R2 secara asinkron via Presigned URL
  const processedEvidence = await Promise.all(
    evidenceFiles.map(async (file, idx) => {
      let r2Url = file.url || file.previewUrl || null;
      let r2Path = file.file_path || null;

      const rawFile = file.file || file.rawFile;
      if (rawFile) {
        try {
          const uploadRes = await uploadFileToR2(rawFile, file.name || file.nama_file, file.type, {
            folder: `dumas/${newRecord.nomor_lp ? newRecord.nomor_lp.replace(/[^a-zA-Z0-9_-]/g, '_') : 'lampiran'}`
          });
          if (uploadRes.success) {
            r2Url = uploadRes.url || uploadRes.publicUrl;
            r2Path = uploadRes.filePath || uploadRes.key;
          }
        } catch (uploadErr) {
          console.warn('[Dumas Storage] Gagal mengunggah berkas ke R2, fallback ke metadata lokal:', uploadErr);
        }
      }

      return {
        id: file.id || `bb-${Date.now()}-${idx}`,
        nama_file: file.name || file.nama_file || 'Berkas_Bukti',
        file_path: r2Path,
        kategori_bukti: file.type?.includes('pdf') || file.mime_type?.includes('pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
        file_size_bytes: file.size || file.file_size_bytes || 0,
        file_size_formatted: file.size ? `${(file.size / 1024).toFixed(0)} KB` : '150 KB',
        mime_type: file.type || file.mime_type || (file.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        hash_sha256: file.hash_sha256 || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        diunggah_pada: new Date().toISOString(),
        file_url: r2Url,
        keterangan: file.keterangan || 'Lampiran bukti pengaduan terunggah',
      };
    })
  );

  // Sanitasi dan deduplikasi bukti gabungan berbasis file_url / hash_sha256 / nama_file
  const rawEvidence = [
    ...(Array.isArray(newRecord.lampiran_barang_bukti) ? newRecord.lampiran_barang_bukti : []),
    ...(Array.isArray(newRecord.barang_bukti) ? newRecord.barang_bukti : []),
    ...processedEvidence
  ];

  const seenKeys = new Set();
  const dedupedEvidence = [];

  for (const item of rawEvidence) {
    if (!item) continue;
    const urlKey = (item.file_url || item.url || item.fileUrl || '').trim();
    const hashKey = item.hash_sha256 ? `hash_${item.hash_sha256}` : '';
    const nameKey = (item.nama_file || item.nama_berkas || item.name || '').trim();
    const dedupKey = urlKey || hashKey || nameKey;

    if (!dedupKey || seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);
    dedupedEvidence.push(item);
  }

  const completeRecord = {
    ...newRecord,
    id: newRecord.id || `dum-${Date.now()}`,
    created_at: newRecord.created_at || new Date().toISOString(),
    lampiran_barang_bukti: dedupedEvidence,
    barang_bukti: dedupedEvidence
  };

  const updatedList = [completeRecord, ...currentList.filter(item => item.id !== completeRecord.id)];
  try {
    localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  } catch {}

  // 2. Kirim ke Supabase jika tabel tersedia
  let supabaseResult = null;

  // Buat pemetaan payload lengkap dari completeRecord
  const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));

  const payload = {
    nomor_lp: completeRecord.nomor_lp,
    tanggal_surat: completeRecord.tanggal_surat || new Date().toISOString(),
    pelapor_nama: completeRecord.pelapor_nama || '',
    pelapor_nik: completeRecord.pelapor_nik || '',
    pelapor_tempat_lahir: completeRecord.pelapor_tempat_lahir || '',
    pelapor_tanggal_lahir: completeRecord.pelapor_tanggal_lahir || null,
    pelapor_jenis_kelamin: completeRecord.pelapor_jenis_kelamin || 'Laki-laki',
    pelapor_pekerjaan: completeRecord.pelapor_pekerjaan || '',
    pelapor_kewarganegaraan: completeRecord.pelapor_kewarganegaraan || 'WNI',
    pelapor_agama: completeRecord.pelapor_agama || 'Islam',
    pelapor_alamat: completeRecord.pelapor_alamat || '',
    pelapor_telepon: completeRecord.pelapor_telepon || '',
    terlapor_nama: completeRecord.terlapor_nama || '',
    terlapor_kontak: completeRecord.terlapor_kontak || '',
    terlapor_alamat: completeRecord.terlapor_alamat || '',
    terlapor_pekerjaan: completeRecord.terlapor_pekerjaan || '',
    terlapor_status: completeRecord.terlapor_status || 'Terlapor Utama',
    saksi_nama: completeRecord.saksi_nama || '',
    saksi_kontak: completeRecord.saksi_kontak || '',
    saksi_alamat: completeRecord.saksi_alamat || '',
    saksi_keterangan: completeRecord.saksi_keterangan || '',
    saksi_daftar: completeRecord.saksi_daftar || [],
    tindak_pidana: completeRecord.tindak_pidana || '',
    pasal_disangkakan: completeRecord.pasal_disangkakan || '',
    tempus_delicti: completeRecord.tempus_delicti || '',
    locus_delicti: completeRecord.locus_delicti || '',
    uraian_kejadian: completeRecord.uraian_kejadian || '',
    status_berkas: completeRecord.status_berkas || 'Tahap Penyelidikan (Sp.Lidik)'
  };

  // Sanitasi payload agar sinkron dengan kolom skema PostgreSQL laporan_pengaduan (mencegah error PGRST204)
  const allowedCols = new Set([
    'id', 'nomor_lp', 'tanggal_surat', 'tanggal_lapor',
    'pelapor_nama', 'pelapor_nik', 'pelapor_ttl', 'pelapor_pekerjaan',
    'pelapor_agama', 'pelapor_kontak', 'pelapor_alamat',
    'terlapor_nama', 'terlapor_nik', 'terlapor_ttl', 'terlapor_pekerjaan',
    'terlapor_agama', 'terlapor_status', 'terlapor_domisili', 'terlapor_kontak',
    'saksi_list', 'terlapor_list', 'saksi', 'terlapor', 'pelapor', 'perkara',
    'tindak_pidana', 'pasal_disangkakan', 'tempus_delicti', 'locus_delicti',
    'uraian_kejadian', 'status_berkas', 'status', 'status_tahap', 'is_locked_spkt',
    'penyidik_id', 'penyidik_nama', 'barang_bukti', 'created_at', 'user_id',
    'tanggal_serah_terima', 'penyerah_nama', 'penyerah_pangkat_nrp',
    'penerima_nama', 'penerima_pangkat_nrp', 'catatan_ekspedisi'
  ]);

  const dbPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowedCols.has(key)) {
      dbPayload[key] = value;
    }
  }

  // Mapping kolom ekuivalen / fallback untuk kolom skema database
  if (!dbPayload.pelapor_ttl) {
    const ttlParts = [completeRecord.pelapor_ttl, payload.pelapor_tempat_lahir, payload.pelapor_tanggal_lahir].filter(Boolean);
    if (ttlParts.length > 0) dbPayload.pelapor_ttl = ttlParts.join(', ');
  }
  if (!dbPayload.pelapor_kontak) {
    dbPayload.pelapor_kontak = completeRecord.pelapor_kontak || payload.pelapor_telepon || '';
  }
  if (!dbPayload.terlapor_domisili) {
    dbPayload.terlapor_domisili = completeRecord.terlapor_domisili || payload.terlapor_alamat || '';
  }
  if (!dbPayload.saksi_list || (Array.isArray(dbPayload.saksi_list) && dbPayload.saksi_list.length === 0)) {
    if (Array.isArray(completeRecord.saksi_list) && completeRecord.saksi_list.length > 0) {
      dbPayload.saksi_list = completeRecord.saksi_list;
    } else if (Array.isArray(payload.saksi_daftar) && payload.saksi_daftar.length > 0) {
      dbPayload.saksi_list = payload.saksi_daftar;
    } else if (payload.saksi_nama) {
      dbPayload.saksi_list = [{
        nama: payload.saksi_nama,
        kontak: payload.saksi_kontak || '',
        alamat: payload.saksi_alamat || '',
        keterangan: payload.saksi_keterangan || ''
      }];
    }
  }
  if (!dbPayload.terlapor_list || (Array.isArray(dbPayload.terlapor_list) && dbPayload.terlapor_list.length === 0)) {
    if (Array.isArray(completeRecord.terlapor_list) && completeRecord.terlapor_list.length > 0) {
      dbPayload.terlapor_list = completeRecord.terlapor_list;
    } else if (payload.terlapor_nama) {
      dbPayload.terlapor_list = [{
        nama: payload.terlapor_nama,
        kontak: payload.terlapor_kontak || '',
        domisili: payload.terlapor_alamat || '',
        pekerjaan: payload.terlapor_pekerjaan || '',
        status: payload.terlapor_status || 'Terlapor Utama'
      }];
    }
  }

  try {
    let savedRecord = null;
    const targetId = completeRecord.id;

    if (targetId && isUUID(targetId)) {
      // Mode EDIT (Update baris eksisting di Supabase)
      const { data, error } = await supabase
        .from('laporan_pengaduan')
        .update(dbPayload)
        .eq('id', targetId)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('[saveDumasRecord] Gagal update via id, coba update via nomor_lp:', error);
        const { data: retryData, error: retryErr } = await supabase
          .from('laporan_pengaduan')
          .update(dbPayload)
          .eq('nomor_lp', completeRecord.nomor_lp)
          .select()
          .maybeSingle();
        if (retryErr) throw retryErr;
        savedRecord = retryData;
      } else {
        savedRecord = data;
      }
    } else {
      // Mode INSERT (Data baru)
      const insertPayload = {
        ...dbPayload,
        ...(targetId && isUUID(targetId) ? { id: targetId } : {})
      };
      const { data, error } = await supabase
        .from('laporan_pengaduan')
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;
      savedRecord = data;
      if (savedRecord?.id) {
        completeRecord.id = savedRecord.id;
      }
    }

    // 3. Simpan lampiran barang bukti baru ke tabel barang_bukti
    const allEvidence = [
      ...(Array.isArray(completeRecord.lampiran_barang_bukti) ? completeRecord.lampiran_barang_bukti : []),
      ...(Array.isArray(completeRecord.barang_bukti) ? completeRecord.barang_bukti : [])
    ];

    if (allEvidence.length > 0) {
      const parentId = savedRecord?.id || completeRecord.id;
      const parentNoLp = savedRecord?.nomor_lp || completeRecord.nomor_lp;

      for (const bb of allEvidence) {
        const fileUrl = (bb.file_url || bb.url || bb.fileUrl || '').trim();
        if (!fileUrl) continue;

        // Cek apakah bukti ini sudah tersimpan di Supabase
        const { data: existingBb } = await supabase
          .from('barang_bukti')
          .select('id')
          .eq('file_url', fileUrl)
          .maybeSingle();

        if (!existingBb) {
          await supabase.from('barang_bukti').insert([{
            nomor_register: parentNoLp,
            id_perkara: isUUID(parentId) ? parentId : null,
            nama_berkas: bb.nama_file || bb.nama_berkas || 'Berkas Bukti',
            file_url: fileUrl,
            tipe_berkas: bb.mime_type || bb.tipe || 'image/jpeg',
            ukuran_berkas: bb.file_size_bytes || bb.ukuran || 0
          }]);
        }
      }
    }

    if (savedRecord) {
      supabaseResult = savedRecord;
      // Sinkronkan ke cache lokal
      try {
        const rawNow = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
        const listNow = rawNow ? JSON.parse(rawNow) : [];
        const syncedList = [completeRecord, ...listNow.filter(item => item.id !== completeRecord.id && item.nomor_lp !== completeRecord.nomor_lp)];
        localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(syncedList));
      } catch {}
    }
  } catch (dbErr) {
    console.error('[saveDumasRecord] Terjadi kesalahan saat sinkronisasi Supabase:', dbErr);
  }

  return {
    success: true,
    record: completeRecord,
    syncedToSupabase: !!supabaseResult
  };
}

/**
 * Menghapus record Dumas dari database, berkas fisik Cloudflare R2, & storage lokal
 */
export async function deleteDumasRecord(id) {
  if (!id) return { success: false, error: 'ID laporan tidak valid.' };

  try {
    const validUuid = isUUID(id);

    // 1. Ambil nomor_lp dari laporan_pengaduan
    let nomorLp = null;
    try {
      let lpQuery = null;
      if (validUuid) {
        lpQuery = supabase.from('laporan_pengaduan').select('id, nomor_lp').eq('id', id);
      } else if (typeof id === 'string' && id.includes('/')) {
        lpQuery = supabase.from('laporan_pengaduan').select('id, nomor_lp').eq('nomor_lp', id);
      }

      if (lpQuery) {
        const { data: dumasItem } = await lpQuery.maybeSingle();
        nomorLp = dumasItem?.nomor_lp;
      }
    } catch (e) {
      console.warn('Notice: Query laporan_pengaduan dilewati:', e);
    }

    // 2. Kumpulkan file fisik R2 dari cache lokal terlebih dahulu (sumber terlengkap)
    const filesToDelete = new Set();
    try {
      const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const currentItem = list.find(item => item.id === id || (nomorLp && item.nomor_lp === nomorLp) || (item.nomor_lp && item.nomor_lp === id));
        if (currentItem) {
          if (!nomorLp && currentItem.nomor_lp) {
            nomorLp = currentItem.nomor_lp;
          }
          const allBb = [
            ...(Array.isArray(currentItem.lampiran_barang_bukti) ? currentItem.lampiran_barang_bukti : []),
            ...(Array.isArray(currentItem.barang_bukti) ? currentItem.barang_bukti : [])
          ];
          allBb.forEach(bb => {
            const p = bb.file_path || bb.filePath || bb.key;
            if (p) filesToDelete.add(p);
            else if (bb.file_url || bb.url) {
              try {
                const u = new URL(bb.file_url || bb.url);
                filesToDelete.add(u.pathname.replace(/^\/+/, ''));
              } catch {}
            }
          });
        }
      }
    } catch (e) {
      console.warn('Gagal membaca cache lokal saat cleanup:', e);
    }

    // 3. Ambil juga referensi dari tabel barang_bukti di Supabase secara aman (tanpa .or UUID rawan error)
    try {
      let query = null;
      if (nomorLp) {
        query = supabase.from('barang_bukti').select('file_url').eq('nomor_register', nomorLp);
      } else if (validUuid) {
        query = supabase.from('barang_bukti').select('file_url').eq('id_perkara', id);
      }

      if (query) {
        const { data: bbRows } = await query;
        if (bbRows && bbRows.length > 0) {
          bbRows.forEach(row => {
            if (row.file_url) {
              try {
                const u = new URL(row.file_url);
                filesToDelete.add(u.pathname.replace(/^\/+/, ''));
              } catch {
                filesToDelete.add(row.file_url.replace(/^\/+/, ''));
              }
            }
          });
        }
      }
    } catch (dbErr) {
      console.warn('Notice: Query barang_bukti Supabase dilewati:', dbErr);
    }

    // 4. Eksekusi penghapusan fisik di Cloudflare R2
    if (filesToDelete.size > 0) {
      const deleteTasks = Array.from(filesToDelete).map(async (filePath) => {
        try {
          // Bersihkan prefix nama bucket jika URL memuat 'emindik-storage/'
          const cleanKey = filePath.replace(/^emindik-storage\//, '');
          await deleteR2File(cleanKey);
          console.log('[R2 Cleanup] Berhasil menghapus file fisik:', cleanKey);
        } catch (r2Err) {
          console.warn('[R2 Cleanup] Gagal menghapus file R2:', filePath, r2Err);
        }
      });
      await Promise.allSettled(deleteTasks);
    }

    // 5. Hapus relasi database Supabase (Cascade anak terlebih dahulu)
    try {
      if (nomorLp) {
        await supabase.from('barang_bukti').delete().eq('nomor_register', nomorLp);
      }
      if (validUuid) {
        try {
          await supabase.from('barang_bukti').delete().eq('laporan_id', id);
        } catch {}
        try {
          await supabase.from('barang_bukti').delete().eq('id_perkara', id);
        } catch {}
        try {
          await supabase.from('saksi_dumas').delete().eq('laporan_id', id);
        } catch {}
        try {
          await supabase.from('terlapor_dumas').delete().eq('laporan_id', id);
        } catch {}
        try {
          await supabase.from('dumas_status_history').delete().eq('laporan_id', id);
        } catch {}
        try {
          await supabase.from('dumas_status_history').delete().eq('dumas_id', id);
        } catch {}
      }
    } catch (cascadeErr) {
      console.warn('[DELETE DUMAS] Notice penghapusan tabel relasi anak:', cascadeErr);
    }

    // 6. Jalankan penghapusan tabel utama laporan_pengaduan
    let delError = null;
    try {
      if (validUuid) {
        const res = await supabase.from('laporan_pengaduan').delete().eq('id', id);
        delError = res.error;
      } else if (nomorLp) {
        const res = await supabase.from('laporan_pengaduan').delete().eq('nomor_lp', nomorLp);
        delError = res.error;
      }
    } catch (e) {
      delError = e;
    }

    if (delError) {
      console.error('[DELETE DUMAS] Gagal menghapus laporan_pengaduan:', delError);
      return { success: false, error: delError.message || 'Gagal menghapus dari database Supabase' };
    }

    // 7. Hapus dari LocalStorage
    try {
      const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter(item => item.id !== id && (nomorLp ? item.nomor_lp !== nomorLp : true));
        localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}

    return { success: true };
  } catch (err) {
    console.error('Error saat deleteDumasRecord:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Menambahkan bukti baru ke laporan Dumas yang sudah tersimpan
 */
export async function addEvidenceToDumas(dumasId, evidenceInput, nomorRegister = null) {
  if (!dumasId || !evidenceInput) {
    return { success: false, error: 'Parameter dumasId atau evidenceInput tidak valid.' };
  }

  let r2Url = evidenceInput.file_url || evidenceInput.previewUrl || null;
  let r2Path = evidenceInput.file_path || null;

  const rawFile = evidenceInput.file || evidenceInput.rawFile;
  if (rawFile) {
    try {
      const uploadRes = await uploadFileToR2(
        rawFile,
        evidenceInput.name || evidenceInput.nama_file,
        evidenceInput.type || evidenceInput.mime_type,
        { folder: `dumas/evidence_${dumasId}` }
      );
      if (uploadRes.success) {
        r2Url = uploadRes.url || uploadRes.publicUrl;
        r2Path = uploadRes.filePath || uploadRes.key;
      }
    } catch (uploadErr) {
      console.warn('[addEvidenceToDumas] Gagal mengunggah ke R2:', uploadErr);
    }
  }

  const isPdf = (evidenceInput.type || evidenceInput.mime_type || '').includes('pdf') ||
    (evidenceInput.name || evidenceInput.nama_file || '').toLowerCase().endsWith('.pdf');

  const randomHash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // 1. Deteksi nomor register (prioritas: parameter -> input -> cache localStorage)
  let targetNoRegister = nomorRegister || evidenceInput.nomor_register || evidenceInput.nomor_lp || null;
  if (!targetNoRegister) {
    try {
      const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const matched = list.find(item => item.id === dumasId);
        if (matched?.nomor_lp) {
          targetNoRegister = matched.nomor_lp;
        }
      }
    } catch (e) {
      console.warn('[addEvidenceToDumas] Gagal membaca nomor register dari cache:', e);
    }
  }

  const newEvidence = {
    id: evidenceInput.id || `bb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    laporan_id: dumasId,
    nomor_register: targetNoRegister,
    kategori_bukti: evidenceInput.kategori_bukti || (isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG'),
    nama_file: evidenceInput.name || evidenceInput.nama_file || 'Berkas_Bukti',
    file_path: r2Path,
    file_url: r2Url,
    file_size_bytes: evidenceInput.size || evidenceInput.file_size_bytes || 0,
    file_size_formatted: evidenceInput.file_size_formatted || (evidenceInput.size ? `${(evidenceInput.size / 1024).toFixed(0)} KB` : '150 KB'),
    mime_type: evidenceInput.type || evidenceInput.mime_type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    hash_sha256: evidenceInput.hash_sha256 || randomHash,
    diunggah_pada: new Date().toISOString(),
    keterangan: evidenceInput.keterangan || 'Lampiran bukti digital perkara pengaduan',
  };

  // 2. Simpan ke Supabase tabel barang_bukti (Single Source of Truth)
  try {
    const payload = {
      nomor_register: targetNoRegister,
      nama_berkas: newEvidence.nama_file || 'Berkas Bukti',
      file_url: newEvidence.file_url || '',
      tipe_berkas: newEvidence.mime_type || 'image/jpeg',
      ukuran_berkas: newEvidence.file_size_bytes || 0,
      keterangan: newEvidence.keterangan || 'Lampiran bukti digital perkara pengaduan',
      storage_provider: 'cloudflare_r2',
      created_at: new Date().toISOString()
    };

    const { data: insertedData, error: insErr } = await supabase
      .from('barang_bukti')
      .insert([payload])
      .select()
      .single();

    if (insErr) {
      console.warn('[addEvidenceToDumas] Gagal simpan ke Supabase barang_bukti:', insErr);
    } else if (insertedData?.id) {
      newEvidence.id = insertedData.id;
    }
  } catch (supErr) {
    console.warn('[addEvidenceToDumas] Notice: Sinkronisasi Supabase ditunda:', supErr);
  }

  // 3. Perbarui localStorage
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map(item => {
        if (item.id === dumasId) {
          const currentBukti = Array.isArray(item.lampiran_barang_bukti) ? item.lampiran_barang_bukti : [];
          return {
            ...item,
            lampiran_barang_bukti: [...currentBukti, newEvidence],
            barang_bukti: [...(Array.isArray(item.barang_bukti) ? item.barang_bukti : currentBukti), newEvidence]
          };
        }
        return item;
      });
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (lsErr) {
    console.warn('[addEvidenceToDumas] Gagal sinkronisasi localStorage:', lsErr);
  }

  return { success: true, evidence: newEvidence };
}

/**
 * Menghapus bukti dari laporan Dumas yang sudah tersimpan
 */
export async function deleteEvidenceFromDumas(dumasId, evidenceId, filePath = null, fileUrl = null) {
  if (!dumasId && !evidenceId) {
    return { success: false, error: 'Parameter tidak valid.' };
  }

  // 1. Ekstrak key/filePath R2 jika belum ada
  let targetPath = filePath;
  const rawUrl = fileUrl;

  if (!targetPath && rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      targetPath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
    } catch {
      if (typeof rawUrl === 'string' && rawUrl.includes('dumas/')) {
        targetPath = rawUrl.split('?')[0].replace(/^.*?(dumas\/)/, '$1');
      }
    }
  }

  // 2. Eksekusi hapus file dari Cloudflare R2
  if (targetPath) {
    try {
      const cleanKey = targetPath.replace(/^emindik-storage\//, '').replace(/^\/+/, '');
      await deleteR2File(cleanKey);
    } catch (r2Err) {
      console.warn('[deleteEvidenceFromDumas] Gagal menghapus file dari R2:', r2Err);
    }
  }

  // 3. Hapus baris dari tabel Supabase barang_bukti
  try {
    if (evidenceId && isUUID(evidenceId)) {
      await supabase.from('barang_bukti').delete().eq('id', evidenceId);
    }
  } catch (supErr) {
    console.warn('[deleteEvidenceFromDumas] Gagal hapus dari Supabase:', supErr);
  }

  // 4. Perbarui localStorage
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map(item => {
        if (item.id === dumasId) {
          const currentBukti = Array.isArray(item.lampiran_barang_bukti) ? item.lampiran_barang_bukti : [];
          return {
            ...item,
            lampiran_barang_bukti: currentBukti.filter(b => b.id !== evidenceId),
            barang_bukti: (Array.isArray(item.barang_bukti) ? item.barang_bukti : currentBukti).filter(b => b.id !== evidenceId)
          };
        }
        return item;
      });
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (lsErr) {
    console.warn('[deleteEvidenceFromDumas] Gagal update localStorage:', lsErr);
  }

  return { success: true };
}

/**
 * Konversi Objek Dumas menjadi format Berkas Kasus (Case Object)
 * untuk di-inject ke DocGeneratorView (Sprin Lidik, Sprin Sidik, SPDP, dll.)
 */
export function convertDumasToCase(dumasItem) {
  if (!dumasItem) return null;

  const tskList = (dumasItem.terlapor_list && dumasItem.terlapor_list.length > 0)
    ? dumasItem.terlapor_list
    : [{
        nama: dumasItem.terlapor_nama || 'TERLAPOR',
        nik: dumasItem.terlapor_nik || '-',
        ttl: dumasItem.terlapor_ttl || '-',
        pekerjaan: dumasItem.terlapor_pekerjaan || '-',
        agama: dumasItem.terlapor_agama || '-',
        alamat: dumasItem.terlapor_domisili || '-',
      }];

  const caseSuspects = tskList.map((tsk, idx) => ({
    id: tsk.id || `suspect-${idx + 1}`,
    nama: tsk.nama || dumasItem.terlapor_nama || '',
    nik: tsk.nik || '',
    tempat_lahir: tsk.ttl?.split(',')?.[0]?.trim() || '',
    tgl_lahir: tsk.ttl?.split(',')?.[1]?.trim() || '',
    umur: '35',
    jenis_kelamin: 'Laki-laki',
    kebangsaan: 'Indonesia',
    agama: tsk.agama || 'Islam',
    pekerjaan: tsk.pekerjaan || '',
    pendidikan: 'SMA / Sederajat',
    alamat: tsk.alamat || dumasItem.terlapor_domisili || '',
    status: 'terlapor',
  }));

  const primaryTsk = caseSuspects[0] || {};

  return {
    id: `case-dumas-${dumasItem.id || Date.now()}`,
    no_lp: dumasItem.nomor_lp || 'LP/DUMAS/SATRESKRIM',
    tindak_pidana: dumasItem.tindak_pidana || 'Dugaan Tindak Pidana',
    pasal_uu: dumasItem.pasal_disangkakan || '',
    pasal: dumasItem.pasal_disangkakan || '',
    locus: dumasItem.locus_delicti || '',
    tempus: dumasItem.tempus_delicti || '',
    pelapor_name: dumasItem.pelapor_nama || '',
    terlapor_name: dumasItem.terlapor_nama || '',
    sprin_date: new Date().toISOString().split('T')[0],
    sprin_loc: 'Tirawuta',
    status: 'active',
    uraian_kejadian: dumasItem.uraian_kejadian || '',
    person: {
      nama: primaryTsk.nama || '',
      nik: primaryTsk.nik || '',
      tempat_lahir: primaryTsk.tempat_lahir || '',
      tgl_lahir: primaryTsk.tgl_lahir || '',
      umur: primaryTsk.umur || '',
      jenis_kelamin: primaryTsk.jenis_kelamin || 'Laki-laki',
      kebangsaan: 'Indonesia',
      agama: primaryTsk.agama || 'Islam',
      pekerjaan: primaryTsk.pekerjaan || '',
      pendidikan: primaryTsk.pendidikan || 'SMA',
      alamat: primaryTsk.alamat || '',
      status: 'terlapor'
    },
    case_suspects: caseSuspects,
    investigators: [],
    references: {
      no_dumas_asal: dumasItem.nomor_lp,
    },
    saksi_list: dumasItem.saksi_list || [],
    lampiran_barang_bukti: dumasItem.lampiran_barang_bukti || [],
  };
}

/**
 * Memperbarui record Dumas yang sudah ada di Supabase & Local Cache
 */
export async function updateDumasRecord(id, updatedData, evidenceFiles = []) {
  return saveDumasRecord({ ...updatedData, id, _isEdit: true }, evidenceFiles);
}

/**
 * Alur Serah Terima Dumas Digital dari SPKT ke Satreskrim
 * (Chain-of-Custody & Status Locking)
 */
export const submitHandoverSpktToReskrim = async ({
  laporanId,
  nomorLp,
  penyerahNama = 'Petugas Piket SPKT',
  penyerahPangkatNrp = '-',
  penerimaNama = 'Piket / Urmintu Satreskrim',
  penerimaPangkatNrp = '-',
  catatanEkspedisi = 'Berkas diserahkan dari SPKT ke Satreskrim'
}) => {
  const timestamp = new Date().toISOString();

  // 1. Update status berkas di laporan_pengaduan
  const { data, error } = await supabase
    .from('laporan_pengaduan')
    .update({
      status_tahap: 'SERAH_TERIMA_SATRESKRIM',
      status_berkas: 'Diserahkan ke Satreskrim (Menunggu Telaah)',
      is_locked_spkt: true,
      tanggal_serah_terima: timestamp,
      penyerah_nama: penyerahNama || 'Petugas Piket SPKT',
      penyerah_pangkat_nrp: penyerahPangkatNrp || '-',
      penerima_nama: penerimaNama || 'Piket / Urmintu Satreskrim',
      penerima_pangkat_nrp: penerimaPangkatNrp || '-',
      catatan_ekspedisi: catatanEkspedisi || 'Berkas diserahkan dari SPKT ke Satreskrim'
    })
    .eq('id', laporanId)
    .select()
    .single();

  if (error) throw error;

  // 2. Catat jejak riwayat di dumas_status_history
  try {
    await supabase.from('dumas_status_history').insert([{
      laporan_id: laporanId,
      nomor_lp: nomorLp,
      status_sebelumnya: 'SPKT',
      status_baru: 'SERAH_TERIMA_SATRESKRIM',
      keterangan: catatanEkspedisi || 'Berkas diserahkan dari SPKT ke Satreskrim',
      diubah_oleh: 'SPKT / Satreskrim'
    }]);
  } catch (histErr) {
    console.warn('Gagal mencatat dumas_status_history:', histErr);
  }

  // 3. Sinkronkan pembaruan ke cache lokal jika tersedia
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map(item => {
        if (item.id === laporanId || (nomorLp && item.nomor_lp === nomorLp)) {
          return {
            ...item,
            status_tahap: 'SERAH_TERIMA_SATRESKRIM',
            status_berkas: 'Diserahkan ke Satreskrim (Menunggu Telaah)',
            is_locked_spkt: true,
            tanggal_serah_terima: timestamp,
            penyerah_nama: penyerahNama || 'Petugas Piket SPKT',
            penyerah_pangkat_nrp: penyerahPangkatNrp || '-',
            penerima_nama: penerimaNama || 'Piket / Urmintu Satreskrim',
            penerima_pangkat_nrp: penerimaPangkatNrp || '-',
            catatan_ekspedisi: catatanEkspedisi || 'Berkas diserahkan dari SPKT ke Satreskrim'
          };
        }
        return item;
      });
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (localErr) {
    console.warn('Gagal update local storage dumas:', localErr);
  }

  return data;
};
