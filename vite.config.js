import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import handler from './api/convert-docx-to-pdf.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper untuk menyuntikkan seluruh environment variable dari .env ke process.env di sisi server dev
function loadEnvToProcess() {
  const envPath = path.resolve(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim()
        if (val && !process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

// Helper to wrap Vercel-style handlers into Vite connect middlewares
function createMiddleware(endpointHandler) {
  return async (req, res) => {
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };
    res.send = function(data) {
      this.end(data);
      return this;
    };
    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(data));
      return this;
    };

    // Parse body if POST
    if (req.method === 'POST' && !req.body) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        req.body = raw;
      }
    }

    try {
      await endpointHandler(req, res);
    } catch (err) {
      console.error('Local dev middleware error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Tanpa pembatasan CSP parsial di dev-server agar Vite HMR, eval sourcemap, dan DevTools bebas warning
  },
  plugins: [
    react(),
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/convert-docx-to-pdf', createMiddleware(handler));
        server.middlewares.use('/api/send-email', async (req, res, next) => {
          try {
            const { default: emailHandler } = await import('./api/send-email.js');
            return createMiddleware(emailHandler)(req, res, next);
          } catch (err) {
            console.error('Local dev send-email middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        server.middlewares.use('/api/r2-presign', async (req, res, next) => {
          try {
            loadEnvToProcess();
            const { default: presignHandler } = await import('./api/r2-presign.js');
            return createMiddleware(presignHandler)(req, res, next);
          } catch (err) {
            console.error('Local dev r2-presign middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        server.middlewares.use('/api/r2-storage', async (req, res, next) => {
          try {
            loadEnvToProcess();
            const { default: r2Handler } = await import('./api/r2-storage.js');
            return createMiddleware(r2Handler)(req, res, next);
          } catch (err) {
            console.error('Local dev r2-storage middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        server.middlewares.use('/api/ocr-scan', async (req, res, next) => {
          try {
            loadEnvToProcess();
            const { default: ocrHandler } = await import('./api/ocr-scan.js');
            return createMiddleware(ocrHandler)(req, res, next);
          } catch (err) {
            console.error('Local dev ocr-scan middleware error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      'docx-preview/dist/docx-preview.css': path.resolve(__dirname, 'src/styles/docx-preview.css'),
    },
  },
  // Kredensial R2_ kini murni di lingkungan serverless/Node.js, jangan diekspos ke client bundle
  envPrefix: ['VITE_'],
})


