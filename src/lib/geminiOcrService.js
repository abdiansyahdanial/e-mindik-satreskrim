/**
 * Helper untuk mengambil API Key secara aman dari environment Vite maupun Node
 */
export const getGeminiApiKey = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY.trim();
      if (import.meta.env.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY.trim();
    }
  } catch {
    // Abaikan error di environment non-Vite
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY.trim();
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
    }
  } catch {
    // Abaikan error di environment non-Node
  }

  return '';
};

/**
 * Pembersih karakter strip (-) atau placeholder kosong dari dokumen fisik
 * agar tidak membingungkan parser ataupun mengotori form input
 * @param {any} val
 * @returns {string}
 */
export const sanitizeField = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (
    str === '-' ||
    str === '--' ||
    str === '---' ||
    str === '-/-' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'nihil'
  ) {
    return '';
  }
  return str;
};

/**
 * Konversi berkas gambar (File, Blob, ArrayBuffer, Buffer, atau data URL) menjadi base64 string
 * @param {File|Blob|ArrayBuffer|string} imageFile
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export const convertImageToBase64 = async (imageFile) => {
  if (!imageFile) {
    throw new Error('Berkas gambar tidak ditemukan atau kosong.');
  }

  // Jika input sudah berupa string base64 / data URL
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('data:')) {
      const parts = imageFile.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      return { base64: parts[1], mimeType };
    }
    return { base64: imageFile, mimeType: 'image/jpeg' };
  }

  // Jika input berupa File atau Blob (Browser environment)
  if (typeof Blob !== 'undefined' && imageFile instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result;
          const parts = result.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : imageFile.type || 'image/jpeg';
          resolve({ base64: parts[1], mimeType });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file citra gambar.'));
      reader.readAsDataURL(imageFile);
    });
  }

  // Jika input berupa Buffer (Node.js environment untuk unit testing)
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(imageFile)) {
    return {
      base64: imageFile.toString('base64'),
      mimeType: 'image/jpeg',
    };
  }

  // Jika input berupa ArrayBuffer
  if (imageFile instanceof ArrayBuffer) {
    const uint8 = new Uint8Array(imageFile);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return { base64: b64, mimeType: 'image/jpeg' };
  }

  throw new Error('Tipe data berkas tidak didukung untuk pemindaian OCR.');
};



/**
 * Pindai lembar berkas fisik surat pengaduan / LP via Serverless Endpoint (/api/ocr-scan).
 * Mendukung berkas tunggal (File) maupun multi-halaman (File[] / Blob[]).
 *
 * @param {File|File[]|Blob|Blob[]|string|string[]} files - Berkas tunggal atau array berkas multi-halaman
 * @param {Object} [options={}] - Konfigurasi tambahan
 * @returns {Promise<{
 *   success: boolean,
 *   data: Object|null,
 *   mappedForm?: Object|null,
 *   modelUsed?: string,
 *   pagesProcessed?: number,
 *   error: string|null
 * }>}
 */
export async function scanSuratPengaduan(files, options = {}) {
  // 1. Normalisasi input (berkas tunggal maupun array multi-halaman)
  if (!files) {
    return {
      success: false,
      data: null,
      error: 'Berkas foto surat pengaduan belum dipilih.',
    };
  }

  let fileList = [];
  if (Array.isArray(files)) {
    fileList = files;
  } else if (typeof files[Symbol.iterator] === 'function' && typeof files !== 'string') {
    fileList = Array.from(files);
  } else {
    fileList = [files];
  }

  // Filter berkas valid
  fileList = fileList.filter(Boolean);

  if (fileList.length === 0) {
    return {
      success: false,
      data: null,
      error: 'Berkas foto surat pengaduan tidak valid atau kosong.',
    };
  }

  try {
    // 2. Konversi seluruh file gambar menjadi array base64 data
    const images = await Promise.all(
      fileList.map(async (file, index) => {
        try {
          const { base64, mimeType } = await convertImageToBase64(file);
          return {
            mimeType: mimeType || 'image/jpeg',
            base64Data: base64,
          };
        } catch (convErr) {
          throw new Error(`Gagal mengonversi lembar ke-${index + 1}: ${convErr.message}`);
        }
      })
    );

    // 3. Kirim request POST ke endpoint backend serverless (/api/ocr-scan)
    const endpointUrl = options.endpoint || '/api/ocr-scan';
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const is429 = response.status === 429 || errJson.isRateLimit;
      const errorMsg = is429
        ? (errJson.error || 'Batas kuota token pemindaian AI (Rate Limit 429) tercapai. Harap tunggu sekitar 30 detik sebelum mencoba kembali atau lanjutkan dengan Input Manual.')
        : (errJson.error || `Server OCR mengembalikan status HTTP ${response.status}`);
      
      const customErr = new Error(errorMsg);
      customErr.isRateLimit = is429;
      customErr.status = response.status;
      throw customErr;
    }

    const resJson = await response.json();
    if (!resJson.success || !resJson.data) {
      throw new Error(resJson.error || 'Server OCR tidak mengembalikan data hasil ekstraksi.');
    }

    const parsedData = resJson.data;

    // 4. Normalisasi skema data (Mendukung skema flat maupun nested)
    const normalizedData = {
      nomor_surat: sanitizeField(parsedData.nomor_surat || parsedData.no_surat || parsedData.perkara?.nomor_surat),
      tanggal_surat: sanitizeField(parsedData.tanggal_surat || parsedData.tgl_surat || parsedData.perkara?.tanggal_surat),
      pelapor_nama: sanitizeField(parsedData.pelapor_nama || parsedData.pelapor?.nama_lengkap || parsedData.pelapor?.nama),
      pelapor_nik: sanitizeField(parsedData.pelapor_nik || parsedData.pelapor?.nik),
      pelapor_ttl: sanitizeField(parsedData.pelapor_ttl || parsedData.pelapor?.ttl || (parsedData.pelapor?.tempat_lahir ? `${parsedData.pelapor.tempat_lahir}, ${parsedData.pelapor.tgl_lahir || ''}` : '')),
      pelapor_pekerjaan: sanitizeField(parsedData.pelapor_pekerjaan || parsedData.pelapor?.pekerjaan),
      pelapor_agama: sanitizeField(parsedData.pelapor_agama || parsedData.pelapor?.agama) || 'Islam',
      pelapor_alamat: sanitizeField(parsedData.pelapor_alamat || parsedData.pelapor?.alamat),
      pelapor_kontak: sanitizeField(parsedData.pelapor_kontak || parsedData.pelapor?.telepon || parsedData.pelapor?.kontak || parsedData.pelapor?.no_hp),

      terlapor_list: Array.isArray(parsedData.terlapor_list)
        ? parsedData.terlapor_list.map((t, idx) => ({
            nama: sanitizeField(t.nama),
            nik: sanitizeField(t.nik),
            ttl: sanitizeField(t.ttl),
            pekerjaan: sanitizeField(t.pekerjaan),
            agama: sanitizeField(t.agama) || 'Islam',
            alamat: sanitizeField(t.alamat),
            kontak: sanitizeField(t.kontak || t.telepon || t.no_hp),
            role_label: t.role_label || (idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`),
          }))
        : Array.isArray(parsedData.terlapor)
        ? parsedData.terlapor.map((t, idx) => ({
            nama: sanitizeField(t.nama),
            nik: sanitizeField(t.nik),
            ttl: sanitizeField(t.ttl),
            pekerjaan: sanitizeField(t.pekerjaan),
            agama: sanitizeField(t.agama) || 'Islam',
            alamat: sanitizeField(t.alamat),
            kontak: sanitizeField(t.kontak || t.telepon || t.no_hp),
            role_label: t.role_label || (idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`),
          }))
        : parsedData.terlapor && typeof parsedData.terlapor === 'object'
        ? [{
            nama: sanitizeField(parsedData.terlapor.nama),
            nik: sanitizeField(parsedData.terlapor.nik),
            ttl: sanitizeField(parsedData.terlapor.ttl),
            pekerjaan: sanitizeField(parsedData.terlapor.pekerjaan),
            agama: sanitizeField(parsedData.terlapor.agama) || 'Islam',
            alamat: sanitizeField(parsedData.terlapor.alamat),
            kontak: sanitizeField(parsedData.terlapor.kontak || parsedData.terlapor.telepon),
            role_label: 'Terlapor Utama',
          }]
        : [],

      saksi_list: Array.isArray(parsedData.saksi_list)
        ? parsedData.saksi_list.map((s, idx) => ({
            nama: sanitizeField(s.nama),
            nik: sanitizeField(s.nik),
            ttl: sanitizeField(s.ttl || s.tgl_lahir),
            pekerjaan: sanitizeField(s.pekerjaan),
            agama: sanitizeField(s.agama) || 'Islam',
            alamat: sanitizeField(s.alamat),
            kontak: sanitizeField(s.kontak || s.telepon || s.no_hp),
            role_label: s.role_label || (idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`),
          }))
        : Array.isArray(parsedData.saksi)
        ? parsedData.saksi.map((s, idx) => ({
            nama: sanitizeField(s.nama),
            nik: sanitizeField(s.nik),
            ttl: sanitizeField(s.ttl || s.tgl_lahir),
            pekerjaan: sanitizeField(s.pekerjaan),
            agama: sanitizeField(s.agama) || 'Islam',
            alamat: sanitizeField(s.alamat),
            kontak: sanitizeField(s.kontak || s.telepon || s.no_hp),
            role_label: s.role_label || (idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`),
          }))
        : [],

      tindak_pidana: sanitizeField(parsedData.tindak_pidana || parsedData.perkara?.tindak_pidana),
      pasal_disangkakan: sanitizeField(parsedData.pasal_disangkakan || parsedData.perkara?.pasal_disangkakan || parsedData.perkara?.pasal_sangkaan),
      tempus_delicti: sanitizeField(parsedData.tempus_delicti || parsedData.perkara?.tempus_delicti || parsedData.perkara?.waktu_kejadian),
      locus_delicti: sanitizeField(parsedData.locus_delicti || parsedData.perkara?.locus_delicti || parsedData.perkara?.tempat_kejadian),
      uraian_kejadian: sanitizeField(parsedData.uraian_kejadian || parsedData.perkara?.uraian_kejadian || parsedData.perkara?.uraian_singkat),
    };

    // 5. Mapping langsung ke state struktur Dumas
    const mappedForm = mapOcrResultToDumasForm(normalizedData);

    return {
      success: true,
      data: normalizedData,
      mappedForm,
      modelUsed: resJson.modelUsed || 'serverless-ocr',
      pagesProcessed: images.length,
      error: null,
    };
  } catch (err) {
    console.error('[OCR Client] Error pemindaian surat pengaduan:', err);

    let friendlyMessage = 'Gagal memindai dokumen. Pastikan foto dokumen tegak, tidak buram, dan teks dapat terbaca.';
    const rawMsg = err.message || '';

    if (rawMsg.includes('API_KEY') || rawMsg.includes('403') || rawMsg.includes('UNAUTHENTICATED')) {
      friendlyMessage = 'Kredensial API Gemini belum dikonfigurasi di server atau kuota habis.';
    } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
      friendlyMessage = 'Layanan Google Gemini AI sedang mengalami lonjakan beban. Silakan ulangi dalam beberapa detik.';
    } else if (rawMsg.includes('NetworkError') || rawMsg.includes('Failed to fetch')) {
      friendlyMessage = 'Gagal terhubung ke endpoint backend OCR. Pastikan server dev atau backend aktif.';
    } else if (rawMsg) {
      friendlyMessage = rawMsg;
    }

    return {
      success: false,
      data: null,
      mappedForm: null,
      error: friendlyMessage,
    };
  }
}

/**
 * Helper untuk memetakan hasil OCR ke struktur form state DumasFormView
 * @param {Object} ocrData
 * @returns {Object}
 */
export function mapOcrResultToDumasForm(ocrData) {
  if (!ocrData) return null;

  // 1. Ekstrak Pelapor
  const rawPelapor = ocrData.pelapor || {};
  const mappedPelapor = {
    nama: sanitizeField(ocrData.pelapor_nama || rawPelapor.nama_lengkap || rawPelapor.nama),
    nik: sanitizeField(ocrData.pelapor_nik || rawPelapor.nik),
    ttl: sanitizeField(ocrData.pelapor_ttl || rawPelapor.ttl),
    pekerjaan: sanitizeField(ocrData.pelapor_pekerjaan || rawPelapor.pekerjaan),
    agama: sanitizeField(ocrData.pelapor_agama || rawPelapor.agama) || 'Islam',
    alamat: sanitizeField(ocrData.pelapor_alamat || rawPelapor.alamat),
    kontak: sanitizeField(ocrData.pelapor_kontak || rawPelapor.no_hp || rawPelapor.kontak),
  };

  // 2. Ekstrak Saksi-Saksi
  const rawSaksi = ocrData.saksi_list || ocrData.saksi || [];
  const validSaksi = Array.isArray(rawSaksi)
    ? rawSaksi.filter((s) => s && (s.nama || s.alamat || s.pekerjaan || s.kontak))
    : [];

  const mappedSaksiList =
    validSaksi.length > 0
      ? validSaksi.map((s, idx) => ({
          id: `saksi-ocr-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nama: sanitizeField(s.nama),
          nik: sanitizeField(s.nik),
          ttl: sanitizeField(s.ttl),
          pekerjaan: sanitizeField(s.pekerjaan),
          agama: sanitizeField(s.agama) || 'Islam',
          alamat: sanitizeField(s.alamat),
          kontak: sanitizeField(s.kontak || s.no_hp),
          role_label: idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`,
        }))
      : [
          {
            id: `saksi-1-${Date.now()}`,
            nama: '',
            nik: '',
            ttl: '',
            pekerjaan: '',
            agama: 'Islam',
            alamat: '',
            kontak: '',
            role_label: 'Saksi Fakta',
          },
        ];

  // 3. Ekstrak Terlapor
  const rawTerlapor = ocrData.terlapor_list || ocrData.terlapor || [];
  const validTerlapor = Array.isArray(rawTerlapor)
    ? rawTerlapor.filter((t) => t && (t.nama || t.alamat || t.pekerjaan || t.kontak))
    : [];

  const mappedTerlaporList =
    validTerlapor.length > 0
      ? validTerlapor.map((t, idx) => ({
          id: `terlapor-ocr-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nama: sanitizeField(t.nama),
          nik: sanitizeField(t.nik),
          ttl: sanitizeField(t.ttl),
          pekerjaan: sanitizeField(t.pekerjaan),
          agama: sanitizeField(t.agama) || 'Islam',
          alamat: sanitizeField(t.alamat),
          kontak: sanitizeField(t.kontak || t.no_hp),
          role_label: idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`,
        }))
      : [
          {
            id: `terlapor-1-${Date.now()}`,
            nama: '',
            nik: '',
            ttl: '',
            pekerjaan: '',
            agama: 'Islam',
            alamat: '',
            kontak: '',
            role_label: 'Terlapor Utama',
          },
        ];

  // 4. Ekstrak Perkara & Delik
  const rawPerkara = ocrData.perkara || {};
  const mappedCaseInfo = {
    nomor_surat: sanitizeField(ocrData.nomor_surat || rawPerkara.nomor_surat),
    tanggal_surat: sanitizeField(ocrData.tanggal_surat || rawPerkara.tanggal_surat),
    tindak_pidana: sanitizeField(ocrData.tindak_pidana || rawPerkara.tindak_pidana),
    pasal_disangkakan: sanitizeField(ocrData.pasal_disangkakan || rawPerkara.pasal_disangkakan),
    tempus_delicti: sanitizeField(ocrData.tempus_delicti || rawPerkara.tempus_delicti),
    locus_delicti: sanitizeField(ocrData.locus_delicti || rawPerkara.locus_delicti),
    uraian_kejadian: sanitizeField(ocrData.uraian_kejadian || rawPerkara.uraian_kejadian),
  };

  return {
    pelapor: mappedPelapor,
    saksiList: mappedSaksiList,
    terlaporList: mappedTerlaporList,
    caseInfo: mappedCaseInfo,
    rawExtracted: ocrData,
  };
}

export default {
  scanSuratPengaduan,
  mapOcrResultToDumasForm,
  convertImageToBase64,
  sanitizeField,
  getGeminiApiKey,
};
