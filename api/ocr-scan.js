import Groq from 'groq-sdk';

/**
 * Serverless Handler untuk OCR Scan Dokumen Dumas / LP menggunakan Groq Vision SDK
 * Endpoint: /api/ocr-scan
 */
export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "GROQ_API_KEY belum dikonfigurasi di environment server.",
    });
  }

  try {
    const { images } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Payload gambar tidak valid atau kosong.",
      });
    }

    // Inisialisasi Groq client resmi
    const groq = new Groq({ apiKey });

    // Format gambar ke format OpenAI/Groq image_url
    const formattedImages = images.map((img) => {
      let dataUrl = "";
      if (typeof img === "string") {
        dataUrl = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      } else if (img.base64Data) {
        dataUrl = img.base64Data.startsWith("data:")
          ? img.base64Data
          : `data:${img.mimeType || "image/jpeg"};base64,${img.base64Data}`;
      } else if (img.data) {
        dataUrl = img.data.startsWith("data:")
          ? img.data
          : `data:${img.mimeType || "image/jpeg"};base64,${img.data}`;
      } else if (img.url) {
        dataUrl = img.url;
      }
      return {
        type: "image_url",
        image_url: { url: dataUrl },
      };
    });

    // Prompt kedinasan Satreskrim untuk ekstraksi entitas formil
    const systemPrompt = `Anda adalah asisten AI resmi Satreskrim Kepolisian Republik Indonesia (POLRI).
Ekstrak data dokumen ke JSON ringkas. Hanya kembalikan raw JSON tanpa format code block atau kata pengantar.

PETUNJUK EKSTRAKSI ADMINISTRASI PENYIDIKAN:
1. Nomor & Tanggal Surat:
   - Cari nomor surat pengaduan / agenda / register jika ada (misal: "B/12/IX/2026/Reskrim" atau nomor agenda).
   - Ekstrak tanggal surat dibuat atau tanggal tanda terima berkas.
2. Identitas Pelapor / Pengadu (pelapor):
   - Ekstrak: nama lengkap (pelapor_nama), NIK (pelapor_nik), TTL (pelapor_ttl), pekerjaan (pelapor_pekerjaan), agama (pelapor_agama), alamat domisili (pelapor_alamat), kontak/HP (pelapor_kontak).
3. Pihak Terlapor (terlapor_list):
   - Ekstrak seluruh pihak terlapor baik dari klausul terlapor maupun kronologis kejadian.
   - Ekstrak tiap entitas: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label ("Terlapor Utama" atau "Terlapor Tambahan").
4. Saksi-Saksi (saksi_list):
   - Ekstrak saksi yang diajukan atau saksi yang tercantum dalam narasi peristiwa.
   - Ekstrak tiap entitas: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label ("Saksi Fakta" atau "Saksi Terkait").
   - Jika kolom bertanda strip ("-"), bersihkan menjadi string kosong "".
5. Perkara & Delik Pidana:
   - Ekstrak tindak_pidana (dugaan perbuatan pidana, misal: "Penipuan", "Penggelapan", "Penganiayaan").
   - Ekstrak pasal_disangkakan jika tertera.
   - Ekstrak tempus_delicti (waktu peristiwa kejadian).
   - Ekstrak locus_delicti (tempat peristiwa kejadian).
   - Ekstrak uraian_kejadian (uraian ringkas kronologis peristiwa secara jelas dan utuh).

FORMAT WAJIB JSON MURNI (Valid JSON Object):
{
  "nomor_surat": "",
  "tanggal_surat": "",
  "pelapor_nama": "",
  "pelapor_nik": "",
  "pelapor_ttl": "",
  "pelapor_pekerjaan": "",
  "pelapor_agama": "Islam",
  "pelapor_alamat": "",
  "pelapor_kontak": "",
  "terlapor_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "kontak": "", "role_label": "Terlapor Utama" }
  ],
  "saksi_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "kontak": "", "role_label": "Saksi Fakta" }
  ],
  "tindak_pidana": "",
  "pasal_disangkakan": "",
  "tempus_delicti": "",
  "locus_delicti": "",
  "uraian_kejadian": "",
  "uraian_ringkas": ""
}`;

    const userMessageContent = [
      {
        type: "text",
        text: "Ekstrak data dokumen ke JSON ringkas. Hanya kembalikan raw JSON tanpa format code block atau kata pengantar.",
      },
      ...formattedImages,
    ];

    // Model vision aktif katalog Groq: qwen/qwen3.8-27b
    const model = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

    const requestParams = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessageContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 800,
    };

    // Sembunyikan reasoning format pada model Qwen agar kompatibel penuh dengan json_object mode
    if (model.includes("qwen")) {
      requestParams.reasoning_format = "hidden";
    }

    const completion = await groq.chat.completions.create(requestParams);

    if (!completion || !completion.choices?.[0]?.message?.content) {
      throw new Error("Gagal menerima respons ekstraksi dari Groq Vision AI.");
    }

    const rawContent = completion.choices[0].message.content.trim();
    const cleanJson = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      data: parsedData,
      modelUsed: model,
    });
  } catch (error) {
    console.error("[Groq Serverless OCR Error]:", error);

    const errorMessage = String(error?.message || '');
    const isRateLimit = error?.status === 429 || 
      errorMessage.includes('429') || 
      errorMessage.toLowerCase().includes('rate limit') ||
      errorMessage.toLowerCase().includes('tokens per minute') ||
      errorMessage.toLowerCase().includes('rate_limit');

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        isRateLimit: true,
        error: "Batas kuota request pemindaian AI (Rate Limit 429) tercapai. Silakan coba kembali dalam 30 detik atau gunakan opsi Input Manual.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Gagal memproses OCR di server: " + (error.message || error),
    });
  }
}