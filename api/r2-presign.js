import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '18927f2f5d2b4e49a1c521c5c7e73073';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'emindik-storage';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Inisialisasi client S3 khusus Cloudflare R2 di sisi server/serverless
 */
function getR2S3Client() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Kredensial Cloudflare R2 (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) belum disetel di server.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Serverless Function: Generate Presigned PUT URL untuk Cloudflare R2
 * Menerima POST request berisi:
 * {
 *   filename: string, // misal "bukti_transfer.pdf"
 *   fileType: string, // misal "application/pdf"
 *   folder?: string   // opsional, default "dumas/lampiran"
 * }
 */
export default async function handler(req, res) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Gunakan POST atau GET.' });
    return;
  }

  try {
    const s3 = getR2S3Client();

    // Normalisasi parameter dari body atau query string
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const filename = body.filename || body.fileName || req.query?.filename || req.query?.fileName;
    const fileType = body.fileType || body.mimeType || req.query?.fileType || req.query?.mimeType || 'application/octet-stream';
    const folder = (body.folder || req.query?.folder || 'dumas/lampiran').replace(/^\/+|\/+$/g, '');

    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      res.status(400).json({ error: 'Parameter filename wajib diisi.' });
      return;
    }

    // Bersihkan karakter nama berkas dan buat key unik
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeBaseName = filename.trim().split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${folder}/${timestamp}-${randomSuffix}-${safeBaseName}`;

    // Buat PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      ContentType: fileType,
      Metadata: {
        originalName: safeBaseName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Masa berlaku presigned URL: 300 detik (5 menit) sesuai standar keamanan
    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn });

    // Tentukan URL publik akses file
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${storageKey}`
      : `${R2_ENDPOINT.replace(/\/+$/, '')}/${R2_BUCKET_NAME}/${storageKey}`;

    res.status(200).json({
      success: true,
      uploadUrl,
      publicUrl,
      filePath: storageKey,
      key: storageKey,
      bucket: R2_BUCKET_NAME,
      expiresIn,
    });
  } catch (err) {
    console.error('[R2 Presign Serverless] Error saat membuat presigned URL:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal menghasilkan presigned URL Cloudflare R2.',
    });
  }
}
