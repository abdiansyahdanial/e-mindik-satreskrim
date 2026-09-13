import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import handler from './api/convert-docx-to-pdf.js'
import emailHandler from './api/send-email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  plugins: [
    react(),
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/convert-docx-to-pdf', createMiddleware(handler));
        server.middlewares.use('/api/send-email', createMiddleware(emailHandler));
      }
    }
  ],
  resolve: {
    alias: {
      'docx-preview/dist/docx-preview.css': path.resolve(__dirname, 'src/styles/docx-preview.css'),
    },
  },
})


