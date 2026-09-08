import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { convertDocxBufferToPdf } from './api/convert-docx-to-pdf.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'docx-to-pdf-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/convert-docx-to-pdf', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBuffer = Buffer.concat(chunks);

          try {
            let docxBuffer = rawBuffer;
            // Check if JSON payload
            try {
              const parsed = JSON.parse(rawBuffer.toString('utf8'));
              if (parsed && parsed.docxBase64) {
                docxBuffer = Buffer.from(parsed.docxBase64, 'base64');
              }
            } catch {
              // raw binary buffer
            }

            const pdfBuffer = await convertDocxBufferToPdf(docxBuffer);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
          } catch (err) {
            console.error('Local dev conversion error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
})
