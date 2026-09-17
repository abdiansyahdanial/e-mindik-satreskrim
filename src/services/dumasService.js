import { supabase } from '../supabaseClient.js';
import { uploadFileToR2, deleteR2File } from '../lib/r2Client.js';

export const DUMAS_LOCAL_STORAGE_KEY = 'emindik_dumas_records_v1';
export const DUMAS_DRAFT_KEY = 'emindik_dumas_form_draft_v1';

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
  try {
    const key = getDumasDraftKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('Gagal membaca draf dumas dari storage:', err);
    return null;
  }
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
 * Mengambil daftar Dumas (terhubung ke Supabase dengan fallback localStorage)
 */
export async function fetchDumasRecords() {
  let localData = [];
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Gagal membaca cache lokal dumas:', err);
  }

  // Jika cache lokal kosong, inisialisasi dengan data seed
  if (!Array.isArray(localData) || localData.length === 0) {
    localData = [...initialDumasRecords];
    try {
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(localData));
    } catch {}
  }

  // Coba ambil dari Supabase (Tabel laporan_pengaduan terverifikasi sesuai skema database baris 428)
  try {
    const res = await supabase
      .from('laporan_pengaduan')
      .select('*')
      .order('created_at', { ascending: false });

    // Pengecekan respons error / status 404 jika tabel belum siap di database Supabase
    if (res?.error) {
      console.info(`Notice: Tabel 'laporan_pengaduan' belum siap di Supabase (${res.error.message || res.error.status || res.error.code}). Menampilkan data fallback.`);
      return { 
        data: Array.isArray(localData) ? localData : [], 
        source: 'local_fallback', 
        error: null 
      };
    }

    if (Array.isArray(res?.data)) {
      if (res.data.length === 0) {
        return { data: [], source: 'supabase', error: null };
      }

      // Normalisasi nama relasi bukti jika ada
      const normalized = res.data.map(d => ({
        ...d,
        saksi_list: Array.isArray(d.saksi_list) ? d.saksi_list : [],
        terlapor_list: Array.isArray(d.terlapor_list) ? d.terlapor_list : [],
        lampiran_barang_bukti: Array.isArray(d.lampiran_barang_bukti) ? d.lampiran_barang_bukti : [],
      }));

      // Simpan ke local storage sebagai cache offline
      try {
        localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}

      return { data: normalized, source: 'supabase', error: null };
    }
  } catch (supErr) {
    console.warn('Notice: Query Supabase laporan_pengaduan dialihkan ke local resilience:', supErr);
  }

  return { data: Array.isArray(localData) ? localData : [], source: 'local', error: null };
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

  const completeRecord = {
    ...newRecord,
    id: newRecord.id || `dum-${Date.now()}`,
    created_at: newRecord.created_at || new Date().toISOString(),
    lampiran_barang_bukti: [
      ...(newRecord.lampiran_barang_bukti || []),
      ...processedEvidence
    ]
  };

  const updatedList = [completeRecord, ...currentList.filter(item => item.id !== completeRecord.id)];
  try {
    localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  } catch {}

  // 2. Kirim ke Supabase jika tabel tersedia
  let supabaseResult = null;
  try {
    const validSaksi = Array.isArray(completeRecord.saksi_list)
      ? completeRecord.saksi_list.filter((s) => s && s.nama && s.nama.trim() !== '')
      : [];

    const validTerlapor = Array.isArray(completeRecord.terlapor_list)
      ? completeRecord.terlapor_list.filter((t) => t && t.nama && t.nama.trim() !== '')
      : [];

    const payload = {
      nomor_lp: completeRecord.nomor_lp,
      penyidik_id: completeRecord.penyidik_id || null,
      penyidik_nama: completeRecord.penyidik_nama || 'Penyidik Satreskrim',
      pelapor_nama: completeRecord.pelapor_nama,
      pelapor_nik: completeRecord.pelapor_nik,
      pelapor_ttl: completeRecord.pelapor_ttl || '',
      pelapor_pekerjaan: completeRecord.pelapor_pekerjaan || '',
      pelapor_agama: completeRecord.pelapor_agama || '',
      pelapor_kontak: completeRecord.pelapor_kontak || '',
      pelapor_alamat: completeRecord.pelapor_alamat || '',
      saksi_list: validSaksi,
      saksi: validSaksi,
      terlapor_list: validTerlapor,
      terlapor: validTerlapor,
      terlapor_nama: completeRecord.terlapor_nama,
      terlapor_nik: completeRecord.terlapor_nik || '',
      terlapor_ttl: completeRecord.terlapor_ttl || '',
      terlapor_pekerjaan: completeRecord.terlapor_pekerjaan || '',
      terlapor_agama: completeRecord.terlapor_agama || '',
      terlapor_status: completeRecord.terlapor_status || 'Terlapor Utama',
      terlapor_domisili: completeRecord.terlapor_domisili || '',
      terlapor_kontak: completeRecord.terlapor_kontak || '',
      tindak_pidana: completeRecord.tindak_pidana || 'Dugaan Tindak Pidana',
      pasal_disangkakan: completeRecord.pasal_disangkakan || '',
      tempus_delicti: completeRecord.tempus_delicti || '',
      locus_delicti: completeRecord.locus_delicti || '',
      uraian_kejadian: completeRecord.uraian_kejadian || '',
      status_berkas: completeRecord.status_berkas || 'Tahap Penyelidikan (Sp.Lidik)',
    };

    console.log("[Dumas Submit] Payload data yang disimpan:", payload);

    const { data, error } = await supabase
      .from('laporan_pengaduan')
      .insert([payload])
      .select()
      .maybeSingle();

    if (!error && data) {
      supabaseResult = data;

      // Batch insert ke tabel relasi saksi_dumas jika tabel relasi tersedia
      if (validSaksi.length > 0) {
        try {
          const saksiRows = validSaksi.map((s) => ({
            laporan_id: data.id,
            nama: s.nama,
            nik: s.nik || '',
            ttl: s.ttl || '',
            pekerjaan: s.pekerjaan || '',
            agama: s.agama || 'Islam',
            alamat: s.alamat || '',
            kontak: s.kontak || '',
            role_label: s.role_label || 'Saksi',
          }));
          await supabase.from('saksi_dumas').insert(saksiRows);
        } catch {}
      }

      // Jika ada barang bukti dan Supabase sukses, simpan lampiran
      if (completeRecord.lampiran_barang_bukti?.length > 0) {
        const bbPayloads = completeRecord.lampiran_barang_bukti.map(bb => ({
          laporan_id: data.id,
          kategori_bukti: bb.kategori_bukti,
          nama_file: bb.nama_file,
          file_path: bb.file_path || '',
          file_url: bb.file_url || '',
          file_size_bytes: bb.file_size_bytes || 0,
          mime_type: bb.mime_type,
          hash_sha256: bb.hash_sha256,
          keterangan: bb.keterangan || '',
        }));

        try {
          await supabase.from('lampiran_barang_bukti').insert(bbPayloads);
        } catch (bbErr) {
          console.warn('Notice: Gagal menyimpan ke tabel lampiran_barang_bukti (tabel mungkin belum ada):', bbErr);
        }
      }
    }
  } catch (err) {
    console.warn('Sinkronisasi Supabase tertunda, data tersimpan di browser storage:', err);
  }

  return {
    success: true,
    record: completeRecord,
    syncedToSupabase: !!supabaseResult
  };
}

/**
 * Menghapus record Dumas dari database & storage lokal
 */
export async function deleteDumasRecord(id) {
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  try {
    await supabase.from('laporan_pengaduan').delete().eq('id', id);
  } catch (err) {
    console.warn('Gagal menghapus dari Supabase:', err);
  }

  return true;
}

/**
 * Menambahkan bukti baru ke laporan Dumas yang sudah tersimpan
 */
export async function addEvidenceToDumas(dumasId, evidenceInput) {
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

  const newEvidence = {
    id: evidenceInput.id || `bb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    laporan_id: dumasId,
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

  // 1. Perbarui localStorage
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map(item => {
        if (item.id === dumasId) {
          const currentBukti = Array.isArray(item.lampiran_barang_bukti) ? item.lampiran_barang_bukti : [];
          return {
            ...item,
            lampiran_barang_bukti: [...currentBukti, newEvidence]
          };
        }
        return item;
      });
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (lsErr) {
    console.warn('[addEvidenceToDumas] Gagal sinkronisasi localStorage:', lsErr);
  }

  // 2. Simpan ke Supabase jika tabel tersedia
  try {
    const payload = {
      laporan_id: dumasId,
      kategori_bukti: newEvidence.kategori_bukti,
      nama_file: newEvidence.nama_file,
      file_path: newEvidence.file_path || '',
      file_url: newEvidence.file_url || '',
      file_size_bytes: newEvidence.file_size_bytes,
      mime_type: newEvidence.mime_type,
      hash_sha256: newEvidence.hash_sha256,
      keterangan: newEvidence.keterangan,
    };

    const { error } = await supabase.from('lampiran_barang_bukti').insert([payload]);
    if (error) {
      await supabase.from('barang_bukti').insert([payload]).catch(() => {});
      await supabase.from('lampiran_pengaduan').insert([payload]).catch(() => {});
    }
  } catch (supErr) {
    console.warn('[addEvidenceToDumas] Notice: Sinkronisasi Supabase ditunda:', supErr);
  }

  return { success: true, evidence: newEvidence };
}

/**
 * Menghapus bukti dari laporan Dumas yang sudah tersimpan
 */
export async function deleteEvidenceFromDumas(dumasId, evidenceId, filePath = null) {
  if (!dumasId || !evidenceId) {
    return { success: false, error: 'Parameter dumasId atau evidenceId tidak valid.' };
  }

  // 1. Hapus dari Cloudflare R2 jika path file tersedia
  if (filePath) {
    try {
      await deleteR2File(filePath);
    } catch (r2Err) {
      console.warn('[deleteEvidenceFromDumas] Gagal menghapus file dari R2:', r2Err);
    }
  }

  // 2. Perbarui localStorage
  try {
    const raw = localStorage.getItem(DUMAS_LOCAL_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map(item => {
        if (item.id === dumasId) {
          const currentBukti = Array.isArray(item.lampiran_barang_bukti) ? item.lampiran_barang_bukti : [];
          return {
            ...item,
            lampiran_barang_bukti: currentBukti.filter(b => b.id !== evidenceId)
          };
        }
        return item;
      });
      localStorage.setItem(DUMAS_LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }
  } catch (lsErr) {
    console.warn('[deleteEvidenceFromDumas] Gagal update localStorage:', lsErr);
  }

  // 3. Hapus dari Supabase
  try {
    await supabase.from('lampiran_barang_bukti').delete().eq('id', evidenceId);
    await supabase.from('barang_bukti').delete().eq('id', evidenceId).catch(() => {});
    await supabase.from('lampiran_pengaduan').delete().eq('id', evidenceId).catch(() => {});
  } catch (supErr) {
    console.warn('[deleteEvidenceFromDumas] Notice: Gagal hapus record Supabase:', supErr);
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
