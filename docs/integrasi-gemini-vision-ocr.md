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
- Layanan Utama OCR: `src/lib/geminiOcrService.js`
- Modal Pemilihan Mode & Tactical HUD: `src/components/dumas/DumasModeSelectModal.jsx`
- Formulir Dumas 3 Kolom Terisi Otomatis: `src/components/dumas/DumasFormView.jsx`
- View Controller Dumas: `src/views/DumasView.jsx`
- Gaya Visual & HUD Animations: `src/styles/dumas.css`

---

## 2. Kredensial & Environment Variable

```env
# Google Gemini API
GEMINI_API_KEY=AIzaSy_YOUR_ACTUAL_API_KEY_HERE
VITE_GEMINI_API_KEY=AIzaSy_YOUR_ACTUAL_API_KEY_HERE
```

---

## 3. Model AI & Fallback Strategy

Google Gemini API secara berkala memperbarui ketersediaan model:
1. **Model Utama**: `gemini-3.6-flash` (Direkomendasikan resmi oleh Google AI untuk kecepatan vision & response JSON schema).
2. **Fallback Model**: `gemini-3.8-flash` dan `gemini-2.5-flash`.
3. **Konfigurasi Output**: `responseMimeType: "application/json"` dengan System Prompt kedinasan Satreskrim.

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
