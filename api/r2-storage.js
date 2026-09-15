import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.VITE_R2_ACCOUNT_ID || '18927f2f5d2b4e49a1c521c5c7e73073';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME || 'emindik-storage';
const R2_ENDPOINT = process.env.R2_ENDPOINT || process.env.VITE_R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

function getS3() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are not configured.');
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
 * Serverless / Dev API Endpoint for Cloudflare R2 operations
 * Endpoints:
 * - POST /api/r2-storage with { action: 'upload', fileName, fileBase64, mimeType }
 * - POST /api/r2-storage with { action: 'get-url', fileName }
 * - POST /api/r2-storage with { action: 'get-upload-url', fileName, mimeType }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const s3 = getS3();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action || (req.method === 'GET' ? 'get-url' : 'upload');

    // Action: Get download / preview presigned URL
    if (action === 'get-url') {
      const fileName = body.fileName || req.query?.fileName;
      if (!fileName) {
        res.status(400).json({ error: 'Parameter fileName is required.' });
        return;
      }
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName.replace(/^\/+/, ''),
      });
      const url = await getSignedUrl(s3, command, { expiresIn: body.expiresIn || 3600 });
      res.status(200).json({ success: true, url, fileName });
      return;
    }

    // Action: Get Presigned PUT URL for direct client upload
    if (action === 'get-upload-url') {
      const { fileName, mimeType } = body;
      if (!fileName) {
        res.status(400).json({ error: 'Parameter fileName is required.' });
        return;
      }
      const cleanKey = fileName.replace(/^\/+/, '');
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: cleanKey,
        ContentType: mimeType || 'application/octet-stream',
      });
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
      res.status(200).json({ success: true, uploadUrl, key: cleanKey, bucket: R2_BUCKET_NAME });
      return;
    }

    // Action: Upload base64 buffer directly via backend
    if (action === 'upload') {
      const { fileName, fileBase64, mimeType, metadata } = body;
      if (!fileName || !fileBase64) {
        res.status(400).json({ error: 'fileName and fileBase64 are required for upload action.' });
        return;
      }

      const buffer = Buffer.from(fileBase64, 'base64');
      const cleanKey = fileName.replace(/^\/+/, '');

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: cleanKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...(metadata || {}),
        },
      });

      await s3.send(command);

      // Generate preview URL
      const getCmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: cleanKey });
      const previewUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 * 24 * 7 });

      res.status(200).json({
        success: true,
        key: cleanKey,
        bucket: R2_BUCKET_NAME,
        url: previewUrl,
        size: buffer.length,
      });
      return;
    }

    // Action: Delete file
    if (action === 'delete') {
      const { fileName } = body;
      if (!fileName) {
        res.status(400).json({ error: 'fileName is required.' });
        return;
      }
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName.replace(/^\/+/, ''),
      });
      await s3.send(command);
      res.status(200).json({ success: true, message: `File ${fileName} deleted.` });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[API r2-storage] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during R2 storage operation.',
    });
  }
}
