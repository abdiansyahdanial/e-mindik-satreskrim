# Integrasi Cloudflare R2 Storage & Helper API Berkas Perkara

Dokumentasi implementasi modul penyimpanan awan Cloudflare R2 untuk administrasi berkas perkara Satreskrim Polres Kolaka Timur.

---

## 1. Ikhtisar & Arsitektur

Cloudflare R2 digunakan sebagai media penyimpanan objek (Object Storage) yang kompatibel dengan protokol AWS S3 API. Penyimpanan ini ditujukan untuk:
- Berkas Perkara induk & Berita Acara (format `.pdf`).
- Foto barang bukti & dokumentasi TKP (format `.jpg`, `.png`).
- Arsip administrasi penyidikan tambahan.

### Referensi Terkait
- Rujukan Arsitektur Utama: [[PROJECT_CONTEXT]]
- Modul Klien Utama: `src/lib/r2Client.js`
- Service Wrapper: `src/services/r2Service.js`
- Serverless API Endpoint: `api/r2-storage.js`

---

## 2. Konfigurasi Environment (`.env`)

Variabel kredensial disimpan pada file `.env` di root proyek:
```env
# Cloudflare R2 Credentials (Server-side Only)
R2_ACCOUNT_ID=18927f2f5d2b4e49a1c521c5c7e73073
R2_ACCESS_KEY_ID=383bca47cfff911142d6fc5be0204707
R2_SECRET_ACCESS_KEY=60cefce8958c0382fb7306a34902fd5eea601c4ca7cc637604d4262f6eef83c6
R2_BUCKET_NAME=emindik-storage
R2_ENDPOINT=https://18927f2f5d2b4e49a1c521c5c7e73073.r2.cloudflarestorage.com
```

> **Keamanan**: Kredensial rahasia di atas tersimpan murni di sisi serverless (`process.env`). Seluruh prefix `VITE_R2_*` telah dihapus dari sisi klien browser untuk mencegah kebocoran Master Key. Unggah berkas dari browser menggunakan Serverless Presigned PUT URL (`/api/r2-presign`).

---

## 3. Fungsi Utama Helper (`src/lib/r2Client.js`)

### A. `uploadFileToR2(fileBuffer, fileName, mimeType, options)`
Mengunggah berkas ke bucket Cloudflare R2 secara null-safe.
- **Parameter**:
  - `fileBuffer`: `Blob | File | ArrayBuffer | Uint8Array | Buffer`
  - `fileName`: Target path dalam bucket (contoh: `'berkas_perkara/LP-01-2026/berkas.pdf'`)
  - `mimeType`: String MIME type (otomatis terdeteksi jika dikosongkan)
  - `options`: Objek opsi tambahan (`metadata`, `bucketName`, `urlExpiresIn`)
- **Return Value**:
  ```json
  {
    "success": true,
    "key": "berkas_perkara/LP-01-2026/berkas.pdf",
    "bucket": "emindik-storage",
    "url": "https://...",
    "size": 1048576,
    "contentType": "application/pdf",
    "etag": "\"8afcc6af...\"",
    "error": null
  }
  ```

### B. `getR2FileUrl(fileName, options)`
Menghasilkan URL pratinjau berkas (Presigned URL berdurasi aman atau Public URL).
- **Parameter**:
  - `fileName`: Key berkas di bucket.
  - `options`: `{ expiresIn: 3600, bucketName, contentType, contentDisposition }`
- **Return Value**: String presigned URL atau `null` jika file/kredensial tidak valid.

### C. Helper Tambahan
- `getR2ConfigStatus()`: Status ketersediaan konfigurasi R2 untuk healthcheck UI.
- `checkR2FileExists(fileName)`: Cek eksistensi berkas (`HeadObjectCommand`).
- `deleteR2File(fileName)`: Hapus berkas dari R2 secara aman.
- `detectMimeType(fileName)`: Pemetaan otomatis ekstensi berkas ke tipe MIME.

---

## 4. Endpoint Serverless (`api/r2-storage.js`)

Untuk skenario upload sisi backend atau integrasi yang membutuhkan bypassing CORS browser:
- `POST /api/r2-storage` dengan payload `{ action: 'upload', fileName, fileBase64, mimeType }`
- `POST /api/r2-storage` dengan payload `{ action: 'get-url', fileName }`
- `POST /api/r2-storage` dengan payload `{ action: 'get-upload-url', fileName, mimeType }`
