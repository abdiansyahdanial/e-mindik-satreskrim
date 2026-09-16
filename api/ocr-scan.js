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

    // Prompt kedinasan Satreskrim untuk ekstraksi entitas formil dengan struktur ringkas hemat token
    const systemPrompt = `Anda adalah asisten AI resmi Satreskrim Kepolisian Republik Indonesia (POLRI).
TUGAS UTAMA: Ekstraksi OCR dokumen pengaduan/laporan masyarakat ke format JSON ringkas.
DILARANG MERINGKAS ATAU MEMOTONG TEKS KRONOLOGIS/URAIAN. Salin teks kejadian secara lengkap dan verbatim (kata demi kata) sesuai dokumen fisik.
PENTING: Pastikan selalu menutup struktur JSON dengan sempurna (tutup kurung kurawal dan siku valid). Jika mendekati batas panjang teks, utamakan menyelesaikan format JSON yang valid.

FORMAT WAJIB JSON (Gunakan key ringkas berikut tanpa kata pengantar atau codeblock):
{
  "pidana": "jenis dugaan tindak pidana",
  "pasal": "pasal sangkaan KUHP/UU",
  "waktu": "waktu/hari/tgl/jam kejadian (tempus)",
  "tkp": "tempat kejadian perkara (locus)",
  "uraian": "salin kronologis lengkap verbatim sesuai dokumen fisik",
  "nomor_surat": "",
  "tanggal_surat": "",
  "pelapor": { "nama": "", "nik": "", "ttl": "", "pekerjaan": "", "agama": "Islam", "alamat": "", "hp": "" },
  "terlapor": [ { "nama": "", "pekerjaan": "", "alamat": "", "hp": "" } ],
  "saksi": [ { "nama": "", "pekerjaan": "", "alamat": "", "hp": "" } ]
}`;

    const userMessageContent = [
      {
        type: "text",
        text: "Analisis seluruh lembar dokumen fisik di atas. Ekstrak ke format JSON ringkas (pidana, pasal, waktu, tkp, uraian verbatim, pelapor, terlapor, saksi). PENTING: Wajib selesaikan dan tutup kurung kurawal JSON secara valid. Hanya kembalikan raw JSON tanpa teks pengantar.",
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

    let completion;
    try {
      completion = await groq.chat.completions.create(requestParams);
    } catch (firstErr) {
      const errStr = String(firstErr?.message || '');
      const isJsonValidateErr = firstErr?.status === 400 || 
        errStr.includes('json_validate_failed') || 
        errStr.includes('max completion tokens') ||
        errStr.includes('400');

      if (isJsonValidateErr) {
        console.warn('[Groq OCR] Terdeteksi 400 json_validate_failed / token limit, melakukan fallback call...');
        const fallbackParams = { ...requestParams };
        delete fallbackParams.response_format;
        completion = await groq.chat.completions.create(fallbackParams);
      } else {
        throw firstErr;
      }
    }

    if (!completion || !completion.choices?.[0]?.message?.content) {
      throw new Error("Gagal menerima respons ekstraksi dari Groq Vision AI.");
    }

    const rawContent = completion.choices[0].message.content.trim();

    // Helper parser tangguh yang mampu mereparasi unclosed JSON jika terpotong di akhir token
    function repairAndParseJson(raw) {
      if (!raw || typeof raw !== 'string') {
        throw new Error('Konten teks respons kosong.');
      }

      let text = raw.trim();

      // Bersihkan codeblock markdown
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        text = codeBlockMatch[1].trim();
      } else {
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      }

      const firstBrace = text.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('Tidak ditemukan kurung kurawal buka "{" pada respons AI.');
      }
      text = text.substring(firstBrace);

      // Coba parse langsung
      try {
        return JSON.parse(text);
      } catch (e) {
        // Lanjut ke perbaikan unclosed JSON
      }

      let inString = false;
      let isEscaped = false;
      const stack = [];

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inString) {
          if (isEscaped) {
            isEscaped = false;
          } else if (char === '\\') {
            isEscaped = true;
          } else if (char === '"') {
            inString = false;
          }
        } else {
          if (char === '"') {
            inString = true;
          } else if (char === '{' || char === '[') {
            stack.push(char);
          } else if (char === '}') {
            if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
          } else if (char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
          }
        }
      }

      let repaired = text;
      if (inString) {
        repaired += '"';
      }

      repaired = repaired.replace(/,\s*$/g, '').replace(/:\s*"?$/g, ': ""');

      while (stack.length > 0) {
        const unclosed = stack.pop();
        repaired = repaired.replace(/,\s*$/g, '');
        if (unclosed === '{') repaired += '}';
        else if (unclosed === '[') repaired += ']';
      }

      try {
        return JSON.parse(repaired);
      } catch (err2) {
        const lastComma = repaired.lastIndexOf(',');
        if (lastComma !== -1) {
          let trimmed = repaired.substring(0, lastComma);
          let inStr = false;
          let esc = false;
          const s2 = [];
          for (let i = 0; i < trimmed.length; i++) {
            const c = trimmed[i];
            if (inStr) {
              if (esc) esc = false;
              else if (c === '\\') esc = true;
              else if (c === '"') inStr = false;
            } else {
              if (c === '"') inStr = true;
              else if (c === '{' || c === '[') s2.push(c);
              else if (c === '}') { if (s2.length && s2[s2.length - 1] === '{') s2.pop(); }
              else if (c === ']') { if (s2.length && s2[s2.length - 1] === '[') s2.pop(); }
            }
          }
          if (inStr) trimmed += '"';
          while (s2.length > 0) {
            const u = s2.pop();
            trimmed = trimmed.replace(/,\s*$/g, '');
            trimmed += (u === '{' ? '}' : ']');
          }
          return JSON.parse(trimmed);
        }
        throw new Error('Gagal memvalidasi dan memperbaiki JSON terpotong: ' + err2.message);
      }
    }

    const parsedData = repairAndParseJson(rawContent);

    // Sinkronkan data objek peristiwa dan flat keys secara defensif
    const pObj = parsedData.peristiwa || parsedData.perkara || {};
    const finalTindakPidana = parsedData.pidana || parsedData.tindak_pidana || parsedData.dugaan_tindak_pidana || pObj.pidana || pObj.tindak_pidana || pObj.dugaan_tindak_pidana || "";
    const finalPasal = parsedData.pasal || parsedData.pasal_disangkakan || parsedData.dugaan_pasal || pObj.pasal || pObj.pasal_disangkakan || pObj.dugaan_pasal || "";
    const finalTempus = parsedData.waktu || parsedData.tempus_delicti || parsedData.waktu_kejadian || pObj.waktu || pObj.tempus_delicti || pObj.waktu_kejadian || "";
    const finalLocus = parsedData.tkp || parsedData.locus_delicti || parsedData.tempat_kejadian || pObj.tkp || pObj.locus_delicti || pObj.tempat_kejadian || "";
    const finalUraian = parsedData.uraian || parsedData.uraian_kejadian || parsedData.ringkasan_posisi_kasus || parsedData.kronologis || parsedData.ringkasan_kasus || pObj.uraian || pObj.uraian_kejadian || pObj.kronologis || pObj.ringkasan_kasus || "";

    // Normalisasi Pelapor
    const pelaporRaw = parsedData.pelapor || {};
    const normalizedPelapor = {
      nama: pelaporRaw.nama || parsedData.pelapor_nama || "",
      nik: pelaporRaw.nik || parsedData.pelapor_nik || "",
      ttl: pelaporRaw.ttl || parsedData.pelapor_ttl || "",
      pekerjaan: pelaporRaw.pekerjaan || parsedData.pelapor_pekerjaan || "",
      agama: pelaporRaw.agama || parsedData.pelapor_agama || "Islam",
      alamat: pelaporRaw.alamat || parsedData.pelapor_alamat || "",
      kontak: pelaporRaw.hp || pelaporRaw.kontak || parsedData.pelapor_kontak || "",
      hp: pelaporRaw.hp || pelaporRaw.kontak || parsedData.pelapor_kontak || "",
    };

    // Normalisasi Terlapor
    const terlaporRawList = Array.isArray(parsedData.terlapor) 
      ? parsedData.terlapor 
      : (Array.isArray(parsedData.terlapor_list) ? parsedData.terlapor_list : []);
    const normalizedTerlaporList = terlaporRawList.map((t, idx) => ({
      nama: t.nama || "",
      nik: t.nik || "",
      ttl: t.ttl || "",
      pekerjaan: t.pekerjaan || "",
      agama: t.agama || "Islam",
      alamat: t.alamat || "",
      kontak: t.hp || t.kontak || "",
      hp: t.hp || t.kontak || "",
      role_label: t.role_label || (idx === 0 ? "Terlapor Utama" : `Terlapor Tambahan ${idx}`),
    }));

    // Normalisasi Saksi
    const saksiRawList = Array.isArray(parsedData.saksi) 
      ? parsedData.saksi 
      : (Array.isArray(parsedData.saksi_list) ? parsedData.saksi_list : []);
    const normalizedSaksiList = saksiRawList.map((s, idx) => ({
      nama: s.nama || "",
      nik: s.nik || "",
      ttl: s.ttl || "",
      pekerjaan: s.pekerjaan || "",
      agama: s.agama || "Islam",
      alamat: s.alamat || "",
      kontak: s.hp || s.kontak || "",
      hp: s.hp || s.kontak || "",
      role_label: s.role_label || (idx === 0 ? "Saksi Fakta" : idx === 1 ? "Saksi Terkait" : `Saksi ${idx + 1}`),
    }));

    const resultPayload = {
      // Format Ringkas
      pidana: finalTindakPidana,
      pasal: finalPasal,
      waktu: finalTempus,
      tkp: finalLocus,
      uraian: finalUraian,

      // Format Standar Formulir
      tindak_pidana: finalTindakPidana,
      dugaan_tindak_pidana: finalTindakPidana,
      dugaan_pasal: finalPasal,
      pasal_disangkakan: finalPasal,
      tempus_delicti: finalTempus,
      waktu_kejadian: finalTempus,
      locus_delicti: finalLocus,
      tempat_kejadian: finalLocus,
      uraian_kejadian: finalUraian,
      ringkasan_posisi_kasus: finalUraian,
      kronologis: finalUraian,

      nomor_surat: parsedData.nomor_surat || "",
      tanggal_surat: parsedData.tanggal_surat || "",
      pelapor: normalizedPelapor,
      pelapor_nama: normalizedPelapor.nama,
      pelapor_nik: normalizedPelapor.nik,
      pelapor_ttl: normalizedPelapor.ttl,
      pelapor_pekerjaan: normalizedPelapor.pekerjaan,
      pelapor_agama: normalizedPelapor.agama,
      pelapor_alamat: normalizedPelapor.alamat,
      pelapor_kontak: normalizedPelapor.kontak,
      terlapor: normalizedTerlaporList,
      terlapor_list: normalizedTerlaporList,
      saksi: normalizedSaksiList,
      saksi_list: normalizedSaksiList,

      peristiwa: {
        pidana: finalTindakPidana,
        tindak_pidana: finalTindakPidana,
        dugaan_tindak_pidana: finalTindakPidana,
        pasal: finalPasal,
        dugaan_pasal: finalPasal,
        pasal_disangkakan: finalPasal,
        waktu: finalTempus,
        tempus_delicti: finalTempus,
        waktu_kejadian: finalTempus,
        tkp: finalLocus,
        locus_delicti: finalLocus,
        tempat_kejadian: finalLocus,
        uraian: finalUraian,
        uraian_kejadian: finalUraian,
        ringkasan_posisi_kasus: finalUraian,
        kronologis: finalUraian,
        ...pObj,
      },
    };

    return res.status(200).json({
      success: true,
      data: resultPayload,
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