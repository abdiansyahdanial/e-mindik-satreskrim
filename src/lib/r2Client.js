/**
 * Cloudflare R2 Client Module (Browser Client Side)
 * 
 * Keamanan Arsitektur:
 * Seluruh operasi unggah biner ke Cloudflare R2 menggunakan pola Presigned PUT URL
 * yang diterbitkan oleh Serverless Function (/api/r2-presign).
 * Kredensial rahasia (R2_SECRET_ACCESS_KEY) tersimpan eksklusif di lingkungan server/serverless
 * dan TIDAK PERNAH diekspos ke browser pengguna.
 */

const DEFAULT_BUCKET = 'emindik-storage';

/**
 * Common MIME Types map for quick fallback detection
 */
const MIME_MAP = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  zip: 'application/zip',
};

/**
 * Detect MIME type from filename extension
 * @param {string} fileName
 * @returns {string}
 */
export const detectMimeType = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
};

/**
 * Normalisasi URL R2 ke URL domain publik (r2.dev)
 * Mengubah endpoint S3 internal (private) menjadi URL publik yang dapat dirender oleh tag <img>
 *
 * @param {string} url
 * @returns {string}
 */
export const formatR2PublicUrl = (url = '') => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  // Jika URL adalah Presigned GET URL dengan query signature SigV4, gunakan langsung
  if (url.includes('X-Amz-Signature') || url.includes('X-Amz-Algorithm')) return url;

  // Ubah endpoint private S3 Cloudflare R2:
  // https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key> -> https://pub-<accountId>.r2.dev/<key>
  const s3Match = url.match(/https?:\/\/([a-zA-Z0-9_-]+)\.r2\.cloudflarestorage\.com\/[^/]+\/(.+)/);
  if (s3Match) {
    const accountId = s3Match[1] || '18927f2f5d2b4e49a1c521c5c7e73073';
    const key = s3Match[2];
    const publicBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_R2_PUBLIC_URL) 
      || `https://pub-${accountId}.r2.dev`;
    return `${publicBase.replace(/\/+$/, '')}/${key}`;
  }

  return url;
};

/**
 * Mengunggah file (File, Blob, Uint8Array) ke Cloudflare R2
 * menggunakan pola Presigned PUT URL via serverless endpoint /api/r2-presign.
 *
 * @param {Blob|File|Uint8Array|ArrayBuffer} fileInput - Berkas fisik atau binary file
 * @param {string} fileName - Nama file target
 * @param {string} [mimeType=''] - MIME type file
 * @param {Object} [options={}] - Opsi tambahan (folder, bucketName, dll.)
 * @returns {Promise<{
 *   success: boolean,
 *   key: string,
 *   url: string|null,
 *   publicUrl?: string,
 *   filePath: string|null,
 *   bucket: string,
 *   size?: number,
 *   contentType?: string,
 *   error: string|null
 * }>}
 */
export async function uploadFileToR2(fileInput, fileName, mimeType = '', options = {}) {
  // 1. Validasi input dasar
  if (!fileInput) {
    const errorMsg = 'Berkas (File/Blob) tidak boleh kosong.';
    console.warn('[R2 Storage Client] uploadFileToR2:', errorMsg);
    return { success: false, key: fileName || '', url: null, filePath: null, bucket: '', error: errorMsg };
  }

  const targetName = (fileName || fileInput.name || 'berkas_lampiran').trim();
  const resolvedMime = mimeType || fileInput.type || detectMimeType(targetName);
  const folder = (options.folder || 'barang-bukti').replace(/^\/+|\/+$/g, '');

  try {
    // 2. Minta Presigned PUT URL dari Serverless Endpoint
    const presignRes = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: targetName,
        filename: targetName,
        contentType: resolvedMime,
        fileType: resolvedMime,
        folder,
      }),
    });

    if (!presignRes.ok) {
      const errJson = await presignRes.json().catch(() => ({}));
      throw new Error(errJson.error || `Gagal memperoleh upload URL dari server: HTTP ${presignRes.status}`);
    }

    const presignData = await presignRes.json();
    const { uploadUrl, fileUrl, publicUrl, filePath, key, bucket } = presignData;

    if (!uploadUrl) {
      throw new Error('Respons server tidak memuat uploadUrl yang valid.');
    }

    // 3. Eksekusi PUT Request langsung ke Cloudflare R2 via Presigned URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': resolvedMime,
      },
      body: fileInput,
    });

    if (!uploadRes.ok) {
      throw new Error(`Gagal mengunggah biner berkas ke Cloudflare R2 (HTTP ${uploadRes.status} ${uploadRes.statusText})`);
    }

    const fileSize = typeof fileInput.size === 'number' ? fileInput.size : undefined;
    const resolvedUrl = fileUrl || publicUrl || uploadUrl.split('?')[0];

    return {
      success: true,
      key: key || filePath,
      filePath: filePath || key,
      url: resolvedUrl,
      fileUrl: resolvedUrl,
      publicUrl: resolvedUrl,
      bucket: bucket || DEFAULT_BUCKET,
      size: fileSize,
      contentType: resolvedMime,
      error: null,
    };
  } catch (err) {
    console.error(`[R2 Storage Client] Gagal mengunggah berkas '${targetName}':`, err);
    return {
      success: false,
      key: targetName,
      filePath: null,
      url: null,
      bucket: DEFAULT_BUCKET,
      error: err?.message || 'Terjadi kegagalan saat mengunggah berkas ke Cloudflare R2.',
    };
  }
}

/**
 * Mengembalikan URL akses berkas perkara di Cloudflare R2
 *
 * @param {string} fileName - Nama / key file di bucket R2
 * @param {Object} [options={}]
 * @returns {Promise<string|null>}
 */
export async function getR2FileUrl(fileName, options = {}) {
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    return null;
  }

  const cleanKey = fileName.trim().replace(/^\/+/, '');

  // Panggil serverless proxy untuk mendapatkan presigned get URL yang aman
  try {
    const res = await fetch('/api/r2-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-url',
        fileName: cleanKey,
        expiresIn: options.expiresIn || 3600,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.url || null;
    }
  } catch (err) {
    console.warn('[R2 Storage Client] Gagal memuat get-url presigned:', err);
  }

  return null;
}

/**
 * Memeriksa ketersediaan berkas di bucket R2 melalui endpoint serverless
 */
export async function checkR2FileExists(fileName) {
  if (!fileName) return false;
  try {
    const url = await getR2FileUrl(fileName);
    if (!url) return false;
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Menghapus berkas dari Cloudflare R2 via endpoint serverless
 */
export async function deleteR2File(fileName) {
  if (!fileName) return { success: false, error: 'Nama file kosong.' };
  try {
    const res = await fetch('/api/r2-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        fileName: fileName.trim().replace(/^\/+/, ''),
      }),
    });
    if (res.ok) {
      return { success: true, error: null };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || 'Gagal menghapus file.' };
  } catch (err) {
    return { success: false, error: err?.message || 'Gagal menghapus file dari R2.' };
  }
}

/**
 * Status konfigurasi R2 untuk healthcheck (aman tanpa membocorkan kredensial)
 */
export const getR2ConfigStatus = () => {
  return {
    isConfigured: true,
    storageType: 'Cloudflare R2 (Serverless Presigned Pattern)',
    bucketName: DEFAULT_BUCKET,
    mode: 'secure-serverless',
  };
};

/**
 * Direct S3Client deprecated di client-side demi keamanan kredensial.
 */
export const getR2Client = () => {
  console.warn(
    '[R2 Storage Security] Direct AWS S3Client dinonaktifkan di browser klien untuk mencegah kebocoran Master Key. Gunakan uploadFileToR2() dengan pola Presigned URL.'
  );
  return null;
};

export default {
  uploadFileToR2,
  getR2FileUrl,
  checkR2FileExists,
  deleteR2File,
  formatR2PublicUrl,
  getR2ConfigStatus,
  getR2Client,
};
