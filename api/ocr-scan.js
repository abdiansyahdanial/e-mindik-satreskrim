import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY belum dikonfigurasi di server." });
  }

  try {
    const { images } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Payload gambar tidak valid atau kosong." });
    }

    const ai = new GoogleGenAI({ apiKey });

    // System instruction & prompt kedinasan Reskrim
    const systemPrompt = `Anda adalah asisten cerdas penyidik Satreskrim Kepolisian Republik Indonesia (POLRI).
Tugas Anda adalah melakukan ekstraksi data dari dokumen pengaduan masyarakat (Dumas) / laporan polisi fisik secara terstruktur, faktual, dan presisi tinggi ke dalam format JSON murni.

ATURAN EKSTRAKSI ADMINISTRASI RESKRIM:
1. Pelapor:
   - Ekstrak nama lengkap, NIK, tempat/tgl lahir (TTL), agama, pekerjaan, alamat domisili, dan nomor kontak/HP.
2. Saksi-Saksi (saksi_list):
   - Deteksi dari blok klausul "mengajukan saksi sebagai berikut:" ataupun dari narasi kronologis peristiwa.
   - Ekstrak: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label (Saksi Fakta / Saksi Terkait).
   - ATURAN STRIP: Jika kolom NIK/TTL bertanda strip ("-"), jangan abaikan saksi. Bersihkan tanda strip menjadi string kosong "".
3. Pihak Terlapor (terlapor_list):
   - Deteksi dari kalimat "diduga dilakukan oleh Terlapor:" serta pihak terkait dalam aliran dana/rekening/kronologis.
   - Ekstrak: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label (Terlapor Utama / Terlapor Tambahan).
4. Perkara:
   - Ekstrak tindak_pidana, pasal_disangkakan, locus_delicti, tempus_delicti, dan uraian_kejadian (ringkasan kronologi kejadian yang padat, utuh, dan berurutan).

FORMAT SKEMA JSON (Wajib valid JSON):
{
  "pelapor_nama": "",
  "pelapor_nik": "",
  "pelapor_ttl": "",
  "pelapor_pekerjaan": "",
  "pelapor_agama": "",
  "pelapor_alamat": "",
  "pelapor_kontak": "",
  "terlapor_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "", "alamat": "", "kontak": "", "role_label": "Terlapor Utama" }
  ],
  "saksi_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "", "alamat": "", "kontak": "", "role_label": "Saksi Fakta" }
  ],
  "tindak_pidana": "",
  "pasal_disangkakan": "",
  "tempus_delicti": "",
  "locus_delicti": "",
  "uraian_kejadian": ""
}`;

    // Siapkan konten multimodal untuk Gemini
    const contents = [
      ...images.map((img) => ({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.base64Data || img.data,
        },
      })),
      {
        text: "Analisis seluruh lembar dokumen fisik di atas secara terpadu dan ekstrak seluruh entitas sesuai skema JSON kedinasan Reskrim."
      }
    ];

    // Daftar model dengan fallback cerdas
    const candidateModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest",
      "gemini-3.6-flash",
      "gemini-flash-lite-latest",
    ];

    let response = null;
    let lastError = null;
    let selectedModel = candidateModels[0];

    for (const model of candidateModels) {
      try {
        selectedModel = model;
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[OCR Server] Model ${model} gagal:`, err.message);
        if (err.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE'))) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Gagal menerima respons dari Gemini AI.");
    }

    const rawText = response.text.trim();
    const cleanJson = rawText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      data: parsedData,
      modelUsed: selectedModel,
    });
  } catch (error) {
    console.error("[Serverless OCR Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Gagal memproses OCR di server: " + (error.message || error),
    });
  }
}