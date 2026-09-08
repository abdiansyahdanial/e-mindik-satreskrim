import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import handler from './api/convert-docx-to-pdf.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'docx-to-pdf-api-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/convert-docx-to-pdf', async (req, res) => {
          // Compatibility shims for Vercel Serverless Function signature
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

          try {
            await handler(req, res);
          } catch (err) {
            console.error('Local dev conversion error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
})
