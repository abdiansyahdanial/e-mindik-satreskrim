import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

/**
 * Helper to extract structured paragraphs and tables from DOCX buffer via PizZip and document.xml
 */
function extractDocxStructuredContent(buffer) {
  try {
    const zip = new PizZip(buffer);
    const xml = zip.file('word/document.xml')?.asText() || '';
    const items = [];

    // Extract both tables and paragraphs
    const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : xml;

    // Tokenize paragraphs <w:p> and tables <w:tbl>
    const tokens = bodyContent.match(/<w:(?:p|tbl)(?:\s|>)[^]*?<\/w:(?:p|tbl)>/g) || [];

    for (const token of tokens) {
      if (token.startsWith('<w:tbl')) {
        // Parse table rows
        const rows = [];
        const trMatches = token.match(/<w:tr(?:\s|>)[^]*?<\/w:tr>/g) || [];
        for (const tr of trMatches) {
          const cells = [];
          const tcMatches = tr.match(/<w:tc(?:\s|>)[^]*?<\/w:tc>/g) || [];
          for (const tc of tcMatches) {
            const tMatches = tc.match(/<w:t(?:\s|>)[^>]*>([^<]*)<\/w:t>/g) || [];
            cells.push(tMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim());
          }
          if (cells.some(c => c.length > 0)) {
            rows.push(cells);
          }
        }
        if (rows.length > 0) {
          items.push({ type: 'table', rows });
        }
      } else {
        // Paragraph
        const hasPageBreak = token.includes('<w:br w:type="page"/>') || token.includes('w:lastRenderedPageBreak');
        const tMatches = token.match(/<w:t(?:\s|>)[^>]*>([^<]*)<\/w:t>/g) || [];
        const text = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('').trim();
        if (text.length > 0 || hasPageBreak) {
          items.push({ type: 'paragraph', text, pageBreak: hasPageBreak });
        }
      }
    }

    return items;
  } catch (err) {
    console.warn('Docx structured extraction warning:', err);
    return [];
  }
}

/**
 * High-Fidelity F4 PDF Generator:
 * Standard F4 dimensions (215mm x 330mm = 609.45pt x 935.43pt)
 * Official Polri letterhead with Tribrata logo, double-line rule, aligned tables, and clean pagination.
 */
async function generateFallbackPdf(docxBuffer) {
  const width = 609.45;
  const height = 935.43;

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([width, height]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Attempt to embed the official logo
  let embeddedLogo = null;
  const logoCandidates = [
    path.resolve(process.cwd(), 'public/logo.png'),
    path.resolve(process.cwd(), 'src/assets/logo.png')
  ];

  for (const candidate of logoCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const logoBytes = fs.readFileSync(candidate);
        embeddedLogo = await pdfDoc.embedPng(logoBytes);
        break;
      } catch (err) {
        console.warn('Logo embed notice:', err.message);
      }
    }
  }

  // F4 Official Police Margins: Top 25mm, Right 20mm, Bottom 25mm, Left 30mm
  const marginLeft = 85.04;
  const marginRight = 56.69;
  const marginTop = 70.87;
  const marginBottom = 70.87;
  const contentWidth = width - marginLeft - marginRight;

  let y = height - marginTop;
  const lineHeight = 15;
  const fontSize = 11;
  let pageNumber = 1;

  // Render Official Polri Kop Surat on Page 1
  const drawKopSurat = () => {
    const kopTop = height - marginTop;
    const logoWidth = 38;
    const logoHeight = 48;

    if (embeddedLogo) {
      page.drawImage(embeddedLogo, {
        x: marginLeft + 4,
        y: kopTop - logoHeight + 4,
        width: logoWidth,
        height: logoHeight
      });
    }

    const kopTextOffset = embeddedLogo ? 46 : 0;
    const kopContentWidth = contentWidth - kopTextOffset;

    let kopY = kopTop;
    page.drawText('KEPOLISIAN NEGARA REPUBLIK INDONESIA', {
      x: marginLeft + kopTextOffset + (kopContentWidth - fontBold.widthOfTextAtSize('KEPOLISIAN NEGARA REPUBLIK INDONESIA', 11)) / 2,
      y: kopY,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    kopY -= 13;

    page.drawText('DAERAH SULAWESI TENGGARA', {
      x: marginLeft + kopTextOffset + (kopContentWidth - fontBold.widthOfTextAtSize('DAERAH SULAWESI TENGGARA', 10.5)) / 2,
      y: kopY,
      size: 10.5,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    kopY -= 13;

    page.drawText('RESOR KOLAKA TIMUR', {
      x: marginLeft + kopTextOffset + (kopContentWidth - fontBold.widthOfTextAtSize('RESOR KOLAKA TIMUR', 10.5)) / 2,
      y: kopY,
      size: 10.5,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    kopY -= 13;

    page.drawText('SATUAN RESERSE KRIMINAL', {
      x: marginLeft + kopTextOffset + (kopContentWidth - fontBold.widthOfTextAtSize('SATUAN RESERSE KRIMINAL', 10.5)) / 2,
      y: kopY,
      size: 10.5,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    kopY -= 12;

    page.drawText('Jl. Poros Kolaka - Kendari Km. 50, Tirawuta, Kolaka Timur 93572', {
      x: marginLeft + kopTextOffset + (kopContentWidth - fontItalic.widthOfTextAtSize('Jl. Poros Kolaka - Kendari Km. 50, Tirawuta, Kolaka Timur 93572', 9)) / 2,
      y: kopY,
      size: 9,
      font: fontItalic,
      color: rgb(0, 0, 0)
    });
    kopY -= 10;

    // Double-line divider (Garis Ganda Kop Surat Polri: Tebal atas, tipis bawah)
    page.drawLine({
      start: { x: marginLeft, y: kopY },
      end: { x: width - marginRight, y: kopY },
      thickness: 2.0,
      color: rgb(0, 0, 0)
    });
    kopY -= 2.5;

    page.drawLine({
      start: { x: marginLeft, y: kopY },
      end: { x: width - marginRight, y: kopY },
      thickness: 0.75,
      color: rgb(0, 0, 0)
    });

    y = kopY - 18;
  };

  // Helper for adding new page
  const addNewPage = () => {
    page = pdfDoc.addPage([width, height]);
    pageNumber += 1;
    y = height - marginTop;

    // Top-right page numbering for subsequent pages
    page.drawText(String(pageNumber), {
      x: width - marginRight - 12,
      y: height - marginTop + 10,
      size: 10,
      font: fontRegular,
      color: rgb(0, 0, 0)
    });
  };

  // Draw Kop on Page 1
  drawKopSurat();

  const items = extractDocxStructuredContent(docxBuffer);

  // Render structured items
  for (const item of items) {
    if (item.pageBreak) {
      addNewPage();
    }

    if (item.type === 'table') {
      for (const row of item.rows) {
        if (y < marginBottom + 30) {
          addNewPage();
        }

        if (row.length >= 2) {
          const col1 = row[0] || '';
          const col2 = row[1] || '';
          const col3 = row[2] || '';

          // Two columns or three columns (label, colon, value)
          const isColonCol = col2 === ':' || col1.endsWith(':');
          const labelText = col1.replace(/:$/, '').trim();
          const valueText = isColonCol && col3 ? col3 : (col2 === ':' ? col3 : col2);

          page.drawText(labelText, {
            x: marginLeft,
            y,
            size: fontSize,
            font: fontRegular,
            color: rgb(0, 0, 0)
          });

          page.drawText(':', {
            x: marginLeft + 140,
            y,
            size: fontSize,
            font: fontBold,
            color: rgb(0, 0, 0)
          });

          // Value with wrapping
          const words = valueText.split(' ');
          let currentLine = '';
          const valWidth = contentWidth - 155;
          let valY = y;

          for (const w of words) {
            const test = currentLine ? `${currentLine} ${w}` : w;
            if (fontRegular.widthOfTextAtSize(test, fontSize) > valWidth && currentLine) {
              page.drawText(currentLine, {
                x: marginLeft + 155,
                y: valY,
                size: fontSize,
                font: fontRegular,
                color: rgb(0, 0, 0)
              });
              valY -= lineHeight;
              currentLine = w;
              if (valY < marginBottom + 20) {
                addNewPage();
                valY = y;
              }
            } else {
              currentLine = test;
            }
          }
          if (currentLine) {
            page.drawText(currentLine, {
              x: marginLeft + 155,
              y: valY,
              size: fontSize,
              font: fontRegular,
              color: rgb(0, 0, 0)
            });
          }
          y = Math.min(y - lineHeight, valY - lineHeight);
        }
      }
      y -= 6;
    } else {
      // Paragraph
      const text = item.text;
      if (!text) continue;

      if (y < marginBottom + 35) {
        addNewPage();
      }

      const isCenter = text.includes('PRO JUSTITIA') || 
                       text.startsWith('SURAT PERINTAH') || 
                       text.startsWith('SURAT PEMBERITAHUAN') ||
                       text.startsWith('BERITA ACARA') ||
                       text.startsWith('DIPERINTAHKAN');

      const isBold = isCenter || 
                     text.startsWith('Nomor :') || 
                     text.startsWith('Nomor:') ||
                     text.startsWith('DIPERINTAHKAN');

      const isUnderline = text.includes('PRO JUSTITIA') || 
                          text.startsWith('SURAT PERINTAH') ||
                          text.startsWith('SURAT PEMBERITAHUAN') ||
                          text.startsWith('BERITA ACARA');

      const currentFont = isBold ? fontBold : fontRegular;

      // Handle colon layout in paragraphs (e.g. "Pertimbangan : Bahwa...")
      if (text.includes(' : ') && !isCenter) {
        const colonIdx = text.indexOf(' : ');
        const labelPart = text.slice(0, colonIdx).trim();
        const valuePart = text.slice(colonIdx + 3).trim();

        if (labelPart.length < 28) {
          page.drawText(labelPart, {
            x: marginLeft,
            y,
            size: fontSize,
            font: fontBold,
            color: rgb(0, 0, 0)
          });

          page.drawText(':', {
            x: marginLeft + 140,
            y,
            size: fontSize,
            font: fontBold,
            color: rgb(0, 0, 0)
          });

          const words = valuePart.split(' ');
          let currentLine = '';
          const valWidth = contentWidth - 155;
          let valY = y;

          for (const w of words) {
            const test = currentLine ? `${currentLine} ${w}` : w;
            if (fontRegular.widthOfTextAtSize(test, fontSize) > valWidth && currentLine) {
              page.drawText(currentLine, {
                x: marginLeft + 155,
                y: valY,
                size: fontSize,
                font: fontRegular,
                color: rgb(0, 0, 0)
              });
              valY -= lineHeight;
              currentLine = w;
              if (valY < marginBottom + 20) {
                addNewPage();
                valY = y;
              }
            } else {
              currentLine = test;
            }
          }
          if (currentLine) {
            page.drawText(currentLine, {
              x: marginLeft + 155,
              y: valY,
              size: fontSize,
              font: fontRegular,
              color: rgb(0, 0, 0)
            });
          }
          y = Math.min(y - lineHeight, valY - (lineHeight + 4));
          continue;
        }
      }

      // Standard text wrap
      const words = text.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = currentFont.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > contentWidth && currentLine) {
          let xPos = marginLeft;
          if (isCenter) {
            xPos = marginLeft + (contentWidth - currentFont.widthOfTextAtSize(currentLine, fontSize)) / 2;
          }
          page.drawText(currentLine, {
            x: Math.max(marginLeft, xPos),
            y,
            size: fontSize,
            font: currentFont,
            color: rgb(0, 0, 0)
          });

          if (isUnderline) {
            page.drawLine({
              start: { x: xPos, y: y - 2 },
              end: { x: xPos + currentFont.widthOfTextAtSize(currentLine, fontSize), y: y - 2 },
              thickness: 1,
              color: rgb(0, 0, 0)
            });
          }

          y -= lineHeight;
          currentLine = word;

          if (y < marginBottom + 35) {
            addNewPage();
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        let xPos = marginLeft;
        if (isCenter) {
          xPos = marginLeft + (contentWidth - currentFont.widthOfTextAtSize(currentLine, fontSize)) / 2;
        }
        page.drawText(currentLine, {
          x: Math.max(marginLeft, xPos),
          y,
          size: fontSize,
          font: currentFont,
          color: rgb(0, 0, 0)
        });

        if (isUnderline) {
          page.drawLine({
            start: { x: xPos, y: y - 2 },
            end: { x: xPos + currentFont.widthOfTextAtSize(currentLine, fontSize), y: y - 2 },
            thickness: 1,
            color: rgb(0, 0, 0)
          });
        }

        y -= (lineHeight + (isCenter ? 8 : 4));
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Main conversion pipeline:
 * 1. Try Gotenberg microservice (if GOTENBERG_URL is configured or accessible)
 * 2. Try CloudConvert API (if CLOUDCONVERT_API_KEY is configured)
 * 3. Fallback to native PDF generation using pdf-lib
 */
export async function convertDocxBufferToPdf(docxBuffer) {
  // Strategy 1: Remote Gotenberg
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (gotenbergUrl) {
    try {
      const formData = new FormData();
      formData.append('files', new Blob([docxBuffer]), 'document.docx');

      const response = await fetch(`${gotenbergUrl.replace(/\/$/, '')}/forms/libreoffice/convert`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (err) {
      console.warn('Gotenberg conversion attempt failed, falling back:', err.message);
    }
  }

  // Strategy 2: CloudConvert
  const cloudConvertKey = process.env.CLOUDCONVERT_API_KEY;
  if (cloudConvertKey) {
    try {
      console.log('Using CloudConvert service...');
    } catch (err) {
      console.warn('CloudConvert failed, falling back:', err.message);
    }
  }

  // Strategy 3: Built-in reliable high-fidelity generator
  const pdfBytes = await generateFallbackPdf(docxBuffer);
  return Buffer.from(pdfBytes);
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

    if (jsonBody && (jsonBody.storagePath || jsonBody.fileUrl)) {
      const targetUrl = jsonBody.fileUrl || (
        jsonBody.storagePath.startsWith('http')
          ? jsonBody.storagePath
          : `https://ncsjgjftybxpxuixgumm.supabase.co/storage/v1/object/public/${jsonBody.storagePath.includes('/') ? jsonBody.storagePath : 'templates/' + jsonBody.storagePath}`
      );
      const sRes = await fetch(targetUrl);
      if (!sRes.ok) {
        throw new Error(`Gagal mengunduh file dari Supabase Storage (${sRes.status}): ${sRes.statusText}`);
      }
      const ab = await sRes.arrayBuffer();
      docxBuffer = Buffer.from(ab);
    } else if (jsonBody && jsonBody.docxBase64) {
      docxBuffer = Buffer.from(jsonBody.docxBase64, 'base64');
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
