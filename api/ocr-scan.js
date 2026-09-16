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
TUGAS UTAMA: Ekstraksi OCR murni. Wajib sertakan objek peristiwa/tindak_pidana, pasal, tempus_delicti, locus_delicti, dan uraian_kejadian secara lengkap.
DILARANG MERINGKAS, MENGUBAH, ATAU MEMOTONG TEKS APAPUN, terutama pada bagian 'uraian_kejadian' atau 'kronologis'. Salin seluruh teks kejadian secara lengkap, utuh, dan verbatim (kata per kata) persis sesuai yang tertulis pada dokumen fisik ke dalam properti JSON terkait. Hanya kembalikan raw JSON tanpa format code block atau kata pengantar.

PETUNJUK PRIORITAS EKSTRAKSI ADMINISTRASI PENYIDIKAN:
1. Peristiwa & Dugaan Pasal Pidana (PRIORITAS UTAMA - WAJIB DI AWAL):
   - tindak_pidana: Ekstrak jenis dugaan tindak pidana (misal: "Penggelapan", "Penipuan", "Penganiayaan", dll).
   - pasal: Ekstrak pasal KUHP / UU pidana yang dicantumkan (misal: "Pasal 372 KUHP").
   - tempus_delicti: Ekstrak waktu/hari/tanggal/jam kejadian secara lengkap.
   - locus_delicti: Ekstrak tempat/lokasi TKP kejadian secara lengkap.
   - uraian_kejadian: Ekstrak narasi kronologis kejadian secara lengkap, utuh, dan verbatim (kata demi kata) sesuai dokumen tanpa diringkas atau dipotong.
2. Nomor & Tanggal Surat:
   - Cari nomor surat pengaduan / agenda / register jika ada (misal: "B/12/IX/2026/Reskrim" atau nomor agenda).
   - Ekstrak tanggal surat dibuat atau tanggal tanda terima berkas.
3. Identitas Pelapor / Pengadu (pelapor):
   - Ekstrak: nama lengkap (pelapor_nama), NIK (pelapor_nik), TTL (pelapor_ttl), pekerjaan (pelapor_pekerjaan), agama (pelapor_agama), alamat domisili (pelapor_alamat), kontak/HP (pelapor_kontak).
4. Saksi-Saksi (saksi_list):
   - Ekstrak saksi yang diajukan atau saksi yang tercantum dalam narasi peristiwa.
   - Ekstrak tiap entitas: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label ("Saksi Fakta" atau "Saksi Terkait").
   - Jika kolom bertanda strip ("-"), bersihkan menjadi string kosong "".
5. Pihak Terlapor (terlapor_list):
   - Ekstrak seluruh pihak terlapor baik dari klausul terlapor maupun kronologis kejadian.
   - Ekstrak tiap entitas: nama, nik, ttl, pekerjaan, agama, alamat, kontak, role_label ("Terlapor Utama" atau "Terlapor Tambahan").

FORMAT WAJIB JSON MURNI (Valid JSON Object):
{
  "tindak_pidana": "",
  "pasal": "",
  "tempus_delicti": "",
  "locus_delicti": "",
  "uraian_kejadian": "",
  "peristiwa": {
    "tindak_pidana": "",
    "pasal": "",
    "tempus_delicti": "",
    "locus_delicti": "",
    "uraian_kejadian": ""
  },
  "nomor_surat": "",
  "tanggal_surat": "",
  "pelapor_nama": "",
  "pelapor_nik": "",
  "pelapor_ttl": "",
  "pelapor_pekerjaan": "",
  "pelapor_agama": "Islam",
  "pelapor_alamat": "",
  "pelapor_kontak": "",
  "saksi_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "kontak": "", "role_label": "Saksi Fakta" }
  ],
  "terlapor_list": [
    { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "kontak": "", "role_label": "Terlapor Utama" }
  ]
}`;

    const userMessageContent = [
      {
        type: "text",
        text: "Analisis seluruh lembar dokumen fisik di atas. Wajib sertakan objek peristiwa/tindak_pidana, pasal, tempus_delicti, locus_delicti, dan uraian_kejadian secara lengkap. Ekstrak objek 'peristiwa' dan field-field terkait di urutan paling awal. Hanya kembalikan raw JSON tanpa format code block atau kata pengantar.",
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
      max_tokens: 950,
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

    // 3. Proteksi pembersihan format codeblock markdown (misal ```json ... ``` atau ``` ... ```)
    let cleanJson = rawContent;
    const codeBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanJson = codeBlockMatch[1].trim();
    } else {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }

    // Jika ada teks pengantar di luar {}, potong secara presisi dari { pertama sampai } terakhir
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1).trim();
    }

    const parsedData = JSON.parse(cleanJson);

    // Sinkronkan data objek peristiwa dan flat keys secara defensif
    const pObj = parsedData.peristiwa || parsedData.perkara || {};
    const finalTindakPidana = parsedData.tindak_pidana || parsedData.dugaan_tindak_pidana || pObj.tindak_pidana || pObj.dugaan_tindak_pidana || "";
    const finalPasal = parsedData.pasal || parsedData.pasal_disangkakan || parsedData.dugaan_pasal || pObj.pasal || pObj.pasal_disangkakan || pObj.dugaan_pasal || "";
    const finalTempus = parsedData.tempus_delicti || parsedData.waktu_kejadian || pObj.tempus_delicti || pObj.waktu_kejadian || "";
    const finalLocus = parsedData.locus_delicti || parsedData.tempat_kejadian || pObj.locus_delicti || pObj.tempat_kejadian || "";
    const finalUraian = parsedData.uraian_kejadian || parsedData.kronologis || parsedData.ringkasan_kasus || pObj.uraian_kejadian || pObj.kronologis || pObj.ringkasan_kasus || "";

    parsedData.peristiwa = {
      ...pObj,
      tindak_pidana: finalTindakPidana,
      dugaan_tindak_pidana: finalTindakPidana,
      pasal: finalPasal,
      dugaan_pasal: finalPasal,
      pasal_disangkakan: finalPasal,
      tempus_delicti: finalTempus,
      waktu_kejadian: finalTempus,
      locus_delicti: finalLocus,
      tempat_kejadian: finalLocus,
      uraian_kejadian: finalUraian,
    };
    parsedData.tindak_pidana = finalTindakPidana;
    parsedData.dugaan_tindak_pidana = finalTindakPidana;
    parsedData.pasal = finalPasal;
    parsedData.dugaan_pasal = finalPasal;
    parsedData.pasal_disangkakan = finalPasal;
    parsedData.tempus_delicti = finalTempus;
    parsedData.waktu_kejadian = finalTempus;
    parsedData.locus_delicti = finalLocus;
    parsedData.tempat_kejadian = finalLocus;
    parsedData.uraian_kejadian = finalUraian;

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