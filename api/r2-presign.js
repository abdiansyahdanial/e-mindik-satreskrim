import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Inisialisasi S3Client Cloudflare R2 secara dinamis berdasarkan process.env saat request
 */
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID || '18927f2f5d2b4e49a1c521c5c7e73073';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Kredensial Cloudflare R2 (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) belum disetel di server.');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export default async function handler(req, res) {
  // Setup CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  try {
    const s3 = getR2Client();

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const fileName = body.fileName || body.filename;
    const contentType = body.contentType || body.fileType || body.mimeType || 'image/jpeg';
    const folder = (body.folder || 'barang-bukti').replace(/^\/+|\/+$/g, '');

    const cleanFileName = (fileName || `evidence_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${Date.now()}_${cleanFileName}`;
    const bucketName = process.env.R2_BUCKET_NAME || 'emindik-storage';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // URL publik Cloudflare R2 untuk render gambar langsung di browser (r2.dev / public domain)
    const accountId = process.env.R2_ACCOUNT_ID || '18927f2f5d2b4e49a1c521c5c7e73073';
    const publicBaseUrl = (process.env.R2_PUBLIC_URL || `https://pub-${accountId}.r2.dev`).replace(/\/+$/, '');
    const fileUrl = `${publicBaseUrl}/${key}`;

    return res.status(200).json({
      success: true,
      uploadUrl,
      fileUrl,
      url: fileUrl,
      publicUrl: fileUrl,
      key,
    });
  } catch (err) {
    console.error('R2 Presign Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal membuat presigned URL Cloudflare R2.' });
  }
}
