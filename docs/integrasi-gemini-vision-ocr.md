# Integrasi Google Gemini Vision API: Smart Scan OCR Dumas

Dokumentasi fitur pemindaian cerdas (Smart Scan OCR) untuk dokumen fisik pengaduan masyarakat (Dumas) dan Laporan Polisi menggunakan Google Gemini Vision AI pada Satreskrim Polres Kolaka Timur.

---

## 1. Ikhtisar & Arsitektur

Fitur ini mengotomatiskan pembacaan dokumen fisik (surat pengaduan bermeterai / lembar laporan pengaduan masyarakat) menjadi entitas data terstruktur format JSON standar kedinasan kepolisian:
- **Pelapor**: Nama lengkap, NIK, TTL/Umur, Pekerjaan, Agama, Alamat domisili, Nomor Kontak/HP.
- **Saksi-saksi**: Multi-saksi terstruktur (Nama, Pekerjaan, Alamat, Kontak).
- **Terlapor**: Multi-terlapor (Nama, Pekerjaan, Alamat, Kontak).
- **Perkara**: Dugaan Tindak Pidana, Pasal yang disangkakan, Tempus Delicti, Locus Delicti, dan Uraian Singkat Kejadian.

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

Kredensial disimpan secara aman di backend serverless tanpa bocor ke bundle JavaScript browser:

```env
# Google Gemini API (Server-Side Only)
GEMINI_API_KEY=AQ.Ab8RN6...YOUR_ACTUAL_KEY...
```

---

## 3. Model AI & Fallback Strategy

Google Gemini API memiliki urutan prioritas model vision berdaya tahan tinggi:
1. **Prioritas Utama**: `gemini-2.0-flash`
2. **Fallback 1**: `gemini-1.5-flash`
3. **Fallback 2**: `gemini-1.5-pro`
4. **Fallback Resilient (Produksi Aktif)**: `gemini-flash-latest` dan `gemini-flash-lite-latest` (Menjamin pemrosesan tetap berjalan mulus meskipun versi terdahulu telah didepresiasi oleh Google atau sedang overload).
5. **Penanganan 503 (Overloaded / High Demand)**: Dilengkapi mekanisme *exponential backoff retry* otomatis (1s -> 2s) sebelum beralih ke model berikutnya.
6. **Konfigurasi Output**: `responseMimeType: "application/json"`, `temperature: 0.1` (faktual & presisi tinggi), dengan System Prompt kedinasan Satreskrim.

---

## 4. Alur Kerja Pengguna (User Flow)

1. Penyidik membuka modul Dumas, klik **"Registrasi Dumas Baru"**.
2. Pada modal muncul **OPSI A: SMART SCAN BERKAS FISIK**:
   - Penyidik dapat mengklik tombol **`[ Mulai Pindai Berkas Fisik ]`** atau menyeret file (Drag & Drop) foto lembar surat pengaduan (JPG/PNG/PDF).
3. **Tactical HUD Loading Overlay** muncul seketika:
   - Efek scanline laser merah, radar radar pulse taktis, dan progres bertahap (*Inisialisasi -> Gemini Vision Engine -> Ekstraksi Entitas -> Pemetaan Skema*).
4. Setelah AI menyelesaikan analisis:
   - Data otomatis disuntikkan ke state `pelapor`, `saksiList`, `terlaporList`, dan `caseInfo`.
   - File fisik yang dipindai otomatis masuk ke daftar **Lampiran Barang Bukti** perkara.
   - Modal tertutup dan penyidik diarahkan ke tampilan formulir dengan banner verifikasi AI.
