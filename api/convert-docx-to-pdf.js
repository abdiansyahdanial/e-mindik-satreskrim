/**
 * Main conversion pipeline:
 * Converts DOCX buffer to PDF via Gotenberg microservice when GOTENBERG_URL is configured.
 * Manual XML extraction and fabricated PDF fallback are disabled to preserve 100% native Word structure.
 */
export async function convertDocxBufferToPdf(docxBuffer) {
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (gotenbergUrl) {
    const formData = new FormData();
    formData.append('files', new Blob([docxBuffer]), 'document.docx');

    const response = await fetch(`${gotenbergUrl.replace(/\/$/, '')}/forms/libreoffice/convert`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      const arrayBuf = await response.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
    throw new Error(`Gotenberg conversion failed with status ${response.status}`);
  }

  throw new Error('GOTENBERG_URL tidak dikonfigurasi. Gunakan client-side docx-preview untuk pratinjau .docx asli.');
}

/**
 * Vercel Serverless Function Configuration
 * Allow up to 20MB request/response payloads to prevent 413 Payload Too Large
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '20mb',
  },
};

/**
 * Vercel Serverless Function Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed. Gunakan POST.' });
  }

  try {
    let docxBuffer = null;

    // 1. Check if payload contains Supabase Storage path/URL (Fallback direct from Supabase)
    let jsonBody = null;
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      jsonBody = req.body;
    } else if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        jsonBody = JSON.parse(req.body);
      } catch {
        jsonBody = null;
      }
    }

    if (jsonBody && jsonBody.docxBase64) {
      docxBuffer = Buffer.from(jsonBody.docxBase64, 'base64');
    } else if (jsonBody && (jsonBody.storagePath || jsonBody.fileUrl)) {
      const supabaseBaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
      if (!jsonBody.fileUrl && !jsonBody.storagePath.startsWith('http') && !supabaseBaseUrl) {
        return res.status(500).json({ error: 'Konfigurasi VITE_SUPABASE_URL / SUPABASE_URL belum diatur di server.' });
      }
      const targetUrl = jsonBody.fileUrl || (
        jsonBody.storagePath.startsWith('http')
          ? jsonBody.storagePath
          : `${supabaseBaseUrl}/storage/v1/object/public/${jsonBody.storagePath.includes('/') ? jsonBody.storagePath : 'templates/' + jsonBody.storagePath}`
      );
      const sRes = await fetch(targetUrl);
      if (!sRes.ok) {
        throw new Error(`Gagal mengunduh file dari Supabase Storage (${sRes.status}): ${sRes.statusText}`);
      }
      const ab = await sRes.arrayBuffer();
      docxBuffer = Buffer.from(ab);
    }

    // 2. If not parsed from JSON, read raw buffer / FormData / multipart stream
    if (!docxBuffer) {
      let rawBuffer = null;
      if (Buffer.isBuffer(req.body)) {
        rawBuffer = req.body;
      } else if (typeof req.body === 'string') {
        rawBuffer = Buffer.from(req.body, 'binary');
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        rawBuffer = Buffer.concat(chunks);
      }

      if (rawBuffer && rawBuffer.length > 0) {
        // Extract pure ZIP bytes (DOCX magic: PK\x03\x04 = 0x50 0x4B 0x03 0x04)
        const zipMagic = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
        const zipIndex = rawBuffer.indexOf(zipMagic);

        if (zipIndex !== -1) {
          const endOfCentralDir = Buffer.from([0x50, 0x4B, 0x05, 0x06]);
          const eocdIndex = rawBuffer.lastIndexOf(endOfCentralDir);

          if (eocdIndex !== -1 && eocdIndex >= zipIndex) {
            const commentLength = (rawBuffer.length > eocdIndex + 21)
              ? rawBuffer.readUInt16LE(eocdIndex + 20)
              : 0;
            const zipLength = (eocdIndex + 22 + commentLength) - zipIndex;
            docxBuffer = rawBuffer.subarray(zipIndex, zipIndex + zipLength);
          } else {
            docxBuffer = rawBuffer.subarray(zipIndex);
          }
        } else {
          docxBuffer = rawBuffer;
        }
      }
    }

    if (!docxBuffer || docxBuffer.length === 0) {
      return res.status(400).json({ error: 'Payload berkas .docx kosong.' });
    }

    const pdfBuffer = await convertDocxBufferToPdf(docxBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Conversion API error:', error);
    return res.status(500).json({
      error: 'Gagal mengonversi berkas DOCX ke PDF.',
      message: error.message
    });
  }
}
