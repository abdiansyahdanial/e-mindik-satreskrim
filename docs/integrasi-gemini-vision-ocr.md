# Integrasi Groq Vision API: Smart Scan OCR Dumas & Mindik

Dokumentasi fitur pemindaian cerdas (Smart Scan OCR) untuk dokumen fisik pengaduan masyarakat (Dumas) dan Laporan Polisi menggunakan Groq Vision SDK pada Satreskrim Polres Kolaka Timur.

---

## 1. Ikhtisar & Arsitektur

Fitur ini mengotomatiskan pembacaan dokumen fisik (surat pengaduan bermeterai / lembar laporan pengaduan masyarakat) menjadi entitas data terstruktur format JSON standar kedinasan kepolisian:
- **Nomor & Tanggal Surat**: `nomor_surat`, `tanggal_surat`.
- **Pelapor**: Nama lengkap, NIK, TTL, Pekerjaan, Agama, Alamat domisili, Nomor Kontak/HP.
- **Saksi-saksi**: Multi-saksi terstruktur (`saksi_list`: Nama, NIK, TTL, Pekerjaan, Agama, Alamat, Kontak, Role).
- **Terlapor**: Multi-terlapor (`terlapor_list`: Nama, NIK, TTL, Pekerjaan, Agama, Alamat, Kontak, Role).
- **Perkara**: Dugaan Tindak Pidana, Dugaan Pasal, Tempus Delicti, Locus Delicti, dan Uraian Singkat Kejadian / Kronologis.

### File Terkait
- Endpoint Serverless OCR (Backend): `api/ocr-scan.js`
- Dev Server Middleware (Localhost): `vite.config.js`
- Layanan Frontend OCR: `src/lib/geminiOcrService.js`
- Modal Pemilihan Mode & Tactical HUD: `src/components/dumas/DumasModeSelectModal.jsx`
- Formulir Dumas 3 Kolom Terisi Otomatis: `src/components/dumas/DumasFormView.jsx`
- View Controller Dumas: `src/views/DumasView.jsx`
- Gaya Visual & HUD Animations: `src/styles/dumas.css`

---

## 2. Kredensial & Environment Variable

Kredensial disimpan secara aman di backend serverless tanpa bocor ke bundle JavaScript browser dan terdaftar di `.gitignore`:

```env
# Groq Cloud API Key for Vision & OCR (Server-Side Only)
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## 3. Model AI & Fallback Strategy

Endpoint `api/ocr-scan.js` menginisialisasi Groq client resmi:
```javascript
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

Konfigurasi model vision resmi Groq:
1. **Model Resmi**: `llama-3.2-11b-vision-preview` (dapat dikustomisasi lewat `GROQ_VISION_MODEL`)
2. **Batas Parameter Token**: `max_tokens: 1024` (optimal & aman dari batas kuota 1000 OTPM).
3. **Suhu Generasi**: `temperature: 0.1` (faktual, deterministik, & presisi tinggi kedinasan).
4. **Format Output**: `response_format: { type: "json_object" }` dengan System Prompt kedinasan Satreskrim.
5. **Penanganan Error 429**: Mendukung pendeteksian otomatis Rate Limit 429 di UI dengan timer hitung mundur 30 detik serta tombol transisi cepat ke Input Manual.

---

## 4. Alur Kerja Pengguna (User Flow)

1. Penyidik membuka modul Dumas, klik **"Registrasi Dumas Baru"**.
2. Pada modal muncul **OPSI A: SMART SCAN BERKAS FISIK**:
   - Penyidik dapat mengklik tombol **`[ Mulai Pindai Berkas Fisik ]`** atau menyeret file (Drag & Drop) foto lembar surat pengaduan (JPG/PNG).
3. **Tactical HUD Loading Overlay** memvisualisasikan tahapan pemindaian.
4. Setelah AI menyelesaikan analisis:
   - Data otomatis disuntikkan ke state formulir Dumas (`pelapor`, `saksiList`, `terlaporList`, dan `caseInfo`).
   - Dokumen fisik yang dipindai otomatis masuk ke daftar **Lampiran Barang Bukti** perkara.
