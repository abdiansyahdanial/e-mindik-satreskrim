import { GoogleGenAI } from '@google/genai';

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

  // Jika string data URL (contoh: "data:image/jpeg;base64,...")
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('data:')) {
      const match = imageFile.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
    }
    // Asumsi string base64 murni
    return { mimeType: 'image/jpeg', base64: imageFile.replace(/\s+/g, '') };
  }

  // Jika browser File atau Blob
  if (typeof Blob !== 'undefined' && imageFile instanceof Blob) {
    const mimeType = imageFile.type || 'image/jpeg';
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const parts = result.split(',');
          resolve(parts[1] || parts[0]);
        } else {
          reject(new Error('Gagal membaca data berkas gambar.'));
        }
      };
      reader.onerror = () => reject(new Error('Terjadi kesalahan saat membaca file gambar.'));
      reader.readAsDataURL(imageFile);
    });

    return { base64, mimeType };
  }

  // Jika Node.js Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(imageFile)) {
    return { base64: imageFile.toString('base64'), mimeType: 'image/jpeg' };
  }

  // Jika ArrayBuffer
  if (imageFile instanceof ArrayBuffer) {
    const bytes = new Uint8Array(imageFile);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return { base64: btoa(binary), mimeType: 'image/jpeg' };
  }

  throw new Error('Tipe data berkas tidak didukung untuk pemindaian OCR.');
};

/**
 * System Prompt Kedinasan Kepolisian (Satreskrim Polres Kolaka Timur)
 * Mengatur ekstraksi dokumen fisik multi-halaman dengan presisi tinggi.
 */
const SYSTEM_PROMPT_RESRIM = `Anda adalah sistem AI Vision OCR Kepolisian Presisi untuk Satuan Reserse Kriminal (Satreskrim) Polres Kolaka Timur, Polda Sulawesi Tenggara.
Tugas Anda adalah membaca, menganalisis, dan mengekstrak entitas data dari seluruh lembar dokumen fisik Surat Pengaduan Masyarakat / Laporan Polisi (LP) / Berita Acara Penerimaan Laporan secara menyeluruh dan presisi tinggi. Berkas dapat terdiri dari 1 lembar atau beberapa lembar berturut-turut (multi-page).

Pedoman Khusus Administrasi Penyidikan Kepolisian:
1. Pelapor:
   - Ekstrak nama lengkap pelapor (pelapor_nama), NIK 16 digit (pelapor_nik), tempat & tanggal lahir / umur (pelapor_ttl), agama (pelapor_agama), pekerjaan (pelapor_pekerjaan), alamat lengkap domisili (pelapor_alamat), dan nomor telepon/handphone aktif (pelapor_kontak).
2. Saksi (saksi_list):
   - Deteksi secara teliti dari blok klausul "mengajukan saksi sebagai berikut:" ataupun dari narasi kronologis kejadian di mana ada saksi yang melihat, mendengar, atau mengalami langsung peristiwa.
   - Ekstrak setiap saksi: nama, nik, pekerjaan, agama, alamat, dan kontak.
   - ATURAN KHUSUS STRIP: Jika kolom NIK, TTL, atau lainnya pada dokumen fisik bertanda strip ("-"), JANGAN abaikan saksi tersebut. Tetap ekstrak nama, pekerjaan, alamat, dan nomor kontak yang ada, serta isi field kosong atau tanda strip dengan string kosong "".
3. Terlapor (terlapor_list):
   - Deteksi entitas dari kalimat "diduga dilakukan oleh Terlapor:", "terduga pelaku:", serta pihak terkait penerima aliran dana/rekening/rekanan dalam narasi kronologis.
   - Ekstrak setiap terlapor: nama, nik, pekerjaan, agama, alamat, dan kontak. Jika tidak ada NIK/alamat, isi dengan string kosong "".
4. Perkara:
   - tindak_pidana: Nama tindak pidana yang dilaporkan (contoh: Penipuan, Penggelapan, Penganiayaan, Pencurian).
   - pasal_disangkakan: Pasal KUHP atau UU khusus jika tertera (contoh: Pasal 378 KUHP dan/atau Pasal 372 KUHP).
   - tempus_delicti: Waktu kejadian perkara (hari, tanggal, jam).
   - locus_delicti: Tempat kejadian perkara (TKP) lengkap.
   - uraian_kejadian: Susun ringkasan kronologis kejadian yang padat, utuh, faktual, dan berurutan dari awal pertemuan/kesepakatan, pelaksanaan delik, hingga terjadinya kerugian dan pelaporan ke kantor polisi.

Format Output WAJIB berupa JSON valid persis dengan skema:
{
  "pelapor_nama": "",
  "pelapor_nik": "",
  "pelapor_ttl": "",
  "pelapor_pekerjaan": "",
  "pelapor_agama": "",
  "pelapor_alamat": "",
  "pelapor_kontak": "",
  "terlapor_list": [
    {
      "nama": "",
      "nik": "",
      "pekerjaan": "",
      "agama": "",
      "alamat": "",
      "kontak": ""
    }
  ],
  "saksi_list": [
    {
      "nama": "",
      "nik": "",
      "pekerjaan": "",
      "agama": "",
      "alamat": "",
      "kontak": ""
    }
  ],
  "tindak_pidana": "",
  "pasal_disangkakan": "",
  "tempus_delicti": "",
  "locus_delicti": "",
  "uraian_kejadian": ""
}`;

/**
 * Pindai lembar berkas fisik surat pengaduan / LP menggunakan Google Gemini Vision.
 * Mendukung berkas tunggal (File) maupun multi-halaman (File[] / Blob[]).
 *
 * @param {File|File[]|Blob|Blob[]|string|string[]} files - Berkas tunggal atau array berkas multi-halaman
 * @param {Object} [options={}] - Konfigurasi tambahan
 * @returns {Promise<{
 *   success: boolean,
 *   data: Object|null,
 *   mappedForm?: Object|null,
 *   modelUsed?: string,
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

  // 2. Validasi API Key
  const apiKey = options.apiKey || getGeminiApiKey();
  if (!apiKey) {
    const errorMsg = 'API Key Google Gemini belum terpasang. Harap tambahkan VITE_GEMINI_API_KEY pada file .env.';
    console.error('[Gemini OCR]', errorMsg);
    return {
      success: false,
      data: null,
      error: errorMsg,
    };
  }

  try {
    // 3. Konversi seluruh file gambar menjadi array inlineData Base64
    const inlineDataParts = await Promise.all(
      fileList.map(async (file, index) => {
        try {
          const { base64, mimeType } = await convertImageToBase64(file);
          return {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64,
            },
          };
        } catch (convErr) {
          throw new Error(`Gagal mengonversi lembar ke-${index + 1}: ${convErr.message}`);
        }
      })
    );

    // 4. Inisialisasi GoogleGenAI Client
    const ai = new GoogleGenAI({ apiKey });

    // Daftar model vision:
    // Sesuai instruksi menggunakan gemini-2.5-flash, dengan fallback otomatis ke gemini-3.6-flash / gemini-3.8-flash / gemini-flash-latest
    const candidateModels = options.model
      ? [options.model, 'gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite']
      : ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];

    let response = null;
    let lastError = null;
    let selectedModel = candidateModels[0];

    const promptText = `Berikut adalah ${inlineDataParts.length} lembar berkas fisik surat pengaduan / laporan polisi. Analisis seluruh lembar dokumen ini secara terpadu dan ekstrak data sesuai skema JSON kedinasan Reskrim.`;

    for (const model of candidateModels) {
      try {
        selectedModel = model;
        response = await ai.models.generateContent({
          model,
          contents: [
            ...inlineDataParts,
            promptText,
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT_RESRIM,
            responseMimeType: 'application/json',
            temperature: 0.1, // Presisi tinggi & faktual
          },
        });

        if (response && response.text) {
          break; // Sukses mendapatkan respons
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini OCR] Model ${model} gagal:`, err.message);
        // Jika status 503 (Overloaded) beri jeda backoff sejenak sebelum mencoba model berikutnya
        if (err.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE'))) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Gagal menerima respons dari Gemini AI.');
    }

    // 5. Parse Output JSON
    let parsedData = null;
    const rawText = response.text.trim();

    try {
      parsedData = JSON.parse(rawText);
    } catch {
      // Pembersihan jika ada markdown fence ```json ... ```
      const cleanedText = rawText
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
      parsedData = JSON.parse(cleanedText);
    }

    // 6. Normalisasi skema data (Mendukung skema flat maupun nested)
    const normalizedData = {
      pelapor_nama: sanitizeField(parsedData.pelapor_nama || parsedData.pelapor?.nama_lengkap || parsedData.pelapor?.nama),
      pelapor_nik: sanitizeField(parsedData.pelapor_nik || parsedData.pelapor?.nik),
      pelapor_ttl: sanitizeField(parsedData.pelapor_ttl || parsedData.pelapor?.ttl),
      pelapor_pekerjaan: sanitizeField(parsedData.pelapor_pekerjaan || parsedData.pelapor?.pekerjaan),
      pelapor_agama: sanitizeField(parsedData.pelapor_agama || parsedData.pelapor?.agama) || 'Islam',
      pelapor_alamat: sanitizeField(parsedData.pelapor_alamat || parsedData.pelapor?.alamat),
      pelapor_kontak: sanitizeField(parsedData.pelapor_kontak || parsedData.pelapor?.no_hp || parsedData.pelapor?.kontak),

      terlapor_list: Array.isArray(parsedData.terlapor_list)
        ? parsedData.terlapor_list.map((t) => ({
            nama: sanitizeField(t.nama),
            nik: sanitizeField(t.nik),
            pekerjaan: sanitizeField(t.pekerjaan),
            agama: sanitizeField(t.agama) || 'Islam',
            alamat: sanitizeField(t.alamat),
            kontak: sanitizeField(t.kontak || t.no_hp),
          }))
        : Array.isArray(parsedData.terlapor)
        ? parsedData.terlapor.map((t) => ({
            nama: sanitizeField(t.nama),
            nik: sanitizeField(t.nik),
            pekerjaan: sanitizeField(t.pekerjaan),
            agama: sanitizeField(t.agama) || 'Islam',
            alamat: sanitizeField(t.alamat),
            kontak: sanitizeField(t.kontak || t.no_hp),
          }))
        : [],

      saksi_list: Array.isArray(parsedData.saksi_list)
        ? parsedData.saksi_list.map((s) => ({
            nama: sanitizeField(s.nama),
            nik: sanitizeField(s.nik),
            pekerjaan: sanitizeField(s.pekerjaan),
            agama: sanitizeField(s.agama) || 'Islam',
            alamat: sanitizeField(s.alamat),
            kontak: sanitizeField(s.kontak || s.no_hp),
          }))
        : Array.isArray(parsedData.saksi)
        ? parsedData.saksi.map((s) => ({
            nama: sanitizeField(s.nama),
            nik: sanitizeField(s.nik),
            pekerjaan: sanitizeField(s.pekerjaan),
            agama: sanitizeField(s.agama) || 'Islam',
            alamat: sanitizeField(s.alamat),
            kontak: sanitizeField(s.kontak || s.no_hp),
          }))
        : [],

      tindak_pidana: sanitizeField(parsedData.tindak_pidana || parsedData.perkara?.tindak_pidana),
      pasal_disangkakan: sanitizeField(parsedData.pasal_disangkakan || parsedData.perkara?.pasal_disangkakan),
      tempus_delicti: sanitizeField(parsedData.tempus_delicti || parsedData.perkara?.tempus_delicti),
      locus_delicti: sanitizeField(parsedData.locus_delicti || parsedData.perkara?.locus_delicti),
      uraian_kejadian: sanitizeField(parsedData.uraian_kejadian || parsedData.perkara?.uraian_kejadian),
    };

    // 7. Mapping langsung ke state struktur Dumas
    const mappedForm = mapOcrResultToDumasForm(normalizedData);

    return {
      success: true,
      data: normalizedData,
      mappedForm,
      modelUsed: selectedModel,
      pagesProcessed: inlineDataParts.length,
      error: null,
    };
  } catch (err) {
    console.error('[Gemini OCR] Error pemindaian surat pengaduan:', err);

    let friendlyMessage = 'Gagal memindai dokumen. Pastikan foto dokumen tegak, tidak buram, dan teks dapat terbaca.';
    const rawMsg = err.message || '';

    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('403') || rawMsg.includes('UNAUTHENTICATED')) {
      friendlyMessage = 'API Key Gemini tidak valid atau kuota habis. Periksa konfigurasi VITE_GEMINI_API_KEY.';
    } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
      friendlyMessage = 'Layanan Google Gemini AI sedang mengalami lonjakan beban. Silakan ulangi dalam beberapa detik.';
    } else if (rawMsg.includes('NetworkError') || rawMsg.includes('Failed to fetch')) {
      friendlyMessage = 'Gagal terhubung ke server Google AI. Periksa koneksi internet Anda.';
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
