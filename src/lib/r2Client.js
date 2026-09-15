import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Default Configuration & Fallbacks
 */
const DEFAULT_BUCKET = 'emindik-storage';
const DEFAULT_ACCOUNT_ID = '18927f2f5d2b4e49a1c521c5c7e73073';
const DEFAULT_ENDPOINT = 'https://18927f2f5d2b4e49a1c521c5c7e73073.r2.cloudflarestorage.com';

/**
 * Safely retrieve environment variables across Vite (import.meta.env)
 * and Node.js / Serverless environments (process.env).
 *
 * @param {string} key - Environment variable name
 * @param {string} [fallback=''] - Fallback value
 * @returns {string}
 */
export const getEnvVar = (key, fallback = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env[key] !== undefined && import.meta.env[key] !== '') {
        return String(import.meta.env[key]).trim();
      }
      const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
      if (import.meta.env[viteKey] !== undefined && import.meta.env[viteKey] !== '') {
        return String(import.meta.env[viteKey]).trim();
      }
    }
  } catch {
    // Silently continue to process.env check
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[key] !== undefined && process.env[key] !== '') {
        return String(process.env[key]).trim();
      }
      const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
      if (process.env[viteKey] !== undefined && process.env[viteKey] !== '') {
        return String(process.env[viteKey]).trim();
      }
    }
  } catch {
    // Ignore error in non-Node environments
  }

  return fallback;
};

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
 * Normalizes file input (Blob, File, ArrayBuffer, Uint8Array, Buffer)
 * into a format accepted by AWS S3 Client.
 *
 * @param {any} fileInput
 * @returns {Promise<Uint8Array|string|null>}
 */
const normalizeFileBody = async (fileInput) => {
  if (!fileInput) return null;

  // Browser Blob / File
  if (typeof Blob !== 'undefined' && fileInput instanceof Blob) {
    const arrayBuffer = await fileInput.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  // ArrayBuffer
  if (fileInput instanceof ArrayBuffer) {
    return new Uint8Array(fileInput);
  }

  // Uint8Array or Buffer
  if (fileInput instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileInput))) {
    return fileInput;
  }

  // Raw string / text
  if (typeof fileInput === 'string') {
    return fileInput;
  }

  return fileInput;
};

/**
 * Singleton instance of S3Client for R2
 */
let r2ClientInstance = null;

/**
 * Inisialisasi S3Client menggunakan kredensial Cloudflare R2.
 * Menjamin null-safety dan error fallback jika kredensial tidak lengkap.
 *
 * @returns {S3Client|null}
 */
export const getR2Client = () => {
  if (r2ClientInstance) return r2ClientInstance;

  const accountId = getEnvVar('R2_ACCOUNT_ID', DEFAULT_ACCOUNT_ID);
  const accessKeyId = getEnvVar('R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnvVar('R2_SECRET_ACCESS_KEY');
  const endpoint = getEnvVar('R2_ENDPOINT') || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accessKeyId || !secretAccessKey) {
    console.warn(
      '[R2 Storage] Kredensial R2 belum lengkap. Pastikan R2_ACCESS_KEY_ID dan R2_SECRET_ACCESS_KEY terisi di .env.'
    );
    return null;
  }

  try {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    return r2ClientInstance;
  } catch (err) {
    console.error('[R2 Storage] Gagal menginisialisasi S3Client Cloudflare R2:', err);
    return null;
  }
};

/**
 * Mengembalikan ringkasan status konfigurasi R2 (tanpa membocorkan secret key).
 * Berguna untuk diagnostik koneksi dan healthcheck UI.
 *
 * @returns {Object}
 */
export const getR2ConfigStatus = () => {
  const accountId = getEnvVar('R2_ACCOUNT_ID', DEFAULT_ACCOUNT_ID);
  const accessKeyId = getEnvVar('R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnvVar('R2_SECRET_ACCESS_KEY');
  const bucketName = getEnvVar('R2_BUCKET_NAME', DEFAULT_BUCKET);
  const endpoint = getEnvVar('R2_ENDPOINT', DEFAULT_ENDPOINT);

  const isConfigured = Boolean(accessKeyId && secretAccessKey);

  return {
    isConfigured,
    bucketName,
    endpoint,
    accountId: accountId ? `${accountId.slice(0, 6)}...` : 'Not set',
    accessKeyId: accessKeyId ? `${accessKeyId.slice(0, 6)}...` : 'Not set',
  };
};

/**
 * Mengunggah file (PDF, JPG, DOCX, dll.) ke bucket Cloudflare R2 dengan metadata lengkap.
 *
 * @param {Blob|File|Uint8Array|ArrayBuffer|Buffer|string} fileBuffer - Berkas fisik atau buffer file
 * @param {string} fileName - Nama / path target file di bucket (misal: "berkas_perkara/LP-01-2026/berkas.pdf")
 * @param {string} [mimeType=''] - Tipe konten MIME (opsional, auto-detected jika kosong)
 * @param {Object} [options={}] - Opsi tambahan (metadata, bucketName, originalName, urlExpiresIn)
 * @returns {Promise<{
 *   success: boolean,
 *   key: string,
 *   url: string|null,
 *   bucket: string,
 *   size?: number,
 *   contentType?: string,
 *   etag?: string,
 *   error: string|null
 * }>}
 */
export async function uploadFileToR2(fileBuffer, fileName, mimeType = '', options = {}) {
  // 1. Validasi input dasar
  if (!fileBuffer) {
    const errorMsg = 'File buffer atau blob tidak boleh kosong.';
    console.warn('[R2 Storage] uploadFileToR2:', errorMsg);
    return { success: false, key: fileName || '', url: null, bucket: '', error: errorMsg };
  }

  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    const errorMsg = 'Parameter fileName wajib berupa string nama file yang valid.';
    console.warn('[R2 Storage] uploadFileToR2:', errorMsg);
    return { success: false, key: '', url: null, bucket: '', error: errorMsg };
  }

  const cleanKey = fileName.trim().replace(/^\/+/, '');
  const bucketName = options.bucketName || getEnvVar('R2_BUCKET_NAME', DEFAULT_BUCKET);

  // 2. Inisialisasi client S3 R2
  const client = getR2Client();
  if (!client) {
    const errorMsg = 'Klien Cloudflare R2 tidak siap. Periksa kredensial R2 di file .env.';
    console.warn('[R2 Storage] uploadFileToR2:', errorMsg);
    return { success: false, key: cleanKey, url: null, bucket: bucketName, error: errorMsg };
  }

  try {
    // 3. Normalisasi data biner dan MIME Type
    const normalizedBody = await normalizeFileBody(fileBuffer);
    const resolvedMime = mimeType || fileBuffer.type || detectMimeType(cleanKey);
    const fileSize =
      normalizedBody?.byteLength ??
      normalizedBody?.length ??
      (typeof fileBuffer.size === 'number' ? fileBuffer.size : undefined);

    // 4. Susun Metadata resmi dokumen perkara
    const metadata = {
      uploadedAt: new Date().toISOString(),
      originalName: options.originalName || cleanKey.split('/').pop() || 'document',
      mimeType: resolvedMime,
      ...(options.metadata || {}),
    };

    // Pastikan seluruh nilai metadata berupa string (syarat AWS S3 / R2)
    const sanitizedMetadata = {};
    for (const [k, v] of Object.entries(metadata)) {
      sanitizedMetadata[k] = String(v ?? '');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: normalizedBody,
      ContentType: resolvedMime || 'application/octet-stream',
      Metadata: sanitizedMetadata,
    });

    const response = await client.send(command);

    // 5. Generate URL Pratinjau (Presigned URL)
    const fileUrl = await getR2FileUrl(cleanKey, {
      bucketName,
      expiresIn: options.urlExpiresIn || 3600 * 24 * 7, // 7 hari untuk berkas perkara baru
    });

    return {
      success: true,
      key: cleanKey,
      bucket: bucketName,
      url: fileUrl,
      size: fileSize,
      contentType: resolvedMime,
      etag: response?.ETag,
      error: null,
    };
  } catch (err) {
    console.error(`[R2 Storage] Error mengunggah file '${cleanKey}' ke R2:`, err);
    return {
      success: false,
      key: cleanKey,
      bucket: bucketName,
      url: null,
      error: err?.message || 'Terjadi kegagalan saat mengunggah berkas ke Cloudflare R2.',
    };
  }
}

/**
 * Mengembalikan URL publik atau Presigned URL untuk pratinjau berkas perkara.
 *
 * @param {string} fileName - Nama / key file di bucket R2
 * @param {Object} [options={}] - Opsi URL (expiresIn dalam detik, bucketName, forcePresigned, publicUrl)
 * @returns {Promise<string|null>}
 */
export async function getR2FileUrl(fileName, options = {}) {
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    console.warn('[R2 Storage] getR2FileUrl: Parameter fileName tidak valid.');
    return null;
  }

  const cleanKey = fileName.trim().replace(/^\/+/, '');
  const publicBaseUrl = options.publicUrl || getEnvVar('R2_PUBLIC_URL');

  // Jika URL domain publik Cloudflare R2 disetel dan tidak memaksa presigned URL
  if (publicBaseUrl && !options.forcePresigned) {
    const formattedBase = publicBaseUrl.replace(/\/$/, '');
    return `${formattedBase}/${cleanKey}`;
  }

  const client = getR2Client();
  if (!client) {
    console.warn('[R2 Storage] getR2FileUrl: Klien Cloudflare R2 tidak siap.');
    return null;
  }

  const bucketName = options.bucketName || getEnvVar('R2_BUCKET_NAME', DEFAULT_BUCKET);
  const expiresIn = options.expiresIn || 3600; // Default 1 jam

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      ResponseContentType: options.contentType || detectMimeType(cleanKey),
      ResponseContentDisposition: options.contentDisposition,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn });
    return presignedUrl;
  } catch (err) {
    console.error(`[R2 Storage] Gagal menghasilkan presigned URL untuk '${cleanKey}':`, err);
    return null;
  }
}

/**
 * Memeriksa apakah berkas perkara tersedia di Cloudflare R2.
 *
 * @param {string} fileName - Nama / key file di bucket R2
 * @param {Object} [options={}]
 * @returns {Promise<boolean>}
 */
export async function checkR2FileExists(fileName, options = {}) {
  if (!fileName) return false;
  const client = getR2Client();
  if (!client) return false;

  const cleanKey = fileName.trim().replace(/^\/+/, '');
  const bucketName = options.bucketName || getEnvVar('R2_BUCKET_NAME', DEFAULT_BUCKET);

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Menghapus berkas dari Cloudflare R2 secara aman.
 *
 * @param {string} fileName - Nama / key file di bucket R2
 * @param {Object} [options={}]
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteR2File(fileName, options = {}) {
  if (!fileName) return { success: false, error: 'Nama file kosong.' };
  const client = getR2Client();
  if (!client) return { success: false, error: 'Klien R2 tidak tersedia.' };

  const cleanKey = fileName.trim().replace(/^\/+/, '');
  const bucketName = options.bucketName || getEnvVar('R2_BUCKET_NAME', DEFAULT_BUCKET);

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
      })
    );
    return { success: true, error: null };
  } catch (err) {
    console.error(`[R2 Storage] Gagal menghapus file '${cleanKey}':`, err);
    return { success: false, error: err?.message || 'Gagal menghapus file dari R2.' };
  }
}

export default {
  getR2Client,
  uploadFileToR2,
  getR2FileUrl,
  checkR2FileExists,
  deleteR2File,
  detectMimeType,
  getR2ConfigStatus,
};
